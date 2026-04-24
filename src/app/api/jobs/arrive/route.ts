import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { job_id, worker_id } = await req.json();

    if (!job_id || !worker_id) {
      return NextResponse.json({ error: 'Job ID and Worker ID are required' }, { status: 400 });
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('accepted_worker_id, status')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.accepted_worker_id !== worker_id) {
      return NextResponse.json({ error: 'Unauthorized: You are not assigned to this job' }, { status: 403 });
    }

    // Only allow arrival from in_transit state
    if (job.status !== 'in_transit') {
      return NextResponse.json({ error: `Cannot mark arrival from status: ${job.status}` }, { status: 400 });
    }

    const { data: updatedJob, error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({ status: 'on_site' })
      .eq('id', job_id)
      .eq('status', 'in_transit') // Atomic guard
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updatedJob) {
      return NextResponse.json({ error: 'Job status changed concurrently, please refresh' }, { status: 409 });
    }

    return NextResponse.json(updatedJob);

  } catch (err: any) {
    console.error('Arrive API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
