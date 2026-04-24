import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER!;

export const twilioClient = twilio(accountSid, authToken);

/**
 * Download a Twilio call recording as a Buffer.
 * Twilio recording URLs require Basic Auth (account SID + auth token).
 */
export async function downloadRecording(recordingUrl: string): Promise<Buffer> {
  const url = recordingUrl.endsWith('.mp3') ? recordingUrl : `${recordingUrl}.mp3`;
  const response = await fetch(url, {
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download recording: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Send an SMS via Twilio.
 */
export async function sendSMS(to: string, body: string): Promise<void> {
  try {
    await twilioClient.messages.create({ from: twilioNumber, to, body });
  } catch (err: any) {
    // SMS failure is non-fatal — log and continue
    console.warn('[Twilio SMS] Failed to send:', err.message);
  }
}

/**
 * Validate that a webhook actually came from Twilio.
 * Pass `false` in dev to skip validation (no public URL yet).
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (process.env.NODE_ENV !== 'production') return true; // skip in dev
  return twilio.validateRequest(authToken, signature, url, params);
}
