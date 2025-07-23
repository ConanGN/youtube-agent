// 表格工具函数
// 提供TanStack Table相关的工具函数和数据处理

import { ColumnDef, RowData, Table, Column } from '@tanstack/react-table'
import { YouTubeVideo } from '@/types'

// 扩展TanStack Table的类型
declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    updateData?: (rowIndex: number, columnId: string, value: unknown) => void
    addEditHistory?: (rowIndex: number, field: string, oldValue: string, newValue: string) => void
  }
  
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select' | 'date'
    isAI?: boolean
    isEditable?: boolean
    formatType?: 'number' | 'date' | 'currency' | 'percent' | 'duration'
  }
}

// 表格列配置工具
export class TableColumnUtils {
  // 获取列的显示名称
  static getColumnDisplayName(columnId: string): string {
    const columnNames: Record<string, string> = {
      id: 'ID',
      title: '标题',
      description: '描述',
      thumbnail: '缩略图',
      publishedAt: '发布时间',
      viewCount: '播放量',
      likeCount: '点赞数',
      commentCount: '评论数',
      duration: '时长',
      channelTitle: '频道名称',
      channelId: '频道ID',
      videoUrl: '视频链接',
      tags: '标签',
      categoryId: '分类',
      enhancedTitle: 'AI优化标题',
      summarizedDescription: 'AI摘要',
      translatedTitle: '翻译标题',
      isEdited: '已编辑'
    }
    return columnNames[columnId] || columnId
  }

  // 获取列的过滤器类型
  static getColumnFilterType(columnId: string): 'text' | 'range' | 'select' | 'date' {
    const filterTypes: Record<string, 'text' | 'range' | 'select' | 'date'> = {
      title: 'text',
      description: 'text',
      enhancedTitle: 'text',
      summarizedDescription: 'text',
      translatedTitle: 'text',
      channelTitle: 'select',
      categoryId: 'select',
      viewCount: 'range',
      likeCount: 'range',
      commentCount: 'range',
      publishedAt: 'date',
      isEdited: 'select'
    }
    return filterTypes[columnId] || 'text'
  }

  // 检查列是否为AI相关
  static isAIColumn(columnId: string): boolean {
    const aiColumns = ['enhancedTitle', 'summarizedDescription', 'translatedTitle']
    return aiColumns.includes(columnId)
  }

  // 检查列是否可编辑
  static isEditableColumn(columnId: string): boolean {
    const editableColumns = ['title', 'description', 'enhancedTitle', 'summarizedDescription', 'translatedTitle', 'tags']
    return editableColumns.includes(columnId)
  }

  // 获取列的数据格式类型
  static getColumnFormatType(columnId: string): 'number' | 'date' | 'currency' | 'percent' | 'duration' | 'text' {
    const formatTypes: Record<string, 'number' | 'date' | 'currency' | 'percent' | 'duration' | 'text'> = {
      viewCount: 'number',
      likeCount: 'number',
      commentCount: 'number',
      publishedAt: 'date',
      duration: 'duration'
    }
    return formatTypes[columnId] || 'text'
  }
}

// 数据格式化工具
export class TableDataFormatter {
  // 格式化数字显示
  static formatNumber(value: number, type: 'compact' | 'full' | 'currency' | 'percent' = 'compact'): string {
    if (typeof value !== 'number' || isNaN(value)) return '0'

    switch (type) {
      case 'compact':
        if (value >= 1_000_000_000) {
          return `${(value / 1_000_000_000).toFixed(1)}B`
        } else if (value >= 1_000_000) {
          return `${(value / 1_000_000).toFixed(1)}M`
        } else if (value >= 1_000) {
          return `${(value / 1_000).toFixed(1)}K`
        }
        return value.toString()
      
      case 'full':
        return value.toLocaleString('zh-CN')
      
      case 'currency':
        return new Intl.NumberFormat('zh-CN', {
          style: 'currency',
          currency: 'CNY'
        }).format(value)
      
      case 'percent':
        return new Intl.NumberFormat('zh-CN', {
          style: 'percent',
          minimumFractionDigits: 1
        }).format(value)
      
      default:
        return value.toString()
    }
  }

