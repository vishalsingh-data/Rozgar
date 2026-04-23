import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();


    // Verify the real OTP sent by Twilio via Supabase

    const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });

    if (verifyError || !session) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });
    }

    const cleanPhone = phone.replace(/^\+91/, '');
    
    // 2. Mirror into public.users if missing
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .or(`phone.eq.${phone},phone.eq.${cleanPhone}`)
      .maybeSingle();

    if (!existingUser) {
      await supabaseAdmin.from('users').insert({
        id: session.user.id,
        phone: cleanPhone,
        role: 'customer', // Placeholder role
        is_active: true
      });
      return NextResponse.json({ redirect: '/onboarding', role: 'customer', session: session });
    }

    // 3. Determine Redirect
    // If name is missing, they MUST go to onboarding regardless of role
    const { data: profile } = await supabaseAdmin.from('users').select('name').eq('id', session.user.id).single();
    
    if (!profile?.name) {
      return NextResponse.json({ redirect: '/onboarding', role: existingUser.role, session: session });
    }

    let redirect = '/onboarding';
    if (existingUser.role === 'customer') redirect = '/customer/dashboard';
    else if (existingUser.role === 'worker') redirect = '/worker/dashboard';
    else if (existingUser.role === 'partner_node') redirect = '/partner/dashboard';

    return NextResponse.json({ redirect, role: existingUser.role, session: session });
  } catch (error: any) {
    console.error('OTP Verify Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
