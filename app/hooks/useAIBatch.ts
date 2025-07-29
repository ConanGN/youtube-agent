'use client';

import { useState, useCallback, useRef } from 'react';
import { hashPrompt } from '@/lib/ai/prompt';
import type { AIBatchConfig } from '@/app/components/ai/AIPromptDrawer';

// 批处理状态枚举
export enum BatchStatus {
  IDLE = 'idle',
  ESTIMATING = 'estimating', 
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// 单个处理结果接口
export interface BatchItemResult {
  rowId: string;
  output: string;
  status: 'ok' | 'failed';
  error?: string;
}

// 批处理进度信息
export interface BatchProgress {
  completed: number;
  total: number;
  percentage: number;
}

// 费用估算信息
export interface BatchEstimate {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  currency: string;
}

// 虚拟列草稿数据
export interface VirtualColumnDraft {
  columnKey: string;
  originalColumnId: string;
  writeTarget: 'virtual' | 'overwrite' | 'append';
  jobId: string;
  draftData: Map<string, BatchItemResult>; // rowId -> result
  acceptedRows: Set<string>; // 已接受的rowId集合
}

// 批处理状态
export interface BatchState {
  status: BatchStatus;
  jobId: string | null;
  results: Map<string, BatchItemResult>;
  failedItems: string[];
  progress: BatchProgress | null;
  estimate: BatchEstimate | null;
  error: string | null;
  // 新增：虚拟列相关状态
  isVirtualColumn: boolean;
  virtualDrafts: Map<string, VirtualColumnDraft>; // columnKey -> draft
  currentDraftKey: string | null;
  // 新增：目标列ID（用于overwrite模式）
  targetColumnId: string | null;
}

// Hook返回类型
export interface UseAIBatchReturn {
  // 状态
  batchState: BatchState;
  
  // 方法
  startBatch: (
    columnId: string,
    data: Array<{ rowId: string; content: string }>,
    config: AIBatchConfig,
    onVirtualColumnCreated?: (columnKey: string) => void
  ) => Promise<void>;
  
  retryFailedItems: () => Promise<void>;
  cancelBatch: () => void;
  clearResults: () => void;
  
  // 工具方法
  getNewColumnKey: (originalColumnId: string, promptTemplate: string) => string;
  getFailedItemsData: () => Array<{ rowId: string; content: string }>;
  
