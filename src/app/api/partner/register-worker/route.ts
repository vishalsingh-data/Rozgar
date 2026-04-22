import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { 
      name, 
      phone, 
      description, 
      language_pref, 
      worker_type, 
      has_smartphone, 
      aadhar_front_url, 
      aadhar_back_url, 
      tags, 
      category,
      partner_node_id 
    } = data;

    if (!name || !phone || !partner_node_id) {
      return NextResponse.json({ error: 'Missing critical information' }, { status: 400 });
    }

    // 1. Create User entry (Direct insert, no OTP)
    // We check if user exists first
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    let userId;

    if (existingUser) {
      userId = existingUser.id;
      // Update role and name just in case
      await supabaseAdmin
        .from('users')
        .update({ role: 'worker', name, language_pref, is_active: true })
        .eq('id', userId);
    } else {
      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          role: 'worker',
          phone,
          name,
          language_pref,
          is_active: true
        })
        .select('id')
        .single();
      
      if (userError) throw userError;
      userId = newUser.id;
    }

    // 2. Create/Update Worker Profile
    const { data: worker, error: workerError } = await supabaseAdmin
      .from('workers')
      .upsert({
        user_id: userId,
        partner_node_id,
        searchable_as: category || worker_type,
        skills: tags || [],
        bio: description,
        aadhar_front_url,
        aadhar_back_url,
        is_active: true,
        aadhar_verified: !!aadhar_front_url,
        caller_id: has_smartphone ? null : phone, // Set caller_id for telephony if no smartphone
        is_new: true,
        total_jobs: 0,
        completion_rate: 100
      })
      .select()
      .single();

    if (workerError) throw workerError;

    return NextResponse.json({ success: true, user: { id: userId, name }, worker });

  } catch (err: any) {
    console.error('Partner Worker Registration API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
