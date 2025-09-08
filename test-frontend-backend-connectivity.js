/**
 * 🔍 前后端连通性全面测试脚本
 * 验证KUATO系统的前后端数据流完整性
 */

// 测试配置
const BASE_URL = 'http://localhost:4001'; // Astro开发服务器
const TEST_TIMEOUT = 10000; // 10秒超时

console.log('🚀 开始前后端连通性测试...\n');

// 测试结果收集
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// 辅助函数
const logTest = (testName, success, details = '') => {
  if (success) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName} - ${details}`);
    testResults.failed++;
    testResults.errors.push({ test: testName, error: details });
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 测试1: 检查前端页面是否可访问
 */
async function testFrontendPages() {
  console.log('\n📋 测试前端页面可访问性...');
  
  const pages = [
    { name: '主页', url: '/' },
    { name: '文章池', url: '/pool' },
    { name: '编辑工作台', url: '/editor' },
    { name: '源管理', url: '/sources' }
  ];
  
  for (const page of pages) {
    try {
      const response = await fetch(`${BASE_URL}${page.url}`, {
        signal: AbortSignal.timeout(TEST_TIMEOUT)
      });
      logTest(`${page.name}页面可访问 (${response.status})`, 
               response.status === 200, 
               response.status !== 200 ? `HTTP ${response.status}` : '');
    } catch (error) {
      logTest(`${page.name}页面可访问`, false, error.message);
    }
  }
}

/**
 * 测试2: 检查API端点是否工作
 */
async function testAPIEndpoints() {
  console.log('\n🔌 测试API端点连通性...');
  
  // 测试不正确的请求（应该返回400错误）
  try {
    const adoptResponse = await fetch(`${BASE_URL}/api/articles/adopt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // 缺少id
      signal: AbortSignal.timeout(TEST_TIMEOUT)
    });
    
    const adoptResult = await adoptResponse.json();
    logTest('采用API端点响应', 
            adoptResponse.status === 400 && adoptResult.error === 'Missing article ID',
            adoptResponse.status !== 400 ? `期望400错误，得到${adoptResponse.status}` : '');
  } catch (error) {
    logTest('采用API端点响应', false, error.message);
  }
  
  try {
    const archiveResponse = await fetch(`${BASE_URL}/api/articles/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // 缺少id
      signal: AbortSignal.timeout(TEST_TIMEOUT)
    });
    
    const archiveResult = await archiveResponse.json();
    logTest('归档API端点响应', 
            archiveResponse.status === 400 && archiveResult.error === 'Missing article ID',
            archiveResponse.status !== 400 ? `期望400错误，得到${archiveResponse.status}` : '');
  } catch (error) {
    logTest('归档API端点响应', false, error.message);
  }
}

/**
 * 测试3: 模拟完整用户操作流程
 */
async function testUserWorkflow() {
  console.log('\n👤 测试用户操作流程...');
  
  try {
    // 1. 访问文章池页面
    const poolResponse = await fetch(`${BASE_URL}/pool`, {
      signal: AbortSignal.timeout(TEST_TIMEOUT)
    });
    logTest('文章池页面加载', poolResponse.ok, 
            !poolResponse.ok ? `HTTP ${poolResponse.status}` : '');
    
    // 2. 检查页面内容是否包含预期元素
    if (poolResponse.ok) {
      const poolHTML = await poolResponse.text();
      const hasArticleContainer = poolHTML.includes('dashboard-card');
      const hasAdoptButton = poolHTML.includes('adoptArticle');
      const hasArchiveButton = poolHTML.includes('archiveArticle');
      const hasFilterForm = poolHTML.includes('筛选');
      
      logTest('文章池页面包含文章容器', hasArticleContainer, '缺少dashboard-card类');
      logTest('文章池页面包含采用按钮', hasAdoptButton, '缺少adoptArticle函数调用');
      logTest('文章池页面包含归档按钮', hasArchiveButton, '缺少archiveArticle函数调用');
      logTest('文章池页面包含筛选功能', hasFilterForm, '缺少筛选表单');
    }
    
  } catch (error) {
    logTest('用户操作流程测试', false, error.message);
  }
}

/**
 * 测试4: 检查JavaScript函数是否正确暴露
 */
async function testJavaScriptFunctions() {
  console.log('\n⚡ 测试JavaScript函数暴露...');
  
  try {
    const poolResponse = await fetch(`${BASE_URL}/pool`, {
      signal: AbortSignal.timeout(TEST_TIMEOUT)
    });
    
    if (poolResponse.ok) {
      const poolHTML = await poolResponse.text();
      
      // 检查函数是否正确暴露到window对象
      const hasWindowExpose = poolHTML.includes('window.adoptArticle = adoptArticle') &&
                             poolHTML.includes('window.archiveArticle = archiveArticle') &&
                             poolHTML.includes('window.toggleExpand = toggleExpand');
      
      logTest('JavaScript函数正确暴露到window对象', hasWindowExpose, '缺少window对象暴露');
      
      // 检查函数定义
      const hasFunctionDefs = poolHTML.includes('function adoptArticle') &&
                             poolHTML.includes('function archiveArticle') &&
                             poolHTML.includes('function toggleExpand');
      
      logTest('JavaScript函数正确定义', hasFunctionDefs, '缺少函数定义');
    }
    
  } catch (error) {
    logTest('JavaScript函数测试', false, error.message);
  }
}

/**
 * 测试5: 检查环境变量和配置
 */
async function testConfiguration() {
  console.log('\n⚙️ 测试配置完整性...');
  
  try {
    // 检查是否能够正常连接（通过检查页面是否包含错误信息）
    const indexResponse = await fetch(`${BASE_URL}/`, {
      signal: AbortSignal.timeout(TEST_TIMEOUT)
    });
    
    if (indexResponse.ok) {
      const indexHTML = await indexResponse.text();
      const hasSupabaseError = indexHTML.includes('Missing Supabase') || 
                              indexHTML.includes('SUPABASE_URL') ||
                              indexHTML.includes('环境变量缺失');
      
      logTest('Supabase环境变量配置', !hasSupabaseError, '可能存在环境变量配置问题');
      
      // 检查页面是否正常显示数据（不是错误页面）
      const hasNormalContent = indexHTML.includes('Overview') || indexHTML.includes('仪表板');
      logTest('页面正常显示内容', hasNormalContent, '页面可能显示错误或空白');
    }
    
  } catch (error) {
    logTest('配置完整性测试', false, error.message);
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  const startTime = Date.now();
  
  await testFrontendPages();
  await delay(500);
  await testAPIEndpoints();
  await delay(500);
  await testUserWorkflow();
  await delay(500);
  await testJavaScriptFunctions();
  await delay(500);
  await testConfiguration();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 测试完成总结');
  console.log('='.repeat(50));
  console.log(`⏱️  总耗时: ${duration}秒`);
  console.log(`✅ 通过: ${testResults.passed} 项`);
  console.log(`❌ 失败: ${testResults.failed} 项`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 错误详情:');
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
  console.log(`\n📊 成功率: ${successRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 所有测试通过！前后端连通性正常。');
  } else {
    console.log('\n⚠️  存在连通性问题，请检查上述错误。');
  }
}

// 运行测试
runAllTests().catch(error => {
  console.error('❌ 测试执行失败:', error);
});