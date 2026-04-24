import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-server';

const MAX_ACTIVE_JOBS_PER_CUSTOMER = 5;

export async function POST(req: Request) {
  try {
    const {
      customer_id,
      raw_description,
      interpreted_category,
      worker_tags_required,
      ai_base_price,
      ai_confidence,
      is_inspection,
      photo_url,
      pincode
    } = await req.json();

    if (!customer_id || !raw_description || !pincode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Spam guard: limit active jobs per customer
    const activeStatuses = ['pending', 'bidding', 'assigned', 'in_transit', 'on_site', 'renegotiating'];
    const { count: activeCount } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer_id)
      .in('status', activeStatuses);

    if ((activeCount || 0) >= MAX_ACTIVE_JOBS_PER_CUSTOMER) {
      return NextResponse.json({
        error: `You already have ${MAX_ACTIVE_JOBS_PER_CUSTOMER} active jobs. Complete or cancel one before posting a new job.`
      }, { status: 429 });
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        customer_id,
        raw_description,
        interpreted_category,
        worker_tags_required,
        ai_base_price,
        ai_confidence,
        is_inspection: is_inspection || false,
        photo_url,
        pincode,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Job Creation DB Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (err: any) {
    console.error('Job Creation API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
