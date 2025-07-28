'use client'

// AI增强功能面板组件
// 提供视频内容AI增强功能的用户界面

import React, { useState, useCallback } from 'react'
import { YouTubeVideo, EnhancementType } from '@/types'

interface EnhancementOption {
  id: EnhancementType
  name: string
  description: string
  icon: string
  maxLength?: number
  supportedLanguages?: string[]
}

interface EnhancementPanelProps {
  selectedVideos: YouTubeVideo[]
  onEnhancementApply: (videoId: string, field: string, enhancedContent: string) => void
  onClose: () => void
  className?: string
}

interface EnhancementResult {
  videoId: string
  enhancedContent: string
  originalContent: string
  type: EnhancementType
  loading?: boolean
  error?: string
}

const ENHANCEMENT_OPTIONS: EnhancementOption[] = [
  {
    id: 'optimize_title',
    name: '优化标题',
    description: '使用AI优化视频标题，提高点击率和SEO效果',
    icon: '✨',
    maxLength: 60
  },
  {
    id: 'summarize_description',
    name: '描述摘要',
    description: '将长描述精炼成简洁有力的摘要',
    icon: '📝',
    maxLength: 200
  },
  {
    id: 'translate_title',
    name: '标题翻译',
    description: '将视频标题翻译成其他语言',
    icon: '🌐',
    supportedLanguages: ['中文', 'English', '日本語', 'Español', 'Français']
  },
  {
    id: 'extract_keywords',
    name: '关键词提取',
    description: '从视频内容中提取SEO关键词标签',
    icon: '🏷️',
    maxLength: 100
  }
]

