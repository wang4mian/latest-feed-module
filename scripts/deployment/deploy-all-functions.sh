#!/bin/bash

# =====================================================
# 部署所有Supabase Edge Functions
# =====================================================

echo "🚀 开始部署所有Edge Functions..."

# 检查是否安装了Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI未安装"
    echo "请选择以下安装方式之一："
    echo ""
    echo "1. 使用npm安装："
    echo "   npm install -g supabase"
    echo ""
    echo "2. 使用Homebrew安装 (macOS)："
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI已安装"

# 检查登录状态
if ! supabase projects list &> /dev/null; then
    echo "🔑 需要登录Supabase..."
    supabase login
fi

# 项目ID
PROJECT_REF="msvgeriacsaaakmxvqye"

# 函数列表
FUNCTIONS=("ai-analyze" "rss-fetch" "job-processor")

# 部署每个函数
for func in "${FUNCTIONS[@]}"; do
    echo ""
    echo "🔧 部署函数: $func"
    
    if [ -f "../../supabase/functions/$func/index.ts" ]; then
        supabase functions deploy $func --project-ref $PROJECT_REF
        
        if [ $? -eq 0 ]; then
            echo "✅ $func 部署成功"
        else
            echo "❌ $func 部署失败"
            exit 1
        fi
    else
        echo "⚠️  函数文件不存在: ../../supabase/functions/$func/index.ts"
    fi
done

echo ""
echo "🎉 所有Edge Functions部署完成！"
echo ""
echo "🧪 现在可以运行测试："
echo "cd ../testing && ./test-all-functions.sh"