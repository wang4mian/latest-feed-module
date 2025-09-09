import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const sourceId = url.searchParams.get('sourceId');

  // Test RSS source connection
  if (action === 'test' && sourceId) {
    try {
      // Get RSS source details
      const { data: source, error } = await supabase
        .from('rss_sources')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (error || !source) {
        return new Response(JSON.stringify({
          success: false,
          message: 'RSS源不存在'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Test RSS feed connectivity
      try {
        const rssResponse = await fetch(source.url, {
          headers: {
            'User-Agent': 'KUATO RSS Reader/1.0'
          },
          signal: AbortSignal.timeout(10000) // 10s timeout
        });

        if (!rssResponse.ok) {
          throw new Error(`HTTP ${rssResponse.status}`);
        }

        const contentType = rssResponse.headers.get('content-type') || '';
        if (!contentType.includes('xml') && !contentType.includes('rss')) {
          console.warn(`Unexpected content-type for ${source.url}: ${contentType}`);
        }

        const rssText = await rssResponse.text();
        
        if (rssText.length < 100) {
          throw new Error('RSS内容过短，可能无效');
        }

        // Update success stats
        await supabase
          .from('rss_sources')
          .update({
            last_fetch_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            success_count: supabase.raw('success_count + 1'),
            fetch_count: supabase.raw('fetch_count + 1'),
            error_count: 0,
            last_error: null
          })
          .eq('id', sourceId);

        return new Response(JSON.stringify({
          success: true,
          message: `RSS源连接正常 (${Math.round(rssText.length / 1024)}KB)`
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        
        // Update error stats
        await supabase
          .from('rss_sources')
          .update({
            last_fetch_at: new Date().toISOString(),
            fetch_count: supabase.raw('fetch_count + 1'),
            error_count: supabase.raw('error_count + 1'),
            last_error: errorMessage
          })
          .eq('id', sourceId);

        return new Response(JSON.stringify({
          success: false,
          message: `RSS源连接失败: ${errorMessage}`
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

    } catch (error) {
      console.error('Test RSS source error:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'RSS源测试失败'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({
    success: false,
    message: 'Invalid action'
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.url) {
      return new Response(JSON.stringify({
        success: false,
        error: '名称和URL是必填项'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate URL format
    try {
      new URL(data.url);
    } catch {
      return new Response(JSON.stringify({
        success: false,
        error: 'URL格式不正确'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for duplicate URLs
    const { data: existingSource, error: checkError } = await supabase
      .from('rss_sources')
      .select('id, name')
      .eq('url', data.url)
      .single();

    if (existingSource) {
      return new Response(JSON.stringify({
        success: false,
        error: `URL已存在于RSS源"${existingSource.name}"中`
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert new RSS source
    const { data: newSource, error: insertError } = await supabase
      .from('rss_sources')
      .insert({
        name: data.name.trim(),
        url: data.url.trim(),
        vertical_name: data.vertical_name || 'Other',
        topic_for_ai: data.topic_for_ai || '智能制造',
        is_active: data.is_active !== false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert RSS source error:', insertError);
      return new Response(JSON.stringify({
        success: false,
        error: '保存失败: ' + insertError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'RSS源添加成功',
      data: newSource
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('POST RSS source error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '服务器错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'RSS源ID是必需的'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Handle toggle status action
    if (data.action === 'toggle') {
      const newStatus = !data.currentStatus;
      updateData.is_active = newStatus;
      
      const { error: updateError } = await supabase
        .from('rss_sources')
        .update(updateData)
        .eq('id', data.id);

      if (updateError) {
        return new Response(JSON.stringify({
          success: false,
          error: '状态更新失败: ' + updateError.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `RSS源已${newStatus ? '启用' : '禁用'}`
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle direct status update
    if (typeof data.is_active === 'boolean') {
      updateData.is_active = data.is_active;
    }

    // Handle other field updates
    if (data.name) updateData.name = data.name.trim();
    if (data.url) {
      try {
        new URL(data.url);
        updateData.url = data.url.trim();
      } catch {
        return new Response(JSON.stringify({
          success: false,
          error: 'URL格式不正确'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    if (data.vertical_name) updateData.vertical_name = data.vertical_name;
    if (data.topic_for_ai) updateData.topic_for_ai = data.topic_for_ai;

    const { error: updateError } = await supabase
      .from('rss_sources')
      .update(updateData)
      .eq('id', data.id);

    if (updateError) {
      console.error('Update RSS source error:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: '更新失败: ' + updateError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'RSS源更新成功'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('PUT RSS source error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '服务器错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const sourceId = url.searchParams.get('id');
    
    if (!sourceId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'RSS源ID是必需的'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if RSS source exists
    const { data: existingSource, error: checkError } = await supabase
      .from('rss_sources')
      .select('id, name')
      .eq('id', sourceId)
      .single();

    if (checkError || !existingSource) {
      return new Response(JSON.stringify({
        success: false,
        error: 'RSS源不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if there are articles from this source
    const { count: articleCount, error: articleCountError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('source_id', sourceId);

    if (articleCountError) {
      console.error('Check articles count error:', articleCountError);
    }

    // Delete the RSS source
    const { error: deleteError } = await supabase
      .from('rss_sources')
      .delete()
      .eq('id', sourceId);

    if (deleteError) {
      console.error('Delete RSS source error:', deleteError);
      return new Response(JSON.stringify({
        success: false,
        error: '删除失败: ' + deleteError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const message = articleCount && articleCount > 0 
      ? `RSS源"${existingSource.name}"已删除 (包含${articleCount}篇文章)`
      : `RSS源"${existingSource.name}"已删除`;

    return new Response(JSON.stringify({
      success: true,
      message: message
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('DELETE RSS source error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '服务器错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};