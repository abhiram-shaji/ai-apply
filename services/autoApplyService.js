const { chromium } = require('playwright');
const { fillForm } = require('./formFillService');
const { logJob } = require('../utils/logger');
const { delay } = require('../utils/delay');
const { handleStuckForm } = require('./autoApply/handleStuckForm');
const { clickAnyContinueButton } = require('./autoApply/clickAnyContinueButton');
const { waitForVisibleButton } = require('./autoApply/waitForVisibleButton');
require('dotenv').config();
const DELAY_MS = parseInt(process.env.DELAY_MS || '1000', 10);

async function autoApply(jobsUrl) {
  const context = await chromium.launchPersistentContext('./linkedin-session', {
    headless: false,
  });

  const page = await context.newPage();
  const url =
    jobsUrl ||
    'https://www.linkedin.com/jobs/search-results/?distance=25&eBP=NON_CHARGEABLE_CHANNEL&f_AL=true&f_TPR=r500000&geoId=101174742&keywords=software%20developer&origin=SEMANTIC_SEARCH_HISTORY';
  await page.goto(url);
  await page.waitForSelector('li.scaffold-layout__list-item');
  await delay(DELAY_MS);

  let jobCards = await page.$$('li.scaffold-layout__list-item');
  console.log(`📄 Found ${jobCards.length} job(s).`);

  let applicationCount = 0;

  for (let i = 0; i < jobCards.length; i++) {
    jobCards = await page.$$('li.scaffold-layout__list-item');
    const job = jobCards[i];
    if (!job) break;

    const jobText = ((await job.innerText()) || '').toLowerCase();
    if (
      jobText.includes('french') ||
      jobText.includes('principal') ||
      jobText.includes('architect') ||
      jobText.includes('sr') ||
      jobText.includes('sr.') ||
      jobText.includes('sr.software') ||
      jobText.includes('senior') ||
      jobText.includes('lead') ||
      jobText.includes('architecte') || // architect
      jobText.includes('chef') || // chef de projet, chef d'équipe
      jobText.includes('senior') || // commonly used in French job titles too
      jobText.includes('responsable') || // often used for lead roles
      jobText.includes('expert') || // commonly denotes seniority
      jobText.includes('dirigeant') || // executive/leader
      jobText.includes('gestionnaire') || // manager
      jobText.includes('directeur') || // director or senior-level manager
      jobText.includes('fran\u00e7ais') ||
      jobText.includes('francais') ||
      jobText.includes('d\u00e9veloppeur') ||
      jobText.includes('developpeur')
    ) {
      console.log('\ud83c\uddeb\ud83c\uddf7 French job detected. Skipping...');
      const dismiss = await job.$('button[aria-label^="Dismiss"]');
      if (dismiss) {
        await dismiss.click();
        console.log('\ud83d\uddd1\ufe0f Job dismissed due to French language.');
      }
      logJob('skipped', await job.innerText(), await page.url());
      await page.waitForTimeout(1000);
      await delay(DELAY_MS);
      continue;
    }

    await job.click();
    await page.waitForTimeout(2000);
    await delay(DELAY_MS);

    const easyApply = await page.$('button.jobs-apply-button');
    if (!easyApply) {
      console.log('❌ No Easy Apply button found. Dismissing...');
      const dismiss = await job.$('button[aria-label^="Dismiss"]');
      if (dismiss) {
        await dismiss.click();
        console.log('🗑️ Job dismissed due to missing Easy Apply.');
      }
      logJob('skipped', await job.innerText(), await page.url());
      await page.waitForTimeout(1000);
      await delay(DELAY_MS);
      continue;
    }

    console.log('✅ Easy Apply button found. Clicking...');
    await easyApply.click();
    await delay(DELAY_MS);

    let hasNext = true;
    while (hasNext) {
      await fillForm(page);
      await delay(DELAY_MS);

      const doneBtn = await waitForVisibleButton(
        page,
        'button:has-text("Done"), button[aria-label="Done"]',
        10000
      );
      const submit = await waitForVisibleButton(
        page,
        'button:has-text("Submit application"), button[aria-label="Submit application"]'
      );
      const easyApplyAgain = await page.$('button.jobs-apply-button');
      const dialogOpen = await page.$(
        'div.jobs-easy-apply-modal, div.jobs-apply-modal, div[role="dialog"]'
      );
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
        const doneAfterSubmit = await waitForVisibleButton(
          page,
          'button:has-text("Done"), button[aria-label="Done"]',
          10000
        );
        if (doneAfterSubmit) {
          console.log('✅ Done button appeared after submit. Clicking...');
          await doneAfterSubmit.click();
          await page.waitForTimeout(1000);
        } else {
          console.log('⚠️ Done button not found after submit.');
        }
        logJob('applied', await job.innerText(), await page.url());
        console.log('✅ Application submitted and logged.');
        hasNext = false;
        await delay(DELAY_MS);
      } else if (await clickAnyContinueButton(page, DELAY_MS)) {
        // Handled inside helper
      } else if (easyApplyAgain && !dialogOpen) {
        console.log('🔄 Detected Easy Apply button. Restarting application loop...');
        hasNext = false;
      } else if (next) {
        console.log('➡️ Clicking Next...');
        try {
          await next.click();
          await page.waitForTimeout(1000);
          await delay(DELAY_MS);
        } catch (err) {
          console.error(`❌ Failed to click Next: ${err.message}`);
          await handleStuckForm(page, job, DELAY_MS);
          hasNext = false;
        }
      } else {
        console.log('⚠️ No Next, Submit, or Done button. Exiting form.');
        await handleStuckForm(page, job, DELAY_MS);
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
    applicationCount++;

    if (applicationCount % 5 === 0) {
      console.log('🔄 Refreshing job search page to prevent stale elements...');
      await page.reload();
      await page.waitForSelector('li.scaffold-layout__list-item');
      await delay(DELAY_MS);
      i = -1;
    }
  }

  // await context.close(); // Optional
}

module.exports = { autoApply };
