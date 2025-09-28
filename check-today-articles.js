// 检查今日文章抓取情况
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://msvgeriacsaaakmxvqye.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2MDQyMDksImV4cCI6MjA1MzE4MDIwOX0.wF83FpJ8N9SCj6BKAeLxHtmaS2cPsCPs1BoXzVwvJQ0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTodayArticles() {
  const today = new Date().toISOString().split('T')[0] // 2025-09-10
  console.log(`📅 检查日期: ${today}`)
  
  try {
    // 查询今日新增文章
    const { data: todayArticles, error } = await supabase
      .from('articles')
      .select('id, title, created_at, ai_score, overall_status, rss_sources(name)')
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ 查询失败:', error)
      return
    }
    
    console.log(`\n📊 今日文章统计:`)
    console.log(`   总数: ${todayArticles.length} 篇`)
    
    if (todayArticles.length === 0) {
      console.log('   🤔 今天还没有抓取到新文章')
      return
    }
    
    // 按状态分组统计
    const statusCounts = {}
    const aiScores = []
    
    todayArticles.forEach(article => {
      const status = article.overall_status || 'unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1
      
      if (article.ai_score) {
        aiScores.push(article.ai_score)
      }
    })
    
    console.log(`\n📈 状态分布:`)
    Object.entries(statusCounts).forEach(([status, count]) => {
      const statusName = {
        'ready_for_review': '待审核 (≥50分)',
        'auto_rejected': 'AI过滤 (<50分)', 
        'adopted': '已采用',
        'archived': '已归档',
        'draft': '草稿',
        'processing': '处理中'
      }[status] || status
      console.log(`   ${statusName}: ${count} 篇`)
    })
    
    if (aiScores.length > 0) {
      const avgScore = Math.round(aiScores.reduce((a, b) => a + b, 0) / aiScores.length)
      const maxScore = Math.max(...aiScores)
      console.log(`\n🤖 AI分析:`)
      console.log(`   已分析: ${aiScores.length} 篇`)
      console.log(`   平均分: ${avgScore} 分`)
      console.log(`   最高分: ${maxScore} 分`)
    }
    
    console.log(`\n📄 最新5篇文章:`)
    todayArticles.slice(0, 5).forEach((article, index) => {
      const time = new Date(article.created_at).toLocaleTimeString('zh-CN')
      const score = article.ai_score ? `${article.ai_score}分` : '待分析'
      const source = article.rss_sources?.name || '未知来源'
      console.log(`   ${index + 1}. [${score}] ${article.title.substring(0, 50)}... (${time}, ${source})`)
    })
    
  } catch (error) {
    console.error('❌ 检查失败:', error)
  }
}

checkTodayArticles()