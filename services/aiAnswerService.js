const fs = require('fs');
const openai = require('../config/openaiConfig');

async function getAnswer(question) {
  const normalized = question.trim().toLowerCase();

// Handle known form labels with static responses (English + French)
if (['first name', 'prénom'].includes(normalized)) return 'Abhiram';
if (['last name', 'surname', 'nom de famille'].includes(normalized)) return 'Shaji';
if (
  normalized.includes('phone country code') || 
  normalized.includes('indicatif du pays')
) return 'Canada (+1)';
if (
  normalized.includes('mobile phone number') || 
  normalized.includes('téléphone portable') ||
  normalized.includes('téléphone mobile')
) return '2362553669';
if (
  normalized.includes('email') || 
  normalized.includes('courriel') || 
  normalized.includes('adresse électronique')
) return 'write4abhiram@gmail.com';
if (
  normalized.includes('city') || 
  normalized.includes('ville')
) return 'Victoria, British Columbia, Canada';
if (
  normalized.includes('postal') ||
  normalized.includes('code pays') || 
  normalized.includes('code postal')
) return 'V8N 4A8';
if (
  normalized.includes('address') || 
  normalized.includes('adresse')
) return '3904 Haro Rd';
if (
  normalized.includes('state') || 
  normalized.includes('province') || 
  normalized.includes('état')
) return 'British Columbia';
if (
  normalized.includes('cover letter') || 
  normalized.includes('lettre de motivation')
) return fs.readFileSync('coverletter.txt', 'utf-8');


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

async function notifyAI(message) {
  console.log(`AI notification: ${message}`);
}

module.exports = { getAnswer, notifyAI };
