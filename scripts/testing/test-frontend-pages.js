#!/usr/bin/env node

/**
 * 测试前端页面是否正常加载
 * Test frontend pages loading
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../..')

async function testFrontendPages() {
  console.log('🌐 测试前端页面访问...\n')
  
  // 启动开发服务器
  const server = spawn('npm', ['run', 'dev'], { 
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe']
  })
  
  let serverReady = false
  let serverUrl = ''
  
  return new Promise((resolve, reject) => {
    // 监听服务器输出
    server.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('服务器日志:', output)
      
      // 检查是否服务器已启动
      if (output.includes('Local:') && output.includes('4321')) {
        serverReady = true
        serverUrl = 'http://localhost:4321'
        console.log(`✅ 开发服务器启动成功: ${serverUrl}`)
        
        // 给服务器一点时间完全启动
        setTimeout(() => {
          testPages(serverUrl).then(() => {
            server.kill()
            resolve(true)
          }).catch((error) => {
            server.kill()
            reject(error)
          })
        }, 3000)
      }
    })
    
    server.stderr.on('data', (data) => {
      const error = data.toString()
      console.error('服务器错误:', error)
    })
    
    server.on('close', (code) => {
      if (!serverReady) {
        console.error(`❌ 服务器启动失败，退出码: ${code}`)
        reject(new Error(`Server failed to start with code ${code}`))
      }
    })
    
    // 10秒超时
    setTimeout(() => {
      if (!serverReady) {
        server.kill()
        reject(new Error('Server startup timeout'))
      }
    }, 10000)
  })
}

async function testPages(baseUrl) {
  const pages = [
    { path: '/', name: '首页' },
    { path: '/pool', name: '文章池' },
    { path: '/editor', name: '编辑工作台' },
    { path: '/sources', name: 'RSS源管理' },
    { path: '/thesituationroom', name: '战略分析室' }
  ]
  
  for (const page of pages) {
    try {
      console.log(`🔍 测试 ${page.name} (${page.path})...`)
      
      const response = await fetch(`${baseUrl}${page.path}`, {
        headers: {
          'User-Agent': 'Test Bot'
        }
      })
      
      if (response.ok) {
        const html = await response.text()
        
        // 基本检查：确保页面包含基础HTML结构
        if (html.includes('<html') && html.includes('</html>')) {
          console.log(`✅ ${page.name} 页面正常加载 (${response.status})`)
          
          // 检查数据是否正确渲染
          if (page.path === '/sources' && html.includes('RSS源管理')) {
            console.log('   - RSS源管理页面包含正确标题')
          }
          if (page.path === '/pool' && html.includes('文章池')) {
            console.log('   - 文章池页面包含正确标题')
          }
          if (page.path === '/' && html.includes('制造业智能情报系统')) {
            console.log('   - 首页包含系统标题')
          }
        } else {
          console.warn(`⚠️ ${page.name} 页面HTML结构可能不完整`)
        }
      } else {
        console.error(`❌ ${page.name} 页面加载失败: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error(`❌ 测试 ${page.name} 页面时出错:`, error.message)
    }
  }
  
  console.log('\n🎉 前端页面测试完成！')
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  testFrontendPages().then(() => {
    console.log('✅ 所有测试完成')
    process.exit(0)
  }).catch((error) => {
    console.error('❌ 测试失败:', error.message)
    process.exit(1)
  })
}

export { testFrontendPages }