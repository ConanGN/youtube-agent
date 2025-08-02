'use client'

// YouTube表格与动画系统集成示例
// 演示如何将新的AI动画系统集成到现有的YouTubeTable中

import React, { useState, useCallback } from 'react'
import { AIAnimationProvider, useAIProcessing } from './AIAnimationContainer'
import { AILoadingButton } from './AILoadingButton'
import { FloatingProgressCard } from './FloatingProgressCard'
import { Bot, Sparkles, Download } from 'lucide-react'

// 模拟表格数据
interface MockVideoData {
  id: string
  title: string
  thumbnail: string
  url: string
  subtitles?: {
    rawText?: string
    status?: 'loading' | 'success' | 'error' | 'empty'
  }
}

// 表格行组件
const VideoRow: React.FC<{ 
  video: MockVideoData
  selected: boolean
  onSelect: (selected: boolean) => void
  onSubtitleProcess: () => void
}> = ({ video, selected, onSelect, onSubtitleProcess }) => {
  return (
    <tr className={`hover:bg-gray-50 ${selected ? 'bg-blue-50' : ''}`}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-3">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-16 h-12 object-cover rounded"
        />
      </td>
      <td className="px-4 py-3 max-w-xs truncate">
        <div className="font-medium text-gray-900">{video.title}</div>
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={onSubtitleProcess}
          className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
        >
          AI字幕
        </button>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {video.subtitles?.rawText ? (
          <span className="text-green-600">已处理</span>
        ) : (
          <span className="text-gray-400">未处理</span>
        )}
      </td>
    </tr>
  )
}

