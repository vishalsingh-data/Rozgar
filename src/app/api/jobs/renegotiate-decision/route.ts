import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { renegotiation_id, customer_id, decision } = await req.json();

    if (!renegotiation_id || !customer_id || !decision) {
      return NextResponse.json({ error: 'Missing decision data' }, { status: 400 });
    }

    // 1. Fetch Renegotiation and Job
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

    // 2. Update Decision
    const { data: updatedRen, error: renUpdateError } = await supabaseAdmin
      .from('renegotiations')
      .update({ customer_decision: decision })
      .eq('id', renegotiation_id)
      .select()
      .single();

    if (renUpdateError) throw renUpdateError;

    let updatedJobData;

    if (decision === 'accepted') {
      // 3. Acceptance Logic: Update price and resume
      const { data: uj } = await supabaseAdmin
        .from('jobs')
        .update({
          final_price: renegotiation.new_price,
          status: 'on_site'
        })
        .eq('id', job.id)
        .select()
        .single();
      
      updatedJobData = uj;
      console.log(`[PUSH] Worker ${job.accepted_worker_id} notified: Price increase accepted.`);
    } else {
      // 4. Rejection Logic: Cancel job and penalize worker
      const { data: uj } = await supabaseAdmin
        .from('jobs')
        .update({ status: 'cancelled' })
        .eq('id', job.id)
        .select()
        .single();

      updatedJobData = uj;

      // Penalize worker
      const workerId = job.accepted_worker_id;
      
      // Add Strike
      await supabaseAdmin
        .from('strikes')
        .insert({
          worker_id: workerId,
          job_id: job.id,
          reason: 'renegotiation_abuse'
        });

      // Increment Strike Count
      const { data: worker } = await supabaseAdmin
        .from('workers')
        .select('strike_count')
        .eq('user_id', workerId)
        .single();

      if (worker) {
        const newCount = (worker.strike_count || 0) + 1;
        await supabaseAdmin
          .from('workers')
          .update({ 
            strike_count: newCount,
            is_active: newCount < 3
          })
          .eq('user_id', workerId);
      }

      console.log(`[PUSH] Worker ${workerId} notified: Price increase rejected. Strike issued.`);
    }

    return NextResponse.json({
      job: updatedJobData,
      renegotiation: updatedRen
    });

  } catch (err: any) {
    console.error('Renegotiation Decision API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
