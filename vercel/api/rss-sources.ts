import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'test') {
      // 测试RSS源连接
      const sourceId = searchParams.get('sourceId')
      if (!sourceId) {
        return NextResponse.json({ error: 'Missing sourceId' }, { status: 400 })
      }
      
      // 获取RSS源信息
      const { data: source, error: sourceError } = await supabase
        .from('rss_sources')
        .select('*')
        .eq('id', sourceId)
        .single()
      
      if (sourceError || !source) {
        return NextResponse.json({ error: 'RSS源不存在' }, { status: 404 })
      }
      
      // 测试RSS连接
      try {
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Manufacturing Intelligence System/1.0'
          },
          timeout: 10000
        })
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('xml') || contentType.includes('rss')) {
            return NextResponse.json({ 
              success: true, 
              message: 'RSS源连接正常',
              status: response.status,
              contentType 
            })
          } else {
            return NextResponse.json({ 
              success: false, 
              message: '响应格式不是有效的RSS/XML',
              contentType 
            })
          }
        } else {
          return NextResponse.json({ 
            success: false, 
            message: `HTTP错误: ${response.status} ${response.statusText}` 
          })
        }
      } catch (fetchError: any) {
        return NextResponse.json({ 
          success: false, 
          message: `连接失败: ${fetchError.message}` 
        })
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('RSS源操作错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, url, vertical_name, topic_for_ai, is_active } = body
    
    // 验证必需字段
    if (!name || !url) {
      return NextResponse.json({ error: '名称和URL是必需的' }, { status: 400 })
    }
    
    // 验证URL格式
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: '无效的URL格式' }, { status: 400 })
    }
    
    // 检查URL是否已存在
    const { data: existing } = await supabase
      .from('rss_sources')
      .select('id')
      .eq('url', url)
      .single()
    
    if (existing) {
      return NextResponse.json({ error: '该RSS源已存在' }, { status: 409 })
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
        error_count: 0
      }])
      .select()
      .single()
    
    if (createError) {
      console.error('创建RSS源失败:', createError)
      return NextResponse.json({ error: '创建RSS源失败' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'RSS源创建成功',
      data: newSource 
    })
  } catch (error: any) {
    console.error('创建RSS源错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Missing source ID' }, { status: 400 })
    }
    
    if (action === 'toggle') {
      // 切换RSS源状态
      const { currentStatus } = body
      const newStatus = !currentStatus
      
      const { error: updateError } = await supabase
        .from('rss_sources')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (updateError) {
        console.error('切换RSS源状态失败:', updateError)
        return NextResponse.json({ error: '状态更新失败' }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `RSS源已${newStatus ? '启用' : '禁用'}`,
        newStatus 
      })
    } else {
      // 更新RSS源信息
      const allowedFields = ['name', 'url', 'vertical_name', 'topic_for_ai', 'is_active']
      const filteredData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = updateData[key]
          return obj
        }, {})
      
      if (Object.keys(filteredData).length === 0) {
        return NextResponse.json({ error: '没有有效的更新字段' }, { status: 400 })
      }
      
      filteredData.updated_at = new Date().toISOString()
      
      const { error: updateError } = await supabase
        .from('rss_sources')
        .update(filteredData)
        .eq('id', id)
      
      if (updateError) {
        console.error('更新RSS源失败:', updateError)
        return NextResponse.json({ error: '更新失败' }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'RSS源更新成功' 
      })
    }
  } catch (error: any) {
    console.error('更新RSS源错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('id')
    
    if (!sourceId) {
      return NextResponse.json({ error: 'Missing source ID' }, { status: 400 })
    }
    
    // 检查是否有相关文章
    const { data: relatedArticles } = await supabase
      .from('articles')
      .select('id')
      .eq('source_id', sourceId)
      .limit(1)
    
    if (relatedArticles && relatedArticles.length > 0) {
      return NextResponse.json({ 
        error: '该RSS源下还有文章，请先处理相关文章后再删除' 
      }, { status: 409 })
    }
    
    // 删除RSS源
    const { error: deleteError } = await supabase
      .from('rss_sources')
      .delete()
      .eq('id', sourceId)
    
    if (deleteError) {
      console.error('删除RSS源失败:', deleteError)
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'RSS源删除成功' 
    })
  } catch (error: any) {
    console.error('删除RSS源错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}