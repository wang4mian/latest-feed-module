# 制造业情报系统 - Manufacturing Intelligence System

## 🎯 项目概述

**全自动化制造业情报系统**：智能抓取、深度分析、专业编译制造业相关的高价值情报文章，支持多渠道发布和效果追踪。

### 🚀 系统特色
- **智能筛选**：AI自动评分筛选高价值内容
- **深度编辑**：集成Doocs MD专业编辑器
- **完整工作流**：从信息采集到内容发布的端到端解决方案
- **现代化界面**：基于Astro和Franken UI的响应式Web应用

## 📁 项目结构

```
LF/
├── README.md                           # 项目说明文档
├── claude.md                          # 完整开发指南和技术规格
├── 开发计划与检查点.md                 # 分阶段开发计划
├── 业务细节.md                         # 详细业务需求和工作流程
├── 数据库设计优化.md                   # 完整数据库架构设计
│
├── 1_分析prompt.md                     # AI内容分析Prompt模板
├── 2_编译prompt.md                     # 深度文章编译Prompt模板
│
├── database-setup.sql                  # 数据库表结构创建脚本
├── import-rss-sources.sql              # RSS源数据导入脚本
├── checkpoint-1.1-verification.sql     # 数据库验证脚本
├── supabase-edge-function-rss-fetch.ts     # RSS抓取Edge Function
├── supabase-edge-function-ai-analyze.ts  # AI分析Edge Function  
├── supabase-edge-function-job-processor.ts # 任务处理器Edge Function
├── test-ai-analysis-flow.sql             # AI分析流程测试脚本
├── database-crawl4ai-upgrade.sql         # Crawl4AI功能数据库升级脚本
│
├── package.json                          # 前端项目依赖配置
├── astro.config.mjs                      # Astro框架配置
├── tailwind.config.mjs                   # Tailwind CSS + Franken UI配置
├── .env.example                          # 环境变量示例文件
│
└── src/                                  # 前端源代码
   ├── layouts/Layout.astro               # 页面布局模板
   ├── pages/
   │   ├── index.astro                   # 首页仪表板
   │   ├── pool.astro                    # 文章池页面 - AI筛选文章
   │   ├── editor.astro                  # 编辑工作台 - 集成Doocs MD
   │   ├── sources.astro                 # RSS源管理页面
   │   └── api/                          # API路由
   │       ├── articles/[id].ts          # 文章详情API
   │       ├── articles-status.ts        # 文章状态管理API
   │       └── rss-sources.ts            # RSS源CRUD API
   ├── components/
   │   ├── ArticleCard.astro             # 文章卡片组件
   │   └── FilterPanel.astro             # 筛选面板组件
   └── lib/supabase.ts                   # Supabase客户端配置和类型定义
│
└── legacy_data/                        # 历史数据文件
    ├── rss_sources-old_rows.csv        # 原始RSS源数据
    └── articles_rows.csv               # 原始文章数据
```

## 🎯 核心功能

### 📥 智能信息采集  
- **RSS源管理** - 43+个制造业专业源，支持CRUD操作
- **自动抓取系统** - 三层防重复检测（GUID → URL → 标题哈希）
- **全文内容提取** - Crawl4AI智能提取正文、图片、元数据  
- **定时任务** - Supabase pg_cron每2小时自动执行

### 🤖 AI智能分析
- **内容评分** - Gemini AI对文章相关性进行0-100分评分
- **智能分类** - 自动归类（核心设备、供应链、市场趋势等）
- **实体识别** - 自动提取公司、技术、人物实体
- **战略分析** - 生成中文摘要和战略意义分析

### 📝 专业内容编辑
- **文章池** - AI评分筛选，支持批量操作和多维度过滤
- **集成编辑器** - 完整的Doocs MD编辑器，支持实时预览
- **一键导入** - 文章内容自动格式化并插入编辑器
- **多样化输出** - 支持微信公众号、HTML、Markdown等格式

### 🔧 系统管理
- **RSS源管理** - 完整的CRUD操作，连接测试，批量管理
- **状态监控** - 实时显示抓取成功率、错误统计
- **任务队列** - 异步处理，支持重试和错误恢复
- **数据统计** - 文章数量、来源分析、处理状态概览

## ✅ 验证状态

### 🧪 功能验证
- ✅ **文章池页面** - 智能筛选、状态管理、批量操作全部正常
- ✅ **编辑器页面** - Doocs MD集成完整，内容自动插入功能正常
- ✅ **RSS源管理** - CRUD操作、连接测试、批量管理全部可用
- ✅ **API端点** - 所有后端接口响应正确，错误处理完善
- ✅ **数据完整性** - 数据库约束、关联关系、索引全部正常

### 📊 系统数据
- **RSS源总数**: 43个活跃源
- **文章总数**: 100+篇已抓取文章  
- **处理状态**: 自动化流程运行正常
- **AI分析**: 智能评分和分类功能正常

## 🔧 技术架构

### 核心技术栈
- **前端框架**: Astro v5 + Franken UI + UIKit
- **后端服务**: Supabase Edge Functions + PostgreSQL
- **数据库**: Supabase PostgreSQL
- **AI服务**: Crawl4AI + Gemini AI
- **编辑器**: Doocs MD (开源微信编辑器)
- **定时任务**: Supabase pg_cron
- **部署平台**: Vercel (前端) + Supabase (后端)

### 最终架构模式 ✅
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

