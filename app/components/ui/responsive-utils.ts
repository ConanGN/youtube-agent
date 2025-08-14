/**
 * 响应式工具函数
 * 为通用AI进度组件提供智能响应式适配
 */

import { useState, useEffect, useCallback } from 'react'
import { designTokens, responsive } from './design-tokens'
import { DeviceType, Breakpoint, Size } from './types'

// 媒体查询断点检测
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const updateMatch = () => setMatches(media.matches)
    media.addEventListener('change', updateMatch)

    return () => media.removeEventListener('change', updateMatch)
  }, [query])

  return matches
}

// 设备类型检测Hook
export const useDeviceType = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')

  const isMobile = useMediaQuery(`(max-width: ${designTokens.breakpoints.md})`)
  const isTablet = useMediaQuery(`(min-width: ${designTokens.breakpoints.md}) and (max-width: ${designTokens.breakpoints.lg})`)

  useEffect(() => {
    if (isMobile) {
      setDeviceType('mobile')
    } else if (isTablet) {
      setDeviceType('tablet')
    } else {
      setDeviceType('desktop')
    }
  }, [isMobile, isTablet])

  return deviceType
}

// 当前断点检测Hook
export const useBreakpoint = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg')

  const isSm = useMediaQuery(`(max-width: ${designTokens.breakpoints.sm})`)
  const isMd = useMediaQuery(`(min-width: ${designTokens.breakpoints.sm}) and (max-width: ${designTokens.breakpoints.md})`)
  const isLg = useMediaQuery(`(min-width: ${designTokens.breakpoints.md}) and (max-width: ${designTokens.breakpoints.lg})`)
  const isXl = useMediaQuery(`(min-width: ${designTokens.breakpoints.lg}) and (max-width: ${designTokens.breakpoints.xl})`)
  const is2xl = useMediaQuery(`(min-width: ${designTokens.breakpoints.xl})`)

  useEffect(() => {
    if (isSm) setBreakpoint('sm')
    else if (isMd) setBreakpoint('md')
    else if (isLg) setBreakpoint('lg')
    else if (isXl) setBreakpoint('xl')
    else if (is2xl) setBreakpoint('2xl')
  }, [isSm, isMd, isLg, isXl, is2xl])

  return breakpoint
}

// 视口尺寸Hook
export const useViewportSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return size
}

// 响应式组件大小计算
export const useResponsiveSize = (baseSize: Size): Size => {
  const deviceType = useDeviceType()
  
  // 移动端强制使用compact，平板端使用normal，桌面端保持原始大小
  if (deviceType === 'mobile') return 'compact'
  if (deviceType === 'tablet' && baseSize === 'large') return 'normal'
  return baseSize
}

// 响应式位置调整
export const useResponsivePosition = (basePosition: string) => {
  const deviceType = useDeviceType()
  const viewport = useViewportSize()
  
  // 移动端优先使用底部位置，避免被键盘遮挡
  if (deviceType === 'mobile') {
    if (basePosition.includes('top')) {
      return basePosition.replace('top', 'bottom')
    }
  }
  
  // 小屏幕时调整到屏幕中央
  if (viewport.width < 480) {
    return 'center'
  }
  
  return basePosition
}

// 性能优化检测
export const usePerformanceOptimization = () => {
  const [enabledOptimizations, setEnabledOptimizations] = useState({
    reducedMotion: false,
    lowPowerMode: false,
    simplifiedAnimations: false
  })

  useEffect(() => {
    // 检测用户偏好减少动画
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    // 检测设备性能（简单的启发式方法）
    const isLowPowerDevice = navigator.hardwareConcurrency <= 2 || 
                           (navigator as any).deviceMemory <= 2

    setEnabledOptimizations({
      reducedMotion: prefersReducedMotion,
      lowPowerMode: isLowPowerDevice,
      simplifiedAnimations: prefersReducedMotion || isLowPowerDevice
    })
  }, [])

  return enabledOptimizations
}

// 触摸设备检测
export const useTouchDevice = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      )
    }

    checkTouch()
    // 监听触摸事件变化
    window.addEventListener('touchstart', checkTouch, { once: true })
    
    return () => {
      window.removeEventListener('touchstart', checkTouch)
    }
  }, [])

  return isTouchDevice
}

