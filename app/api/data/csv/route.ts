// CSV数据处理API
// 处理上传的CSV表格数据，不限制为YouTube链接

import { NextRequest, NextResponse } from 'next/server'

interface CSVDataRequest {
  data: string[] // 从CSV解析出的数据
}

interface CSVDataItem {
  id: string
  originalData: string
  title: string
  description: string
  tags: string[]
  category: string
  publishedAt: string
  status: 'processed' | 'pending'
}

interface CSVProcessResult {
  successful: CSVDataItem[]
  failed: Array<{ data: string; error: string }>
}

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: CSVDataRequest = await request.json()
    
    // 验证请求参数
    if (!body.data || !Array.isArray(body.data) || body.data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '请提供有效的数据列表',
        },
        { status: 400 }
      )
    }

    // 限制批量处理数量
    const maxItems = 1000
    if (body.data.length > maxItems) {
      return NextResponse.json(
        {
          success: false,
          error: `一次最多只能处理${maxItems}条数据`,
        },
        { status: 400 }
      )
    }

    console.log(`开始处理CSV数据，共${body.data.length}条`)

    // 处理数据：为每条数据创建一个标准化的对象
    const successful: CSVDataItem[] = []
    const failed: Array<{ data: string; error: string }> = []

    body.data.forEach((item, index) => {
      try {
        const trimmedItem = String(item).trim()
        if (!trimmedItem) {
          failed.push({ data: item, error: '数据为空' })
          return
        }

        // 创建标准化的数据项
        const dataItem: CSVDataItem = {
          id: `csv_${Date.now()}_${index}`,
          originalData: trimmedItem,
          title: trimmedItem.length > 50 ? `${trimmedItem.substring(0, 50)}...` : trimmedItem,
          description: `CSV数据项: ${trimmedItem}`,
          tags: [],
          category: 'CSV数据',
          publishedAt: new Date().toISOString(),
          status: 'processed'
        }

        successful.push(dataItem)
      } catch (error) {
        failed.push({ 
          data: item, 
          error: error instanceof Error ? error.message : '处理失败'
        })
      }
    })

    const result: CSVProcessResult = {
      successful,
      failed
    }

    console.log(
      `CSV数据处理完成: 成功${result.successful.length}条, 失败${result.failed.length}条`
    )

    // 如果没有任何成功的结果，返回错误
    if (result.successful.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '所有数据都处理失败',
          data: result,
        },
        { status: 400 }
      )
    }

    // 返回成功结果
    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('CSV数据API错误:', error)

    let errorMessage = '处理CSV数据时发生未知错误'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

// 处理预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}