'use client'

// 动态列渲染组件
// 根据列配置动态渲染不同类型的单元格

import React from 'react'
import { CellContext } from '@tanstack/react-table'
import { UnifiedDataItem, DynamicColumnConfig } from '@/types'
import { FeatureModuleManager } from '@/lib/column-features'
import { 
  TextEditor,
  NumberEditor,
  DateEditor,
  SelectEditor,
  BooleanEditor,
  URLEditor,
  ImageEditor,
  JSONEditor,
  createEditor
} from '@/lib/column-features/editors/TextEditor'

// 动态单元格Props
export interface DynamicCellProps extends CellContext<UnifiedDataItem, unknown> {
  config: DynamicColumnConfig
}

// 动态单元格组件
export function DynamicCell({ getValue, row, column, table, config }: DynamicCellProps) {
  const value = getValue()
  const [isEditing, setIsEditing] = React.useState(false)
  const [tempValue, setTempValue] = React.useState(value)

  // 处理值变更
  const handleChange = React.useCallback((newValue: any) => {
    setTempValue(newValue)
  }, [])

  // 保存编辑
  const handleSave = React.useCallback(() => {
    // 验证值
    const validation = FeatureModuleManager.validateColumnValue(tempValue, config)
    if (!validation.isValid) {
      alert(validation.error || '输入值无效')
      return
    }

    // 更新数据
    table.options.meta?.updateData(row.index, column.id, tempValue)
    
    // 添加编辑历史
    table.options.meta?.addEditHistory(
      row.index,
      column.id,
      String(value || ''),
      String(tempValue || '')
    )

    setIsEditing(false)
  }, [tempValue, config, table, row.index, column.id, value])

  // 取消编辑
  const handleCancel = React.useCallback(() => {
    setTempValue(value)
    setIsEditing(false)
  }, [value])

  // 处理双击编辑
  const handleDoubleClick = React.useCallback(() => {
    if (config.features.editable) {
      setIsEditing(true)
    }
  }, [config.features.editable])

  // 处理键盘事件
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel])

  // 渲染编辑状态
  if (isEditing && config.features.editable) {
    const editorProps = {
      value: tempValue,
      onChange: handleChange,
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      config: config.editor || { type: 'input' },
      validationRules: config.validationRules,
      placeholder: config.editor?.placeholder,
      autoFocus: true,
    }

    return (
      <div className="editing-cell p-1">
        {createEditor(config.editor?.type || 'input', editorProps)}
        <div className="mt-1 flex space-x-1">
          <button
            onClick={handleSave}
            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            保存
          </button>
          <button
            onClick={handleCancel}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  // 渲染显示状态
  const formattedValue = FeatureModuleManager.formatColumnValue(value, config)
  const displayValue = getDisplayText(formattedValue, config.dataType === 'longtext' ? 100 : 50)

  return (
    <div
      className={`dynamic-cell p-2 min-h-[32px] flex items-center group ${
        config.features.editable ? 'cursor-pointer hover:bg-gray-50' : ''
      } ${config.cellClassName || ''}`}
      onDoubleClick={handleDoubleClick}
      title={config.features.editable ? `双击编辑 - 完整内容: ${formattedValue}` : formattedValue}
    >
      {/* 特殊类型渲染 */}
      {renderSpecialContent(value, config, formattedValue)}
      
      {/* 编辑提示 */}
      {config.features.editable && formattedValue && formattedValue.length > (config.dataType === 'longtext' ? 100 : 50) && (
        <span className="text-blue-500 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
          [编辑]
        </span>
      )}
    </div>
  )
}

// 渲染特殊内容类型
function renderSpecialContent(value: any, config: DynamicColumnConfig, formattedValue: string): React.ReactElement {
  switch (config.dataType) {
    case 'image':
      return renderImageContent(value, formattedValue)
    case 'url':
      return renderUrlContent(value, formattedValue)
    case 'boolean':
      return renderBooleanContent(value, config)
    case 'json':
      return renderJsonContent(value, formattedValue)
    case 'date':
      return renderDateContent(value, formattedValue)
    default:
      return renderTextContent(formattedValue, config)
  }
}

// 渲染图片内容
function renderImageContent(value: any, formattedValue: string): React.ReactElement {
  if (!value || typeof value !== 'string') {
    return (
      <div className="w-16 h-12 bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs">
        无图片
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <img
        src={value}
        alt="预览"
        className="w-16 h-12 object-cover rounded border"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const placeholder = target.nextElementSibling as HTMLElement
          if (placeholder) {
            placeholder.style.display = 'flex'
          }
        }}
      />
      <div 
        className="w-16 h-12 bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs"
        style={{ display: 'none' }}
      >
        加载失败
      </div>
    </div>
  )
}

// 渲染URL内容
function renderUrlContent(value: any, formattedValue: string): React.ReactElement {
  if (!value || typeof value !== 'string') {
    return <span className="text-gray-400">无链接</span>
  }

  try {
    const url = new URL(value)
    return (
      <div className="flex items-center space-x-2">
        <span className="text-blue-600">🔗</span>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline truncate max-w-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {url.hostname}
        </a>
      </div>
    )
  } catch {
    return <span className="text-red-500">无效链接</span>
  }
}

