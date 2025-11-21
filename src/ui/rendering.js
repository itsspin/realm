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
    if (nameEl) {
      nameEl.textContent = player.name || 'Wanderer';
    }
    if (levelEl) levelEl.textContent = `Level ${level}`;
    
    // Update class
    if (global.UIRedesign?.updatePlayerClass) {
      global.UIRedesign.updatePlayerClass();
    }

    // Update XP bar (now above chat window)
    const xpBarEl = document.getElementById('xpBar');
    const xpTextEl = document.getElementById('xpText');
    if (xpBarEl) {
      const percent = Math.min(100, (xp / xpToNext) * 100);
      xpBarEl.style.width = `${percent}%`;
    }
    if (xpTextEl) {
      xpTextEl.textContent = `${xp} / ${xpToNext}`;
    }

    // Update HP bar (new UI)
    const hpBar = document.getElementById('hpBar');
    const statHp = document.getElementById('statHp');
    if (hpBar) {
      const hp = stats.hp || 0;
      const maxHp = stats.maxHp || 20;
      const percent = Math.min(100, (hp / maxHp) * 100);
      hpBar.style.width = `${percent}%`;
    }
    if (statHp) statHp.textContent = `${stats.hp || 0} / ${stats.maxHp || 20}`;
    
    // Update stats
    const atkEl = document.getElementById('statAtk');
    const defEl = document.getElementById('statDef');
    const goldEl = document.getElementById('statGold');
    if (atkEl) {
      let atk = stats.atk || 5;
      // Apply equipment bonuses (only if items aren't broken)
      if (player.equipment) {
        Object.keys(player.equipment).forEach(slot => {
          const itemId = player.equipment[slot];
          if (!itemId) return;

          // Check if item is broken
          if (global.DurabilitySystem?.isItemBroken(itemId, player)) {
            return; // Broken items don't provide bonuses
          }

          const item = global.REALM?.data?.itemsById?.[itemId];
          if (!item || !item.stats) return;

          if (item.stats.atk) atk += item.stats.atk;
          if (item.stats.all) atk += item.stats.all;
        });
      }
      atkEl.textContent = atk;
    }
    if (defEl) {
      let def = stats.def || 2;
      // Apply equipment bonuses (only if items aren't broken)
      if (player.equipment) {
        Object.keys(player.equipment).forEach(slot => {
          const itemId = player.equipment[slot];
          if (!itemId) return;

          // Check if item is broken
          if (global.DurabilitySystem?.isItemBroken(itemId, player)) {
            return; // Broken items don't provide bonuses
          }

          const item = global.REALM?.data?.itemsById?.[itemId];
          if (!item || !item.stats) return;

          if (item.stats.def) def += item.stats.def;
          if (item.stats.all) def += item.stats.all;
        });
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
        const durability = item.durability;
        const maxDurability = item.maxDurability || itemData?.maxDurability || itemData?.durability || 100;
        const durabilityPercent = durability !== undefined ? (durability / maxDurability) * 100 : 100;
        const durabilityClass = durabilityPercent < 25 ? 'inventory-slot--low-durability' : durabilityPercent < 50 ? 'inventory-slot--medium-durability' : '';
        
        return `
          <div class="inventory-slot ${durabilityClass}" data-item-id="${item.itemId}" title="${displayName}" data-slot-index="${index}">
            <span style="font-size: 1.2rem;">${icon}</span>
            ${durability !== undefined && durabilityPercent < 50 ? `
              <div style="position: absolute; bottom: 2px; left: 2px; right: 2px; height: 2px; background: rgba(10,14,26,0.8); border-radius: 1px; overflow: hidden;">
                <div style="height: 100%; width: ${durabilityPercent}%; background: ${durabilityPercent < 25 ? '#c97d3d' : '#d4af37'};"></div>
              </div>
            ` : ''}
          </div>
        `;
      }
      return `<div class="inventory-slot inventory-slot--empty" data-slot-index="${index}"></div>`;
    }).join('');

    // Add click handlers and hover tooltips
    gridEl.querySelectorAll('.inventory-slot[data-item-id]').forEach(slot => {
      const itemId = slot.dataset.itemId;
      const itemData = global.REALM?.data?.itemsById?.[itemId];
      
      // Make item draggable for quest turn-ins
      slot.setAttribute('draggable', 'true');
      slot.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', itemId);
        e.dataTransfer.effectAllowed = 'move';
        slot.classList.add('dragging');
      });
      slot.addEventListener('dragend', () => {
        slot.classList.remove('dragging');
      });
      
      // Click handler - show context menu
      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (global.ItemContextMenu && typeof global.ItemContextMenu.show === 'function') {
          global.ItemContextMenu.show(e, itemId);
        } else {
          // Fallback: try to equip if equippable
          const player = global.State?.getPlayer();
          if (!player) return;
          
          const inventoryItem = player.inventory?.find(item => item.itemId === itemId);
          if (!inventoryItem) return;
          
          // Try to equip the item
          if (itemData.type === 'weapon' || itemData.type === 'armor' || itemData.slot) {
            if (global.Inventory?.equipItem(itemId)) {
              // Success - item will be removed from inventory and equipped
              return;
            }
          }
        }
      });
      
      // Hover tooltip
      slot.addEventListener('mouseenter', (e) => {
        if (!itemData) return;
        
        const tooltip = document.getElementById('itemTooltip');
        if (!tooltip) return;
        
        // Build tooltip content
        let tooltipHTML = `<div class="tooltip-item-name">${itemData.name || itemId.replace(/_/g, ' ')}</div>`;
        
        if (itemData.description) {
          tooltipHTML += `<div class="tooltip-item-description">${itemData.description}</div>`;
        }
        
        // Get item instance for durability
        const player = global.State?.getPlayer();
        const inventoryItem = player?.inventory?.find(item => item.itemId === itemId);
        const durability = inventoryItem?.durability;
        const maxDurability = inventoryItem?.maxDurability || itemData.maxDurability || itemData.durability;
        
        if (itemData.stats) {
          tooltipHTML += `<div class="tooltip-item-stats">`;
          if (itemData.stats.atk) tooltipHTML += `<div>Attack: +${itemData.stats.atk}</div>`;
          if (itemData.stats.def) tooltipHTML += `<div>Defense: +${itemData.stats.def}</div>`;
          if (itemData.stats.all) tooltipHTML += `<div>All Stats: +${itemData.stats.all}</div>`;
          if (itemData.stats.hp) tooltipHTML += `<div>Health: +${itemData.stats.hp}</div>`;
          if (itemData.stats.mana) tooltipHTML += `<div>Mana: +${itemData.stats.mana}</div>`;
          tooltipHTML += `</div>`;
        }
        
        if (durability !== undefined && maxDurability) {
          const durabilityPercent = (durability / maxDurability) * 100;
          let durabilityColor = '#4a8a8a';
          if (durabilityPercent < 25) durabilityColor = '#c97d3d';
          else if (durabilityPercent < 50) durabilityColor = '#d4af37';
          
          tooltipHTML += `<div class="tooltip-item-durability" style="color: ${durabilityColor}">Durability: ${durability}/${maxDurability}</div>`;
        }
        
        if (itemData.type) {
          tooltipHTML += `<div class="tooltip-item-type">Type: ${itemData.type}</div>`;
        }
        
        if (itemData.slot) {
          tooltipHTML += `<div class="tooltip-item-slot">Slot: ${itemData.slot}</div>`;
        }
        
        if (itemData.rarity) {
          tooltipHTML += `<div class="tooltip-item-rarity">Rarity: ${itemData.rarity}</div>`;
        }
        
        if ((itemData.type === 'weapon' || itemData.type === 'armor' || itemData.slot) && itemData.levelReq) {
          tooltipHTML += `<div class="tooltip-item-levelreq">Level Required: ${itemData.levelReq}</div>`;
        }
        
        tooltip.innerHTML = tooltipHTML;
        tooltip.classList.add('tooltip--item');
        tooltip.classList.remove('hidden');
        tooltip.hidden = false;
        
        // Position tooltip near cursor
        updateTooltipPosition(e, tooltip);
      });
      
      slot.addEventListener('mousemove', (e) => {
        const tooltip = document.getElementById('itemTooltip');
        if (tooltip && !tooltip.classList.contains('hidden')) {
          updateTooltipPosition(e, tooltip);
        }
      });
      
      slot.addEventListener('mouseleave', () => {
        const tooltip = document.getElementById('itemTooltip');
        if (tooltip) {
          tooltip.classList.add('hidden');
          tooltip.hidden = true;
        }
      });
    });
  }
  
  /**
   * Update tooltip position to follow cursor
   */
  function updateTooltipPosition(event, tooltip) {
    const offset = 15;
    const x = event.clientX + offset;
    const y = event.clientY + offset;
    
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    
    // Keep tooltip within viewport
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.style.left = `${event.clientX - rect.width - offset}px`;
    }
    if (rect.bottom > window.innerHeight) {
      tooltip.style.top = `${event.clientY - rect.height - offset}px`;
    }
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
      let progressText = '';
      if (quest.type === 'kill') {
        const progress = quest.progress || 0;
        const target = quest.targetCount || 1;
        progressText = `Progress: ${progress}/${target}`;
      } else if (quest.type === 'turnin') {
        const requiredItems = quest.requiredItems || [];
        const itemStatus = requiredItems.map(itemId => {
          const count = quest.requiredItemCounts?.[itemId] || 1;
          const playerCount = (player.inventory || []).filter(inv => inv.itemId === itemId).length;
          const itemName = global.REALM?.data?.itemsById?.[itemId]?.name || itemId.replace(/_/g, ' ');
          return `${itemName}: ${playerCount}/${count}`;
        }).join(', ');
        progressText = `Required: ${itemStatus}`;
      }
      
      return `
        <div class="quest-item">
          <div class="quest-title">${quest.title}</div>
          <div class="quest-description">${quest.description}</div>
          ${progressText ? `<div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--fg-secondary);">${progressText}</div>` : ''}
          ${quest.type === 'turnin' && quest.npcId ? `<div style="margin-top: 0.25rem; font-size: 0.8rem; color: var(--gold-muted);">Turn in to: ${global.REALM?.data?.npcsById?.[quest.npcId]?.name || quest.npcId}</div>` : ''}
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

    // Ensure HP values are valid numbers
    const currentHp = Math.max(0, Math.min(monster.hp || 0, monster.maxHp || 100));
    const maxHp = monster.maxHp || 100;

    if (nameEl) nameEl.textContent = monster.name;
    if (hpEl) hpEl.textContent = `${currentHp} / ${maxHp} HP`;
    if (hpBarEl) {
      const percent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
      hpBarEl.style.width = `${percent}%`;
      
      // Update bar color based on health
      if (percent > 75) hpBarEl.style.backgroundColor = '#4caf50';
      else if (percent > 50) hpBarEl.style.backgroundColor = '#ffeb3b';
      else if (percent > 25) hpBarEl.style.backgroundColor = '#ff9800';
      else hpBarEl.style.backgroundColor = '#f44336';
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

    // NPCs in current zone
    const npcs = global.NPCs?.getNPCsInZone(zone?.id) || [];
    if (npcs.length > 0) {
      html += '<div style="margin-top: 1rem; padding-top: 1rem; border-top: var(--border-subtle);">';
      html += '<div style="font-size: 0.9rem; color: var(--fg-secondary); margin-bottom: 0.5rem;">NPCs:</div>';
      npcs.forEach(npc => {
        html += `
          <button class="action-btn" onclick="global.NPCs.interactWithNPC('${npc.id}')">
            ${npc.type === 'class_trainer' ? '📚' : npc.type === 'merchant' ? '💰' : npc.type === 'guard' ? '🛡️' : npc.type === 'banker' ? '🏦' : npc.type === 'auctioneer' ? '🏛️' : '👤'} ${npc.name}
          </button>
        `;
      });
      html += '</div>';
    }

    // Dungeon navigation
    const dungeon = Object.values(global.REALM?.data?.dungeonsById || {}).find(d => {
      return d.zones.some(z => z.id === zone?.id);
    });
    if (dungeon) {
      const currentDungeonZone = dungeon.zones.find(z => z.id === zone.id);
      if (currentDungeonZone && currentDungeonZone.connections) {
        html += '<div style="margin-top: 1rem; padding-top: 1rem; border-top: var(--border-subtle);">';
        html += '<div style="font-size: 0.9rem; color: var(--fg-secondary); margin-bottom: 0.5rem;">Dungeon Passages:</div>';
        currentDungeonZone.connections.forEach(zoneId => {
          const connectedZone = dungeon.zones.find(z => z.id === zoneId);
          if (connectedZone) {
            html += `
              <button class="action-btn" onclick="global.Zones.changeZone('${zoneId}')">
                → ${connectedZone.name}
              </button>
            `;
          }
        });
        html += '</div>';
      }
    }

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
        html += `<button class="action-btn" onclick="global.Gathering.gatherHerbs(global.Settlement.getTile(${currentTile.x}, ${currentTile.y}))">🌿 Gather Herbs</button>`;
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
    
    // Auction House
    html += `<button class="action-btn" onclick="global.Rendering.showAuctionHouse()">🏛️ Auction House</button>`;
    
    // Leaderboards
    html += `<button class="action-btn" onclick="global.Rendering.showLeaderboardsMenu()">📊 Leaderboards</button>`;
    
    // Player Profile
    html += `<button class="action-btn" onclick="global.Rendering.showPlayerProfile()">👤 Your Profile</button>`;
    
    // Alchemy (if has alchemy skill)
    if (player && player.skills && player.skills.alchemy) {
      html += `<button class="action-btn" onclick="global.Rendering.showAlchemy()">⚗️ Alchemy</button>`;
    }

    // Player Shop
    if (player && player.shop) {
      html += `<button class="action-btn" onclick="global.showShopManagement()">🏪 Manage Shop: ${player.shop.name}</button>`;
    } else if (player) {
      html += `<button class="action-btn" onclick="global.showShopCreation()">🏪 Open Player Shop</button>`;
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

  global.showShopCreation = function() {
    const name = prompt('Enter a name for your shop:');
    if (name && name.trim().length >= 3) {
      global.PlayerShop?.createPlayerShop(name.trim());
      global.Rendering?.updateActionButtons();
    } else if (name) {
      global.Toast?.show({
        type: 'error',
        title: 'Invalid Name',
        text: 'Shop name must be at least 3 characters.'
      });
    }
  };

  global.showShopManagement = function() {
    const player = global.State?.getPlayer();
    if (!player || !player.shop) return;

    global.Narrative?.addEntry({
      type: 'system',
      text: `Shop: ${player.shop.name} | Items Listed: ${player.shop.items?.length || 0} | Sales: ${player.shop.sales || 0} | Revenue: ${player.shop.revenue || 0} gold`,
      meta: 'Shop Management'
    });
  };

  function showAuctionHouse() {
    const player = global.State?.getPlayer();
    if (!player) return;

    const myListings = global.AuctionHouse?.getMyListings(player.id) || [];
    const allListings = global.AuctionHouse?.getListings() || [];

    const overlay = document.createElement('div');
    overlay.id = 'auctionHouseOverlay';
    overlay.className = 'character-creation-overlay';
    
    overlay.innerHTML = `
      <div class="creation-panel" style="max-width: 800px;">
        <h2 class="creation-title">Auction House</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
          <div>
            <h3 style="color: var(--gold-muted); margin-bottom: 0.5rem;">List Item</h3>
            <select id="auctionItemSelect" class="creation-input" style="margin-bottom: 0.5rem;">
              <option value="">Select item...</option>
              ${(player.inventory || []).map(item => {
                const itemData = global.REALM?.data?.itemsById?.[item.itemId];
                return `<option value="${item.itemId}">${itemData?.name || item.itemId.replace(/_/g, ' ')}</option>`;
              }).join('')}
            </select>
            <input type="number" id="auctionQuantity" class="creation-input" placeholder="Quantity" value="1" min="1" style="margin-bottom: 0.5rem;">
            <input type="number" id="auctionPrice" class="creation-input" placeholder="Price per unit" min="1" style="margin-bottom: 0.5rem;">
            <button class="action-btn" onclick="global.Rendering.listAuctionItem()" style="width: 100%;">List Item</button>
          </div>
          <div>
            <h3 style="color: var(--gold-muted); margin-bottom: 0.5rem;">My Listings (${myListings.length})</h3>
            <div style="max-height: 300px; overflow-y: auto;">
              ${myListings.length === 0 
                ? '<p style="color: var(--fg-secondary); font-style: italic;">No active listings</p>'
                : myListings.map(listing => {
                    const itemData = global.REALM?.data?.itemsById?.[listing.itemId];
                    return `
                      <div style="padding: 0.5rem; background: rgba(10, 14, 26, 0.4); border-radius: 0.25rem; margin-bottom: 0.5rem;">
                        <div style="font-weight: 600;">${itemData?.name || listing.itemId.replace(/_/g, ' ')} x${listing.quantity}</div>
                        <div style="font-size: 0.85rem; color: var(--fg-secondary);">${listing.pricePerUnit} gold each (${listing.pricePerUnit * listing.quantity} total)</div>
                      </div>
                    `;
                  }).join('')
              }
            </div>
          </div>
        </div>
        <div style="margin-top: 1rem;">
          <h3 style="color: var(--gold-muted); margin-bottom: 0.5rem;">Browse Listings (${allListings.length})</h3>
          <div style="max-height: 300px; overflow-y: auto;">
            ${allListings.length === 0
              ? '<p style="color: var(--fg-secondary); font-style: italic;">No items for sale</p>'
              : allListings.slice(0, 20).map(listing => {
                  const itemData = global.REALM?.data?.itemsById?.[listing.itemId];
                  const totalPrice = listing.pricePerUnit * listing.quantity;
                  const canAfford = player.gold >= totalPrice;
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(10, 14, 26, 0.4); border-radius: 0.25rem; margin-bottom: 0.5rem;">
                      <div>
                        <div style="font-weight: 600;">${itemData?.name || listing.itemId.replace(/_/g, ' ')} x${listing.quantity}</div>
                        <div style="font-size: 0.85rem; color: var(--fg-secondary);">Seller: ${listing.sellerName} | ${listing.pricePerUnit} gold each</div>
                      </div>
                      <button class="action-btn" ${!canAfford ? 'disabled' : ''} onclick="global.AuctionHouse.buyItem('${listing.id}', '${player.id}'); global.Rendering.showAuctionHouse();" style="padding: 0.5rem 1rem;">
                        Buy (${totalPrice}g)
                      </button>
                    </div>
                  `;
                }).join('')
            }
          </div>
        </div>
        <button class="action-btn" onclick="document.getElementById('auctionHouseOverlay')?.remove()" style="margin-top: 1rem; width: 100%;">Close</button>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function listAuctionItem() {
    const itemSelect = document.getElementById('auctionItemSelect');
    const quantityInput = document.getElementById('auctionQuantity');
    const priceInput = document.getElementById('auctionPrice');

    if (!itemSelect || !quantityInput || !priceInput) return;

    const itemId = itemSelect.value;
    const quantity = parseInt(quantityInput.value) || 1;
    const price = parseInt(priceInput.value);

    if (!itemId || !price || price < 1) {
      global.Toast?.show({
        type: 'error',
        title: 'Invalid Input',
        text: 'Please select an item and enter a valid price.'
      });
      return;
    }

    const player = global.State?.getPlayer();
    if (global.AuctionHouse?.listItem(itemId, quantity, price, player.id)) {
      showAuctionHouse(); // Refresh
    }
  }

  function showLeaderboardsMenu() {
    const overlay = document.createElement('div');
    overlay.id = 'leaderboardsMenuOverlay';
    overlay.className = 'character-creation-overlay';
    
    overlay.innerHTML = `
      <div class="creation-panel" style="max-width: 500px;">
        <h2 class="creation-title">Leaderboards</h2>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
          <button class="action-btn" onclick="global.Leaderboards.showLeaderboard('level'); document.getElementById('leaderboardsMenuOverlay')?.remove();">Highest Level</button>
          <button class="action-btn" onclick="global.Leaderboards.showLeaderboard('gold'); document.getElementById('leaderboardsMenuOverlay')?.remove();">Wealthiest</button>
          <button class="action-btn" onclick="global.Leaderboards.showLeaderboard('monstersKilled'); document.getElementById('leaderboardsMenuOverlay')?.remove();">Most Monsters Slain</button>
          <button class="action-btn" onclick="global.Leaderboards.showLeaderboard('itemsCrafted'); document.getElementById('leaderboardsMenuOverlay')?.remove();">Master Craftsmen</button>
          <button class="action-btn" onclick="global.Leaderboards.showLeaderboard('tradesCompleted'); document.getElementById('leaderboardsMenuOverlay')?.remove();">Top Traders</button>
          <button class="action-btn" onclick="global.Leaderboards.showLeaderboard('oreMined'); document.getElementById('leaderboardsMenuOverlay')?.remove();">Master Miners</button>
          <button class="action-btn" onclick="global.Leaderboards.showLeaderboard('settlementsFounded'); document.getElementById('leaderboardsMenuOverlay')?.remove();">Greatest Founders</button>
          <button class="action-btn" onclick="global.Leaderboards.showLeaderboard('fame'); document.getElementById('leaderboardsMenuOverlay')?.remove();">Most Famous</button>
        </div>
        <button class="action-btn" onclick="document.getElementById('leaderboardsMenuOverlay')?.remove()" style="margin-top: 1rem; width: 100%;">Close</button>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function showPlayerProfile() {
    const player = global.State?.getPlayer();
    if (!player) return;

    const stats = global.PlayerStats?.getPlayerStats() || {};
    const reputation = global.Reputation?.getPlayerReputation() || global.PlayerStats?.getPlayerReputation() || { title: null, fame: 0, specialization: 'none' };
    const achievements = global.Achievements?.getAchievements() || [];

    const overlay = document.createElement('div');
    overlay.id = 'playerProfileOverlay';
    overlay.className = 'character-creation-overlay';
    
    overlay.innerHTML = `
      <div class="creation-panel" style="max-width: 700px;">
        <h2 class="creation-title">${player.name}${reputation.title ? `, ${reputation.title}` : ''}</h2>
        <p style="text-align: center; color: var(--fg-secondary); margin-bottom: 1.5rem;">
          ${player.race ? RACES.find(r => r.id === player.race)?.name : ''} ${player.class ? CLASSES.find(c => c.id === player.class)?.name : ''} | Level ${player.level || 1}
        </p>
        <p style="text-align: center; color: var(--gold-muted); margin-bottom: 1.5rem; font-size: 0.95rem;">
          Fame: ${reputation.fame || 0} | Reputation Level: ${reputation.level || 0}${reputation.specialization ? ` | Known for: ${reputation.specialization}` : ''}
        </p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div>
            <h3 style="color: var(--gold-muted); margin-bottom: 0.5rem;">Combat</h3>
            <div style="font-size: 0.9rem; color: var(--fg-secondary);">
              <div>Monsters Killed: ${stats.monstersKilled || 0}</div>
              <div>Deaths: ${stats.deaths || 0}</div>
            </div>
          </div>
          <div>
            <h3 style="color: var(--gold-muted); margin-bottom: 0.5rem;">Gathering</h3>
            <div style="font-size: 0.9rem; color: var(--fg-secondary);">
              <div>Ore Mined: ${stats.oreMined || 0}</div>
              <div>Fish Caught: ${stats.fishCaught || 0}</div>
              <div>Resources: ${stats.resourcesGathered || 0}</div>
            </div>
          </div>
          <div>
            <h3 style="color: var(--gold-muted); margin-bottom: 0.5rem;">Crafting</h3>
            <div style="font-size: 0.9rem; color: var(--fg-secondary);">
              <div>Items Crafted: ${stats.itemsCrafted || 0}</div>
            </div>
          </div>
          <div>
            <h3 style="color: var(--gold-muted); margin-bottom: 0.5rem;">Trading</h3>
            <div style="font-size: 0.9rem; color: var(--fg-secondary);">
              <div>Trades: ${stats.tradesCompleted || 0}</div>
              <div>Profit: ${(stats.profit || 0).toLocaleString()}g</div>
            </div>
          </div>
        </div>

        <div>
          <h3 style="color: var(--gold-muted); margin-bottom: 0.5rem;">Achievements (${achievements.length})</h3>
          <div style="max-height: 200px; overflow-y: auto;">
            ${achievements.length === 0
              ? '<p style="color: var(--fg-secondary); font-style: italic;">No achievements yet</p>'
              : achievements.map(a => `
                  <div style="padding: 0.5rem; background: rgba(10, 14, 26, 0.4); border-radius: 0.25rem; margin-bottom: 0.5rem; border-left: 2px solid var(--gold-bright);">
                    <div style="font-weight: 600; color: var(--gold-bright);">${a.name}</div>
                    <div style="font-size: 0.85rem; color: var(--fg-secondary);">${a.description}</div>
                  </div>
                `).join('')
            }
          </div>
        </div>

        <button class="action-btn" onclick="document.getElementById('playerProfileOverlay')?.remove()" style="margin-top: 1rem; width: 100%;">Close</button>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  // Need to import RACES and CLASSES for profile
  const RACES = [
    { id: 'human', name: 'Human' },
    { id: 'elf', name: 'Elf' },
    { id: 'dwarf', name: 'Dwarf' },
    { id: 'orc', name: 'Orc' },
    { id: 'undead', name: 'Undead' }
  ];

  const CLASSES = [
    { id: 'warrior', name: 'Warrior' },
    { id: 'ranger', name: 'Ranger' },
    { id: 'mage', name: 'Mage' },
    { id: 'rogue', name: 'Rogue' },
    { id: 'craftsman', name: 'Craftsman' }
  ];

  function showAlchemy() {
    const player = global.State?.getPlayer();
    if (!player) return;

    const potions = global.Alchemy?.POTIONS || [];
    const resources = global.State?.data?.resources || {};

    const overlay = document.createElement('div');
    overlay.id = 'alchemyOverlay';
    overlay.className = 'character-creation-overlay';
    
    overlay.innerHTML = `
      <div class="creation-panel" style="max-width: 700px;">
        <h2 class="creation-title">Alchemy Lab</h2>
        <p style="text-align: center; color: var(--fg-secondary); margin-bottom: 1.5rem;">
          Brew potions and elixirs using your alchemical knowledge
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
          ${potions.map(potion => {
            const canBrew = potion.recipe.every(([material, amount]) => {
              return (resources[material] || 0) >= amount;
            });
            return `
              <div style="padding: 1rem; background: rgba(10, 14, 26, 0.4); border-radius: 0.5rem; border: var(--border-medium);">
                <h3 style="color: var(--ember-bright); margin-bottom: 0.5rem;">${potion.name}</h3>
                <p style="font-size: 0.9rem; color: var(--fg-secondary); margin-bottom: 0.75rem;">${potion.description}</p>
                <div style="font-size: 0.85rem; color: var(--fg-secondary); margin-bottom: 0.75rem;">
                  <div style="margin-bottom: 0.25rem;">Recipe:</div>
                  ${potion.recipe.map(([material, amount]) => {
                    const hasEnough = (resources[material] || 0) >= amount;
                    return `<div style="color: ${hasEnough ? 'var(--fg-primary)' : '#c44'};">
                      ${material}: ${amount} ${hasEnough ? '✓' : '✗'}
                    </div>`;
                  }).join('')}
                </div>
                <button class="action-btn" ${!canBrew ? 'disabled' : ''} onclick="global.Alchemy.brewPotion('${potion.id}'); global.Rendering.showAlchemy();" style="width: 100%;">
                  Brew Potion
                </button>
              </div>
            `;
          }).join('')}
        </div>
        <button class="action-btn" onclick="document.getElementById('alchemyOverlay')?.remove()" style="margin-top: 1rem; width: 100%;">Close</button>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  if (typeof window !== 'undefined') {
    window.Rendering = window.Rendering || {};
    window.Rendering.showWorldMap = showWorldMap;
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
    showWorldMap,
    showAuctionHouse,
    listAuctionItem,
    showLeaderboardsMenu,
    showPlayerProfile,
    showAlchemy
  };

  if (typeof window !== 'undefined') {
    window.Rendering = Rendering;
    // Also set on global for compatibility
    if (typeof global !== 'undefined') {
      global.Rendering = Rendering;
    }
  } else if (typeof global !== 'undefined') {
    global.Rendering = Rendering;
  }
})(window);

