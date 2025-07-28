// 列功能模块总入口
// 导出所有编辑器、验证器、格式化器等功能模块

// 编辑器模块
export * from './editors/BaseEditor'
export * from './editors/TextEditor'

// 验证器模块
export * from './validators'

// 格式化器模块
export * from './formatters'

// 重新导出类型
export type {
  ColumnDataType,
  ValidationRule,
  ColumnFormatter,
  EditorConfig,
  ColumnFeatures,
  DynamicColumnConfig,
  ColumnTemplate,
  FeatureModule,
} from '@/types'

// 功能模块注册中心
import { BaseEditor } from './editors/BaseEditor'
import { ValidatorFactory } from './validators'
import { FormatterFactory } from './formatters'
import { FeatureModule, DynamicColumnConfig } from '@/types'

// 功能模块管理器
export class FeatureModuleManager {
  private static editors = new Map<string, React.ComponentType<any>>()
  private static modules = new Map<string, FeatureModule>()
  
  // 注册编辑器
  static registerEditor(type: string, editorComponent: React.ComponentType<any>): void {
    this.editors.set(type, editorComponent)
  }
  
  // 获取编辑器
  static getEditor(type: string): React.ComponentType<any> | null {
    return this.editors.get(type) || null
  }
  
  // 注册功能模块
  static registerModule(module: FeatureModule): void {
    this.modules.set(module.id, module)
  }
  
  // 获取功能模块
  static getModule(id: string): FeatureModule | null {
    return this.modules.get(id) || null
  }
  
  // 获取所有功能模块
  static getAllModules(): FeatureModule[] {
    return Array.from(this.modules.values())
  }
  
  // 根据列配置创建渲染器
  static createCellRenderer(config: DynamicColumnConfig): React.ComponentType<any> | null {
    const editorType = config.editor?.type || 'input'
    return this.getEditor(editorType)
  }
  
  // 验证列配置值
  static validateColumnValue(value: any, config: DynamicColumnConfig): { isValid: boolean; error: string | null } {
    if (config.validationRules && config.validationRules.length > 0) {
      return ValidatorFactory.validateValue(value, config.validationRules)
    }
    return { isValid: true, error: null }
  }
  
  // 格式化列配置值
  static formatColumnValue(value: any, config: DynamicColumnConfig): string {
    if (config.formatter) {
      const result = FormatterFactory.formatValue(value, config.formatter)
      return result.formattedValue
    }
    return String(value || '')
  }
  
  // 解析列配置值（用于导入数据）
  static parseColumnValue(input: string, config: DynamicColumnConfig): any {
    switch (config.dataType) {
      case 'number':
        const num = parseFloat(input)
        return isNaN(num) ? null : num
      case 'boolean':
        return input === 'true' || input === '是' || input === '1'
      case 'date':
        const date = new Date(input)
        return isNaN(date.getTime()) ? null : date.toISOString()
      case 'json':
        try {
          return JSON.parse(input)
        } catch {
          return input
        }
      default:
        return input
    }
  }
  
  // 获取列的默认值
  static getDefaultValue(config: DynamicColumnConfig): any {
    if (config.defaultValue !== undefined) {
      return config.defaultValue
    }
    
    switch (config.dataType) {
      case 'number':
        return 0
      case 'boolean':
        return false
      case 'date':
        return new Date().toISOString()
      case 'json':
        return {}
      default:
        return ''
    }
  }
}

// 内置功能模块定义
const TEXT_MODULE: FeatureModule = {
  id: 'text',
  name: '文本',
  description: '基础文本输入和显示功能',
  render: ({ value, onChange, config }) => {
    return React.createElement('input', {
      type: 'text',
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      placeholder: config.placeholder,
      className: 'w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
    })
  },
  validate: (value: string) => typeof value === 'string',
  format: (value: string) => String(value || ''),
  parse: (input: string) => input,
}

const NUMBER_MODULE: FeatureModule = {
  id: 'number',
  name: '数值',
  description: '数值输入和格式化显示功能',
  render: ({ value, onChange, config }) => {
    return React.createElement('input', {
      type: 'number',
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value)),
      placeholder: config.placeholder,
      min: config.min,
      max: config.max,
      step: config.step,
      className: 'w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
    })
  },
  validate: (value: number) => typeof value === 'number' && !isNaN(value),
  format: (value: number) => value?.toLocaleString() || '0',
  parse: (input: string) => parseFloat(input),
}

// 注册内置模块
FeatureModuleManager.registerModule(TEXT_MODULE)
FeatureModuleManager.registerModule(NUMBER_MODULE)

// 导出所有类和实例
export {
  ValidatorFactory,
  FormatterFactory,
}

