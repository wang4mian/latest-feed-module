// =====================================================
// Supabase Edge Function: ai-analyze
// 功能: 抓取文章全文内容并使用Gemini AI进行智能分析
// 路径: supabase/functions/ai-analyze/index.ts
// =====================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// 环境变量验证
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash'
const jinaApiKey = Deno.env.get('JINA_API_KEY')

console.log('AI Analyze Function - 环境变量检查:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  hasGeminiKey: !!geminiApiKey,
  geminiModel: geminiModel,
  hasJinaKey: !!jinaApiKey
})

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
  throw new Error('Missing required environment variables')
}

if (!jinaApiKey) {
  console.warn('Jina AI not configured - will rely on enhanced fallback extraction')
}

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 接口类型定义
interface Article {
  id: string  // UUID类型
  title: string
  link: string
  description?: string
  source_id: number
  overall_status: string
}

interface RSSSource {
  id: number
  name: string
  topic_for_ai: string
  vertical_name: string
}

interface CrawlResult {
  success: boolean
  content?: string
  extracted_content?: string
  images?: Array<{
    url: string
    alt?: string
    description?: string
  }>
  metadata?: {
    title?: string
    description?: string
    author?: string
    publish_date?: string
  }
  method?: 'jina_ai' | 'enhanced_fallback' | 'simple_fallback' | 'failed'
  error?: string
}

interface AIAnalysisResult {
  relevance_score: number
  relevance_reason: string
  primary_category: string
  entities: {
    companies: string[]
    technologies: string[]
    people: string[]
  }
  summary_for_editor: string
  strategic_implication: string
}

// 带超时和重试的fetch工具函数
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries: number = 3, 
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  const optionsWithSignal = {
    ...options,
    signal: controller.signal
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`尝试第 ${attempt} 次请求: ${url}`)
      
      const response = await fetch(url, optionsWithSignal)
      clearTimeout(timeoutId)
      
      if (response.ok) {
        return response
      } else if (response.status >= 500 && attempt < maxRetries) {
        // 服务器错误，重试
        console.warn(`服务器错误 ${response.status}，${2 ** attempt}秒后重试...`)
        await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000))
        continue
      } else {
        // 客户端错误或最后一次尝试失败
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`请求超时 (${timeoutMs}ms)`)
      } else if (attempt < maxRetries) {
        console.warn(`第 ${attempt} 次尝试失败: ${error.message}, ${2 ** attempt}秒后重试...`)
        await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000))
        continue
      } else {
        clearTimeout(timeoutId)
        throw error
      }
    }
  }
  
  clearTimeout(timeoutId)
  throw new Error(`${maxRetries}次重试后仍然失败`)
}

