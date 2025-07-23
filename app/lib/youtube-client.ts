// YouTube客户端API工具函数
// 提供前端使用的YouTube数据处理工具

import { YouTubeVideo } from '@/types'

// YouTube URL验证和解析工具
export class YouTubeUrlParser {
  // YouTube URL格式模式
  private static readonly URL_PATTERNS = {
    VIDEO: [
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ],
    CHANNEL: [
      /youtube\.com\/channel\/([UC][\w-]{21}[AQgw])/,
      /youtube\.com\/c\/([^\/\?&]+)/,
      /youtube\.com\/user\/([^\/\?&]+)/,
      /youtube\.com\/@([^\/\?&]+)/,
    ],
    PLAYLIST: [
      /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
      /youtube\.com\/watch\?.*list=([a-zA-Z0-9_-]+)/,
    ]
  }

  // 验证YouTube视频URL
  static isValidVideoUrl(url: string): boolean {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return false
    
    return this.URL_PATTERNS.VIDEO.some(pattern => pattern.test(trimmedUrl))
  }

  // 验证YouTube频道URL
  static isValidChannelUrl(url: string): boolean {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return false
    
    return this.URL_PATTERNS.CHANNEL.some(pattern => pattern.test(trimmedUrl))
  }

  // 验证YouTube播放列表URL
  static isValidPlaylistUrl(url: string): boolean {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return false
    
    return this.URL_PATTERNS.PLAYLIST.some(pattern => pattern.test(trimmedUrl))
  }

