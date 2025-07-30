'use client';

import React, { useState, useEffect } from 'react';
import { X, Play, Calculator, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
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
import { SILICONFLOW_MODELS } from '@/lib/ai/config';

// 列信息接口
export interface ColumnInfo {
  id: string;
  title: string;
  subtitle?: string; // 用户自定义副标题
  dataType: string;
  isSystemColumn: boolean;
  accessorKey: string; // 实际的数据字段名
}

// 行数据接口
export interface RowData {
  rowId: string;
  rowIndex: number;
  data: Record<string, any>;
}

// 抽屉props接口
export interface AIPromptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: AIBatchConfig) => void;
  columnId: string;        // 目标列（写入结果的列）
  columnName: string;
  dataCount: number;
  sampleData: string[];    // 保持兼容性，后续会被替代
  
  // 新增：数据源列选择功能
  availableColumns: ColumnInfo[];  // 可选择的数据源列
  selectedRows: RowData[];         // 选中的行数据
  
  // 现有：选中行相关信息
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
  // 新增：数据源列ID
  sourceColumnId: string;
  // 新增：预提取的数据（确保预览和处理使用相同数据）
  extractedData?: Array<{
    rowId: string;
    content: string;
  }>;
}

// 从SiliconFlow配置生成可用模型列表
const AVAILABLE_MODELS = Object.entries(SILICONFLOW_MODELS).map(([value, label]) => ({
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
  // 新增属性
  availableColumns = [],
  selectedRows = [],
  // 现有属性
  selectedRowCount = 0,
  filteredRowCount,
  totalRowCount,
  processingScope = 'all',
}: AIPromptDrawerProps) {
  
  // 调试：仅在首次打开时输出关键信息
  React.useEffect(() => {
    if (isOpen && process.env.NODE_ENV === 'development') {
      // AI提示抽屉已打开，准备处理批量任务
    }
  }, [isOpen]); // 只在isOpen变化时执行，避免重复输出
  // 状态管理
  const [model, setModel] = useState(AVAILABLE_MODELS[0].value);
  const [promptTemplate, setPromptTemplate] = useState('');
  const [maxConcurrency, setMaxConcurrency] = useState(3);
  const [dryRun, setDryRun] = useState(false); // 默认执行实际处理
  const [selectedPreset, setSelectedPreset] = useState<string>('summary'); // 默认选择摘要模板
  // 新增：写入目标选择 - 修改：固定为覆盖当前列模式
  const [writeTarget, setWriteTarget] = useState<'virtual' | 'overwrite' | 'append'>('overwrite');
  // 新增：数据源列选择状态，默认为目标列（保持向后兼容）
  const [sourceColumnId, setSourceColumnId] = useState<string>(columnId);
  
  // 新增：预览数据状态
  const [previewData, setPreviewData] = useState<Array<{
    rowId: string;
    rowIndex: number;
    content: string;
    isEmpty: boolean;
  }>>([]);

  // 当目标列改变时，同步更新数据源列（保持向后兼容）
  React.useEffect(() => {
    setSourceColumnId(columnId);
  }, [columnId]);

  // 统一的数据提取函数（供预览和实际处理使用） - 修复：精确的数据提取逻辑
  const extractDataFromRow = React.useCallback((rowData: any, columnId: string) => {
    // 首先查找对应的列配置以获取accessorKey
    const columnConfig = availableColumns.find(col => col.id === columnId);
    
    // 构建尝试的键列表（按优先级排序）- 修复aggressive fallback问题
    const keysToTry = [];
    
    // 1. 优先使用列配置中的accessorKey（如果存在且明确定义）
    if (columnConfig && columnConfig.accessorKey) {
      keysToTry.push(columnConfig.accessorKey);
      
      // 如果有明确的accessorKey，就不要进行过度的fallback
      // 只有当accessorKey确实无效时，才尝试columnId
      if (columnConfig.accessorKey !== columnId) {
        keysToTry.push(columnId);
      }
    } else {
      // 2. 没有accessorKey时，直接使用columnId
      keysToTry.push(columnId);
      
      // 3. 只对系统基础列进行智能映射，不对用户自定义列进行aggressive fallback
      if (columnConfig && !columnId.includes('col_')) {
        const titleMappings: Record<string, string[]> = {
          '描述': ['description', 'desc', 'content', 'text', 'body'],
          '标题': ['title', 'name', 'heading', 'subject'],
          '缩略图': ['thumbnail', 'image', 'img', 'picture', 'photo'],
          '频道': ['channelTitle', 'channel', 'channelName'],
          '发布时间': ['publishedAt', 'published', 'date', 'publishTime'],
          '观看数': ['viewCount', 'views', 'count', 'playCount']
        };
        
        if (titleMappings[columnConfig.title]) {
          keysToTry.push(...titleMappings[columnConfig.title]);
        }
      }
      
      // 4. 如果columnId包含系统前缀，尝试去掉前缀（仅限系统列）
      if (columnId.startsWith('system_')) {
        keysToTry.push(columnId.replace('system_', ''));
      }
    }
    
    // 去重并尝试每个可能的key
    const uniqueKeys = Array.from(new Set(keysToTry));
    
    for (const key of uniqueKeys) {
      if (rowData && rowData[key] !== undefined && rowData[key] !== null) {
        const content = String(rowData[key] || '');
        return content;
      }
    }
    
    return '';
  }, [availableColumns]);

  // 移除了calculatePreviewData函数，逻辑已直接整合到useEffect中

  // 监听数据源列和选中行变化，更新预览数据
  // 优化：直接在useEffect内部定义数据提取逻辑，避免函数引用依赖
  React.useEffect(() => {
    if (!sourceColumnId || !selectedRows.length) {
      setPreviewData([]);
      return;
    }
    
    const newPreviewData = selectedRows.map((row) => {
      // 直接在这里定义数据提取逻辑，避免函数引用依赖
      const columnConfig = availableColumns.find(col => col.id === sourceColumnId);
      
      // 构建尝试的键列表 - 修复：更精确的数据提取逻辑
      const keysToTry = [];
      
      // 1. 优先使用列配置中的accessorKey（如果存在且明确定义）
      if (columnConfig && columnConfig.accessorKey) {
        keysToTry.push(columnConfig.accessorKey);
        
        // 如果有明确的accessorKey，就不要进行过度的fallback
        // 只有当accessorKey确实无效时，才尝试columnId
        if (columnConfig.accessorKey !== sourceColumnId) {
          keysToTry.push(sourceColumnId);
        }
      } else {
        // 2. 没有accessorKey时，直接使用columnId
        keysToTry.push(sourceColumnId);
        
        // 3. 只对系统基础列进行智能映射，不对用户自定义列进行aggressive fallback
        if (columnConfig && !sourceColumnId.includes('col_')) {
          const titleMappings: Record<string, string[]> = {
            '描述': ['description', 'desc', 'content', 'text', 'body'],
            '标题': ['title', 'name', 'heading', 'subject'],
            '缩略图': ['thumbnail', 'image', 'img', 'picture', 'photo'],
            '频道': ['channelTitle', 'channel', 'channelName'],
            '发布时间': ['publishedAt', 'published', 'date', 'publishTime'],
            '观看数': ['viewCount', 'views', 'count', 'playCount']
          };
          
          if (titleMappings[columnConfig.title]) {
            keysToTry.push(...titleMappings[columnConfig.title]);
          }
        }
      }
      
      // 去重并尝试每个可能的key
      const uniqueKeys = Array.from(new Set(keysToTry));
      let content = '';
      
      for (const key of uniqueKeys) {
        if (row.data && row.data[key] !== undefined && row.data[key] !== null) {
          content = String(row.data[key] || '');
          break;
        }
      }
      
      // 移除了频繁的DEBUG日志输出以优化控制台性能
      
      return {
        rowId: row.rowId,
        rowIndex: row.rowIndex,
        content: content,
        isEmpty: !content || content.trim() === ''
      };
    });
    
    setPreviewData(newPreviewData);
  }, [sourceColumnId, selectedRows, availableColumns]); // 只依赖真实的数据，不依赖函数引用

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
      const validPreviewData = previewData.filter(item => !item.isEmpty);
      if (validation.isValid && validPreviewData.length > 0) {
        setIsEstimating(true);
        try {
          const sampleContents = validPreviewData.map(item => item.content);
          const estimate = estimateTokenCost(sampleContents, model, promptTemplate);
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
  }, [promptTemplate, model, previewData]);
  
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
    
    // 将预览数据转换为提取数据格式，确保预览和处理使用相同数据
    const extractedData = previewData
      .filter(item => !item.isEmpty) // 只包含非空数据
      .map(item => ({
        rowId: item.rowId,
        content: item.content
      }));
    
    if (process.env.NODE_ENV === 'development') {
      // 开始提交AI批量处理任务
    }
    
    onSubmit({
      model,
      promptTemplate,
      maxConcurrency,
      dryRun,
      writeTarget,
      processingScope,
      sourceColumnId, // 数据源列ID
      extractedData, // 预提取的数据，确保预览和处理使用相同数据
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
              
              {/* 数据源列选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  数据源列
                </label>
                <select
                  value={sourceColumnId}
                  onChange={(e) => setSourceColumnId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableColumns.map((column) => (
                    <option key={column.id} value={column.id} title={column.subtitle ? `${column.title} - ${column.subtitle}` : column.title}>
                      {column.isSystemColumn ? '🔧 ' : '📝 '}{column.title}{column.subtitle ? ` (${column.subtitle})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 选择包含待处理数据的列，处理结果将写入"{columnName}"列
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
              
              {/* 写入目标已固定为覆盖当前列模式，移除选择UI */}

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
              {/* 数据预览 - 选中行×数据源列 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Info className="w-4 h-4 mr-1" />
                  📊 数据预览 - 选中行×数据源列
                </h3>
                
                {/* 处理范围信息 */}
                <div className="mb-3 p-2 bg-blue-50 rounded-lg text-xs">
                  <div className="flex items-center justify-between text-blue-700">
                    <span>💡 当前处理范围：{processingScope === 'selected' ? '选中行' : processingScope === 'filtered' ? '筛选结果' : '全表'} ({selectedRowCount}行)</span>
                    <span>数据源：{availableColumns.find(col => col.id === sourceColumnId)?.title || sourceColumnId}</span>
                  </div>
                  <div className="text-blue-600 mt-1">
                    目标列：{columnName}
                  </div>
                </div>
                
                {/* 预览数据区域 */}
                <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                  {previewData.length > 0 ? (
                    <>
                      {/* 空数据警告 */}
                      {(() => {
                        const emptyCount = previewData.filter(item => item.isEmpty).length;
                        const totalCount = previewData.length;
                        const emptyRatio = emptyCount / totalCount;
                        
                        if (emptyRatio >= 0.5) { // 如果50%以上的数据为空
                          return (
                            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center text-yellow-800 text-xs">
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                <span className="font-medium">数据源提醒：</span>
                              </div>
                              <div className="text-yellow-700 text-xs mt-1">
                                所选数据源列"{availableColumns.find(col => col.id === sourceColumnId)?.title || sourceColumnId}"中有 {emptyCount}/{totalCount} 行数据为空。
                                {emptyRatio === 1 ? ' 建议选择包含实际数据的列作为数据源。' : ' 请确认这是期望的数据源。'}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      <div className="space-y-2">
                      {previewData.map((item, index) => (
                        <div 
                          key={item.rowId} 
                          className={`p-2 rounded border text-sm ${
                            item.isEmpty ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-gray-500 text-xs">
                              {item.isEmpty ? '❌' : '🔸'} 第{item.rowIndex + 1}行 (ID: {item.rowId})
                            </div>
                          </div>
                          <div className={`${
                            item.isEmpty ? 'text-red-600 italic' : 'text-gray-800'
                          }`}>
                            {item.isEmpty ? 
                              `(所选数据源列"${availableColumns.find(col => col.id === sourceColumnId)?.title || sourceColumnId}"在此行无数据，将跳过处理)` : 
                              (item.content.length > 150 ? `${item.content.slice(0, 150)}...` : item.content)
                            }
                          </div>
                        </div>
                      ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-6">
                      <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <div>暂无预览数据</div>
                      <div className="text-xs mt-1">请选择数据源列和确保有选中的行</div>
                    </div>
                  )}
                </div>
                
                {/* 统计信息 */}
                {previewData.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>✅ 共{previewData.filter(item => !item.isEmpty).length}个有效单元格将被处理</span>
                      {previewData.some(item => item.isEmpty) && (
                        <span className="text-orange-600">⚠️ {previewData.filter(item => item.isEmpty).length}个空单元格将被跳过</span>
                      )}
                    </div>
                  </div>
                )}
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
              {templateValidation.isValid && previewData.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    模板预览
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    {(() => {
                      const firstValidData = previewData.find(item => !item.isEmpty);
                      return firstValidData ? (
                        <>
                          <div className="text-gray-500 text-xs mb-1">
                            渲染后的提示词 (第{firstValidData.rowIndex + 1}行数据):
                          </div>
                          <div className="bg-white p-2 rounded border font-mono text-xs overflow-x-auto">
                            {promptTemplate.replace('{{content}}', firstValidData.content)}
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-500 text-center py-2">
                          暂无有效数据用于预览
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-500">
            将处理 ${dataCount} 条数据，覆盖列"${columnName}"（原数据将备份）
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