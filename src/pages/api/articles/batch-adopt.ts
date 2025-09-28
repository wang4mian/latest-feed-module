import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: 'Article IDs array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 批量更新文章状态为 'adopted'
    const { data, error } = await supabase
      .from('articles')
      .update({ 
        overall_status: 'adopted',
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .select();

    if (error) {
      console.error('Error batch adopting articles:', error);
      return new Response(JSON.stringify({ error: 'Failed to adopt articles' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: data?.length || 0,
      message: `Successfully adopted ${data?.length || 0} articles`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in batch-adopt API:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};