import { loader, fetchJson } from './data/loader.js';
import { ws } from './websocket-stub.js';

const active = [];

function broadcast(msg) {
  ws.send('chat', { channel: 'event', msg });
}

function applyEvent(e) {
  if (e.type === 'elite_mob') {
    const base = loader.data.mobs[e.mob];
    if (!base) return;
    const id = `${e.mob}_elite_${e.id}`;
    loader.data.mobs[id] = {
      ...base,
      name: `Elite ${base.name}`,
      level: base.level + (e.levelBoost || 2),
      hp: Math.round(base.hp * 2),
      elite: true
    };
    const loc = loader.data.locations[e.location];
    if (loc) {
      loc.spawns.push(id);
      e._spawn = { loc: e.location, id };
    }
  } else if (e.type === 'rare_loot') {
    const mob = loader.data.mobs[e.mob];
    if (!mob) return;
    mob.dropTable ||= [];
    mob.dropTable.push(e.drop);
    e._loot = { mob: e.mob };
  } else if (e.type === 'npc_dialogue') {
    const npc = loader.data.npcs[e.npc];
    if (!npc) return;
    npc.dialogue ||= [];
    npc.dialogue.push(e.line);
    e._npc = { npc: e.npc };
  }
}

function removeEvent(e) {
  if (e.type === 'elite_mob' && e._spawn) {
    const loc = loader.data.locations[e._spawn.loc];
    if (loc) loc.spawns = loc.spawns.filter((m) => m !== e._spawn.id);
    delete loader.data.mobs[e._spawn.id];
  } else if (e.type === 'rare_loot' && e._loot) {
    const mob = loader.data.mobs[e._loot.mob];
    if (mob && mob.dropTable) {
      mob.dropTable = mob.dropTable.filter(
        (d) => !(d.id === e.drop.id && d.weight === e.drop.weight)
      );
    }
  } else if (e.type === 'npc_dialogue' && e._npc) {
    const npc = loader.data.npcs[e._npc.npc];
    if (npc && npc.dialogue) {
      npc.dialogue = npc.dialogue.filter((l) => l !== e.line);
    }
  }
}

function checkEvents() {
  const now = Date.now();
  for (let i = active.length - 1; i >= 0; i--) {
    const e = active[i];
    if (now > e._end) {
      removeEvent(e);
      broadcast(`The ${e.name} event has ended.`);
      active.splice(i, 1);
    }
  }
}

export async function initEvents() {
  try {
    loader.data.events = await fetchJson('data/events.json');
  } catch {
    loader.data.events = [];
  }
  const now = Date.now();
  for (const e of loader.data.events) {
    e._start = new Date(e.start).getTime();
    e._end = new Date(e.end).getTime();
    if (e._start <= now && now <= e._end) {
      applyEvent(e);
      active.push(e);
      if (e.message) broadcast(e.message);
    }
  }
  setInterval(checkEvents, 60_000);
}

export function getActiveEvents() {
  return active.slice();
}
