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
import { Zap, AlertCircle, CheckCircle, RefreshCw, X } from 'lucide-react'
import {
  YouTubeVideo,
  EditHistory,
  UnifiedDataItem,
  DynamicColumnConfig,
  COLUMN_TEMPLATES,
} from '@/types'
import { EditableCell, NumberEditableCell } from './EditableCell'
import { ThumbnailEditableCell } from './ThumbnailEditableCell'
import { SubtitleEditDialog } from './SubtitleEditDialog'
import {
  Filter,
  GlobalFilter,
  AdvancedFilterPanel,
} from './FilterComponents'
import { UnifiedColumnControl } from './UnifiedColumnControl'
import {
  ColumnHeaderWithSubtitle,
  shouldShowSubtitleHeader,
} from './ColumnHeaderWithSubtitle'
import { TableStyleEnhancer } from '../table/TableStyleEnhancer'
import AIPromptDrawer, {
  type AIBatchConfig,
} from '@/app/components/ai/AIPromptDrawer'
import { useAIBatch, BatchStatus } from '@/app/hooks/useAIBatch'
import { useDynamicColumns } from '@/hooks/useDynamicColumns'

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
    index: true, // 默认显示序号列
    subtitle: true, // 默认显示字幕列
    thumbnail: true,
    title: true,
    channelTitle: true,
    publishedAt: true,
    originalData: true,
    description: true,
    subtitles: true, // 默认显示字幕列
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

  // 客户端挂载状态 - 用于解决Hydration不匹配问题
  const [isMounted, setIsMounted] = useState(false)

  // AI批处理状态
  const [showAIDrawer, setShowAIDrawer] = useState(false)
  const [selectedColumnForAI, setSelectedColumnForAI] = useState<{
    id: string
    name: string
  } | null>(null)
  const [aiColumns, setAiColumns] = useState<Set<string>>(new Set())

  // 字幕相关状态
  const [subtitleFetching, setSubtitleFetching] = useState(false)
  const [subtitleEditDialog, setSubtitleEditDialog] = useState<{
    isOpen: boolean
    videoId: string
    currentSubtitles: string
  }>({
    isOpen: false,
    videoId: '',
    currentSubtitles: '',
  })

  // AI批处理Hook
  const {
    batchState,
    startBatch,
    retryFailedItems,
    cancelBatch,
    clearResults,
    getNewColumnKey,
    getFailedItemsData,
    acceptSingleRow,
    acceptAllRows,
    rejectVirtualColumn,
    commitVirtualColumn,
    getVirtualColumnData,
  } = useAIBatch()

  // 动态列管理Hook
  const dynamicColumns = useDynamicColumns({
    initialData: data,
    autoInferColumns: false, // 暂时禁用自动推断来测试
    onColumnChange: (configs) => {
      // 仅在开发环境输出调试信息，避免生产环境控制台噪音
      if (process.env.NODE_ENV === 'development') {
        console.log('列配置已更新:', configs)
      }
    },
    onError: (error) => {
      console.error('动态列系统错误:', error)
    },
  })

  // 处理副标题更新的函数
  const handleSubtitleChange = React.useCallback(
    (columnId: string, newSubtitle: string) => {
      // 仅在开发环境输出调试信息，避免控制台频繁输出
      if (process.env.NODE_ENV === 'development') {
        console.log(`更新列 ${columnId} 的副标题:`, newSubtitle)
      }
      try {
        dynamicColumns.updateColumn(columnId, {
          subtitle: newSubtitle.trim() || undefined, // 空字符串转为undefined
          updatedAt: new Date().toISOString(),
        })
      } catch (error) {
        console.error('更新副标题失败:', error)
        // 可以在这里添加错误提示UI
      }
    },
    [dynamicColumns]
  )

  // 设置客户端挂载状态
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // 临时手动添加基础列配置（用于测试数据获取功能）
  React.useEffect(() => {
    if (
      isMounted &&
      data.length > 0 &&
      dynamicColumns.columnConfigs.length === 0
    ) {
      // 仅在开发环境输出调试信息
      if (process.env.NODE_ENV === 'development') {
        console.log('手动添加基础列配置...')
      }

      // 添加基础YouTube列 - 优化列宽设置
      const basicColumns = [
        {
          key: 'thumbnail',
          title: '缩略图',
          width: 80,
          minWidth: 60,
          maxWidth: 120,
          templateId: 'image',
        },
        {
          key: 'title',
          title: '标题',
          width: 300,
          minWidth: 200,
          maxWidth: 500,
          templateId: 'basic-text',
        },
        {
          key: 'channelTitle',
          title: '频道',
          width: 140,
          minWidth: 100,
          maxWidth: 200,
          templateId: 'basic-text',
        },
        {
          key: 'publishedAt',
          title: '发布时间',
          width: 110,
          minWidth: 90,
          maxWidth: 150,
          templateId: 'date',
        },
        {
          key: 'viewCount',
          title: '观看数',
          width: 100,
          minWidth: 80,
          maxWidth: 120,
          templateId: 'number',
        },
        {
          key: 'description',
          title: '描述',
          width: 250,
          minWidth: 150,
          maxWidth: 400,
          templateId: 'long-text',
        },
      ]

      basicColumns.forEach((col, index) => {
        if (data[0].hasOwnProperty(col.key)) {
          // 查找对应的模板
          const template = COLUMN_TEMPLATES.find((t) => t.id === col.templateId)
          if (template) {
            dynamicColumns.addColumn(template, {
              title: col.title,
              accessorKey: col.key,
              width: col.width,
              minWidth: col.minWidth,
              maxWidth: col.maxWidth,
              visible: true,
              position: index,
            })
          }
        }
      })
    }
  }, [
    isMounted,
    data,
    dynamicColumns.columnConfigs.length,
    dynamicColumns.addColumn,
  ])

  // 防止自动重置页码
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()

  // 字幕相关工具函数 - 使用useCallback稳定函数引用
  const formatTime = React.useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  const formatSubtitles = React.useCallback(
    (cues: any[]): string => {
      if (!cues || cues.length === 0) return ''
      return cues
        .map((cue, index) => {
          const startTime = formatTime(cue.start)
          const endTime = formatTime(cue.start + cue.dur)
          return `${index + 1}. [${startTime} - ${endTime}] ${cue.text}`
        })
        .join('\n')
    },
    [formatTime]
  )

  // 字幕编辑相关函数
  const handleOpenSubtitleEdit = (videoId: string, subtitles: any) => {
    const subtitleText = formatSubtitles(subtitles.cues)
    setSubtitleEditDialog({
      isOpen: true,
      videoId: videoId,
      currentSubtitles: subtitleText,
    })
  }

  const handleCloseSubtitleEdit = () => {
    setSubtitleEditDialog({
      isOpen: false,
      videoId: '',
      currentSubtitles: '',
    })
  }

  const handleSaveSubtitleEdit = (newText: string) => {
    // 更新表格数据中的字幕内容
    const updatedData = tableData.map((item) => {
      if (item.id === subtitleEditDialog.videoId) {
        return {
          ...item,
          subtitles: {
            ...item.subtitles,
            rawText: newText, // 保存原始编辑文本
          },
        } as UnifiedDataItem
      }
      return item
    })

    setTableData(updatedData)
    onDataChange?.(updatedData)

    // 关闭弹窗
    handleCloseSubtitleEdit()
  }

  // 使用useMemo稳定计算结果，避免每次渲染都重新计算
  const hasSelectedVideos = React.useMemo(
    () => Object.keys(rowSelection).length > 0,
    [rowSelection]
  )

  // 为虚拟列草稿创建稳定的版本标识，避免Map对象引起的重渲染
  const virtualDraftsVersion = React.useMemo(
    () => Array.from(batchState.virtualDrafts.keys()).sort().join(','),
    [batchState.virtualDrafts]
  )

  // 字幕批量抓取处理函数 - 使用useCallback稳定函数引用
  const handleBatchSubtitleFetch = React.useCallback(
    async (table: any) => {
      // 使用与按钮状态检测一致的方式获取选中行
      const selectedRows = table.getSelectedRowModel().rows
      const selectedVideos = selectedRows.map((row: any) => row.original)

      // 限制最多10个视频
      if (selectedVideos.length > 10) {
        alert('一次最多只能抓取10个视频的字幕')
        return
      }

      if (selectedVideos.length === 0) {
        alert('请先选择要抓取字幕的视频')
        return
      }

      setSubtitleFetching(true)

      try {
        // 设置选中视频的加载状态
        const updatedData = tableData.map((item) => {
          if (selectedVideos.some((video: any) => video.id === item.id)) {
            return { ...item, subtitlesStatus: 'loading' as const }
          }
          return item
        })
        setTableData(updatedData)
        onDataChange?.(updatedData)

        // 提取视频ID
        const videoIds = selectedVideos.map((video: any) => video.id)

        // 调用字幕抓取API
        const response = await fetch(
          `/api/subtitles?${videoIds.map((id: string) => `id=${id}`).join('&')}`
        )

        if (!response.ok) {
          const errorData = await response.json() as { error?: string }
          throw new Error(errorData.error || '字幕抓取失败')
        }

        // API直接返回结果数组，不是包装在results字段中
        const results = (await response.json()) as any[]
        const finalData = tableData.map((item) => {
          const subtitleResult = results.find(
            (result: any) => result.id === item.id
          )
          if (subtitleResult) {
            if (subtitleResult.error) {
              return {
                ...item,
                subtitlesStatus: 'error' as const,
                subtitlesError: subtitleResult.error,
              }
            } else if (subtitleResult.cues.length === 0) {
              return {
                ...item,
                subtitlesStatus: 'empty' as const,
              }
            } else {
              return {
                ...item,
                subtitles: subtitleResult,
                subtitlesStatus: 'success' as const,
                subtitlesError: undefined,
              }
            }
          }
          return item
        })

        setTableData(finalData)
        onDataChange?.(finalData)
      } catch (error) {
        console.error('字幕抓取失败:', error)

        // 设置错误状态
        const errorData = tableData.map((item) => {
          if (selectedVideos.some((video: any) => video.id === item.id)) {
            return {
              ...item,
              subtitlesStatus: 'error' as const,
              subtitlesError:
                error instanceof Error ? error.message : '抓取失败',
            }
          }
          return item
        })
        setTableData(errorData)
        onDataChange?.(errorData)
      } finally {
        setSubtitleFetching(false)
      }
    },
    [tableData, onDataChange]
  )

  // 同步外部数据变化
  React.useEffect(() => {
    setTableData(data)

    // 根据数据类型动态调整列可见性
    if (data.length > 0) {
      const hasYouTubeData = data.some((item) => item.videoUrl)
      const hasCSVData = data.some(
        (item) => (item as any).originalData && !item.videoUrl
      )

      setColumnVisibility((prev) => ({
        ...prev,
        // 始终显示的基本列
        select: true,
        index: true, // 序号列始终显示
        subtitle: true, // 字幕列始终显示
        thumbnail: true,
        title: true,
        channelTitle: true,
        publishedAt: true,
        subtitles: true, // 字幕列始终显示
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
    const selectedIds = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    )
    onSelectionChange?.(selectedIds)
  }, [rowSelection, onSelectionChange])

  // 使用动态列系统的列定义
  const columns = useMemo<ColumnDef<UnifiedDataItem>[]>(() => {
    // 获取动态列
    const dynamicCols = dynamicColumns.tableColumns

    // 添加系统列（选择列和序号列）到动态列的前面
    const systemColumns: ColumnDef<UnifiedDataItem>[] = [
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
      // 序号列
      {
        id: 'index',
        header: '序号',
        cell: ({ row }) => (
          <div className="text-center text-gray-600 font-medium">
            {row.index + 1}
          </div>
        ),
        size: 50,
        enableResizing: false,
        enableSorting: false,
        enableColumnFilter: false,
      },
    ]

    // 链接列定义
    const linkColumn: ColumnDef<UnifiedDataItem> = {
      id: 'videoLink',
      header: () => (
        <div className="text-center">
          <span className="text-sm font-medium">链接</span>
        </div>
      ),
      cell: ({ row }) => {
        const videoUrl = row.original.videoUrl
        if (!videoUrl) {
          return (
            <div className="text-gray-400 text-sm px-2 py-1 text-center italic">
              暂无链接
            </div>
          )
        }

        return (
          <div className="px-2 py-1 text-center">
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              title={`打开视频链接: ${videoUrl}`}
            >
              打开链接
            </a>
          </div>
        )
      },
      size: 90,
      enableResizing: true,
      enableSorting: false,
      enableColumnFilter: false,
    }

    // 字幕列定义
    const subtitleColumn: ColumnDef<UnifiedDataItem> = {
      id: 'subtitle',
      // 添加智能字幕数据提取函数，支持搜索功能
      accessorFn: (row) => {
        const subtitles = row.subtitles
        if (!subtitles) return ''

        // 优先搜索已编辑的原始文本
        if (subtitles.rawText) {
          return subtitles.rawText
        }

        // 其次搜索格式化的字幕内容
        if (subtitles.cues && subtitles.cues.length > 0) {
          return subtitles.cues.map((cue) => cue.text).join(' ')
        }

        return '' // 空状态和错误状态返回空字符串
      },
      header: ({ table }) => {
        const selectedRows = table.getSelectedRowModel().rows
        const selectedCount = selectedRows.length
        return (
          <div className="flex flex-col items-center w-full space-y-1">
            <span className="text-sm font-medium text-center">字幕</span>
            <button
              onClick={() => handleBatchSubtitleFetch(table)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedCount > 0 && !subtitleFetching
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={
                subtitleFetching
                  ? '正在获取字幕...'
                  : selectedCount > 0
                    ? `获取选中 ${selectedCount} 行的字幕`
                    : '请先选择要获取字幕的行'
              }
              disabled={selectedCount === 0 || subtitleFetching}
            >
              {subtitleFetching ? '获取中...' : '获取字幕'}
            </button>
          </div>
        )
      },
      cell: ({ row }) => {
        const subtitles = row.original.subtitles
        const status = (row.original as any).subtitlesStatus

        // 双击编辑处理函数
        const handleDoubleClick = () => {
          // 如果有字幕数据，打开编辑弹窗
          if (subtitles && subtitles.cues && subtitles.cues.length > 0) {
            handleOpenSubtitleEdit(row.original.id, subtitles)
          } else if (subtitles && subtitles.rawText) {
            // 如果有原始文本（已编辑过的字幕），直接编辑
            setSubtitleEditDialog({
              isOpen: true,
              videoId: row.original.id,
              currentSubtitles: subtitles.rawText,
            })
          } else {
            // 如果没有字幕，创建新的空白编辑
            setSubtitleEditDialog({
              isOpen: true,
              videoId: row.original.id,
              currentSubtitles: '',
            })
          }
        }

        if (status === 'loading') {
          return (
            <div className="flex items-center px-2 py-1 text-xs text-blue-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2"></div>
              加载中...
            </div>
          )
        }

        if (status === 'error') {
          const error = (row.original as any).subtitlesError
          return (
            <div
              className="px-2 py-1 text-xs text-red-600 truncate cursor-pointer hover:bg-red-50"
              title={`${error} - 双击编辑字幕`}
              onDoubleClick={handleDoubleClick}
            >
              获取失败: {error}
            </div>
          )
        }

        if (status === 'empty') {
          return (
            <div
              className="px-2 py-1 text-xs text-gray-400 italic cursor-pointer hover:bg-gray-50"
              title="双击编辑字幕"
              onDoubleClick={handleDoubleClick}
            >
              无可用字幕
            </div>
          )
        }

        if (subtitles && subtitles.cues && subtitles.cues.length > 0) {
          const cueCount = subtitles.cues.length
          const languages = subtitles.languages || []
          const preview = subtitles.cues[0]?.text?.substring(0, 30) + '...'

          return (
            <div
              className="px-2 py-1 text-xs cursor-pointer hover:bg-blue-50"
              title={`${preview} - 双击编辑字幕`}
              onDoubleClick={handleDoubleClick}
            >
              <div className="text-green-600 font-medium">
                {cueCount} 条字幕
              </div>
              <div className="text-gray-500 truncate">
                {languages.length > 1 ? `[${languages.join(', ')}] ` : ''}
                {preview}
              </div>
            </div>
          )
        }

        // 显示已编辑的原始文本（如果有）
        if (subtitles && subtitles.rawText) {
          const preview =
            subtitles.rawText.substring(0, 50) +
            (subtitles.rawText.length > 50 ? '...' : '')
          return (
            <div
              className="px-2 py-1 text-xs cursor-pointer hover:bg-blue-50"
              title={`${preview} - 双击编辑字幕`}
              onDoubleClick={handleDoubleClick}
            >
              <div className="text-blue-600 font-medium">已编辑字幕</div>
              <div className="text-gray-500 truncate">{preview}</div>
            </div>
          )
        }

        return (
          <div
            className="text-gray-400 text-xs px-2 py-1 italic cursor-pointer hover:bg-gray-50"
            title="双击编辑字幕"
            onDoubleClick={handleDoubleClick}
          >
            暂无字幕
          </div>
        )
      },
      size: 160,
      enableResizing: true,
      enableSorting: false,
      enableColumnFilter: false, // 禁用列搜索功能 - UI已移除
      meta: {
        filterVariant: 'text', // 保留搜索类型配置以供未来使用
      },
    }

    // 合并系统列和动态列，插入链接列和字幕列
    const allColumns = [...systemColumns]
    let linkInserted = false
    let subtitleInserted = false

    // 遍历动态列，在缩略图列前插入链接列，在描述列后插入字幕列
    dynamicCols.forEach((col) => {
      // 如果当前列是缩略图列，先插入链接列
      if (col.id === 'system_thumbnail' && !linkInserted) {
        allColumns.push(linkColumn)
        linkInserted = true
      }

      allColumns.push(col)

      // 如果当前列是描述列，立即在其后插入字幕列
      if (col.id === 'description' && !subtitleInserted) {
        allColumns.push(subtitleColumn)
        subtitleInserted = true
      }
    })

    // 如果没有找到缩略图列，将链接列添加到系统列之后
    if (!linkInserted) {
      allColumns.splice(2, 0, linkColumn) // 插入到序号列后面
    }

    // 如果没有找到描述列，将字幕列添加到最后
    if (!subtitleInserted) {
      allColumns.push(subtitleColumn)
    }

    return allColumns
  }, [dynamicColumns.tableColumns, handleBatchSubtitleFetch, subtitleFetching])

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
      },
    },
    getRowId: (row) => row.id, // 确保使用ID作为行标识符
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

  // 处理AI批处理结果 - 优化版本：避免依赖竞争条件
  const applyAIResults = React.useCallback(() => {
    // 调试信息：输出批处理状态
    if (process.env.NODE_ENV === 'development') {
      const currentTableData = tableData
      const tableRowIds = currentTableData.map((row) => row.id)
      const resultRowIds = Array.from(batchState.results.keys())
      const matchingIds = tableRowIds.filter((id) => batchState.results.has(id))

      console.log('🔄 执行AI结果应用:', {
        status: batchState.status,
        isVirtualColumn: batchState.isVirtualColumn,
        targetColumnId: batchState.targetColumnId,
        resultsCount: batchState.results.size,
        tableDataCount: currentTableData.length,
        matchingIdsCount: matchingIds.length,
        tableRowIds: tableRowIds,
        resultRowIds: resultRowIds,
        matchingIds: matchingIds,
        allResults: Array.from(batchState.results.entries()),
        sampleTableRow: currentTableData[0]
          ? {
              id: currentTableData[0].id,
              keys: Object.keys(currentTableData[0]),
              targetColumnValue:
                currentTableData[0][
                  batchState.targetColumnId as keyof UnifiedDataItem
                ],
            }
          : null,
      })

      // 检查ID匹配问题
      if (matchingIds.length === 0 && batchState.results.size > 0) {
        console.error('❌ 严重问题：结果ID与表格数据ID完全不匹配！', {
          表格ID示例: tableRowIds.slice(0, 3),
          结果ID示例: resultRowIds.slice(0, 3),
        })
        return // 如果ID不匹配，直接返回
      }
    }

    // 获取当前最新的表格数据
    setTableData((currentTableData) => {
      let hasChanges = false
      let updatedCount = 0

      if (process.env.NODE_ENV === 'development') {
        console.log('📊 开始应用结果到表格数据 - 当前数据状态:', {
          tableDataLength: currentTableData.length,
          firstRowSample: currentTableData[0]
            ? {
                id: currentTableData[0].id,
                hasTargetColumn:
                  batchState.targetColumnId ? batchState.targetColumnId in currentTableData[0] : false,
                targetColumnCurrentValue:
                  batchState.targetColumnId ? currentTableData[0][
                    batchState.targetColumnId as keyof UnifiedDataItem
                  ] : undefined,
              }
            : null,
        })
      }

      const updatedData = currentTableData.map((row, index) => {
        const result = batchState.results.get(row.id)

        if (process.env.NODE_ENV === 'development' && result) {
          console.log(`🔍 处理第${index + 1}行 (ID: ${row.id}):`, {
            hasResult: !!result,
            resultStatus: result?.status,
            resultOutput: result?.output?.substring(0, 50) + '...',
            targetColumnId: batchState.targetColumnId,
            isVirtualColumn: batchState.isVirtualColumn,
          })
        }

        if (result && result.status === 'ok') {
          // 区分虚拟列模式和覆盖模式
          if (batchState.isVirtualColumn) {
            // 虚拟列模式：找到对应的AI列键
            const aiColumnKey = Array.from(aiColumns).find(
              (key) =>
                batchState.jobId &&
                key.includes(batchState.jobId.split('_').pop() || '')
            )
            if (aiColumnKey) {
              hasChanges = true
              updatedCount++
              if (process.env.NODE_ENV === 'development') {
                console.log(
                  `✅ 虚拟列模式 - 更新行 ${row.id} 的列 ${aiColumnKey}`
                )
              }
              return {
                ...row,
                [aiColumnKey]: result.output,
                isEdited: true,
              }
            }
          } else {
            // 覆盖模式：直接更新目标列
            if (batchState.targetColumnId) {
              hasChanges = true
              updatedCount++
              const updatedRow = {
                ...row,
                [batchState.targetColumnId]: result.output,
                isEdited: true,
              }

              if (process.env.NODE_ENV === 'development') {
                console.log(
                  `✅ 覆盖模式 - 更新行 ${row.id} 的列 ${batchState.targetColumnId}:`,
                  {
                    oldValue:
                      row[batchState.targetColumnId as keyof UnifiedDataItem],
                    newValue: result.output,
                    updatedRow: {
                      id: updatedRow.id,
                      [batchState.targetColumnId]:
                        updatedRow[
                          batchState.targetColumnId as keyof UnifiedDataItem
                        ],
                    },
                    // 🔧 新增调试信息：检查字段是否真的被设置
                    fieldExists: batchState.targetColumnId in updatedRow,
                    fieldValue:
                      updatedRow[
                        batchState.targetColumnId as keyof UnifiedDataItem
                      ],
                  }
                )
              }
              return updatedRow
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`⚠️ 覆盖模式但 targetColumnId 为空`)
              }
            }
          }
        }
        return row
      })

      if (hasChanges) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `🎉 成功应用AI批处理结果到表格数据！更新了 ${updatedCount} 行`,
            {
              originalDataLength: currentTableData.length,
              updatedDataLength: updatedData.length,
              firstUpdatedRow: updatedData.find(
                (row) =>
                  batchState.results.has(row.id) &&
                  batchState.results.get(row.id)?.status === 'ok'
              ),
              targetColumnInFirstRow: updatedData[0]
                ? {
                    id: updatedData[0].id,
                    [batchState.targetColumnId || 'unknown']:
                      updatedData[0][
                        batchState.targetColumnId as keyof UnifiedDataItem
                      ],
                  }
                : null,
            }
          )

          // 验证更新后的数据
          const verifyRow = updatedData.find(
            (row) =>
              batchState.results.has(row.id) &&
              batchState.results.get(row.id)?.status === 'ok'
          )
          if (verifyRow && batchState.targetColumnId) {
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ 数据验证 - 更新后的行:', {
                rowId: verifyRow.id,
                targetColumn: batchState.targetColumnId,
                newValue:
                  verifyRow[batchState.targetColumnId as keyof UnifiedDataItem],
                fullRow: verifyRow,
              })
            }
          }
        }

        // 强制触发重新渲染 - 创建完全新的数组引用
        const forceUpdatedData = updatedData.map((row) => ({ ...row }))
        return forceUpdatedData
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('📝 没有需要应用的AI批处理结果', {
            resultsSize: batchState.results.size,
            targetColumnId: batchState.targetColumnId,
            isVirtualColumn: batchState.isVirtualColumn,
            sampleResult:
              batchState.results.size > 0
                ? Array.from(batchState.results.entries())[0]
                : null,
            // 检查是否有匹配的行
            tableDataIds: currentTableData.map((row) => row.id).slice(0, 3),
            resultIds: Array.from(batchState.results.keys()).slice(0, 3),
          })
        }
        return currentTableData
      }
    })
  }, [
    batchState.results,
    batchState.isVirtualColumn,
    batchState.targetColumnId,
    batchState.jobId,
    aiColumns,
  ])

  // 监听AI批处理完成状态 - 强制更新版本
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 AI批处理状态监听:', {
        status: batchState.status,
        resultsSize: batchState.results.size,
        targetColumnId: batchState.targetColumnId,
        isVirtualColumn: batchState.isVirtualColumn,
        jobId: batchState.jobId,
      })
    }

    if (
      batchState.status === BatchStatus.COMPLETED &&
      batchState.results.size > 0
    ) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 检测到AI批处理完成，强制应用结果...')
        console.log('当前表格数据行数:', tableData.length)
        console.log('表格数据示例:', tableData.slice(0, 2))
      }

      // 立即应用结果，不使用setTimeout
      applyAIResults()

      // 也使用setTimeout作为备份
      setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 备份：再次尝试应用AI结果')
        }
        applyAIResults()
      }, 100)

      // 强制重新渲染表格
      setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 强制表格重新渲染')
        }
        // 通过改变表格的key来强制重新渲染
        table.resetRowSelection()
      }, 200)
    }
  }, [batchState.status, batchState.results.size, applyAIResults, table])

  // 监听AI批处理运行时的进度更新
  React.useEffect(() => {
    if (
      batchState.status === BatchStatus.RUNNING &&
      batchState.results.size > 0
    ) {
      // 实时应用已完成的结果
      applyAIResults()
    }
  }, [batchState.results.size, applyAIResults])

  // 同步数据变化到父组件
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // 检查是否有AI列数据
      const hasAIData = tableData.some(
        (row) =>
          batchState.targetColumnId &&
          row[batchState.targetColumnId as keyof UnifiedDataItem]
      )

      console.log('📤 同步表格数据到父组件:', {
        tableDataLength: tableData.length,
        hasOnDataChange: !!onDataChange,
        targetColumnId: batchState.targetColumnId,
        hasAIData: hasAIData,
        sampleRowWithTarget: batchState.targetColumnId
          ? tableData.find(
              (row) => row[batchState.targetColumnId as keyof UnifiedDataItem]
            )
          : null,
        allRowsTargetColumnValues: batchState.targetColumnId
          ? tableData.map((row) => ({
              id: row.id,
              value: row[batchState.targetColumnId as keyof UnifiedDataItem],
            }))
          : [],
      })
    }
    onDataChange?.(tableData)
  }, [tableData, onDataChange, batchState.targetColumnId])

  // 进一步稳定化availableColumns，避免每次渲染都创建新的对象数组
  const stableAvailableColumns = React.useMemo(() => {
    return dynamicColumns.visibleConfigs
      .filter((col) => !['select', 'index', 'actions'].includes(col.id))
      .map((col) => ({
        id: col.id,
        title: col.title,
        subtitle: col.subtitle, // 包含用户自定义副标题
        dataType: col.dataType,
        isSystemColumn: col.isSystemColumn,
        accessorKey: col.accessorKey, // 添加实际的数据字段名
      }))
  }, [dynamicColumns.visibleConfigs])

  // 使用useMemo稳定化AIPromptDrawer的props，避免无限重渲染
  const stableProcessingInfo = React.useMemo(() => {
    const selectedRows = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    )
    const filteredRows = table.getFilteredRowModel().rows
    const allRows = table.getCoreRowModel().rows

    // 确定处理范围
    let processingScope: 'selected' | 'filtered' | 'all'
    let targetRows: typeof allRows
    let dataCount: number

    if (selectedRows.length > 0) {
      // 有选中行时，优先处理选中行
      processingScope = 'selected'
      targetRows = allRows.filter((row) => rowSelection[row.id])
      dataCount = selectedRows.length
    } else if (columnFilters.length > 0 || globalFilter) {
      // 无选中行但有筛选条件时，处理筛选结果
      processingScope = 'filtered'
      targetRows = filteredRows
      dataCount = filteredRows.length
    } else {
      // 无选中行无筛选条件时，处理全表
      processingScope = 'all'
      targetRows = allRows
      dataCount = allRows.length
    }

    return {
      processingScope,
      targetRows,
      dataCount,
      selectedRowCount: selectedRows.length,
      filteredRowCount: filteredRows.length,
      totalRowCount: allRows.length,
      // 新增：完整的行数据
      selectedRowsData: targetRows.map((row) => ({
        rowId: row.original.id,
        rowIndex: row.index,
        data: row.original,
      })),
      // 使用稳定化的列信息
      availableColumns: stableAvailableColumns,
    }
  }, [rowSelection, table, columnFilters, globalFilter, stableAvailableColumns])

  // 计算处理范围和数据统计 - 直接返回稳定化的处理信息，避免重复计算
  const getProcessingInfo = React.useCallback(() => {
    return stableProcessingInfo
  }, [stableProcessingInfo])

  // 处理AI批处理配置提交 - 移到getProcessingInfo之后以避免TDZ错误
  const handleAIBatchSubmit = React.useCallback(
    async (config: AIBatchConfig) => {
      if (!selectedColumnForAI) return

      const processingInfo = getProcessingInfo()

      // 优先使用预提取的数据（确保预览和处理使用相同数据）
      let columnData: Array<{ rowId: string; content: string }>

      if (config.extractedData && config.extractedData.length > 0) {
        // 使用预提取的数据
        columnData = config.extractedData

        if (process.env.NODE_ENV === 'development') {
          console.log('DEBUG - handleAIBatchSubmit: 使用预提取数据:', {
            extractedDataCount: config.extractedData.length,
            firstExtractedItem: config.extractedData[0],
          })
        }
      } else {
        // 回退到原来的数据提取逻辑（兼容性保障）
        console.warn('警告: 未收到预提取数据，回退到原始数据提取逻辑')

        columnData = processingInfo.targetRows
          .map((row) => ({
            rowId: row.original.id,
            content: String(
              row.original[config.sourceColumnId as keyof UnifiedDataItem] || ''
            ),
          }))
          .filter((item) => item.content.trim().length > 0)
      }

      if (columnData.length === 0) {
        const sourceColumnName =
          processingInfo.availableColumns.find(
            (col) => col.id === config.sourceColumnId
          )?.title || config.sourceColumnId
        alert(
          `数据源列"${sourceColumnName}"在${processingInfo.processingScope === 'selected' ? '选中行' : processingInfo.processingScope === 'filtered' ? '筛选结果' : '全表'}中没有可处理的数据`
        )
        return
      }

      if (process.env.NODE_ENV === 'development') {
        const tableIds = tableData.map((row) => row.id)
        const submitIds = columnData.map((item) => item.rowId)
        const matchingSubmitIds = submitIds.filter((id) =>
          tableIds.includes(id)
        )

        console.log('DEBUG - handleAIBatchSubmit: 最终使用的数据:', {
          columnDataCount: columnData.length,
          processingScope: processingInfo.processingScope,
          sourceColumnId: config.sourceColumnId,
          targetColumnId: selectedColumnForAI.id,
          tableDataCount: tableData.length,
          submitIds: submitIds,
          tableIds: tableIds.slice(0, 5),
          matchingSubmitIdsCount: matchingSubmitIds.length,
          idMatchRatio: `${matchingSubmitIds.length}/${submitIds.length}`,
        })
      }

      // 关闭抽屉
      setShowAIDrawer(false)

      // 开始批处理
      await startBatch(
        selectedColumnForAI.id,
        columnData,
        {
          ...config,
          processingScope: processingInfo.processingScope,
        },
        (columnKey: string) => {
          // 当虚拟列创建时，添加到AI列集合并显示
          setAiColumns((prev) => new Set(Array.from(prev).concat([columnKey])))
          setColumnVisibility((prev) => ({
            ...prev,
            [columnKey]: true,
          }))

          // 🔧 修复：将AI列添加到动态列系统中，确保表格能正确显示
          const longTextTemplate = COLUMN_TEMPLATES.find(
            (t) => t.id === 'long-text'
          )
          if (longTextTemplate) {
            try {
              dynamicColumns.addColumn(longTextTemplate, {
                id: columnKey,
                title: `AI处理结果 - ${selectedColumnForAI.name}`,
                accessorKey: columnKey,
                width: 300,
                minWidth: 200,
                maxWidth: 600,
                visible: true,
                // isAIColumn: true, // 标记为AI列 - 类型中暂未定义
              })
              if (process.env.NODE_ENV === 'development') {
                console.log(`✅ AI列已添加到动态列系统: ${columnKey}`)
              }
            } catch (error) {
              console.error('添加AI列到动态列系统失败:', error)
            }
          }
        }
      )
    },
    [
      selectedColumnForAI,
      getProcessingInfo,
      getNewColumnKey,
      startBatch,
      dynamicColumns.addColumn,
    ]
  )

  const stableProcessingScope = React.useMemo(() => {
    const selectedCount = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    ).length
    if (selectedCount > 0) return 'selected'
    if (columnFilters.length > 0 || globalFilter) return 'filtered'
    return 'all'
  }, [rowSelection, columnFilters, globalFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">加载数据中...</span>
      </div>
    )
  }

  return (
    <TableStyleEnhancer>
      <div className={`space-y-4 ${className}`}>
        {/* 统一列控制器 */}
        <UnifiedColumnControl 
          dynamicColumns={dynamicColumns} 
          table={table}
          className="mb-4" 
        />

        {/* 表格工具栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex flex-col space-y-2">
            {/* 全局搜索功能已移除 - 保留状态管理但不显示UI */}
            {/* <GlobalFilter
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            /> */}
            <div className="text-xs text-gray-400">
              💡 提示：将鼠标悬停在列边界上可拖拽调节列宽
            </div>
          </div>

          <div className="flex items-center space-x-2 relative">
            {/* AI批处理状态显示 */}
            {batchState.status !== BatchStatus.IDLE && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
                {batchState.status === BatchStatus.RUNNING && (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                )}
                <span className="text-sm text-blue-700">
                  {batchState.status === BatchStatus.RUNNING &&
                    batchState.progress &&
                    `处理中: ${batchState.progress.completed}/${batchState.progress.total}`}
                  {batchState.status === BatchStatus.COMPLETED && '处理完成'}
                  {batchState.status === BatchStatus.FAILED && '处理失败'}
                </span>
                {batchState.failedItems.length > 0 && (
                  <button
                    onClick={retryFailedItems}
                    className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                  >
                    重试失败项 ({batchState.failedItems.length})
                  </button>
                )}
                <button
                  onClick={clearResults}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  清除
                </button>
              </div>
            )}

            <button
              onClick={() => setShowAdvancedFilter(true)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              高级筛选
            </button>
            {/* ColumnVisibility组件已移除 - 功能已整合到UnifiedColumnControl中 */}
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
              tableLayout: 'fixed',
            }}
          >
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative border-r border-gray-200 last:border-r-0 group"
                      style={{
                        width: header.getSize(),
                        position: 'relative',
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div
                              className={`flex items-center space-x-1 ${
                                header.column.getCanSort()
                                  ? 'cursor-pointer select-none hover:text-gray-700'
                                  : ''
                              }`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {/* 根据列类型选择渲染方式 */}
                              {shouldShowSubtitleHeader(header.column.id) &&
                              dynamicColumns.columnConfigs.find(
                                (config) => config.id === header.column.id
                              )
                                ? // 使用副标题组件渲染动态列
                                  (() => {
                                    const columnConfig =
                                      dynamicColumns.columnConfigs.find(
                                        (config) =>
                                          config.id === header.column.id
                                      )
                                    return (
                                      <ColumnHeaderWithSubtitle
                                        title={
                                          columnConfig?.title ||
                                          header.column.id
                                        }
                                        subtitle={columnConfig?.subtitle}
                                        columnId={header.column.id}
                                        onSubtitleChange={handleSubtitleChange}
                                      />
                                    )
                                  })()
                                : // 使用标准渲染方式
                                  flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                              {{
                                asc: ' 🔼',
                                desc: ' 🔽',
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>

                            {/* AI批处理按钮 */}
                            {header.column.id !== 'select' &&
                              header.column.id !== 'index' &&
                              header.column.id !== 'actions' &&
                              !header.column.id.includes('_ai_') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedColumnForAI({
                                      id:
                                        (header.column.columnDef as any)
                                          ?.accessorKey ||
                                        header.column.id,
                                      name:
                                        typeof header.column.columnDef
                                          .header === 'string'
                                          ? header.column.columnDef.header
                                          : header.column.id,
                                    })
                                    setShowAIDrawer(true)
                                  }}
                                  className="p-1 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                  title="AI批处理此列"
                                >
                                  <Zap className="w-3 h-3" />
                                </button>
                              )}
                          </div>
                          {/* 列级搜索过滤器已移除 - 保留逻辑但不显示UI */}
                          {/* {header.column.getCanFilter() ? (
                            <Filter column={header.column} table={table} />
                          ) : null} */}
                        </div>
                      )}
                      {/* 列宽调节手柄 */}
                      {header.column.getCanResize() && (
                        <div
                          {...{
                            onMouseDown: header.getResizeHandler(),
                            onTouchStart: header.getResizeHandler(),
                            className: `absolute top-0 right-0 h-full w-4 cursor-col-resize group ${
                              header.column.getIsResizing()
                                ? 'bg-blue-300'
                                : 'hover:bg-blue-100'
                            }`,
                            style: {
                              marginRight: '-8px',
                              zIndex: 20,
                              userSelect: 'none',
                              transform: header.column.getIsResizing()
                                ? 'scaleX(1.2)'
                                : 'scaleX(1)',
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
                              header.column.getIsResizing()
                                ? 'opacity-100 bg-blue-600'
                                : ''
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
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

        {/* AI批处理抽屉 */}
        {selectedColumnForAI && (
          <AIPromptDrawer
            isOpen={showAIDrawer}
            onClose={() => {
              setShowAIDrawer(false)
              setSelectedColumnForAI(null)
            }}
            onSubmit={handleAIBatchSubmit}
            columnId={selectedColumnForAI.id}
            columnName={selectedColumnForAI.name}
            // 使用稳定化的props，避免无限重渲染
            availableColumns={stableProcessingInfo.availableColumns}
            selectedRows={stableProcessingInfo.selectedRowsData}
            // 保持现有兼容属性
            dataCount={stableProcessingInfo.dataCount}
            sampleData={[]} // 空数组，将被新的预览逻辑替代
            selectedRowCount={stableProcessingInfo.selectedRowCount}
            filteredRowCount={stableProcessingInfo.filteredRowCount}
            totalRowCount={stableProcessingInfo.totalRowCount}
            processingScope={stableProcessingScope}
          />
        )}

        {/* 字幕编辑弹窗 */}
        <SubtitleEditDialog
          isOpen={subtitleEditDialog.isOpen}
          onClose={handleCloseSubtitleEdit}
          title="字幕"
          value={subtitleEditDialog.currentSubtitles}
          onSave={handleSaveSubtitleEdit}
        />
      </div>
    </TableStyleEnhancer>
  )
}
