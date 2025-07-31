import { loader, fetchJson } from './data/loader.js';
import { ws } from './websocket-stub.js';
import { initEvents } from './events.js';
import { worldState, zoneFromLocation } from './worldState.js';
/* global d3 */

const game = {
  player: null,
  target: null,
  combatTimer: 0,
  inCombat: false,
  onlinePlayers: [],
  players: {},
  currentZone: { id: null, mobs: [] }
};

function saveCharacter(p) {
  localStorage.setItem('player', JSON.stringify(p));
}

function saveGuilds() {
  localStorage.setItem('guilds', JSON.stringify(loader.data.guilds));
}

function loadGuilds() {
  const data = localStorage.getItem('guilds');
  if (data) loader.data.guilds = JSON.parse(data);
}

function loadCharacter() {
  const data = localStorage.getItem('player');
  if (!data) return null;
  const p = JSON.parse(data);
  p.completedQuests ||= [];
  p.questProgress ||= {};
  p.professions ||= [];
  p.crafting ||= {};
  Object.keys(loader.data.professions || {}).forEach((id) => {
    p.crafting[id] ||= 0;
  });
  p.coins ||= { copper: 0, silver: 0, gold: 0 };
  p.party ||= [];
  p.friends ||= [];
  p.guild ||= null;
  p.reputation ||= { luminara: 0, umbra: 0, neutral: 0 };
  p.xp ||= 0;
  p.achievements ||= { unlocked: [], titles: [], title: '', playTime: 0 };
  return p;
}
let currentTargetBtn = null;

function isQuestGiver(id) {
  return Object.values(loader.data.quests).some((q) => q.giver === id);
}

function rand(max) {
  return Math.floor(Math.random() * max) + 1;
}

function randRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function opposingFaction(fac) {
  if (fac === 'luminara') return 'umbra';
  if (fac === 'umbra') return 'luminara';
  return null;
}

function adjustReputation(faction, amount) {
  if (!faction || !game.player) return;
  game.player.reputation[faction] =
    (game.player.reputation[faction] || 0) + amount;
}

function getPlayerLevel() {
  return Math.floor((game.player?.xp || 0) / 100) + 1;
}

function unlockAchievement(id) {
  const defs = loader.data.achievements || {};
  if (!defs[id]) return;
  const a = game.player.achievements;
  if (a.unlocked.includes(id)) return;
  a.unlocked.push(id);
  if (defs[id].title) {
    if (!a.titles.includes(defs[id].title)) a.titles.push(defs[id].title);
    addLog(`Achievement unlocked: ${defs[id].name} - Title ${defs[id].title}!`);
  } else {
    addLog(`Achievement unlocked: ${defs[id].name}`);
  }
  saveCharacter(game.player);
}

function getAvailableAbilities() {
  const cls = loader.data.classes[game.player.class];
  if (!cls) return [];
  const lvl = getPlayerLevel();
  let list = [];
  Object.entries(cls.abilities).forEach(([req, ab]) => {
    if (lvl >= Number(req)) list = list.concat(ab);
  });
  return list;
}

function abilityAllowed(id) {
  return getAvailableAbilities().includes(id);
}

function selectTarget(type, id, btn, group = null) {
  if (currentTargetBtn) currentTargetBtn.classList.remove('targeted');
  currentTargetBtn = btn || null;
  if (currentTargetBtn) currentTargetBtn.classList.add('targeted');
  if (type === 'npc') {
    game.target = { ...loader.get('npcs', id), id, type };
  } else if (type === 'node') {
    game.target = { ...loader.get('nodes', id), id, type };
  } else if (type === 'mob') {
    game.target = { ...loader.data.mobs[id], id, type, group };
  } else {
    game.target = null;
  }
  document.getElementById('dialogue').classList.add('hidden');
  updateHUD();
  updateTargetPanel();
}
function randomRarity(level) {
  const roll = Math.random() * 100;
  if (level >= 60 && roll < 0.05) return 'legendary';
  if (roll < 1) return 'epic';
  if (roll < 5) return 'rare';
  if (roll < 20) return 'uncommon';
  return 'common';
}

// Procedurally generate an item using prefix/core/suffix naming
function generateItem(level) {
  const prefixes = [
    { name: 'Cracked', mult: 0.8, rarity: -1 },
    { name: 'Fine', mult: 1.1, rarity: 0 },
    { name: 'Sturdy', mult: 1.2, rarity: 1 },
    { name: 'Ancient', mult: 1.3, rarity: 2 }
  ];
  const cores = [
    { id: 'staff', slot: 'weapon', name: 'Staff', mult: 1 },
    { id: 'sword', slot: 'weapon', name: 'Sword', mult: 1.1 },
    { id: 'mace', slot: 'weapon', name: 'Mace', mult: 1.2 },
    { id: 'robe', slot: 'chest', name: 'Robe', mult: 1 },
    { id: 'mail', slot: 'chest', name: 'Mail', mult: 1.1 }
  ];
  const suffixes = [
    { name: 'of Haste', mult: 1.1, rarity: 1 },
    { name: 'of Power', mult: 1.2, rarity: 1 },
    { name: 'of the Whale', mult: 1.3, rarity: 2 },
    { name: 'of Devastation', mult: 1.4, rarity: 3 }
  ];

  const p = prefixes[rand(prefixes.length) - 1];
  const c = cores[rand(cores.length) - 1];
  const s = suffixes[rand(suffixes.length) - 1];

  const score = 1 + (p.rarity || 0) + (c.rarity || 0) + (s.rarity || 0);
  let rarity = 'common';
  if (score >= 5) rarity = 'legendary';
  else if (score >= 4) rarity = 'epic';
  else if (score >= 3) rarity = 'rare';
  else if (score >= 2) rarity = 'uncommon';

  const mult = (p.mult || 1) * (c.mult || 1) * (s.mult || 1);
  const item = {
    name: `${p.name} ${c.name} ${s.name}`,
    level,
    slot: c.slot,
    rarity
  };
  if (c.slot === 'weapon') item.damage = Math.floor(level * 0.8 * mult + 1);
  else item.armor = Math.floor(level * 0.5 * mult + 1);
  return item;
}

function generateItems() {
  const types = [
    { id: 'cloth', slot: 'chest', name: 'Cloth Armor' },
    { id: 'dagger', slot: 'weapon', name: 'Dagger' },
    { id: 'sword', slot: 'weapon', name: 'Sword' }
  ];
  const items = {};
  types.forEach((t) => {
    for (let i = 1; i <= 200; i++) {
      const level = i;
      const rarity = randomRarity(level);
      const mult = { common: 1, uncommon: 1.2, rare: 1.5, epic: 2, legendary: 3 }[rarity];
      const id = `${t.id}_${String(i).padStart(3, '0')}`;
      const item = {
        name: `${rarity} ${t.name} ${i}`,
        level,
        slot: t.slot,
        rarity
      };
      if (t.slot === 'weapon') item.damage = Math.floor(level * 0.8 * mult + 1);
      else item.armor = Math.floor(level * 0.5 * mult + 1);
      items[id] = item;
    }
  });
  loader.data.items = { ...loader.data.items, ...items };
}

// Generate a single random item scaled to the given level
function generateRandomItem(level) {
  const item = generateItem(level);
  const core = item.slot;
  const id = `gen_${core}_${Date.now()}_${rand(1000)}`;
  loader.data.items[id] = item;
  return id;
}

// Generate a random mob scaled to the given level
function generateRandomMob(level) {
  const names = ['Goblin', 'Wolf', 'Bandit', 'Skeleton'];
  const name = names[rand(names.length) - 1];
  const id = `genmob_${Date.now()}_${rand(1000)}`;
  loader.data.mobs[id] = {
    name: `${name} ${level}`,
    level,
    hp: 10 + level * 10,
    damage: Math.max(1, Math.floor(level * 1.5)),
    description: `A level ${level} ${name}.`
  };
  return id;
}

// Generate a simple kill quest for a random mob
function generateRandomQuest(level) {
  const mobId = generateRandomMob(level);
  const mobName = loader.data.mobs[mobId].name;
  const count = rand(3) + 1;
  const qid = `genquest_${Date.now()}_${rand(1000)}`;
  loader.data.quests[qid] = {
    name: `Eliminate ${mobName}`,
    giver: 'thaldo_tinkerer',
    description: `Slay ${count} ${mobName}s for Thaldo.`,
    objective: { kill: mobId, count },
    reward: { xp: level * 20 }
  };
  return qid;
}

