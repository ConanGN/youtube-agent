'use client'

// 缩略图可编辑单元格组件
// 特殊处理缩略图URL的显示和编辑

import React, { useState } from 'react'
import { CellContext } from '@tanstack/react-table'
import { UnifiedDataItem } from '@/types'
import { CellEditDialog } from './CellEditDialog'

interface ThumbnailEditableCellProps extends CellContext<UnifiedDataItem, unknown> {}

export function ThumbnailEditableCell({
  getValue,
  row,
  column,
  table,
}: ThumbnailEditableCellProps) {
  const id = column.id
  const index = row.index
  const initialValue = getValue() as string
  const [showDialog, setShowDialog] = useState(false)

  // 处理弹窗保存
  const handleDialogSave = (newValue: string) => {
    // 保存编辑历史
    if (table.options.meta?.addEditHistory) {
      table.options.meta.addEditHistory(index, id, initialValue || '', newValue)
    }

    // 更新数据
    table.options.meta?.updateData(index, id, newValue)
  }

  // URL验证函数
  const validateUrl = (value: string): boolean | string => {
    if (!value) return true
    try {
      new URL(value)
      return true
    } catch {
      return '请输入有效的URL地址'
    }
  }

  return (
    <>
      <div
        className="flex items-center justify-center p-1 cursor-pointer hover:bg-gray-50 group"
        onDoubleClick={() => setShowDialog(true)}
        title="双击编辑缩略图URL"
      >
        {initialValue ? (
          <div className="relative">
            <img
              src={initialValue}
              alt={row.original.title}
              className="w-16 h-12 object-cover rounded border"
              loading="lazy"
              onError={(e) => {
                // 图片加载失败时显示占位符
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.nextElementSibling?.classList.remove('hidden')
              }}
            />
            <div className="hidden w-16 h-12 bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs">
              🖼️
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
              <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                编辑
              </span>
            </div>
          </div>
        ) : (
          <div className="w-16 h-12 bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs hover:bg-gray-300 group-hover:text-gray-600">
            <div className="text-center">
              <div>📄</div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                添加
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 编辑弹窗 */}
      <CellEditDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        title="缩略图URL"
        value={initialValue || ''}
        placeholder="输入图片URL地址"
        validator={validateUrl}
        onSave={handleDialogSave}
      />
    </>
  )
}