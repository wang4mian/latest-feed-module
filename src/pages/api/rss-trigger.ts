export const GET = async ({ request }: { request: Request }) => {
  // 验证 Authorization header
  const authHeader = request.headers.get('authorization')
  const cronSecret = import.meta.env.CRON_SECRET || '123456'
  
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    console.log('开始执行RSS抓取...')
    
    // 构建 Supabase Edge Function URL
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
    const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase configuration')
    }
    
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/rss-fetch`
    
    // 调用 RSS 抓取 Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({
        test_mode: false,
        source_limit: null,
        cron_secret: cronSecret
      })
    })
    
    if (!response.ok) {
      throw new Error(`Edge Function responded with ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    console.log('RSS抓取任务完成:', result)
    
    return new Response(JSON.stringify({
      success: true,
      message: 'RSS trigger completed successfully',
      timestamp: new Date().toISOString(),
      edge_function_result: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error: any) {
    console.error('RSS trigger failed:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}