import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { supabaseAdmin } from '@/lib/supabase-server';

const { VoiceResponse } = twilio.twiml;

const HINDI_VOICE = 'Polly.Aditi';
const ENGLISH_VOICE = 'Polly.Raveena';

/**
 * POST /api/telephony/ivr/gather?lang=hi|en
 *
 * Called by Twilio after user presses a key on the main menu.
 * Branches into worker/customer/partner flow in the chosen language.
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get('lang') || 'hi';
  const isHindi = lang === 'hi';

  const voice = isHindi ? HINDI_VOICE : ENGLISH_VOICE;
  const language = isHindi ? 'hi-IN' : 'en-IN';

  const formData = await req.formData();
  const digit = formData.get('Digits') as string;
  const callSid = formData.get('CallSid') as string;
  
  // Determine correct user phone based on call direction
  const from = formData.get('From') as string;
  const to = formData.get('To') as string;
  const direction = formData.get('Direction') as string;
  const callerPhone = direction === 'inbound' ? from : to;

  const twiml = new VoiceResponse();

  // Log call — non-fatal if table doesn't exist yet
  try {
    await supabaseAdmin.from('ivr_calls').upsert({
      call_sid: callSid,
      caller_phone: callerPhone,
      intent: digit === '1' ? 'worker_register' : digit === '2' ? 'customer_support' : 'partner_support',
      status: 'recording',
    }, { onConflict: 'call_sid' });
  } catch (dbErr) {
    console.warn('[IVR Gather] DB log failed (table may not exist yet):', dbErr);
  }


  if (digit === '1') {
    // ── Worker Registration ──────────────────────────────────────────
    if (isHindi) {
      twiml.say({ voice, language },
        'Shukriya. Beep ke baad apna poora naam boliye.'
      );
      twiml.pause({ length: 1 });
      twiml.say({ voice, language },
        'Phir apni skills bataaiye, jaise bijli ka kaam, plumber, ya cook.'
      );
      twiml.pause({ length: 1 });
      twiml.say({ voice, language },
        'Aur ant mein apna chhe ankon ka pincode boliye.'
      );
      twiml.pause({ length: 1 });
      twiml.say({ voice, language },
        'Star dabaakar recording band karein.'
      );
    } else {
      twiml.say({ voice, language },
        'Thank you. After the beep, please say your full name, your skills such as electrician, plumber, or cook, and your six digit area pincode. Press star when done.'
      );
    }

    twiml.record({
      action: `/api/telephony/ivr/thanks?lang=${lang}`,
      method: 'POST',
      maxLength: 120,
      finishOnKey: '*',
      recordingStatusCallback: '/api/telephony/ivr/recording',
      recordingStatusCallbackMethod: 'POST',
      transcribe: false,
    });

  } else if (digit === '2') {
    // ── Customer Support ─────────────────────────────────────────────
    if (isHindi) {
      twiml.say({ voice, language },
        'Beep ke baad apni samasya bataaiye. Star dabaakar khatam karein.'
      );
    } else {
      twiml.say({ voice, language },
        'After the beep, describe your issue. Press star when done.'
      );
    }
    twiml.record({
      action: `/api/telephony/ivr/thanks?lang=${lang}`,
      method: 'POST',
      maxLength: 90,
      finishOnKey: '*',
      recordingStatusCallback: '/api/telephony/ivr/recording',
      recordingStatusCallbackMethod: 'POST',
    });

  } else if (digit === '3') {
    // ── Partner Support ───────────────────────────────────────────────
    if (isHindi) {
      twiml.say({ voice, language },
        'Beep ke baad apni baat boliye. Star dabaakar khatam karein.'
      );
    } else {
      twiml.say({ voice, language },
        'After the beep, describe your issue. Press star when done.'
      );
    }
    twiml.record({
      action: `/api/telephony/ivr/thanks?lang=${lang}`,
      method: 'POST',
      maxLength: 90,
      finishOnKey: '*',
      recordingStatusCallback: '/api/telephony/ivr/recording',
      recordingStatusCallbackMethod: 'POST',
    });

  } else {
    // Invalid input
    twiml.say({ voice, language },
      isHindi ? 'Galat option. Kripya dobara chuniye.' : 'Invalid option. Please try again.'
    );
    twiml.redirect({ method: 'POST' }, '/api/telephony/ivr/voice');
  }

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}
