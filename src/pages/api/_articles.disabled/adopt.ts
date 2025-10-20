import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// Jina AI 内容重新抓取函数
async function reextractWithJina(url: string): Promise<string | null> {
  try {
    console.log('🔄 Re-extracting content with Jina AI for adopted article...')
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`
    
    const jinaResponse = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'KUATO-Intelligence/1.0'
      }
    })

    if (jinaResponse.ok) {
      const jinaData = await jinaResponse.json()
      
      if (jinaData.code === 200 && jinaData.data && jinaData.data.content) {
        const content = jinaData.data.content
        if (content && content.length > 100) {
          console.log(`✅ Jina AI re-extraction success: ${content.length} characters`)
          console.log(`📄 Updated title: ${jinaData.data.title || 'No title'}`)
          return content
        }
      } else {
        console.warn(`⚠️ Jina AI returned code ${jinaData.code}: ${jinaData.status}`)
      }
    } else {
      console.error(`❌ Jina AI HTTP error: ${jinaResponse.status} ${jinaResponse.statusText}`)
    }
  } catch (error) {
    console.error('❌ Jina AI re-extraction failed:', error)
  }
  
  return null
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing article ID' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 先获取文章信息（需要URL）
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('link, title, full_content')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Failed to fetch article:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 尝试用 Jina AI 重新抓取内容
    let updatedContent = article.full_content
    const newContent = await reextractWithJina(article.link)
    
    if (newContent && newContent !== article.full_content) {
      updatedContent = newContent
      console.log(`📝 Content updated for: ${article.title}`)
    } else {
      console.log(`📝 Keeping original content for: ${article.title}`)
    }

    // 更新文章状态为 adopted，并更新内容（如果有新内容）
    const updateData: any = { 
      overall_status: 'adopted',
      updated_at: new Date().toISOString()
    }

    if (newContent) {
      updateData.full_content = updatedContent
    }

    const { data, error } = await supabase
      .from('articles')
      .update(updateData)
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
      JSON.stringify({ 
        success: true, 
        data,
        contentUpdated: !!newContent,
        message: newContent ? 'Article adopted and content updated with Jina AI' : 'Article adopted'
      }), 
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