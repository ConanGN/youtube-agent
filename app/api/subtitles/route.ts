import { NextRequest, NextResponse } from 'next/server';
import pLimit from 'p-limit';

// 类型定义
interface SubtitleCue {
  start: number;
  dur: number;
  text: string;
}

interface MultiLangSubtitleCue {
  start: number;
  dur: number;
  text: string;
  lang: string;
}

interface SubtitleResult {
  id: string;
  lang: string; // 主要语言或 "multi" 表示多语言
  languages: string[]; // 包含的所有语言列表
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

// 解析SRV3格式字幕为多语言格式
const parseSRV3SubtitlesWithLang = (srv3Data: SRV3Response, lang: string): MultiLangSubtitleCue[] => {
  const cues: MultiLangSubtitleCue[] = [];
  
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
      text,
      lang
    });
  }

  return cues;
};

// 获取语言显示名称
const getLanguageDisplayName = (langCode: string): string => {
  const langMap: Record<string, string> = {
    'zh': '中文',
    'zh-CN': '中文',
    'zh-Hans': '中文',
    'zh-TW': '繁中',
    'zh-Hant': '繁中',
    'en': 'English',
    'ja': '日本語',
    'ko': '한국어',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'it': 'Italiano',
    'pt': 'Português',
    'ru': 'Русский',
    'ar': 'العربية',
    'hi': 'हिन्दी'
  };
  return langMap[langCode] || langCode.toUpperCase();
};

// 抓取单个语言的字幕
const fetchSingleLanguageSubtitle = async (videoId: string, track: CaptionTrack): Promise<MultiLangSubtitleCue[]> => {
  try {
    const subtitleData = await retryWithBackoff(() => fetchSubtitleFile(track.baseUrl));
    return parseSRV3SubtitlesWithLang(subtitleData, track.languageCode);
  } catch (error) {
    console.error(`Error fetching subtitle for language ${track.languageCode}:`, error);
    return [];
  }
};

// 合并多语言字幕
const mergeMultiLanguageSubtitles = (allCues: MultiLangSubtitleCue[]): SubtitleCue[] => {
  if (allCues.length === 0) return [];

  // 按开始时间排序
  allCues.sort((a, b) => a.start - b.start);

  const mergedCues: SubtitleCue[] = [];
  let currentTime = -1;
  let currentTexts: Map<string, string> = new Map();
  let currentDuration = 0;

  for (const cue of allCues) {
    // 如果开始时间相同或接近（0.1秒内），合并到同一个时间点
    if (Math.abs(cue.start - currentTime) < 0.1) {
      currentTexts.set(cue.lang, cue.text);
      currentDuration = Math.max(currentDuration, cue.dur);
    } else {
      // 保存之前的合并结果
      if (currentTexts.size > 0) {
        const mergedText = Array.from(currentTexts.entries())
          .map(([lang, text]) => `[${getLanguageDisplayName(lang)}] ${text}`)
          .join(' | ');
        
        mergedCues.push({
          start: currentTime,
          dur: currentDuration,
          text: mergedText
        });
      }

      // 开始新的时间点
      currentTime = cue.start;
      currentDuration = cue.dur;
      currentTexts = new Map();
      currentTexts.set(cue.lang, cue.text);
    }
  }

  // 处理最后一个时间点
  if (currentTexts.size > 0) {
    const mergedText = Array.from(currentTexts.entries())
      .map(([lang, text]) => `[${getLanguageDisplayName(lang)}] ${text}`)
      .join(' | ');
    
    mergedCues.push({
      start: currentTime,
      dur: currentDuration,
      text: mergedText
    });
  }

  return mergedCues;
};

// 处理单个视频的多语言字幕抓取
const fetchVideoSubtitles = async (videoId: string): Promise<SubtitleResult> => {
  // 使用固定缓存键抓取所有语言
  const cacheKey = `${videoId}_multilang`;
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
        lang: 'none',
        languages: [],
        cues: [],
        error: '该视频没有可用的字幕'
      };
      subtitleCache.set(cacheKey, result);
      return result;
    }

    // Step 2: 并发抓取所有语言的字幕
    console.log(`Found ${captionTracks.length} subtitle tracks for ${videoId}:`, captionTracks.map(t => t.languageCode));
    
    const limit = pLimit(3); // 限制并发数避免过载
    const subtitlePromises = captionTracks.map(track =>
      limit(() => fetchSingleLanguageSubtitle(videoId, track))
    );

    const allSubtitleResults = await Promise.all(subtitlePromises);
    
    // Step 3: 合并所有语言的字幕
    const allCues: MultiLangSubtitleCue[] = [];
    const availableLanguages: string[] = [];
    
    for (let i = 0; i < allSubtitleResults.length; i++) {
      const cues = allSubtitleResults[i];
      if (cues.length > 0) {
        allCues.push(...cues);
        availableLanguages.push(captionTracks[i].languageCode);
      }
    }

    if (allCues.length === 0) {
      const result: SubtitleResult = {
        id: videoId,
        lang: 'none',
        languages: captionTracks.map(t => t.languageCode),
        cues: [],
        error: '所有语言的字幕抓取都失败了'
      };
      subtitleCache.set(cacheKey, result);
      return result;
    }

    // Step 4: 合并多语言字幕
    const mergedCues = mergeMultiLanguageSubtitles(allCues);
    
    const result: SubtitleResult = {
      id: videoId,
      lang: availableLanguages.length === 1 ? availableLanguages[0] : 'multi',
      languages: availableLanguages,
      cues: mergedCues
    };

    // 缓存结果
    subtitleCache.set(cacheKey, result);
    console.log(`Successfully merged subtitles for ${videoId}:`, {
      languages: availableLanguages,
      totalCues: mergedCues.length
    });
    
    return result;

  } catch (error) {
    console.error(`Error fetching subtitles for ${videoId}:`, error);
    
    const result: SubtitleResult = {
      id: videoId,
      lang: 'error',
      languages: [],
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

    // 设置并发限制为2（因为每个视频内部还有并发请求）
    const limit = pLimit(2);
    
    // 并发处理所有视频
    const results = await Promise.all(
      videoIds.map(videoId => 
        limit(async () => {
          try {
            const result = await fetchVideoSubtitles(videoId);
            // 每次请求后随机延迟200-500ms
            await randomDelay(200, 500);
            return result;
          } catch (error) {
            console.error(`Error processing video ${videoId}:`, error);
            return {
              id: videoId,
              lang: 'error',
              languages: [],
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