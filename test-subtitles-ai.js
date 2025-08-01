/**
 * 字幕AI API测试脚本
 * 测试新创建的 /api/subtitles-ai 端点功能
 */

const testUrls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll - 经典测试视频
  'https://youtu.be/jNQXAC9IVRw', // Me at the zoo - YouTube第一个视频
];

// 测试单个视频
async function testSingleVideo() {
  console.log('🎬 测试单个视频AI字幕生成...\n');
  
  try {
    const response = await fetch('http://localhost:3004/api/subtitles-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: [testUrls[0]],
        options: {
          enableSmartFormatting: true,
          format: 'json'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ 单个视频测试成功:');
    console.log('📊 处理摘要:', result.summary);
    
    if (result.results && result.results.length > 0) {
      const video = result.results[0];
      console.log('🎯 视频详情:');
      console.log(`  ID: ${video.id}`);
      console.log(`  标题: ${video.title?.substring(0, 50)}...`);
      console.log(`  时长: ${Math.floor((video.duration || 0) / 60)}:${((video.duration || 0) % 60).toString().padStart(2, '0')}`);
      console.log(`  检测语言: ${video.transcript.language || 'unknown'}`);
      console.log(`  转写文本长度: ${video.transcript.text.length} 字符`);
      console.log(`  分段数量: ${video.transcript.segments?.length || 0} 个`);
      console.log(`  处理时间: ${video.processingTime}ms`);
      
      if (video.transcript.text) {
        console.log(`  转写内容预览: ${video.transcript.text.substring(0, 200)}...`);
      }
      
      if (video.error) {
        console.log(`  ❌ 错误: ${video.error}`);
      }
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ 单个视频测试失败:', error.message);
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// 测试批量处理
async function testBatchProcessing() {
  console.log('📦 测试批量AI字幕生成...\n');
  
  try {
    const response = await fetch('http://localhost:3004/api/subtitles-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: testUrls,
        options: {
          enableSmartFormatting: true,
          format: 'json'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ 批量处理测试成功:');
    console.log('📊 处理摘要:', result.summary);
    
    if (result.results) {
      result.results.forEach((video, index) => {
        console.log(`\n🎯 视频 ${index + 1}:`);
        console.log(`  ID: ${video.id}`);
        console.log(`  URL: ${video.url}`);
        if (video.error) {
          console.log(`  ❌ 错误: ${video.error}`);
        } else {
          console.log(`  标题: ${video.title?.substring(0, 50)}...`);
          console.log(`  转写文本长度: ${video.transcript.text.length} 字符`);
          console.log(`  处理时间: ${video.processingTime}ms`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ 批量处理测试失败:', error.message);
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// 测试API状态
async function testApiStatus() {
  console.log('🔍 测试API状态...\n');
  
  try {
    const response = await fetch('http://localhost:3004/api/subtitles-ai', {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const status = await response.json();
    console.log('✅ API状态测试成功:');
    console.log(`  服务: ${status.service}`);
    console.log(`  版本: ${status.version}`);
    console.log(`  状态: ${status.status}`);
    console.log('  功能特性:', status.features);
    console.log('  限制:', status.limits);
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ API状态测试失败:', error.message);
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// 测试错误处理
async function testErrorHandling() {
  console.log('🚨 测试错误处理...\n');
  
  // 测试无效URL
  try {
    const response = await fetch('http://localhost:3004/api/subtitles-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: ['invalid-url', 'https://example.com/not-youtube']
      })
    });
    
    const result = await response.json();
    console.log('✅ 无效URL错误处理测试:', response.status === 400 ? '通过' : '失败');
    console.log('  错误信息:', result.error);
    
  } catch (error) {
    console.error('❌ 错误处理测试失败:', error.message);
  }
  
  // 测试超过限制
  try {
    const tooManyUrls = new Array(15).fill(testUrls[0]);
    const response = await fetch('http://localhost:3004/api/subtitles-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: tooManyUrls
      })
    });
    
    const result = await response.json();
    console.log('✅ 超过限制错误处理测试:', response.status === 400 ? '通过' : '失败');
    console.log('  错误信息:', result.error);
    
  } catch (error) {
    console.error('❌ 限制测试失败:', error.message);
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始字幕AI API测试\n');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('测试视频:', testUrls);
  console.log('\n' + '='.repeat(80) + '\n');
  
  await testApiStatus();
  await testErrorHandling();
  
  console.log('⚠️  注意: 以下测试需要实际的YouTube视频和Deepgram API，可能需要较长时间...\n');
  
  // 询问用户是否继续实际测试
  if (process.argv.includes('--full')) {
    await testSingleVideo();
    await testBatchProcessing();
  } else {
    console.log('💡 要运行完整测试，请使用: node test-subtitles-ai.js --full\n');
  }
  
  console.log('🎉 测试完成!');
}

// 运行测试
runTests().catch(console.error);