function dropLoot(mob) {
  const loot = { items: [], copper: 0, silver: 0, gold: 0 };
  loot.copper = rand(mob.level * 2);
  if (mob.level >= 5) loot.silver = rand(Math.floor(mob.level / 5));
  if (mob.level >= 20) loot.gold = rand(Math.floor(mob.level / 20));
  if (mob.dropTable) {
    const total = mob.dropTable.reduce((s, d) => s + d.weight, 0);
    if (total > 0) {
      let roll = Math.random() * total;
      for (const d of mob.dropTable) {
        roll -= d.weight;
        if (roll <= 0) {
          loot.items.push(d.id);
          break;
        }
      }
    }
  } else if (mob.drops) {
    mob.drops.forEach((d) => {
      if (Math.random() < d.chance) loot.items.push(d.id);
    });
  } else if (Math.random() < 0.5) {
    const list = Object.keys(loader.data.items).filter(
      (id) => loader.data.items[id].level <= mob.level
    );
    if (list.length) {
      const id = list[rand(list.length) - 1];
      loot.items.push(id);
    }
  }
  return loot;
}

function grantRewards(rewards) {
  if (!rewards) return;
  if (rewards.xp) {
    game.player.xp += rewards.xp;
    addLog(`You gain ${rewards.xp} XP.`);
  }
  (rewards.items || []).forEach((id) => {
    game.player.inventory.push(id);
    addLog(`You receive ${loader.data.items[id]?.name || id}.`);
  });
  updateHUD();
}

function updateHUD() {
  const p = game.player;
  const nameEl = document.getElementById('player-name');
  if (nameEl) {
    const title = p.achievements.title ? ` ${p.achievements.title}` : '';
    nameEl.textContent = p.name + title;
  }
  const clsEl = document.getElementById('player-class');
  if (clsEl) clsEl.textContent = p.class;
  const lvlEl = document.getElementById('player-level');
  if (lvlEl) lvlEl.textContent = `Lv ${getPlayerLevel()}`;
  const hpText = document.getElementById('player-hp-text');
  if (hpText) hpText.textContent = `${p.hp}/${p.maxHp}`;
  const hpFill = document.getElementById('hp-fill');
  if (hpFill) hpFill.style.width = `${(p.hp / p.maxHp) * 100}%`;
  const mpText = document.getElementById('player-mp-text');
  if (mpText) mpText.textContent = `${p.mp}/${p.maxMp}`;
  const mpFill = document.getElementById('mp-fill');
  if (mpFill) mpFill.style.width = `${(p.mp / p.maxMp) * 100}%`;
  const xpText = document.getElementById('player-xp-text');
  if (xpText) xpText.textContent = p.xp || 0;
  const xpFill = document.getElementById('xp-fill');
  if (xpFill) xpFill.style.width = `${(p.xp % 100)}%`;
  const goldEl = document.getElementById('player-gold');
  if (goldEl)
    goldEl.textContent = `${p.coins.gold}g ${p.coins.silver}s ${p.coins.copper}c`;
  const statusEl = document.getElementById('status');
  if (statusEl)
    statusEl.textContent = `HP: ${p.hp}/${p.maxHp}\u2003MP: ${p.mp}/${p.maxMp}\u2003XP: ${p.xp}`;
}

function updateLocationPanel() {
  const loc = loader.data.locations[game.player.location];
  if (!loc) return;
  document.getElementById('location-name').textContent = loc.name;
  const container = document.getElementById('location-exits');
  container.innerHTML = '';
  const dirs = { n: 'North', e: 'East', s: 'South', w: 'West' };
  Object.entries(dirs).forEach(([dir, label]) => {
    const dest = loc.links?.[dir];
    if (dest) {
      const btn = document.createElement('button');
      btn.className = 'move-btn';
      btn.textContent = label;
      btn.dataset.dir = dir;
      btn.title = loader.data.locations[dest]?.name || dest;
      container.append(btn);
    }
  });
  buildMoveControls(loc);
}

function buildMoveControls(loc) {
  const mc = document.getElementById("move-controls");
  mc.innerHTML = "";
  const dirs = { n: "North", e: "East", s: "South", w: "West" };
  Object.entries(dirs).forEach(([dir, label]) => {
    if (loc.links?.[dir]) {
      const btn = document.createElement("button");
      btn.className = "move-btn";
      btn.textContent = label;
      btn.dataset.dir = dir;
      mc.append(btn);
    }
  });
}

function addLog(txt) {
  const div = document.createElement('div');
  div.textContent = txt;
  document.getElementById('log').append(div);
  div.scrollIntoView();
}

function addHtmlLog(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  document.getElementById('log').append(div);
  div.scrollIntoView();
}

function addChat(txt) {
  const div = document.createElement('div');
  div.textContent = txt;
  document.getElementById('chat-panel').append(div);
}

function showLoot(loot) {
  const panel = document.getElementById('loot');
  panel.innerHTML = '<h2 class="text-lg mb-2">Loot</h2>';
  const list = document.createElement('ul');
  loot.items.forEach((id) => {
    const li = document.createElement('li');
    li.textContent = loader.data.items[id]?.name || id;
    list.append(li);
  });
  if (loot.gold || loot.silver || loot.copper) {
    const li = document.createElement('li');
    li.textContent = `${loot.gold}g ${loot.silver}s ${loot.copper}c`;
    list.append(li);
  }
  panel.append(list);
  const btn = document.createElement('button');
  btn.className = 'btn mt-2';
  btn.textContent = 'Close';
  btn.onclick = () => document.getElementById('overlay').classList.add('hidden');
  panel.append(btn);
  showPanel('loot');
}

function showPanel(name) {
  if (name === 'inv') {
    const panel = document.getElementById('inv');
    if (panel.classList.contains('hidden')) {
      panel.classList.remove('hidden');
      buildInventory();
    } else {
      panel.classList.add('hidden');
    }
    return;
  }
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  document.querySelectorAll('#overlay .panel').forEach((p) => p.classList.add('hidden'));
  document.getElementById(name).classList.remove('hidden');
  if (name === 'quests') buildQuestList();
  if (name === 'map') buildMap();
  if (name === 'graph') buildGraph();
  if (name === 'craft') buildCraftPanel();
  if (name === 'codex') buildCodexPanel();
}

function renderRoom(loc) {
  const log = document.getElementById('log');
  const npcNames = loc.npcs
    .map((id) => loader.get('npcs', id)?.name || id)
    .join(', ') || 'None';
  const groupedIds = new Set((loc.mobGroups || []).flat());
  const mobNameParts = [];
  (loc.mobGroups || []).forEach((grp) => {
    const mob = loader.data.mobs[grp[0]];
    if (!mob) return;
    const diff = mob.level - game.player.level;
    let color = 'text-white';
    if (Math.abs(diff) > 2) color = 'text-red-600';
    else if (diff > 0) color = 'text-yellow-400';
    else if (diff < 0) color = 'text-blue-600';
    mobNameParts.push(
      `<span class="${color}">${mob.name} (group of ${grp.length})</span>`
    );
  });
  loc.spawns.forEach((id) => {
    if (groupedIds.has(id)) return;
    const mob = loader.data.mobs[id];
    if (!mob) return;
    const diff = mob.level - game.player.level;
    let color = 'text-white';
    if (Math.abs(diff) > 2) color = 'text-red-600';
    else if (diff > 0) color = 'text-yellow-400';
    else if (diff < 0) color = 'text-blue-600';
    mobNameParts.push(`<span class="${color}">${mob.name}</span>`);
  });
  const mobNames = mobNameParts.join(', ') || 'None';
  const nodeNames = (loc.nodes || [])
    .map((id) => loader.get('nodes', id)?.name || id)
    .join(', ') || 'None';

  const exitButtons = Object.entries(loc.links || {})
    .map(([, dest]) => {
      const d = loader.data.locations[dest];
      const name = d ? d.name : dest;
      return `<button class="exit-btn underline text-sky-400" data-dest="${dest}">${name}</button>`;
    })
    .concat(
      (loc.boats || []).map(
        (dest) =>
          `<button class="exit-btn underline text-teal-400" data-dest="${dest}">Sail to ${loader.data.locations[dest]?.name || dest}</button>`
      )
    )
    .join(', ') || 'None';

  log.innerHTML = `
    <h2 class="text-lg font-bold">${loc.name}</h2>
    <p>${loc.description}</p>
    <p><strong>Travel:</strong> ${exitButtons}</p>
    <p><strong>NPCs:</strong> ${npcNames}</p>

    <p><strong>Mobs:</strong> ${mobNames}</p>
    <p><strong>Objects:</strong> ${nodeNames}</p>
  `;
  log.querySelectorAll('.exit-btn').forEach((btn) => {
    btn.onclick = () => enterRoom(btn.dataset.dest);
  });
  buildNPCList(loc.npcs);
  buildMobList(loc.spawns, loc.mobGroups);
  buildNodeList(loc.nodes);
  buildActionsPanel(loc);
}

