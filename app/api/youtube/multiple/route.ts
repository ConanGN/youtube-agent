// 批量YouTube视频数据获取API

import { NextRequest, NextResponse } from 'next/server'
import { getYouTubeClient } from '@/lib/youtube-api'
import { MultipleVideosRequest, YouTubeAPIResponse, BatchProcessResult } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: MultipleVideosRequest = await request.json()
    
    // 验证请求参数
    if (!body.videoUrls || !Array.isArray(body.videoUrls) || body.videoUrls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '请提供有效的视频URL列表',
        } satisfies YouTubeAPIResponse<never>,
        { status: 400 }
      )
    }

    // 限制批量处理数量，避免请求超时和配额过度使用
    const maxUrls = 100
    if (body.videoUrls.length > maxUrls) {
      return NextResponse.json(
        {
          success: false,
          error: `一次最多只能处理${maxUrls}个视频链接`,
        } satisfies YouTubeAPIResponse<never>,
        { status: 400 }
      )
    }

    // 过滤无效URL
    const validUrls = body.videoUrls.filter(url => 
      url && 
      typeof url === 'string' && 
      (url.includes('youtube.com') || url.includes('youtu.be'))
    )

    if (validUrls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '没有找到有效的YouTube视频链接',
        } satisfies YouTubeAPIResponse<never>,
        { status: 400 }
      )
    }

    console.log(`开始批量获取视频数据，共${validUrls.length}个链接`)

    // 获取YouTube客户端并调用API
    const youtubeClient = getYouTubeClient()
    const result = await youtubeClient.getMultipleVideos({
      videoUrls: validUrls,
      batchSize: body.batchSize || 20, // 默认批处理大小
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    const batchResult = result.data as BatchProcessResult

    console.log(
      `批量处理完成: 成功${batchResult.successful.length}个, 失败${batchResult.failed.length}个, 配额使用: ${result.quotaUsed}`
    )

    // 如果没有任何成功的结果，返回错误
    if (batchResult.successful.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '所有视频链接都处理失败',
          data: batchResult,
          quotaUsed: result.quotaUsed,
        } satisfies YouTubeAPIResponse<BatchProcessResult>,
        { status: 404 }
      )
    }

    // 返回成功结果（包含部分失败的情况）
    return NextResponse.json({
      success: true,
      data: batchResult,
      quotaUsed: result.quotaUsed,
    } satisfies YouTubeAPIResponse<BatchProcessResult>)

  } catch (error) {
    console.error('批量视频API错误:', error)

    // 处理不同类型的错误
    let errorMessage = '批量获取视频数据时发生未知错误'
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message
      
      // 根据错误类型设置状态码
      if (error.message.includes('quota')) {
        statusCode = 429
        errorMessage = 'YouTube API配额已用完，请稍后重试'
      } else if (error.message.includes('timeout')) {
        statusCode = 408
        errorMessage = '请求超时，请减少视频数量或稍后重试'
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