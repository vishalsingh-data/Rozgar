import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAdjacentPincodes } from '@/lib/pincodes';

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

    // 2. Get today's day abbreviation (e.g., 'mon', 'tue')
    const today = new Date()
      .toLocaleDateString('en-US', { weekday: 'short' })
      .toLowerCase(); // 'mon', 'tue', etc.

    // 3. Build target pincodes list
    const targetPincodes = [job.pincode, ...getAdjacentPincodes(job.pincode)];

    // 4. Query matched workers
    // Logic: Active (< 3 strikes), nearby pincode, skill overlap
    // availability_days filter is done in-memory to handle NULL gracefully
    const requiredTags: string[] = job.worker_tags_required || [];

    let workerQuery = supabaseAdmin
      .from('workers')
      .select('*, user:users!workers_user_id_fkey(name, is_active)')
      .lt('strike_count', 3)
      .in('pincode', targetPincodes);

    // Only apply skill overlap filter when AI actually returned tags
    // (overlaps with [] is always false in PostgreSQL — would exclude everyone)
    if (requiredTags.length > 0) {
      workerQuery = workerQuery.overlaps('searchable_as', requiredTags);
    }

    const { data: matchedWorkers, error: workerError } = await workerQuery;

    if (workerError) {
      console.error('Worker Matching Error:', workerError);
      return NextResponse.json({ error: workerError.message }, { status: 500 });
    }

    // Filter by:
    // 1. user.is_active must be true
    // 2. availability_days must include today OR be null/empty (treat null as all-days)
    const activeMatchedWorkers = (matchedWorkers || []).filter(w => {
      if (!w.user?.is_active) return false;
      const days: string[] = w.availability_days || [];
      // NULL or empty availability_days → available all days
      if (days.length === 0) return true;
      return days.some(d => d.toLowerCase() === today.toLowerCase().slice(0, 3));
    });

    console.log(`[Broadcast] Job ${job_id}: ${matchedWorkers?.length ?? 0} skill-matched, ${activeMatchedWorkers.length} active+available`);

    if (!activeMatchedWorkers || activeMatchedWorkers.length === 0) {
      return NextResponse.json({ workers_pinged: 0, message: 'No matching workers found nearby' });
    }

    // 5. Create Job Pings
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now
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
      console.error('Job Ping Error:', pingError);
      return NextResponse.json({ error: 'Failed to create job pings' }, { status: 500 });
    }

    // 6. Handle Notifications (Logging for now)
    activeMatchedWorkers.forEach(worker => {
      // FCM Push Mock
      if (worker.fcm_token) {
        console.log(`[PUSH] FCM push would fire to: ${worker.user?.name || 'Worker'} (ID: ${worker.user_id})`);
      }

      // Telephony Mock
      if (process.env.MOCK_TELEPHONY === 'true' && worker.caller_id) {
        console.log(`[IVR] MOCK IVR call to: ${worker.caller_id} for job: ${job.interpreted_category}`);
      }
    });

    // 7. Update Job Status to 'bidding'
    await supabaseAdmin
      .from('jobs')
      .update({ status: 'bidding' })
      .eq('id', job_id);

    return NextResponse.json({ workers_pinged: activeMatchedWorkers.length });

  } catch (err: any) {
    console.error('Job Broadcast API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
