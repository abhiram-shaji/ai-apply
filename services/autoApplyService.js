const { chromium } = require('playwright');
const { fillForm } = require('./formFillService');
const { logJob } = require('../utils/logger');
const { delay } = require('../utils/delay');
require('dotenv').config();
const DELAY_MS = parseInt(process.env.DELAY_MS || '1000', 10);

async function handleStuckForm(page, job) {
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
  await delay(DELAY_MS);
}


async function autoApply(jobsUrl) {
  const context = await chromium.launchPersistentContext('./linkedin-session', {
    headless: false,
  });

  const page = await context.newPage();
  const url = jobsUrl || 'https://www.linkedin.com/jobs/search-results/?distance=25&f_AL=true&geoId=101174742&keywords=web%20developer&origin=SEMANTIC_SEARCH_HISTORY';
  await page.goto(url);
  await page.waitForSelector('li.scaffold-layout__list-item');
  await delay(DELAY_MS);

  const jobCards = await page.$$('li.scaffold-layout__list-item');
  console.log(`📄 Found ${jobCards.length} job(s).`);

  for (const job of jobCards) {
    await job.click();
    await page.waitForTimeout(2000);
    await delay(DELAY_MS);

    const easyApply = await page.$('button.jobs-apply-button');
    if (!easyApply) {
      console.log('❌ No Easy Apply button found. Skipping...');
      continue;
    }

    console.log('✅ Easy Apply button found. Clicking...');
    await easyApply.click();
    await delay(DELAY_MS);

    let hasNext = true;
    while (hasNext) {
      await fillForm(page);
      await delay(DELAY_MS);

      const doneBtn = await page.$('button:has-text("Done")');
      const submit = await page.$('button:has-text("Submit application")');
      const next = await page.$(
        'button:has-text("Next"), button:has-text("Review"), button:has-text("Submit")'
      );

      if (doneBtn) {
        console.log('✅ Done button detected. Finishing application...');
        await doneBtn.click();
        await page.waitForTimeout(1000);
        logJob('applied', await job.innerText(), await page.url());
        hasNext = false;
        await delay(DELAY_MS);
      } else if (submit) {
        console.log('📨 Submitting application...');
        await submit.click();
        await page.waitForTimeout(1000);
        logJob('applied', await job.innerText(), await page.url());
        console.log('✅ Application submitted and logged.');
        await delay(DELAY_MS);
      } else if (next) {
        console.log('➡️ Clicking Next...');
        try {
          await next.click();
          await page.waitForTimeout(1000);
          await delay(DELAY_MS);
        } catch (err) {
          console.error(`❌ Failed to click Next: ${err.message}`);
          await handleStuckForm(page, job);
          hasNext = false;
        }
      } else {
        console.log('⚠️ No Next, Submit, or Done button. Exiting form.');
        await handleStuckForm(page, job);
        hasNext = false;
      }
    }

    const dismiss = await job.$('button[aria-label^="Dismiss"]');
    if (dismiss) {
      await dismiss.click();
      console.log('🗑️ Job dismissed.');
    }

    await page.waitForTimeout(1000);
    await delay(DELAY_MS);
  }

  // Optionally keep browser open
  // await context.close();
}

module.exports = { autoApply };
