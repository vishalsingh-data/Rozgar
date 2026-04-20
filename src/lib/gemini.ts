import {
  GoogleGenerativeAI,
  type Part,
} from '@google/generative-ai';

export async function estimateWithGemini(
  description: string,
  base64Image?: string,
  mimeType?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const parts: Part[] = [{ text: description }];

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
