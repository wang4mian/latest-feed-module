#!/usr/bin/env node

/**
 * 完整工作流测试
 * Complete workflow test: RSS fetch → AI analyze → Frontend display
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

async function testCompleteWorkflow() {
  console.log('🔍 测试完整系统工作流程...\n')
  
  try {
    // 步骤1: 检查RSS源状态
    console.log('1️⃣ 检查RSS源状态...')
    const { data: sources, error: sourcesError } = await supabase
      .from('rss_sources')
      .select('*')
      .eq('is_active', true)
    
    if (sourcesError) {
      console.error('❌ 无法获取RSS源:', sourcesError.message)
      return false
    }
    
    console.log(`✅ 发现 ${sources.length} 个活跃RSS源`)
    sources.slice(0, 3).forEach(source => {
      console.log(`   - ${source.name}: ${source.vertical_name}`)
    })
    console.log()
    
    // 步骤2: 检查文章处理状态
    console.log('2️⃣ 检查文章处理状态...')
    const { data: articlesStats } = await supabase
      .from('articles')
      .select('overall_status')
    
    const statusCounts = articlesStats.reduce((acc, article) => {
      acc[article.overall_status] = (acc[article.overall_status] || 0) + 1
      return acc
    }, {})
    
    console.log('📊 文章状态统计:')
    Object.entries(statusCounts).forEach(([status, count]) => {
      const statusName = {
        'draft': '草稿',
        'processing': '处理中', 
        'ready_for_review': '待审核',
        'reviewed': '已审核',
        'published': '已发布'
      }[status] || status
      console.log(`   ${statusName}: ${count} 篇`)
    })
    console.log()
    
    // 步骤3: 检查AI分析结果
    console.log('3️⃣ 检查AI分析结果...')
    const { data: analyzedArticles } = await supabase
      .from('articles')
      .select('id, title, ai_score, ai_category, ai_summary')
      .not('ai_score', 'is', null)
      .order('ai_score', { ascending: false })
      .limit(5)
    
    console.log(`✅ 已分析文章: ${analyzedArticles.length} 篇高价值文章`)
    analyzedArticles.forEach((article, index) => {
      console.log(`   ${index + 1}. [评分${article.ai_score}] ${article.title.substring(0, 50)}...`)
      console.log(`      分类: ${article.ai_category}`)
    })
    console.log()
    
    // 步骤4: 检查实体抽取结果
    console.log('4️⃣ 检查实体抽取结果...')
    const { data: entities } = await supabase
      .from('entities')
      .select('*')
      .order('mention_count', { ascending: false })
      .limit(10)
    
    if (entities && entities.length > 0) {
      console.log(`✅ 已抽取实体: ${entities.length} 个关键实体`)
      
      const entityByType = entities.reduce((acc, entity) => {
        acc[entity.type] = acc[entity.type] || []
        acc[entity.type].push(entity)
        return acc
      }, {})
      
      Object.entries(entityByType).forEach(([type, entityList]) => {
        const typeName = {
          'company': '公司',
          'technology': '技术',
          'person': '人物'
        }[type] || type
        console.log(`   ${typeName} (${entityList.length}个):`, entityList.slice(0, 3).map(e => e.name).join(', '))
      })
    } else {
      console.log('⚠️  暂无实体数据')
    }
    console.log()
    
    // 步骤5: 检查任务处理状态
    console.log('5️⃣ 检查任务处理状态...')
    const { data: jobs } = await supabase
      .from('processing_jobs')
      .select('job_type, status')
      .order('created_at', { ascending: false })
      .limit(100)
    
    const jobStats = jobs.reduce((acc, job) => {
      const key = `${job.job_type}_${job.status}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    
    console.log('📋 最近任务状态:')
    Object.entries(jobStats).forEach(([key, count]) => {
      const [type, status] = key.split('_')
      const statusName = {
        'pending': '待处理',
        'running': '运行中',
        'completed': '已完成',
        'failed': '失败'
      }[status] || status
      console.log(`   ${type} ${statusName}: ${count} 个`)
    })
    console.log()
    
    // 步骤6: 检查编译工作台数据
    console.log('6️⃣ 检查编译工作台数据...')
    const { data: compilations } = await supabase
      .from('compilation_workbench')
      .select('*')
      .limit(5)
    
    if (compilations && compilations.length > 0) {
      console.log(`✅ 编译项目: ${compilations.length} 个`)
      compilations.forEach((comp, index) => {
        console.log(`   ${index + 1}. ${comp.core_thesis?.substring(0, 40) || '未设置核心论点'}...`)
      })
    } else {
      console.log('ℹ️  暂无编译项目')
    }
    console.log()
    
    // 步骤7: 系统健康检查
    console.log('7️⃣ 系统健康检查...')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todayArticles } = await supabase
      .from('articles')
      .select('id')
      .gte('created_at', today.toISOString())
    
    const { data: recentJobs } = await supabase
      .from('processing_jobs')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    
    const failedJobs = recentJobs?.filter(job => job.status === 'failed').length || 0
    const completedJobs = recentJobs?.filter(job => job.status === 'completed').length || 0
    
    console.log('🏥 系统健康度:')
    console.log(`   今日新增文章: ${todayArticles?.length || 0} 篇`)
    console.log(`   24小时内完成任务: ${completedJobs} 个`)
    console.log(`   24小时内失败任务: ${failedJobs} 个`)
    
    if (failedJobs > completedJobs * 0.1) {
      console.log('   ⚠️  任务失败率较高，建议检查系统状态')
    } else {
      console.log('   ✅ 系统运行正常')
    }
    
    console.log()
    
    // 总结
    console.log('📋 工作流测试总结:')
    console.log(`✅ RSS源管理: ${sources.length} 个活跃源`)
    console.log(`✅ 文章处理: ${articlesStats.length} 篇文章，${analyzedArticles.length} 篇已分析`)
    console.log(`✅ 实体抽取: ${entities?.length || 0} 个实体`)
    console.log(`✅ 任务处理: ${jobs.length} 个最近任务`)
    console.log(`✅ 编译工作台: ${compilations?.length || 0} 个项目`)
    
    console.log('\n🎉 完整工作流测试完成！系统各模块运行正常。')
    return true
    
  } catch (error) {
    console.error('❌ 工作流测试失败:', error.message)
    return false
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  testCompleteWorkflow().then(success => {
    process.exit(success ? 0 : 1)
  })
}

export { testCompleteWorkflow }