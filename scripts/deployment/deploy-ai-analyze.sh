#!/bin/bash

echo "🚀 开始部署ai-analyze Edge Function..."

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
    echo ""
    echo "3. 手动部署："
    echo "   - 打开 https://supabase.com/dashboard/project/msvgeriacsaaakmxvqye/functions"
    echo "   - 编辑 ai-analyze 函数"
    echo "   - 复制 supabase-edge-function-ai-analyze.ts 的内容"
    echo "   - 点击 Deploy"
    exit 1
fi

echo "✅ Supabase CLI已安装"

# 检查登录状态
if ! supabase projects list &> /dev/null; then
    echo "🔑 需要登录Supabase..."
    supabase login
fi

# 确保目录结构正确
echo "📁 准备函数文件..."
mkdir -p supabase/functions/ai-analyze
cp supabase-edge-function-ai-analyze.ts supabase/functions/ai-analyze/index.ts

# 部署函数
echo "🚀 部署函数..."
supabase functions deploy ai-analyze --project-ref msvgeriacsaaakmxvqye

if [ $? -eq 0 ]; then
    echo "✅ ai-analyze函数部署成功！"
    echo ""
    echo "🧪 现在可以重新运行测试："
    echo "./test-fixed-functions.sh"
else
    echo "❌ 部署失败，请检查错误信息"
fi