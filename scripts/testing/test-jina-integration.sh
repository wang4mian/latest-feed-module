#!/bin/bash

# =====================================================
# 测试Jina AI集成的内容抓取能力
# =====================================================

echo "🧪 测试Jina AI Reader API集成..."

# 测试URL
TEST_URL="https://techcrunch.com/2024/01/15/ai-robotics-startup-raises-funding/"

echo "测试URL: ${TEST_URL}"
echo ""

# 如果你已经有Jina API Key，请设置这个环境变量
if [ -z "$JINA_API_KEY" ]; then
    echo "❌ 请先设置 JINA_API_KEY 环境变量"
    echo "export JINA_API_KEY='your-jina-api-key'"
    exit 1
fi

echo "🔧 测试Jina AI Reader API直接调用..."

# 直接测试Jina AI API
JINA_RESULT=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer ${JINA_API_KEY}" \
    -H "X-Return-Format: text" \
    -H "X-Target-Selector: article, .content, .post, main" \
    "https://r.jina.ai/${TEST_URL}")

HTTP_CODE=$(echo "$JINA_RESULT" | tail -n1)
CONTENT=$(echo "$JINA_RESULT" | head -n -1)

echo "HTTP状态码: ${HTTP_CODE}"
echo "内容长度: $(echo "$CONTENT" | wc -c) 字符"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Jina AI API测试成功！"
    echo "内容预览 (前200字符):"
    echo "----------------------------------------"
    echo "$CONTENT" | head -c 200
    echo "..."
    echo "----------------------------------------"
else
    echo "❌ Jina AI API测试失败"
    echo "错误详情:"
    echo "$CONTENT"
fi

echo ""
echo "📋 现在你可以:"
echo "1. 在.env文件中添加: JINA_API_KEY=${JINA_API_KEY}"
echo "2. 重新部署ai-analyze Edge Function"
echo "3. 测试完整的3层抓取系统"