/**
 * 动画工具函数和预设动画配置
 * 为通用AI进度组件提供流畅的动画效果
 */

import { designTokens } from './design-tokens'

// 动画状态类型
export type AnimationState = 'enter' | 'exit' | 'idle'
export type AnimationType = 'slide' | 'bounce' | 'fade' | 'scale' | 'none'

// 动画配置接口
export interface AnimationConfig {
  type: AnimationType
  duration?: number
  easing?: string
  delay?: number
}

// 预定义动画配置
export const animationPresets = {
  // 入场动画
  entrance: {
    slide: {
      initial: { x: '100%', opacity: 0 },
      animate: { x: '0%', opacity: 1 },
      exit: { x: '100%', opacity: 0 },
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 30,
        duration: 0.3
      }
    },
    bounce: {
      initial: { scale: 0.3, opacity: 0 },
      animate: { 
        scale: [0.3, 1.05, 0.9, 1], 
        opacity: 1 
      },
      exit: { scale: 0.8, opacity: 0 },
      transition: { 
        duration: 0.6, 
        ease: designTokens.animations.easing.bounce,
        times: [0, 0.5, 0.7, 1]
      }
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { 
        duration: 0.3, 
        ease: designTokens.animations.easing.easeOut 
      }
    },
    scale: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.8, opacity: 0 },
      transition: { 
        duration: 0.2, 
        ease: designTokens.animations.easing.easeOut 
      }
    }
  },
  
  // 进度条动画
  progressBar: {
    width: { 
      transition: { 
        duration: 0.5, 
        ease: designTokens.animations.easing.easeOut 
      } 
    },
    shimmer: {
      x: ['-100%', '100%'],
      transition: { 
        duration: 2, 
        repeat: Infinity, 
        ease: designTokens.animations.easing.linear 
      }
    }
  },
  
  // 状态指示动画
  statusIndicator: {
    pulse: {
      scale: [1, 1.1, 1],
      transition: { 
        duration: 1.5, 
        repeat: Infinity, 
        ease: designTokens.animations.easing.easeInOut 
      }
    },
    spin: {
      rotate: 360,
      transition: { 
        duration: 1, 
        repeat: Infinity, 
        ease: designTokens.animations.easing.linear 
      }
    },
    ping: {
      scale: [1, 2],
      opacity: [1, 0],
      transition: { 
        duration: 1, 
        repeat: Infinity, 
        ease: designTokens.animations.easing.easeOut 
      }
    }
  },
  
  // 成功庆祝动画
  success: {
    celebration: {
      scale: [1, 1.2, 1],
      boxShadow: [
        '0 0 0 0 rgba(34, 197, 94, 0.4)',
        '0 0 0 20px rgba(34, 197, 94, 0)',
        '0 0 0 0 rgba(34, 197, 94, 0)'
      ],
      transition: { 
        duration: 1, 
        ease: designTokens.animations.easing.easeOut 
      }
    },
    checkmark: {
      pathLength: [0, 1],
      opacity: [0, 1],
      transition: { 
        duration: 0.5, 
        ease: designTokens.animations.easing.easeOut 
      }
    }
  },
  
  // 波形动画
  wave: {
    primary: {
      scaleY: [0.8, 1.2, 0.8],
      transition: { 
        duration: 2, 
        repeat: Infinity, 
        ease: designTokens.animations.easing.easeInOut 
      }
    },
    secondary: {
      scaleY: [0.6, 1.0, 0.6],
      transition: { 
        duration: 2, 
        repeat: Infinity, 
        ease: designTokens.animations.easing.easeInOut,
        delay: 0.5
      }
    }
  },
  
  // 微交互动画
  microInteractions: {
    hover: {
      scale: 1.05,
      transition: { 
        duration: 0.2, 
        ease: designTokens.animations.easing.easeOut 
      }
    },
    tap: {
      scale: 0.95,
      transition: { 
        duration: 0.1, 
        ease: designTokens.animations.easing.easeOut 
      }
    },
    focus: {
      boxShadow: `0 0 0 3px ${designTokens.colors.primary[500]}33`,
      transition: { 
        duration: 0.2, 
        ease: designTokens.animations.easing.easeOut 
      }
    }
  }
} as const

// CSS Keyframes 字符串生成器
export const createKeyframes = (name: string, frames: Record<string, any>) => {
  const frameEntries = Object.entries(frames)
  const keyframeRules = frameEntries.map(([key, value]) => {
    const properties = Object.entries(value)
      .map(([prop, val]) => `${kebabCase(prop)}: ${val}`)
      .join('; ')
    return `${key} { ${properties} }`
  }).join('\n  ')
  
  return `@keyframes ${name} {\n  ${keyframeRules}\n}`
}