async function enterRoom(id) {
  console.log('Entering room', id);
  const loc = loader.data.locations[id];
  if (!loc) return;
  await loadZoneMobs(zoneOf(id));
  const ids = [...(loc.npcs || []), ...(loc.spawns || [])];
  await Promise.all(ids.map((nid) => loader.loadNpc(nid)));
  spawnMobsForLocation(loc, id);
  game.player.location = id;
  location.hash = id;
  renderRoom(loc);
  checkQuestProgress('location', id);
  updateHUD();
  updateLocationPanel();
  updateZonePanel();
  discoverZone(id);
}

async function move(dir) {
  console.log('Move', dir);
  const dest = loader.data.locations[game.player.location].links[dir];
  if (dest) await enterRoom(dest);
}


function updatePlayersList() {
  const list = document.getElementById('player-list');
  if (!list) return;
  list.innerHTML = '';
  worldState.getPlayerNames().forEach((p) => {
    const btn = document.createElement('button');
    btn.className = 'npc-btn text-xs';
    btn.textContent = p;
    btn.onclick = () => showPlayerActions(p);
    list.append(btn);
  });
}

function showPlayerActions(name) {
  const log = document.getElementById('log');
  const div = document.createElement('div');
  div.innerHTML = `Actions for <strong>${name}</strong>:
    <button class="underline text-sky-400" data-act="inspect">Inspect</button>
    <button class="underline text-sky-400" data-act="trade">Trade</button>
    <button class="underline text-sky-400" data-act="msg">Message</button>
    <button class="underline text-sky-400" data-act="invite">Invite</button>`;
  log.append(div);
  div.querySelector('[data-act="inspect"]').onclick = () => handleInput(`/inspect ${name}`);
  div.querySelector('[data-act="trade"]').onclick = () => addLog(`You offer to trade with ${name}.`);
  div.querySelector('[data-act="msg"]').onclick = () => addLog(`You send a private message to ${name}.`);
  div.querySelector('[data-act="invite"]').onclick = () => addLog(`You invite ${name} to your party.`);
  div.scrollIntoView();
}

function rarityColorClass(rarity) {
  return {
    common: 'text-slate-200',
    uncommon: 'text-green-400',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-orange-400'
  }[rarity] || 'text-slate-200';
}

function gearScore(player) {
  return Object.values(player.equipped || {}).reduce(
    (sum, id) => sum + (loader.data.items[id]?.level || 0),
    0
  );
}

function resolveAttack(attacker, defender, ability = {}) {
  const hitChance = 0.8;
  if (Math.random() > hitChance) return { miss: true };
  const dodgeChance = Math.min((defender.dex || 0) / 100, 0.2);
  if (Math.random() < dodgeChance) return { dodge: true };
  let damage = ability.damage || attacker.damage || 1;
  const critChance = 0.1;
  const crit = Math.random() < critChance;
  if (crit) damage *= 2;
  return { damage: Math.floor(damage), crit };
}

function zoneOf(loc) {
  return zoneFromLocation(loc);
}

function getZoneData(id) {
  const world = loader.data.world;
  if (!world?.continents) return null;
  for (const cont of world.continents) {
    const zone = cont.zones.find((z) => z.id === id);
    if (zone) return zone;
  }
  return null;
}

function updateZonePanel() {
  const zid = zoneFromLocation(game.player.location);
  const zone = getZoneData(zid);
  if (!zone) return;
  const nameEl = document.getElementById('zone-name');
  if (nameEl) nameEl.textContent = zone.name;
  const descEl = document.getElementById('zone-desc');
  if (descEl) descEl.textContent = zone.description || '';
  const exitsEl = document.getElementById('zone-exits');
  if (exitsEl) {
    const parts = Object.values(zone.exits || {}).map((z) => {
      const zd = getZoneData(z);
      return zd ? zd.name : z;
    });
    exitsEl.textContent = parts.join(', ') || 'None';
  }
}

async function loadZoneMobs(zoneId) {
  if (game.currentZone.id === zoneId) return;
  game.currentZone = { id: zoneId, mobs: [] };
  try {
    const data = await fetchJson(`data/mobs/${zoneId}.json`);
    if (Array.isArray(data.mobs)) {
      game.currentZone.mobs = data.mobs;
      worldState.initZone(zoneId, game.currentZone.mobs);
    } else {
      console.warn('Invalid mob data for zone', zoneId);
    }
  } catch (err) {
    console.warn('Failed to load mobs for zone', zoneId, err);
  }
}

function createZoneMob(tpl) {
  const level = randRange(tpl.level_range[0], tpl.level_range[1]);
  const id = `zone_${game.currentZone.id}_${tpl.id}_${Date.now()}_${rand(1000)}`;
  loader.data.mobs[id] = {
    name: tpl.name,
    level,
    hp: 10 + level * 10,
    damage: Math.max(1, Math.floor(level * 1.5)),
    dropTable: (tpl.loot_table || []).map((lid) => ({ id: lid, weight: 1 }))
  };
  return id;
}

function spawnMobsForLocation(loc, locId) {
  if (!loc._baseSpawns) loc._baseSpawns = [...(loc.spawns || [])];
  loc.spawns = loc._baseSpawns.slice();
  loc.mobGroups = [];
  if (!game.currentZone.mobs.length) return;
  game.currentZone.mobs.forEach((tpl) => {
    if (Math.random() < tpl.spawn_rate) {
      const size = randRange(2, 8);
      const group = [];
      for (let i = 0; i < size; i++) {
        const id = createZoneMob(tpl);
        loc.spawns.push(id);
        group.push(id);
      }
      loc.mobGroups.push(group);
    }
  });
  const zid = zoneFromLocation(locId || game.player.location);
  loc.spawns = loc.spawns.concat(worldState.getMobIds(zid));
}

function getRandomMobForZone() {
  if (!game.currentZone.mobs.length) return null;
  const total = game.currentZone.mobs.reduce((s, m) => s + m.spawn_rate, 0);
  let roll = Math.random() * total;
  for (const tpl of game.currentZone.mobs) {
    roll -= tpl.spawn_rate;
    if (roll <= 0) {
      const id = createZoneMob(tpl);
      return { id, ...loader.data.mobs[id] };
    }
  }
  return null;
}

function inspectPlayer(name) {
  const p = game.players[name];
  if (!p) {
    addLog('No such player.');
    return;
  }
  if (zoneOf(p.location) !== zoneOf(game.player.location)) {
    addLog(`${name} is not in this zone.`);
    return;
  }
  const gs = gearScore(p);
  addHtmlLog(`<strong>${name}'s Gear (Score: ${gs})</strong>`);
  Object.entries(p.equipped || {}).forEach(([slot, id]) => {
    const item = loader.data.items[id];
    if (!item) return;
    const color = rarityColorClass(item.rarity || 'common');
    addHtmlLog(`${slot}: <span class="${color}">${item.name} (${item.rarity || 'common'})</span>`);
  });
}
function updatePartyPanel() {
  const panel = document.getElementById('party');
  if (!panel) return;
  if (!game.player.party.length) {
    panel.textContent = 'Party: —';
  } else {
    panel.textContent = `Party: ${game.player.party.join(', ')}`;
  }
}

function updateTargetPanel() {
  const panel = document.getElementById('target');
  if (!panel) return;
  const t = game.target;
  panel.innerHTML = '';
  if (!t) {
    panel.textContent = 'Target: —';
    return;
  }
  const header = document.createElement('div');
  header.className = 'font-bold mb-1';
  header.textContent = t.name || t.id;
  if (t.level) header.textContent += ` (Lv ${t.level})`;
  panel.append(header);

  if (t.type === 'mob' && t.group) {
    t.group.forEach((mid) => {
      const mob = loader.data.mobs[mid];
      if (!mob) return;
      const row = document.createElement('div');
      row.className = 'flex items-center gap-1 mb-1';
      const span = document.createElement('span');
      span.textContent = `${mob.name} (Lv ${mob.level})`;
      if (mob.inCombat) span.classList.add('pulse');
      row.append(span);
      const b = document.createElement('button');
      b.className = 'btn text-xs';
      b.textContent = 'Attack';
      b.onclick = () => startCombat(mid);
      row.append(b);
      panel.append(row);
    });
  } else if (t.type === 'mob') {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-1';
    const btn = document.createElement('button');
    btn.className = 'btn text-xs';
    btn.textContent = 'Attack';
    btn.onclick = () => startCombat(t.id);
    row.append(btn);
    panel.append(row);
  } else if (t.type === 'npc') {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-1';
    const talk = document.createElement('button');
    talk.className = 'btn text-xs';
    talk.textContent = 'Talk';
    talk.onclick = () => talkToNpc(t.id);
    const attack = document.createElement('button');
    attack.className = 'btn text-xs';
    attack.textContent = 'Attack';
    attack.onclick = () => attackNpc(t.id);
    row.append(talk, attack);
    panel.append(row);
  }
}