  // 格式化日期显示
  static formatDate(value: string | Date, format: 'short' | 'medium' | 'long' | 'relative' = 'medium'): string {
    if (!value) return ''
    
    const date = typeof value === 'string' ? new Date(value) : value
    if (isNaN(date.getTime())) return ''

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    switch (format) {
      case 'short':
        return date.toLocaleDateString('zh-CN', {
          year: '2-digit',
          month: 'numeric',
          day: 'numeric'
        })
      
      case 'medium':
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      
      case 'long':
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      
      case 'relative':
        if (diffDays === 0) {
          return '今天'
        } else if (diffDays === 1) {
          return '昨天'
        } else if (diffDays < 7) {
          return `${diffDays}天前`
        } else if (diffDays < 30) {
          return `${Math.floor(diffDays / 7)}周前`
        } else if (diffDays < 365) {
          return `${Math.floor(diffDays / 30)}个月前`
        } else {
          return `${Math.floor(diffDays / 365)}年前`
        }
      
      default:
        return date.toLocaleDateString('zh-CN')
    }
  }

  // 格式化时长显示
  static formatDuration(duration: string): string {
    if (!duration) return ''
    
    // 如果已经是格式化的时长，直接返回
    if (/^\d+:\d{2}(:\d{2})?$/.test(duration)) {
      return duration
    }

    // ISO 8601 duration格式转换
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return duration

    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  // 格式化文本长度
  static truncateText(text: string, maxLength: number = 100, suffix: string = '...'): string {
    if (!text || text.length <= maxLength) return text || ''
    return text.substring(0, maxLength - suffix.length) + suffix
  }

  // 格式化标签数组
  static formatTags(tags: string[] | string): string {
    if (!tags) return ''
    if (typeof tags === 'string') return tags
    if (Array.isArray(tags)) return tags.join(', ')
    return ''
  }
}

// 表格筛选工具
export class TableFilterUtils {
  // 全局搜索筛选
  static globalFilter(row: any, columnId: string, filterValue: string): boolean {
    const value = row.getValue(columnId)
    if (value == null) return false
    
    const searchValue = filterValue.toLowerCase()
    const cellValue = String(value).toLowerCase()
    
    return cellValue.includes(searchValue)
  }

  // 文本筛选
  static textFilter(row: any, columnId: string, filterValue: string): boolean {
    const value = row.getValue(columnId)
    if (value == null) return false
    
    const searchValue = filterValue.toLowerCase()
    const cellValue = String(value).toLowerCase()
    
    return cellValue.includes(searchValue)
  }

  // 数字范围筛选
  static rangeFilter(row: any, columnId: string, filterValue: [number, number]): boolean {
    const value = row.getValue(columnId)
    if (value == null) return false
    
    const numValue = Number(value)
    if (isNaN(numValue)) return false
    
    const [min, max] = filterValue
    return numValue >= min && numValue <= max
  }

  // 选择筛选
  static selectFilter(row: any, columnId: string, filterValue: string | string[]): boolean {
    const value = row.getValue(columnId)
    if (value == null) return false
    
    const cellValue = String(value)
    
    if (Array.isArray(filterValue)) {
      return filterValue.includes(cellValue)
    } else {
      return cellValue === filterValue
    }
  }

  // 日期范围筛选
  static dateFilter(row: any, columnId: string, filterValue: [Date, Date]): boolean {
    const value = row.getValue(columnId)
    if (value == null) return false
    
    const date = new Date(value as string)
    if (isNaN(date.getTime())) return false
    
    const [startDate, endDate] = filterValue
    return date >= startDate && date <= endDate
  }

  // 获取列的唯一值（用于选择筛选器）
  static getUniqueValues<T>(data: T[], accessor: keyof T): string[] {
    const values = data.map(item => String(item[accessor] || '')).filter(Boolean)
    return Array.from(new Set(values)).sort()
  }

  // 获取数字列的范围（用于范围筛选器）
  static getNumberRange<T>(data: T[], accessor: keyof T): [number, number] {
    const values = data
      .map(item => Number(item[accessor]))
      .filter(value => !isNaN(value))
    
    if (values.length === 0) return [0, 0]
    
    return [Math.min(...values), Math.max(...values)]
  }
}

// 表格排序工具
export class TableSortUtils {
  // 自定义排序函数
  static createSortFn<T>(accessor: keyof T, type: 'string' | 'number' | 'date' = 'string') {
    return (rowA: any, rowB: any, columnId: string) => {
      const valueA = rowA.getValue(columnId)
      const valueB = rowB.getValue(columnId)

      if (valueA == null && valueB == null) return 0
      if (valueA == null) return 1
      if (valueB == null) return -1

      switch (type) {
        case 'number':
          const numA = Number(valueA)
          const numB = Number(valueB)
          return numA - numB

        case 'date':
          const dateA = new Date(valueA as string).getTime()
          const dateB = new Date(valueB as string).getTime()
          return dateA - dateB

        case 'string':
        default:
          const strA = String(valueA).toLowerCase()
          const strB = String(valueB).toLowerCase()
          return strA < strB ? -1 : strA > strB ? 1 : 0
      }
    }
  }

