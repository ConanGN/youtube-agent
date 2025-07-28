'use client'

// 文本编辑器组件
import React from 'react'
import { BaseEditor, BaseEditorProps, withEditorLogic } from './BaseEditor'

// 文本编辑器类实现
export class TextEditor extends BaseEditor {
  renderEditor(): React.ReactElement {
    return (
      <input
        type="text"
        value={this.props.value || ''}
        onChange={(e) => this.handleChange(e.target.value)}
        {...this.getCommonProps()}
      />
    )
  }
}

// 函数式文本编辑器
export const FunctionalTextEditor = withEditorLogic((props: BaseEditorProps & {
  isValid: boolean
  error: string | null
  commonProps: any
  handleChange: (value: any) => void
}) => (
  <input
    type="text"
    value={props.value || ''}
    onChange={(e) => props.handleChange(e.target.value)}
    {...props.commonProps}
  />
))

// 多行文本编辑器
export class TextAreaEditor extends BaseEditor {
  renderEditor(): React.ReactElement {
    const rows = this.props.config.rows || 4
    
    return (
      <textarea
        value={this.props.value || ''}
        onChange={(e) => this.handleChange(e.target.value)}
        rows={rows}
        style={{ minHeight: `${rows * 1.5}rem`, resize: 'vertical' }}
        {...this.getCommonProps()}
      />
    )
  }
}

// 函数式多行文本编辑器
export const FunctionalTextAreaEditor = withEditorLogic((props: BaseEditorProps & {
  isValid: boolean
  error: string | null
  commonProps: any
  handleChange: (value: any) => void
}) => {
  const rows = props.config.rows || 4
  
  return (
    <textarea
      value={props.value || ''}
      onChange={(e) => props.handleChange(e.target.value)}
      rows={rows}
      style={{ minHeight: `${rows * 1.5}rem`, resize: 'vertical' }}
      {...props.commonProps}
    />
  )
})

// 数值编辑器
export class NumberEditor extends BaseEditor {
  renderEditor(): React.ReactElement {
    const { config } = this.props
    
    return (
      <input
        type="number"
        value={this.props.value || ''}
        onChange={(e) => this.handleChange(e.target.value ? parseFloat(e.target.value) : '')}
        min={config.min}
        max={config.max}
        step={config.step || 1}
        {...this.getCommonProps()}
      />
    )
  }
}

// 日期编辑器
export class DateEditor extends BaseEditor {
  renderEditor(): React.ReactElement {
    // 将日期值转换为YYYY-MM-DD格式
    const formatDateForInput = (value: any): string => {
      if (!value) return ''
      const date = new Date(value)
      if (isNaN(date.getTime())) return ''
      return date.toISOString().split('T')[0]
    }
    
    return (
      <input
        type="date"
        value={formatDateForInput(this.props.value)}
        onChange={(e) => this.handleChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
        {...this.getCommonProps()}
      />
    )
  }
}

// 选择器编辑器
export class SelectEditor extends BaseEditor {
  renderEditor(): React.ReactElement {
    const { config } = this.props
    const options = config.options || []
    
    return (
      <select
        value={this.props.value || ''}
        onChange={(e) => this.handleChange(e.target.value)}
        multiple={config.multiple}
        {...this.getCommonProps()}
      >
        <option value="">请选择...</option>
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
}

// 布尔值编辑器（复选框）
export class BooleanEditor extends BaseEditor {
  renderEditor(): React.ReactElement {
    return (
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={Boolean(this.props.value)}
          onChange={(e) => this.handleChange(e.target.checked)}
          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          disabled={this.props.disabled}
        />
        <span className="text-sm text-gray-700">
          {this.props.config.placeholder || '启用'}
        </span>
      </div>
    )
  }
}

// URL编辑器（带预览）
export class URLEditor extends BaseEditor {
  renderEditor(): React.ReactElement {
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }
    
    return (
      <div className="space-y-2">
        <input
          type="url"
          value={this.props.value || ''}
          onChange={(e) => this.handleChange(e.target.value)}
          {...this.getCommonProps()}
        />
        {this.props.value && isValidUrl(this.props.value) && (
          <div className="text-sm text-gray-600">
            <a 
              href={this.props.value} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              🔗 预览链接
            </a>
          </div>
        )}
      </div>
    )
  }
}

// 图片URL编辑器（带预览）
export class ImageEditor extends BaseEditor {
  renderEditor(): React.ReactElement {
    const [imageError, setImageError] = React.useState(false)
    
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }
    
    return (
      <div className="space-y-2">
        <input
          type="url"
          value={this.props.value || ''}
          onChange={(e) => this.handleChange(e.target.value)}
          {...this.getCommonProps()}
        />
        {this.props.value && isValidUrl(this.props.value) && (
          <div className="mt-2">
            {!imageError ? (
              <img
                src={this.props.value}
                alt="预览"
                className="max-w-xs max-h-32 object-cover rounded border"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            ) : (
              <div className="w-32 h-24 bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-sm">
                图片加载失败
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
}

// JSON编辑器
export class JSONEditor extends BaseEditor {
  private validateJSON(value: string): boolean {
    if (!value.trim()) return true
    try {
      JSON.parse(value)
      return true
    } catch {
      return false
    }
  }
  
  renderEditor(): React.ReactElement {
    const [localError, setLocalError] = React.useState<string | null>(null)
    
    const handleJSONChange = (value: string) => {
      if (value && !this.validateJSON(value)) {
        setLocalError('无效的JSON格式')
      } else {
        setLocalError(null)
      }
      this.handleChange(value)
    }
    
    return (
      <div className="space-y-2">
        <textarea
          value={this.props.value || ''}
          onChange={(e) => handleJSONChange(e.target.value)}
          rows={this.props.config.rows || 6}
          placeholder='{"key": "value"}'
          className={`font-mono text-sm ${this.getBaseClassName()}`}
          style={{ minHeight: '6rem', resize: 'vertical' }}
          {...this.getCommonProps()}
        />
        {localError && (
          <div className="text-sm text-red-600 flex items-center">
            <span className="mr-1">⚠️</span>
            {localError}
          </div>
        )}
        {this.props.value && this.validateJSON(this.props.value) && (
          <div className="text-sm text-green-600 flex items-center">
            <span className="mr-1">✓</span>
            JSON格式正确
          </div>
        )}
      </div>
    )
  }
}

// 编辑器工厂函数
export function createEditor(type: string, props: BaseEditorProps): React.ReactElement {
  switch (type) {
    case 'input':
    case 'text':
      return <FunctionalTextEditor {...props} />
    case 'textarea':
    case 'longtext':
      return React.createElement(TextAreaEditor, props)
    case 'number':
      return React.createElement(NumberEditor, props)
    case 'date':
      return React.createElement(DateEditor, props)
    case 'select':
      return React.createElement(SelectEditor, props)
    case 'checkbox':
    case 'boolean':
      return React.createElement(BooleanEditor, props)
    case 'url':
      return React.createElement(URLEditor, props)
    case 'image':
      return React.createElement(ImageEditor, props)
    case 'json':
      return React.createElement(JSONEditor, props)
    default:
      return <FunctionalTextEditor {...props} />
  }
}