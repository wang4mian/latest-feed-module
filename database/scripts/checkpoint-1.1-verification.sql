-- =====================================================
-- 检查点1.1 - 数据库基础架构验证脚本
-- 执行这些查询来验证数据库建表是否完全成功
-- =====================================================

-- 1. 验证所有表是否创建成功 ✅ (已通过)
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. 验证所有外键关系是否正确建立
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 3. 验证所有索引是否创建成功
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. 验证所有CHECK约束是否创建成功
SELECT 
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;

-- 5. 验证所有UNIQUE约束是否创建成功
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, tc.constraint_name;

-- 6. 验证所有触发器是否创建成功
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 7. 验证所有视图是否创建成功
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- 功能测试 - 基础CRUD操作
-- =====================================================

-- 8. 测试RSS源表的基础操作
DO $$
DECLARE
    test_source_id INTEGER;
BEGIN
    -- 插入测试数据
    INSERT INTO rss_sources (name, url, vertical_name, topic_for_ai) 
    VALUES ('Test Source', 'https://example.com/test-rss', 'Test Vertical', 'Test Topic')
    RETURNING id INTO test_source_id;
    
    -- 验证插入成功
    IF NOT EXISTS (SELECT 1 FROM rss_sources WHERE id = test_source_id) THEN
        RAISE EXCEPTION 'RSS源插入失败';
    END IF;
    
    -- 更新测试
    UPDATE rss_sources 
    SET last_fetch_at = NOW(), fetch_count = 1 
    WHERE id = test_source_id;
    
    -- 验证更新成功
    IF NOT EXISTS (SELECT 1 FROM rss_sources WHERE id = test_source_id AND fetch_count = 1) THEN
        RAISE EXCEPTION 'RSS源更新失败';
    END IF;
    
    -- 清理测试数据
    DELETE FROM rss_sources WHERE id = test_source_id;
    
    -- 验证删除成功
    IF EXISTS (SELECT 1 FROM rss_sources WHERE id = test_source_id) THEN
        RAISE EXCEPTION 'RSS源删除失败';
    END IF;
    
    RAISE NOTICE '✅ RSS源表CRUD测试通过';
END $$;

-- 9. 测试文章表的基础操作和防重复机制
DO $$
DECLARE
    test_source_id INTEGER;
    test_article_id UUID;
    duplicate_article_id UUID;
BEGIN
    -- 先创建测试RSS源
    INSERT INTO rss_sources (name, url, vertical_name) 
    VALUES ('Test Source for Articles', 'https://example.com/test-rss-2', 'Test')
    RETURNING id INTO test_source_id;
    
    -- 插入测试文章
    INSERT INTO articles (
        source_id, 
        title, 
        link, 
        guid,
        normalized_url,
        title_hash,
        overall_status
    ) 
    VALUES (
        test_source_id,
        'Test Article Title',
        'https://example.com/test-article',
        'test-guid-123',
        'https://example.com/test-article',
        encode(sha256('test article title'::bytea), 'hex'),
        'draft'
    )
    RETURNING id INTO test_article_id;
    
    -- 验证插入成功
    IF NOT EXISTS (SELECT 1 FROM articles WHERE id = test_article_id) THEN
        RAISE EXCEPTION '文章插入失败';
    END IF;
    
    -- 测试防重复机制 - 尝试插入相同GUID的文章（应该失败）
    BEGIN
        INSERT INTO articles (
            source_id, 
            title, 
            link, 
            guid,
            overall_status
        ) 
        VALUES (
            test_source_id,
            'Duplicate Article',
            'https://example.com/different-url',
            'test-guid-123',
            'draft'
        )
        RETURNING id INTO duplicate_article_id;
        
        -- 如果执行到这里，说明防重复机制失败
        RAISE EXCEPTION '防重复机制失败 - 相同GUID的文章被重复插入';
    EXCEPTION
        WHEN unique_violation THEN
            -- 这是期望的结果
            RAISE NOTICE '✅ GUID防重复机制工作正常';
    END;
    
    -- 清理测试数据
    DELETE FROM articles WHERE source_id = test_source_id;
    DELETE FROM rss_sources WHERE id = test_source_id;
    
    RAISE NOTICE '✅ 文章表CRUD和防重复测试通过';
END $$;

-- 10. 测试实体表和关联表
DO $$
DECLARE
    test_source_id INTEGER;
    test_article_id UUID;
    test_entity_id UUID;
    test_relation_id UUID;
