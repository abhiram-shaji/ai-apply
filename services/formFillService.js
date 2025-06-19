const { getAnswer } = require('./aiAnswerService');
const { getLabelFromInput } = require('../utils/labelUtils');

async function fillInputs(page) {
  const inputs = await page.$$('form input:not([type="hidden"])');
  console.log(`🧩 Found ${inputs.length} input fields`);

  for (const input of inputs) {
    try {
      const value = await input.getAttribute('value');
      if (value) {
        console.log('➡️ Input already filled. Skipping.');
        continue;
      }

      const label = await getLabelFromInput(input);
      console.log(`📝 Input label: "${label}"`);

      const answer = await getAnswer(label);
      console.log(`🔤 Filling input with: "${answer}"`);

      await input.fill(answer);
      console.log(`✅ Filled input for "${label}"`);
    } catch (err) {
      console.warn(`❌ Error filling input: ${err.message}`);
    }
  }
}

async function fillTextareas(page) {
  const textareas = await page.$$('form textarea');
  console.log(`🧾 Found ${textareas.length} textareas`);

  for (const textarea of textareas) {
    try {
      const label = await getLabelFromInput(textarea);
      console.log(`📝 Textarea label: "${label}"`);

      const answer = await getAnswer(label);
      console.log(`🔤 Filling textarea with: "${answer}"`);

      await textarea.fill(answer);
      console.log(`✅ Filled textarea for "${label}"`);
    } catch (err) {
      console.warn(`❌ Error filling textarea: ${err.message}`);
    }
  }
}

async function fillSelects(page) {
  const selects = await page.$$('form select');
  console.log(`🎛️ Found ${selects.length} select fields`);

  for (const select of selects) {
    try {
      const label = await getLabelFromInput(select);
      console.log(`📝 Select label: "${label}"`);

      const answer = await getAnswer(label);
      console.log(`🔽 Trying to select option: "${answer}"`);

      await select.selectOption({ label: answer });
      console.log(`✅ Selected option for "${label}"`);
    } catch (err) {
      console.warn(`❌ Error selecting option for "${label}": ${err.message}`);
    }
  }
}

async function fillForm(page) {
  await fillInputs(page);
  await fillTextareas(page);
  await fillSelects(page);
}

module.exports = { fillForm };
