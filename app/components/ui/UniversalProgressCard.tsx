/**
 * 通用AI处理进度显示窗口组件
 * 功能完整的进度卡片，支持拖拽、最小化、多主题、响应式设计
 */

'use client'

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { 
  X, 
  Minus, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Settings, 
  HelpCircle,
  Move,
  Pause,
  Play,
  Square
} from 'lucide-react'
import { designTokens, themes, positions, responsive } from './design-tokens'
import { animationPresets, cssAnimations, performanceOptimizedStyles } from './animation-utils'
import { 
  useDeviceType, 
  useBreakpoint, 
  useResponsiveSize, 
  useResponsivePosition,
  usePerformanceOptimization,
  useTouchDevice,
  useSmartConfig,
  useSmartTheme,
  generateResponsiveClasses,
  calculateResponsiveStyles
} from './responsive-utils'
import { 
  StatusIcon, 
  PulsingDot, 
  AnimatedWave, 
  EnhancedProgressBar,
  CurrentTaskDisplay,
  StatsDisplay,
  ResultsList
} from './progress-components'
import { 
  UniversalProgressCardProps, 
  InternalState, 
  Theme,
  Size,
  Position,
  DeviceType
} from './types'

// 默认配置
const defaultConfig: Partial<UniversalProgressCardProps> = {
  position: 'bottom-right',
  size: 'normal',
  theme: 'light',
  behavior: {
    closable: true,
    minimizable: true,
    draggable: true,
    autoClose: false,
    persistPosition: false
  },
  display: {
    showProgressBar: true,
    showStats: true,
    showCurrentTask: true,
    showEstimatedTime: true,
    compact: false
  },
  animations: {
    entrance: 'bounce',
    exit: 'fade',
    progress: true,
    pulse: true,
    wave: true,
    glow: false
  }
}

