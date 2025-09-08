#!/bin/bash
# 处理所有剩余的待AI分析文章

echo "🤖 开始处理所有剩余文章..."

SUPABASE_URL="https://msvgeriacsaaakmxvqye.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"

# 先检查有多少篇待处理
echo "📊 检查待处理文章数量..."
remaining=$(curl -s "${SUPABASE_URL}/rest/v1/articles?select=count&ai_score=is.null" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" | jq '.[0].count')

echo "发现 $remaining 篇文章待处理"

if [ "$remaining" -eq 0 ]; then
    echo "✅ 所有文章已经处理完成！"
    exit 0
fi

total_processed=0
batch_size=3  # 小批量处理，因为每篇文章需要时间

echo "开始批量处理，每次处理 $batch_size 篇文章"
echo "预计需要 $((remaining / batch_size + 1)) 轮处理"

batch_count=0
while true; do
    batch_count=$((batch_count + 1))
    echo ""
    echo "🔄 第 $batch_count 轮处理..."
    
    response=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/ai-analyze" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"batch_size\": $batch_size}")
    
    # 检查响应是否包含processed字段
    processed=$(echo "$response" | jq -r '.processed // 0')
    success=$(echo "$response" | jq -r '.success // false')
    
    echo "响应摘要: 成功=$success, 已处理=$processed"
    
    if [ "$success" != "true" ]; then
        echo "❌ 处理失败，停止"
        echo "错误详情: $response"
        break
    fi
    
    if [ "$processed" -eq 0 ]; then
        echo "✅ 所有文章已处理完成！"
        break
    fi
    
    total_processed=$((total_processed + processed))
    echo "本轮处理了 $processed 篇，累计 $total_processed 篇"
    
    # 显示处理结果摘要
    echo "处理结果:"
    echo "$response" | jq '.results[] | {title: .title, score: .score, category: .category}'
    
    # 每轮后休息，避免过载
    echo "⏱️ 休息 10 秒..."
    sleep 10
done

echo ""
echo "🎉 批量处理完成！"
echo "总共处理了 $total_processed 篇文章"

# 最终统计
final_remaining=$(curl -s "${SUPABASE_URL}/rest/v1/articles?select=count&ai_score=is.null" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" | jq '.[0].count')

echo "剩余待处理: $final_remaining 篇"