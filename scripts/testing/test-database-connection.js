#!/usr/bin/env node

/**
 * 测试数据库连接和基础数据
 * Test database connection and basic data
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../..')

// 加载环境变量
const envContent = readFileSync(join(projectRoot, '.env'), 'utf8')
const envVars = {}

envContent.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  }
})

const supabaseUrl = envVars.SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseConnection() {
  console.log('🔍 测试数据库连接和基础数据...\n')
  
  try {
    // 测试1: 检查RSS源表
    console.log('1. 检查RSS源表...')
    const { data: sources, error: sourcesError, count: sourcesCount } = await supabase
      .from('rss_sources')
      .select('*', { count: 'exact' })
      .limit(5)
    
    if (sourcesError) {
      console.error('❌ RSS源表查询失败:', sourcesError.message)
      return false
    }
    
    console.log(`✅ RSS源表正常，共 ${sourcesCount} 条记录`)
    if (sources && sources.length > 0) {
      console.log('   示例数据:')
      sources.forEach((source, index) => {
        console.log(`   ${index + 1}. ${source.name} (${source.url})`)
      })
    } else {
      console.log('   ⚠️  暂无RSS源数据')
    }
    console.log()
    
    // 测试2: 检查文章表
    console.log('2. 检查文章表...')
    const { data: articles, error: articlesError, count: articlesCount } = await supabase
      .from('articles')
      .select('id, title, overall_status, ai_score, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (articlesError) {
      console.error('❌ 文章表查询失败:', articlesError.message)
      return false
    }
    
    console.log(`✅ 文章表正常，共 ${articlesCount} 条记录`)
    if (articles && articles.length > 0) {
      console.log('   最近文章:')
      articles.forEach((article, index) => {
        const date = new Date(article.created_at).toLocaleString('zh-CN')
        console.log(`   ${index + 1}. ${article.title.substring(0, 50)}${article.title.length > 50 ? '...' : ''} (${article.overall_status}, AI评分: ${article.ai_score || 'N/A'}, ${date})`)
      })
    } else {
      console.log('   ⚠️  暂无文章数据')
    }
    console.log()
    
    // 测试3: 检查实体表
    console.log('3. 检查实体表...')
    const { data: entities, error: entitiesError, count: entitiesCount } = await supabase
      .from('entities')
      .select('*', { count: 'exact' })
      .limit(5)
    
    if (entitiesError) {
      console.error('❌ 实体表查询失败:', entitiesError.message)
      return false
    }
    
    console.log(`✅ 实体表正常，共 ${entitiesCount} 条记录`)
    if (entities && entities.length > 0) {
      console.log('   示例实体:')
      entities.forEach((entity, index) => {
        console.log(`   ${index + 1}. ${entity.name} (${entity.type}, 提及次数: ${entity.mention_count})`)
      })
    } else {
      console.log('   ⚠️  暂无实体数据')
    }
    console.log()
    
    // 测试4: 检查任务队列表
    console.log('4. 检查任务队列表...')
    const { data: jobs, error: jobsError, count: jobsCount } = await supabase
      .from('processing_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (jobsError) {
      console.error('❌ 任务队列表查询失败:', jobsError.message)
      return false
    }
    
    console.log(`✅ 任务队列表正常，共 ${jobsCount} 条记录`)
    if (jobs && jobs.length > 0) {
      console.log('   最近任务:')
      jobs.forEach((job, index) => {
        const date = new Date(job.created_at).toLocaleString('zh-CN')
        console.log(`   ${index + 1}. ${job.job_type} (${job.status}, ${date})`)
      })
    } else {
      console.log('   ⚠️  暂无任务数据')
    }
    console.log()
    
    // 测试5: 统计分析
    console.log('5. 系统统计分析...')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todayArticles } = await supabase
      .from('articles')
      .select('id')
      .gte('created_at', today.toISOString())
    
    const statusCounts = {}
    if (articles && articles.length > 0) {
      articles.forEach(article => {
        statusCounts[article.overall_status] = (statusCounts[article.overall_status] || 0) + 1
      })
    }
    
    console.log(`📊 今日新增文章: ${todayArticles?.length || 0} 篇`)
    console.log(`📊 文章状态分布:`, statusCounts)
    console.log(`📊 活跃RSS源: ${sources?.filter(s => s.is_active).length || 0} / ${sourcesCount} 个`)
    
    console.log('\n🎉 数据库连接测试完成！所有表结构正常。')
    return true
    
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error.message)
    return false
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseConnection().then(success => {
    process.exit(success ? 0 : 1)
  })
}

export { testDatabaseConnection }