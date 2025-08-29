// =====================================================
// Supabase Edge Function: AI 分析
// 路径: supabase/functions/ai-analyze/index.ts  
// 功能: 使用Crawl4AI和Gemini AI分析文章内容
// =====================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ArticleForAnalysis {
  id: string
  title: string
  link: string
  description: string
  source_id: number
  topic_for_ai: string
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
    const { article_id, batch_size = 5 } = await req.json()

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
        .eq('overall_status', 'draft')
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
        .eq('overall_status', 'draft')
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
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let processed = 0
    const results = []

    // Process each article
    for (const article of articles) {
      try {
        console.log(`Processing article: ${article.title}`)

        // Step 1: Extract full content with Crawl4AI (with description fallback)
        const fullContent = await extractFullContent(article.link, article.description)
        
        // Step 2: AI Analysis with Gemini
        const aiAnalysis = await analyzeWithGemini(article, fullContent)

        // Step 3: Update article with analysis results
        const { error: updateError } = await supabase
          .from('articles')
          .update({
            full_content: fullContent,
            ai_score: aiAnalysis.relevance_score,
            ai_reason: aiAnalysis.relevance_reason,
            ai_category: aiAnalysis.primary_category,
            ai_summary: aiAnalysis.summary_for_editor,
            ai_strategic_implication: aiAnalysis.strategic_implication,
            overall_status: aiAnalysis.relevance_score >= 50 ? 'ready_for_review' : 'reviewed',
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id)

        if (!updateError) {
          processed++
          
          // Step 4: Extract and store entities
          if (aiAnalysis.entities) {
            await processEntities(supabase, article.id, aiAnalysis.entities)
          }

          results.push({
            id: article.id,
            title: article.title,
            score: aiAnalysis.relevance_score,
            category: aiAnalysis.primary_category,
            status: 'processed'
          })
        }

      } catch (error) {
        console.error(`Error processing article ${article.id}:`, error)
        results.push({
          id: article.id,
          title: article.title,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'AI analysis completed',
      timestamp: new Date().toISOString(),
      processed,
      total: articles.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI Analysis failed:', error)
    
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

// Extract full content using Crawl4AI with fallback strategies
async function extractFullContent(url: string, description: string = ''): Promise<string> {
  console.log(`🕷️ Extracting content from: ${url}`)
  
  // Strategy 1: Try Crawl4AI
  try {
    const crawl4aiUrl = Deno.env.get('CRAWL4AI_CLOUD_URL') || 'https://www.crawl4ai-cloud.com/query'
    const crawl4aiKey = Deno.env.get('CRAWL4AI_API_KEY')

    if (!crawl4aiKey) {
      console.warn('⚠️ CRAWL4AI_API_KEY not configured, falling back to alternative methods')
      throw new Error('CRAWL4AI_API_KEY not configured')
    }

    console.log('📡 Calling Crawl4AI API...')
    const response = await fetch(crawl4aiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${crawl4aiKey}`
      },
      body: JSON.stringify({
        url: url,
        extract_main_content: true,
        remove_ads: true,
        word_count_threshold: 50
      })
    })

    if (!response.ok) {
      console.error(`❌ Crawl4AI API error: ${response.status} ${response.statusText}`)
      throw new Error(`Crawl4AI API error: ${response.status}`)
    }

    const result = await response.json()
    const content = result.data?.main_content || result.data?.text || result.data?.markdown || ''
    
    if (content && content.length > 100) {
      console.log(`✅ Crawl4AI success: ${content.length} characters extracted`)
      return content
    } else {
      console.warn('⚠️ Crawl4AI returned minimal content, trying fallback')
      throw new Error('Insufficient content from Crawl4AI')
    }
    
  } catch (error) {
    console.error('❌ Crawl4AI extraction failed:', error.message)
  }

  // Strategy 2: Try Jina AI Reader as fallback
  try {
    console.log('🔄 Fallback: Trying Jina AI Reader...')
    const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown'
      }
    })

    if (jinaResponse.ok) {
      const jinaResult = await jinaResponse.text()
      if (jinaResult && jinaResult.length > 100) {
        console.log(`✅ Jina AI success: ${jinaResult.length} characters extracted`)
        return jinaResult
      }
    }
  } catch (error) {
    console.error('❌ Jina AI fallback failed:', error.message)
  }

  // Strategy 3: Simple fetch fallback
  try {
    console.log('🔄 Final fallback: Simple fetch...')
    const simpleResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IntelligenceBot/1.0)'
      }
    })

    if (simpleResponse.ok) {
      const html = await simpleResponse.text()
      // Basic HTML content extraction (remove tags)
      const textContent = html
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (textContent && textContent.length > 200) {
        console.log(`✅ Simple fetch success: ${textContent.length} characters extracted`)
        return textContent.substring(0, 5000) // Limit to 5K chars
      }
    }
  } catch (error) {
    console.error('❌ Simple fetch fallback failed:', error.message)
  }

  // Final fallback: Use RSS description
  console.warn('⚠️ All content extraction methods failed, using RSS description as fallback')
  return description || 'Content extraction failed'
}

// Analyze content with Gemini AI
async function analyzeWithGemini(article: ArticleForAnalysis, fullContent: string) {
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash'

  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const analysisPrompt = `
# [SECTION 1: CONTEXT & ROLE]
You are a senior industry analyst specializing in the field of **${article.topic_for_ai}**. Your task is to evaluate the following article based on its relevance, business value, and strategic importance *specifically for the **${article.topic_for_ai}** industry*.

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
  "summary_for_editor": "<A 200-word summary in Chinese, written for an editor. It must highlight the core insights and actionable information relevant to the **${article.topic_for_ai}** industry.>",
  "strategic_implication": "<A short analysis (in Chinese) of what this news *means*. Is it an opportunity, a threat, a signal of a new trend, or just noise?>"
}

# [SECTION 3: SCORING RUBRIC & DEFINITIONS]
## Base Score based on Article Type (max 50 points):
- Direct discussion of **${article.topic_for_ai}** products or companies: 50 points.
- Discussion of adjacent technologies or supply chain for **${article.topic_for_ai}**: 40 points.
- Discussion of market trends or business models impacting **${article.topic_for_ai}**: 30 points.
- Macroeconomic or general technology news with indirect relevance: 10 points.
- Not relevant: 0 points.

## Bonus Multipliers (applied to the base score):
- **Actionable Signal Multiplier (max 1.5x)**: Multiply by 1.5 if the article contains strong business signals like funding, M&A, financial reports, specific sales data, or customer case studies. Multiply by 1.0 otherwise.
- **Future-Facing Multiplier (max 1.2x)**: Multiply by 1.2 if the article discusses a future trend, a new patent, or a breakthrough innovation. Multiply by 1.0 otherwise.

# [SECTION 4: ARTICLE FOR ANALYSIS]
- **Article Topic**: ${article.topic_for_ai}
- **Article Title**: ${article.title}
- **Article Description**: ${article.description}
- **Article Content**: ${fullContent || '(No full content available)'}
`

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

  // Extract JSON from response
  const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from Gemini AI')
  }

  return JSON.parse(jsonMatch[0])
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
      // Update mention count (get current count first, then increment)
      const { data: currentEntity } = await supabase
        .from('entities')
        .select('mention_count')
        .eq('id', entityId)
        .single()

      await supabase
        .from('entities')
        .update({
          mention_count: (currentEntity?.mention_count || 0) + 1,
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
          relevance_score: 1.0,
          extraction_method: 'ai'
        })
    }
  }
}