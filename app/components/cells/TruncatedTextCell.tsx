'use client'

// 可截断文本单元格组件
// 支持文本截断显示和弹窗编辑功能

import React, { useState, useCallback } from 'react'
import { DynamicColumnConfig } from '@/types'
import { CellEditDialog } from './CellEditDialog'

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // 格式化显示值
  const displayValue = String(value || '')
  const isTruncated = displayValue.length > maxLength
  const truncatedValue = isTruncated 
    ? `${displayValue.substring(0, maxLength)}...` 
    : displayValue

  // 处理双击打开弹窗编辑
  const handleDoubleClick = useCallback(() => {
    if (config.features.editable) {
      setIsDialogOpen(true)
    }
  }, [config.features.editable])

  // 处理弹窗保存
  const handleDialogSave = useCallback((newValue: string) => {
    try {
      // 立即调用onChange来更新数据到表格
      onChange(newValue)
      
      // 开发环境调试日志
      if (process.env.NODE_ENV === 'development') {
        console.log('TruncatedTextCell弹窗编辑保存成功:', { 
          字段: config.accessorKey,
          行ID: row?.id,
          旧值: displayValue.substring(0, 50) + (displayValue.length > 50 ? '...' : ''), 
          新值: newValue.substring(0, 50) + (newValue.length > 50 ? '...' : ''),
          变化: newValue !== displayValue,
          配置: config
        })
      }
    } catch (error) {
      console.error('TruncatedTextCell弹窗编辑保存失败:', error)
      // 可以在这里添加用户提示
      if (process.env.NODE_ENV === 'development') {
        alert('保存失败，请重试')
      }
    }
  }, [onChange, displayValue, config.accessorKey, config, row])

  // 处理弹窗关闭
  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false)
  }, [])


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
            双击打开编辑器
          </div>
        </div>
      )}

      {/* 截断指示器 */}
      {isTruncated && (
        <div className="absolute bottom-0 right-0 text-xs text-blue-500">
          +{displayValue.length - maxLength}
        </div>
      )}

      {/* 弹窗编辑器 */}
      <CellEditDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        title={config.title || '编辑内容'}
        value={displayValue}
        config={config}
      />
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