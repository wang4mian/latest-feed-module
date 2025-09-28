-- =====================================================
-- 创建每日AI使用统计表
-- 用于跟踪token使用量和费用
-- =====================================================

CREATE TABLE daily_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,                    -- 日期 (YYYY-MM-DD)
  
  -- 文章处理统计
  articles_processed INTEGER NOT NULL DEFAULT 0, -- 当日处理文章数
  
  -- Token使用统计
  input_tokens BIGINT NOT NULL DEFAULT 0,        -- 输入token总数
  output_tokens BIGINT NOT NULL DEFAULT 0,       -- 输出token总数
  total_tokens BIGINT NOT NULL DEFAULT 0,        -- 总token数
  
  -- 费用统计 (美元)
  input_cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,  -- 输入费用 (USD)
  output_cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0, -- 输出费用 (USD)  
  total_cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,  -- 总费用 (USD)
  
  -- 费用统计 (人民币)
  total_cost_cny DECIMAL(10,4) NOT NULL DEFAULT 0,  -- 总费用 (CNY, 按7.2汇率)
  
  -- 效率指标
  avg_cost_per_article_usd DECIMAL(10,6) NOT NULL DEFAULT 0, -- 每篇文章平均费用
  avg_tokens_per_article DECIMAL(10,2) NOT NULL DEFAULT 0,   -- 每篇文章平均token数
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_daily_ai_usage_date ON daily_ai_usage(date DESC);
CREATE INDEX idx_daily_ai_usage_created_at ON daily_ai_usage(created_at DESC);

-- 插入说明记录
INSERT INTO daily_ai_usage (
  date,
  articles_processed,
  input_tokens,
  output_tokens,
  total_tokens,
  input_cost_usd,
  output_cost_usd,
  total_cost_usd,
  total_cost_cny,
  avg_cost_per_article_usd,
  avg_tokens_per_article
) VALUES (
  CURRENT_DATE,
  0,
  0,
  0,
  0,
  0.000000,
  0.000000,
  0.000000,
  0.0000,
  0.000000,
  0.00
);

-- 创建视图：月度统计
CREATE VIEW monthly_ai_usage AS
SELECT 
  DATE_TRUNC('month', date) as month,
  SUM(articles_processed) as total_articles,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(total_cost_usd) as total_cost_usd,
  SUM(total_cost_cny) as total_cost_cny,
  AVG(avg_cost_per_article_usd) as avg_cost_per_article_usd,
  AVG(avg_tokens_per_article) as avg_tokens_per_article
FROM daily_ai_usage
WHERE articles_processed > 0
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC;

-- 创建函数：计算每篇文章平均token数
CREATE OR REPLACE FUNCTION calculate_avg_tokens_per_article()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.articles_processed > 0 THEN
    NEW.avg_tokens_per_article = NEW.total_tokens::decimal / NEW.articles_processed;
  ELSE
    NEW.avg_tokens_per_article = 0;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_calculate_avg_tokens_per_article
  BEFORE INSERT OR UPDATE ON daily_ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION calculate_avg_tokens_per_article();

-- 添加注释
COMMENT ON TABLE daily_ai_usage IS 'AI服务每日使用统计 - 用于跟踪Gemini AI的token使用量和费用';
COMMENT ON COLUMN daily_ai_usage.date IS '统计日期';
COMMENT ON COLUMN daily_ai_usage.articles_processed IS '当日AI分析的文章数量';
COMMENT ON COLUMN daily_ai_usage.input_tokens IS 'Gemini AI输入token总数';
COMMENT ON COLUMN daily_ai_usage.output_tokens IS 'Gemini AI输出token总数';
COMMENT ON COLUMN daily_ai_usage.total_cost_usd IS '当日AI服务总费用 (USD)';
COMMENT ON COLUMN daily_ai_usage.avg_cost_per_article_usd IS '每篇文章平均AI分析费用 (USD)';