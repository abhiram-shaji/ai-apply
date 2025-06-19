const { chromium } = require('playwright');
const { getAnswer } = require('./aiAnswerService');
const { getLabelFromInput } = require('../utils/labelUtils');
const { logJob } = require('../utils/logger');
require('dotenv').config();

async function fillForm(page) {
  const inputs = await page.$$('form input:not([type="hidden"])');
  for (const input of inputs) {
    const value = await input.getAttribute('value');
    if (value) continue;
    const label = await getLabelFromInput(input);
    const answer = await getAnswer(label);
    await input.fill(answer);
  }

  const textareas = await page.$$('form textarea');
  for (const textarea of textareas) {
    const label = await getLabelFromInput(textarea);
    const answer = await getAnswer(label);
    await textarea.fill(answer);
  }
}

async function autoApply(jobsUrl) {
  const browser = await chromium.launch({ headless: false });

  // Optional: persist login across runs
  // const context = await browser.newContext({ storageState: 'linkedin-session.json' });
  // Uncomment below to save session after login:
  // await context.storageState({ path: 'linkedin-session.json' });

  const context = await browser.newContext(); // Use this if you're already logged in manually
  const page = await context.newPage();

  // Navigate directly to jobs search page
  await page.goto(
    jobsUrl ||
      'https://www.linkedin.com/jobs/search-results/?distance=25&f_AL=true&geoId=101174742&keywords=software%20developer&origin=SEMANTIC_SEARCH_HISTORY'
  );
  await page.waitForTimeout(5000); // Wait for the job listings to load

  const jobSelector = 'li.jobs-search-results__list-item';
  const dismissSelector = 'button[aria-label="Dismiss"]';

  const jobCards = await page.$$(jobSelector);
  for (const job of jobCards) {
    const applied = await job.$('span[aria-label="Applied"]');
    if (applied) {
      const dismiss = await job.$(dismissSelector);
      if (dismiss) await dismiss.click();
      continue;
    }

    await job.click();
    await page.waitForTimeout(2000);

    const easyApply = await page.$('button:has-text("Easy Apply")');
    if (!easyApply) {
      const dismiss = await job.$(dismissSelector);
      if (dismiss) await dismiss.click();
      continue;
    }

    await easyApply.click();
    let hasNext = true;
    while (hasNext) {
      await fillForm(page);

      const next = await page.$('button:has-text("Next")');
      const submit = await page.$('button:has-text("Submit application")');

      if (next) {
        await next.click();
        await page.waitForTimeout(1000);
      } else if (submit) {
        await submit.click();
        await page.waitForTimeout(1000);
        logJob('applied', await job.innerText(), await page.url());
        hasNext = false;
      } else {
        hasNext = false;
      }
    }

    const dismiss = await job.$(dismissSelector);
    if (dismiss) await dismiss.click();
    await page.waitForTimeout(1000);
  }

  await browser.close();
}

module.exports = { autoApply };
