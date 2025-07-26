// SiliconFlow API 统一配置
// 支持多种AI模型的统一接口

export interface AIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// SiliconFlow支持的模型列表
export const SILICONFLOW_MODELS = {
  // DeepSeek模型
  'deepseek-ai/DeepSeek-V3': 'DeepSeek-V3 (高性能智能模型)',
  
  // 其他常用模型 (预留扩展)
  'Qwen/Qwen2.5-Coder-32B-Instruct': 'Qwen2.5 Coder 32B',
  'meta-llama/Llama-3.1-8B-Instruct': 'Llama 3.1 8B',
  'THUDM/glm-4-9b-chat': 'GLM-4 9B Chat',
} as const;

export type SupportedModel = keyof typeof SILICONFLOW_MODELS;

// 默认配置
export const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: process.env.SILICONFLOW_API_KEY || '',
  baseURL: 'https://api.siliconflow.cn/v1',
  model: 'deepseek-ai/DeepSeek-V3',
  maxTokens: 1000,
  temperature: 0.7,
};

// 获取配置函数
export function getAIConfig(overrides?: Partial<AIConfig>): AIConfig {
  const config = { ...DEFAULT_AI_CONFIG, ...overrides };
  
  // 调试日志：输出环境变量状态
  console.log('Environment variables debug:', {
    hasSiliconFlowKey: !!process.env.SILICONFLOW_API_KEY,
    keyLength: process.env.SILICONFLOW_API_KEY?.length || 0,
    configApiKey: config.apiKey,
    nodeEnv: process.env.NODE_ENV
  });
  
  if (!config.apiKey) {
    throw new Error('缺少SILICONFLOW_API_KEY环境变量，请检查.env.local文件配置');
  }
  
  return config;
}

// 验证模型是否受支持
export function isSupportedModel(model: string): model is SupportedModel {
  return model in SILICONFLOW_MODELS;
}

// 获取模型显示名称
export function getModelDisplayName(model: string): string {
  return SILICONFLOW_MODELS[model as SupportedModel] || model;
}