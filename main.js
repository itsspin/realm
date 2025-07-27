import { loader } from './data/loader.js';
import { ws } from './websocket-stub.js';

const game = {
  player: null,
  target: null,
  combatTimer: 0,
  onlinePlayers: []
};

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

    <p><strong>Mobs:</strong> ${loc.spawns.join(', ') || 'None'}</p>
    <p><strong>Objects:</strong> ${nodeNames}</p>
  `;
  buildNPCList(loc.npcs);
  buildNodeList(loc.nodes || []);
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

function targetByName(name) {
  const loc = loader.data.locations[game.player.location];
  const ids = [...loc.npcs, ...(loc.nodes || [])];
  for (const id of ids) {
    const ent = loader.get('npcs', id) || loader.get('nodes', id);
    if (ent && ent.name.toLowerCase().includes(name.toLowerCase())) {
      const type = loader.get('npcs', id) ? 'npc' : 'node';
      selectTarget(type, id);
      return true;
    }
  }
  return false;
}

function handleInput(text) {
  const cmd = text.trim();
  if (['n', 's', 'e', 'w'].includes(cmd)) {
    const dest = loader.data.locations[game.player.location].links[cmd];
    if (dest) enterRoom(dest);
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
