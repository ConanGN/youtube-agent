// 简单的测试脚本来模拟输入事件
console.log('测试频道URL验证函数...');

// 复制验证函数
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

// 测试用例
const testUrls = [
    'https://www.youtube.com/@TonyRobbins',
    'https://www.youtube.com/@Google',
    'https://www.youtube.com/c/TonyRobbins',
    'https://www.youtube.com/@%E7%8E%8B%E5%90%89%E8%88%9F%E8%A7%A3%E5%AF%86',
    'invalid-url',
    ''
];

console.log('测试结果:');
testUrls.forEach(url => {
    const isValid = validateChannelUrl(url);
    console.log(`"${url}" -> ${isValid ? '✓ 有效' : '✗ 无效'}`);
});

// 模拟按钮状态检查
function checkButtonState(channelUrl, loading = false) {
    const shouldBeDisabled = loading || !channelUrl.trim();
    return {
        channelUrl,
        trimmed: channelUrl.trim(),
        length: channelUrl.length,
        shouldBeDisabled,
        validation: validateChannelUrl(channelUrl)
    };
}

console.log('\n按钮状态测试:');
const inputTests = [
    '',
    'https://www.youtube.com/@TonyRobbins',
    '  https://www.youtube.com/@Google  ',
    'invalid'
];

inputTests.forEach(input => {
    const state = checkButtonState(input);
    console.log(`输入: "${input}"`);
    console.log(`  - trim后: "${state.trimmed}"`);
    console.log(`  - 长度: ${state.length}`);
    console.log(`  - URL验证: ${state.validation ? '通过' : '失败'}`);
    console.log(`  - 按钮禁用: ${state.shouldBeDisabled ? '是' : '否'}`);
    console.log('');
});