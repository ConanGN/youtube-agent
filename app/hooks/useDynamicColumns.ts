'use client'

// 动态列管理Hook
// 提供完整的列配置管理功能

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { 
  DynamicColumnConfig, 
  ColumnTemplate, 
  ColumnManagementAction,
  ColumnManagementEvent,
  UnifiedDataItem,
  COLUMN_TEMPLATES 
} from '@/types'
import { DynamicColumnConfigManager } from '@/lib/column-features/ColumnConfigManager'
import { FeatureModuleManager, inferColumnConfig } from '@/lib/column-features'

// Hook返回类型
export interface UseDynamicColumnsReturn {
  // 配置管理
  columnConfigs: DynamicColumnConfig[]
  visibleConfigs: DynamicColumnConfig[]
  configManager: DynamicColumnConfigManager
  
  // TanStack Table列定义
  tableColumns: ColumnDef<UnifiedDataItem>[]
  
  // 操作方法
  addColumn: (template: ColumnTemplate, overrides?: Partial<DynamicColumnConfig>) => string
  removeColumn: (columnId: string) => boolean
  updateColumn: (columnId: string, updates: Partial<DynamicColumnConfig>) => boolean
  reorderColumns: (columnIds: string[]) => void
  toggleColumnVisibility: (columnId: string) => void
  
  // 模板管理
  templates: ColumnTemplate[]
  createFromTemplate: (templateId: string, overrides?: Partial<DynamicColumnConfig>) => string
  
  // 批量操作
  batchUpdate: (updates: Array<{ id: string; config: Partial<DynamicColumnConfig> }>) => boolean
  resetToDefaults: () => void
  
  // 导入导出
  exportConfig: () => string
  importConfig: (configJson: string) => boolean
  
  // 搜索和筛选
  searchColumns: (query: string) => DynamicColumnConfig[]
  filterByType: (dataType: string) => DynamicColumnConfig[]
  
  // 统计信息
  stats: {
    total: number
    system: number
    user: number
    visible: number
    hidden: number
  }
  
  // 事件处理
  handleColumnEvent: (event: ColumnManagementEvent) => void
}

// Hook配置选项
export interface UseDynamicColumnsOptions {
  initialData?: UnifiedDataItem[]
  autoInferColumns?: boolean
  onColumnChange?: (configs: DynamicColumnConfig[]) => void
  onError?: (error: Error) => void
}

