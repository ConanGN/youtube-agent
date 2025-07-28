// 类型定义入口文件

// YouTube相关类型
export type {
  YouTubeVideo,
  EditHistory,
  YouTubeChannel,
  YouTubePlaylist,
  SingleVideoRequest,
  MultipleVideosRequest,
  ChannelVideosRequest,
  YouTubeAPIResponse,
  BatchProcessResult,
  DataInputType,
  DataInput,
  ExportFormat,
  ExportConfig,
  VideoFieldKey,
  RequiredVideoFields,
  OptionalVideoFields,
  GenericDataItem,
  UnifiedDataItem,
  // 字幕相关类型
  SubtitleCue,
  SubtitleData,
  SubtitleBatchRequest,
  SubtitleBatchResponse,
} from './youtube'

export { YouTubeAPIError } from './youtube'

// 表格相关类型
export type {
  TableState,
  EditingCell,
  CellEditEvent,
  YouTubeColumnConfig,
  FilterOption,
  FilterState,
  TableAction,
  TableActionEvent,
  TableUtilFunction,
  UseYouTubeTableReturn,
  VirtualizationConfig,
  TablePerformanceConfig,
  TableTheme,
  // 新增：列配置系统类型
  ColumnDataType,
  ValidationRule,
  ColumnFormatter,
  EditorConfig,
  ColumnFeatures,
  DynamicColumnConfig,
  ColumnConfigManager,
  ColumnTemplate,
  FeatureModule,
  ExtendedTableState,
  ColumnManagementAction,
  ColumnManagementEvent,
} from './table'

export { 
  DEFAULT_YOUTUBE_COLUMNS, 
  DEFAULT_TABLE_THEME,
  COLUMN_TEMPLATES, // 新增：导出列模板
} from './table'

// AI相关类型
export type {
  AIEnhancementType,
  EnhancementType,
  AIEnhancementRequest,
  AIEnhancementOptions,
  AIEnhancementResult,
  BatchAIResult,
  AIStreamChunk,
  PromptTemplate,
  PromptVariable,
  AIServiceConfig,
  AIProcessingStatus,
  AIProcessingState,
  AIEnhancementPanelConfig,
  AIServiceStats,
  AIFieldKey,
  AIEnhancementHistory,
} from './ai'

export { DEFAULT_PROMPT_TEMPLATES, AIServiceError } from './ai'

// 通用工具类型
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp?: string
}

export interface PaginationParams {
  page: number
  pageSize: number
  total?: number
}

export interface SortParams {
  field: string
  order: 'asc' | 'desc'
}

export interface FilterParams {
  [key: string]: any
}

export interface SearchParams extends Partial<PaginationParams>, Partial<SortParams> {
  filters?: FilterParams
  search?: string
}

// 组件Props类型
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export interface ErrorProps extends BaseComponentProps {
  error: Error | string
  retry?: () => void
}

// 导入需要的类型
import type { YouTubeVideo } from './youtube'
import type { TableState } from './table'
import type { AIProcessingState } from './ai'

// 全局状态类型
export interface AppState {
  videos: YouTubeVideo[]
  loading: boolean
  error: string | null
  selectedVideos: string[]
  tableState: TableState
  aiProcessing: AIProcessingState
}

// 配置类型
export interface AppConfig {
  youtube: {
    apiKey: string
    quotaLimit: number
    batchSize: number
  }
  ai: {
    provider: 'openai' | 'anthropic'
    apiKey: string
    model: string
    maxTokens: number
  }
  table: {
    defaultPageSize: number
    enableVirtualization: boolean
    theme: TableTheme
  }
  export: {
    defaultFormat: ExportFormat
    maxFileSize: number
  }
}

// 环境变量类型
export interface EnvVars {
  YOUTUBE_API_KEY: string
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  NODE_ENV: 'development' | 'production' | 'test'
  NEXT_PUBLIC_APP_URL: string
}

// 验证规则模板
export const VALIDATION_TEMPLATES: ValidationRule[] = [
  {
    type: 'required',
    message: '此字段为必填项'
  },
  {
    type: 'min',
    value: 1,
    message: '最小长度为1'
  },
  {
    type: 'max',
    value: 100,
    message: '最大长度为100'
  },
  {
    type: 'pattern',
    value: '^[a-zA-Z0-9]+$',
    message: '只能包含字母和数字'
  },
  {
    type: 'url',
    message: '请输入有效的URL'
  },
  {
    type: 'email',
    message: '请输入有效的邮箱地址'
  }
]

// 格式化器模板
export const FORMATTER_TEMPLATES: ColumnFormatter[] = [
  {
    type: 'text',
    options: {}
  },
  {
    type: 'number',
    options: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  },
  {
    type: 'currency',
    options: {
      currency: 'CNY',
      style: 'currency'
    }
  },
  {
    type: 'percentage',
    options: {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }
  },
  {
    type: 'date',
    options: {
      dateStyle: 'short'
    }
  },
  {
    type: 'boolean',
    options: {
      trueText: '是',
      falseText: '否'
    }
  }
]