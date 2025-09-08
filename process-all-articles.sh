#!/bin/bash
# 处理所有待AI分析的文章

echo "🤖 开始处理所有待AI分析的文章..."

SUPABASE_URL="https://msvgeriacsaaakmxvqye.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"

total_processed=0
batch_size=5  # 小批量处理，避免超时

echo "开始批量处理，每次处理 $batch_size 篇文章"

while true; do
    echo "处理下一批..."
    
    response=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/ai-analyze" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"batch_size\": $batch_size}")
    
    # 检查响应是否包含processed字段
    processed=$(echo "$response" | jq -r '.processed // 0')
    success=$(echo "$response" | jq -r '.success // false')
    
    echo "响应: $response"
    
    if [ "$success" != "true" ]; then
        echo "❌ 处理失败，停止"
        break
    fi
    
    if [ "$processed" -eq 0 ]; then
        echo "✅ 所有文章已处理完成！"
        break
    fi
    
    total_processed=$((total_processed + processed))
    echo "本批处理了 $processed 篇，累计 $total_processed 篇"
    
    # 短暂休息避免过载
    sleep 2
done

echo "🎉 处理完成！总共处理了 $total_processed 篇文章"