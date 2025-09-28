// =====================================================
// 测试新版本Jina AI内容提取功能
// =====================================================

async function testJinaAI() {
  const testUrl = 'https://news.vt.edu/articles/2025/09/Univlib-3d-brains.html'
  
  console.log(`🧪 Testing Jina AI extraction for: ${testUrl}`)
  
  try {
    const jinaResponse = await fetch(`https://r.jina.ai/${testUrl}`, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown',
        'X-With-Generated-Alt': 'true'
      }
    })

    if (jinaResponse.ok) {
      const jinaResult = await jinaResponse.text()
      
      console.log(`✅ Jina AI Response Status: ${jinaResponse.status}`)
      console.log(`📄 Raw response length: ${jinaResult.length} characters`)
      
      // Try to parse as JSON
      try {
        const parsedResult = JSON.parse(jinaResult)
        
        if (parsedResult.code === 200 && parsedResult.data) {
          const content = parsedResult.data.content || ''
          const title = parsedResult.data.title || ''
          
          console.log(`📰 Title: ${title}`)
          console.log(`📄 Content length: ${content.length} characters`)
          console.log(`📝 First 500 characters of content:`)
          console.log('='.repeat(50))
          console.log(content.substring(0, 500))
          console.log('='.repeat(50))
          
          // Check if it's markdown format
          const hasMarkdownHeaders = content.includes('# ') || content.includes('## ')
          const hasMarkdownLinks = content.includes('[') && content.includes('](')
          
          console.log(`📋 Analysis:`)
          console.log(`   - Contains markdown headers: ${hasMarkdownHeaders}`)
          console.log(`   - Contains markdown links: ${hasMarkdownLinks}`)
          console.log(`   - Content quality: ${content.length > 1000 ? 'Good' : 'Poor'}`)
          
          if (parsedResult.data.warning) {
            console.log(`⚠️ Warning: ${parsedResult.data.warning}`)
          }
          
          return content
        } else {
          console.error(`❌ Jina AI returned error: ${parsedResult.status}`)
          return null
        }
      } catch (parseError) {
        console.log(`📝 Non-JSON response (direct markdown):`)
        console.log('='.repeat(50))
        console.log(jinaResult.substring(0, 500))
        console.log('='.repeat(50))
        return jinaResult
      }
    } else {
      console.error(`❌ Jina AI HTTP error: ${jinaResponse.status} ${jinaResponse.statusText}`)
      return null
    }
  } catch (error) {
    console.error('❌ Jina AI test failed:', error.message)
    return null
  }
}

// 运行测试
testJinaAI().then(result => {
  if (result) {
    console.log('\\n🎉 Jina AI test completed successfully!')
  } else {
    console.log('\\n💥 Jina AI test failed!')
  }
})