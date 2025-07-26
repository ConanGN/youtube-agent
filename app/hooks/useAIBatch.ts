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

// 批处理状态
export interface BatchState {
  status: BatchStatus;
  jobId: string | null;
  results: Map<string, BatchItemResult>;
  failedItems: string[];
  progress: BatchProgress | null;
  estimate: BatchEstimate | null;
  error: string | null;
}

// Hook返回类型
export interface UseAIBatchReturn {
  // 状态
  batchState: BatchState;
  
  // 方法
  startBatch: (
    columnId: string,
    data: Array<{ rowId: string; content: string }>,
    config: AIBatchConfig
  ) => Promise<void>;
  
  retryFailedItems: () => Promise<void>;
  cancelBatch: () => void;
  clearResults: () => void;
  
  // 工具方法
  getNewColumnKey: (originalColumnId: string, promptTemplate: string) => string;
  getFailedItemsData: () => Array<{ rowId: string; content: string }>;
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
  });
  
  // 存储当前请求的数据和配置，用于重试
  const currentRequestRef = useRef<{
    columnId: string;
    data: Array<{ rowId: string; content: string }>;
    config: AIBatchConfig;
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
            // 更新单个结果
            if (sseEvent.data.rowId) {
              const result: BatchItemResult = {
                rowId: sseEvent.data.rowId,
                output: sseEvent.data.output || '',
                status: sseEvent.data.status || 'failed',
                error: sseEvent.data.error,
              };
              
              newState.results.set(sseEvent.data.rowId, result);
              
              // 更新失败项目列表
              if (result.status === 'failed') {
                if (!newState.failedItems.includes(result.rowId)) {
                  newState.failedItems.push(result.rowId);
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
    config: AIBatchConfig
  ) => {
    try {
      // 清理之前的连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // 保存请求数据用于重试
      currentRequestRef.current = { columnId, data, config };
      
      // 重置状态
      setBatchState({
        status: config.dryRun ? BatchStatus.ESTIMATING : BatchStatus.RUNNING,
        jobId: null,
        results: new Map(),
        failedItems: [],
        progress: null,
        estimate: null,
        error: null,
      });
      
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
    
    const { columnId, data, config } = currentRequestRef.current;
    const failedData = data.filter(item => batchState.failedItems.includes(item.rowId));
    
    if (failedData.length === 0) {
      return;
    }
    
    // 启动批处理，只处理失败的项目
    await startBatch(columnId, failedData, { ...config, dryRun: false });
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
    });
    
    currentRequestRef.current = null;
  }, []);
  
  return {
    batchState,
    startBatch,
    retryFailedItems,
    cancelBatch,
    clearResults,
    getNewColumnKey,
    getFailedItemsData,
  };
}