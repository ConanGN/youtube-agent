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

// ==================== 新增：列配置系统类型定义 ====================

// 数据类型枚举
export type ColumnDataType = 
  | 'text'          // 文本
  | 'number'        // 数值
  | 'date'          // 日期
  | 'url'           // URL链接
  | 'image'         // 图片URL
  | 'longtext'      // 长文本
  | 'boolean'       // 布尔值
  | 'enum'          // 枚举值
  | 'json'          // JSON数据
  | 'custom'        // 自定义类型

// 验证规则接口
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom' | 'url' | 'email' | 'date'
  value?: any
  message: string
  validator?: (value: any) => boolean | string
}

// 格式化器接口
export interface ColumnFormatter {
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'compact' | 'boolean' | 'custom'
  options?: {
    locale?: string
    currency?: string
    maximumFractionDigits?: number
    minimumFractionDigits?: number
    dateStyle?: 'full' | 'long' | 'medium' | 'short'
    timeStyle?: 'full' | 'long' | 'medium' | 'short'
    trueText?: string
    falseText?: string
    [key: string]: any
  }
  customFormatter?: (value: any) => string
}

// 编辑器配置接口
export interface EditorConfig {
  type: 'input' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox' | 'image' | 'custom'
  placeholder?: string
  options?: Array<{ label: string; value: any }>
  rows?: number // 用于textarea
  min?: number // 用于number
  max?: number // 用于number
  step?: number // 用于number
  multiple?: boolean // 用于select
  customEditor?: React.ComponentType<any>
}

// 列功能特性配置
export interface ColumnFeatures {
  editable: boolean           // 可编辑
  sortable: boolean          // 可排序
  filterable: boolean        // 可筛选
  resizable: boolean         // 可调整大小
  pinnable: boolean          // 可固定
  groupable: boolean         // 可分组
  aiProcessable: boolean     // 可AI处理
  exportable: boolean        // 可导出
  searchable: boolean        // 可搜索
}

// 完整的列配置接口
export interface DynamicColumnConfig {
  // 基本信息
  id: string
  title: string
  subtitle?: string // 副标题 - 可选字段，用于为列提供额外的描述信息 
  dataType: ColumnDataType
  accessorKey: string
  
  // 系统列标识（系统列不可删除，但功能可配置）
  isSystemColumn: boolean
  isUserColumn: boolean // 用户自定义列
  
  // 显示配置
  width?: number
  minWidth?: number
  maxWidth?: number
  visible: boolean
  position: number // 列顺序
  
  // 功能配置
  features: ColumnFeatures
  
  // 编辑器配置
  editor?: EditorConfig
  
  // 验证规则
  validationRules?: ValidationRule[]
  
  // 格式化器
  formatter?: ColumnFormatter
  
  // 筛选器配置
  filterVariant?: 'text' | 'range' | 'select' | 'date' | 'boolean'
  filterOptions?: Array<{ label: string; value: any }>
  
  // 样式配置
  className?: string
  headerClassName?: string
  cellClassName?: string
  
  // 默认值（用于新行）
  defaultValue?: any
  
  // 自定义设置
  customSettings?: Record<string, any>
  
  // 创建信息
  createdAt: string
  updatedAt: string
  createdBy?: string // 用户ID或系统标识
}

// 列配置管理器接口
export interface ColumnConfigManager {
  // 获取所有配置
  getAllConfigs(): DynamicColumnConfig[]
  
  // 获取可见配置
  getVisibleConfigs(): DynamicColumnConfig[]
  
  // 根据ID获取配置
  getConfig(columnId: string): DynamicColumnConfig | undefined
  
  // 添加新列配置
  addColumn(config: Omit<DynamicColumnConfig, 'id' | 'createdAt' | 'updatedAt'>): string
  
  // 更新列配置
  updateColumn(columnId: string, updates: Partial<DynamicColumnConfig>): boolean
  
  // 删除列配置（仅用户列可删除）
  removeColumn(columnId: string): boolean
  
  // 重新排序列
  reorderColumns(columnIds: string[]): void
  
  // 重置为默认配置
  resetToDefaults(): void
  
  // 导入/导出配置
  exportConfigs(): string
  importConfigs(configJson: string): boolean
  
