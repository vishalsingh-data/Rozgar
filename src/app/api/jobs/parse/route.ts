import { NextResponse } from 'next/server';
import { parseWithGroq } from '@/lib/groq';

export async function POST(req: Request) {
  try {
    const { description } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // Improved Prompt with examples and strict numeric requirements
    const prompt = `
      You are an expert at home service pricing in Bengaluru, India.
      Job Description: "${description}"
      
      Task: Analyze the job and return a JSON object.
      Rules:
      1. estimated_price must be a realistic labor cost in INR (Rupees). Never return 0. 
         - Simple tasks (fan fix): 300-500
         - Complex tasks: 800-2000
      2. Return ONLY a single JSON object.

      Example output format:
      {
        "category": "Electrical",
        "tags": ["fan repair", "electrician"],
        "estimated_price": 450,
        "confidence": 0.95
      }

      Return ONLY valid JSON.
    `;

    const groqResponse = await parseWithGroq(prompt, 'english');
    console.log('Raw Groq Response:', groqResponse);
    
    let parsedData;
    try {
      // More robust JSON extraction (find first { and last })
      const start = groqResponse.indexOf('{');
      const end = groqResponse.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON found');
      
      const jsonStr = groqResponse.substring(start, end + 1);
      parsedData = JSON.parse(jsonStr);
      
      // Defaults if fields are missing or zero
      if (!parsedData.category) parsedData.category = 'General';
      if (!parsedData.tags) parsedData.tags = [];
      if (!parsedData.estimated_price || parsedData.estimated_price === 0) {
        parsedData.estimated_price = 500; // Default fallback
      }
    } catch (e) {
      console.error('Groq JSON parse error:', e, groqResponse);
      parsedData = { 
        category: 'General', 
        tags: [], 
        estimated_price: 500, 
        confidence: 0.5 
      };
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Job parse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
