'use client'

// AI字幕处理弹窗组件
// 基于现有的SubtitleEditDialog和AIPromptDrawer设计模式
// 支持选择多个视频进行AI字幕生成，包含时间戳和语言选择配置

import React, { useState, useEffect } from 'react'
import { Bot, Clock, Globe, X, Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

// AI字幕配置接口
export interface AISubtitleConfig {
  enableTimestamp: boolean  // 是否包含时间戳
  language: string         // 目标语言
  urls: string[]          // YouTube视频URL列表
}

// 选中视频信息接口
export interface SelectedVideo {
  id: string
  title: string
  url: string
  thumbnailUrl?: string
}

// 处理进度接口
export interface ProcessingProgress {
  current: number
  total: number
  status: 'idle' | 'processing' | 'completed' | 'error' | 'cancelled'
  currentVideoTitle?: string
  failedCount?: number
  successCount?: number
  results: Array<{
    id: string
    status: 'pending' | 'processing' | 'success' | 'error'
    transcript?: string
    error?: string
    processingTime?: number
  }>
}

// 弹窗组件属性接口
interface AISubtitleDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (config: AISubtitleConfig) => void
  selectedVideos: SelectedVideo[]
  onProgressUpdate?: (progress: ProcessingProgress) => void
  disabled?: boolean
}

