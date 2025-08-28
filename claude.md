# 制造业情报系统 - 完整开发指南

## 🎯 项目概述

**全自动化制造业情报系统**：自动抓取、智能分析、深度编译制造业相关高价值情报文章，支持多渠道发布和效果追踪。

---

## 🏗️ 最终技术架构

### 核心技术栈
- **前端框架**：Astro + Franken UI
- **后端架构**：Supabase (BaaS) + Vercel Serverless Functions
- **数据库**：Supabase PostgreSQL
- **AI服务**：Jina AI + Gemini AI (已移除不稳定的Crawl4AI)
- **定时任务**：Vercel Cron Jobs
- **编辑器**：Doocs MD (计划中)
- **样式系统**：Franken UI + Tailwind CSS

### 架构模式
**简化的3阶段集成模式**：
```
Vercel Cron → 触发定时任务
    ↓
Supabase Edge Functions → 执行业务逻辑 (RSS→AI→数据库一体化)
    ↓
Supabase Database → 数据存储
    ↓
Astro Frontend → 用户界面
```

### 实际实现架构
**2层内容抓取系统**：
```
RSS源 → rss-fetch Edge Function → 文章基础数据
                     ↓
                ai-analyze Edge Function
                     ↓
              Jina AI Reader (主要) → 高质量内容抓取
                     ↓ (失败时)
              Enhanced HTML Parser (备用) → 基础内容抓取
                     ↓
              Gemini AI → 内容分析 + 实体抽取
                     ↓
              数据库更新 (articles + entities + article_entities)
```

---

## 📊 数据库设计方案

### 1. RSS源管理表
```sql
CREATE TABLE rss_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,              -- "3D Print 英文"
  url TEXT NOT NULL,                       -- RSS feed URL
  vertical_name VARCHAR(100),              -- "3D Print", "AgriTech"
  topic_for_ai VARCHAR(100),               -- AI分析用主题标签: "智能制造"
  is_active BOOLEAN DEFAULT true,          -- 是否启用抓取
  last_fetch_at TIMESTAMPTZ,               -- 最后抓取时间
  last_success_at TIMESTAMPTZ,             -- 最后成功时间
  fetch_count INTEGER DEFAULT 0,           -- 总抓取次数
  success_count INTEGER DEFAULT 0,         -- 成功次数
  error_count INTEGER DEFAULT 0,           -- 连续错误次数
  last_error TEXT,                         -- 最后错误信息
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. 文章核心表
```sql
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id INTEGER REFERENCES rss_sources(id),
  
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
  
  -- 内容抓取数据 (Jina AI / Enhanced Fallback)
  full_content TEXT,                       -- 网页正文内容
  crawl_metadata JSONB,                    -- 抓取元数据 (包含method, success, extracted_at等)
  
  -- Gemini AI分析结果
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  ai_reason TEXT,                          -- AI评分理由
  ai_category VARCHAR(50),                 -- "Core Equipment", "Supply Chain"等
  ai_summary TEXT,                         -- AI生成的中文摘要
  ai_strategic_implication TEXT,           -- 战略意义分析
  
  -- 综合状态
  overall_status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'processing', 'ready_for_review', 'reviewed', 'published'
  editor_notes TEXT,                       -- 编辑备注
  edited_title TEXT,                       -- 编辑后标题
  edited_content TEXT,                     -- 编辑后内容
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. 实体规范化表
```sql
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,              -- "氦豚科技", "计算机视觉"
  normalized_name VARCHAR(255) NOT NULL,   -- "heliumdolphin_tech", "computer_vision"
  type VARCHAR(50) NOT NULL,               -- "company", "technology", "person"
  
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
  
  confidence_score FLOAT DEFAULT 0.0,
  is_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. 文章-实体关联表
```sql
CREATE TABLE article_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  
  context TEXT,                            -- 实体在文章中的上下文
  mention_position INTEGER,                -- 在文章中的位置
  relevance_score FLOAT DEFAULT 1.0,      -- 与文章的相关度
  sentiment VARCHAR(20) DEFAULT 'neutral', -- 情感倾向
  
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  extraction_method VARCHAR(50) DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. 任务队列表
```sql
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  
  job_type VARCHAR(50) NOT NULL,           -- 'crawl_content', 'ai_analyze', 'extract_entities'
  job_data JSONB,
  status VARCHAR(20) DEFAULT 'pending',    -- 'pending', 'running', 'completed', 'failed', 'retrying'
  priority INTEGER DEFAULT 5,
  
  -- 重试机制
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  next_retry_at TIMESTAMPTZ,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  error_details JSONB,
  result_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. 编译工作台表
```sql
CREATE TABLE compilation_workbench (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id),
  
  -- 核心论点
  core_thesis TEXT NOT NULL,               -- 人工输入的核心论点
  industry_focus VARCHAR(100),             -- 聚焦行业领域
  
  -- 外部案例
  foreign_case_name VARCHAR(255),          -- 国外公司/技术/事件名称
  foreign_case_translation TEXT,          -- 新闻翻译稿或核心事实
  
  -- 中国对标案例
  chinese_benchmarks JSONB,               -- [{"name": "...", "fact": "..."}]
  
  -- 专家评论
  expert_quote TEXT,
  expert_source VARCHAR(255),
  
  -- 生成结果
  generated_title TEXT,
  generated_content TEXT,
  generation_prompt_used TEXT,
  
  status VARCHAR(20) DEFAULT 'draft',     -- 'draft', 'generating', 'completed', 'published'
  version INTEGER DEFAULT 1,
  parent_compilation_id UUID REFERENCES compilation_workbench(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);
