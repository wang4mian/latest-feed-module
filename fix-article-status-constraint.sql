-- 修复文章状态约束，添加 adopted 和 archived 状态
-- 执行此脚本来更新数据库约束

-- 1. 先删除现有的 CHECK 约束
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_overall_status_check;

-- 2. 添加新的 CHECK 约束，包含所有需要的状态
ALTER TABLE articles ADD CONSTRAINT articles_overall_status_check 
CHECK (overall_status IN ('draft', 'processing', 'ready_for_review', 'reviewed', 'published', 'adopted', 'archived', 'ignored'));

-- 3. 验证约束是否正确添加
SELECT conname, pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint 
WHERE conrelid = 'articles'::regclass 
AND conname = 'articles_overall_status_check';

-- 4. 查看当前所有状态的分布
SELECT overall_status, COUNT(*) as count
FROM articles 
GROUP BY overall_status 
ORDER BY count DESC;