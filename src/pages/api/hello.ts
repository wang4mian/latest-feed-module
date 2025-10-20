import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    message: 'Hello from Vercel!',
    timestamp: new Date().toISOString(),
    success: true
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};