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
  private readonly maxRetries = 3 // 最大重试次数
  private readonly retryDelay = 1000 // 重试延迟（毫秒）

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
   * 带重试的API请求包装器
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string = 'API request'
  ): Promise<T> {
    let lastError: any

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`${context} - 尝试 ${attempt}/${this.maxRetries}`)
        const result = await operation()
        if (attempt > 1) {
          console.log(`${context} - 重试成功`)
        }
        return result
      } catch (error) {
        lastError = error
        console.error(`${context} - 尝试 ${attempt} 失败:`, error)

        // 检查是否应该重试
        const shouldRetry = this.shouldRetry(error, attempt)
        if (!shouldRetry) {
          console.log(`${context} - 不适合重试，直接抛出错误`)
          throw error
        }

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1) // 指数退避
          console.log(`${context} - 等待 ${delay}ms 后重试`)
          await this.sleep(delay)
        }
      }
    }

    console.error(`${context} - 所有重试都失败`)
    throw lastError
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any, attempt: number): boolean {
    // 已达到最大重试次数
    if (attempt >= this.maxRetries) {
      return false
    }

    // 检查错误类型
    const errorCode = error?.code || error?.response?.status
    const errorMessage = error?.message || ''

    // 不重试的错误类型
    const noRetryErrors = [
      400, // 请求格式错误
      401, // 认证失败
      403, // 权限不足或配额用完
      404, // 资源不存在
    ]

    if (noRetryErrors.includes(errorCode)) {
      return false
    }

    // 应该重试的错误类型
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'timeout',
      '500',
      '502',
      '503',
      '504',
    ]

    return retryableErrors.some(
      retryableError =>
        errorMessage.includes(retryableError) ||
        errorCode === parseInt(retryableError, 10)
    )
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 处理搜索结果并找到最匹配的频道
   */
  private async processSearchResults(items: any[], searchTerm: string): Promise<string | null> {
    const cleanSearchTerm = searchTerm.toLowerCase()
    
    console.log(`处理 ${items.length} 个搜索结果`)
    
    for (const item of items) {
      const channelTitle = item.snippet?.title?.toLowerCase() || ''
      const customUrl = item.snippet?.customUrl?.toLowerCase() || ''
      
      console.log('检查频道:', {
        title: item.snippet?.title,
        customUrl: item.snippet?.customUrl,
        channelId: item.snippet?.channelId
      })
      
      // 精确匹配自定义URL
      if (customUrl === `@${cleanSearchTerm}` || customUrl === cleanSearchTerm) {
        const channelId = item.snippet?.channelId
        console.log('精确匹配找到频道ID:', channelId)
        // 验证此频道ID是否有效
        if (await this.verifyChannelId(channelId)) {
          return channelId || null
        }
      }
      
      // 模糊匹配自定义URL
      if (customUrl.includes(cleanSearchTerm)) {
        const channelId = item.snippet?.channelId
        console.log('模糊匹配找到频道ID:', channelId)
        if (await this.verifyChannelId(channelId)) {
          return channelId || null
        }
      }
      
      // 匹配频道标题
      if (channelTitle.includes(cleanSearchTerm)) {
        const channelId = item.snippet?.channelId
        console.log('标题匹配找到频道ID:', channelId)
        if (await this.verifyChannelId(channelId)) {
          return channelId || null
        }
      }
    }
    
    // 如果没有匹配，返回第一个结果（如果存在）
    if (items.length > 0) {
      const channelId = items[0].snippet?.channelId
      console.log('返回第一个搜索结果:', channelId)
      if (await this.verifyChannelId(channelId)) {
        return channelId || null
      }
    }
    
    return null
  }

  /**
   * 验证频道ID是否有效
   */
  private async verifyChannelId(channelId: string | undefined): Promise<boolean> {
    if (!channelId) return false
    
    try {
      const verifyResponse = await this.withRetry(
        () => this.youtube.channels.list({
          part: ['snippet'],
          id: [channelId],
        }),
        `验证频道ID: ${channelId}`
      )
      
      const isValid = (verifyResponse.data.items?.length || 0) > 0
      console.log(`频道ID ${channelId} 验证结果:`, isValid ? '有效' : '无效')
      return isValid
    } catch (e) {
      console.log('频道ID验证失败:', channelId, (e as Error).message)
      return false
    }
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
        // 对URL编码的字符进行解码，支持中文等非ASCII字符
        try {
          return decodeURIComponent(match[1])
        } catch (error) {
          // 如果解码失败，返回原始字符串
          console.warn('URL解码失败，使用原始字符串:', match[1])
          return match[1]
        }
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
      if (/^UC[\w-]{22}$/.test(identifier)) {
        console.log('已是频道ID格式，直接返回')
        return identifier
      }

      // 处理 @ 格式的频道名称
      const cleanIdentifier = identifier.replace(/^@/, '')
      console.log('清理后的标识符:', cleanIdentifier)
      
      // 已知频道映射表（用于快速解析常见频道）
      const knownChannels: Record<string, string> = {
        'mrbeast': 'UCX6OQ3DkcsbYNE6H8uQQuVA',
        'MrBeast': 'UCX6OQ3DkcsbYNE6H8uQQuVA',
        'pewdiepie': 'UC-lHJZR3Gqxm24_Vd_AJ5Yw',
        'PewDiePie': 'UC-lHJZR3Gqxm24_Vd_AJ5Yw',
        'mkbhd': 'UCBJycsmduvYEL83R_U4JriQ',
        'MKBHD': 'UCBJycsmduvYEL83R_U4JriQ',
        'linustechtips': 'UCXuqSBlHAE6Xw-yeJA0Tunw',
        'LinusTechTips': 'UCXuqSBlHAE6Xw-yeJA0Tunw',
        'verge': 'UCddiUEpeqJcYeBxX1IVBKvQ',
        'Verge': 'UCddiUEpeqJcYeBxX1IVBKvQ',
        'mrmrsgao': 'UCMUnInmOkrWN4gof9KlhNmQ',
        'MrMrsGao': 'UCMUnInmOkrWN4gof9KlhNmQ',
        'rayduenglish': 'UC02x9vEdKbKzRyJw9lIRdNg'
      }
      
      console.log('检查已知频道映射，标识符:', cleanIdentifier)
      // 先尝试直接匹配
      if (knownChannels[cleanIdentifier]) {
        const channelId = knownChannels[cleanIdentifier]
        console.log('从已知频道映射表找到频道ID（直接匹配）:', cleanIdentifier, '->', channelId)
        return channelId
      }
      
      // 尝试小写匹配
      const lowerIdentifier = cleanIdentifier.toLowerCase()
      if (knownChannels[lowerIdentifier]) {
        const channelId = knownChannels[lowerIdentifier]
        console.log('从已知频道映射表找到频道ID（小写匹配）:', lowerIdentifier, '->', channelId)
        return channelId
      }
      
      console.log('未在已知频道映射表中找到:', cleanIdentifier)

      // 方法1：通过search API查找频道（最可靠的方法）
      console.log('通过搜索API查找频道...')
      try {
        // 首先尝试精确的@格式搜索
        const searchResponse = await this.withRetry(
          () => this.youtube.search.list({
            part: ['snippet'],
            q: `"@${cleanIdentifier}"`, // 使用引号进行精确搜索
            type: ['channel'],
            maxResults: 10,
          }),
          `精确搜索频道: "@${cleanIdentifier}"`
        )

        this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['search.list']
        console.log(`精确搜索API返回 ${searchResponse.data.items?.length || 0} 个结果`)
        
        // 如果精确搜索没有结果，尝试不带引号的搜索
        if (!searchResponse.data.items?.length) {
          console.log('精确搜索无结果，尝试模糊搜索...')
          const fuzzySearchResponse = await this.withRetry(
            () => this.youtube.search.list({
              part: ['snippet'],
              q: `@${cleanIdentifier}`, // 不带引号的模糊搜索
              type: ['channel'],
              maxResults: 10,
            }),
            `模糊搜索频道: @${cleanIdentifier}`
          )
          
          this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['search.list']
          console.log(`模糊搜索API返回 ${fuzzySearchResponse.data.items?.length || 0} 个结果`)
          
          if (fuzzySearchResponse.data.items?.length) {
            return this.processSearchResults(fuzzySearchResponse.data.items, cleanIdentifier)
          }
        } else {
          return this.processSearchResults(searchResponse.data.items, cleanIdentifier)
        }

      } catch (error) {
        console.log('搜索API查找失败:', error)
      }

      // 方法2：尝试通过 forHandle 参数查找（新的 @ 格式）
      // 注意：forHandle参数在当前版本的API中可能不可用，先跳过
      console.log('跳过forHandle查找（API版本不支持）...')

      // 方法3：尝试通过channels API的forUsername查找
      console.log('尝试通过forUsername查找频道...')
      try {
        const channelResponse = await this.withRetry(
          () => this.youtube.channels.list({
            part: ['id', 'snippet'],
            forUsername: cleanIdentifier,
          }),
          `forUsername查找: ${cleanIdentifier}`
        )

        this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['channels.list']

        if (channelResponse.data.items?.length) {
          const channelId = channelResponse.data.items[0].id
          console.log('forUsername API找到频道ID:', channelId)
          return channelId || null
        }
      } catch (error) {
        console.log('forUsername lookup failed:', error)
      }

      // 方法4：尝试不带@的搜索
      console.log('尝试不带@的搜索...')
      try {
        const searchResponse2 = await this.withRetry(
          () => this.youtube.search.list({
            part: ['snippet'],
            q: cleanIdentifier, // 不带@的搜索
            type: ['channel'],
            maxResults: 10,
          }),
          `搜索频道（不带@）: ${cleanIdentifier}`
        )

        this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['search.list']
        console.log(`不带@的搜索API返回 ${searchResponse2.data.items?.length || 0} 个结果`)

        if (searchResponse2.data.items?.length) {
          const result = await this.processSearchResults(searchResponse2.data.items, cleanIdentifier)
          if (result) {
            return result
          }
        }
      } catch (error) {
        console.log('不带@搜索失败:', error)
      }

      console.log('所有方法都未找到频道ID')
      return null
    } catch (error) {
      console.error('Error resolving channel ID:', error)
      // 添加更详细的错误信息
      if (error.code === 'ETIMEDOUT') {
        throw new YouTubeAPIError('网络请求超时，请检查网络连接', 'NETWORK_TIMEOUT')
      } else if (error.code === 403) {
        throw new YouTubeAPIError('API密钥无效或配额已用完', 'API_KEY_ERROR')
      }
      return null
    }
  }

  /**
   * 获取单个视频信息
   */
  async getSingleVideo(request: SingleVideoRequest): Promise<YouTubeAPIResponse<YouTubeVideo>> {
    try {
      console.log('🎥 开始获取单个视频信息:', request.videoUrl)
      
      const videoId = this.extractVideoId(request.videoUrl)
      if (!videoId) {
        console.error('❌ 无法提取视频ID:', request.videoUrl)
        throw new YouTubeAPIError(
          `无法从链接中提取视频ID。请确保使用完整的YouTube视频链接，如：https://www.youtube.com/watch?v=dQw4w9WgXcQ`, 
          'INVALID_VIDEO_URL'
        )
      }

      console.log('🆔 提取的视频ID:', videoId)
      
      // 验证视频ID格式
      if (videoId.length !== 11) {
        console.error('❌ 视频ID长度不正确:', videoId, '长度:', videoId.length)
        throw new YouTubeAPIError(
          `视频ID长度不正确（${videoId.length}字符），YouTube视频ID应为11个字符。请检查链接是否完整。`, 
          'INVALID_VIDEO_ID'
        )
      }

      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        console.error('❌ 视频ID包含无效字符:', videoId)
        throw new YouTubeAPIError(
          `视频ID "${videoId}" 包含无效字符。视频ID只能包含字母、数字、下划线和连字符。`, 
          'INVALID_VIDEO_ID_FORMAT'
        )
      }

      const response = await this.withRetry(
        () => this.youtube.videos.list({
          part: ['snippet', 'statistics', 'contentDetails'],
          id: [videoId],
        }),
        `获取视频信息: ${videoId}`
      )

      this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['videos.list']

      if (!response.data.items?.length) {
        console.error('❌ 视频未找到或不可访问:', videoId)
        throw new YouTubeAPIError(
          `视频 "${videoId}" 不存在、已被删除或设为私有。请检查链接是否正确，或尝试其他视频链接。`, 
          'VIDEO_NOT_FOUND'
        )
      }

      const videoData = this.transformVideoData(response.data.items[0], request.videoUrl)
      console.log('✅ 视频信息获取成功:', videoData.title)

      return {
        success: true,
        data: videoData,
        quotaUsed: this.quotaUsed,
      }
    } catch (error) {
      console.error('YouTube单视频API错误:', error)
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
      console.log('🔍 开始获取频道视频:', request.channelUrl, '最大数量:', request.maxResults, '排序:', request.order)
      console.log('🔍 请求参数:', JSON.stringify(request, null, 2))
      
      let channelId = request.channelId
      console.log('🔍 初始channelId:', channelId)

      // 如果提供的是频道URL，提取频道标识符
      if (request.channelUrl && (!channelId || channelId === 'null')) {
        console.log('处理频道URL:', request.channelUrl)
        const identifier = this.extractChannelId(request.channelUrl)
        console.log('extractChannelId结果:', identifier)
        if (!identifier) {
          console.error('无法从URL中提取频道标识符:', request.channelUrl)
          throw new YouTubeAPIError('Invalid channel URL', 'INVALID_CHANNEL_URL')
        }
        
        // 解析为真实的频道ID
        console.log('开始解析频道标识符:', identifier)
        channelId = await this.resolveChannelId(identifier)
        console.log('resolveChannelId结果:', channelId)
        if (!channelId) {
          console.error('频道ID解析失败，无法找到频道:', identifier)
          throw new YouTubeAPIError(`无法找到频道 "${identifier}"，请检查频道链接是否正确或频道是否存在`, 'CHANNEL_NOT_FOUND')
        }
        
        console.log('成功解析频道ID:', identifier, '->', channelId)
        
        // 验证频道ID是否有效（预先验证，避免后续错误）
        console.log('验证频道ID有效性:', channelId)
        const validationResponse = await this.withRetry(
          () => this.youtube.channels.list({
            part: ['snippet'],
            id: [channelId!],
          }),
          `验证频道ID: ${channelId}`
        )
        
        if (!validationResponse.data.items?.length) {
          console.error('频道ID验证失败，频道不存在:', channelId)
          throw new YouTubeAPIError(`频道 "${identifier}" 不存在或已被删除`, 'CHANNEL_NOT_FOUND')
        }
        
        console.log('频道ID验证成功:', validationResponse.data.items[0].snippet?.title)
      }

      if (!channelId) {
        console.error('🚨 最终channelId为空')
        throw new YouTubeAPIError('Channel ID or URL is required', 'MISSING_CHANNEL_ID')
      }

      console.log('✅ 最终使用的channelId:', channelId)

      // 首先获取频道信息和上传播放列表ID
      console.log('🔍 开始获取频道信息，channelId:', channelId)
      const channelResponse = await this.withRetry(
        () => this.youtube.channels.list({
          part: ['snippet', 'contentDetails', 'statistics'],
          id: [channelId],
        }),
        '获取频道信息'
      )

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
      const playlistResponse = await this.withRetry(
        () => this.youtube.playlistItems.list({
          part: ['snippet'],
          playlistId: uploadsPlaylistId,
          maxResults,
        }),
        '获取播放列表'
      )

      this.quotaUsed += YOUTUBE_API_CONFIG.quotaCosts['playlistItems.list']

      const videoIds = playlistResponse.data.items
        ?.map(item => item.snippet?.resourceId?.videoId)
        .filter(Boolean) as string[]

      if (videoIds.length === 0) {
        throw new YouTubeAPIError('No videos found in channel', 'NO_VIDEOS_FOUND')
      }

      // 获取视频详细信息
      const videosResponse = await this.withRetry(
        () => this.youtube.videos.list({
          part: ['snippet', 'statistics', 'contentDetails'],
          id: videoIds,
        }),
        '获取视频详情'
      )

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
      
      // 兼容性字段：为GenericDataItem接口提供默认值
      originalData: videoUrl, // 使用视频URL作为原始数据标识
      category: 'youtube', // 标记为YouTube数据类型
      status: 'processed', // 默认为处理完成状态
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
    } else if (error?.code === 'ETIMEDOUT' || error?.errno === 'ETIMEDOUT') {
      message = '网络请求超时，请检查网络连接或稍后重试'
      code = 'NETWORK_TIMEOUT'
    } else if (error?.code === 403) {
      message = 'YouTube API密钥无效或配额已用完'
      code = 'API_KEY_ERROR'
      quotaExceeded = true
    } else if (error?.code === 404) {
      message = '找不到指定的频道或视频'
      code = 'NOT_FOUND'
    } else if (error instanceof Error) {
      message = error.message
      // 检查常见的网络错误
      if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
        code = 'NETWORK_TIMEOUT'
        message = '网络请求超时，请检查网络连接或稍后重试'
      } else if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
        code = 'DNS_ERROR'
        message = 'DNS解析失败，请检查网络连接'
      }
    }

    console.error('YouTube API错误详情:', { code, message, originalError: error })

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