// 主表格组件
const TableWithAnimations: React.FC = () => {
  const [videos] = useState<MockVideoData[]>([
    {
      id: '1',
      title: '前端开发最佳实践 - React Hooks详解',
      thumbnail: 'https://via.placeholder.com/320x180?text=Video+1',
      url: 'https://youtube.com/watch?v=1'
    },
    {
      id: '2', 
      title: 'TypeScript高级特性与实战应用',
      thumbnail: 'https://via.placeholder.com/320x180?text=Video+2',
      url: 'https://youtube.com/watch?v=2'
    },
    {
      id: '3',
      title: 'Next.js全栈开发从入门到精通',
      thumbnail: 'https://via.placeholder.com/320x180?text=Video+3',
      url: 'https://youtube.com/watch?v=3'
    },
    {
      id: '4',
      title: 'AI在前端开发中的创新应用',
      thumbnail: 'https://via.placeholder.com/320x180?text=Video+4',
      url: 'https://youtube.com/watch?v=4'
    }
  ])

  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 使用AI处理Hook
  const { 
    startProcessing, 
    updateProgress, 
    completeProcessing, 
    errorProcessing,
    cancelProcessing,
    isProcessing: hookIsProcessing 
  } = useAIProcessing()

  // 选择处理
  const handleVideoSelect = useCallback((videoId: string, selected: boolean) => {
    setSelectedVideos(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(videoId)
      } else {
        newSet.delete(videoId)
      }
      return newSet
    })
  }, [])

  // 全选处理
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedVideos(new Set(videos.map(v => v.id)))
    } else {
      setSelectedVideos(new Set())
    }
  }, [videos])

  // 模拟单个视频AI字幕处理
  const handleSingleVideoProcess = useCallback(async (videoId: string) => {
    const video = videos.find(v => v.id === videoId)
    if (!video) return

    setIsProcessing(true)
    startProcessing({ 
      total: 1, 
      title: `处理 "${video.title}"`,
      showFullscreen: false // 使用浮动卡片
    })

    try {
      // 模拟处理时间
      updateProgress(0, { title: video.title, index: 0 })
      
      await new Promise(resolve => setTimeout(resolve, 2000)) // 模拟2秒处理时间
      
      updateProgress(1, { title: video.title, index: 0 })
      completeProcessing({ successCount: 1, failedCount: 0 })
      
    } catch (error) {
      errorProcessing('处理失败')
    } finally {
      setIsProcessing(false)
    }
  }, [videos, startProcessing, updateProgress, completeProcessing, errorProcessing])

  // 批量AI字幕处理
  const handleBatchAIProcess = useCallback(async () => {
    if (selectedVideos.size === 0) {
      alert('请先选择要处理的视频')
      return
    }

    const selectedVideoList = videos.filter(v => selectedVideos.has(v.id))
    setIsProcessing(true)
    
    startProcessing({ 
      total: selectedVideoList.length,
      title: `批量处理 ${selectedVideoList.length} 个视频`,
      showFullscreen: selectedVideoList.length > 3 // 超过3个使用全屏
    })

    try {
      let successCount = 0
      let failedCount = 0

      for (let i = 0; i < selectedVideoList.length; i++) {
        const video = selectedVideoList[i]
        updateProgress(i, { 
          title: video.title, 
          index: i + 1 
        })

        // 模拟处理每个视频（随机成功/失败）
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
        
        if (Math.random() > 0.2) { // 80%成功率
          successCount++
        } else {
          failedCount++
        }
        
        updateProgress(i + 1)
      }

      completeProcessing({ successCount, failedCount })
      
    } catch (error) {
      errorProcessing('批量处理失败')
    } finally {
      setIsProcessing(false)
    }
  }, [selectedVideos, videos, startProcessing, updateProgress, completeProcessing, errorProcessing])

  const allSelected = selectedVideos.size === videos.length
  const someSelected = selectedVideos.size > 0 && selectedVideos.size < videos.length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          YouTube表格 AI动画系统演示
        </h1>
        <p className="text-gray-600">
          演示新的AI字幕处理动画系统，支持单个和批量处理
        </p>
      </div>

      {/* 操作栏 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              已选择 {selectedVideos.size} / {videos.length} 个视频
            </span>
            
            {selectedVideos.size > 0 && (
              <button
                onClick={() => setSelectedVideos(new Set())}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                清除选择
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* 批量AI处理按钮 */}
            <AILoadingButton
              loading={isProcessing && selectedVideos.size > 1}
              disabled={selectedVideos.size === 0}
              onClick={handleBatchAIProcess}
              size="md"
              variant="primary"
              loadingText="AI处理中"
              hideTextOnMobile={true}
              icon={<Bot className="w-4 h-4" />}
            >
              批量AI字幕
            </AILoadingButton>
            
            {/* 传统获取字幕按钮 */}
            <button
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center space-x-2"
              disabled={selectedVideos.size === 0}
            >
              <Download className="w-4 h-4" />
              <span>获取字幕</span>
            </button>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                缩略图
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                标题
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex flex-col items-center space-y-2">
                  <span>字幕</span>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-purple-600">AI处理</span>
                  </div>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {videos.map((video) => (
              <VideoRow
                key={video.id}
                video={video}
                selected={selectedVideos.has(video.id)}
                onSelect={(selected) => handleVideoSelect(video.id, selected)}
                onSubtitleProcess={() => handleSingleVideoProcess(video.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* 使用说明 */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
          <Sparkles className="w-5 h-5 mr-2" />
          动画系统特性演示
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">✨ 智能动画切换</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>单个视频：浮动进度卡片</li>
              <li>3个以下：紧凑浮动显示</li>
              <li>3个以上：全屏沉浸体验</li>
              <li>响应式适配移动端</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">🎬 丰富视觉效果</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>粒子动画和脉冲波纹</li>
              <li>圆形进度条和渐变效果</li>
              <li>成功庆祝动画</li>
              <li>智能加载按钮状态</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// 包装组件，提供动画上下文
export const YouTubeTableWithAnimations: React.FC = () => {
  return (
    <AIAnimationProvider defaultMode="auto" enableAutoSwitch={true}>
      <TableWithAnimations />
    </AIAnimationProvider>
  )
}

export default YouTubeTableWithAnimations