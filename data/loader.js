import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function fetchJson(rel) {
  if (typeof window === 'undefined') {
    const full = path.join(rootDir, rel);
    return JSON.parse(await fs.readFile(full, 'utf8'));
  }
  const res = await fetch(rel);
  return res.json();
}

export const loader = {
  data: {},
  loadedZones: new Set(),
  async init() {
    const files = [
      'attributes',
      'races',
      'classes',
      'deities',
      'quests',
      'locations',
      'crafting'
    ];
    await Promise.all(
      files.map(async (name) => {
        this.data[name] = await fetchJson(`data/${name}.json`);
      })
    );

    // Load items from single JSON file
    this.data.items = await fetchJson('data/items.json');
    const abilityFiles = await fetchJson('data/abilities/index.json');
    this.data.abilities = {};
    await Promise.all(
      abilityFiles.map(async (f) => {
        Object.assign(this.data.abilities, await fetchJson(`data/abilities/${f}.json`));
      })
    );
  },
  get(type, id) {
    return this.data[type]?.[id];
  }
};
