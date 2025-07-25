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
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={handleCancel}
        />
        
        {/* 弹窗内容 */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* 头部 */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                编辑 {title}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            
            {/* 编辑区域 */}
            <div className="space-y-4">
              {isLongText ? (
                <textarea
                  value={value}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  rows={10}
                  className={`w-full p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    error ? 'border-red-500 bg-red-50' : ''
                  }`}
                  autoFocus
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    error ? 'border-red-500 bg-red-50' : ''
                  }`}
                  autoFocus
                />
              )}
              
              {/* 错误提示 */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
              
              {/* 字符计数 */}
              <div className="text-sm text-gray-500 text-right">
                {value.length} 字符
              </div>
              
              {/* 提示信息 */}
              <div className="text-xs text-gray-400">
                提示：Ctrl+Enter 快速保存，ESC 取消编辑
              </div>
            </div>
          </div>
          
          {/* 底部按钮 */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleSave}
              disabled={!!error}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                error
                  ? 'bg-gray-400 cursor-not-allowed'
                  : hasChanges
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {hasChanges ? '保存更改' : '无更改'}
            </button>
            <button
              onClick={handleCancel}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}