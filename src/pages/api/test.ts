export const GET = async () => {
  return new Response(JSON.stringify({
    message: "API 路由工作正常",
    timestamp: new Date().toISOString(),
    env_check: {
      supabase_url: !!import.meta.env.PUBLIC_SUPABASE_URL,
      supabase_key: !!import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      cron_secret: !!import.meta.env.CRON_SECRET
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}