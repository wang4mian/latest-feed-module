import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPendingArticles() {
  try {
    console.log('🔍 Checking AI processing status...\n');

    // Count total articles
    const { count: totalArticles } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total articles: ${totalArticles}`);

    // Count articles pending AI analysis (ai_score is null)
    const { count: pendingAnalysis } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .is('ai_score', null)
      .eq('overall_status', 'draft');
    
    console.log(`⏳ Articles pending AI analysis: ${pendingAnalysis}`);

    // Count articles already analyzed
    const { count: analyzed } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .not('ai_score', 'is', null);
    
    console.log(`✅ Articles already analyzed: ${analyzed}`);

    // Calculate processing time estimates
    const currentBatchSize = 5;
    const processingInterval = 15; // minutes
    
    if (pendingAnalysis > 0) {
      console.log('\n⏱️  Processing Time Estimates:');
      console.log(`Current batch size: ${currentBatchSize} articles per run`);
      console.log(`Processing interval: every ${processingInterval} minutes`);
      
      const batches = Math.ceil(pendingAnalysis / currentBatchSize);
      const totalMinutes = batches * processingInterval;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      console.log(`Batches needed: ${batches}`);
      console.log(`Time to complete: ${hours}h ${minutes}m`);

      // Different batch size scenarios
      console.log('\n📈 Different Batch Size Scenarios:');
      const batchSizes = [5, 10, 20, 50];
      
      for (const batchSize of batchSizes) {
        const batchesNeeded = Math.ceil(pendingAnalysis / batchSize);
        const totalTime = batchesNeeded * processingInterval;
        const h = Math.floor(totalTime / 60);
        const m = totalTime % 60;
        console.log(`Batch size ${batchSize}: ${batchesNeeded} batches, ${h}h ${m}m`);
      }
    }

    // Get sample of pending articles
    const { data: samplePending } = await supabase
      .from('articles')
      .select('id, title, created_at')
      .is('ai_score', null)
      .eq('overall_status', 'draft')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('\n📄 Sample pending articles (most recent):');
    samplePending?.forEach((article, index) => {
      const date = new Date(article.created_at).toLocaleDateString();
      console.log(`${index + 1}. ${article.title.substring(0, 60)}... (${date})`);
    });

    // Check recent AI analysis activity
    const { data: recentAnalyzed } = await supabase
      .from('articles')
      .select('id, title, ai_score, updated_at')
      .not('ai_score', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5);
    
    console.log('\n🤖 Recently analyzed articles:');
    recentAnalyzed?.forEach((article, index) => {
      const date = new Date(article.updated_at).toLocaleString();
      console.log(`${index + 1}. Score: ${article.ai_score} - ${article.title.substring(0, 50)}... (${date})`);
    });

    // Check AI score distribution
    const { data: scoreDistribution } = await supabase
      .from('articles')
      .select('ai_score')
      .not('ai_score', 'is', null);

    if (scoreDistribution && scoreDistribution.length > 0) {
      console.log('\n📊 AI Score Distribution:');
      const scores = scoreDistribution.map(a => a.ai_score);
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const highValue = scores.filter(s => s >= 70).length;
      const mediumValue = scores.filter(s => s >= 40 && s < 70).length;
      const lowValue = scores.filter(s => s < 40).length;
      
      console.log(`Average score: ${avgScore}`);
      console.log(`High value (≥70): ${highValue} articles`);
      console.log(`Medium value (40-69): ${mediumValue} articles`);
      console.log(`Low value (<40): ${lowValue} articles`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPendingArticles();