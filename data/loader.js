export const loader = {
  data: {},
  async init() {
    const files = [
      'attributes',
      'races',
      'classes',
      'deities',
      'items',
      'spells',
      'quests',
      'locations',
      'mobs',
      'npcs',
      'crafting'
    ];
    await Promise.all(
      files.map(async (name) => {
        const res = await fetch(`data/${name}.json`);
        this.data[name] = await res.json();
      })
    );
  },
  get(type, id) {
    return this.data[type]?.[id];
  }
};
