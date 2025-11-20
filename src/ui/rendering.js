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
    const currentTile = player?.currentTile ? global.Settlement?.getTile(player.currentTile.x, player.currentTile.y) : null;

    let html = '';

    // Explore/Encounter button
    html += `
      <button class="action-btn" onclick="window.handleExplore()">
        Explore the area
      </button>
    `;

    // Gathering actions if on a tile
    if (currentTile) {
      html += '<div class="gathering-actions">';
      html += '<div class="gathering-actions-title">Gathering</div>';
      
      if (currentTile.resources?.ore > 0) {
        html += `<button class="action-btn" onclick="global.Gathering.mine(global.Settlement.getTile(${currentTile.x}, ${currentTile.y}))">⛏️ Mine Ore</button>`;
      }
      if (currentTile.resources?.timber > 0) {
        html += `<button class="action-btn" onclick="global.Gathering.harvest(global.Settlement.getTile(${currentTile.x}, ${currentTile.y}))">🌿 Harvest Timber</button>`;
      }
      if (currentTile.resources?.food > 0 || currentTile.terrain === 'water') {
        html += `<button class="action-btn" onclick="global.Gathering.fish(global.Settlement.getTile(${currentTile.x}, ${currentTile.y}))">🎣 Fish</button>`;
      }
      if (currentTile.terrain === 'forest' || currentTile.terrain === 'plains') {
        html += `<button class="action-btn" onclick="global.Gathering.gatherEssence(global.Settlement.getTile(${currentTile.x}, ${currentTile.y}))">✨ Gather Essence</button>`;
      }
      
      // Settlement placement
      if (!currentTile.settlement && !currentTile.owner) {
        html += `<button class="action-btn" onclick="global.showSettlementPlacement(${currentTile.x}, ${currentTile.y})">🏰 Found Settlement</button>`;
      }
      
      html += '</div>';
    }

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

    // World Map button
    html += '<div style="margin-top: 1rem; padding-top: 1rem; border-top: var(--border-subtle);">';
    html += `<button class="action-btn" onclick="global.Rendering.showWorldMap()">🗺️ View World Map</button>`;
    
    // Guild actions
    if (player && !player.guild) {
      html += `<button class="action-btn" onclick="global.showGuildCreation()">⚔️ Create Guild</button>`;
    } else if (player && player.guild) {
      html += `<button class="action-btn" onclick="global.showGuildInfo()">⚔️ Guild: ${player.guild.name}</button>`;
    }
    
    html += '</div>';

    buttonsEl.innerHTML = html;
  }

  function updateSkillsPanel() {
    const player = global.State?.getPlayer();
    if (!player || !player.skills) return;

    // This will be called when skills update
    // Skills display can be added to character panel
  }

  function showWorldMap() {
    const worldMap = global.Settlement?.getWorldMap();
    if (!worldMap) return;

    const player = global.State?.getPlayer();
    const currentTile = player?.currentTile;

    const overlay = document.createElement('div');
    overlay.id = 'worldMapOverlay';
    overlay.className = 'character-creation-overlay';
    overlay.innerHTML = `
      <div class="creation-panel" style="max-width: 90vw; max-height: 90vh;">
        <h2 class="creation-title">World Map</h2>
        <div class="world-map-container">
          <div class="world-map-grid" id="worldMapGrid"></div>
        </div>
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; font-size: 0.85rem;">
          <span style="color: var(--fg-secondary);">Legend:</span>
          <span>🟩 Plains</span>
          <span>🟫 Forest</span>
          <span>🟨 Hills</span>
          <span>🟦 Water</span>
          <span>🟧 Desert</span>
          <span style="color: var(--gold-bright);">● Owned</span>
          <span style="color: var(--ember-orange);">● Settlement</span>
          <span style="color: var(--teal-bright);">● Your Location</span>
        </div>
        <button class="action-btn" onclick="document.getElementById('worldMapOverlay')?.remove()" style="margin-top: 1rem; width: 100%;">Close Map</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const grid = document.getElementById('worldMapGrid');
    if (!grid) return;

    const size = global.Settlement?.WORLD_SIZE || { width: 50, height: 50 };
    grid.style.gridTemplateColumns = `repeat(${size.width}, 12px)`;

    worldMap.forEach(tile => {
      const tileEl = document.createElement('div');
      tileEl.className = `world-map-tile world-map-tile--${tile.terrain}`;
      
      if (tile.owner === player?.id) {
        tileEl.classList.add('world-map-tile--owned');
      }
      if (tile.settlement) {
        tileEl.classList.add('world-map-tile--settlement');
      }
      if (currentTile && tile.x === currentTile.x && tile.y === currentTile.y) {
        tileEl.classList.add('world-map-tile--current');
      }

      tileEl.title = `(${tile.x}, ${tile.y}) - ${tile.terrain}${tile.settlement ? ' - ' + tile.settlement.name : ''}`;
      tileEl.addEventListener('click', () => {
        // Travel to tile
        global.State?.updatePlayer({ currentTile: { x: tile.x, y: tile.y } });
        global.Narrative?.addEntry({
          type: 'zone',
          text: `You travel to coordinates (${tile.x}, ${tile.y}). ${tile.terrain.charAt(0).toUpperCase() + tile.terrain.slice(1)} stretches before you.`,
          meta: ''
        });
        overlay.remove();
        global.Rendering?.updateActionButtons();
      });

      grid.appendChild(tileEl);
    });
  }

  global.showSettlementPlacement = function(x, y) {
    const name = prompt('Enter a name for your settlement:');
    if (name && name.trim().length > 0) {
      global.Settlement?.placeSettlement(x, y, global.State?.getPlayer()?.id, name.trim());
    }
  };

  global.showGuildCreation = function() {
    const name = prompt('Enter a name for your guild:');
    if (name && name.trim().length >= 3) {
      global.Guilds?.createGuild(name.trim(), global.State?.getPlayer()?.id);
      global.Rendering?.updateActionButtons();
    } else if (name) {
      global.Toast?.show({
        type: 'error',
        title: 'Invalid Name',
        text: 'Guild name must be at least 3 characters.'
      });
    }
  };

  global.showGuildInfo = function() {
    const player = global.State?.getPlayer();
    if (!player || !player.guild) return;

    global.Narrative?.addEntry({
      type: 'system',
      text: `Guild: ${player.guild.name} | Members: ${player.guild.members?.length || 1} | Territory: ${player.guild.territory?.length || 0} tiles`,
      meta: 'Guild Information'
    });
  };

  global.Rendering.showWorldMap = showWorldMap;

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
    if (global.Combat?.isInCombat()) {
      global.Toast?.show({
        type: 'error',
        title: 'In Combat',
        text: 'You cannot explore while in combat.'
      });
      return;
    }

    const monster = global.Zones?.getRandomMonster();
    if (monster) {
      global.Combat?.startCombat(monster.id);
    } else {
      global.Narrative?.addEntry({
        type: 'zone',
        text: 'You explore the area but find nothing of interest. Perhaps you should try again, or venture to a different location.',
        meta: ''
      });
    }
  };

  // Make sure it's available globally
  window.handleExplore = global.handleExplore;

  function updateSkillsPanel() {
    const player = global.State?.getPlayer();
    const skillsList = document.getElementById('skillsList');
    if (!skillsList || !player || !player.skills) return;

    const skills = player.skills;
    const definitions = global.Skills?.SKILL_DEFINITIONS || {};

    if (Object.keys(skills).length === 0) {
      skillsList.innerHTML = '<p style="color: var(--fg-secondary); font-style: italic; font-size: 0.9rem;">No skills yet. Practice your craft to develop skills.</p>';
      return;
    }

    skillsList.innerHTML = Object.entries(skills).map(([skillId, skillData]) => {
      const def = definitions[skillId];
      return `
        <div class="skill-item">
          <div class="skill-name">
            <span>${def?.icon || '📦'}</span>
            <span>${def?.name || skillId}</span>
          </div>
          <div class="skill-level">Lv. ${skillData.level || 1}</div>
        </div>
      `;
    }).join('');
  }

  function updateSettlementPanel() {
    const player = global.State?.getPlayer();
    const settlementList = document.getElementById('settlementList');
    if (!settlementList || !player) return;

    const settlements = player.settlements || [];

    if (settlements.length === 0) {
      settlementList.innerHTML = '<p style="color: var(--fg-secondary); font-style: italic; font-size: 0.9rem;">No settlements founded. Explore the world map to find a location.</p>';
      return;
    }

    settlementList.innerHTML = settlements.map(settlement => {
      return `
        <div class="settlement-item">
          <div class="settlement-name">${settlement.name}</div>
          <div class="settlement-coords">(${settlement.x}, ${settlement.y})</div>
        </div>
      `;
    }).join('');
  }

  const Rendering = {
    updateNarrative,
    updateZoneHeader,
    updateCharacterPanel,
    updateInventory,
    updateQuestLog,
    updateCombatUI,
    updateActionButtons,
    updateResourceBar,
    updateSkillsPanel,
    updateSettlementPanel,
    showWorldMap
  };

  global.Rendering = Rendering;
})(window);

