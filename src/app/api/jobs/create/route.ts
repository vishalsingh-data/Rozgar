import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

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

    const supabase = await createSupabaseServerClient();

    // Insert the new job
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
        status: 'pending' // Force initial status
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
