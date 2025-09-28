// 检查最新文章的内容抓取情况
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://msvgeriacsaaakmxvqye.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2MDQyMDksImV4cCI6MjA1MzE4MDIwOX0.wF83FpJ8N9SCj6BKAeLxHtmaS2cPsCPs1BoXzVwvJQ0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRecentArticles() {
  try {
    // 获取今天和昨天的文章
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data: recentArticles, error } = await supabase
      .from('articles')
      .select(`
        id, title, created_at, ai_score, full_content,
        overall_status, link,
        rss_sources(name)
      `)
      .gte('created_at', yesterday.toISOString())
      .not('ai_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('❌ 查询失败:', error)
      return
    }

    console.log(`📊 最近24小时内的 ${recentArticles.length} 篇已分析文章:`)

    let hasContentCount = 0
    let noContentCount = 0

    recentArticles.forEach((article, i) => {
      const contentLength = article.full_content?.length || 0
      const hasContent = contentLength > 100
      
      if (hasContent) hasContentCount++
      else noContentCount++

      const status = hasContent ? '✅' : '❌'
      const time = new Date(article.created_at).toLocaleTimeString('zh-CN')
      
      console.log(`${i+1}. ${status} [${contentLength}字符] ${article.title.substring(0, 60)}...`)
      console.log(`   时间: ${time}, 评分: ${article.ai_score}, 来源: ${article.rss_sources?.name}`)
      
      if (!hasContent) {
        console.log(`   🔗 URL: ${article.link}`)
      }
    })

    console.log(`\n📈 最近24小时抓取成功率: ${hasContentCount}/${recentArticles.length} = ${((hasContentCount/recentArticles.length)*100).toFixed(1)}%`)

    // 如果有失败的，测试一下
    if (noContentCount > 0) {
      console.log(`\n🧪 测试失败案例的URL是否还有效...`)
      const failedArticle = recentArticles.find(a => (a.full_content?.length || 0) < 100)
      if (failedArticle) {
        await testURL(failedArticle.link, failedArticle.title)
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error)
  }
}

async function testURL(url, title) {
  try {
    console.log(`   测试: ${title.substring(0, 50)}...`)
    console.log(`   URL: ${url}`)
    
    const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown'
      }
    })
    
    console.log(`   Jina AI响应: ${jinaResponse.status} ${jinaResponse.statusText}`)
    
    if (jinaResponse.ok) {
      const content = await jinaResponse.text()
      console.log(`   ✅ 现在可以抓取到 ${content.length} 字符`)
    } else {
      console.log(`   ❌ 现在仍然无法抓取`)
    }
  } catch (error) {
    console.log(`   ❌ 测试失败: ${error.message}`)
  }
}

checkRecentArticles()