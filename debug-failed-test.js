/**
 * 🔍 调试失败测试的具体原因
 */

const BASE_URL = 'http://localhost:4000';

async function debugFailedTest() {
  console.log('🔍 调试失败的测试项...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/pool`);
    const html = await response.text();
    
    console.log('检查各个测试条件:');
    console.log('1. dashboard-card 存在:', html.includes('dashboard-card'));
    console.log('2. ai-score 存在:', html.includes('ai-score'));
    console.log('3. status-badge 存在:', html.includes('status-badge'));
    
    // 查找实际的类名模式
    const dashboardMatches = html.match(/class="[^"]*dashboard-card[^"]*"/g);
    const scoreMatches = html.match(/class="[^"]*status-badge[^"]*"/g);
    
    console.log('\n实际找到的类名:');
    if (dashboardMatches) {
      console.log('dashboard-card 示例:', dashboardMatches[0]);
    }
    if (scoreMatches) {
      console.log('status-badge 示例:', scoreMatches[0]);
    }
    
    // 检查是否有AI评分数据
    const scoreNumbers = html.match(/status-badge[^>]*>[\s\n]*(\d+)/g);
    console.log('\nAI评分数据:', scoreNumbers ? scoreNumbers.slice(0, 3) : '未找到');
    
    // 原始测试条件
    const originalTest = html.includes('dashboard-card') && html.includes('ai-score');
    const correctedTest = html.includes('dashboard-card') && html.includes('status-badge');
    
    console.log('\n测试结果对比:');
    console.log('原始测试 (dashboard-card && ai-score):', originalTest);
    console.log('修正测试 (dashboard-card && status-badge):', correctedTest);
    
  } catch (error) {
    console.error('调试失败:', error.message);
  }
}

debugFailedTest();