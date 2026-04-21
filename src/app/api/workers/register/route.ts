import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAdjacentPincodes } from '@/lib/pincodes';

export async function POST(req: Request) {
  try {
    const { 
      user_id, 
      raw_description, 
      skill_tags, 
      searchable_as, 
      worker_type, 
      pincode, 
      include_adjacent, 
      rate_preference, 
      availability_days, 
      photo_url 
    } = await req.json();

    if (!user_id || !worker_type || !pincode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Calculate adjacent pincodes if requested
    let adjacent_pincodes: string[] = [];
    if (include_adjacent) {
      adjacent_pincodes = getAdjacentPincodes(pincode);
    }

    // 2. Upsert into workers table (Update if exists, Insert if new)
    const { data, error } = await supabaseAdmin
      .from('workers')
      .upsert({
        user_id,
        type: worker_type,
        raw_description,
        skill_tags,
        searchable_as,
        pincode,
        adjacent_pincodes,
        rate_preference,
        availability_days,
        photo_url,
        aadhar_verified: false,
        strike_count: 0,
        total_jobs: 0,
        is_new: true
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Worker Registration DB Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Update the user role in users table just in case it hasn't been set
    await supabaseAdmin
      .from('users')
      .update({ role: 'worker' })
      .eq('id', user_id);

    return NextResponse.json(data);

  } catch (err: any) {
    console.error('Worker Registration API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
