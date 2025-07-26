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

// 抽屉props接口
export interface AIPromptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: AIBatchConfig) => void;
  columnId: string;
  columnName: string;
  dataCount: number;
  sampleData: string[];
}

// AI批处理配置接口
export interface AIBatchConfig {
  model: string;
  promptTemplate: string;
  maxConcurrency: number;
  dryRun: boolean;
}

// 支持的模型列表
const AVAILABLE_MODELS = [
  { value: 'anthropic:claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet (推荐)' },
  { value: 'anthropic:claude-3-haiku-20240307', label: 'Claude 3 Haiku (经济型)' },
  { value: 'anthropic:claude-3-opus-20240229', label: 'Claude 3 Opus (高性能)' },
];

export default function AIPromptDrawer({
  isOpen,
  onClose,
  onSubmit,
  columnId,
  columnName,
  dataCount,
  sampleData,
}: AIPromptDrawerProps) {
  // 状态管理
  const [model, setModel] = useState(AVAILABLE_MODELS[0].value);
  const [promptTemplate, setPromptTemplate] = useState('');
  const [maxConcurrency, setMaxConcurrency] = useState(3);
  const [dryRun, setDryRun] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div>
            <h2 className="text-xl font-semibold">AI 批量处理</h2>
            <p className="text-blue-100 mt-1">
              对 "{columnName}" 列的 {dataCount} 条数据进行批量AI处理
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
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
                {promptTemplate && (
                  <div className="mt-2">
                    {templateValidation.isValid ? (
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
                        {templateValidation.error || '请输入模板'}
                      </div>
                    )}
                  </div>
                )}
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
              
              {/* 试运行选项 */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    仅估算费用（不执行实际处理）
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  开启后只会显示费用估算，不会调用AI接口
                </p>
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
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            将处理 {dataCount} 条数据，生成新列：{columnId}_ai_{Date.now().toString().slice(-6)}
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {dryRun ? '估算费用' : '开始处理'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}