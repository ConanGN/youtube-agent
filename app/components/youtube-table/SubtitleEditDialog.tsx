'use client'

// 字幕编辑弹窗组件
// 专门用于编辑长字幕内容，支持自适应高度和居中显示

import React, { useState, useEffect, useRef } from 'react'

interface SubtitleEditDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  value: string
  onSave: (value: string) => void
}

export function SubtitleEditDialog({
  isOpen,
  onClose,
  title,
  value,
  onSave,
}: SubtitleEditDialogProps) {
  const [editValue, setEditValue] = useState(value)
  const [textareaRows, setTextareaRows] = useState(8)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 当弹窗打开时重置编辑值
  useEffect(() => {
    if (isOpen) {
      setEditValue(value)
      // 计算文本需要的行数
      calculateTextareaRows(value)
    }
  }, [isOpen, value])

  // 计算文本区域需要的行数 - 改进算法
  const calculateTextareaRows = (text: string) => {
    if (!text) {
      setTextareaRows(8)
      return
    }

    // 计算实际显示行数
    const lines = text.split('\n')
    let totalLines = 0
    
    lines.forEach(line => {
      if (line.length === 0) {
        totalLines += 1 // 空行占1行
      } else {
        // 假设每行最多显示60个字符（考虑中文字符宽度）
        const wrappedLines = Math.ceil(line.length / 60)
        totalLines += wrappedLines
      }
    })
    
    // 设置最小8行，最大30行，确保有足够空间显示内容
    const rows = Math.max(8, Math.min(30, totalLines + 2))
    setTextareaRows(rows)
  }

  // 处理文本变化时重新计算行数
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setEditValue(newValue)
    calculateTextareaRows(newValue)
  }

  // 处理保存
  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue)
    }
    onClose()
  }

  // 处理取消
  const handleCancel = () => {
    setEditValue(value) // 恢复原值
    onClose()
  }

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleCancel}></div>
        </div>
        
        {/* 弹窗内容 - 真正居中显示，响应式设计 */}
        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
          {/* 弹窗头部 - 固定高度，响应式 */}
          <div className="flex-shrink-0 bg-white px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 flex items-center">
                <span className="mr-2">📝</span>
                编辑{title}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 text-lg sm:text-xl leading-none p-1"
                title="关闭 (ESC)"
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* 弹窗内容区域 - 可滚动，响应式 */}
          <div className="flex-1 bg-white px-4 py-3 sm:px-6 sm:py-4 overflow-y-auto min-h-0">
            <div className="space-y-4">
              {/* 使用说明 */}
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                💡 <strong>编辑提示：</strong>
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  <li>支持多行文本编辑，文本框会自动调整高度</li>
                  <li>使用 Ctrl+Enter 快速保存，ESC 取消编辑</li>
                  <li>字幕格式：[时间段] 内容</li>
                </ul>
              </div>

              {/* 文本编辑区域 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  字幕内容 ({editValue.length} 字符)
                </label>
                <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  rows={textareaRows}
                  className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-y"
                  placeholder="请输入字幕内容..."
                  style={{ 
                    minHeight: `${Math.max(200, textareaRows * 22)}px`,
                    maxHeight: 'none', // 移除最大高度限制，让用户自由调节
                    lineHeight: '1.4'
                  }}
                />
              </div>

              {/* 预览区域（只在有内容时显示） */}
              {editValue.trim() && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    预览效果
                  </label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md max-h-32 overflow-y-auto">
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      {editValue.split('\n').slice(0, 5).join('\n')}
                      {editValue.split('\n').length > 5 && '\n...（显示前5行）'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 弹窗按钮区域 - 固定在底部，响应式 */}
          <div className="flex-shrink-0 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4 flex flex-col-reverse sm:flex-row-reverse gap-2 sm:gap-3 border-t border-gray-200">
            <button
              onClick={handleSave}
              className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="保存修改 (Ctrl+Enter)"
            >
              <span className="mr-1">💾</span>
              保存修改
            </button>
            <button
              onClick={handleCancel}
              className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="取消编辑 (ESC)"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}