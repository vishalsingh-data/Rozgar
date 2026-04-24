import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { job_id, worker_id } = await req.json();

    if (!job_id || !worker_id) {
      return NextResponse.json({ error: 'Job ID and Worker ID are required' }, { status: 400 });
    }

    // 1. Fetch Job and Verify Worker
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.accepted_worker_id !== worker_id) {
      return NextResponse.json({ error: 'Unauthorized: You are not assigned to this job' }, { status: 403 });
    }

    // Guard: null worker_id should never happen but be safe
    if (!job.accepted_worker_id) {
      return NextResponse.json({ error: 'No worker assigned to this job' }, { status: 400 });
    }

    // 2. Idempotency: only update if not already complete
    // Use a conditional update — if it returns no row, job was already completed
    const warrantyExpires = new Date();
    warrantyExpires.setDate(warrantyExpires.getDate() + 7);

    const { data: updatedJob } = await supabaseAdmin
      .from('jobs')
      .update({
        status: 'complete',
        warranty_expires_at: warrantyExpires.toISOString()
      })
      .eq('id', job_id)
      .neq('status', 'complete') // Atomic guard — skip if already complete
      .select()
      .maybeSingle();

    if (!updatedJob) {
      // Already completed — return current state without touching stats again
      const { data: existingJob } = await supabaseAdmin.from('jobs').select().eq('id', job_id).single();
      return NextResponse.json(existingJob);
    }

    // 3. Update Worker Statistics using counts from DB (not incremental to stay accurate)
    const [{ count: completedCount }, { count: totalAssigned }] = await Promise.all([
      supabaseAdmin
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('accepted_worker_id', worker_id)
        .eq('status', 'complete'),
      supabaseAdmin
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('accepted_worker_id', worker_id)
    ]);

    const completionRate = totalAssigned && totalAssigned > 0
      ? Math.round(((completedCount || 0) / totalAssigned) * 100)
      : 0;

    const { data: workerProfile } = await supabaseAdmin
      .from('workers')
      .select('total_jobs, partner_node_id')
      .eq('user_id', worker_id)
      .single();

    if (workerProfile) {
      const newTotalJobs = (completedCount || 0); // Use actual DB count, not stored+1

      await supabaseAdmin
        .from('workers')
        .update({
          total_jobs: newTotalJobs,
          completion_rate: completionRate,
          is_new: newTotalJobs < 3
        })
        .eq('user_id', worker_id);

      // 4. Handle Partner Commission (40% of Platform Fee)
      if (workerProfile.partner_node_id) {
        const convenienceFee = (updatedJob.final_price || 0) <= 300 ? 25 : 49;
        const partnerAmount = Math.floor(convenienceFee * 0.4);

        await supabaseAdmin
          .from('partner_ledger')
          .insert({
            partner_node_id: workerProfile.partner_node_id,
            job_id: job_id,
            worker_id: worker_id,
            amount: partnerAmount,
            status: 'pending'
          });

        console.log(`[LEDGER] Recorded commission of ₹${partnerAmount} for partner ${workerProfile.partner_node_id}`);
      }
    }

    return NextResponse.json(updatedJob);

  } catch (err: any) {
    console.error('Complete API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