// --- Turn-based Combat System ---
function addCombatLog(txt) {
  const div = document.createElement('div');
  div.textContent = txt;
  const log = document.getElementById('combat-log');
  log.append(div);
  log.scrollTop = log.scrollHeight;
}

function updateCombatUI() {
  const panel = document.getElementById('combat-info');
  if (!panel) return;
  if (!game.inCombat) {
    panel.classList.add('hidden');
    return;
  }
  const enemy = game.target;
  panel.classList.remove('hidden');
  panel.textContent = `${enemy.name} HP: ${enemy.hp} | Your HP: ${game.player.hp}`;
}

function endCombat(win) {
  const mob = game.target;
  game.inCombat = false;
  game.target = null;
  const overlay = document.getElementById('combat-overlay');
  if (overlay) overlay.classList.add('hidden');
  if (mob && mob.id && loader.data.mobs[mob.id]) {
    loader.data.mobs[mob.id].inCombat = false;
    const loc = loader.data.locations[game.player.location];
    if (loc) buildMobList(loc.spawns, loc.mobGroups);
  }
  if (win) {
    addLog(`${mob.name} dies.`);
    if (mob.id.startsWith('zone_')) {
      worldState.killMob(zoneOf(game.player.location), mob.id);
    }
    if (mob.boss) discoverBoss(mob.id);
    const loot = dropLoot(mob);
    game.player.coins.copper += loot.copper;
    game.player.coins.silver += loot.silver;
    game.player.coins.gold += loot.gold;
    loot.items.forEach((id) => {
      game.player.inventory.push(id);
      addLog(`You loot ${loader.data.items[id].name}.`);
      if (loader.data.items[id]?.relic) discoverRelic(id);
      checkQuestProgress('item', id);
    });
    if (loot.copper || loot.silver || loot.gold) {
      addLog(`You loot ${loot.gold}g ${loot.silver}s ${loot.copper}c.`);
    }
    if (mob.faction) {
      adjustReputation(mob.faction, -5);
      const opp = opposingFaction(mob.faction);
      if (opp) adjustReputation(opp, 5);
    }
    showLoot(loot);
    checkQuestProgress('kill', mob.id);
  } else {
    addLog('You have been slain!');
  }
  updateHUD();
  updateCombatUI();
  updateTargetPanel();
}

function enemyAttack() {
  const mob = game.target;
  // eslint-disable-next-line no-undef
  const res = resolveAttack(mob, game.player);
  if (res.dodge) {
    addCombatLog('You dodge the attack.');
  } else if (res.miss) {
    addCombatLog(`${mob.name} misses.`);
  } else {
    game.player.hp -= res.damage;
    const crit = res.crit ? ' CRIT!' : '';
    addCombatLog(`${mob.name} hits you for ${res.damage}.${crit}`);
  }
  if (game.player.hp <= 0) {
    addCombatLog('You have been defeated!');
    endCombat(false);
  } else {
    updateCombatUI();
  }
}

function useAbility(id) {
  if (!game.inCombat) return;
  if (!abilityAllowed(id)) return;
  const spell = loader.data.abilities[id];
  if (!spell) return;
  addCombatLog(`You use ${spell.name}.`);
  if (spell.damage) {
    // eslint-disable-next-line no-undef
    const res = resolveAttack(game.player, game.target, spell);
    if (res.dodge) {
      addCombatLog(`${game.target.name} dodges your attack.`);
    } else if (res.miss) {
      addCombatLog('You miss.');
    } else {
      game.target.hp -= res.damage;
      const crit = res.crit ? ' CRIT!' : '';
      addCombatLog(`You deal ${res.damage} damage.${crit}`);
    }
  }
  if (spell.heal) {
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + spell.heal);
    addCombatLog(`You heal ${spell.heal} HP.`);
  }
  if (game.target.hp <= 0) {
    addCombatLog(`${game.target.name} is defeated!`);
    endCombat(true);
    return;
  }
  updateCombatUI();
  enemyAttack();
}

function startCombat(targetId, type = 'mob') {
  const data = type === 'npc' ? loader.get('npcs', targetId) : loader.data.mobs[targetId];
  if (!data) return;
  game.target = { ...data, id: targetId, type };
  game.inCombat = true;
  document.getElementById('combat-log').innerHTML = '';
  if (type === 'mob') {
    loader.data.mobs[targetId].inCombat = true;
    const loc = loader.data.locations[game.player.location];
    if (loc) buildMobList(loc.spawns, loc.mobGroups);
  }
  updateCombatUI();
  updateTargetPanel();
  document.getElementById('dialogue').classList.add('hidden');
}

function attackNpc(id) {
  const npc = loader.get('npcs', id);
  if (npc && npc.hp) {
    startCombat(id, 'npc');
  } else {
    addLog(`${npc.name} does not seem interested in fighting.`);
  }
  document.getElementById('dialogue').classList.add('hidden');
}

function talkToNpc(id) {
  const npc = loader.get('npcs', id);
  if (!npc) return;
  let line = npc.dialogue?.[0] || '...';
  Object.entries(loader.data.quests).forEach(([qid, q]) => {
    if (q.giver !== id) return;
    if (game.player.activeQuests.includes(qid)) {
      const stage = q.stages[game.player.questProgress[qid].stage];
      if (stage.dialogue) line = stage.dialogue;
    } else if (game.player.completedQuests.includes(qid)) {
      const stage = q.stages[q.stages.length - 1];
      if (stage.dialogue) line = stage.dialogue;
    } else if (q.stages[0].dialogue) {
      line = q.stages[0].dialogue;
    }
  });
  addLog(`${npc.name} says: "${line}"`);
  checkQuestProgress('talk', id);
  document.getElementById('dialogue').classList.add('hidden');
}

function showNpcMenu(id) {
  const npc = loader.get('npcs', id);
  if (!npc) return;
  const loc = loader.data.locations[game.player.location];
  const fac = loc?.faction;
  if (fac && game.player.reputation[fac] <= -10) {
    addLog(`${npc.name} refuses to deal with you due to your reputation with ${fac}.`);
    return;
  }
  const dlg = document.getElementById('dialogue');
  dlg.innerHTML = `
    <div class="font-bold mb-1">${npc.name}</div>
    <div class="text-xs mb-2">${npc.role}</div>
    <div class="flex gap-2 mb-2">
      <button id="talk" class="btn">Talk</button>
      <button id="attack" class="btn">Attack</button>
    </div>
    <div id="quest-offers" class="flex flex-col gap-1"></div>
    <div id="training" class="flex flex-col gap-1 mt-2"></div>
  `;
  dlg.classList.remove('hidden');
  document.getElementById('talk').onclick = () => talkToNpc(id);
  document.getElementById('attack').onclick = () => attackNpc(id);
  const qdiv = document.getElementById('quest-offers');
  Object.entries(loader.data.quests).forEach(([qid, q]) => {
    if (q.giver !== id || game.player.activeQuests.includes(qid)) return;
    const btn = document.createElement('button');
    btn.className = 'text-red-400 underline text-left';
    btn.textContent = `[${q.name}]`;
    btn.onclick = () => {
      if (window.confirm(`Accept quest "${q.name}"?`)) {
        game.player.activeQuests.push(qid);
        game.player.questProgress[qid] = { stage: 0, count: 0 };
        addLog(`Quest accepted: ${q.name}`);
        dlg.classList.add('hidden');
        buildQuestList();
      }
    };
    qdiv.append(btn);
  });
  const tdiv = document.getElementById('training');
  (npc.teaches || []).forEach((prof) => {
    if (game.player.professions.includes(prof)) return;
    const btn = document.createElement('button');
    btn.className = 'btn text-xs';
    btn.textContent = `Learn ${loader.data.professions[prof].name}`;
    btn.onclick = () => {
      game.player.professions.push(prof);
      addLog(`You learn ${loader.data.professions[prof].name}.`);
      dlg.classList.add('hidden');
    };
    tdiv.append(btn);
  });
}


