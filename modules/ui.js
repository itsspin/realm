import { loader } from '../data/loader.js';
import { game } from './gameState.js';

export const updateHUD = () => {
  const p = game.player;
  if (!p) return;
  const nameEl = document.getElementById('player-name');
  if (nameEl) {
    const title = p.achievements.title ? ` ${p.achievements.title}` : '';
    nameEl.textContent = p.name + title;
  }
  const clsEl = document.getElementById('player-class');
  if (clsEl) clsEl.textContent = p.class;
  const lvlEl = document.getElementById('player-level');
  if (lvlEl) lvlEl.textContent = `Lv ${Math.floor((p.xp || 0) / 100) + 1}`;
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
  if (xpFill) xpFill.style.width = `${p.xp % 100}%`;
  const goldEl = document.getElementById('player-gold');
  if (goldEl) {
    goldEl.textContent = `${p.coins.gold}g ${p.coins.silver}s ${p.coins.copper}c`;
  }
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = `HP: ${p.hp}/${p.maxHp}\u2003MP: ${p.mp}/${p.maxMp}\u2003XP: ${p.xp}`;
  }
  updateTargetName();
};

export const updateTargetName = () => {
  const nameEl = document.getElementById('target-name');
  if (!nameEl) return;
  if (game.target) {
    const hp = game.target.hp != null ? ` (${game.target.hp} HP)` : '';
    nameEl.textContent = `${game.target.name}${hp}`;
    nameEl.onclick = () => {
      const tgt = game.target;
      const targetOfTarget = game.inCombat ? game.player.name : 'nobody';
      console.log(`${tgt.name} is targeting ${targetOfTarget}.`);
    };
  } else {
    nameEl.textContent = '—';
    nameEl.onclick = null;
  }
};

export const updateTargetPanel = () => {
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
      b.onclick = () => startCombat(mid); // startCombat defined in main.js
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
};

export const updateCombatUI = () => {
  const panel = document.getElementById('combat-info');
  if (!panel) return;
  if (!game.inCombat) {
    panel.classList.add('hidden');
    return;
  }
  const enemy = game.target;
  panel.classList.remove('hidden');
  panel.textContent = `${enemy.name} HP: ${enemy.hp} | Your HP: ${game.player.hp}`;
};
