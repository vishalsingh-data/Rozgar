import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import Razorpay from 'razorpay';
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

    // 2. Fetch Job — must still be in 'bidding' to prevent double-assignment
    const { data: job, error: jobFetchError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobFetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'bidding') {
      return NextResponse.json({ error: 'Job is no longer available for assignment' }, { status: 409 });
    }

    // 3. Verify payment amount matches expected convenience fee via Razorpay API
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });
      const order = await razorpay.orders.fetch(razorpay_order_id);
      const expectedFee = (job.ai_base_price <= 300 || job.is_inspection) ? 25 : 49;
      const expectedPaise = expectedFee * 100;

      if (Number(order.amount) !== expectedPaise) {
        console.error(`[PAYMENT] Amount mismatch: paid ${order.amount} paise, expected ${expectedPaise} paise`);
        return NextResponse.json({ error: 'Payment amount does not match expected fee' }, { status: 400 });
      }
    } catch (payErr: any) {
      console.error('[PAYMENT] Could not verify order amount:', payErr.message);
      // Non-fatal: log and continue rather than blocking legitimate payments during Razorpay outages
    }

    // 4. Finalize Price
    const finalPrice = job.is_inspection ? 100 : job.ai_base_price;

    // 5. Atomically assign worker — only if still in 'bidding' (prevents race condition)
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
      .eq('status', 'bidding') // Atomic guard against concurrent selection
      .select()
      .maybeSingle();

    if (!updatedJob) {
      return NextResponse.json({ error: 'Job was already assigned to another worker' }, { status: 409 });
    }

    if (updateError) {
      console.error('Job Assignment Error:', updateError);
      return NextResponse.json({ error: 'Failed to assign worker' }, { status: 500 });
    }

    // 6. Reject all other bids for this job
    await supabaseAdmin
      .from('bids')
      .update({ status: 'rejected' })
      .eq('job_id', job_id)
      .neq('worker_id', worker_id);

    console.log(`[FCM] Notification would fire to worker ${worker_id} for job ${job_id}`);

    return NextResponse.json(updatedJob);

  } catch (err: any) {
    console.error('Select Worker API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
