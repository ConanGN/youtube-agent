'use client'

// AI提示模板管理组件
// 允许用户创建、编辑和管理自定义AI提示模板

import React, { useState, useCallback } from 'react'
import { EnhancementType } from '@/types'

interface PromptTemplate {
  id: string
  name: string
  type: EnhancementType
  systemPrompt: string
  userPrompt: string
  description: string
  variables: string[]
  isCustom: boolean
  createdAt: string
}

interface PromptTemplatesProps {
  onTemplateSelect?: (template: PromptTemplate) => void
  onClose: () => void
  className?: string
}

// 预设模板
const PRESET_TEMPLATES: PromptTemplate[] = [
  {
    id: 'optimize_title_clickbait',
    name: '点击率优化标题',
    type: 'optimize_title',
    systemPrompt: '你是一个专业的内容营销专家，擅长创建高点击率的视频标题。',
    userPrompt: `原始标题: "{title}"
视频描述: "{description}"

请创建一个更具吸引力的标题：
- 使用数字、问号或感叹号
- 创造好奇心和紧迫感
- 保持真实性，避免过度夸张
- 60字符以内

请只返回优化后的标题。`,
    description: '专注于提高点击率的标题优化模板',
    variables: ['title', 'description'],
    isCustom: false,
    createdAt: '2024-01-01'
  },
  {
    id: 'summarize_technical',
    name: '技术内容摘要',
    type: 'summarize_description',
    systemPrompt: '你是一个技术文档专家，擅长将复杂的技术内容简化为易懂的摘要。',
    userPrompt: `技术内容描述: "{description}"

请创建一个技术摘要：
- 突出核心技术要点
- 使用简洁的技术术语
- 包含关键功能和优势
- 适合技术人员阅读
- 200字以内

请只返回摘要内容。`,
    description: '专门用于技术类视频的描述摘要模板',
    variables: ['description'],
    isCustom: false,
    createdAt: '2024-01-01'
  },
  {
    id: 'translate_localized',
    name: '本地化翻译',
    type: 'translate_title',
    systemPrompt: '你是一个本地化专家，擅长将内容翻译成符合当地文化的表达方式。',
    userPrompt: `原始标题: "{title}"
目标语言: {language}
频道类型: "{channelTitle}"

请进行本地化翻译：
- 考虑当地文化和表达习惯
- 保持原意的同时增加本地化色彩
- 适合目标市场的观众
- 保持标题的吸引力

请只返回翻译后的标题。`,
    description: '考虑文化差异的本地化翻译模板',
    variables: ['title', 'language', 'channelTitle'],
    isCustom: false,
    createdAt: '2024-01-01'
  }
]

