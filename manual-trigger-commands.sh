#!/bin/bash
# =====================================================
# 制造业情报系统 - 手动触发命令
# 用于测试和紧急更新
# =====================================================

echo "制造业情报系统 - 手动触发工具"
echo "================================="

# 环境变量
SUPABASE_URL="https://msvgeriacsaaakmxvqye.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"

# 函数：手动触发RSS抓取
trigger_rss() {
    echo "🚀 开始手动触发RSS抓取..."
    curl -X POST "${SUPABASE_URL}/functions/v1/rss-fetch" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"test_mode": false, "source_limit": null}'
    echo ""
    echo "RSS抓取任务已提交"
}

# 函数：手动触发任务处理
trigger_jobs() {
    echo "⚙️ 开始手动触发任务处理..."
    curl -X POST "${SUPABASE_URL}/functions/v1/job-processor" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"batch_size": 10, "cleanup": true}'
    echo ""
    echo "任务处理已提交"
}

# 函数：测试模式RSS抓取
test_rss() {
    echo "🧪 开始测试模式RSS抓取（只处理1个源）..."
    curl -X POST "${SUPABASE_URL}/functions/v1/rss-fetch" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"test_mode": true, "source_limit": 1}'
    echo ""
    echo "测试抓取任务已提交"
}

# 主菜单
case "${1:-menu}" in
    "rss")
        trigger_rss
        ;;
    "jobs")
        trigger_jobs
        ;;
    "test")
        test_rss
        ;;
    "all")
        trigger_rss
        sleep 5
        trigger_jobs
        ;;
    "menu"|*)
        echo "使用方法:"
        echo "  $0 rss     - 手动触发RSS抓取"
        echo "  $0 jobs    - 手动触发任务处理"
        echo "  $0 test    - 测试模式RSS抓取"
        echo "  $0 all     - 依次执行RSS抓取和任务处理"
        echo ""
        echo "示例:"
        echo "  bash manual-trigger-commands.sh rss"
        echo "  bash manual-trigger-commands.sh test"
        ;;
esac