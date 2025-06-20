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

async function clickAnyContinueButton(page) {
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
      await delay(DELAY_MS);
      return true;
    }
  }
  return false;
}

async function waitForVisibleButton(page, selector, timeout = 2000) {
  try {
    await page.waitForSelector(selector, { timeout });
    const btn = await page.$(selector);
    if (btn && (await btn.isVisible())) {
      return btn;
    }
  } catch (err) {
    // ignore timeout errors
  }
  return null;
}

async function autoApply(jobsUrl) {
  const context = await chromium.launchPersistentContext('./linkedin-session', {
    headless: false,
  });

  const page = await context.newPage();
  const url =
    jobsUrl ||
    'https://www.linkedin.com/jobs/search-results/?distance=25&eBP=NON_CHARGEABLE_CHANNEL&f_AL=true&f_TPR=r604800&geoId=101174742&keywords=web%20developer&origin=SEMANTIC_SEARCH_HISTORY';
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
      } else if (await clickAnyContinueButton(page)) {
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
