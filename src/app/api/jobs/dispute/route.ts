import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { job_id, worker_id } = await req.json();

    if (!job_id || !worker_id) {
      return NextResponse.json({ error: 'Job ID and Worker ID are required' }, { status: 400 });
    }

    // 1. Verify assigned worker
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('accepted_worker_id')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.accepted_worker_id !== worker_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Update status to 'disputed'
    const { data: updatedJob, error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({ status: 'disputed' })
      .eq('id', job_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedJob);

  } catch (err: any) {
    console.error('Dispute API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
