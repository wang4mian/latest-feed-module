import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCronStatus() {
  try {
    console.log('🕐 Checking cron job status...\n');

    // Check active cron jobs
    const { data: cronJobs, error: cronError } = await supabase
      .rpc('sql', {
        query: 'SELECT jobname, schedule, active, nodename FROM cron.job ORDER BY jobname;'
      });

    if (cronError) {
      console.error('Error fetching cron jobs:', cronError);
      // Try alternative method
      const { data: jobs } = await supabase
        .from('cron.job')
        .select('*');
      
      if (jobs) {
        console.log('📋 Active Cron Jobs:');
        jobs.forEach(job => {
          console.log(`- ${job.jobname}: ${job.schedule} (Active: ${job.active})`);
        });
      }
    } else if (cronJobs) {
      console.log('📋 Active Cron Jobs:');
      cronJobs.forEach(job => {
        console.log(`- ${job.jobname}: ${job.schedule} (Active: ${job.active})`);
      });
    }

    // Check recent cron job runs
    const { data: cronRuns, error: runsError } = await supabase
      .rpc('sql', {
        query: `SELECT jobname, start_time, end_time, status 
                FROM cron.job_run_details 
                ORDER BY start_time DESC 
                LIMIT 10;`
      });

    if (!runsError && cronRuns) {
      console.log('\n📊 Recent Cron Job Runs:');
      cronRuns.forEach(run => {
        const startTime = new Date(run.start_time).toLocaleString();
        const duration = run.end_time 
          ? Math.round((new Date(run.end_time) - new Date(run.start_time)) / 1000) 
          : 'running';
        console.log(`- ${run.jobname}: ${run.status} at ${startTime} (${duration}s)`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking cron status:', error.message);
    
    // Manual check via direct SQL
    console.log('\n🔍 Attempting direct database query...');
    try {
      const response = await fetch(`${process.env.PUBLIC_SUPABASE_URL}/rest/v1/rpc/sql`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          query: 'SELECT jobname, schedule, active FROM cron.job;'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Direct query result:', data);
      }
    } catch (directError) {
      console.log('Direct query also failed:', directError.message);
    }
  }
}

checkCronStatus();