  // 多字段排序
  static multiSort<T>(data: T[], sortRules: Array<{ field: keyof T; order: 'asc' | 'desc'; type?: 'string' | 'number' | 'date' }>): T[] {
    return [...data].sort((a, b) => {
      for (const rule of sortRules) {
        const { field, order, type = 'string' } = rule
        const valueA = a[field]
        const valueB = b[field]

        if (valueA == null && valueB == null) continue
        if (valueA == null) return order === 'asc' ? 1 : -1
        if (valueB == null) return order === 'asc' ? -1 : 1

        let comparison = 0

        switch (type) {
          case 'number':
            comparison = Number(valueA) - Number(valueB)
            break
          case 'date':
            comparison = new Date(valueA as string).getTime() - new Date(valueB as string).getTime()
            break
          case 'string':
          default:
            const strA = String(valueA).toLowerCase()
            const strB = String(valueB).toLowerCase()
            comparison = strA < strB ? -1 : strA > strB ? 1 : 0
            break
        }

        if (comparison !== 0) {
          return order === 'asc' ? comparison : -comparison
        }
      }
      return 0
    })
  }
}

// 表格导出工具
export class TableExportUtils {
  // 准备导出数据
  static prepareExportData<T>(
    data: T[],
    columns: ColumnDef<T>[],
    options: {
      includeColumns?: string[]
      excludeColumns?: string[]
      formatValues?: boolean
    } = {}
  ): Record<string, any>[] {
    const { includeColumns, excludeColumns = [], formatValues = true } = options

    // 确定要导出的列
    const exportColumns = columns.filter(col => {
      const columnId = (col as any).accessorKey || (col as any).id
      if (!columnId) return false
      if (excludeColumns.includes(columnId)) return false
      if (includeColumns && !includeColumns.includes(columnId)) return false
      return true
    })

    return data.map((row, rowIndex) => {
      const exportRow: Record<string, any> = {}

      exportColumns.forEach(col => {
        const columnId = (col as any).accessorKey || (col as any).id
        const value = (row as any)[columnId]
        const displayName = TableColumnUtils.getColumnDisplayName(columnId)

        if (formatValues) {
          const formatType = TableColumnUtils.getColumnFormatType(columnId)
          switch (formatType) {
            case 'number':
              exportRow[displayName] = TableDataFormatter.formatNumber(value, 'full')
              break
            case 'date':
              exportRow[displayName] = TableDataFormatter.formatDate(value, 'medium')
              break
            case 'duration':
              exportRow[displayName] = TableDataFormatter.formatDuration(value)
              break
            default:
              exportRow[displayName] = value || ''
          }
        } else {
          exportRow[displayName] = value || ''
        }
      })

      return exportRow
    })
  }

  // 生成CSV内容
  static generateCSV(data: Record<string, any>[]): string {
    if (data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          const stringValue = String(value || '')
          // 处理包含逗号、引号或换行的值
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(',')
      )
    ].join('\n')

    return csvContent
  }
}

// 表格性能优化工具
export class TablePerformanceUtils {
  // 虚拟化配置
  static getVirtualizationConfig(rowCount: number) {
    return {
      enabled: rowCount > 100,
      estimateSize: () => 50, // 估计行高
      overscan: 10, // 渲染额外行数
    }
  }

  // 防抖搜索
  static createDebouncedSearch(callback: (value: string) => void, delay: number = 300) {
    let timeoutId: NodeJS.Timeout

    return (value: string) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => callback(value), delay)
    }
  }

  // 分页配置
  static getPaginationConfig(totalRows: number) {
    const pageSizes = [10, 20, 50, 100]
    const defaultPageSize = totalRows > 1000 ? 50 : totalRows > 100 ? 20 : 10

    return {
      pageSize: defaultPageSize,
      pageSizeOptions: pageSizes,
      showSizeChanger: totalRows > 20,
      showQuickJumper: totalRows > 100
    }
  }
}