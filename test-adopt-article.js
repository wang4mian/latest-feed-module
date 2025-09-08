// 测试文章采用功能
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://msvgeriacsaaakmxvqye.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2MDQyMDksImV4cCI6MjA1MzE4MDIwOX0.wF83FpJ8N9SCj6BKAeLxHtmaS2cPsCPs1BoXzVwvJQ0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAdopt() {
  console.log('🧪 测试文章采用功能...')
  
  // 1. 获取一个 ready_for_review 状态的文章
  const { data: article, error } = await supabase
    .from('articles')
    .select('id, title, overall_status')
    .eq('overall_status', 'ready_for_review')
    .limit(1)
    .single()
  
  if (error || !article) {
    console.error('❌ 获取测试文章失败:', error)
    return
  }
  
  console.log('✅ 找到测试文章:', article.title)
  console.log('📋 原始状态:', article.overall_status)
  console.log('🆔 文章ID:', article.id)
  
  // 2. 模拟调用 adopt API
  try {
    const response = await fetch('http://localhost:4001/api/articles/adopt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: article.id })
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ 采用成功!')
      console.log('📋 新状态:', result.data.overall_status)
      
      // 3. 验证状态是否真的改变了
      const { data: updatedArticle } = await supabase
        .from('articles')
        .select('overall_status')
        .eq('id', article.id)
        .single()
      
      console.log('🔍 验证数据库状态:', updatedArticle?.overall_status)
      
      // 4. 检查现在有多少 adopted 状态的文章
      const { data: adoptedArticles } = await supabase
        .from('articles')
        .select('id')
        .eq('overall_status', 'adopted')
      
      console.log('📊 现在有 adopted 状态的文章:', adoptedArticles?.length || 0, '篇')
      
      // 5. 检查 ready_for_review 状态的文章数量是否减少
      const { data: readyArticles } = await supabase
        .from('articles')
        .select('id')
        .eq('overall_status', 'ready_for_review')
      
      console.log('📊 剩余 ready_for_review 状态的文章:', readyArticles?.length || 0, '篇')
      
    } else {
      console.error('❌ 采用失败:', result.error)
    }
    
  } catch (error) {
    console.error('❌ API调用失败:', error)
  }
}

testAdopt().catch(console.error)