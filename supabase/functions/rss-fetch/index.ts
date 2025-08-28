// =====================================================
// Supabase Edge Function: rss-fetch (调试版本)
// 功能: 抓取RSS源并存储文章到数据库 
// 路径: supabase/functions/rss-fetch/index.ts
// =====================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// 环境变量验证
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const cronSecret = Deno.env.get('CRON_SECRET')

console.log('环境变量检查:', {
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
interface RSSSource {
  id: number
  name: string
  url: string
  vertical_name: string
  topic_for_ai: string
  is_active: boolean
  fetch_count?: number
  success_count?: number
  error_count?: number
}

interface RSSItem {
  title?: string
  link?: string
  description?: string
  author?: string
  pubDate?: string
  guid?: string
}

interface ProcessedArticle {
  source_id: number
  guid?: string
  normalized_url: string
  title_hash: string
  title: string
  link: string
  description?: string
  author?: string
  pub_date?: Date
  overall_status: string
}

// URL标准化函数
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    
    // 移除跟踪参数
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'fbclid', 'gclid', 'ref', 'source', '_hsenc', 'ncid'
    ]
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param)
    })
    
    // 移除片段标识符
    urlObj.hash = ''
    
    return urlObj.toString().toLowerCase()
  } catch (error) {
    console.error('URL normalization error:', error)
    return url.toLowerCase()
  }
}

// 生成标题哈希
async function generateTitleHash(title: string): Promise<string> {
  const normalized = title.trim().toLowerCase()
  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
}

// 简单的RSS解析器（使用正则表达式）
async function parseRSSFeed(url: string): Promise<{ items: RSSItem[] }> {
  try {
    console.log(`正在获取RSS: ${url}`)
    
    // 使用fetch获取RSS内容
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Manufacturing-Intelligence-Bot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const xmlText = await response.text()
    console.log(`RSS内容长度: ${xmlText.length} 字符`)
    
    // 使用正则表达式提取item
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const items: RSSItem[] = []
    let match
    
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1]
      
      try {
        // 简化的标签提取
        const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
        const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i)
        const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i)
        const guidMatch = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)
        const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)
        
        const title = titleMatch?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim()
        const link = linkMatch?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim()
        
        if (title && link) {
          items.push({
            title,
            link,
            description: descMatch?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim() || '',
            author: '',
            pubDate: pubDateMatch?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() || '',
            guid: guidMatch?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() || ''
          })
        }
      } catch (itemError) {
        console.error('解析单个RSS项目错误:', itemError)
      }
    }
    
    console.log(`解析完成，提取到 ${items.length} 个有效项目`)
    return { items }
    
  } catch (error) {
    console.error('RSS解析错误:', error)
    throw error
  }
}

// 三层防重复检测
async function checkDuplicate(article: ProcessedArticle): Promise<string | null> {
  try {
    // 第一层：GUID检测（最可靠）
    if (article.guid && article.guid.trim() !== '') {
      const result = await supabase
        .from('articles')
        .select('id')
        .eq('source_id', article.source_id)
        .eq('guid', article.guid.trim())
        .limit(1)
      
      if (result.error) {
        console.error('GUID duplicate check error:', result.error)
      } else if (result.data && result.data.length > 0) {
        return `duplicate_guid:${result.data[0].id}`
      }
    }
    
    // 第二层：标准化URL检测
    if (article.normalized_url && article.normalized_url.trim() !== '') {
      const result = await supabase
        .from('articles')
        .select('id')
        .eq('source_id', article.source_id)
        .eq('normalized_url', article.normalized_url)
        .limit(1)
      
      if (result.error) {
        console.error('URL duplicate check error:', result.error)
      } else if (result.data && result.data.length > 0) {
        return `duplicate_url:${result.data[0].id}`
      }
    }
    
    // 第三层：标题哈希检测（兜底）
    if (article.title_hash && article.title_hash.trim() !== '') {
      const result = await supabase
        .from('articles')
        .select('id')
        .eq('source_id', article.source_id)
        .eq('title_hash', article.title_hash)
        .limit(1)
      
      if (result.error) {
        console.error('Title hash duplicate check error:', result.error)
      } else if (result.data && result.data.length > 0) {
        return `duplicate_title:${result.data[0].id}`
      }
    }
    
    return null // 未发现重复
  } catch (error) {
    console.error('Duplicate check error:', error)
    return null
  }
}