function buildNPCList(npcs) {
  const list = document.getElementById('npc-list');
  list.innerHTML = '';
  npcs.forEach((id) => {
    const npc = loader.get('npcs', id);
    if (!npc) return;
    const btn = document.createElement('button');
    btn.className = 'npc-btn text-xs';
    if (isQuestGiver(id)) btn.classList.add('quest');
    btn.textContent = `${npc.name} (${npc.role})`;
    btn.onclick = () => selectTarget('npc', id, btn);
    btn.ondblclick = () => showNpcMenu(id);
    list.append(btn);
  });
}

function buildNodeList(nodes) {
  const list = document.getElementById('node-list');
  list.innerHTML = '';
  (nodes || []).forEach((id) => {
    const node = loader.get('nodes', id);
    if (!node) return;
    const btn = document.createElement('button');
    btn.className = `node-btn text-xs ${node.color || ''}`;
    btn.textContent = node.name;
    btn.onclick = () => selectTarget('node', id, btn);
    list.append(btn);
  });
}

function buildMobList(mobs, groups = []) {
  const list = document.getElementById('mob-list');
  list.innerHTML = '';
  const groupedIds = new Set(groups.flat());
  groups.forEach((grp) => {
    const mob = loader.data.mobs[grp[0]];
    if (!mob) return;
    const btn = document.createElement('button');
    btn.className = 'mob-btn text-xs';
    const diff = mob.level - game.player.level;
    let color = '';
    if (Math.abs(diff) > 2) color = 'text-red-600';
    else if (diff > 0) color = 'text-yellow-400';
    else if (diff < 0) color = 'text-blue-600';
    if (color) btn.classList.add(color);
    btn.textContent = `${mob.name} (group of ${grp.length})`;
    if (mob.inCombat) btn.classList.add('pulse');
    btn.onclick = () => selectTarget('mob', grp[0], btn, grp);
    list.append(btn);
  });
  mobs.forEach((id) => {
    if (groupedIds.has(id)) return;
    const mob = loader.data.mobs[id];
    if (!mob) return;
    const btn = document.createElement('button');
    btn.className = 'mob-btn text-xs';
    const diff = mob.level - game.player.level;
    let color = '';
    if (Math.abs(diff) > 2) color = 'text-red-600';
    else if (diff > 0) color = 'text-yellow-400';
    else if (diff < 0) color = 'text-blue-600';
    if (color) btn.classList.add(color);
    btn.textContent = mob.name;
    if (mob.inCombat) btn.classList.add('pulse');
    btn.onclick = () => selectTarget('mob', id, btn);
    list.append(btn);
  });
}

function buildActionsPanel(loc) {
  const panel = document.getElementById('actions-panel');
  if (!panel) return;
  panel.innerHTML = '';
  const actions = [];
  if ((loc.npcs || []).length) {
    actions.push('talk');
    const hasTrader = loc.npcs.some((nid) => {
      const role = loader.get('npcs', nid)?.role?.toLowerCase() || '';
      return role.includes('trader') || role.includes('merchant') || role.includes('barkeep');
    });
    if (hasTrader) actions.push('trade');
  }
  if ((loc.spawns || []).length) actions.push('attack');
  if ((loc.nodes || []).length) actions.push('search');
  actions.forEach((act) => {
    const btn = document.createElement('button');
    btn.className = 'btn text-xs';
    btn.textContent = act.charAt(0).toUpperCase() + act.slice(1);
    if (act === 'talk') {
      btn.onclick = () => {
        if (game.target && game.target.type === 'npc') talkToNpc(game.target.id);
        else addLog('Select an NPC to talk to.');
      };
    } else if (act === 'attack') {
      btn.onclick = () => {
        if (game.target && game.target.type === 'mob') startCombat(game.target.id);
        else if (game.target && game.target.type === 'npc') attackNpc(game.target.id);
        else addLog('Select a valid target first.');
      };
    } else if (act === 'search') {
      btn.onclick = () => {
        if (game.target && game.target.type === 'node') {
          addLog(`You search the ${game.target.name}.`);
        } else {
          addLog('Nothing to search here.');
        }
      };
    } else if (act === 'trade') {
      btn.onclick = () => {
        if (game.target && game.target.type === 'npc') {
          const npc = loader.get('npcs', game.target.id);
          addLog(`You trade with ${npc?.name || game.target.id}.`);
        } else {
          addLog('Select a trader to trade with.');
        }
      };
    }
    panel.append(btn);
  });
}

function targetByName(name) {
  const loc = loader.data.locations[game.player.location];
  const lower = name.toLowerCase();
  const npc = loc.npcs.find((nid) => loader.get('npcs', nid)?.name.toLowerCase() === lower);
  if (npc) {
    selectTarget('npc', npc);
    return true;
  }
  const node = (loc.nodes || []).find((nid) => loader.get('nodes', nid)?.name.toLowerCase() === lower);
  if (node) {
    selectTarget('node', node);
    return true;
  }
  const mob = loc.spawns.find((mid) => loader.data.mobs[mid]?.name.toLowerCase() === lower);
  if (mob) {
    game.target = { ...loader.data.mobs[mob] };
    updateHUD();
    return true;
  }
  return false;
}


function castSpell(id) {
  if (!abilityAllowed(id)) return;
  const spell = loader.data.abilities[id];
  if (!spell) return;
  addLog(`You cast ${spell.name}.`);
}

function buildHotbar() {
  const bar = document.getElementById('hotbar');
  const abil = getAvailableAbilities();
  bar.innerHTML = '';
  abil.slice(0, 10).forEach((id) => {
    const btn = document.createElement('button');
    btn.className = 'btn text-xs';
    btn.textContent = loader.data.abilities[id].name;
    btn.onclick = () => castSpell(id);
    bar.append(btn);
  });
}

function showHelp() {
  addLog('Commands:');
  addLog(' Use arrow keys, WASD or buttons to move');
  addLog(' /attack - attack a nearby mob');
  addLog(' hail - speak to your target');
  addLog(' /target <name> - target an NPC or object by name');
  addLog(' /group invite <name> - invite player to party');
  addLog(' /leave - leave your party');
  addLog(' /kick <name> - remove member from party');
  addLog(' /friends list - list your friends');
  addLog(' /guild create <name> - create a guild');
  addLog(' /guild members - list members of your guild');
  addLog(' /g <msg> - guild chat');
  addLog(' /help - show this help');
}

function showFactions() {
  addLog('Faction Standings:');
  Object.entries(game.player.reputation).forEach(([f, v]) => {
    addLog(` ${f}: ${v}`);
  });
}
function useItem(idx) {
  const id = game.player.inventory[idx];
  const item = loader.data.items[id];
  if (!item) return;
  if (item.heal) {
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + item.heal);
    addLog(`You use ${item.name} and recover ${item.heal} HP.`);
    game.player.inventory.splice(idx, 1);
  } else if (item.mana) {
    game.player.mp = Math.min(game.player.maxMp, game.player.mp + item.mana);
    addLog(`You use ${item.name} and recover ${item.mana} MP.`);
    game.player.inventory.splice(idx, 1);
  } else if (item.slot) {
    game.player.equipped[item.slot] = id;
    addLog(`You equip ${item.name}.`);
  }
  updateHUD();
  buildInventory();
}

function dropItem(idx) {
  const id = game.player.inventory.splice(idx, 1)[0];
  if (id) addLog(`You drop ${loader.data.items[id]?.name || id}.`);
  buildInventory();
}

function buildInventory() {
  const inv = document.getElementById('inv');
  const coins = `${game.player.coins.gold}g ${game.player.coins.silver}s ${game.player.coins.copper}c`;
  inv.innerHTML = `<h2 class="text-lg mb-2">Inventory</h2><div class="mb-2">Coins: ${coins}</div>`;
  const list = document.createElement('ul');
  game.player.inventory.forEach((id, idx) => {
    const li = document.createElement('li');
    li.className = 'mb-1 flex items-center gap-2';
    const span = document.createElement('span');
    span.textContent = loader.data.items[id]?.name || id;
    if (loader.data.items[id]?.description) span.title = loader.data.items[id].description;
    li.append(span);
    const useBtn = document.createElement('button');
    useBtn.className = 'btn text-xs';
    useBtn.textContent = 'Use';
    useBtn.onclick = () => useItem(idx);
    li.append(useBtn);
    const dropBtn = document.createElement('button');
    dropBtn.className = 'btn text-xs';
    dropBtn.textContent = 'Drop';
    dropBtn.onclick = () => dropItem(idx);
    li.append(dropBtn);
    list.append(li);
  });
  inv.append(list);
}

