import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generate } from '@/lib/ai/generate';
import { renderTemplate, validateTemplate, hashPrompt } from '@/lib/ai/prompt';
import { validateBatchLimits, estimateTokenCost } from '@/lib/ai/limits';

// 请求体验证schema
const BatchRequestSchema = z.object({
  columnId: z.string().min(1, '列ID不能为空'),
  data: z.array(z.object({
    rowId: z.string(),
    content: z.string(),
  })).min(1, '数据不能为空'),
  model: z.string().min(1, '模型不能为空'),
  promptTemplate: z.string().min(1, '提示词模板不能为空'),
  maxConcurrency: z.number().min(1).max(10).default(3),
  dryRun: z.boolean().default(false),
  // 新增参数
  writeTarget: z.enum(['virtual', 'overwrite', 'append']).default('virtual'),
  processingScope: z.enum(['selected', 'filtered', 'all']).default('all'),
});

type BatchRequest = z.infer<typeof BatchRequestSchema>;

// SSE响应数据类型
interface BatchProgressEvent {
  type: 'progress' | 'complete' | 'error' | 'estimate';
  data: {
    rowId?: string;
    output?: string;
    status?: 'ok' | 'failed';
    error?: string;
    progress?: {
      completed: number;
      total: number;
      percentage: number;
    };
    estimate?: {
      inputTokens: number;
      outputTokens: number;
      totalCost: number;
      currency: string;
    };
    jobId?: string;
  };
}

// 错误响应助手
function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { error: message, success: false },
    { status }
  );
}

