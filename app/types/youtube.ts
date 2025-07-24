// YouTube数据类型定义

export interface YouTubeVideo {
  id: string                    // 视频ID
  title: string                 // 视频标题
  description: string           // 视频描述
  thumbnail: string             // 封面图URL
  publishedAt: string           // 发布时间
  viewCount: number             // 播放量
  likeCount: number             // 点赞量
  commentCount: number          // 评论量
  duration: string              // 视频时长
  channelTitle: string          // 频道名称
  channelId: string             // 频道ID
  videoUrl: string              // 视频链接
  tags?: string[]               // 视频标签
  categoryId?: string           // 分类ID
  
  // AI增强字段
  enhancedTitle?: string        // AI优化标题
  summarizedDescription?: string // AI摘要描述
  translatedTitle?: string      // AI翻译标题
  isEdited?: boolean            // 编辑状态标记
  editHistory?: EditHistory[]   // 编辑历史
}

export interface EditHistory {
  field: string                 // 编辑的字段名
  oldValue: string             // 原值
  newValue: string             // 新值
  timestamp: string            // 编辑时间
  method: 'manual' | 'ai'      // 编辑方式
}

export interface YouTubeChannel {
  id: string                   // 频道ID
  title: string                // 频道名称
  description: string          // 频道描述
  thumbnail: string            // 频道头像
  subscriberCount: number      // 订阅数
  videoCount: number           // 视频数
  viewCount: number            // 总观看量
  publishedAt: string          // 频道创建时间
  customUrl?: string           // 自定义URL
  country?: string             // 国家
}

export interface YouTubePlaylist {
  id: string                   // 播放列表ID
  title: string                // 播放列表标题
  description: string          // 播放列表描述
  thumbnail: string            // 播放列表缩略图
  itemCount: number            // 视频数量
  channelId: string            // 所属频道ID
  channelTitle: string         // 所属频道名称
  publishedAt: string          // 创建时间
}

// API请求相关类型
export interface SingleVideoRequest {
  videoUrl: string
}

export interface MultipleVideosRequest {
  videoUrls: string[]
  batchSize?: number           // 批处理大小，用于配额管理
}

export interface ChannelVideosRequest {
  channelUrl?: string
  channelId?: string
  maxResults?: number          // 最大返回数量
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'viewCount'
}

// API响应类型
export interface YouTubeAPIResponse<T> {
  success: boolean
  data?: T
  error?: string
  quotaUsed?: number           // 使用的配额
  nextPageToken?: string       // 分页token
  totalResults?: number        // 总结果数
}

export interface BatchProcessResult {
  successful: YouTubeVideo[]
  failed: {
    url: string
    error: string
  }[]
  quotaUsed: number
}

// 数据输入类型
export type DataInputType = 'single' | 'multiple' | 'channel'

export interface DataInput {
  type: DataInputType
  urls?: string[]
  channelId?: string
  channelUrl?: string
  file?: File                  // CSV文件上传
  options?: {
    maxResults?: number
    order?: string
    batchSize?: number
  }
}

// 导出相关类型
export type ExportFormat = 'csv' | 'excel' | 'markdown'

export interface ExportConfig {
  format: ExportFormat
  fields: (keyof YouTubeVideo)[]
  filename?: string
  includeEnhancements?: boolean
}

// 错误类型
export class YouTubeAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public quotaExceeded?: boolean
  ) {
    super(message)
    this.name = 'YouTubeAPIError'
  }
}

// 通用数据类型（支持CSV数据）
export interface GenericDataItem {
  id: string
  title: string
  description: string
  originalData: string
  category: string
  tags: string[]
  publishedAt: string
  status: 'processed' | 'pending'
  
  // 兼容YouTube字段（可选）
  thumbnail?: string
  viewCount?: number
  likeCount?: number
  commentCount?: number
  duration?: string
  channelTitle?: string
  channelId?: string
  videoUrl?: string
  categoryId?: string
  
  // AI增强字段
  enhancedTitle?: string
  summarizedDescription?: string
  translatedTitle?: string
  isEdited?: boolean
  editHistory?: EditHistory[]
}

// 统一数据类型（YouTube或CSV数据）
export type UnifiedDataItem = YouTubeVideo | GenericDataItem

// 工具类型
export type VideoFieldKey = keyof YouTubeVideo
export type RequiredVideoFields = Pick<YouTubeVideo, 'id' | 'title' | 'videoUrl'>
export type OptionalVideoFields = Partial<Omit<YouTubeVideo, keyof RequiredVideoFields>>