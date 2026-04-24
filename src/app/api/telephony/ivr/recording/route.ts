import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { downloadRecording } from '@/lib/twilio';
import { transcribeAudio, extractWorkerProfile, extractSupportTicket } from '@/lib/ivr-ai';
import { sendSMS } from '@/lib/twilio';

/**
 * POST /api/telephony/ivr/recording
 *
 * Twilio sends this webhook when a recording is complete.
 * This is the AI pipeline: download → transcribe → extract → act.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingStatus = formData.get('RecordingStatus') as string;

    // Only process completed recordings
    if (recordingStatus && recordingStatus !== 'completed') {
      return NextResponse.json({ message: 'Recording not yet complete' });
    }

    if (!recordingUrl || !callSid) {
      return NextResponse.json({ error: 'Missing recording data' }, { status: 400 });
    }

    // 1. Fetch the call record to get intent and caller phone
    const { data: callRecord } = await supabaseAdmin
      .from('ivr_calls')
      .select('*')
      .eq('call_sid', callSid)
      .maybeSingle();

    if (!callRecord) {
      console.error(`[IVR Recording] No call record found for SID: ${callSid}`);
      return NextResponse.json({ error: 'Call record not found' }, { status: 404 });
    }

    // Update with recording URL
    await supabaseAdmin
      .from('ivr_calls')
      .update({ recording_url: recordingUrl, status: 'processing' })
      .eq('call_sid', callSid);

    // 2. Download audio from Twilio
    console.log(`[IVR] Downloading recording for call ${callSid}...`);
    const audioBuffer = await downloadRecording(recordingUrl);

    // 3. Transcribe via Gemini multimodal
    console.log(`[IVR] Transcribing audio (${audioBuffer.length} bytes)...`);
    const transcript = await transcribeAudio(audioBuffer);
    console.log(`[IVR] Transcript: ${transcript.slice(0, 200)}...`);

    await supabaseAdmin
      .from('ivr_calls')
      .update({ transcript })
      .eq('call_sid', callSid);

    const callerPhone = callRecord.caller_phone;

    // 4. Act based on intent
    if (callRecord.intent === 'worker_register') {
      await handleWorkerRegistration(callSid, callerPhone, transcript);
    } else {
      await handleSupportTicket(callSid, callerPhone, transcript, callRecord.intent);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[IVR Recording] Error:', err);
    // Mark as failed but don't crash
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Worker Registration ──────────────────────────────────────────────────────

async function handleWorkerRegistration(
  callSid: string,
  callerPhone: string,
  transcript: string
) {
  const extracted = await extractWorkerProfile(transcript);

  await supabaseAdmin
    .from('ivr_calls')
    .update({ extracted_data: extracted, status: extracted ? 'processed' : 'failed' })
    .eq('call_sid', callSid);

  if (!extracted || !extracted.name) {
    console.warn('[IVR] Could not extract worker profile from transcript');
    await sendSMS(
      callerPhone,
      'Rozgar: Hum aapki awaaz samajh nahi paaye. Kripya dobara call karein ya rozgar.app par register karein.'
    );
    return;
  }

  // Proceed with DB inserts (wrapped in try/catch to ensure SMS still sends if schema is incomplete)
  try {
    // Check if a user with this phone already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', callerPhone)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Update name if we got a better one
      await supabaseAdmin
        .from('users')
        .update({ name: extracted.name })
        .eq('id', userId);
    } else {
      // Create new user record (auth account created separately on first app login)
      const { data: newUser, error: userErr } = await supabaseAdmin
        .from('users')
        .insert({
          phone: callerPhone,
          name: extracted.name,
          role: 'worker',
          language_pref: (extracted.language || 'hindi').toLowerCase(),
          is_active: true,
        })
        .select('id')
        .single();

      if (userErr || !newUser) {
        console.error('[IVR] Failed to create user:', userErr);
        throw new Error('Failed to create user record');
      }
      userId = newUser.id;
    }

    // Upsert worker profile
    const { error: workerErr } = await supabaseAdmin.from('workers').upsert({
      user_id: userId,
      type: 'skilled',
      searchable_as: extracted.skills || [],
      pincode: extracted.pincode || '',
      is_new: true,
      strike_count: 0,
      total_jobs: 0,
      completion_rate: 100,
      availability_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      caller_id: callerPhone, // enables missed-call bid feature
    }, { onConflict: 'user_id' });

    if (workerErr) {
      console.error('[IVR] Failed to upsert worker:', workerErr);
    } else {
      console.log(`[IVR] Worker profile created/updated for ${callerPhone} (${extracted.name})`);
    }
  } catch (dbErr) {
    console.error('[IVR] Database sync error (SMS will still be sent):', dbErr);
  }

  // Send SMS confirmation unconditionally
  const skillList = extracted.skills?.slice(0, 3).join(', ') || 'your skills';
  await sendSMS(
    callerPhone,
    `Rozgar: ${extracted.name} ji, aapka profile ban gaya hai! Skills: ${skillList}. ` +
    `Kaam milne par aapko call karenge. App: rozgar.app`
  );
}

// ─── Support Ticket ───────────────────────────────────────────────────────────

async function handleSupportTicket(
  callSid: string,
  callerPhone: string,
  transcript: string,
  intent: string
) {
  const callerType = intent === 'customer_support' ? 'customer' : 'partner';
  const ticket = await extractSupportTicket(transcript, callerType);

  await supabaseAdmin
    .from('ivr_calls')
    .update({ extracted_data: ticket, status: 'processed' })
    .eq('call_sid', callSid);

  console.log(`[IVR] Support ticket created: ${ticket.summary}`);

  await sendSMS(
    callerPhone,
    `Rozgar Support: Hum ne aapki problem note kar li hai — "${ticket.summary}". ` +
    `Humari team jald hi aapse contact karegi.`
  );
}
