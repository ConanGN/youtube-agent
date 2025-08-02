'use client'

/**
 * AI处理增强动画组件
 * 为AI字幕处理功能提供优美的等待动画体验
 * 特性：粒子效果、脉冲波纹、圆形进度条、响应式设计
 */

import React, { useEffect, useState, useMemo } from 'react'
import { Bot, CheckCircle, AlertCircle, X, RefreshCw } from 'lucide-react'

// 粒子接口定义
interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  life: number
}

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
interface AIProcessingAnimationProps {
  progress: ProcessingProgress
  onClose?: () => void
  onRetry?: () => void
  compact?: boolean // 紧凑模式，用于小屏幕
  className?: string
}

// 粒子效果组件
const ParticleEffect: React.FC<{ isActive: boolean; compact?: boolean }> = ({ isActive, compact }) => {
  const [particles, setParticles] = useState<Particle[]>([])
  
  // 根据屏幕大小确定粒子数量
  const particleCount = useMemo(() => {
    if (compact) return 6
    return typeof window !== 'undefined' && window.innerWidth > 768 ? 12 : 8
  }, [compact])

  useEffect(() => {
    if (!isActive) {
      setParticles([])
      return
    }

    // 初始化粒子
    const initParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.7 + 0.3,
      life: Math.random() * 1000 + 2000
    }))
    setParticles(initParticles)

    // 粒子动画循环
    const interval = setInterval(() => {
      setParticles(prevParticles => 
        prevParticles.map(particle => {
          let newX = particle.x + particle.vx
          let newY = particle.y + particle.vy
          let newVx = particle.vx
          let newVy = particle.vy

          // 边界反弹
          if (newX <= 0 || newX >= 100) newVx = -newVx
          if (newY <= 0 || newY >= 100) newVy = -newVy

          return {
            ...particle,
            x: Math.max(0, Math.min(100, newX)),
            y: Math.max(0, Math.min(100, newY)),
            vx: newVx,
            vy: newVy,
            opacity: 0.3 + Math.sin(Date.now() * 0.003 + particle.id) * 0.4
          }
        })
      )
    }, 50)

    return () => clearInterval(interval)
  }, [isActive, particleCount])

  if (!isActive) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: particle.opacity,
            transform: `scale(${particle.size})`,
            animation: 'twinkle 2s ease-in-out infinite alternate'
          }}
        />
      ))}
    </div>
  )
}

// 脉冲波纹组件
const PulseRipple: React.FC<{ isActive: boolean; compact?: boolean }> = ({ isActive, compact }) => {
  if (!isActive) return null

  const size = compact ? 'w-32 h-32' : 'w-48 h-48'
  
  return (
    <div className={`absolute ${size} -translate-x-1/2 -translate-y-1/2`} style={{ left: '50%', top: '50%' }}>
      {/* 三层同心圆脉冲 */}
      <div className="absolute inset-0 rounded-full border-2 border-purple-300/30 animate-ping" style={{ animationDelay: '0s' }} />
      <div className="absolute inset-2 rounded-full border-2 border-blue-300/40 animate-ping" style={{ animationDelay: '0.5s' }} />
      <div className="absolute inset-4 rounded-full border-2 border-indigo-300/50 animate-ping" style={{ animationDelay: '1s' }} />
    </div>
  )
}

