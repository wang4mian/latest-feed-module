import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// 数据库类型定义 - 与实际数据库表结构匹配
export interface Article {
  id: string                    // UUID 类型
  source_id: number            // 引用 rss_sources.id
  
  // 三层防重复策略
  guid?: string
  normalized_url?: string
  title_hash?: string
  
  // RSS原始数据
  title: string
  link: string
  description?: string
  author?: string
  pub_date?: string            // TIMESTAMPTZ 转换为 string
  
  // Crawl4AI抓取数据
  full_content?: string
  crawl_metadata?: any         // JSONB 类型
  
  // Gemini AI分析结果
  ai_score?: number            // 0-100的整数
  ai_reason?: string
  ai_category?: string         // "Core Equipment", "Supply Chain"等
  ai_summary?: string          // AI生成的中文摘要
  ai_strategic_implication?: string // 战略意义分析
  
  // 综合状态
  overall_status: 'draft' | 'processing' | 'ready_for_review' | 'auto_rejected' | 'published' | 'adopted' | 'archived' | 'ignored'
  editor_notes?: string
  edited_title?: string
  edited_content?: string
  
  // 时间戳
  created_at: string
  updated_at?: string
}

export interface RSSSource {
  id: number
  name: string
  url: string
  vertical_name: string
  topic_for_ai: string
  is_active: boolean
  fetch_count?: number
  success_count?: number
  error_count?: number
  last_fetch_at?: string
  last_success_at?: string
  last_error?: string
  created_at: string
}

export interface Entity {
  id: string                   // UUID 类型
  name: string
  normalized_name: string
  type: 'company' | 'technology' | 'person'
  
  // 实体元数据
  description?: string
  wikipedia_url?: string
  official_website?: string
  industry?: string
  country?: string
  
  // 统计数据
  mention_count: number
  first_mentioned_at?: string
  last_mentioned_at?: string
  
  // 对比分析支持
  entity_region?: string       // 'China', 'US', 'EU', 'Global'
  is_benchmark_case: boolean
  benchmark_category?: string
  benchmark_description?: string
  
  // 置信度和验证
  confidence_score: number     // 0.0-1.0
  is_verified: boolean
  
  // 时间戳
  created_at: string
  updated_at?: string
}

export interface ArticleEntity {
  id: string                   // UUID 类型
  article_id: string           // UUID 引用
  entity_id: string            // UUID 引用
  
  // 关联上下文
  context?: string
  mention_position?: number
  relevance_score: number      // 0.0-1.0
  sentiment: 'positive' | 'negative' | 'neutral'
  
  // 元数据
  extracted_at: string
  extraction_method: 'ai' | 'manual' | 'rule_based'
  created_at: string
}

// 常用查询函数
export const getArticles = async (filters: {
  status?: string
  category?: string
  source?: string
  search?: string
  sort?: string
  limit?: number
  offset?: number
} = {}) => {
  let query = supabase
    .from('articles')
    .select(`
      *,
      rss_sources (
        name,
        vertical_name,
        topic_for_ai
      )
    `, { count: 'exact' })
  
  // 应用筛选条件
  if (filters.status) {
    query = query.eq('overall_status', filters.status)
  } else {
    // 文章池默认只显示待处理的文章：ready_for_review 和 auto_rejected
    query = query.in('overall_status', ['ready_for_review', 'auto_rejected'])
  }
  
  if (filters.category) {
    query = query.eq('ai_category', filters.category)
  }
  
  if (filters.source) {
    query = query.eq('source_id', filters.source)
  }
  
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }
  
  // 应用排序 - 添加第二排序字段确保稳定性
  switch (filters.sort) {
    case 'ai_score_desc':
      query = query.order('ai_score', { ascending: false }).order('created_at', { ascending: false })
      break
    case 'ai_score_asc':
      query = query.order('ai_score', { ascending: true }).order('created_at', { ascending: false })
      break
    case 'created_at_desc':
      query = query.order('created_at', { ascending: false }).order('ai_score', { ascending: false })
      break
    case 'created_at_asc':
      query = query.order('created_at', { ascending: true }).order('ai_score', { ascending: false })
      break
    default:
      query = query.order('created_at', { ascending: false }).order('ai_score', { ascending: false })
  }
  
  // 应用分页
  if (filters.limit !== undefined) {
    if (filters.offset !== undefined) {
      query = query.range(filters.offset, filters.offset + filters.limit - 1)
    } else {
      query = query.limit(filters.limit)
    }
  }
  
  // 执行查询并返回结果
  const result = await query
  
  return {
    data: result.data || [],
    error: result.error,
    count: result.count || 0
  }
}

export const getArticleById = async (id: string) => {
  return supabase
    .from('articles')
    .select(`
      *,
      rss_sources (
        name,
        vertical_name,
        topic_for_ai
      )
    `)
    .eq('id', id)
    .single()
}

export const updateArticleStatus = async (id: string, status: Article['overall_status']) => {
  return supabase
    .from('articles')
    .update({ 
      overall_status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
}

export const getArticleStats = async () => {
  try {
    const { data: statusStats, error: statusError } = await supabase
      .from('articles')
      .select('overall_status')
    
    if (statusError) {
      console.error('Status stats query error:', statusError)
      throw statusError
    }
    
    const { data: categoryStats, error: categoryError } = await supabase
      .from('articles') 
      .select('ai_category')
      .not('ai_category', 'is', 'null')
    
    if (categoryError) {
      console.error('Category stats query error:', categoryError)
      throw categoryError
    }
    
    const { data: recentArticles, error: recentError } = await supabase
      .from('articles')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    
    if (recentError) {
      console.error('Recent articles query error:', recentError)
      throw recentError
    }
    
    return {
      statusStats: statusStats || [],
      categoryStats: categoryStats || [],
      recentCount: recentArticles?.length || 0
    }
  } catch (error) {
    console.error('Error in getArticleStats:', error)
    // 返回默认值而不是抛出错误，避免页面崩溃
    return {
      statusStats: [],
      categoryStats: [],
      recentCount: 0
    }
  }
}