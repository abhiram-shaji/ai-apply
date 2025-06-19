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
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/login');
  await page.fill('input[name="session_key"]', process.env.LINKEDIN_USERNAME || '');
  await page.fill('input[name="session_password"]', process.env.LINKEDIN_PASSWORD || '');
  await page.click('button[type="submit"]');

  if (jobsUrl) {
    await page.goto(jobsUrl);
  } else {
    console.log('Please manually navigate to the LinkedIn jobs page with Easy Apply filter.');
    await page.waitForTimeout(30000);
  }

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
