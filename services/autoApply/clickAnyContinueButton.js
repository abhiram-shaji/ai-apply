const { delay } = require('../../utils/delay');

async function clickAnyContinueButton(page, delayMs) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const aria = (await btn.getAttribute('aria-label')) || '';
    const text = (await btn.innerText()) || '';
    if (
      aria.toLowerCase().includes('continue the apply process') ||
      text.toLowerCase().includes('continue applying') ||
      text.toLowerCase().includes('continue to apply') ||
      text.toLowerCase().includes('continue anyway')
    ) {
      console.log(`➡️ Clicking continue button: ${aria || text}`);
      await btn.click();
      await page.waitForTimeout(1000);
      await delay(delayMs);
      return true;
    }
  }
  return false;
}

module.exports = { clickAnyContinueButton };
