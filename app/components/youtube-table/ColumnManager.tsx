'use client'

// 列管理器组件
// 提供表头的列管理功能：添加、删除、配置列

import React, { useState } from 'react'
import { Plus, Settings, Download, Upload, RotateCcw, Search, Filter, Eye, EyeOff, X } from 'lucide-react'
import { 
  DynamicColumnConfig, 
  ColumnTemplate, 
  COLUMN_TEMPLATES 
} from '@/types'
import { UseDynamicColumnsReturn } from '@/hooks/useDynamicColumns'

// 列管理器Props
export interface ColumnManagerProps {
  dynamicColumns: UseDynamicColumnsReturn
  className?: string
}

// 主要列管理器组件
export function ColumnManager({ dynamicColumns, className = '' }: ColumnManagerProps) {
  const [showDropdown, setShowDropdown] = useState(false)
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
      setShowDropdown(false)
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

  return (
    <div className={`column-manager ${className}`}>
      {/* 主要操作按钮组 */}
      <div className="flex items-center space-x-2">
        {/* 添加列按钮 */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4" />
            <span>添加列</span>
          </button>

          {/* 添加列下拉菜单 */}
          {showDropdown && (
            <div className="absolute top-full left-0 z-20 mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg">
              <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">选择列模板</h3>
                <p className="text-xs text-gray-500 mt-1">从预定义模板快速创建新列</p>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleAddColumn(template)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
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
                  onClick={() => setShowDropdown(false)}
                  className="w-full text-sm text-gray-600 py-1 hover:text-gray-800"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 列可见性管理 */}
        <div className="relative">
          <button
            onClick={() => setShowVisibilityPanel(!showVisibilityPanel)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            <span>列显示</span>
            <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              {stats.visible}/{stats.total}
            </span>
          </button>

          {/* 列可见性面板 */}
          {showVisibilityPanel && (
            <div className="absolute top-full right-0 z-20 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">列显示控制</h3>
                  <div className="text-xs text-gray-500">
                    显示 {stats.visible} / 共 {stats.total} 列
                  </div>
                </div>
                
                {/* 搜索框 */}
                <div className="mt-2 relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索列..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {filteredConfigs.length > 0 ? (
                  filteredConfigs.map((config) => (
                    <div
                      key={config.id}
                      className="flex items-center justify-between px-4 py-2 hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs">{getDataTypeIcon(config.dataType)}</span>
                          <span className={`text-sm ${config.isSystemColumn ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                            {config.title}
                          </span>
                        </div>
                        
                        {config.isSystemColumn && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            系统
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleColumnVisibility(config.id)}
                          className={`p-1 rounded hover:bg-gray-200 ${
                            config.visible ? 'text-blue-600' : 'text-gray-400'
                          }`}
                          title={config.visible ? '隐藏列' : '显示列'}
                        >
                          {config.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        
                        {config.isUserColumn && (
                          <button
                            onClick={() => {
                              if (confirm(`确定要删除列"${config.title}"吗？`)) {
                                removeColumn(config.id)
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                            title="删除列"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">
                    {searchQuery ? '未找到匹配的列' : '暂无列配置'}
                  </div>
                )}
              </div>
              
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setShowVisibilityPanel(false)
                    setSearchQuery('')
                  }}
                  className="w-full text-sm text-gray-600 py-1 hover:text-gray-800"
                >
                  关闭
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 更多操作按钮 */}
        <div className="flex items-center space-x-1 border-l border-gray-300 pl-2">
          <button
            onClick={handleExportConfig}
            className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
            title="导出列配置"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleImportConfig}
            className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
            title="导入列配置"
          >
            <Upload className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleResetConfig}
            className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
            title="重置为默认配置"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
        <span>共 {stats.total} 列</span>
        <span>显示 {stats.visible} 列</span>
        <span>用户列 {stats.user} 个</span>
        {searchQuery && (
          <span className="text-blue-600">搜索到 {filteredConfigs.length} 个结果</span>
        )}
      </div>

      {/* 点击外部关闭下拉菜单 */}
      {(showDropdown || showVisibilityPanel) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowDropdown(false)
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