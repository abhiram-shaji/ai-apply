const fs = require('fs');
const openai = require('../config/openaiConfig');

async function getAnswer(question) {
  const rawPrompt = fs.readFileSync('prompt.txt', 'utf-8');
  const finalPrompt = rawPrompt.replace('{QUESTION}', question);

  const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: finalPrompt }],
});

  return response.data.choices[0].message.content.trim();
}

module.exports = { getAnswer };
