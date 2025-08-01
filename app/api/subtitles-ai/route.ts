import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';
import pLimit from 'p-limit';
import { spawn } from 'child_process';

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

interface DeepgramResponse {
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words?: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
        }>;
        paragraphs?: {
          transcript: string;
          paragraphs: Array<{
            sentences: Array<{
              text: string;
              start: number;
              end: number;
            }>;
            start: number;
            end: number;
          }>;
        };
      }>;
    }>;
  };
  metadata: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
    models: string[];
    model_info: Record<string, any>;
  };
}

// Deepgram客户端初始化
const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

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

// 使用yt-dlp获取YouTube视频音频直链
const getAudioDirectUrl = async (url: string): Promise<{
  audioUrl: string;
  title: string;
  duration: number;
  fileSize?: number;
}> => {
  return new Promise((resolve, reject) => {
    try {
      // 使用yt-dlp获取音频URL和元数据，强制避免HLS流媒体格式
      const ytdlp = spawn('python', ['-m', 'yt_dlp',
        '--get-url',           // 获取直链
        '--get-title',         // 获取标题
        '--get-duration',      // 获取时长
        '--format', 'bestaudio[ext=mp4][protocol^=http]/bestaudio[ext=m4a][protocol^=http]/bestaudio[ext=webm][protocol^=http]/bestaudio[protocol^=http][protocol!=m3u8][protocol!=hls]', // 强制HTTP协议，避免所有流媒体格式
        '--no-playlist',
        '--encoding', 'utf-8', // 指定UTF-8编码
        '--prefer-free-formats', // 优先选择免费格式
        url
      ], {
        // 设置环境变量修复Windows编码问题
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      
      let output = '';
      let errorOutput = '';
      
      // 修复字符编码处理
      ytdlp.stdout.on('data', (data) => {
        output += data.toString('utf8');
      });
      
      ytdlp.stderr.on('data', (data) => {
        errorOutput += data.toString('utf8');
      });
      
      ytdlp.on('close', (code) => {
        if (code !== 0) {
          console.error(`yt-dlp错误 (code ${code}):`, errorOutput);
          reject(new Error(`yt-dlp执行失败: ${errorOutput}`));
          return;
        }
        
        const lines = output.trim().split('\n').filter(line => line.trim());
        console.log('yt-dlp原始输出行数:', lines.length);
        console.log('yt-dlp输出内容:', lines);
        
        if (lines.length < 3) {
          console.error('yt-dlp返回数据不足:', lines);
          reject(new Error(`yt-dlp返回数据格式错误，期望3行数据，实际得到${lines.length}行`));
          return;
        }
        
        // 修正输出解析顺序：第1行是标题，第2行是音频直链，第3行是时长
        const title = lines[0].trim();
        const audioUrl = lines[1].trim();
        const durationStr = lines[2].trim();
        
        // 验证音频链接格式，拒绝HLS播放列表
        if (!audioUrl.startsWith('http')) {
          console.error('无效的音频链接:', audioUrl);
          reject(new Error(`获取到无效的音频链接: ${audioUrl}`));
          return;
        }
        
        // 检测并拒绝HLS格式链接
        if (audioUrl.includes('manifest/hls') || audioUrl.includes('.m3u8') || audioUrl.includes('hls_playlist')) {
          console.error('检测到HLS播放列表格式，无法直接处理:', audioUrl.substring(0, 100));
          reject(new Error('获取到的是HLS流媒体播放列表，不是直接音频文件。请尝试其他视频或稍后重试。'));
          return;
        }
        
        // 解析时长
        let duration = 0;
        if (durationStr !== 'NA' && durationStr !== 'N/A') {
          try {
            // 支持多种时长格式：21, 1:21, 1:21:30
            const timeParts = durationStr.split(':').map(part => parseFloat(part.trim()));
            if (timeParts.length === 1) {
              duration = timeParts[0]; // 直接是秒数
            } else if (timeParts.length === 2) {
              duration = timeParts[0] * 60 + timeParts[1]; // 分:秒
            } else if (timeParts.length === 3) {
              duration = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]; // 时:分:秒
            }
          } catch (error) {
            console.warn('解析时长失败，使用默认值0:', durationStr, error);
            duration = 0;
          }
        }
        
        console.log(`视频音频信息:`, {
          title: title.length > 50 ? title.substring(0, 50) + '...' : title,
          duration: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
          audioUrl: audioUrl.length > 100 ? audioUrl.substring(0, 100) + '...' : audioUrl
        });
        
        resolve({
          audioUrl,
          title,
          duration,
          fileSize: undefined // yt-dlp不直接提供文件大小
        });
      });
      
    } catch (error) {
      console.error(`获取视频音频信息失败:`, error);
      reject(new Error(`无法获取视频音频信息: ${error instanceof Error ? error.message : '未知错误'}`));
    }
  });
};

// 检查音频文件大小是否需要分片
const needsSegmentation = (fileSize?: number): boolean => {
  if (!fileSize) return false;
  return fileSize > 100 * 1024 * 1024; // 100MB
};

// 使用Deepgram进行语音转写（支持URL和本地文件两种方式）
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
    console.log('音频URL长度:', audioUrl.length);
    console.log('音频URL前100字符:', audioUrl.substring(0, 100));
    
    // 先测试音频链接是否可访问和有效
    let canAccessDirectly = false;
    let audioContentType = '';
    let audioContentLength = 0;
    
    try {
      const testResponse = await fetch(audioUrl, { method: 'HEAD' });
      console.log('音频链接测试状态:', testResponse.status, testResponse.statusText);
      
      audioContentType = testResponse.headers.get('content-type') || '';
      audioContentLength = parseInt(testResponse.headers.get('content-length') || '0');
      
      console.log('音频Content-Type:', audioContentType);
      console.log('音频Content-Length:', audioContentLength);
      
      // 检测并拒绝HLS播放列表
      if (audioContentType.includes('application/vnd.apple.mpegurl') || 
          audioContentType.includes('application/x-mpegURL') ||
          audioContentType.includes('text/plain')) {
        console.error('检测到HLS播放列表Content-Type:', audioContentType);
        throw new Error(`检测到HLS流媒体播放列表格式 (${audioContentType})，无法直接处理音频数据`);
      }
      
      // 检查是否是有效的音频文件
      const isValidAudio = testResponse.ok && 
                          audioContentLength > 1000 && // 至少1KB
                          (audioContentType.includes('audio/') || audioContentType.includes('video'));
      
      if (!isValidAudio) {
        console.warn('音频链接无效或已过期:', {
          status: testResponse.status,
          contentType: audioContentType,
          contentLength: audioContentLength
        });
        throw new Error(`音频链接无效: ${testResponse.status} ${audioContentType} ${audioContentLength}bytes`);
      }
      
      canAccessDirectly = true;
    } catch (error) {
      console.warn('音频链接测试失败:', error.message);
      throw new Error(`音频链接访问失败: ${error.message}`);
    }
    
    // 构建Deepgram请求参数 - 修正模型名称和兼容性配置
    const deepgramOptions = {
      model: 'nova-2-general',  // 修正：使用完整的模型名称
      smart_format: true,       // 启用智能格式化
      punctuate: true,          // 启用标点符号
      diarize: false,          // 禁用说话人识别以提高速度
      paragraphs: true,        // 添加：启用段落分析
      utterances: true,        // 添加：启用语句分析
      language: options.language === 'auto' ? undefined : options.language, // 修正：auto时不传语言参数
    };
    
    console.log('Deepgram请求参数:', deepgramOptions);
    console.log('直接访问音频链接:', canAccessDirectly);
    
    // 下载音频数据然后转写（更可靠的方式）
    console.log('下载音频数据进行转写...');
    const audioResponse = await fetch(audioUrl);
    
    if (!audioResponse.ok) {
      throw new Error(`下载音频失败: ${audioResponse.status} ${audioResponse.statusText}`);
    }
    
    const audioBuffer = await audioResponse.arrayBuffer();
    console.log('下载音频大小:', audioBuffer.byteLength, 'bytes');
    console.log('实际音频格式:', audioResponse.headers.get('content-type'));
    
    if (audioBuffer.byteLength === 0) {
      throw new Error('下载的音频文件为空');
    }
    
    console.log('开始Deepgram文件转写...');
    const response = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      deepgramOptions
    );
    
    console.log('Deepgram响应状态:', {
      response: !!response,
      result: !!response?.result,
      hasResults: !!response?.result?.results,
      responseKeys: response ? Object.keys(response) : [],
      resultKeys: response?.result ? Object.keys(response.result) : []
    });
    
    // 添加更详细的调试信息
    if (response?.result) {
      console.log('Deepgram完整响应结构:', JSON.stringify(response.result, null, 2));
    }
    
    const result = response.result as DeepgramResponse;
    
    // 增强错误检查，防止null访问
    if (!result) {
      throw new Error('Deepgram返回了空的响应结果');
    }
    
    if (!result.results) {
      console.error('Deepgram响应详情:', JSON.stringify(result, null, 2));
      throw new Error('Deepgram返回的响应中缺少results字段');
    }
    
    if (!result.results.channels || result.results.channels.length === 0) {
      console.error('Deepgram channels为空:', result.results);
      throw new Error('Deepgram返回的响应中缺少音频通道数据');
    }
    
    if (!result.results.channels[0].alternatives || result.results.channels[0].alternatives.length === 0) {
      console.error('Deepgram alternatives为空:', result.results.channels[0]);
      throw new Error('Deepgram返回的响应中缺少转写候选结果');
    }
    
    const alternative = result.results.channels[0].alternatives[0];
    const transcript = alternative.transcript;
    
    // 检查转写结果是否为空
    if (!transcript || transcript.trim().length === 0) {
      console.warn('Deepgram返回了空的转写结果，可能原因：');
      console.warn('1. 音频中没有可识别的人声内容');
      console.warn('2. 音频质量过低或主要是背景音乐');
      console.warn('3. 音频格式不被很好支持');
      console.warn('4. 音频时长过短');
      
      throw new Error('音频转写结果为空 - 可能音频中缺少清晰的人声内容，或主要为背景音乐/噪音');
    }
    
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
    } else if (alternative.words) {
      // 如果没有段落信息，使用单词信息创建分段（每10个单词一组）
      const wordsPerSegment = 10;
      for (let i = 0; i < alternative.words.length; i += wordsPerSegment) {
        const segmentWords = alternative.words.slice(i, i + wordsPerSegment);
        if (segmentWords.length > 0) {
          segments.push({
            start: segmentWords[0].start,
            end: segmentWords[segmentWords.length - 1].end,
            text: segmentWords.map(w => w.word).join(' '),
            confidence: segmentWords.reduce((sum, w) => sum + w.confidence, 0) / segmentWords.length
          });
        }
      }
    }
    
    // 检测语言 - 改进语言检测逻辑
    let detectedLanguage = 'unknown';
    if (result.metadata?.model_info) {
      // 尝试多种可能的语言字段
      detectedLanguage = result.metadata.model_info.language || 
                        result.metadata.model_info.detected_language ||
                        result.metadata.model_info.lang ||
                        'unknown';
    }
    
    // 如果仍然是unknown，尝试从其他地方获取
    if (detectedLanguage === 'unknown' && result.results?.channels?.[0]?.alternatives?.[0]) {
      const alt = result.results.channels[0].alternatives[0];
      if (alt.language) {
        detectedLanguage = alt.language;
      }
    }
    
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

