'use client'

// YouTube数据表格主组件
// 参考模式: examples/react/kitchen-sink/src/App.tsx 综合功能集成

import React, { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  ColumnDef,
  flexRender,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  RowSelectionState,
  ColumnSizingState,
} from '@tanstack/react-table'
import { YouTubeVideo, EditHistory, UnifiedDataItem } from '@/types'
import { EditableCell, NumberEditableCell } from './EditableCell'
import { ThumbnailEditableCell } from './ThumbnailEditableCell'
import { Filter, GlobalFilter, ColumnVisibility, AdvancedFilterPanel } from './FilterComponents'

// 复选框组件
interface IndeterminateCheckboxProps {
  indeterminate?: boolean
  className?: string
  [key: string]: any
}

function IndeterminateCheckbox({
  indeterminate,
  className = '',
  ...rest
}: IndeterminateCheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null!)

  React.useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !rest.checked && indeterminate
    }
  }, [ref, indeterminate, rest.checked])

  return (
    <input
      type="checkbox"
      ref={ref}
      className={className + ' cursor-pointer'}
      {...rest}
    />
  )
}

// useSkipper Hook - 用于防止自动重置
function useSkipper() {
  const shouldSkipRef = React.useRef(true)
  const shouldSkip = shouldSkipRef.current

  const skip = React.useCallback(() => {
    shouldSkipRef.current = false
  }, [])

  React.useEffect(() => {
    shouldSkipRef.current = true
  })

  return [shouldSkip, skip] as const
}

// 表格组件属性
interface YouTubeTableProps {
  data: UnifiedDataItem[]
  onDataChange?: (data: UnifiedDataItem[]) => void
  onSelectionChange?: (selectedIds: string[]) => void
  loading?: boolean
  className?: string
}

