const fs = require('fs');
const path = require('path');

const locations = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/locations.json'), 'utf8'));

const graph = {};
const errors = [];

for (const [id, loc] of Object.entries(locations)) {
  graph[id] = {};
  if (loc.links) {
    for (const [dir, dest] of Object.entries(loc.links)) {
      graph[id][dir] = dest;
      if (!locations[dest]) {
        errors.push(`Unknown destination ${dest} referenced in ${id}`);
        continue;
      }
      const other = locations[dest];
      const back = Object.values(other.links || {}).includes(id) || (other.boats || []).includes(id);
      if (!back) {
        errors.push(`Missing reverse link from ${dest} to ${id}`);
      }
    }
  }
  if (loc.boats) {
    for (const dest of loc.boats) {
      const key = `boat_${dest}`;
      graph[id][key] = dest;
      if (!locations[dest]) {
        errors.push(`Unknown boat destination ${dest} referenced in ${id}`);
        continue;
      }
      const other = locations[dest];
      const back = (other.boats || []).includes(id) || Object.values(other.links || {}).includes(id);
      if (!back) {
        errors.push(`Missing reverse boat from ${dest} to ${id}`);
      }
    }
  }
}

fs.writeFileSync(path.join(__dirname, '../data/map.json'), JSON.stringify(graph, null, 2));

if (errors.length) {
  console.error('Connection validation failed:');
  for (const e of errors) console.error(' -', e);
  process.exitCode = 1;
} else {
  console.log('All connections bidirectional.');
}
