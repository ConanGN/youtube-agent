'use client'

// 故障排除指南组件
// 提供详细的问题解决方案和使用说明

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, HelpCircle, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
  type: 'video' | 'channel' | 'general'
  examples?: string[]
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: '为什么视频链接无法获取数据？',
    answer: '这通常是因为视频ID格式不正确。YouTube视频ID必须是11个字符长，只能包含字母、数字、下划线和连字符。',
    type: 'video',
    examples: [
      '✅ 正确：https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '✅ 正确：https://youtu.be/dQw4w9WgXcQ',
      '❌ 错误：https://www.youtube.com/watch?v=vUur（ID太短）',
      '❌ 错误：https://www.youtube.com/watch?v=（缺少ID）'
    ]
  },
  {
    question: '为什么频道链接无法获取视频？',
    answer: '可能是频道不存在、频道名输入错误、或频道设置为私有。请检查频道链接格式是否正确。',
    type: 'channel',
    examples: [
      '✅ 正确：https://www.youtube.com/@Google',
      '✅ 正确：https://www.youtube.com/c/Google',
      '✅ 正确：https://www.youtube.com/channel/UCK8sQmJBp8GCxrOtXWBpyEA',
      '✅ 支持中文：https://www.youtube.com/@考考考阿考'
    ]
  },
  {
    question: '显示"视频不存在或已被删除"怎么办？',
    answer: '这表示视频确实不存在、已被删除或设为私有。请检查链接是否正确，或尝试其他公开的视频链接。',
    type: 'video',
    examples: [
      '可能原因：视频被作者删除',
      '可能原因：视频设为私有或仅限部分用户观看',
      '可能原因：视频因版权问题被移除',
      '建议：尝试访问该链接确认视频是否存在'
    ]
  },
  {
    question: 'API配额用尽后怎么办？',
    answer: 'YouTube API有每日配额限制。如果达到限制，需要等到第二天重置，或联系管理员增加配额。',
    type: 'general',
    examples: [
      '每个视频查询消耗1个配额单位',
      '频道搜索消耗100个配额单位',
      '建议：合理使用，避免重复查询',
      '配额重置时间：每天太平洋时间午夜12点'
    ]
  },
  {
    question: '如何提取YouTube视频或频道的正确链接？',
    answer: '从浏览器地址栏复制完整的URL，确保包含所有必要的参数。',
    type: 'general',
    examples: [
      '1. 打开YouTube网站',
      '2. 找到目标视频或频道',
      '3. 从浏览器地址栏复制完整URL',
      '4. 确保链接以https://开头'
    ]
  }
]

export function TroubleshootingGuide() {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [filterType, setFilterType] = useState<'all' | 'video' | 'channel' | 'general'>('all')

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  const filteredItems = FAQ_ITEMS.filter(item => 
    filterType === 'all' || item.type === filterType
  )

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥'
      case 'channel': return '📺'
      case 'general': return '🔧'
      default: return '❓'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-800'
      case 'channel': return 'bg-green-100 text-green-800'
      case 'general': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center mb-6">
        <HelpCircle className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">故障排除指南</h2>
      </div>

      {/* 筛选器 */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部问题
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filterType === 'video'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎥 视频问题
          </button>
          <button
            onClick={() => setFilterType('channel')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filterType === 'channel'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📺 频道问题
          </button>
          <button
            onClick={() => setFilterType('general')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filterType === 'general'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🔧 通用问题
          </button>
        </div>
      </div>

      {/* FAQ列表 */}
      <div className="space-y-4">
        {filteredItems.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getTypeIcon(item.type)}</span>
                <span className="font-medium text-gray-900">{item.question}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(item.type)}`}>
                  {item.type === 'video' ? '视频' : item.type === 'channel' ? '频道' : '通用'}
                </span>
              </div>
              {expandedItems.has(index) ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {expandedItems.has(index) && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-3">
                  <p className="text-gray-700 text-sm mb-3">{item.answer}</p>
                  
                  {item.examples && (
                    <div className="bg-gray-50 rounded-md p-3">
                      <h4 className="text-xs font-medium text-gray-800 mb-2">
                        {item.type === 'video' || item.type === 'channel' ? '示例：' : '详细说明：'}
                      </h4>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {item.examples.map((example, exampleIndex) => (
                          <li key={exampleIndex} className="font-mono">
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 联系支持 */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">问题仍未解决？</h3>
            <p className="text-sm text-blue-700 mt-1">
              如果以上方案都无法解决您的问题，请检查：
            </p>
            <ul className="text-xs text-blue-600 mt-2 space-y-1">
              <li>• 网络连接是否正常</li>
              <li>• YouTube网站是否可以正常访问</li>
              <li>• 浏览器是否为最新版本</li>
              <li>• 尝试刷新页面或清除浏览器缓存</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 成功案例 */}
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-green-800">测试链接推荐</h3>
            <p className="text-sm text-green-700 mt-1">
              以下是经过验证的可用链接，可用于测试功能：
            </p>
            <ul className="text-xs text-green-600 mt-2 space-y-1 font-mono">
              <li>• 视频：https://www.youtube.com/watch?v=dQw4w9WgXcQ</li>
              <li>• 频道：https://www.youtube.com/@Google</li>
              <li>• 频道：https://www.youtube.com/@MrBeast</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}