  // 新增：虚拟列相关方法
  acceptSingleRow: (rowId: string, columnKey: string) => void;
  acceptAllRows: (columnKey: string) => void;
  rejectVirtualColumn: (columnKey: string) => void;
  commitVirtualColumn: (columnKey: string, mode: 'virtual' | 'overwrite' | 'append') => Promise<void>;
  getVirtualColumnData: (columnKey: string) => VirtualColumnDraft | undefined;
}

// SSE事件类型
interface SSEEvent {
  type: 'progress' | 'complete' | 'error' | 'estimate';
  data: {
    rowId?: string;
    output?: string;
    status?: 'ok' | 'failed';
    error?: string;
    progress?: BatchProgress;
    estimate?: BatchEstimate;
    jobId?: string;
  };
}

export function useAIBatch(): UseAIBatchReturn {
  // 状态管理
  const [batchState, setBatchState] = useState<BatchState>({
    status: BatchStatus.IDLE,
    jobId: null,
    results: new Map(),
    failedItems: [],
    progress: null,
    estimate: null,
    error: null,
    // 新增虚拟列状态
    isVirtualColumn: false,
    virtualDrafts: new Map(),
    currentDraftKey: null,
    // 新增目标列ID
    targetColumnId: null,
  });
  
  // 存储当前请求的数据和配置，用于重试
  const currentRequestRef = useRef<{
    columnId: string;
    data: Array<{ rowId: string; content: string }>;
    config: AIBatchConfig;
    onVirtualColumnCreated?: (columnKey: string) => void;
  } | null>(null);
  
  // 存储EventSource实例
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // 生成新列的键名
  const getNewColumnKey = useCallback((originalColumnId: string, promptTemplate: string): string => {
    const hash = hashPrompt(promptTemplate);
    return `${originalColumnId}_ai_${hash}`;
  }, []);
  
  // 获取失败项目的数据
  const getFailedItemsData = useCallback((): Array<{ rowId: string; content: string }> => {
    if (!currentRequestRef.current) return [];
    
    const { data } = currentRequestRef.current;
    return data.filter(item => batchState.failedItems.includes(item.rowId));
  }, [batchState.failedItems]);
  
  // 处理SSE消息
  const handleSSEMessage = useCallback((event: MessageEvent) => {
    try {
      const sseEvent: SSEEvent = JSON.parse(event.data);
      
      setBatchState(prev => {
        const newState = { ...prev };
        
        switch (sseEvent.type) {
          case 'estimate':
            newState.estimate = sseEvent.data.estimate || null;
            newState.jobId = sseEvent.data.jobId || null;
            break;
            
          case 'progress':
            // 更新单个结果 - 修复：创建新的Map对象而不是直接修改
            if (sseEvent.data.rowId) {
              const result: BatchItemResult = {
                rowId: sseEvent.data.rowId,
                output: sseEvent.data.output || '',
                status: sseEvent.data.status || 'failed',
                error: sseEvent.data.error,
              };
              
              // 调试信息：记录每个结果
              if (process.env.NODE_ENV === 'development') {
                console.log('📥 收到AI结果:', {
                  rowId: result.rowId,
                  status: result.status,
                  outputLength: result.output.length,
                  output: result.output.substring(0, 100) + (result.output.length > 100 ? '...' : ''),
                  error: result.error
                });
              }
              
              // 创建新的Map对象，确保不可变性
              newState.results = new Map(prev.results);
              newState.results.set(sseEvent.data.rowId, result);
              
              // 更新失败项目列表
              if (result.status === 'failed') {
                if (!newState.failedItems.includes(result.rowId)) {
                  newState.failedItems = [...newState.failedItems, result.rowId];
                }
              } else {
                // 成功时从失败列表中移除
                newState.failedItems = newState.failedItems.filter(id => id !== result.rowId);
              }
            }
            
            // 更新进度
            if (sseEvent.data.progress) {
              newState.progress = sseEvent.data.progress;
            }
            break;
            
          case 'complete':
            newState.status = BatchStatus.COMPLETED;
            if (sseEvent.data.progress) {
              newState.progress = sseEvent.data.progress;
            }
            
            // 调试信息：批处理完成
            if (process.env.NODE_ENV === 'development') {
              console.log('🎉 AI批处理完成:', {
                isVirtualColumn: newState.isVirtualColumn,
                targetColumnId: newState.targetColumnId,
                resultsCount: newState.results.size,
                jobId: newState.jobId,
                successfulResults: Array.from(newState.results.entries()).filter(([_, result]) => result.status === 'ok').length,
                failedResults: Array.from(newState.results.entries()).filter(([_, result]) => result.status === 'failed').length,
                sampleResults: Array.from(newState.results.entries()).slice(0, 2)
              });
            }
            
            // 如果是虚拟列模式，创建草稿
            if (newState.isVirtualColumn && newState.jobId && currentRequestRef.current) {
              const { columnId, config, onVirtualColumnCreated } = currentRequestRef.current;
              const columnKey = `${columnId}_ai_draft_${newState.jobId.split('_').pop()}`;
              
              const draft: VirtualColumnDraft = {
                columnKey,
                originalColumnId: columnId,
                writeTarget: config.writeTarget || 'virtual',
                jobId: newState.jobId,
                draftData: new Map(newState.results),
                acceptedRows: new Set(),
              };
              
              // 创建新的Map对象，确保不可变性
              newState.virtualDrafts = new Map(prev.virtualDrafts);
              newState.virtualDrafts.set(columnKey, draft);
              newState.currentDraftKey = columnKey;
              
              // 通知表格组件创建虚拟列
              if (onVirtualColumnCreated) {
                setTimeout(() => onVirtualColumnCreated(columnKey), 0);
              }
            } else {
              // 覆盖模式：直接应用结果到表格
              if (process.env.NODE_ENV === 'development') {
                console.log('覆盖模式批处理完成，等待表格组件应用结果');
              }
            }
            break;
            
          case 'error':
            newState.status = BatchStatus.FAILED;
            newState.error = sseEvent.data.error || '批处理执行失败';
            break;
        }
        
        return newState;
      });
      
    } catch (error) {
      console.error('解析SSE消息失败:', error);
      setBatchState(prev => ({
        ...prev,
        status: BatchStatus.FAILED,
        error: 'SSE消息解析失败',
      }));
    }
  }, []);
  
  // 启动批处理
  const startBatch = useCallback(async (
    columnId: string,
    data: Array<{ rowId: string; content: string }>,
    config: AIBatchConfig,
    onVirtualColumnCreated?: (columnKey: string) => void
  ) => {
    try {
      // 清理之前的连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // 保存请求数据用于重试
      currentRequestRef.current = { columnId, data, config, onVirtualColumnCreated };
      
      // 判断是否为虚拟列模式
      const isVirtualMode = config.writeTarget === 'virtual';
      
      // 重置状态
      setBatchState(prev => ({
        status: config.dryRun ? BatchStatus.ESTIMATING : BatchStatus.RUNNING,
        jobId: null,
        results: new Map(),
        failedItems: [],
        progress: null,
        estimate: null,
        error: null,
        // 保留虚拟列相关状态，如果是虚拟列模式
        isVirtualColumn: isVirtualMode,
        virtualDrafts: isVirtualMode ? prev.virtualDrafts : new Map(),
        currentDraftKey: null,
        // 设置目标列ID（用于overwrite模式）
        targetColumnId: columnId,
      }));
      
      // 发送POST请求到SSE端点
      const response = await fetch('/api/ai/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columnId,
          data,
          model: config.model,
          promptTemplate: config.promptTemplate,
          maxConcurrency: config.maxConcurrency,
          dryRun: config.dryRun,
          writeTarget: config.writeTarget,
          processingScope: config.processingScope,
        }),
      });
      
      if (!response.ok) {
        // 处理非SSE响应（错误情况）
        const errorData = await response.json();
        throw new Error(errorData.error || '请求失败');
      }
      
      // 如果是dry run，直接处理JSON响应
      if (config.dryRun) {
        const result = await response.json();
        setBatchState(prev => ({
          ...prev,
          status: BatchStatus.COMPLETED,
          estimate: result.estimate,
          jobId: result.jobId,
        }));
        return;
      }
      
      // 处理SSE流
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const eventData = line.slice(6);
                if (eventData.trim()) {
                  handleSSEMessage({ data: eventData } as MessageEvent);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
      
    } catch (error) {
      console.error('批处理启动失败:', error);
      setBatchState(prev => ({
        ...prev,
        status: BatchStatus.FAILED,
        error: error instanceof Error ? error.message : '未知错误',
      }));
    }
  }, [handleSSEMessage]);
  
  // 重试失败的项目
  const retryFailedItems = useCallback(async () => {
    if (!currentRequestRef.current || batchState.failedItems.length === 0) {
      return;
    }
    
    const { columnId, data, config, onVirtualColumnCreated } = currentRequestRef.current;
    const failedData = data.filter(item => batchState.failedItems.includes(item.rowId));
    
    if (failedData.length === 0) {
      return;
    }
    
    // 启动批处理，只处理失败的项目
    await startBatch(columnId, failedData, { ...config, dryRun: false }, onVirtualColumnCreated);
  }, [batchState.failedItems, startBatch]);
  
  // 取消批处理
  const cancelBatch = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setBatchState(prev => ({
      ...prev,
      status: BatchStatus.CANCELLED,
    }));
  }, []);
  
  // 清除结果
  const clearResults = useCallback(() => {
    setBatchState({
      status: BatchStatus.IDLE,
      jobId: null,
      results: new Map(),
      failedItems: [],
      progress: null,
      estimate: null,
      error: null,
      isVirtualColumn: false,
      virtualDrafts: new Map(),
      currentDraftKey: null,
      targetColumnId: null,
    });
    
    currentRequestRef.current = null;
  }, []);
  
  // 接受单行数据
  const acceptSingleRow = useCallback((rowId: string, columnKey: string) => {
    setBatchState(prev => {
      const draft = prev.virtualDrafts.get(columnKey);
      if (!draft) return prev;
      
      const newDraft = {
        ...draft,
        acceptedRows: new Set([...draft.acceptedRows, rowId]),
      };
      
      const newDrafts = new Map(prev.virtualDrafts);
      newDrafts.set(columnKey, newDraft);
      
      return {
        ...prev,
        virtualDrafts: newDrafts,
      };
    });
  }, []);
  
  // 接受所有行数据
  const acceptAllRows = useCallback((columnKey: string) => {
    setBatchState(prev => {
      const draft = prev.virtualDrafts.get(columnKey);
      if (!draft) return prev;
      
      const allRowIds = Array.from(draft.draftData.keys()).filter(
        rowId => draft.draftData.get(rowId)?.status === 'ok'
      );
      
      const newDraft = {
        ...draft,
        acceptedRows: new Set(allRowIds),
      };
      
      const newDrafts = new Map(prev.virtualDrafts);
      newDrafts.set(columnKey, newDraft);
      
      return {
        ...prev,
        virtualDrafts: newDrafts,
      };
    });
  }, []);
  
  // 撤销虚拟列
  const rejectVirtualColumn = useCallback((columnKey: string) => {
    setBatchState(prev => {
      const newDrafts = new Map(prev.virtualDrafts);
      newDrafts.delete(columnKey);
      
      return {
        ...prev,
        virtualDrafts: newDrafts,
        currentDraftKey: prev.currentDraftKey === columnKey ? null : prev.currentDraftKey,
      };
    });
  }, []);
  
  // 提交虚拟列到数据库
  const commitVirtualColumn = useCallback(async (
    columnKey: string, 
    mode: 'virtual' | 'overwrite' | 'append'
  ) => {
    const draft = batchState.virtualDrafts.get(columnKey);
    if (!draft) {
      throw new Error('找不到对应的虚拟列草稿');
    }
    
    // 只提交已接受的行
    const acceptedData = Array.from(draft.acceptedRows)
      .map(rowId => {
        const result = draft.draftData.get(rowId);
        return result ? { rowId, output: result.output } : null;
      })
      .filter(Boolean);
    
    if (acceptedData.length === 0) {
      throw new Error('没有可提交的数据');
    }
    
    try {
      const response = await fetch('/api/ai/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalColumnId: draft.originalColumnId,
          columnKey,
          writeTarget: mode,
          data: acceptedData,
          jobId: draft.jobId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '提交失败');
      }
      
      // 提交成功后移除草稿
      rejectVirtualColumn(columnKey);
      
    } catch (error) {
      console.error('提交虚拟列失败:', error);
      throw error;
    }
  }, [batchState.virtualDrafts, rejectVirtualColumn]);
  
  // 获取虚拟列数据
  const getVirtualColumnData = useCallback((columnKey: string): VirtualColumnDraft | undefined => {
    return batchState.virtualDrafts.get(columnKey);
  }, [batchState.virtualDrafts]);
  
  return {
    batchState,
    startBatch,
    retryFailedItems,
    cancelBatch,
    clearResults,
    getNewColumnKey,
    getFailedItemsData,
    // 虚拟列方法
    acceptSingleRow,
    acceptAllRows,
    rejectVirtualColumn,
    commitVirtualColumn,
    getVirtualColumnData,
  };
}