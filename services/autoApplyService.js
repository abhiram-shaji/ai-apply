const { chromium } = require('playwright');
const { fillForm } = require('./formFillService');
const { logJob } = require('../utils/logger');
const { delay } = require('../utils/delay');
require('dotenv').config();
const DELAY_MS = parseInt(process.env.DELAY_MS || '1000', 10);


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
        await next.click();
        await page.waitForTimeout(1000);
        await delay(DELAY_MS);
      } else {
        console.log('⚠️ No Next, Submit, or Done button. Exiting form.');
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
