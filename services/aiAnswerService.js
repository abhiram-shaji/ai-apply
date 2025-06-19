const fs = require('fs');
const openai = require('../config/openaiConfig');

async function getAnswer(question) {
  const normalized = question.trim().toLowerCase();

  // Handle known form labels with static responses
  if (normalized === 'First name') return 'Abhiram';
  if (normalized === 'Last name') return 'Shaji';
  if (normalized.includes('Phone country code')) return 'Canada (+1)';
  if (normalized === 'Mobile phone number') return '2362553669';
  if (normalized.includes('Email address')) return 'write4abhiram@gmail.com';

  // Fall back to OpenAI for other prompts
  const rawPrompt = fs.readFileSync('prompt.txt', 'utf-8');
  const finalPrompt = rawPrompt.replace('{QUESTION}', question);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: finalPrompt }],
    max_tokens: 90,
  });

  console.log('OpenAI response:', JSON.stringify(response, null, 2));

  return response.choices[0].message.content.trim();
}

module.exports = { getAnswer };
