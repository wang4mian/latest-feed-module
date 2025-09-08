import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { content } = await request.json();
    
    if (typeof content !== 'string') {
      return new Response('Invalid content type', { status: 400 });
    }

    // 确保content目录存在
    const contentDir = path.join(process.cwd(), 'src/content');
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }

    // 写入文件
    const filePath = path.join(contentDir, 'usage.md');
    fs.writeFileSync(filePath, content, 'utf-8');

    return new Response(JSON.stringify({ 
      success: true, 
      message: '保存成功',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Save markdown error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};