// 智能内容抓取（Jina AI + 增强型备用）
async function crawlArticleContent(url: string): Promise<CrawlResult> {
  try {
    console.log(`开始智能内容抓取: ${url}`)
    
    // 主要方案：Jina AI Reader API
    if (jinaApiKey) {
      try {
        console.log(`使用Jina AI Reader抓取内容: ${url}`)
        
        const jinaResponse = await fetchWithRetry(`https://r.jina.ai/${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${jinaApiKey}`,
            'X-Return-Format': 'text',
            'X-Target-Selector': 'article, .content, .post, main, .entry-content',
            'X-Wait-For-Selector': 'body',
            'X-Timeout': '10'
          }
        }, 2, 20000) // 2次重试，20秒超时
        
        if (jinaResponse.ok) {
          const jinaContent = await jinaResponse.text()
          
          console.log(`Jina AI成功抽取内容长度: ${jinaContent.length}`)
          
          if (jinaContent.length > 200) { // Jina AI 返回的内容质量检查
            return {
              success: true,
              content: jinaContent,
              extracted_content: jinaContent.substring(0, 8000), // 截取适当长度
              method: 'jina_ai',
              metadata: {
                source: 'jina_reader',
                url: url,
                extracted_at: new Date().toISOString()
              }
            }
          } else {
            console.warn('Jina AI返回内容太短，尝试增强型备用方案')
            throw new Error(`Jina AI内容质量不足: ${jinaContent.length} 字符`)
          }
        } else {
          throw new Error(`Jina AI HTTP ${jinaResponse.status}: ${jinaResponse.statusText}`)
        }
        
      } catch (jinaError) {
        console.warn('Jina AI失败，使用增强型备用方案:', jinaError.message)
        // 继续使用增强型备用方案
      }
    } else {
      console.log('Jina AI未配置，直接使用增强型备用方案')
    }
    
    // 备用方案：增强型HTML抓取与内容提取
    console.log(`使用增强型备用抓取方案: ${url}`)
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        redirect: 'follow'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const html = await response.text()
      
      // 先检查是否有常见的内容结构
      const articleSelectors = [
        'article',
        '[role="main"]', 
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content', 
        '.story-body',
        '.post-body',
        'main',
        '#content',
        '#main-content'
      ]
      
      let extractedContent = ''
      let foundContent = false
      
      // 尝试使用简单的DOM解析提取内容
      for (const selector of articleSelectors) {
        const regex = new RegExp(`<[^>]*class[^>]*["']([^"']*${selector.replace('.', '').replace('#', '')}[^"']*)["'][^>]*>([\s\S]*?)<\/[^>]+>`, 'i')
        const match = html.match(regex)
        
        if (match && match[2]) {
          const contentHtml = match[2]
          const cleanContent = contentHtml
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
            .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
            .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
            .replace(/<div[^>]*class[^>]*["'](?:ad|advertisement|social|share|comment)[^>]*>.*?<\/div>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          
          if (cleanContent.length > 200) {
            extractedContent = cleanContent
            foundContent = true
            console.log(`使用选择器 ${selector} 成功提取内容`)
            break
          }
        }
      }
      
      // 如果没找到结构化内容，使用通用清理
      if (!foundContent) {
        console.log('未找到结构化内容，使用通用HTML清理')
        extractedContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
          .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
          .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
          .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
          .replace(/<div[^>]*class[^>]*["'](?:ad|advertisement|social|share|comment|sidebar)[^>]*>.*?<\/div>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }
      
      // 内容质量过滤和优化
      const sentences = extractedContent
        .split(/[.!?。！？]\s*/)
        .filter(s => {
          const trimmed = s.trim()
          return trimmed.length > 20 && 
                 !trimmed.match(/^(click|read more|share|follow|subscribe|advertisement)/i) &&
                 !trimmed.match(/cookies?|privacy policy|terms of service/i)
        })
      
      const finalContent = sentences.slice(0, 150).join('. ').substring(0, 10000)
      
      console.log(`增强型备用抓取完成: ${finalContent.length} 字符, ${sentences.length} 句子`)
      
      if (finalContent.length < 100) {
        throw new Error(`备用抓取内容太短: ${finalContent.length} 字符`)
      }
      
      return {
        success: true,
        content: extractedContent.substring(0, 15000),
        extracted_content: finalContent,
        method: 'enhanced_fallback'
      }
      
    } catch (fallbackError) {
      console.error('增强型备用抓取也失败了:', fallbackError)
      
      // 备用方案2：极简抓取（最后的手段）
      try {
        const simpleResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Manufacturing-Intelligence-Bot/1.0)'
          }
        })
        
        if (simpleResponse.ok) {
          const simpleHtml = await simpleResponse.text()
          const simpleText = simpleHtml
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 5000)
          
          console.log(`极简备用抓取: ${simpleText.length} 字符`)
          
          return {
            success: true,
            content: simpleText,
            extracted_content: simpleText.substring(0, 3000),
            method: 'simple_fallback'
          }
        }
      } catch (simpleError) {
        console.error('极简抓取也失败:', simpleError)
      }
      
      throw fallbackError
    }
    
  } catch (error) {
    console.error('所有内容抓取方案都失败了:', {
      error: error.message,
      url: url,
      timestamp: new Date().toISOString()
    })
    
    return {
      success: false,
      error: `内容抓取失败: ${error.message}`,
      method: 'failed' as const
    }
  }
}