  // 验证配置
  validateConfig(config: Partial<DynamicColumnConfig>): { valid: boolean; errors: string[] }
}

// 列配置模板
export interface ColumnTemplate {
  id: string
  name: string
  description: string
  category: 'text' | 'number' | 'date' | 'media' | 'social' | 'custom'
  config: Partial<DynamicColumnConfig>
  previewData?: any[]
}

// 预定义的列模板
export const COLUMN_TEMPLATES: ColumnTemplate[] = [
  {
    id: 'basic-text',
    name: '基础文本',
    description: '简单的文本列，支持编辑和搜索',
    category: 'text',
    config: {
      dataType: 'text',
      features: {
        editable: true,
        sortable: true,
        filterable: true,
        resizable: true,
        pinnable: false,
        groupable: true,
        aiProcessable: true,
        exportable: true,
        searchable: true,
      },
      editor: { type: 'input' },
      filterVariant: 'text',
    }
  },
  {
    id: 'long-text',
    name: '长文本',
    description: '支持多行文本编辑的列',
    category: 'text',
    config: {
      dataType: 'longtext',
      features: {
        editable: true,
        sortable: false,
        filterable: true,
        resizable: true,
        pinnable: false,
        groupable: false,
        aiProcessable: true,
        exportable: true,
        searchable: true,
      },
      editor: { type: 'textarea', rows: 4 },
      filterVariant: 'text',
      minWidth: 200,
    }
  },
  {
    id: 'number',
    name: '数值',
    description: '数值类型列，支持范围筛选和格式化显示',
    category: 'number',
    config: {
      dataType: 'number',
      features: {
        editable: true,
        sortable: true,
        filterable: true,
        resizable: true,
        pinnable: false,
        groupable: true,
        aiProcessable: false,
        exportable: true,
        searchable: false,
      },
      editor: { type: 'number' },
      formatter: { type: 'number' },
      filterVariant: 'range',
      width: 120,
    }
  },
  {
    id: 'image',
    name: '图片',
    description: '图片URL列，支持预览和编辑',
    category: 'media',
    config: {
      dataType: 'image',
      features: {
        editable: true,
        sortable: false,
        filterable: false,
        resizable: true,
        pinnable: true,
        groupable: false,
        aiProcessable: false,
        exportable: true,
        searchable: false,
      },
      editor: { type: 'image' },
      validationRules: [
        { type: 'url', message: '请输入有效的图片URL' }
      ],
      width: 100,
    }
  },
  {
    id: 'date',
    name: '日期',
    description: '日期类型列，支持日期格式化和筛选',
    category: 'date',
    config: {
      dataType: 'date',
      features: {
        editable: true,
        sortable: true,
        filterable: true,
        resizable: true,
        pinnable: false,
        groupable: true,
        aiProcessable: false,
        exportable: true,
        searchable: false,
      },
      editor: { type: 'date' },
      formatter: { type: 'date', options: { dateStyle: 'short' } },
      filterVariant: 'date',
      width: 120,
    }
  },
]

// 功能模块抽象接口
export interface FeatureModule<TProps = any, TValue = any> {
  id: string
  name: string
  description: string
  
  // 渲染函数
  render: (props: TProps) => React.ReactElement
  
  // 验证函数
  validate?: (value: TValue) => boolean | string
  
  // 格式化函数
  format?: (value: TValue) => string
  
  // 解析函数（用于导入数据时）
  parse?: (input: string) => TValue
  
  // 配置组件（用于设置界面）
  ConfigComponent?: React.ComponentType<{
    config: any
    onChange: (config: any) => void
  }>
}

// 扩展表格状态以支持动态列配置
export interface ExtendedTableState extends TableState {
  columnConfigs: DynamicColumnConfig[]
  customColumns: Set<string> // 用户自定义的列ID集合
  columnTemplates: ColumnTemplate[]
  activeTemplate?: string
}

// 列管理操作类型
export type ColumnManagementAction =
  | 'add-column'
  | 'remove-column'
  | 'update-column'
  | 'reorder-columns'
  | 'toggle-column-visibility'
  | 'apply-template'
  | 'reset-columns'
  | 'export-config'
  | 'import-config'

export interface ColumnManagementEvent {
  action: ColumnManagementAction
  columnId?: string
  config?: Partial<DynamicColumnConfig>
  data?: any
}