export function PromptTemplates({
  onTemplateSelect,
  onClose,
  className = ''
}: PromptTemplatesProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>(() => {
    // 从localStorage加载自定义模板
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('custom-prompt-templates')
      const customTemplates = saved ? JSON.parse(saved) : []
      return [...PRESET_TEMPLATES, ...customTemplates]
    }
    return PRESET_TEMPLATES
  })
  
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editForm, setEditForm] = useState<Partial<PromptTemplate>>({})

  // 保存自定义模板到localStorage
  const saveCustomTemplates = useCallback((allTemplates: PromptTemplate[]) => {
    const customTemplates = allTemplates.filter(t => t.isCustom)
    localStorage.setItem('custom-prompt-templates', JSON.stringify(customTemplates))
  }, [])

  // 创建新模板
  const handleCreateNew = useCallback(() => {
    setEditForm({
      name: '',
      type: 'optimize_title',
      systemPrompt: '',
      userPrompt: '',
      description: '',
      variables: [],
      isCustom: true
    })
    setIsCreating(true)
    setIsEditing(true)
  }, [])

  // 编辑模板
  const handleEdit = useCallback((template: PromptTemplate) => {
    if (!template.isCustom) {
      alert('预设模板不能编辑，请复制后修改')
      return
    }
    setEditForm({ ...template })
    setSelectedTemplate(template)
    setIsEditing(true)
    setIsCreating(false)
  }, [])

  // 复制模板
  const handleDuplicate = useCallback((template: PromptTemplate) => {
    setEditForm({
      ...template,
      id: undefined,
      name: `${template.name} (副本)`,
      isCustom: true
    })
    setIsCreating(true)
    setIsEditing(true)
  }, [])

  // 删除模板
  const handleDelete = useCallback((templateId: string) => {
    if (window.confirm('确定要删除这个模板吗？')) {
      const newTemplates = templates.filter(t => t.id !== templateId)
      setTemplates(newTemplates)
      saveCustomTemplates(newTemplates)
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null)
      }
    }
  }, [templates, selectedTemplate, saveCustomTemplates])

  // 保存模板
  const handleSave = useCallback(() => {
    if (!editForm.name || !editForm.systemPrompt || !editForm.userPrompt) {
      alert('请填写完整的模板信息')
      return
    }

    // 提取变量
    const variables = Array.from(
      new Set([
        ...(editForm.userPrompt?.match(/\{(\w+)\}/g) || []).map(v => v.slice(1, -1)),
        ...(editForm.systemPrompt?.match(/\{(\w+)\}/g) || []).map(v => v.slice(1, -1))
      ])
    )

    const template: PromptTemplate = {
      id: editForm.id || `custom_${Date.now()}`,
      name: editForm.name!,
      type: editForm.type!,
      systemPrompt: editForm.systemPrompt!,
      userPrompt: editForm.userPrompt!,
      description: editForm.description || '',
      variables,
      isCustom: true,
      createdAt: editForm.createdAt || new Date().toISOString()
    }

    let newTemplates
    if (isCreating) {
      newTemplates = [...templates, template]
    } else {
      newTemplates = templates.map(t => t.id === template.id ? template : t)
    }

    setTemplates(newTemplates)
    saveCustomTemplates(newTemplates)
    setIsEditing(false)
    setIsCreating(false)
    setSelectedTemplate(template)
  }, [editForm, templates, isCreating, saveCustomTemplates])

  // 取消编辑
  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setIsCreating(false)
    setEditForm({})
  }, [])

  // 选择模板
  const handleSelectTemplate = useCallback((template: PromptTemplate) => {
    onTemplateSelect?.(template)
    onClose()
  }, [onTemplateSelect, onClose])

  const enhancementTypeNames: Record<EnhancementType, string> = {
    'optimize_title': '标题优化',
    'summarize_description': '描述摘要',
    'translate_title': '标题翻译',
    'extract_keywords': '关键词提取'
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">提示模板管理</h2>
            <p className="text-sm text-gray-500 mt-1">
              管理和自定义AI增强提示模板
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex h-[calc(90vh-100px)]">
          {/* 左侧模板列表 */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <button
                onClick={handleCreateNew}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <span>+</span>
                <span>创建新模板</span>
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedTemplate?.id === template.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {enhancementTypeNames[template.type]}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      {template.isCustom && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded">
                          自定义
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧详情/编辑区域 */}
          <div className="flex-1 overflow-y-auto">
            {isEditing ? (
              <div className="p-6 space-y-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {isCreating ? '创建新模板' : '编辑模板'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模板名称
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="输入模板名称"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      增强类型
                    </label>
                    <select
                      value={editForm.type || 'optimize_title'}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value as EnhancementType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(enhancementTypeNames).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      描述
                    </label>
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="简要描述这个模板的用途"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      系统提示
                    </label>
                    <textarea
                      value={editForm.systemPrompt || ''}
                      onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="定义AI的角色和背景..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      用户提示
                    </label>
                    <textarea
                      value={editForm.userPrompt || ''}
                      onChange={(e) => setEditForm({ ...editForm, userPrompt: e.target.value })}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="具体的任务指令，可以使用 {title}、{description} 等变量..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      可用变量: title, description, channelTitle, language
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    保存模板
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : selectedTemplate ? (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {enhancementTypeNames[selectedTemplate.type]}
                    </p>
                    {selectedTemplate.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {selectedTemplate.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDuplicate(selectedTemplate)}
                      className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      复制
                    </button>
                    {selectedTemplate.isCustom && (
                      <>
                        <button
                          onClick={() => handleEdit(selectedTemplate)}
                          className="px-3 py-1 text-sm text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(selectedTemplate.id)}
                          className="px-3 py-1 text-sm text-red-600 bg-red-100 rounded hover:bg-red-200"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">系统提示</h4>
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-800">
                      {selectedTemplate.systemPrompt}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">用户提示</h4>
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedTemplate.userPrompt}
                    </div>
                  </div>

                  {selectedTemplate.variables.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">使用的变量</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.variables.map((variable) => (
                          <span
                            key={variable}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded"
                          >
                            {variable}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleSelectTemplate(selectedTemplate)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    使用此模板
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-4">📝</div>
                  <p>选择一个模板查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}