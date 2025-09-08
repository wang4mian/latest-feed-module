#!/bin/bash
# 验证项目中状态字段的一致性

echo "🔍 检查项目中的状态字段使用情况..."
echo "========================================="

echo ""
echo "📋 检查 API 文件中的状态使用:"
echo "----------------------------"
grep -r "overall_status.*:" src/pages/api/ 2>/dev/null || echo "未找到API状态设置"

echo ""
echo "📋 检查前端文件中的状态查询:"
echo "----------------------------"
grep -r "status.*:" src/pages/*.astro 2>/dev/null || echo "未找到前端状态查询"

echo ""
echo "📋 检查测试文件中的状态:"
echo "----------------------------"
grep -r "overall_status" *.js 2>/dev/null || echo "未找到测试文件状态"

echo ""
echo "🚨 查找可能的临时状态使用 (应该为空):"
echo "-------------------------------------------"
grep -r "reviewed.*临时\|ignored.*临时" src/ 2>/dev/null && echo "⚠️  发现临时状态!" || echo "✅ 未发现临时状态使用"

echo ""
echo "✅ 验证完成!"