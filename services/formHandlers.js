const { getAnswer } = require('./aiAnswerService');
const {
  getLabelFromInput,
  getLabelFromInputNoAI,
  getRadioOptionLabel,
} = require('../utils/labelUtils');

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
      const options = await page.$$(optionSelector);
      let matched = false;
      for (const opt of options) {
        const text = ((await opt.innerText()) || '').trim().toLowerCase();
        if (text.includes(answer.trim().toLowerCase())) {
          await opt.click();
          console.log(`✅ Autocomplete option "${text}" selected for "${label}"`);
          matched = true;
          break;
        }
      }
      if (!matched && options[0]) {
        await options[0].click();
        console.log(`✅ Default autocomplete option selected for "${label}"`);
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
  // Try selecting by the visible label first
  try {
    await select.selectOption({ label: answer });
    console.log(`✅ Selected option for "${label}" using label match`);
    return;
  } catch (errLabel) {
    console.log(
      `⚠️ Option by label failed: ${errLabel.message}. Trying value match...`
    );
  }

  // If label match fails, attempt to match by the option value
  try {
    await select.selectOption({ value: answer });
    console.log(`✅ Selected option for "${label}" using value match`);
    return;
  } catch (errValue) {
    console.log(
      `⚠️ Option by value failed: ${errValue.message}. Falling back...`
    );
  }

  // Fallback: choose the first non-placeholder option
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

async function handleCheckbox(checkbox) {
  const label = await getLabelFromInputNoAI(checkbox);
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

async function handleRadio(radio, page) {
  const checked = await radio.isChecked();
  if (checked) return;

  const label = await getLabelFromInputNoAI(radio);
  if (label && label.toLowerCase().includes('resume')) {
    console.log('↩️ Skipping resume selection question.');
    return;
  }

  const name = await radio.getAttribute('name');
  if (!name) {
    console.warn('⚠️ No radio group found.');
    return;
  }

  await page.waitForTimeout(500);
  const radiosInGroup = await page.$$(`input[type="radio"][name="${name}"]`);
  if (!radiosInGroup.length) return;

  let yesRadio = null;
  for (const r of radiosInGroup) {
    const optionLabel = (await getRadioOptionLabel(r)).trim().toLowerCase();
    const val = ((await r.getAttribute('value')) || '').trim().toLowerCase();
    if (optionLabel === 'yes' || val === 'yes') yesRadio = r;
  }

  let toSelect;
  if (yesRadio && radiosInGroup.length >= 2) {
    toSelect = yesRadio;
  } else {
    const midIndex = Math.floor(radiosInGroup.length / 2);
    toSelect = radiosInGroup[midIndex];
  }

  try {
    await toSelect.waitForElementState('visible', { timeout: 2000 });
    await toSelect.scrollIntoViewIfNeeded();
    await toSelect.check();
  } catch {
    await toSelect.evaluate(el => el.click());
  }

  const optionLabel = await getRadioOptionLabel(toSelect);
  console.log(`✅ Selected radio option: "${optionLabel}"`);
}

module.exports = {
  handleInput,
  handleTextarea,
  handleSelect,
  handleCheckbox,
  handleRadio,
};
