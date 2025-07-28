'use client'

// 可截断文本单元格组件
// 支持文本截断显示和双击编辑功能

import React, { useState, useCallback } from 'react'
import { DynamicColumnConfig } from '@/types'

interface TruncatedTextCellProps {
  value: any
  config: DynamicColumnConfig
  row: any
  onChange: (newValue: any) => void
  maxLength?: number
  showTooltip?: boolean
}

export const TruncatedTextCell: React.FC<TruncatedTextCellProps> = ({
  value,
  config,
  row,
  onChange,
  maxLength = 50, // 默认最大显示长度
  showTooltip = true
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  
  // 格式化显示值
  const displayValue = String(value || '')
  const isTruncated = displayValue.length > maxLength
  const truncatedValue = isTruncated 
    ? `${displayValue.substring(0, maxLength)}...` 
    : displayValue

  // 处理双击编辑
  const handleDoubleClick = useCallback(() => {
    if (config.features.editable) {
      setEditValue(displayValue)
      setIsEditing(true)
    }
  }, [displayValue, config.features.editable])

  // 处理编辑保存
  const handleSave = useCallback(() => {
    onChange(editValue)
    setIsEditing(false)
  }, [editValue, onChange])

  // 处理编辑取消
  const handleCancel = useCallback(() => {
    setEditValue('')
    setIsEditing(false)
  }, [])

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel])

  // 如果正在编辑，显示编辑器
  if (isEditing) {
    // 自适应计算编辑器类型和大小
    const getEditorConfig = () => {
      const textLength = editValue.length
      const lineCount = Math.max(1, editValue.split('\n').length)
      const estimatedLines = Math.max(lineCount, Math.ceil(textLength / 50))
      
      // 根据数据类型和内容长度选择编辑器
      if (config.dataType === 'longtext' || textLength > 100 || lineCount > 1) {
        return {
          type: 'textarea',
          rows: Math.min(Math.max(2, estimatedLines), 10), // 2-10行自适应
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
    }
    
    const editorConfig = getEditorConfig()
    
    if (editorConfig.type === 'textarea') {
      return (
        <div className="relative">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            rows={editorConfig.rows}
            className="w-full min-w-0 p-2 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            placeholder={editorConfig.placeholder}
            style={{ minHeight: '40px', maxHeight: '300px' }}
          />
          <div className="absolute -top-6 right-0 text-xs text-gray-500 bg-white px-1">
            Ctrl+Enter保存, Esc取消 | {editValue.length}字符
          </div>
        </div>
      )
    } else {
      return (
        <input
          type={editorConfig.type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          className="w-full min-w-0 p-2 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={editorConfig.placeholder}
          min={config.dataType === 'number' ? (config.editor?.min || 0) : undefined}
          max={config.dataType === 'number' ? config.editor?.max : undefined}
          step={config.dataType === 'number' ? (config.editor?.step || 1) : undefined}
        />
      )
    }
  }

  // 普通显示模式
  return (
    <div
      className={`
        relative min-w-0 cursor-pointer group
        ${config.features.editable ? 'hover:bg-gray-50' : ''}
      `}
      onDoubleClick={handleDoubleClick}
      title={showTooltip && isTruncated ? displayValue : undefined}
    >
      {/* 文本内容 */}
      <div className={`
        text-sm leading-relaxed break-words
        ${config.dataType === 'longtext' ? 'whitespace-pre-wrap' : 'truncate'}
        ${config.cellClassName || ''}
      `}>
        {config.dataType === 'longtext' ? (
          // 长文本显示前几行
          <div className="max-h-16 overflow-hidden">
            {displayValue.split('\n').slice(0, 2).join('\n')}
            {displayValue.split('\n').length > 2 && '...'}
          </div>
        ) : (
          // 普通文本截断显示
          truncatedValue
        )}
      </div>

      {/* 编辑提示 */}
      {config.features.editable && (
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-xs text-gray-400 bg-white px-1 rounded shadow">
            双击编辑
          </div>
        </div>
      )}

      {/* 截断指示器 */}
      {isTruncated && (
        <div className="absolute bottom-0 right-0 text-xs text-blue-500">
          +{displayValue.length - maxLength}
        </div>
      )}
    </div>
  )
}

// 工具函数：根据数据类型获取最适合的截断长度
export function getOptimalTruncateLength(dataType: string, columnWidth?: number): number {
  const baseLength = columnWidth ? Math.floor(columnWidth / 8) : 50 // 约8px/字符
  
  switch (dataType) {
    case 'longtext':
      return Math.max(100, baseLength * 2) // 长文本允许更多字符
    case 'text':
      return Math.max(30, baseLength)
    case 'url':
      return Math.max(40, baseLength)
    default:
      return Math.max(20, baseLength)
  }
}

// 工具函数：智能判断是否需要截断
export function shouldTruncateText(value: any, config: DynamicColumnConfig): boolean {
  const text = String(value || '')
  const optimalLength = getOptimalTruncateLength(config.dataType, config.width)
  
  // 根据数据类型和长度判断
  if (config.dataType === 'longtext') {
    return text.length > optimalLength || text.includes('\n')
  }
  
  return text.length > optimalLength
}