// 圆形进度条组件
const CircularProgress: React.FC<{ progress: number; compact?: boolean }> = ({ progress, compact }) => {
  const size = compact ? 60 : 80
  const strokeWidth = compact ? 4 : 6
  const normalizedRadius = size / 2 - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative">
      <svg
        height={size}
        width={size}
        className="transform -rotate-90"
      >
        {/* 背景圆环 */}
        <circle
          stroke="rgba(156, 163, 175, 0.3)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* 进度圆环 */}
        <circle
          stroke="url(#progressGradient)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-300 ease-out"
        />
        {/* 渐变定义 */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      {/* 中心进度文字 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-bold text-gray-700 ${compact ? 'text-sm' : 'text-lg'}`}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}

// 成功庆祝动画组件
const CelebrationEffect: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  if (!isVisible) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 爆发效果 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-ping"
            style={{
              transform: `rotate(${i * 45}deg) translateY(-30px)`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
      {/* 闪光效果 */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-200/20 to-transparent animate-pulse" />
    </div>
  )
}

// 主动画组件
const AIProcessingAnimation: React.FC<AIProcessingAnimationProps> = ({
  progress,
  onClose,
  onRetry,
  compact = false,
  className = ''
}) => {
  const [showCelebration, setShowCelebration] = useState(false)

  // 计算进度百分比
  const progressPercent = useMemo(() => {
    if (progress.total === 0) return 0
    return (progress.current / progress.total) * 100
  }, [progress.current, progress.total])

  // 成功时显示庆祝动画
  useEffect(() => {
    if (progress.status === 'completed' && progress.successCount && progress.successCount > 0) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [progress.status, progress.successCount])

  // 状态图标渲染
  const renderStatusIcon = () => {
    switch (progress.status) {
      case 'processing':
        return <Bot className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} text-purple-500 animate-pulse`} />
      case 'completed':
        return <CheckCircle className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} text-green-500`} />
      case 'error':
        return <AlertCircle className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} text-red-500`} />
      default:
        return <Bot className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} text-gray-400`} />
    }
  }

  // 状态消息渲染
  const renderStatusMessage = () => {
    switch (progress.status) {
      case 'processing':
        return (
          <div className="text-center space-y-1">
            <div className={`font-medium text-blue-700 ${compact ? 'text-sm' : 'text-base'}`}>
              正在处理中...
            </div>
            {progress.currentVideoTitle && (
              <div className={`text-gray-600 truncate max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>
                {progress.currentVideoTitle}
              </div>
            )}
          </div>
        )
      case 'completed':
        return (
          <div className="text-center space-y-1">
            <div className={`font-medium text-green-700 ${compact ? 'text-sm' : 'text-base'}`}>
              处理完成！
            </div>
            <div className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
              成功 {progress.successCount || 0}
              {(progress.failedCount || 0) > 0 && (
                <span className="text-red-600 ml-2">
                  失败 {progress.failedCount}
                </span>
              )}
            </div>
          </div>
        )
      case 'error':
        return (
          <div className="text-center">
            <div className={`font-medium text-red-700 ${compact ? 'text-sm' : 'text-base'}`}>
              处理失败
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* 自定义CSS动画 */}
      <style jsx>{`
        @keyframes twinkle {
          0% { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 0.8; transform: scale(1.2); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* 背景粒子效果 */}
      <ParticleEffect 
        isActive={progress.status === 'processing'} 
        compact={compact}
      />
      
      {/* 脉冲波纹 */}
      <PulseRipple 
        isActive={progress.status === 'processing'} 
        compact={compact}
      />
      
      {/* 成功庆祝效果 */}
      <CelebrationEffect isVisible={showCelebration} />

      {/* 主内容区域 */}
      <div className={`relative z-10 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 ${
        compact ? 'p-4' : 'p-6'
      }`}>
        {/* 关闭按钮 */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* 内容区域 */}
        <div className="flex flex-col items-center space-y-4">
          {/* 状态图标 */}
          <div className="float-animation">
            {renderStatusIcon()}
          </div>
          
          {/* 圆形进度条 */}
          {progress.status === 'processing' && (
            <CircularProgress progress={progressPercent} compact={compact} />
          )}
          
          {/* 状态消息 */}
          {renderStatusMessage()}
          
          {/* 进度信息 */}
          {progress.total > 0 && (
            <div className={`text-center text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
              {progress.current} / {progress.total}
            </div>
          )}
          
          {/* 操作按钮 */}
          {progress.status === 'completed' && (progress.failedCount || 0) > 0 && onRetry && (
            <button
              onClick={onRetry}
              className={`flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors ${
                compact ? 'text-sm' : 'text-base'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>重试失败项</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AIProcessingAnimation