export const loader = {
  data: {},
  loadedZones: new Set(),
  async init() {
    const files = [
      'attributes',
      'races',
      'classes',
      'deities',
      'items',
      'quests',
      'locations',
      'crafting'
    ];
    await Promise.all(
      files.map(async (name) => {
        const res = await fetch(`data/${name}.json`);
        this.data[name] = await res.json();
      })
    );
    const idxRes = await fetch('data/abilities/index.json');
    const abilityFiles = await idxRes.json();
    this.data.abilities = {};
    await Promise.all(
      abilityFiles.map(async (f) => {
        const res = await fetch(`data/abilities/${f}.json`);
        Object.assign(this.data.abilities, await res.json());
      })
    );
  },
  get(type, id) {
    return this.data[type]?.[id];
  }
};
