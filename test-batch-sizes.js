import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testAIProcessing(batchSize = 5) {
  try {
    console.log(`🧪 Testing AI processing with batch size: ${batchSize}`);
    
    const startTime = Date.now();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        batch_size: batchSize
      })
    });
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log(`✅ Processing completed in ${duration}s`);
    console.log(`📊 Results: ${result.processed}/${result.total} articles processed`);
    
    if (result.results) {
      const successful = result.results.filter(r => r.status === 'processed').length;
      const errors = result.results.filter(r => r.status === 'error').length;
      console.log(`   - Successful: ${successful}`);
      console.log(`   - Errors: ${errors}`);
      
      // Show sample results
      if (result.results.length > 0) {
        console.log('📄 Sample results:');
        result.results.slice(0, 3).forEach((item, idx) => {
          if (item.status === 'processed') {
            console.log(`   ${idx + 1}. ${item.title.substring(0, 50)}... (Score: ${item.score})`);
          } else {
            console.log(`   ${idx + 1}. ERROR: ${item.error}`);
          }
        });
      }
    }
    
    return {
      batchSize,
      duration,
      processed: result.processed || 0,
      total: result.total || 0,
      success: true
    };
    
  } catch (error) {
    console.error(`❌ Error testing batch size ${batchSize}:`, error.message);
    return {
      batchSize,
      duration: 0,
      processed: 0,
      total: 0,
      success: false,
      error: error.message
    };
  }
}

async function runBatchSizeTests() {
  console.log('🚀 Starting batch size performance tests...\n');
  
  const testSizes = [5, 10, 15, 20];
  const results = [];
  
  for (const batchSize of testSizes) {
    const result = await testAIProcessing(batchSize);
    results.push(result);
    
    // Wait between tests to avoid rate limiting
    console.log('⏳ Waiting 30 seconds before next test...\n');
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  
  // Summary
  console.log('📊 BATCH SIZE PERFORMANCE SUMMARY');
  console.log('==================================');
  console.log('Batch Size | Duration | Processed | Success Rate | Articles/Second');
  console.log('-----------|----------|-----------|--------------|----------------');
  
  results.forEach(r => {
    const successRate = r.success ? '100%' : '0%';
    const articlesPerSecond = r.success && r.duration > 0 
      ? (r.processed / r.duration).toFixed(2) 
      : '0.00';
    
    console.log(`${String(r.batchSize).padStart(10)} | ${String(r.duration + 's').padStart(8)} | ${String(r.processed).padStart(9)} | ${successRate.padStart(12)} | ${articlesPerSecond.padStart(14)}`);
  });
  
  // Recommendations
  const successfulTests = results.filter(r => r.success && r.processed > 0);
  if (successfulTests.length > 0) {
    const fastest = successfulTests.reduce((prev, curr) => 
      (curr.processed / curr.duration) > (prev.processed / prev.duration) ? curr : prev
    );
    
    console.log(`\n💡 RECOMMENDATIONS:`);
    console.log(`Best performance: Batch size ${fastest.batchSize} (${(fastest.processed / fastest.duration).toFixed(2)} articles/second)`);
    
    // Calculate time to process all pending articles with different batch sizes
    const pendingArticles = 393; // From previous check
    console.log(`\n⏱️  Time to process ${pendingArticles} pending articles:`);
    
    successfulTests.forEach(r => {
      const batchesNeeded = Math.ceil(pendingArticles / r.batchSize);
      const totalTimeMinutes = batchesNeeded * 15; // 15 minutes between runs
      const hours = Math.floor(totalTimeMinutes / 60);
      const minutes = totalTimeMinutes % 60;
      console.log(`Batch size ${r.batchSize}: ${batchesNeeded} batches = ${hours}h ${minutes}m`);
    });
  }
}

// Check if script should run single test or full suite
const args = process.argv.slice(2);
if (args.length > 0 && args[0] === 'single') {
  const batchSize = parseInt(args[1]) || 5;
  testAIProcessing(batchSize);
} else {
  runBatchSizeTests();
}