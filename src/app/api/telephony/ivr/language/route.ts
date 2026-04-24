import { NextResponse } from 'next/server';
import twilio from 'twilio';

const { VoiceResponse } = twilio.twiml;

const HINDI_VOICE = 'Polly.Aditi';
const ENGLISH_VOICE = 'Polly.Raveena';

/**
 * POST /api/telephony/ivr/language
 *
 * Handles language choice (1=Hindi, 2=English),
 * then plays the main menu in the chosen language.
 */
export async function POST(req: Request) {
  const formData = await req.formData();
  const digit = formData.get('Digits') as string;

  const twiml = new VoiceResponse();
  const isHindi = digit !== '2'; // Default to Hindi if not 2

  const gather = twiml.gather({
    numDigits: '1',
    action: `/api/telephony/ivr/gather?lang=${isHindi ? 'hi' : 'en'}`,
    method: 'POST',
    timeout: 10,
  });

  if (isHindi) {
    gather.say(
      { voice: HINDI_VOICE, language: 'hi-IN' },
      'Kripya sahi option chuniye.'
    );
    gather.pause({ length: 1 });
    gather.say(
      { voice: HINDI_VOICE, language: 'hi-IN' },
      'Worker ke roop mein register karne ke liye ek dabaiye.'
    );
    gather.say(
      { voice: HINDI_VOICE, language: 'hi-IN' },
      'Customer sahayata ke liye do dabaiye.'
    );
    gather.say(
      { voice: HINDI_VOICE, language: 'hi-IN' },
      'Partner support ke liye teen dabaiye.'
    );
  } else {
    gather.say(
      { voice: ENGLISH_VOICE, language: 'en-IN' },
      'Please choose an option.'
    );
    gather.pause({ length: 1 });
    gather.say(
      { voice: ENGLISH_VOICE, language: 'en-IN' },
      'Press one to register as a worker.'
    );
    gather.say(
      { voice: ENGLISH_VOICE, language: 'en-IN' },
      'Press two for customer support.'
    );
    gather.say(
      { voice: ENGLISH_VOICE, language: 'en-IN' },
      'Press three for partner support.'
    );
  }

  // No input → repeat from language selection
  twiml.redirect({ method: 'POST' }, '/api/telephony/ivr/voice');

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}
