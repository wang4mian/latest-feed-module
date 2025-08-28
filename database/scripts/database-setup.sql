-- =====================================================
-- 制造业情报系统 - 数据库建表脚本
-- 执行顺序：严格按照依赖关系执行
-- =====================================================

-- 1. RSS源管理表 (基础表，无依赖)
CREATE TABLE rss_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,              -- "3D Print 英文"
  url TEXT NOT NULL UNIQUE,                -- RSS feed URL，必须唯一
  vertical_name VARCHAR(100),              -- "3D Print", "AgriTech"
  topic_for_ai VARCHAR(100),               -- AI分析用主题标签: "智能制造"
  
  -- 状态控制
  is_active BOOLEAN DEFAULT true,          -- 是否启用抓取
  
  -- 抓取统计
  last_fetch_at TIMESTAMPTZ,               -- 最后抓取时间
  last_success_at TIMESTAMPTZ,             -- 最后成功时间
  fetch_count INTEGER DEFAULT 0,           -- 总抓取次数
  success_count INTEGER DEFAULT 0,         -- 成功次数
  error_count INTEGER DEFAULT 0,           -- 连续错误次数
  last_error TEXT,                         -- 最后错误信息
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSS源管理表索引
CREATE INDEX idx_rss_sources_active ON rss_sources(is_active);
CREATE INDEX idx_rss_sources_vertical ON rss_sources(vertical_name);
CREATE INDEX idx_rss_sources_error_count ON rss_sources(error_count) WHERE error_count > 0;

-- 2. 文章核心表 (依赖rss_sources)
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id INTEGER REFERENCES rss_sources(id) ON DELETE CASCADE,
  
  -- 三层防重复策略
  guid TEXT,                               -- RSS的<guid>，最可靠
  normalized_url TEXT,                     -- 清理后的URL，作为备用
  title_hash VARCHAR(64),                  -- 标题的SHA256，兜底方案
  
  -- RSS原始数据
  title TEXT NOT NULL,
  link TEXT NOT NULL,                      -- 保留原始URL
  description TEXT,
  author VARCHAR(255),
  pub_date TIMESTAMPTZ,
  
  -- Crawl4AI抓取数据
  full_content TEXT,                       -- 网页正文内容
  crawl_metadata JSONB,                    -- 抓取元数据
  
  -- Gemini AI分析结果
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  ai_reason TEXT,                          -- AI评分理由
  ai_category VARCHAR(50),                 -- "Core Equipment", "Supply Chain"等
  ai_summary TEXT,                         -- AI生成的中文摘要
  ai_strategic_implication TEXT,           -- 战略意义分析
  
  -- 综合状态
  overall_status VARCHAR(20) DEFAULT 'draft' 
    CHECK (overall_status IN ('draft', 'processing', 'ready_for_review', 'reviewed', 'published')),
  editor_notes TEXT,                       -- 编辑备注
  edited_title TEXT,                       -- 编辑后标题
  edited_content TEXT,                     -- 编辑后内容
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 防重复复合索引 (按优先级顺序)
CREATE UNIQUE INDEX idx_articles_dedup_primary 
  ON articles(source_id, guid) 
  WHERE guid IS NOT NULL AND guid != '';

CREATE UNIQUE INDEX idx_articles_dedup_secondary 
  ON articles(source_id, normalized_url) 
  WHERE guid IS NULL AND normalized_url IS NOT NULL AND normalized_url != '';

CREATE UNIQUE INDEX idx_articles_dedup_fallback 
  ON articles(source_id, title_hash) 
  WHERE guid IS NULL AND normalized_url IS NULL AND title_hash IS NOT NULL;

-- 业务查询索引
CREATE INDEX idx_articles_status ON articles(overall_status);
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX idx_articles_ai_score ON articles(ai_score DESC) WHERE ai_score IS NOT NULL;
CREATE INDEX idx_articles_source ON articles(source_id);
CREATE INDEX idx_articles_updated_at ON articles(updated_at DESC);

