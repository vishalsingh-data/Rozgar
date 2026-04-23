import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, password, mode } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // ── SIGN UP ──────────────────────────────────────────────────────────────
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Session is immediate when email confirmation is disabled in Supabase
      if (data.session) {
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', data.user!.id)
          .maybeSingle();

        if (!existingUser) {
          await supabaseAdmin.from('users').insert({
            id: data.user!.id,
            role: 'customer',
            is_active: true,
          });
        }

        return NextResponse.json({
          session: data.session,
          redirect: '/onboarding',
          needsVerification: false,
        });
      }

      // Email confirmation is required — session is null
      return NextResponse.json({
        needsVerification: true,
        message: 'Check your email to confirm your account, then sign in.',
      });
    }

    // ── SIGN IN ──────────────────────────────────────────────────────────────
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Fetch or create public.users row
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, role, name')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!existingUser) {
      await supabaseAdmin.from('users').insert({
        id: data.user.id,
        role: 'customer',
        is_active: true,
      });
      return NextResponse.json({ session: data.session, redirect: '/onboarding' });
    }

    if (!existingUser.name) {
      return NextResponse.json({
        session: data.session,
        redirect: '/onboarding',
        role: existingUser.role,
      });
    }

    let redirect = '/onboarding';
    if (existingUser.role === 'customer') redirect = '/customer/dashboard';
    else if (existingUser.role === 'worker') redirect = '/worker/dashboard';
    else if (existingUser.role === 'partner_node') redirect = '/partner/dashboard';

    return NextResponse.json({ session: data.session, redirect, role: existingUser.role });
  } catch (error: any) {
    console.error('Email Auth Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
