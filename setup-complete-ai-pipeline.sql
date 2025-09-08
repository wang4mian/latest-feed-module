-- =====================================================
-- 完整AI处理流水线设置
-- 在 Supabase SQL Editor 中执行
-- =====================================================

-- 清理现有的定时任务
SELECT cron.unschedule('manufacturing-rss-fetch');
SELECT cron.unschedule('ai-processing-pipeline');

-- 重新设置完整的流水线
-- 1. 每2小时执行RSS抓取
SELECT cron.schedule(
  'rss-fetch-pipeline',
  '0 */2 * * *',  -- 每2小时的整点执行
  $$
  SELECT net.http_post(
    url := 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/rss-fetch',
    body := '{"source_limit": null, "test_mode": false}',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"}'::jsonb
  );
  $$
);

-- 2. 每15分钟直接调用AI分析  
SELECT cron.schedule(
  'direct-ai-processing',
  '*/15 * * * *',  -- 每15分钟执行
  $$
  SELECT net.http_post(
    url := 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/ai-analyze',
    body := '{"batch_size": 5}',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"}'::jsonb
  );
  $$
);

-- 查看设置的定时任务
SELECT jobname, schedule, active FROM cron.job;

-- 手动触发测试（可选）
-- SELECT net.http_post(
--   url := 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/job-processor',
--   body := '{"batch_size": 1, "cleanup": false}',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"}'::jsonb
-- );