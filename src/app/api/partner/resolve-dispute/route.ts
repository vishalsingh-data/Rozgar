import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const {
      job_id,
      partner_node_id,
      resolution,
      mediation_notes,
      partial_amount,
      worker_side_input
    } = await req.json();

    if (!job_id || !resolution || !partner_node_id) {
      return NextResponse.json({ error: 'Missing resolution data' }, { status: 400 });
    }

    // 1. Verify partner is verified and active
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partner_nodes')
      .select('id, pincode, is_verified, kyc_status')
      .eq('owner_id', partner_node_id)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: 'Partner node not found' }, { status: 404 });
    }

    if (!partner.is_verified || partner.kyc_status !== 'approved') {
      return NextResponse.json({ error: 'Your partner account is not yet verified' }, { status: 403 });
    }

    // 2. Fetch the job to verify it is disputed and in this partner's jurisdiction
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, status, pincode, customer_id, accepted_worker_id, final_price')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'disputed') {
      return NextResponse.json({ error: 'Job is not in disputed status' }, { status: 400 });
    }

    // 3. Jurisdiction check — partner can only resolve jobs in their pincode area
    const { getAdjacentPincodes } = await import('@/lib/pincodes');
    const servicePincodes = [partner.pincode, ...getAdjacentPincodes(partner.pincode)];
    if (!servicePincodes.includes(job.pincode)) {
      return NextResponse.json({ error: 'This job is outside your service area' }, { status: 403 });
    }

    const updateData: any = {
      mediation_notes: mediation_notes || '',
      is_escalated: resolution === 'escalate'
    };

    if (resolution === 'complete') {
      updateData.status = 'complete';
    } else if (resolution === 'incomplete') {
      updateData.status = 'cancelled';
    } else if (resolution === 'partial') {
      if (!partial_amount || Number(partial_amount) <= 0) {
        return NextResponse.json({ error: 'partial_amount must be a positive number' }, { status: 400 });
      }
      updateData.status = 'complete';
      updateData.final_price = Number(partial_amount);
      // Log that a manual refund of the difference is required
      console.log(
        `[DISPUTE] Partial resolution for job=${job_id}: ` +
        `original=₹${job.final_price} settled=₹${partial_amount}. ` +
        `Manual Razorpay refund of ₹${(job.final_price || 0) - Number(partial_amount)} required.`
      );
    } else if (resolution !== 'escalate') {
      return NextResponse.json({ error: 'Invalid resolution value' }, { status: 400 });
    }

    const { data: updatedJob, error: jobUpdateError } = await supabaseAdmin
      .from('jobs')
      .update(updateData)
      .eq('id', job_id)
      .select()
      .single();

    if (jobUpdateError) throw jobUpdateError;

    if (worker_side_input) {
      console.log(`[DISPUTE] Worker side for job=${job_id}: ${worker_side_input}`);
    }

    return NextResponse.json(updatedJob);

  } catch (err: any) {
    console.error('Dispute Resolution Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
