import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { YouTubeVideo } from '@/types'

// 数据导出API
// 支持CSV、JSON、Excel等格式的数据导出

interface ExportRequest {
  data: YouTubeVideo[]
  format: 'csv' | 'json' | 'excel'
  options?: {
    includeColumns?: string[]
    excludeColumns?: string[]
    filename?: string
    includeAIContent?: boolean
    dateFormat?: string
  }
}

interface ExportResponse {
  success: boolean
  downloadUrl?: string
  filename?: string
  error?: string
}

// 列字段映射
const COLUMN_MAPPINGS = {
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
  translatedTitle: '翻译标题',
  isEdited: '已编辑',
}

// 默认导出列
const DEFAULT_COLUMNS = [
  'title', 'channelTitle', 'publishedAt', 'viewCount', 
  'likeCount', 'duration', 'videoUrl', 'description'
]

// AI相关列
const AI_COLUMNS = [
  'enhancedTitle', 'summarizedDescription', 'translatedTitle'
]

// 数据处理函数
function processDataForExport(
  data: YouTubeVideo[], 
  options: ExportRequest['options'] = {}
): any[] {
  const { 
    includeColumns, 
    excludeColumns = [], 
    includeAIContent = true,
    dateFormat = 'YYYY-MM-DD HH:mm:ss'
  } = options

  // 确定要包含的列
  let columnsToInclude = includeColumns || DEFAULT_COLUMNS
  
  // 添加AI内容列（如果启用）
  if (includeAIContent) {
    columnsToInclude = [...columnsToInclude, ...AI_COLUMNS]
  }
  
  // 移除排除的列
  columnsToInclude = columnsToInclude.filter(col => !excludeColumns.includes(col))

  return data.map((video, index) => {
    const row: any = {}
    
    columnsToInclude.forEach(column => {
      let value = video[column as keyof YouTubeVideo]
      
      // 特殊字段处理
      switch (column) {
        case 'publishedAt':
          if (value) {
            const date = new Date(value as string)
            value = date.toLocaleString('zh-CN')
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
          // 限制描述长度，避免Excel单元格过大
          if (typeof value === 'string' && value.length > 500) {
            value = value.substring(0, 500) + '...'
          }
          break
      }
      
      // 使用中文列名
      const columnName = COLUMN_MAPPINGS[column as keyof typeof COLUMN_MAPPINGS] || column
      row[columnName] = value || ''
    })
    
    // 添加序号
    row['序号'] = index + 1
    
    return row
  })
}

// 生成CSV格式
function generateCSV(processedData: any[]): string {
  return Papa.unparse(processedData, {
    header: true,
    newline: '\r\n'
  })
}

// 生成JSON格式
function generateJSON(processedData: any[]): string {
  return JSON.stringify({
    exportTime: new Date().toISOString(),
    totalRecords: processedData.length,
    data: processedData
  }, null, 2)
}

// 生成简单的Excel CSV格式（带BOM）
function generateExcel(processedData: any[]): Buffer {
  const csv = generateCSV(processedData)
  // 添加BOM以确保Excel正确识别UTF-8编码
  const bom = '\uFEFF'
  return Buffer.from(bom + csv, 'utf-8')
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json()
    const { data, format, options = {} } = body

    // 验证请求参数
    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可导出的数据' },
        { status: 400 }
      )
    }

    if (!['csv', 'json', 'excel'].includes(format)) {
      return NextResponse.json(
        { success: false, error: '不支持的导出格式' },
        { status: 400 }
      )
    }

    // 限制导出数量
    if (data.length > 10000) {
      return NextResponse.json(
        { success: false, error: '一次最多导出10000条记录' },
        { status: 400 }
      )
    }

    // 处理数据
    const processedData = processDataForExport(data, options)
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = options.filename || `youtube-data-${timestamp}`

    let fileContent: string | Buffer
    let contentType: string
    let fileExtension: string

    // 根据格式生成文件
    switch (format) {
      case 'csv':
        fileContent = generateCSV(processedData)
        contentType = 'text/csv; charset=utf-8'
        fileExtension = 'csv'
        break
      case 'json':
        fileContent = generateJSON(processedData)
        contentType = 'application/json; charset=utf-8'
        fileExtension = 'json'
        break
      case 'excel':
        fileContent = generateExcel(processedData)
        contentType = 'application/vnd.ms-excel; charset=utf-8'
        fileExtension = 'csv' // Excel兼容的CSV
        break
      default:
        throw new Error('不支持的导出格式')
    }

    const fullFilename = `${filename}.${fileExtension}`

    // 创建响应
    const response = new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fullFilename)}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

    return response

  } catch (error) {
    console.error('导出API错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '导出服务暂时不可用'
      },
      { status: 500 }
    )
  }
}

// 获取导出配置信息
export async function GET() {
  return NextResponse.json({
    success: true,
    supportedFormats: [
      {
        id: 'csv',
        name: 'CSV文件',
        description: '逗号分隔值文件，适合Excel和其他表格软件',
        extension: 'csv',
        mimeType: 'text/csv'
      },
      {
        id: 'json',
        name: 'JSON文件',
        description: 'JSON格式文件，适合开发和数据处理',
        extension: 'json',
        mimeType: 'application/json'
      },
      {
        id: 'excel',
        name: 'Excel兼容CSV',
        description: 'Excel兼容的CSV文件，包含BOM编码',
        extension: 'csv',
        mimeType: 'application/vnd.ms-excel'
      }
    ],
    availableColumns: Object.entries(COLUMN_MAPPINGS).map(([key, name]) => ({
      id: key,
      name,
      isAI: AI_COLUMNS.includes(key),
      isDefault: DEFAULT_COLUMNS.includes(key)
    })),
    limits: {
      maxRecords: 10000,
      maxFileSize: '50MB'
    }
  })
}