// CSS类名生成器
export const generateAnimationClass = (config: AnimationConfig): string => {
  const { type, duration = 300, easing = 'ease-out', delay = 0 } = config
  
  if (type === 'none') return ''
  
  const animationProps = [
    `${type}`,
    `${duration}ms`,
    easing,
    delay > 0 ? `${delay}ms` : ''
  ].filter(Boolean).join(' ')
  
  return `animation: ${animationProps};`
}

// 响应式动画配置
export const getResponsiveAnimation = (
  baseConfig: AnimationConfig,
  breakpoint: string
): AnimationConfig => {
  const mobileOptimizations = {
    duration: Math.max(baseConfig.duration || 300, 200), // 最小200ms
    easing: designTokens.animations.easing.easeOut // 移动端使用较平缓的缓动
  }
  
  if (breakpoint === 'sm' || breakpoint === 'md') {
    return { ...baseConfig, ...mobileOptimizations }
  }
  
  return baseConfig
}

// 性能优化相关
export const performanceOptimizedStyles = {
  // GPU硬件加速
  willChange: 'transform, opacity',
  // 避免重排重绘的属性
  transform: 'translateZ(0)',
  // 移动端优化
  touchAction: 'manipulation',
  // 字体渲染优化
  fontSmooth: 'antialiased',
  textRendering: 'optimizeLegibility'
}

// 预制CSS动画字符串
export const cssAnimations = `
/* Wave Animation */
@keyframes wave {
  0%, 100% { 
    transform: scaleY(0.8) translateZ(0); 
  }
  50% { 
    transform: scaleY(1.2) translateZ(0); 
  }
}

/* Shimmer Animation */
@keyframes shimmer {
  0% { 
    transform: translateX(-100%) translateZ(0); 
  }
  100% { 
    transform: translateX(100%) translateZ(0); 
  }
}

/* Bounce In Animation */
@keyframes bounceIn {
  0% { 
    transform: scale(0.3) translateZ(0); 
    opacity: 0; 
  }
  50% { 
    transform: scale(1.05) translateZ(0); 
  }
  70% { 
    transform: scale(0.9) translateZ(0); 
  }
  100% { 
    transform: scale(1) translateZ(0); 
    opacity: 1; 
  }
}

/* Slide In From Right */
@keyframes slideInRight {
  0% { 
    transform: translateX(100%) translateZ(0); 
    opacity: 0; 
  }
  100% { 
    transform: translateX(0) translateZ(0); 
    opacity: 1; 
  }
}

/* Success Pulse */
@keyframes successPulse {
  0% { 
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); 
  }
  70% { 
    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); 
  }
  100% { 
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); 
  }
}

/* Glow Effect */
@keyframes glow {
  0%, 100% { 
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4); 
  }
  50% { 
    box-shadow: 0 0 40px rgba(139, 92, 246, 0.8); 
  }
}

/* Fade In */
@keyframes fadeIn {
  0% { 
    opacity: 0; 
  }
  100% { 
    opacity: 1; 
  }
}

/* Scale In */
@keyframes scaleIn {
  0% { 
    transform: scale(0.8) translateZ(0); 
    opacity: 0; 
  }
  100% { 
    transform: scale(1) translateZ(0); 
    opacity: 1; 
  }
}
`

// 工具函数
const kebabCase = (str: string): string => {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
}

// 动画状态管理Hook (React)
export const useAnimationState = (initialState: AnimationState = 'idle') => {
  // 这里可以在实际使用时替换为 React.useState
  let state = initialState
  
  const setState = (newState: AnimationState) => {
    state = newState
  }
  
  return [state, setState] as const
}

// 获取动画延迟 (用于序列动画)
export const getStaggerDelay = (index: number, baseDelay: number = 100): number => {
  return index * baseDelay
}

// 动画组合器
export const combineAnimations = (...animations: any[]): any => {
  return animations.reduce((combined, animation) => {
    return {
      ...combined,
      ...animation,
      transition: {
        ...combined.transition,
        ...animation.transition
      }
    }
  }, {})
}

// 根据设备性能调整动画
export const getOptimizedAnimation = (
  animation: any,
  preferReducedMotion: boolean = false
): any => {
  if (preferReducedMotion) {
    return {
      ...animation,
      transition: {
        ...animation.transition,
        duration: 0.01 // 几乎不可见的动画
      }
    }
  }
  
  return animation
}