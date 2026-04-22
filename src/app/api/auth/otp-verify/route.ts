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

    // ─────────────────────────────────────────────────────────────────────────
    // UNIVERSAL DEVELOPMENT BYPASS: "000000" is the Master Key
    // ─────────────────────────────────────────────────────────────────────────
    if (otp === '000000') {
      console.log('Master Key triggered for:', phone);
      
      const mockPassword = `Rozgar!${phone.slice(-4)}`;

      // 1. Force create/update in Auth
      // We don't wait for result, just attempt to ensure it exists
      try {
        await supabaseAdmin.auth.admin.createUser({
          phone: phone,
          password: mockPassword,
          phone_confirm: true
        });
      } catch (e) {
        // User likely exists, ignore
      }

      // 2. Sign in to get a real session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        phone: phone,
        password: mockPassword,
      });

      if (signInError) {
        console.error('Sign-in Error during bypass:', signInError.message);
        
        // If password doesn't match, reset it. 
        // Search for the user to get their UUID safely.
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users.find(u => u.phone === phone || u.phone === phone.replace('+', ''));
        
        if (existingUser?.id) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: mockPassword });
          
          // Final attempt to sign in
          const retry = await supabase.auth.signInWithPassword({ phone, password: mockPassword });
          if (retry.error) throw retry.error;
        } else {
          throw new Error('User not found and could not be created');
        }
      }

      // 3. Sync & Route
      const cleanPhone = phone.replace(/^\+91/, '');
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id, role, name')
        .or(`phone.eq.${phone},phone.eq.${cleanPhone}`)
        .maybeSingle();

      if (!userData) {
        await supabaseAdmin.from('users').insert({
          id: signInData.user.id,
          phone: cleanPhone,
          role: 'customer',
          is_active: true
        });
        return NextResponse.json({ redirect: '/onboarding', role: 'customer', session: signInData.session });
      }

      // If name is missing, they MUST go to onboarding
      if (!userData.name) {
        return NextResponse.json({ redirect: '/onboarding', role: userData.role, session: signInData.session });
      }

      let redirect = '/onboarding';
      if (userData.role === 'customer') redirect = '/customer/dashboard';
      else if (userData.role === 'worker') redirect = '/worker/dashboard';
      else if (userData.role === 'partner_node') redirect = '/partner/dashboard';

      return NextResponse.json({ redirect, role: userData.role, session: signInData.session });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // 1. REAL Verify OTP
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
