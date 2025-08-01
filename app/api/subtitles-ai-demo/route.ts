import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';
import pLimit from 'p-limit';

// 类型定义
interface AISubtitleRequest {
  urls: string[];  // YouTube链接数组
  options?: {
    language?: string;     // 目标语言
    format?: 'srt' | 'vtt' | 'json'; // 输出格式
    enableSmartFormatting?: boolean;  // 启用智能格式化
  };
}

interface AISubtitleResult {
  id: string;              // 视频ID
  url: string;             // 原始URL
  title?: string;          // 视频标题
  duration?: number;       // 视频时长（秒）
  transcript: {
    text: string;          // 完整转写文本
    segments?: Array<{     // 时间段信息
      start: number;
      end: number;
      text: string;
      confidence?: number;
    }>;
    language?: string;     // 检测到的语言
  };
  error?: string;          // 错误信息
  processingTime?: number; // 处理时间（毫秒）
}

// Deepgram客户端初始化
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || 'a41512e3554c0ee55fb79e65d30f6316b7980b1a');

// 并发限制：3-5个请求
const concurrencyLimit = pLimit(5);

// 工具函数：从YouTube URL提取视频ID
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^#\&\?]*)/,
    /^([a-zA-Z0-9_-]{11})$/ // 直接的视频ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

// 工具函数：重试机制
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // 检查是否是可重试的错误
      const isRetryableError = 
        error instanceof Error && (
          error.message.includes('429') || 
          error.message.includes('timeout') ||
          error.message.includes('network') ||
          error.message.includes('ECONNRESET')
        );
      
      if (!isRetryableError || attempt === maxRetries) {
        throw error;
      }
      
      // 指数退避延迟
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`重试第 ${attempt + 1} 次，延迟 ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// 模拟获取YouTube视频信息（演示版本）
const getMockVideoInfo = async (url: string): Promise<{
  audioUrl: string;
  title: string;
  duration: number;
}> => {
  const videoId = extractVideoId(url);
  
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 使用Deepgram官方示例音频进行演示
  return {
    audioUrl: 'https://dpgr.am/spacewalk.wav',
    title: `演示视频 (${videoId})`,
    duration: 26
  };
};

// 使用Deepgram进行语音转写
const transcribeWithDeepgram = async (
  audioUrl: string, 
  options: AISubtitleRequest['options'] = {}
): Promise<{
  transcript: string;
  segments?: Array<{ start: number; end: number; text: string; confidence?: number }>;
  language?: string;
}> => {
  try {
    console.log('开始Deepgram语音转写...');
    
    // 构建Deepgram请求参数 - 修正模型配置
    const deepgramOptions: any = {
      model: 'nova-2-general',  // 修正：使用完整的模型名称
      punctuate: true,          // 启用标点符号
      smart_format: true,       // 启用智能格式化
      paragraphs: true,         // 添加：启用段落分析
      utterances: true,         // 添加：启用语句分析
    };
    
    console.log('Deepgram请求参数:', deepgramOptions);
    
    // 发送转写请求
    const response = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      deepgramOptions
    );
    
    console.log('Deepgram完整响应:', JSON.stringify(response, null, 2));
    
    const result = response.result;
    
    if (!result) {
      throw new Error('Deepgram返回了空的结果对象');
    }
    
    if (!result.results?.channels?.[0]?.alternatives?.[0]) {
      console.error('Deepgram结果结构:', result);
      throw new Error('Deepgram返回了空的转写结果');
    }
    
    const alternative = result.results.channels[0].alternatives[0];
    const transcript = alternative.transcript;
    
    // 提取分段信息
    let segments: Array<{ start: number; end: number; text: string; confidence?: number }> = [];
    
    if (alternative.paragraphs?.paragraphs) {
      // 使用段落信息创建分段
      segments = alternative.paragraphs.paragraphs.flatMap(paragraph =>
        paragraph.sentences.map(sentence => ({
          start: sentence.start,
          end: sentence.end,
          text: sentence.text,
          confidence: alternative.confidence
        }))
      );
    }
    
    // 检测语言
    const detectedLanguage = result.metadata?.model_info?.language || 'unknown';
    
    console.log(`Deepgram转写完成:`, {
      textLength: transcript.length,
      segmentsCount: segments.length,
      detectedLanguage,
      duration: result.metadata.duration,
      confidence: alternative.confidence
    });
    
    return {
      transcript,
      segments: segments.length > 0 ? segments : undefined,
      language: detectedLanguage
    };
    
  } catch (error) {
    console.error('Deepgram转写失败:', error);
    throw new Error(`语音转写失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 处理单个视频的AI字幕生成（演示版本）
