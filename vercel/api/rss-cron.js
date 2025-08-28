// =====================================================
// Vercel API Endpoint: RSS Cron Trigger
// 路径: /api/rss-cron
// 功能: 定时触发Supabase Edge Function进行RSS抓取
// =====================================================

export default async function handler(req, res) {
  // 只允许GET请求 (Vercel cron使用GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    // 验证是否为Vercel Cron请求
    const authHeader = req.headers.authorization
    const cronSecret = process.env.CRON_SECRET || '123456'
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.log('Unauthorized cron request')
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    console.log('开始执行RSS抓取定时任务...')
    
    // 构建Supabase Edge Function URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/rss-fetch`
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase configuration')
    }
    
    // 调用RSS抓取Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({
        test_mode: false,        // 生产模式
        source_limit: null,      // 处理所有活跃源
        cron_secret: cronSecret  // 传递验证密钥
      })
    })
    
    if (!response.ok) {
      throw new Error(`Edge Function responded with ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    console.log('RSS抓取任务完成:', result)
    
    // 返回成功结果
    return res.status(200).json({
      success: true,
      message: 'RSS cron job completed successfully',
      timestamp: new Date().toISOString(),
      edge_function_result: result
    })
    
  } catch (error) {
    console.error('RSS cron job failed:', error)
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}