// 主组件
const UniversalProgressCard: React.FC<UniversalProgressCardProps> = (props) => {
  // 合并配置
  const config = { ...defaultConfig, ...props }
  const { 
    progress, 
    title, 
    subtitle, 
    icon,
    position = 'bottom-right',
    size = 'normal',
    theme = 'light',
    behavior = {},
    display = {},
    animations = {},
    styles = {},
    callbacks = {},
    renderers = {}
  } = config

  // 内部状态
  const [internalState, setInternalState] = useState<InternalState>({
    isMinimized: false,
    isDragging: false,
    isResizing: false,
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    zIndex: 60,
    isVisible: true,
    lastInteraction: new Date()
  })

  // 引用
  const cardRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef({ isDragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 })

  // 响应式Hooks
  const deviceType = useDeviceType()
  const breakpoint = useBreakpoint()
  const performanceOpts = usePerformanceOptimization()
  const isTouchDevice = useTouchDevice()
  const getSmartConfig = useSmartConfig()
  const smartTheme = useSmartTheme(theme)

  // 智能配置合并
  const smartConfig = useMemo(() => {
    const autoConfig = getSmartConfig()
    
    // 合并用户配置和智能配置
    return {
      ...autoConfig,
      // 用户配置优先级更高
      size: useResponsiveSize(size),
      position: useResponsivePosition(position),
      theme: smartTheme,
      // 性能优化
      behavior: {
        ...autoConfig.behavior,
        ...behavior,
        draggable: (behavior.draggable ?? autoConfig.behavior.draggable) && !isTouchDevice
      },
      animations: {
        ...autoConfig.animations,
        ...animations,
        disabled: performanceOpts.reducedMotion || animations.disabled
      }
    }
  }, [getSmartConfig, size, position, smartTheme, behavior, animations, isTouchDevice, performanceOpts])

  // 响应式样式计算
  const responsiveStyles = useMemo(() => {
    const viewport = { 
      width: typeof window !== 'undefined' ? window.innerWidth : 1024, 
      height: typeof window !== 'undefined' ? window.innerHeight : 768 
    }
    
    return calculateResponsiveStyles(deviceType, breakpoint, viewport)
  }, [deviceType, breakpoint])

  // 主题样式 (使用智能主题)
  const themeStyles = themes[smartTheme]
  
  // 位置样式 (使用智能位置)
  const positionStyles = positions[smartConfig.position as keyof typeof positions]
  
  // 大小样式 (使用响应式大小)
  const sizeConfig = {
    width: responsiveStyles.container.width,
    padding: responsiveStyles.container.padding
  }

  // 拖拽功能 (使用智能配置)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!smartConfig.behavior.draggable || internalState.isMinimized) return
    
    e.preventDefault()
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: rect.left,
      startPosY: rect.top
    }
    
    setInternalState(prev => ({ ...prev, isDragging: true }))
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.isDragging) return
      
      const deltaX = e.clientX - dragStateRef.current.startX
      const deltaY = e.clientY - dragStateRef.current.startY
      
      setInternalState(prev => ({
        ...prev,
        position: {
          x: dragStateRef.current.startPosX + deltaX,
          y: dragStateRef.current.startPosY + deltaY
        }
      }))
      
      callbacks.onPositionChange?.({
        x: dragStateRef.current.startPosX + deltaX,
        y: dragStateRef.current.startPosY + deltaY
      })
    }
    
    const handleMouseUp = () => {
      dragStateRef.current.isDragging = false
      setInternalState(prev => ({ ...prev, isDragging: false }))
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [smartConfig.behavior.draggable, internalState.isMinimized, callbacks])

  // 最小化/最大化
  const toggleMinimize = useCallback(() => {
    const newMinimized = !internalState.isMinimized
    setInternalState(prev => ({ ...prev, isMinimized: newMinimized }))
    callbacks.onMinimize?.(newMinimized)
  }, [internalState.isMinimized, callbacks])

  // 关闭
  const handleClose = useCallback(() => {
    callbacks.onClose?.()
  }, [callbacks])

  // 重试失败项 (增强错误处理)
  const handleRetry = useCallback(() => {
    const failedItems = progress.results?.filter(r => r.status === 'error') || []
    
    // 如果没有失败项，则重试所有项
    if (failedItems.length === 0 && progress.stats?.errorCount && progress.stats.errorCount > 0) {
      callbacks.onRetry?.([])
      return
    }
    
    callbacks.onRetry?.(failedItems)
  }, [progress.results, progress.stats, callbacks])

  // 自动关闭逻辑 (使用智能配置和错误处理优化)
  useEffect(() => {
    if (!smartConfig.behavior.autoClose || progress.status !== 'completed') return
    
    // 根据处理结果智能决定自动关闭时机
    const hasErrors = progress.stats?.errorCount && progress.stats.errorCount > 0
    const hasSuccess = progress.stats?.successCount && progress.stats.successCount > 0
    
    let delay: number
    if (hasSuccess && !hasErrors) {
      // 全部成功时，3秒后自动关闭
      delay = 3000
    } else if (!hasSuccess && hasErrors) {
      // 全部失败时，5秒后自动关闭
      delay = 5000
    } else if (hasSuccess && hasErrors) {
      // 部分成功部分失败时，不自动关闭，让用户决定重试
      return
    } else {
      // 默认情况
      delay = typeof smartConfig.behavior.autoClose === 'number' ? smartConfig.behavior.autoClose : 3000
    }
    
    const timer = setTimeout(() => {
      handleClose()
    }, delay)
    
    return () => clearTimeout(timer)
  }, [smartConfig.behavior.autoClose, progress.status, progress.stats, handleClose])

  // 键盘快捷键 (使用智能配置)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && smartConfig.behavior.closable) {
        handleClose()
      }
      if (e.key === 'm' && e.ctrlKey && smartConfig.behavior.minimizable) {
        e.preventDefault()
        toggleMinimize()
      }
    }
    
    if (internalState.isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [smartConfig.behavior.closable, smartConfig.behavior.minimizable, internalState.isVisible, handleClose, toggleMinimize])

  // 渲染状态消息
  const renderStatusMessage = () => {
    if (renderers.renderContent) {
      return renderers.renderContent(progress)
    }
    
    switch (progress.status) {
      case 'initializing':
        return <span className="text-purple-700 text-sm font-medium">正在初始化...</span>
      case 'processing':
        return <span className="text-blue-700 text-sm font-medium">正在处理中...</span>
      case 'completed':
        return <span className="text-green-700 text-sm font-medium">处理完成</span>
      case 'error':
        return <span className="text-red-700 text-sm font-medium">处理失败</span>
      case 'cancelled':
        return <span className="text-gray-700 text-sm font-medium">已取消</span>
      default:
        return null
    }
  }

  // 渲染操作按钮
  const renderActions = () => {
    if (renderers.renderActions) {
      return renderers.renderActions(progress)
    }
    
    const actions = []
    
    // 重试按钮 (增强移动端适配)
    if (progress.status === 'completed' && progress.stats?.errorCount && progress.stats.errorCount > 0) {
      const errorCount = progress.stats.errorCount
      actions.push(
        <button
          key="retry"
          onClick={handleRetry}
          className={`flex items-center space-x-1 px-3 py-1.5 bg-orange-100 text-orange-700 text-xs rounded-lg hover:bg-orange-200 transition-colors ${
            deviceType === 'mobile' ? 'min-h-[40px] touch-manipulation' : ''
          }`}
          title={`重试失败的 ${errorCount} 项`}
        >
          <RefreshCw className="w-3 h-3" />
          <span className={deviceType === 'mobile' ? 'text-sm' : ''}>
            重试 {deviceType === 'mobile' ? `(${errorCount})` : ''}
          </span>
        </button>
      )
    }
    
    // 取消按钮
    if (progress.status === 'processing' && callbacks.onCancel) {
      actions.push(
        <button
          key="cancel"
          onClick={callbacks.onCancel}
          className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 transition-colors"
          title="取消处理"
        >
          <Square className="w-3 h-3" />
          <span>取消</span>
        </button>
      )
    }
    
    return actions.length > 0 ? (
      <div className="flex justify-end space-x-2 mt-3">
        {actions}
      </div>
    ) : null
  }

  // 渲染头部
  const renderHeader = () => {
    if (renderers.renderHeader) {
      return renderers.renderHeader(progress)
    }
    
    return (
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {icon || <StatusIcon status={progress.status} />}
          <div>
            <h4 className="text-sm font-medium text-gray-900">{title}</h4>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* 最小化按钮 (移动端优化) */}
          {smartConfig.behavior.minimizable && (
            <button
              onClick={toggleMinimize}
              className={`text-gray-400 hover:text-gray-600 transition-colors p-1 rounded ${
                deviceType === 'mobile' ? 'min-h-[40px] min-w-[40px] touch-manipulation' : ''
              }`}
              title={internalState.isMinimized ? "展开" : "最小化"}
            >
              {internalState.isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </button>
          )}
          
          {/* 关闭按钮 (移动端优化) */}
          {smartConfig.behavior.closable && (
            <button
              onClick={handleClose}
              className={`text-gray-400 hover:text-gray-600 transition-colors p-1 rounded ${
                deviceType === 'mobile' ? 'min-h-[40px] min-w-[40px] touch-manipulation' : ''
              }`}
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // 如果状态为空闲，不显示组件
  if (progress.status === 'idle') return null

  const isProcessing = progress.status === 'processing' || progress.status === 'initializing'
  
  // 生成响应式类名
  const responsiveClasses = generateResponsiveClasses(
    styles.className || '',
    deviceType,
    breakpoint
  )
  
  // 动态计算样式
  const cardStyles = {
    ...performanceOptimizedStyles,
    ...sizeConfig,
    backgroundColor: themeStyles.colors.background,
    borderColor: themeStyles.colors.border,
    color: themeStyles.colors.text,
    zIndex: internalState.zIndex,
    // 如果正在拖拽，使用自定义位置
    ...(internalState.isDragging ? {
      position: 'fixed',
      left: internalState.position.x,
      top: internalState.position.y,
      transform: 'none'
    } : positionStyles),
    // 应用响应式样式
    ...responsiveStyles.positioning,
    ...styles.cardStyle
  }
  
  // 动画类名 (根据性能配置决定)
  const animationClasses = smartConfig.animations.disabled ? '' : [
    smartConfig.animations.entrance === 'bounce' ? 'bounce-in' : 
    smartConfig.animations.entrance === 'fade' ? 'fade-in' :
    smartConfig.animations.entrance === 'scale' ? 'scale-in' : '',
    progress.status === 'completed' && smartConfig.animations.glow ? 'success-pulse' : ''
  ].filter(Boolean).join(' ')

  return (
    <>
      {/* 自定义CSS动画 */}
      <style jsx>{`
        ${cssAnimations}
        .bounce-in {
          animation: bounceIn 0.6s ease-out;
        }
        .success-pulse {
          animation: successPulse 1s ease-out;
        }
        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        .scale-in {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>

      <div
        ref={cardRef}
        className={`fixed z-50 ${responsiveClasses} ${animationClasses}`}
        style={cardStyles as React.CSSProperties}
        onMouseDown={smartConfig.behavior.draggable ? handleMouseDown : undefined}
      >
        <div className={`bg-white/95 backdrop-blur-sm border border-gray-200/70 rounded-xl shadow-lg transition-all duration-300 ${
          internalState.isMinimized ? 'w-16 h-16' : ''
        } ${styles.cardClassName || ''}`}>
          
          {internalState.isMinimized ? (
            // 最小化状态
            <div 
              className="w-full h-full flex items-center justify-center cursor-pointer rounded-xl hover:bg-gray-50 transition-colors"
              onClick={toggleMinimize}
            >
              <div className="relative">
                <StatusIcon status={progress.status} size="md" />
                <PulsingDot status={progress.status} />
              </div>
            </div>
          ) : (
            // 完整状态
            <div className={`relative ${sizeConfig.padding}`} style={{ padding: sizeConfig.padding }}>
              {/* 动态波形背景 */}
              {smartConfig.animations.wave && !smartConfig.animations.disabled && (
                <AnimatedWave isActive={isProcessing} />
              )}
              
              {/* 头部 */}
              {renderHeader()}

              {/* 进度条 */}
              {smartConfig.display.showProgressBar && progress.total > 0 && (
                <div className="mb-3">
                  <EnhancedProgressBar
                    current={progress.current}
                    total={progress.total}
                    percentage={progress.percentage}
                    status={progress.status}
                    animated={smartConfig.animations.progress && !smartConfig.animations.disabled}
                    showShimmer={isProcessing && smartConfig.animations.progress && !smartConfig.animations.disabled}
                  />
                </div>
              )}

              {/* 状态信息 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {smartConfig.animations.pulse && !smartConfig.animations.disabled && <PulsingDot status={progress.status} />}
                  {renderStatusMessage()}
                </div>
              </div>

              {/* 当前任务 */}
              {smartConfig.display.showCurrentTask && (
                <CurrentTaskDisplay
                  task={progress.currentTask}
                  status={progress.status}
                  className="mb-3"
                />
              )}

              {/* 统计信息 */}
              {smartConfig.display.showStats && (
                <StatsDisplay
                  stats={progress.stats}
                  status={progress.status}
                  compact={smartConfig.display.compact}
                  className="mb-3"
                />
              )}

              {/* 结果列表 */}
              {smartConfig.display.showResults && progress.results && progress.results.length > 0 && (
                <ResultsList
                  results={progress.results}
                  maxItems={smartConfig.display.compact ? 3 : 5}
                  onItemClick={callbacks.onItemClick}
                  className="mb-3"
                />
              )}

              {/* 操作按钮 */}
              {renderActions()}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default UniversalProgressCard

// 导出相关类型和工具
export { 
  StatusIcon, 
  PulsingDot, 
  AnimatedWave, 
  EnhancedProgressBar,
  CurrentTaskDisplay,
  StatsDisplay,
  ResultsList 
} from './progress-components'

export type { 
  UniversalProgressCardProps, 
  AIProcessingProgress,
  ProcessingResult,
  ProcessingStats,
  CurrentTask
} from './types'