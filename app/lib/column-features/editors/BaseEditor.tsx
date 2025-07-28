'use client'

// 基础编辑器抽象类
// 所有编辑器都需要继承这个基类

import React from 'react'
import { EditorConfig, ValidationRule } from '@/types'

// 编辑器Props基础接口
export interface BaseEditorProps {
  value: any
  onChange: (value: any) => void
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  config: EditorConfig
  validationRules?: ValidationRule[]
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  className?: string
}

// 编辑器状态接口
export interface EditorState {
  isValid: boolean
  error: string | null
  isDirty: boolean
}

// 抽象编辑器组件
export abstract class BaseEditor extends React.Component<BaseEditorProps, EditorState> {
  constructor(props: BaseEditorProps) {
    super(props)
    this.state = {
      isValid: true,
      error: null,
      isDirty: false,
    }
  }

  // 抽象方法：子类必须实现渲染逻辑
  abstract renderEditor(): React.ReactElement

  // 验证输入值
  protected validate(value: any): { isValid: boolean; error: string | null } {
    const { validationRules } = this.props
    
    if (!validationRules || validationRules.length === 0) {
      return { isValid: true, error: null }
    }

    for (const rule of validationRules) {
      const result = this.validateRule(value, rule)
      if (!result.isValid) {
        return result
      }
    }

    return { isValid: true, error: null }
  }

  // 验证单个规则
  private validateRule(value: any, rule: ValidationRule): { isValid: boolean; error: string | null } {
    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return { isValid: false, error: rule.message }
        }
        break
        
      case 'min':
        if (typeof value === 'number' && value < rule.value) {
          return { isValid: false, error: rule.message }
        }
        if (typeof value === 'string' && value.length < rule.value) {
          return { isValid: false, error: rule.message }
        }
        break
        
      case 'max':
        if (typeof value === 'number' && value > rule.value) {
          return { isValid: false, error: rule.message }
        }
        if (typeof value === 'string' && value.length > rule.value) {
          return { isValid: false, error: rule.message }
        }
        break
        
      case 'pattern':
        if (typeof value === 'string' && rule.value instanceof RegExp) {
          if (!rule.value.test(value)) {
            return { isValid: false, error: rule.message }
          }
        }
        break
        
      case 'url':
        try {
          new URL(value)
        } catch {
          return { isValid: false, error: rule.message }
        }
        break
        
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          return { isValid: false, error: rule.message }
        }
        break
        
      case 'date':
        if (isNaN(Date.parse(value))) {
          return { isValid: false, error: rule.message }
        }
        break
        
      case 'custom':
        if (rule.validator) {
          const result = rule.validator(value)
          if (typeof result === 'string') {
            return { isValid: false, error: result }
          }
          if (result === false) {
            return { isValid: false, error: rule.message }
          }
        }
        break
    }

    return { isValid: true, error: null }
  }

  // 处理值变化
  protected handleChange = (value: any) => {
    const validation = this.validate(value)
    
    this.setState({
      isValid: validation.isValid,
      error: validation.error,
      isDirty: true,
    })
    
    this.props.onChange(value)
  }

  // 处理失焦
  protected handleBlur = () => {
    this.props.onBlur?.()
  }

  // 处理键盘事件
  protected handleKeyDown = (e: React.KeyboardEvent) => {
    this.props.onKeyDown?.(e)
  }

  // 获取通用的输入框属性
  protected getCommonProps() {
    return {
      placeholder: this.props.placeholder || this.props.config.placeholder,
      disabled: this.props.disabled,
      autoFocus: this.props.autoFocus,
      onBlur: this.handleBlur,
      onKeyDown: this.handleKeyDown,
      className: `${this.getBaseClassName()} ${this.props.className || ''}`.trim(),
    }
  }

  // 获取基础样式类名
  protected getBaseClassName(): string {
    const { isValid } = this.state
    const baseClasses = 'w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors'
    
    if (!isValid) {
      return `${baseClasses} border-red-500 bg-red-50 text-red-900`
    }
    
    return `${baseClasses} border-gray-300 hover:border-gray-400`
  }

  // 渲染错误提示
  protected renderError(): React.ReactElement | null {
    if (!this.state.error) return null
    
    return (
      <div className="mt-1 text-sm text-red-600 flex items-center">
        <span className="mr-1">⚠️</span>
        {this.state.error}
      </div>
    )
  }

  // 主渲染方法
  render(): React.ReactElement {
    return (
      <div className="editor-container">
        {this.renderEditor()}
        {this.renderError()}
      </div>
    )
  }
}

// 函数式编辑器HOC（高阶组件）
export interface FunctionalEditorProps extends BaseEditorProps {
  children: (props: BaseEditorProps & { 
    isValid: boolean
    error: string | null
    commonProps: any
    handleChange: (value: any) => void
  }) => React.ReactElement
}

export function withEditorLogic(WrappedComponent: React.ComponentType<any>) {
  return function EditorWithLogic(props: BaseEditorProps) {
    const [state, setState] = React.useState<EditorState>({
      isValid: true,
      error: null,
      isDirty: false,
    })

    // 验证逻辑（复制自BaseEditor）
    const validate = React.useCallback((value: any): { isValid: boolean; error: string | null } => {
      const { validationRules } = props
      
      if (!validationRules || validationRules.length === 0) {
        return { isValid: true, error: null }
      }

      for (const rule of validationRules) {
        switch (rule.type) {
          case 'required':
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              return { isValid: false, error: rule.message }
            }
            break
          case 'url':
            try {
              new URL(value)
            } catch {
              return { isValid: false, error: rule.message }
            }
            break
          case 'custom':
            if (rule.validator) {
              const result = rule.validator(value)
              if (typeof result === 'string') {
                return { isValid: false, error: result }
              }
              if (result === false) {
                return { isValid: false, error: rule.message }
              }
            }
            break
          // 其他规则类似实现...
        }
      }

      return { isValid: true, error: null }
    }, [props.validationRules])

    const handleChange = React.useCallback((value: any) => {
      const validation = validate(value)
      
      setState({
        isValid: validation.isValid,
        error: validation.error,
        isDirty: true,
      })
      
      props.onChange(value)
    }, [validate, props.onChange])

    const commonProps = {
      placeholder: props.placeholder || props.config.placeholder,
      disabled: props.disabled,
      autoFocus: props.autoFocus,
      onBlur: props.onBlur,
      onKeyDown: props.onKeyDown,
      className: `w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
        state.isValid 
          ? 'border-gray-300 hover:border-gray-400' 
          : 'border-red-500 bg-red-50 text-red-900'
      } ${props.className || ''}`.trim(),
    }

    return (
      <div className="editor-container">
        <WrappedComponent 
          {...props}
          isValid={state.isValid}
          error={state.error}
          commonProps={commonProps}
          handleChange={handleChange}
        />
        {state.error && (
          <div className="mt-1 text-sm text-red-600 flex items-center">
            <span className="mr-1">⚠️</span>
            {state.error}
          </div>
        )}
      </div>
    )
  }
}