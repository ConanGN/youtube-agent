/**
 * 通用AI处理进度组件的子组件集合
 * 包含进度条、动画效果、状态图标等可复用组件
 */

'use client'

import React, { useEffect, useState } from 'react'
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Pause, 
  Play,
  Bot,
  Brain,
  Sparkles,
  Zap
} from 'lucide-react'
import { designTokens } from './design-tokens'
import { animationPresets, cssAnimations } from './animation-utils'
import { 
  AIProcessingStatus, 
  CurrentTask, 
  ProcessingStats,
  ProcessingResult,
  AnimationSettings 
} from './types'

// 样式常量
const styles = {
  wave: {
    background: designTokens.colors.gradients.processing,
    animation: 'wave 2s ease-in-out infinite',
    transformOrigin: 'bottom'
  },
  shimmer: {
    background: designTokens.colors.gradients.shimmer,
    animation: 'shimmer 2s infinite',
    transform: 'translateX(-100%)'
  }
}

// 智能状态图标组件
interface StatusIconProps {
  status: AIProcessingStatus
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  customIcon?: React.ReactNode
  className?: string
}

export const StatusIcon: React.FC<StatusIconProps> = ({ 
  status, 
  size = 'md', 
  animated = true,
  customIcon,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const iconSize = sizeClasses[size]
  
  if (customIcon) {
    return <div className={`${iconSize} ${className}`}>{customIcon}</div>
  }

  switch (status) {
    case 'idle':
      return <Bot className={`${iconSize} text-gray-500 ${className}`} />
    case 'initializing':
      return <Sparkles className={`${iconSize} text-purple-500 ${animated ? 'animate-pulse' : ''} ${className}`} />
    case 'processing':
      return <Loader2 className={`${iconSize} text-blue-500 ${animated ? 'animate-spin' : ''} ${className}`} />
    case 'completed':
      return <CheckCircle className={`${iconSize} text-green-500 ${className}`} />
    case 'error':
      return <XCircle className={`${iconSize} text-red-500 ${className}`} />
    case 'cancelled':
      return <AlertCircle className={`${iconSize} text-gray-500 ${className}`} />
    default:
      return <Bot className={`${iconSize} text-gray-500 ${className}`} />
  }
}

// 脉冲指示点组件
interface PulsingDotProps {
  status: AIProcessingStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const PulsingDot: React.FC<PulsingDotProps> = ({ 
  status, 
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  }

  const getColorClass = () => {
    switch (status) {
      case 'processing':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'initializing':
        return 'bg-purple-500'
      case 'cancelled':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  const dotSize = sizeClasses[size]
  const colorClass = getColorClass()
  const shouldPulse = status === 'processing' || status === 'initializing'

  return (
    <div className={`relative ${className}`}>
      <div className={`${dotSize} rounded-full ${colorClass}`} />
      {shouldPulse && (
        <div className={`absolute inset-0 ${dotSize} rounded-full ${colorClass} animate-ping`} />
      )}
    </div>
  )
}

// 动态波形组件
interface AnimatedWaveProps {
  isActive: boolean
  height?: string
  colors?: {
    primary: string
    secondary: string
  }
  className?: string
}

export const AnimatedWave: React.FC<AnimatedWaveProps> = ({ 
  isActive, 
  height = 'h-1',
  colors = {
    primary: designTokens.colors.gradients.processing,
    secondary: 'linear-gradient(90deg, #93C5FD 0%, #C4B5FD 50%, #93C5FD 100%)'
  },
  className = ''
}) => {
  if (!isActive) return null

  return (
    <>
      <style jsx>{`
        ${cssAnimations}
      `}</style>
      
      <div className={`absolute bottom-0 left-0 right-0 ${height} overflow-hidden ${className}`}>
        <div className="relative h-full">
          {/* 主波形 */}
          <div 
            className="absolute bottom-0 h-full w-full opacity-60"
            style={{
              ...styles.wave,
              background: colors.primary  // 覆盖styles.wave中的background
            }}
          />
          
          {/* 副波形 */}
          <div 
            className="absolute bottom-0 h-2/3 w-full opacity-40"
            style={{
              background: colors.secondary,
              animation: 'wave 2s ease-in-out infinite 0.5s',
              transformOrigin: 'bottom'
            }}
          />
        </div>
      </div>
    </>
  )
}

// 增强进度条组件
interface EnhancedProgressBarProps {
  current: number
  total: number
  percentage?: number
  status: AIProcessingStatus
  animated?: boolean
  showShimmer?: boolean
  height?: string
  className?: string
  onProgressClick?: (percentage: number) => void
}

export const EnhancedProgressBar: React.FC<EnhancedProgressBarProps> = ({
  current,
  total,
  percentage,
  status,
  animated = true,
  showShimmer = true,
  height = 'h-2',
  className = '',
  onProgressClick
}) => {
  const progressPercent = percentage ?? (total > 0 ? (current / total) * 100 : 0)
  const isProcessing = status === 'processing' || status === 'initializing'
  
  // 根据状态确定颜色
  const getProgressColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-500 to-green-600'
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-600'
      case 'cancelled':
        return 'bg-gradient-to-r from-gray-500 to-gray-600'
      default:
        return 'bg-gradient-to-r from-purple-500 via-blue-500 to-purple-600'
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onProgressClick) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickPercentage = (clickX / rect.width) * 100
      onProgressClick(Math.max(0, Math.min(100, clickPercentage)))
    }
  }

  return (
    <>
      <style jsx>{`
        ${cssAnimations}
      `}</style>
      
      <div className={`space-y-1 ${className}`}>
        {/* 进度信息 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>进度</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        
        {/* 进度条容器 */}
        <div 
          className={`w-full bg-gray-200/70 rounded-full ${height} overflow-hidden cursor-pointer`}
          onClick={handleClick}
        >
          <div
            className={`${height} ${getProgressColor()} transition-all duration-500 ease-out relative overflow-hidden`}
            style={{ 
              width: `${Math.max(0, Math.min(100, progressPercent))}%`,
              transition: animated ? 'width 0.5s ease-out' : 'none'
            }}
          >
            {/* 流光效果 */}
            {isProcessing && showShimmer && (
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                style={styles.shimmer}
              />
            )}
          </div>
        </div>
        
        {/* 详细信息 */}
        {total > 0 && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>{current} / {total}</span>
            {isProcessing && (
              <span className="flex items-center space-x-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                <span>处理中...</span>
              </span>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// 当前任务显示组件
interface CurrentTaskDisplayProps {
  task?: CurrentTask
  status: AIProcessingStatus
  className?: string
}

export const CurrentTaskDisplay: React.FC<CurrentTaskDisplayProps> = ({
  task,
  status,
  className = ''
}) => {
  if (!task || status === 'idle' || status === 'completed') return null

  // 计算任务执行时间
  const getExecutionTime = () => {
    if (!task.startTime) return null
    const elapsed = Date.now() - task.startTime.getTime()
    const seconds = Math.floor(elapsed / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`
    }
    return `${seconds}秒`
  }

  // 计算预估剩余时间
  const getEstimatedTime = () => {
    if (!task.estimatedDuration || !task.progress) return null
    const elapsed = task.startTime ? Date.now() - task.startTime.getTime() : 0
    const progressRatio = task.progress / 100
    const totalEstimated = elapsed / progressRatio
    const remaining = totalEstimated - elapsed
    
    if (remaining <= 0) return null
    
    const seconds = Math.ceil(remaining / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (minutes > 0) {
      return `剩余 ${minutes}分${seconds % 60}秒`
    }
    return `剩余 ${seconds}秒`
  }

  const executionTime = getExecutionTime()
  const estimatedTime = getEstimatedTime()

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 任务标题 */}
      <div className="flex items-center space-x-2">
        <PulsingDot status={status} size="sm" />
        <span className="text-sm font-medium text-gray-900 truncate">
          {task.title}
        </span>
      </div>
      
      {/* 任务描述 */}
      {task.description && (
        <div className="text-xs text-gray-600 bg-gray-50/50 px-2 py-1 rounded">
          {task.description}
        </div>
      )}
      
      {/* 任务内部进度 */}
      {task.progress !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>任务进度</span>
            <span>{Math.round(task.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="h-1 bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* 时间信息 */}
      {(executionTime || estimatedTime) && (
        <div className="flex justify-between text-xs text-gray-500">
          {executionTime && <span>已用时: {executionTime}</span>}
          {estimatedTime && <span>{estimatedTime}</span>}
        </div>
      )}
    </div>
  )
}

// 统计信息显示组件
interface StatsDisplayProps {
  stats?: ProcessingStats
  status: AIProcessingStatus
  compact?: boolean
  className?: string
}

export const StatsDisplay: React.FC<StatsDisplayProps> = ({
  stats,
  status,
  compact = false,
  className = ''
}) => {
  if (!stats) return null

  const { successCount = 0, errorCount = 0, skipCount = 0 } = stats
  const totalCount = successCount + errorCount + skipCount

  if (totalCount === 0) return null

  // 格式化处理时间
  const formatTime = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  // 计算吞吐量
  const getThroughput = () => {
    if (!stats.totalProcessingTime || totalCount === 0) return null
    const itemsPerSecond = totalCount / (stats.totalProcessingTime / 1000)
    return itemsPerSecond.toFixed(1)
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 text-xs ${className}`}>
        {successCount > 0 && (
          <span className="text-green-600 flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>{successCount}</span>
          </span>
        )}
        {errorCount > 0 && (
          <span className="text-red-600 flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>{errorCount}</span>
          </span>
        )}
        {skipCount > 0 && (
          <span className="text-gray-500 flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>{skipCount}</span>
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 基础统计 */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className="text-green-600 font-medium">{successCount}</div>
          <div className="text-gray-500">成功</div>
        </div>
        <div className="text-center">
          <div className="text-red-600 font-medium">{errorCount}</div>
          <div className="text-gray-500">失败</div>
        </div>
        <div className="text-center">
          <div className="text-gray-600 font-medium">{skipCount}</div>
          <div className="text-gray-500">跳过</div>
        </div>
      </div>
      
      {/* 性能统计 */}
      {stats.totalProcessingTime && (
        <div className="space-y-1 text-xs text-gray-500 border-t pt-2">
          <div className="flex justify-between">
            <span>总用时:</span>
            <span>{formatTime(stats.totalProcessingTime)}</span>
          </div>
          {stats.averageProcessingTime && (
            <div className="flex justify-between">
              <span>平均:</span>
              <span>{formatTime(stats.averageProcessingTime)}</span>
            </div>
          )}
          {getThroughput() && (
            <div className="flex justify-between">
              <span>速度:</span>
              <span>{getThroughput()}/s</span>
            </div>
          )}
        </div>
      )}
      
      {/* 预估剩余时间 */}
      {stats.estimatedTimeRemaining && status === 'processing' && (
        <div className="text-xs text-blue-600 border-t pt-2">
          预计剩余: {formatTime(stats.estimatedTimeRemaining)}
        </div>
      )}
    </div>
  )
}

// 结果列表组件
interface ResultsListProps {
  results?: ProcessingResult[]
  maxItems?: number
  onItemClick?: (result: ProcessingResult) => void
  className?: string
}

export const ResultsList: React.FC<ResultsListProps> = ({
  results = [],
  maxItems = 5,
  onItemClick,
  className = ''
}) => {
  if (results.length === 0) return null

  const displayResults = results.slice(0, maxItems)
  const hasMore = results.length > maxItems

  const getStatusIcon = (status: ProcessingResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'error':
        return <XCircle className="w-3 h-3 text-red-500" />
      case 'processing':
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
      case 'pending':
        return <div className="w-3 h-3 rounded-full border border-gray-300" />
      case 'skipped':
        return <AlertCircle className="w-3 h-3 text-gray-500" />
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-300" />
    }
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-xs font-medium text-gray-700 mb-2">
        处理结果 ({results.length})
      </div>
      
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {displayResults.map((result, index) => (
          <div
            key={result.id || index}
            className={`flex items-center justify-between p-2 rounded text-xs hover:bg-gray-50 transition-colors ${
              onItemClick ? 'cursor-pointer' : ''
            }`}
            onClick={() => onItemClick?.(result)}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {getStatusIcon(result.status)}
              <span className="truncate">
                {result.id || `项目 ${index + 1}`}
              </span>
            </div>
            
            {result.processingTime && (
              <span className="text-gray-500 ml-2">
                {result.processingTime < 1000 
                  ? `${result.processingTime}ms`
                  : `${(result.processingTime / 1000).toFixed(1)}s`
                }
              </span>
            )}
          </div>
        ))}
      </div>
      
      {hasMore && (
        <div className="text-xs text-gray-500 text-center pt-1 border-t">
          还有 {results.length - maxItems} 项...
        </div>
      )}
    </div>
  )
}