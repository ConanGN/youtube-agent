// 验证器模块
// 提供各种数据验证功能

import { ValidationRule } from '@/types'

// 验证结果接口
export interface ValidationResult {
  isValid: boolean
  error: string | null
}

// 基础验证器抽象类
export abstract class BaseValidator {
  abstract validate(value: any, rule: ValidationRule): ValidationResult
}

// 必填验证器
export class RequiredValidator extends BaseValidator {
  validate(value: any, rule: ValidationRule): ValidationResult {
    const isEmpty = value === null || 
                   value === undefined || 
                   (typeof value === 'string' && value.trim() === '') ||
                   (Array.isArray(value) && value.length === 0)
    
    return {
      isValid: !isEmpty,
      error: isEmpty ? rule.message : null
    }
  }
}

// 长度验证器
export class LengthValidator extends BaseValidator {
  validate(value: any, rule: ValidationRule): ValidationResult {
    if (value === null || value === undefined) {
      return { isValid: true, error: null }
    }
    
    const length = typeof value === 'string' ? value.length : String(value).length
    
    if (rule.type === 'min' && length < rule.value) {
      return { isValid: false, error: rule.message }
    }
    
    if (rule.type === 'max' && length > rule.value) {
      return { isValid: false, error: rule.message }
    }
    
    return { isValid: true, error: null }
  }
}

// 数值范围验证器
export class NumberRangeValidator extends BaseValidator {
  validate(value: any, rule: ValidationRule): ValidationResult {
    const numValue = typeof value === 'number' ? value : parseFloat(value)
    
    if (isNaN(numValue)) {
      return { isValid: false, error: '请输入有效的数值' }
    }
    
    if (rule.type === 'min' && numValue < rule.value) {
      return { isValid: false, error: rule.message }
    }
    
    if (rule.type === 'max' && numValue > rule.value) {
      return { isValid: false, error: rule.message }
    }
    
    return { isValid: true, error: null }
  }
}

// 正则表达式验证器
export class PatternValidator extends BaseValidator {
  validate(value: any, rule: ValidationRule): ValidationResult {
    if (!value || typeof value !== 'string') {
      return { isValid: true, error: null }
    }
    
    const pattern = rule.value instanceof RegExp ? rule.value : new RegExp(rule.value)
    const isMatch = pattern.test(value)
    
    return {
      isValid: isMatch,
      error: isMatch ? null : rule.message
    }
  }
}

// URL验证器
export class URLValidator extends BaseValidator {
  validate(value: any, rule: ValidationRule): ValidationResult {
    if (!value || typeof value !== 'string') {
      return { isValid: true, error: null }
    }
    
    try {
      new URL(value)
      return { isValid: true, error: null }
    } catch {
      return { isValid: false, error: rule.message }
    }
  }
}

// 邮箱验证器
export class EmailValidator extends BaseValidator {
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  validate(value: any, rule: ValidationRule): ValidationResult {
    if (!value || typeof value !== 'string') {
      return { isValid: true, error: null }
    }
    
    const isValid = this.emailRegex.test(value)
    return {
      isValid,
      error: isValid ? null : rule.message
    }
  }
}

// 日期验证器
export class DateValidator extends BaseValidator {
  validate(value: any, rule: ValidationRule): ValidationResult {
    if (!value) {
      return { isValid: true, error: null }
    }
    
    const date = new Date(value)
    const isValid = !isNaN(date.getTime())
    
    return {
      isValid,
      error: isValid ? null : rule.message
    }
  }
}

// JSON验证器
export class JSONValidator extends BaseValidator {
  validate(value: any, rule: ValidationRule): ValidationResult {
    if (!value || typeof value !== 'string') {
      return { isValid: true, error: null }
    }
    
    try {
      JSON.parse(value)
      return { isValid: true, error: null }
    } catch {
      return { isValid: false, error: rule.message }
    }
  }
}