function completeQuest(qid) {
  const idx = game.player.activeQuests.indexOf(qid);
  if (idx === -1) return;
  game.player.activeQuests.splice(idx, 1);
  game.player.completedQuests.push(qid);
  delete game.player.questProgress[qid];
  const q = loader.data.quests[qid];
  if (q?.faction) {
    adjustReputation(q.faction, 10);
    const opp = opposingFaction(q.faction);
    if (opp) adjustReputation(opp, -5);
  }
  addLog(`Quest completed: ${loader.data.quests[qid].name}`);
  if (game.player.completedQuests.length === 1) {
    unlockAchievement('first_dungeon_clear');
  }
  buildQuestList();
}

function advanceQuestStage(qid) {
  const q = loader.data.quests[qid];
  const prog = game.player.questProgress[qid];
  if (!q || !prog) return;
  const stage = q.stages[prog.stage];
  grantRewards(stage.rewards);
  if (prog.stage < q.stages.length - 1) {
    prog.stage += 1;
    prog.count = 0;
    addLog(`Quest updated: ${q.name} - ${q.stages[prog.stage].description}`);
    buildQuestList();
  } else {
    completeQuest(qid);
  }
}

function checkQuestProgress(type, id) {
  game.player.activeQuests.forEach((qid) => {
    const q = loader.data.quests[qid];
    const prog = game.player.questProgress[qid];
    if (!q || !prog) return;
    const stage = q.stages[prog.stage];
    const obj = stage.objective;
    if (type === 'kill' && obj.kill === id) {
      prog.count = (prog.count || 0) + 1;
      if (prog.count >= (obj.count || 1)) advanceQuestStage(qid);
    } else if (type === 'talk' && obj.talk === id) {
      advanceQuestStage(qid);
    } else if (type === 'location' && obj.location === id) {
      advanceQuestStage(qid);
    } else if (type === 'item' && obj.item === id) {
      prog.count = (prog.count || 0) + 1;
      if (prog.count >= (obj.count || 1)) advanceQuestStage(qid);
    }
  });
}

function buildQuestList() {
  const qpanel = document.getElementById('quests');
  qpanel.innerHTML = '<h2 class="text-lg mb-2">Active Quests</h2>';
  const activeList = document.createElement('ul');
  game.player.activeQuests.forEach((qid) => {
    const q = loader.data.quests[qid];
    if (!q) return;
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'underline text-sky-400';
    btn.textContent = q.name;
    btn.onclick = () => showQuestDetails(qid);
    li.append(btn);
    activeList.append(li);
  });
  qpanel.append(activeList);

  const compTitle = document.createElement('h2');
  compTitle.className = 'text-lg mb-2 mt-4';
  compTitle.textContent = 'Completed Quests';
  qpanel.append(compTitle);
  const compList = document.createElement('ul');
  game.player.completedQuests.forEach((qid) => {
    const q = loader.data.quests[qid];
    if (!q) return;
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'underline text-slate-400 line-through';
    btn.textContent = q.name;
    btn.onclick = () => showQuestDetails(qid);
    li.append(btn);
    compList.append(li);
  });
  qpanel.append(compList);
  const details = document.createElement('div');
  details.id = 'quest-details';
  details.className = 'mt-4 text-sm';
  details.textContent = 'Select a quest to see details.';
  qpanel.append(details);
}

function formatObjective(obj) {
  if (obj.item) {
    const itm = loader.data.items[obj.item]?.name || obj.item;
    return `Collect ${obj.count || 1} ${itm}`;
  }
  if (obj.kill) {
    const mob = loader.data.mobs[obj.kill]?.name || obj.kill;
    return `Defeat ${obj.count || 1} ${mob}`;
  }
  if (obj.talk) {
    const npc = loader.get('npcs', obj.talk)?.name || obj.talk;
    return `Speak with ${npc}`;
  }
  if (obj.location) {
    const loc = loader.data.locations[obj.location]?.name || obj.location;
    return `Travel to ${loc}`;
  }
  return '';
}

function showQuestDetails(qid) {
  const q = loader.data.quests[qid];
  if (!q) return;
  const giver = loader.get('npcs', q.giver)?.name || q.giver;
  const prog = game.player.questProgress[qid];
  const stageIdx = game.player.completedQuests.includes(qid)
    ? q.stages.length - 1
    : prog?.stage || 0;
  const stage = q.stages[stageIdx];
  const objective = formatObjective(stage.objective);
  const rewards = [];
  const sr = stage.rewards || {};
  if (sr.xp) rewards.push(`${sr.xp} XP`);
  (sr.items || []).forEach((i) => rewards.push(loader.data.items[i]?.name || i));
  if (stageIdx === q.stages.length - 1) {
    if (q.rewards?.xp) rewards.push(`${q.rewards.xp} XP`);
    (q.rewards?.items || []).forEach((i) =>
      rewards.push(loader.data.items[i]?.name || i)
    );
  }
  const details = document.getElementById('quest-details');
  details.innerHTML = `
    <h3 class="text-md font-bold mb-1">${q.name}</h3>
    <p class="mb-1">${stage.description}</p>
    <p class="mb-1"><strong>Objective:</strong> ${objective}</p>
    <p class="mb-1"><strong>Reward:</strong> ${rewards.join(', ') || 'None'}</p>
    <p class="mb-1"><strong>Turn in:</strong> ${giver}</p>
  `;
}

function getLoreTitle(key) {
  const [type, id] = key.split('-', 2);
  const map = { zone: 'zones', boss: 'bosses', relic: 'relics' };
  return loader.data.lore?.[map[type]]?.[id]?.title || '';
}

function unlockLore(key) {
  if (!game.player.codex.includes(key)) {
    game.player.codex.push(key);
    saveCharacter(game.player);
    const title = getLoreTitle(key);
    if (title) addLog(`Codex updated: ${title}`);
  }
}

function discoverZone(locId) {
  const zone = locId.split('_')[0];
  if (loader.data.lore?.zones?.[zone]) unlockLore(`zone-${zone}`);
}

function discoverBoss(mobId) {
  if (loader.data.lore?.bosses?.[mobId]) unlockLore(`boss-${mobId}`);
}

function discoverRelic(itemId) {
  if (loader.data.lore?.relics?.[itemId]) unlockLore(`relic-${itemId}`);
}

function buildCodexPanel() {
  const panel = document.getElementById('codex');
  panel.innerHTML = '<h2 class="text-lg mb-2">Codex</h2>';
  const book = document.createElement('div');
  book.className = 'codex-book space-y-4 overflow-y-auto max-h-[70vh]';
  if (!game.player.codex.length) {
    book.textContent = 'You have not discovered any lore yet.';
  } else {
    game.player.codex.forEach((key) => {
      const [type, id] = key.split('-', 2);
      const map = { zone: 'zones', boss: 'bosses', relic: 'relics' };
      const entry = loader.data.lore?.[map[type]]?.[id];
      if (!entry) return;
      const art = document.createElement('article');
      const h3 = document.createElement('h3');
      h3.className = 'font-bold text-lg mb-1';
      h3.textContent = entry.title;
      const p = document.createElement('p');
      p.textContent = entry.text;
      art.append(h3, p);
      book.append(art);
    });
  }
  panel.append(book);
}

function findPath(start, end) {
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const node = path[path.length - 1];
    if (node === end) return path;
    const loc = loader.data.locations[node];
    if (!loc) {
      console.warn('findPath: unknown location', node);
      continue;
    }
    const links = loc.links || {};
    Object.values(links).forEach((n) => {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push([...path, n]);
      }
    });
    (loc.boats || []).forEach((n) => {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push([...path, n]);
      }
    });
  }
  return null;
}

function buildMap() {
  const map = document.getElementById('map');
  map.innerHTML = '<h2 class="text-lg mb-2">World Map</h2>';
  const list = document.createElement('ul');
  Object.entries(loader.data.locations).forEach(([id, loc]) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'underline text-sky-400';
    btn.textContent = loc.name;
    btn.onclick = () => {
      const path = findPath(game.player.location, id);
      if (path) {
        addLog(`Route to ${loc.name}: ${path.join(' -> ')}`);
      }
    };
    li.append(btn);
    list.append(li);
  });
  map.append(list);
}

