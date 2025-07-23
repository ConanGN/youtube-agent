// AI相关类型定义

import { YouTubeVideo } from './youtube'

// AI增强类型
export type AIEnhancementType = 'optimize_title' | 'summarize_description' | 'translate_title' | 'extract_keywords'
export type EnhancementType = AIEnhancementType // 别名以保持兼容性

export interface AIEnhancementRequest {
  videos: YouTubeVideo[]
  enhancementType: AIEnhancementType
  language?: string
  customPrompt?: string
  options?: AIEnhancementOptions
}

export interface AIEnhancementOptions {
  maxLength?: number           // 生成内容的最大长度
  style?: 'formal' | 'casual' | 'professional' | 'creative'
  temperature?: number         // AI创造性参数 (0-1)
  targetAudience?: string      // 目标受众
  keywords?: string[]          // 关键词提示
  preserveOriginal?: boolean   // 是否保留原文
}

export interface AIEnhancementResult {
  videoId: string
  field: string
  originalValue: string
  enhancedValue: string
  confidence: number           // 置信度 (0-1)
  processingTime: number       // 处理时间(ms)
  model: string               // 使用的模型
  tokens?: {
    input: number
    output: number
    total: number
  }
}

export interface BatchAIResult {
  results: AIEnhancementResult[]
  successful: number
  failed: number
  totalTokens: number
  totalTime: number
  errors: {
    videoId: string
    error: string
  }[]
}

// 流式响应类型
export interface AIStreamChunk {
  videoId: string
  field: string
  content: string
  isComplete: boolean
  metadata?: {
    tokens?: number
    confidence?: number
  }
}

// Prompt模板相关类型
export interface PromptTemplate {
  id: string
  name: string
  description: string
  type: AIEnhancementType
  template: string
  variables: string[]          // 模板中的变量
  language: string
  category: 'default' | 'custom' | 'community'
  author?: string
  rating?: number
  usageCount?: number
  createdAt: string
  updatedAt: string
}

export interface PromptVariable {
  name: string
  description: string
  type: 'string' | 'number' | 'boolean' | 'array'
  required: boolean
  defaultValue?: any
  placeholder?: string
}

// 预设的Prompt模板
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'title-optimize-zh',
    name: '中文标题优化',
    description: '优化YouTube视频标题，提高点击率',
    type: 'title',
    template: '请为这个YouTube视频生成一个更吸引人的中文标题。原标题：{originalTitle}，视频描述：{description}。要求：1. 保持原意准确 2. 增加吸引力 3. 控制在30字以内',
    variables: ['originalTitle', 'description'],
    language: 'zh-CN',
    category: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'description-summary-zh',
    name: '中文描述摘要',
    description: '为YouTube视频生成简洁的中文描述摘要',
    type: 'description',
    template: '请为这个YouTube视频生成一个简洁的中文描述摘要。原描述：{originalDescription}。要求：1. 控制在100字以内 2. 突出核心内容 3. 增加观看欲望',
    variables: ['originalDescription'],
    language: 'zh-CN',
    category: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'translate-en-to-zh',
    name: '英译中',
    description: '将英文标题和描述翻译为中文',
    type: 'translate',
    template: '请将以下英文内容翻译为自然流畅的中文：{originalText}。要求：1. 保持原意准确 2. 符合中文表达习惯 3. 适合中文YouTube观众',
    variables: ['originalText'],
    language: 'zh-CN',
    category: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// AI服务配置
export interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'azure'
  model: string
  apiKey: string
  baseUrl?: string
  maxTokens?: number
  temperature?: number
  topP?: number
  presencePenalty?: number
  frequencyPenalty?: number
  timeout?: number
}

// AI处理状态
export type AIProcessingStatus = 'idle' | 'processing' | 'completed' | 'error' | 'cancelled'

export interface AIProcessingState {
  status: AIProcessingStatus
  progress: number             // 进度百分比 (0-100)
  currentVideo?: string        // 当前处理的视频ID
  processedCount: number       // 已处理数量
  totalCount: number           // 总数量
  startTime?: number           // 开始时间戳
  estimatedTime?: number       // 预估剩余时间(ms)
  error?: string               // 错误信息
}

// AI增强面板配置
export interface AIEnhancementPanelConfig {
  defaultType: AIEnhancementType
  enableBatchProcessing: boolean
  maxBatchSize: number
  showProgress: boolean
  enablePreview: boolean
  autoSave: boolean
  confirmBeforeProcess: boolean
}

// AI服务统计
export interface AIServiceStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalTokens: number
  averageProcessingTime: number
  lastUsed: string
  quotaUsed?: number
  quotaLimit?: number
}

// 错误类型
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public provider?: string,
    public retryable?: boolean
  ) {
    super(message)
    this.name = 'AIServiceError'
  }
}

// 工具类型
export type AIFieldKey = Extract<keyof YouTubeVideo, 'title' | 'description' | 'enhancedTitle' | 'summarizedDescription' | 'translatedTitle'>

export interface AIEnhancementHistory {
  id: string
  videoId: string
  field: AIFieldKey
  originalValue: string
  enhancedValue: string
  prompt: string
  model: string
  timestamp: string
  tokens: number
  processingTime: number
}