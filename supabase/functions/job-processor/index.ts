// =====================================================
// Supabase Edge Function: job-processor
// 功能: 处理任务队列中的各种异步任务
// 路径: supabase/functions/job-processor/index.ts
// =====================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// 环境变量验证
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const cronSecret = Deno.env.get('CRON_SECRET')

console.log('Job Processor - 环境变量检查:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  hasCronSecret: !!cronSecret
})

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables')
}

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 接口类型定义
interface ProcessingJob {
  id: number
  article_id: number
  job_type: string
  priority: number
  status: string
  job_data?: any
  attempt_count: number
  max_attempts: number
  created_at: string
  started_at?: string
  completed_at?: string
  error_message?: string
}

interface JobResult {
  success: boolean
  message?: string
  error?: string
  data?: any
}

// 任务类型处理器映射
const JOB_HANDLERS: Record<string, (job: ProcessingJob) => Promise<JobResult>> = {
  'crawl_content': handleCrawlContentJob,
  'ai_analyze': handleAIAnalyzeJob,
  'extract_entities': handleExtractEntitiesJob
}

// 处理内容抓取任务
async function handleCrawlContentJob(job: ProcessingJob): Promise<JobResult> {
  try {
    console.log(`处理内容抓取任务: ${job.id}`)
    
    // 获取文章URL
    const { data: article } = await supabase
      .from('articles')
      .select('link')
      .eq('id', job.article_id)
      .single()
    
    if (!article) {
      return { success: false, error: '文章不存在' }
    }
    
    // 调用AI分析Edge Function来处理（它包含了内容抓取）
    const aiAnalyzeUrl = `${supabaseUrl}/functions/v1/ai-analyze`
    
    const response = await fetch(aiAnalyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        article_id: job.article_id,
        test_mode: false
      })
    })
    
    if (!response.ok) {
      return { 
        success: false, 
        error: `AI分析调用失败: ${response.status} ${response.statusText}` 
      }
    }
    
    const result = await response.json()
    
    if (!result.success) {
      return { success: false, error: result.error }
    }
    
    return {
      success: true,
      message: `文章 ${job.article_id} 内容抓取和分析完成`,
      data: {
        crawl_success: result.crawl_success,
        analysis_success: result.analysis_success,
        relevance_score: result.relevance_score
      }
    }
    
  } catch (error) {
    console.error('内容抓取任务失败:', error)
    return { success: false, error: error.message }
  }
}

// 处理AI分析任务（已整合到crawl_content中）
async function handleAIAnalyzeJob(job: ProcessingJob): Promise<JobResult> {
  console.log(`AI分析任务 ${job.id} 已整合到内容抓取流程中`)
  return {
    success: true,
    message: '已整合到内容抓取流程',
    data: { skipped: true }
  }
}

// 处理实体抽取任务（已整合到AI分析中）
async function handleExtractEntitiesJob(job: ProcessingJob): Promise<JobResult> {
  console.log(`实体抽取任务 ${job.id} 已整合到AI分析流程中`)
  return {
    success: true,
    message: '已整合到AI分析流程',
    data: { skipped: true }
  }
}

// 更新任务状态
async function updateJobStatus(
  jobId: number, 
  status: string, 
  result?: JobResult
): Promise<boolean> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }
    
    if (status === 'running') {
      updateData.started_at = new Date().toISOString()
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
      if (result?.data) {
        updateData.result_data = result.data
      }
    } else if (status === 'failed') {
      updateData.error_message = result?.error || 'Unknown error'
    }
    
    const { error } = await supabase
      .from('processing_jobs')
      .update(updateData)
      .eq('id', jobId)
    
    if (error) {
      console.error('更新任务状态失败:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('更新任务状态异常:', error)
    return false
  }
}

