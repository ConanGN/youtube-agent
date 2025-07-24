// YouTube频道视频列表获取API

import { NextRequest, NextResponse } from 'next/server'
import { getYouTubeClient } from '@/lib/youtube-api'
import { ChannelVideosRequest, YouTubeAPIResponse, BatchProcessResult } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: ChannelVideosRequest = await request.json()
    
    // 验证请求参数
    if (!body.channelUrl && !body.channelId) {
      return NextResponse.json(
        {
          success: false,
          error: '请提供频道URL或频道ID',
        } satisfies YouTubeAPIResponse<never>,
        { status: 400 }
      )
    }

    // 验证频道URL格式（如果提供的是URL）
    if (body.channelUrl && !body.channelUrl.includes('youtube.com')) {
      return NextResponse.json(
        {
          success: false,
          error: '请提供有效的YouTube频道链接',
        } satisfies YouTubeAPIResponse<never>,
        { status: 400 }
      )
    }

    // 验证maxResults参数
    const maxResults = body.maxResults || 50
    if (maxResults > 200) {
      return NextResponse.json(
        {
          success: false,
          error: '单次最多获取200个视频',
        } satisfies YouTubeAPIResponse<never>,
        { status: 400 }
      )
    }

    // 验证order参数
    const validOrders = ['date', 'rating', 'relevance', 'title', 'viewCount']
    const order = body.order || 'date'
    if (!validOrders.includes(order)) {
      return NextResponse.json(
        {
          success: false,
          error: `排序方式必须是以下之一: ${validOrders.join(', ')}`,
        } satisfies YouTubeAPIResponse<never>,
        { status: 400 }
      )
    }

    console.log(
      `开始获取频道视频: ${body.channelUrl || body.channelId}, 最大数量: ${maxResults}, 排序: ${order}`
    )

    // 获取YouTube客户端并调用API
    const youtubeClient = getYouTubeClient()
    const result = await youtubeClient.getChannelVideos({
      channelUrl: body.channelUrl,
      channelId: body.channelId,
      maxResults,
      order,
    })

    if (!result.success) {
      // 根据错误类型返回不同的状态码和建议
      let statusCode = 500
      let errorMessage = result.error
      let suggestions: string[] = []

      if (result.error?.includes('not found') || result.error?.includes('不存在')) {
        statusCode = 404
        suggestions = [
          '请检查频道链接是否正确',
          '确认频道是否真实存在',
          '尝试使用其他格式的频道链接',
          '可以尝试以下测试频道：https://www.youtube.com/@MrBeast'
        ]
      } else if (result.error?.includes('Invalid channel')) {
        statusCode = 400
        suggestions = [
          '请使用正确的YouTube频道链接格式',
          '支持的格式：https://www.youtube.com/@频道名',
          '或者：https://www.youtube.com/channel/频道ID'
        ]
      }
      
      const responseData = {
        ...result,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      }
      
      return NextResponse.json(responseData, { status: statusCode })
    }

    const batchResult = result.data as BatchProcessResult

    console.log(
      `频道视频获取完成: 成功${batchResult.successful.length}个视频, 配额使用: ${result.quotaUsed}`
    )

    // 检查是否获取到视频
    if (batchResult.successful.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '该频道没有找到可访问的视频',
          data: batchResult,
          quotaUsed: result.quotaUsed,
        } satisfies YouTubeAPIResponse<BatchProcessResult>,
        { status: 404 }
      )
    }

    // 返回成功结果
    return NextResponse.json({
      success: true,
      data: batchResult,
      quotaUsed: result.quotaUsed,
      totalResults: result.totalResults,
      nextPageToken: result.nextPageToken,
    } satisfies YouTubeAPIResponse<BatchProcessResult>)

  } catch (error) {
    console.error('频道视频API错误:', error)

    // 处理不同类型的错误
    let errorMessage = '获取频道视频时发生未知错误'
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message
      
      // 根据错误类型设置状态码
      if (error.message.includes('Channel not found')) {
        statusCode = 404
        errorMessage = '找不到指定的频道'
      } else if (error.message.includes('Invalid channel')) {
        statusCode = 400
        errorMessage = '频道URL或ID格式无效'
      } else if (error.message.includes('quota')) {
        statusCode = 429
        errorMessage = 'YouTube API配额已用完，请稍后重试'
      } else if (error.message.includes('timeout')) {
        statusCode = 408
        errorMessage = '请求超时，请稍后重试'
      } else if (error.message.includes('private')) {
        statusCode = 403
        errorMessage = '该频道为私有频道，无法访问'
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      } satisfies YouTubeAPIResponse<never>,
      { status: statusCode }
    )
  }
}

// 处理GET请求，用于获取频道基本信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channelUrl = searchParams.get('url')
    const channelId = searchParams.get('id')

    if (!channelUrl && !channelId) {
      return NextResponse.json(
        {
          success: false,
          error: '请提供频道URL或频道ID',
        },
        { status: 400 }
      )
    }

    // 这里可以实现获取频道基本信息的逻辑
    // 暂时返回简单响应
    return NextResponse.json({
      success: true,
      message: '频道信息获取功能开发中',
    })

  } catch (error) {
    console.error('获取频道信息错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取频道信息时发生错误',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}