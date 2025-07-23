'use client'

// CSV文件上传组件
// 支持拖拽上传和文件解析，包含数据验证和错误处理

import React, { useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import { DataInputType } from '@/types'

interface FileUploadProps {
  onSubmit: (urls: string[], type: DataInputType) => void
  loading?: boolean
  className?: string
}

interface ParsedResult {
  urls: string[]
  totalRows: number
  validRows: number
  errors: string[]
}

export function FileUpload({
  onSubmit,
  loading = false,
  className = '',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 验证YouTube URL
  const validateUrl = (url: string): boolean => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return false
    
    const youtubePatterns = [
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/,
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /youtube\.com\/embed\//,
      /youtube\.com\/v\//,
      /youtube\.com\/shorts\//,
    ]
    
    return youtubePatterns.some(pattern => pattern.test(trimmedUrl))
  }

  // 解析CSV文件
  const parseFile = useCallback((file: File) => {
    setUploadError(null)
    setParsedResult(null)

    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('请上传CSV格式的文件')
      return
    }

    // 检查文件大小（最大5MB）
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('文件大小不能超过5MB')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const urls: string[] = []
          const errors: string[] = []

          // 尝试从不同的列名中找到URL
          const possibleColumns = [
            'url', 'link', 'video_url', 'youtube_url', 'video', 'youtube',
            'URL', 'LINK', 'VIDEO_URL', 'YOUTUBE_URL', 'VIDEO', 'YOUTUBE'
          ]

          let urlColumn = ''
          for (const col of possibleColumns) {
            if (results.meta.fields?.includes(col)) {
              urlColumn = col
              break
            }
          }

          // 如果没有找到URL列，尝试使用第一列
          if (!urlColumn && results.meta.fields && results.meta.fields.length > 0) {
            urlColumn = results.meta.fields[0]
          }

          if (!urlColumn) {
            setUploadError('CSV文件中未找到包含URL的列。请确保文件包含url、link或video_url等列名。')
            return
          }

          // 解析每一行数据
          results.data.forEach((row: any, index: number) => {
            const url = row[urlColumn]
            if (typeof url === 'string' && url.trim()) {
              if (validateUrl(url.trim())) {
                urls.push(url.trim())
              } else {
                errors.push(`第${index + 1}行: "${url}" 不是有效的YouTube链接`)
              }
            }
          })

          // 检查解析结果
          if (urls.length === 0) {
            setUploadError('文件中没有找到有效的YouTube链接')
            return
          }

          // 限制数量
          if (urls.length > 1000) {
            errors.push(`文件包含${urls.length}个链接，超过最大限制1000个，将只处理前1000个`)
            urls.splice(1000)
          }

          setParsedResult({
            urls,
            totalRows: results.data.length,
            validRows: urls.length,
            errors: errors.slice(0, 10), // 只显示前10个错误
          })

        } catch (error) {
          console.error('文件解析错误:', error)
          setUploadError('文件解析失败，请检查CSV格式是否正确')
        }
      },
      error: (error) => {
        console.error('CSV解析错误:', error)
        setUploadError(`文件解析失败: ${error.message}`)
      }
    })
  }, [])

  // 处理文件拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      parseFile(files[0])
    }
  }, [parseFile])

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      parseFile(files[0])
    }
  }, [parseFile])

  // 处理提交
  const handleSubmit = useCallback(() => {
    if (parsedResult && parsedResult.urls.length > 0) {
      onSubmit(parsedResult.urls, 'multiple')
    }
  }, [parsedResult, onSubmit])

  // 重置状态
  const handleReset = useCallback(() => {
    setParsedResult(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // 下载示例文件
  const downloadSampleFile = useCallback(() => {
    const sampleData = [
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { url: 'https://youtu.be/jNQXAC9IVRw' },
      { url: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
    ]

    const csv = Papa.unparse(sampleData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', 'youtube_urls_sample.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">CSV文件上传</h3>
        <button
          onClick={downloadSampleFile}
          className="text-sm text-blue-600 hover:text-blue-700"
          disabled={loading}
        >
          下载示例文件
        </button>
      </div>

      {!parsedResult ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="text-4xl text-gray-400">📄</div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                拖拽CSV文件到这里，或点击选择文件
              </p>
              <p className="text-sm text-gray-500 mt-1">
                支持包含YouTube链接的CSV文件，最大5MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              选择CSV文件
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 解析结果 */}
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">
              文件解析成功
            </h4>
            <div className="text-sm text-green-700 space-y-1">
              <p>总行数: {parsedResult.totalRows}</p>
              <p>有效链接: {parsedResult.validRows}</p>
              <p>准备处理: {parsedResult.urls.length} 个视频</p>
            </div>
          </div>

          {/* 错误信息 */}
          {parsedResult.errors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                发现问题 ({parsedResult.errors.length} 个)
              </h4>
              <div className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                {parsedResult.errors.map((error, index) => (
                  <p key={index}>• {error}</p>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={loading}
            >
              重新上传
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || parsedResult.urls.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : `处理 ${parsedResult.urls.length} 个视频`}
            </button>
          </div>
        </div>
      )}

      {/* 上传错误 */}
      {uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                上传失败
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {uploadError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-2">
          CSV文件格式要求：
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 文件必须是CSV格式(.csv)</li>
          <li>• 包含标题行，列名可以是: url, link, video_url, youtube_url</li>
          <li>• 每行一个YouTube链接</li>
          <li>• 最大支持1000个链接</li>
          <li>• 文件大小不超过5MB</li>
        </ul>
      </div>
    </div>
  )
}