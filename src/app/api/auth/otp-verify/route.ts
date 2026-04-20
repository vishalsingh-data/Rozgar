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
        console.error('Sign-in Error during bypass:', signInError);
        // If password doesn't match (e.g. changed manually), we try to reset it
        await supabaseAdmin.auth.admin.updateUserById(
          (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.phone === phone)?.id || '',
          { password: mockPassword }
        );
        // Try sign in again
        const retry = await supabase.auth.signInWithPassword({ phone, password: mockPassword });
        if (retry.error) throw retry.error;
      }

      // 3. Check role for redirect
      const cleanPhone = phone.replace(/^\+91/, '');
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('phone', cleanPhone)
        .single();

      if (!userData) {
        return NextResponse.json({ redirect: '/onboarding', role: 'new_user' });
      }

      const { role, id: userId } = userData;
      if (role === 'worker') {
        const { data: workerData } = await supabaseAdmin.from('workers').select('id').eq('user_id', userId).single();
        return NextResponse.json({ redirect: workerData ? '/worker/dashboard' : '/worker/register', role: 'worker' });
      }
      
      return NextResponse.json({ 
        redirect: role === 'customer' ? '/customer/dashboard' : '/partner/dashboard', 
        role: role 
      });
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
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .or(`phone.eq.${phone},phone.eq.${cleanPhone}`)
      .single();

    if (!userData || userError) {
      return NextResponse.json({ redirect: '/onboarding', role: 'new_user' });
    }

    return NextResponse.json({ redirect: userData.role === 'customer' ? '/customer/dashboard' : '/worker/dashboard', role: userData.role });
  } catch (error: any) {
    console.error('OTP Verify Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
