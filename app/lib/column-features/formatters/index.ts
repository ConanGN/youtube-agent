// 格式化器模块
// 提供各种数据格式化功能

import { ColumnFormatter } from '@/types'

// 格式化结果接口
export interface FormatResult {
  formattedValue: string
  originalValue: any
  success: boolean
  error?: string
}

// 基础格式化器抽象类
export abstract class BaseFormatter {
  abstract format(value: any, options?: any): FormatResult
}

// 数值格式化器
export class NumberFormatter extends BaseFormatter {
  format(value: any, options: ColumnFormatter['options'] = {}): FormatResult {
    if (value === null || value === undefined || value === '') {
      return {
        formattedValue: '',
        originalValue: value,
        success: true
      }
    }
    
    const numValue = typeof value === 'number' ? value : parseFloat(value)
    
    if (isNaN(numValue)) {
      return {
        formattedValue: String(value),
        originalValue: value,
        success: false,
        error: '无效的数值'
      }
    }
    
    try {
      const formatted = new Intl.NumberFormat(options.locale || 'zh-CN', {
        minimumFractionDigits: options.minimumFractionDigits || 0,
        maximumFractionDigits: options.maximumFractionDigits || 2,
        ...options
      }).format(numValue)
      
      return {
        formattedValue: formatted,
        originalValue: value,
        success: true
      }
    } catch (error) {
      return {
        formattedValue: String(value),
        originalValue: value,
        success: false,
        error: '格式化失败'
      }
    }
  }
}

// 紧凑数值格式化器（如：1K, 1M）
export class CompactNumberFormatter extends BaseFormatter {
  format(value: any, options: ColumnFormatter['options'] = {}): FormatResult {
    if (value === null || value === undefined || value === '') {
      return {
        formattedValue: '',
        originalValue: value,
        success: true
      }
    }
    
    const numValue = typeof value === 'number' ? value : parseFloat(value)
    
    if (isNaN(numValue)) {
      return {
        formattedValue: String(value),
        originalValue: value,
        success: false,
        error: '无效的数值'
      }
    }
    
    try {
      // 使用紧凑格式
      const formatted = new Intl.NumberFormat(options.locale || 'zh-CN', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
        ...options
      }).format(numValue)
      
      return {
        formattedValue: formatted,
        originalValue: value,
        success: true
      }
    } catch (error) {
      // 回退到手动实现
      let formatted: string
      const absValue = Math.abs(numValue)
      
      if (absValue >= 1e9) {
        formatted = (numValue / 1e9).toFixed(1) + 'B'
      } else if (absValue >= 1e6) {
        formatted = (numValue / 1e6).toFixed(1) + 'M'
      } else if (absValue >= 1e3) {
        formatted = (numValue / 1e3).toFixed(1) + 'K'
      } else {
        formatted = numValue.toString()
      }
      
      return {
        formattedValue: formatted,
        originalValue: value,
        success: true
      }
    }
  }
}

// 百分比格式化器
export class PercentageFormatter extends BaseFormatter {
  format(value: any, options: ColumnFormatter['options'] = {}): FormatResult {
    if (value === null || value === undefined || value === '') {
      return {
        formattedValue: '',
        originalValue: value,
        success: true
      }
    }
    
    const numValue = typeof value === 'number' ? value : parseFloat(value)
    
    if (isNaN(numValue)) {
      return {
        formattedValue: String(value),
        originalValue: value,
        success: false,
        error: '无效的数值'
      }
    }
    
    try {
      // 假设输入值是0-100的百分比，需要除以100
      const percentValue = numValue / 100
      
      const formatted = new Intl.NumberFormat(options.locale || 'zh-CN', {
        style: 'percent',
        minimumFractionDigits: options.minimumFractionDigits || 0,
        maximumFractionDigits: options.maximumFractionDigits || 1,
        ...options
      }).format(percentValue)
      
      return {
        formattedValue: formatted,
        originalValue: value,
        success: true
      }
    } catch (error) {
      return {
        formattedValue: numValue + '%',
        originalValue: value,
        success: true
      }
    }
  }
}

