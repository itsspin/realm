import { loader } from './data/loader.js';
import { ws } from './websocket-stub.js';

const game = {
  player: null,
  target: null,
  combatTimer: 0,
  onlinePlayers: []
};

function isQuestGiver(id) {
  return Object.values(loader.data.quests).some((q) => q.giver === id);
}

function rand(max) {
  return Math.floor(Math.random() * max) + 1;
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
  log.innerHTML = `
    <h2 class="text-lg font-bold">${loc.name}</h2>
    <p>${loc.description}</p>
    <p><strong>Exits:</strong> ${loc.exits.join(', ')}</p>
    <p><strong>NPCs:</strong> ${npcNames}</p>
    <p><strong>Mobs:</strong> ${mobNames}</p>
  `;
  buildNPCList(loc.npcs);
}

function enterRoom(id) {
  const loc = loader.data.locations[id];
  if (!loc) return;
  game.player.location = id;
  location.hash = id;
  renderRoom(loc);
  updateHUD();
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
    });
    if (loot.copper || loot.silver || loot.gold) {
      addLog(
        `You loot ${loot.gold}g ${loot.silver}s ${loot.copper}c.`
      );
    }
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
        addLog(`Quest accepted: ${q.name}`);
        dlg.classList.add('hidden');
      }
    };
    qdiv.append(btn);
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
    btn.onclick = () => showNpcMenu(id);
    list.append(btn);
  });
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

function buildQuestList() {
  const qpanel = document.getElementById('quests');
  qpanel.innerHTML = '<h2 class="text-lg mb-2">Active Quests</h2>';
  const list = document.createElement('ul');
  game.player.activeQuests.forEach((qid) => {
    const q = loader.data.quests[qid];
    if (!q) return;
    const li = document.createElement('li');
    li.textContent = q.name;
    list.append(li);
  });
  qpanel.append(list);
}

function findPath(start, end) {
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const node = path[path.length - 1];
    if (node === end) return path;
    const links = loader.data.locations[node].links || {};
    Object.values(links).forEach((n) => {
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

function handleInput(text) {
  const cmd = text.trim();
  if (['n', 's', 'e', 'w'].includes(cmd)) {
    const dest = loader.data.locations[game.player.location].links[cmd];
    if (dest) enterRoom(dest);
  } else if (cmd.startsWith('/attack')) {
    const mob = loader.data.locations[game.player.location].spawns[0];
    if (mob) startCombat(mob);
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
}

export async function init() {
  await loader.init();
  generateItems();
  game.player = {
    name: 'Hero',
    class: 'warrior',
    race: 'human',
    level: 1,
    stats: { str: 10, dex: 8, int: 5, wis: 5, spi: 5, vit: 10 },
    hp: 50,
    maxHp: 50,
    mp: 20,
    maxMp: 20,
    location: loader.data.races.human.startLocation,
    inventory: ['rusty_sword', 'healing_potion'],
    coins: { gold: 0, silver: 0, copper: 0 },
    equipped: { weapon: 'rusty_sword' },
    activeQuests: ['welcome_to_realm'],
    party: []
  };
  game.onlinePlayers = ['Hero', 'Adventurer', 'Mystic'];
  updatePlayersList();
  bindUI();
  buildHotbar();
  const start = location.hash.slice(1) || game.player.location;
  enterRoom(start);
}

init();
