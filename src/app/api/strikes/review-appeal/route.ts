import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// Admin-only endpoint to approve or reject a pending appeal
export async function POST(req: Request) {
  try {
    // Admin auth check
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token');
    const expectedToken = process.env.ADMIN_SESSION_SECRET || 'rozgar-admin-fallback-secret';
    if (!token || token.value !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { strike_id, decision, admin_note } = await req.json();

    if (!strike_id || !decision) {
      return NextResponse.json({ error: 'strike_id and decision are required' }, { status: 400 });
    }

    if (decision !== 'upheld' && decision !== 'overturned') {
      return NextResponse.json({ error: 'Decision must be "upheld" or "overturned"' }, { status: 400 });
    }

    // Fetch the strike
    const { data: strike, error: strikeError } = await supabaseAdmin
      .from('strikes')
      .select('*')
      .eq('id', strike_id)
      .single();

    if (strikeError || !strike) {
      return NextResponse.json({ error: 'Strike not found' }, { status: 404 });
    }

    if (!strike.appealed || strike.appeal_status !== 'pending') {
      return NextResponse.json({ error: 'This appeal is not in pending status' }, { status: 400 });
    }

    // Update appeal status
    const { data: updatedStrike, error: updateError } = await supabaseAdmin
      .from('strikes')
      .update({ appeal_status: decision, appeal_note: admin_note || strike.appeal_note })
      .eq('id', strike_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // If appeal overturned: decrement strike count and reactivate worker if needed
    if (decision === 'overturned') {
      const { data: worker } = await supabaseAdmin
        .from('workers')
        .select('strike_count')
        .eq('user_id', strike.worker_id)
        .single();

      if (worker) {
        const newCount = Math.max(0, (worker.strike_count || 0) - 1);
        await supabaseAdmin
          .from('workers')
          .update({ strike_count: newCount })
          .eq('user_id', strike.worker_id);

        // Reactivate if now below 3 strikes
        if (newCount < 3) {
          await supabaseAdmin
            .from('users')
            .update({ is_active: true })
            .eq('id', strike.worker_id);
        }
      }
    }

    return NextResponse.json(updatedStrike);

  } catch (err: any) {
    console.error('Review Appeal Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
