'use client'

// 视频URL输入组件
// 支持单链接输入和多链接批量输入

import React, { useState, useCallback } from 'react'
import { DataInputType } from '@/types'

interface VideoUrlInputProps {
  onSubmit: (urls: string[], type: DataInputType) => void
  loading?: boolean
  className?: string
}

export function VideoUrlInput({
  onSubmit,
  loading = false,
  className = '',
}: VideoUrlInputProps) {
  const [inputType, setInputType] = useState<'single' | 'multiple'>('single')
  const [singleUrl, setSingleUrl] = useState('')
  const [multipleUrls, setMultipleUrls] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  // URL验证函数
  const validateUrl = (url: string): boolean => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return false
    
    // YouTube URL格式检查
    const youtubePatterns = [
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/,
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /youtube\.com\/embed\//,
      /youtube\.com\/v\//,
      /youtube\.com\/shorts\//,
    ]
    
    return youtubePatterns.some(pattern => pattern.test(trimmedUrl))
  }

  // 处理单链接提交
  const handleSingleSubmit = useCallback(() => {
    setErrors([])
    
    if (!singleUrl.trim()) {
      setErrors(['请输入视频链接'])
      return
    }
    
    if (!validateUrl(singleUrl)) {
      setErrors(['请输入有效的YouTube视频链接'])
      return
    }
    
    onSubmit([singleUrl.trim()], 'single')
  }, [singleUrl, onSubmit])

  // 处理多链接提交
  const handleMultipleSubmit = useCallback(() => {
    setErrors([])
    
    if (!multipleUrls.trim()) {
      setErrors(['请输入视频链接'])
      return
    }
    
    // 解析多个URL（支持换行、逗号、分号分隔）
    const urls = multipleUrls
      .split(/[\n,;]+/)
      .map(url => url.trim())
      .filter(url => url.length > 0)
    
    if (urls.length === 0) {
      setErrors(['请输入至少一个有效的视频链接'])
      return
    }
    
    // 验证每个URL
    const invalidUrls: string[] = []
    const validUrls: string[] = []
    
    urls.forEach((url, index) => {
      if (validateUrl(url)) {
        validUrls.push(url)
      } else {
        invalidUrls.push(`第${index + 1}个链接格式无效`)
      }
    })
    
    if (invalidUrls.length > 0) {
      setErrors(invalidUrls)
      return
    }
    
    if (validUrls.length > 100) {
      setErrors(['一次最多只能处理100个视频链接'])
      return
    }
    
    onSubmit(validUrls, 'multiple')
  }, [multipleUrls, onSubmit])

  // 处理示例数据填充
  const fillExample = (type: 'single' | 'multiple') => {
    if (type === 'single') {
      setSingleUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    } else {
      setMultipleUrls(`https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://www.youtube.com/watch?v=jNQXAC9IVRw
https://youtu.be/9bZkp7q19f0`)
    }
    setErrors([])
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">YouTube视频链接</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setInputType('single')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              inputType === 'single'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            单个链接
          </button>
          <button
            onClick={() => setInputType('multiple')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              inputType === 'multiple'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            批量链接
          </button>
        </div>
      </div>

      {inputType === 'single' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube视频链接
            </label>
            <input
              type="url"
              value={singleUrl}
              onChange={(e) => setSingleUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">
              支持youtube.com和youtu.be链接格式
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => fillExample('single')}
              className="text-sm text-blue-600 hover:text-blue-700"
              disabled={loading}
            >
              填入示例链接
            </button>
            <button
              onClick={handleSingleSubmit}
              disabled={loading || !singleUrl.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '获取数据中...' : '获取视频数据'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube视频链接（多个）
            </label>
            <textarea
              value={multipleUrls}
              onChange={(e) => setMultipleUrls(e.target.value)}
              placeholder={`每行一个链接，或用逗号分隔：
https://www.youtube.com/watch?v=...
https://youtu.be/...
https://www.youtube.com/watch?v=...`}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 resize-vertical"
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">
              支持换行、逗号或分号分隔，最多100个链接
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => fillExample('multiple')}
              className="text-sm text-blue-600 hover:text-blue-700"
              disabled={loading}
            >
              填入示例链接
            </button>
            <button
              onClick={handleMultipleSubmit}
              disabled={loading || !multipleUrls.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '批量获取中...' : '批量获取数据'}
            </button>
          </div>
        </div>
      )}

      {/* 错误显示 */}
      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                输入错误
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 支持的格式说明 */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-2">
          支持的YouTube链接格式：
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• https://www.youtube.com/watch?v=VIDEO_ID</li>
          <li>• https://youtu.be/VIDEO_ID</li>
          <li>• https://www.youtube.com/embed/VIDEO_ID</li>
          <li>• https://www.youtube.com/shorts/VIDEO_ID</li>
        </ul>
      </div>
    </div>
  )
}