// 插入文章并创建处理任务
async function insertArticleWithJobs(article: ProcessedArticle): Promise<string | null> {
  try {
    console.log('准备插入文章:', article.title)
    
    // 插入文章
    const insertResult = await supabase
      .from('articles')
      .insert([article])
      .select('id')
      .single()
    
    if (insertResult.error) {
      console.error('Article insert error:', insertResult.error)
      return null
    }
    
    if (!insertResult.data || !insertResult.data.id) {
      console.error('No article ID returned')
      return null
    }
    
    const articleId = insertResult.data.id
    console.log('文章插入成功，ID:', articleId)
    
    // 创建处理任务链
    const jobs = [
      {
        article_id: articleId,
        job_type: 'crawl_content',
        priority: 2,
        job_data: { url: article.link },
        status: 'pending'
      },
      {
        article_id: articleId,
        job_type: 'ai_analyze',
        priority: 3,
        job_data: { depends_on: 'crawl_content' },
        status: 'pending'
      },
      {
        article_id: articleId,
        job_type: 'extract_entities',
        priority: 4,
        job_data: { depends_on: 'ai_analyze' },
        status: 'pending'
      }
    ]
    
    const jobResult = await supabase
      .from('processing_jobs')
      .insert(jobs)
    
    if (jobResult.error) {
      console.error('Jobs creation error:', jobResult.error)
    } else {
      console.log('处理任务创建成功')
    }
    
    return articleId
  } catch (error) {
    console.error('Insert article with jobs error:', error)
    return null
  }
}

