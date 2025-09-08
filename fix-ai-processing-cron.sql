-- =====================================================
-- 修复 AI 处理定时任务
-- 让定时任务直接调用 ai-analyze 而不是 job-processor
-- =====================================================

-- 1. 移除有问题的 ai-processing-pipeline 任务
SELECT cron.unschedule('ai-processing-pipeline');

-- 2. 创建新的直接调用 ai-analyze 的定时任务
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

-- 3. 查看当前所有定时任务
SELECT jobname, schedule, active FROM cron.job;