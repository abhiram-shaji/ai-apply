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

module.exports = { waitForVisibleButton };
