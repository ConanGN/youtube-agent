'use client';

import React, { useState, useEffect } from 'react';
import { X, Play, Calculator, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { 
  validateTemplate, 
  getAllPresetTemplates, 
  getPresetTemplate,
  type PresetTemplate 
} from '@/lib/ai/prompt';
import { 
  estimateTokenCost, 
  formatCost, 
  getModelDisplayName,
  MODEL_PRICING 
} from '@/lib/ai/limits';
import { OPENROUTER_MODELS } from '@/lib/ai/config';

// 抽屉props接口
export interface AIPromptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: AIBatchConfig) => void;
  columnId: string;
  columnName: string;
  dataCount: number;
  sampleData: string[];
  // 新增：选中行相关信息
  selectedRowCount?: number;
  filteredRowCount?: number;
  totalRowCount?: number;
  processingScope?: 'selected' | 'filtered' | 'all';
}

// AI批处理配置接口
export interface AIBatchConfig {
  model: string;
  promptTemplate: string;
  maxConcurrency: number;
  dryRun: boolean;
  // 新增：写入目标选项
  writeTarget: 'virtual' | 'overwrite' | 'append';
  processingScope?: 'selected' | 'filtered' | 'all';
}

// 从OpenRouter配置生成可用模型列表
const AVAILABLE_MODELS = Object.entries(OPENROUTER_MODELS).map(([value, label]) => ({
  value,
  label,
}));

