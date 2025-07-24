'use client'

// YouTube数据处理与AI增强平台主页面
// 专注于数据输入和获取功能

import React, { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataInputType } from '@/types'
import { useAppStore, useVideoState, useVideoActions } from '@/store'
import { VideoUrlInput, ChannelInput, FileUpload } from '@/components/data-input'

export default function HomePage() {
  const router = useRouter()
  
  // 状态管理
  const { loading, error, hasVideos } = useVideoState()
  const { addVideos } = useVideoActions()
  const { setLoading, setError } = useAppStore()
  
  // 数据处理模式：replace（替换）或append（追加）
  const [dataMode, setDataMode] = useState<'replace' | 'append'>('replace')

  // 检测数据类型：YouTube链接还是普通CSV数据
  const isYouTubeData = (urls: string[]): boolean => {
    return urls.some(url => 
      url.includes('youtube.com') || 
      url.includes('youtu.be') || 
      url.includes('youtube')
    )
  }

  // 数据获取处理 - 每次获取新数据时先清除旧数据
  const handleDataFetch = useCallback(async (urls: string[], type: DataInputType, options?: any) => {
    setLoading(true)
    setError(null)
    
    try {
      let response
      
      switch (type) {
        case 'single':
          response = await fetch('/api/youtube/single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: urls[0] }),
          })
          break
          
        case 'multiple':
          // 检测是否为YouTube数据
          if (isYouTubeData(urls)) {
            response = await fetch('/api/youtube/multiple', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoUrls: urls }),
            })
          } else {
            // 处理普通CSV数据
            response = await fetch('/api/data/csv', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: urls }),
            })
          }
          break
          
        case 'channel':
          if (options) {
            // urls[0] 是 channelId (可能为null)，urls[1] 是 channelUrl
            response = await fetch('/api/youtube/channel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channelId: urls[0] || null, // 确保为null而不是undefined或字符串
                channelUrl: urls[1], // 频道URL
                maxResults: options.maxResults,
                order: options.order
              }),
            })
          }
          break
          
        default:
          throw new Error('不支持的数据类型')
      }

      if (!response) {
        throw new Error('请求失败')
      }

      const data = await response.json() as any
      
      if (data.success) {
        // 根据用户选择的模式处理数据
        if (dataMode === 'replace') {
          // 替换模式：清除旧数据，设置新数据
          if (type === 'single') {
            useAppStore.getState().setVideos([data.data])
          } else {
            useAppStore.getState().setVideos(data.data?.successful || [])
          }
        } else {
          // 追加模式：在现有数据基础上添加新数据
          if (type === 'single') {
            addVideos([data.data])
          } else {
            addVideos(data.data?.successful || [])
          }
        }
        
        // 数据获取成功后跳转到详情页
        router.push('/details')
      } else {
        throw new Error(data.error || '数据获取失败')
      }
    } catch (error) {
      console.error('数据获取错误:', error)
      setError(error instanceof Error ? error.message : '数据获取失败')
    } finally {
      setLoading(false)
    }
  }, [dataMode, addVideos, setLoading, setError, router])

  // 处理视频URL输入
  const handleVideoUrlSubmit = useCallback((urls: string[], type: DataInputType) => {
    handleDataFetch(urls, type)
  }, [handleDataFetch])

  // 处理频道输入
  const handleChannelSubmit = useCallback((channelId: string, channelUrl: string, options?: any) => {
    handleDataFetch([channelId, channelUrl], 'channel', options)
  }, [handleDataFetch])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                YouTube数据处理与AI增强平台
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">
                支持单链接、多链接、频道链接三种数据获取方式，提供AI批量优化功能
              </p>
            </div>
            
            {hasVideos && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push('/details')}
                  className="px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <span>📊</span>
                  <span className="hidden sm:inline">查看数据</span>
                  <span className="sm:hidden">数据</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">操作失败</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 主内容区域 - 数据输入界面 */}
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="text-5xl sm:text-6xl mb-4">🎬</div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              {hasVideos ? '添加更多数据' : '开始数据获取'}
            </h2>
            <p className="text-gray-600 text-sm sm:text-base px-4">
              选择一种方式来获取YouTube视频数据
            </p>
            
            {/* 数据处理模式选择 */}
            {hasVideos && (
              <div className="mt-6 flex items-center justify-center space-x-4">
                <span className="text-sm text-gray-600">数据处理模式：</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setDataMode('replace')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      dataMode === 'replace'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    替换数据
                  </button>
                  <button
                    onClick={() => setDataMode('append')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      dataMode === 'append'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    追加数据
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <VideoUrlInput
              onSubmit={handleVideoUrlSubmit}
              loading={loading}
            />
            <ChannelInput
              onSubmit={handleChannelSubmit}
              loading={loading}
            />
            <FileUpload
              onSubmit={handleVideoUrlSubmit}
              loading={loading}
            />
          </div>
          
          {/* 功能介绍 */}
          {!hasVideos && (
            <div className="mt-8 sm:mt-12">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6 text-center">平台功能</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                  <div className="text-4xl mb-4">📊</div>
                  <h4 className="font-semibold text-gray-900 mb-2">智能表格</h4>
                  <p className="text-sm text-gray-600">
                    类似Excel的交互体验，支持排序、筛选、内联编辑功能
                  </p>
                </div>
                <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                  <div className="text-4xl mb-4">🤖</div>
                  <h4 className="font-semibold text-gray-900 mb-2">AI增强</h4>
                  <p className="text-sm text-gray-600">
                    AI批量优化标题和描述，支持多语言翻译和关键词提取
                  </p>
                </div>
                <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                  <div className="text-4xl mb-4">📤</div>
                  <h4 className="font-semibold text-gray-900 mb-2">数据导出</h4>
                  <p className="text-sm text-gray-600">
                    支持CSV、JSON、Excel等多种格式导出，自定义字段选择
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* 加载状态 */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>正在处理数据...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}