// 自定义验证器
export class CustomValidator extends BaseValidator {
  validate(value: any, rule: ValidationRule): ValidationResult {
    if (!rule.validator) {
      return { isValid: true, error: null }
    }
    
    const result = rule.validator(value)
    
    if (typeof result === 'boolean') {
      return {
        isValid: result,
        error: result ? null : rule.message
      }
    }
    
    if (typeof result === 'string') {
      return {
        isValid: false,
        error: result
      }
    }
    
    return { isValid: true, error: null }
  }
}

// 验证器工厂
export class ValidatorFactory {
  private static validators = new Map<string, BaseValidator>([
    ['required', new RequiredValidator()],
    ['min', new LengthValidator()],
    ['max', new LengthValidator()],
    ['pattern', new PatternValidator()],
    ['url', new URLValidator()],
    ['email', new EmailValidator()],
    ['date', new DateValidator()],
    ['json', new JSONValidator()],
    ['custom', new CustomValidator()],
  ])
  
  static getValidator(type: string): BaseValidator | null {
    return this.validators.get(type) || null
  }
  
  static registerValidator(type: string, validator: BaseValidator): void {
    this.validators.set(type, validator)
  }
  
  static validateValue(value: any, rules: ValidationRule[]): ValidationResult {
    for (const rule of rules) {
      const validator = this.getValidator(rule.type)
      if (validator) {
        const result = validator.validate(value, rule)
        if (!result.isValid) {
          return result
        }
      }
    }
    
    return { isValid: true, error: null }
  }
}

// 预定义的验证规则模板
export const VALIDATION_TEMPLATES = {
  // 文本相关
  requiredText: {
    type: 'required' as const,
    message: '此字段为必填项'
  },
  
  shortText: {
    type: 'max' as const,
    value: 100,
    message: '文本长度不能超过100个字符'
  },
  
  longText: {
    type: 'max' as const,
    value: 1000,
    message: '文本长度不能超过1000个字符'
  },
  
  // 数值相关
  positiveNumber: {
    type: 'min' as const,
    value: 0,
    message: '数值必须为正数'
  },
  
  percentage: {
    type: 'custom' as const,
    message: '请输入0-100之间的百分比',
    validator: (value: any) => {
      const num = parseFloat(value)
      return !isNaN(num) && num >= 0 && num <= 100
    }
  },
  
  // URL相关
  httpUrl: {
    type: 'custom' as const,
    message: '请输入有效的HTTP/HTTPS链接',
    validator: (value: any) => {
      try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    }
  },
  
  youtubeUrl: {
    type: 'custom' as const,
    message: '请输入有效的YouTube链接',
    validator: (value: any) => {
      if (typeof value !== 'string') return false
      const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/
      return youtubeRegex.test(value)
    }
  },
  
  // 日期相关
  futureDate: {
    type: 'custom' as const,
    message: '日期必须是未来时间',
    validator: (value: any) => {
      const date = new Date(value)
      return !isNaN(date.getTime()) && date > new Date()
    }
  },
  
  pastDate: {
    type: 'custom' as const,
    message: '日期必须是过去时间',
    validator: (value: any) => {
      const date = new Date(value)
      return !isNaN(date.getTime()) && date < new Date()
    }
  },
}

// 批量验证函数
export function validateMultipleFields(
  data: Record<string, any>,
  validationConfig: Record<string, ValidationRule[]>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {}
  
  for (const [fieldName, rules] of Object.entries(validationConfig)) {
    const value = data[fieldName]
    results[fieldName] = ValidatorFactory.validateValue(value, rules)
  }
  
  return results
}

// 检查整体验证是否通过
export function hasValidationErrors(results: Record<string, ValidationResult>): boolean {
  return Object.values(results).some(result => !result.isValid)
}

// 获取所有验证错误消息
export function getValidationErrors(results: Record<string, ValidationResult>): string[] {
  return Object.values(results)
    .filter(result => !result.isValid)
    .map(result => result.error)
    .filter((error): error is string => error !== null)
}