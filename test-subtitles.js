// 测试YouTube字幕抓取API
const fetch = require('node:fs').readFileSync ? null : require('node-fetch');

// 直接导入并测试字幕抓取逻辑
async function testSubtitles() {
  const videoId = 'ihgJy6wNJvI'; // 提取自https://www.youtube.com/watch?v=ihgJy6wNJvI
  
  console.log(`🔍 开始测试视频ID: ${videoId}`);
  console.log(`🎬 视频链接: https://www.youtube.com/watch?v=${videoId}`);
  console.log('=' .repeat(60));

  try {
    // 复制API中的核心逻辑进行测试
    const result = await fetchVideoSubtitles(videoId);
    
    console.log(`📊 测试结果:`);
    console.log(`视频ID: ${result.id}`);
    console.log(`语言: ${result.lang}`);
    console.log(`字幕条数: ${result.cues.length}`);
    
    if (result.error) {
      console.log(`❌ 错误: ${result.error}`);
    } else if (result.cues.length > 0) {
      console.log(`\n📝 字幕内容 (前10条):`);
      console.log('-'.repeat(60));
      
      result.cues.slice(0, 10).forEach((cue, index) => {
        const startTime = formatTime(cue.start);
        const endTime = formatTime(cue.start + cue.dur);
        console.log(`${index + 1}. [${startTime} - ${endTime}] ${cue.text}`);
      });
      
      if (result.cues.length > 10) {
        console.log(`\n... 还有 ${result.cues.length - 10} 条字幕`);
      }
    } else {
      console.log('⚠️  该视频没有可用的字幕');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 时间格式化函数
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// 字幕抓取核心逻辑（从API复制）
async function fetchVideoSubtitles(videoId, lang = 'en') {
  try {
    // Step 1: 获取播放器数据
    const apiKey = process.env.YOUTUBE_API_KEY || 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
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

    console.log('🔄 正在获取播放器数据...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch player data`);
    }

    const playerData = await response.json();
    
    // 查找字幕轨道
    const captionTracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
      return {
        id: videoId,
        lang,
        cues: [],
        error: '该视频没有可用的字幕'
      };
    }

    // 查找指定语言的字幕
    const targetTrack = captionTracks.find(track => track.languageCode === lang);
    if (!targetTrack) {
      const availableLangs = captionTracks.map(t => t.languageCode).join(', ');
      return {
        id: videoId,
        lang,
        cues: [],
        error: `未找到${lang}语言的字幕，可用语言: ${availableLangs}`
      };
    }

    // Step 2: 抓取字幕文件
    console.log('🔄 正在抓取字幕文件...');
    const subtitleUrl = targetTrack.baseUrl.includes('?') 
      ? `${targetTrack.baseUrl}&fmt=json3` 
      : `${targetTrack.baseUrl}?fmt=json3`;

    const subtitleResponse = await fetch(subtitleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!subtitleResponse.ok) {
      throw new Error(`HTTP ${subtitleResponse.status}: Failed to fetch subtitle file`);
    }

    const subtitleData = await subtitleResponse.json();
    
    // Step 3: 解析字幕
    console.log('🔄 正在解析字幕数据...');
    const cues = [];
    
    if (subtitleData.events) {
      for (const event of subtitleData.events) {
        if (!event.segs || event.segs.length === 0) {
          continue;
        }

        const text = event.segs.map(seg => seg.utf8).join('').trim();
        if (!text) {
          continue;
        }

        cues.push({
          start: event.tStartMs / 1000, // 转换为秒
          dur: (event.dDurationMs || 0) / 1000, // 转换为秒
          text
        });
      }
    }

    return {
      id: videoId,
      lang,
      cues
    };

  } catch (error) {
    console.error(`处理视频 ${videoId} 时出错:`, error);
    return {
      id: videoId,
      lang,
      cues: [],
      error: error.message
    };
  }
}

// Node.js环境检测和fetch polyfill  
async function setupFetch() {
  if (typeof globalThis.fetch === 'undefined') {
    // 对于Node.js 18+，使用--experimental-fetch或导入
    try {
      const { fetch: nodeFetch } = await import('node-fetch');
      globalThis.fetch = nodeFetch;
    } catch (e) {
      // 尝试使用内置fetch（Node 18+）
      try {
        globalThis.fetch = (await import('undici')).fetch;
      } catch (e2) {
        console.error('需要Node.js 18+或安装node-fetch包');
        process.exit(1);
      }
    }
  }
}

// 运行测试
setupFetch().then(() => testSubtitles()).catch(console.error);