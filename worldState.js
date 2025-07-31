export const classColors = {
  warrior: 'text-red-400',
  paladin: 'text-amber-300',
  cleric: 'text-emerald-300',
  mage: 'text-blue-400',
  rogue: 'text-yellow-300',
  ranger: 'text-green-400',
  druid: 'text-teal-300',
  necromancer: 'text-purple-400',
  shaman: 'text-orange-400',
  bard: 'text-pink-400'
};

import { loader } from './data/loader.js';
import { ws } from './websocket-stub.js';

export function computeGearScore(equipped = {}) {
  let score = 0;
  Object.values(equipped).forEach((id) => {
    const item = loader.get('items', id);
    if (item && item.level) score += item.level;
  });
  return score;
}

export function zoneFromLocation(locId) {
  if (!locId) return 'unknown';
  const world = loader.data.world;
  const parts = locId.split('_');
  while (parts.length > 1) {
    const candidate = parts.join('_');
    if (world?.continents?.some((c) => c.zones.some((z) => z.id === candidate))) {
      return candidate;
    }
    parts.pop();
  }
  return parts.join('_');
}

export function formatPlaytime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

export const worldState = {
  players: {},
  zones: {},

  addPlayer(p) {
    this.players[p.name] = {
      name: p.name,
      class: p.class,
      level: p.level || 1,
      location: p.location,
      equipped: { ...(p.equipped || {}) },
      loginTime: Date.now(),
      pastPlaytime: p.playtimeMs || 0,
      gearScore: computeGearScore(p.equipped)
    };
  },

  removePlayer(name) {
    delete this.players[name];
  },

  updatePlayer(name, data) {
    const p = this.players[name];
    if (!p) return;
    Object.assign(p, data);
    if (data.equipped) p.gearScore = computeGearScore(p.equipped);
  },

  getPlayer(name) {
    return this.players[name];
  },

  getAllPlayers() {
    return Object.values(this.players);
  },

  getPlayersSortedByLevel() {
    return this.getAllPlayers().sort((a, b) => b.level - a.level);
  },

  getPlayerNames() {
    return Object.keys(this.players);
  },

  getZone(name) {
    const p = this.players[name];
    return p ? zoneFromLocation(p.location) : 'unknown';
  },

  getPlaytimeMs(name) {
    const p = this.players[name];
    if (!p) return 0;
    return Date.now() - p.loginTime + p.pastPlaytime;
  },

  initZone(zoneId, templates) {
    if (this.zones[zoneId]) return;
    this.zones[zoneId] = { templates, mobs: {} };
    for (let i = 0; i < 10; i++) {
      const tpl = this._randomTemplate(zoneId);
      if (tpl) this.spawnMob(zoneId, tpl);
    }
  },

  _randomTemplate(zoneId) {
    const zone = this.zones[zoneId];
    if (!zone) return null;
    const total = zone.templates.reduce((s, t) => s + t.spawn_rate, 0);
    let roll = Math.random() * total;
    for (const tpl of zone.templates) {
      roll -= tpl.spawn_rate;
      if (roll <= 0) return tpl;
    }
    return zone.templates[0];
  },

  spawnMob(zoneId, tpl) {
    const level = this._randRange(tpl.level_range[0], tpl.level_range[1]);
    const id = `zone_${zoneId}_${tpl.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    loader.data.mobs[id] = {
      name: tpl.name,
      level,
      hp: 10 + level * 10,
      damage: Math.max(1, Math.floor(level * 1.5)),
      dropTable: (tpl.loot_table || []).map((lid) => ({ id: lid, weight: 1 }))
    };
    this.zones[zoneId].mobs[id] = { tpl };
    loader.data.locations[zoneId].spawns.push(id);
    ws.send('mob_spawn', { zoneId, mobId: id, mob: loader.data.mobs[id] });
  },

  killMob(zoneId, mobId) {
    const zone = this.zones[zoneId];
    if (!zone || !zone.mobs[mobId]) return;
    const tpl = zone.mobs[mobId].tpl;
    delete zone.mobs[mobId];
    const loc = loader.data.locations[zoneId];
    if (loc) loc.spawns = loc.spawns.filter((id) => id !== mobId);
    delete loader.data.mobs[mobId];
    ws.send('mob_remove', { zoneId, mobId });
    const delay = this._randRange(15, 30) * 1000;
    setTimeout(() => {
      this.spawnMob(zoneId, tpl);
    }, delay);
  },

  getMobIds(zoneId) {
    return Object.keys(this.zones[zoneId]?.mobs || {});
  },

  _randRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};
