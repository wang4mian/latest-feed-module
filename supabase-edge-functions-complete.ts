// =====================================================
// Supabase Edge Functions - 完整脚本集合
// 制造业情报系统 - 后端核心函数
// 更新时间: 2025-08-28
// =====================================================

// =====================================================
// 1. RSS 抓取 Edge Function
// 路径: supabase/functions/rss-fetch/index.ts
// 功能: 抓取RSS源并存储文章到数据库
// =====================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RSSItem {
  title: string
  link: string
  description?: string
  pubDate?: string
  guid?: string
}

interface RSSSource {
  id: number
  name: string
  url: string
  vertical_name: string
  topic_for_ai: string
  is_active: boolean
  fetch_count: number
  success_count: number
  error_count: number
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('开始RSS抓取任务...')

    // 1. 获取所有活跃的RSS源
    const { data: sources, error: sourcesError } = await supabase
      .from('rss_sources')
      .select('*')
      .eq('is_active', true)

    if (sourcesError) {
      throw new Error(`获取RSS源失败: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No active RSS sources found',
        processed: 0,
        new_articles: 0,
        sources_checked: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let totalProcessed = 0
    let totalNewArticles = 0
    const results = []

    // 2. 处理每个RSS源
    for (const source of sources as RSSSource[]) {
      try {
        console.log(`处理RSS源: ${source.name} (${source.url})`)
        
        // 抓取RSS内容
        const rssResponse = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RSS-Bot/1.0)'
          }
        })
        
        if (!rssResponse.ok) {
          throw new Error(`RSS源响应错误: ${rssResponse.status}`)
        }

        const rssText = await rssResponse.text()
        const rssItems = parseRSS(rssText)
        
        let newCount = 0
        
        // 3. 处理每个RSS条目
        for (const item of rssItems) {
          const articleData = {
            source_id: source.id,
            title: item.title,
            link: item.link,
            description: item.description || '',
            pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            guid: item.guid || null,
            normalized_url: normalizeUrl(item.link),
            title_hash: await hashString(item.title),
            overall_status: 'draft' as const
          }

          // 检查重复（使用三层策略）
          const isDuplicate = await checkDuplicate(supabase, articleData, source.id)
          
          if (!isDuplicate) {
            // 插入新文章
            const { error: insertError } = await supabase
              .from('articles')
              .insert(articleData)
            
            if (!insertError) {
              newCount++
              console.log(`新增文章: ${item.title}`)
            } else {
              console.error(`插入文章失败: ${insertError.message}`)
            }
          }
        }

        // 更新RSS源统计
        await supabase
          .from('rss_sources')
          .update({
            last_fetch_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            fetch_count: (source.fetch_count || 0) + 1,
            success_count: (source.success_count || 0) + 1,
            error_count: 0
          })
          .eq('id', source.id)

        totalProcessed++
        totalNewArticles += newCount
        
        results.push({
          source: source.name,
          items_found: rssItems.length,
          new_articles: newCount
        })

      } catch (error) {
        console.error(`处理RSS源 ${source.name} 失败:`, error)
        
        // 更新错误统计
        await supabase
          .from('rss_sources')
          .update({
            last_fetch_at: new Date().toISOString(),
            error_count: (source.error_count || 0) + 1,
            last_error: error.message
          })
          .eq('id', source.id)
      }
    }

    const response = {
      success: true,
      message: 'RSS fetch completed',
      timestamp: new Date().toISOString(),
      processed: totalProcessed,
      new_articles: totalNewArticles,
      sources_checked: sources.length,
      results
    }

    console.log('RSS抓取完成:', response)
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('RSS抓取失败:', error)
    
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

// 辅助函数
function parseRSS(xmlText: string): RSSItem[] {
  const items: RSSItem[] = []
  
  try {
    // 简单的XML解析
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const matches = xmlText.match(itemRegex)
    
    if (matches) {
      for (const match of matches.slice(0, 20)) { // 限制每次处理20条
        const title = extractTag(match, 'title')
        const link = extractTag(match, 'link')
        const description = extractTag(match, 'description')
        const pubDate = extractTag(match, 'pubDate')
        const guid = extractTag(match, 'guid')
        
        if (title && link) {
          items.push({
            title: cleanText(title),
            link: link.trim(),
            description: description ? cleanText(description) : undefined,
            pubDate: pubDate?.trim(),
            guid: guid?.trim()
          })
        }
      }
    }
  } catch (error) {
    console.error('RSS解析失败:', error)
  }
  
  return items
}

function extractTag(text: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i')
  const match = text.match(regex)
  return match ? match[1] : undefined
}

function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    urlObj.hash = ''
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid']
    trackingParams.forEach(param => urlObj.searchParams.delete(param))
    return urlObj.toString().toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

async function hashString(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function checkDuplicate(supabase: any, article: any, sourceId: number): Promise<boolean> {
  // 第一层：GUID检测
  if (article.guid) {
    const { data } = await supabase
      .from('articles')
      .select('id')
      .eq('source_id', sourceId)
      .eq('guid', article.guid)
      .limit(1)
    
    if (data && data.length > 0) return true
  }
  
  // 第二层：标准化URL检测
  if (article.normalized_url) {
    const { data } = await supabase
      .from('articles')
      .select('id')
      .eq('source_id', sourceId)
      .eq('normalized_url', article.normalized_url)
      .limit(1)
    
    if (data && data.length > 0) return true
  }
  
  // 第三层：标题哈希检测
  if (article.title_hash) {
    const { data } = await supabase
      .from('articles')
      .select('id')
      .eq('source_id', sourceId)
      .eq('title_hash', article.title_hash)
      .limit(1)
    
    if (data && data.length > 0) return true
  }
  
  return false
}

// =====================================================
// 2. Supabase Cron Jobs 设置脚本
// 在 Supabase SQL Editor 中执行
// =====================================================

/*
-- 启用 pg_cron 扩展（如果还没启用）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每2小时执行RSS抓取
SELECT cron.schedule(
  'rss-fetch-job',
  '0 */2 * * *',  -- 每2小时的整点执行
  $$
  SELECT net.http_post(
    url := 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/rss-fetch',
    body := '{"source_limit": null, "test_mode": false}',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- 每15分钟处理任务队列
SELECT cron.schedule(
  'job-processor',
  '*/15 * * * *',  -- 每15分钟执行
  $$
  SELECT net.http_post(
    url := 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/job-processor',
    body := '{"batch_size": 10, "cleanup": true}',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- 查看已设置的定时任务
SELECT * FROM cron.job;

-- 查看任务执行历史
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- 删除定时任务（如果需要）
-- SELECT cron.unschedule('rss-fetch-job');
-- SELECT cron.unschedule('job-processor');
*/

// =====================================================
// 3. 手动触发命令
// 用于测试和紧急更新
// =====================================================

/*
# 手动触发RSS抓取
curl -X POST 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/rss-fetch' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0' \
  -H 'Content-Type: application/json' \
  -d '{"test_mode": false, "source_limit": null}'

# 手动触发任务处理
curl -X POST 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/job-processor' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0' \
  -H 'Content-Type: application/json' \
  -d '{"batch_size": 10, "cleanup": true}'
*/

// =====================================================
// 4. 使用说明
// =====================================================

/*
## 部署步骤

1. **创建 RSS 抓取函数**:
   - 在 Supabase Dashboard 进入 Edge Functions
   - 创建新函数 'rss-fetch'
   - 复制上面的 RSS 抓取代码到函数编辑器
   - 点击 Deploy

2. **设置定时任务**:
   - 在 Supabase SQL Editor 中执行上面的 Cron Jobs 设置脚本
   - 记得替换 YOUR_SERVICE_ROLE_KEY 为实际的 service role key

3. **测试验证**:
   - 使用手动触发命令测试功能
   - 查看 Supabase 日志确认运行正常
   - 检查数据库是否有新数据

## 环境变量

确保在 Supabase 项目中设置了以下环境变量:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY  
- CRON_SECRET (可选)

## 监控

- 查看 Supabase Edge Functions 日志
- 检查 cron.job_run_details 表的执行历史
- 监控 rss_sources 表的统计数据
*/