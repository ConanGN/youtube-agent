/**
 * 通用AI处理进度组件设计令牌系统
 * 提供一致的设计语言和主题支持
 */

// 基础设计令牌
export const designTokens = {
  // 颜色系统
  colors: {
    // 主色调 - AI主题紫色系
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',  // 主色
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87'
    },
    
    // 状态颜色
    status: {
      idle: '#6b7280',         // 灰色 - 空闲
      initializing: '#8b5cf6', // 紫色 - 初始化
      processing: '#3b82f6',   // 蓝色 - 处理中
      completed: '#10b981',    // 绿色 - 完成
      error: '#ef4444',        // 红色 - 错误
      warning: '#f59e0b',      // 橙色 - 警告
      cancelled: '#6b7280'     // 灰色 - 取消
    },
    
    // 渐变色
    gradients: {
      primary: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #8b5cf6 100%)',
      success: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      error: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
      processing: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 50%, #8B5CF6 100%)',
      shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)'
    },
    
    // 背景和表面
    background: {
      card: {
        light: 'rgba(255, 255, 255, 0.95)',
        dark: 'rgba(17, 24, 39, 0.95)',
        glass: 'rgba(255, 255, 255, 0.1)'
      },
      overlay: {
        light: 'rgba(0, 0, 0, 0.1)',
        dark: 'rgba(255, 255, 255, 0.1)'
      },
      wave: {
        primary: 'rgba(139, 92, 246, 0.6)',
        secondary: 'rgba(147, 197, 253, 0.4)'
      }
    },
    
    // 边框
    border: {
      light: 'rgba(229, 231, 235, 0.7)',
      dark: 'rgba(75, 85, 99, 0.3)',
      focus: '#3b82f6'
    },
    
    // 文本
    text: {
      primary: {
        light: '#111827',
        dark: '#f9fafb'
      },
      secondary: {
        light: '#6b7280',
        dark: '#9ca3af'
      },
      inverse: {
        light: '#ffffff',
        dark: '#000000'
      }
    }
  },
  
  // 间距系统 (基于 0.25rem = 4px)
  spacing: {
    0: '0',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    12: '3rem',       // 48px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem'        // 96px
  },
  
  // 圆角系统
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px'
  },
  
  // 阴影系统
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    // 特殊效果阴影
    glow: '0 0 20px rgba(139, 92, 246, 0.4)',
    success: '0 0 20px rgba(16, 185, 129, 0.4)',
    error: '0 0 20px rgba(239, 68, 68, 0.4)'
  },
  
  // 字体系统
  typography: {
    fontFamily: {
      sans: ['system-ui', 'sans-serif'],
      mono: ['Monaco', 'Menlo', 'monospace']
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],     // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],    // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],   // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }] // 30px
    },
    fontWeight: {
      thin: '100',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800'
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    }
  },
  
  // 动画系统
  animations: {
    // 持续时间
    duration: {
      75: '75ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      300: '300ms',
      500: '500ms',
      700: '700ms',
      1000: '1000ms'
    },
    
    // 缓动函数
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    },
    
    // 预定义动画
    keyframes: {
      spin: 'spin 1s linear infinite',
      ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
      pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      bounce: 'bounce 1s infinite',
      // 自定义动画
      wave: 'wave 2s ease-in-out infinite',
      shimmer: 'shimmer 2s infinite',
      glow: 'glow 2s ease-in-out infinite alternate',
      slideIn: 'slideIn 0.3s ease-out',
      fadeIn: 'fadeIn 0.3s ease-out',
      bounceIn: 'bounceIn 0.6s ease-out',
      scaleIn: 'scaleIn 0.2s ease-out'
    }
  },
  
  // 断点系统
  breakpoints: {
    sm: '640px',    // 手机横屏
    md: '768px',    // 平板
    lg: '1024px',   // 桌面
    xl: '1280px',   // 大屏
    '2xl': '1536px' // 超大屏
  },
  
  // Z-index 层级
  zIndex: {
    auto: 'auto',
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',     // 通用浮动元素
    60: '60',     // 进度卡片
    70: '70',     // 模态框
    80: '80',     // 下拉菜单
    90: '90',     // 提示框
    100: '100'    // 最高层级
  }
} as const

// 主题配置
export const themes = {
  light: {
    colors: {
      background: designTokens.colors.background.card.light,
      border: designTokens.colors.border.light,
      text: designTokens.colors.text.primary.light,
      textSecondary: designTokens.colors.text.secondary.light,
      overlay: designTokens.colors.background.overlay.light
    }
  },
  dark: {
    colors: {
      background: designTokens.colors.background.card.dark,
      border: designTokens.colors.border.dark,
      text: designTokens.colors.text.primary.dark,
      textSecondary: designTokens.colors.text.secondary.dark,
      overlay: designTokens.colors.background.overlay.dark
    }
  }
} as const

// 响应式配置
export const responsive = {
  // 组件尺寸
  cardWidth: {
    compact: '280px',
    normal: '360px',
    large: '420px'
  },
  
  // 断点对应的默认配置
  breakpointDefaults: {
    sm: {
      cardWidth: '280px',
      minimizedSize: '48px',
      fontSize: 'sm',
      padding: '12px'
    },
    md: {
      cardWidth: '320px',
      minimizedSize: '56px',
      fontSize: 'sm',
      padding: '16px'
    },
    lg: {
      cardWidth: '360px',
      minimizedSize: '64px',
      fontSize: 'base',
      padding: '16px'
    },
    xl: {
      cardWidth: '420px',
      minimizedSize: '72px',
      fontSize: 'lg',
      padding: '20px'
    },
    '2xl': {
      cardWidth: '480px',
      minimizedSize: '80px',
      fontSize: 'xl',
      padding: '24px'
    }
  }
} as const

// 位置配置
export const positions = {
  'top-left': { top: '1rem', left: '1rem' },
  'top-right': { top: '1rem', right: '1rem' },
  'bottom-left': { bottom: '1rem', left: '1rem' },
  'bottom-right': { bottom: '1rem', right: '1rem' },
  'center': { 
    top: '50%', 
    left: '50%', 
    transform: 'translate(-50%, -50%)' 
  }
} as const

// 导出类型
export type Theme = keyof typeof themes
export type Position = keyof typeof positions
export type Size = 'compact' | 'normal' | 'large'
export type AnimationType = 'slide' | 'bounce' | 'fade' | 'scale' | 'none'