/* eslint-env node */
/* global require,module,__dirname,console */
const fs = require('fs');
const path = require('path');

function rand(max) {
  return Math.floor(Math.random() * max);
}

function pick(arr) {
  return arr[rand(arr.length)];
}

function loadMobs() {
  const file = path.join(__dirname, '..', 'data', 'mobs.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function generateZone() {
  const adjectives = [
    'Whispering',
    'Ancient',
    'Gloomy',
    'Shimmering',
    'Frozen',
    'Dusty',
    'Verdant',
    'Howling'
  ];

  const environments = [
    { tag: 'forest', desc: 'towering trees and dense undergrowth', name: 'Forest' },
    { tag: 'desert', desc: 'scorching dunes that stretch endlessly', name: 'Dunes' },
    { tag: 'mountain', desc: 'rugged cliffs that scrape the sky', name: 'Peaks' },
    { tag: 'swamp', desc: 'murky waters swirling with fog', name: 'Swamp' },
    { tag: 'plains', desc: 'rolling fields of tall grass', name: 'Plains' },
    { tag: 'cavern', desc: 'twisting tunnels buried deep underground', name: 'Caverns' }
  ];

  const env = pick(environments);
  const adjective = pick(adjectives);
  const name = `${adjective} ${env.name}`;
  const description = `A ${adjective.toLowerCase()} area of ${env.desc}.`;

  const mobs = Object.keys(loadMobs());
  const mobCount = rand(3) + 1; // 1-3 mobs per zone
  const zoneMobs = [];
  for (let i = 0; i < mobCount; i++) {
    zoneMobs.push(pick(mobs));
  }

  const dirs = ['n', 'e', 's', 'w'];
  const exits = dirs.filter(() => Math.random() < 0.5);
  if (exits.length === 0) exits.push(pick(dirs));

  return {
    name,
    description,
    mobs: zoneMobs,
    exits,
    tags: [env.tag]
  };
}

module.exports = { generateZone };

if (require.main === module) {
  console.log(JSON.stringify(generateZone(), null, 2));
}
