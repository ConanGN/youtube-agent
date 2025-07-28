// 列配置管理器实现
// 负责管理动态列配置的CRUD操作

import { 
  DynamicColumnConfig, 
  ColumnConfigManager, 
  ColumnTemplate,
  COLUMN_TEMPLATES,
  ColumnDataType,
  ColumnFeatures 
} from '@/types'

// 默认列功能特性
const DEFAULT_FEATURES: ColumnFeatures = {
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

// 生成唯一ID
function generateId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 列配置管理器实现类
export class DynamicColumnConfigManager implements ColumnConfigManager {
  private configs: Map<string, DynamicColumnConfig> = new Map()
  private templates: ColumnTemplate[] = [...COLUMN_TEMPLATES]
  
  constructor(initialConfigs: DynamicColumnConfig[] = []) {
    // 初始化配置
    initialConfigs.forEach(config => {
      this.configs.set(config.id, config)
    })
  }
  
  // 获取所有配置
  getAllConfigs(): DynamicColumnConfig[] {
    return Array.from(this.configs.values()).sort((a, b) => a.position - b.position)
  }
  
  // 获取可见配置
  getVisibleConfigs(): DynamicColumnConfig[] {
    return this.getAllConfigs().filter(config => config.visible)
  }
  
  // 根据ID获取配置
  getConfig(columnId: string): DynamicColumnConfig | undefined {
    return this.configs.get(columnId)
  }
  
  // 添加新列配置
  addColumn(config: Omit<DynamicColumnConfig, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = generateId()
    const now = new Date().toISOString()
    
    // 确定位置（新列添加到最后）
    const maxPosition = Math.max(0, ...this.getAllConfigs().map(c => c.position))
    
    const newConfig: DynamicColumnConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
      position: maxPosition + 1,
      visible: config.visible !== false, // 默认可见
      features: { ...DEFAULT_FEATURES, ...config.features },
      isUserColumn: config.isUserColumn !== false, // 默认为用户列
      isSystemColumn: config.isSystemColumn === true, // 默认非系统列
    }
    
    // 验证配置
    const validation = this.validateConfig(newConfig)
    if (!validation.valid) {
      throw new Error(`列配置验证失败: ${validation.errors.join(', ')}`)
    }
    
    this.configs.set(id, newConfig)
    return id
  }
  
  // 更新列配置
  updateColumn(columnId: string, updates: Partial<DynamicColumnConfig>): boolean {
    const existingConfig = this.configs.get(columnId)
    if (!existingConfig) {
      return false
    }
    
    const updatedConfig: DynamicColumnConfig = {
      ...existingConfig,
      ...updates,
      id: columnId, // 确保ID不被更改
      updatedAt: new Date().toISOString(),
    }
    
    // 验证更新后的配置
    const validation = this.validateConfig(updatedConfig)
    if (!validation.valid) {
      throw new Error(`列配置更新验证失败: ${validation.errors.join(', ')}`)
    }
    
    this.configs.set(columnId, updatedConfig)
    return true
  }
  
  // 删除列配置（仅用户列可删除）
  removeColumn(columnId: string): boolean {
    const config = this.configs.get(columnId)
    if (!config) {
      return false
    }
    
    // 系统列不能删除
    if (config.isSystemColumn) {
      throw new Error('系统列不能删除')
    }
    
    return this.configs.delete(columnId)
  }
  
  // 重新排序列
  reorderColumns(columnIds: string[]): void {
    const configs = new Map<string, DynamicColumnConfig>()
    
    columnIds.forEach((id, index) => {
      const config = this.configs.get(id)
      if (config) {
        configs.set(id, {
          ...config,
          position: index,
          updatedAt: new Date().toISOString(),
        })
      }
    })
    
    // 更新配置
    configs.forEach((config, id) => {
      this.configs.set(id, config)
    })
  }
  
  // 重置为默认配置
  resetToDefaults(): void {
    this.configs.clear()
    
    // 重新创建系统默认列
    const defaultConfigs = this.createDefaultSystemColumns()
    defaultConfigs.forEach(config => {
      this.configs.set(config.id, config)
    })
  }
  
  // 导出配置
  exportConfigs(): string {
    const configs = this.getAllConfigs()
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      configs: configs.map(config => ({
        ...config,
        // 不导出系统列，只导出用户自定义列
        ...(config.isSystemColumn ? {} : config)
      })).filter(config => !config.isSystemColumn)
    }
    
    return JSON.stringify(exportData, null, 2)
  }
  
  // 导入配置
  importConfigs(configJson: string): boolean {
    try {
      const importData = JSON.parse(configJson)
      
      if (!importData.configs || !Array.isArray(importData.configs)) {
        throw new Error('无效的配置格式')
      }
      
      // 验证所有配置
      for (const config of importData.configs) {
        const validation = this.validateConfig(config)
        if (!validation.valid) {
          throw new Error(`导入配置验证失败: ${validation.errors.join(', ')}`)
        }
      }
      
      // 删除现有的用户列
      const userColumnIds = this.getAllConfigs()
        .filter(config => config.isUserColumn)
        .map(config => config.id)
      
      userColumnIds.forEach(id => this.configs.delete(id))
      
      // 添加导入的配置
      importData.configs.forEach((config: any) => {
        const now = new Date().toISOString()
        const newConfig: DynamicColumnConfig = {
          ...config,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
          isUserColumn: true,
          isSystemColumn: false,
        }
        
        this.configs.set(newConfig.id, newConfig)
      })
      
      return true
    } catch (error) {
      console.error('导入配置失败:', error)
      return false
    }
  }
  
  // 验证配置
  validateConfig(config: Partial<DynamicColumnConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // 必填字段验证
    if (!config.title || config.title.trim() === '') {
      errors.push('列标题不能为空')
    }
    
    if (!config.accessorKey || config.accessorKey.trim() === '') {
      errors.push('访问键不能为空')
    }
    
    if (!config.dataType) {
      errors.push('数据类型不能为空')
    }
    
    // 位置验证
    if (config.position !== undefined && config.position < 0) {
      errors.push('列位置不能为负数')
    }
    
    // 宽度验证
    if (config.width !== undefined && config.width < 0) {
      errors.push('列宽度不能为负数')
    }
    
    if (config.minWidth !== undefined && config.minWidth < 0) {
      errors.push('最小列宽度不能为负数')
    }
    
    if (config.maxWidth !== undefined && config.maxWidth < 0) {
      errors.push('最大列宽度不能为负数')
    }
    
    if (config.minWidth && config.maxWidth && config.minWidth > config.maxWidth) {
      errors.push('最小宽度不能大于最大宽度')
    }
    
    // 访问键唯一性验证（排除自身）
    if (config.accessorKey) {
      const existingConfig = Array.from(this.configs.values()).find(
        c => c.accessorKey === config.accessorKey && c.id !== config.id
      )
      if (existingConfig) {
        errors.push('访问键已存在')
      }
    }
    
    // 编辑器配置验证
    if (config.editor) {
      if (config.editor.type === 'select' && (!config.editor.options || config.editor.options.length === 0)) {
        errors.push('选择器类型编辑器必须提供选项')
      }
      
      if (config.editor.type === 'number') {
        if (config.editor.min !== undefined && config.editor.max !== undefined && config.editor.min > config.editor.max) {
          errors.push('编辑器最小值不能大于最大值')
        }
      }
    }
    
    // 验证规则验证
    if (config.validationRules) {
      for (const rule of config.validationRules) {
        if (!rule.type || !rule.message) {
          errors.push('验证规则必须包含类型和错误消息')
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  // 根据模板创建列
  createColumnFromTemplate(templateId: string, overrides: Partial<DynamicColumnConfig> = {}): string {
    const template = this.templates.find(t => t.id === templateId)
    if (!template) {
      throw new Error(`模板不存在: ${templateId}`)
    }
    
    const config: Omit<DynamicColumnConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      ...template.config,
      ...overrides,
      title: overrides.title || `新${template.name}列`,
      accessorKey: overrides.accessorKey || `custom_${Date.now()}`,
      isUserColumn: true,
      isSystemColumn: false,
      visible: true,
      position: 0, // 将在addColumn中重新计算
      features: { ...DEFAULT_FEATURES, ...template.config.features, ...overrides.features },
    } as Omit<DynamicColumnConfig, 'id' | 'createdAt' | 'updatedAt'>
    
    return this.addColumn(config)
  }
  
  // 获取所有模板
  getTemplates(): ColumnTemplate[] {
    return [...this.templates]
  }
  
  // 添加自定义模板
  addTemplate(template: ColumnTemplate): void {
    this.templates.push(template)
  }
  
  // 创建默认系统列配置
  private createDefaultSystemColumns(): DynamicColumnConfig[] {
    const now = new Date().toISOString()
    
    return [
      {
        id: 'system_select',
        title: '选择',
        dataType: 'custom' as ColumnDataType,
        accessorKey: 'select',
        isSystemColumn: true,
        isUserColumn: false,
        visible: true,
        position: 0,
        width: 50,
        features: {
          editable: false,
          sortable: false,
          filterable: false,
          resizable: false,
          pinnable: true,
          groupable: false,
          aiProcessable: false,
          exportable: false,
          searchable: false,
        },
        createdAt: now,
        updatedAt: now,
        createdBy: 'system'
      },
      {
        id: 'system_index',
        title: '序号',
        dataType: 'number' as ColumnDataType,
        accessorKey: 'index',
        isSystemColumn: true,
        isUserColumn: false,
        visible: true,
        position: 1,
        width: 60,
        features: {
          editable: false,
          sortable: false,
          filterable: false,
          resizable: false,
          pinnable: false,
          groupable: false,
          aiProcessable: false,
          exportable: true,
          searchable: false,
        },
        createdAt: now,
        updatedAt: now,
        createdBy: 'system'
      },
      {
        id: 'system_thumbnail',
        title: '缩略图',
        dataType: 'image' as ColumnDataType,
        accessorKey: 'thumbnail',
        isSystemColumn: true,
        isUserColumn: false,
        visible: true,
        position: 2,
        width: 80,
        features: {
          editable: true,
          sortable: false,
          filterable: false,
          resizable: true,
          pinnable: true,
          groupable: false,
          aiProcessable: false,
          exportable: true,
          searchable: false,
        },
        editor: { type: 'image' },
        validationRules: [{ type: 'url', message: '请输入有效的图片URL' }],
        createdAt: now,
        updatedAt: now,
        createdBy: 'system'
      },
      {
        id: 'system_title',
        title: '标题',
        dataType: 'text' as ColumnDataType,
        accessorKey: 'title',
        isSystemColumn: true,
        isUserColumn: false,
        visible: true,
        position: 3,
        minWidth: 120,
        features: DEFAULT_FEATURES,
        editor: { type: 'input', placeholder: '输入标题' },
        filterVariant: 'text',
        validationRules: [{ type: 'required', message: '标题不能为空' }],
        createdAt: now,
        updatedAt: now,
        createdBy: 'system'
      },
      {
        id: 'system_actions',
        title: '操作',
        dataType: 'custom' as ColumnDataType,
        accessorKey: 'actions',
        isSystemColumn: true,
        isUserColumn: false,
        visible: true,
        position: 999, // 最后一列
        width: 120,
        features: {
          editable: false,
          sortable: false,
          filterable: false,
          resizable: true,
          pinnable: true,
          groupable: false,
          aiProcessable: false,
          exportable: false,
          searchable: false,
        },
        createdAt: now,
        updatedAt: now,
        createdBy: 'system'
      }
    ]
  }
  
  // 批量更新列配置
  batchUpdateColumns(updates: Array<{ id: string; config: Partial<DynamicColumnConfig> }>): boolean {
    const errors: string[] = []
    
    // 先验证所有更新
    for (const update of updates) {
      const existingConfig = this.configs.get(update.id)
      if (!existingConfig) {
        errors.push(`列不存在: ${update.id}`)
        continue
      }
      
      const updatedConfig = { ...existingConfig, ...update.config }
      const validation = this.validateConfig(updatedConfig)
      if (!validation.valid) {
        errors.push(`列 ${update.id} 验证失败: ${validation.errors.join(', ')}`)
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`批量更新失败:\n${errors.join('\n')}`)
    }
    
    // 执行所有更新
    for (const update of updates) {
      this.updateColumn(update.id, update.config)
    }
    
    return true
  }
  
  // 搜索列配置
  searchColumns(query: string): DynamicColumnConfig[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllConfigs().filter(config =>
      config.title.toLowerCase().includes(lowerQuery) ||
      config.accessorKey.toLowerCase().includes(lowerQuery) ||
      config.dataType.toLowerCase().includes(lowerQuery)
    )
  }
  
  // 按类型分组配置
  groupColumnsByType(): Record<ColumnDataType, DynamicColumnConfig[]> {
    const groups: Record<string, DynamicColumnConfig[]> = {}
    
    this.getAllConfigs().forEach(config => {
      if (!groups[config.dataType]) {
        groups[config.dataType] = []
      }
      groups[config.dataType].push(config)
    })
    
    return groups as Record<ColumnDataType, DynamicColumnConfig[]>
  }
  
  // 获取统计信息
  getStats() {
    const configs = this.getAllConfigs()
    const systemColumns = configs.filter(c => c.isSystemColumn)
    const userColumns = configs.filter(c => c.isUserColumn)
    const visibleColumns = configs.filter(c => c.visible)
    
    return {
      total: configs.length,
      system: systemColumns.length,
      user: userColumns.length,
      visible: visibleColumns.length,
      hidden: configs.length - visibleColumns.length,
      byType: this.groupColumnsByType(),
    }
  }
}