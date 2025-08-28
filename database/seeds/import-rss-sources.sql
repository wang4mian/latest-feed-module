-- =====================================================
-- RSS源数据导入脚本
-- 将legacy_data中的RSS源导入到新的rss_sources表
-- =====================================================

-- 导入RSS源数据 (排除原始的id，让数据库自动生成新的id)
INSERT INTO rss_sources (name, url, vertical_name, topic_for_ai, is_active, created_at) VALUES
('SEO英文', 'https://news.google.com/rss/search?q=SEO&hl=en-US&gl=US&ceid=US:en-US', 'SEO', '搜索引擎优化', true, '2025-07-05 06:25:28.461553+00'),
('GEO英文', 'https://news.google.com/rss/search?q=SEO%2BGEO&hl=en-US&gl=US&ceid=US:en-US', 'SEO', '地理定位技术', true, '2025-07-05 06:25:28.461553+00'),
('3D Print 英文', 'https://news.google.com/rss/search?q=3D%2BPrint&hl=en-US&gl=US&ceid=US:en-US', '3D Print', '3D打印技术', true, '2025-07-05 06:25:28.461553+00'),
('additivemanufacturing 英文', 'https://news.google.com/rss/search?q=additivemanufacturing&hl=en-US&gl=US&ceid=US:en-US', '3D Print', '增材制造', true, '2025-07-05 06:25:28.461553+00'),
('Y Combinator', 'https://news.google.com/rss/search?q=Y%2BCombinator&hl=en-US&gl=US&ceid=US:en-US', 'Startup', '创业孵化', true, '2025-07-05 06:25:28.461553+00'),
('Smart Agriculture', 'https://news.google.com/rss/search?q=Smart%2BAgriculture&hl=en-US&gl=US&ceid=US:en-US', 'AgriTech', '智慧农业', true, '2025-07-05 06:25:28.461553+00'),
('AgriTech', 'https://news.google.com/rss/search?q=AgriTech&hl=en-US&gl=US&ceid=US:en-US', 'AgriTech', '农业科技', true, '2025-07-05 06:25:28.461553+00'),
('Agricultural Robotics', 'https://news.google.com/rss/search?q=Agricultural%2BRobotics&hl=en-US&gl=US&ceid=US:en-US', 'AgriTech', '农业机器人', true, '2025-07-05 06:25:28.461553+00'),

-- 添加更多制造业相关的RSS源
('Industrial IoT', 'https://news.google.com/rss/search?q=Industrial%2BIoT&hl=en-US&gl=US&ceid=US:en-US', 'Industry 4.0', '工业物联网', true, NOW()),
('Smart Manufacturing', 'https://news.google.com/rss/search?q=Smart%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Industry 4.0', '智能制造', true, NOW()),
('Automation Technology', 'https://news.google.com/rss/search?q=Automation%2BTechnology&hl=en-US&gl=US&ceid=US:en-US', 'Industry 4.0', '自动化技术', true, NOW()),
('Robotics Manufacturing', 'https://news.google.com/rss/search?q=Robotics%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Robotics', '制造机器人', true, NOW()),
('Supply Chain Technology', 'https://news.google.com/rss/search?q=Supply%2BChain%2BTechnology&hl=en-US&gl=US&ceid=US:en-US', 'Supply Chain', '供应链科技', true, NOW()),
('Digital Twin', 'https://news.google.com/rss/search?q=Digital%2BTwin&hl=en-US&gl=US&ceid=US:en-US', 'Industry 4.0', '数字孪生', true, NOW()),
('Edge Computing Manufacturing', 'https://news.google.com/rss/search?q=Edge%2BComputing%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Computing', '边缘计算制造', true, NOW()),

