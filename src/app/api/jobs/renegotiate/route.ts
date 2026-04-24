import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GEMINI_TIMEOUT_MS = 15_000;

export async function POST(req: Request) {
  try {
    const { job_id, worker_id, new_price, reason, new_photo_url } = await req.json();

    if (!job_id || !worker_id || !new_price || !reason) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // 1. Verify Assigned Worker and job is on_site
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.accepted_worker_id !== worker_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (job.status !== 'on_site') {
      return NextResponse.json({ error: 'Renegotiation can only be requested while on-site' }, { status: 400 });
    }

    // 2. Validate new price is strictly higher than current price
    const currentPrice = job.final_price || job.ai_base_price;
    const newPriceNum = Number(new_price);

    if (!Number.isFinite(newPriceNum) || newPriceNum <= 0) {
      return NextResponse.json({ error: 'Invalid price value' }, { status: 400 });
    }

    if (newPriceNum <= currentPrice) {
      return NextResponse.json({ error: 'New price must be higher than the current price' }, { status: 400 });
    }

    // 3. Update Job Status
    await supabaseAdmin
      .from('jobs')
      .update({ status: 'renegotiating' })
      .eq('id', job_id);

    // 4. AI Vision Assessment with timeout (non-blocking on failure)
    let ai_verified = false;
    let ai_note = "No photo provided for AI verification.";

    if (new_photo_url) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });
        const prompt = `Is the damage shown in this photo consistent with a repair cost of ₹${newPriceNum} in India? The worker says: "${reason}".
        Return JSON with keys: ai_verified (boolean), ai_note (string explaining your assessment).`;

        const imageRes = await fetch(new_photo_url);
        const imageBuffer = await imageRes.arrayBuffer();
        const imageData = {
          inlineData: {
            data: Buffer.from(imageBuffer).toString("base64"),
            mimeType: "image/jpeg",
          },
        };

        // Race Gemini against a timeout so one slow API call doesn't hang the request
        const result = await Promise.race([
          model.generateContent([prompt, imageData]),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini timeout')), GEMINI_TIMEOUT_MS)
          )
        ]);

        const response = await (result as any).response;
        const text = response.text();
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
          const assessment = JSON.parse(jsonMatch[0]);
          ai_verified = assessment.ai_verified;
          ai_note = assessment.ai_note;
        }
      } catch (aiErr: any) {
        console.error(`[RENEGOTIATE] AI assessment failed for job ${job_id}:`, aiErr.message);
        ai_note = aiErr.message === 'Gemini timeout'
          ? "AI verification timed out. Customer will review manually."
          : "AI was unable to process the image at this time.";
      }
    }

    // 5. Record Renegotiation
    const { data: renegotiation, error: recordError } = await supabaseAdmin
      .from('renegotiations')
      .insert({
        job_id,
        old_price: currentPrice,
        new_price: newPriceNum,
        new_photo_url,
        ai_verified,
        ai_note,
        customer_decision: 'pending'
      })
      .select()
      .single();

    if (recordError) throw recordError;

    console.log(`[PUSH] Notify customer ${job.customer_id}: Worker found hidden damage for job ${job_id}. AI: ${ai_verified ? 'Verified' : 'Not verified'}`);

    return NextResponse.json(renegotiation);

  } catch (err: any) {
    console.error('Renegotiate API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
