// 深度分析内容抓取的真实情况
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://msvgeriacsaaakmxvqye.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2MDQyMDksImV4cCI6MjA1MzE4MDIwOX0.wF83FpJ8N9SCj6BKAeLxHtmaS2cPsCPs1BoXzVwvJQ0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function deepAnalyzeContent() {
  try {
    // 获取今天最新的一篇文章，包括所有字段
    const today = new Date().toISOString().split('T')[0]
    
    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .gte('created_at', `${today}T00:00:00`)
      .not('ai_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !articles.length) {
      console.error('❌ 查询失败:', error)
      return
    }

    const article = articles[0]
    console.log('🔍 深度分析文章数据结构:')
    console.log(`📄 标题: ${article.title}`)
    console.log(`🔗 链接: ${article.link}`)
    console.log(`📏 各字段长度对比:`)
    console.log(`   description: ${(article.description || '').length} 字符`)
    console.log(`   full_content: ${(article.full_content || '').length} 字符`)
    console.log(`   ai_summary: ${(article.ai_summary || '').length} 字符`)

    // 比较 description 和 full_content 是否相同
    const descriptionContent = article.description || ''
    const fullContent = article.full_content || ''
    
    console.log('\n📊 内容对比分析:')
    if (descriptionContent === fullContent) {
      console.log('❌ full_content 与 description 完全相同！')
      console.log('   这说明 Jina AI 抓取失败，fallback 到了 RSS description')
    } else {
      console.log('✅ full_content 与 description 不同')
      console.log('   这可能说明 Jina AI 抓取成功了')
    }

    console.log('\n--- RSS description 内容 ---')
    console.log(descriptionContent)
    
    console.log('\n--- full_content 内容 ---')
    console.log(fullContent)

    console.log('\n🧪 手动测试 Jina AI 抓取这个 URL:')
    await testJinaAI(article.link)

  } catch (error) {
    console.error('❌ 分析失败:', error)
  }
}

async function testJinaAI(url) {
  try {
    console.log(`📡 测试 URL: ${url}`)
    
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown'
      }
    })
    
    console.log(`📊 Jina AI 响应状态: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const content = await response.text()
      console.log(`📏 Jina AI 返回内容长度: ${content.length} 字符`)
      
      if (content.length > 100) {
        console.log(`📝 Jina AI 返回内容预览:`)
        console.log(content.substring(0, 300) + '...')
      } else {
        console.log(`❌ Jina AI 返回内容太短: "${content}"`)
      }
    } else {
      console.log(`❌ Jina AI 请求失败`)
    }

    // 同时测试一下直接访问这个URL会返回什么
    console.log('\n🌐 测试直接访问 URL:')
    const directResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })
    
    console.log(`📊 直接访问响应状态: ${directResponse.status} ${directResponse.statusText}`)
    if (directResponse.ok) {
      const html = await directResponse.text()
      console.log(`📏 直接访问返回内容长度: ${html.length} 字符`)
      console.log(`📝 HTML 预览:`)
      console.log(html.substring(0, 500) + '...')
    }

  } catch (error) {
    console.error(`❌ 测试失败: ${error.message}`)
  }
}

deepAnalyzeContent()