```

### 7. 专家评论库表
```sql
CREATE TABLE expert_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_name VARCHAR(255) NOT NULL,
  expert_title VARCHAR(255),
  expert_company VARCHAR(255),
  expert_credibility_score INTEGER DEFAULT 50,
  
  quote_text TEXT NOT NULL,
  quote_context TEXT,
  original_source TEXT,
  
  industry_tags TEXT[],
  topic_tags TEXT[],
  sentiment VARCHAR(20) DEFAULT 'neutral',
  
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8. 发布渠道管理表
```sql
-- 发布渠道管理
CREATE TABLE publication_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name VARCHAR(100) NOT NULL,     -- "微信公众号", "LinkedIn"
  channel_type VARCHAR(50) NOT NULL,      -- "social_media", "newsletter", "blog"
  channel_url TEXT,
  max_length INTEGER,
  required_format VARCHAR(50),            -- "markdown", "html", "plain_text"
  style_guidelines TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文章发布记录
CREATE TABLE article_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID REFERENCES compilation_workbench(id),
  channel_id UUID REFERENCES publication_channels(id),
  published_title TEXT,
  published_content TEXT,
  published_url TEXT,
  view_count INTEGER DEFAULT 0,
  engagement_score FLOAT DEFAULT 0.0,
  publication_status VARCHAR(20) DEFAULT 'pending',
  published_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 简化业务流程 (实际实现)

### 第1阶段：RSS抓取
```
Vercel Cron → rss-fetch Edge Function → 解析RSS → 三层防重复检测 → articles表(基础字段)
```

### 第2阶段：智能内容分析 (集成化处理)
```
ai-analyze Edge Function → Jina AI内容抓取 → (失败时)Enhanced Fallback → 
Gemini AI分析 → 实体抽取 → 数据库更新(articles + entities + article_entities)
```

### 第3阶段：人工筛选
```
前端界面(/pool) → 查询ready_for_review状态文章 → 用户操作 → 更新overall_status
```

### 第4阶段：编译工作台 (计划中)
```
编辑工作台(/editor) → compilation_workbench表 → 核心论点+对标案例 → AI生成深度文章
```

### 第5阶段：多渠道发布 (计划中)
```
发布管理 → article_publications表 → 多渠道适配 → 统计反馈
```

**注**：实际实现中，第2阶段的内容抓取、AI分析、实体抽取被集成到单个ai-analyze函数中，提高了效率和稳定性。

---

## 🤖 AI Prompt 设计

### 分析Prompt (第一阶段AI分析)
```
# [SECTION 1: CONTEXT & ROLE]
You are a senior industry analyst specializing in the field of **{topic}**. Your task is to evaluate the following article based on its relevance, business value, and strategic importance *specifically for the **{topic}** industry*.

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
  "summary_for_editor": "<A 200-word summary in Chinese, written for an editor. It must highlight the core insights and actionable information relevant to the **{topic}** industry.>",
  "strategic_implication": "<A short analysis (in Chinese) of what this news *means*. Is it an opportunity, a threat, a signal of a new trend, or just noise?>"
}

