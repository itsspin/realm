let nodeFS;
let nodePath;
let fileURLToPathFn;
let rootDir;
let browserRoot;

export async function fetchJson(rel) {
  if (typeof window === 'undefined') {
    if (!nodeFS) {
      nodeFS = (await import('fs/promises')).default;
      nodePath = await import('path');
      ({ fileURLToPath: fileURLToPathFn } = await import('url'));
      rootDir = nodePath.resolve(
        nodePath.dirname(fileURLToPathFn(import.meta.url)),
        '..'
      );
    }
    const full = nodePath.join(rootDir, rel);
    return JSON.parse(await nodeFS.readFile(full, 'utf8'));
  }
  if (!browserRoot) {
    browserRoot = new URL('..', import.meta.url);
  }
  const res = await fetch(new URL(rel, browserRoot));
  if (!res.ok) {
    throw new Error(`Failed to fetch ${rel}: ${res.status}`);
  }
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
      'achievements',
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
    const loreFiles = await fetchJson('data/lore/index.json');
    this.data.lore = {};
    await Promise.all(
      loreFiles.map(async (f) => {
        this.data.lore[f] = await fetchJson(`data/lore/${f}.json`);
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