// 处理单个RSS源
async function processSingleSource(source: RSSSource): Promise<{
  success: boolean
  articlesProcessed: number
  newArticles: number
  duplicates: number
  errors: string[]
}> {
  const result = {
    success: false,
    articlesProcessed: 0,
    newArticles: 0,
    duplicates: 0,
    errors: [] as string[]
  }
  
  try {
    console.log(`开始处理RSS源: ${source.name} (${source.url})`)
    
    // 解析RSS feed
    const feed = await parseRSSFeed(source.url)
    
    if (!feed.items || feed.items.length === 0) {
      result.errors.push('RSS feed为空或无有效文章')
      return result
    }
    
    console.log(`RSS解析成功，找到 ${feed.items.length} 篇文章`)
    
    // 处理每篇文章（限制处理数量避免超时）
    const itemsToProcess = feed.items.slice(0, 5) // 只处理前5篇，避免超时
    
    for (const item of itemsToProcess) {
      try {
        result.articlesProcessed++
        
        // 验证必需字段
        if (!item.title || !item.link) {
          result.errors.push(`文章缺少标题或链接: ${item.title || 'Unknown'}`)
          continue
        }
        
        // 构建文章对象
        const processedArticle: ProcessedArticle = {
          source_id: source.id,
          guid: item.guid || undefined,
          normalized_url: normalizeUrl(item.link),
          title_hash: await generateTitleHash(item.title),
          title: item.title,
          link: item.link,
          description: item.description || undefined,
          author: item.author || undefined,
          pub_date: item.pubDate ? new Date(item.pubDate) : undefined,
          overall_status: 'draft'
        }
        
        // 检查重复
        const duplicateCheck = await checkDuplicate(processedArticle)
        if (duplicateCheck) {
          result.duplicates++
          console.log(`发现重复文章: ${item.title} (${duplicateCheck})`)
          continue
        }
        
        // 插入新文章
        const articleId = await insertArticleWithJobs(processedArticle)
        if (articleId) {
          result.newArticles++
          console.log(`新文章已插入: ${item.title} (ID: ${articleId})`)
        } else {
          result.errors.push(`文章插入失败: ${item.title}`)
        }
        
      } catch (itemError) {
        result.errors.push(`处理文章时出错: ${itemError}`)
        console.error('Item processing error:', itemError)
      }
    }
    
    result.success = true
    
    // 更新RSS源统计
    const updateResult = await supabase
      .from('rss_sources')
      .update({
        last_fetch_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        fetch_count: (source.fetch_count || 0) + 1,
        success_count: (source.success_count || 0) + 1,
        error_count: 0,
        last_error: null
      })
      .eq('id', source.id)
    
    if (updateResult.error) {
      console.error('RSS源统计更新失败:', updateResult.error)
    }
    
  } catch (error) {
    result.errors.push(`RSS源处理失败: ${error}`)
    console.error(`RSS source processing error for ${source.name}:`, error)
    
    // 更新RSS源错误统计
    const updateResult = await supabase
      .from('rss_sources')
      .update({
        last_fetch_at: new Date().toISOString(),
        fetch_count: (source.fetch_count || 0) + 1,
        error_count: (source.error_count || 0) + 1,
        last_error: error.toString()
      })
      .eq('id', source.id)
    
    if (updateResult.error) {
      console.error('RSS源错误统计更新失败:', updateResult.error)
    }
  }
  
  return result
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
    console.log('收到请求，方法:', req.method)
    
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
      console.log('请求参数:', requestBody)
    } catch (parseError) {
      console.log('JSON解析失败，使用默认参数')
    }
    
    const { 
      test_mode = false, 
      source_limit = null,
      cron_secret = null 
    } = requestBody as any
    
    // Cron任务验证
    if (cron_secret && cronSecret && cron_secret !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Invalid cron secret' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    console.log(`RSS抓取任务开始 - 测试模式: ${test_mode}, 源限制: ${source_limit}`)
    
    // 获取活跃的RSS源
    let query = supabase
      .from('rss_sources')
      .select('*')
      .eq('is_active', true)
      .order('last_fetch_at', { ascending: true, nullsFirst: true })
    
    if (source_limit && source_limit > 0) {
      query = query.limit(source_limit)
    }
    
    const sourcesResult = await query
    
    if (sourcesResult.error) {
      throw new Error(`获取RSS源失败: ${sourcesResult.error.message}`)
    }
    
    if (!sourcesResult.data || sourcesResult.data.length === 0) {
      return new Response(JSON.stringify({ 
        message: '没有找到活跃的RSS源',
        sources_processed: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    console.log(`找到 ${sourcesResult.data.length} 个活跃RSS源`)
    
    // 处理统计
    const stats = {
      sources_processed: 0,
      total_articles_found: 0,
      new_articles_created: 0,
      duplicates_skipped: 0,
      errors: [] as string[]
    }
    
    // 处理每个RSS源
    for (const source of sourcesResult.data) {
      const sourceResult = await processSingleSource(source)
      
      stats.sources_processed++
      stats.total_articles_found += sourceResult.articlesProcessed
      stats.new_articles_created += sourceResult.newArticles
      stats.duplicates_skipped += sourceResult.duplicates
      stats.errors.push(...sourceResult.errors)
      
      // 测试模式下只处理少量源
      if (test_mode && stats.sources_processed >= 1) { // 只处理1个源进行调试
        console.log('测试模式限制，停止处理更多源')
        break
      }
    }
    
    // 生成响应
    const response = {
      success: true,
      message: 'RSS抓取任务完成',
      timestamp: new Date().toISOString(),
      statistics: stats,
      test_mode
    }
    
    console.log('RSS抓取任务完成:', response)
    
    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
    
  } catch (error) {
    console.error('RSS fetch function error:', error)
    
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