# [SECTION 3: SCORING RUBRIC & DEFINITIONS]
## Base Score based on Article Type (max 50 points):
- Direct discussion of **{topic}** products or companies: 50 points.
- Discussion of adjacent technologies or supply chain for **{topic}**: 40 points.
- Discussion of market trends or business models impacting **{topic}**: 30 points.
- Macroeconomic or general technology news with indirect relevance: 10 points.
- Not relevant: 0 points.

## Bonus Multipliers (applied to the base score):
- **Actionable Signal Multiplier (max 1.5x)**: Multiply by 1.5 if the article contains strong business signals like funding, M&A, financial reports, specific sales data, or customer case studies. Multiply by 1.0 otherwise.
- **Future-Facing Multiplier (max 1.2x)**: Multiply by 1.2 if the article discusses a future trend, a new patent, or a breakthrough innovation. Multiply by 1.0 otherwise.

# [SECTION 4: ARTICLE FOR ANALYSIS]
- **Article Topic**: {topic}
- **Article Title**: {article_title}
- **Article Content**: {article_content}
```

### 编译Prompt (深度文章生成)
```
# [SECTION 1: 角色与风格 (ROLE & STYLE)]
- **角色 (Role)**: 你是一位资深的、专注于 **{行业领域}** 的中国行业分析师。你的读者是中国该领域的从业者、投资者和决策者。
- **风格 (Style)**: 你的风格犀利、深刻。你善于运用"中外对比"的视角，能用生动的商业比喻画龙点睛。你的最终目的是为中国读者揭示 **{行业领域}** 的真实机遇和挑战。

# [SECTION 2: 核心论点 (CORE THESIS) - (由人类总编辑输入)]
- **核心论点 (Core Thesis)**: "{在此处输入你希望这篇文章传达的核心观点，这将是AI全文的灵魂}"

# [SECTION 3: 输入情报 (INPUT DATA) - (结构化的信息输入)]
{
  "foreign_case": {
    "subject_name": "{国外公司/技术/事件的名称}",
    "news_translation": "{关于该主体的原始新闻翻译稿或核心事实}"
  },
  "chinese_benchmarks": [
    { 
      "name": "{国内对标案例1的名称}", 
      "fact": "{关于案例1的一个正面、可对比的事实}" 
    }
  ],
  "expert_quote_suggestion": "[专家评论或观点]"
}

# [SECTION 4: 任务指令 (TASK) - (分析思维链与文章生成)]
请根据以上的"核心论点"和"输入情报"，严格遵循以下"分析思维链"，为我创作一篇完整的深度分析文章。

