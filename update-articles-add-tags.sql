-- =====================================================
-- 更新articles表：添加ai_tags字段，支持自由标签
-- =====================================================

-- 添加自由标签字段
ALTER TABLE articles 
ADD COLUMN ai_tags TEXT[] DEFAULT '{}';

-- 为新字段添加索引，支持标签搜索
CREATE INDEX idx_articles_ai_tags ON articles USING GIN(ai_tags);

-- 添加字段注释
COMMENT ON COLUMN articles.ai_tags IS 'AI生成的自由标签数组，支持技术、领域、商业信号等标签';

-- 可选：如果要移除旧的评分和分类字段（谨慎操作）
-- ALTER TABLE articles DROP COLUMN ai_score;
-- ALTER TABLE articles DROP COLUMN ai_reason; 
-- ALTER TABLE articles DROP COLUMN ai_category;
-- ALTER TABLE articles DROP COLUMN ai_strategic_implication;

-- 查看更新后的表结构
\d articles;