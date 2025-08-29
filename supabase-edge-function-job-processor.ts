// =====================================================
// Supabase Edge Function: Job Processor
// 路径: supabase/functions/job-processor/index.ts
// 功能: 处理异步任务队列，管理AI分析任务
// =====================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { batch_size = 10, cleanup = true } = await req.json()

    console.log('开始处理任务队列...')

    // Step 1: Create AI analysis jobs for new articles
    const { data: newArticles, error: articlesError } = await supabase
      .from('articles')
      .select('id')
      .eq('overall_status', 'draft')
      .is('ai_score', null)
      .limit(batch_size)

    if (articlesError) {
      throw new Error(`查询新文章失败: ${articlesError.message}`)
    }

    let jobsCreated = 0

    // Create analysis jobs for new articles
    for (const article of newArticles || []) {
      // Check if job already exists
      const { data: existingJob } = await supabase
        .from('processing_jobs')
        .select('id')
        .eq('article_id', article.id)
        .eq('job_type', 'ai_analyze')
        .in('status', ['pending', 'running'])
        .single()

      if (!existingJob) {
        const { error: jobError } = await supabase
          .from('processing_jobs')
          .insert({
            article_id: article.id,
            job_type: 'ai_analyze',
            job_data: { batch_process: true },
            status: 'pending',
            priority: 5,
            max_attempts: 3,
            retry_delay_seconds: 300 // 5 minutes
          })

        if (!jobError) {
          jobsCreated++
        }
      }
    }

    // Step 2: Process pending jobs
    const { data: pendingJobs, error: jobsError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(batch_size)

    if (jobsError) {
      throw new Error(`查询待处理任务失败: ${jobsError.message}`)
    }

    let jobsProcessed = 0
    let jobsSucceeded = 0
    let jobsFailed = 0
    const results = []

    for (const job of pendingJobs || []) {
      try {
        // Mark job as running
        await supabase
          .from('processing_jobs')
          .update({
            status: 'running',
            started_at: new Date().toISOString(),
            attempt_count: (job.attempt_count || 0) + 1
          })
          .eq('id', job.id)

        // Process different job types
        let jobResult = null
        if (job.job_type === 'ai_analyze') {
          jobResult = await processAIAnalysis(supabaseUrl, supabaseKey, job.article_id)
        }

        // Mark job as completed
        await supabase
          .from('processing_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result_data: jobResult
          })
          .eq('id', job.id)

        jobsProcessed++
        jobsSucceeded++
        
        results.push({
          job_id: job.id,
          job_type: job.job_type,
          article_id: job.article_id,
          status: 'success'
        })

      } catch (error) {
        console.error(`任务处理失败 ${job.id}:`, error)
        
        const shouldRetry = job.attempt_count < job.max_attempts
        const nextRetryAt = shouldRetry 
          ? new Date(Date.now() + (job.retry_delay_seconds * 1000)).toISOString()
          : null

        await supabase
          .from('processing_jobs')
          .update({
            status: shouldRetry ? 'retrying' : 'failed',
            error_message: error.message,
            error_details: { 
              error: error.message,
              timestamp: new Date().toISOString(),
              attempt: job.attempt_count + 1
            },
            next_retry_at: nextRetryAt,
            completed_at: shouldRetry ? null : new Date().toISOString()
          })
          .eq('id', job.id)

        jobsProcessed++
        if (!shouldRetry) jobsFailed++

        results.push({
          job_id: job.id,
          job_type: job.job_type,
          article_id: job.article_id,
          status: shouldRetry ? 'retry_scheduled' : 'failed',
          error: error.message
        })
      }
    }

    // Step 3: Handle retry jobs
    const { data: retryJobs } = await supabase
      .from('processing_jobs')
      .select('id')
      .eq('status', 'retrying')
      .lte('next_retry_at', new Date().toISOString())

    for (const retryJob of retryJobs || []) {
      await supabase
        .from('processing_jobs')
        .update({ status: 'pending' })
        .eq('id', retryJob.id)
    }

    // Step 4: Cleanup old completed jobs (if requested)
    let cleanedUp = 0
    if (cleanup) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 7) // Keep 7 days

      const { data: oldJobs } = await supabase
        .from('processing_jobs')
        .delete()
        .in('status', ['completed', 'failed'])
        .lt('completed_at', cutoffDate.toISOString())

      cleanedUp = oldJobs?.length || 0
    }

    const response = {
      success: true,
      message: 'Job processing completed',
      timestamp: new Date().toISOString(),
      statistics: {
        jobs_created: jobsCreated,
        jobs_processed: jobsProcessed,
        jobs_succeeded: jobsSucceeded,
        jobs_failed: jobsFailed,
        jobs_cleaned_up: cleanedUp
      },
      results
    }

    console.log('任务处理完成:', response)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Job processing failed:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Process AI analysis job by calling the ai-analyze function
async function processAIAnalysis(supabaseUrl: string, serviceKey: string, articleId: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/ai-analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      article_id: articleId
    })
  })

  if (!response.ok) {
    throw new Error(`AI analysis failed: ${response.status}`)
  }

  return await response.json()
}