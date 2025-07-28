'use client'

// 支持副标题的列表头组件
// 提供主标题+副标题的层级显示和副标题编辑功能

import React, { useState, useRef, useEffect } from 'react'
import { Edit2, Check, X } from 'lucide-react'
import { DynamicColumnConfig } from '@/types'

interface ColumnHeaderWithSubtitleProps {
  title: string
  subtitle?: string
  columnId: string
  onSubtitleChange?: (columnId: string, newSubtitle: string) => void
  className?: string
}

export function ColumnHeaderWithSubtitle({
  title,
  subtitle,
  columnId,
  onSubtitleChange,
  className = ''
}: ColumnHeaderWithSubtitleProps) {
  // 编辑状态管理
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(subtitle || '')
  const inputRef = useRef<HTMLInputElement>(null)

  // 进入编辑模式时聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // 开始编辑副标题
  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation() // 防止触发列排序
    setEditValue(subtitle || '')
    setIsEditing(true)
  }

  // 保存副标题编辑
  const handleSave = () => {
    if (onSubtitleChange) {
      onSubtitleChange(columnId, editValue.trim())
    }
    setIsEditing(false)
  }

  // 取消副标题编辑
  const handleCancel = () => {
    setEditValue(subtitle || '')
    setIsEditing(false)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <div className={`column-header-with-subtitle ${className}`}>
      {/* 主标题 */}
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {title}
      </div>
      
      {/* 副标题区域 */}
      <div className="mt-1">
        {isEditing ? (
          // 编辑模式
          <div className="flex items-center space-x-1">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              placeholder="输入副标题..."
              className="text-xs bg-white border border-blue-300 rounded px-1 py-0.5 text-gray-700 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={50}
            />
            <button
              onClick={handleSave}
              className="p-0.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
              title="保存副标题"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={handleCancel}
              className="p-0.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
              title="取消编辑"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          // 显示模式
          <div className="group flex items-center space-x-1">
            <span className="text-xs text-gray-400 italic flex-1 min-w-0">
              {subtitle || '点击添加副标题'}
            </span>
            <button
              onClick={handleStartEdit}
              className="p-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-all"
              title="编辑副标题"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// 工具函数：检查是否需要显示副标题组件
export function shouldShowSubtitleHeader(columnId: string): boolean {
  // 排除系统列，只对用户自定义列和某些特定列显示副标题功能
  const excludedColumns = ['select', 'index', 'actions']
  return !excludedColumns.includes(columnId)
}