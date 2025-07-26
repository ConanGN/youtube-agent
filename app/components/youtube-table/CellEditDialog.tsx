'use client'

// 单元格编辑弹窗组件
// 支持完整内容查看和编辑

import React, { useState, useEffect } from 'react'

interface CellEditDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  value: string
  placeholder?: string
  isLongText?: boolean
  validator?: (value: string) => boolean | string
  onSave: (newValue: string) => void
}

export function CellEditDialog({
  isOpen,
  onClose,
  title,
  value: initialValue,
  placeholder = '',
  isLongText = false,
  validator,
  onSave,
}: CellEditDialogProps) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  
  // 根据内容长度动态计算textarea行数
  const calculateRows = (text: string): number => {
    if (!text) return 6
    const lines = text.split('\n').length
    const estimatedLines = Math.ceil(text.length / 80) // 假设每行80字符
    const calculatedRows = Math.max(lines, estimatedLines)
    return Math.min(Math.max(calculatedRows, 6), 20) // 最少6行，最多20行
  }

  // 同步外部值变化
  useEffect(() => {
    setValue(initialValue)
    setHasChanges(false)
    setError(null)
  }, [initialValue, isOpen])

  // 监听值变化
  useEffect(() => {
    setHasChanges(value !== initialValue)
  }, [value, initialValue])

  // 验证输入值
  const validateValue = (newValue: string): boolean => {
    if (validator) {
      const result = validator(newValue)
      if (typeof result === 'string') {
        setError(result)
        return false
      }
      if (!result) {
        setError('输入值无效')
        return false
      }
    }
    setError(null)
    return true
  }

  // 处理值变更
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    validateValue(newValue)
  }

  // 保存数据
  const handleSave = () => {
    if (!validateValue(value)) {
      return
    }
    onSave(value)
    onClose()
  }

  // 取消编辑
  const handleCancel = () => {
    setValue(initialValue)
    setError(null)
    setHasChanges(false)
    onClose()
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
        
        {/* 弹窗内容 - 统一居中显示，响应式设计 */}
        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
          {/* 弹窗头部 - 固定高度，响应式 */}
          <div className="flex-shrink-0 bg-white px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 flex items-center">
                <span className="mr-2">✏️</span>
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
                  <li>使用 Ctrl+Enter 快速保存，ESC 取消编辑</li>
                  {isLongText && <li>支持多行文本编辑，文本框会自动调整高度</li>}
                  <li>请确保输入内容符合格式要求</li>
                </ul>
              </div>

              {/* 编辑区域 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {title} ({value.length} 字符)
                </label>
                {isLongText ? (
                  <textarea
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    rows={calculateRows(value)}
                    className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-y ${
                      error ? 'border-red-500 bg-red-50' : ''
                    }`}
                    autoFocus
                    style={{ 
                      minHeight: '150px',
                      lineHeight: '1.4'
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                      error ? 'border-red-500 bg-red-50' : ''
                    }`}
                    autoFocus
                  />
                )}
              </div>
              
              {/* 错误提示 */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  ❌ <strong>输入错误：</strong>{error}
                </div>
              )}
            </div>
          </div>
          
          {/* 弹窗按钮区域 - 固定在底部，响应式 */}
          <div className="flex-shrink-0 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4 flex flex-col-reverse sm:flex-row-reverse gap-2 sm:gap-3 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={!!error || !hasChanges}
              className={`w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error || !hasChanges
                  ? 'bg-gray-400 text-gray-100 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              title={hasChanges ? "保存修改 (Ctrl+Enter)" : "无更改"}
            >
              <span className="mr-1">💾</span>
              {hasChanges ? '保存更改' : '无更改'}
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