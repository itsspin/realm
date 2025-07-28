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
      'quests',
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
    this.data.locations = {};
    this.data.zones = {};
  },
  async loadZone(id) {
    if (this.loadedZones.has(id)) return;
    const res = await fetch(`data/zones/${id}.json`);
    if (!res.ok) return;
    const zone = await res.json();
    Object.assign(this.data.locations, zone.locations);
    this.data.zones[id] = zone;
    this.loadedZones.add(id);
  },
  get(type, id) {
    return this.data[type]?.[id];
  }
};
