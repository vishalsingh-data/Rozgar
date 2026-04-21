import { NextResponse } from 'next/server';
import { estimateWithGemini } from '@/lib/gemini';
import { parseWithGroq } from '@/lib/groq';

const ESTIMATE_PROMPT = `You are a job cost estimator for Indian home services. RETURN ONLY VALID JSON. No markdown. No explanation. 
Keys required: 
- interpreted_category (string, e.g. Electrical — Fan Repair)
- ai_base_price (integer in Indian Rupees, set to null if you cannot estimate confidently)
- confidence (float between 0 and 1, your confidence in the price estimate)
- time_estimate (string, e.g. 30-45 minutes)
- damage_summary (string, brief description of what you see or interpret)
- worker_tags_required (array of strings, skills needed to do this job).`;

export async function POST(req: Request) {
  try {
    const { description, base64Image, mimeType } = await req.json();

    if (!description && !base64Image) {
      return NextResponse.json({ error: 'Description or image is required' }, { status: 400 });
    }

    const fullPrompt = `${ESTIMATE_PROMPT}\n\nJob Description: ${description || 'No description provided'}`;

    let aiResponse: string;

    if (base64Image && mimeType) {
      // Use Gemini for visual analysis
      aiResponse = await estimateWithGemini(fullPrompt, base64Image, mimeType);
    } else {
      // Use Groq for text-only analysis
      // We pass the prompt as both system and user prompt for maximum compliance
      aiResponse = await parseWithGroq(ESTIMATE_PROMPT, `Job Description: ${description}`);
    }

    // Clean the response from potential markdown backticks
    const cleanResponse = aiResponse.replace(/```json|```/g, '').trim();
    
    let estimateResult;
    try {
      estimateResult = JSON.parse(cleanResponse);
    } catch (parseErr) {
      console.error('AI Estimation Parse Error:', aiResponse);
      return NextResponse.json({ error: 'AI failed to return valid JSON' }, { status: 500 });
    }

    // Business Logic: If low confidence, force to Inspection
    if (estimateResult.confidence < 0.70) {
      estimateResult.ai_base_price = null;
      estimateResult.is_inspection = true;
    } else {
      estimateResult.is_inspection = false;
    }

    return NextResponse.json(estimateResult);

  } catch (err: any) {
    console.error('Job Estimation API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