-- 3. 实体规范化表 (独立表，无依赖)
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,              -- "氦豚科技", "计算机视觉"
  normalized_name VARCHAR(255) NOT NULL,   -- "heliumdolphin_tech", "computer_vision"
  type VARCHAR(50) NOT NULL CHECK (type IN ('company', 'technology', 'person')),
  
  -- 实体元数据
  description TEXT,
  wikipedia_url TEXT,
  official_website TEXT,
  industry VARCHAR(100),
  country VARCHAR(50),
  
  -- 统计数据
  mention_count INTEGER DEFAULT 0,
  first_mentioned_at TIMESTAMPTZ,
  last_mentioned_at TIMESTAMPTZ,
  
  -- 对比分析支持
  entity_region VARCHAR(50),              -- 'China', 'US', 'EU', 'Global'
  is_benchmark_case BOOLEAN DEFAULT false, -- 是否为对标案例
  benchmark_category VARCHAR(100),        -- 对标类别
  benchmark_description TEXT,             -- 对标描述
  
  -- 置信度和验证
  confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  is_verified BOOLEAN DEFAULT false,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 实体表索引
CREATE UNIQUE INDEX idx_entities_unique 
  ON entities(normalized_name, type);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_mention_count ON entities(mention_count DESC);
CREATE INDEX idx_entities_benchmark ON entities(is_benchmark_case, entity_region, type);
CREATE INDEX idx_entities_region ON entities(entity_region) WHERE entity_region IS NOT NULL;

-- 4. 文章-实体关联表 (依赖articles和entities)
CREATE TABLE article_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  
  -- 关联上下文
  context TEXT,                            -- 实体在文章中的上下文
  mention_position INTEGER,                -- 在文章中的位置
  relevance_score FLOAT DEFAULT 1.0 CHECK (relevance_score >= 0.0 AND relevance_score <= 1.0),
  sentiment VARCHAR(20) DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  
  -- 元数据
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  extraction_method VARCHAR(50) DEFAULT 'ai' CHECK (extraction_method IN ('ai', 'manual', 'rule_based')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文章-实体关联表索引
CREATE UNIQUE INDEX idx_article_entities_unique 
  ON article_entities(article_id, entity_id);
CREATE INDEX idx_article_entities_article ON article_entities(article_id);
CREATE INDEX idx_article_entities_entity ON article_entities(entity_id);
CREATE INDEX idx_article_entities_score ON article_entities(relevance_score DESC);
CREATE INDEX idx_article_entities_method ON article_entities(extraction_method);

-- 5. 任务队列表 (依赖articles)
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  
  -- 任务定义
  job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('crawl_content', 'ai_analyze', 'extract_entities')),
  job_data JSONB DEFAULT '{}',
  
  -- 状态管理
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  
  -- 重试机制
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  next_retry_at TIMESTAMPTZ,
  
  -- 执行信息
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  error_details JSONB,
  result_data JSONB,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 任务队列表索引
CREATE INDEX idx_jobs_status_priority ON processing_jobs(status, priority, created_at);
CREATE INDEX idx_jobs_article_type ON processing_jobs(article_id, job_type);
CREATE INDEX idx_jobs_retry ON processing_jobs(next_retry_at) WHERE status = 'retrying';
CREATE INDEX idx_jobs_type_status ON processing_jobs(job_type, status);
CREATE INDEX idx_jobs_created_at ON processing_jobs(created_at DESC);

