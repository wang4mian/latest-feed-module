# 修复 Crawl4AI 内容提取问题

## 🐛 发现的问题
- `full_content` 字段全部为空
- Crawl4AI 失败时没有有效的降级策略
- 缺少详细的错误日志和调试信息

## ✅ 修复方案

### 1. 多层降级策略
```
Strategy 1: Crawl4AI (付费API) 
    ↓ 失败
Strategy 2: Jina AI Reader (免费)
    ↓ 失败  
Strategy 3: 简单 HTML 抓取
    ↓ 失败
Strategy 4: RSS 描述作为最后降级
```

### 2. 详细日志记录
- 每个步骤都有详细的 console.log
- 错误信息会显示具体失败原因
- 内容长度验证确保质量

### 3. 环境变量检查
需要确保 Supabase 环境变量配置：
- `CRAWL4AI_API_KEY` - 可选，未配置时自动降级
- `CRAWL4AI_CLOUD_URL` - 可选，默认使用官方地址

## 🚀 部署步骤
1. 复制修复后的 `supabase-edge-function-ai-analyze.ts`
2. 在 Supabase Dashboard 部署
3. 测试一篇新文章验证修复

## 🧪 测试命令
```bash
# 处理一批文章并观察日志
curl -X POST 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/ai-analyze' \
  -H 'Authorization: Bearer SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"batch_size": 1}'
```

## 📊 预期结果
- `full_content` 字段不再为空
- 至少包含 RSS 描述作为降级内容
- Supabase Function Logs 显示详细的提取过程