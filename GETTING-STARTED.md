# 🚀 快速启动指南

## 📋 系统要求

- Node.js 18+ 
- npm 或 yarn
- Supabase 账户
- Google Gemini API 密钥
- Vercel 账户 (用于部署)

## ⚡ 快速启动

### 1. 环境配置

```bash
# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件，填入你的配置信息
# PUBLIC_SUPABASE_URL=your-supabase-project-url
# PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
# GEMINI_API_KEY=your-gemini-api-key
```

### 2. 数据库设置

```bash
# 在 Supabase 中执行以下 SQL 文件（按顺序）：
# 1. database-setup.sql          # 创建所有表结构
# 2. import-rss-sources.sql      # 导入RSS源数据
# 3. checkpoint-1.1-verification.sql  # 验证设置
```

### 3. Edge Functions 部署

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录到 Supabase
supabase login

# 部署 Edge Functions
supabase functions deploy rss-fetch --no-verify-jwt
supabase functions deploy ai-analyze --no-verify-jwt
supabase functions deploy job-processor --no-verify-jwt
```

### 4. 前端开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看应用！

### 5. 生产部署

```bash
# 使用 Vercel 部署
npm install -g vercel
vercel --prod

# 或者构建静态文件
npm run build
```

## 🔧 功能测试

### 测试 RSS 抓取
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/rss-fetch" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test_mode": true, "source_limit": 1}'
```

### 测试 AI 分析
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/ai-analyze" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"article_id": 1, "test_mode": true}'
```

### 测试任务处理器
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/job-processor" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 5}'
```

## 📊 系统监控

访问以下页面监控系统状态：

- **首页**: `/` - 系统概览和统计
- **文章池**: `/pool` - 浏览和筛选文章
- **编辑台**: `/editor` - 深度编译工作区
- **分析室**: `/thesituationroom` - 战略分析面板

## 🔄 自动化任务

系统自动运行以下定时任务：

- **RSS抓取**: 每2小时执行一次
- **任务处理**: 每15分钟执行一次

## 📞 技术支持

如遇到问题，请检查：

1. **环境变量**: 确保所有必需的环境变量已正确配置
2. **数据库**: 确认所有表已创建且有数据
3. **API密钥**: 验证 Supabase 和 Gemini API 密钥有效
4. **网络**: 确保可以访问外部RSS源

## 🎯 下一步

系统已可正常使用！你可以：

1. 在文章池中查看自动抓取的文章
2. 在编辑台中创建深度分析报告
3. 在分析室中查看战略洞察
4. 根据需要调整RSS源和AI分析参数

---

🎉 **恭喜！你的制造业情报系统已成功启动！**