// 处理单个视频的AI字幕生成
const processVideoSubtitles = async (
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
    
    console.log(`开始处理视频: ${videoId}`);
    
    // 获取音频直链和基本信息（重要：每次都重新获取，因为YouTube链接会过期）
    const audioInfo = await retryWithBackoff(() => getAudioDirectUrl(url));
    
    // 检查是否需要分片处理
    if (needsSegmentation(audioInfo.fileSize)) {
      console.warn(`视频 ${videoId} 音频文件过大 (${audioInfo.fileSize ? (audioInfo.fileSize / 1024 / 1024).toFixed(1) : 'unknown'}MB)，当前版本暂不支持分片处理`);
      // TODO: 实现音频分片处理逻辑
      throw new Error('音频文件过大，暂不支持超过100MB的文件处理');
    }
    
    // 使用Deepgram进行语音转写
    const transcription = await retryWithBackoff(() => 
      transcribeWithDeepgram(audioInfo.audioUrl, options)
    );
    
    const processingTime = Date.now() - startTime;
    
    const result: AISubtitleResult = {
      id: videoId,
      url,
      title: audioInfo.title,
      duration: audioInfo.duration,
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
    
    console.log(`开始批量处理 ${body.urls.length} 个视频的AI字幕生成`);
    
    // 并发处理所有视频（限制并发数为4）
    const results = await Promise.all(
      body.urls.map(url => 
        concurrencyLimit(() => processVideoSubtitles(url, body.options))
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
      }
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
    service: '字幕AI API',
    version: '1.0.0',
    features: [
      'YouTube音频直链解析',
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
      maxFileSize: '100MB',
      supportedFormats: ['mp4', 'webm']
    },
    status: 'active'
  });
}