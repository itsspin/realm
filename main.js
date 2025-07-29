import { loader } from './data/loader.js';
import { ws } from './websocket-stub.js';
import { initEvents } from './events.js';

const game = {
  player: null,
  target: null,
  combatTimer: 0,
  inCombat: false,
  onlinePlayers: []
};

function saveCharacter(p) {
  localStorage.setItem('player', JSON.stringify(p));
}

function loadCharacter() {
  const data = localStorage.getItem('player');
  if (!data) return null;
  const p = JSON.parse(data);
  p.completedQuests ||= [];
  p.questProgress ||= {};
  p.professions ||= [];
  p.coins ||= { copper: 0, silver: 0, gold: 0 };
  p.party ||= [];
  p.xp ||= 0;
  return p;
}
let currentTargetBtn = null;

function isQuestGiver(id) {
  return Object.values(loader.data.quests).some((q) => q.giver === id);
}

function rand(max) {
  return Math.floor(Math.random() * max) + 1;
}

function getPlayerLevel() {
  return Math.floor((game.player?.xp || 0) / 100) + 1;
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

function selectTarget(type, id, btn) {
  if (currentTargetBtn) currentTargetBtn.classList.remove('targeted');
  currentTargetBtn = btn || null;
  if (currentTargetBtn) currentTargetBtn.classList.add('targeted');
  if (type === 'npc') {
    game.target = { ...loader.get('npcs', id), id, type };
  } else if (type === 'node') {
    game.target = { ...loader.get('nodes', id), id, type };
  } else {
    game.target = null;
  }
  document.getElementById('dialogue').classList.add('hidden');
  updateHUD();
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

function updateHUD() {
  const p = game.player;
  const nameEl = document.getElementById('player-name');
  if (nameEl) nameEl.textContent = p.name;
  const hpEl = document.getElementById('player-hp');
  if (hpEl) hpEl.textContent = `HP: ${p.hp}/${p.maxHp}`;
  const xpEl = document.getElementById('player-xp');
  if (xpEl) xpEl.textContent = `XP: ${p.xp || 0}`;
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
}

function renderRoom(loc) {
  const log = document.getElementById('log');
  const npcNames = loc.npcs
    .map((id) => loader.get('npcs', id)?.name || id)
    .join(', ') || 'None';
  const mobNames = loc.spawns
    .map((id) => {
      const mob = loader.data.mobs[id];
      if (!mob) return id;
      const diff = mob.level - game.player.level;
      let color = 'text-white';
      if (diff <= -3) color = 'text-green-400';
      else if (diff <= -1) color = 'text-blue-400';
      else if (diff <= 0) color = 'text-white';
      else if (diff <= 2) color = 'text-yellow-400';
      else color = 'text-red-600';
      return `<span class="${color}">${mob.name}</span>`;
    })
    .join(', ') || 'None';
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
  buildMobList(loc.spawns);
  buildNodeList(loc.nodes);
  buildActionsPanel(loc);
}

async function enterRoom(id) {
  const loc = loader.data.locations[id];
  if (!loc) return;
  const ids = [...(loc.npcs || []), ...(loc.spawns || [])];
  await Promise.all(ids.map((nid) => loader.loadNpc(nid)));
  game.player.location = id;
  location.hash = id;
  renderRoom(loc);
  checkQuestProgress('location', id);
  updateHUD();
  updateLocationPanel();
}

async function move(dir) {
  const dest = loader.data.locations[game.player.location].links[dir];
  if (dest) await enterRoom(dest);
}


function updatePlayersList() {
  const list = document.getElementById('player-list');
  if (!list) return;
  list.innerHTML = '';
  game.onlinePlayers.forEach((p) => {
    const btn = document.createElement('button');
    btn.className = 'npc-btn text-xs';
    btn.textContent = p;
    list.append(btn);
  });
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
  if (!game.inCombat) return;
  const enemy = game.target;
  document.getElementById('combat-enemy').textContent = enemy.name;
  document.getElementById('combat-stats').textContent =
    `Enemy HP: ${enemy.hp} | Your HP: ${game.player.hp}`;
}

function endCombat(win) {
  const mob = game.target;
  game.inCombat = false;
  game.target = null;
  document.getElementById('combat-overlay').classList.add('hidden');
  if (win) {
    addLog(`${mob.name} dies.`);
    const loot = dropLoot(mob);
    game.player.coins.copper += loot.copper;
    game.player.coins.silver += loot.silver;
    game.player.coins.gold += loot.gold;
    loot.items.forEach((id) => {
      game.player.inventory.push(id);
      addLog(`You loot ${loader.data.items[id].name}.`);
      checkQuestProgress('item', id);
    });
    if (loot.copper || loot.silver || loot.gold) {
      addLog(`You loot ${loot.gold}g ${loot.silver}s ${loot.copper}c.`);
    }
    showLoot(loot);
    checkQuestProgress('kill', mob.id);
  } else {
    addLog('You have been slain!');
  }
  updateHUD();
}

function enemyAttack() {
  const mob = game.target;
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
  game.target = { ...data, id: targetId };
  game.inCombat = true;
  document.getElementById('combat-log').innerHTML = '';
  document.getElementById('combat-overlay').classList.remove('hidden');
  const btns = document.getElementById('combat-buttons');
  btns.innerHTML = '';
  const abil = getAvailableAbilities();
  abil.forEach((id) => {
    const b = document.createElement('button');
    b.className = 'btn text-xs';
    b.textContent = loader.data.abilities[id].name;
    b.onclick = () => useAbility(id);
    btns.append(b);
  });
  updateCombatUI();
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
  const line = npc.dialogue?.[0] || '...';
  addLog(`${npc.name} says: "${line}"`);
  checkQuestProgress('talk', id);
  document.getElementById('dialogue').classList.add('hidden');
}

function showNpcMenu(id) {
  const npc = loader.get('npcs', id);
  if (!npc) return;
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
    btn.textContent = `Learn ${loader.data.crafting[prof].name}`;
    btn.onclick = () => {
      game.player.professions.push(prof);
      addLog(`You learn ${loader.data.crafting[prof].name}.`);
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

function buildMobList(mobs) {
  const list = document.getElementById('mob-list');
  list.innerHTML = '';
  mobs.forEach((id) => {
    const mob = loader.data.mobs[id];
    if (!mob) return;
    const btn = document.createElement('button');
    btn.className = 'mob-btn text-xs';
    const diff = mob.level - game.player.level;
    let color = '';
    if (diff <= -3) color = 'text-green-400';
    else if (diff <= -1) color = 'text-blue-400';
    else if (diff <= 0) color = '';
    else if (diff <= 2) color = 'text-yellow-400';
    else color = 'text-red-600';
    if (color) btn.classList.add(color);
    btn.textContent = mob.name;
    btn.onclick = () => startCombat(id);
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
  addLog(' /help - show this help');
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
  addLog(`Quest completed: ${loader.data.quests[qid].name}`);
  buildQuestList();
}

function advanceQuestStage(qid) {
  const q = loader.data.quests[qid];
  const prog = game.player.questProgress[qid];
  if (!q || !prog) return;
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
  if (q.rewards?.xp) rewards.push(`${q.rewards.xp} XP`);
  (q.rewards?.items || []).forEach((i) =>
    rewards.push(loader.data.items[i]?.name || i)
  );
  const details = document.getElementById('quest-details');
  details.innerHTML = `
    <h3 class="text-md font-bold mb-1">${q.name}</h3>
    <p class="mb-1">${stage.description}</p>
    <p class="mb-1"><strong>Objective:</strong> ${objective}</p>
    <p class="mb-1"><strong>Reward:</strong> ${rewards.join(', ') || 'None'}</p>
    <p class="mb-1"><strong>Turn in:</strong> ${giver}</p>
  `;
}

function findPath(start, end) {
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const node = path[path.length - 1];
    if (node === end) return path;
    const loc = loader.data.locations[node];
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
  const res = await fetch('data/map.json');
  const graph = await res.json();
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

function craftItem(prof, rid) {
  if (!game.player.professions.includes(prof)) {
    addLog('You have not learned that profession.');
    return;
  }
  const recipe = loader.data.crafting[prof].recipes[rid];
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
  game.player.inventory.push(recipe.result);
  addLog(`You craft ${loader.data.items[recipe.result].name}.`);
  checkQuestProgress('item', recipe.result);
  buildInventory();
}

function showRecipes(prof) {
  const div = document.getElementById('recipe-list');
  div.innerHTML = `<h3 class="font-bold mb-1">${loader.data.crafting[prof].name}</h3>`;
  Object.entries(loader.data.crafting[prof].recipes).forEach(([rid, r]) => {
    const btn = document.createElement('button');
    const req = Object.entries(r.materials)
      .map(([m, q]) => `${q} ${loader.data.items[m].name}`)
      .join(', ');
    btn.className = 'btn text-xs mt-1';
    btn.textContent = `Craft ${loader.data.items[r.result].name} (${req})`;
    if (!game.player.professions.includes(prof)) btn.disabled = true;
    btn.onclick = () => craftItem(prof, rid);
    div.append(btn);
  });
}

function buildCraftPanel() {
  const panel = document.getElementById('craft');
  panel.innerHTML = '<h2 class="text-lg mb-2">Crafting</h2>';
  const list = document.createElement('ul');
  Object.entries(loader.data.crafting).forEach(([pid, prof]) => {
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
  } else if (cmd.startsWith('/random')) {
    const [, type] = cmd.split(' ');
    if (type === 'item') {
      const id = generateRandomItem(game.player.level);
      game.player.inventory.push(id);
      addLog(`You receive ${loader.data.items[id].name}.`);
    } else if (type === 'mob') {
      const mobId = generateRandomMob(game.player.level);
      startCombat(mobId);
    } else if (type === 'quest') {
      const qid = generateRandomQuest(game.player.level);
      game.player.activeQuests.push(qid);
      addLog(`New quest added: ${loader.data.quests[qid].name}`);
    } else {
      addLog('Usage: /random item|mob|quest');
    }
  } else if (cmd) {
    ws.send('chat', { channel: 'say', msg: `${game.player.name}: ${cmd}` });
  }
}

function bindUI() {
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
  document.querySelectorAll('button[data-panel]').forEach((btn) => {
    btn.onclick = () => showPanel(btn.dataset.panel);
  });
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
  game.player = player;
  document.getElementById('create-overlay').classList.add('hidden');
  saveCharacter(player);
  game.onlinePlayers = ['Hero', 'Adventurer', 'Mystic'];
  updatePlayersList();
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
}

function showCreateForm() {
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
      coins: { copper: 0, silver: 0, gold: 0 },
      xp: 0
    };
    await startGame(player);
  };
}

export async function init() {
  await loader.init();
  await initEvents();
  generateItems();
  bindUI();
  const saved = loadCharacter();
  if (saved) {
    await startGame(saved);
  } else {
    showCreateForm();
  }
}

init();
