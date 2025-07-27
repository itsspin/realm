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
  return data ? JSON.parse(data) : null;
}

function isQuestGiver(id) {
  return Object.values(loader.data.quests).some((q) => q.giver === id);
}

function rand(max) {
  return Math.floor(Math.random() * max) + 1;
}

function updateHUD() {
  const p = game.player;
  document.getElementById('status').textContent =
    `HP: ${p.hp}/${p.maxHp}  MP: ${p.mp}/${p.maxMp}`;
  document.getElementById('target').textContent =
    game.target ? `Target: ${game.target.name} (${game.target.hp}hp)` : 'Target: —';
  document.getElementById('party').textContent =
    `Party: ${p.party.join(', ') || '—'}`;
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
  inv.innerHTML = '<h2 class="text-lg mb-2">Inventory</h2>';
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
      party: []
    };
    startGame(player);
  };
}

export async function init() {
  await loader.init();
  bindUI();
  const saved = loadCharacter();
  if (saved) {
    startGame(saved);
  } else {
    showCreateForm();
  }
}

init();
