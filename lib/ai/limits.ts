// 模型定价配置（每1000个token的价格，单位：USD）
export const MODEL_PRICING = {
  // OpenRouter模型定价
  'qwen/qwen3-coder:free': {
    input: 0,      // 免费模型
    output: 0,     // 免费模型
  },
  'anthropic/claude-3-haiku': {
    input: 0.00025, // $0.25/MTok
    output: 0.00125,// $1.25/MTok
  },
  'anthropic/claude-3-sonnet': {
    input: 0.003,   // $3/MTok
    output: 0.015,  // $15/MTok
  },
  'openai/gpt-3.5-turbo': {
    input: 0.0005,  // $0.5/MTok
    output: 0.0015, // $1.5/MTok
  },
  'openai/gpt-4': {
    input: 0.03,    // $30/MTok
    output: 0.06,   // $60/MTok
  },
  
  // 保留旧配置以兼容现有代码
  'anthropic:claude-3-5-sonnet-20240620': {
    input: 0.003,   // $3/MTok
    output: 0.015,  // $15/MTok
  },
  'anthropic:claude-3-haiku-20240307': {
    input: 0.00025, // $0.25/MTok
    output: 0.00125,// $1.25/MTok
  },
  'anthropic:claude-3-opus-20240229': {
    input: 0.015,   // $15/MTok
    output: 0.075,  // $75/MTok
  },
} as const;

export type PricingModel = keyof typeof MODEL_PRICING;

// 费用估算结果接口
export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: 'USD';
}

// 批处理任务限制配置
export interface BatchLimits {
  maxItemsPerBatch: number;
  maxConcurrency: number;
  maxTokensPerItem: number;
  maxCostPerBatch: number; // USD
}

// 默认限制配置
export const DEFAULT_LIMITS: BatchLimits = {
  maxItemsPerBatch: 1000,
  maxConcurrency: 5,
  maxTokensPerItem: 8000,
  maxCostPerBatch: parseFloat(process.env.MAX_JOB_COST_USD || '10.00'),
};

/**
 * 估算文本的token数量（粗略估算）
 * @param text - 输入文本
 * @returns 估算的token数量
 */
export function estimateTokens(text: string): number {
  // 粗略估算：
  // - 英文：约4个字符 = 1个token
  // - 中文：约1.5个字符 = 1个token
  // - 平均按2.5个字符 = 1个token计算
  
  if (!text || text.length === 0) {
    return 0;
  }
  
  // 统计中文字符数量
  const chineseCharCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalCharCount = text.length;
  const nonChineseCharCount = totalCharCount - chineseCharCount;
  
  // 中文按1.5字符/token，其他按4字符/token计算
  const estimatedTokens = Math.ceil(
    chineseCharCount / 1.5 + nonChineseCharCount / 4
  );
  
  return Math.max(estimatedTokens, 1); // 至少1个token
}

/**
 * 估算批处理任务的费用
 * @param contents - 内容数组
 * @param model - AI模型
 * @param promptTemplate - 提示词模板
 * @param estimatedOutputTokensPerItem - 每项估算的输出token数（默认200）
 * @returns 费用估算结果
 */
export function estimateTokenCost(
  contents: string[],
  model: string,
  promptTemplate: string,
  estimatedOutputTokensPerItem = 200
): CostEstimate {
  // 验证模型是否支持
  const pricingModel = model as PricingModel;
  if (!MODEL_PRICING[pricingModel]) {
    throw new Error(`不支持的模型定价: ${model}`);
  }
  
  const pricing = MODEL_PRICING[pricingModel];
  
  // 计算输入token
  const templateTokens = estimateTokens(promptTemplate);
  let totalInputTokens = 0;
  
  for (const content of contents) {
    const contentTokens = estimateTokens(content);
    // 每次请求的输入 = 模板token + 内容token
    totalInputTokens += templateTokens + contentTokens;
  }
  
  // 计算输出token（估算）
  const totalOutputTokens = contents.length * estimatedOutputTokensPerItem;
  
  // 计算费用
  const inputCost = (totalInputTokens / 1000) * pricing.input;
  const outputCost = (totalOutputTokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;
  
  return {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
    currency: 'USD',
  };
}

/**
 * 验证批处理任务是否超出限制
 * @param contents - 内容数组
 * @param model - AI模型
 * @param promptTemplate - 提示词模板
 * @param limits - 限制配置（可选，使用默认值）
 * @returns 验证结果
 */
export function validateBatchLimits(
  contents: string[],
  model: string,
  promptTemplate: string,
  limits: Partial<BatchLimits> = {}
): {
  isValid: boolean;
  errors: string[];
  estimate: CostEstimate;
} {
  const finalLimits = { ...DEFAULT_LIMITS, ...limits };
  const errors: string[] = [];
  
  // 验证数量限制
  if (contents.length === 0) {
    errors.push('内容数组不能为空');
  }
  
  if (contents.length > finalLimits.maxItemsPerBatch) {
    errors.push(`批处理项目数量超出限制（${contents.length} > ${finalLimits.maxItemsPerBatch}）`);
  }
  
  // 验证单项token限制
  const templateTokens = estimateTokens(promptTemplate);
  for (let i = 0; i < contents.length; i++) {
    const contentTokens = estimateTokens(contents[i]);
    const totalItemTokens = templateTokens + contentTokens;
    
    if (totalItemTokens > finalLimits.maxTokensPerItem) {
      errors.push(`第${i + 1}项内容过长（${totalItemTokens} > ${finalLimits.maxTokensPerItem} tokens）`);
    }
  }
  
  // 验证费用限制
  let estimate: CostEstimate;
  try {
    estimate = estimateTokenCost(contents, model, promptTemplate);
    
    if (estimate.totalCost > finalLimits.maxCostPerBatch) {
      errors.push(
        `估算费用超出限制（$${estimate.totalCost.toFixed(4)} > $${finalLimits.maxCostPerBatch.toFixed(2)}）`
      );
    }
  } catch (error) {
    errors.push(`费用估算失败: ${error instanceof Error ? error.message : '未知错误'}`);
    // 创建空的估算结果
    estimate = {
      inputTokens: 0,
      outputTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      currency: 'USD',
    };
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    estimate,
  };
}

/**
 * 获取模型的友好名称
 * @param model - 模型标识符
 * @returns 友好名称
 */
export function getModelDisplayName(model: string): string {
  const displayNames: Record<string, string> = {
    // OpenRouter模型
    'qwen/qwen3-coder:free': 'Qwen3 Coder (免费)',
    'anthropic/claude-3-haiku': 'Claude 3 Haiku',
    'anthropic/claude-3-sonnet': 'Claude 3 Sonnet',
    'openai/gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'openai/gpt-4': 'GPT-4',
    
    // 保留旧配置
    'anthropic:claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet',
    'anthropic:claude-3-haiku-20240307': 'Claude 3 Haiku',
    'anthropic:claude-3-opus-20240229': 'Claude 3 Opus',
  };
  
  return displayNames[model] || model;
}

/**
 * 格式化费用显示
 * @param cost - 费用（USD）
 * @returns 格式化的费用字符串
 */
export function formatCost(cost: number): string {
  if (cost < 0.0001) {
    return '< $0.0001';
  }
  return `$${cost.toFixed(4)}`;
}