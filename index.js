const { autoApply } = require('./services/autoApplyService');

(async () => {
  const jobsUrl = process.env.JOBS_URL; // optional job search URL
  try {
    await autoApply(jobsUrl);
  } catch (err) {
    console.error('Auto apply failed:', err);
  }
})();