自动化流程:
Supabase pg_cron → Supabase Edge Functions → 数据库更新
```

### 🎯 架构优势
- **职责分离清晰**: Vercel专注前端，Supabase专注后端
- **性能最优**: 减少跨服务调用，降低延迟
- **维护简单**: 统一的后端生态，减少配置复杂性
- **成本效率**: 避免重复的服务器资源消耗

## 📊 数据库架构

### 核心数据表
1. **`rss_sources`** - RSS源管理和监控
2. **`articles`** - 文章内容和AI分析结果
3. **`entities`** - 实体标准化存储
4. **`article_entities`** - 文章实体关联关系
5. **`processing_jobs`** - 异步任务队列
6. **`compilation_workbench`** - 编辑工作台
7. **`expert_quotes`** - 专家评论库
8. **`publication_channels`** - 发布渠道管理

### 数据流程
```
RSS抓取 → 内容提取 → AI分析 → 实体识别 → 人工筛选 → 内容编辑 → 发布输出
```

## 🚀 快速开始

### 环境准备
1. **克隆项目**
```bash
git clone [项目地址]
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

## 🔑 环境变量配置

```bash
# Supabase
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI服务
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-1.5-flash

# Crawl4AI (必需 - 用于全文内容和图片抓取)
CRAWL4AI_CLOUD_URL=https://www.crawl4ai-cloud.com/query
CRAWL4AI_API_KEY=your-crawl4ai-key

# 安全
CRON_SECRET=your-secure-secret
```

## 💡 使用指南

### 📝 基本工作流程
1. **RSS源管理** - 在`/sources`页面添加和管理RSS源
2. **自动抓取** - Supabase pg_cron每2小时自动触发Edge Functions抓取新文章
3. **AI智能分析** - Gemini AI自动评分和分类文章
4. **文章筛选** - 在`/pool`页面筛选高价值文章
5. **内容编辑** - 在`/editor`页面使用Doocs MD编辑器深度编辑
6. **发布输出** - 输出适配微信公众号等平台的格式

### 🔧 手动触发RSS抓取
如需手动启动RSS抓取（测试或紧急更新）：
```bash
# 直接调用Supabase Edge Function
curl -X POST 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/rss-fetch' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"test_mode": false}'
```

### 🎯 核心操作
- **筛选文章**: 使用AI评分、分类、来源等多维度筛选
- **批量操作**: 支持批量通过/忽略文章
- **一键编辑**: 点击"使用文章"自动导入内容到编辑器
- **实时预览**: Doocs MD提供实时预览和多种输出格式

### 📊 系统监控
- 查看RSS源连接状态和成功率
- 监控文章处理流程和AI分析结果  
- 追踪内容编辑和发布效果
- 健康检查页面：`/health`

### 🛠️ 系统架构决策记录
**为什么最终选择纯Supabase后端？**
- ❌ 初始方案：Vercel Cron → Vercel API → Supabase Edge Functions（过度复杂）
- ✅ 最终方案：Supabase pg_cron → Supabase Edge Functions（简洁高效）
- **优势**：减少网络调用、降低延迟、统一生态、更好的错误处理

## 🏆 系统优势

### ✨ 智能化程度高
- **AI自动评分**: 准确识别高价值内容
- **智能分类**: 自动归类制造业细分领域
- **实体识别**: 自动提取关键公司、技术、人物

### 🚀 工作效率高  
- **自动化流程**: 从信息采集到内容分析全自动
- **专业编辑器**: Doocs MD支持微信公众号等多种格式
- **一键导入**: 文章内容自动格式化导入编辑器

### 🛡️ 系统稳定性好
- **三层防重复**: 确保内容不重复抓取
- **异步任务队列**: 高并发处理，支持重试
- **完整错误处理**: 详细的错误日志和恢复机制

### 📈 扩展性强
- **模块化设计**: 易于添加新功能和数据源
- **标准化API**: 支持第三方系统集成
- **灵活配置**: 支持不同行业和用途定制

## 📈 当前状态

**🎉 制造业情报系统 - ✅ 生产就绪！**

### 🌟 部署状态
- ✅ **前端应用**: 已部署到 Vercel，响应正常
- ✅ **后端服务**: Supabase Edge Functions 运行正常
- ✅ **数据库**: PostgreSQL 表结构完整，数据正常
- ✅ **自动化**: RSS 抓取已成功运行，文章数据已获取
- ✅ **环境变量**: 所有必需配置已正确设置

### 🎯 已验证功能
- ✅ **RSS 源管理**: CRUD 操作全部正常
- ✅ **文章池筛选**: AI 评分、多维度过滤正常
- ✅ **编辑工作台**: Doocs MD 集成完整
- ✅ **自动抓取**: Edge Functions 成功抓取并存储文章
- ✅ **数据库操作**: 三层防重复、任务队列正常

### 🔄 自动化流程
```
Supabase pg_cron (每2小时)
    ↓
rss-fetch Edge Function (RSS抓取)
    ↓
job-processor Edge Function (AI分析)
    ↓
数据库更新 (文章、实体、统计)
```

### 🚀 生产环境信息
- **前端地址**: https://latest-feed-module.vercel.app
- **健康检查**: https://latest-feed-module.vercel.app/health
- **技术栈**: Astro v5 + Supabase + Vercel
- **架构模式**: 前后端分离，纯 Supabase 后端

---

**项目状态**: 🟢 生产就绪，已有数据  
**最后更新**: 2025-08-28  
**版本**: v1.0.0