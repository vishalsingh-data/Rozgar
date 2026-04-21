import {
  GoogleGenerativeAI,
  type Part,
} from '@google/generative-ai';

export async function estimateWithGemini(
  prompt: string,
  base64Image?: string,
  mimeType?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const parts: Part[] = [{ text: prompt }];

  if (base64Image && mimeType) {
    parts.push({
      inlineData: {
        data: base64Image,
        mimeType,
      },
    });
  }

  const result = await model.generateContent(parts);
  return result.response.text();
}
