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
  }
};
