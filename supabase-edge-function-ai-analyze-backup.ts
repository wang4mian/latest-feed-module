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

        // Step 3: Extract and store images separately
        let extractedImages = null
        try {
          if (fullContent.includes('[文章图片信息]')) {
            const imageSection = fullContent.split('[文章图片信息]:')[1]
            if (imageSection) {
              const imageUrls = imageSection.match(/(https?:\/\/[^\s\)]+)/g) || []
              if (imageUrls.length > 0) {
                extractedImages = imageUrls.map((url, index) => ({
                  url: url.trim(),
                  alt: `图片${index + 1}`,
                  source: 'jina_ai'
                }))
                console.log(`📸 Extracted ${extractedImages.length} images for article`)
              }
            }
          }
        } catch (error) {
          console.error('Error extracting images:', error)
        }

        // Step 4: Update article with analysis results
        const { error: updateError } = await supabase
          .from('articles')
          .update({
            full_content: fullContent,
            ai_score: aiAnalysis.relevance_score,
            ai_reason: aiAnalysis.relevance_reason,
            ai_category: aiAnalysis.primary_category,
            ai_summary: aiAnalysis.summary_for_editor,
            ai_strategic_implication: aiAnalysis.strategic_implication,
            // 存储编译好的快讯到editor_notes字段，供编辑工作台使用
            editor_notes: aiAnalysis.compiled_briefing || null,
            // 存储图片信息到crawl_metadata字段
            crawl_metadata: extractedImages ? { images: extractedImages } : null,
            overall_status: aiAnalysis.relevance_score >= 50 ? 'ready_for_review' : 'auto_rejected',
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
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`
    
    const jinaResponse = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'KUATO-Intelligence/1.0'
      }
    })

    if (jinaResponse.ok) {
      const jinaData = await jinaResponse.json()
      
      if (jinaData.code === 200 && jinaData.data && jinaData.data.content) {
        const content = jinaData.data.content
        if (content && content.length > 100) {
          console.log(`✅ Jina AI success: ${content.length} characters extracted`)
          console.log(`📄 Title: ${jinaData.data.title || 'No title'}`)
          
          // 提取图片信息
          let imageInfo = ''
          if (jinaData.data.images && jinaData.data.images.length > 0) {
            console.log(`🖼️ Found ${jinaData.data.images.length} images`)
            imageInfo = '\n\n[文章图片信息]:\n' + jinaData.data.images.map((img: any, index: number) => 
              `图片${index + 1}: ${img.src || img.url || img} ${img.alt ? `(${img.alt})` : ''}`
            ).join('\n')
          }
          
          return content + imageInfo
        }
      } else {
        console.warn(`⚠️ Jina AI returned code ${jinaData.code}: ${jinaData.status}`)
      }
    } else {
      console.error(`❌ Jina AI HTTP error: ${jinaResponse.status} ${jinaResponse.statusText}`)
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
# 一、 核心使命与定位
你的身份是名为「增材制造狗」的产业媒体AI助手。我们的品牌定位是一个**"根基扎实、迭代稳快的知识结构"**，面向未来的决策者（企业家、投资者、技术负责人）。你的核心使命是：从全球技术噪音中，选择并解码那些真正能引发行业变革的"信号"，为用户提供最高品味的"结构化洞察"，帮助他们以最高效率认知世界，稳快执行。

# 二、 核心任务：分析评估 + 生成快讯
你需要完成两个任务：
1. 评估文章的增材制造相关度和价值
2. 如果相关度≥50分，生成标准化三段式快讯

# 三、 快讯格式规范 (Strict Format Rules)
每一篇【快讯】都必须严格遵循以下结构和格式，不得有任何偏差。

标题 (Title):
格式必须为： 【增材制造狗】- [两字系列] - [文章标题]
[两字系列]: 这是对内容的分类，例如：应用、商业、科研、生态、医疗、建筑、军政、产品、材料等。
[文章标题]: 必须精炼、准确、并具有吸引力，概括新闻核心。

信源行 (Source Line):
格式必须为： 信源：[Source Name] | 编译：增材制造狗

正文 (Body Text) - "三段式"结构:
正文必须由三个自然段落组成。
段落之间必须用一个空行隔开。不得使用任何其他分隔符。
不得在段落前添加"导语"、"核心内容"、"简评"等任何标签。

第一段 (导语): 事实陈述与引子。用一到两句话，清晰、准确地概括新闻的核心事件（谁，做了什么，导致了什么）。风格：客观、直接，快速切入主题。

第二段 (核心内容): 细节与背景。提供关于该新闻事件的更多关键细节、数据或背景信息，解释其"如何发生"以及"具体内容是什么"。风格：信息密集，逻辑清晰。

第三段 (简评): 洞察与解读。这是体现我们价值的核心。分析这则新闻的意义，解读它是一个什么样的"信号"，它将对行业产生什么影响，或者它为中国的从业者带来什么启示。风格：精炼、敏锐、有观点。

原始信源链接 (Original Source Link):
格式必须为： 在全文的最后，另起一行，以"原始信源链接："开头，并在下一行附上完整的URL。

# 四、 输出格式
请严格按照JSON格式输出：

{
  "relevance_score": <0-100评分>,
  "relevance_reason": "<评分理由>",
  "primary_category": "<两字系列分类：应用、商业、科研、生态、医疗、建筑、军政、产品、材料、汽车>",
  "entities": {
    "companies": ["<公司名称>"],
    "technologies": ["<技术名称>"], 
    "people": ["<人物名称>"]
  },
  "summary_for_editor": "<200字摘要>",
  "strategic_implication": "<战略意义分析>",
  "compiled_briefing": "<如果relevance_score≥50，输出完整三段式快讯；否则为null>"
}

# 五、评分标准
- 直接3D打印新闻（设备、技术、应用）：60-80分
- 相关制造技术或材料：40-60分
- 间接相关制造业：20-40分
- 无关内容：0-20分

加分：中国相关+20%，大规模生产+15%，技术突破+10%

# 六、文章信息
- **文章标题**: ${article.title}
- **文章描述**: ${article.description}
- **文章内容**: ${fullContent || '(No full content available)'}
- **来源链接**: ${article.link}
- **信源名称**: ${article.rss_sources?.name || 'Unknown'}

请完成分析评估，如果相关度≥50分则同时生成标准快讯。
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