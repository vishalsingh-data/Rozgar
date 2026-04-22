import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { job_id, worker_id, source = 'app' } = await req.json();

    if (!job_id || !worker_id) {
      return NextResponse.json({ error: 'Missing job or worker information' }, { status: 400 });
    }

    // 1. Check for existing bid (Idempotency)
    const { data: existingBid } = await supabaseAdmin
      .from('bids')
      .select('*')
      .eq('job_id', job_id)
      .eq('worker_id', worker_id)
      .maybeSingle();

    if (existingBid) {
      return NextResponse.json(existingBid);
    }

    // 2. Sync with Job Pings (Update alert status)
    const { error: pingUpdateError } = await supabaseAdmin
      .from('job_pings')
      .update({ status: 'bid_placed' })
      .eq('job_id', job_id)
      .eq('worker_id', worker_id);

    if (pingUpdateError) {
      console.warn('Job Ping update failed, continuing with bid insertion:', pingUpdateError.message);
    }

    // 3. Insert the new Bid
    const { data: newBid, error: bidError } = await supabaseAdmin
      .from('bids')
      .insert({
        job_id,
        worker_id,
        source,
        status: 'pending'
      })
      .select()
      .single();

    if (bidError) {
      console.error('Bid insertion error:', bidError);
      return NextResponse.json({ error: 'Failed to submit bid' }, { status: 500 });
    }

    // 4. Return the newly created bid
    return NextResponse.json(newBid);

  } catch (err: any) {
    console.error('Bids Submit API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
