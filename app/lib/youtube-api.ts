// YouTube API客户端封装

import { google, youtube_v3 } from 'googleapis'
import {
  YouTubeVideo,
  YouTubeChannel,
  YouTubeAPIResponse,
  BatchProcessResult,
  YouTubeAPIError,
  SingleVideoRequest,
  MultipleVideosRequest,
  ChannelVideosRequest,
} from '@/types'

// YouTube API配置
const YOUTUBE_API_CONFIG = {
  version: 'v3' as const,
  maxResults: 50,
  quotaCosts: {
    'videos.list': 1,
    'channels.list': 1,
    'search.list': 100,
    'playlistItems.list': 1,
  },
  batchSize: 20, // 批处理大小，避免配额超限
}

// YouTube API客户端类
export class YouTubeAPIClient {
  private youtube: youtube_v3.Youtube
  private quotaUsed = 0

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new YouTubeAPIError('YouTube API key is required')
    }

    this.youtube = google.youtube({
      version: YOUTUBE_API_CONFIG.version,
      auth: apiKey,
    })
  }

  /**
   * 从YouTube URL提取视频ID
   */
  extractVideoId(url: string): string | null {
    // 支持多种YouTube URL格式
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return match[1]
      }
    }
    return null
  }

  /**
   * 从频道URL提取频道标识符
   */
  extractChannelId(url: string): string | null {
    const patterns = [
      /youtube\.com\/channel\/([^\/\?&]+)/,
      /youtube\.com\/c\/([^\/\?&]+)/,
      /youtube\.com\/user\/([^\/\?&]+)/,
      /youtube\.com\/@([^\/\?&]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return match[1]
      }
    }
    return null
  }

  /**
   * 通过用户名或自定义URL获取频道ID
   */
  async resolveChannelId(identifier: string): Promise<string | null> {
    try {
      console.log('正在解析频道ID:', identifier)
      
      // 如果已经是频道ID格式，直接返回
      if (/^UC[\w-]{21}[AQgw]$/.test(identifier)) {
        console.log('已是频道ID格式，直接返回')
        return identifier
      }

      // 通过search API查找频道
      console.log('通过搜索API查找频道...')
      const searchResponse = await this.youtube.search.list({
        part: ['snippet'],
        q: identifier,
        type: ['channel'],
        maxResults: 1,
      })

      this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['search.list']

      if (searchResponse.data.items?.length) {
        const channelId = searchResponse.data.items[0].snippet?.channelId
        console.log('搜索API找到频道ID:', channelId)
        return channelId || null
      }

      // 尝试通过channels API直接查找
      console.log('尝试通过channels API查找...')
      try {
        const channelResponse = await this.youtube.channels.list({
          part: ['id'],
          forUsername: identifier,
        })

        this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['channels.list']

        if (channelResponse.data.items?.length) {
          const channelId = channelResponse.data.items[0].id
          console.log('channels API找到频道ID:', channelId)
          return channelId || null
        }
      } catch (error) {
        // forUsername 可能不支持所有类型的标识符
        console.log('forUsername lookup failed:', error.message)
      }

      console.log('未找到频道ID')
      return null
    } catch (error) {
      console.error('Error resolving channel ID:', error)
      return null
    }
  }

  /**
   * 获取单个视频信息
   */
  async getSingleVideo(request: SingleVideoRequest): Promise<YouTubeAPIResponse<YouTubeVideo>> {
    try {
      const videoId = this.extractVideoId(request.videoUrl)
      if (!videoId) {
        throw new YouTubeAPIError('Invalid video URL', 'INVALID_URL')
      }

      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [videoId],
      })

      this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['videos.list']

      if (!response.data.items?.length) {
        throw new YouTubeAPIError('Video not found', 'VIDEO_NOT_FOUND')
      }

      const videoData = this.transformVideoData(response.data.items[0], request.videoUrl)

      return {
        success: true,
        data: videoData,
        quotaUsed: this.quotaUsed,
      }
    } catch (error) {
      console.error('YouTube API Error:', error)
      return this.handleError(error)
    }
  }

  /**
   * 获取多个视频信息
   */
  async getMultipleVideos(request: MultipleVideosRequest): Promise<YouTubeAPIResponse<BatchProcessResult>> {
    try {
      const videoIds: string[] = []
      const urlMap = new Map<string, string>() // videoId -> originalUrl

      // 提取所有有效的视频ID
      for (const url of request.videoUrls) {
        const videoId = this.extractVideoId(url)
        if (videoId) {
          videoIds.push(videoId)
          urlMap.set(videoId, url)
        }
      }

      if (videoIds.length === 0) {
        throw new YouTubeAPIError('No valid video URLs provided', 'NO_VALID_URLS')
      }

      const batchSize = request.batchSize || YOUTUBE_API_CONFIG.batchSize
      const successful: YouTubeVideo[] = []
      const failed: { url: string; error: string }[] = []

      // 分批处理，避免API限制
      for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize)
        
        try {
          const response = await this.youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails'],
            id: batch,
          })

          this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['videos.list']

          // 处理成功的视频
          response.data.items?.forEach(item => {
            if (item.id) {
              const originalUrl = urlMap.get(item.id) || `https://www.youtube.com/watch?v=${item.id}`
              successful.push(this.transformVideoData(item, originalUrl))
            }
          })

          // 处理失败的视频
          const foundIds = new Set(response.data.items?.map(item => item.id) || [])
          batch.forEach(id => {
            if (!foundIds.has(id)) {
              const originalUrl = urlMap.get(id) || id
              failed.push({
                url: originalUrl,
                error: 'Video not found or unavailable'
              })
            }
          })

        } catch (error) {
          // 批次处理失败，记录所有视频为失败
          batch.forEach(id => {
            const originalUrl = urlMap.get(id) || id
            failed.push({
              url: originalUrl,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          })
        }
      }

      const result: BatchProcessResult = {
        successful,
        failed,
        quotaUsed: this.quotaUsed,
      }

      return {
        success: true,
        data: result,
        quotaUsed: this.quotaUsed,
      }
    } catch (error) {
      console.error('YouTube API Batch Error:', error)
      return this.handleError(error)
    }
  }

  /**
   * 获取频道视频列表
   */
  async getChannelVideos(request: ChannelVideosRequest): Promise<YouTubeAPIResponse<BatchProcessResult>> {
    try {
      console.log('开始获取频道视频:', request.channelUrl, '最大数量:', request.maxResults, '排序:', request.order)
      
      let channelId = request.channelId

      // 如果提供的是频道URL，提取频道标识符
      if (request.channelUrl && !channelId) {
        const identifier = this.extractChannelId(request.channelUrl)
        if (!identifier) {
          throw new YouTubeAPIError('Invalid channel URL', 'INVALID_CHANNEL_URL')
        }
        
        // 解析为真实的频道ID
        channelId = await this.resolveChannelId(identifier)
        if (!channelId) {
          throw new YouTubeAPIError('Could not resolve channel ID from URL', 'CHANNEL_ID_RESOLUTION_FAILED')
        }
        
        console.log('解析频道ID:', identifier, '->', channelId)
      }

      if (!channelId) {
        throw new YouTubeAPIError('Channel ID or URL is required', 'MISSING_CHANNEL_ID')
      }

      // 首先获取频道信息和上传播放列表ID
      const channelResponse = await this.youtube.channels.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [channelId],
      })

      this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['channels.list']

      if (!channelResponse.data.items?.length) {
        throw new YouTubeAPIError('Channel not found', 'CHANNEL_NOT_FOUND')
      }

      const channel = channelResponse.data.items[0]
      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads

      if (!uploadsPlaylistId) {
        throw new YouTubeAPIError('Channel uploads playlist not found', 'NO_UPLOADS_PLAYLIST')
      }

      // 获取视频ID列表
      const maxResults = Math.min(request.maxResults || 50, 50)
      const playlistResponse = await this.youtube.playlistItems.list({
        part: ['snippet'],
        playlistId: uploadsPlaylistId,
        maxResults,
      })

      this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['playlistItems.list']

      const videoIds = playlistResponse.data.items
        ?.map(item => item.snippet?.resourceId?.videoId)
        .filter(Boolean) as string[]

      if (videoIds.length === 0) {
        throw new YouTubeAPIError('No videos found in channel', 'NO_VIDEOS_FOUND')
      }

      // 获取视频详细信息
      const videosResponse = await this.youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: videoIds,
      })

      this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['videos.list']

      const successful: YouTubeVideo[] = videosResponse.data.items?.map(item => {
        const videoUrl = `https://www.youtube.com/watch?v=${item.id}`
        return this.transformVideoData(item, videoUrl)
      }) || []

      const result: BatchProcessResult = {
        successful,
        failed: [],
        quotaUsed: this.quotaUsed,
      }

      return {
        success: true,
        data: result,
        quotaUsed: this.quotaUsed,
        totalResults: playlistResponse.data.pageInfo?.totalResults,
        nextPageToken: playlistResponse.data.nextPageToken,
      }
    } catch (error) {
      console.error('YouTube Channel API Error:', error)
      return this.handleError(error)
    }
  }

  /**
   * 转换YouTube API数据为内部数据格式
   */
  private transformVideoData(item: youtube_v3.Schema$Video, videoUrl: string): YouTubeVideo {
    const snippet = item.snippet
    const statistics = item.statistics
    const contentDetails = item.contentDetails

    return {
      id: item.id || '',
      title: snippet?.title || '',
      description: snippet?.description || '',
      thumbnail: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || '',
      publishedAt: snippet?.publishedAt || '',
      viewCount: parseInt(statistics?.viewCount || '0', 10),
      likeCount: parseInt(statistics?.likeCount || '0', 10),
      commentCount: parseInt(statistics?.commentCount || '0', 10),
      duration: this.parseDuration(contentDetails?.duration || ''),
      channelTitle: snippet?.channelTitle || '',
      channelId: snippet?.channelId || '',
      videoUrl,
      tags: snippet?.tags || [],
      categoryId: snippet?.categoryId,
    }
  }

  /**
   * 解析YouTube ISO 8601时长格式
   */
  private parseDuration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return '0:00'

    const hours = parseInt(match[1] || '0', 10)
    const minutes = parseInt(match[2] || '0', 10)
    const seconds = parseInt(match[3] || '0', 10)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  /**
   * 错误处理
   */
  private handleError(error: any): YouTubeAPIResponse<any> {
    let message = 'Unknown error occurred'
    let code = 'UNKNOWN_ERROR'
    let quotaExceeded = false

    if (error instanceof YouTubeAPIError) {
      message = error.message
      code = error.code || 'YOUTUBE_API_ERROR'
      quotaExceeded = error.quotaExceeded || false
    } else if (error?.response?.data?.error) {
      const apiError = error.response.data.error
      message = apiError.message || message
      code = apiError.errors?.[0]?.reason || 'API_ERROR'
      quotaExceeded = code === 'quotaExceeded'
    } else if (error instanceof Error) {
      message = error.message
    }

    return {
      success: false,
      error: message,
      quotaUsed: this.quotaUsed,
    }
  }

  /**
   * 获取当前配额使用情况
   */
  getQuotaUsage(): number {
    return this.quotaUsed
  }

  /**
   * 重置配额计数器
   */
  resetQuotaCounter(): void {
    this.quotaUsed = 0
  }
}

// 创建单例实例
let youtubeClient: YouTubeAPIClient | null = null

export function getYouTubeClient(): YouTubeAPIClient {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new YouTubeAPIError('YOUTUBE_API_KEY environment variable is not set')
  }

  if (!youtubeClient) {
    youtubeClient = new YouTubeAPIClient(apiKey)
  }

  return youtubeClient
}