const processVideoSubtitlesDemo = async (
  url: string, 
  options: AISubtitleRequest['options'] = {}
): Promise<AISubtitleResult> => {
  const startTime = Date.now();
  
  try {
    // 提取视频ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('无效的YouTube URL');
    }
    
    console.log(`开始处理视频: ${videoId} (演示模式)`);
    
    // 获取模拟视频信息
    const videoInfo = await retryWithBackoff(() => getMockVideoInfo(url));
    
    // 使用Deepgram进行语音转写
    const transcription = await retryWithBackoff(() => 
      transcribeWithDeepgram(videoInfo.audioUrl, options)
    );
    
    const processingTime = Date.now() - startTime;
    
    const result: AISubtitleResult = {
      id: videoId,
      url,
      title: videoInfo.title,
      duration: videoInfo.duration,
      transcript: {
        text: transcription.transcript,
        segments: transcription.segments,
        language: transcription.language
      },
      processingTime
    };
    
    console.log(`视频 ${videoId} 处理完成，耗时 ${processingTime}ms`);
    return result;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`处理视频失败 (${url}):`, error);
    
    return {
      id: extractVideoId(url) || 'unknown',
      url,
      transcript: { text: '' },
      error: error instanceof Error ? error.message : '处理失败',
      processingTime
    };
  }
};

// 主API处理函数
export async function POST(request: NextRequest) {
  try {
    const body: AISubtitleRequest = await request.json();
    
    // 验证输入参数
    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      return NextResponse.json(
        { error: '请提供至少一个YouTube链接' },
        { status: 400 }
      );
    }
    
    if (body.urls.length > 10) {
      return NextResponse.json(
        { error: '单次最多支持10个视频链接' },
        { status: 400 }
      );
    }
    
    // 验证链接格式
    const invalidUrls = body.urls.filter(url => !extractVideoId(url));
    if (invalidUrls.length > 0) {
      return NextResponse.json(
        { error: `无效的YouTube链接: ${invalidUrls.join(', ')}` },
        { status: 400 }
      );
    }
    
    console.log(`开始批量处理 ${body.urls.length} 个视频的AI字幕生成 (演示模式)`);
    
    // 并发处理所有视频（限制并发数为4）
    const results = await Promise.all(
      body.urls.map(url => 
        concurrencyLimit(() => processVideoSubtitlesDemo(url, body.options))
      )
    );
    
    // 统计处理结果
    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.filter(r => r.error).length;
    const totalProcessingTime = results.reduce((sum, r) => sum + (r.processingTime || 0), 0);
    
    console.log(`批量处理完成: 成功 ${successCount} 个，失败 ${errorCount} 个，总耗时 ${totalProcessingTime}ms`);
    
    return NextResponse.json({
      results,
      summary: {
        total: body.urls.length,
        success: successCount,
        error: errorCount,
        totalProcessingTime
      },
      note: '这是演示版本，使用Deepgram官方示例音频进行转写测试'
    });
    
  } catch (error) {
    console.error('字幕AI API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 支持GET请求查看API状态
export async function GET() {
  return NextResponse.json({
    service: '字幕AI API (演示版)',
    version: '1.0.0-demo',
    features: [
      'Deepgram语音转写',
      'Nova-2 Multilingual模型',
      '批量处理（最多10个）',
      '并发控制（4个线程）',
      '智能格式化',
      '自动语言检测',
      '时间段分析'
    ],
    limits: {
      maxUrls: 10,
      concurrency: 4,
      supportedFormats: ['mp4', 'webm']
    },
    note: '演示版本，使用Deepgram官方示例音频',
    status: 'active'
  });
}