async function buildGraph() {
  const panel = document.getElementById('graph');
  panel.innerHTML = '<h2 class="text-lg mb-2">World Graph</h2><svg width="600" height="600"></svg>';
  const graph = await fetchJson('data/map.json');
  const nodes = Object.keys(graph).map((id) => ({ id, name: loader.data.locations[id]?.name || id }));
  const links = [];
  Object.entries(graph).forEach(([src, exits]) => {
    Object.values(exits).forEach((dest) => links.push({ source: src, target: dest }));
  });
  const svg = d3.select(panel.querySelector('svg'));
  const sim = d3
    .forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d) => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(300, 300));
  const link = svg
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke', '#999');
  const node = svg
    .selectAll('circle')
    .data(nodes)
    .enter()
    .append('circle')
    .attr('r', 5)
    .attr('fill', '#60a5fa')
    .call(
      d3
        .drag()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );
  const label = svg
    .selectAll('text')
    .data(nodes)
    .enter()
    .append('text')
    .attr('font-size', '10px')
    .attr('dx', 8)
    .attr('dy', '.35em')
    .text((d) => d.name);
  sim.on('tick', () => {
    link
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);
    node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
    label.attr('x', (d) => d.x).attr('y', (d) => d.y);
  });
}

function craftItem(rid) {
  const recipe = loader.data.recipes[rid];
  if (!recipe) return;
  const prof = recipe.profession;
  if (!game.player.professions.includes(prof)) {
    addLog('You have not learned that profession.');
    return;
  }
  const mats = recipe.materials;
  for (const [mat, qty] of Object.entries(mats)) {
    const count = game.player.inventory.filter((i) => i === mat).length;
    if (count < qty) {
      addLog('Missing materials.');
      return;
    }
  }
  for (const [mat, qty] of Object.entries(mats)) {
    let remaining = qty;
    for (let i = game.player.inventory.length - 1; i >= 0 && remaining > 0; i--) {
      if (game.player.inventory[i] === mat) {
        game.player.inventory.splice(i, 1);
        remaining--;
      }
    }
  }

  const skill = game.player.crafting[prof] || 0;
  const successChance = Math.min(0.95, Math.max(0.05, 0.5 + (skill - recipe.difficulty) / 100));
  const critChance = Math.max(0, Math.min(0.3, 0.05 + (skill - recipe.difficulty) / 200));
  const success = Math.random() < successChance;
  let resultId = recipe.result;
  if (success) {
    if (Math.random() < critChance) {
      const base = loader.data.items[resultId];
      const uid = `crit_${resultId}_${Date.now()}_${rand(1000)}`;
      loader.data.items[uid] = { ...base };
      loader.data.items[uid].name = `Masterwork ${base.name}`;
      if (base.damage) loader.data.items[uid].damage = Math.ceil(base.damage * 1.2);
      if (base.armor) loader.data.items[uid].armor = Math.ceil(base.armor * 1.2);
      resultId = uid;
      addLog('Critical success!');
    }
    game.player.inventory.push(resultId);
    addLog(`You craft ${loader.data.items[resultId].name}.`);
    game.player.crafting[prof] += recipe.xp;
    checkQuestProgress('item', resultId);
  } else {
    addLog('Crafting failed.');
    game.player.crafting[prof] += Math.floor(recipe.xp / 2);
  }
  buildInventory();
}

function showRecipes(prof) {
  const div = document.getElementById('recipe-list');
  const xp = game.player.crafting[prof] || 0;
  div.innerHTML = `<h3 class="font-bold mb-1">${loader.data.professions[prof].name} (XP ${xp})</h3>`;
  Object.entries(loader.data.recipes)
    .filter(([, r]) => r.profession === prof)
    .forEach(([rid, r]) => {
      const btn = document.createElement('button');
      const req = Object.entries(r.materials)
        .map(([m, q]) => `${q} ${loader.data.items[m].name}`)
        .join(', ');
      btn.className = 'btn text-xs mt-1';
      btn.textContent = `Craft ${loader.data.items[r.result].name} (${req})`;
      if (!game.player.professions.includes(prof)) btn.disabled = true;
      btn.onclick = () => craftItem(rid);
      div.append(btn);
    });
}

function buildCraftPanel(target = 'craft') {
  const panel = document.getElementById(target);
  panel.innerHTML = '<h2 class="text-lg mb-2">Crafting</h2>';
  const list = document.createElement('ul');
  Object.entries(loader.data.professions).forEach(([pid, prof]) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'underline text-sky-400';
    const trained = game.player.professions.includes(pid) ? '' : ' (untrained)';
    btn.textContent = prof.name + trained;
    btn.onclick = () => showRecipes(pid);
    li.append(btn);
    list.append(li);
  });
  panel.append(list);
  const div = document.createElement('div');
  div.id = 'recipe-list';
  panel.append(div);
}

async function handleInput(text) {
  const cmd = text.trim();
  console.log('Input:', cmd);
  if (['n', 's', 'e', 'w'].includes(cmd)) {
    move(cmd);
  } else if (cmd.startsWith('/goto ')) {
    const target = cmd.slice(6);
    const loc = loader.data.locations[game.player.location];
    const linkDest = Object.values(loc.links || {}).find((v) => v === target);
    const boatDest = (loc.boats || []).find((v) => v === target);
    if (linkDest || boatDest) await enterRoom(target);
  } else if (cmd.startsWith('/attack')) {
    const mob = loader.data.locations[game.player.location].spawns[0];
    if (mob) startCombat(mob);
  } else if (cmd.startsWith('/target')) {
    const name = cmd.slice(7).trim();
    if (!targetByName(name)) addLog('No such target here.');
  } else if (cmd.startsWith('/inspect')) {
    const name = cmd.split(' ')[1];
    inspectPlayer(name || game.player.name);
  } else if (cmd.startsWith('/gear')) {
    const name = cmd.split(' ')[1];
    inspectPlayer(name || game.player.name);
  } else if (cmd === 'hail') {
    if (!game.target) {
      addLog('You have no target.');
    } else if (game.target.type === 'npc') {
      talkToNpc(game.target.id);
    } else if (game.target.dialogue) {
      addLog(game.target.dialogue[0]);
    } else {
      addLog('Nothing happens.');
    }
  } else if (cmd === '/help') {
    showHelp();
  } else if (cmd === '/who') {
    addLog(`Online: ${game.onlinePlayers.join(', ')}`);
  } else if (cmd === '/factions') {
    showFactions();
  } else if (cmd.startsWith('/random')) {
    const [, type] = cmd.split(' ');
    if (type === 'item') {
      const id = generateRandomItem(game.player.level);
      game.player.inventory.push(id);
      addLog(`You receive ${loader.data.items[id].name}.`);
      if (loader.data.items[id]?.relic) discoverRelic(id);
    } else if (type === 'mob') {
      const mob = getRandomMobForZone() || { id: generateRandomMob(game.player.level) };
      startCombat(mob.id);
    } else if (type === 'quest') {
      const qid = generateRandomQuest(game.player.level);
      game.player.activeQuests.push(qid);
      addLog(`New quest added: ${loader.data.quests[qid].name}`);
    } else {
      addLog('Usage: /random item|mob|quest');
    }
  } else if (cmd.startsWith('/group invite')) {
    const name = cmd.slice(13).trim();
    if (!name) {
      addLog('Usage: /group invite <player>');
    } else if (game.player.party.length >= 6) {
      addLog('Your party is full.');
    } else if (!game.player.party.includes(name)) {
      game.player.party.push(name);
      addLog(`You invite ${name} to your party.`);
      updatePartyPanel();
      saveCharacter(game.player);
    }
  } else if (cmd === '/leave') {
    if (game.player.party.length) {
      game.player.party = [];
      addLog('You leave the party.');
      updatePartyPanel();
      saveCharacter(game.player);
    } else {
      addLog('You are not in a party.');
    }
  } else if (cmd.startsWith('/kick ')) {
    const name = cmd.slice(6).trim();
    const idx = game.player.party.indexOf(name);
    if (idx !== -1) {
      game.player.party.splice(idx, 1);
      addLog(`${name} has been removed from the party.`);
      updatePartyPanel();
      saveCharacter(game.player);
    } else {
      addLog('No such party member.');
    }
  } else if (cmd === '/friends list') {
    const list = game.player.friends;
    if (list.length) addLog(`Friends: ${list.join(', ')}`);
    else addLog('You have no friends.');
  } else if (cmd.startsWith('/guild create')) {
    const name = cmd.slice(14).trim();
    if (!name) {
      addLog('Usage: /guild create <name>');
    } else if (loader.data.guilds[name]) {
      addLog('Guild already exists.');
    } else {
      loader.data.guilds[name] = { name, members: [game.player.name] };
      game.player.guild = name;
      saveGuilds();
      saveCharacter(game.player);
      addLog(`Guild ${name} created.`);
    }
  } else if (cmd === '/guild members') {
    const gname = game.player.guild;
    if (gname && loader.data.guilds[gname]) {
      addLog(`Guild members: ${loader.data.guilds[gname].members.join(', ')}`);
    } else {
      addLog('You are not in a guild.');
    }
  } else if (cmd.startsWith('/g ')) {
    const msg = cmd.slice(3);
    if (!game.player.guild) {
      addLog('You are not in a guild.');
    } else {
      ws.send('chat', { channel: 'guild', msg: `${game.player.name}: ${msg}` });
    }
  } else if (cmd.startsWith('/title')) {
    const [, title] = cmd.split(' ', 2);
    if (!title) {
      addLog(`Titles: ${game.player.achievements.titles.join(', ')}`);
    } else if (game.player.achievements.titles.includes(title)) {
      game.player.achievements.title = title;
      addLog(`Title set to ${title}`);
    } else {
      addLog('You have not unlocked that title.');
    }
  } else if (cmd) {
    ws.send('chat', { channel: 'say', msg: `${game.player.name}: ${cmd}` });
  }
}

