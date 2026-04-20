import { config } from 'dotenv';
config({ path: '.env.local' });
import { parseWithGroq } from '../src/lib/groq';
import { estimateWithGemini } from '../src/lib/gemini';

async function testAI() {
  console.log('Testing Groq...');
  try {
    const groqRes = await parseWithGroq('Test categorization for electrician');
    console.log('Groq OK:', groqRes);
  } catch (e: any) {
    console.error('Groq Failed:', e.message);
  }

  console.log('\nTesting Gemini...');
  try {
    const geminiRes = await estimateWithGemini('Test price for electrician');
    console.log('Gemini OK:', geminiRes);
  } catch (e: any) {
    console.error('Gemini Failed:', e.message);
  }
}

testAI();
