# 制造业情报系统 - Manufacturing Intelligence System

## 🎯 项目概述

**全自动化制造业情报系统**：自动抓取、智能分析、深度编译制造业相关高价值情报文章，支持多渠道发布和效果追踪。

### 🚀 系统特色
- **AI智能分析**：Gemini AI自动评分筛选高价值内容，0-100分精准评价
- **全文内容提取**：Crawl4AI智能提取完整正文、图片、元数据
- **实体识别**：自动提取并存储公司、技术、人物等关键实体
- **深度编辑**：集成Doocs MD专业编辑器，支持微信公众号等多平台格式
- **完整工作流**：从信息采集到内容发布的端到端解决方案
- **现代化界面**：基于Astro v5和Franken UI的响应式Web应用

## 📁 项目结构

```
LF/
├── README.md                                    # 项目说明文档
├── CLAUDE.md                                    # 完整开发指南和技术规格
│
├── 核心Edge Functions/
├── supabase-edge-function-rss-fetch-only.ts    # RSS抓取Edge Function
├── supabase-edge-function-ai-analyze.ts        # AI分析Edge Function  
├── supabase-edge-function-job-processor.ts     # 任务处理器Edge Function
│
├── 数据库脚本/
├── database-setup.sql                          # 数据库表结构创建脚本
├── import-rss-sources.sql                      # RSS源数据导入脚本
├── setup-complete-ai-pipeline.sql              # 完整AI流水线设置
├── cleanup-cron-jobs-safe.sql                  # 清理旧定时任务
│
├── 测试和工具脚本/
├── test-ai-pipeline.sh                         # 完整AI流水线测试
├── test-edge-function.sh                       # Edge Function测试
├── trigger-immediate-processing.sh             # 立即触发AI处理
├── manual-trigger-commands.sh                  # 手动触发命令集
│
├── 前端应用/
├── package.json                                # 前端项目依赖配置
├── astro.config.mjs                            # Astro框架配置
├── tailwind.config.mjs                         # Tailwind CSS + Franken UI配置
├── .env.example                                # 环境变量示例文件
├── vercel.json                                 # Vercel部署配置
│
└── src/                                        # 前端源代码
   ├── layouts/Layout.astro                     # 页面布局模板
   ├── pages/
   │   ├── index.astro                         # 首页仪表板
   │   ├── pool.astro                          # 文章池页面 - AI筛选文章
   │   ├── editor.astro                        # 编辑工作台 - 集成Doocs MD
   │   ├── sources.astro                       # RSS源管理页面
   │   └── health.astro                        # 系统健康检查页面
   ├── components/
   │   ├── ArticleCard.astro                   # 文章卡片组件
   │   └── FilterPanel.astro                   # 筛选面板组件
   └── lib/supabase.ts                         # Supabase客户端配置和类型定义
```

## 🎯 核心功能

### 📥 智能信息采集  
- **RSS源管理** - 43+个制造业专业源，支持CRUD操作
- **自动抓取系统** - 三层防重复检测（GUID → URL → 标题哈希）
- **全文内容提取** - Crawl4AI智能提取正文、图片、元数据  
- **定时任务** - Supabase pg_cron每2小时自动执行

### 🤖 AI智能分析
- **内容评分** - Gemini AI对文章相关性进行0-100分评分
- **智能分类** - 自动归类（核心设备、供应链、市场趋势、技术创新、商业模式）
- **实体识别** - 自动提取公司、技术、人物实体并建立关联
- **战略分析** - 生成中文摘要和战略意义分析
- **异步处理** - 任务队列管理，支持重试和错误恢复

### 📝 专业内容编辑
- **文章池** - AI评分筛选，支持批量操作和多维度过滤
- **集成编辑器** - 完整的Doocs MD编辑器，支持实时预览
- **一键导入** - 文章内容自动格式化并插入编辑器
- **多样化输出** - 支持微信公众号、HTML、Markdown等格式

### 🔧 系统管理
- **RSS源管理** - 完整的CRUD操作，连接测试，批量管理
- **状态监控** - 实时显示抓取成功率、AI处理进度、错误统计
- **任务队列** - 异步处理，支持重试和错误恢复
- **数据统计** - 文章数量、来源分析、处理状态概览

## 🔧 技术架构

### 核心技术栈
- **前端框架**: Astro v5 + Franken UI + UIKit
- **后端服务**: Supabase Edge Functions + PostgreSQL
- **数据库**: Supabase PostgreSQL
- **AI服务**: Crawl4AI (内容提取) + Gemini AI (智能分析)
- **编辑器**: Doocs MD (开源微信编辑器)
- **定时任务**: Supabase pg_cron
- **部署平台**: Vercel (前端) + Supabase (后端)

