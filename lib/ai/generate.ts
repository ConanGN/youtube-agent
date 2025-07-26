import { getAIConfig, OPENROUTER_MODELS, isSupportedModel, type SupportedModel } from './config';

// AI生成接口定义
export interface AIGenerateRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface AIGenerateResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}

// 支持的AI模型列表 (从config导出)
export const SUPPORTED_MODELS = OPENROUTER_MODELS;

export type { SupportedModel };

// 默认系统提示词 - 安全防护
const DEFAULT_SYSTEM_PROMPT = `你是一个专业的数据处理助手。请严格遵循以下规则：
1. 仅输出纯文本内容，不包含HTML、Markdown或其他标记语言
2. 不要添加解释、说明或额外信息
3. 直接处理用户提供的内容并返回结果
4. 保持输出简洁、准确和有用
5. 如果内容不适合处理，请返回"无法处理此内容"`;

// OpenRouter API 调用函数
async function callOpenRouterAPI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<any> {
  const config = getAIConfig();
  
  const response = await fetch(config.baseURL + '/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'YouTube Agent AI Processing',
    },
    body: JSON.stringify({
      model: model,
      max_tokens: maxTokens,
      temperature: config.temperature,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user', 
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenRouter API错误 (${response.status}): ${errorData}`);
  }

  return response.json();
}

// AI生成主函数
export async function generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
  try {
    const { model, systemPrompt, userPrompt, maxTokens = 1000 } = request;
    
    // 验证模型是否支持
    if (!isSupportedModel(model)) {
      throw new Error(`不支持的模型: ${model}`);
    }
    
    // 调用OpenRouter API
    const response = await callOpenRouterAPI(
      model,
      systemPrompt || DEFAULT_SYSTEM_PROMPT,
      userPrompt,
      maxTokens
    );
    
    // 处理响应
    const message = response.choices?.[0]?.message;
    if (!message?.content) {
      throw new Error('AI返回了空内容');
    }
    
    return {
      content: message.content,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
    };
    
  } catch (error) {
    console.error('AI生成失败:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

// 批量生成函数 - 带并发控制
export async function batchGenerate(
  requests: AIGenerateRequest[],
  onProgress?: (index: number, result: AIGenerateResponse) => void,
  maxConcurrency = 3
): Promise<AIGenerateResponse[]> {
  const limit = (await import('p-limit')).default(maxConcurrency);
  const results: AIGenerateResponse[] = [];
  
  const tasks = requests.map((request, index) =>
    limit(async () => {
      const result = await generate(request);
      results[index] = result;
      onProgress?.(index, result);
      return result;
    })
  );
  
  await Promise.all(tasks);
  return results;
}