// Gemini AI分析
async function analyzeWithGemini(
  article: Article, 
  source: RSSSource, 
  content: string
): Promise<AIAnalysisResult | null> {
  try {
    console.log(`开始AI分析: ${article.title}`)
    
    // 构建分析提示
    const analysisPrompt = `# [SECTION 1: CONTEXT & ROLE]
You are a senior industry analyst specializing in the field of **${source.topic_for_ai}**. Your task is to evaluate the following article based on its relevance, business value, and strategic importance *specifically for the **${source.topic_for_ai}** industry*.

# [SECTION 2: CORE TASK - ANALYSIS & EVALUATION]
Analyze the provided article and output your findings in a strict JSON format.

## JSON OUTPUT SPECIFICATION:
{
  "relevance_score": <An integer from 0-100, calculated based on the scoring rubric below>,
  "relevance_reason": "<A concise, one-sentence explanation for the score>",
  "primary_category": "<Choose the most fitting category from: 'Core Equipment', 'Supply Chain', 'Market Trends', 'Technological Innovation', 'Business Models'>",
  "entities": {
    "companies": ["<List of company names mentioned>"],
    "technologies": ["<List of technology names mentioned>"],
    "people": ["<List of key individuals mentioned>"]
  },
  "summary_for_editor": "<A 200-word summary in Chinese, written for an editor. It must highlight the core insights and actionable information relevant to the **${source.topic_for_ai}** industry.>",
  "strategic_implication": "<A short analysis (in Chinese) of what this news *means*. Is it an opportunity, a threat, a signal of a new trend, or just noise?>"
}

# [SECTION 3: SCORING RUBRIC & DEFINITIONS]
You must use the following rubric to calculate the relevance_score.

## Base Score based on Article Type (max 50 points):
- Direct discussion of **${source.topic_for_ai}** products or companies: 50 points.
- Discussion of adjacent technologies or supply chain for **${source.topic_for_ai}**: 40 points.
- Discussion of market trends or business models impacting **${source.topic_for_ai}**: 30 points.
- Macroeconomic or general technology news with indirect relevance: 10 points.
- Not relevant: 0 points.

## Bonus Multipliers (applied to the base score):
- **Actionable Signal Multiplier (max 1.5x)**: Multiply by 1.5 if the article contains strong business signals like funding, M&A, financial reports, specific sales data, or customer case studies. Multiply by 1.0 otherwise.
- **Future-Facing Multiplier (max 1.2x)**: Multiply by 1.2 if the article discusses a future trend, a new patent, or a breakthrough innovation. Multiply by 1.0 otherwise.

# [SECTION 4: ARTICLE FOR ANALYSIS]
- **Article Topic**: ${source.topic_for_ai}
- **Article Title**: ${article.title}
- **Article Content**: ${content}

Please provide your analysis in the exact JSON format specified above.`

    // 调用Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: analysisPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048
          }
        })
      }
    )
    
    if (!geminiResponse.ok) {
      throw new Error(`Gemini API错误: ${geminiResponse.status}`)
    }
    
    const geminiData = await geminiResponse.json()
    
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      throw new Error('Gemini API返回空结果')
    }
    
    const analysisText = geminiData.candidates[0].content.parts[0].text
    console.log('AI分析原始结果:', analysisText)
    
    // 解析JSON结果
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('无法从AI响应中提取JSON')
    }
    
    const analysisResult: AIAnalysisResult = JSON.parse(jsonMatch[0])
    
    // 验证结果完整性
    if (typeof analysisResult.relevance_score !== 'number' ||
        !analysisResult.relevance_reason ||
        !analysisResult.primary_category) {
      throw new Error('AI分析结果不完整')
    }
    
    console.log(`AI分析完成，相关性评分: ${analysisResult.relevance_score}`)
    return analysisResult
    
  } catch (error) {
    console.error('Gemini AI分析失败:', error)
    return null
  }
}

// 更新文章分析结果
async function updateArticleAnalysis(
  articleId: string, 
  crawlResult: CrawlResult, 
  analysisResult: AIAnalysisResult | null
): Promise<boolean> {
  try {
    const updateData: any = {}
    
    // 更新内容抓取结果
    if (crawlResult.success && crawlResult.extracted_content) {
      updateData.full_content = crawlResult.extracted_content
      
      // 处理元数据（存储为 JSONB）
      const crawlMetadata: any = {
        method: crawlResult.method || 'unknown',
        success: true,
        extracted_at: new Date().toISOString()
      }
      
      // 处理图片信息
      if (crawlResult.images && crawlResult.images.length > 0) {
        crawlMetadata.images = crawlResult.images
        crawlMetadata.image_count = crawlResult.images.length
      }
      
      // 处理增强元数据
      if (crawlResult.metadata) {
        crawlMetadata.enhanced_metadata = crawlResult.metadata
        
        // 更新作者信息（如果原来没有）
        if (crawlResult.metadata.author) {
          updateData.author = crawlResult.metadata.author
        }
      }
      
      updateData.crawl_metadata = crawlMetadata
    } else {
      // 失败情况下也要记录元数据
      updateData.crawl_metadata = {
        method: crawlResult.method || 'failed',
        success: false,
        error: crawlResult.error,
        attempted_at: new Date().toISOString()
      }
    }
    
    // 更新AI分析结果（映射到正确的数据库字段名）
    if (analysisResult) {
      updateData.ai_score = analysisResult.relevance_score
      updateData.ai_reason = analysisResult.relevance_reason
      updateData.ai_category = analysisResult.primary_category
      updateData.ai_summary = analysisResult.summary_for_editor
      updateData.ai_strategic_implication = analysisResult.strategic_implication
      
      // 根据相关性评分更新状态
      if (analysisResult.relevance_score >= 70) {
        updateData.overall_status = 'ready_for_review'
      } else if (analysisResult.relevance_score >= 40) {
        updateData.overall_status = 'processing'
      } else {
        updateData.overall_status = 'draft'
      }
    }
    
    // 更新数据库
    const result = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', articleId)
    
    if (result.error) {
      console.error('更新文章失败:', result.error)
      return false
    }
    
    // 处理实体数据
    if (analysisResult && analysisResult.entities) {
      await processEntities(articleId, analysisResult.entities)
    }
    
    console.log(`文章 ${articleId} 分析结果已更新`)
    return true
    
  } catch (error) {
    console.error('更新文章分析结果失败:', error)
    return false
  }
}

