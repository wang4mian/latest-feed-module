// 抽查最新文章的完整内容
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://msvgeriacsaaakmxvqye.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2MDQyMDksImV4cCI6MjA1MzE4MDIwOX0.wF83FpJ8N9SCj6BKAeLxHtmaS2cPsCPs1BoXzVwvJQ0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function sampleFullContent() {
  try {
    // 获取今天最新的几篇高分文章
    const today = new Date().toISOString().split('T')[0]
    
    const { data: articles, error } = await supabase
      .from('articles')
      .select(`
        id, title, created_at, ai_score, full_content, 
        ai_summary, link,
        rss_sources(name)
      `)
      .gte('created_at', `${today}T00:00:00`)
      .not('ai_score', 'is', null)
      .gte('ai_score', 40)  // 只看中高分文章
      .order('ai_score', { ascending: false })
      .limit(3)

    if (error) {
      console.error('❌ 查询失败:', error)
      return
    }

    console.log(`📊 今日高分文章样本 (${articles.length}篇):`)

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]
      console.log(`\n${'='.repeat(80)}`)
      console.log(`📄 样本 ${i+1}: ${article.title}`)
      console.log(`🏷️ 来源: ${article.rss_sources?.name}`)
      console.log(`📊 AI评分: ${article.ai_score}/100`)
      console.log(`🕐 时间: ${new Date(article.created_at).toLocaleString('zh-CN')}`)
      console.log(`🔗 URL: ${article.link}`)
      console.log(`📏 完整内容长度: ${article.full_content?.length || 0} 字符`)
      console.log(`📝 AI摘要长度: ${article.ai_summary?.length || 0} 字符`)

      console.log(`\n--- AI摘要 ---`)
      console.log(article.ai_summary || '无')

      console.log(`\n--- 完整内容 (full_content) ---`)
      if (article.full_content) {
        console.log(article.full_content)
      } else {
        console.log('无完整内容')
      }
      
      console.log(`${'='.repeat(80)}`)
      
      // 为了不输出太多，只显示第一个
      if (i === 0) {
        console.log('\n⚠️ 只显示第一篇的完整内容，其他的只显示概要...')
        break
      }
    }

    // 显示其他文章的概要
    if (articles.length > 1) {
      console.log(`\n📋 其他 ${articles.length - 1} 篇文章概要:`)
      for (let i = 1; i < articles.length; i++) {
        const article = articles[i]
        console.log(`\n${i+1}. [${article.ai_score}分] ${article.title}`)
        console.log(`   内容长度: ${article.full_content?.length || 0} 字符`)
        console.log(`   内容预览: ${(article.full_content || '').substring(0, 150).replace(/\n/g, ' ')}...`)
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error)
  }
}

sampleFullContent()