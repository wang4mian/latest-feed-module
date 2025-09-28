// 测试不带alt text生成的Jina AI调用
async function testJinaNoAlt() {
  const testUrl = 'https://news.google.com/rss/articles/CBMidEFVX3lxTE1tYUptQ1E3aUFTSlZTWkswV1BrTE9XVkZTeVY5b3NiTFdrbVJPWV9sbVluM29lWW00dDdVZzlfTi1KM2Rkam81aEJWNkhINFJtdHF5b0Q5R3FzVERiY2F0WUcyT1JSTHBnemViRHN1QmxiR3lx?oc=5&hl=en-US&gl=US&ceid=US:en'
  
  console.log('🧪 测试免费版Jina AI调用...')
  
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(testUrl)}`
    
    const jinaResponse = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'KUATO-Intelligence/1.0'
      }
    })

    console.log(`📊 响应状态: ${jinaResponse.status} ${jinaResponse.statusText}`)

    if (jinaResponse.ok) {
      const jinaData = await jinaResponse.json()
      
      console.log(`📋 API响应:`)
      console.log(`   code: ${jinaData.code}`)
      console.log(`   status: ${jinaData.status}`)
      
      if (jinaData.code === 200 && jinaData.data && jinaData.data.content) {
        const content = jinaData.data.content
        console.log(`✅ 成功!`)
        console.log(`   标题: ${jinaData.data.title}`)
        console.log(`   内容长度: ${content.length} 字符`)
        console.log(`   内容预览: ${content.substring(0, 200)}...`)
      } else {
        console.warn(`⚠️ 非成功状态:`, jinaData)
      }
    } else {
      const errorText = await jinaResponse.text()
      console.log(`❌ 错误:`, errorText)
    }
    
  } catch (error) {
    console.error('❌ 异常:', error)
  }
}

testJinaNoAlt()