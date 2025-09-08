-- 【重要】修复数据库约束 - 必须在 Supabase Dashboard SQL Editor 中执行
-- 执行此脚本后，系统将支持 adopted 和 archived 状态

-- 第一步：删除现有的约束
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_overall_status_check;

-- 第二步：添加包含完整状态列表的新约束
ALTER TABLE articles ADD CONSTRAINT articles_overall_status_check 
CHECK (overall_status IN (
    'draft',           -- 草稿状态
    'processing',      -- AI处理中  
    'ready_for_review',-- AI分析完成，待人工审核
    'reviewed',        -- 已审核(历史数据保留)
    'published',       -- 已发布
    'adopted',         -- 用户从文章池采用到编辑台
    'archived',        -- 用户归档的文章
    'ignored'          -- 忽略的文章
));

-- 第三步：验证约束是否正确添加
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'articles'::regclass 
AND conname = 'articles_overall_status_check';

-- 第四步：检查当前状态分布
SELECT 
    overall_status,
    COUNT(*) as article_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM articles 
GROUP BY overall_status 
ORDER BY article_count DESC;

-- 执行完成后，请复制输出结果确认约束添加成功