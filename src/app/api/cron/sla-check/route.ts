import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

const PAGE_SIZE = 50; // Process in batches to avoid memory exhaustion

export async function GET(req: Request) {
  try {
    // 1. Auth Check
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();
    let processedCount = 0;
    let offset = 0;

    // 2. Paginated loop to avoid fetching all rows into memory at once
    while (true) {
      const { data: breachedJobs, error: fetchError } = await supabaseAdmin
        .from('jobs')
        .select('id, accepted_worker_id')
        .eq('status', 'assigned')
        .lt('sla_deadline', now)
        .range(offset, offset + PAGE_SIZE - 1);

      if (fetchError) throw fetchError;
      if (!breachedJobs || breachedJobs.length === 0) break;

      for (const job of breachedJobs) {
        // 3. Atomically claim this job by updating status only if it's still 'assigned'
        // This prevents duplicate processing if two cron instances overlap
        const { data: claimed } = await supabaseAdmin
          .from('jobs')
          .update({ status: 'bidding', accepted_worker_id: null, sla_deadline: null })
          .eq('id', job.id)
          .eq('status', 'assigned') // Only update if still assigned — optimistic lock
          .select('accepted_worker_id')
          .maybeSingle();

        if (!claimed) {
          // Another cron run already processed this job — skip to avoid double strike
          continue;
        }

        const workerId = job.accepted_worker_id;

        // 4. Insert Strike
        await supabaseAdmin
          .from('strikes')
          .insert({ worker_id: workerId, job_id: job.id, reason: 'ghost' });

        // 5. Fetch current worker strike count and update
        const { data: worker } = await supabaseAdmin
          .from('workers')
          .select('strike_count')
          .eq('user_id', workerId)
          .single();

        if (worker) {
          const newStrikeCount = (worker.strike_count || 0) + 1;

          await supabaseAdmin
            .from('workers')
            .update({ strike_count: newStrikeCount })
            .eq('user_id', workerId);

          // Deactivate the user account if 3+ strikes (is_active is on users table)
          if (newStrikeCount >= 3) {
            await supabaseAdmin
              .from('users')
              .update({ is_active: false })
              .eq('id', workerId);
          }
        }

        console.log(`[CRON] SLA breach processed: job=${job.id} worker=${workerId}`);
        processedCount++;
      }

      if (breachedJobs.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return NextResponse.json({ processed: processedCount });

  } catch (err: any) {
    console.error('SLA Cron Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