-- AI和机器学习相关
('AI Manufacturing', 'https://news.google.com/rss/search?q=AI%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'AI', 'AI制造', true, NOW()),
('Machine Learning Industry', 'https://news.google.com/rss/search?q=Machine%2BLearning%2BIndustry&hl=en-US&gl=US&ceid=US:en-US', 'AI', '工业机器学习', true, NOW()),
('Computer Vision Manufacturing', 'https://news.google.com/rss/search?q=Computer%2BVision%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'AI', '制造业计算机视觉', true, NOW()),

-- 新材料和能源
('Advanced Materials', 'https://news.google.com/rss/search?q=Advanced%2BMaterials&hl=en-US&gl=US&ceid=US:en-US', 'Materials', '先进材料', true, NOW()),
('Battery Technology', 'https://news.google.com/rss/search?q=Battery%2BTechnology&hl=en-US&gl=US&ceid=US:en-US', 'Energy', '电池技术', true, NOW()),
('Solar Manufacturing', 'https://news.google.com/rss/search?q=Solar%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Energy', '太阳能制造', true, NOW()),
('Green Manufacturing', 'https://news.google.com/rss/search?q=Green%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Sustainability', '绿色制造', true, NOW()),

-- 半导体和电子制造
('Semiconductor Manufacturing', 'https://news.google.com/rss/search?q=Semiconductor%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Semiconductor', '半导体制造', true, NOW()),
('Electronics Manufacturing', 'https://news.google.com/rss/search?q=Electronics%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Electronics', '电子制造', true, NOW()),
('PCB Manufacturing', 'https://news.google.com/rss/search?q=PCB%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Electronics', 'PCB制造', true, NOW()),

-- 汽车制造
('Automotive Manufacturing', 'https://news.google.com/rss/search?q=Automotive%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Automotive', '汽车制造', true, NOW()),
('Electric Vehicle Manufacturing', 'https://news.google.com/rss/search?q=Electric%2BVehicle%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Automotive', '电动汽车制造', true, NOW()),
('Autonomous Vehicle Technology', 'https://news.google.com/rss/search?q=Autonomous%2BVehicle%2BTechnology&hl=en-US&gl=US&ceid=US:en-US', 'Automotive', '自动驾驶技术', true, NOW()),

-- 生物技术和医疗制造
('Biotech Manufacturing', 'https://news.google.com/rss/search?q=Biotech%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Biotech', '生物技术制造', true, NOW()),
('Medical Device Manufacturing', 'https://news.google.com/rss/search?q=Medical%2BDevice%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Medical', '医疗器械制造', true, NOW()),
('Pharmaceutical Manufacturing', 'https://news.google.com/rss/search?q=Pharmaceutical%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Pharmaceutical', '制药制造', true, NOW()),

-- 航空航天制造
('Aerospace Manufacturing', 'https://news.google.com/rss/search?q=Aerospace%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Aerospace', '航空航天制造', true, NOW()),
('Drone Manufacturing', 'https://news.google.com/rss/search?q=Drone%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Aerospace', '无人机制造', true, NOW()),

-- 食品制造和包装
('Food Manufacturing Technology', 'https://news.google.com/rss/search?q=Food%2BManufacturing%2BTechnology&hl=en-US&gl=US&ceid=US:en-US', 'Food', '食品制造技术', true, NOW()),
('Packaging Technology', 'https://news.google.com/rss/search?q=Packaging%2BTechnology&hl=en-US&gl=US&ceid=US:en-US', 'Packaging', '包装技术', true, NOW()),

-- 纺织和服装制造
('Textile Manufacturing', 'https://news.google.com/rss/search?q=Textile%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Textile', '纺织制造', true, NOW()),
('Smart Textiles', 'https://news.google.com/rss/search?q=Smart%2BTextiles&hl=en-US&gl=US&ceid=US:en-US', 'Textile', '智能纺织品', true, NOW()),

-- 建筑和建材制造
('Construction Technology', 'https://news.google.com/rss/search?q=Construction%2BTechnology&hl=en-US&gl=US&ceid=US:en-US', 'Construction', '建筑技术', true, NOW()),
('Building Materials Manufacturing', 'https://news.google.com/rss/search?q=Building%2BMaterials%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'Construction', '建材制造', true, NOW()),

-- 质量控制和检测
('Quality Control Technology', 'https://news.google.com/rss/search?q=Quality%2BControl%2BTechnology&hl=en-US&gl=US&ceid=US:en-US', 'Quality', '质量控制技术', true, NOW()),
('Manufacturing Analytics', 'https://news.google.com/rss/search?q=Manufacturing%2BAnalytics&hl=en-US&gl=US&ceid=US:en-US', 'Analytics', '制造分析', true, NOW()),

-- 中国制造业相关（用于对比分析）
('China Manufacturing', 'https://news.google.com/rss/search?q=China%2BManufacturing&hl=en-US&gl=US&ceid=US:en-US', 'China', '中国制造', true, NOW()),
('Made in China 2025', 'https://news.google.com/rss/search?q=Made%2Bin%2BChina%2B2025&hl=en-US&gl=US&ceid=US:en-US', 'China', '中国制造2025', true, NOW());

-- 验证导入结果
SELECT 
    COUNT(*) as total_sources,
    COUNT(*) FILTER (WHERE is_active = true) as active_sources,
    COUNT(DISTINCT vertical_name) as vertical_categories
FROM rss_sources;

-- 按垂直领域统计
SELECT 
    vertical_name,
    COUNT(*) as source_count
FROM rss_sources
GROUP BY vertical_name
ORDER BY source_count DESC;

-- 显示导入的RSS源样本
SELECT 
    id,
    name,
    vertical_name,
    topic_for_ai,
    is_active
FROM rss_sources
ORDER BY id
LIMIT 10;

-- 生成导入报告
DO $$
DECLARE
    total_count INTEGER;
    active_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM rss_sources;
    SELECT COUNT(*) INTO active_count FROM rss_sources WHERE is_active = true;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'RSS源数据导入完成！';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '总RSS源数量: %', total_count;
    RAISE NOTICE '活跃RSS源数量: %', active_count;
    RAISE NOTICE '覆盖制造业各个垂直领域';
    RAISE NOTICE '==============================================';
END $$;