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
      'crafting'
    ];
    await Promise.all(
      files.map(async (name) => {
        const res = await fetch(`data/${name}.json`);
        this.data[name] = await res.json();
      })
    );
    this.data.npcs = {};
    this.data.mobs = {};
  },
  async loadNpc(id) {
    if (this.data.npcs[id] || this.data.mobs[id]) return;
    try {
      const res = await fetch(`data/npcs/${id}.json`);
      if (!res.ok) return;
      const npc = await res.json();
      if (npc.hp) this.data.mobs[id] = npc;
      else this.data.npcs[id] = npc;
    } catch {
      /* failed to load npc */
    }
  },
  get(type, id) {
    return this.data[type]?.[id];
  }
};
