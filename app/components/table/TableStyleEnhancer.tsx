'use client'

// 表格样式增强组件
// 提供表格布局优化和文本截断样式

import React from 'react'

interface TableStyleEnhancerProps {
  children: React.ReactNode
  className?: string
}

export const TableStyleEnhancer: React.FC<TableStyleEnhancerProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`table-style-enhancer ${className}`}>
      {children}
      
      {/* 内联样式优化 */}
      <style jsx>{`
        .table-style-enhancer {
          /* 表格容器优化 */
          --table-max-width: 100%;
          --cell-padding: 8px 12px;
          --cell-min-height: 40px;
        }
        
        /* 表格整体布局 */
        .table-style-enhancer :global(table) {
          table-layout: fixed !important;
          width: 100% !important;
          max-width: var(--table-max-width);
        }
        
        /* 表头样式 */
        .table-style-enhancer :global(thead th) {
          background-color: #f8fafc !important;
          font-weight: 600 !important;
          color: #374151 !important;
          border-bottom: 2px solid #e5e7eb !important;
          padding: var(--cell-padding) !important;
          text-align: left !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
        }
        
        /* 单元格基础样式 */
        .table-style-enhancer :global(tbody td) {
          padding: var(--cell-padding) !important;
          min-height: var(--cell-min-height) !important;
          vertical-align: top !important;
          border-bottom: 1px solid #f3f4f6 !important;
          overflow: hidden !important;
          word-wrap: break-word !important;
          line-height: 1.5 !important;
        }
        
        /* 文本截断样式 */
        .table-style-enhancer :global(.truncate-cell) {
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        
        /* 长文本单元格样式 */
        .table-style-enhancer :global(.longtext-cell) {
          max-height: 80px !important;
          overflow: hidden !important;
          line-height: 1.4 !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 3 !important;
          -webkit-box-orient: vertical !important;
        }
        
        /* 编辑状态样式 */
        .table-style-enhancer :global(.editing-cell) {
          background-color: #fef3c7 !important;
          border: 2px solid #f59e0b !important;
          border-radius: 4px !important;
          position: relative !important;
          z-index: 20 !important;
        }
        
        /* 鼠标悬停效果 */
        .table-style-enhancer :global(tbody tr:hover) {
          background-color: #f9fafb !important;
        }
        
        .table-style-enhancer :global(tbody tr:hover td) {
          background-color: transparent !important;
        }
        
        /* 可编辑单元格悬停效果 */
        .table-style-enhancer :global(.editable-cell:hover) {
          background-color: #f3f4f6 !important;
          cursor: pointer !important;
          border-radius: 4px !important;
        }
        
        /* 截断指示器样式 */
        .table-style-enhancer :global(.truncate-indicator) {
          position: absolute !important;
          bottom: 2px !important;
          right: 4px !important;
          font-size: 10px !important;
          color: #6b7280 !important;
          background-color: rgba(255, 255, 255, 0.9) !important;
          border-radius: 2px !important;
          padding: 1px 3px !important;
        }
        
        /* 工具提示优化 */
        .table-style-enhancer :global([title]) {
          cursor: help !important;
        }
        
        /* 响应式优化 */
        @media (max-width: 768px) {
          .table-style-enhancer {
            --cell-padding: 6px 8px;
            --cell-min-height: 36px;
          }
          
          .table-style-enhancer :global(table) {
            font-size: 14px !important;
          }
          
          .table-style-enhancer :global(.longtext-cell) {
            max-height: 60px !important;
            -webkit-line-clamp: 2 !important;
          }
        }
        
        @media (max-width: 480px) {
          .table-style-enhancer {
            --cell-padding: 4px 6px;
            --cell-min-height: 32px;
          }
          
          .table-style-enhancer :global(table) {
            font-size: 12px !important;
          }
        }
        
        /* 滚动条优化 */
        .table-style-enhancer :global(.table-container) {
          overflow-x: auto !important;
          scrollbar-width: thin !important;
          scrollbar-color: #d1d5db #f3f4f6 !important;
        }
        
        .table-style-enhancer :global(.table-container::-webkit-scrollbar) {
          height: 8px !important;
        }
        
        .table-style-enhancer :global(.table-container::-webkit-scrollbar-track) {
          background: #f3f4f6 !important;
          border-radius: 4px !important;
        }
        
        .table-style-enhancer :global(.table-container::-webkit-scrollbar-thumb) {
          background: #d1d5db !important;
          border-radius: 4px !important;
        }
        
        .table-style-enhancer :global(.table-container::-webkit-scrollbar-thumb:hover) {
          background: #9ca3af !important;
        }
      `}</style>
    </div>
  )
}