/**
 * 通用AI处理进度组件的类型定义
 * 提供强类型支持和完整的API接口
 */

import React from 'react'
import { Theme, Position, Size, AnimationType } from './design-tokens'

// AI处理状态枚举
export type AIProcessingStatus = 
  | 'idle'          // 空闲状态
  | 'initializing'  // 初始化中
  | 'processing'    // 处理中
  | 'completed'     // 已完成
  | 'error'         // 发生错误
  | 'cancelled'     // 已取消

// 单个任务状态
export type TaskStatus = 
  | 'pending'       // 等待中
  | 'processing'    // 处理中
  | 'success'       // 成功
  | 'error'         // 失败
  | 'skipped'       // 跳过
  | 'cancelled'     // 取消

// 当前任务信息
export interface CurrentTask {
  id: string                          // 任务唯一标识
  title: string                       // 任务标题
  description?: string                // 任务描述
  startTime?: Date                    // 开始时间
  estimatedDuration?: number          // 预估耗时(毫秒)
  progress?: number                   // 任务内部进度(0-100)
  metadata?: Record<string, any>      // 额外元数据
}

// 处理结果项
export interface ProcessingResult {
  id: string                          // 结果ID
  status: TaskStatus                  // 处理状态
  data?: any                          // 处理结果数据
  error?: string                      // 错误信息
  errorCode?: string                  // 错误代码
  processingTime?: number             // 处理耗时(毫秒)
  metadata?: Record<string, any>      // 结果元数据
  retryCount?: number                 // 重试次数
  lastRetryTime?: Date               // 最后重试时间
}

// 统计信息
export interface ProcessingStats {
  successCount: number                // 成功数量
  errorCount: number                  // 失败数量
  skipCount?: number                  // 跳过数量
  totalProcessingTime?: number        // 总处理时间(毫秒)
  averageProcessingTime?: number      // 平均处理时间(毫秒)
  throughput?: number                 // 处理吞吐量(项/秒)
  estimatedTimeRemaining?: number     // 预估剩余时间(毫秒)
}

// 错误信息
export interface ProcessingError {
  message: string                     // 错误消息
  code?: string                       // 错误代码
  timestamp: Date                     // 错误发生时间
  retryable?: boolean                 // 是否可重试
  details?: Record<string, any>       // 错误详情
  stack?: string                      // 错误堆栈(开发模式)
}

// 核心进度数据接口
export interface AIProcessingProgress {
  // 基础进度信息
  current: number                     // 当前完成数量
  total: number                       // 总任务数量
  percentage?: number                 // 百分比(自动计算或手动设置)
  
  // 状态管理
  status: AIProcessingStatus          // 整体处理状态
  
  // 当前任务
  currentTask?: CurrentTask           // 正在处理的任务
  
  // 统计信息
  stats?: ProcessingStats             // 处理统计
  
  // 详细结果
  results?: ProcessingResult[]        // 所有处理结果
  
  // 错误处理
  lastError?: ProcessingError         // 最后一个错误
  errors?: ProcessingError[]          // 所有错误列表
  
  // 时间信息
  startTime?: Date                    // 处理开始时间
  endTime?: Date                      // 处理结束时间
  
  // 配置信息
  config?: {
    maxRetries?: number               // 最大重试次数
    timeout?: number                  // 超时时间(毫秒)
    concurrency?: number              // 并发数
    [key: string]: any                // 其他配置
  }
}

// 动画配置
export interface AnimationSettings {
  entrance?: AnimationType            // 入场动画类型
  exit?: AnimationType                // 退场动画类型
  progress?: boolean                  // 进度条动画
  pulse?: boolean                     // 脉冲效果
  wave?: boolean                      // 波形效果
  glow?: boolean                      // 发光效果
  disabled?: boolean                  // 禁用所有动画
  duration?: number                   // 动画持续时间
  easing?: string                     // 缓动函数
}

// 样式定制
export interface StyleCustomization {
  className?: string                  // 根容器类名
  cardClassName?: string              // 卡片类名
  headerClassName?: string            // 头部类名
  contentClassName?: string           // 内容类名
  progressClassName?: string          // 进度条类名
  style?: React.CSSProperties        // 内联样式
  cardStyle?: React.CSSProperties    // 卡片样式
}

// 行为配置
export interface BehaviorConfig {
  closable?: boolean                  // 是否可关闭
  minimizable?: boolean               // 是否可最小化
  draggable?: boolean                 // 是否可拖拽
  resizable?: boolean                 // 是否可调整大小
  autoClose?: boolean | number        // 自动关闭(true/false/延迟毫秒)
  autoMinimize?: boolean | number     // 自动最小化
  persistPosition?: boolean           // 记住位置
  stayOnTop?: boolean                 // 始终置顶
  clickThrough?: boolean              // 点击穿透(最小化时)
}

