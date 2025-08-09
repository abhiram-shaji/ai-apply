const { logJob } = require('../../utils/logger');
const { delay } = require('../../utils/delay');

async function handleStuckForm(page, job, delayMs) {
  console.log('❌ Handling stuck form...');
  const closeBtn =
    (await page.$('button[aria-label="Dismiss"], button[aria-label="Close"]')) ||
    (await page.$('button[aria-label="Discard"], button[aria-label="Cancel"]'));
  if (closeBtn) {
    await closeBtn.click();
    await page.waitForTimeout(1000);
    const discard = await page.$('button:has-text("Discard")');
    if (discard) {
      await discard.click();
      await page.waitForTimeout(1000);
    }
  }

  const saveJob = await page.$('button.jobs-save-button, button:has-text("Save")');
  if (saveJob) {
    await saveJob.click();
    console.log('💾 Job saved for later.');
  }

  const dismissJob = await job.$('button[aria-label^="Dismiss"]');
  if (dismissJob) {
    await dismissJob.click();
    console.log('🗑️ Job dismissed after failure.');
  }

  logJob('skipped', await job.innerText(), await page.url());
  await page.waitForTimeout(1000);
  await delay(delayMs);
}

module.exports = { handleStuckForm };