export default function AIPromptDrawer({
  isOpen,
  onClose,
  onSubmit,
  columnId,
  columnName,
  dataCount,
  sampleData,
  selectedRowCount = 0,
  filteredRowCount,
  totalRowCount,
  processingScope = 'all',
}: AIPromptDrawerProps) {
  // 状态管理
  const [model, setModel] = useState(AVAILABLE_MODELS[0].value);
  const [promptTemplate, setPromptTemplate] = useState('');
  const [maxConcurrency, setMaxConcurrency] = useState(3);
  const [dryRun, setDryRun] = useState(false); // 默认执行实际处理
  const [selectedPreset, setSelectedPreset] = useState<string>('summary'); // 默认选择摘要模板
  // 新增：写入目标选择
  const [writeTarget, setWriteTarget] = useState<'virtual' | 'overwrite' | 'append'>('virtual');

  // 初始化时设置默认模板
  React.useEffect(() => {
    if (!promptTemplate && selectedPreset && selectedPreset !== 'custom') {
      const template = getPresetTemplate(selectedPreset as PresetTemplate);
      setPromptTemplate(template);
    }
  }, [selectedPreset, promptTemplate]);
  
  // 验证和估算状态
  const [templateValidation, setTemplateValidation] = useState<{
    isValid: boolean;
    error?: string;
    variables: string[];
  }>({ isValid: false, variables: [] });
  const [costEstimate, setCostEstimate] = useState<{
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    currency: string;
  } | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  
  // 获取预设模板
  const presetTemplates = getAllPresetTemplates();
  
  // 验证模板
  useEffect(() => {
    if (promptTemplate) {
      const validation = validateTemplate(promptTemplate);
      setTemplateValidation(validation);
      
      // 如果模板有效，计算费用估算
      if (validation.isValid && sampleData.length > 0) {
        setIsEstimating(true);
        try {
          const estimate = estimateTokenCost(sampleData, model, promptTemplate);
          setCostEstimate(estimate);
        } catch (error) {
          console.error('费用估算失败:', error);
          setCostEstimate(null);
        }
        setIsEstimating(false);
      } else {
        setCostEstimate(null);
      }
    } else {
      setTemplateValidation({ isValid: false, variables: [] });
      setCostEstimate(null);
    }
  }, [promptTemplate, model, sampleData]);
  
  // 处理预设模板选择
  const handlePresetSelect = (preset: string) => {
    if (preset && preset !== 'custom') {
      const template = getPresetTemplate(preset as PresetTemplate);
      setPromptTemplate(template);
      setSelectedPreset(preset);
    } else {
      setSelectedPreset('custom');
    }
  };
  
  // 处理提交
  const handleSubmit = () => {
    if (!templateValidation.isValid) {
      return;
    }
    
    onSubmit({
      model,
      promptTemplate,
      maxConcurrency,
      dryRun,
      writeTarget,
      processingScope,
    });
  };
  
  // 模态框遮罩处理
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold">AI 批量处理</h2>
            <p className="text-blue-100 mt-1">
              对 "{columnName}" 列的 {dataCount} 条数据进行批量AI处理
              {processingScope === 'selected' && selectedRowCount > 0 && (
                <span className="ml-2 text-yellow-200">({selectedRowCount} 行已选中)</span>
              )}
              {processingScope === 'filtered' && filteredRowCount && (
                <span className="ml-2 text-yellow-200">({filteredRowCount} 行筛选结果)</span>
              )}
              {processingScope === 'all' && totalRowCount && (
                <span className="ml-2 text-yellow-200">(全表 {totalRowCount} 行)</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：配置选项 */}
            <div className="space-y-6">
              {/* 模型选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI 模型
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  定价: 输入 {formatCost(MODEL_PRICING[model as keyof typeof MODEL_PRICING]?.input || 0)}/1K tokens, 
                  输出 {formatCost(MODEL_PRICING[model as keyof typeof MODEL_PRICING]?.output || 0)}/1K tokens
                </p>
              </div>
              
              {/* 预设模板 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预设模板
                </label>
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">选择预设模板...</option>
                  {presetTemplates.map((preset) => (
                    <option key={preset.key} value={preset.key}>
                      {preset.name}
                    </option>
                  ))}
                  <option value="custom">自定义模板</option>
                </select>
              </div>
              
              {/* 提示词模板 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  提示词模板
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={promptTemplate}
                  onChange={(e) => {
                    setPromptTemplate(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  placeholder="请输入提示词模板，使用 {{content}} 代表单元格内容..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
                />
                
                {/* 模板验证状态 */}
                <div className="mt-2">
                  {promptTemplate ? (
                    templateValidation.isValid ? (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        模板格式正确
                        {templateValidation.variables.length > 0 && (
                          <span className="ml-2 text-gray-500">
                            变量: {templateValidation.variables.join(', ')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {templateValidation.error || '模板格式无效'}
                      </div>
                    )
                  ) : (
                    <div className="flex items-center text-orange-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      请输入提示词模板才能开始处理
                    </div>
                  )}
                </div>
              </div>
              
              {/* 并发设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大并发数
                </label>
                <select
                  value={maxConcurrency}
                  onChange={(e) => setMaxConcurrency(parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num} 个并发请求
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  较高的并发数可以加快处理速度，但可能增加API限流风险
                </p>
              </div>
              
              {/* 写入目标选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  写入目标
                </label>
                <select
                  value={writeTarget}
                  onChange={(e) => setWriteTarget(e.target.value as 'virtual' | 'overwrite' | 'append')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="virtual">虚拟列（草稿模式，默认）</option>
                  <option value="overwrite">覆盖原列（带版本备份）</option>
                  <option value="append">追加到原列（分隔符拼接）</option>
                </select>
                <div className="text-xs text-gray-500 mt-1">
                  {writeTarget === 'virtual' && '创建虚拟列草稿，不修改原数据，可逐行接受或全部提交'}
                  {writeTarget === 'overwrite' && '先备份到版本表，然后覆盖原列数据，支持回滚'}
                  {writeTarget === 'append' && '在原列内容后面用分隔符追加AI结果，保留原内容'}
                </div>
              </div>

              {/* 执行模式选择 */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    仅估算费用（不执行实际AI处理）
                  </span>
                </label>
                <div className="mt-2 ml-7 text-xs">
                  {dryRun ? (
                    <div className="text-orange-600">
                      ⚠️ 当前为预览模式，点击"估算费用"只会计算成本，不会实际调用AI
                    </div>
                  ) : (
                    <div className="text-green-600">
                      ✅ 当前为执行模式，点击"开始处理"将实际调用AI进行批量处理
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 右侧：预览和估算 */}
            <div className="space-y-6">
              {/* 数据预览 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Info className="w-4 h-4 mr-1" />
                  数据预览 (前3条)
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {sampleData.slice(0, 3).map((sample, index) => (
                    <div key={index} className="bg-white p-2 rounded border text-sm">
                      <div className="text-gray-500 text-xs mb-1">第 {index + 1} 条:</div>
                      <div className="text-gray-800 line-clamp-3">
                        {sample.length > 150 ? `${sample.slice(0, 150)}...` : sample}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 费用估算 */}
              {templateValidation.isValid && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Calculator className="w-4 h-4 mr-1" />
                    费用估算
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    {isEstimating ? (
                      <div className="text-blue-600">正在计算...</div>
                    ) : costEstimate ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">输入 Tokens:</span>
                          <span className="font-medium">{costEstimate.inputTokens.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">预估输出 Tokens:</span>
                          <span className="font-medium">{costEstimate.outputTokens.toLocaleString()}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between text-base font-semibold text-blue-700">
                          <span>预估总费用:</span>
                          <span>{formatCost(costEstimate.totalCost)}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          * 实际费用可能因输出长度不同而有所差异
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">请完善配置后查看费用估算</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 模板示例渲染 */}
              {templateValidation.isValid && sampleData.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    模板预览 (第1条数据)
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="text-gray-500 text-xs mb-1">渲染后的提示词:</div>
                    <div className="bg-white p-2 rounded border font-mono text-xs overflow-x-auto">
                      {promptTemplate.replace('{{content}}', sampleData[0] || '(无数据)')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-500">
            {writeTarget === 'virtual' && `将处理 ${dataCount} 条数据，生成草稿列：${columnId}_ai_draft_${Date.now().toString().slice(-6)}`}
            {writeTarget === 'overwrite' && `将处理 ${dataCount} 条数据，覆盖列"${columnName}"（原数据将备份）`}
            {writeTarget === 'append' && `将处理 ${dataCount} 条数据，追加到列"${columnName}"`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!templateValidation.isValid}
              className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium ${
                templateValidation.isValid
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  : 'bg-gray-400 text-gray-100 cursor-not-allowed border-2 border-gray-300'
              }`}
              title={!templateValidation.isValid ? '请先输入有效的提示词模板' : ''}
            >
              <Play className={`w-4 h-4 ${!templateValidation.isValid ? 'text-gray-200' : ''}`} />
              {dryRun ? '估算费用' : '开始处理'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}