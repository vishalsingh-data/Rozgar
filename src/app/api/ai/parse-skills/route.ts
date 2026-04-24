import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { description } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });
    const prompt = `Given a worker's bio: "${description}", extract 3-5 specific skill tags (e.g., AC Repair, Plumbing, RO Service). 
    Also, identify the best category (searchable_as) for this worker from these options: [Skilled, Semi-skilled, Daily wage, Domestic, Driver, Other].
    Return ONLY JSON with keys: tags (array of strings), category (string).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{.*\}/s);
    
    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    }
    
    return NextResponse.json({ tags: [], category: 'Other' });

  } catch (err: any) {
    console.error('Skill Parse Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
