'use client'

// 内联编辑单元格组件
// 参考模式: examples/react/editable-data/src/main.tsx

import React, { useState, useEffect } from 'react'
import { CellContext } from '@tanstack/react-table'
import { YouTubeVideo, UnifiedDataItem } from '@/types'
import { CellEditDialog } from './CellEditDialog'

interface EditableCellProps extends CellContext<UnifiedDataItem, unknown> {
  isLongText?: boolean
  placeholder?: string
  validator?: (value: string) => boolean | string
}

export function EditableCell({
  getValue,
  row: { index },
  column,
  table,
  isLongText = false,
  placeholder = '',
  validator,
}: EditableCellProps) {
  const id = column.id
  const initialValue = getValue() as string
  const [value, setValue] = useState(initialValue || '')
  const [isEditing, setIsEditing] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 当初始值改变时同步状态
  useEffect(() => {
    setValue(initialValue || '')
  }, [initialValue])

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

  // 处理失焦保存
  const handleBlur = () => {
    // 延迟处理，避免点击按钮时立即失焦导致的问题
    setTimeout(() => {
      setIsEditing(false)
      
      // 如果值没有变化，直接返回
      if (value === initialValue) {
        return
      }

      // 验证值
      if (!validateValue(value)) {
        setValue(initialValue) // 恢复原值
        return
      }

      // 保存编辑历史
      if (table.options.meta?.addEditHistory) {
        table.options.meta.addEditHistory(index, id, initialValue || '', value)
      }

      // 更新数据到表格
      if (table.options.meta?.updateData) {
        table.options.meta.updateData(index, id, value)
      }
      
      // 开发环境调试日志
      if (process.env.NODE_ENV === 'development') {
        console.log('EditableCell失焦保存:', { 
          字段: id, 
          行索引: index,
          旧值: initialValue, 
          新值: value 
        })
      }
    }, 100)
  }
  
  // 手动保存函数（立即保存，不延迟）
  const handleManualSave = () => {
    setIsEditing(false)
    
    // 如果值没有变化，直接返回
    if (value === initialValue) {
      return
    }

    // 验证值
    if (!validateValue(value)) {
      setValue(initialValue) // 恢复原值
      return
    }

    // 保存编辑历史
    if (table.options.meta?.addEditHistory) {
      table.options.meta.addEditHistory(index, id, initialValue || '', value)
    }

    // 更新数据到表格
    if (table.options.meta?.updateData) {
      table.options.meta.updateData(index, id, value)
    }
    
    // 开发环境调试日志
    if (process.env.NODE_ENV === 'development') {
      console.log('EditableCell手动保存:', { 
        字段: id, 
        行索引: index,
        旧值: initialValue, 
        新值: value 
      })
    }
  }

  // 处理弹窗保存
  const handleDialogSave = (newValue: string) => {
    // 如果值没有变化，直接关闭弹窗
    if (newValue === initialValue) {
      setShowDialog(false)
      return
    }

    // 保存编辑历史
    if (table.options.meta?.addEditHistory) {
      table.options.meta.addEditHistory(index, id, initialValue || '', newValue)
    }

    // 更新数据到表格
    if (table.options.meta?.updateData) {
      table.options.meta.updateData(index, id, newValue)
    }
    
    // 立即同步本地状态（关键修复：确保UI状态与数据状态完全同步）
    setValue(newValue)
    
    // 开发环境调试日志
    if (process.env.NODE_ENV === 'development') {
      console.log('EditableCell弹窗保存:', { 
        字段: id, 
        行索引: index,
        旧值: initialValue, 
        新值: newValue 
      })
    }
    
    // 关闭弹窗
    setShowDialog(false)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!isLongText) {
        // 短文本：Enter保存
        e.preventDefault()
        handleManualSave()
      } else if (e.ctrlKey || e.metaKey) {
        // 长文本：Ctrl+Enter保存
        e.preventDefault()
        handleManualSave()
      }
    } else if (e.key === 'Escape') {
      // ESC取消编辑
      setValue(initialValue || '')
      setError(null)
      setIsEditing(false)
    }
  }

  // 处理双击编辑
  const handleDoubleClick = () => {
    setShowDialog(true)
  }

  // 渲染编辑状态
  if (isEditing) {
    const commonProps = {
      value,
      onChange: handleChange,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      placeholder,
      autoFocus: true,
      className: `w-full p-1 border-0 outline-none resize-none ${
        error ? 'bg-red-50 text-red-900' : 'bg-yellow-50'
      }`,
    }

    return (
      <div className="relative">
        {isLongText ? (
          <textarea
            {...commonProps}
            rows={3}
            style={{ minHeight: '60px' }}
          />
        ) : (
          <input
            type="text"
            {...commonProps}
          />
        )}
        {error && (
          <div className="absolute top-full left-0 z-10 mt-1 p-1 text-xs text-red-600 bg-red-100 border border-red-200 rounded shadow-lg whitespace-nowrap">
            {error}
          </div>
        )}
        {isLongText && (
          <div className="absolute bottom-1 right-1 text-xs text-gray-400">
            Ctrl+Enter保存
          </div>
        )}
      </div>
    )
  }

  // 计算显示文本（截断处理）
  const getDisplayText = (text: any, maxLength: number = 50) => {
    if (!text) return ''
    const textStr = String(text) // 确保转换为字符串
    if (textStr.length <= maxLength) return textStr
    return textStr.substring(0, maxLength) + '...'
  }

  // 渲染显示状态
  return (
    <>
      <div
        className="p-1 cursor-pointer hover:bg-gray-50 min-h-[32px] flex items-center group"
        onDoubleClick={handleDoubleClick}
        title={`双击查看完整内容并编辑\n完整内容: ${value}`}
      >
        {value ? (
          <div className="w-full overflow-hidden">
            <span className="text-gray-900">
              {getDisplayText(value, isLongText ? 100 : 50)}
            </span>
            {value.length > (isLongText ? 100 : 50) && (
              <span className="text-blue-500 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                [查看全部]
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400 italic">
            {placeholder || '双击编辑'}
          </span>
        )}
      </div>
      
      {/* 编辑弹窗 */}
      <CellEditDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        title={typeof column.columnDef.header === 'string' ? column.columnDef.header : id}
        value={initialValue || ''}
        placeholder={placeholder}
        isLongText={isLongText}
        validator={validator}
        onSave={handleDialogSave}
      />
    </>
  )
}

// 数值编辑单元格
export function NumberEditableCell({
  getValue,
  row: { index },
  column: { id },
  table,
  min = 0,
  max,
  format = 'number',
}: CellContext<UnifiedDataItem, unknown> & {
  min?: number
  max?: number
  format?: 'number' | 'compact'
}) {
  const initialValue = getValue() as number
  const [value, setValue] = useState(initialValue?.toString() || '0')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setValue(initialValue?.toString() || '0')
  }, [initialValue])

  const handleBlur = () => {
    setIsEditing(false)
    const numValue = parseInt(value, 10)
    
    if (isNaN(numValue)) {
      setValue(initialValue?.toString() || '0')
      return
    }

    const clampedValue = Math.max(min, max ? Math.min(max, numValue) : numValue)
    setValue(clampedValue.toString())
    
    if (clampedValue !== initialValue) {
      if (table.options.meta?.updateData) {
        table.options.meta.updateData(index, id, clampedValue)
      }
    }
  }

  const formatNumber = (num: number): string => {
    if (format === 'compact') {
      return num.toLocaleString('zh-CN')
    }
    return num.toString()
  }

  if (isEditing) {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleBlur()
          if (e.key === 'Escape') {
            setValue(initialValue?.toString() || '0')
            setIsEditing(false)
          }
        }}
        min={min}
        max={max}
        className="w-full p-1 border-0 outline-none bg-yellow-50"
        autoFocus
      />
    )
  }

  return (
    <div
      className="p-1 cursor-pointer hover:bg-gray-50 text-right"
      onDoubleClick={() => setIsEditing(true)}
      title="双击编辑"
    >
      {formatNumber(initialValue || 0)}
    </div>
  )
}