import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAdjacentPincodes } from '@/lib/pincodes';
import { skillsMatch } from '@/lib/skill-synonyms';
import { sendSMS, sendWhatsApp } from '@/lib/twilio';

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rozgar.app';

export async function POST(req: Request) {
  try {
    const { job_id } = await req.json();

    if (!job_id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // 1. Fetch the job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 2. Get today's day abbreviation
    const today = new Date()
      .toLocaleDateString('en-US', { weekday: 'short' })
      .toLowerCase();

    // 3. Build target pincodes list
    const targetPincodes = [job.pincode, ...getAdjacentPincodes(job.pincode)];

    // 4. Fetch nearby workers with low strikes
    const { data: nearbyWorkers, error: workerError } = await supabaseAdmin
      .from('workers')
      .select('*, user:users!workers_user_id_fkey(name, is_active)')
      .lt('strike_count', 3)
      .in('pincode', targetPincodes);

    if (workerError) {
      console.error(`[Broadcast] job=${job_id} Worker fetch error:`, workerError);
      return NextResponse.json({ error: workerError.message }, { status: 500 });
    }

    const requiredTags: string[] = job.worker_tags_required || [];

    const activeMatchedWorkers = (nearbyWorkers || []).filter(w => {
      if (!w.user?.is_active) return false;
      const days: string[] = w.availability_days || [];
      if (days.length > 0) {
        const todayStr = today.slice(0, 3);
        if (!days.some(d => d.toLowerCase() === todayStr)) return false;
      }
      return skillsMatch(w.searchable_as || [], requiredTags);
    });

    console.log(
      `[Broadcast] job=${job_id} (${job.interpreted_category}): ` +
      `${nearbyWorkers?.length ?? 0} nearby, ${activeMatchedWorkers.length} matched. ` +
      `Required tags: [${requiredTags.join(', ')}]`
    );

    if (activeMatchedWorkers.length === 0) {
      return NextResponse.json({ workers_pinged: 0, message: 'No matching workers found nearby' });
    }

    // 5. Create Job Pings
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const pings = activeMatchedWorkers.map(worker => ({
      job_id: job.id,
      worker_id: worker.user_id,
      status: 'pending',
      expires_at: expiresAt
    }));

    const { error: pingError } = await supabaseAdmin
      .from('job_pings')
      .insert(pings);

    if (pingError) {
      console.error(`[Broadcast] job=${job_id} Ping insert error:`, pingError);
      return NextResponse.json({ error: 'Failed to create job pings' }, { status: 500 });
    }

    // 6. Update Job Status to 'bidding'
    await supabaseAdmin
      .from('jobs')
      .update({ status: 'bidding' })
      .eq('id', job_id);

    // 7. Send notifications — await each worker individually so one failure doesn't block others
    const deepLink = `${APP_BASE_URL}/worker/job/${job_id}`;
    const messageBody = `Rozgar: New ${job.interpreted_category || 'job'} near ${job.pincode}. Open app to bid: ${deepLink}`;

    const notificationResults = await Promise.allSettled(
      activeMatchedWorkers.map(async (worker) => {
        if (worker.fcm_token) {
          console.log(`[PUSH] FCM to ${worker.user?.name || worker.user_id} for job ${job_id}`);
        }
        if (worker.caller_id) {
          await Promise.all([
            sendSMS(worker.caller_id, messageBody),
            sendWhatsApp(worker.caller_id, messageBody)
          ]);
        }
      })
    );

    const failed = notificationResults.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      failed.forEach((r, i) => {
        const w = activeMatchedWorkers[i];
        console.error(
          `[Broadcast] Notification failed for job=${job_id} worker=${w?.user_id} phone=${w?.caller_id}:`,
          (r as PromiseRejectedResult).reason
        );
      });
    }

    return NextResponse.json({ workers_pinged: activeMatchedWorkers.length });

  } catch (err: any) {
    console.error('Job Broadcast API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
