import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { urls, compilePrompt } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'URLs array is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 1: Extract content using Jina MCP parallel_read_url
    const extractedContents = await extractContentWithMCP(urls);
    
    // Step 2: Compile with Gemini AI
    const compiledResult = await compileWithGemini(extractedContents, compilePrompt);

    return new Response(JSON.stringify({
      success: true,
      extractedContents: extractedContents,
      compiledResult: compiledResult,
      urls: urls,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Compilation API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Extract content using Jina AI MCP Server
async function extractContentWithMCP(urls: string[]) {
  try {
    // Get Jina API key from environment
    const jinaApiKey = process.env.JINA_API_KEY;
    
    if (!jinaApiKey) {
      console.warn('No Jina API key found, using rate-limited access');
    }

    // Call Jina MCP Server for parallel content extraction
    const mcpResponse = await fetch('https://mcp.jina.ai/sse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jinaApiKey && { 'Authorization': `Bearer ${jinaApiKey}` })
      },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: 'parallel_read_url',
          arguments: {
            urls: urls,
            include_images: true,
            format: 'markdown',
            extract_metadata: true
          }
        }
      })
    });

    if (!mcpResponse.ok) {
      throw new Error(`MCP API error: ${mcpResponse.status} ${mcpResponse.statusText}`);
    }

    const mcpResult = await mcpResponse.json();
    
    // Process MCP response
    if (mcpResult.error) {
      throw new Error(`MCP tool error: ${mcpResult.error.message}`);
    }

    const extractedData = mcpResult.result?.content || mcpResult.result;
    
    // Transform to standardized format
    return urls.map((url, index) => ({
      url: url,
      title: extractedData[index]?.title || `文章 ${index + 1}`,
      content: extractedData[index]?.content || extractedData[index] || '',
      metadata: extractedData[index]?.metadata || {},
      images: extractedData[index]?.images || [],
      extractedAt: new Date().toISOString()
    }));

  } catch (error) {
    console.error('MCP extraction failed:', error);
    
    // Fallback to direct Jina API if MCP fails
    console.log('Falling back to direct Jina API...');
    return await fallbackToDirectJina(urls);
  }
}

// Fallback to direct Jina API call
async function fallbackToDirectJina(urls: string[]) {
  const jinaApiKey = process.env.JINA_API_KEY;
  const results = [];

  for (const url of urls) {
    try {
      const response = await fetch('https://r.jina.ai/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jinaApiKey && { 'Authorization': `Bearer ${jinaApiKey}` })
        },
        body: JSON.stringify({
          url: url,
          extract_images: true,
          format: 'markdown',
          include_metadata: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        results.push({
          url: url,
          title: data.title || `文章 ${results.length + 1}`,
          content: data.content || data.data?.content || '',
          metadata: data.metadata || {},
          images: data.images || [],
          extractedAt: new Date().toISOString()
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to extract ${url}:`, error);
      results.push({
        url: url,
        title: `文章 ${results.length + 1} (提取失败)`,
        content: `无法提取内容: ${error.message}`,
        metadata: {},
        images: [],
        extractedAt: new Date().toISOString()
      });
    }
  }

  return results;
}

// Compile with Gemini AI
async function compileWithGemini(extractedContents: any[], customPrompt?: string) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Prepare content for Gemini
    const articlesText = extractedContents.map((item, index) => `
## 文章 ${index + 1}: ${item.title}
**来源**: ${item.url}
**提取时间**: ${item.extractedAt}

${item.content}

---
`).join('\n');

    // Default compilation prompt
    const defaultPrompt = `你是一位资深的行业分析师。请基于以下${extractedContents.length}篇海外文章，编写一篇适合微信公众号发布的深度分析文章。

要求：
1. 文章标题要有吸引力和专业性
2. 内容结构清晰，逻辑性强
3. 融合多篇文章的核心观点
4. 适合中国读者阅读习惯
5. 字数控制在1500-2500字
6. 包含行业趋势分析和洞察

请直接输出完整的文章内容：

${articlesText}`;

    const compilationPrompt = customPrompt || defaultPrompt;

    // Call Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: compilationPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      })
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiResult = await geminiResponse.json();
    
    if (!geminiResult.candidates || geminiResult.candidates.length === 0) {
      throw new Error('Gemini API returned no content');
    }

    const compiledContent = geminiResult.candidates[0].content.parts[0].text;

    return {
      content: compiledContent,
      model: 'gemini-1.5-flash',
      sourceArticles: extractedContents.length,
      compiledAt: new Date().toISOString(),
      prompt: customPrompt ? 'custom' : 'default'
    };

  } catch (error) {
    console.error('Gemini compilation failed:', error);
    
    // Return fallback result
    return {
      content: `# 编译结果（基于${extractedContents.length}篇文章）

${extractedContents.map((item, index) => `
## ${index + 1}. ${item.title}

${item.content.substring(0, 500)}...

**来源**: ${item.url}

---
`).join('\n')}

*注意：AI编译服务暂时不可用，以上为原始内容摘要*`,
      model: 'fallback',
      sourceArticles: extractedContents.length,
      compiledAt: new Date().toISOString(),
      error: error.message
    };
  }
}