// 渲染布尔值内容
function renderBooleanContent(value: any, config: DynamicColumnConfig): React.ReactElement {
  const boolValue = Boolean(value)
  const trueText = config.formatter?.options?.trueText || '是'
  const falseText = config.formatter?.options?.falseText || '否'
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      boolValue 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-800'
    }`}>
      {boolValue ? trueText : falseText}
    </span>
  )
}

// 渲染JSON内容
function renderJsonContent(value: any, formattedValue: string): React.ReactElement {
  if (!value) {
    return <span className="text-gray-400">空JSON</span>
  }

  try {
    const jsonObject = typeof value === 'string' ? JSON.parse(value) : value
    const keys = Object.keys(jsonObject)
    
    return (
      <div className="font-mono text-sm">
        <span className="text-gray-500">{'{'}</span>
        <span className="text-blue-600">{keys.length}个属性</span>
        <span className="text-gray-500">{'}'}</span>
      </div>
    )
  } catch {
    return <span className="text-red-500 font-mono text-sm">无效JSON</span>
  }
}

// 渲染日期内容
function renderDateContent(value: any, formattedValue: string): React.ReactElement {
  if (!value) {
    return <span className="text-gray-400">无日期</span>
  }

  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return <span className="text-red-500">无效日期</span>
  }

  // 计算相对时间
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  let relativeText = ''
  if (diffDays === 0) {
    relativeText = '今天'
  } else if (diffDays === 1) {
    relativeText = '昨天'
  } else if (diffDays > 0 && diffDays < 7) {
    relativeText = `${diffDays}天前`
  } else if (diffDays < 0 && diffDays > -7) {
    relativeText = `${Math.abs(diffDays)}天后`
  }

  return (
    <div className="flex flex-col">
      <span className="text-gray-900">{formattedValue}</span>
      {relativeText && (
        <span className="text-xs text-gray-500">{relativeText}</span>
      )}
    </div>
  )
}

// 渲染文本内容
function renderTextContent(formattedValue: string, config: DynamicColumnConfig): React.ReactElement {
  if (!formattedValue) {
    return <span className="text-gray-400 italic">空</span>
  }

  return (
    <div className="w-full overflow-hidden">
      <span className="text-gray-900">{formattedValue}</span>
    </div>
  )
}

// 文本截断工具函数
function getDisplayText(text: string, maxLength: number = 50): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 动态表头组件
export interface DynamicHeaderProps {
  config: DynamicColumnConfig
  onConfigChange?: (updates: Partial<DynamicColumnConfig>) => void
  onRemove?: () => void
  children?: React.ReactNode
}

export function DynamicHeader({ config, onConfigChange, onRemove, children }: DynamicHeaderProps) {
  const [showMenu, setShowMenu] = React.useState(false)

  return (
    <div className="dynamic-header relative">
      <div className="flex items-center justify-between group">
        <div className="flex items-center space-x-1">
          {/* 数据类型图标 */}
          <span className="text-xs text-gray-500">
            {getDataTypeIcon(config.dataType)}
          </span>
          
          {/* 列标题 */}
          <span className="font-medium">{config.title}</span>
          
          {/* 必填标识 */}
          {config.validationRules?.some(rule => rule.type === 'required') && (
            <span className="text-red-500 text-xs">*</span>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 配置按钮 */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="列配置"
          >
            ⚙️
          </button>
          
          {/* 删除按钮（仅用户列） */}
          {config.isUserColumn && onRemove && (
            <button
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-500 rounded"
              title="删除列"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
      
      {/* 配置菜单 */}
      {showMenu && (
        <div className="absolute top-full left-0 z-10 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2 space-y-2">
            {/* 可见性切换 */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.visible}
                onChange={(e) => onConfigChange?.({ visible: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">显示列</span>
            </label>
            
            {/* 可编辑切换 */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.features.editable}
                onChange={(e) => onConfigChange?.({ 
                  features: { ...config.features, editable: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm">可编辑</span>
            </label>
            
            {/* 可排序切换 */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.features.sortable}
                onChange={(e) => onConfigChange?.({ 
                  features: { ...config.features, sortable: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm">可排序</span>
            </label>
            
            {/* AI处理切换 */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.features.aiProcessable}
                onChange={(e) => onConfigChange?.({ 
                  features: { ...config.features, aiProcessable: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm">AI处理</span>
            </label>
          </div>
          
          <div className="border-t border-gray-200 p-2">
            <button
              onClick={() => setShowMenu(false)}
              className="w-full text-sm text-gray-600 py-1 hover:text-gray-800"
            >
              关闭
            </button>
          </div>
        </div>
      )}
      
      {children}
    </div>
  )
}

// 获取数据类型图标
function getDataTypeIcon(dataType: string): string {
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