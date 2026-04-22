import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { 
      job_id, 
      resolution, 
      mediation_notes, 
      partial_amount,
      worker_side_input 
    } = await req.json();

    if (!job_id || !resolution) {
      return NextResponse.json({ error: 'Missing resolution data' }, { status: 400 });
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
      updateData.status = 'complete';
      updateData.final_price = partial_amount;
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .update(updateData)
      .eq('id', job_id)
      .select()
      .single();

    if (jobError) throw jobError;

    // Log the worker side input as a special audit entry if provided
    if (worker_side_input) {
      console.log(`[DISPUTE] Worker side recorded for job ${job_id}: ${worker_side_input}`);
    }

    return NextResponse.json(job);

  } catch (err: any) {
    console.error('Dispute Resolution Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
