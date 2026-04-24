import { NextResponse } from 'next/server';
import { twilioClient } from '@/lib/twilio';

/**
 * GET /api/telephony/ivr/test-call?to=+919876543210
 *
 * Has Twilio CALL your Indian number and connect it to the IVR.
 * Open this URL in your browser to trigger a test call.
 * Twilio calls you → you answer → IVR plays.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get('to');

    if (!to) {
      return new Response(
        `<html><body style="font-family:sans-serif;padding:40px;max-width:500px">
          <h2>📞 IVR Test Call</h2>
          <p>Add your Indian number to the URL like this:</p>
          <code style="background:#f0f0f0;padding:8px;display:block;border-radius:4px">
            /api/telephony/ivr/test-call?to=+919876543210
          </code>
          <p style="color:#666">Replace 9876543210 with your actual number.<br>
          Make sure it's verified in Twilio first.</p>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const call = await twilioClient.calls.create({
      from: process.env.TWILIO_PHONE_NUMBER!,
      to,
      // When you answer, Twilio hits the IVR entry point
      url: `${appUrl}/api/telephony/ivr/voice`,
      method: 'POST',
    });

    return new Response(
      `<html><body style="font-family:sans-serif;padding:40px;max-width:500px">
        <h2>✅ Call Initiated!</h2>
        <p>Twilio is calling <strong>${to}</strong> right now.</p>
        <p>Pick up — you'll hear the IVR menu in Hindi + English.</p>
        <p style="color:#666;font-size:12px">Call SID: ${call.sid}</p>
        <hr>
        <p><strong>IVR Menu:</strong></p>
        <ul>
          <li>Press <strong>1</strong> → Worker registration (speak name, skills, pincode, then press ★)</li>
          <li>Press <strong>2</strong> → Customer support</li>
          <li>Press <strong>3</strong> → Partner support</li>
        </ul>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (err: any) {
    console.error('[IVR Test Call] Error:', err);
    return new Response(
      `<html><body style="font-family:sans-serif;padding:40px;max-width:500px">
        <h2>❌ Error</h2>
        <p style="color:red">${err.message}</p>
        <p>Common fixes:</p>
        <ul>
          <li>Make sure your number is verified in Twilio (Verified Caller IDs)</li>
          <li>Check TWILIO_AUTH_TOKEN in .env.local is correct</li>
          <li>Make sure NEXT_PUBLIC_APP_URL is set to your Cloudflare tunnel URL</li>
        </ul>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
}
