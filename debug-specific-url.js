// 测试用户截图中的具体URL
function validateChannelUrl(url) {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return false;
    
    const channelPatterns = [
        /^https?:\/\/(www\.)?youtube\.com\/channel\/UC[\w-]{22}$/,
        /^https?:\/\/(www\.)?youtube\.com\/c\/[\w\-%]+$/,
        /^https?:\/\/(www\.)?youtube\.com\/user\/[\w\-%]+$/,
        /^https?:\/\/(www\.)?youtube\.com\/@[\w\-%]+$/,
    ];
    
    return channelPatterns.some(pattern => pattern.test(trimmedUrl));
}

// 测试截图中看到的URL片段
const testUrls = [
    'https://www.youtube.com/@%E8%80%E6%9',
    'https://www.youtube.com/@%E8%80%81%E7%8E%8B%E6%9D%A5%E4%BA%86%E6%8F%AD%E7%A7%98%E7%B2%BE%E5%8D%8E',
    'https://www.youtube.com/@老王来了揭秘精华',
    'https://www.youtube.com/@%E8%80%81', // 部分输入测试
];

console.log('=== URL验证测试 ===');
testUrls.forEach(url => {
    const isValid = validateChannelUrl(url);
    const isEmpty = !url.trim();
    console.log(`URL: "${url}"`);
    console.log(`  - 验证结果: ${isValid ? '✓ 通过' : '✗ 失败'}`);
    console.log(`  - 是否为空: ${isEmpty}`);
    console.log(`  - 按钮应禁用: ${isEmpty} (仅基于trim检查)`);
    console.log('');
});

// 测试正则表达式匹配
const testPattern = /^https?:\/\/(www\.)?youtube\.com\/@[\w\-%]+$/;
console.log('=== 正则表达式测试 ===');
testUrls.forEach(url => {
    console.log(`"${url}" 匹配 @模式: ${testPattern.test(url)}`);
});