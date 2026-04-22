import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    // 1. Auth Check
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // 2. Find jobs that breached SLA
    const { data: breachedJobs, error: fetchError } = await supabaseAdmin
      .from('jobs')
      .select('id, accepted_worker_id')
      .eq('status', 'assigned')
      .lt('sla_deadline', now);

    if (fetchError) throw fetchError;

    let processedCount = 0;

    if (breachedJobs && breachedJobs.length > 0) {
      for (const job of breachedJobs) {
        const workerId = job.accepted_worker_id;

        // a. Record the Strike
        await supabaseAdmin
          .from('strikes')
          .insert({
            worker_id: workerId,
            job_id: job.id,
            reason: 'ghost'
          });

        // b. Fetch Worker to update count
        const { data: worker } = await supabaseAdmin
          .from('workers')
          .select('strike_count')
          .eq('user_id', workerId)
          .single();

        if (worker) {
          const newStrikeCount = (worker.strike_count || 0) + 1;
          
          // c. Update Worker (Deactivate if 3 strikes)
          await supabaseAdmin
            .from('workers')
            .update({
              strike_count: newStrikeCount,
              is_active: newStrikeCount < 3
            })
            .eq('user_id', workerId);
        }

        // d. Reset Job to Bidding pool
        await supabaseAdmin
          .from('jobs')
          .update({
            status: 'bidding',
            accepted_worker_id: null,
            sla_deadline: null
          })
          .eq('id', job.id);

        console.log(`[CRON] SLA breach processed for job ${job.id}`);
        processedCount++;
      }
    }

    return NextResponse.json({ processed: processedCount });

  } catch (err: any) {
    console.error('SLA Cron Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
