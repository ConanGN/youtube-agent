/**
 * 通用AI处理进度组件系统 - 统一导出入口
 * 提供完整的组件、工具函数和类型定义
 */

// 主要组件
export { default as UniversalProgressCard } from './UniversalProgressCard'
export { default as FloatingProgressCardAdapter } from './FloatingProgressCardAdapter'

// 子组件
export {
  StatusIcon,
  PulsingDot,
  AnimatedWave,
  EnhancedProgressBar,
  CurrentTaskDisplay,
  StatsDisplay,
  ResultsList
} from './progress-components'

// 设计系统
export {
  designTokens,
  themes,
  positions,
  responsive
} from './design-tokens'

// 动画工具
export {
  animationPresets,
  cssAnimations,
  performanceOptimizedStyles,
  createKeyframes,
  generateAnimationClass,
  getResponsiveAnimation
} from './animation-utils'

// 响应式工具
export {
  useMediaQuery,
  useDeviceType,
  useBreakpoint,
  useViewportSize,
  useResponsiveSize,
  useResponsivePosition,
  usePerformanceOptimization,
  useTouchDevice,
  useNetworkStatus,
  useSmartConfig,
  useSmartTheme,
  generateResponsiveClasses,
  calculateResponsiveStyles
} from './responsive-utils'

// 类型定义
export type {
  // 核心接口
  UniversalProgressCardProps,
  AIProcessingProgress,
  ProcessingResult,
  ProcessingStats,
  CurrentTask,
  ProcessingError,
  
  // 配置接口
  AnimationSettings,
  StyleCustomization,
  BehaviorConfig,
  DisplayConfig,
  InteractionCallbacks,
  CustomRenderers,
  
  // 内部状态
  InternalState,
  ProgressCardContext,
  
  // 基础类型
  AIProcessingStatus,
  TaskStatus,
  Theme,
  Position,
  Size,
  AnimationType,
  DeviceType,
  Breakpoint,
  PresetConfig
} from './types'

// 预设配置
export const presetConfigs = {
  // 最小配置 - 适用于简单任务
  minimal: {
    size: 'compact' as const,
    behavior: {
      closable: true,
      minimizable: false,
      draggable: false,
      autoClose: 3000
    },
    display: {
      showProgressBar: true,
      showStats: false,
      showCurrentTask: false,
      compact: true
    },
    animations: {
      entrance: 'fade' as const,
      progress: true,
      pulse: false,
      wave: false
    }
  },
  
  // 标准配置 - 默认推荐配置
  standard: {
    size: 'normal' as const,
    behavior: {
      closable: true,
      minimizable: true,
      draggable: true,
      autoClose: false
    },
    display: {
      showProgressBar: true,
      showStats: true,
      showCurrentTask: true,
      compact: false
    },
    animations: {
      entrance: 'bounce' as const,
      progress: true,
      pulse: true,
      wave: true
    }
  },
  
  // 详细配置 - 完整功能展示
  detailed: {
    size: 'large' as const,
    behavior: {
      closable: true,
      minimizable: true,
      draggable: true,
      autoClose: false
    },
    display: {
      showProgressBar: true,
      showStats: true,
      showCurrentTask: true,
      showEstimatedTime: true,
      showResults: true,
      compact: false
    },
    animations: {
      entrance: 'bounce' as const,
      progress: true,
      pulse: true,
      wave: true,
      glow: true
    }
  },
  
  // 监控配置 - 适用于长时间后台任务
  monitoring: {
    size: 'compact' as const,
    position: 'top-right' as const,
    behavior: {
      closable: false,
      minimizable: true,
      draggable: true,
      autoClose: false,
      stayOnTop: true
    },
    display: {
      showProgressBar: true,
      showStats: true,
      showCurrentTask: false,
      compact: true
    },
    animations: {
      entrance: 'slide' as const,
      progress: false, // 减少性能消耗
      pulse: false,
      wave: false
    }
  }
} as const

// 快捷创建函数
export const createProgressCard = (
  progress: import('./types').AIProcessingProgress,
  preset: keyof typeof presetConfigs = 'standard',
  overrides?: Partial<import('./UniversalProgressCard').UniversalProgressCardProps>
) => {
  const config = presetConfigs[preset]
  return {
    progress,
    ...config,
    ...overrides
  } as import('./UniversalProgressCard').UniversalProgressCardProps
}

// 使用指南常量
export const USAGE_EXAMPLES = {
  // AI字幕处理
  aiSubtitle: {
    title: 'AI字幕处理',
    subtitle: '智能语音转文字',
    position: 'bottom-right' as const,
    icon: '🎬'
  },
  
  // AI视频分析
  videoAnalysis: {
    title: 'AI视频分析',
    subtitle: '智能内容识别',
    position: 'bottom-left' as const,
    icon: '🔍'
  },
  
  // AI内容摘要
  contentSummary: {
    title: 'AI内容摘要',
    subtitle: '智能文本提取',
    position: 'top-right' as const,
    icon: '📝'
  },
  
  // AI标签提取
  tagExtraction: {
    title: 'AI标签提取',
    subtitle: '智能关键词识别',
    position: 'top-left' as const,
    icon: '🏷️'
  }
} as const

// 版本信息
export const VERSION = {
  major: 4,
  minor: 0,
  patch: 0,
  build: '2025.08.02',
  codename: 'Universal AI Progress System'
} as const