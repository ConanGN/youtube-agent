import { NextRequest, NextResponse } from 'next/server';
import pLimit from 'p-limit';

// 类型定义
interface SubtitleCue {
  start: number;
  dur: number;
  text: string;
}

interface SubtitleResult {
  id: string;
  lang: string;
  cues: SubtitleCue[];
  error?: string;
}

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
}

interface PlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
}

interface SRV3Event {
  tStartMs: number;
  dDurationMs: number;
  segs?: Array<{ utf8: string }>;
}

interface SRV3Response {
  events?: SRV3Event[];
}

// 简单的LRU缓存实现
class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private readonly maxSize: number;
  private readonly ttl: number; // 缓存时间（毫秒）

  constructor(maxSize = 100, ttlMinutes = 10) {
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 更新访问时间（LRU）
    this.cache.delete(key);
    this.cache.set(key, { ...item, timestamp: Date.now() });
    return item.value;
  }

  set(key: string, value: T): void {
    // 删除旧项
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果达到最大容量，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }
}

// 全局缓存实例
const subtitleCache = new LRUCache<SubtitleResult>(100, 10);

// 工具函数：随机延迟
const randomDelay = (min: number, max: number): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// 工具函数：重试机制
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 200
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // 检查是否是可重试的错误
      if (error instanceof Error) {
        const isRetryableError = 
          error.message.includes('429') || 
          error.message.includes('ECONNRESET') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('fetch');
        
        if (!isRetryableError || attempt === maxRetries) {
          throw error;
        }
      }
      
      // 指数退避延迟
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// 获取YouTube InnerTube API Key（从环境变量或固定值）
const getYouTubeApiKey = (): string => {
  return process.env.YOUTUBE_API_KEY || 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
};

// Step 1: 获取播放器数据
const fetchPlayerData = async (videoId: string): Promise<PlayerResponse> => {
  const apiKey = getYouTubeApiKey();
  const url = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
  
  const payload = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20231005"
      }
    },
    videoId
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch player data for ${videoId}`);
  }

  return await response.json();
};

// Step 2: 抓取字幕文件
const fetchSubtitleFile = async (baseUrl: string): Promise<SRV3Response> => {
  // 添加fmt=json3参数获取SRV3格式
  const url = baseUrl.includes('?') 
    ? `${baseUrl}&fmt=json3` 
    : `${baseUrl}?fmt=json3`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch subtitle file`);
  }

  return await response.json();
};

// 解析SRV3格式字幕为标准格式
const parseSRV3Subtitles = (srv3Data: SRV3Response): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];
  
  if (!srv3Data.events) {
    return cues;
  }

  for (const event of srv3Data.events) {
    if (!event.segs || event.segs.length === 0) {
      continue;
    }

    const text = event.segs.map(seg => seg.utf8).join('').trim();
    if (!text) {
      continue;
    }

    cues.push({
      start: event.tStartMs / 1000, // 转换为秒
      dur: event.dDurationMs / 1000, // 转换为秒
      text
    });
  }

  return cues;
};

// 处理单个视频的字幕抓取
const fetchVideoSubtitles = async (videoId: string, preferredLangs: string[] = ['zh', 'zh-CN', 'zh-Hans', 'zh-TW', 'zh-Hant', 'en']): Promise<SubtitleResult> => {
  // 使用第一个偏好语言作为缓存键
  const primaryLang = preferredLangs[0];
  const cacheKey = `${videoId}_${primaryLang}`;
  const cached = subtitleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Step 1: 获取播放器数据
    const playerData = await retryWithBackoff(() => fetchPlayerData(videoId));
    
    // 查找可用的字幕轨道
    const captionTracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
      const result: SubtitleResult = {
        id: videoId,
        lang: primaryLang,
        cues: [],
        error: '该视频没有可用的字幕'
      };
      subtitleCache.set(cacheKey, result);
      return result;
    }

    // 按优先级查找字幕轨道
    let targetTrack: CaptionTrack | undefined;
    let selectedLang = primaryLang;
    
    for (const lang of preferredLangs) {
      targetTrack = captionTracks.find(track => track.languageCode === lang);
      if (targetTrack) {
        selectedLang = lang;
        break;
      }
    }

    // 如果没有找到偏好语言，尝试使用第一个可用的字幕
    if (!targetTrack && captionTracks.length > 0) {
      targetTrack = captionTracks[0];
      selectedLang = targetTrack.languageCode;
    }

    if (!targetTrack) {
      const availableLangs = captionTracks.map(track => track.languageCode).join(', ');
      const result: SubtitleResult = {
        id: videoId,
        lang: primaryLang,
        cues: [],
        error: `未找到偏好语言字幕，可用语言: ${availableLangs}`
      };
      subtitleCache.set(cacheKey, result);
      return result;
    }

    // Step 2: 抓取字幕文件
    const subtitleData = await retryWithBackoff(() => fetchSubtitleFile(targetTrack.baseUrl));
    
    // Step 3: 解析字幕
    const cues = parseSRV3Subtitles(subtitleData);
    
    const result: SubtitleResult = {
      id: videoId,
      lang: selectedLang, // 使用实际选中的语言
      cues
    };

    // 缓存结果
    subtitleCache.set(cacheKey, result);
    return result;

  } catch (error) {
    console.error(`Error fetching subtitles for ${videoId}:`, error);
    
    const result: SubtitleResult = {
      id: videoId,
      lang: primaryLang,
      cues: [],
      error: error instanceof Error ? error.message : '抓取字幕失败'
    };
    
    return result;
  }
};

// 主API处理函数
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoIds = searchParams.getAll('id');
    
    // 解析语言偏好参数
    const langParam = searchParams.get('lang') || searchParams.get('langs');
    let preferredLangs: string[];
    
    if (langParam) {
      // 支持逗号分隔的多个语言
      preferredLangs = langParam.split(',').map(lang => lang.trim());
    } else {
      // 默认语言优先级：中文（各种变体）> 英文
      preferredLangs = ['zh', 'zh-CN', 'zh-Hans', 'zh-TW', 'zh-Hant', 'en'];
    }

    // 验证输入参数
    if (!videoIds || videoIds.length === 0) {
      return NextResponse.json(
        { error: '请提供至少一个视频ID' },
        { status: 400 }
      );
    }

    if (videoIds.length > 10) {
      return NextResponse.json(
        { error: '单次最多支持10个视频ID' },
        { status: 400 }
      );
    }

    // 验证视频ID格式
    const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
    for (const id of videoIds) {
      if (!videoIdRegex.test(id)) {
        return NextResponse.json(
          { error: `无效的视频ID格式: ${id}` },
          { status: 400 }
        );
      }
    }

    // 设置并发限制为4
    const limit = pLimit(4);
    
    // 并发处理所有视频
    const results = await Promise.all(
      videoIds.map(videoId => 
        limit(async () => {
          try {
            const result = await fetchVideoSubtitles(videoId, preferredLangs);
            // 每次请求后随机延迟100-300ms
            await randomDelay(100, 300);
            return result;
          } catch (error) {
            console.error(`Error processing video ${videoId}:`, error);
            return {
              id: videoId,
              lang: preferredLangs[0],
              cues: [],
              error: error instanceof Error ? error.message : '处理失败'
            } as SubtitleResult;
          }
        })
      )
    );

    return NextResponse.json(results);

  } catch (error) {
    console.error('Subtitles API error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}