export function YouTubeTable({
  data,
  onDataChange,
  onSelectionChange,
  loading = false,
  className = '',
}: YouTubeTableProps) {
  // 表格状态
  const [tableData, setTableData] = useState(data)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    // 默认显示基本列
    select: true,
    thumbnail: true,
    title: true,
    'channelTitle': true,
    publishedAt: true,
    originalData: true,
    description: true,
    // 默认隐藏YouTube特有的列（如果没有数据）
    viewCount: false,
    likeCount: false,
    duration: false,
    // 默认隐藏AI增强列
    enhancedTitle: false,
    summarizedDescription: false,
    translatedTitle: false,
  })
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)

  // 防止自动重置页码
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()

  // 同步外部数据变化
  React.useEffect(() => {
    setTableData(data)
    
    // 根据数据类型动态调整列可见性
    if (data.length > 0) {
      const hasYouTubeData = data.some(item => item.videoUrl)
      const hasCSVData = data.some(item => (item as any).originalData && !item.videoUrl)
      
      setColumnVisibility(prev => ({
        ...prev,
        // YouTube特有列
        viewCount: hasYouTubeData,
        likeCount: hasYouTubeData,
        duration: hasYouTubeData,
        // CSV数据列
        originalData: hasCSVData,
      }))
    }
    
    // 当数据更新时，清除所有筛选器避免数据不一致
    setColumnFilters([])
    setGlobalFilter('')
  }, [data])

  // 通知选择变化
  React.useEffect(() => {
    const selectedIds = Object.keys(rowSelection).filter(key => rowSelection[key])
    onSelectionChange?.(selectedIds)
  }, [rowSelection, onSelectionChange])

  // 列定义
  const columns = useMemo<ColumnDef<UnifiedDataItem>[]>(
    () => [
      // 选择列
      {
        id: 'select',
        header: ({ table }) => (
          <IndeterminateCheckbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <div className="px-1">
            <IndeterminateCheckbox
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              indeterminate={row.getIsSomeSelected()}
              onChange={row.getToggleSelectedHandler()}
            />
          </div>
        ),
        size: 50,
        enableResizing: false,
      },
      // 缩略图列
      {
        accessorKey: 'thumbnail',
        header: '缩略图',
        cell: (props) => (
          <ThumbnailEditableCell {...props} />
        ),
        size: 80,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: true,
      },
      // 标题列（可编辑）
      {
        accessorKey: 'title',
        header: '标题',
        cell: (props) => (
          <EditableCell
            {...props}
            placeholder="输入标题"
            validator={(value) => value.length > 0 || '标题不能为空'}
          />
        ),
        meta: {
          filterVariant: 'text',
        },
        minSize: 200,
      },
      // 频道名称列或分类列
      {
        accessorKey: 'channelTitle',
        header: '频道/分类',
        cell: (props) => (
          <EditableCell
            {...props}
            placeholder="输入频道名称或分类"
          />
        ),
        meta: {
          filterVariant: 'select',
        },
        size: 150,
      },
      // 发布时间列
      {
        accessorKey: 'publishedAt',
        header: '发布时间',
        cell: (props) => (
          <EditableCell
            {...props}
            placeholder="输入发布时间"
            validator={(value) => {
              if (!value) return true
              const date = new Date(value)
              return !isNaN(date.getTime()) || '请输入有效的日期格式'
            }}
          />
        ),
        size: 120,
      },
      // 原始数据列（对CSV数据显示）
      {
        accessorKey: 'originalData',
        header: '原始数据',
        cell: (props) => {
          // 如果有videoUrl说明是YouTube数据，不显示原始数据列
          if (props.row.original.videoUrl) {
            return <div className="p-1 text-center text-gray-400">-</div>
          }
          return (
            <EditableCell
              {...props}
              placeholder="输入原始数据"
              isLongText={true}
            />
          )
        },
        meta: {
          filterVariant: 'text',
        },
        size: 150,
      },
      // 播放量列（仅对YouTube数据显示）
      {
        accessorKey: 'viewCount',
        header: '播放量',
        cell: (props) => {
          const value = props.getValue()
          if (value === undefined || value === null) {
            return <div className="p-1 text-center text-gray-400">-</div>
          }
          return (
            <NumberEditableCell
              {...props}
              format="compact"
            />
          )
        },
        meta: {
          filterVariant: 'range',
        },
        size: 100,
      },
      // 点赞量列（仅对YouTube数据显示）
      {
        accessorKey: 'likeCount',
        header: '点赞量',
        cell: (props) => {
          const value = props.getValue()
          if (value === undefined || value === null) {
            return <div className="p-1 text-center text-gray-400">-</div>
          }
          return (
            <NumberEditableCell
              {...props}
              format="compact"
            />
          )
        },
        meta: {
          filterVariant: 'range',
        },
        size: 100,
      },
      // 时长列（仅对YouTube数据显示）
      {
        accessorKey: 'duration',
        header: '时长',
        cell: (props) => (
          <EditableCell
            {...props}
            placeholder="输入时长 (如: 10:30)"
            validator={(value) => {
              if (!value) return true
              // 验证时长格式 (如: 1:30, 10:45, 1:05:30)
              const pattern = /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$|^\d{1,2}:[0-5]\d$/
              return pattern.test(value) || '请输入有效的时长格式 (如: 10:30)'
            }}
          />
        ),
        size: 80,
      },
      // 描述列（可编辑长文本）
      {
        accessorKey: 'description',
        header: '描述',
        cell: (props) => (
          <EditableCell
            {...props}
            isLongText={true}
            placeholder="输入描述"
          />
        ),
        meta: {
          filterVariant: 'text',
        },
        minSize: 200,
      },
      // AI优化标题列（可编辑）
      {
        accessorKey: 'enhancedTitle',
        header: 'AI优化标题',
        cell: (props) => (
          <EditableCell
            {...props}
            placeholder="AI生成的标题将显示在这里"
          />
        ),
        meta: {
          filterVariant: 'text',
        },
        minSize: 200,
      },
      // AI摘要列（可编辑）
      {
        accessorKey: 'summarizedDescription',
        header: 'AI摘要',
        cell: (props) => (
          <EditableCell
            {...props}
            isLongText={true}
            placeholder="AI生成的摘要将显示在这里"
          />
        ),
        meta: {
          filterVariant: 'text',
        },
        minSize: 200,
      },
      // 操作列
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex space-x-1">
            {row.original.videoUrl ? (
              <>
                <a
                  href={row.original.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                >
                  查看
                </a>
                <button
                  onClick={() => {
                    // 复制视频链接
                    navigator.clipboard.writeText(row.original.videoUrl || '')
                    // 这里可以添加Toast提示
                  }}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  复制
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  // 复制原始数据
                  const originalData = (row.original as any).originalData
                  if (originalData) {
                    navigator.clipboard.writeText(originalData)
                  }
                }}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                复制数据
              </button>
            )}
          </div>
        ),
        size: 100,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: true,
      },
    ],
    []
  )

  // 数据更新函数
  const updateData = React.useCallback(
    (rowIndex: number, columnId: string, value: unknown) => {
      skipAutoResetPageIndex()
      setTableData((old) =>
        old.map((row, index) => {
          if (index === rowIndex) {
            return {
              ...old[rowIndex]!,
              [columnId]: value,
              isEdited: true, // 标记为已编辑
            }
          }
          return row
        })
      )
    },
    [skipAutoResetPageIndex]
  )

  // 添加编辑历史
  const addEditHistory = React.useCallback(
    (rowIndex: number, field: string, oldValue: string, newValue: string) => {
      const editRecord: EditHistory = {
        field,
        oldValue,
        newValue,
        timestamp: new Date().toISOString(),
        method: 'manual',
      }

      setTableData((old) =>
        old.map((row, index) => {
          if (index === rowIndex) {
            const existingHistory = row.editHistory || []
            return {
              ...row,
              editHistory: [...existingHistory, editRecord],
            }
          }
          return row
        })
      )
    },
    []
  )

  // 表格实例
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 50,
      maxSize: 800,
      size: 150,
    },
    filterFns: {
      fuzzy: (row: any, columnId: string, value: any, addMeta: any) => {
        // 改进的模糊匹配实现
        if (!value) return true
        const itemValue = row.getValue(columnId)
        if (itemValue == null) return false
        
        const searchValue = String(value).toLowerCase()
        const cellValue = String(itemValue).toLowerCase()
        
        return cellValue.includes(searchValue)
      }
    },
    onRowSelectionChange: setRowSelection,
    autoResetPageIndex,
    enableRowSelection: true,
    // 表格meta，用于数据更新
    meta: {
      updateData,
      addEditHistory,
    },
    state: {
      columnFilters,
      globalFilter,
      sorting,
      columnVisibility,
      rowSelection,
      columnSizing,
    },
  })

  // 同步数据变化到父组件
  React.useEffect(() => {
    onDataChange?.(tableData)
  }, [tableData, onDataChange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">加载数据中...</span>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 表格工具栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="flex flex-col space-y-2">
          <GlobalFilter
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
          />
          <div className="text-xs text-gray-400">
            💡 提示：将鼠标悬停在列边界上可拖拽调节列宽
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvancedFilter(true)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            高级筛选
          </button>
          <ColumnVisibility table={table} />
          <div className="text-sm text-gray-500">
            {Object.keys(rowSelection).length} 项已选择
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-auto border border-gray-200 rounded-lg">
        <table 
          className="min-w-full divide-y divide-gray-200"
          style={{ 
            width: table.getCenterTotalSize(),
            tableLayout: 'fixed' 
          }}
        >
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative border-r border-gray-200 last:border-r-0"
                    style={{ 
                      width: header.getSize(),
                      position: 'relative',
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="space-y-1">
                        <div
                          className={`flex items-center space-x-1 ${
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none hover:text-gray-700'
                              : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: ' 🔼',
                            desc: ' 🔽',
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                        {header.column.getCanFilter() ? (
                          <Filter column={header.column} table={table} />
                        ) : null}
                      </div>
                    )}
                    {/* 列宽调节手柄 */}
                    {header.column.getCanResize() && (
                      <div
                        {...{
                          onMouseDown: header.getResizeHandler(),
                          onTouchStart: header.getResizeHandler(),
                          className: `absolute top-0 right-0 h-full w-4 cursor-col-resize group ${
                            header.column.getIsResizing() ? 'bg-blue-300' : 'hover:bg-blue-100'
                          }`,
                          style: {
                            marginRight: '-8px',
                            zIndex: 20,
                            userSelect: 'none',
                            transform: header.column.getIsResizing() ? 'scaleX(1.2)' : 'scaleX(1)',
                            transition: 'all 0.2s ease',
                          },
                        }}
                        title="拖拽调节列宽"
                      >
                        {/* 可见的拖拽线 */}
                        <div 
                          className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-full transition-all ${
                            header.column.getIsResizing() 
                              ? 'bg-blue-600 w-1' 
                              : 'bg-gray-300 group-hover:bg-blue-500 group-hover:w-1'
                          }`}
                        />
                        {/* 拖拽把手 */}
                        <div 
                          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400 rounded opacity-0 group-hover:opacity-100 transition-all ${
                            header.column.getIsResizing() ? 'opacity-100 bg-blue-600' : ''
                          }`}
                        />
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`hover:bg-gray-50 ${
                  row.getIsSelected() ? 'bg-blue-50' : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 last:border-r-0"
                    style={{ 
                      width: cell.column.getSize(),
                      maxWidth: cell.column.getSize(),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页控件 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 overflow-x-auto">
          <button
            className="px-2 py-1 sm:px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="hidden sm:inline">首页</span>
            <span className="sm:hidden">⏮</span>
          </button>
          <button
            className="px-2 py-1 sm:px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="hidden sm:inline">上一页</span>
            <span className="sm:hidden">◀</span>
          </button>
          <button
            className="px-2 py-1 sm:px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="hidden sm:inline">下一页</span>
            <span className="sm:hidden">▶</span>
          </button>
          <button
            className="px-2 py-1 sm:px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="hidden sm:inline">末页</span>
            <span className="sm:hidden">⏭</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-700 text-center sm:text-left">
          <span>
            第 {table.getState().pagination.pageIndex + 1} 页，共{' '}
            {table.getPageCount()} 页
          </span>
          <span>|</span>
          <span>共 {table.getFilteredRowModel().rows.length} 条记录</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value))
            }}
            className="px-2 py-1 border border-gray-300 rounded"
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                显示 {pageSize} 条
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 高级筛选面板 */}
      <AdvancedFilterPanel
        table={table}
        isOpen={showAdvancedFilter}
        onClose={() => setShowAdvancedFilter(false)}
      />
    </div>
  )
}