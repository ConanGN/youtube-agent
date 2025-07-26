// 直接测试API路由
const { GET } = require('./app/api/subtitles/route.ts');

async function testAPI() {
  console.log('🔍 直接测试字幕API路由...');
  console.log('视频: https://www.youtube.com/watch?v=ihgJy6wNJvI');
  console.log('=' .repeat(60));
  
  try {
    // 模拟Next.js请求对象
    const mockRequest = {
      url: 'http://localhost:3000/api/subtitles?id=ihgJy6wNJvI'
    };
    
    const response = await GET(mockRequest);
    const data = await response.json();
    
    console.log('📊 API响应结果:');
    console.log(`状态码: ${response.status}`);
    
    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      console.log(`视频ID: ${result.id}`);
      console.log(`语言: ${result.lang}`);
      console.log(`字幕条数: ${result.cues.length}`);
      
      if (result.error) {
        console.log(`❌ 错误: ${result.error}`);
      } else if (result.cues.length > 0) {
        console.log(`\n📝 字幕内容 (前10条):`);
        console.log('-'.repeat(80));
        
        result.cues.slice(0, 10).forEach((cue, index) => {
          const startTime = formatTime(cue.start);
          const endTime = formatTime(cue.start + cue.dur);
          const text = cue.text.replace(/\n/g, ' ');
          console.log(`${(index + 1).toString().padStart(2, '0')}. [${startTime} - ${endTime}] ${text}`);
        });
        
        if (result.cues.length > 10) {
          console.log(`\n... 还有 ${result.cues.length - 10} 条字幕`);
        }
      }
    } else {
      console.log('❌ API返回数据格式异常:', data);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

testAPI();