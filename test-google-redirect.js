// 测试Google News重定向是否可以程序化解析
async function testGoogleRedirect() {
  const googleUrl = 'https://news.google.com/rss/articles/CBMiiwFBVV95cUxPR0lVa0x5M085TWtHdnRqYnhfZkE5clhjY2lVQ2ZZSU1Uc3NBd29oM00ycHIzVmRkV2RWMWRoNmNvaDNDUXFZSVJRMWdVVmZNMm1qYlNtQWxjR2szSDg2OWVLOEVlWXRESWtEaklScW1uenFkQWNETlgwZS1PZkZsbXo2aHQtTVR4a3Rz?oc=5'
  
  console.log('🧪 测试Google News重定向解析...')
  
  // 测试1: 普通fetch，不跟随重定向
  try {
    console.log('\n1️⃣ 测试普通fetch (不跟随重定向)')
    const response = await fetch(googleUrl, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    console.log(`状态: ${response.status} ${response.statusText}`)
    
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get('Location')
      console.log(`✅ 发现重定向: ${redirectUrl}`)
      return redirectUrl
    } else if (response.status === 451) {
      console.log('❌ 返回451，Google拒绝机器人访问')
    }
  } catch (error) {
    console.log(`❌ 请求失败: ${error.message}`)
  }
  
  // 测试2: 模拟浏览器，跟随重定向
  try {
    console.log('\n2️⃣ 测试跟随重定向')
    const response = await fetch(googleUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })
    
    console.log(`最终状态: ${response.status}`)
    console.log(`最终URL: ${response.url}`)
    
    if (response.url !== googleUrl) {
      console.log('✅ 重定向成功！最终URL与原URL不同')
      return response.url
    } else {
      console.log('❌ 没有发生重定向')
    }
  } catch (error) {
    console.log(`❌ 跟随重定向失败: ${error.message}`)
  }
  
  return null
}

testGoogleRedirect()