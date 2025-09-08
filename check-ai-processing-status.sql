-- 📊 检查AI处理状态和进度
-- 在Supabase SQL Editor中执行

-- 1. 查看当前定时任务状态
SELECT 
  jobname as 任务名称,
  schedule as 执行频率,
  active as 是否激活,
  nodename as 节点
FROM cron.job 
WHERE jobname = 'direct-ai-processing';

-- 2. 统计文章处理进度
SELECT 
  COUNT(CASE WHEN ai_score IS NULL THEN 1 END) as 待处理文章数,
  COUNT(CASE WHEN ai_score IS NOT NULL THEN 1 END) as 已处理文章数,
  COUNT(*) as 总文章数,
  ROUND(
    (COUNT(CASE WHEN ai_score IS NOT NULL THEN 1 END)::float / COUNT(*)::float) * 100, 
    2
  ) as 完成百分比
FROM articles;

-- 3. 查看最近处理的文章 (最新10篇)
SELECT 
  title as 文章标题,
  ai_score as AI评分,
  ai_category as 分类,
  updated_at as 处理时间,
  overall_status as 状态
FROM articles 
WHERE ai_score IS NOT NULL
ORDER BY updated_at DESC 
LIMIT 10;

-- 4. 查看今日处理统计
SELECT 
  COUNT(*) as 今日处理数量,
  AVG(ai_score) as 平均评分,
  MIN(updated_at) as 最早处理时间,
  MAX(updated_at) as 最近处理时间
FROM articles 
WHERE ai_score IS NOT NULL 
  AND updated_at::date = CURRENT_DATE;

-- 5. 预估完成时间
WITH stats AS (
  SELECT COUNT(CASE WHEN ai_score IS NULL THEN 1 END) as pending_count
  FROM articles
)
SELECT 
  pending_count as 剩余待处理文章,
  CEIL(pending_count::float / 15) as 需要批次数,
  CEIL(pending_count::float / 15) * 15 as 预计分钟数,
  ROUND(CEIL(pending_count::float / 15) * 15 / 60.0, 1) as 预计小时数,
  NOW() + INTERVAL '1 minute' * (CEIL(pending_count::float / 15) * 15) as 预计完成时间
FROM stats;