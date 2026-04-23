import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * Google OAuth Callback Handler
 *
 * Google → Supabase → here (with ?code=xxx)
 * We exchange the code for a real session, mirror the user into
 * public.users, then redirect to the correct dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    console.error('OAuth Callback: missing code param');
    return NextResponse.redirect(new URL('/login?error=missing_code', origin));
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Exchange the one-time code for a persistent session (sets cookies)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      console.error('OAuth Code Exchange Error:', error?.message);
      return NextResponse.redirect(new URL('/login?error=oauth_failed', origin));
    }

    const user = data.session.user;

    // Mirror into public.users if this is a brand-new OAuth user
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, role, name')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingUser) {
      const { error: insertErr } = await supabaseAdmin.from('users').insert({
        id: user.id,
        role: 'customer',
        is_active: true,
      });
      if (insertErr) {
        console.error('OAuth Callback: Failed to create user row:', insertErr.message);
        // Still redirect to onboarding — the onboarding route will try again
      }
      return NextResponse.redirect(new URL('/onboarding', origin));
    }

    // Onboarding not complete
    if (!existingUser.name) {
      return NextResponse.redirect(new URL('/onboarding', origin));
    }

    let redirect = '/onboarding';
    if (existingUser.role === 'customer') redirect = '/customer/dashboard';
    else if (existingUser.role === 'worker') redirect = '/worker/dashboard';
    else if (existingUser.role === 'partner_node') redirect = '/partner/dashboard';

    return NextResponse.redirect(new URL(redirect, origin));
  } catch (error: any) {
    console.error('OAuth Callback Fatal Error:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', origin));
  }
}