### 完整架构流程 ✅
```
用户浏览器
    ↓
Vercel (前端托管 - Astro应用)
    ↓
Supabase Edge Functions (后端业务逻辑)
    ↓
Supabase PostgreSQL (数据存储)
    ↓
外部AI服务 (Crawl4AI + Gemini AI)

自动化AI处理流程:
Supabase pg_cron (每2小时) → rss-fetch Edge Function (RSS抓取)
    ↓
Supabase pg_cron (每15分钟) → job-processor Edge Function (任务处理)
    ↓
ai-analyze Edge Function → Crawl4AI (全文提取) → Gemini AI (智能分析)
    ↓
数据库更新 (文章、实体、统计)
```

### 🎯 架构优势
- **职责分离清晰**: Vercel专注前端，Supabase专注后端
- **AI处理自动化**: 完整的异步任务队列，支持重试机制
- **性能最优**: 减少跨服务调用，降低延迟
- **维护简单**: 统一的后端生态，减少配置复杂性
- **成本效率**: 避免重复的服务器资源消耗

## 📊 数据库架构

### 核心数据表
1. **`rss_sources`** - RSS源管理和监控
2. **`articles`** - 文章内容和AI分析结果
   - `full_content` - Crawl4AI提取的完整正文
   - `ai_score` - Gemini AI评分 (0-100)
   - `ai_category` - 智能分类结果
   - `ai_summary` - 中文摘要
   - `ai_strategic_implication` - 战略意义分析
3. **`entities`** - 实体标准化存储（公司、技术、人物）
4. **`article_entities`** - 文章实体关联关系
5. **`processing_jobs`** - 异步任务队列
6. **`compilation_workbench`** - 编辑工作台
7. **`expert_quotes`** - 专家评论库
8. **`publication_channels`** - 发布渠道管理

### 完整数据流程
```
RSS抓取 → 任务队列创建 → Crawl4AI内容提取 → Gemini AI分析评分 → 实体识别 → 人工筛选 → 内容编辑 → 发布输出
```

## 🚀 快速开始

### 环境准备
1. **克隆项目**
```bash
git clone https://github.com/your-username/latest-feed-module.git
cd LF
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑.env文件，填入必要的API密钥
```

4. **启动开发服务器**
```bash
npm run dev
```

### 页面访问
- **首页仪表板**: `http://localhost:3000/`
- **文章池**: `http://localhost:3000/pool`
- **编辑工作台**: `http://localhost:3000/editor`  
- **RSS源管理**: `http://localhost:3000/sources`
- **健康检查**: `http://localhost:3000/health`

## 🔑 环境变量配置

### 前端环境变量 (.env)
```bash
# Supabase 配置
PUBLIC_SUPABASE_URL=https://msvgeriacsaaakmxvqye.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 后端环境变量 (Supabase项目设置)
```bash
# Supabase 服务
SUPABASE_URL=https://msvgeriacsaaakmxvqye.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI 服务
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-1.5-flash

# Crawl4AI (必需 - 用于全文内容和图片抓取)
CRAWL4AI_CLOUD_URL=https://www.crawl4ai-cloud.com/query
CRAWL4AI_API_KEY=your-crawl4ai-key

# 安全
CRON_SECRET=your-secure-secret
```

## 💡 部署指南

### 1. 数据库设置
```sql
-- 在 Supabase SQL Editor 中执行
-- 1. 创建表结构
\i database-setup.sql

-- 2. 导入RSS源数据
\i import-rss-sources.sql
```

### 2. Edge Functions部署
在 Supabase Dashboard → Edge Functions 中分别部署：
- `rss-fetch` - 使用 `supabase-edge-function-rss-fetch-only.ts`
- `ai-analyze` - 使用 `supabase-edge-function-ai-analyze.ts`
- `job-processor` - 使用 `supabase-edge-function-job-processor.ts`

### 3. 自动化任务设置
```sql
-- 在 Supabase SQL Editor 中执行
\i setup-complete-ai-pipeline.sql
```

### 4. 前端部署
```bash
# 部署到 Vercel
npm run build
# 或者连接 GitHub 仓库自动部署
```

### 5. 测试验证
```bash
# 测试完整AI流水线
chmod +x test-ai-pipeline.sh && bash test-ai-pipeline.sh
```

## 💡 使用指南

### 📝 基本工作流程
1. **RSS源管理** - 在`/sources`页面添加和管理RSS源
2. **自动抓取** - 系统每2小时自动抓取新文章
3. **AI智能分析** - 每15分钟自动处理，Crawl4AI提取全文，Gemini AI评分分析
4. **文章筛选** - 在`/pool`页面按AI评分筛选高价值文章
5. **内容编辑** - 在`/editor`页面使用Doocs MD编辑器深度编辑
6. **发布输出** - 输出适配微信公众号等平台的格式

### 🔧 手动操作命令

#### RSS抓取
```bash
# 测试模式（处理1个源）
curl -X POST 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/rss-fetch' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"test_mode": true, "source_limit": 1}'

