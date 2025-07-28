'use client'

// 数据导出对话框组件
// 提供多种格式的数据导出功能

import React, { useState, useCallback, useEffect } from 'react'
import { YouTubeVideo } from '@/types'

interface ExportFormat {
  id: string
  name: string
  description: string
  extension: string
  icon: string
}

interface ColumnOption {
  id: string
  name: string
  isAI: boolean
  isDefault: boolean
}

interface ExportDialogProps {
  data: YouTubeVideo[]
  selectedIds?: string[]
  onClose: () => void
  className?: string
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'csv',
    name: 'CSV文件',
    description: '逗号分隔值文件，适合Excel和其他表格软件',
    extension: 'csv',
    icon: '📊'
  },
  {
    id: 'excel',
    name: 'Excel兼容CSV',
    description: 'Excel兼容的CSV文件，包含BOM编码',
    extension: 'csv',
    icon: '📈'
  },
  {
    id: 'json',
    name: 'JSON文件',
    description: 'JSON格式文件，适合开发和数据处理',
    extension: 'json',
    icon: '📄'
  }
]

export function ExportDialog({
  data,
  selectedIds = [],
  onClose,
  className = ''
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState('csv')
  const [filename, setFilename] = useState('')
  const [includeAIContent, setIncludeAIContent] = useState(true)
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all')
  const [availableColumns, setAvailableColumns] = useState<ColumnOption[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<'config' | 'preview' | 'download'>('config')
  const [previewData, setPreviewData] = useState<any[]>([])

  // 获取导出数据
  const getExportData = useCallback(() => {
    if (exportScope === 'selected' && selectedIds.length > 0) {
      return data.filter(item => selectedIds.includes(item.id))
    }
    return data
  }, [data, exportScope, selectedIds])

  // 获取可用列信息
  useEffect(() => {
    fetch('/api/export')
      .then(res => res.json())
      .then((result: any) => {
        if (result.success) {
          setAvailableColumns(result.availableColumns)
          // 设置默认选中的列
          const defaultColumns = result.availableColumns
            .filter((col: ColumnOption) => col.isDefault)
            .map((col: ColumnOption) => col.id)
          setSelectedColumns(defaultColumns)
        }
      })
      .catch(error => {
        console.error('获取导出配置失败:', error)
      })
  }, [])

  // 生成默认文件名
  useEffect(() => {
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '-')
    const scope = exportScope === 'selected' ? `selected-${selectedIds.length}` : `all-${data.length}`
    setFilename(`youtube-data-${scope}-${timestamp}`)
  }, [exportScope, selectedIds.length, data.length])

  // 预览数据
  const handlePreview = useCallback(async () => {
    setLoading(true)
    try {
      const exportData = getExportData()
      const options = {
        includeColumns: selectedColumns,
        includeAIContent,
        filename
      }

      // 模拟处理预览数据（取前5条）
      const previewItems = exportData.slice(0, 5).map((video, index) => {
        const row: any = { '序号': index + 1 }
        
        selectedColumns.forEach(column => {
          let value = video[column as keyof YouTubeVideo]
          
          // 处理特殊字段
          switch (column) {
            case 'publishedAt':
              if (value) {
                value = new Date(value as string).toLocaleString('zh-CN')
              }
              break
            case 'tags':
              if (Array.isArray(value)) {
                value = (value as string[]).join(', ')
              }
              break
            case 'viewCount':
            case 'likeCount':
            case 'commentCount':
              if (typeof value === 'number') {
                value = value.toLocaleString('zh-CN')
              }
              break
            case 'isEdited':
              value = value ? '是' : '否'
              break
            case 'description':
              if (typeof value === 'string' && value.length > 100) {
                value = value.substring(0, 100) + '...'
              }
              break
          }
          
          // 使用中文列名
          const columnMapping: Record<string, string> = {
            id: '视频ID',
            title: '标题',
            description: '描述',
            thumbnail: '缩略图链接',
            publishedAt: '发布时间',
            viewCount: '播放量',
            likeCount: '点赞数',
            commentCount: '评论数',
            duration: '时长',
            channelTitle: '频道名称',
            channelId: '频道ID',
            videoUrl: '视频链接',
            tags: '标签',
            categoryId: '分类ID',
            enhancedTitle: 'AI优化标题',
            summarizedDescription: 'AI摘要',
            translatedTitle: '翻译标题'
          }
          
          const columnName = columnMapping[column] || column
          row[columnName] = value || ''
        })
        
        return row
      })

      setPreviewData(previewItems)
      setCurrentStep('preview')
    } catch (error) {
      console.error('预览失败:', error)
      alert('预览失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [getExportData, selectedColumns, includeAIContent, filename])

  // 执行导出
  const handleExport = useCallback(async () => {
    setLoading(true)
    try {
      const exportData = getExportData()
      const options = {
        includeColumns: selectedColumns,
        includeAIContent,
        filename
      }

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: exportData,
          format: selectedFormat,
          options
        }),
      })

      if (response.ok) {
        // 获取文件内容并下载
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        // 从响应头获取文件名
        const contentDisposition = response.headers.get('Content-Disposition')
        const filenameMatch = contentDisposition?.match(/filename\*?=['"]?([^'";]+)['"]?/)
        const downloadFilename = filenameMatch?.[1] 
          ? decodeURIComponent(filenameMatch[1])
          : `${filename}.${EXPORT_FORMATS.find(f => f.id === selectedFormat)?.extension || 'csv'}`
        
        link.download = downloadFilename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        setCurrentStep('download')
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        const errorData = await response.json() as any
        throw new Error(errorData.error || '导出失败')
      }
    } catch (error) {
      console.error('导出失败:', error)
      alert(error instanceof Error ? error.message : '导出失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [getExportData, selectedColumns, includeAIContent, filename, selectedFormat, onClose])

  // 切换列选择
  const toggleColumn = useCallback((columnId: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    )
  }, [])

  // 全选/取消全选
  const toggleAllColumns = useCallback(() => {
    const allColumnIds = availableColumns.map(col => col.id)
    setSelectedColumns(
      selectedColumns.length === allColumnIds.length ? [] : allColumnIds
    )
  }, [availableColumns, selectedColumns])

  const exportData = getExportData()
  const hasSelectedData = selectedIds.length > 0

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">导出数据</h2>
            <p className="text-sm text-gray-500 mt-1">
              {exportScope === 'all' 
                ? `准备导出全部 ${data.length} 条记录`
                : `准备导出已选择的 ${exportData.length} 条记录`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              currentStep === 'config' ? 'text-blue-600' : 'text-gray-500'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'config' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                1
              </div>
              <span>配置导出</span>
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${
              currentStep === 'preview' ? 'text-blue-600' : 'text-gray-500'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'preview' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                2
              </div>
              <span>预览数据</span>
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${
              currentStep === 'download' ? 'text-green-600' : 'text-gray-500'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'download' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                3
              </div>
              <span>下载文件</span>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {currentStep === 'config' && (
            <div className="space-y-6">
              {/* 导出范围选择 */}
              {hasSelectedData && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">导出范围</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="exportScope"
                        value="all"
                        checked={exportScope === 'all'}
                        onChange={(e) => setExportScope(e.target.value as 'all' | 'selected')}
                        className="mr-2"
                      />
                      <span>导出全部数据 ({data.length} 条)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="exportScope"
                        value="selected"
                        checked={exportScope === 'selected'}
                        onChange={(e) => setExportScope(e.target.value as 'all' | 'selected')}
                        className="mr-2"
                      />
                      <span>仅导出已选择数据 ({selectedIds.length} 条)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 格式选择 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">导出格式</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {EXPORT_FORMATS.map((format) => (
                    <div
                      key={format.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedFormat === format.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedFormat(format.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{format.icon}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{format.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{format.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 列选择 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">选择导出字段</h3>
                  <button
                    onClick={toggleAllColumns}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {selectedColumns.length === availableColumns.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded p-4">
                  {availableColumns.map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(column.id)}
                        onChange={() => toggleColumn(column.id)}
                        className="rounded"
                      />
                      <span className="text-sm">
                        {column.name}
                        {column.isAI && (
                          <span className="ml-1 px-1 py-0.5 text-xs bg-purple-100 text-purple-600 rounded">
                            AI
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  已选择 {selectedColumns.length} 个字段
                </p>
              </div>

              {/* 其他选项 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">其他选项</h3>
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeAIContent}
                      onChange={(e) => setIncludeAIContent(e.target.checked)}
                      className="mr-2 rounded"
                    />
                    <span>包含AI增强内容</span>
                  </label>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      文件名
                    </label>
                    <input
                      type="text"
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="输入文件名（不含扩展名）"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">数据预览</h3>
                <p className="text-sm text-gray-500">
                  预览前5条记录（共 {exportData.length} 条）
                </p>
              </div>

              {previewData.length > 0 && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(previewData[0]).map((column) => (
                          <th
                            key={column}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {Object.values(row).map((value, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate"
                              title={String(value)}
                            >
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {currentStep === 'download' && (
            <div className="text-center py-8">
              <div className="text-6xl text-green-500 mb-4">✅</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">导出完成</h3>
              <p className="text-gray-600">
                文件已成功下载到您的设备
              </p>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {currentStep === 'config' && `将导出 ${exportData.length} 条记录`}
            {currentStep === 'preview' && `${selectedColumns.length} 个字段，${exportData.length} 条记录`}
            {currentStep === 'download' && '导出已完成'}
          </div>
          
          <div className="flex items-center space-x-3">
            {currentStep === 'config' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handlePreview}
                  disabled={loading || selectedColumns.length === 0 || exportData.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '处理中...' : '预览数据'}
                </button>
              </>
            )}
            
            {currentStep === 'preview' && (
              <>
                <button
                  onClick={() => setCurrentStep('config')}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  返回修改
                </button>
                <button
                  onClick={handleExport}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '导出中...' : '确认导出'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}