-- 6. 编译工作台表 (依赖articles)
CREATE TABLE compilation_workbench (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  
  -- 核心论点
  core_thesis TEXT NOT NULL,               -- 人工输入的核心论点
  industry_focus VARCHAR(100),             -- 聚焦行业领域
  
  -- 外部案例
  foreign_case_name VARCHAR(255),          -- 国外公司/技术/事件名称
  foreign_case_translation TEXT,          -- 新闻翻译稿或核心事实
  
  -- 中国对标案例 (JSONB存储数组)
  chinese_benchmarks JSONB DEFAULT '[]',  -- [{"name": "...", "fact": "..."}]
  
  -- 专家评论
  expert_quote TEXT,                       -- 专家评论建议
  expert_source VARCHAR(255),              -- 专家来源
  
  -- 生成结果
  generated_title TEXT,                    -- AI生成的标题
  generated_content TEXT,                  -- AI生成的完整文章
  generation_prompt_used TEXT,            -- 使用的完整prompt
  
  -- 状态管理
  status VARCHAR(20) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'generating', 'completed', 'published')),
  
  -- 版本控制
  version INTEGER DEFAULT 1,              -- 文章版本
  parent_compilation_id UUID REFERENCES compilation_workbench(id), -- 父版本引用
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_at TIMESTAMPTZ,               -- AI生成完成时间
  published_at TIMESTAMPTZ                -- 发布时间
);

-- 编译工作台表索引
CREATE INDEX idx_compilation_article ON compilation_workbench(article_id);
CREATE INDEX idx_compilation_status ON compilation_workbench(status);
CREATE INDEX idx_compilation_version ON compilation_workbench(article_id, version);
CREATE INDEX idx_compilation_created_at ON compilation_workbench(created_at DESC);

-- 7. 专家评论库表 (独立表)
CREATE TABLE expert_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 专家信息
  expert_name VARCHAR(255) NOT NULL,
  expert_title VARCHAR(255),              -- 职位头衔
  expert_company VARCHAR(255),            -- 所属机构
  expert_credibility_score INTEGER DEFAULT 50 CHECK (expert_credibility_score >= 0 AND expert_credibility_score <= 100),
  
  -- 评论内容
  quote_text TEXT NOT NULL,
  quote_context TEXT,                     -- 评论背景
  original_source TEXT,                   -- 原始来源
  
  -- 分类标签
  industry_tags TEXT[] DEFAULT '{}',      -- 行业标签
  topic_tags TEXT[] DEFAULT '{}',        -- 主题标签
  sentiment VARCHAR(20) DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  
  -- 使用统计
  usage_count INTEGER DEFAULT 0,         -- 被引用次数
  last_used_at TIMESTAMPTZ,              -- 最后使用时间
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 专家评论库表索引
CREATE INDEX idx_expert_quotes_industry ON expert_quotes USING GIN (industry_tags);
CREATE INDEX idx_expert_quotes_topic ON expert_quotes USING GIN (topic_tags);
CREATE INDEX idx_expert_quotes_expert ON expert_quotes(expert_name);
CREATE INDEX idx_expert_quotes_usage ON expert_quotes(usage_count DESC);

-- 8. 发布渠道管理表 (独立表)
CREATE TABLE publication_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 渠道信息
  channel_name VARCHAR(100) NOT NULL UNIQUE,  -- "微信公众号", "LinkedIn"
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('social_media', 'newsletter', 'blog', 'website')),
  channel_url TEXT,                       -- 渠道链接
  
  -- 格式要求
  max_length INTEGER,                     -- 最大字符数限制
  required_format VARCHAR(50) CHECK (required_format IN ('markdown', 'html', 'plain_text')),
  style_guidelines TEXT,                  -- 样式指南
  
  -- 状态
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 发布渠道管理表索引
CREATE INDEX idx_publication_channels_active ON publication_channels(is_active);
CREATE INDEX idx_publication_channels_type ON publication_channels(channel_type);

