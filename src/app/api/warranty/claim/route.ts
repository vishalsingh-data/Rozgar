import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { job_id, customer_id, description, photo_url } = await req.json();

    if (!job_id || !customer_id || !description) {
      return NextResponse.json({ error: 'Missing claim information' }, { status: 400 });
    }

    // 1. Fetch Job and Verify
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 2. Verify Customer
    if (job.customer_id !== customer_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 3. Verify Warranty Expiry
    const now = new Date();
    const expiry = new Date(job.warranty_expires_at);
    if (expiry < now) {
      return NextResponse.json({ error: 'Warranty has expired' }, { status: 400 });
    }

    // 4. Create Warranty Claim
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('warranty_claims')
      .insert({
        job_id,
        customer_id,
        worker_id: job.accepted_worker_id,
        description,
        photo_url,
        status: 'open'
      })
      .select()
      .single();

    if (claimError) throw claimError;

    // 5. Notify Worker (FCM later)
    console.log(`[PUSH] Notification would fire to worker ${job.accepted_worker_id}: Warranty claim filed for job ${job_id}`);

    return NextResponse.json(claim);

  } catch (err: any) {
    console.error('Warranty Claim Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
