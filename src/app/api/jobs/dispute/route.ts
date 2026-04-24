import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// Both workers AND customers can open a dispute on a job
export async function POST(req: Request) {
  try {
    const { job_id, user_id, reason } = await req.json();

    if (!job_id || !user_id) {
      return NextResponse.json({ error: 'Job ID and User ID are required' }, { status: 400 });
    }

    // Fetch the job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('customer_id, accepted_worker_id, status')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify the caller is either the customer or the assigned worker
    const isCustomer = job.customer_id === user_id;
    const isWorker = job.accepted_worker_id === user_id;

    if (!isCustomer && !isWorker) {
      return NextResponse.json({ error: 'Unauthorized: You are not a participant in this job' }, { status: 403 });
    }

    // Only allow disputes on active jobs (not already disputed, cancelled, or complete)
    const allowedStatuses = ['assigned', 'in_transit', 'on_site', 'complete'];
    if (!allowedStatuses.includes(job.status)) {
      return NextResponse.json({ error: `Cannot dispute a job with status: ${job.status}` }, { status: 400 });
    }

    const { data: updatedJob, error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({ status: 'disputed' })
      .eq('id', job_id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`[DISPUTE] Job ${job_id} disputed by ${isCustomer ? 'customer' : 'worker'} (${user_id}). Reason: ${reason || 'not provided'}`);

    return NextResponse.json(updatedJob);

  } catch (err: any) {
    console.error('Dispute API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
