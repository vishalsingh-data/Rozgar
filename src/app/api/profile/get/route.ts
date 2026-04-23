import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Core profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('name, role, language_pref, phone')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let workerData = null;
    let partnerData = null;

    if (profile.role === 'worker') {
      const { data: w } = await supabaseAdmin
        .from('workers')
        .select('raw_description, pincode, searchable_as, photo_url')
        .eq('user_id', userId)
        .maybeSingle();
      workerData = w;
    } else if (profile.role === 'partner_node') {
      const { data: node } = await supabaseAdmin
        .from('partner_nodes')
        .select('name, address, pincode, landmark, contact_phone')
        .eq('owner_id', userId)
        .maybeSingle();
      partnerData = node;
    }

    return NextResponse.json({ profile, workerData, partnerData });
  } catch (err: any) {
    console.error('[Profile GET] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
