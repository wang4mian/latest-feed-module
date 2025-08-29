-- =====================================================
-- Supabase Cron Jobs 设置脚本
-- 在 Supabase SQL Editor 中执行
-- 制造业情报系统 - 自动化任务配置
-- =====================================================

-- 启用 pg_cron 扩展（如果还没启用）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每2小时执行RSS抓取
SELECT cron.schedule(
  'rss-fetch-job',
  '0 */2 * * *',  -- 每2小时的整点执行
  $$
  SELECT net.http_post(
    url := 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/rss-fetch',
    body := '{"source_limit": null, "test_mode": false}',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"}'::jsonb
  );
  $$
);

-- 每15分钟处理任务队列
SELECT cron.schedule(
  'job-processor',
  '*/15 * * * *',  -- 每15分钟执行
  $$
  SELECT net.http_post(
    url := 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/job-processor',
    body := '{"batch_size": 10, "cleanup": true}',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"}'::jsonb
  );
  $$
);

-- 查看已设置的定时任务
SELECT * FROM cron.job;

-- 查看任务执行历史
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- 删除定时任务（如果需要）
-- SELECT cron.unschedule('rss-fetch-job');
-- SELECT cron.unschedule('job-processor');