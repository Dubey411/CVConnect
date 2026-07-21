import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com'
});

async function main() {
  try {
    const completion = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [
        { role: 'user', content: 'Say hello.' }
      ],
      max_tokens: 10
    });
    console.log('SUCCESS!');
    console.log(completion.choices[0].message.content);
  } catch (err) {
    console.error('ERROR OCCURRED:');
    console.error(err.status, err.message);
  }
}

main();