// 处理单个任务
async function processJob(job: ProcessingJob): Promise<void> {
  console.log(`开始处理任务: ${job.id} (类型: ${job.job_type})`)
  
  // 更新状态为运行中
  await updateJobStatus(job.id, 'running')
  
  try {
    // 获取对应的处理器
    const handler = JOB_HANDLERS[job.job_type]
    if (!handler) {
      throw new Error(`未知任务类型: ${job.job_type}`)
    }
    
    // 执行任务
    const result = await handler(job)
    
    if (result.success) {
      console.log(`任务 ${job.id} 执行成功:`, result.message)
      await updateJobStatus(job.id, 'completed', result)
    } else {
      console.error(`任务 ${job.id} 执行失败:`, result.error)
      
      // 检查是否需要重试
      if (job.attempt_count < job.max_attempts) {
        await supabase
          .from('processing_jobs')
          .update({ 
            attempt_count: job.attempt_count + 1,
            status: 'pending',
            error_message: result.error,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)
        
        console.log(`任务 ${job.id} 将重试，当前重试次数: ${job.attempt_count + 1}`)
      } else {
        await updateJobStatus(job.id, 'failed', result)
      }
    }
    
  } catch (error) {
    console.error(`任务 ${job.id} 处理异常:`, error)
    
    const result: JobResult = {
      success: false,
      error: error.message
    }
    
    // 检查是否需要重试
    if (job.attempt_count < job.max_attempts) {
      await supabase
        .from('processing_jobs')
        .update({ 
          attempt_count: job.attempt_count + 1,
          status: 'pending',
          error_message: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
    } else {
      await updateJobStatus(job.id, 'failed', result)
    }
  }
}

// 获取待处理任务
async function getPendingJobs(limit: number = 5): Promise<ProcessingJob[]> {
  try {
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false }) // 优先级高的先处理
      .order('created_at', { ascending: true }) // 同优先级按创建时间排序
      .limit(limit)
    
    if (error) {
      console.error('获取待处理任务失败:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('获取待处理任务异常:', error)
    return []
  }
}

// 清理过期任务
async function cleanupOldJobs(): Promise<void> {
  try {
    // 删除7天前已完成的任务
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { error } = await supabase
      .from('processing_jobs')
      .delete()
      .eq('status', 'completed')
      .lt('completed_at', sevenDaysAgo.toISOString())
    
    if (error) {
      console.error('清理旧任务失败:', error)
    } else {
      console.log('已清理7天前的完成任务')
    }
  } catch (error) {
    console.error('清理旧任务异常:', error)
  }
}

// 主处理函数
serve(async (req: Request) => {
  // CORS处理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }
  
  try {
    console.log('任务处理器开始工作...')
    
    // 验证请求方法
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 获取请求参数
    let requestBody = {}
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.log('JSON解析失败，使用默认参数')
    }
    
    const { 
      batch_size = 5,
      cron_secret = null,
      cleanup = false
    } = requestBody as any
    
    // Cron任务验证
    if (cron_secret && cronSecret && cron_secret !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Invalid cron secret' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    console.log(`任务处理批次大小: ${batch_size}`)
    
    // 清理旧任务（可选）
    if (cleanup) {
      await cleanupOldJobs()
    }
    
    // 获取待处理任务
    const pendingJobs = await getPendingJobs(batch_size)
    
    if (pendingJobs.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: '没有待处理任务',
        jobs_processed: 0,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    console.log(`找到 ${pendingJobs.length} 个待处理任务`)
    
    // 处理统计
    const stats = {
      total_jobs: pendingJobs.length,
      jobs_processed: 0,
      jobs_succeeded: 0,
      jobs_failed: 0,
      jobs_retried: 0
    }
    
    // 并行处理多个任务（限制并发数量）
    const processingPromises = pendingJobs.map(async (job) => {
      try {
        await processJob(job)
        stats.jobs_processed++
        
        // 查询最终状态
        const { data: finalJob } = await supabase
          .from('processing_jobs')
          .select('status')
          .eq('id', job.id)
          .single()
        
        if (finalJob?.status === 'completed') {
          stats.jobs_succeeded++
        } else if (finalJob?.status === 'failed') {
          stats.jobs_failed++
        } else if (finalJob?.status === 'pending') {
          stats.jobs_retried++
        }
        
      } catch (error) {
        console.error(`处理任务 ${job.id} 时出错:`, error)
        stats.jobs_failed++
      }
    })
    
    // 等待所有任务完成（设置超时以防止Edge Function超时）
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('处理超时')), 50000) // 50秒超时
    )
    
    try {
      await Promise.race([
        Promise.all(processingPromises),
        timeout
      ])
    } catch (error) {
      if (error.message === '处理超时') {
        console.warn('任务处理超时，但部分任务可能已完成')
      } else {
        throw error
      }
    }
    
    // 返回结果
    const response = {
      success: true,
      message: '任务处理批次完成',
      statistics: stats,
      timestamp: new Date().toISOString()
    }
    
    console.log('任务处理完成:', response)
    
    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
    
  } catch (error) {
    console.error('任务处理器失败:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})