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

  // 计算文本区域需要的行数
  const calculateTextareaRows = (text: string) => {
    if (!text) {
      setTextareaRows(8)
      return
    }

    // 计算换行符数量
    const lineBreaks = (text.match(/\n/g) || []).length
    // 估算每行80个字符，计算自动换行数
    const estimatedLines = Math.ceil(text.length / 80)
    // 总行数 = 换行符数量 + 1 + 估算的自动换行数
    const totalLines = lineBreaks + 1 + Math.floor(estimatedLines / 2)
    
    // 设置最小8行，最大25行
    const rows = Math.max(8, Math.min(25, totalLines))
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
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleCancel}></div>
        </div>
        
        {/* 弹窗内容 - 居中显示 */}
        <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* 弹窗头部 */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <span className="mr-2">📝</span>
                编辑{title}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                title="关闭 (ESC)"
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* 弹窗内容区域 */}
          <div className="bg-white px-4 py-4 sm:p-6">
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
                  className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none"
                  placeholder="请输入字幕内容..."
                  style={{ 
                    minHeight: `${Math.max(200, textareaRows * 24)}px`,
                    maxHeight: '500px'
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
          
          {/* 弹窗按钮区域 */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            <button
              onClick={handleSave}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              title="保存修改 (Ctrl+Enter)"
            >
              <span className="mr-1">💾</span>
              保存修改
            </button>
            <button
              onClick={handleCancel}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
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