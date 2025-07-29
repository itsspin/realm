/* eslint-env node */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../data/events.json');
if (!fs.existsSync(file)) {
  console.log('No events file found.');
  process.exit(0);
}

const events = JSON.parse(fs.readFileSync(file, 'utf8'));
const now = Date.now();
const active = events.filter(e => new Date(e.end).getTime() > now);
fs.writeFileSync(file, JSON.stringify(active, null, 2));

const removed = events.length - active.length;
if (removed) console.log(`Removed ${removed} expired events.`);
else console.log('No expired events.');
