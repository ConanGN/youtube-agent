// 简单测试YouTube字幕抓取
const https = require('https');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: res.headers['content-type']?.includes('json') ? JSON.parse(data) : data
          });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function testSubtitles() {
  const videoId = 'ihgJy6wNJvI';
  
  console.log(`🔍 测试视频: https://www.youtube.com/watch?v=${videoId}`);
  console.log('=' .repeat(60));

  try {
    // Step 1: 获取播放器数据
    console.log('🔄 正在获取YouTube播放器数据...');
    
    const apiKey = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
    const playerUrl = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
    
    const payload = JSON.stringify({
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20231005"
        }
      },
      videoId
    });

    const playerResponse = await makeRequest(playerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: payload
    });

    if (playerResponse.status !== 200) {
      throw new Error(`播放器API返回状态码: ${playerResponse.status}`);
    }

    const playerData = playerResponse.data;
    console.log('✅ 成功获取播放器数据');

    // 检查字幕轨道
    const captionTracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!captionTracks || captionTracks.length === 0) {
      console.log('⚠️  该视频没有可用的字幕轨道');
      return;
    }

    console.log(`📝 找到 ${captionTracks.length} 个字幕轨道:`);
    captionTracks.forEach((track, i) => {
      console.log(`  ${i + 1}. 语言: ${track.languageCode} (${track.name?.simpleText || '未知'})`);
    });

    // 查找英文字幕
    const enTrack = captionTracks.find(track => track.languageCode === 'en') || captionTracks[0];
    console.log(`\n🎯 使用字幕轨道: ${enTrack.languageCode}`);

    // Step 2: 获取字幕内容
    console.log('🔄 正在下载字幕文件...');
    
    const subtitleUrl = enTrack.baseUrl + '&fmt=json3';
    const subtitleResponse = await makeRequest(subtitleUrl);

    if (subtitleResponse.status !== 200) {
      throw new Error(`字幕API返回状态码: ${subtitleResponse.status}`);
    }

    const subtitleData = subtitleResponse.data;
    console.log('✅ 成功获取字幕数据');

    // Step 3: 解析并显示字幕
    if (!subtitleData.events || subtitleData.events.length === 0) {
      console.log('⚠️  字幕文件中没有找到事件数据');
      return;
    }

    const cues = [];
    for (const event of subtitleData.events) {
      if (event.segs && event.segs.length > 0) {
        const text = event.segs.map(seg => seg.utf8).join('').trim();
        if (text) {
          cues.push({
            start: (event.tStartMs || 0) / 1000,
            dur: (event.dDurationMs || 0) / 1000,
            text
          });
        }
      }
    }

    console.log(`\n📊 解析结果:`);
    console.log(`总字幕条数: ${cues.length}`);
    
    if (cues.length > 0) {
      console.log(`\n📝 字幕内容 (前15条):`);
      console.log('-'.repeat(80));
      
      cues.slice(0, 15).forEach((cue, index) => {
        const startTime = formatTime(cue.start);
        const endTime = formatTime(cue.start + cue.dur);
        const text = cue.text.replace(/\n/g, ' ').substring(0, 60);
        console.log(`${(index + 1).toString().padStart(2, '0')}. [${startTime} - ${endTime}] ${text}`);
      });
      
      if (cues.length > 15) {
        console.log(`\n... 还有 ${cues.length - 15} 条字幕`);
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// 运行测试
testSubtitles().catch(console.error);