/**
 * 单独测试Deepgram API功能
 */

const { createClient } = require('@deepgram/sdk');

// 使用提供的API Key
const deepgram = createClient('a41512e3554c0ee55fb79e65d30f6316b7980b1a');

async function testDeepgram() {
  try {
    console.log('🎤 测试Deepgram语音转写...\n');
    
    // 使用一个公开的音频URL进行测试
    const testAudioUrl = 'https://dpgr.am/spacewalk.wav'; // Deepgram官方示例音频
    
    console.log('📡 发送转写请求...');
    console.log('音频URL:', testAudioUrl);
    
    const response = await deepgram.listen.prerecorded.transcribeUrl(
      { url: testAudioUrl },
      {
        model: 'nova-2-general',
        detect_language: true,
        smart_format: true,
        paragraphs: true,
        punctuate: true,
        utterances: true
      }
    );
    
    console.log('\n✅ Deepgram转写成功!');
    
    const result = response.result;
    const alternative = result.results.channels[0].alternatives[0];
    
    console.log('📊 转写结果:');
    console.log('文本:', alternative.transcript);
    console.log('置信度:', alternative.confidence);
    console.log('检测语言:', result.metadata?.model_info?.language || 'unknown');
    console.log('时长:', result.metadata.duration, '秒');
    
    if (alternative.paragraphs?.paragraphs) {
      console.log('\n📝 段落信息:');
      alternative.paragraphs.paragraphs.forEach((paragraph, index) => {
        console.log(`段落 ${index + 1} (${paragraph.start}s - ${paragraph.end}s):`);
        paragraph.sentences.forEach((sentence, sIndex) => {
          console.log(`  句子 ${sIndex + 1}: ${sentence.text}`);
        });
      });
    }
    
    console.log('\n🎉 Deepgram测试完成!');
    
  } catch (error) {
    console.error('❌ Deepgram测试失败:', error.message);
    if (error.cause) {
      console.error('详细错误:', error.cause);
    }
  }
}

testDeepgram();