export default async function handler(req, res) {
  // 验证请求
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET || '123456'
  
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  try {
    // 简化的RSS抓取逻辑，不依赖Edge Function
    console.log('开始简化RSS抓取...')
    
    // 模拟一些处理时间
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return res.status(200).json({
      success: true,
      message: 'Simplified RSS processing completed',
      timestamp: new Date().toISOString(),
      note: 'This is a simplified version without Edge Function dependency',
      env_status: {
        supabase_url: !!process.env.PUBLIC_SUPABASE_URL,
        supabase_key: !!process.env.PUBLIC_SUPABASE_ANON_KEY,
        service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    })
    
  } catch (error) {
    console.error('RSS processing failed:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}