// 工具函数：根据数据类型推断最佳配置
export function inferColumnConfig(data: any[], columnName: string): Partial<DynamicColumnConfig> {
  if (data.length === 0) {
    return {
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
      }
    }
  }

  // YouTube数据特殊字段处理
  if (columnName === 'thumbnail') {
    return {
      dataType: 'image',
      editor: { type: 'image' },
      filterVariant: 'text',
      width: 80,
      minWidth: 60,
      features: {
        editable: true,
        sortable: false,
        filterable: false,
        resizable: true,
        pinnable: false,
        groupable: false,
        aiProcessable: false,
        exportable: true,
        searchable: false,
      }
    }
  }

  if (columnName === 'title') {
    return {
      dataType: 'text',
      editor: { type: 'textarea' },
      filterVariant: 'text',
      width: 200,
      minWidth: 120,
      features: {
        editable: true,
        sortable: true,
        filterable: true,
        resizable: true,
        pinnable: true,
        groupable: true,
        aiProcessable: true,
        exportable: true,
        searchable: true,
      }
    }
  }

  if (columnName === 'description') {
    return {
      dataType: 'longtext',
      editor: { type: 'textarea' },
      filterVariant: 'text',
      width: 150,
      minWidth: 100,
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
      }
    }
  }

  if (['viewCount', 'likeCount', 'commentCount'].includes(columnName)) {
    return {
      dataType: 'number',
      editor: { type: 'number' },
      formatter: { type: 'number' },
      filterVariant: 'range',
      width: 100,
      minWidth: 80,
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
      }
    }
  }

  if (columnName === 'publishedAt') {
    return {
      dataType: 'date',
      editor: { type: 'date' },
      formatter: { type: 'date' },
      filterVariant: 'date',
      width: 100,
      minWidth: 80,
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
      }
    }
  }

  if (columnName === 'duration') {
    return {
      dataType: 'text',
      editor: { type: 'input' },
      filterVariant: 'text',
      width: 80,
      minWidth: 60,
      features: {
        editable: false,
        sortable: true,
        filterable: true,
        resizable: true,
        pinnable: false,
        groupable: true,
        aiProcessable: false,
        exportable: true,
        searchable: false,
      }
    }
  }

  if (columnName === 'channelTitle') {
    return {
      dataType: 'text',
      editor: { type: 'input' },
      filterVariant: 'select',
      width: 120,
      minWidth: 80,
      features: {
        editable: true,
        sortable: true,
        filterable: true,
        resizable: true,
        pinnable: false,
        groupable: true,
        aiProcessable: false,
        exportable: true,
        searchable: true,
      }
    }
  }

  if (columnName === 'tags') {
    return {
      dataType: 'text',
      editor: { type: 'textarea' },
      filterVariant: 'text',
      width: 120,
      minWidth: 80,
      features: {
        editable: true,
        sortable: false,
        filterable: true,
        resizable: true,
        pinnable: false,
        groupable: true,
        aiProcessable: true,
        exportable: true,
        searchable: true,
      }
    }
  }

  if (columnName === 'subtitles') {
    return {
      dataType: 'longtext',
      editor: { type: 'textarea' },
      filterVariant: 'text',
      width: 200,
      minWidth: 150,
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
      }
    }
  }
  
  // 分析前几行数据的类型
  const sampleSize = Math.min(10, data.length)
  const samples = data.slice(0, sampleSize).map(row => row[columnName])
  
  // 检查是否为数值
  const numericCount = samples.filter(val => 
    val !== null && val !== undefined && !isNaN(parseFloat(val))
  ).length
  
  if (numericCount / sampleSize > 0.8) {
    return {
      dataType: 'number',
      editor: { type: 'number' },
      formatter: { type: 'number' },
      filterVariant: 'range',
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
      }
    }
  }
  
  // 检查是否为日期
  const dateCount = samples.filter(val => {
    if (!val) return false
    const date = new Date(val)
    return !isNaN(date.getTime())
  }).length
  
  if (dateCount / sampleSize > 0.8) {
    return {
      dataType: 'date',
      editor: { type: 'date' },
      formatter: { type: 'date', options: { dateStyle: 'short' } },
      filterVariant: 'date',
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
      }
    }
  }
  
  // 检查是否为URL
  const urlCount = samples.filter(val => {
    if (typeof val !== 'string') return false
    try {
      new URL(val)
      return true
    } catch {
      return false
    }
  }).length
  
  if (urlCount / sampleSize > 0.5) {
    return {
      dataType: 'url',
      editor: { type: 'url' },
      validationRules: [{ type: 'url', message: '请输入有效的URL' }],
      features: {
        editable: true,
        sortable: false,
        filterable: true,
        resizable: true,
        pinnable: false,
        groupable: false,
        aiProcessable: false,
        exportable: true,
        searchable: true,
      }
    }
  }
  
  // 检查文本长度
  const avgLength = samples
    .filter(val => val)
    .reduce((sum, val) => sum + String(val).length, 0) / sampleSize
  
  if (avgLength > 100) {
    return {
      dataType: 'longtext',
      editor: { type: 'textarea', rows: 4 },
      filterVariant: 'text',
      minWidth: 200,
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
      }
    }
  }
  
  // 默认为文本类型
  return {
    dataType: 'text',
    editor: { type: 'input' },
    filterVariant: 'text',
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
    }
  }
}