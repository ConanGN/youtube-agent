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
} from '@tanstack/react-table'
import { YouTubeVideo, EditHistory } from '@/types'
import { EditableCell, NumberEditableCell } from './EditableCell'
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
  data: YouTubeVideo[]
  onDataChange?: (data: YouTubeVideo[]) => void
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)

  // 防止自动重置页码
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()

  // 同步外部数据变化
  React.useEffect(() => {
    setTableData(data)
  }, [data])

  // 通知选择变化
  React.useEffect(() => {
    const selectedIds = Object.keys(rowSelection).filter(key => rowSelection[key])
    onSelectionChange?.(selectedIds)
  }, [rowSelection, onSelectionChange])

  // 列定义
  const columns = useMemo<ColumnDef<YouTubeVideo>[]>(
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
      },
      // 缩略图列
      {
        accessorKey: 'thumbnail',
        header: '缩略图',
        cell: ({ getValue, row }) => (
          <div className="flex items-center justify-center p-1">
            <img
              src={getValue() as string}
              alt={row.original.title}
              className="w-16 h-12 object-cover rounded border"
              loading="lazy"
            />
          </div>
        ),
        size: 80,
        enableSorting: false,
        enableColumnFilter: false,
      },
      // 标题列（可编辑）
      {
        accessorKey: 'title',
        header: '视频标题',
        cell: (props) => (
          <EditableCell
            {...props}
            placeholder="输入视频标题"
            validator={(value) => value.length > 0 || '标题不能为空'}
          />
        ),
        meta: {
          filterVariant: 'text',
        },
        minSize: 200,
      },
      // 频道名称列
      {
        accessorKey: 'channelTitle',
        header: '频道',
        cell: ({ getValue }) => (
          <div className="p-1 truncate" title={getValue() as string}>
            {getValue() as string}
          </div>
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
        cell: ({ getValue }) => {
          const date = new Date(getValue() as string)
          return (
            <div className="p-1 text-sm">
              {date.toLocaleDateString('zh-CN')}
            </div>
          )
        },
        size: 120,
      },
      // 播放量列
      {
        accessorKey: 'viewCount',
        header: '播放量',
        cell: (props) => (
          <NumberEditableCell
            {...props}
            format="compact"
          />
        ),
        meta: {
          filterVariant: 'range',
        },
        size: 100,
      },
      // 点赞量列
      {
        accessorKey: 'likeCount',
        header: '点赞量',
        cell: (props) => (
          <NumberEditableCell
            {...props}
            format="compact"
          />
        ),
        meta: {
          filterVariant: 'range',
        },
        size: 100,
      },
      // 时长列
      {
        accessorKey: 'duration',
        header: '时长',
        cell: ({ getValue }) => (
          <div className="p-1 text-center text-sm font-mono">
            {getValue() as string}
          </div>
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
            placeholder="输入视频描述"
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
                navigator.clipboard.writeText(row.original.videoUrl)
                // 这里可以添加Toast提示
              }}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              复制
            </button>
          </div>
        ),
        size: 100,
        enableSorting: false,
        enableColumnFilter: false,
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
    filterFns: {},
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
    },
  })

  // 同步数据变化到父组件
  React.useEffect(() => {
    onDataChange?.(tableData)
  }, [tableData, onDataChange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
        <span className="ml-3">加载数据中...</span>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 表格工具栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4">
        <GlobalFilter
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
        />
        
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: header.getSize() }}
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
                    className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100 last:border-r-0"
                    style={{ width: cell.column.getSize() }}
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