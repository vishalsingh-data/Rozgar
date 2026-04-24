import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

const APPEAL_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

export async function POST(req: Request) {
  try {
    const { strike_id, worker_id, reason, evidence_url } = await req.json();

    if (!strike_id || !worker_id || !reason) {
      return NextResponse.json({ error: 'Missing appeal information' }, { status: 400 });
    }

    // 1. Fetch Strike
    const { data: strike, error: strikeError } = await supabaseAdmin
      .from('strikes')
      .select('*')
      .eq('id', strike_id)
      .single();

    if (strikeError || !strike) {
      return NextResponse.json({ error: 'Strike record not found' }, { status: 404 });
    }

    // 2. Verify ownership
    if (strike.worker_id !== worker_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 3. Check already appealed
    if (strike.appealed) {
      return NextResponse.json({ error: 'This strike has already been appealed' }, { status: 400 });
    }

    // 4. Verify 48-hour window using milliseconds (avoids truncation bugs)
    const strikeAgeMs = Date.now() - new Date(strike.created_at).getTime();
    if (strikeAgeMs > APPEAL_WINDOW_MS) {
      return NextResponse.json({ error: 'Appeal window (48 hours) has expired' }, { status: 400 });
    }

    // 5. Record appeal
    const { data: updatedStrike, error: updateError } = await supabaseAdmin
      .from('strikes')
      .update({
        appealed: true,
        appeal_status: 'pending',
        appeal_note: reason,
        appeal_evidence_url: evidence_url || null
      })
      .eq('id', strike_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedStrike);

  } catch (err: any) {
    console.error('Strike Appeal Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
