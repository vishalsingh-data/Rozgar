import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { 
      job_id, 
      worker_id, 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature 
    } = await req.json();

    if (!job_id || !worker_id || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment or assignment data' }, { status: 400 });
    }

    // 1. Verify Razorpay Signature
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.error('[PAYMENT] Signature mismatch!');
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // 2. Fetch Job to get pricing info
    const { data: job, error: jobFetchError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobFetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 3. Finalize Price
    // Use AI price, or 100 if it's an inspection
    const finalPrice = job.is_inspection ? 100 : job.ai_base_price;

    // 4. Update Job Status and Assign Worker
    // SLA Deadline: 20 minutes from now
    const slaDeadline = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    const { data: updatedJob, error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({
        status: 'assigned',
        accepted_worker_id: worker_id,
        final_price: finalPrice,
        sla_deadline: slaDeadline
      })
      .eq('id', job_id)
      .select()
      .single();

    if (updateError) {
      console.error('Job Assignment Error:', updateError);
      return NextResponse.json({ error: 'Failed to assign worker' }, { status: 500 });
    }

    // 5. Reject all other bids for this job
    await supabaseAdmin
      .from('bids')
      .update({ status: 'rejected' })
      .eq('job_id', job_id)
      .neq('worker_id', worker_id);

    // 6. Log Notification (FCM Push later)
    console.log(`[FCM] Notification would fire to worker ${worker_id} with customer address and phone for job ${job_id}`);

    return NextResponse.json(updatedJob);

  } catch (err: any) {
    console.error('Select Worker API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
