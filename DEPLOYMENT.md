# 部署指南 - Manufacturing Intelligence System

## 🚀 Supabase Edge Functions 部署

### 1. 部署 RSS 抓取 Edge Function

```bash
# 在Supabase项目中创建Edge Function
supabase functions new rss-fetch

# 复制代码到: supabase/functions/rss-fetch/index.ts
# 内容使用: supabase-edge-function-rss-fetch.ts

# 部署到Supabase
supabase functions deploy rss-fetch --no-verify-jwt
```

### 2. 部署 AI 分析 Edge Function

```bash
# 创建AI分析Edge Function
supabase functions new ai-analyze

# 复制代码到: supabase/functions/ai-analyze/index.ts
# 内容使用: supabase-edge-function-ai-analyze.ts

# 部署到Supabase
supabase functions deploy ai-analyze --no-verify-jwt
```

### 3. 部署任务处理器 Edge Function

```bash
# 创建任务处理器Edge Function
supabase functions new job-processor

# 复制代码到: supabase/functions/job-processor/index.ts
# 内容使用: supabase-edge-function-job-processor.ts

# 部署到Supabase
supabase functions deploy job-processor --no-verify-jwt
```

## ⏰ Vercel Cron 部署

### 4. 配置 Vercel 自动定时任务

**文件结构：**
```
项目根目录/
├── vercel.json           # Vercel配置文件
└── api/
    ├── rss-cron.js      # RSS抓取定时端点 (每2小时)
    └── job-processor-cron.js # 任务处理定时端点 (每15分钟)
```

**环境变量配置 (Vercel Dashboard):**
```bash
# Supabase配置
PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI服务配置
GEMINI_API_KEY=your-gemini-api-key

# 安全配置
CRON_SECRET=your-secure-secret  # 用于验证Cron请求
```

### 5. 部署到 Vercel

```bash
# 使用Vercel CLI部署
vercel --prod

# 或通过GitHub集成自动部署
```

## 🔧 手动测试

### 测试 Edge Function
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/rss-fetch" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test_mode": true, "source_limit": 1}'
```

### 测试 Vercel Cron 任务
```bash
# 测试RSS抓取
curl -X GET "https://your-domain.vercel.app/api/rss-cron" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 测试任务处理器
curl -X GET "https://your-domain.vercel.app/api/job-processor-cron" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 直接测试AI分析
curl -X POST "https://your-project.supabase.co/functions/v1/ai-analyze" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"article_id": 123, "test_mode": true}'
```

## 📊 监控

- **Supabase Dashboard**: 查看Edge Function日志
- **Vercel Dashboard**: 查看Cron执行日志
- **数据库**: 检查 `rss_sources` 表的统计数据

## ⚙️ 定时频率调整

修改 `vercel.json` 中的 `schedule` 字段：
- `"0 */2 * * *"` = 每2小时
- `"0 */4 * * *"` = 每4小时
- `"0 0 * * *"` = 每天午夜
- `"0 8,20 * * *"` = 每天8:00和20:00

## 🛡️ 安全注意事项

1. **CRON_SECRET**: 使用强密码保护Cron端点
2. **服务密钥**: 妥善保护Supabase服务密钥
3. **RLS策略**: 确保数据库Row Level Security配置正确

---

*部署完成后，系统将每2小时自动抓取RSS源，无需手动干预！*