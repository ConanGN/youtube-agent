/**
 * FloatingProgressCard 适配器
 * 提供与现有代码的向后兼容性，同时使用新的 UniversalProgressCard
 */

'use client'

import React from 'react'
import UniversalProgressCard from './UniversalProgressCard'
import { ProcessingProgress } from './FloatingProgressCard' // 导入原有接口
import { AIProcessingProgress, UniversalProgressCardProps } from './types'

// 原有的 ProcessingProgress 接口兼容适配器
interface FloatingProgressCardProps {
  progress: ProcessingProgress
  onClose?: () => void
  onRetry?: () => void
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  className?: string
}

// 将原有的 ProcessingProgress 转换为新的 AIProcessingProgress
const convertProgressData = (oldProgress: ProcessingProgress): AIProcessingProgress => {
  const { current, total, status, currentVideoTitle, failedCount, successCount, results } = oldProgress

  // 转换状态映射
  const statusMap: Record<string, any> = {
    'idle': 'idle',
    'processing': 'processing',
    'completed': 'completed',
    'error': 'error',
    'cancelled': 'cancelled'
  }

  return {
    current,
    total,
    status: statusMap[status] || 'idle',
    
    // 当前任务信息
    currentTask: currentVideoTitle ? {
      id: 'current-video',
      title: currentVideoTitle,
      description: '正在处理视频内容...'
    } : undefined,
    
    // 统计信息
    stats: {
      successCount: successCount || 0,
      errorCount: failedCount || 0,
      skipCount: 0
    },
    
    // 结果转换
    results: results?.map(result => ({
      id: result.id,
      status: result.status === 'pending' ? 'pending' : 
              result.status === 'processing' ? 'processing' :
              result.status === 'success' ? 'success' : 'error',
      data: result.transcript,
      error: result.error,
      processingTime: result.processingTime
    })) || []
  }
}

// 适配器组件
const FloatingProgressCardAdapter: React.FC<FloatingProgressCardProps> = ({
  progress,
  onClose,
  onRetry,
  position = 'bottom-right',
  className
}) => {
  // 转换进度数据
  const convertedProgress = convertProgressData(progress)
  
  // 创建适配的配置
  const adaptedConfig: UniversalProgressCardProps = {
    progress: convertedProgress,
    title: 'AI字幕处理',
    subtitle: '智能语音转文字',
    position,
    size: 'normal',
    theme: 'light',
    
    // 行为配置 - 保持与原组件一致的行为
    behavior: {
      closable: true,
      minimizable: true,
      draggable: true,
      autoClose: false, // 保持原有的手动控制逻辑
      persistPosition: false
    },
    
    // 显示配置 - 与原组件功能对应
    display: {
      showProgressBar: true,
      showStats: true,
      showCurrentTask: true,
      showEstimatedTime: false,
      showResults: false, // 原组件不显示详细结果
      compact: true // 保持原有的紧凑设计
    },
    
    // 动画配置 - 与原组件效果一致
    animations: {
      entrance: 'bounce',
      exit: 'fade',
      progress: true,
      pulse: true,
      wave: true,
      glow: false
    },
    
    // 样式配置
    styles: {
      className
    },
    
    // 回调适配
    callbacks: {
      onClose,
      onRetry: onRetry ? (failedItems) => {
        // 原组件的 onRetry 不接受参数，保持兼容
        onRetry()
      } : undefined
    }
  }

  return <UniversalProgressCard {...adaptedConfig} />
}

// 导出适配器以替换原组件
export default FloatingProgressCardAdapter

// 同时导出原有接口，保持类型兼容性
export type { ProcessingProgress } from './FloatingProgressCard'