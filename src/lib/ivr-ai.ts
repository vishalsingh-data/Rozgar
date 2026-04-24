import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Using Gemini 2.5 Flash as listed in your AI Studio dashboard
const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Transcribe audio using Groq Whisper (already have GROQ_API_KEY).
 * Groq free tier: 7,200 seconds/day of audio.
 * Supports Hindi, English, and Hinglish auto-detection.
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) throw new Error('GROQ_API_KEY is not set');

  // Build multipart form — Groq uses the OpenAI-compatible Whisper endpoint
  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  formData.append('file', audioBlob, 'recording.mp3');
  formData.append('model', 'whisper-large-v3');
  // Don't force a language — let Whisper auto-detect Hindi/English/Hinglish
  formData.append('response_format', 'text');
  formData.append('temperature', '0');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq Whisper error ${response.status}: ${err}`);
  }

  const transcript = await response.text();
  console.log(`[IVR] Groq Whisper transcript: "${transcript.slice(0, 200)}"`);
  return transcript.trim();
}

/**
 * Extract a structured worker profile from a transcript using Gemini.
 */
export async function extractWorkerProfile(transcript: string): Promise<{
  name: string;
  skills: string[];
  pincode: string;
  language: string;
} | null> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await model.generateContent(`
You are extracting worker profile information from a voice call transcript.

Transcript:
"""
${transcript}
"""

Extract the following and return ONLY valid JSON, no markdown, no explanation:
{
  "name": "full name spoken by caller",
  "skills": ["skill1", "skill2"],  
  "pincode": "6-digit area pincode",
  "language": "hindi" or "english"
}

Rules:
- skills: normalize to standard terms like "Electrician", "Plumber", "Cook/Chef", "Carpenter", "Painter", "AC Technician", "Appliance Repair", "Mason", "Welder", "Cleaning", "Driver", "Security Guard", "Gardener", "Daily Wage Labor"
- pincode: must be exactly 6 digits. If not clearly spoken, use ""
- If any field is missing, use "" for strings or [] for arrays
- Return ONLY the JSON object, nothing else
`);

  try {
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    console.error('[IVR AI] Failed to parse worker profile JSON');
    return null;
  }
}

/**
 * Extract support intent from a transcript using Gemini.
 */
export async function extractSupportTicket(transcript: string, callerType: string): Promise<{
  summary: string;
  issue_type: string;
  urgency: 'low' | 'medium' | 'high';
}> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await model.generateContent(`
You are extracting a support ticket from a voice call from a ${callerType}.

Transcript:
"""
${transcript}
"""

Return ONLY valid JSON:
{
  "summary": "one sentence summary of the issue",
  "issue_type": "payment" | "job_dispute" | "account" | "technical" | "other",
  "urgency": "low" | "medium" | "high"
}
`);

  try {
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { summary: transcript.slice(0, 200), issue_type: 'other', urgency: 'medium' };
  }
}