// 发送SSE事件
function sendSSEEvent(controller: ReadableStreamDefaultController, event: BatchProgressEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

// 内存存储幂等性检查（实际项目应使用Redis或数据库）
const runningJobs = new Map<string, {
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  results?: any;
}>();

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    const validatedData = BatchRequestSchema.parse(body);
    
    const { 
      columnId, 
      data, 
      model, 
      promptTemplate, 
      maxConcurrency, 
      dryRun, 
      writeTarget, 
      processingScope 
    } = validatedData;
    
    // 生成幂等性键：基于列ID、模板hash和行集合hash
    const rowIds = data.map(item => item.rowId).sort().join(',');
    const templateHash = hashPrompt(promptTemplate);
    const idempotencyKey = `${columnId}_${templateHash}_${hashPrompt(rowIds)}`;
    
    // 检查是否已有相同任务在运行或已完成
    if (runningJobs.has(idempotencyKey)) {
      const existingJob = runningJobs.get(idempotencyKey)!;
      
      if (existingJob.status === 'running') {
        return NextResponse.json({
          success: false,
          error: '相同配置的任务正在进行中',
          existingJobId: existingJob.jobId,
          message: '请等待当前任务完成或先取消当前任务'
        }, { status: 409 });
      }
      
      if (existingJob.status === 'completed') {
        return NextResponse.json({
          success: true,
          jobId: existingJob.jobId,
          results: existingJob.results,
          message: '返回已完成的相同任务结果（幂等性）'
        });
      }
    }
    
    // 验证提示词模板
    const templateValidation = validateTemplate(promptTemplate);
    if (!templateValidation.isValid) {
      return errorResponse(`提示词模板无效: ${templateValidation.error}`);
    }
    
    // 提取内容数组
    const contents = data.map(item => item.content);
    
    // 验证批处理限制
    const limitValidation = validateBatchLimits(contents, model, promptTemplate);
    if (!limitValidation.isValid) {
      return errorResponse(
        `批处理验证失败: ${limitValidation.errors.join(', ')}`
      );
    }
    
    // 生成作业ID
    const jobId = `batch_${Date.now()}_${templateHash}`;
    
    // 记录任务开始（幂等性）
    runningJobs.set(idempotencyKey, {
      jobId,
      status: 'running',
      startTime: Date.now(),
    });
    
    // 如果是dry run，只返回估算信息
    if (dryRun) {
      return NextResponse.json({
        success: true,
        jobId,
        estimate: limitValidation.estimate,
        message: '费用估算完成，未执行实际处理',
      });
    }
    
    // 创建SSE流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // 发送估算信息
          sendSSEEvent(controller, {
            type: 'estimate',
            data: {
              jobId,
              estimate: {
                inputTokens: limitValidation.estimate.inputTokens,
                outputTokens: limitValidation.estimate.outputTokens,
                totalCost: limitValidation.estimate.totalCost,
                currency: limitValidation.estimate.currency,
              },
            },
          });
          
          // 批量处理
          const results: Array<{ rowId: string; output: string; status: 'ok' | 'failed'; error?: string }> = [];
          let completedCount = 0;
          
          // 使用p-limit控制并发
          const limit = (await import('p-limit')).default(maxConcurrency);
          
          const tasks = data.map((item, index) =>
            limit(async () => {
              let retryCount = 0;
              const maxRetries = 2;
              
              while (retryCount <= maxRetries) {
                try {
                  // 渲染提示词
                  const renderedPrompt = renderTemplate(promptTemplate, { content: item.content });
                  
                  // 调用AI生成
                  const result = await generate({
                    model,
                    userPrompt: renderedPrompt,
                    maxTokens: 1000,
                  });
                  
                  if (result.error) {
                    throw new Error(result.error);
                  }
                  
                  let output = result.content;
                  let errorType: string | undefined;
                  
                  // 尝试解析JSON（如果提示词要求JSON格式）
                  if (promptTemplate.toLowerCase().includes('json') || 
                      promptTemplate.includes('{') || 
                      promptTemplate.includes('}')) {
                    try {
                      // 尝试解析为JSON以验证格式
                      JSON.parse(output);
                    } catch (jsonError) {
                      // JSON解析失败，但仍保留原内容，标记错误类型
                      errorType = 'JSON_PARSE_ERROR';
                      console.warn(`JSON解析失败 (rowId: ${item.rowId}):`, jsonError);
                    }
                  }
                  
                  // 成功处理（即使有JSON错误也算成功，让用户选择是否接受）
                  const successResult = {
                    rowId: item.rowId,
                    output,
                    status: errorType ? 'failed' as const : 'ok' as const,
                    error: errorType,
                  };
                  
                  results[index] = successResult;
                  completedCount++;
                  
                  // 发送进度事件
                  sendSSEEvent(controller, {
                    type: 'progress',
                    data: {
                      ...successResult,
                      progress: {
                        completed: completedCount,
                        total: data.length,
                        percentage: Math.round((completedCount / data.length) * 100),
                      },
                    },
                  });
                  
                  return successResult;
                  
                } catch (error) {
                  retryCount++;
                  
                  if (retryCount > maxRetries) {
                    // 重试次数用完，标记为失败
                    const failedResult = {
                      rowId: item.rowId,
                      output: '',
                      status: 'failed' as const,
                      error: error instanceof Error ? error.message : '未知错误',
                    };
                    
                    results[index] = failedResult;
                    completedCount++;
                    
                    // 发送失败事件
                    sendSSEEvent(controller, {
                      type: 'progress',
                      data: {
                        ...failedResult,
                        progress: {
                          completed: completedCount,
                          total: data.length,
                          percentage: Math.round((completedCount / data.length) * 100),
                        },
                      },
                    });
                    
                    return failedResult;
                  }
                  
                  // 等待一下再重试
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
              }
            })
          );
          
          // 等待所有任务完成
          await Promise.all(tasks);
          
          // 更新幂等性状态为已完成
          runningJobs.set(idempotencyKey, {
            jobId,
            status: 'completed',
            startTime: runningJobs.get(idempotencyKey)?.startTime || Date.now(),
            results: results.reduce((acc, result) => {
              acc[result.rowId] = result;
              return acc;
            }, {} as Record<string, any>),
          });
          
          // 发送完成事件
          sendSSEEvent(controller, {
            type: 'complete',
            data: {
              jobId,
              progress: {
                completed: data.length,
                total: data.length,
                percentage: 100,
              },
            },
          });
          
        } catch (error) {
          // 更新幂等性状态为失败
          runningJobs.set(idempotencyKey, {
            jobId,
            status: 'failed',
            startTime: runningJobs.get(idempotencyKey)?.startTime || Date.now(),
          });
          
          console.error('批处理执行失败:', error);
          sendSSEEvent(controller, {
            type: 'error',
            data: {
              error: error instanceof Error ? error.message : '批处理执行失败',
            },
          });
        } finally {
          controller.close();
        }
      },
    });
    
    // 返回SSE响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('API处理失败:', error);
    
    if (error instanceof z.ZodError) {
      return errorResponse(
        `请求参数验证失败: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    
    return errorResponse(
      error instanceof Error ? error.message : '服务器内部错误',
      500
    );
  }
}