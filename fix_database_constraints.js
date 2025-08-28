import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // 使用服务端密钥执行管理操作

console.log('使用服务端密钥连接数据库...')
console.log('URL:', supabaseUrl)
console.log('Key exists:', !!supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixDatabaseConstraints() {
  try {
    console.log('正在修复数据库约束...')
    
    // 删除旧的检查约束
    const dropConstraintSQL = `
      ALTER TABLE articles 
      DROP CONSTRAINT IF EXISTS articles_overall_status_check;
    `
    
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: dropConstraintSQL
    })
    
    if (dropError && !dropError.message.includes('does not exist')) {
      console.error('删除约束失败:', dropError)
      // 继续尝试添加新约束
    } else {
      console.log('✅ 删除旧约束成功')
    }
    
    // 添加新的检查约束
    const addConstraintSQL = `
      ALTER TABLE articles 
      ADD CONSTRAINT articles_overall_status_check 
      CHECK (overall_status IN (
        'draft', 
        'processing', 
        'ready_for_review', 
        'reviewed', 
        'published',
        'adopted',
        'archived', 
        'ignored'
      ));
    `
    
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: addConstraintSQL
    })
    
    if (addError) {
      console.error('添加约束失败:', addError)
      
      // 尝试直接通过 SQL 执行
      console.log('尝试通过 SQL 直接执行...')
      const { data, error: sqlError } = await supabase
        .from('articles')
        .select('overall_status')
        .limit(1)
      
      console.log('当前可用状态值测试:', data, sqlError)
      
    } else {
      console.log('✅ 添加新约束成功')
    }
    
  } catch (error) {
    console.error('修复约束失败:', error)
  }
}

fixDatabaseConstraints()