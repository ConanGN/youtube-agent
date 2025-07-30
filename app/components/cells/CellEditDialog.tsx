'use client'

// 单元格弹窗编辑组件
// 支持多种数据类型的弹窗编辑功能，替代双击内联编辑

import React, { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { DynamicColumnConfig } from '@/types'

interface CellEditDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (newValue: string) => void
  title: string
  value: any
  config: DynamicColumnConfig
  maxHeight?: string
}

export const CellEditDialog: React.FC<CellEditDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  value,
  config,
  maxHeight = '400px'
}) => {
  const [editValue, setEditValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 初始化编辑值
  useEffect(() => {
    if (isOpen) {
      setEditValue(String(value || ''))
    }
  }, [isOpen, value])

  // 获取编辑器配置
  const getEditorConfig = useCallback(() => {
    const textLength = editValue.length
    const lineCount = Math.max(1, editValue.split('\n').length)
    const estimatedLines = Math.max(lineCount, Math.ceil(textLength / 50))
    
    // 根据数据类型和内容长度选择编辑器
    if (config.dataType === 'longtext' || textLength > 100 || lineCount > 1) {
      return {
        type: 'textarea',
        rows: Math.min(Math.max(3, estimatedLines), 15), // 3-15行自适应
        placeholder: config.editor?.placeholder || '输入内容...'
      }
    } else if (config.dataType === 'number') {
      return {
        type: 'number',
        placeholder: config.editor?.placeholder || '输入数字...'
      }
    } else if (config.dataType === 'date') {
      return {
        type: 'date',
        placeholder: config.editor?.placeholder || '选择日期...'
      }
    } else if (config.dataType === 'url' || config.dataType === 'image') {
      return {
        type: 'url',
        placeholder: config.editor?.placeholder || '输入URL...'
      }
    } else {
      return {
        type: 'text',
        placeholder: config.editor?.placeholder || '输入内容...'
      }
    }
  }, [editValue, config])

  // 处理保存
  const handleSave = useCallback(async () => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      onSave(editValue)
      onClose()
    } catch (error) {
      console.error('保存失败:', error)
      // 可以在这里添加错误提示
    } finally {
      setIsLoading(false)
    }
  }, [editValue, onSave, onClose, isLoading])

  // 处理键盘快捷键
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [handleSave, onClose])

  // 点击遮罩关闭
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  if (!isOpen) return null

  const editorConfig = getEditorConfig()

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            编辑 {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 编辑区域 */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full flex flex-col">
            {editorConfig.type === 'textarea' ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={editorConfig.placeholder}
                className="flex-1 w-full p-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                style={{ 
                  minHeight: '120px',
                  maxHeight: maxHeight
                }}
                autoFocus
              />
            ) : (
              <div className="flex-1 flex flex-col">
                <input
                  type={editorConfig.type}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={editorConfig.placeholder}
                  className="w-full p-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={config.dataType === 'number' ? (config.editor?.min || 0) : undefined}
                  max={config.dataType === 'number' ? config.editor?.max : undefined}
                  step={config.dataType === 'number' ? (config.editor?.step || 1) : undefined}
                  autoFocus
                />
              </div>
            )}
            
            {/* 字符统计 */}
            <div className="mt-2 text-xs text-gray-500 flex justify-between">
              <span>
                {editValue.length} 字符
                {editValue.split('\n').length > 1 && ` • ${editValue.split('\n').length} 行`}
              </span>
              <span className="text-gray-400">
                Ctrl+Enter 保存 • Esc 取消
              </span>
            </div>
          </div>
        </div>

        {/* 按钮栏 */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}