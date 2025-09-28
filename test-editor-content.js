// 测试编辑工作台生成内容
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://msvgeriacsaaakmxvqye.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2MDQyMDksImV4cCI6MjA1MzE4MDIwOX0.wF83FpJ8N9SCj6BKAeLxHtmaS2cPsCPs1BoXzVwvJQ0'

const supabase = createClient(supabaseUrl, supabaseKey)

// 复制编辑器中的内容生成函数
function generateMarkdownContent(article) {
  const date = new Date(article.created_at).toLocaleDateString('zh-CN');
  
  let content = `# ${article.title}\n\n`;
  
  // 添加元信息
  content += `**来源**: ${article.rss_sources?.name || '未知'}\n`;
  content += `**发布时间**: ${date}\n`;
  if (article.ai_score) {
    content += `**AI评分**: ${article.ai_score}/100\n`;
  }
  if (article.ai_category) {
    content += `**分类**: ${article.ai_category}\n`;
  }
  content += `**原文链接**: [查看原文](${article.link})\n\n`;
  
  content += `---\n\n`;
  
  // 添加AI摘要
  if (article.ai_summary) {
    content += `## AI 摘要\n\n${article.ai_summary}\n\n`;
  }
  
  // 添加战略意义分析
  if (article.ai_strategic_implication) {
    content += `## 战略意义\n\n${article.ai_strategic_implication}\n\n`;
  }
  
  // 添加原始描述
  if (article.description) {
    content += `## 原始摘要\n\n${article.description}\n\n`;
  }
  
  // 添加完整内容（如果有）
  if (article.full_content) {
    content += `## 完整内容\n\n${article.full_content}\n\n`;
  }
  
  content += `---\n\n`;
  content += `*此内容由制造业情报系统自动生成，基于文章: "${article.title}"*\n`;
  
  return content;
}

async function testEditorContent() {
  try {
    // 获取一篇adopted状态的文章来测试
    const { data: adoptedArticles, error } = await supabase
      .from('articles')
      .select(`
        *,
        rss_sources (
          name,
          vertical_name,
          topic_for_ai
        )
      `)
      .eq('overall_status', 'adopted')
      .limit(1)
      .single()

    if (error) {
      console.error('❌ 查询adopted文章失败:', error)
      
      // 如果没有adopted文章，尝试获取一篇高分文章
      console.log('📝 没有adopted文章，尝试获取高分文章测试...')
      
      const { data: highScoreArticle, error: error2 } = await supabase
        .from('articles')
        .select(`
          *,
          rss_sources (
            name,
            vertical_name,
            topic_for_ai
          )
        `)
        .gte('ai_score', 70)
        .limit(1)
        .single()

      if (error2 || !highScoreArticle) {
        console.error('❌ 也没有找到高分文章:', error2)
        return
      }

      adoptedArticles = highScoreArticle
    }

    if (!adoptedArticles) {
      console.log('❌ 没有找到文章进行测试')
      return
    }

    console.log(`📄 测试文章: ${adoptedArticles.title}`)
    console.log(`🏷️ 状态: ${adoptedArticles.overall_status}`)
    console.log(`📊 AI评分: ${adoptedArticles.ai_score}`)
    console.log(`📝 AI摘要长度: ${adoptedArticles.ai_summary?.length || 0} 字符`)
    console.log(`📝 完整内容长度: ${adoptedArticles.full_content?.length || 0} 字符`)

    // 生成Markdown内容
    const markdownContent = generateMarkdownContent(adoptedArticles)
    
    console.log('\n=== 生成的Markdown内容预览 ===')
    console.log('总长度:', markdownContent.length, '字符')
    console.log('前500字符:')
    console.log(markdownContent.substring(0, 500))
    console.log('...')
    console.log('=== 完整内容保存到文件 ===')
    
    // 保存到文件查看
    const fs = await import('fs')
    const filename = `editor-content-preview-${Date.now()}.md`
    fs.writeFileSync(filename, markdownContent)
    console.log(`✅ 完整内容已保存到: ${filename}`)

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

testEditorContent()