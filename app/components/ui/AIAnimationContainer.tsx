'use client'

// AI动画容器组件
// 统一管理AI字幕处理的各种动画效果

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { AIProcessingAnimation, type AnimationState } from './AIProcessingAnimation'
import { FloatingProgressCard, type ProgressCardState } from './FloatingProgressCard'

// 动画管理上下文
interface AIAnimationContextType {
  // 全屏动画状态
  showFullscreenAnimation: (config: Partial<AnimationState>) => void
  hideFullscreenAnimation: () => void
  updateFullscreenAnimation: (updates: Partial<AnimationState>) => void
  
  // 浮动卡片状态
  showFloatingCard: (config: Partial<ProgressCardState>) => void
  hideFloatingCard: () => void
  updateFloatingCard: (updates: Partial<ProgressCardState>) => void
  
  // 全局状态
  isAnimating: boolean
  animationType: 'none' | 'fullscreen' | 'floating' | 'both'
}

const AIAnimationContext = createContext<AIAnimationContextType | null>(null)

// Hook for using animation context
export const useAIAnimation = () => {
  const context = useContext(AIAnimationContext)
  if (!context) {
    throw new Error('useAIAnimation must be used within AIAnimationProvider')
  }
  return context
}

// 默认动画状态
const DEFAULT_ANIMATION_STATE: AnimationState = {
  status: 'idle',
  progress: {
    current: 0,
    total: 0,
    percentage: 0
  },
  results: {
    successCount: 0,
    failedCount: 0,
    totalCount: 0
  }
}

const DEFAULT_CARD_STATE: ProgressCardState = {
  status: 'idle',
  current: 0,
  total: 0,
  successCount: 0,
  failedCount: 0
}

// Provider组件
interface AIAnimationProviderProps {
  children: React.ReactNode
  defaultMode?: 'fullscreen' | 'floating' | 'auto'
  enableAutoSwitch?: boolean // 自动根据屏幕尺寸切换
}

export const AIAnimationProvider: React.FC<AIAnimationProviderProps> = ({
  children,
  defaultMode = 'auto',
  enableAutoSwitch = true
}) => {
  const [fullscreenState, setFullscreenState] = useState<AnimationState>(DEFAULT_ANIMATION_STATE)
  const [floatingState, setFloatingState] = useState<ProgressCardState>(DEFAULT_CARD_STATE)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [showFloating, setShowFloating] = useState(false)
  const [currentMode, setCurrentMode] = useState<'fullscreen' | 'floating'>(
    defaultMode === 'auto' ? 'floating' : defaultMode
  )

  // Media query for responsive behavior
  useEffect(() => {
    if (!enableAutoSwitch || defaultMode !== 'auto') return

    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const handleChange = (e: MediaQueryListEvent) => {
      setCurrentMode(e.matches ? 'floating' : 'floating') // 默认都使用floating，更轻量
    }

    handleChange(mediaQuery as any)
    mediaQuery.addListener(handleChange)

    return () => mediaQuery.removeListener(handleChange)
  }, [enableAutoSwitch, defaultMode])

  // 全屏动画控制
  const showFullscreenAnimation = useCallback((config: Partial<AnimationState>) => {
    setFullscreenState(prev => ({ ...prev, ...config }))
    setShowFullscreen(true)
    
    // 如果同时显示浮动卡片，隐藏它
    if (showFloating) {
      setShowFloating(false)
    }
  }, [showFloating])

  const hideFullscreenAnimation = useCallback(() => {
    setShowFullscreen(false)
    setTimeout(() => {
      setFullscreenState(DEFAULT_ANIMATION_STATE)
    }, 300)
  }, [])

  const updateFullscreenAnimation = useCallback((updates: Partial<AnimationState>) => {
    setFullscreenState(prev => ({ ...prev, ...updates }))
  }, [])

  // 浮动卡片控制
  const showFloatingCard = useCallback((config: Partial<ProgressCardState>) => {
    setFloatingState(prev => ({ ...prev, ...config }))
    setShowFloating(true)
    
    // 如果同时显示全屏动画，隐藏它
    if (showFullscreen) {
      setShowFullscreen(false)
    }
  }, [showFullscreen])

  const hideFloatingCard = useCallback(() => {
    setShowFloating(false)
    setTimeout(() => {
      setFloatingState(DEFAULT_CARD_STATE)
    }, 300)
  }, [])

  const updateFloatingCard = useCallback((updates: Partial<ProgressCardState>) => {
    setFloatingState(prev => ({ ...prev, ...updates }))
  }, [])

  // 计算全局状态
  const isAnimating = showFullscreen || showFloating
  const animationType = showFullscreen && showFloating ? 'both' 
    : showFullscreen ? 'fullscreen' 
    : showFloating ? 'floating' 
    : 'none'

  const contextValue: AIAnimationContextType = {
    showFullscreenAnimation,
    hideFullscreenAnimation,
    updateFullscreenAnimation,
    showFloatingCard,
    hideFloatingCard,
    updateFloatingCard,
    isAnimating,
    animationType
  }

  return (
    <AIAnimationContext.Provider value={contextValue}>
      {children}
      
      {/* 全屏动画组件 */}
      {showFullscreen && (
        <AIProcessingAnimation
          state={fullscreenState}
          onCancel={hideFullscreenAnimation}
          onClose={hideFullscreenAnimation}
          compact={false}
        />
      )}
      
      {/* 浮动卡片组件 */}
      {showFloating && (
        <FloatingProgressCard
          state={floatingState}
          onClose={hideFloatingCard}
          onRetry={() => {
            // 重试逻辑由父组件处理
            console.log('Retry requested from floating card')
          }}
          compact={true}
          autoHide={false}
        />
      )}
    </AIAnimationContext.Provider>
  )
}

