const fs = require('fs');
function logJob(status, title, url) {
  const log = { status, title, url, time: new Date().toISOString() };
  fs.appendFileSync('job-log.json', JSON.stringify(log) + '\n');
}
module.exports = { logJob };
