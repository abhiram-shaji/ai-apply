const { chromium } = require('playwright');
const { getAnswer } = require('./aiAnswerService');
const { getLabelFromInput } = require('../utils/labelUtils');
const { logJob } = require('../utils/logger');
require('dotenv').config();

async function fillForm(page) {
  const inputs = await page.$$('form input:not([type="hidden"])');
  console.log(`🧩 Found ${inputs.length} input fields`);

  for (const input of inputs) {
    try {
      const value = await input.getAttribute('value');
      if (value) {
        console.log('➡️ Input already filled. Skipping.');
        continue;
      }

      const label = await getLabelFromInput(input);
      console.log(`📝 Input label: "${label}"`);

      const answer = await getAnswer(label);
      console.log(`🔤 Filling input with: "${answer}"`);

      await input.fill(answer);
      console.log(`✅ Filled input for "${label}"`);
    } catch (err) {
      console.warn(`❌ Error filling input: ${err.message}`);
    }
  }

  const textareas = await page.$$('form textarea');
  console.log(`🧾 Found ${textareas.length} textareas`);

  for (const textarea of textareas) {
    try {
      const label = await getLabelFromInput(textarea);
      console.log(`📝 Textarea label: "${label}"`);

      const answer = await getAnswer(label);
      console.log(`🔤 Filling textarea with: "${answer}"`);

      await textarea.fill(answer);
      console.log(`✅ Filled textarea for "${label}"`);
    } catch (err) {
      console.warn(`❌ Error filling textarea: ${err.message}`);
    }
  }

  const selects = await page.$$('form select');
  console.log(`🎛️ Found ${selects.length} select fields`);

  for (const select of selects) {
    try {
      const label = await getLabelFromInput(select);
      console.log(`📝 Select label: "${label}"`);

      const answer = await getAnswer(label);
      console.log(`🔽 Trying to select option: "${answer}"`);

      await select.selectOption({ label: answer });
      console.log(`✅ Selected option for "${label}"`);
    } catch (err) {
      console.warn(`❌ Error selecting option for "${label}": ${err.message}`);
    }
  }
}

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
