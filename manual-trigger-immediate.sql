-- 🚀 立即触发一次AI批量处理
-- 在Supabase SQL Editor中执行此命令

-- 方法1：直接调用Edge Function (推荐)
SELECT net.http_post(
  url := 'https://msvgeriacsaaakmxvqye.supabase.co/functions/v1/ai-analyze',
  body := '{"batch_size": 15}',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmdlcmlhY3NhYWFrbXh2cXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYwNDIwOSwiZXhwIjoyMDUzMTgwMjA5fQ.O1zKC51UUwQWxSsavmIiVQVFZuexYP1HoC3YNY4ViM0"}'::jsonb
) as result;

-- 方法2：查看当前待处理文章数量
SELECT 
  COUNT(*) as pending_articles,
  '待处理文章数量' as description
FROM articles 
WHERE ai_score IS NULL;

-- 方法3：查看最近处理的文章
SELECT 
  COUNT(*) as processed_today,
  '今日已处理文章' as description
FROM articles 
WHERE ai_score IS NOT NULL 
  AND updated_at >= CURRENT_DATE;