import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { caller_id, dialed_number } = await req.json();

    if (!caller_id) {
      return NextResponse.json({ error: 'Caller ID is required' }, { status: 400 });
    }

    // 1. Find the worker by caller_id
    const { data: worker, error: workerError } = await supabaseAdmin
      .from('workers')
      .select('user_id')
      .eq('caller_id', caller_id)
      .single();

    if (workerError || !worker) {
      console.log(`[MISSED CALL] Unknown caller: ${caller_id}`);
      return NextResponse.json({ error: 'Worker not registered with this number' }, { status: 404 });
    }

    // 2. Find the most recent active job ping for this worker
    // Must be 'pending' and not expired
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('job_pings')
      .select('*')
      .eq('worker_id', worker.user_id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (pingError || !ping) {
      console.log(`[MISSED CALL] No active ping for worker: ${worker.user_id}`);
      return NextResponse.json({ error: 'No active job alerts found for this caller' }, { status: 404 });
    }

    // 3. Check for existing bids to prevent duplicates (Idempotency)
    const { data: existingBid } = await supabaseAdmin
      .from('bids')
      .select('id')
      .eq('job_id', ping.job_id)
      .eq('worker_id', worker.user_id)
      .single();

    if (existingBid) {
      return NextResponse.json({ message: 'Bid already placed for this job' }, { status: 200 });
    }

    // 4. Insert the Bid
    const { error: bidError } = await supabaseAdmin
      .from('bids')
      .insert({
        job_id: ping.job_id,
        worker_id: worker.user_id,
        source: 'missed_call',
        status: 'pending'
      });

    if (bidError) {
      console.error('Bid Insertion Error:', bidError);
      return NextResponse.json({ error: 'Failed to place bid' }, { status: 500 });
    }

    // 5. Update the ping status to 'bid_placed'
    await supabaseAdmin
      .from('job_pings')
      .update({ status: 'bid_placed' })
      .eq('id', ping.id);

    console.log(`[MISSED CALL] Successful bid from ${caller_id} for job ${ping.job_id}`);
    
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Missed Call API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