// 支持的语言列表
const SUPPORTED_LANGUAGES = [
  { value: 'auto', label: '自动检测', flag: '🌐' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
  { value: 'en', label: '英文', flag: '🇺🇸' },
  { value: 'ja', label: '日语', flag: '🇯🇵' },
  { value: 'ko', label: '韩语', flag: '🇰🇷' },
  { value: 'es', label: '西班牙语', flag: '🇪🇸' },
  { value: 'fr', label: '法语', flag: '🇫🇷' },
  { value: 'de', label: '德语', flag: '🇩🇪' },
  { value: 'it', label: '意大利语', flag: '🇮🇹' },
  { value: 'pt', label: '葡萄牙语', flag: '🇵🇹' },
  { value: 'ru', label: '俄语', flag: '🇷🇺' },
  { value: 'ar', label: '阿拉伯语', flag: '🇸🇦' },
  { value: 'hi', label: '印地语', flag: '🇮🇳' },
]

export function AISubtitleDialog({
  isOpen,
  onClose,
  onSubmit,
  selectedVideos,
  onProgressUpdate,
  disabled = false
}: AISubtitleDialogProps) {
  // 配置状态
  const [config, setConfig] = useState<AISubtitleConfig>({
    enableTimestamp: false,
    language: 'auto',
    urls: []
  })
  
  // 处理进度状态
  const [progress, setProgress] = useState<ProcessingProgress>({
    current: 0,
    total: 0,
    status: 'idle',
    results: []
  })

  // 表单验证状态
  const [validationError, setValidationError] = useState<string>('')

  // 当弹窗打开时初始化配置
  useEffect(() => {
    if (isOpen) {
      setConfig({
        enableTimestamp: false,
        language: 'auto',
        urls: selectedVideos.map(v => v.url)
      })
      setProgress({
        current: 0,
        total: selectedVideos.length,
        status: 'idle',
        results: selectedVideos.map(v => ({
          id: v.id,
          status: 'pending'
        }))
      })
      setValidationError('')
    }
  }, [isOpen, selectedVideos])

  // 处理进度更新通知父组件
  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate(progress)
    }
  }, [progress, onProgressUpdate])

  // 表单验证
  const validateForm = (): boolean => {
    if (selectedVideos.length === 0) {
      setValidationError('请选择至少一个视频')
      return false
    }
    
    if (selectedVideos.length > 10) {
      setValidationError('一次最多只能处理10个视频')
      return false
    }
    
    setValidationError('')
    return true
  }

  // 处理配置提交
  const handleSubmit = () => {
    if (!validateForm()) return
    
    setProgress(prev => ({ ...prev, status: 'processing' }))
    onSubmit(config)
  }

  // 处理取消
  const handleCancel = () => {
    if (progress.status === 'processing') {
      setProgress(prev => ({ ...prev, status: 'cancelled' }))
    }
    onClose()
  }

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (progress.status !== 'processing') {
        handleSubmit()
      }
    }
  }

  // 获取状态显示组件
  const getStatusIndicator = (status: ProcessingProgress['status']) => {
    const statusConfig = {
      idle: { icon: Bot, color: 'text-gray-500', bgColor: 'bg-gray-50', message: '准备就绪' },
      processing: { icon: Loader2, color: 'text-blue-600', bgColor: 'bg-blue-50', message: '正在处理中...' },
      completed: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50', message: '处理完成' },
      error: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50', message: '处理失败' },
      cancelled: { icon: X, color: 'text-orange-600', bgColor: 'bg-orange-50', message: '已取消' }
    }
    
    const config = statusConfig[status]
    const IconComponent = config.icon
    
    return (
      <div className={`flex items-center px-3 py-2 rounded-lg ${config.bgColor}`}>
        <IconComponent 
          className={`w-4 h-4 mr-2 ${config.color} ${status === 'processing' ? 'animate-spin' : ''}`} 
        />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.message}
        </span>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onKeyDown={handleKeyDown}>
      {/* 背景遮罩 */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleCancel}></div>
        </div>
        
        {/* 弹窗内容 - 响应式设计 */}
        <div className="relative bg-white rounded-lg shadow-xl transform transition-all w-full max-w-lg sm:max-w-2xl mx-2 sm:mx-4 max-h-[90vh] flex flex-col">
          {/* 弹窗头部 */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 flex items-center">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-500" />
              AI字幕处理
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1 transition-colors"
              title="关闭 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* 弹窗内容区域 - 可滚动 */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0">
            {/* 选中视频信息 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center mb-3">
                <Play className="w-4 h-4 text-blue-600 mr-2" />
                <h4 className="text-sm font-medium text-blue-900">处理视频</h4>
              </div>
              <div className="text-sm text-blue-800 mb-3">
                已选择 <span className="font-semibold text-purple-700">{selectedVideos.length}</span> 个视频进行AI字幕处理
              </div>
              
              {/* 视频列表预览 */}
              {selectedVideos.length <= 5 ? (
                <div className="space-y-2">
                  {selectedVideos.map((video, index) => (
                    <div key={video.id} className="flex items-center space-x-2 text-xs">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span className="text-blue-700 truncate">{video.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-blue-700">
                  包含视频: {selectedVideos.slice(0, 3).map(v => v.title).join(', ')} 
                  <span className="font-medium"> 等 {selectedVideos.length} 个</span>
                </div>
              )}
            </div>

            {/* 配置选项 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                处理配置
              </h4>
              
              {/* 时间戳选项 */}
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <input
                  id="timestamp"
                  type="checkbox"
                  checked={config.enableTimestamp}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    enableTimestamp: e.target.checked 
                  }))}
                  className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  disabled={progress.status === 'processing'}
                />
                <div className="flex-1">
                  <label htmlFor="timestamp" className="text-sm font-medium text-gray-700 flex items-center cursor-pointer">
                    <Clock className="w-4 h-4 mr-1" />
                    包含时间戳信息
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    生成的字幕将包含精确的时间戳，便于视频编辑和定位
                  </p>
                </div>
              </div>

              {/* 语言选择 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  <Globe className="w-4 h-4 mr-1" />
                  目标语言
                </label>
                <select
                  value={config.language}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    language: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 bg-white text-sm"
                  disabled={progress.status === 'processing'}
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  选择"自动检测"将由AI智能识别视频中的语言
                </p>
              </div>
            </div>

            {/* 验证错误提示 */}
            {validationError && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-700">{validationError}</span>
              </div>
            )}

            {/* 进度显示 */}
            {progress.status !== 'idle' && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">处理进度</span>
                  <span className="text-sm text-gray-500">
                    {progress.current}/{progress.total}
                  </span>
                </div>
                
                {/* 进度条 */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                
                {/* 状态指示器 */}
                {getStatusIndicator(progress.status)}
                
                {/* 当前处理视频 */}
                {progress.currentVideoTitle && progress.status === 'processing' && (
                  <div className="mt-2 text-xs text-gray-600">
                    正在处理: <span className="font-medium">{progress.currentVideoTitle}</span>
                  </div>
                )}
              </div>
            )}

            {/* 使用提示 */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">AI字幕处理说明:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>基于Deepgram Nova-2模型，转写准确率达99%+</li>
                    <li>支持多语言自动识别和智能标点符号</li>
                    <li>平均处理时间: 25秒视频约3-4秒处理完成</li>
                    <li>最多支持10个视频同时处理，请耐心等待</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          {/* 弹窗按钮区域 */}
          <div className="flex-shrink-0 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4 flex flex-col-reverse sm:flex-row-reverse gap-2 sm:gap-3 border-t border-gray-200">
            <button
              onClick={handleSubmit}
              disabled={progress.status === 'processing' || disabled || selectedVideos.length === 0}
              className={`w-full sm:w-auto inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                progress.status === 'processing' || disabled || selectedVideos.length === 0
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
              }`}
              title={progress.status !== 'processing' ? '开始AI字幕处理 (Ctrl+Enter)' : ''}
            >
              {progress.status === 'processing' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  开始处理
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={progress.status === 'processing' && disabled}
              className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
              title="取消 (ESC)"
            >
              {progress.status === 'processing' ? '取消' : '关闭'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}