import { NextResponse } from 'next/server';
import twilio from 'twilio';

const { VoiceResponse } = twilio.twiml;

/**
 * POST /api/telephony/ivr/thanks
 *
 * Called immediately after the caller presses '*' to end the recording.
 * We must quickly return TwiML to say thank you and hang up.
 * The ACTUAL AI processing happens asynchronously in the recordingStatusCallback.
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get('lang') || 'hi';
  const isHindi = lang === 'hi';

  const voice = isHindi ? 'Polly.Aditi' : 'Polly.Raveena';
  const language = isHindi ? 'hi-IN' : 'en-IN';

  const twiml = new VoiceResponse();
  twiml.say(
    { voice, language },
    isHindi
      ? 'Shukriya. Hum aapki request process kar rahe hain. Aapko jald hi SMS milega.'
      : 'Thank you. We are processing your request. You will receive an SMS shortly.'
  );
  twiml.hangup();

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}
