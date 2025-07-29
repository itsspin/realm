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

    const qIndexRes = await fetch('quests/index.json');
    const questIds = await qIndexRes.json();
    this.data.quests = {};
    await Promise.all(
      questIds.map(async (id) => {
        const res = await fetch(`quests/${id}.json`);
        this.data.quests[id] = await res.json();
      })
    );
  },
  get(type, id) {
    return this.data[type]?.[id];
  }
};
