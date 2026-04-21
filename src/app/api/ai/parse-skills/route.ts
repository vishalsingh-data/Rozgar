import { NextResponse } from 'next/server';
import { parseWithGroq } from '@/lib/groq';

const SYSTEM_PROMPT = 'You are a skill parser for an Indian gig marketplace called Rozgar. You MUST return ONLY a valid JSON object. No markdown. No explanation. No code blocks. Just the raw JSON.';

export async function POST(req: Request) {
  try {
    const { raw_description } = await req.json();

    if (!raw_description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const userPrompt = `Parse this Indian worker description and return JSON with exactly these keys: primary_skill (string, the main job title), skill_tags (array of strings, specific skills mentioned), searchable_as (array of strings, ALL the search terms a customer might use to find this worker — be comprehensive, include synonyms, related terms, and common misspellings), worker_type (exactly one of: skilled, semi_skilled, daily_wage, domestic, driver, other). Description: ${raw_description}`;

    let result;
    let aiResponse = await parseWithGroq(SYSTEM_PROMPT, userPrompt);

    try {
      // First attempt to parse
      result = JSON.parse(aiResponse);
    } catch (parseErr) {
      console.warn('First AI parse attempt failed, retrying with stricter prompt...', aiResponse);
      
      // Retry once with a stricter prompt
      const stricterSystemPrompt = SYSTEM_PROMPT + ' CRITICAL: Do not include ANY text other than the JSON object. No triple backticks. No prefix like "Here is the JSON".';
      aiResponse = await parseWithGroq(stricterSystemPrompt, userPrompt);
      
      try {
        result = JSON.parse(aiResponse);
      } catch (secondParseErr: any) {
        console.error('Second AI parse attempt failed:', aiResponse);
        return NextResponse.json({ 
          error: 'Failed to parse AI response into valid JSON',
          raw: aiResponse 
        }, { status: 500 });
      }
    }

    return NextResponse.json(result);

  } catch (err: any) {
    console.error('AI Skill Parse Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
