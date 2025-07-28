// 测试用户输入的具体链接
const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function testUserLinks() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ YOUTUBE_API_KEY 环境变量未配置');
    return;
  }
  
  console.log('🔑 API Key configured');
  
  const youtube = google.youtube({
    version: 'v3',
    auth: apiKey,
  });
  
  try {
    // 从截图中看到的视频链接
    console.log('🧪 测试用户视频链接...');
    const videoUrl = 'https://www.youtube.com/watch?v=vUur';
    
    // 提取视频ID
    const videoId = extractVideoId(videoUrl);
    console.log('提取的视频ID:', videoId);
    
    if (videoId) {
      const videoResponse = await youtube.videos.list({
        part: ['snippet', 'statistics'],
        id: [videoId],
      });
      
      if (videoResponse.data.items?.length > 0) {
        const video = videoResponse.data.items[0];
        console.log('✅ 视频信息获取成功:');
        console.log('   标题:', video.snippet?.title);
        console.log('   频道:', video.snippet?.channelTitle);
        console.log('   观看数:', video.statistics?.viewCount);
      } else {
        console.log('❌ 视频未找到或不可访问');
      }
    } else {
      console.log('❌ 无法从URL中提取视频ID');
    }
    
    // 从截图中看到的频道链接
    console.log('\n🧪 测试用户频道链接...');
    const channelUrl = 'https://www.youtube.com/@%E8%80%83%E8%80%83%E8%80%83%E9%98%BF%E8%80%83';
    
    // 提取频道标识符
    const channelIdentifier = extractChannelId(channelUrl);
    console.log('提取的频道标识符:', channelIdentifier);
    
    if (channelIdentifier) {
      // 解码URL编码的字符
      const decodedIdentifier = decodeURIComponent(channelIdentifier);
      console.log('解码后的标识符:', decodedIdentifier);
      
      // 尝试搜索频道
      const searchResponse = await youtube.search.list({
        part: ['snippet'],
        q: `"@${decodedIdentifier}"`,
        type: ['channel'],
        maxResults: 10,
      });
      
      if (searchResponse.data.items?.length > 0) {
        console.log('✅ 频道搜索成功:');
        searchResponse.data.items.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.snippet?.title} (ID: ${item.snippet?.channelId})`);
        });
        
        // 获取第一个频道的视频
        const firstChannelId = searchResponse.data.items[0].snippet?.channelId;
        if (firstChannelId) {
          console.log('\n🧪 获取频道视频列表...');
          
          // 获取频道的上传播放列表
          const channelResponse = await youtube.channels.list({
            part: ['contentDetails'],
            id: [firstChannelId],
          });
          
          const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
          
          if (uploadsPlaylistId) {
            const playlistResponse = await youtube.playlistItems.list({
              part: ['snippet'],
              playlistId: uploadsPlaylistId,
              maxResults: 5,
            });
            
            if (playlistResponse.data.items?.length > 0) {
              console.log('✅ 频道视频获取成功:');
              playlistResponse.data.items.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.snippet?.title}`);
              });
            } else {
              console.log('❌ 频道没有视频或视频不可访问');
            }
          } else {
            console.log('❌ 无法获取频道的上传播放列表');
          }
        }
      } else {
        console.log('❌ 频道搜索失败: 未找到匹配的频道');
        
        // 尝试不带引号的搜索
        console.log('🔄 尝试模糊搜索...');
        const fuzzySearchResponse = await youtube.search.list({
          part: ['snippet'],
          q: `@${decodedIdentifier}`,
          type: ['channel'],
          maxResults: 10,
        });
        
        if (fuzzySearchResponse.data.items?.length > 0) {
          console.log('✅ 模糊搜索找到频道:');
          fuzzySearchResponse.data.items.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.snippet?.title} (ID: ${item.snippet?.channelId})`);
          });
        } else {
          console.log('❌ 模糊搜索也未找到频道');
        }
      }
    } else {
      console.log('❌ 无法从URL中提取频道标识符');
    }
    
    console.log('\n🎉 用户链接测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.code === 403) {
      console.error('💡 可能原因: API密钥无效或配额已用完');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('💡 可能原因: 网络连接问题');
    } else if (error.response?.data?.error) {
      console.error('💡 API错误详情:', error.response.data.error);
    } else {
      console.error('💡 错误详情:', error);
    }
  }
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function extractChannelId(url) {
  const patterns = [
    /youtube\.com\/channel\/([^\/\?&]+)/,
    /youtube\.com\/c\/([^\/\?&]+)/,
    /youtube\.com\/user\/([^\/\?&]+)/,
    /youtube\.com\/@([^\/\?&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

testUserLinks().catch(console.error);