// 货币格式化器
export class CurrencyFormatter extends BaseFormatter {
  format(value: any, options: ColumnFormatter['options'] = {}): FormatResult {
    if (value === null || value === undefined || value === '') {
      return {
        formattedValue: '',
        originalValue: value,
        success: true
      }
    }
    
    const numValue = typeof value === 'number' ? value : parseFloat(value)
    
    if (isNaN(numValue)) {
      return {
        formattedValue: String(value),
        originalValue: value,
        success: false,
        error: '无效的数值'
      }
    }
    
    try {
      const formatted = new Intl.NumberFormat(options.locale || 'zh-CN', {
        style: 'currency',
        currency: options.currency || 'CNY',
        minimumFractionDigits: options.minimumFractionDigits || 2,
        maximumFractionDigits: options.maximumFractionDigits || 2,
        ...options
      }).format(numValue)
      
      return {
        formattedValue: formatted,
        originalValue: value,
        success: true
      }
    } catch (error) {
      return {
        formattedValue: `¥${numValue.toFixed(2)}`,
        originalValue: value,
        success: true
      }
    }
  }
}

// 日期格式化器
export class DateFormatter extends BaseFormatter {
  format(value: any, options: ColumnFormatter['options'] = {}): FormatResult {
    if (value === null || value === undefined || value === '') {
      return {
        formattedValue: '',
        originalValue: value,
        success: true
      }
    }
    
    const date = new Date(value)
    
    if (isNaN(date.getTime())) {
      return {
        formattedValue: String(value),
        originalValue: value,
        success: false,
        error: '无效的日期'
      }
    }
    
    try {
      const formatted = new Intl.DateTimeFormat(options.locale || 'zh-CN', {
        dateStyle: options.dateStyle || 'short',
        timeStyle: options.timeStyle,
        ...options
      }).format(date)
      
      return {
        formattedValue: formatted,
        originalValue: value,
        success: true
      }
    } catch (error) {
      // 回退到简单格式
      const formatted = date.toLocaleDateString('zh-CN')
      return {
        formattedValue: formatted,
        originalValue: value,
        success: true
      }
    }
  }
}