// 显示配置
export interface DisplayConfig {
  showProgressBar?: boolean           // 显示进度条
  showPercentage?: boolean            // 显示百分比
  showStats?: boolean                 // 显示统计信息
  showCurrentTask?: boolean           // 显示当前任务
  showEstimatedTime?: boolean         // 显示预估时间
  showResults?: boolean               // 显示结果列表
  showErrors?: boolean                // 显示错误列表
  showThumbnail?: boolean             // 显示缩略图
  compact?: boolean                   // 紧凑模式
  minimal?: boolean                   // 最小模式
  detailed?: boolean                  // 详细模式
}

// 交互回调函数
export interface InteractionCallbacks {
  onClose?: () => void                // 关闭回调
  onMinimize?: (minimized: boolean) => void  // 最小化切换回调
  onMaximize?: () => void             // 最大化回调
  onRetry?: (failedItems: ProcessingResult[]) => void  // 重试失败项
  onRetryAll?: () => void             // 重试全部
  onCancel?: () => void               // 取消处理
  onPause?: () => void                // 暂停处理
  onResume?: () => void               // 恢复处理
  onItemClick?: (item: ProcessingResult) => void  // 项目点击
  onErrorClick?: (error: ProcessingError) => void  // 错误点击
  onSettingsClick?: () => void        // 设置点击
  onHelpClick?: () => void            // 帮助点击
  onPositionChange?: (position: { x: number; y: number }) => void  // 位置变化
  onSizeChange?: (size: { width: number; height: number }) => void  // 大小变化
}

// 自定义渲染器
export interface CustomRenderers {
  renderHeader?: (progress: AIProcessingProgress) => React.ReactNode
  renderContent?: (progress: AIProcessingProgress) => React.ReactNode
  renderFooter?: (progress: AIProcessingProgress) => React.ReactNode
  renderProgressBar?: (progress: AIProcessingProgress) => React.ReactNode
  renderStats?: (stats: ProcessingStats) => React.ReactNode
  renderCurrentTask?: (task: CurrentTask) => React.ReactNode
  renderTaskItem?: (result: ProcessingResult) => React.ReactNode
  renderError?: (error: ProcessingError) => React.ReactNode
  renderIcon?: (status: AIProcessingStatus) => React.ReactNode
  renderActions?: (progress: AIProcessingProgress) => React.ReactNode
}

// 主组件属性接口
export interface UniversalProgressCardProps {
  // 必需属性
  progress: AIProcessingProgress      // 进度数据
  
  // 基础配置
  title: string                       // 窗口标题
  subtitle?: string                   // 副标题
  icon?: React.ReactNode             // 自定义图标
  
  // 布局和外观
  position?: Position                 // 显示位置
  size?: Size                         // 组件大小
  theme?: Theme                       // 主题
  
  // 配置对象
  behavior?: BehaviorConfig           // 行为配置
  display?: DisplayConfig             // 显示配置
  animations?: AnimationSettings      // 动画配置
  styles?: StyleCustomization         // 样式定制
  
  // 回调函数
  callbacks?: InteractionCallbacks    // 交互回调
  
  // 自定义渲染
  renderers?: CustomRenderers         // 自定义渲染器
  
  // 兼容性属性 (与现有FloatingProgressCard兼容)
  onClose?: () => void
  onRetry?: (failedItems?: string[]) => void
  className?: string
}

// 内部状态管理
export interface InternalState {
  isMinimized: boolean                // 最小化状态
  isDragging: boolean                 // 拖拽状态
  isResizing: boolean                 // 调整大小状态
  position: { x: number; y: number }  // 当前位置
  size: { width: number; height: number }  // 当前大小
  zIndex: number                      // 层级
  isVisible: boolean                  // 可见性
  lastInteraction: Date              // 最后交互时间
}

// 上下文数据
export interface ProgressCardContext {
  state: InternalState                // 内部状态
  progress: AIProcessingProgress      // 进度数据
  config: UniversalProgressCardProps  // 配置
  actions: {
    minimize: () => void
    maximize: () => void
    close: () => void
    drag: (delta: { x: number; y: number }) => void
    resize: (size: { width: number; height: number }) => void
    bringToFront: () => void
  }
}

// 工具类型
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>

// 响应式断点类型
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

// 设备类型
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// 预设配置类型
export type PresetConfig = 'minimal' | 'standard' | 'detailed' | 'monitoring'

// 导出所有类型
export type {
  Theme,
  Position,
  Size,
  AnimationType
}