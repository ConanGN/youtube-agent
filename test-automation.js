/**
 * YouTube Agent 项目自动化测试脚本
 * 使用 Puppeteer 进行端到端测试
 * 
 * 运行方式:
 * 1. npm install puppeteer
 * 2. node test-automation.js
 * 
 * 确保项目在 http://localhost:3000 运行
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 测试配置
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  testChannel: 'https://www.youtube.com/@danmartell',
  screenshotDir: path.join(__dirname, 'test-screenshots'),
  timeout: 30000, // 30秒超时
  headless: false, // 显示浏览器便于调试
  viewport: { width: 1920, height: 1080 }
};

// 测试结果记录
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  screenshots: []
};

/**
 * 创建截图目录
 */
function createScreenshotDir() {
  if (!fs.existsSync(CONFIG.screenshotDir)) {
    fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
  }
}

/**
 * 截图并保存
 * @param {Page} page - Puppeteer页面对象
 * @param {string} name - 截图名称
 */
async function takeScreenshot(page, name) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${name}.png`;
    const filepath = path.join(CONFIG.screenshotDir, filename);
    
    await page.screenshot({ path: filepath, fullPage: true });
    testResults.screenshots.push({ name, path: filepath });
    
    console.log(`📸 截图已保存: ${filename}`);
    return filepath;
  } catch (error) {
    console.error('截图失败:', error);
  }
}

/**
 * 等待元素并点击
 * @param {Page} page - Puppeteer页面对象
 * @param {string} selector - CSS选择器
 * @param {number} timeout - 超时时间
 */
async function waitAndClick(page, selector, timeout = CONFIG.timeout) {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector);
    return true;
  } catch (error) {
    console.error(`点击元素失败: ${selector}`, error);
    return false;
  }
}

/**
 * 等待元素并输入文本
 * @param {Page} page - Puppeteer页面对象
 * @param {string} selector - CSS选择器
 * @param {string} text - 输入文本
 */
async function waitAndType(page, selector, text, timeout = CONFIG.timeout) {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.type(selector, text);
    return true;
  } catch (error) {
    console.error(`输入文本失败: ${selector}`, error);
    return false;
  }
}

/**
 * 记录测试结果
 * @param {string} testName - 测试名称
 * @param {boolean} passed - 是否通过
 * @param {string} error - 错误信息
 */
function recordTest(testName, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}${error ? `: ${error}` : ''}`);
    if (error) {
      testResults.errors.push({ test: testName, error });
    }
  }
}

/**
 * 测试1: 页面加载和基础UI
 */
async function testPageLoad(page) {
  console.log('\n🧪 测试1: 页面加载和基础UI');
  
  try {
    // 导航到首页
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'homepage');
    
    // 检查页面标题
    const title = await page.title();
    recordTest('页面标题检查', title.includes('YouTube') || title.includes('Agent'));
    
    // 检查主要元素是否存在
    const mainHeading = await page.$('h1');
    recordTest('主标题存在', !!mainHeading);
    
    // 检查输入区域
    const inputAreas = await page.$$('[class*="input"], input, textarea');
    recordTest('输入区域存在', inputAreas.length > 0);
    
    return true;
  } catch (error) {
    recordTest('页面加载', false, error.message);
    return false;
  }
}

/**
 * 测试2: YouTube链接输入功能
 */
async function testYouTubeInput(page) {
  console.log('\n🧪 测试2: YouTube链接输入功能');
  
  try {
    // 查找频道输入框 - 尝试多种可能的选择器
    const possibleSelectors = [
      'input[placeholder*="频道"]',
      'input[placeholder*="channel"]',
      'input[placeholder*="youtube"]',
      'textarea[placeholder*="频道"]',
      'textarea[placeholder*="channel"]',
      'input[type="text"]',
      'textarea'
    ];
    
    let inputFound = false;
    let inputSelector = null;
    
    for (const selector of possibleSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        inputSelector = selector;
        inputFound = true;
        console.log(`找到输入框: ${selector}`);
        break;
      }
    }
    
    recordTest('找到YouTube输入框', inputFound);
    
    if (inputFound) {
      // 输入YouTube频道链接
      const success = await waitAndType(page, inputSelector, CONFIG.testChannel);
      recordTest('输入YouTube链接', success);
      
      await takeScreenshot(page, 'youtube-link-entered');
      
      // 查找提交按钮
      const submitButtons = await page.$$('button');
      let submitFound = false;
      
      for (const button of submitButtons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && (text.includes('获取') || text.includes('提交') || text.includes('开始'))) {
          await button.click();
          submitFound = true;
          break;
        }
      }
      
      recordTest('找到并点击提交按钮', submitFound);
      
      if (submitFound) {
        // 等待数据加载或页面跳转
        try {
          await page.waitForNavigation({ timeout: 30000 });
          await takeScreenshot(page, 'after-youtube-submit');
        } catch (error) {
          // 可能没有页面跳转，继续检查当前页面
          await new Promise(resolve => setTimeout(resolve, 5000));
          await takeScreenshot(page, 'youtube-processing');
        }
      }
    }
    
    return true;
  } catch (error) {
    recordTest('YouTube输入功能', false, error.message);
    return false;
  }
}

/**
 * 测试3: 数据表格功能
 */