1. **第一步：构思标题**: 基于"核心论点"，创作一个具有强烈对比感和吸引力的标题。
2. **第二步：引子 (The Hook)**: 从"输入情报"中的`foreign_case`切入。
3. **第三步：分析外部动态**: 深入分析`foreign_case`背后的原因。
4. **第四步：聚焦内部视角**: 立刻将视角转回中国。`chinese_benchmarks`中的这些案例分析。
5. **第五步：探究深层原因**: 综合对比内外部案例的根本差异。
6. **第六步：展望未来**: 回到并升华"核心论点"。
7. **最终交付**: 将以上所有思考，融合成一篇结构完整的深度好文。
```

---

## 🌐 前端页面架构

### 页面路由设计
```
/dashboard       - 主页 (运营概览)
/pool           - 文章池 (智能筛选)
/editor         - 编辑桌 (深度创作)  
/thesituationroom - 分析室 (战略分析)
/sources        - 源管理 (源头管理)
```

### 页面功能映射

#### `/dashboard` - 运营概览
- **数据需求**：今日文章数、待审核数、平均AI评分、RSS源状态、任务处理状态
- **UI组件**：统计卡片、处理流程监控、异常告警
- **关键查询**：实时统计、RSS源健康、任务状态

#### `/pool` - 智能筛选
- **数据需求**：文章列表、AI评分、实体标签、来源信息
- **UI组件**：文章卡片、筛选器、排序控件、批量操作
- **交互功能**：采用/忽略、标签筛选、评分排序

#### `/editor` - 深度创作
- **数据需求**：已采用文章、编译工作台数据、对标案例、专家评论
- **UI组件**：Doocs MD编辑器、编译工作台、版本历史
- **核心功能**：深度文章生成、多渠道发布

#### `/thesituationroom` - 战略分析
- **数据需求**：实体关系、趋势数据、中外对比、垂直领域分析
- **UI组件**：关系图谱、趋势图表、对比看板
- **分析维度**：热门实体、垂直领域、对标分析

#### `/sources` - 源头管理
- **数据需求**：RSS源列表、性能统计、错误信息
- **UI组件**：源列表、性能监控、错误诊断
- **管理功能**：CRUD操作、批量导入、健康监控

---

## 🔧 环境变量配置

### 必需环境变量
```bash
# Supabase 连接
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGc...

# AI 服务
GEMINI_API_KEY=AIzaSyC...
GEMINI_MODEL=gemini-2.5-flash  # 实际使用的模型
JINA_API_KEY=jina_...          # Jina AI Reader API密钥

# 应用配置
NODE_ENV=development
BASE_URL=http://localhost:4321

# 安全
CRON_SECRET=random-secret-for-cron-validation
```

### 可选环境变量
```bash
# 第三方AI服务 (增强功能)
ANTHROPIC_BASE_URL=https://api.tu-zi.com/v1
ANTHROPIC_AUTH_TOKEN=sk-...

# 监控
SENTRY_DSN=https://your-sentry-dsn