// 处理实体标准化和关联
async function processEntities(articleId: string, entities: any): Promise<void> {
  try {
    const allEntities: Array<{name: string, type: string}> = []
    
    // 收集所有实体
    if (entities.companies) {
      entities.companies.forEach((company: string) => {
        allEntities.push({ name: company.trim(), type: 'company' })
      })
    }
    
    if (entities.technologies) {
      entities.technologies.forEach((tech: string) => {
        allEntities.push({ name: tech.trim(), type: 'technology' })
      })
    }
    
    if (entities.people) {
      entities.people.forEach((person: string) => {
        allEntities.push({ name: person.trim(), type: 'person' })
      })
    }
    
    // 处理每个实体
    for (const entity of allEntities) {
      if (!entity.name || entity.name.length < 2) continue
      
      // 查找或创建实体
      const { data: existingEntity } = await supabase
        .from('entities')
        .select('id')
        .eq('normalized_name', entity.name.toLowerCase())
        .eq('type', entity.type)
        .limit(1)
        .single()
      
      let entityId: string
      
      if (existingEntity) {
        entityId = existingEntity.id
      } else {
        // 创建新实体
        const { data: newEntity } = await supabase
          .from('entities')
          .insert([{
            type: entity.type,
            name: entity.name,
            normalized_name: entity.name.toLowerCase(),
            mention_count: 1
          }])
          .select('id')
          .single()
        
        if (!newEntity) continue
        entityId = newEntity.id
      }
      
      // 创建文章-实体关联
      await supabase
        .from('article_entities')
        .insert([{
          article_id: articleId,
          entity_id: entityId,
          relevance_score: 0.8,
          extraction_method: 'ai'
        }])
    }
    
  } catch (error) {
    console.error('处理实体失败:', error)
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
    console.log('AI分析任务开始...')
    
    // 验证请求方法
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 获取请求参数
    const requestBody = await req.json()
    const { article_id, test_mode = false } = requestBody
    
    if (!article_id) {
      return new Response(JSON.stringify({ error: 'Missing article_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    console.log(`处理文章ID: ${article_id}`)
    
    // 获取文章信息
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select(`
        id, title, link, description, source_id, overall_status,
        rss_sources!inner (
          id, name, topic_for_ai, vertical_name
        )
      `)
      .eq('id', article_id)
      .single()
    
    if (articleError || !article) {
      throw new Error(`获取文章失败: ${articleError?.message}`)
    }
    
    const source = article.rss_sources as RSSSource
    console.log(`文章来源: ${source.name}, 主题: ${source.topic_for_ai}`)
    
    // 步骤1: 抓取文章全文内容
    const crawlResult = await crawlArticleContent(article.link)
    
    let analysisResult: AIAnalysisResult | null = null
    
    // 步骤2: AI分析 (仅在内容抓取成功且有内容时进行)
    if (crawlResult.success && crawlResult.extracted_content && crawlResult.extracted_content.length > 50) {
      console.log(`开始AI分析，内容长度: ${crawlResult.extracted_content.length}`)
      analysisResult = await analyzeWithGemini(article, source, crawlResult.extracted_content)
    } else {
      console.log(`跳过AI分析 - 抓取成功: ${crawlResult.success}, 内容长度: ${crawlResult.extracted_content?.length || 0}`)
    }
    
    // 步骤3: 更新数据库
    const updateSuccess = await updateArticleAnalysis(article_id, crawlResult, analysisResult)
    
    // 返回结果
    const response = {
      success: true,
      article_id,
      article_title: article.title,
      crawl_success: crawlResult.success,
      content_length: crawlResult.extracted_content?.length || 0,
      analysis_success: !!analysisResult,
      relevance_score: analysisResult?.relevance_score || null,
      primary_category: analysisResult?.primary_category || null,
      database_updated: updateSuccess,
      test_mode,
      timestamp: new Date().toISOString()
    }
    
    console.log('AI分析任务完成:', response)
    
    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
    
  } catch (error) {
    console.error('AI分析任务失败:', error)
    
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