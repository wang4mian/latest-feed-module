-- =====================================================
-- 检查待处理的文章和定时任务状态
-- =====================================================

-- 1. 查看有多少文章还没有AI分析
SELECT 
    overall_status,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE ai_summary IS NULL) as without_summary,
    COUNT(*) FILTER (WHERE array_length(ai_tags, 1) > 0) as with_tags
FROM articles 
GROUP BY overall_status
ORDER BY count DESC;

-- 2. 查看最近的文章状态
SELECT 
    id,
    title,
    overall_status,
    ai_summary IS NOT NULL as has_summary,
    array_length(ai_tags, 1) as tag_count,
    created_at
FROM articles 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. 查看是否有草稿状态的文章（应该会被AI处理）
SELECT COUNT(*) as draft_articles
FROM articles 
WHERE overall_status = 'draft';