export function EnhancementPanel({
  selectedVideos,
  onEnhancementApply,
  onClose,
  className = ''
}: EnhancementPanelProps) {
  const [selectedEnhancement, setSelectedEnhancement] = useState<EnhancementType>('optimize_title')
  const [customPrompt, setCustomPrompt] = useState('')
  const [options, setOptions] = useState({
    language: '中文',
    style: 'professional',
    maxLength: 150
  })
  const [results, setResults] = useState<EnhancementResult[]>([])
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<'select' | 'preview' | 'apply'>('select')

  // 获取当前选择的增强选项
  const currentOption = ENHANCEMENT_OPTIONS.find(opt => opt.id === selectedEnhancement)

  // 执行AI增强
  const handleEnhance = useCallback(async () => {
    if (selectedVideos.length === 0) return

    setLoading(true)
    setResults([])
    
    try {
      const response = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videos: selectedVideos,
          enhancementType: selectedEnhancement,
          prompt: customPrompt || undefined,
          options
        }),
      })

      const data = await response.json() as any

      if (data.success) {
        setResults(data.results)
        setCurrentStep('preview')
      } else {
        throw new Error(data.error || '增强处理失败')
      }
    } catch (error) {
      console.error('AI增强错误:', error)
      alert(error instanceof Error ? error.message : 'AI增强服务暂时不可用')
    } finally {
      setLoading(false)
    }
  }, [selectedVideos, selectedEnhancement, customPrompt, options])

  // 应用单个增强结果
  const handleApplySingle = useCallback((result: EnhancementResult) => {
    const fieldMap: Record<EnhancementType, string> = {
      'optimize_title': 'enhancedTitle',
      'summarize_description': 'summarizedDescription',
      'translate_title': 'translatedTitle',
      'extract_keywords': 'tags'
    }
    
    const field = fieldMap[result.type]
    if (field) {
      onEnhancementApply(result.videoId, field, result.enhancedContent)
    }
  }, [onEnhancementApply])

  // 批量应用所有结果
  const handleApplyAll = useCallback(() => {
    results.forEach(result => {
      if (result.enhancedContent && !result.error) {
        handleApplySingle(result)
      }
    })
    setCurrentStep('apply')
    setTimeout(() => {
      onClose()
    }, 1500)
  }, [results, handleApplySingle, onClose])

  // 重置状态
  const handleReset = useCallback(() => {
    setResults([])
    setCurrentStep('select')
    setCustomPrompt('')
  }, [])

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI内容增强</h2>
            <p className="text-sm text-gray-500 mt-1">
              已选择 {selectedVideos.length} 个视频进行增强
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className={`flex items-center space-x-1 sm:space-x-2 ${
              currentStep === 'select' ? 'text-blue-600' : 'text-gray-500'
            }`}>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                currentStep === 'select' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                1
              </div>
              <span className="text-xs sm:text-sm">选择增强类型</span>
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-1 sm:space-x-2 ${
              currentStep === 'preview' ? 'text-blue-600' : 'text-gray-500'
            }`}>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                currentStep === 'preview' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                2
              </div>
              <span className="text-xs sm:text-sm">预览结果</span>
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-1 sm:space-x-2 ${
              currentStep === 'apply' ? 'text-green-600' : 'text-gray-500'
            }`}>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                currentStep === 'apply' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                3
              </div>
              <span className="text-xs sm:text-sm">应用增强</span>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
          {currentStep === 'select' && (
            <div className="space-y-6">
              {/* 增强类型选择 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">选择增强类型</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ENHANCEMENT_OPTIONS.map((option) => (
                    <div
                      key={option.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedEnhancement === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedEnhancement(option.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{option.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                          {option.maxLength && (
                            <p className="text-xs text-gray-500 mt-2">
                              最大长度: {option.maxLength} 字符
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 增强选项配置 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">增强选项</h3>
                <div className="space-y-4">
                  {/* 语言选择（翻译时显示） */}
                  {selectedEnhancement === 'translate_title' && currentOption?.supportedLanguages && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        目标语言
                      </label>
                      <select
                        value={options.language}
                        onChange={(e) => setOptions({ ...options, language: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        {currentOption.supportedLanguages.map((lang) => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 最大长度设置 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大长度
                    </label>
                    <input
                      type="number"
                      min="50"
                      max={currentOption?.maxLength || 500}
                      value={options.maxLength}
                      onChange={(e) => setOptions({ ...options, maxLength: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* 自定义提示 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      自定义提示（可选）
                    </label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="输入自定义AI提示，可使用 {title}、{description}、{channelTitle} 作为变量"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">增强结果预览</h3>
                <button
                  onClick={handleReset}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  重新生成
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {results.map((result, index) => {
                  const video = selectedVideos.find(v => v.id === result.videoId)
                  return (
                    <div key={result.videoId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <img
                          src={video?.thumbnail}
                          alt={video?.title}
                          className="w-16 h-12 object-cover rounded border flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {video?.title}
                          </h4>
                          <div className="mt-2 space-y-2">
                            <div>
                              <label className="text-xs font-medium text-gray-500">原内容:</label>
                              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-1">
                                {result.originalContent}
                              </p>
                            </div>
                            {result.error ? (
                              <div>
                                <label className="text-xs font-medium text-red-500">错误:</label>
                                <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                                  {result.error}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <label className="text-xs font-medium text-green-600">AI增强:</label>
                                <p className="text-sm text-gray-900 bg-green-50 p-2 rounded mt-1">
                                  {result.enhancedContent}
                                </p>
                                <button
                                  onClick={() => handleApplySingle(result)}
                                  className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  应用此项
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {currentStep === 'apply' && (
            <div className="text-center py-8">
              <div className="text-6xl text-green-500 mb-4">✅</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">增强完成</h3>
              <p className="text-gray-600">
                已成功应用 {results.filter(r => r.enhancedContent && !r.error).length} 项增强
              </p>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
            {currentStep === 'select' && `${selectedVideos.length} 个视频待处理`}
            {currentStep === 'preview' && `${results.filter(r => r.enhancedContent && !r.error).length}/${results.length} 项成功`}
            {currentStep === 'apply' && '增强已完成'}
          </div>
          
          <div className="flex items-center justify-center sm:justify-end space-x-2 sm:space-x-3">
            {currentStep === 'select' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleEnhance}
                  disabled={loading || selectedVideos.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '处理中...' : '开始增强'}
                </button>
              </>
            )}
            
            {currentStep === 'preview' && (
              <>
                <button
                  onClick={() => setCurrentStep('select')}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  返回修改
                </button>
                <button
                  onClick={handleApplyAll}
                  disabled={results.filter(r => r.enhancedContent && !r.error).length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  应用全部
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}