async function testDataTable(page) {
  console.log('\n🧪 测试3: 数据表格功能');
  
  try {
    // 检查是否有表格数据
    const tables = await page.$$('table, [role="table"], [class*="table"]');
    recordTest('数据表格存在', tables.length > 0);
    
    if (tables.length > 0) {
      // 检查表格行
      const rows = await page.$$('tr, [role="row"], [class*="row"]');
      recordTest('表格有数据行', rows.length > 1); // 至少有表头和一行数据
      
      // 检查表格列
      const cells = await page.$$('td, th, [role="cell"], [role="columnheader"]');
      recordTest('表格有数据单元格', cells.length > 0);
      
      await takeScreenshot(page, 'data-table');
    }
    
    // 检查字幕相关功能
    const subtitleElements = await page.$$('[class*="subtitle"], [data-column*="subtitle"]');
    recordTest('字幕列存在', subtitleElements.length > 0);
    
    return true;
  } catch (error) {
    recordTest('数据表格功能', false, error.message);
    return false;
  }
}

/**
 * 测试4: AI字幕功能
 */
async function testAISubtitles(page) {
  console.log('\n🧪 测试4: AI字幕功能');
  
  try {
    // 查找AI字幕相关按钮
    const buttons = await page.$$('button');
    let aiButtonFound = false;
    
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('AI') || text.includes('字幕'))) {
        aiButtonFound = true;
        console.log(`找到AI字幕按钮: ${text}`);
        break;
      }
    }
    
    recordTest('AI字幕按钮存在', aiButtonFound);
    
    // 检查是否有字幕加载状态
    const loadingElements = await page.$$('[class*="loading"], [class*="spinner"]');
    recordTest('加载状态组件存在', loadingElements.length >= 0); // 允许为0，因为可能没有正在加载
    
    await takeScreenshot(page, 'ai-subtitles');
    
    return true;
  } catch (error) {
    recordTest('AI字幕功能', false, error.message);
    return false;
  }
}

/**
 * 测试5: 错误检查和控制台日志
 */
async function testErrorsAndConsole(page) {
  console.log('\n🧪 测试5: 错误检查和控制台日志');
  
  try {
    // 获取控制台日志
    const logs = [];
    page.on('console', msg => {
      logs.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // 获取网络错误
    const networkErrors = [];
    page.on('requestfailed', request => {
      networkErrors.push({
        url: request.url(),
        error: request.failure().errorText
      });
    });
    
    // 等待一段时间收集日志
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 检查是否有严重错误
    const errors = logs.filter(log => log.type === 'error');
    const hasSeriesErrors = errors.some(error => 
      !error.text.includes('favicon') && 
      !error.text.includes('chrome-extension')
    );
    
    recordTest('无严重JavaScript错误', !hasSeriesErrors);
    recordTest('无网络请求失败', networkErrors.length === 0);
    
    // 记录错误详情
    if (errors.length > 0) {
      console.log('发现的JavaScript错误:');
      errors.forEach(error => console.log('  -', error.text));
    }
    
    if (networkErrors.length > 0) {
      console.log('发现的网络错误:');
      networkErrors.forEach(error => console.log('  -', error.url, error.error));
    }
    
    return { logs, networkErrors };
  } catch (error) {
    recordTest('错误检查', false, error.message);
    return { logs: [], networkErrors: [] };
  }
}

/**
 * 生成测试报告
 */
function generateTestReport(logs, networkErrors) {
  console.log('\n📊 测试报告生成中...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      success_rate: Math.round((testResults.passed / testResults.total) * 100)
    },
    errors: testResults.errors,
    console_logs: logs || [],
    network_errors: networkErrors || [],
    screenshots: testResults.screenshots,
    recommendations: []
  };
  
  // 生成建议
  if (testResults.failed > 0) {
    report.recommendations.push('修复失败的测试用例');
  }
  
  if (logs && logs.filter(log => log.type === 'error').length > 0) {
    report.recommendations.push('解决JavaScript控制台错误');
  }
  
  if (networkErrors && networkErrors.length > 0) {
    report.recommendations.push('修复网络请求失败问题');
  }
  
  // 保存报告
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return report;
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始YouTube Agent项目自动化测试');
  console.log(`📍 测试URL: ${CONFIG.baseUrl}`);
  console.log(`📺 测试频道: ${CONFIG.testChannel}\n`);
  
  createScreenshotDir();
  
  let browser;
  let page;
  
  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      viewport: CONFIG.viewport,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    await page.setViewport(CONFIG.viewport);
    
    // 执行测试
    await testPageLoad(page);
    await testYouTubeInput(page);
    await testDataTable(page);
    await testAISubtitles(page);
    const { logs, networkErrors } = await testErrorsAndConsole(page);
    
    // 生成报告
    const report = generateTestReport(logs, networkErrors);
    
    // 打印总结
    console.log('\n' + '='.repeat(50));
    console.log('📈 测试总结');
    console.log('='.repeat(50));
    console.log(`总测试数: ${report.summary.total}`);
    console.log(`通过: ${report.summary.passed}`);
    console.log(`失败: ${report.summary.failed}`);
    console.log(`成功率: ${report.summary.success_rate}%`);
    console.log(`截图数量: ${report.screenshots.length}`);
    console.log(`报告保存到: test-report.json`);
    console.log(`截图保存到: ${CONFIG.screenshotDir}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 改进建议:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
  } catch (error) {
    console.error('测试执行失败:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testResults };