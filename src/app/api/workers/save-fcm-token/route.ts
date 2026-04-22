import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { worker_id, token } = await req.json();

    if (!worker_id || !token) {
      return NextResponse.json({ error: 'Worker ID and Token are required' }, { status: 400 });
    }

    // Update workers table SET fcm_token = token WHERE user_id = worker_id
    const { error } = await supabaseAdmin
      .from('workers')
      .update({ fcm_token: token })
      .eq('user_id', worker_id);

    if (error) {
      console.error('FCM Token Save Error:', error);
      return NextResponse.json({ error: 'Failed to update device registration' }, { status: 500 });
    }

    console.log(`[FCM] Device token registered for worker: ${worker_id}`);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Save FCM Token API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