  // 从URL提取视频ID
  static extractVideoId(url: string): string | null {
    const patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /embed\/([a-zA-Z0-9_-]{11})/,
      /v\/([a-zA-Z0-9_-]{11})/,
      /shorts\/([a-zA-Z0-9_-]{11})/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return match[1]
      }
    }
    return null
  }

  // 从URL提取频道信息
  static extractChannelInfo(url: string): { type: string; id: string } | null {
    const channelPatterns = [
      { pattern: /channel\/([UC][\w-]{21}[AQgw])/, type: 'channel' },
      { pattern: /c\/([^\/\?&]+)/, type: 'custom' },
      { pattern: /user\/([^\/\?&]+)/, type: 'user' },
      { pattern: /@([^\/\?&]+)/, type: 'handle' },
    ]

    for (const { pattern, type } of channelPatterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return { type, id: match[1] }
      }
    }
    return null
  }

  // 标准化YouTube URL
  static normalizeUrl(url: string): string {
    const videoId = this.extractVideoId(url)
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`
    }
    return url
  }

  // 生成缩略图URL
  static getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'medium'): string {
    const qualityMap = {
      default: 'default',
      medium: 'mqdefault',
      high: 'hqdefault',
      standard: 'sddefault',
      maxres: 'maxresdefault'
    }
    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
  }
}

// YouTube数据处理工具
export class YouTubeDataProcessor {
  // 格式化播放量
  static formatViewCount(viewCount: number): string {
    if (viewCount >= 1_000_000_000) {
      return `${(viewCount / 1_000_000_000).toFixed(1)}B`
    } else if (viewCount >= 1_000_000) {
      return `${(viewCount / 1_000_000).toFixed(1)}M`
    } else if (viewCount >= 1_000) {
      return `${(viewCount / 1_000).toFixed(1)}K`
    }
    return viewCount.toString()
  }

  // 格式化时长
  static formatDuration(duration: string): string {
    // ISO 8601 duration格式转换为HH:MM:SS
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return duration

    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  // 格式化发布时间
  static formatPublishedAt(publishedAt: string): string {
    const date = new Date(publishedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}周前`
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)}个月前`
    } else {
      return `${Math.floor(diffDays / 365)}年前`
    }
  }

  // 清理和格式化描述
  static formatDescription(description: string, maxLength: number = 200): string {
    if (!description) return ''
    
    // 移除多余的换行和空格
    const cleaned = description
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()

    if (cleaned.length <= maxLength) {
      return cleaned
    }

    // 智能截断，尽量在句子结束处
    const truncated = cleaned.substring(0, maxLength)
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?'),
      truncated.lastIndexOf('\n')
    )

    if (lastSentenceEnd > maxLength * 0.7) {
      return truncated.substring(0, lastSentenceEnd + 1).trim()
    }

    return truncated.trim() + '...'
  }

  // 提取关键词
  static extractKeywords(text: string, maxKeywords: number = 10): string[] {
    if (!text) return []

    // 移除常见停用词
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'
    ])

    // 文本预处理和词频统计
    const words = text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.has(word))

    const wordCount = new Map<string, number>()
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1)
    })

    // 按频率排序并返回前N个
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word)
  }

  // 计算内容质量分数
  static calculateQualityScore(video: YouTubeVideo): number {
    let score = 0
    
    // 标题质量 (0-30分)
    if (video.title && video.title.length > 10) {
      score += Math.min(30, video.title.length / 2)
    }

    // 描述质量 (0-25分)
    if (video.description && video.description.length > 50) {
      score += Math.min(25, video.description.length / 20)
    }

    // 参与度指标 (0-25分)
    if (video.viewCount > 0 && video.likeCount > 0) {
      const engagementRate = video.likeCount / video.viewCount
      score += Math.min(25, engagementRate * 10000)
    }

    // 标签质量 (0-10分)
    if (video.tags && video.tags.length > 0) {
      score += Math.min(10, video.tags.length * 2)
    }

    // AI增强内容 (0-10分)
    if (video.enhancedTitle || video.summarizedDescription) {
      score += 10
    }

    return Math.round(Math.min(100, score))
  }
}

// 批量操作工具
export class YouTubeBatchProcessor {
  // 批量验证URL
  static validateUrls(urls: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = []
    const invalid: string[] = []

    urls.forEach(url => {
      if (YouTubeUrlParser.isValidVideoUrl(url)) {
        valid.push(url)
      } else {
        invalid.push(url)
      }
    })

    return { valid, invalid }
  }

  // 去重视频数据
  static deduplicateVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
    const seen = new Set<string>()
    return videos.filter(video => {
      if (seen.has(video.id)) {
        return false
      }
      seen.add(video.id)
      return true
    })
  }

  // 按条件筛选视频
  static filterVideos(
    videos: YouTubeVideo[], 
    filters: {
      minViews?: number
      maxViews?: number
      minLikes?: number
      channelTitles?: string[]
      dateRange?: { start: Date; end: Date }
      hasAIContent?: boolean
      keywords?: string[]
    }
  ): YouTubeVideo[] {
    return videos.filter(video => {
      // 播放量筛选
      if (filters.minViews && video.viewCount < filters.minViews) return false
      if (filters.maxViews && video.viewCount > filters.maxViews) return false

      // 点赞数筛选
      if (filters.minLikes && video.likeCount < filters.minLikes) return false

      // 频道筛选
      if (filters.channelTitles && !filters.channelTitles.includes(video.channelTitle)) return false

      // 日期范围筛选
      if (filters.dateRange) {
        const publishDate = new Date(video.publishedAt)
        if (publishDate < filters.dateRange.start || publishDate > filters.dateRange.end) return false
      }

      // AI内容筛选
      if (filters.hasAIContent !== undefined) {
        const hasAI = !!(video.enhancedTitle || video.summarizedDescription || video.translatedTitle)
        if (hasAI !== filters.hasAIContent) return false
      }

      // 关键词筛选
      if (filters.keywords && filters.keywords.length > 0) {
        const content = `${video.title} ${video.description}`.toLowerCase()
        const hasKeyword = filters.keywords.some(keyword => 
          content.includes(keyword.toLowerCase())
        )
        if (!hasKeyword) return false
      }

      return true
    })
  }

  // 排序视频
  static sortVideos(
    videos: YouTubeVideo[], 
    sortBy: 'publishedAt' | 'viewCount' | 'likeCount' | 'commentCount' | 'title' | 'channelTitle',
    order: 'asc' | 'desc' = 'desc'
  ): YouTubeVideo[] {
    return [...videos].sort((a, b) => {
      let valueA: any = a[sortBy]
      let valueB: any = b[sortBy]

      // 处理字符串类型
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase()
        valueB = valueB.toLowerCase()
      }

      // 处理日期类型
      if (sortBy === 'publishedAt') {
        valueA = new Date(valueA).getTime()
        valueB = new Date(valueB).getTime()
      }

      if (order === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0
      }
    })
  }

  // 统计分析
  static getStatistics(videos: YouTubeVideo[]) {
    if (videos.length === 0) {
      return {
        totalVideos: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        averageViews: 0,
        averageLikes: 0,
        uniqueChannels: 0,
        editedVideos: 0,
        aiEnhancedVideos: 0
      }
    }

    const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0)
    const totalLikes = videos.reduce((sum, v) => sum + v.likeCount, 0)
    const totalComments = videos.reduce((sum, v) => sum + v.commentCount, 0)
    const uniqueChannels = new Set(videos.map(v => v.channelId)).size
    const editedVideos = videos.filter(v => v.isEdited).length
    const aiEnhancedVideos = videos.filter(v => v.enhancedTitle || v.summarizedDescription).length

    return {
      totalVideos: videos.length,
      totalViews,
      totalLikes,
      totalComments,
      averageViews: Math.round(totalViews / videos.length),
      averageLikes: Math.round(totalLikes / videos.length),
      uniqueChannels,
      editedVideos,
      aiEnhancedVideos
    }
  }
}