// 网络状态检测
export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState({
    online: true,
    effectiveType: '4g',
    slow: false
  })

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      
      setNetworkStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType || '4g',
        slow: connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g'
      })
    }

    updateNetworkStatus()
    
    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus)
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkStatus)
      }
    }
  }, [])

  return networkStatus
}

// 智能配置生成器
export const useSmartConfig = () => {
  const deviceType = useDeviceType()
  const breakpoint = useBreakpoint()
  const performance = usePerformanceOptimization()
  const isTouchDevice = useTouchDevice()
  const networkStatus = useNetworkStatus()

  return useCallback(() => {
    const config = {
      // 基础配置
      size: deviceType === 'mobile' ? 'compact' : 'normal' as Size,
      position: deviceType === 'mobile' ? 'bottom-right' : 'bottom-right',
      
      // 行为配置
      behavior: {
        draggable: !isTouchDevice || deviceType !== 'mobile', // 移动端触摸设备禁用拖拽
        minimizable: true,
        closable: true,
        autoClose: deviceType === 'mobile' ? 5000 : false // 移动端自动关闭
      },
      
      // 显示配置
      display: {
        showProgressBar: true,
        showStats: deviceType !== 'mobile', // 移动端隐藏详细统计
        showCurrentTask: true,
        showEstimatedTime: deviceType === 'desktop', // 仅桌面端显示预估时间
        showResults: deviceType === 'desktop', // 仅桌面端显示结果列表
        compact: deviceType === 'mobile'
      },
      
      // 动画配置
      animations: {
        entrance: performance.simplifiedAnimations ? 'fade' : 'bounce',
        progress: !performance.reducedMotion,
        pulse: !performance.reducedMotion,
        wave: !performance.reducedMotion && networkStatus.online,
        glow: false, // 默认关闭发光效果以节省性能
        disabled: performance.reducedMotion
      }
    }

    return config
  }, [deviceType, breakpoint, performance, isTouchDevice, networkStatus])
}

// CSS类名生成器
export const generateResponsiveClasses = (
  baseClasses: string,
  deviceType: DeviceType,
  breakpoint: Breakpoint
): string => {
  const responsiveClasses = []
  
  // 设备类型相关类名
  responsiveClasses.push(`device-${deviceType}`)
  responsiveClasses.push(`bp-${breakpoint}`)
  
  // 响应式修饰符
  if (deviceType === 'mobile') {
    responsiveClasses.push('mobile-optimized')
  }
  
  if (deviceType === 'tablet') {
    responsiveClasses.push('tablet-optimized')
  }
  
  return [baseClasses, ...responsiveClasses].filter(Boolean).join(' ')
}

// 响应式样式计算
export const calculateResponsiveStyles = (
  deviceType: DeviceType,
  breakpoint: Breakpoint,
  viewport: { width: number; height: number }
) => {
  const breakpointConfig = responsive.breakpointDefaults[breakpoint] || responsive.breakpointDefaults.lg
  
  return {
    // 容器样式
    container: {
      width: breakpointConfig.cardWidth,
      padding: breakpointConfig.padding,
      fontSize: breakpointConfig.fontSize
    },
    
    // 最小化样式
    minimized: {
      width: breakpointConfig.minimizedSize,
      height: breakpointConfig.minimizedSize
    },
    
    // 位置调整
    positioning: {
      // 移动端确保不被虚拟键盘遮挡
      bottom: deviceType === 'mobile' ? '80px' : '16px',
      // 小屏幕时减少边距
      margin: viewport.width < 480 ? '8px' : '16px'
    }
  }
}

// 智能主题选择
export const useSmartTheme = (userPreference?: 'light' | 'dark' | 'auto') => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  useEffect(() => {
    if (userPreference === 'auto' || !userPreference) {
      // 检测系统主题偏好
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      setTheme(mediaQuery.matches ? 'dark' : 'light')
      
      const handleChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light')
      }
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      setTheme(userPreference)
    }
  }, [userPreference])
  
  return theme
}