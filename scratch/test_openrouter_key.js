import OpenAI from '../backend/node_modules/openai/index.mjs';
import dotenv from '../backend/node_modules/dotenv/lib/main.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

async function testOpenRouter() {
  console.log('=== TESTING OPENROUTER API KEY ===');
  console.log('API Key Snippet:', process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.substring(0, 15) + '...' : 'MISSING');

  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1'
  });

  try {
    const res = await client.chat.completions.create({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [{ role: 'user', content: 'Say hello in 3 words.' }],
      max_tokens: 20
    });

    console.log('\n✅ OPENROUTER SUCCESS!');
    console.log('Response:', res.choices[0].message.content);
  } catch (err) {
    console.error('\n❌ OPENROUTER API ERROR:');
    console.error('Status:', err.status);
    console.error('Message:', err.message);
  }
}

testOpenRouter();
