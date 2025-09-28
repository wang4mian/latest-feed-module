// =====================================================
// Supabase Edge Function: AI 分析 (带Token统计)
// 路径: supabase/functions/ai-analyze/index.ts  
// 功能: 使用Jina AI和Gemini AI分析文章内容，并统计token使用量和费用
// =====================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Token pricing for Gemini 2.5 Flash (USD per 1M tokens)
const TOKEN_PRICING = {
  input: 0.30,    // $0.30 per 1M input tokens  
  output: 2.50    // $2.50 per 1M output tokens
}

interface ArticleForAnalysis {
  id: string
  title: string
  link: string
  description: string
  source_id: number
  topic_for_ai: string
}

interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
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

    // Get request parameters
    const { article_id, batch_size = 15 } = await req.json()

    let articles: ArticleForAnalysis[] = []

    if (article_id) {
      // Process specific article
      const { data, error } = await supabase
        .from('articles')
        .select(`
          id, title, link, description, source_id,
          rss_sources!inner(topic_for_ai)
        `)
        .eq('id', article_id)
        .limit(1)

      if (error) throw error
      articles = data?.map(a => ({
        ...a,
        topic_for_ai: a.rss_sources.topic_for_ai
      })) || []
    } else {
      // Process batch of articles
      const { data, error } = await supabase
        .from('articles')
        .select(`
          id, title, link, description, source_id,
          rss_sources!inner(topic_for_ai)
        `)
        .is('ai_score', null)
        .limit(batch_size)

      if (error) throw error
      articles = data?.map(a => ({
        ...a,
        topic_for_ai: a.rss_sources.topic_for_ai
      })) || []
    }

    if (!articles.length) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No articles to process',
        processed: 0,
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          totalCost: 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let processed = 0
    const results = []
    let totalTokenUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0
    }

    // Process each article
    for (const article of articles) {
      try {
        console.log(`Processing article: ${article.title}`)

        // Step 1: Extract full content with Jina AI
        const fullContent = await extractFullContent(article.link, article.description)
        
        // Step 2: AI Analysis with Gemini (with token tracking)
        const { analysis, tokenUsage } = await analyzeWithGeminiAndTrackTokens(article, fullContent)

        // Step 3: Update article with simplified analysis results
        const { error: updateError } = await supabase
          .from('articles')
          .update({
            ai_summary: analysis.summary,
            ai_tags: analysis.tags, // 新字段：自由标签数组
            full_content: fullContent, // Store complete content from Jina AI
            overall_status: 'ready_for_review', // 简化：所有文章都进入待审核
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id)

        if (updateError) throw updateError

        // Step 4: Process entities (simplified)
        if (analysis.companies || analysis.technologies) {
          await processEntities(supabase, article.id, {
            companies: analysis.companies || [],
            technologies: analysis.technologies || []
          })
        }

        // Accumulate token usage
        totalTokenUsage.inputTokens += tokenUsage.inputTokens
        totalTokenUsage.outputTokens += tokenUsage.outputTokens
        totalTokenUsage.totalTokens += tokenUsage.totalTokens
        totalTokenUsage.inputCost += tokenUsage.inputCost
        totalTokenUsage.outputCost += tokenUsage.outputCost
        totalTokenUsage.totalCost += tokenUsage.totalCost

        processed++
        results.push({
          id: article.id,
          title: article.title,
          tags: analysis.tags,
          summary_length: analysis.summary?.length || 0,
          tokenUsage: tokenUsage,
          status: 'processed'
        })

        console.log(`✅ Article processed: ${article.title} (Tags: ${analysis.tags?.length || 0}, Tokens: ${tokenUsage.totalTokens}, Cost: $${tokenUsage.totalCost.toFixed(6)})`)

      } catch (error) {
        console.error(`❌ Error processing article ${article.id}:`, error)
        results.push({
          id: article.id,
          title: article.title,
          error: error.message,
          status: 'error'
        })
      }
    }

    // Log daily token usage and cost summary
    const today = new Date().toISOString().split('T')[0]
    console.log(`📊 Daily Token Usage Summary (${today}):`)
    console.log(`   Articles processed: ${processed}`)
    console.log(`   Input tokens: ${totalTokenUsage.inputTokens.toLocaleString()}`)
    console.log(`   Output tokens: ${totalTokenUsage.outputTokens.toLocaleString()}`)
    console.log(`   Total tokens: ${totalTokenUsage.totalTokens.toLocaleString()}`)
    console.log(`   Input cost: $${totalTokenUsage.inputCost.toFixed(6)}`)
    console.log(`   Output cost: $${totalTokenUsage.outputCost.toFixed(6)}`)
    console.log(`   Total cost: $${totalTokenUsage.totalCost.toFixed(6)} (≈¥${(totalTokenUsage.totalCost * 7.2).toFixed(4)})`)
    console.log(`   Avg cost per article: $${(totalTokenUsage.totalCost / Math.max(processed, 1)).toFixed(6)}`)

    // Store daily usage statistics in database
    if (processed > 0) {
      await storeDailyUsageStats(supabase, {
        date: today,
        articlesProcessed: processed,
        ...totalTokenUsage
      })
    }

    return new Response(JSON.stringify({
      success: true,
      processed: processed,
      total: articles.length,
      results: results,
      tokenUsage: {
        inputTokens: totalTokenUsage.inputTokens,
        outputTokens: totalTokenUsage.outputTokens,
        totalTokens: totalTokenUsage.totalTokens,
        inputCost: Number(totalTokenUsage.inputCost.toFixed(6)),
        outputCost: Number(totalTokenUsage.outputCost.toFixed(6)),
        totalCost: Number(totalTokenUsage.totalCost.toFixed(6)),
        totalCostCny: Number((totalTokenUsage.totalCost * 7.2).toFixed(4)),
        avgCostPerArticle: Number((totalTokenUsage.totalCost / Math.max(processed, 1)).toFixed(6))
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ AI analysis function error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Extract content using Jina AI Reader
async function extractFullContent(url: string, description: string): Promise<string> {
  try {
    console.log(`🔍 Extracting content from: ${url}`)
    
    const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown'
        // TODO: 高级选项需要付费API key
        // 'X-With-Generated-Alt': 'true',     // 需要付费版本
        // 'X-With-Images-Summary': 'true',    // 需要付费版本  
        // 'X-Retain-Images': 'true',          // 需要付费版本
      }
    })

    if (jinaResponse.ok) {
      const jinaResult = await jinaResponse.text()
      
      // Try to parse as JSON first (Jina AI returns JSON format)
      try {
        const parsedResult = JSON.parse(jinaResult)
        
        if (parsedResult.code === 200 && parsedResult.data && parsedResult.data.content) {
          const content = parsedResult.data.content
          const title = parsedResult.data.title || ''
          
          if (content && content.length > 100) {
            console.log(`✅ Jina AI success: ${content.length} characters extracted`)
            console.log(`📰 Article title: ${title}`)
            return content
          } else {
            console.warn(`⚠️ Jina AI returned insufficient content: ${content.length} chars`)
          }
        } else {
          console.warn(`⚠️ Jina AI returned error code: ${parsedResult.code}, status: ${parsedResult.status}`)
        }
      } catch (parseError) {
        // Fallback: treat as plain text (for backward compatibility)
        if (jinaResult && jinaResult.length > 100) {
          console.log(`✅ Jina AI success (plain text): ${jinaResult.length} characters extracted`)
          return jinaResult
        }
      }
    }
  } catch (error) {
    console.error('❌ Jina AI extraction failed:', error.message)
  }

  // Fallback: Use RSS description
  console.warn('⚠️ Content extraction failed, using RSS description as fallback')
  return description || 'Content extraction failed'
}

// Analyze content with Gemini AI and track token usage
async function analyzeWithGeminiAndTrackTokens(article: ArticleForAnalysis, fullContent: string): Promise<{analysis: any, tokenUsage: TokenUsage}> {
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash'

  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const analysisPrompt = `
# 核心任务：智能摘要 + 自由标签

你是一位专业的制造业内容分析师。请对以下文章进行两项核心工作：

## 1. 智能摘要
生成一份200字左右的中文摘要，突出：
- 核心事实和关键信息
- 对制造业的实际意义
- 值得关注的要点

## 2. 自由标签
根据文章内容，自由创建3-5个标签，可以包括：
- 技术类型（如：3D打印、机器人、AI）
- 应用领域（如：汽车、医疗、航空）
- 商业信号（如：融资、并购、新产品）
- 地域信息（如：中国、美国、欧洲）
- 任何你认为有价值的特征标签

## 输出格式（严格JSON）：
{
  "summary": "<200字中文摘要>",
  "tags": ["<标签1>", "<标签2>", "<标签3>", "<标签4>", "<标签5>"],
  "companies": ["<提到的公司名称>"],
  "technologies": ["<涉及的技术>"]
}

## 文章信息：
- **主题**: ${article.topic_for_ai}
- **标题**: ${article.title}  
- **内容**: ${fullContent}

请专注做好摘要和标签，保持简洁高效。
`

  // Estimate input tokens (rough approximation: 1 token ≈ 4 characters for English, 1 token ≈ 1 character for Chinese)
  const estimatedInputTokens = Math.ceil(analysisPrompt.length / 3.5)

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: analysisPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        maxOutputTokens: 2048,
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const result = await response.json()
  const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text

  if (!generatedText) {
    throw new Error('No response from Gemini AI')
  }

  // Get actual token usage from API response (if available)
  const actualInputTokens = result.usageMetadata?.promptTokenCount || estimatedInputTokens
  const actualOutputTokens = result.usageMetadata?.candidatesTokenCount || Math.ceil(generatedText.length / 3.5)
  const totalTokens = actualInputTokens + actualOutputTokens

  // Calculate costs
  const inputCost = (actualInputTokens / 1000000) * TOKEN_PRICING.input
  const outputCost = (actualOutputTokens / 1000000) * TOKEN_PRICING.output
  const totalCost = inputCost + outputCost

  const tokenUsage: TokenUsage = {
    inputTokens: actualInputTokens,
    outputTokens: actualOutputTokens,
    totalTokens: totalTokens,
    inputCost: inputCost,
    outputCost: outputCost,
    totalCost: totalCost
  }

  // Extract JSON from response
  const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from Gemini AI')
  }

  const analysis = JSON.parse(jsonMatch[0])

  return { analysis, tokenUsage }
}

// Store daily usage statistics
async function storeDailyUsageStats(supabase: any, stats: any) {
  try {
    await supabase
      .from('daily_ai_usage')
      .upsert({
        date: stats.date,
        articles_processed: stats.articlesProcessed,
        input_tokens: stats.inputTokens,
        output_tokens: stats.outputTokens,
        total_tokens: stats.totalTokens,
        input_cost_usd: stats.inputCost,
        output_cost_usd: stats.outputCost,
        total_cost_usd: stats.totalCost,
        total_cost_cny: stats.totalCost * 7.2,
        avg_cost_per_article_usd: stats.totalCost / Math.max(stats.articlesProcessed, 1),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date'
      })
    
    console.log(`📊 Daily usage stats stored for ${stats.date}`)
  } catch (error) {
    console.error('❌ Failed to store daily usage stats:', error)
  }
}

// Process and store entities
async function processEntities(supabase: any, articleId: string, entities: any) {
  const allEntities = [
    ...entities.companies?.map((name: string) => ({ name, type: 'company' })) || [],
    ...entities.technologies?.map((name: string) => ({ name, type: 'technology' })) || [],
    ...entities.people?.map((name: string) => ({ name, type: 'person' })) || []
  ]

  for (const entity of allEntities) {
    if (!entity.name || entity.name.trim().length < 2) continue

    const normalizedName = entity.name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '_')
    
    // Upsert entity
    const { data: existingEntity } = await supabase
      .from('entities')
      .select('id')
      .eq('normalized_name', normalizedName)
      .single()

    let entityId = existingEntity?.id

    if (!entityId) {
      const { data: newEntity } = await supabase
        .from('entities')
        .insert({
          name: entity.name,
          normalized_name: normalizedName,
          type: entity.type,
          mention_count: 1,
          first_mentioned_at: new Date().toISOString(),
          last_mentioned_at: new Date().toISOString()
        })
        .select('id')
        .single()

      entityId = newEntity?.id
    } else {
      // Update existing entity
      await supabase
        .from('entities')
        .update({
          mention_count: supabase.raw('mention_count + 1'),
          last_mentioned_at: new Date().toISOString()
        })
        .eq('id', entityId)
    }

    // Create article-entity relationship
    if (entityId) {
      await supabase
        .from('article_entities')
        .insert({
          article_id: articleId,
          entity_id: entityId,
          extracted_at: new Date().toISOString()
        })
    }
  }
}