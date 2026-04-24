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

    // 1. Create or retrieve User entry
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      await supabaseAdmin
        .from('users')
        .update({ role: 'worker', name, language_pref, is_active: true })
        .eq('id', userId);
    } else {
      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert({ role: 'worker', phone, name, language_pref, is_active: true })
        .select('id')
        .single();

      if (userError) throw userError;

      // Explicit null check — insert should always return data on success, but guard anyway
      if (!newUser || !newUser.id) {
        throw new Error('User creation succeeded but returned no ID');
      }

      userId = newUser.id;
    }

    // 2. Create/Update Worker Profile
    const { data: worker, error: workerError } = await supabaseAdmin
      .from('workers')
      .upsert({
        user_id: userId,
        partner_node_id,
        type: worker_type || 'semi_skilled',
        searchable_as: Array.isArray(category) ? category : (category ? [category] : []),
        skill_tags: tags || [],
        raw_description: description,
        aadhar_front_url,
        aadhar_back_url,
        aadhar_verified: !!aadhar_front_url,
        caller_id: has_smartphone ? null : phone,
        is_new: true,
        total_jobs: 0,
        completion_rate: 100,
        strike_count: 0
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (workerError) throw workerError;

    return NextResponse.json({ success: true, user: { id: userId, name }, worker });

  } catch (err: any) {
    console.error('Partner Worker Registration API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
