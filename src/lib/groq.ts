import Groq from 'groq-sdk';

export async function parseWithGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile', // Upgraded to a more capable model for better parsing
    max_tokens: 1000,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    temperature: 0.1, // Lower temperature for more consistent JSON
  });

  return completion.choices[0]?.message?.content ?? '';
}
