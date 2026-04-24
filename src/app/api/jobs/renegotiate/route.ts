import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { job_id, worker_id, new_price, reason, new_photo_url } = await req.json();

    if (!job_id || !worker_id || !new_price || !reason) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // 1. Verify Assigned Worker
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

    // 2. Update Job Status
    await supabaseAdmin
      .from('jobs')
      .update({ status: 'renegotiating' })
      .eq('id', job_id);

    // 3. AI Vision Assessment (If photo provided)
    let ai_verified = false;
    let ai_note = "No photo provided for AI verification.";

    if (new_photo_url) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });
        const prompt = `Is the damage shown in this photo consistent with a repair cost of ₹${new_price} in India? The worker says: "${reason}". 
        Return JSON with keys: ai_verified (boolean), ai_note (string explaining your assessment).`;

        // Fetch image as base64
        const imageRes = await fetch(new_photo_url);
        const imageBuffer = await imageRes.arrayBuffer();
        const imageData = {
          inlineData: {
            data: Buffer.from(imageBuffer).toString("base64"),
            mimeType: "image/jpeg",
          },
        };

        const result = await model.generateContent([prompt, imageData]);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
          const assessment = JSON.parse(jsonMatch[0]);
          ai_verified = assessment.ai_verified;
          ai_note = assessment.ai_note;
        }
      } catch (aiErr: any) {
        console.error('AI Renegotiation Assessment Failed:', aiErr);
        ai_note = "AI was unable to process the image at this time.";
      }
    }

    // 4. Record Renegotiation
    const oldPrice = job.final_price || job.ai_base_price;
    const { data: renegotiation, error: recordError } = await supabaseAdmin
      .from('renegotiations')
      .insert({
        job_id,
        old_price: oldPrice,
        new_price,
        new_photo_url,
        ai_verified,
        ai_note,
        customer_decision: 'pending'
      })
      .select()
      .single();

    if (recordError) throw recordError;

    // 5. Notify Customer (FCM later)
    console.log(`[PUSH] Notification would fire to customer ${job.customer_id}: Worker found hidden damage. AI Assessment: ${ai_verified ? 'Verified' : 'Flagged'}`);

    return NextResponse.json(renegotiation);

  } catch (err: any) {
    console.error('Renegotiate API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
