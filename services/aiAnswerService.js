const fs = require('fs');
const openai = require('../config/openaiConfig');

async function getAnswer(question) {
  const normalized = question.trim().toLowerCase();

  // Handle known form labels with static responses
  if (normalized === 'first name') return 'Abhiram';
  if (normalized === 'last name') return 'Shaji';
  if (normalized.includes('phone country code')) return 'Canada (+1)';
  if (normalized.includes('mobile phone number')) return '2362553669';
  if (normalized.includes('email')) return 'write4abhiram@gmail.com';
  if (normalized.includes('city')) return 'Victoria, British Columbia, Canada';
  if (normalized.includes('postal')) return 'V8N 4A8';
  if (normalized.includes('address')) return '3904 Haro Rd';
  if (normalized.includes('cover letter'))
    return fs.readFileSync('coverletter.txt', 'utf-8');

  // Fall back to OpenAI for other prompts
  const rawPrompt = fs.readFileSync('prompt.txt', 'utf-8');
  const finalPrompt = rawPrompt.replace('{QUESTION}', question);

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-nano',
    messages: [{ role: 'user', content: finalPrompt }],
    max_tokens: 90,
  });

  console.log('OpenAI response:', JSON.stringify(response, null, 2));

  return response.choices[0].message.content.trim();
}

module.exports = { getAnswer };
