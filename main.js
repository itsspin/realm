import { loader } from './data/loader.js';
import { ws } from './websocket-stub.js';

const game = {
  player: null,
  target: null,
  combatTimer: 0,
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
  return p;
}
let currentTargetBtn = null;

function isQuestGiver(id) {
  return Object.values(loader.data.quests).some((q) => q.giver === id);
}

function rand(max) {
  return Math.floor(Math.random() * max) + 1;
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
  const types = [
    { id: 'sword', slot: 'weapon', name: 'Sword' },
    { id: 'axe', slot: 'weapon', name: 'Axe' },
    { id: 'mace', slot: 'weapon', name: 'Mace' },
    { id: 'cloth', slot: 'chest', name: 'Cloth Armor' },
    { id: 'leather', slot: 'chest', name: 'Leather Armor' }
  ];
  const t = types[rand(types.length) - 1];
  const rarity = randomRarity(level);
  const mult = { common: 1, uncommon: 1.2, rare: 1.5, epic: 2, legendary: 3 }[
    rarity
  ];
  const id = `gen_${t.id}_${Date.now()}_${rand(1000)}`;
  const item = {
    name: `${rarity} ${t.name}`,
    level,
    slot: t.slot,
    rarity
  };
  if (t.slot === 'weapon') item.damage = Math.floor(level * 0.8 * mult + 1);
  else item.armor = Math.floor(level * 0.5 * mult + 1);
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
  if (Math.random() < 0.5) {
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
  document.getElementById('status').textContent =
    `HP: ${p.hp}/${p.maxHp}  MP: ${p.mp}/${p.maxMp}`;
  document.getElementById('target').textContent =
    game.target ? `Target: ${game.target.name} (${game.target.hp}hp)` : 'Target: —';
  document.getElementById('party').textContent =
    `Party: ${p.party.join(', ') || '—'}`;
  const coins = `${p.coins.gold}g ${p.coins.silver}s ${p.coins.copper}c`;
  document.getElementById('currency').textContent = `Coins: ${coins}`;
}

function updateLocationPanel() {
  const loc = loader.data.locations[game.player.location];
  if (!loc) return;
  document.getElementById('location-name').textContent = loc.name;
  const dirs = { n: 'dir-n', e: 'dir-e', s: 'dir-s', w: 'dir-w' };
  Object.entries(dirs).forEach(([dir, id]) => {
    const btn = document.getElementById(id);
    const dest = loc.links?.[dir];
    if (dest) {
      btn.disabled = false;
      btn.dataset.dest = dest;
      btn.title = loader.data.locations[dest]?.name || dest;
    } else {
      btn.disabled = true;
      btn.dataset.dest = '';
      btn.title = '';
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

function showPanel(name) {
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  document.querySelectorAll('#overlay .panel').forEach((p) => p.classList.add('hidden'));
  document.getElementById(name).classList.remove('hidden');
  if (name === 'inv') buildInventory();
  if (name === 'quests') buildQuestList();
  if (name === 'map') buildMap();
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

function enterRoom(id) {
  const loc = loader.data.locations[id];
  if (!loc) return;
  game.player.location = id;
  location.hash = id;
  renderRoom(loc);
  checkQuestProgress('location', id);
  updateHUD();
  updateLocationPanel();
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

function getWeaponDamage() {
  const w = game.player.equipped.weapon;
  return loader.data.items[w]?.damage || 1;
}

function attackRound() {
  const player = game.player;
  const mob = game.target;
  if (!mob) return;
  const pdmg = rand(getWeaponDamage()) + player.stats.str;
  mob.hp -= pdmg;
  addLog(`You hit ${mob.name} for ${pdmg}.`);
  if (mob.hp <= 0) {
    addLog(`${mob.name} dies.`);
    clearInterval(game.combatTimer);
    game.target = null;
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
      addLog(
        `You loot ${loot.gold}g ${loot.silver}s ${loot.copper}c.`
      );
    }
    checkQuestProgress('kill', mob.id);
    updateHUD();
    return;
  }
  const mdmg = rand(mob.damage);
  player.hp -= mdmg;
  addLog(`${mob.name} hits you for ${mdmg}.`);
  if (player.hp <= 0) {
    addLog('You have been slain!');
    clearInterval(game.combatTimer);
    game.target = null;
  }
  updateHUD();
}

function startCombat(mobId) {
  game.target = { ...loader.data.mobs[mobId] };
  clearInterval(game.combatTimer);
  game.combatTimer = setInterval(attackRound, 2000);
  updateHUD();
  document.getElementById('dialogue').classList.add('hidden');
}

function attackNpc(id) {
  const npc = loader.get('npcs', id);
  if (npc && npc.hp) {
    game.target = { ...npc };
    clearInterval(game.combatTimer);
    game.combatTimer = setInterval(attackRound, 2000);
    updateHUD();
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
        game.player.questProgress[qid] = 0;
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
  const spell = loader.data.spells[id];
  if (!spell) return;
  addLog(`You cast ${spell.name}.`);
}

function buildHotbar() {
  const bar = document.getElementById('hotbar');
  const abil = loader.data.classes[game.player.class].starterAbilities;
  bar.innerHTML = '';
  abil.slice(0, 10).forEach((id) => {
    const btn = document.createElement('button');
    btn.className = 'btn text-xs';
    btn.textContent = loader.data.spells[id].name;
    btn.onclick = () => castSpell(id);
    bar.append(btn);
  });
}

function showHelp() {
  addLog('Commands:');
  addLog(' n,s,e,w - move');
  addLog(' /attack - attack a nearby mob');
  addLog(' hail - speak to your target');
  addLog(' /target <name> - target an NPC or object by name');
  addLog(' /help - show this help');
}
function buildInventory() {
  const inv = document.getElementById('inv');
  const coins = `${game.player.coins.gold}g ${game.player.coins.silver}s ${game.player.coins.copper}c`;
  inv.innerHTML = `<h2 class="text-lg mb-2">Inventory</h2><div class="mb-2">Coins: ${coins}</div>`;
  const list = document.createElement('ul');
  game.player.inventory.forEach((id) => {
    const li = document.createElement('li');
    li.textContent = loader.data.items[id]?.name || id;
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

function checkQuestProgress(type, id) {
  game.player.activeQuests.forEach((qid) => {
    const q = loader.data.quests[qid];
    if (!q) return;
    if (type === 'kill' && q.objective.kill === id) {
      game.player.questProgress[qid] = (game.player.questProgress[qid] || 0) + 1;
      if (game.player.questProgress[qid] >= q.objective.count) completeQuest(qid);
    } else if (type === 'talk' && q.objective.talk === id) {
      completeQuest(qid);
    } else if (type === 'location' && q.objective.location === id) {
      completeQuest(qid);
    } else if (type === 'item' && q.objective.item === id) {
      game.player.questProgress[qid] = (game.player.questProgress[qid] || 0) + 1;
      if (game.player.questProgress[qid] >= q.objective.count) completeQuest(qid);
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

function showQuestDetails(qid) {
  const q = loader.data.quests[qid];
  if (!q) return;
  const giver = loader.get('npcs', q.giver)?.name || q.giver;
  let objective = '';
  if (q.objective.item) {
    const itm = loader.data.items[q.objective.item]?.name || q.objective.item;
    objective = `Collect ${q.objective.count} ${itm}`;
  } else if (q.objective.kill) {
    const mob = loader.data.mobs[q.objective.kill]?.name || q.objective.kill;
    objective = `Defeat ${q.objective.count} ${mob}`;
  } else if (q.objective.talk) {
    const npc = loader.get('npcs', q.objective.talk)?.name || q.objective.talk;
    objective = `Speak with ${npc}`;
  } else if (q.objective.location) {
    const loc =
      loader.data.locations[q.objective.location]?.name || q.objective.location;
    objective = `Travel to ${loc}`;
  }
  const rewards = [];
  if (q.reward.xp) rewards.push(`${q.reward.xp} XP`);
  if (q.reward.item)
    rewards.push(loader.data.items[q.reward.item]?.name || q.reward.item);
  const details = document.getElementById('quest-details');
  details.innerHTML = `
    <h3 class="text-md font-bold mb-1">${q.name}</h3>
    <p class="mb-1">${q.description}</p>
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

function handleInput(text) {
  const cmd = text.trim();
  if (['n', 's', 'e', 'w'].includes(cmd)) {
    const dest = loader.data.locations[game.player.location].links[cmd];
    if (dest) enterRoom(dest);
  } else if (cmd.startsWith('/goto ')) {
    const target = cmd.slice(6);
    const loc = loader.data.locations[game.player.location];
    const linkDest = Object.values(loc.links || {}).find((v) => v === target);
    const boatDest = (loc.boats || []).find((v) => v === target);
    if (linkDest || boatDest) enterRoom(target);
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
  ['n', 'e', 's', 'w'].forEach((d) => {
    const btn = document.getElementById(`dir-${d}`);
    if (btn)
      btn.onclick = () => {
        const dest = btn.dataset.dest;
        if (dest) enterRoom(dest);
      };
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

function startGame(player) {
  game.player = player;
  document.getElementById('create-overlay').classList.add('hidden');
  saveCharacter(player);
  game.onlinePlayers = ['Hero', 'Adventurer', 'Mystic'];
  updatePlayersList();
  bindUI();
  buildHotbar();
  const start = location.hash.slice(1) || game.player.location;
  enterRoom(start);
}

function showCreateForm() {
  populateSelect('race', loader.data.races);
  populateSelect('class', loader.data.classes);
  populateSelect('deity', loader.data.deities);
  document.getElementById('create-overlay').classList.remove('hidden');
  document.getElementById('create-form').onsubmit = (e) => {
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
    const player = {
      name:
        document.getElementById('first-name').value +
        ' ' +
        document.getElementById('last-name').value,
      class: document.getElementById('class').value,
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
      activeQuests: ['welcome_to_realm'],
      completedQuests: [],
      questProgress: {},
      party: [],
      professions: [],
      coins: { copper: 0, silver: 0, gold: 0 }
    };
    startGame(player);
  };
}

export async function init() {
  await loader.init();
  generateItems();
  bindUI();
  const saved = loadCharacter();
  if (saved) {
    startGame(saved);
  } else {
    showCreateForm();
  }
}

init();
