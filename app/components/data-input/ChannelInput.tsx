'use client'

// 频道输入组件
// 支持频道URL和频道ID输入，包含频道信息预览功能

import React, { useState, useCallback } from 'react'
import { DataInputType } from '@/types'

interface ChannelInputProps {
  onSubmit: (channelId: string, channelUrl: string, options?: any) => void
  loading?: boolean
  className?: string
}

export function ChannelInput({
  onSubmit,
  loading = false,
  className = '',
}: ChannelInputProps) {
  const [inputType, setInputType] = useState<'url' | 'id'>('url')
  const [channelUrl, setChannelUrl] = useState('')
  const [channelId, setChannelId] = useState('')
  const [maxResults, setMaxResults] = useState(50)
  const [sortOrder, setSortOrder] = useState<'date' | 'viewCount' | 'rating'>('date')
  const [errors, setErrors] = useState<string[]>([])

  // 频道URL验证函数
  const validateChannelUrl = (url: string): boolean => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return false
    
    // YouTube频道URL格式检查
    const channelPatterns = [
      /^https?:\/\/(www\.)?youtube\.com\/channel\/[UC][\w-]{21}[AQgw]$/,
      /^https?:\/\/(www\.)?youtube\.com\/c\/[\w-]+$/,
      /^https?:\/\/(www\.)?youtube\.com\/user\/[\w-]+$/,
      /^https?:\/\/(www\.)?youtube\.com\/@[\w-]+$/,
    ]
    
    return channelPatterns.some(pattern => pattern.test(trimmedUrl))
  }

  // 频道ID验证函数
  const validateChannelId = (id: string): boolean => {
    const trimmedId = id.trim()
    if (!trimmedId) return false
    
    // YouTube频道ID格式检查（通常以UC开头，总共24字符长度）
    return /^UC[\w-]{21}[AQgw]$/.test(trimmedId)
  }

  // 从URL提取频道ID
  const extractChannelId = (url: string): string | null => {
    const patterns = [
      /youtube\.com\/channel\/([UC][\w-]{21}[AQgw])/,
      /youtube\.com\/c\/([\w-]+)/,
      /youtube\.com\/user\/([\w-]+)/,
      /youtube\.com\/@([\w-]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return match[1]
      }
    }
    return null
  }

  // 处理提交
  const handleSubmit = useCallback(() => {
    setErrors([])
    
    let finalChannelId: string | null = null
    let finalChannelUrl = ''
    
    if (inputType === 'url') {
      if (!channelUrl.trim()) {
        setErrors(['请输入频道链接'])
        return
      }
      
      if (!validateChannelUrl(channelUrl)) {
        setErrors(['请输入有效的YouTube频道链接'])
        return
      }
      
      // 对于URL输入，让后端处理ID解析，前端只传递URL
      finalChannelUrl = channelUrl.trim()
      finalChannelId = null // 让后端解析
    } else {
      if (!channelId.trim()) {
        setErrors(['请输入频道ID'])
        return
      }
      
      if (!validateChannelId(channelId)) {
        setErrors(['请输入有效的YouTube频道ID（格式：UC开头的24字符）'])
        return
      }
      
      finalChannelId = channelId.trim()
      finalChannelUrl = `https://www.youtube.com/channel/${finalChannelId}`
    }
    
    // 验证maxResults参数
    if (maxResults < 1 || maxResults > 200) {
      setErrors(['视频数量必须在1-200之间'])
      return
    }
    
    onSubmit(finalChannelId, finalChannelUrl, {
      maxResults,
      order: sortOrder,
    })
  }, [inputType, channelUrl, channelId, maxResults, sortOrder, onSubmit])

  // 填充示例数据
  const fillExample = () => {
    if (inputType === 'url') {
      setChannelUrl('https://www.youtube.com/@Google')
    } else {
      setChannelId('UCK8sQmJBp8GCxrOtXWBpyEA') // Google频道ID
    }
    setErrors([])
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">YouTube频道</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setInputType('url')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              inputType === 'url'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            频道链接
          </button>
          <button
            onClick={() => setInputType('id')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              inputType === 'id'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            频道ID
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* 频道输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {inputType === 'url' ? 'YouTube频道链接' : 'YouTube频道ID'}
          </label>
          {inputType === 'url' ? (
            <input
              type="url"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="https://www.youtube.com/@channelname"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              disabled={loading}
            />
          ) : (
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              disabled={loading}
            />
          )}
          <p className="mt-1 text-sm text-gray-500">
            {inputType === 'url'
              ? '支持 @用户名, /c/频道名, /channel/频道ID 等格式'
              : '频道ID通常以UC开头，长度为24字符'}
          </p>
        </div>

        {/* 获取选项 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              视频数量
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">
              最多200个视频
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              排序方式
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="date">发布时间（最新）</option>
              <option value="viewCount">播放量（最高）</option>
              <option value="rating">评分（最高）</option>
            </select>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <button
            onClick={fillExample}
            className="text-sm text-blue-600 hover:text-blue-700"
            disabled={loading}
          >
            填入示例{inputType === 'url' ? '链接' : 'ID'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              (inputType === 'url' ? !channelUrl.trim() : !channelId.trim())
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '获取频道视频中...' : '获取频道视频'}
          </button>
        </div>
      </div>

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
          支持的YouTube频道格式：
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• https://www.youtube.com/@用户名</li>
          <li>• https://www.youtube.com/c/频道名</li>
          <li>• https://www.youtube.com/channel/频道ID</li>
          <li>• https://www.youtube.com/user/用户名</li>
          <li>• 或直接输入以UC开头的频道ID</li>
        </ul>
      </div>

      {/* 配额提示 */}
      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          💡 提示：获取频道视频会消耗更多API配额，建议根据需要调整视频数量
        </p>
      </div>
    </div>
  )
}