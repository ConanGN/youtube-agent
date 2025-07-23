'use client'

// YouTube数据详情页面
// 专门用于展示和管理YouTube视频数据

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { YouTubeVideo } from '@/types'
import { useAppStore, useVideoState, useDialogState, useVideoActions, useDialogActions } from '@/store'
import { YouTubeTable } from '@/components/youtube-table'
import { EnhancementPanel } from '@/components/ai-enhancement'
import { ExportDialog } from '@/components/export-dialog'

export default function DetailsPage() {
  const router = useRouter()
  
  // 状态管理
  const { videos, selectedVideoIds, loading, error, hasVideos, hasSelectedVideos } = useVideoState()
  const { showEnhancementPanel, showExportDialog } = useDialogState()
  const { setVideos, updateVideo, clearVideos } = useVideoActions()
  const { setShowEnhancementPanel, setShowExportDialog } = useDialogActions()
  const { setSelectedVideoIds, setError } = useAppStore()

  // 如果没有数据，重定向到主页
  useEffect(() => {
    if (!hasVideos) {
      router.push('/')
    }
  }, [hasVideos, router])

  // 表格数据变化处理
  const handleTableDataChange = useCallback((updatedData: YouTubeVideo[]) => {
    setVideos(updatedData)
  }, [setVideos])

  // 表格选择变化处理
  const handleTableSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedVideoIds(selectedIds)
  }, [setSelectedVideoIds])

  // AI增强应用处理
  const handleEnhancementApply = useCallback((videoId: string, field: string, enhancedContent: string) => {
    updateVideo(videoId, { [field]: enhancedContent })
  }, [updateVideo])

  // 获取选中的视频
  const getSelectedVideos = useCallback(() => {
    return videos.filter(video => selectedVideoIds.includes(video.id))
  }, [videos, selectedVideoIds])

  // 返回主页
  const handleBackToHome = () => {
    router.push('/')
  }

  // 清除数据并返回主页
  const handleClearAndBack = () => {
    clearVideos()
    router.push('/')
  }

  // 如果没有数据，显示加载或重定向信息
  if (!hasVideos) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <p className="text-gray-600">正在重定向到主页...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <button
                  onClick={handleBackToHome}
                  className="text-blue-600 hover:text-blue-700 flex items-center space-x-2 text-sm"
                >
                  <span>← 返回主页</span>
                </button>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                YouTube数据详情
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">
                管理和优化您的YouTube视频数据
              </p>
            </div>
            
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3 flex-shrink-0">
              <button
                onClick={() => setShowEnhancementPanel(true)}
                disabled={!hasSelectedVideos}
                className="px-3 py-2 sm:px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <span>🤖</span>
                <span className="hidden sm:inline">AI增强</span>
                <span className="sm:hidden">AI</span>
              </button>
              <button
                onClick={() => setShowExportDialog(true)}
                className="px-3 py-2 sm:px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <span>📤</span>
                <span className="hidden sm:inline">导出数据</span>
                <span className="sm:hidden">导出</span>
              </button>
              <button
                onClick={handleClearAndBack}
                className="px-3 py-2 sm:px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <span>🗑️</span>
                <span className="hidden sm:inline">清除数据</span>
                <span className="sm:hidden">清除</span>
              </button>
            </div>
          </div>
          
          {/* 统计信息 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 sm:flex sm:items-center sm:space-x-6 gap-2 sm:gap-0 text-xs sm:text-sm text-gray-600">
              <span>总计: {videos.length} 个视频</span>
              <span>已选择: {selectedVideoIds.length} 个</span>
              <span>已编辑: {videos.filter(v => v.isEdited).length} 个</span>
              <span>AI增强: {videos.filter(v => v.enhancedTitle || v.summarizedDescription).length} 个</span>
            </div>
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

        {/* 数据表格 */}
        <div className="bg-white rounded-lg shadow-sm">
          <YouTubeTable
            data={videos}
            onDataChange={handleTableDataChange}
            onSelectionChange={handleTableSelectionChange}
            loading={loading}
          />
        </div>

        {/* AI增强面板 */}
        {showEnhancementPanel && (
          <EnhancementPanel
            selectedVideos={getSelectedVideos()}
            onEnhancementApply={handleEnhancementApply}
            onClose={() => setShowEnhancementPanel(false)}
          />
        )}

        {/* 导出对话框 */}
        {showExportDialog && (
          <ExportDialog
            data={videos}
            selectedIds={selectedVideoIds}
            onClose={() => setShowExportDialog(false)}
          />
        )}

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