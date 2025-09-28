-- =====================================================
-- 监控测试文章的AI分析进度
-- =====================================================

-- 查看测试文章的当前状态
SELECT 
    id,
    title,
    overall_status,
    ai_summary IS NOT NULL as has_summary,
    ai_tags,
    array_length(ai_tags, 1) as tag_count,
    length(full_content) as content_length,
    updated_at,
    created_at
FROM articles 
WHERE id = '98869ed2-c0c0-4026-ae56-5ac5db91ab6e';

-- 如果已经处理完成，显示详细结果
SELECT 
    'AI分析结果' as result_type,
    ai_summary,
    ai_tags,
    overall_status
FROM articles 
WHERE id = '98869ed2-c0c0-4026-ae56-5ac5db91ab6e'
AND ai_summary IS NOT NULL;