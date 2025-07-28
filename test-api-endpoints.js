// 测试应用的API端点
const fetch = require('node-fetch');

async function testAPIEndpoints() {
  const baseUrl = 'http://localhost:3000'; // 假设应用在3000端口运行
  
  console.log('🧪 测试应用API端点...\n');
  
  try {
    // 测试1: 单个视频API
    console.log('🧪 测试1: 单个视频API');
    const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // 使用有效的视频ID
    
    const singleVideoResponse = await fetch(`${baseUrl}/api/youtube/single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl }),
    });
    
    if (singleVideoResponse.ok) {
      const data = await singleVideoResponse.json();
      if (data.success) {
        console.log('✅ 单个视频API测试成功');
        console.log('   标题:', data.data?.title);
        console.log('   配额使用:', data.quotaUsed);
      } else {
        console.log('❌ 单个视频API返回错误:', data.error);
      }
    } else {
      console.log('❌ 单个视频API请求失败:', singleVideoResponse.status, singleVideoResponse.statusText);
      const errorText = await singleVideoResponse.text();
      console.log('   错误详情:', errorText);
    }
    
    // 测试2: 频道API
    console.log('\n🧪 测试2: 频道API');
    const channelUrl = 'https://www.youtube.com/@Google';
    
    const channelResponse = await fetch(`${baseUrl}/api/youtube/channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: null,
        channelUrl: channelUrl,
        maxResults: 5,
        order: 'date'
      }),
    });
    
    if (channelResponse.ok) {
      const data = await channelResponse.json();
      if (data.success) {
        console.log('✅ 频道API测试成功');
        console.log('   获取视频数量:', data.data?.successful?.length || 0);
        console.log('   配额使用:', data.quotaUsed);
        if (data.data?.successful?.length > 0) {
          console.log('   第一个视频:', data.data.successful[0].title);
        }
      } else {
        console.log('❌ 频道API返回错误:', data.error);
        if (data.suggestions) {
          console.log('   建议:', data.suggestions);
        }
      }
    } else {
      console.log('❌ 频道API请求失败:', channelResponse.status, channelResponse.statusText);
      const errorText = await channelResponse.text();
      console.log('   错误详情:', errorText);
    }
    
    // 测试3: 用户的无效视频链接
    console.log('\n🧪 测试3: 用户的无效视频链接');
    const invalidVideoUrl = 'https://www.youtube.com/watch?v=vUur';
    
    const invalidVideoResponse = await fetch(`${baseUrl}/api/youtube/single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: invalidVideoUrl }),
    });
    
    if (invalidVideoResponse.ok) {
      const data = await invalidVideoResponse.json();
      if (data.success) {
        console.log('✅ 用户视频链接有效（意外）');
        console.log('   标题:', data.data?.title);
      } else {
        console.log('❌ 用户视频链接无效（预期结果）:', data.error);
      }
    } else {
      console.log('❌ 用户视频链接请求失败:', invalidVideoResponse.status, invalidVideoResponse.statusText);
    }
    
    // 测试4: 用户的频道链接
    console.log('\n🧪 测试4: 用户的频道链接');
    const userChannelUrl = 'https://www.youtube.com/@%E8%80%83%E8%80%83%E8%80%83%E9%98%BF%E8%80%83';
    
    const userChannelResponse = await fetch(`${baseUrl}/api/youtube/channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: null,
        channelUrl: userChannelUrl,
        maxResults: 5,
        order: 'date'
      }),
    });
    
    if (userChannelResponse.ok) {
      const data = await userChannelResponse.json();
      if (data.success) {
        console.log('✅ 用户频道链接测试成功');
        console.log('   获取视频数量:', data.data?.successful?.length || 0);
        console.log('   配额使用:', data.quotaUsed);
        if (data.data?.successful?.length > 0) {
          console.log('   第一个视频:', data.data.successful[0].title);
        }
      } else {
        console.log('❌ 用户频道链接返回错误:', data.error);
        if (data.suggestions) {
          console.log('   建议:', data.suggestions);
        }
      }
    } else {
      console.log('❌ 用户频道链接请求失败:', userChannelResponse.status, userChannelResponse.statusText);
      const errorText = await userChannelResponse.text();
      console.log('   错误详情:', errorText);
    }
    
    console.log('\n🎉 API端点测试完成!');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 可能原因: 开发服务器未启动，请先运行 npm run dev');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 可能原因: 网络连接问题');
    } else {
      console.error('💡 错误详情:', error);
    }
  }
}

testAPIEndpoints().catch(console.error);