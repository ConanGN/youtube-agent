'use client'

/**
 * 增强的浮动进度卡片组件
 * 为AI字幕处理提供轻量级的浮动进度显示
 * 特性：动态波形、脉冲指示、响应式设计、紫色AI主题
 */

import React, { useEffect, useState } from 'react'
import { X, Loader2, CheckCircle, AlertCircle, Bot, RefreshCw } from 'lucide-react'

// 处理进度接口
export interface ProcessingProgress {
  current: number
  total: number
  status: 'idle' | 'processing' | 'completed' | 'error' | 'cancelled'
  currentVideoTitle?: string
  failedCount?: number
  successCount?: number
  results?: Array<{
    id: string
    status: 'pending' | 'processing' | 'success' | 'error'
    transcript?: string
    error?: string
    processingTime?: number
  }>
}

// 组件属性接口
interface FloatingProgressCardProps {
  progress: ProcessingProgress
  onClose?: () => void
  onRetry?: () => void
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  className?: string
}

// 动态波形组件
const AnimatedWave: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  if (!isActive) return null

  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
      <div className="relative h-full">
        {/* 主波形 */}
        <div 
          className="absolute bottom-0 h-full w-full bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 opacity-60"
          style={{
            background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 50%, #8B5CF6 100%)',
            animation: 'wave 2s ease-in-out infinite',
            transformOrigin: 'bottom'
          }}
        />
        {/* 副波形 */}
        <div 
          className="absolute bottom-0 h-2/3 w-full bg-gradient-to-r from-blue-300 via-purple-300 to-blue-300 opacity-40"
          style={{
            background: 'linear-gradient(90deg, #93C5FD 0%, #C4B5FD 50%, #93C5FD 100%)',
            animation: 'wave 2s ease-in-out infinite 0.5s',
            transformOrigin: 'bottom'
          }}
        />
      </div>
    </div>
  )
}

// 脉冲指示点组件
const PulsingDot: React.FC<{ status: string }> = ({ status }) => {
  const getColorClass = () => {
    switch (status) {
      case 'processing':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="relative">
      <div className={`w-2 h-2 rounded-full ${getColorClass()}`} />
      {status === 'processing' && (
        <div className={`absolute inset-0 w-2 h-2 rounded-full ${getColorClass()} animate-ping`} />
      )}
    </div>
  )
}

// 智能状态图标组件
const StatusIcon: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  
  switch (status) {
    case 'processing':
      return <Loader2 className={`${iconSize} text-blue-500 animate-spin`} />
    case 'completed':
      return <CheckCircle className={`${iconSize} text-green-500`} />
    case 'error':
      return <AlertCircle className={`${iconSize} text-red-500`} />
    default:
      return <Bot className={`${iconSize} text-purple-500`} />
  }
}

// 主浮动进度卡片组件
const FloatingProgressCard: React.FC<FloatingProgressCardProps> = ({
  progress,
  onClose,
  onRetry,
  position = 'bottom-right',
  className = ''
}) => {
  const [isMinimized, setIsMinimized] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)

  // 计算进度百分比
  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  // 获取定位样式
  const getPositionClass = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      default:
        return 'bottom-4 right-4'
    }
  }

  // 成功动画效果
  useEffect(() => {
    if (progress.status === 'completed' && progress.successCount && progress.successCount > 0) {
      setShowSuccessAnimation(true)
      const timer = setTimeout(() => setShowSuccessAnimation(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [progress.status, progress.successCount])

  // 渲染状态消息
  const renderStatusMessage = () => {
    switch (progress.status) {
      case 'processing':
        return (
          <span className="text-blue-700 text-sm font-medium">
            正在处理中...
          </span>
        )
      case 'completed':
        return (
          <span className="text-green-700 text-sm font-medium">
            处理完成
          </span>
        )
      case 'error':
        return (
          <span className="text-red-700 text-sm font-medium">
            处理失败
          </span>
        )
      default:
        return null
    }
  }

  // 渲染统计信息
  const renderStats = () => {
    if (progress.status === 'completed') {
      return (
        <div className="text-xs text-gray-600 space-x-2">
          <span className="text-green-600">成功 {progress.successCount || 0}</span>
          {(progress.failedCount || 0) > 0 && (
            <span className="text-red-600">失败 {progress.failedCount}</span>
          )}
        </div>
      )
    }
    
    if (progress.total > 0) {
      return (
        <div className="text-xs text-gray-500">
          {progress.current} / {progress.total}
        </div>
      )
    }
    
    return null
  }

  if (progress.status === 'idle') return null

  return (
    <>
      {/* 自定义CSS动画 */}
      <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.8); }
          50% { transform: scaleY(1.2); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes success-pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
        .success-pulse {
          animation: success-pulse 1s ease-out;
        }
      `}</style>

      <div 
        className={`fixed ${getPositionClass()} z-50 ${className} bounce-in ${
          showSuccessAnimation ? 'success-pulse' : ''
        }`}
      >
        <div className={`bg-white/95 backdrop-blur-sm border border-gray-200/70 rounded-xl shadow-lg transition-all duration-300 ${
          isMinimized ? 'w-16 h-16' : 'w-80 max-w-sm'
        }`}>
          {isMinimized ? (
            // 最小化状态
            <div 
              className="w-full h-full flex items-center justify-center cursor-pointer rounded-xl hover:bg-gray-50 transition-colors"
              onClick={() => setIsMinimized(false)}
            >
              <div className="relative">
                <StatusIcon status={progress.status} size="md" />
                <PulsingDot status={progress.status} />
              </div>
            </div>
          ) : (
            // 完整状态
            <div className="relative p-4">
              {/* 动态波形背景 */}
              <AnimatedWave isActive={progress.status === 'processing'} />
              
              {/* 头部区域 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <StatusIcon status={progress.status} />
                  <h4 className="text-sm font-medium text-gray-900 flex items-center">
                    <Bot className="w-4 h-4 mr-1 text-purple-500" />
                    AI字幕处理
                  </h4>
                </div>
                
                <div className="flex items-center space-x-1">
                  {/* 最小化按钮 */}
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
                    title="最小化"
                  >
                    <div className="w-3 h-0.5 bg-current" />
                  </button>
                  
                  {/* 关闭按钮 */}
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
                      title="关闭"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 进度条 */}
              {progress.total > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>进度</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="w-full bg-gray-200/70 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-600 transition-all duration-500 ease-out relative overflow-hidden"
                      style={{ width: `${progressPercent}%` }}
                    >
                      {/* 流光效果 */}
                      {progress.status === 'processing' && (
                        <div 
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          style={{
                            animation: 'shimmer 2s infinite',
                            transform: 'translateX(-100%)'
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 状态信息 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PulsingDot status={progress.status} />
                  {renderStatusMessage()}
                </div>
                {renderStats()}
              </div>

              {/* 当前处理视频 */}
              {progress.currentVideoTitle && progress.status === 'processing' && (
                <div className="mt-2 text-xs text-gray-600 truncate bg-gray-50/50 px-2 py-1 rounded">
                  {progress.currentVideoTitle}
                </div>
              )}

              {/* 操作按钮 */}
              {progress.status === 'completed' && (progress.failedCount || 0) > 0 && onRetry && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={onRetry}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-orange-100 text-orange-700 text-xs rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>重试</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 流光动画样式 */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  )
}

export default FloatingProgressCard