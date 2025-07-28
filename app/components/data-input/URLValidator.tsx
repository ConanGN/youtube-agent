'use client'

// URL验证和错误提示组件
// 提供实时URL验证和友好的错误提示

import React from 'react'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

interface URLValidatorProps {
  url: string
  type: 'video' | 'channel'
  className?: string
}

export function URLValidator({ url, type, className = '' }: URLValidatorProps) {
  const validateURL = (url: string, type: 'video' | 'channel') => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      return { isValid: false, message: '', severity: 'info' as const }
    }

    if (type === 'video') {
      return validateVideoURL(trimmedUrl)
    } else {
      return validateChannelURL(trimmedUrl)
    }
  }

  const validateVideoURL = (url: string) => {
    // 基本格式检查
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return {
        isValid: false,
        message: '请输入有效的YouTube视频链接',
        severity: 'error' as const,
        suggestions: [
          'https://www.youtube.com/watch?v=VIDEO_ID',
          'https://youtu.be/VIDEO_ID',
          'https://www.youtube.com/shorts/VIDEO_ID'
        ]
      }
    }

    // 提取视频ID并验证
    const videoId = extractVideoId(url)
    if (!videoId) {
      return {
        isValid: false,
        message: '无法从链接中提取视频ID',
        severity: 'error' as const,
        suggestions: ['请确保链接包含完整的视频ID']
      }
    }

    // 验证视频ID格式（YouTube视频ID通常是11个字符）
    if (videoId.length !== 11) {
      return {
        isValid: false,
        message: `视频ID长度不正确（当前：${videoId.length}字符，应为：11字符）`,
        severity: 'error' as const,
        suggestions: [
          '请检查链接是否完整',
          '视频ID示例：dQw4w9WgXcQ（11字符）'
        ]
      }
    }

    // 检查视频ID是否包含有效字符
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return {
        isValid: false,
        message: '视频ID包含无效字符',
        severity: 'error' as const,
        suggestions: ['视频ID只能包含字母、数字、下划线和连字符']
      }
    }

    return {
      isValid: true,
      message: '视频链接格式正确',
      severity: 'success' as const,
      videoId: videoId
    }
  }

  const validateChannelURL = (url: string) => {
    if (!url.includes('youtube.com')) {
      return {
        isValid: false,
        message: '请输入有效的YouTube频道链接',
        severity: 'error' as const,
        suggestions: [
          'https://www.youtube.com/@username',
          'https://www.youtube.com/c/channelname',
          'https://www.youtube.com/channel/CHANNEL_ID'
        ]
      }
    }

    const channelIdentifier = extractChannelId(url)
    if (!channelIdentifier) {
      return {
        isValid: false,
        message: '无法从链接中提取频道信息',
        severity: 'error' as const,
        suggestions: ['请确保使用支持的频道链接格式']
      }
    }

    // 解码URL编码的字符（支持中文等）
    let decodedIdentifier = channelIdentifier
    try {
      decodedIdentifier = decodeURIComponent(channelIdentifier)
    } catch (e) {
      // 解码失败，使用原始字符串
    }

    return {
      isValid: true,
      message: '频道链接格式正确',
      severity: 'success' as const,
      channelIdentifier: decodedIdentifier
    }
  }

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return match[1]
      }
    }
    return null
  }

  const extractChannelId = (url: string): string | null => {
    const patterns = [
      /youtube\.com\/channel\/([^\/\?&]+)/,
      /youtube\.com\/c\/([^\/\?&]+)/,
      /youtube\.com\/user\/([^\/\?&]+)/,
      /youtube\.com\/@([^\/\?&]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return match[1]
      }
    }
    return null
  }

  const validation = validateURL(url, type)

  if (!url.trim()) return null

  return (
    <div className={`mt-2 ${className}`}>
      <div className={`flex items-start space-x-2 p-3 rounded-lg border ${
        validation.severity === 'success' 
          ? 'bg-green-50 border-green-200' 
          : validation.severity === 'error'
          ? 'bg-red-50 border-red-200'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex-shrink-0 mt-0.5">
          {validation.severity === 'success' && (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          {validation.severity === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          {validation.severity === 'info' && (
            <Info className="w-5 h-5 text-blue-500" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${
            validation.severity === 'success' 
              ? 'text-green-800' 
              : validation.severity === 'error'
              ? 'text-red-800'
              : 'text-blue-800'
          }`}>
            {validation.message}
          </p>
          
          {validation.isValid && type === 'video' && 'videoId' in validation && (
            <p className="text-xs text-green-600 mt-1">
              视频ID: {validation.videoId}
            </p>
          )}
          
          {validation.isValid && type === 'channel' && 'channelIdentifier' in validation && (
            <p className="text-xs text-green-600 mt-1">
              频道标识: {validation.channelIdentifier}
            </p>
          )}
          
          {'suggestions' in validation && validation.suggestions && (
            <div className="mt-2">
              <p className={`text-xs font-medium ${
                validation.severity === 'error' ? 'text-red-700' : 'text-blue-700'
              }`}>
                建议的格式：
              </p>
              <ul className={`text-xs mt-1 space-y-1 ${
                validation.severity === 'error' ? 'text-red-600' : 'text-blue-600'
              }`}>
                {validation.suggestions.map((suggestion, index) => (
                  <li key={index} className="font-mono">• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}