import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing article ID' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 更新文章状态为 adopted
    const { data, error } = await supabase
      .from('articles')
      .update({ 
        overall_status: 'adopted',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to adopt article:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in adopt API:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};