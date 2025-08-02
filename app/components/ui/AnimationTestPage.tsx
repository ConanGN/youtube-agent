'use client'

/**
 * 动画组件测试页面
 * 用于测试AIProcessingAnimation和FloatingProgressCard的响应式设计
 */

import React, { useState, useEffect } from 'react'
import AIProcessingAnimation from './AIProcessingAnimation'
import FloatingProgressCard from './FloatingProgressCard'
import type { ProcessingProgress } from './AIProcessingAnimation'

const AnimationTestPage: React.FC = () => {
  const [testProgress, setTestProgress] = useState<ProcessingProgress>({
    current: 0,
    total: 5,
    status: 'idle',
    successCount: 0,
    failedCount: 0
  })

  const [showFullAnimation, setShowFullAnimation] = useState(false)
  const [animationMode, setAnimationMode] = useState<'compact' | 'full'>('full')

  // 模拟处理进度
  const startSimulation = () => {
    setTestProgress({
      current: 0,
      total: 5,
      status: 'processing',
      successCount: 0,
      failedCount: 0,
      currentVideoTitle: '开始处理视频...'
    })

    let current = 0
    const interval = setInterval(() => {
      current++
      setTestProgress(prev => ({
        ...prev,
        current,
        currentVideoTitle: `正在处理第${current}个视频：测试视频标题${current}`
      }))

      if (current >= 5) {
        clearInterval(interval)
        setTestProgress(prev => ({
          ...prev,
          status: 'completed',
          successCount: 4,
          failedCount: 1,
          currentVideoTitle: undefined
        }))
      }
    }, 1500)
  }

  const resetSimulation = () => {
    setTestProgress({
      current: 0,
      total: 5,
      status: 'idle',
      successCount: 0,
      failedCount: 0
    })
  }

  const simulateError = () => {
    setTestProgress({
      current: 2,
      total: 5,
      status: 'error',
      successCount: 1,
      failedCount: 1
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI字幕动画组件测试
          </h1>
          <p className="text-gray-600">
            测试AIProcessingAnimation和FloatingProgressCard的响应式设计和动画效果
          </p>
        </div>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">控制面板</h2>
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={startSimulation}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              disabled={testProgress.status === 'processing'}
            >
              开始处理模拟
            </button>
            <button
              onClick={simulateError}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              模拟错误状态
            </button>
            <button
              onClick={resetSimulation}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              重置状态
            </button>
          </div>

          {/* 组件模式切换 */}
          <div className="flex flex-wrap gap-4 mb-6">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="full"
                checked={animationMode === 'full'}
                onChange={(e) => setAnimationMode(e.target.value as 'compact' | 'full')}
                className="form-radio"
              />
              <span>完整模式</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="compact"
                checked={animationMode === 'compact'}
                onChange={(e) => setAnimationMode(e.target.value as 'compact' | 'full')}
                className="form-radio"
              />
              <span>紧凑模式</span>
            </label>
          </div>

          {/* 全屏动画切换 */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showFullAnimation}
                onChange={(e) => setShowFullAnimation(e.target.checked)}
                className="form-checkbox"
              />
              <span>显示全屏动画（AIProcessingAnimation）</span>
            </label>
          </div>
        </div>

        {/* 状态显示 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">当前状态</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">状态:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                testProgress.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                testProgress.status === 'completed' ? 'bg-green-100 text-green-800' :
                testProgress.status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {testProgress.status}
              </span>
            </div>
            <div>
              <span className="font-medium">进度:</span>
              <span className="ml-2">{testProgress.current}/{testProgress.total}</span>
            </div>
            <div>
              <span className="font-medium">成功:</span>
              <span className="ml-2 text-green-600">{testProgress.successCount || 0}</span>
            </div>
            <div>
              <span className="font-medium">失败:</span>
              <span className="ml-2 text-red-600">{testProgress.failedCount || 0}</span>
            </div>
          </div>
          {testProgress.currentVideoTitle && (
            <div className="mt-4">
              <span className="font-medium">当前处理:</span>
              <span className="ml-2 text-gray-600">{testProgress.currentVideoTitle}</span>
            </div>
          )}
        </div>

        {/* 响应式测试提示 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">响应式测试提示</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 调整浏览器窗口大小测试响应式适配</li>
            <li>• 在移动设备上测试触摸友好性</li>
            <li>• 紧凑模式适用于小屏幕或多视频处理场景</li>
            <li>• 全屏动画适用于重要处理任务的沉浸体验</li>
            <li>• FloatingProgressCard支持最小化和位置调整</li>
          </ul>
        </div>

        {/* 组件展示区域 */}
        <div className="relative">
          {/* 全屏动画组件 */}
          {showFullAnimation && testProgress.status !== 'idle' && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <AIProcessingAnimation
                progress={testProgress}
                onClose={() => setShowFullAnimation(false)}
                onRetry={() => startSimulation()}
                compact={animationMode === 'compact'}
                className="max-w-md w-full"
              />
            </div>
          )}

          {/* 浮动进度卡片（始终显示，模拟实际使用场景） */}
          <FloatingProgressCard
            progress={testProgress}
            onClose={resetSimulation}
            onRetry={() => startSimulation()}
            position="bottom-right"
          />

          {/* 内容区域 */}
          <div className="bg-white rounded-lg shadow-lg p-6 min-h-96">
            <h2 className="text-xl font-semibold mb-4">模拟页面内容</h2>
            <p className="text-gray-600 mb-4">
              这里模拟YouTube表格或其他页面内容。FloatingProgressCard会浮动在内容上方。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded p-4 h-24 flex items-center justify-center">
                  <span className="text-gray-500">内容块 {i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnimationTestPage