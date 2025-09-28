// 测试修复后的Jina AI调用
async function testFixedJina() {
  const testUrl = 'https://news.google.com/rss/articles/CBMidEFVX3lxTE1tYUptQ1E3aUFTSlZTWkswV1BrTE9XVkZTeVY5b3NiTFdrbVJPWV9sbVluM29lWW00dDdVZzlfTi1KM2Rkam81aEJWNkhINFJtdHF5b0Q5R3FzVERiY2F0WUcyT1JSTHBnemViRHN1QmxiR3lx?oc=5&hl=en-US&gl=US&ceid=US:en'
  
  console.log('🧪 测试修复后的Jina AI调用...')
  console.log(`🔗 URL: ${testUrl}`)
  
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(testUrl)}`
    
    const jinaResponse = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'KUATO-Intelligence/1.0',
        'x-with-generated-alt': 'true',
        'x-timeout': '30'
      }
    })

    console.log(`📊 响应状态: ${jinaResponse.status} ${jinaResponse.statusText}`)

    if (jinaResponse.ok) {
      const jinaData = await jinaResponse.json()
      
      console.log(`📋 API响应结构:`)
      console.log(`   code: ${jinaData.code}`)
      console.log(`   status: ${jinaData.status}`)
      console.log(`   data存在: ${!!jinaData.data}`)
      
      if (jinaData.code === 200 && jinaData.data && jinaData.data.content) {
        const content = jinaData.data.content
        console.log(`✅ 内容抓取成功!`)
        console.log(`   标题: ${jinaData.data.title || 'No title'}`)
        console.log(`   URL: ${jinaData.data.url || 'No URL'}`)
        console.log(`   内容长度: ${content.length} 字符`)
        console.log(`   内容预览:`)
        console.log(content.substring(0, 300) + '...')
        
        if (jinaData.data.usage) {
          console.log(`   Token使用: ${jinaData.data.usage.tokens || 'N/A'}`)
        }
      } else {
        console.warn(`⚠️ Jina AI返回非成功状态`)
        console.log(`完整响应:`, jinaData)
      }
    } else {
      console.error(`❌ HTTP错误`)
      const errorText = await jinaResponse.text()
      console.log(`错误内容:`, errorText)
    }
    
  } catch (error) {
    console.error('❌ 请求异常:', error)
  }
}

testFixedJina()