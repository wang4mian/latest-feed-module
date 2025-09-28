-- =====================================================
-- 测试新的AI分析：找一篇文章重新处理
-- =====================================================

-- 1. 找一篇最近的文章，清空AI分析字段，让它重新处理
UPDATE articles 
SET 
    ai_summary = NULL,
    ai_tags = '{}',
    overall_status = 'draft'
WHERE id = (
    SELECT id 
    FROM articles 
    WHERE full_content IS NOT NULL 
    AND length(full_content) > 1000
    ORDER BY created_at DESC 
    LIMIT 1
)
RETURNING id, title, overall_status;

-- 2. 查看这篇文章的信息
SELECT 
    id,
    title,
    ai_summary,
    ai_tags,
    overall_status,
    created_at
FROM articles 
WHERE overall_status = 'draft'
AND ai_summary IS NULL
ORDER BY created_at DESC
LIMIT 1;