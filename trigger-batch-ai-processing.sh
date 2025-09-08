#!/bin/bash

# 🚀 KUATO - 批量AI处理触发器
# 立即开始处理所有待处理文章，使用新的15篇批量大小

echo "🤖 开始批量AI处理 - 使用新的15篇批量大小"
echo "⏰ $(date)"
echo ""

# Supabase Edge Function URL
FUNCTION_URL="https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/ai-analyze"
AUTH_HEADER="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"

# 触发连续处理周期
echo "📊 开始连续AI处理周期..."
echo "每次处理15篇文章，直到所有待处理文章完成"
echo ""

# 连续触发处理，每次间隔60秒避免速率限制
BATCH_COUNT=0
TOTAL_PROCESSED=0

while true; do
    BATCH_COUNT=$((BATCH_COUNT + 1))
    echo "🔄 批次 #$BATCH_COUNT - $(date +%H:%M:%S)"
    
    # 调用AI分析函数
    RESPONSE=$(curl -s -w "%{http_code}" \
        -X POST "$FUNCTION_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: $AUTH_HEADER" \
        -d '{"batch_size": 15}')
    
    HTTP_CODE="${RESPONSE: -3}"
    BODY="${RESPONSE%???}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        # 解析响应获取处理数量
        PROCESSED=$(echo "$BODY" | grep -o '"processed":[0-9]*' | grep -o '[0-9]*' | head -1)
        if [ -z "$PROCESSED" ]; then
            PROCESSED="未知"
        else
            TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))
        fi
        
        echo "✅ 成功处理 $PROCESSED 篇文章 (累计: $TOTAL_PROCESSED 篇)"
        
        # 如果这一批处理的文章少于15篇，说明没有更多待处理文章了
        if [ "$PROCESSED" -lt "15" ] && [ "$PROCESSED" != "未知" ]; then
            echo ""
            echo "🎉 所有待处理文章已处理完成！"
            echo "📊 总计处理: $TOTAL_PROCESSED 篇文章"
            echo "🕒 总耗时: $BATCH_COUNT 个批次"
            echo "⏰ 完成时间: $(date)"
            break
        fi
        
        # 如果没有处理任何文章，可能已经完成
        if [ "$PROCESSED" = "0" ]; then
            echo "ℹ️  没有更多待处理文章，处理完成"
            break
        fi
        
    else
        echo "❌ 处理失败 (HTTP $HTTP_CODE)"
        echo "   响应: $BODY"
        echo "   等待2分钟后重试..."
        sleep 120
        continue
    fi
    
    # 等待60秒后处理下一批，避免过快请求
    echo "⏳ 等待60秒后处理下一批..."
    sleep 60
done

echo ""
echo "✨ 批量AI处理完成！"
echo "🔄 系统将继续按每15分钟的定时任务自动处理新文章"