#!/bin/bash
# 测试内容提取修复

echo "🧪 测试 Crawl4AI 修复..."

SUPABASE_URL="https://msvgeriacsaaakmxvqye.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"

echo "1. 重置一篇文章的AI分析状态..."
curl -s -X PATCH "${SUPABASE_URL}/rest/v1/articles" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "ai_score": null,
    "full_content": null,
    "overall_status": "draft"
  }' \
  -G -d "limit=1"

echo ""
echo "2. 触发AI分析处理..."
response=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/ai-analyze" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 1}')

echo "响应: $response"

success=$(echo "$response" | jq -r '.success // false')
processed=$(echo "$response" | jq -r '.processed // 0')

if [ "$success" = "true" ] && [ "$processed" -gt 0 ]; then
    echo "✅ 处理成功！已处理 $processed 篇文章"
    echo ""
    echo "3. 检查 full_content 是否有内容..."
    
    # 检查最近处理的文章
    curl -s "${SUPABASE_URL}/rest/v1/articles" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -G \
      -d "select=id,title,ai_score,full_content" \
      -d "full_content=not.is.null" \
      -d "order=updated_at.desc" \
      -d "limit=1" | jq '.[] | {
        id: .id,
        title: .title,
        ai_score: .ai_score,
        content_length: (.full_content | length),
        content_preview: (.full_content | .[0:200])
      }'
else
    echo "❌ 处理失败或无文章处理"
fi