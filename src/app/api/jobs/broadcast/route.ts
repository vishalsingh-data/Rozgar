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
    // Logic: Active, low strikes, nearby, available today, and skill overlap
    const { data: matchedWorkers, error: workerError } = await supabaseAdmin
      .from('workers')
      .select('*, user:users(name)')
      .eq('is_active', true)
      .lt('strike_count', 3)
      .in('pincode', targetPincodes)
      .contains('availability_days', [today.charAt(0).toUpperCase() + today.slice(1)]) // Match 'Mon', 'Tue' etc.
      .overlaps('searchable_as', job.worker_tags_required || []);

    if (workerError) {
      console.error('Worker Matching Error:', workerError);
      return NextResponse.json({ error: workerError.message }, { status: 500 });
    }

    if (!matchedWorkers || matchedWorkers.length === 0) {
      return NextResponse.json({ workers_pinged: 0, message: 'No matching workers found nearby' });
    }

    // 5. Create Job Pings
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now
    const pings = matchedWorkers.map(worker => ({
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
    matchedWorkers.forEach(worker => {
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

    return NextResponse.json({ workers_pinged: matchedWorkers.length });

  } catch (err: any) {
    console.error('Job Broadcast API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
