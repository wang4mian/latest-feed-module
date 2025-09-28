// 检查特定文章的内容
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://msvgeriacsaaakmxvqye.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2MDQyMDksImV4cCI6MjA1MzE4MDIwOX0.wF83FpJ8N9SCj6BKAeLxHtmaS2cPsCPs1BoXzVwvJQ0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSpecificArticle() {
  try {
    // 查找刚才测试的那篇美国陆军的文章
    const { data: articles, error } = await supabase
      .from('articles')
      .select(`*`)
      .ilike('title', '%US Army%Velo3D%')
      .limit(5)

    if (error) {
      console.error('❌ 查询失败:', error)
      return
    }

    if (articles.length === 0) {
      console.log('❌ 没有找到美国陆军Velo3D相关文章')
      
      // 尝试查找adopted状态的文章
      console.log('🔍 查找adopted状态的文章...')
      const { data: adoptedArticles, error: error2 } = await supabase
        .from('articles')
        .select(`*`)
        .eq('overall_status', 'adopted')
        .limit(10)

      if (adoptedArticles && adoptedArticles.length > 0) {
        console.log(`📊 找到 ${adoptedArticles.length} 篇adopted文章`)
        adoptedArticles.forEach((article, i) => {
          console.log(`${i+1}. [${article.full_content?.length || 0}字符] ${article.title}`)
          console.log(`   创建时间: ${article.created_at}`)
          console.log(`   AI评分: ${article.ai_score}`)
        })
      } else {
        console.log('❌ 也没有adopted文章')
      }
      return
    }

    console.log(`📊 找到 ${articles.length} 篇相关文章:`)
    
    articles.forEach((article, i) => {
      console.log(`\n=== 文章 ${i+1} ===`)
      console.log(`标题: ${article.title}`)
      console.log(`ID: ${article.id}`)
      console.log(`状态: ${article.overall_status}`)
      console.log(`AI评分: ${article.ai_score}`)
      console.log(`创建时间: ${article.created_at}`)
      console.log(`更新时间: ${article.updated_at}`)
      console.log(`完整内容长度: ${article.full_content?.length || 0} 字符`)
      console.log(`AI摘要长度: ${article.ai_summary?.length || 0} 字符`)
      console.log(`URL: ${article.link}`)
      
      if (article.full_content && article.full_content.length > 0) {
        console.log(`✅ 有完整内容，前100字符: ${article.full_content.substring(0, 100)}...`)
      } else {
        console.log(`❌ 完整内容为空或null`)
        
        // 手动测试这个URL
        console.log(`🧪 手动测试Jina AI抓取...`)
        testJinaAI(article.link)
      }
    })

  } catch (error) {
    console.error('❌ 检查失败:', error)
  }
}

async function testJinaAI(url) {
  try {
    console.log(`   测试URL: ${url}`)
    
    const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown'
      }
    })
    
    console.log(`   响应状态: ${jinaResponse.status}`)
    
    if (jinaResponse.ok) {
      const content = await jinaResponse.text()
      console.log(`   现在能抓取到: ${content.length} 字符`)
      if (content.length > 100) {
        console.log(`   内容预览: ${content.substring(0, 150)}...`)
      }
    } else {
      console.log(`   ❌ 抓取失败: ${jinaResponse.statusText}`)
    }
  } catch (error) {
    console.log(`   ❌ 测试异常: ${error.message}`)
  }
}

checkSpecificArticle()