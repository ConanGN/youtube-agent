'use client'

// 高级筛选组件
// 参考模式: examples/react/filters-faceted/src/main.tsx

import React, { useState, useEffect } from 'react'
import { Column, Table } from '@tanstack/react-table'
import { YouTubeVideo } from '@/types'

// 防抖输入组件
interface DebouncedInputProps {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
  placeholder?: string
  type?: 'text' | 'number'
  className?: string
  list?: string
}

export function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value, debounce, onChange])

  return (
    <input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}

// 通用筛选器组件
interface FilterProps {
  column: Column<YouTubeVideo, unknown>
  table?: Table<YouTubeVideo>
}

export function Filter({ column }: FilterProps) {
  const { filterVariant } = column.columnDef.meta ?? {}
  const columnFilterValue = column.getFilterValue()

  const sortedUniqueValues = React.useMemo(
    () =>
      filterVariant === 'range'
        ? []
        : Array.from(column.getFacetedUniqueValues().keys())
            .sort()
            .slice(0, 5000),
    [column.getFacetedUniqueValues(), filterVariant]
  )

  // 数值范围筛选器
  if (filterVariant === 'range') {
    return (
      <div className="flex flex-col space-y-2">
        <div className="flex space-x-2">
          <DebouncedInput
            type="number"
            value={(columnFilterValue as [number, number])?.[0] ?? ''}
            onChange={(value) =>
              column.setFilterValue((old: [number, number]) => [value, old?.[1]])
            }
            placeholder={`最小值 ${
              column.getFacetedMinMaxValues()?.[0] !== undefined
                ? `(${column.getFacetedMinMaxValues()?.[0]})`
                : ''
            }`}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <DebouncedInput
            type="number"
            value={(columnFilterValue as [number, number])?.[1] ?? ''}
            onChange={(value) =>
              column.setFilterValue((old: [number, number]) => [old?.[0], value])
            }
            placeholder={`最大值 ${
              column.getFacetedMinMaxValues()?.[1]
                ? `(${column.getFacetedMinMaxValues()?.[1]})`
                : ''
            }`}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
        <button
          onClick={() => column.setFilterValue(undefined)}
          className="text-xs text-gray-500 hover:text-gray-700 self-start"
        >
          清除
        </button>
      </div>
    )
  }

  // 选择器筛选器
  if (filterVariant === 'select') {
    return (
      <select
        value={columnFilterValue?.toString() ?? ''}
        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
      >
        <option value="">全部</option>
        {sortedUniqueValues.map((value) => (
          <option value={value} key={value}>
            {value}
          </option>
        ))}
      </select>
    )
  }

  // 文本筛选器（带自动完成）
  return (
    <div className="flex flex-col space-y-1">
      <datalist id={column.id + 'list'}>
        {sortedUniqueValues.map((value: any) => (
          <option value={value} key={value} />
        ))}
      </datalist>
      <DebouncedInput
        type="text"
        value={(columnFilterValue ?? '') as string}
        onChange={(value) => column.setFilterValue(value)}
        placeholder={`搜索... (${column.getFacetedUniqueValues().size})`}
        className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
        list={column.id + 'list'}
      />
      {columnFilterValue && (
        <button
          onClick={() => column.setFilterValue(undefined)}
          className="text-xs text-gray-500 hover:text-gray-700 self-start"
        >
          清除
        </button>
      )}
    </div>
  )
}

// 全局搜索组件
interface GlobalFilterProps {
  globalFilter: string
  setGlobalFilter: (value: string) => void
  placeholder?: string
}

export function GlobalFilter({
  globalFilter,
  setGlobalFilter,
  placeholder = '搜索所有列...',
}: GlobalFilterProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700">搜索:</span>
      <DebouncedInput
        value={globalFilter ?? ''}
        onChange={(value) => setGlobalFilter(String(value))}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder}
      />
      {globalFilter && (
        <button
          onClick={() => setGlobalFilter('')}
          className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
        >
          清除
        </button>
      )}
    </div>
  )
}

// 列可见性控制组件
interface ColumnVisibilityProps {
  table: Table<YouTubeVideo>
}

export function ColumnVisibility({ table }: ColumnVisibilityProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        列显示 ▼
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-3">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={table.getIsAllColumnsVisible()}
                onChange={table.getToggleAllColumnsVisibilityHandler()}
                className="mr-2"
              />
              <label className="font-medium text-sm">全选/取消全选</label>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {table.getAllLeafColumns().map((column) => (
                <div key={column.id} className="flex items-center py-1">
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                    className="mr-2"
                  />
                  <label className="text-sm">
                    {typeof column.columnDef.header === 'string'
                      ? column.columnDef.header
                      : column.id}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="px-3 py-2 border-t border-gray-200">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 高级筛选面板
interface AdvancedFilterPanelProps {
  table: Table<YouTubeVideo>
  isOpen: boolean
  onClose: () => void
}

export function AdvancedFilterPanel({ table, isOpen, onClose }: AdvancedFilterPanelProps) {
  if (!isOpen) return null

  const filteredColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanFilter())

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">高级筛选</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredColumns.map((column) => (
                <div key={column.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {typeof column.columnDef.header === 'string'
                      ? column.columnDef.header
                      : column.id}
                  </label>
                  <Filter column={column} table={table} />
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={() => {
                table.resetColumnFilters()
                onClose()
              }}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              重置所有筛选
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              应用筛选
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}