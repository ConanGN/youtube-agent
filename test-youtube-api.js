// 测试YouTube API连通性
const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function testYouTubeAPI() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ YOUTUBE_API_KEY 环境变量未配置');
    return;
  }
  
  console.log('🔑 API Key found:', apiKey.substring(0, 10) + '...');
  
  const youtube = google.youtube({
    version: 'v3',
    auth: apiKey,
  });
  
  try {
    // 测试1: 获取单个视频信息
    console.log('🧪 测试1: 获取单个视频信息...');
    const videoResponse = await youtube.videos.list({
      part: ['snippet', 'statistics'],
      id: ['dQw4w9WgXcQ'], // Rick Roll视频ID
    });
    
    if (videoResponse.data.items?.length > 0) {
      const video = videoResponse.data.items[0];
      console.log('✅ 单个视频测试成功:');
      console.log('   标题:', video.snippet?.title);
      console.log('   观看数:', video.statistics?.viewCount);
    } else {
      console.log('❌ 单个视频测试失败: 未找到视频');
    }
    
    // 测试2: 搜索频道
    console.log('\n🧪 测试2: 搜索频道...');
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: '@Google',
      type: ['channel'],
      maxResults: 1,
    });
    
    if (searchResponse.data.items?.length > 0) {
      const channel = searchResponse.data.items[0];
      console.log('✅ 频道搜索测试成功:');
      console.log('   频道名:', channel.snippet?.title);
      console.log('   频道ID:', channel.snippet?.channelId);
    } else {
      console.log('❌ 频道搜索测试失败: 未找到频道');
    }
    
    // 测试3: 通过频道ID获取频道信息
    console.log('\n🧪 测试3: 获取频道信息...');
    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'contentDetails'],
      id: ['UCK8sQmJBp8GCxrOtXWBpyEA'], // Google频道ID
    });
    
    if (channelResponse.data.items?.length > 0) {
      const channel = channelResponse.data.items[0];
      console.log('✅ 频道信息测试成功:');
      console.log('   频道名:', channel.snippet?.title);
      console.log('   上传播放列表ID:', channel.contentDetails?.relatedPlaylists?.uploads);
    } else {
      console.log('❌ 频道信息测试失败: 未找到频道');
    }
    
    console.log('\n🎉 所有API测试完成!');
    
  } catch (error) {
    console.error('❌ API测试失败:', error.message);
    
    if (error.code === 403) {
      console.error('💡 可能原因: API密钥无效或配额已用完');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('💡 可能原因: 网络连接问题');
    } else {
      console.error('💡 错误详情:', error);
    }
  }
}

testYouTubeAPI().catch(console.error);