# 修复AI分析Edge Function

## 🐛 发现的Bug
- `supabase.raw('mention_count + 1')` 函数不存在
- 导致部分文章AI处理失败
- 错误信息：`supabase.raw is not a function`

## ✅ 修复方案
将原来的：
```javascript
mention_count: supabase.raw('mention_count + 1')
```

改为：
```javascript
// 先获取当前计数，再递增
const { data: currentEntity } = await supabase
  .from('entities')
  .select('mention_count')
  .eq('id', entityId)
  .single()

mention_count: (currentEntity?.mention_count || 0) + 1
```

## 🚀 部署步骤
1. 在Supabase Dashboard进入Edge Functions
2. 选择`ai-analyze`函数
3. 复制修复后的`supabase-edge-function-ai-analyze.ts`内容
4. 点击Deploy

## 🧪 测试验证
部署后运行：
```bash
curl -X POST 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/ai-analyze' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"batch_size": 10}'
```

## 📊 预期结果
- 所有文章都应该成功处理
- 不再出现`supabase.raw is not a function`错误
- 所有articles表记录都有ai_score值