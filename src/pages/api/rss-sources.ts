import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const action = url.searchParams.get('action');
    
    if (action === 'test') {
      // 测试RSS源连接
      const sourceId = url.searchParams.get('sourceId');
      if (!sourceId) {
        return new Response(JSON.stringify({ error: 'Missing sourceId' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      // 获取RSS源信息
      const { data: source, error: sourceError } = await supabase
        .from('rss_sources')
        .select('*')
        .eq('id', sourceId)
        .single();
      
      if (sourceError || !source) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'RSS源不存在' 
        }), { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      // 测试RSS连接
      try {
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Manufacturing Intelligence System/1.0'
          },
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
            // 更新成功统计
            await supabase
              .from('rss_sources')
              .update({
                last_fetch_at: new Date().toISOString(),
                last_success_at: new Date().toISOString(),
                error_count: 0,
                last_error: null
              })
              .eq('id', sourceId);
              
            return new Response(JSON.stringify({ 
              success: true, 
              message: `RSS源连接正常 (${response.status})`,
              details: { status: response.status, contentType }
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          } else {
            return new Response(JSON.stringify({ 
              success: false, 
              message: '响应不是有效的RSS/XML格式',
              details: { contentType }
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        } else {
          const errorMsg = `HTTP错误: ${response.status} ${response.statusText}`;
          
          // 更新错误统计
          await supabase
            .from('rss_sources')
            .update({
              last_fetch_at: new Date().toISOString(),
              error_count: source.error_count + 1,
              last_error: errorMsg
            })
            .eq('id', sourceId);
            
          return new Response(JSON.stringify({ 
            success: false, 
            message: errorMsg 
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (fetchError: any) {
        const errorMsg = `连接失败: ${fetchError.message}`;
        
        // 更新错误统计
        await supabase
          .from('rss_sources')
          .update({
            last_fetch_at: new Date().toISOString(),
            error_count: source.error_count + 1,
            last_error: errorMsg
          })
          .eq('id', sourceId);
          
        return new Response(JSON.stringify({ 
          success: false, 
          message: errorMsg 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error: any) {
    console.error('RSS源操作错误:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, url, vertical_name, topic_for_ai, is_active } = body;
    
    // 验证必需字段
    if (!name?.trim() || !url?.trim()) {
      return new Response(JSON.stringify({ 
        success: false,
        error: '名称和URL是必需的' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // 验证URL格式
    try {
      new URL(url);
    } catch {
      return new Response(JSON.stringify({ 
        success: false,
        error: '无效的URL格式' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // 检查URL是否已存在
    const { data: existing } = await supabase
      .from('rss_sources')
      .select('id')
      .eq('url', url.trim())
      .single();
    
    if (existing) {
      return new Response(JSON.stringify({ 
        success: false,
        error: '该RSS源已存在' 
      }), { 
        status: 409, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // 创建新的RSS源
    const { data: newSource, error: createError } = await supabase
      .from('rss_sources')
      .insert([{
        name: name.trim(),
        url: url.trim(),
        vertical_name: vertical_name || '未分类',
        topic_for_ai: topic_for_ai || '智能制造',
        is_active: is_active !== false, // 默认为true
        fetch_count: 0,
        success_count: 0,
        error_count: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('创建RSS源失败:', createError);
      return new Response(JSON.stringify({ 
        success: false,
        error: '创建RSS源失败: ' + createError.message 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'RSS源创建成功',
      data: newSource 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('创建RSS源错误:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, action, ...updateData } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ 
        success: false,
        error: '缺少RSS源ID' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    if (action === 'toggle') {
      // 切换RSS源状态
      const { currentStatus } = body;
      const newStatus = !currentStatus;
      
      const { error: updateError } = await supabase
        .from('rss_sources')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) {
        console.error('切换RSS源状态失败:', updateError);
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
        message: `RSS源已${newStatus ? '启用' : '禁用'}`,
        newStatus 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // 更新RSS源信息
      const allowedFields = ['name', 'url', 'vertical_name', 'topic_for_ai', 'is_active'];
      const filteredData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {});
      
      if (Object.keys(filteredData).length === 0) {
        return new Response(JSON.stringify({ 
          success: false,
          error: '没有有效的更新字段' 
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      filteredData.updated_at = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('rss_sources')
        .update(filteredData)
        .eq('id', id);
      
      if (updateError) {
        console.error('更新RSS源失败:', updateError);
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
    }
  } catch (error: any) {
    console.error('更新RSS源错误:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const sourceId = url.searchParams.get('id');
    
    if (!sourceId) {
      return new Response(JSON.stringify({ 
        success: false,
        error: '缺少RSS源ID' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // 检查是否有相关文章
    const { data: relatedArticles, count } = await supabase
      .from('articles')
      .select('id', { count: 'exact' })
      .eq('source_id', sourceId)
      .limit(1);
    
    if (count && count > 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: '该RSS源下还有文章，请先处理相关文章后再删除' 
      }), { 
        status: 409, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // 删除RSS源
    const { error: deleteError } = await supabase
      .from('rss_sources')
      .delete()
      .eq('id', sourceId);
    
    if (deleteError) {
      console.error('删除RSS源失败:', deleteError);
      return new Response(JSON.stringify({ 
        success: false,
        error: '删除失败: ' + deleteError.message 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'RSS源删除成功' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('删除RSS源错误:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};