# 数据库直连
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
```

---

## 🎯 关键算法实现

### URL标准化函数
```javascript
function normalizeUrl(url) {
  const urlObj = new URL(url)
  
  // 移除跟踪参数
  const trackingParams = [
    'utm_source', 'utm_medium', 'utm_campaign', 
    'fbclid', 'gclid', 'ref', 'source'
  ]
  
  trackingParams.forEach(param => {
    urlObj.searchParams.delete(param)
  })
  
  urlObj.hash = ''
  return urlObj.toString().toLowerCase()
}
```

### 三层防重复检测
```javascript
async function checkDuplicate(article, sourceId) {
  // 第一层：GUID检测（最可靠）
  if (article.guid) {
    const existing = await supabase
      .from('articles')
      .select('id')
      .eq('source_id', sourceId)
      .eq('guid', article.guid)
    if (existing.data?.length > 0) return existing.data[0].id
  }
  
  // 第二层：标准化URL检测
  const normalizedUrl = normalizeUrl(article.link)
  const urlCheck = await supabase
    .from('articles')
    .select('id')
    .eq('source_id', sourceId)
    .eq('normalized_url', normalizedUrl)
  if (urlCheck.data?.length > 0) return urlCheck.data[0].id
  
  // 第三层：标题哈希检测（兜底）
  const titleHash = crypto.createHash('sha256')
    .update(article.title.trim().toLowerCase())
    .digest('hex')
  const titleCheck = await supabase
    .from('articles')
    .select('id')
    .eq('source_id', sourceId)
    .eq('title_hash', titleHash)
  if (titleCheck.data?.length > 0) return titleCheck.data[0].id
  
  return null
}
```

### 编译工作台数据准备
```javascript
async function prepareCompilationData(articleId) {
  // 获取基础文章和AI分析结果
  const article = await supabase
    .from('articles')
    .select(`
      *,
      rss_sources(vertical_name, topic_for_ai),
      article_entities!inner(
        entities(name, type, entity_region, is_benchmark_case)
      )
    `)
    .eq('id', articleId)
    .single()
  
  // 自动推荐中国对标案例
  const chineseBenchmarks = await supabase
    .from('entities')
    .select('name, benchmark_description')
    .eq('entity_region', 'China')
    .eq('is_benchmark_case', true)
    .in('benchmark_category', [article.ai_category])
    .limit(3)
  
  // 推荐相关专家评论
  const expertQuotes = await supabase
    .from('expert_quotes')
    .select('*')
    .contains('industry_tags', [article.rss_sources.vertical_name])
    .order('usage_count', { ascending: false })
    .limit(5)
  
  return {
    article,
    suggestedBenchmarks: chineseBenchmarks.data,
    suggestedQuotes: expertQuotes.data
  }
}
```

---

## 📋 开发优先级

### Phase 1 - 核心基础 (MVP) ✅ **基本完成**
1. **数据库建表** - ✅ 创建完整表结构和索引
2. **RSS抓取** - ✅ 实现Edge Function抓取和存储，三层防重复
3. **AI分析** - ✅ 集成Jina AI + Gemini AI，实体抽取，2层抓取系统
4. **任务队列** - ✅ 集成化处理，无需复杂队列系统
5. **文章池界面** - ✅ 基础的筛选和操作功能 (Astro + Franken UI)

### Phase 2 - 编辑功能
1. **编译工作台** - 深度文章生成界面
2. **Doocs MD集成** - 编辑器功能
3. **对标案例管理** - 中外对比功能
4. **专家评论库** - 可复用内容管理

### Phase 3 - 分析和管理
1. **分析室界面** - 数据可视化和趋势分析
2. **源管理界面** - RSS源CRUD和监控
3. **主页仪表盘** - 运营概览和统计
4. **发布渠道** - 多平台发布管理

### Phase 4 - 优化和扩展
1. **性能优化** - 查询优化和缓存策略
2. **监控告警** - 错误处理和通知机制
3. **数据清理** - 自动归档和清理策略
4. **高级分析** - 更丰富的数据洞察功能

---

## ⚠️ 重要注意事项

### 数据完整性
- 严格按照三层防重复策略实现
- 确保所有外键关系正确建立
- 实现proper的级联删除策略

### 错误处理
- 所有API调用必须有完整的错误处理
- 实现指数退避重试机制
- 记录详细的错误日志用于调试

### 性能考虑
- 为高频查询字段建立索引
- 实现适当的分页和限制
- 考虑大数据量时的分区策略

### 安全措施
- 使用Row Level Security (RLS)
- 验证所有用户输入
- 保护敏感的API密钥

---

## 📁 项目目录结构

```
制造业情报系统/
├── 📄 README.md                    # 项目介绍
├── 📄 claude.md                    # 完整技术规格文档 (本文档)
├── 📄 PROJECT_STRUCTURE.md         # 项目结构详细说明
├── 📄 package.json                 # 前端依赖配置
├── 📄 astro.config.mjs             # Astro前端配置
├── 📄 tailwind.config.mjs          # Tailwind样式配置
├── 📄 tsconfig.json                # TypeScript配置
├── 📄 vercel.json                  # Vercel部署配置
├── 📄 .env                         # 环境变量(本地开发)
│
├── 📁 src/                         # 前端源代码
│   ├── 📁 components/              # Astro组件
│   │   ├── ArticleCard.astro       # 文章卡片组件
│   │   └── FilterPanel.astro       # 筛选面板组件
│   ├── 📁 layouts/                 # 页面布局
│   │   └── Layout.astro            # 基础布局模板
│   ├── 📁 pages/                   # 页面路由
│   │   ├── index.astro             # 首页
│   │   ├── pool.astro              # 文章池页面
│   │   ├── editor.astro            # 编辑桌页面
│   │   └── thesituationroom.astro  # 分析室页面
│   ├── 📁 lib/                     # 工具库
│   │   └── supabase.ts             # Supabase客户端和类型定义
│   └── 📄 env.d.ts                 # 环境变量类型
│
├── 📁 supabase/                    # Supabase Edge Functions
│   └── 📁 functions/               
│       ├── 📁 ai-analyze/          # AI分析函数 (Jina AI + Gemini AI)
│       │   └── index.ts            # 内容抓取、AI分析、实体抽取一体化
│       ├── 📁 rss-fetch/           # RSS抓取函数
│       │   └── index.ts            # RSS解析、防重复、任务创建
│       └── 📁 job-processor/       # 任务处理函数(未来扩展)
│           └── index.ts            # 预留：复杂任务队列处理
│
├── 📁 database/                    # 数据库相关
│   ├── 📁 scripts/                 # 建表脚本
│   │   ├── database-setup.sql      # 核心8表建表脚本
│   │   └── checkpoint-1.1-verification.sql # 数据库验证脚本
│   ├── 📁 migrations/              # 数据库迁移(预留)
│   └── 📁 seeds/                   # 初始数据
│       └── import-rss-sources.sql  # RSS源初始数据导入
│
├── 📁 scripts/                     # 项目脚本
│   ├── 📁 deployment/              # 部署脚本
│   │   ├── deploy-ai-analyze.sh    # 单个函数部署
│   │   └── deploy-all-functions.sh # 所有函数部署
│   └── 📁 testing/                 # 测试脚本
│       ├── test-all-functions.sh   # 完整工作流程测试
│       ├── test-fixed-functions.sh # 修复后功能测试
│       └── test-jina-integration.sh # Jina AI集成测试
│
├── 📁 vercel/                      # Vercel相关
│   └── 📁 api/                     # Vercel API endpoints
│       ├── rss-cron.js             # RSS抓取定时任务触发器
│       └── job-processor-cron.js   # 任务处理定时触发器
│
├── 📁 docs/                        # 项目文档
│   ├── 📄 开发计划与检查点.md        # 开发进度跟踪
│   ├── 📄 业务细节.md               # 业务需求详情
│   └── 📄 数据库设计优化.md          # 数据库设计文档
│
└── 📁 legacy_data/                 # 历史数据
    ├── articles_rows.csv           # 文章数据备份
    └── rss_sources-old_rows.csv    # RSS源历史数据
