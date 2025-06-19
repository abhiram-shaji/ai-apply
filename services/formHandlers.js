const { getAnswer } = require('./aiAnswerService');
const { getLabelFromInput } = require('../utils/labelUtils');

async function handleInput(input) {
  const value = await input.getAttribute('value');
  if (value) {
    console.log('➡️ Input already filled. Skipping.');
    return;
  }

  const label = await getLabelFromInput(input);
  console.log(`📝 Input label: "${label}"`);
  const answer = await getAnswer(label);
  console.log(`🔤 Filling input with: "${answer}"`);
  const ariaAuto = await input.getAttribute('aria-autocomplete');
  const role = await input.getAttribute('role');
  const isTypeahead = ariaAuto === 'list' || role === 'combobox';
  if (isTypeahead) {
    await input.click({ clickCount: 3 });
    await input.type(answer, { delay: 100 });
  } else {
    await input.fill(answer);
  }
  if (isTypeahead) {
    const page = await input.page();
    console.log('⌛ Waiting for autocomplete options...');
    try {
      const optionSelector = '[role="listbox"] [role="option"], ul[role="listbox"] li, ul li[role="option"]';
      await page.waitForSelector(optionSelector, { timeout: 3000 });
      const firstOption = await page.$(optionSelector);
      if (firstOption) {
        await firstOption.click();
        console.log(`✅ Autocomplete option selected for "${label}"`);
      }
    } catch {
      console.log(`⚠️ Autocomplete options not found for "${label}"`);
    }
  }

  console.log(`✅ Filled input for "${label}"`);
}

async function handleTextarea(textarea) {
  const label = await getLabelFromInput(textarea);
  console.log(`📝 Textarea label: "${label}"`);
  const answer = await getAnswer(label);
  console.log(`🔤 Filling textarea with: "${answer}"`);
  await textarea.fill(answer);
  console.log(`✅ Filled textarea for "${label}"`);
}

async function handleSelect(select) {
  const label = await getLabelFromInput(select);
  console.log(`📝 Select label: "${label}"`);
  const answer = await getAnswer(label);
  console.log(`🔽 Trying to select option: "${answer}"`);
  try {
    await select.selectOption({ label: answer });
    console.log(`✅ Selected option for "${label}"`);
  } catch (err) {
    console.log(`⚠️ Option by label failed: ${err.message}. Falling back...`);
    const options = await select.$$('option');
    for (const opt of options) {
      const value = await opt.getAttribute('value');
      if (value && value.toLowerCase() !== 'select an option') {
        await select.selectOption(value);
        console.log(`✅ Fallback selected value "${value}" for "${label}"`);
        break;
      }
    }
  }
}

async function handleCheckbox(checkbox) {
  const label = await getLabelFromInput(checkbox);
  const checked = await checkbox.isChecked();
  if (checked) return;

  console.log(`☑️ Checking "${label}"`);

  // Try clicking the associated label to trigger LinkedIn's custom JS
  const page = await checkbox.page();
  const id = await checkbox.getAttribute('id');
  if (id) {
    const labelEl = await page.$(`label[for="${id}"]`);
    if (labelEl) {
      try {
        await labelEl.waitForElementState('visible', { timeout: 3000 });
        await labelEl.click();
        return;
      } catch {
        // fall back to other methods
      }
    }
  }

  // Fallback: click via evaluation which bypasses overlay issues
  try {
    await checkbox.check();
  } catch {
    await checkbox.evaluate(el => el.click());
  }
}

module.exports = { handleInput, handleTextarea, handleSelect, handleCheckbox };
