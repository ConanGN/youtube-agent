'use client'

// AI加载按钮组件
// 为AI字幕功能提供优美的加载状态按钮

import React from 'react'
import { Bot, Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export interface AILoadingButtonProps {
  loading?: boolean
  disabled?: boolean
  success?: boolean
  error?: boolean
  onClick?: () => void
  children?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline'
  loadingText?: string
  successText?: string
  errorText?: string
  icon?: React.ReactNode
  hideTextOnMobile?: boolean
}

// 加载动画组件
const LoadingSpinner: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  }

  return (
    <div className="relative">
      <Loader2 className={`${sizeClasses[size]} animate-spin`} />
      <div className="absolute inset-0">
        <Sparkles className={`${sizeClasses[size]} animate-pulse opacity-50`} />
      </div>
    </div>
  )
}

// 成功动画组件
const SuccessIcon: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <CheckCircle className={`${sizeClasses[size]} text-green-500 animate-bounce`} />
  )
}

// 错误动画组件
const ErrorIcon: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <AlertCircle className={`${sizeClasses[size]} text-red-500 animate-pulse`} />
  )
}

// 脉冲效果组件
const PulseEffect: React.FC<{ active: boolean; color: string }> = ({ active, color }) => {
  if (!active) return null

  return (
    <div className="absolute inset-0 rounded-inherit">
      <div className={`absolute inset-0 ${color} rounded-inherit animate-ping opacity-20`} />
      <div className={`absolute inset-0 ${color} rounded-inherit animate-pulse opacity-10`} />
    </div>
  )
}

export const AILoadingButton: React.FC<AILoadingButtonProps> = ({
  loading = false,
  disabled = false,
  success = false,
  error = false,
  onClick,
  children,
  className = "",
  size = 'md',
  variant = 'primary',
  loadingText = "处理中",
  successText = "完成",
  errorText = "失败",
  icon,
  hideTextOnMobile = false
}) => {
  // 尺寸配置
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  // 变体样式配置
  const getVariantClasses = () => {
    const isDisabled = disabled || loading
    
    const variants = {
      primary: {
        base: `bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent
               hover:from-purple-700 hover:to-blue-700 focus:ring-purple-500
               shadow-md hover:shadow-lg`,
        disabled: 'bg-gray-400 text-gray-700 cursor-not-allowed hover:from-gray-400 hover:to-gray-400',
        loading: 'bg-gradient-to-r from-purple-500 to-blue-500 cursor-wait',
        success: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
        error: 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
      },
      secondary: {
        base: `bg-gray-100 text-gray-900 border-gray-300
               hover:bg-gray-200 focus:ring-gray-500`,
        disabled: 'bg-gray-50 text-gray-400 cursor-not-allowed hover:bg-gray-50',
        loading: 'bg-purple-50 text-purple-700 border-purple-200',
        success: 'bg-green-50 text-green-700 border-green-200',
        error: 'bg-red-50 text-red-700 border-red-200'
      },
      outline: {
        base: `bg-transparent text-purple-600 border-purple-600
               hover:bg-purple-50 focus:ring-purple-500`,
        disabled: 'text-gray-400 border-gray-300 cursor-not-allowed hover:bg-transparent',
        loading: 'text-purple-700 border-purple-500 bg-purple-25',
        success: 'text-green-600 border-green-500 bg-green-25',
        error: 'text-red-600 border-red-500 bg-red-25'
      }
    }

    const variantConfig = variants[variant]
    
    if (error) return variantConfig.error
    if (success) return variantConfig.success
    if (loading) return variantConfig.loading
    if (isDisabled) return variantConfig.disabled
    return variantConfig.base
  }

  // 获取显示的图标
  const getDisplayIcon = () => {
    if (loading) return <LoadingSpinner size={size} />
    if (success) return <SuccessIcon size={size} />
    if (error) return <ErrorIcon size={size} />
    if (icon) return icon
    return <Bot className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} />
  }

  // 获取显示的文本
  const getDisplayText = () => {
    if (loading) return loadingText
    if (success) return successText
    if (error) return errorText
    return children
  }

  // 获取脉冲效果颜色
  const getPulseColor = () => {
    if (loading) return 'bg-purple-400'
    if (success) return 'bg-green-400'
    if (error) return 'bg-red-400'
    return 'bg-purple-400'
  }

  const isDisabled = disabled || loading || success

  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={`
        relative inline-flex items-center justify-center
        border rounded-md font-medium
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        overflow-hidden
        ${sizeClasses[size]}
        ${getVariantClasses()}
        ${isDisabled ? '' : 'active:scale-95'}
        ${className}
      `}
    >
      {/* 脉冲效果 */}
      <PulseEffect 
        active={loading || success} 
        color={getPulseColor()} 
      />
      
      {/* 内容 */}
      <div className="relative z-10 flex items-center justify-center space-x-2">
        {/* 图标 */}
        <span className="flex-shrink-0">
          {getDisplayIcon()}
        </span>
        
        {/* 文本 */}
        <span className={`
          ${hideTextOnMobile ? 'hidden sm:inline' : ''}
          transition-all duration-200
        `}>
          {getDisplayText()}
        </span>
      </div>
      
      {/* 移动端简化文本 */}
      {hideTextOnMobile && (
        <span className="sm:hidden relative z-10 ml-1">
          {loading ? '处理中' : success ? '完成' : error ? '失败' : 'AI'}
        </span>
      )}
    </button>
  )
}

export default AILoadingButton