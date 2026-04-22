import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { 
      userId, 
      role, 
      name, 
      language, 
      pincode, 
      workerType, 
      bio, 
      nodeName 
    } = await req.json();

    if (!userId || !role || !name) {
      return NextResponse.json({ error: 'Missing required profile data' }, { status: 400 });
    }

    // 1. Update Core User Profile
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        role: role,
        name: name,
        language_pref: language,
        is_active: true
      });

    if (userError) {
      console.error('User Sync Error:', userError);
      throw userError;
    }

    // 2. Create Role-Specific Profile
    if (role === 'worker') {
      const { error: workerError } = await supabaseAdmin
        .from('workers')
        .upsert({
          user_id: userId,
          type: workerType,
          raw_description: bio,
          pincode: pincode,
          is_new: true,
          total_jobs: 0,
          completion_rate: 100
        });
      if (workerError) {
        console.error('Worker Profile Error:', workerError);
        throw workerError;
      }
    } else if (role === 'partner_node') {
      // Graceful handling of partner_nodes table (it might be missing)
      try {
        const { error: nodeError } = await supabaseAdmin
          .from('partner_nodes')
          .upsert({
            user_id: userId,
            name: nodeName || name,
            pincode: pincode
          });
        if (nodeError) {
          console.warn('Partner Node table missing or inaccessible:', nodeError.message);
        }
      } catch (e) {
        console.warn('Partner Node table failed gracefully');
      }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Secure Onboarding API Error:', err);
    return NextResponse.json({ 
      error: err.message || 'Internal server error',
      details: err.details,
      code: err.code
    }, { status: 500 });
  }
}
