import { NextResponse } from 'next/server';
import twilio from 'twilio';

const { VoiceResponse } = twilio.twiml;

// Voices available on ALL Twilio plans including trial:
// Polly.Aditi   → Standard Indian Hindi female voice (no add-on needed)
// Polly.Raveena → Standard Indian English female voice (no add-on needed)
// Polly.Kajal requires Neural add-on (paid plans only — skip for now)
const HINDI_VOICE = 'Polly.Aditi';
const ENGLISH_VOICE = 'Polly.Raveena';

/**
 * POST /api/telephony/ivr/voice
 *
 * Step 1: Language selection.
 * Asks caller to choose Hindi or English before showing the main menu.
 */
export async function POST(req: Request) {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: '/api/telephony/ivr/language',
    method: 'POST',
    timeout: 8,
  });

  // Bilingual greeting — Hindi first (natural Kajal voice), then English
  gather.say(
    { voice: HINDI_VOICE, language: 'hi-IN' },
    'Rozgar mein aapka swagat hai.'
  );
  gather.pause({ length: 1 });
  gather.say(
    { voice: HINDI_VOICE, language: 'hi-IN' },
    'Hindi ke liye ek dabaiye.'
  );
  gather.say(
    { voice: ENGLISH_VOICE, language: 'en-IN' },
    'For English, press two.'
  );

  // No input → repeat
  twiml.say(
    { voice: HINDI_VOICE, language: 'hi-IN' },
    'Kripya ek ya do dabaiye.'
  );
  twiml.redirect({ method: 'POST' }, '/api/telephony/ivr/voice');

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}
