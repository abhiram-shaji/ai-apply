const openai = require('../config/openaiConfig');

async function getAIExtractedLabel(htmlSnippet) {
  const prompt = `
Given the following HTML snippet from a form, extract the **question being asked** to the user. Your output should be **only the question** in plain text.

HTML:
${htmlSnippet}
  `.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 50,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { getAIExtractedLabel };
