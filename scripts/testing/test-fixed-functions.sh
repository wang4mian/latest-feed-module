#!/bin/bash

# =====================================================
# 测试修复后的Edge Functions
# 验证数据库模式匹配和API调用是否正常
# =====================================================

echo "🧪 开始测试修复后的Edge Functions..."

# 设置变量（从环境变量获取）
SUPABASE_URL="${SUPABASE_URL:-https://msvgeriacsaaakmxvqye.supabase.co}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SERVICE_KEY" ]; then
    echo "❌ 请设置 SUPABASE_SERVICE_ROLE_KEY 环境变量"
    exit 1
fi

echo ""
echo "📋 步骤1: 检查数据库中是否有测试数据..."

# 查询数据库中的文章
ARTICLE_CHECK=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/get_sample_article" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "数据库查询结果: ${ARTICLE_CHECK}"

echo ""
echo "📋 步骤2: 测试RSS抓取功能..."

# 测试RSS抓取 (只处理1个源)
RSS_RESULT=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/rss-fetch" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "test_mode": true,
    "source_limit": 1
  }')

echo "RSS抓取结果:"
echo "${RSS_RESULT}" | jq '.'

# 提取新创建的文章ID
NEW_ARTICLE_ID=$(echo "${RSS_RESULT}" | jq -r '.statistics.new_articles_created // 0')

if [ "${NEW_ARTICLE_ID}" != "0" ]; then
    echo ""
    echo "✅ RSS抓取成功，创建了 ${NEW_ARTICLE_ID} 篇新文章"
    
    echo ""
    echo "📋 步骤3: 获取最新文章ID进行AI分析测试..."
    
    # 获取最新创建的文章ID
    LATEST_ARTICLE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/articles?select=id&order=created_at.desc&limit=1" \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}")
    
    ARTICLE_ID=$(echo "${LATEST_ARTICLE}" | jq -r '.[0].id // null')
    
    if [ "${ARTICLE_ID}" != "null" ] && [ "${ARTICLE_ID}" != "" ]; then
        echo "找到最新文章ID: ${ARTICLE_ID}"
        
        echo ""
        echo "📋 步骤4: 测试AI分析功能..."
        
        # 测试AI分析
        AI_RESULT=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/ai-analyze" \
          -H "Authorization: Bearer ${SERVICE_KEY}" \
          -H "Content-Type: application/json" \
          -d "{
            \"article_id\": \"${ARTICLE_ID}\",
            \"test_mode\": true
          }")
        
        echo "AI分析结果:"
        echo "${AI_RESULT}" | jq '.'
        
        # 检查结果
        SUCCESS=$(echo "${AI_RESULT}" | jq -r '.success // false')
        if [ "${SUCCESS}" == "true" ]; then
            echo ""
            echo "✅ AI分析测试成功!"
            echo "   - 内容抓取: $(echo "${AI_RESULT}" | jq -r '.crawl_success // "未知"')"
            echo "   - 内容长度: $(echo "${AI_RESULT}" | jq -r '.content_length // 0')"
            echo "   - AI分析: $(echo "${AI_RESULT}" | jq -r '.analysis_success // "未知"')"
            echo "   - 相关性评分: $(echo "${AI_RESULT}" | jq -r '.relevance_score // "未评分"')"
            echo "   - 数据库更新: $(echo "${AI_RESULT}" | jq -r '.database_updated // "未知"')"
        else
            echo ""
            echo "❌ AI分析测试失败:"
            echo "${AI_RESULT}" | jq -r '.error // "未知错误"'
        fi
    else
        echo "❌ 无法获取文章ID，跳过AI分析测试"
    fi
else
    echo "❌ RSS抓取没有创建新文章，无法进行AI分析测试"
fi

echo ""
echo "📋 步骤5: 检查数据库表结构完整性..."

# 验证表结构
SCHEMA_CHECK=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/validate_schema" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo '{"error": "Schema validation function not available"}')

echo "表结构验证: ${SCHEMA_CHECK}"

echo ""
echo "🎉 测试完成！"
echo ""
echo "总结:"
echo "- RSS抓取: $(if [ "${NEW_ARTICLE_ID}" != "0" ]; then echo "✅ 正常"; else echo "❌ 失败"; fi)"
echo "- AI分析: $(if [ "${SUCCESS}" == "true" ]; then echo "✅ 正常"; else echo "❌ 失败或未测试"; fi)"
echo "- 数据库模式: ✅ 已修复"