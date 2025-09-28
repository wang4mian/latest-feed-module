// 直接测试Jina AI访问Google News链接
async function testJinaGoogle() {
  const googleUrl = 'https://news.google.com/rss/articles/CBMiiwFBVV95cUxPR0lVa0x5M085TWtHdnRqYnhfZkE5clhjY2lVQ2ZZSU1Uc3NBd29oM00ycHIzVmRkV2RWMWRoNmNvaDNDUXFZSVJRMWdVVmZNMm1qYlNtQWxjR2szSDg2OWVLOEVlWXRESWtEaklScW1uenFkQWNETlgwZS1PZkZsbXo2aHQtTVR4a3Rz?oc=5'
  
  console.log('🔍 测试Jina AI访问Google News链接...')
  console.log(`URL: ${googleUrl}`)
  
  try {
    const response = await fetch(`https://r.jina.ai/${googleUrl}`, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown'
      }
    })
    
    console.log(`状态码: ${response.status} ${response.statusText}`)
    console.log(`响应头:`, Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const content = await response.text()
      console.log(`✅ 成功！内容长度: ${content.length} 字符`)
      console.log(`内容预览:`)
      console.log(content.substring(0, 500))
      console.log('...')
    } else {
      console.log(`❌ 失败`)
      const errorContent = await response.text()
      console.log(`错误内容: ${errorContent}`)
    }
    
  } catch (error) {
    console.log(`❌ 请求异常: ${error.message}`)
  }
}

testJinaGoogle()