-- 9. 文章发布记录表 (依赖compilation_workbench和publication_channels)
CREATE TABLE article_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID REFERENCES compilation_workbench(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES publication_channels(id) ON DELETE CASCADE,
  
  -- 发布内容
  published_title TEXT,                   -- 发布时使用的标题
  published_content TEXT,                 -- 发布时使用的内容
  published_url TEXT,                     -- 发布后的URL
  
  -- 统计数据
  view_count INTEGER DEFAULT 0,
  engagement_score FLOAT DEFAULT 0.0 CHECK (engagement_score >= 0.0),
  
  -- 状态
  publication_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (publication_status IN ('pending', 'published', 'failed')),
  
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文章发布记录表索引
CREATE INDEX idx_article_publications_compilation ON article_publications(compilation_id);
CREATE INDEX idx_article_publications_channel ON article_publications(channel_id);
CREATE INDEX idx_article_publications_status ON article_publications(publication_status);
CREATE INDEX idx_article_publications_published_at ON article_publications(published_at DESC);
CREATE UNIQUE INDEX idx_article_publications_unique ON article_publications(compilation_id, channel_id);

-- =====================================================
-- 触发器：自动更新updated_at字段
-- =====================================================

-- 创建通用的updated_at触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表添加updated_at触发器
CREATE TRIGGER update_articles_updated_at 
    BEFORE UPDATE ON articles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entities_updated_at 
    BEFORE UPDATE ON entities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at 
    BEFORE UPDATE ON processing_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compilation_workbench_updated_at 
    BEFORE UPDATE ON compilation_workbench 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_quotes_updated_at 
    BEFORE UPDATE ON expert_quotes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 数据完整性验证视图
-- =====================================================

-- 创建文章处理状态视图
CREATE VIEW article_processing_status AS
SELECT 
  a.id,
  a.title,
  a.overall_status,
  a.created_at,
  a.ai_score,
  rs.name as source_name,
  rs.vertical_name,
  -- 任务状态汇总
  COALESCE(
    jsonb_object_agg(j.job_type, j.status) FILTER (WHERE j.job_type IS NOT NULL), 
    '{}'::jsonb
  ) as job_statuses,
  -- 实体数量
  COUNT(DISTINCT ae.entity_id) as entity_count
FROM articles a
JOIN rss_sources rs ON a.source_id = rs.id
LEFT JOIN processing_jobs j ON a.id = j.article_id
LEFT JOIN article_entities ae ON a.id = ae.article_id
GROUP BY a.id, a.title, a.overall_status, a.created_at, a.ai_score, rs.name, rs.vertical_name;

-- 创建系统统计视图  
CREATE VIEW system_statistics AS
SELECT 
  'articles_total' as metric_name,
  COUNT(*)::text as metric_value,
  NOW() as calculated_at
FROM articles
UNION ALL
SELECT 
  'articles_today' as metric_name,
  COUNT(*)::text as metric_value,
  NOW() as calculated_at
FROM articles 
WHERE created_at >= CURRENT_DATE
UNION ALL
SELECT 
  'rss_sources_active' as metric_name,
  COUNT(*)::text as metric_value,
  NOW() as calculated_at
FROM rss_sources 
WHERE is_active = true
UNION ALL
SELECT 
  'jobs_pending' as metric_name,
  COUNT(*)::text as metric_value,
  NOW() as calculated_at
FROM processing_jobs 
WHERE status = 'pending';

-- =====================================================
-- 建表完成提示
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE '数据库表结构创建完成！';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '已创建的表:';
    RAISE NOTICE '1. rss_sources (RSS源管理)';
    RAISE NOTICE '2. articles (文章核心表)';
    RAISE NOTICE '3. entities (实体规范化表)';
    RAISE NOTICE '4. article_entities (文章-实体关联表)';
    RAISE NOTICE '5. processing_jobs (任务队列表)';
    RAISE NOTICE '6. compilation_workbench (编译工作台表)';
    RAISE NOTICE '7. expert_quotes (专家评论库表)';
    RAISE NOTICE '8. publication_channels (发布渠道管理表)';
    RAISE NOTICE '9. article_publications (文章发布记录表)';
    RAISE NOTICE '';
    RAISE NOTICE '已创建的视图:';
    RAISE NOTICE '- article_processing_status';
    RAISE NOTICE '- system_statistics';
    RAISE NOTICE '';
    RAISE NOTICE '请运行验证脚本检查表结构完整性！';
    RAISE NOTICE '==============================================';
END $$;