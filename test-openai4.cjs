require('dotenv').config();
const { OpenAI } = require('openai');

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
});

async function main() {
  try {
    const response = await client.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'user', content: 'Say this is a test' }]
    });
    console.log(response.choices[0].message.content);
  } catch (err) {
    console.error(err.status, err.message);
  }
}
main();
