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
    console.log('Loader initializing');
    const files = [
      'attributes',
      'races',
      'classes',
      'deities',
      'quests',
      'items',
      'locations',
      'crafting',
      'achievements'
      'events',
      'guilds',
      'achievements',
      'npcs',
      'mobs',
      'nodes',
      'professions',
      'materials',
      'recipes',
      'skill_progression',
      'world'
    ];
    await Promise.all(
      files.map(async (name) => {
        try {
          this.data[name] = await fetchJson(`data/${name}.json`);
        } catch (err) {
          console.warn('Failed loading data file', name, err);
          this.data[name] = {};
        }
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

    const savedGuilds = localStorage.getItem('guilds');
    if (savedGuilds) {
      this.data.guilds = JSON.parse(savedGuilds);
    }
    const loreIdx = await fetch('data/lore/index.json');
    const loreFiles = await loreIdx.json();
    this.data.lore = {};
    await Promise.all(
      loreFiles.map(async (f) => {
        const res = await fetch(`data/lore/${f}.json`);
        this.data.lore[f] = await res.json();
      })
    );
  },
  get(type, id) {
    return this.data[type]?.[id];
  },

  async loadNpc(id) {
    if (this.data.npcs?.[id]) return;
    this.data.npcs ||= {};
    try {
      const npc = await fetchJson(`data/npcs/${id}.json`);
      this.data.npcs[id] = npc;
      console.log('Loaded NPC', id);
    } catch (err) {
      console.warn('Failed to load NPC', id, err);
    }
  }
};
