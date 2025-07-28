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
      'spells',
      'locations',
      'crafting'
    ];
    await Promise.all(
      files.map(async (name) => {
        const res = await fetch(`data/${name}.json`);
        this.data[name] = await res.json();
      })
    );
    // Load quests from individual files in data/quests
    const idxRes = await fetch('data/quests/index.json');
    const list = await idxRes.json();
    this.data.quests = {};
    await Promise.all(
      list.map(async (id) => {
        const qRes = await fetch(`data/quests/${id}.json`);
        this.data.quests[id] = await qRes.json();
      })
    );
  },
  get(type, id) {
    return this.data[type]?.[id];
  }
};
