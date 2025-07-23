// 表格相关类型定义

import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  RowSelectionState,
  ColumnOrderState,
  ColumnPinningState,
  GroupingState,
  ColumnDef,
  Table,
  Row,
  RowData,
} from '@tanstack/react-table'
import { YouTubeVideo } from './youtube'

// 扩展TanStack Table类型以支持自定义meta
declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void
    addEditHistory: (rowIndex: number, field: string, oldValue: string, newValue: string) => void
  }
  
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select'
    editable?: boolean
    className?: string
  }
}

// 表格状态管理
export interface TableState {
  data: YouTubeVideo[]
  selectedRows: RowSelectionState
  editingCell: EditingCell | null
  filters: ColumnFiltersState
  sorting: SortingState
  columnVisibility: VisibilityState
  columnOrder: ColumnOrderState
  columnPinning: ColumnPinningState
  grouping: GroupingState
  globalFilter: string
  pagination: {
    pageIndex: number
    pageSize: number
  }
}

// 编辑相关类型
export interface EditingCell {
  rowIndex: number
  columnId: string
  value: string
}

export interface CellEditEvent {
  rowIndex: number
  columnId: string
  oldValue: unknown
  newValue: unknown
  row: Row<YouTubeVideo>
}

// 列配置类型
export interface YouTubeColumnConfig {
  id: keyof YouTubeVideo
  header: string
  accessorKey: keyof YouTubeVideo
  editable?: boolean
  filterable?: boolean
  sortable?: boolean
  width?: number
  minWidth?: number
  maxWidth?: number
  filterVariant?: 'text' | 'range' | 'select'
  formatter?: (value: any) => string
  validator?: (value: any) => boolean | string
}

// 预定义的列配置
export const DEFAULT_YOUTUBE_COLUMNS: YouTubeColumnConfig[] = [
  {
    id: 'title',
    header: '视频标题',
    accessorKey: 'title',
    editable: true,
    filterable: true,
    sortable: true,
    minWidth: 200,
  },
  {
    id: 'channelTitle',
    header: '频道名称',
    accessorKey: 'channelTitle',
    filterable: true,
    sortable: true,
    width: 150,
  },
  {
    id: 'publishedAt',
    header: '发布时间',
    accessorKey: 'publishedAt',
    sortable: true,
    width: 120,
    formatter: (value: string) => new Date(value).toLocaleDateString('zh-CN'),
  },
  {
    id: 'viewCount',
    header: '播放量',
    accessorKey: 'viewCount',
    sortable: true,
    filterable: true,
    filterVariant: 'range',
    width: 100,
    formatter: (value: number) => value.toLocaleString(),
  },
  {
    id: 'likeCount',
    header: '点赞量',
    accessorKey: 'likeCount',
    sortable: true,
    filterable: true,
    filterVariant: 'range',
    width: 100,
    formatter: (value: number) => value.toLocaleString(),
  },
  {
    id: 'duration',
    header: '时长',
    accessorKey: 'duration',
    sortable: true,
    width: 80,
  },
  {
    id: 'description',
    header: '描述',
    accessorKey: 'description',
    editable: true,
    filterable: true,
    minWidth: 200,
  },
  {
    id: 'enhancedTitle',
    header: 'AI优化标题',
    accessorKey: 'enhancedTitle',
    editable: true,
    filterable: true,
    minWidth: 200,
  },
  {
    id: 'summarizedDescription',
    header: 'AI摘要',
    accessorKey: 'summarizedDescription',
    editable: true,
    filterable: true,
    minWidth: 200,
  },
]

// 筛选器相关类型
export interface FilterOption {
  label: string
  value: string | number
  count?: number
}

export interface FilterState {
  column: string
  type: 'text' | 'range' | 'select'
  value: string | number | [number, number] | string[]
}

// 表格操作类型
export type TableAction = 
  | 'select-all'
  | 'select-none'
  | 'delete-selected'
  | 'export-selected'
  | 'ai-enhance-selected'
  | 'reset-filters'
  | 'reset-sorting'
  | 'toggle-column'

export interface TableActionEvent {
  action: TableAction
  selectedRows?: Row<YouTubeVideo>[]
  data?: any
}

// 工具函数类型
export type TableUtilFunction<T = any> = (table: Table<YouTubeVideo>) => T

// 自定义Hook类型
export interface UseYouTubeTableReturn {
  table: Table<YouTubeVideo>
  state: TableState
  actions: {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void
    setSelectedRows: (selection: RowSelectionState) => void
    setGlobalFilter: (filter: string) => void
    resetTable: () => void
    exportData: (format?: 'csv' | 'excel' | 'json') => void
  }
}

// 虚拟化相关类型（用于大数据集）
export interface VirtualizationConfig {
  enabled: boolean
  rowHeight: number
  overscan: number
  estimateSize?: (index: number) => number
}

// 表格性能配置
export interface TablePerformanceConfig {
  virtualization?: VirtualizationConfig
  debounceMs?: number
  memoizeColumns?: boolean
  lazyLoading?: boolean
}

// 表格主题配置
export interface TableTheme {
  headerBg: string
  headerText: string
  rowBg: string
  rowHover: string
  border: string
  selectedRow: string
  editingCell: string
}

export const DEFAULT_TABLE_THEME: TableTheme = {
  headerBg: 'bg-gray-50',
  headerText: 'text-gray-900',
  rowBg: 'bg-white',
  rowHover: 'hover:bg-gray-50',
  border: 'border-gray-200',
  selectedRow: 'bg-blue-50',
  editingCell: 'bg-yellow-50',
}