function bindUI() {
  console.log('Binding UI events');
  document.getElementById('send').onclick = () => {
    const inp = document.getElementById('cmd');
    handleInput(inp.value);
    inp.value = '';
  };
  document.getElementById('cmd').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('send').click();
  });
  ws.on('chat', (m) => {
    addLog(`[${m.channel}] ${m.msg}`);
    addChat(`[${m.channel}] ${m.msg}`);
  });
  ws.on('mob_spawn', ({ zoneId, mobId, mob }) => {
    loader.data.mobs[mobId] = mob;
    const loc = loader.data.locations[zoneId];
    if (loc && !loc.spawns.includes(mobId)) {
      loc.spawns.push(mobId);
      if (game.player.location === zoneId) buildMobList(loc.spawns);
    }
  });
  ws.on('mob_remove', ({ zoneId, mobId }) => {
    const loc = loader.data.locations[zoneId];
    if (loc) {
      loc.spawns = loc.spawns.filter((id) => id !== mobId);
      delete loader.data.mobs[mobId];
      if (game.player.location === zoneId) buildMobList(loc.spawns);
    }
  });
  document.querySelectorAll('button[data-panel]').forEach((btn) => {
    btn.onclick = () => showPanel(btn.dataset.panel);
  });
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.tab);
      panel.classList.remove('hidden');
      if (btn.dataset.tab === 'tab-craft') buildCraftPanel('craft-panel');
    };
  });
  const firstTab = document.querySelector('.tab-btn');
  if (firstTab) firstTab.click();
  document.getElementById('close-overlay').onclick = () => {
    document.getElementById('overlay').classList.add('hidden');
  };
  document.getElementById('move-controls').addEventListener('click', (e) => {
    const dir = e.target.dataset.dir;
    if (dir) move(dir);
  });
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const map = {
      ArrowUp: 'n',
      ArrowDown: 's',
      ArrowLeft: 'w',
      ArrowRight: 'e',
      w: 'n',
      a: 'w',
      s: 's',
      d: 'e',
      W: 'n',
      A: 'w',
      S: 's',
      D: 'e'
    };
    const dir = map[e.key];
    if (dir) {
      move(dir);
      e.preventDefault();
    }
  });
}

function populateSelect(id, data) {
  const sel = document.getElementById(id);
  Object.entries(data).forEach(([key, obj]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = obj.name;
    sel.append(opt);
  });
}

async function startGame(player) {
  console.log('Starting game for', player.name);
  game.player = player;
  document.getElementById('create-overlay').classList.add('hidden');
  saveCharacter(player);
  game.players = {};
  game.players[player.name] = player;
  game.onlinePlayers = [player.name, 'Hero', 'Adventurer', 'Mystic'];
  // create dummy player data for other names
  ['Hero', 'Adventurer', 'Mystic'].forEach((n) => {
    const equipped = {};
    ['weapon', 'chest', 'offhand'].forEach((slot) => {
      const items = Object.entries(loader.data.items).filter(([, it]) => it.slot === slot);
      if (items.length) equipped[slot] = items[Math.floor(Math.random() * items.length)][0];
    });
    game.players[n] = { name: n, location: player.location, equipped };
  });

  worldState.addPlayer(player);
  worldState.addPlayer({
    name: 'Hero',
    class: 'warrior',
    level: 5,
    location: 'greystone_hills',
    equipped: { weapon: 'bronze_sword', chest: 'leather_armor' }
  });
  worldState.addPlayer({
    name: 'Adventurer',
    class: 'ranger',
    level: 3,
    location: 'ashmoor_fields',
    equipped: { weapon: 'hunter_bow', chest: 'leather_armor' }
  });
  worldState.addPlayer({
    name: 'Mystic',
    class: 'mage',
    level: 8,
    location: 'howling_caverns',
    equipped: { weapon: 'druid_staff' }
  });

  game.onlinePlayers = worldState.getPlayerNames();
  updatePlayersList();
  updatePartyPanel();
  bindUI();
  buildHotbar();
  game.player.activeQuests.forEach((qid) => {
    if (!game.player.questProgress[qid]) {
      game.player.questProgress[qid] = { stage: 0, count: 0 };
    }
  });
  buildQuestList();
  const start = location.hash.slice(1) || game.player.location;
  await enterRoom(start);
  if (game.playTimer) clearInterval(game.playTimer);
  game.playTimer = setInterval(() => {
    game.player.achievements.playTime += 1;
    if (game.player.achievements.playTime >= 6000) {
      unlockAchievement('played_100_hours');
    }
    saveCharacter(game.player);
  }, 60000);
}

function showCreateForm() {
  console.log('Showing character creation form');
  populateSelect('race', loader.data.races);
  populateSelect('class', loader.data.classes);
  populateSelect('deity', loader.data.deities);
  document.getElementById('create-overlay').classList.remove('hidden');
  document.getElementById('create-form').onsubmit = async (e) => {
    e.preventDefault();
    const base = loader.data.attributes.base;
    const stats = {
      str: Number(document.getElementById('attr-str').value),
      dex: Number(document.getElementById('attr-dex').value),
      int: Number(document.getElementById('attr-int').value),
      wis: Number(document.getElementById('attr-wis').value),
      spi: Number(document.getElementById('attr-spi').value),
      vit: Number(document.getElementById('attr-vit').value)
    };
    const spent =
      stats.str - base.str +
      stats.dex - base.dex +
      stats.int - base.int +
      stats.wis - base.wis +
      stats.spi - base.spi +
      stats.vit - base.vit;
    if (spent !== base.points) {
      document.getElementById('points-err').classList.remove('hidden');
      return;
    }
    const race = document.getElementById('race').value;
    const clsId = document.getElementById('class').value;
    const clsDef = loader.data.classes[clsId];
    const player = {
      name:
        document.getElementById('first-name').value +
        ' ' +
        document.getElementById('last-name').value,
      class: clsId,
      race,
      deity: document.getElementById('deity').value,
      stats,
      hp: stats.vit * 5,
      maxHp: stats.vit * 5,
      mp: stats.spi * 4,
      maxMp: stats.spi * 4,
      location: loader.data.races[race].startLocation,
      inventory: ['rusty_sword', 'healing_potion'],
      equipped: { weapon: 'rusty_sword' },
      gearTypes: clsDef.gear || [],
      activeQuests: ['welcome_to_realm'],
      completedQuests: [],
      questProgress: {},
      party: [],
      professions: [],
      friends: [],
      guild: null,
      crafting: Object.fromEntries(
        Object.keys(loader.data.professions).map((p) => [p, 0])
      ),
      coins: { copper: 0, silver: 0, gold: 0 },
      xp: 0,
      achievements: { unlocked: [], titles: [], title: '', playTime: 0 }
    };
    await startGame(player);
  };
}

export async function init() {
  console.log('Initializing game...');
  await loader.init();
  console.log('Data loaded');
  await initEvents();
  loadGuilds();
  generateItems();
  bindUI();
  const saved = loadCharacter();
  if (saved) {
    await startGame(saved);
    console.log('Loaded saved character');
  } else {
    console.log('No saved character found, showing create form');
    showCreateForm();
  }
}

if (typeof window !== 'undefined') {
  init();
}
