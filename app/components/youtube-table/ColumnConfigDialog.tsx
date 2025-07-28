'use client'

// 列配置弹窗组件
// 提供详细的列配置编辑功能

import React, { useState, useEffect } from 'react'
import { X, Save, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { 
  DynamicColumnConfig, 
  ColumnDataType, 
  ColumnFeatures,
  ValidationRule,
  ColumnFormatter,
  EditorConfig,
  COLUMN_TEMPLATES,
  VALIDATION_TEMPLATES,
  FORMATTER_TEMPLATES
} from '@/types'

// 弹窗Props
export interface ColumnConfigDialogProps {
  isOpen: boolean
  onClose: () => void
  config?: DynamicColumnConfig | null
  onSave: (config: Partial<DynamicColumnConfig>) => void
  isEdit?: boolean
}

// 数据类型选项
const DATA_TYPE_OPTIONS: Array<{ value: ColumnDataType; label: string; description: string }> = [
  { value: 'text', label: '文本', description: '单行文本输入' },
  { value: 'longtext', label: '长文本', description: '多行文本输入' },
  { value: 'number', label: '数值', description: '数字输入，支持范围筛选' },
  { value: 'date', label: '日期', description: '日期选择器' },
  { value: 'boolean', label: '布尔值', description: '是/否选择' },
  { value: 'url', label: 'URL', description: '网址链接' },
  { value: 'image', label: '图片', description: '图片URL，带预览' },
  { value: 'json', label: 'JSON', description: 'JSON数据编辑' },
  { value: 'enum', label: '枚举', description: '固定选项选择' },
]

// 筛选器类型选项
const FILTER_TYPE_OPTIONS = [
  { value: 'text', label: '文本搜索' },
  { value: 'range', label: '范围筛选' },
  { value: 'select', label: '选择筛选' },
  { value: 'date', label: '日期筛选' },
  { value: 'boolean', label: '布尔筛选' },
]

export function ColumnConfigDialog({ 
  isOpen, 
  onClose, 
  config, 
  onSave, 
  isEdit = false 
}: ColumnConfigDialogProps) {
  // 表单状态
  const [formData, setFormData] = useState<Partial<DynamicColumnConfig>>({
    title: '',
    accessorKey: '',
    dataType: 'text',
    visible: true,
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
    },
    editor: { type: 'input' },
    validationRules: [],
    width: 150,
  })

  const [currentTab, setCurrentTab] = useState<'basic' | 'features' | 'validation' | 'format'>('basic')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (config && isEdit) {
        setFormData(config)
      } else {
        // 新建列时使用默认配置
        setFormData({
          title: '',
          accessorKey: '',
          dataType: 'text',
          visible: true,
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
          },
          editor: { type: 'input' },
          validationRules: [],
          width: 150,
        })
      }
      setCurrentTab('basic')
      setErrors({})
    }
  }, [isOpen, config, isEdit])

  // 表单验证
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.title?.trim()) {
      newErrors.title = '列标题不能为空'
    }

    if (!formData.accessorKey?.trim()) {
      newErrors.accessorKey = '访问键不能为空'
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.accessorKey)) {
      newErrors.accessorKey = '访问键只能包含字母、数字和下划线，且不能以数字开头'
    }

    if (formData.width && formData.width < 50) {
      newErrors.width = '列宽度不能小于50px'
    }

    if (formData.minWidth && formData.minWidth < 50) {
      newErrors.minWidth = '最小宽度不能小于50px'
    }

    if (formData.minWidth && formData.maxWidth && formData.minWidth > formData.maxWidth) {
      newErrors.width = '最小宽度不能大于最大宽度'
    }

    setErrors(newErrors)
    setIsValid(Object.keys(newErrors).length === 0)
  }, [formData])

  // 更新表单数据
  const updateFormData = (updates: Partial<DynamicColumnConfig>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  // 更新功能特性
  const updateFeatures = (featureUpdates: Partial<ColumnFeatures>) => {
    setFormData(prev => ({
      ...prev,
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
        ...prev.features,
        ...featureUpdates 
      } as ColumnFeatures
    }))
  }

  // 添加验证规则
  const addValidationRule = () => {
    const newRule: ValidationRule = {
      type: 'required',
      message: '此字段为必填项'
    }
    setFormData(prev => ({
      ...prev,
      validationRules: [...(prev.validationRules || []), newRule]
    }))
  }

  // 更新验证规则
  const updateValidationRule = (index: number, rule: ValidationRule) => {
    setFormData(prev => ({
      ...prev,
      validationRules: prev.validationRules?.map((r, i) => i === index ? rule : r) || []
    }))
  }

  // 删除验证规则
  const removeValidationRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      validationRules: prev.validationRules?.filter((_, i) => i !== index) || []
    }))
  }

  // 根据数据类型自动设置编辑器和筛选器
  useEffect(() => {
    if (formData.dataType) {
      const template = COLUMN_TEMPLATES.find(t => t.config.dataType === formData.dataType)
      if (template && !isEdit) {
        setFormData(prev => ({
          ...prev,
          editor: template.config.editor,
          filterVariant: template.config.filterVariant,
          formatter: template.config.formatter,
          validationRules: template.config.validationRules,
        }))
      }
    }
  }, [formData.dataType, isEdit])

  // 保存配置
  const handleSave = () => {
    if (!isValid) return

    const finalConfig: Partial<DynamicColumnConfig> = {
      ...formData,
      isUserColumn: !isEdit || !config?.isSystemColumn,
      isSystemColumn: isEdit && config?.isSystemColumn,
    }

    onSave(finalConfig)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        {/* 弹窗内容 */}
        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
          {/* 弹窗头部 */}
          <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <span className="mr-2">🔧</span>
                {isEdit ? '编辑列配置' : '新建列'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 标签页导航 */}
            <div className="mt-4 flex space-x-4 border-b border-gray-200">
              {[
                { id: 'basic', label: '基础设置', icon: '⚙️' },
                { id: 'features', label: '功能特性', icon: '🔧' },
                { id: 'validation', label: '验证规则', icon: '✅' },
                { id: 'format', label: '格式化', icon: '📝' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                    currentTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-1">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 弹窗内容区域 */}
          <div className="flex-1 bg-white px-6 py-4 overflow-y-auto min-h-0">
            {/* 基础设置标签页 */}
            {currentTab === 'basic' && (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      列标题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => updateFormData({ title: e.target.value })}
                      className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="输入列标题"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      访问键 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.accessorKey || ''}
                      onChange={(e) => updateFormData({ accessorKey: e.target.value })}
                      className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.accessorKey ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="column_key"
                      disabled={isEdit && config?.isSystemColumn}
                    />
                    {errors.accessorKey && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.accessorKey}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      数据访问的字段名，用于获取和设置列数据
                    </p>
                  </div>
                </div>

                {/* 数据类型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    数据类型
                  </label>
                  <select
                    value={formData.dataType || 'text'}
                    onChange={(e) => updateFormData({ dataType: e.target.value as ColumnDataType })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isEdit && config?.isSystemColumn}
                  >
                    {DATA_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 尺寸设置 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      列宽度 (px)
                    </label>
                    <input
                      type="number"
                      value={formData.width || ''}
                      onChange={(e) => updateFormData({ width: parseInt(e.target.value) || undefined })}
                      className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.width ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="150"
                      min="50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最小宽度 (px)
                    </label>
                    <input
                      type="number"
                      value={formData.minWidth || ''}
                      onChange={(e) => updateFormData({ minWidth: parseInt(e.target.value) || undefined })}
                      className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.minWidth ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="50"
                      min="50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大宽度 (px)
                    </label>
                    <input
                      type="number"
                      value={formData.maxWidth || ''}
                      onChange={(e) => updateFormData({ maxWidth: parseInt(e.target.value) || undefined })}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="800"
                      min="50"
                    />
                  </div>
                </div>

                {/* 筛选器类型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    筛选器类型
                  </label>
                  <select
                    value={formData.filterVariant || 'text'}
                    onChange={(e) => updateFormData({ filterVariant: e.target.value as any })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {FILTER_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 功能特性标签页 */}
            {currentTab === 'features' && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">功能特性说明</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        这些设置控制列的各种功能，如编辑、排序、筛选等。系统列的某些功能可能受到限制。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'editable', label: '可编辑', description: '允许用户编辑单元格内容' },
                    { key: 'sortable', label: '可排序', description: '允许按此列排序' },
                    { key: 'filterable', label: '可筛选', description: '允许对此列进行筛选' },
                    { key: 'resizable', label: '可调整大小', description: '允许用户拖拽调整列宽' },
                    { key: 'pinnable', label: '可固定', description: '允许将列固定在左侧或右侧' },
                    { key: 'groupable', label: '可分组', description: '允许按此列进行分组' },
                    { key: 'aiProcessable', label: 'AI处理', description: '允许对此列进行AI批处理' },
                    { key: 'exportable', label: '可导出', description: '导出数据时包含此列' },
                    { key: 'searchable', label: '可搜索', description: '全局搜索时包含此列' },
                  ].map((feature) => (
                    <label key={feature.key} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.features?.[feature.key as keyof ColumnFeatures] || false}
                        onChange={(e) => updateFeatures({ [feature.key]: e.target.checked })}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={isEdit && config?.isSystemColumn && ['editable'].includes(feature.key)}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{feature.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{feature.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 验证规则标签页 */}
            {currentTab === 'validation' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900">验证规则</h4>
                  <button
                    onClick={addValidationRule}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                  >
                    添加规则
                  </button>
                </div>

                {formData.validationRules && formData.validationRules.length > 0 ? (
                  <div className="space-y-4">
                    {formData.validationRules.map((rule, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-md">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-medium text-gray-900">规则 {index + 1}</h5>
                          <button
                            onClick={() => removeValidationRule(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              验证类型
                            </label>
                            <select
                              value={rule.type}
                              onChange={(e) => updateValidationRule(index, { ...rule, type: e.target.value as any })}
                              className="w-full p-2 border border-gray-300 rounded-md"
                            >
                              <option value="required">必填</option>
                              <option value="min">最小值/长度</option>
                              <option value="max">最大值/长度</option>
                              <option value="pattern">正则表达式</option>
                              <option value="url">URL格式</option>
                              <option value="email">邮箱格式</option>
                              <option value="date">日期格式</option>
                            </select>
                          </div>

                          {(rule.type === 'min' || rule.type === 'max' || rule.type === 'pattern') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {rule.type === 'pattern' ? '正则表达式' : '值'}
                              </label>
                              <input
                                type={rule.type === 'pattern' ? 'text' : 'number'}
                                value={rule.value || ''}
                                onChange={(e) => updateValidationRule(index, { 
                                  ...rule, 
                                  value: rule.type === 'pattern' ? e.target.value : parseFloat(e.target.value) 
                                })}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholder={rule.type === 'pattern' ? '^[a-zA-Z]+$' : '0'}
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              错误消息
                            </label>
                            <input
                              type="text"
                              value={rule.message}
                              onChange={(e) => updateValidationRule(index, { ...rule, message: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              placeholder="请输入错误消息"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>暂无验证规则</p>
                    <p className="text-sm">点击"添加规则"按钮添加验证规则</p>
                  </div>
                )}
              </div>
            )}

            {/* 格式化标签页 */}
            {currentTab === 'format' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 p-4 rounded-md">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-900">格式化设置</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        这些设置控制数据在表格中的显示格式。不同的数据类型支持不同的格式化选项。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      格式化类型
                    </label>
                    <select
                      value={formData.formatter?.type || 'text'}
                      onChange={(e) => updateFormData({ 
                        formatter: { 
                          type: e.target.value as any,
                          options: formData.formatter?.options || {}
                        } 
                      })}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="text">文本</option>
                      <option value="number">数值</option>
                      <option value="compact">紧凑数值</option>
                      <option value="percentage">百分比</option>
                      <option value="currency">货币</option>
                      <option value="date">日期</option>
                      <option value="boolean">布尔值</option>
                    </select>
                  </div>

                  {/* 根据格式化类型显示不同的选项 */}
                  {formData.formatter?.type === 'currency' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        货币类型
                      </label>
                      <select
                        value={formData.formatter?.options?.currency || 'CNY'}
                        onChange={(e) => updateFormData({ 
                          formatter: { 
                            type: 'currency',
                            ...formData.formatter, 
                            options: { ...formData.formatter?.options, currency: e.target.value }
                          } 
                        })}
                        className="w-full p-3 border border-gray-300 rounded-md"
                      >
                        <option value="CNY">人民币 (CNY)</option>
                        <option value="USD">美元 (USD)</option>
                        <option value="EUR">欧元 (EUR)</option>
                        <option value="JPY">日元 (JPY)</option>
                      </select>
                    </div>
                  )}

                  {formData.formatter?.type === 'date' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        日期格式
                      </label>
                      <select
                        value={formData.formatter?.options?.dateStyle || 'short'}
                        onChange={(e) => updateFormData({ 
                          formatter: { 
                            type: 'date',
                            ...formData.formatter, 
                            options: { ...formData.formatter?.options, dateStyle: e.target.value as 'short' | 'medium' | 'long' | 'full' }
                          } 
                        })}
                        className="w-full p-3 border border-gray-300 rounded-md"
                      >
                        <option value="short">短格式 (2025/1/27)</option>
                        <option value="medium">中等格式 (2025年1月27日)</option>
                        <option value="long">长格式 (2025年1月27日星期一)</option>
                        <option value="full">完整格式 (2025年1月27日星期一)</option>
                      </select>
                    </div>
                  )}

                  {formData.formatter?.type === 'boolean' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          True 显示文本
                        </label>
                        <input
                          type="text"
                          value={formData.formatter?.options?.trueText || '是'}
                          onChange={(e) => updateFormData({ 
                            formatter: { 
                              type: 'boolean',
                              ...formData.formatter, 
                              options: { ...formData.formatter?.options, trueText: e.target.value }
                            } 
                          })}
                          className="w-full p-3 border border-gray-300 rounded-md"
                          placeholder="是"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          False 显示文本
                        </label>
                        <input
                          type="text"
                          value={formData.formatter?.options?.falseText || '否'}
                          onChange={(e) => updateFormData({ 
                            formatter: { 
                              ...formData.formatter,
                              type: formData.formatter?.type || 'boolean',
                              options: { ...formData.formatter?.options, falseText: e.target.value }
                            } 
                          })}
                          className="w-full p-3 border border-gray-300 rounded-md"
                          placeholder="否"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 弹窗底部 */}
          <div className="flex-shrink-0 bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row-reverse gap-3 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={!isValid}
              className={`w-full sm:w-auto inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isValid
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? '保存更改' : '创建列'}
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}