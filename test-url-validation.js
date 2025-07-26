// 测试URL验证函数
function validateChannelUrl(url) {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return false;
    
    // YouTube频道URL格式检查 - 支持URL编码的字符
    const channelPatterns = [
        /^https?:\/\/(www\.)?youtube\.com\/channel\/UC[\w-]{22}$/,  // 修正频道ID格式：UC开头+22字符
        /^https?:\/\/(www\.)?youtube\.com\/c\/[\w\-%]+$/,  // 支持URL编码的%字符
        /^https?:\/\/(www\.)?youtube\.com\/user\/[\w\-%]+$/,  // 支持URL编码的%字符
        /^https?:\/\/(www\.)?youtube\.com\/@[\w\-%]+$/,  // 支持URL编码的%字符，如中文编码
    ];
    
    return channelPatterns.some(pattern => pattern.test(trimmedUrl));
}

// 测试用户输入的URL
const testUrl = 'https://www.youtube.com/@%E8%80%E6%9';
console.log(`测试URL: "${testUrl}"`);
console.log(`验证结果: ${validateChannelUrl(testUrl) ? '✓ 通过' : '✗ 失败'}`);
console.log(`URL长度: ${testUrl.length}`);
console.log(`trim后: "${testUrl.trim()}"`);
console.log(`!channelUrl.trim(): ${!testUrl.trim()}`);

// 测试按钮禁用逻辑
const loading = false;
const inputType = 'url';
const channelUrl = testUrl;
const shouldBeDisabled = loading || (inputType === 'url' ? !channelUrl.trim() : false);
console.log(`按钮应该禁用: ${shouldBeDisabled}`);

// 测试完整的URL
const fullUrl = 'https://www.youtube.com/@%E8%80%81%E7%8E%8B%E6%9D%A5%E4%BA%86%E6%8F%AD%E7%A7%98%E7%B2%BE%E5%8D%8E';
console.log(`\n测试完整URL: "${fullUrl}"`);
console.log(`验证结果: ${validateChannelUrl(fullUrl) ? '✓ 通过' : '✗ 失败'}`);