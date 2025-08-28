#!/bin/bash

# =====================================================
# 测试所有Edge Functions的完整工作流程
# =====================================================

echo "🧪 开始测试完整的Edge Functions工作流程..."

# 设置变量
SUPABASE_URL="${SUPABASE_URL:-https://msvgeriacsaaakmxvqye.supabase.co}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SERVICE_KEY" ]; then
    echo "❌ 请设置 SUPABASE_SERVICE_ROLE_KEY 环境变量"
    exit 1
fi

echo "✅ 环境变量已配置"
echo ""

# 步骤1: 测试RSS抓取
echo "📋 步骤1: 测试RSS抓取功能..."

RSS_RESULT=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/rss-fetch" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "test_mode": true,
    "source_limit": 1
  }')

echo "RSS抓取结果:"
echo "${RSS_RESULT}" | jq '.' 2>/dev/null || echo "${RSS_RESULT}"

# 检查是否创建了新文章
NEW_ARTICLES=$(echo "${RSS_RESULT}" | jq -r '.statistics.new_articles_created // 0')

if [ "${NEW_ARTICLES}" != "0" ]; then
    echo "✅ RSS抓取成功，创建了 ${NEW_ARTICLES} 篇新文章"
    
    # 步骤2: 获取最新文章并测试AI分析
    echo ""
    echo "📋 步骤2: 测试AI分析功能..."
    
    # 获取最新文章ID
    LATEST_ARTICLE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/articles?select=id&order=created_at.desc&limit=1" \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}")
    
    ARTICLE_ID=$(echo "${LATEST_ARTICLE}" | jq -r '.[0].id // null')
    
    if [ "${ARTICLE_ID}" != "null" ] && [ "${ARTICLE_ID}" != "" ]; then
        echo "找到最新文章ID: ${ARTICLE_ID}"
        
        # 测试AI分析
        AI_RESULT=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/ai-analyze" \
          -H "Authorization: Bearer ${SERVICE_KEY}" \
          -H "Content-Type: application/json" \
          -d "{
            \"article_id\": \"${ARTICLE_ID}\",
            \"test_mode\": true
          }")
        
        echo "AI分析结果:"
        echo "${AI_RESULT}" | jq '.' 2>/dev/null || echo "${AI_RESULT}"
        
        # 检查AI分析是否成功
        AI_SUCCESS=$(echo "${AI_RESULT}" | jq -r '.success // false')
        if [ "${AI_SUCCESS}" == "true" ]; then
            echo ""
            echo "✅ AI分析测试成功!"
            echo "   - 内容抓取: $(echo "${AI_RESULT}" | jq -r '.crawl_success // "未知"')"
            echo "   - 内容长度: $(echo "${AI_RESULT}" | jq -r '.content_length // 0')"
            echo "   - AI分析: $(echo "${AI_RESULT}" | jq -r '.analysis_success // "未知"')"
            echo "   - 相关性评分: $(echo "${AI_RESULT}" | jq -r '.relevance_score // "未评分"')"
            echo "   - 数据库更新: $(echo "${AI_RESULT}" | jq -r '.database_updated // "未知"')"
            
            # 步骤3: 验证数据库更新
            echo ""
            echo "📋 步骤3: 验证数据库更新..."
            
            ARTICLE_DATA=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/articles?select=ai_score,ai_category,full_content&id=eq.${ARTICLE_ID}" \
              -H "apikey: ${SERVICE_KEY}" \
              -H "Authorization: Bearer ${SERVICE_KEY}")
            
            AI_SCORE=$(echo "${ARTICLE_DATA}" | jq -r '.[0].ai_score // null')
            
            if [ "${AI_SCORE}" != "null" ]; then
                echo "✅ 数据库更新验证成功"
                echo "   - AI评分: ${AI_SCORE}"
                echo "   - AI分类: $(echo "${ARTICLE_DATA}" | jq -r '.[0].ai_category // "未分类"')"
                echo "   - 内容长度: $(echo "${ARTICLE_DATA}" | jq -r '.[0].full_content | length // 0')"
            else
                echo "❌ 数据库更新验证失败"
            fi
        else
            echo "❌ AI分析测试失败"
            echo "${AI_RESULT}" | jq -r '.error // "未知错误"'
        fi
    else
        echo "❌ 无法获取文章ID，跳过AI分析测试"
    fi
else
    echo "❌ RSS抓取没有创建新文章"
    echo "请检查RSS源配置或网络连接"
fi

echo ""
echo "🎉 完整工作流程测试完成！"
echo ""
echo "📊 测试总结:"
echo "- RSS抓取: $(if [ "${NEW_ARTICLES}" != "0" ]; then echo "✅ 正常"; else echo "❌ 失败"; fi)"
echo "- AI分析: $(if [ "${AI_SUCCESS}" == "true" ]; then echo "✅ 正常"; else echo "❌ 失败或未测试"; fi)"
echo "- 数据完整性: $(if [ "${AI_SCORE}" != "null" ]; then echo "✅ 正常"; else echo "❌ 失败或未测试"; fi)"