// 便捷Hook：简化常用操作
export const useAIProcessing = () => {
  const animation = useAIAnimation()
  
  const startProcessing = useCallback((config: {
    total: number
    title?: string
    showFullscreen?: boolean
  }) => {
    const animationConfig = {
      status: 'processing' as const,
      progress: {
        current: 0,
        total: config.total,
        percentage: 0
      },
      results: {
        successCount: 0,
        failedCount: 0,
        totalCount: config.total
      }
    }

    const cardConfig = {
      status: 'processing' as const,
      current: 0,
      total: config.total,
      successCount: 0,
      failedCount: 0
    }
    
    if (config.showFullscreen) {
      animation.showFullscreenAnimation(animationConfig)
    } else {
      animation.showFloatingCard(cardConfig)
    }
  }, [animation])
  
  const updateProgress = useCallback((current: number, currentItem?: { title: string; index: number }) => {
    const updates = {
      progress: {
        ...animation.isAnimating ? {} : { current: 0, total: 1, percentage: 0 },
        current,
        percentage: animation.isAnimating ? (current / (animation as any).total) * 100 : 0
      },
      currentItem
    }
    
    animation.updateFullscreenAnimation(updates)
    animation.updateFloatingCard({
      current,
      currentVideoTitle: currentItem?.title
    })
  }, [animation])
  
  const completeProcessing = useCallback((results: { successCount: number; failedCount: number }) => {
    const completedState = {
      status: 'completed' as const,
      results: {
        ...results,
        totalCount: results.successCount + results.failedCount
      }
    }
    
    animation.updateFullscreenAnimation(completedState)
    animation.updateFloatingCard({
      status: 'completed',
      ...results
    })
    
    // 自动隐藏（如果需要）
    setTimeout(() => {
      animation.hideFullscreenAnimation()
      animation.hideFloatingCard()
    }, 3000)
  }, [animation])
  
  const errorProcessing = useCallback((error: string) => {
    const errorState = {
      status: 'error' as const
    }
    
    animation.updateFullscreenAnimation(errorState)
    animation.updateFloatingCard(errorState)
  }, [animation])
  
  const cancelProcessing = useCallback(() => {
    animation.hideFullscreenAnimation()
    animation.hideFloatingCard()
  }, [animation])
  
  return {
    startProcessing,
    updateProgress,
    completeProcessing,
    errorProcessing,
    cancelProcessing,
    isProcessing: animation.isAnimating
  }
}

// 导出默认容器组件
export default AIAnimationProvider