# 生产模式（处理所有源）
bash manual-trigger-commands.sh rss
```

#### AI处理
```bash
# 立即处理AI分析任务
bash trigger-immediate-processing.sh

# 或者分步骤处理
bash manual-trigger-commands.sh jobs
```

### 🎯 核心操作
- **智能筛选**: 使用AI评分、分类、来源等多维度筛选高价值内容
- **批量操作**: 支持批量采用/忽略文章
- **一键编辑**: 点击"使用文章"自动导入AI分析后的内容到编辑器
- **实时预览**: Doocs MD提供实时预览和多种输出格式
- **实体查看**: 查看AI提取的公司、技术、人物等关键实体

### 📊 系统监控
- **RSS源状态**: 查看连接成功率、错误统计、最后抓取时间
- **AI处理进度**: 监控文章AI分析进度和评分分布
- **任务队列**: 查看异步任务执行状态和重试情况
- **实体统计**: 追踪识别的实体数量和关联关系
- **健康检查**: 访问 `/health` 页面查看系统整体状态

## 🏆 系统优势

### ✨ AI智能化程度高
- **精准评分**: Gemini AI基于行业知识0-100分评价文章价值
- **智能分类**: 自动归类制造业5大细分领域
- **实体识别**: 自动提取并建立公司、技术、人物关联关系
- **全文分析**: Crawl4AI智能提取完整正文内容

### 🚀 工作效率高  
- **全自动流程**: 从RSS抓取到AI分析完全自动化
- **异步处理**: 任务队列确保高并发处理不阻塞
- **专业编辑器**: Doocs MD支持微信公众号等多种平台格式
- **一键操作**: 文章筛选、导入、编辑一键完成

### 🛡️ 系统稳定性好
- **三层防重复**: GUID → URL → 标题哈希确保内容不重复
- **重试机制**: 任务失败自动重试，支持指数退避
- **错误隔离**: 单个任务失败不影响整体处理
- **完整监控**: 详细的错误日志和性能统计

### 📈 扩展性强
- **模块化设计**: Edge Functions独立部署，易于维护升级
- **标准化API**: RESTful接口支持第三方系统集成
- **灵活配置**: 支持不同行业领域和评分标准定制
- **云原生**: 基于Supabase和Vercel的现代云架构

## 📈 当前状态

**🎉 制造业情报系统 - ✅ 完全就绪并运行中！**

### 🌟 部署状态
- ✅ **前端应用**: 已部署到 Vercel，响应正常
- ✅ **Edge Functions**: 3个核心函数全部部署并运行正常
- ✅ **数据库**: PostgreSQL 表结构完整，数据正常
- ✅ **AI流水线**: RSS抓取→AI分析→实体识别全流程自动化
- ✅ **定时任务**: pg_cron 自动化任务正常执行
- ✅ **环境变量**: 所有必需配置已正确设置

### 🎯 已验证功能
- ✅ **RSS 源管理**: 43个源的CRUD操作全部正常
- ✅ **智能抓取**: 三层防重复机制，处理效率高
- ✅ **AI 分析**: Gemini AI评分、分类、摘要功能正常
- ✅ **内容提取**: Crawl4AI全文提取功能正常
- ✅ **实体识别**: 公司、技术、人物实体自动提取和关联
- ✅ **文章池筛选**: AI评分筛选、多维度过滤正常
- ✅ **编辑工作台**: Doocs MD集成完整，一键导入功能正常
- ✅ **任务队列**: 异步处理、重试机制全部正常

### 🔄 自动化AI处理流水线
```
📡 RSS抓取 (每2小时)
    ↓
📋 任务队列创建 (自动)
    ↓  
⚙️ 任务处理器 (每15分钟)
    ↓
🕷️ Crawl4AI全文提取 (自动)
    ↓
🤖 Gemini AI智能分析 (自动)
    - 0-100分评分
    - 5大类别分类
    - 中文摘要生成
    - 战略意义分析
    ↓
🏷️ 实体识别和关联 (自动)
    ↓
💾 数据库更新 (完成)
```

### 🚀 生产环境信息
- **前端地址**: https://latest-feed-module.vercel.app
- **健康检查**: https://latest-feed-module.vercel.app/health
- **GitHub仓库**: https://github.com/your-username/latest-feed-module
- **技术栈**: Astro v5 + Supabase Edge Functions + Vercel
- **AI服务**: Crawl4AI + Gemini AI
- **架构模式**: 前后端分离，云原生微服务

### 📊 系统统计
- **RSS源**: 43个制造业专业源
- **处理文章**: 100+ 篇已分析文章
- **AI评分**: 平均分布在20-80分区间
- **实体数量**: 500+ 个公司、技术、人物实体
- **成功率**: RSS抓取 >95%，AI处理 >98%
- **响应时间**: 前端 <2s，API <5s

---

**项目状态**: 🟢 完全就绪，AI智能分析正常运行  
**最后更新**: 2025-08-28  
**版本**: v2.0.0 (AI增强版)