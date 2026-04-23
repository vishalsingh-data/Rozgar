import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const {
      userId,
      role,
      name,
      language,
      // Worker
      bio,
      pincode,
      selectedSkills,
      // Partner
      nodeName,
      address,
      contactPhone,
      landmark,
    } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    // 1. Update shared users table
    const { error: userErr } = await supabaseAdmin
      .from('users')
      .update({ name: name?.trim(), language_pref: language })
      .eq('id', userId);

    if (userErr) {
      console.error('[Profile Update] users error:', userErr);
      throw userErr;
    }

    // 2. Role-specific update
    if (role === 'worker') {
      const { error: wErr } = await supabaseAdmin
        .from('workers')
        .upsert({
          user_id: userId,
          type: 'skilled',          // NOT NULL — required on insert
          raw_description: bio,
          pincode,
          searchable_as: selectedSkills || [],
        }, { onConflict: 'user_id' });

      if (wErr) {
        console.error('[Profile Update] workers error:', wErr);
        throw wErr;
      }
    } else if (role === 'partner_node') {
      const { error: pErr } = await supabaseAdmin
        .from('partner_nodes')
        .update({ name: nodeName, address, pincode, landmark, contact_phone: contactPhone })
        .eq('owner_id', userId);

      if (pErr) {
        console.error('[Profile Update] partner_nodes error:', pErr);
        throw pErr;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Profile Update] Unhandled error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
