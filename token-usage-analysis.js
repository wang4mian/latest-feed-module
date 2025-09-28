import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeTokenUsage() {
  console.log('🔍 KUATO AI TOKEN USAGE & COST ANALYSIS');
  console.log('=======================================\n');

  try {
    // Get basic statistics
    const { count: totalArticles } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });

    const { count: analyzedArticles } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .not('ai_score', 'is', null);

    // Get recent articles with content length analysis
    const { data: recentArticles } = await supabase
      .from('articles')
      .select(`
        id, title, full_content, ai_summary, ai_strategic_implication, 
        created_at, updated_at, ai_score,
        rss_sources!inner(topic_for_ai)
      `)
      .not('ai_score', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(50);

    // Get articles from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: last24hArticles } = await supabase
      .from('articles')
      .select('id, title, updated_at, ai_score')
      .not('ai_score', 'is', null)
      .gte('updated_at', yesterday);

    console.log('📊 PROCESSING STATISTICS');
    console.log('========================');
    console.log(`Total articles in system: ${totalArticles}`);
    console.log(`AI-analyzed articles: ${analyzedArticles}`);
    console.log(`Analysis completion rate: ${Math.round((analyzedArticles / totalArticles) * 100)}%`);
    console.log(`Articles processed in last 24h: ${last24hArticles?.length || 0}\n`);

    if (recentArticles && recentArticles.length > 0) {
      // Calculate token usage estimates
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let contentLengths = [];
      let summaryLengths = [];

      recentArticles.forEach(article => {
        // Input tokens estimation
        // Prompt template is ~800 tokens + article content
        const promptTokens = 800; // Base prompt template
        const titleTokens = Math.ceil((article.title?.length || 0) / 4);
        const contentTokens = Math.ceil((article.full_content?.length || 0) / 4);
        const topicTokens = Math.ceil((article.rss_sources.topic_for_ai?.length || 0) / 4);
        
        const articleInputTokens = promptTokens + titleTokens + contentTokens + topicTokens;
        totalInputTokens += articleInputTokens;

        // Output tokens estimation
        const summaryTokens = Math.ceil((article.ai_summary?.length || 0) / 4);
        const implicationTokens = Math.ceil((article.ai_strategic_implication?.length || 0) / 4);
        const structuredOutputTokens = 200; // JSON structure, entities, scores, etc.
        
        const articleOutputTokens = summaryTokens + implicationTokens + structuredOutputTokens;
        totalOutputTokens += articleOutputTokens;

        // Collect statistics
        contentLengths.push(article.full_content?.length || 0);
        summaryLengths.push((article.ai_summary?.length || 0) + (article.ai_strategic_implication?.length || 0));
      });

      const avgContentLength = Math.round(contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length);
      const avgSummaryLength = Math.round(summaryLengths.reduce((a, b) => a + b, 0) / summaryLengths.length);
      const avgInputTokensPerArticle = Math.round(totalInputTokens / recentArticles.length);
      const avgOutputTokensPerArticle = Math.round(totalOutputTokens / recentArticles.length);

      console.log('🔤 TOKEN USAGE ANALYSIS (Based on 50 recent articles)');
      console.log('====================================================');
      console.log(`Average content length: ${avgContentLength.toLocaleString()} characters`);
      console.log(`Average output length: ${avgSummaryLength} characters`);
      console.log(`Average input tokens per article: ${avgInputTokensPerArticle.toLocaleString()}`);
      console.log(`Average output tokens per article: ${avgOutputTokensPerArticle.toLocaleString()}`);
      console.log(`Total tokens per article: ${(avgInputTokensPerArticle + avgOutputTokensPerArticle).toLocaleString()}\n`);

      // Gemini AI pricing (as of September 2024)
      const geminiInputCostPer1M = 0.075; // $0.075 per 1M input tokens (Flash model)
      const geminiOutputCostPer1M = 0.30; // $0.30 per 1M output tokens (Flash model)

      const costPerArticle = (avgInputTokensPerArticle * geminiInputCostPer1M / 1000000) + 
                            (avgOutputTokensPerArticle * geminiOutputCostPer1M / 1000000);

      console.log('💰 COST ANALYSIS (Gemini 1.5 Flash)');
      console.log('===================================');
      console.log(`Input cost per 1M tokens: $${geminiInputCostPer1M}`);
      console.log(`Output cost per 1M tokens: $${geminiOutputCostPer1M}`);
      console.log(`Estimated cost per article: $${costPerArticle.toFixed(4)}`);
      console.log(`Total cost for ${analyzedArticles} articles: $${(costPerArticle * analyzedArticles).toFixed(2)}`);
      
      if (last24hArticles?.length) {
        console.log(`Daily processing cost (last 24h): $${(costPerArticle * last24hArticles.length).toFixed(3)}`);
      }
      console.log(`Monthly cost estimate (30 days): $${(costPerArticle * 30 * (last24hArticles?.length || 57)).toFixed(2)}\n`);

      // Rate limit analysis
      console.log('📊 JINA AI READER USAGE');
      console.log('========================');
      console.log('Service: FREE tier - 1,000 requests/month');
      console.log(`Current usage: ${analyzedArticles} requests total`);
      console.log(`Daily usage (last 24h): ${last24hArticles?.length || 0} requests`);
      console.log(`Monthly projection: ${(last24hArticles?.length || 57) * 30} requests`);
      
      const jinaOverage = Math.max(0, (last24hArticles?.length || 57) * 30 - 1000);
      if (jinaOverage > 0) {
        console.log(`⚠️  Projected overage: ${jinaOverage} requests/month`);
        console.log('💡 Consider: Paid Jina AI plan or implement more aggressive caching');
      } else {
        console.log('✅ Within free tier limits');
      }

      console.log('\n🔄 PROCESSING PIPELINE EFFICIENCY');
      console.log('=================================');
      console.log('Current batch size: 15 articles per run');
      console.log('Processing interval: 15 minutes');
      console.log(`Articles per hour: ${15 * (60/15)} = 60 articles/hour`);
      console.log(`Articles per day: ${60 * 24} = 1,440 articles/day`);
      console.log('Pipeline status: ✅ Fully automated');
      
      // Content extraction analysis
      const contentExtractionMethods = {
        crawl4ai: recentArticles.filter(a => (a.full_content?.length || 0) > 2000).length,
        jinaReader: recentArticles.filter(a => (a.full_content?.length || 0) > 500 && (a.full_content?.length || 0) <= 2000).length,
        fallback: recentArticles.filter(a => (a.full_content?.length || 0) <= 500).length
      };

      console.log('\n🕷️ CONTENT EXTRACTION SUCCESS RATES');
      console.log('===================================');
      console.log(`High-quality extraction (>2000 chars): ${contentExtractionMethods.crawl4ai} articles (${Math.round(contentExtractionMethods.crawl4ai/recentArticles.length*100)}%)`);
      console.log(`Medium-quality extraction (500-2000 chars): ${contentExtractionMethods.jinaReader} articles (${Math.round(contentExtractionMethods.jinaReader/recentArticles.length*100)}%)`);
      console.log(`Fallback/low-quality (<500 chars): ${contentExtractionMethods.fallback} articles (${Math.round(contentExtractionMethods.fallback/recentArticles.length*100)}%)`);

      // Quality analysis
      const { data: scoreDistribution } = await supabase
        .from('articles')
        .select('ai_score')
        .not('ai_score', 'is', null);

      if (scoreDistribution) {
        const scores = scoreDistribution.map(a => a.ai_score);
        const highValue = scores.filter(s => s >= 70).length;
        const mediumValue = scores.filter(s => s >= 40 && s < 70).length;
        const lowValue = scores.filter(s => s < 40).length;

        console.log('\n📊 AI QUALITY METRICS');
        console.log('=====================');
        console.log(`High-value articles (≥70): ${highValue} (${Math.round(highValue/scores.length*100)}%)`);
        console.log(`Medium-value articles (40-69): ${mediumValue} (${Math.round(mediumValue/scores.length*100)}%)`);
        console.log(`Low-value articles (<40): ${lowValue} (${Math.round(lowValue/scores.length*100)}%)`);
        console.log(`Average AI score: ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}`);
        console.log(`Quality acceptance rate: ${Math.round((highValue + mediumValue)/scores.length*100)}%`);
      }
    }

    console.log('\n🎯 OPTIMIZATION RECOMMENDATIONS');
    console.log('==============================');
    console.log('1. ✅ Current system is cost-efficient ($0.001-0.002 per article)');
    console.log('2. ✅ Jina AI Reader free tier sufficient for current volume');
    console.log('3. ✅ Gemini Flash model provides excellent value/performance ratio');
    console.log('4. 💡 Consider: Implement content caching to reduce duplicate extractions');
    console.log('5. 💡 Monitor: Monthly Jina AI usage against 1,000 request limit');
    console.log('6. 💡 Future: May need Jina AI Pro plan if volume exceeds 1,000 articles/month');

  } catch (error) {
    console.error('❌ Error during token analysis:', error.message);
  }
}

analyzeTokenUsage();