BEGIN
    -- 创建测试数据链
    INSERT INTO rss_sources (name, url, vertical_name) 
    VALUES ('Test Source for Entities', 'https://example.com/test-rss-3', 'Test')
    RETURNING id INTO test_source_id;
    
    INSERT INTO articles (source_id, title, link, overall_status) 
    VALUES (test_source_id, 'Test Article for Entities', 'https://example.com/test-3', 'draft')
    RETURNING id INTO test_article_id;
    
    INSERT INTO entities (name, normalized_name, type, entity_region) 
    VALUES ('Test Company', 'test_company', 'company', 'China')
    RETURNING id INTO test_entity_id;
    
    INSERT INTO article_entities (article_id, entity_id, relevance_score, sentiment) 
    VALUES (test_article_id, test_entity_id, 0.95, 'positive')
    RETURNING id INTO test_relation_id;
    
    -- 验证关联查询
    IF NOT EXISTS (
        SELECT 1 
        FROM article_entities ae
        JOIN articles a ON ae.article_id = a.id
        JOIN entities e ON ae.entity_id = e.id
        WHERE ae.id = test_relation_id
    ) THEN
        RAISE EXCEPTION '实体关联查询失败';
    END IF;
    
    -- 清理测试数据（级联删除会自动清理关联）
    DELETE FROM article_entities WHERE id = test_relation_id;
    DELETE FROM entities WHERE id = test_entity_id;
    DELETE FROM articles WHERE id = test_article_id;
    DELETE FROM rss_sources WHERE id = test_source_id;
    
    RAISE NOTICE '✅ 实体表和关联表测试通过';
END $$;

-- 11. 测试任务队列表
DO $$
DECLARE
    test_source_id INTEGER;
    test_article_id UUID;
    test_job_id UUID;
BEGIN
    -- 创建测试数据
    INSERT INTO rss_sources (name, url, vertical_name) 
    VALUES ('Test Source for Jobs', 'https://example.com/test-rss-4', 'Test')
    RETURNING id INTO test_source_id;
    
    INSERT INTO articles (source_id, title, link, overall_status) 
    VALUES (test_source_id, 'Test Article for Jobs', 'https://example.com/test-4', 'draft')
    RETURNING id INTO test_article_id;
    
    -- 插入处理任务
    INSERT INTO processing_jobs (
        article_id, 
        job_type, 
        status, 
        priority,
        job_data
    ) 
    VALUES (
        test_article_id,
        'crawl_content',
        'pending',
        1,
        '{"test": true}'::jsonb
    )
    RETURNING id INTO test_job_id;
    
    -- 验证任务查询
    IF NOT EXISTS (
        SELECT 1 
        FROM processing_jobs j
        JOIN articles a ON j.article_id = a.id
        WHERE j.id = test_job_id
        AND j.job_type = 'crawl_content'
        AND j.status = 'pending'
    ) THEN
        RAISE EXCEPTION '任务队列查询失败';
    END IF;
    
    -- 清理测试数据
    DELETE FROM processing_jobs WHERE id = test_job_id;
    DELETE FROM articles WHERE id = test_article_id;
    DELETE FROM rss_sources WHERE id = test_source_id;
    
    RAISE NOTICE '✅ 任务队列表测试通过';
END $$;

-- 12. 测试系统统计视图
SELECT 
    metric_name,
    metric_value,
    calculated_at
FROM system_statistics
ORDER BY metric_name;

-- =====================================================
-- 最终验证报告
-- =====================================================

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    constraint_count INTEGER;
    trigger_count INTEGER;
    view_count INTEGER;
BEGIN
    -- 统计创建的对象数量
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO constraint_count 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND constraint_type IN ('FOREIGN KEY', 'CHECK', 'UNIQUE');
    
    SELECT COUNT(*) INTO trigger_count 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public';
    
    SELECT COUNT(*) INTO view_count 
    FROM information_schema.views 
    WHERE table_schema = 'public';
    
    -- 生成验证报告
    RAISE NOTICE '==============================================';
    RAISE NOTICE '检查点1.1 - 数据库基础架构验证报告';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ 数据表: % 个', table_count;
    RAISE NOTICE '✅ 索引: % 个', index_count;
    RAISE NOTICE '✅ 约束: % 个', constraint_count;
    RAISE NOTICE '✅ 触发器: % 个', trigger_count;
    RAISE NOTICE '✅ 视图: % 个', view_count;
    RAISE NOTICE '';
    
    -- 验证是否达到预期
    IF table_count >= 9 AND index_count >= 20 AND constraint_count >= 10 THEN
        RAISE NOTICE '🎉 检查点1.1验证通过！';
        RAISE NOTICE '数据库基础架构已就绪，可以开始里程碑1.2';
    ELSE
        RAISE NOTICE '❌ 检查点1.1验证失败！';
        RAISE NOTICE '请检查表结构和约束是否正确创建';
    END IF;
    
    RAISE NOTICE '==============================================';
END $$;