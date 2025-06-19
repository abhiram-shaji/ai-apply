const {
  handleInput,
  handleTextarea,
  handleSelect,
  handleCheckbox,
  handleRadio,
} = require('./formHandlers');

async function processElements(elements, handler, label) {
  console.log(`🔍 Found ${elements.length} ${label}`);
  for (const element of elements) {
    try {
      await handler(element);
    } catch (err) {
      console.warn(`❌ Error processing ${label.slice(0, -1)}: ${err.message}`);
    }
  }
}

async function filterVisible(elements) {
  const visible = [];
  for (const el of elements) {
    if (await el.isVisible()) visible.push(el);
  }
  return visible;
}

async function fillForm(page) {
  const textareas = await filterVisible(await page.$$('form textarea'));
  const selects = await filterVisible(await page.$$('form select'));
  const checkboxes = await filterVisible(
    await page.$$('form input[type="checkbox"]')
  );
  const radios = await filterVisible(await page.$$('form input[type="radio"]'));
  const inputs = await filterVisible(
    await page.$$(
      'form input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'
    )
  );

  await processElements(inputs, handleInput, 'inputs');
  await processElements(textareas, handleTextarea, 'textareas');
  await processElements(selects, handleSelect, 'selects');
  await processElements(checkboxes, handleCheckbox, 'checkboxes');
  await processElements(radios, handleRadio, 'radios');
}

module.exports = { fillForm };