// 相对时间格式化器（如：2小时前）
export class RelativeTimeFormatter extends BaseFormatter {
  format(value: any, options: ColumnFormatter['options'] = {}): FormatResult {
    if (value === null || value === undefined || value === '') {
      return {
        formattedValue: '',
        originalValue: value,
        success: true
      }
    }
    
    const date = new Date(value)
    
    if (isNaN(date.getTime())) {
      return {
        formattedValue: String(value),
        originalValue: value,
        success: false,
        error: '无效的日期'
      }
    }
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    let formatted: string
    
    if (diffSeconds < 60) {
      formatted = '刚刚'
    } else if (diffMinutes < 60) {
      formatted = `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      formatted = `${diffHours}小时前`
    } else if (diffDays < 30) {
      formatted = `${diffDays}天前`
    } else {
      // 超过30天显示具体日期
      formatted = date.toLocaleDateString('zh-CN')
    }
    
    return {
      formattedValue: formatted,
      originalValue: value,
      success: true
    }
  }
}

// 文本格式化器
export class TextFormatter extends BaseFormatter {
  format(value: any, options: ColumnFormatter['options'] = {}): FormatResult {
    if (value === null || value === undefined) {
      return {
        formattedValue: '',
        originalValue: value,
        success: true
      }
    }
    
    let formatted = String(value)
    
    // 截断处理
    if (options.maxLength && formatted.length > options.maxLength) {
      formatted = formatted.substring(0, options.maxLength) + '...'
    }
    
    // 大小写转换
    if (options.textTransform) {
      switch (options.textTransform) {
        case 'uppercase':
          formatted = formatted.toUpperCase()
          break
        case 'lowercase':
          formatted = formatted.toLowerCase()
          break
        case 'capitalize':
          formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase()
          break
      }
    }
    
    return {
      formattedValue: formatted,
      originalValue: value,
      success: true
    }
  }
}

// 布尔值格式化器
export class BooleanFormatter extends BaseFormatter {
  format(value: any, options: ColumnFormatter['options'] = {}): FormatResult {
    const boolValue = Boolean(value)
    
    const trueText = options.trueText || '是'
    const falseText = options.falseText || '否'
    
    return {
      formattedValue: boolValue ? trueText : falseText,
      originalValue: value,
      success: true
    }
  }
}

// JSON格式化器
export class JSONFormatter extends BaseFormatter {
  format(value: any, options: ColumnFormatter['options'] = {}): FormatResult {
    if (value === null || value === undefined || value === '') {
      return {
        formattedValue: '',
        originalValue: value,
        success: true
      }
    }
    
    try {
      let jsonValue: any
      
      if (typeof value === 'string') {
        jsonValue = JSON.parse(value)
      } else {
        jsonValue = value
      }
      
      const formatted = JSON.stringify(jsonValue, null, options.indent || 2)
      
      return {
        formattedValue: formatted,
        originalValue: value,
        success: true
      }
    } catch (error) {
      return {
        formattedValue: String(value),
        originalValue: value,
        success: false,
        error: '无效的JSON'
      }
    }
  }
}

// 自定义格式化器
export class CustomFormatter extends BaseFormatter {
  constructor(private customFormatter: (value: any, options?: any) => string) {
    super()
  }
  
  format(value: any, options: ColumnFormatter['options'] = {}): FormatResult {
    try {
      const formatted = this.customFormatter(value, options)
      return {
        formattedValue: formatted,
        originalValue: value,
        success: true
      }
    } catch (error) {
      return {
        formattedValue: String(value),
        originalValue: value,
        success: false,
        error: '自定义格式化失败'
      }
    }
  }
}

// 格式化器工厂
export class FormatterFactory {
  private static formatters = new Map<string, BaseFormatter>([
    ['number', new NumberFormatter()],
    ['compact', new CompactNumberFormatter()],
    ['percentage', new PercentageFormatter()],
    ['currency', new CurrencyFormatter()],
    ['date', new DateFormatter()],
    ['relative-time', new RelativeTimeFormatter()],
    ['text', new TextFormatter()],
    ['boolean', new BooleanFormatter()],
    ['json', new JSONFormatter()],
  ])
  
  static getFormatter(type: string): BaseFormatter | null {
    return this.formatters.get(type) || null
  }
  
  static registerFormatter(type: string, formatter: BaseFormatter): void {
    this.formatters.set(type, formatter)
  }
  
  static registerCustomFormatter(type: string, customFormatter: (value: any, options?: any) => string): void {
    this.formatters.set(type, new CustomFormatter(customFormatter))
  }
  
  static formatValue(value: any, formatter: ColumnFormatter): FormatResult {
    if (formatter.customFormatter) {
      try {
        const formatted = formatter.customFormatter(value)
        return {
          formattedValue: formatted,
          originalValue: value,
          success: true
        }
      } catch (error) {
        return {
          formattedValue: String(value),
          originalValue: value,
          success: false,
          error: '自定义格式化失败'
        }
      }
    }
    
    const formatterInstance = this.getFormatter(formatter.type)
    if (formatterInstance) {
      return formatterInstance.format(value, formatter.options)
    }
    
    return {
      formattedValue: String(value || ''),
      originalValue: value,
      success: true
    }
  }
}

// 预定义格式化器模板
export const FORMATTER_TEMPLATES = {
  // 数值相关
  integer: {
    type: 'number' as const,
    options: { maximumFractionDigits: 0 }
  },
  
  decimal: {
    type: 'number' as const,
    options: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  },
  
  compactNumber: {
    type: 'compact' as const,
    options: {}
  },
  
  percentage: {
    type: 'percentage' as const,
    options: { maximumFractionDigits: 1 }
  },
  
  currency: {
    type: 'currency' as const,
    options: { currency: 'CNY' }
  },
  
  // 日期相关
  shortDate: {
    type: 'date' as const,
    options: { dateStyle: 'short' }
  },
  
  longDate: {
    type: 'date' as const,
    options: { dateStyle: 'long' }
  },
  
  dateTime: {
    type: 'date' as const,
    options: { dateStyle: 'short', timeStyle: 'short' }
  },
  
  relativeTime: {
    type: 'relative-time' as const,
    options: {}
  },
  
  // 文本相关
  truncated: {
    type: 'text' as const,
    options: { maxLength: 50 }
  },
  
  uppercase: {
    type: 'text' as const,
    options: { textTransform: 'uppercase' }
  },
  
  // 布尔值
  yesNo: {
    type: 'boolean' as const,
    options: { trueText: '是', falseText: '否' }
  },
  
  enabledDisabled: {
    type: 'boolean' as const,
    options: { trueText: '启用', falseText: '禁用' }
  },
}

// 批量格式化函数
export function formatMultipleValues(
  data: Record<string, any>,
  formatterConfig: Record<string, ColumnFormatter>
): Record<string, FormatResult> {
  const results: Record<string, FormatResult> = {}
  
  for (const [fieldName, formatter] of Object.entries(formatterConfig)) {
    const value = data[fieldName]
    results[fieldName] = FormatterFactory.formatValue(value, formatter)
  }
  
  return results
}

// 获取格式化后的值映射
export function getFormattedValues(results: Record<string, FormatResult>): Record<string, string> {
  const formatted: Record<string, string> = {}
  
  for (const [key, result] of Object.entries(results)) {
    formatted[key] = result.formattedValue
  }
  
  return formatted
}