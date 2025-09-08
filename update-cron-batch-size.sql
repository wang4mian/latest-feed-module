-- 🚀 更新AI处理定时任务批量大小
-- 从5篇提升到15篇，提高3倍处理速度

-- 首先删除现有的定时任务
SELECT cron.unschedule('direct-ai-processing');

-- 重新创建使用新批量大小的定时任务
SELECT cron.schedule(
  'direct-ai-processing',
  '*/15 * * * *',  -- 每15分钟执行
  $$
  SELECT net.http_post(
    url := 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/ai-analyze',
    body := '{"batch_size": 15}',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"}'::jsonb
  );
  $$
);

-- 验证新的定时任务
SELECT jobname, schedule, active, command FROM cron.job WHERE jobname = 'direct-ai-processing';

-- 显示更新信息
SELECT 
  '✅ AI处理批量大小已更新' as status,
  '从5篇 → 15篇' as improvement,
  '处理速度提升3倍' as benefit,
  '6小时内完成所有待处理文章' as timeline;