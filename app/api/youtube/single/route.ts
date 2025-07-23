// 单个YouTube视频数据获取API

import { NextRequest, NextResponse } from 'next/server'
import { getYouTubeClient } from '@/lib/youtube-api'
import { SingleVideoRequest, YouTubeAPIResponse, YouTubeVideo } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: SingleVideoRequest = await request.json()
    
    // 验证请求参数
    if (!body.videoUrl) {
      return NextResponse.json(
        {
          success: false,
          error: '视频URL不能为空',
        } satisfies YouTubeAPIResponse<never>,
        { status: 400 }
      )
    }

    // 验证URL格式
    if (!body.videoUrl.includes('youtube.com') && !body.videoUrl.includes('youtu.be')) {
      return NextResponse.json(
        {
          success: false,
          error: '请提供有效的YouTube视频链接',
        } satisfies YouTubeAPIResponse<never>,
        { status: 400 }
      )
    }

    console.log(`获取单个视频数据: ${body.videoUrl}`)

    // 获取YouTube客户端并调用API
    const youtubeClient = getYouTubeClient()
    const result = await youtubeClient.getSingleVideo(body)

    if (!result.success) {
      return NextResponse.json(result, { 
        status: result.error?.includes('not found') ? 404 : 500 
      })
    }

    console.log(`成功获取视频数据: ${result.data?.title} (配额使用: ${result.quotaUsed})`)

    // 返回成功结果
    return NextResponse.json(result)

  } catch (error) {
    console.error('单视频API错误:', error)

    // 处理不同类型的错误
    let errorMessage = '获取视频数据时发生未知错误'
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message
      
      // 根据错误类型设置状态码
      if (error.message.includes('Invalid video URL')) {
        statusCode = 400
      } else if (error.message.includes('not found')) {
        statusCode = 404
      } else if (error.message.includes('quota')) {
        statusCode = 429
        errorMessage = 'YouTube API配额已用完，请稍后重试'
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