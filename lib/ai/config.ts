// OpenRouter API 统一配置
// 支持多种AI模型的统一接口

export interface AIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// OpenRouter支持的模型列表
export const OPENROUTER_MODELS = {
  // 免费模型
  'qwen/qwen3-coder:free': 'Qwen3 Coder (免费)',
  
  // 其他常用模型 (预留扩展)
  'anthropic/claude-3-haiku': 'Claude 3 Haiku',
  'anthropic/claude-3-sonnet': 'Claude 3 Sonnet', 
  'openai/gpt-3.5-turbo': 'GPT-3.5 Turbo',
  'openai/gpt-4': 'GPT-4',
} as const;

export type SupportedModel = keyof typeof OPENROUTER_MODELS;

// 默认配置
export const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  model: 'qwen/qwen3-coder:free',
  maxTokens: 1000,
  temperature: 0.7,
};

// 获取配置函数
export function getAIConfig(overrides?: Partial<AIConfig>): AIConfig {
  const config = { ...DEFAULT_AI_CONFIG, ...overrides };
  
  // 调试日志：输出环境变量状态
  console.log('Environment variables debug:', {
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    keyLength: process.env.OPENROUTER_API_KEY?.length || 0,
    configApiKey: config.apiKey,
    nodeEnv: process.env.NODE_ENV
  });
  
  if (!config.apiKey) {
    throw new Error('缺少OPENROUTER_API_KEY环境变量，请检查.env.local文件配置');
  }
  
  return config;
}

// 验证模型是否受支持
export function isSupportedModel(model: string): model is SupportedModel {
  return model in OPENROUTER_MODELS;
}

// 获取模型显示名称
export function getModelDisplayName(model: string): string {
  return OPENROUTER_MODELS[model as SupportedModel] || model;
}