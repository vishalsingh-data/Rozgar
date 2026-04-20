import {
  GoogleGenerativeAI,
  type Part,
} from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function estimateWithGemini(
  description: string,
  base64Image?: string,
  mimeType?: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