export function useDynamicColumns(options: UseDynamicColumnsOptions = {}): UseDynamicColumnsReturn {
  const {
    initialData = [],
    autoInferColumns = true,
    onColumnChange,
    onError
  } = options

  // 配置管理器实例
  const [configManager] = useState(() => new DynamicColumnConfigManager())
  
  // 列配置状态
  const [columnConfigs, setColumnConfigs] = useState<DynamicColumnConfig[]>(() => 
    configManager.getAllConfigs()
  )
  
  // 模板状态
  const [templates] = useState<ColumnTemplate[]>(() => COLUMN_TEMPLATES)
  
  // 错误处理
  const handleError = useCallback((error: Error) => {
    console.error('Dynamic columns error:', error)
    onError?.(error)
  }, [onError])
  
  // 更新配置状态
  const updateConfigsState = useCallback(() => {
    const newConfigs = configManager.getAllConfigs()
    setColumnConfigs(newConfigs)
    onColumnChange?.(newConfigs)
  }, [configManager, onColumnChange])
  
  // 可见配置
  const visibleConfigs = useMemo(() => 
    columnConfigs.filter(config => config.visible)
  , [columnConfigs])
  
  // 添加列
  const addColumn = useCallback((template: ColumnTemplate, overrides: Partial<DynamicColumnConfig> = {}) => {
    try {
      const columnId = configManager.createColumnFromTemplate(template.id, overrides)
      updateConfigsState()
      return columnId
    } catch (error) {
      handleError(error as Error)
      throw error
    }
  }, [configManager, updateConfigsState, handleError])
  
  // 删除列
  const removeColumn = useCallback((columnId: string) => {
    try {
      const success = configManager.removeColumn(columnId)
      if (success) {
        updateConfigsState()
      }
      return success
    } catch (error) {
      handleError(error as Error)
      return false
    }
  }, [configManager, updateConfigsState, handleError])
  
  // 更新列
  const updateColumn = useCallback((columnId: string, updates: Partial<DynamicColumnConfig>) => {
    try {
      const success = configManager.updateColumn(columnId, updates)
      if (success) {
        updateConfigsState()
      }
      return success
    } catch (error) {
      handleError(error as Error)
      return false
    }
  }, [configManager, updateConfigsState, handleError])
  
  // 重新排序
  const reorderColumns = useCallback((columnIds: string[]) => {
    try {
      configManager.reorderColumns(columnIds)
      updateConfigsState()
    } catch (error) {
      handleError(error as Error)
    }
  }, [configManager, updateConfigsState, handleError])
  
  // 切换列可见性
  const toggleColumnVisibility = useCallback((columnId: string) => {
    const config = configManager.getConfig(columnId)
    if (config) {
      updateColumn(columnId, { visible: !config.visible })
    }
  }, [configManager, updateColumn])
  
  // 从模板创建
  const createFromTemplate = useCallback((templateId: string, overrides: Partial<DynamicColumnConfig> = {}) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) {
      throw new Error(`模板不存在: ${templateId}`)
    }
    return addColumn(template, overrides)
  }, [templates, addColumn])
  
  // 批量更新
  const batchUpdate = useCallback((updates: Array<{ id: string; config: Partial<DynamicColumnConfig> }>) => {
    try {
      const success = configManager.batchUpdateColumns(updates)
      if (success) {
        updateConfigsState()
      }
      return success
    } catch (error) {
      handleError(error as Error)
      return false
    }
  }, [configManager, updateConfigsState, handleError])
  
  // 重置为默认配置
  const resetToDefaults = useCallback(() => {
    try {
      configManager.resetToDefaults()
      updateConfigsState()
    } catch (error) {
      handleError(error as Error)
    }
  }, [configManager, updateConfigsState, handleError])
  
  // 导出配置
  const exportConfig = useCallback(() => {
    return configManager.exportConfigs()
  }, [configManager])
  
  // 导入配置
  const importConfig = useCallback((configJson: string) => {
    try {
      const success = configManager.importConfigs(configJson)
      if (success) {
        updateConfigsState()
      }
      return success
    } catch (error) {
      handleError(error as Error)
      return false
    }
  }, [configManager, updateConfigsState, handleError])
  
  // 搜索列
  const searchColumns = useCallback((query: string) => {
    return configManager.searchColumns(query)
  }, [configManager])
  
  // 按类型筛选
  const filterByType = useCallback((dataType: string) => {
    return columnConfigs.filter(config => config.dataType === dataType)
  }, [columnConfigs])
  
  // 统计信息
  const stats = useMemo(() => {
    const allStats = configManager.getStats()
    return {
      total: allStats.total,
      system: allStats.system,
      user: allStats.user,
      visible: allStats.visible,
      hidden: allStats.hidden,
    }
  }, [configManager, columnConfigs])
  
  // 生成TanStack Table列定义
  const tableColumns = useMemo(() => {
    return visibleConfigs.map((config): ColumnDef<UnifiedDataItem> => {
      // 基础列定义
      const columnDef: ColumnDef<UnifiedDataItem> = {
        id: config.id,
        accessorKey: config.accessorKey as keyof UnifiedDataItem,
        header: config.title,
        size: config.width,
        minSize: config.minWidth || 50,
        maxSize: config.maxWidth || 800,
        enableSorting: config.features.sortable,
        enableColumnFilter: config.features.filterable,
        enableResizing: config.features.resizable,
        enablePinning: config.features.pinnable,
        enableGrouping: config.features.groupable,
        enableHiding: !config.isSystemColumn, // 系统列不能隐藏
        
        // 单元格渲染器
        cell: ({ getValue, row, column, table }) => {
          const value = getValue()
          
          // 如果有自定义渲染器，使用自定义渲染器
          const customRenderer = FeatureModuleManager.createCellRenderer(config)
          if (customRenderer) {
            return React.createElement(customRenderer, {
              value,
              config,
              row: row.original,
              onChange: (newValue: any) => {
                // 更新数据的逻辑
                table.options.meta?.updateData(row.index, column.id, newValue)
              }
            })
          }
          
          // 默认显示格式化后的值
          return FeatureModuleManager.formatColumnValue(value, config)
        },
        
        // 筛选器元数据
        meta: {
          filterVariant: config.filterVariant,
          className: config.className,
          editable: config.features.editable,
        }
      }
      
      // 特殊列处理
      if (config.id === 'system_select') {
        // 选择列特殊处理
        columnDef.header = ({ table }) => (
          React.createElement('input', {
            type: 'checkbox',
            checked: table.getIsAllRowsSelected(),
            onChange: table.getToggleAllRowsSelectedHandler(),
          })
        )
        columnDef.cell = ({ row }) => (
          React.createElement('input', {
            type: 'checkbox',
            checked: row.getIsSelected(),
            onChange: row.getToggleSelectedHandler(),
          })
        )
      } else if (config.id === 'system_index') {
        // 序号列特殊处理
        columnDef.cell = ({ row }) => (
          React.createElement('div', {
            className: 'text-center text-gray-600 font-medium'
          }, row.index + 1)
        )
      } else if (config.id === 'system_actions') {
        // 操作列特殊处理
        columnDef.cell = ({ row }) => (
          React.createElement('div', {
            className: 'flex space-x-1'
          }, [
            // 根据数据类型显示不同的操作按钮
            row.original.videoUrl ? 
              React.createElement('a', {
                key: 'view',
                href: row.original.videoUrl,
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200'
              }, '查看') :
              React.createElement('button', {
                key: 'copy',
                onClick: () => {
                  const originalData = (row.original as any).originalData
                  if (originalData) {
                    navigator.clipboard.writeText(originalData)
                  }
                },
                className: 'px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200'
              }, '复制数据')
          ])
        )
      }
      
      return columnDef
    })
  }, [visibleConfigs])
  
  // 事件处理器
  const handleColumnEvent = useCallback((event: ColumnManagementEvent) => {
    try {
      switch (event.action) {
        case 'add-column':
          if (event.config) {
            configManager.addColumn(event.config as Omit<DynamicColumnConfig, 'id' | 'createdAt' | 'updatedAt'>)
          }
          break
          
        case 'remove-column':
          if (event.columnId) {
            configManager.removeColumn(event.columnId)
          }
          break
          
        case 'update-column':
          if (event.columnId && event.config) {
            configManager.updateColumn(event.columnId, event.config)
          }
          break
          
        case 'reorder-columns':
          if (event.data && Array.isArray(event.data)) {
            configManager.reorderColumns(event.data)
          }
          break
          
        case 'toggle-column-visibility':
          if (event.columnId) {
            toggleColumnVisibility(event.columnId)
          }
          break
          
        case 'reset-columns':
          configManager.resetToDefaults()
          break
          
        case 'export-config':
          return configManager.exportConfigs()
          
        case 'import-config':
          if (event.data && typeof event.data === 'string') {
            configManager.importConfigs(event.data)
          }
          break
          
        default:
          console.warn('未知的列管理操作:', event.action)
      }
      
      updateConfigsState()
    } catch (error) {
      handleError(error as Error)
    }
  }, [configManager, toggleColumnVisibility, updateConfigsState, handleError])
  
  // 自动推断列配置（当初始数据变化时）
  useEffect(() => {
    if (autoInferColumns && initialData.length > 0 && columnConfigs.length === 0) {
      try {
        // 从数据推断列配置
        const dataKeys = Object.keys(initialData[0])
        const inferredConfigs: Array<Omit<DynamicColumnConfig, 'id' | 'createdAt' | 'updatedAt'>>= []
        
        dataKeys.forEach((key, index) => {
          if (key === 'id') return // 跳过ID字段
          
          const inferredConfig = inferColumnConfig(initialData, key)
          const config: Omit<DynamicColumnConfig, 'id' | 'createdAt' | 'updatedAt'> = {
            title: key.charAt(0).toUpperCase() + key.slice(1), // 首字母大写
            accessorKey: key,
            isSystemColumn: false,
            isUserColumn: true,
            visible: true,
            position: index,
            ...inferredConfig,
          }
          
          inferredConfigs.push(config)
        })
        
        // 批量添加推断的配置
        inferredConfigs.forEach(config => {
          configManager.addColumn(config)
        })
        
        updateConfigsState()
      } catch (error) {
        handleError(error as Error)
      }
    }
  }, [initialData, autoInferColumns, columnConfigs.length, configManager, updateConfigsState, handleError])
  
  return {
    // 配置管理
    columnConfigs,
    visibleConfigs,
    configManager,
    
    // TanStack Table列定义
    tableColumns,
    
    // 操作方法
    addColumn,
    removeColumn,
    updateColumn,
    reorderColumns,
    toggleColumnVisibility,
    
    // 模板管理
    templates,
    createFromTemplate,
    
    // 批量操作
    batchUpdate,
    resetToDefaults,
    
    // 导入导出
    exportConfig,
    importConfig,
    
    // 搜索和筛选
    searchColumns,
    filterByType,
    
    // 统计信息
    stats,
    
    // 事件处理
    handleColumnEvent,
  }
}