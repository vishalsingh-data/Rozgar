import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    if (!phone.startsWith('+91') || phone.length !== 13) {
      return NextResponse.json({ 
        error: 'Invalid phone number format. Must start with +91 and be 10 digits.' 
      }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('OTP Send API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
