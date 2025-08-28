# 制造业情报系统 - 项目结构说明

## 📁 项目目录结构

```
/
├── 📄 README.md                    # 项目介绍
├── 📄 claude.md                    # 完整技术规格文档
├── 📄 package.json                 # 前端依赖配置
├── 📄 astro.config.mjs             # Astro前端配置
├── 📄 tailwind.config.mjs          # Tailwind样式配置
├── 📄 tsconfig.json                # TypeScript配置
├── 📄 vercel.json                  # Vercel部署配置
├── 📄 .env                         # 环境变量(本地开发)
│
├── 📁 src/                         # 前端源代码
│   ├── 📁 components/              # Astro组件
│   ├── 📁 layouts/                 # 页面布局
│   ├── 📁 pages/                   # 页面路由
│   ├── 📁 lib/                     # 工具库
│   └── 📄 env.d.ts                 # 环境变量类型
│
├── 📁 supabase/                    # Supabase Edge Functions
│   └── 📁 functions/               
│       ├── 📁 ai-analyze/          # AI分析函数
│       ├── 📁 rss-fetch/           # RSS抓取函数
│       └── 📁 job-processor/       # 任务处理函数(未来)
│
├── 📁 database/                    # 数据库相关
│   ├── 📁 scripts/                 # 建表脚本
│   ├── 📁 migrations/              # 数据库迁移
│   └── 📁 seeds/                   # 初始数据
│
├── 📁 scripts/                     # 项目脚本
│   ├── 📁 deployment/              # 部署脚本
│   └── 📁 testing/                 # 测试脚本
│
├── 📁 vercel/                      # Vercel相关
│   └── 📁 api/                     # Vercel API endpoints
│
├── 📁 docs/                        # 项目文档
│   ├── 📄 开发计划与检查点.md        # 开发进度
│   ├── 📄 业务细节.md               # 业务需求详情
│   └── 📄 数据库设计优化.md          # 数据库设计文档
│
└── 📁 legacy_data/                 # 历史数据
    └── 📄 *.csv                    # 数据导入文件
```

## 🚀 快速开始

### 环境设置
1. 复制 `.env.example` 为 `.env` 并配置环境变量
2. 运行数据库建表脚本: `database/scripts/database-setup.sql`
3. 导入初始数据: `database/seeds/import-rss-sources.sql`

### 部署Edge Functions
```bash
cd scripts/deployment
./deploy-all-functions.sh
```

### 测试系统功能
```bash
cd scripts/testing
./test-all-functions.sh
```

### 启动前端开发
```bash
npm install
npm run dev
```

## 📋 核心组件

### 后端服务 (Supabase Edge Functions)
- **rss-fetch**: RSS源抓取和去重
- **ai-analyze**: Jina AI + Gemini AI内容分析  
- **job-processor**: 任务队列处理(计划中)

### 前端界面 (Astro)
- **文章池** (`/pool`): 智能筛选和管理
- **编辑桌** (`/editor`): 深度文章创作
- **分析室** (`/thesituationroom`): 数据洞察
- **源管理** (`/sources`): RSS源配置

### 数据层 (Supabase PostgreSQL)
- 8张核心数据表
- UUID主键, 三层防重复
- 实体关系和任务队列

## 🔧 开发工作流

1. **代码开发** → `src/` 目录
2. **函数开发** → `supabase/functions/` 目录  
3. **数据库变更** → `database/migrations/` 目录
4. **部署测试** → `scripts/` 目录
5. **文档更新** → `docs/` 目录

## 📚 详细文档

- [完整技术规格](claude.md)
- [开发计划](docs/开发计划与检查点.md)
- [业务需求](docs/业务细节.md)
- [数据库设计](docs/数据库设计优化.md)