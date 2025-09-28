import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

interface ArticleForMemo {
  id: string;
  title: string;
  link: string;
  ai_score: number;
  ai_summary: string;
  ai_category: string;
  ai_strategic_implication: string;
  created_at: string;
  rss_sources: {
    name: string;
  };
}

// 为Gemini AI准备选题备忘录生成的Prompt
function generateMemoPrompt(articles: ArticleForMemo[]): string {
  const articleList = articles.map((article, index) => 
    `${index + 1}. **${article.title}**
   - 来源: ${article.rss_sources.name}
   - AI评分: ${article.ai_score}/100
   - 摘要: ${article.ai_summary}
   - 战略意义: ${article.ai_strategic_implication}
   - 链接: ${article.link}`
  ).join('\n\n');

  return `# 增材制造狗 - 选题备忘录生成任务

## 角色定位
你是"增材制造狗"的选题编辑，需要为今日的快讯编译提供战略研判，帮助决策者从以下候选文章中选择最有价值的内容进行编译。

## 任务要求
对以下${articles.length}篇候选文章，按照重要性和编译价值进行排序和分析，生成一份简洁的选题备忘录。

## 输出格式
严格按照以下JSON格式输出：

{
  "memo_date": "${new Date().toLocaleDateString('zh-CN')}",
  "total_candidates": ${articles.length},
  "recommendations": [
    {
      "article_id": "文章ID",
      "priority": "高优先级/中优先级/低优先级",
      "series_category": "两字系列分类建议（应用/商业/科研/生态/医疗/建筑/军政/产品/材料/汽车）",
      "brief_summary": "30字以内的核心要点",
      "compilation_value": "编译价值说明（为什么值得做快讯）",
      "target_audience": "目标读者（如：设备厂商/材料供应商/应用企业/投资者）"
    }
  ],
  "daily_theme": "今日主题建议（如：大规模生产应用/新材料突破/中外对比等）",
  "editor_notes": "编辑建议（选题策略、注意事项等）"
}

## 评判标准
1. **新闻价值**: 时效性、独家性、影响面
2. **对标价值**: 是否有中国对比案例的可能性
3. **行业信号**: 是否代表重要趋势或转折点
4. **读者兴趣**: 中国增材制造从业者的关注点

## 候选文章列表
${articleList}

请生成选题备忘录，帮助编辑做出明智的选择决策。`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { date_filter = 'today' } = await request.json();
    
    // 获取候选文章 (ready_for_review状态，按AI评分排序)
    let query = supabase
      .from('articles')
      .select(`
        id, title, link, ai_score, ai_summary, ai_category, 
        ai_strategic_implication, created_at,
        rss_sources(name)
      `)
      .eq('overall_status', 'ready_for_review')
      .not('ai_score', 'is', null)
      .order('ai_score', { ascending: false })
      .limit(20);

    // 根据日期过滤
    if (date_filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('created_at', today.toISOString());
    } else if (date_filter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString());
    }

    const { data: articles, error } = await query;

    if (error) {
      console.error('Failed to fetch articles for memo:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          memo: null,
          message: '暂无候选文章，请稍后再试或调整筛选条件' 
        }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 调用Gemini AI生成选题备忘录
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const memoPrompt = generateMemoPrompt(articles as ArticleForMemo[]);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: memoPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 1,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No response from Gemini AI');
    }

    // 提取JSON从响应中
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Gemini AI');
    }

    const memoData = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ 
        success: true, 
        memo: memoData,
        articles_count: articles.length,
        generated_at: new Date().toISOString()
      }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating topic memo:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to generate topic memo' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};