```

---

## 🚀 快速开始指南

### 1. 环境搭建
```bash
# 克隆项目
git clone <repository-url>
cd manufacturing-intelligence-system

# 安装前端依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入实际的API密钥
```

### 2. 数据库初始化
```sql
-- 在Supabase控制台执行
-- 1. 建表脚本
source database/scripts/database-setup.sql

-- 2. 导入RSS源数据
source database/seeds/import-rss-sources.sql

-- 3. 验证数据库结构
source database/scripts/checkpoint-1.1-verification.sql
```

### 3. 部署Edge Functions
```bash
# 部署所有Edge Functions
cd scripts/deployment
./deploy-all-functions.sh

# 或单独部署
./deploy-ai-analyze.sh
```

### 4. 测试系统功能
```bash
# 完整工作流程测试
cd scripts/testing
./test-all-functions.sh
```

### 5. 启动前端开发
```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:4321
# - /pool: 文章池页面
# - /editor: 编辑桌页面
# - /thesituationroom: 分析室页面
```

---

## 🔄 当前系统状态

### ✅ **已完成功能**
1. **数据库架构** - 8张核心表，完整的关系设计
2. **RSS抓取系统** - 三层防重复，批量处理，错误处理
3. **AI分析系统** - Jina AI + Gemini AI，2层内容抓取，实体抽取
4. **前端基础框架** - Astro + Franken UI，文章池页面
5. **部署和测试脚本** - 一键部署，完整测试覆盖

### 🚧 **开发中功能**
1. **编辑工作台** - 深度文章生成界面
2. **分析室** - 数据可视化和趋势分析
3. **源管理界面** - RSS源CRUD和监控

### 📋 **计划功能**
1. **多渠道发布** - 微信公众号、LinkedIn等平台集成
2. **专家评论库** - 可复用专家观点管理
3. **高级分析** - 实体关系图谱，行业趋势预测

---

**这个文档包含了项目的完整技术规格和实际实现状态。项目结构已经过重新整理，代码质量稳定，核心功能已验证可用。请在开发过程中始终参考这个最新文档！**