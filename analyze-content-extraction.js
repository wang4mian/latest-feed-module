// 分析内容抓取情况
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://msvgeriacsaaakmxvqye.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2MDQyMDksImV4cCI6MjA1MzE4MDIwOX0.wF83FpJ8N9SCj6BKAeLxHtmaS2cPsCPs1BoXzVwvJQ0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeContentExtraction() {
  console.log('🔍 分析内容抓取情况...\n')

  try {
    // 获取最近100篇已分析的文章
    const { data: articles, error } = await supabase
      .from('articles')
      .select(`
        id, title, link, ai_score, full_content, created_at,
        rss_sources(name, url)
      `)
      .not('ai_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('❌ 查询失败:', error)
      return
    }

    console.log(`📊 总共分析 ${articles.length} 篇文章`)

    // 分析内容抓取情况
    const stats = {
      total: articles.length,
      hasContent: 0,
      noContent: 0,
      contentLengths: [],
      successBySource: {},
      failureBySource: {},
      urlPatterns: {
        successful: [],
        failed: []
      }
    }

    articles.forEach(article => {
      const sourceName = article.rss_sources?.name || 'Unknown'
      const contentLength = article.full_content?.length || 0
      
      if (contentLength > 100) {
        stats.hasContent++
        stats.contentLengths.push(contentLength)
        stats.successBySource[sourceName] = (stats.successBySource[sourceName] || 0) + 1
        
        // 分析成功的URL模式
        const urlPattern = extractUrlPattern(article.link)
        if (urlPattern && !stats.urlPatterns.successful.includes(urlPattern)) {
          stats.urlPatterns.successful.push(urlPattern)
        }
      } else {
        stats.noContent++
        stats.failureBySource[sourceName] = (stats.failureBySource[sourceName] || 0) + 1
        
        // 分析失败的URL模式
        const urlPattern = extractUrlPattern(article.link)
        if (urlPattern && !stats.urlPatterns.failed.includes(urlPattern)) {
          stats.urlPatterns.failed.push(urlPattern)
        }
      }
    })

    // 输出统计结果
    console.log(`\n📈 抓取成功率: ${((stats.hasContent / stats.total) * 100).toFixed(1)}%`)
    console.log(`✅ 成功抓取: ${stats.hasContent} 篇`)
    console.log(`❌ 抓取失败: ${stats.noContent} 篇`)

    if (stats.contentLengths.length > 0) {
      const avgLength = Math.round(stats.contentLengths.reduce((a, b) => a + b, 0) / stats.contentLengths.length)
      const maxLength = Math.max(...stats.contentLengths)
      const minLength = Math.min(...stats.contentLengths)
      console.log(`📏 成功抓取内容平均长度: ${avgLength} 字符 (${minLength}-${maxLength})`)
    }

    // 按来源分析成功率
    console.log(`\n📊 各来源抓取情况:`)
    const allSources = new Set([...Object.keys(stats.successBySource), ...Object.keys(stats.failureBySource)])
    
    Array.from(allSources).sort().forEach(source => {
      const success = stats.successBySource[source] || 0
      const failure = stats.failureBySource[source] || 0
      const total = success + failure
      const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0'
      
      const status = successRate >= 80 ? '🟢' : successRate >= 50 ? '🟡' : '🔴'
      console.log(`  ${status} ${source}: ${successRate}% (${success}/${total})`)
    })

    // 分析URL模式
    console.log(`\n🔗 URL模式分析:`)
    console.log(`✅ 抓取成功的域名:`)
    stats.urlPatterns.successful.slice(0, 10).forEach(pattern => {
      console.log(`   ${pattern}`)
    })
    
    console.log(`❌ 抓取失败的域名:`)
    stats.urlPatterns.failed.slice(0, 10).forEach(pattern => {
      console.log(`   ${pattern}`)
    })

    // 找出一些具体案例
    console.log(`\n📄 具体案例分析:`)
    
    // 成功案例
    const successfulArticles = articles.filter(a => (a.full_content?.length || 0) > 500).slice(0, 3)
    console.log(`✅ 抓取成功案例:`)
    successfulArticles.forEach((article, i) => {
      console.log(`  ${i+1}. [${article.full_content.length}字符] ${article.title.substring(0, 50)}...`)
      console.log(`     URL: ${article.link}`)
    })

    // 失败案例
    const failedArticles = articles.filter(a => (a.full_content?.length || 0) < 100).slice(0, 3)
    console.log(`❌ 抓取失败案例:`)
    failedArticles.forEach((article, i) => {
      console.log(`  ${i+1}. [${article.full_content?.length || 0}字符] ${article.title.substring(0, 50)}...`)
      console.log(`     URL: ${article.link}`)
    })

    // 手动测试一个失败的URL
    if (failedArticles.length > 0) {
      console.log(`\n🧪 手动测试Jina AI抓取失败案例:`)
      await testJinaAI(failedArticles[0].link, failedArticles[0].title)
    }

  } catch (error) {
    console.error('❌ 分析失败:', error)
  }
}

function extractUrlPattern(url) {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch (error) {
    return url.split('/')[2] || url.substring(0, 50)
  }
}

async function testJinaAI(url, title) {
  try {
    console.log(`   测试URL: ${url}`)
    console.log(`   标题: ${title}`)
    
    const startTime = Date.now()
    const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown'
      }
    })
    
    const duration = Date.now() - startTime
    console.log(`   响应时间: ${duration}ms`)
    console.log(`   HTTP状态: ${jinaResponse.status}`)
    
    if (jinaResponse.ok) {
      const content = await jinaResponse.text()
      console.log(`   返回内容长度: ${content.length} 字符`)
      if (content.length > 0) {
        console.log(`   内容预览: ${content.substring(0, 200)}...`)
      } else {
        console.log(`   ⚠️ 返回内容为空`)
      }
    } else {
      console.log(`   ❌ Jina AI请求失败: ${jinaResponse.statusText}`)
    }
  } catch (error) {
    console.log(`   ❌ Jina AI测试异常: ${error.message}`)
  }
}

analyzeContentExtraction()