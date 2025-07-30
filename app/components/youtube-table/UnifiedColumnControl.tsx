'use client'

// 统一列控制组件
// 整合ColumnManager和ColumnVisibility的功能，避免重复

import React, { useState } from 'react'
import { Plus, Eye, EyeOff, X, Search, Download, Upload, RotateCcw } from 'lucide-react'
import { Table } from '@tanstack/react-table'
import { 
  DynamicColumnConfig, 
  ColumnTemplate, 
  UnifiedDataItem
} from '@/types'
import { UseDynamicColumnsReturn } from '@/hooks/useDynamicColumns'

// 统一列控制Props
export interface UnifiedColumnControlProps {
  dynamicColumns: UseDynamicColumnsReturn
  table: Table<UnifiedDataItem>
  className?: string
}

// 主要统一列控制组件
export function UnifiedColumnControl({ 
  dynamicColumns, 
  table, 
  className = '' 
}: UnifiedColumnControlProps) {
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const {
    columnConfigs,
    visibleConfigs,
    stats,
    addColumn,
    removeColumn,
    toggleColumnVisibility,
    resetToDefaults,
    exportConfig,
    importConfig,
    searchColumns,
    templates,
  } = dynamicColumns

  // 处理添加列
  const handleAddColumn = (template: ColumnTemplate) => {
    try {
      const columnId = addColumn(template, {
        title: `新${template.name}列`,
        accessorKey: `custom_${Date.now()}`,
      })
      console.log(`成功添加列: ${columnId}`)
      setShowAddDropdown(false)
    } catch (error) {
      alert(`添加列失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 处理导入配置
  const handleImportConfig = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const configJson = event.target?.result as string
            const success = importConfig(configJson)
            if (success) {
              alert('配置导入成功！')
            } else {
              alert('配置导入失败，请检查文件格式')
            }
          } catch (error) {
            alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  // 处理导出配置
  const handleExportConfig = () => {
    try {
      const configJson = exportConfig()
      const blob = new Blob([configJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `table-columns-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 处理重置配置
  const handleResetConfig = () => {
    if (confirm('确定要重置所有列配置吗？这将删除所有自定义列并恢复系统默认配置。')) {
      resetToDefaults()
      alert('配置已重置为默认设置')
    }
  }

  // 筛选后的列配置
  const filteredConfigs = searchQuery 
    ? searchColumns(searchQuery)
    : columnConfigs

  // 获取表格所有列（用于显示管理）
  const allColumns = table.getAllLeafColumns()

  return (
    <div className={`unified-column-control ${className}`}>
      {/* 主要操作按钮组 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0 lg:space-x-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        {/* 左侧：核心功能按钮 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 添加列按钮 */}
          <div className="relative">
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-150"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">添加列</span>
            </button>

            {/* 添加列下拉菜单 */}
            {showAddDropdown && (
              <div className="absolute top-full left-0 z-50 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-md shadow-xl ring-1 ring-black ring-opacity-5">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">选择列模板</h3>
                  <p className="text-xs text-gray-500 mt-1">从预定义模板快速创建新列</p>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleAddColumn(template)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center text-sm">
                          {getCategoryIcon(template.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{template.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {template.category}
                            </span>
                            <span className="text-xs text-gray-400">
                              {getDataTypeDisplayName(template.config.dataType)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowAddDropdown(false)}
                    className="w-full text-sm text-gray-600 py-1 hover:text-gray-800 transition-colors duration-150"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 列显示管理按钮 */}
          <div className="relative">
            <button
              onClick={() => setShowVisibilityPanel(!showVisibilityPanel)}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-150"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">列显示</span>
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                {stats.visible}/{stats.total}
              </span>
            </button>

            {/* 列显示管理面板 */}
            {showVisibilityPanel && (
              <div className="absolute top-full right-0 z-50 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-md shadow-xl ring-1 ring-black ring-opacity-5">
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">列显示控制</h3>
                    <div className="text-xs text-gray-500">
                      显示 {stats.visible} / 共 {stats.total} 列
                    </div>
                  </div>
                  
                  {/* 全选控制 */}
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={table.getIsAllColumnsVisible()}
                      onChange={table.getToggleAllColumnsVisibilityHandler()}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">全选/取消全选</label>
                  </div>
                  
                  {/* 搜索框 */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索列..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                    />
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {/* 显示表格实际列 */}
                  {allColumns.length > 0 ? (
                    allColumns.map((column) => {
                      // 查找对应的动态列配置
                      const config = columnConfigs.find(c => c.id === column.id || c.accessorKey === column.id)
                      // 优先使用meta中的displayName（用于字幕列等硬编码系统列的中文显示）
                      const metaDisplayName = (column.columnDef.meta as any)?.displayName
                      const columnTitle = metaDisplayName ||
                        (typeof column.columnDef.header === 'string' 
                        ? column.columnDef.header 
                        : config?.title || column.id)
                      
                      return (
                        <div
                          key={column.id}
                          className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors duration-150"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={column.getIsVisible()}
                              onChange={column.getToggleVisibilityHandler()}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex items-center space-x-2">
                              <span className="text-xs">{getDataTypeIcon(config?.dataType)}</span>
                              <span className={`text-sm ${config?.isSystemColumn ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                {columnTitle}
                              </span>
                            </div>
                            
                            {config?.isSystemColumn && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                系统
                              </span>
                            )}
                          </div>
                          
                          {/* 删除按钮（仅用户列） */}
                          {config?.isUserColumn && (
                            <button
                              onClick={() => {
                                if (confirm(`确定要删除列"${columnTitle}"吗？`)) {
                                  removeColumn(config.id)
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors duration-150"
                              title="删除列"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      暂无列配置
                    </div>
                  )}
                </div>
                
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      setShowVisibilityPanel(false)
                      setSearchQuery('')
                    }}
                    className="w-full text-sm text-gray-600 py-1 hover:text-gray-800 transition-colors duration-150"
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：辅助功能按钮 */}
        <div className="flex items-center gap-1 lg:border-l lg:border-gray-300 lg:pl-3">
          <button
            onClick={handleExportConfig}
            className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors duration-150"
            title="导出列配置"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleImportConfig}
            className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors duration-150"
            title="导入列配置"
          >
            <Upload className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleResetConfig}
            className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors duration-150"
            title="重置为默认配置"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
        <span>共 {stats.total} 列</span>
        <span>显示 {stats.visible} 列</span>
        <span>用户列 {stats.user} 个</span>
        {searchQuery && (
          <span className="text-blue-600">搜索到 {filteredConfigs.length} 个结果</span>
        )}
      </div>

      {/* 点击外部关闭下拉菜单 */}
      {(showAddDropdown || showVisibilityPanel) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowAddDropdown(false)
            setShowVisibilityPanel(false)
          }}
        />
      )}
    </div>
  )
}

// 工具函数：获取分类图标
function getCategoryIcon(category: string): string {
  switch (category) {
    case 'text': return '📝'
    case 'number': return '🔢' 
    case 'date': return '📅'
    case 'media': return '🖼️'
    case 'social': return '📱'
    case 'custom': return '⚙️'
    default: return '📄'
  }
}

// 工具函数：获取数据类型图标
function getDataTypeIcon(dataType?: string): string {
  switch (dataType) {
    case 'text': return '📝'
    case 'number': return '🔢'
    case 'date': return '📅'
    case 'boolean': return '☑️'
    case 'url': return '🔗'
    case 'image': return '🖼️'
    case 'longtext': return '📄'
    case 'json': return '{}'
    case 'enum': return '📋'
    default: return '❓'
  }
}

// 工具函数：获取数据类型显示名称
function getDataTypeDisplayName(dataType?: string): string {
  switch (dataType) {
    case 'text': return '文本'
    case 'number': return '数值'
    case 'date': return '日期'
    case 'boolean': return '布尔值'
    case 'url': return '链接'
    case 'image': return '图片'
    case 'longtext': return '长文本'
    case 'json': return 'JSON'
    case 'enum': return '枚举'
    default: return '未知'
  }
}