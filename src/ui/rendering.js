(function (global) {
  function updateNarrative() {
    const container = document.getElementById('narrativeContent');
    if (!container) return;

    const entries = global.Narrative?.getEntries() || [];
    
    container.innerHTML = entries.map(entry => {
      const typeClass = entry.type ? `narrative-entry--${entry.type}` : '';
      return `
        <div class="narrative-entry ${typeClass}">
          <div class="narrative-text">${entry.text}</div>
          ${entry.meta ? `<div class="narrative-meta">${entry.meta}</div>` : ''}
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  function updateZoneHeader() {
    const zone = global.Zones?.getCurrentZone();
    if (!zone) return;

    const nameEl = document.getElementById('zoneName');
    const descEl = document.getElementById('zoneDescription');
    
    if (nameEl) nameEl.textContent = zone.name;
    if (descEl) descEl.textContent = zone.description;
  }

  function updateCharacterPanel() {
    const player = global.State?.getPlayer();
    if (!player) return;

    const stats = player.stats || {};
    const level = player.level || 1;
    const xp = player.xp || 0;
    const xpToNext = player.xpToNext || 100;

    // Update name and level
    const nameEl = document.getElementById('characterName');
    const levelEl = document.getElementById('characterLevel');
    if (nameEl) nameEl.textContent = player.name || 'Wanderer';
    if (levelEl) levelEl.textContent = `Level ${level}`;

    // Update XP bar
    const xpBarEl = document.getElementById('xpBar');
    const xpTextEl = document.getElementById('xpText');
    if (xpBarEl) {
      const percent = Math.min(100, (xp / xpToNext) * 100);
      xpBarEl.style.width = `${percent}%`;
    }
    if (xpTextEl) {
      xpTextEl.textContent = `${xp} / ${xpToNext}`;
    }

    // Update stats
    const hpEl = document.getElementById('statHp');
    const atkEl = document.getElementById('statAtk');
    const defEl = document.getElementById('statDef');
    const goldEl = document.getElementById('statGold');

    if (hpEl) hpEl.textContent = `${stats.hp || 0} / ${stats.maxHp || 20}`;
    if (atkEl) {
      let atk = stats.atk || 5;
      // Apply equipment
      if (player.equipment?.weapon) {
        const item = global.REALM?.data?.itemsById?.[player.equipment.weapon];
        if (item?.stats?.atk) atk += item.stats.atk;
      }
      if (player.equipment?.charm) {
        const item = global.REALM?.data?.itemsById?.[player.equipment.charm];
        if (item?.stats?.all) atk += item.stats.all;
      }
      atkEl.textContent = atk;
    }
    if (defEl) {
      let def = stats.def || 2;
      if (player.equipment?.armor) {
        const item = global.REALM?.data?.itemsById?.[player.equipment.armor];
        if (item?.stats?.def) def += item.stats.def;
      }
      if (player.equipment?.charm) {
        const item = global.REALM?.data?.itemsById?.[player.equipment.charm];
        if (item?.stats?.all) def += item.stats.all;
      }
      defEl.textContent = def;
    }
    if (goldEl) goldEl.textContent = player.gold || 0;
  }

  function updateInventory() {
    const player = global.State?.getPlayer();
    if (!player) return;

    const gridEl = document.getElementById('inventoryGrid');
    if (!gridEl) return;

    const inventory = player.inventory || [];
    const slots = Array(20).fill(null).map((_, i) => inventory[i] || null);

    gridEl.innerHTML = slots.map((item, index) => {
      if (item) {
        const itemData = global.REALM?.data?.itemsById?.[item.itemId];
        const displayName = itemData?.name || item.itemId?.replace(/_/g, ' ') || 'Unknown';
        const icon = itemData?.icon || '📦';
        return `
          <div class="inventory-slot" data-item-id="${item.itemId}" title="${displayName}" data-slot-index="${index}">
            <span style="font-size: 1.2rem;">${icon}</span>
          </div>
        `;
      }
      return `<div class="inventory-slot inventory-slot--empty" data-slot-index="${index}"></div>`;
    }).join('');

    // Add click handlers
    gridEl.querySelectorAll('.inventory-slot[data-item-id]').forEach(slot => {
      slot.addEventListener('click', () => {
        const itemId = slot.dataset.itemId;
        // Show item tooltip or context menu
        // For now, just log
        console.log('Item clicked:', itemId);
      });
    });
  }

  function updateQuestLog() {
    const player = global.State?.getPlayer();
    if (!player) return;

    const questListEl = document.getElementById('questList');
    if (!questListEl) return;

    const activeQuests = (player.activeQuests || []).map(id => {
      return global.REALM?.data?.questsById?.[id];
    }).filter(Boolean);

    if (activeQuests.length === 0) {
      questListEl.innerHTML = '<p style="color: var(--fg-secondary); font-style: italic;">No active quests</p>';
      return;
    }

    questListEl.innerHTML = activeQuests.map(quest => {
      const progress = quest.progress || 0;
      const target = quest.targetCount || 1;
      return `
        <div class="quest-item">
          <div class="quest-title">${quest.title}</div>
          <div class="quest-description">${quest.description}</div>
          ${quest.type === 'kill' ? `<div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--fg-secondary);">Progress: ${progress}/${target}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function updateCombatUI() {
    const monster = global.Combat?.getCurrentMonster();
    const combatPanel = document.getElementById('combatPanel');
    const actionsEl = document.getElementById('combatActions');

    if (!monster) {
      if (combatPanel) combatPanel.classList.add('hidden');
      return;
    }

    if (combatPanel) combatPanel.classList.remove('hidden');

    const nameEl = document.getElementById('monsterName');
    const hpEl = document.getElementById('monsterHp');
    const hpBarEl = document.getElementById('monsterHpBar');

    if (nameEl) nameEl.textContent = monster.name;
    if (hpEl) hpEl.textContent = `${monster.hp} / ${monster.maxHp} HP`;
    if (hpBarEl) {
      const percent = (monster.hp / monster.maxHp) * 100;
      hpBarEl.style.width = `${percent}%`;
    }

    if (actionsEl) {
      const combatState = global.Combat?.getCombatState();
      const canAct = combatState?.playerTurn;
      
      actionsEl.innerHTML = `
        <button class="action-btn" ${!canAct ? 'disabled' : ''} onclick="global.Combat.playerAttack()">
          Attack
        </button>
        <button class="action-btn" onclick="global.Combat.flee()">
          Flee
        </button>
      `;
    }
  }

  function updateActionButtons() {
    const buttonsEl = document.getElementById('actionButtons');
    if (!buttonsEl) return;

    const inCombat = global.Combat?.isInCombat();
    if (inCombat) {
      buttonsEl.innerHTML = '';
      return;
    }

    const zone = global.Zones?.getCurrentZone();
    const availableZones = global.Zones?.getAvailableZones() || [];
    const player = global.State?.getPlayer();

    let html = '';

    // Explore/Encounter button
    html += `
      <button class="action-btn" onclick="global.handleExplore()">
        Explore the area
      </button>
    `;

    // Zone travel buttons
    if (availableZones.length > 1) {
      html += '<div style="margin-top: 1rem; padding-top: 1rem; border-top: var(--border-subtle);">';
      html += '<div style="font-size: 0.9rem; color: var(--fg-secondary); margin-bottom: 0.5rem;">Travel to:</div>';
      availableZones.forEach(zone => {
        if (zone.id !== player.currentZone) {
          html += `
            <button class="action-btn" onclick="global.Zones.changeZone('${zone.id}')">
              ${zone.name}
            </button>
          `;
        }
      });
      html += '</div>';
    }

    buttonsEl.innerHTML = html;
  }

  function updateResourceBar() {
    const resources = global.State?.data?.resources || {};
    const resBar = document.getElementById('resourceBar');
    if (!resBar) return;

    const resourceOrder = [
      { key: 'food', icon: '🍎', label: 'Food' },
      { key: 'ore', icon: '⛏️', label: 'Ore' },
      { key: 'timber', icon: '🪵', label: 'Timber' },
      { key: 'essence', icon: '✨', label: 'Essence' },
      { key: 'gold', icon: '🏆', label: 'Gold' }
    ];

    resBar.innerHTML = resourceOrder.map(({ key, icon, label }) => {
      const amount = resources[key] || 0;
      return `
        <div class="resource-item" title="${label}">
          <span class="resource-icon">${icon}</span>
          <span class="resource-amount">${amount.toLocaleString()}</span>
        </div>
      `;
    }).join('');
  }

  // Global explore handler
  global.handleExplore = function() {
    if (global.Combat?.isInCombat()) return;

    const monster = global.Zones?.getRandomMonster();
    if (monster) {
      global.Combat?.startCombat(monster.id);
    } else {
      global.Narrative?.addEntry({
        type: 'zone',
        text: 'You explore the area but find nothing of interest.',
        meta: ''
      });
    }
  };

  const Rendering = {
    updateNarrative,
    updateZoneHeader,
    updateCharacterPanel,
    updateInventory,
    updateQuestLog,
    updateCombatUI,
    updateActionButtons,
    updateResourceBar
  };

  global.Rendering = Rendering;
})(window);

