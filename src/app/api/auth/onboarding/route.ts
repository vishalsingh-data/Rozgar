import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const {
      userId,
      role,
      name,
      language,
      pincode,
      landmark,
      // Worker
      skills,
      workerType,
      bio,
      // Partner
      nodeName,
      address,
      contactPhone,
      gstNumber,
      aadharNumber,
      businessRegNumber,
      shopLandmark,
    } = await req.json();

    if (!userId || !role || !name) {
      return NextResponse.json({ error: 'Missing required profile data' }, { status: 400 });
    }

    // ── 1. Check if user row already exists ──────────────────────────────────
    // Use UPDATE for existing rows to avoid touching the phone (NOT NULL) column.
    const { data: existingRow } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    // Partners start as inactive (pending KYC review)
    const isActive = role !== 'partner_node';

    if (existingRow) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ role, name, language_pref: language, is_active: isActive })
        .eq('id', userId);

      if (updateError) {
        console.error('User Update Error:', updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({ id: userId, role, name, language_pref: language, is_active: isActive });

      if (insertError) {
        console.error('User Insert Error:', insertError);
        throw insertError;
      }
    }

    // ── 2. Role-Specific Profile ──────────────────────────────────────────────
    if (role === 'worker') {
      const { error: workerError } = await supabaseAdmin
        .from('workers')
        .upsert({
          user_id: userId,
          type: 'skilled',          // always 'skilled' — no type selector in UI
          searchable_as: skills || [],
          raw_description: bio,
          pincode,
          is_new: true,
          total_jobs: 0,
          completion_rate: 100,
        });

      if (workerError) {
        console.error('Worker Profile Error:', workerError);
        throw workerError;
      }
    } else if (role === 'partner_node') {
      // Gracefully handle partner_nodes table
      try {
        const { error: nodeError } = await supabaseAdmin
          .from('partner_nodes')
          .upsert({
            owner_id: userId,          // ← correct column name (matches dashboard query)
            name: nodeName || name,
            address,
            pincode,
            landmark: shopLandmark,
            contact_phone: contactPhone,
            gst_number: gstNumber,
            aadhar_number: aadharNumber,
            business_reg_number: businessRegNumber,
            kyc_status: 'pending',
          }, { onConflict: 'owner_id' });

        if (nodeError) {
          console.warn('Partner Node upsert warning:', nodeError.message);
          // Don't throw — new columns might not exist yet until SQL migration is run
        }
      } catch (e) {
        console.warn('Partner Node upsert failed gracefully:', e);
      }
    }

    // ── 3. Determine redirect ─────────────────────────────────────────────────
    let redirect = '/onboarding';
    if (role === 'customer') redirect = '/customer/dashboard';
    else if (role === 'worker') redirect = '/worker/dashboard';
    else if (role === 'partner_node') redirect = '/partner/pending'; // ← pending KYC

    return NextResponse.json({ success: true, redirect });
  } catch (err: any) {
    console.error('Onboarding API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error', details: err.details, code: err.code },
      { status: 500 }
    );
  }
}
