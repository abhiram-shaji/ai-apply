const { chromium } = require('playwright');
const { fillForm } = require('./formFillService');
const { logJob } = require('../utils/logger');
require('dotenv').config();


async function autoApply(jobsUrl) {
  const context = await chromium.launchPersistentContext('./linkedin-session', {
    headless: false,
  });

  const page = await context.newPage();
  const url = jobsUrl || 'https://www.linkedin.com/jobs/search-results/?distance=25&f_AL=true&geoId=101174742&keywords=software%20developer&origin=SEMANTIC_SEARCH_HISTORY';
  await page.goto(url);
  await page.waitForSelector('li.scaffold-layout__list-item');

  const jobCards = await page.$$('li.scaffold-layout__list-item');
  console.log(`📄 Found ${jobCards.length} job(s).`);

  for (const job of jobCards) {
    await job.click();
    await page.waitForTimeout(2000);

    const easyApply = await page.$('button.jobs-apply-button');
    if (!easyApply) {
      console.log('❌ No Easy Apply button found. Skipping...');
      continue;
    }

    console.log('✅ Easy Apply button found. Clicking...');
    await easyApply.click();

    let hasNext = true;
    while (hasNext) {
      await fillForm(page);

      const next = await page.$('button:has-text("Next")');
      const submit = await page.$('button:has-text("Submit application")');

      if (next) {
        console.log('➡️ Clicking Next...');
        await next.click();
        await page.waitForTimeout(1000);
      } else if (submit) {
        console.log('📨 Submitting application...');
        await submit.click();
        await page.waitForTimeout(1000);
        logJob('applied', await job.innerText(), await page.url());
        hasNext = false;
        console.log('✅ Application submitted and logged.');
      } else {
        console.log('⚠️ No Next or Submit button. Exiting form.');
        hasNext = false;
      }
    }

    const dismiss = await job.$('button[aria-label^="Dismiss"]');
    if (dismiss) {
      await dismiss.click();
      console.log('🗑️ Job dismissed.');
    }

    await page.waitForTimeout(1000);
  }

  // Optionally keep browser open
  // await context.close();
}

module.exports = { autoApply };
