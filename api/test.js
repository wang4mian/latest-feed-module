export default async function handler(req, res) {
  return res.status(200).json({
    message: "Vercel API 路由工作正常",
    timestamp: new Date().toISOString(),
    method: req.method,
    env_check: {
      supabase_url: !!process.env.PUBLIC_SUPABASE_URL,
      supabase_key: !!process.env.PUBLIC_SUPABASE_ANON_KEY,
      cron_secret: !!process.env.CRON_SECRET
    }
  })
}