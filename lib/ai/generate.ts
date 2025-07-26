import Anthropic from '@anthropic-ai/sdk';

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

// 支持的AI模型列表
export const SUPPORTED_MODELS = {
  'anthropic:claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet',
  'anthropic:claude-3-haiku-20240307': 'Claude 3 Haiku',
  'anthropic:claude-3-opus-20240229': 'Claude 3 Opus',
} as const;

export type SupportedModel = keyof typeof SUPPORTED_MODELS;

// 默认系统提示词 - 安全防护
const DEFAULT_SYSTEM_PROMPT = `你是一个专业的数据处理助手。请严格遵循以下规则：
1. 仅输出纯文本内容，不包含HTML、Markdown或其他标记语言
2. 不要添加解释、说明或额外信息
3. 直接处理用户提供的内容并返回结果
4. 保持输出简洁、准确和有用
5. 如果内容不适合处理，请返回"无法处理此内容"`;

// 初始化Anthropic客户端
function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('缺少ANTHROPIC_API_KEY环境变量');
  }
  return new Anthropic({ apiKey });
}

// AI生成主函数
export async function generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
  try {
    const { model, systemPrompt, userPrompt, maxTokens = 1000 } = request;
    
    // 验证模型是否支持
    if (!model.startsWith('anthropic:')) {
      throw new Error(`不支持的模型: ${model}`);
    }
    
    const anthropicModel = model.replace('anthropic:', '');
    const client = createAnthropicClient();
    
    // 调用Anthropic API
    const response = await client.messages.create({
      model: anthropicModel,
      max_tokens: maxTokens,
      system: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });
    
    // 处理响应
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('AI返回了非文本内容');
    }
    
    return {
      content: content.text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
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