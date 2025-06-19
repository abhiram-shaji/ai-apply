const { handleInput, handleTextarea, handleSelect } = require('./formHandlers');

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

async function fillForm(page) {
  const inputs = await page.$$('form input:not([type="hidden"])');
  const textareas = await page.$$('form textarea');
  const selects = await page.$$('form select');

  await processElements(inputs, handleInput, 'inputs');
  await processElements(textareas, handleTextarea, 'textareas');
  await processElements(selects, handleSelect, 'selects');
}

module.exports = { fillForm };
