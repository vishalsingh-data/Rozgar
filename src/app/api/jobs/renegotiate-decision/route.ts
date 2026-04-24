import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { renegotiation_id, customer_id, decision } = await req.json();

    if (!renegotiation_id || !customer_id || !decision) {
      return NextResponse.json({ error: 'Missing decision data' }, { status: 400 });
    }

    if (decision !== 'accepted' && decision !== 'rejected') {
      return NextResponse.json({ error: 'Decision must be "accepted" or "rejected"' }, { status: 400 });
    }

    // 1. Fetch Renegotiation and Job together
    const { data: renegotiation, error: renError } = await supabaseAdmin
      .from('renegotiations')
      .select('*, job:jobs(*)')
      .eq('id', renegotiation_id)
      .single();

    if (renError || !renegotiation) {
      return NextResponse.json({ error: 'Renegotiation record not found' }, { status: 404 });
    }

    const job = renegotiation.job;

    if (job.customer_id !== customer_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Validate job is actually in renegotiating state
    if (job.status !== 'renegotiating') {
      return NextResponse.json({ error: 'This job is not in a renegotiating state' }, { status: 400 });
    }

    // 3. Validate renegotiation is still pending
    if (renegotiation.customer_decision !== 'pending') {
      return NextResponse.json({ error: 'This renegotiation has already been decided' }, { status: 409 });
    }

    // 4. Update Decision
    const { data: updatedRen, error: renUpdateError } = await supabaseAdmin
      .from('renegotiations')
      .update({ customer_decision: decision })
      .eq('id', renegotiation_id)
      .select()
      .single();

    if (renUpdateError) throw renUpdateError;

    let updatedJobData;

    if (decision === 'accepted') {
      // 5a. Accept: update price and resume work
      const { data: uj } = await supabaseAdmin
        .from('jobs')
        .update({ final_price: renegotiation.new_price, status: 'on_site' })
        .eq('id', job.id)
        .select()
        .single();

      updatedJobData = uj;
      console.log(`[PUSH] Worker ${job.accepted_worker_id} notified: Price increase accepted to ₹${renegotiation.new_price}.`);
    } else {
      // 5b. Reject: cancel job and penalize worker
      const { data: uj } = await supabaseAdmin
        .from('jobs')
        .update({ status: 'cancelled' })
        .eq('id', job.id)
        .select()
        .single();

      updatedJobData = uj;

      const workerId = job.accepted_worker_id;

      // Insert strike
      await supabaseAdmin
        .from('strikes')
        .insert({ worker_id: workerId, job_id: job.id, reason: 'renegotiation_abuse' });

      // Fetch current strike count and increment atomically via DB value
      const { data: worker } = await supabaseAdmin
        .from('workers')
        .select('strike_count')
        .eq('user_id', workerId)
        .single();

      if (worker) {
        const newCount = (worker.strike_count || 0) + 1;

        await supabaseAdmin
          .from('workers')
          .update({ strike_count: newCount })
          .eq('user_id', workerId);

        // Deactivate user if 3 strikes reached (is_active lives on users table)
        if (newCount >= 3) {
          await supabaseAdmin
            .from('users')
            .update({ is_active: false })
            .eq('id', workerId);
        }
      }

      console.log(`[PUSH] Worker ${workerId} notified: Price increase rejected. Strike issued. Job cancelled.`);
    }

    return NextResponse.json({ job: updatedJobData, renegotiation: updatedRen });

  } catch (err: any) {
    console.error('Renegotiation Decision API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
