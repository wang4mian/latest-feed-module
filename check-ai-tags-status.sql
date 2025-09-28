-- =====================================================
-- 检查ai_tags字段的当前状态
-- =====================================================

-- 1. 检查ai_tags字段是否存在及其属性
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'articles' 
AND column_name = 'ai_tags';

-- 2. 检查相关索引是否存在
SELECT 
    indexname, 
    indexdef,
    tablename
FROM pg_indexes 
WHERE tablename = 'articles' 
AND indexname = 'idx_articles_ai_tags';

-- 3. 检查是否有文章已经有ai_tags数据
SELECT 
    COUNT(*) as total_articles,
    COUNT(ai_tags) as articles_with_tags,
    COUNT(*) FILTER (WHERE array_length(ai_tags, 1) > 0) as articles_with_non_empty_tags
FROM articles;

-- 4. 查看一些示例数据
SELECT 
    id,
    title,
    ai_tags,
    ai_summary,
    overall_status,
    created_at
FROM articles 
WHERE ai_tags IS NOT NULL 
AND array_length(ai_tags, 1) > 0
LIMIT 5;