
-- =====================================================
-- 安全清理所有现有的 Cron 任务
-- 在 Supabase SQL Editor 中执行
-- 忽略不存在的任务错误
-- =====================================================

-- 先查看现有任务
SELECT jobname, schedule, active FROM cron.job;

-- 根据实际存在的任务名称来删除
-- 从你之前的查询结果，实际存在的任务有：

SELECT cron.unschedule('fetch-rss-3d-print');
SELECT cron.unschedule('fetch-rss-seo');
SELECT cron.unschedule('fetch-rss-agritech');
SELECT cron.unschedule('fetch-rss-smart-agriculture');
SELECT cron.unschedule('fetch-rss-additive-manufacturing');
SELECT cron.unschedule('manufacturing-rss-update');
SELECT cron.unschedule('process-rss-items-auto');
SELECT cron.unschedule('daily-manufacturing-rss');

-- 再次查看清理后的结果
SELECT jobname, schedule, active FROM cron.job;