/**
 * Nearby List
 * 
 * Text-based list of entities within 1-tile radius of the player.
 * Supports keyboard navigation and targeting.
 */

(function (global) {
  let listElement = null;
  let nearbyEntities = [];
  let selectedIndex = -1;

  /**
   * Initialize nearby list
   */
  function initialize() {
    listElement = document.getElementById('nearbyList');
    if (!listElement) {
      listElement = document.createElement('div');
      listElement.id = 'nearbyList';
      listElement.className = 'nearby-list';
      
      // Insert into right panel or chat area
      const rightPanel = document.querySelector('.game-panel--right');
      const chatArea = document.querySelector('.chat-container');
      if (rightPanel) {
        rightPanel.insertBefore(listElement, rightPanel.firstChild);
      } else if (chatArea) {
        chatArea.parentNode.insertBefore(listElement, chatArea);
      } else {
        document.body.appendChild(listElement);
      }
    }

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboard);
  }

  /**
   * Update nearby list
   */
  function update() {
    if (!listElement) initialize();

    const player = global.State?.getPlayer();
    if (!player || !player.currentZone || !player.currentTile) {
      listElement.innerHTML = '';
      nearbyEntities = [];
      return;
    }

    const playerX = player.currentTile.x;
    const playerY = player.currentTile.y;
    const zoneId = player.currentZone;

    nearbyEntities = [];

    // Get mobs within 1 tile
    const mobs = global.SpawnSystem?.getAliveMobs(zoneId) || [];
    mobs.forEach(mob => {
      const distance = Math.abs(mob.x - playerX) + Math.abs(mob.y - playerY);
      if (distance <= 1) {
        const direction = getDirection(playerX, playerY, mob.x, mob.y);
        nearbyEntities.push({
          entity: mob,
          type: mob.mobTemplate?.isGuard ? 'npc' : 'mob',
          direction,
          distance
        });
      }
    });

    // Get players within 1 tile
    const players = global.MapEntities?.getNearbyPlayers() || [];
    players.forEach(p => {
      if (p.id === player.id) return;
      const pTile = p.currentTile || { x: p.x, y: p.y };
      if (!pTile || typeof pTile.x !== 'number' || typeof pTile.y !== 'number') return;
      
      const distance = Math.abs(pTile.x - playerX) + Math.abs(pTile.y - playerY);
      if (distance <= 1) {
        const direction = getDirection(playerX, playerY, pTile.x, pTile.y);
        nearbyEntities.push({
          entity: p,
          type: 'player',
          direction,
          distance
        });
      }
    });

    // Sort by type (mobs first, then NPCs, then players) and distance
    nearbyEntities.sort((a, b) => {
      const typeOrder = { mob: 0, npc: 1, player: 2 };
      const typeDiff = (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3);
      if (typeDiff !== 0) return typeDiff;
      return a.distance - b.distance;
    });

    // Render list
    renderList();
  }

  /**
   * Get direction from player to entity
   */
  function getDirection(px, py, ex, ey) {
    if (ex === px && ey === py) return 'Same tile';
    if (ey < py) return 'North';
    if (ey > py) return 'South';
    if (ex < px) return 'West';
    if (ex > px) return 'East';
    if (ex < px && ey < py) return 'Northwest';
    if (ex > px && ey < py) return 'Northeast';
    if (ex < px && ey > py) return 'Southwest';
    if (ex > px && ey > py) return 'Southeast';
    return 'Nearby';
  }

  /**
   * Render the list
   */
  function renderList() {
    if (!listElement) return;

    if (nearbyEntities.length === 0) {
      listElement.innerHTML = '<div class="nearby-list-empty">No entities nearby</div>';
      selectedIndex = -1;
      return;
    }

    let html = '<div class="nearby-list-header">Nearby (1 tile)</div>';
    html += '<div class="nearby-list-items">';

    nearbyEntities.forEach((item, index) => {
      const entity = item.entity;
      const isSelected = index === selectedIndex;
      const isTargeted = global.Targeting?.getTarget()?.id === entity.id;
      const selectedClass = isSelected ? ' selected' : '';
      const targetedClass = isTargeted ? ' targeted' : '';

      let icon = '•';
      if (item.type === 'mob') icon = '⚔️';
      else if (item.type === 'npc') {
        if (entity.mobTemplate?.isGuard) icon = '🛡️';
        else icon = '👤';
      } else if (item.type === 'player') icon = '👤';

      // Check if this is an NPC that can receive quest items
      const isQuestNPC = item.type === 'npc' && entity.mobTemplate?.isGuard || 
                         (item.type === 'npc' && global.REALM?.data?.npcsById?.[entity.id]?.quests);
      const dropZoneClass = isQuestNPC ? ' quest-npc-drop-zone' : '';
      
      html += `<div class="nearby-list-item${selectedClass}${targetedClass}${dropZoneClass}" data-index="${index}" data-entity-id="${entity.id}" data-entity-type="${item.type}">`;
      html += `<span class="entity-icon">${icon}</span>`;
      html += `<span class="entity-direction">[${item.direction}]</span>`;
      html += `<span class="entity-name">${entity.name || entity.mobTemplate?.name || 'Unknown'}</span>`;
      
      if (item.type === 'mob' && entity.mobTemplate) {
        const level = entity.mobTemplate.levelRange?.max || entity.mobTemplate.levelRange?.min || 1;
        html += `<span class="entity-level">Lv ${level}</span>`;
      } else if (item.type === 'player') {
        html += `<span class="entity-level">Lv ${entity.level || 1}</span>`;
      }

      if (item.type === 'mob' && entity.stats) {
        const hpPercent = (entity.stats.hp / entity.stats.maxHp) * 100;
        html += `<span class="entity-hp">${Math.round(hpPercent)}%</span>`;
      }

      html += `</div>`;
    });

    html += '</div>';
    listElement.innerHTML = html;

    // Attach click handlers
    attachClickHandlers();
    
    // Attach drag-and-drop handlers for quest items
    attachDragAndDropHandlers();
  }

  /**
   * Attach drag-and-drop handlers for quest items
   */
  function attachDragAndDropHandlers() {
    if (!listElement) return;

    const items = listElement.querySelectorAll('.nearby-list-item.quest-npc-drop-zone');
    items.forEach(item => {
      // Allow dropping items on NPCs
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        
        const itemId = e.dataTransfer.getData('text/plain');
        const entityId = item.dataset.entityId;
        const entityType = item.dataset.entityType;
        
        if (!itemId || !entityId) return;

        // Find NPC ID (could be from npcsById or mob template)
        let npcId = entityId;
        if (entityType === 'npc') {
          // Check if it's a guard mob or actual NPC
          const npc = global.REALM?.data?.npcsById?.[entityId];
          if (npc) {
            npcId = entityId;
          } else {
            // Might be a guard mob, try to find NPC by mob template ID
            const mob = Array.from(global.SpawnSystem?.getAliveMobs(global.State?.getPlayer()?.currentZone) || [])
              .find(m => m.id === entityId);
            if (mob && mob.mobTemplate) {
              // Try to find NPC by mob template ID
              const npcs = Object.values(global.REALM?.data?.npcsById || {});
              const matchingNpc = npcs.find(n => n.id === mob.mobTemplate.id || n.name === mob.mobTemplate.name);
              if (matchingNpc) {
                npcId = matchingNpc.id;
              } else {
                // For guards without NPC entry, use mob template ID
                npcId = mob.mobTemplate.id;
              }
            }
          }
        }

        // Try to turn in quest item
        if (global.Quests?.turnInQuestItem(npcId, itemId)) {
          global.ChatSystem?.addSystemMessage(`You give ${itemId.replace(/_/g, ' ')} to the NPC.`);
        } else {
          global.ChatSystem?.addSystemMessage('This NPC does not need this item for any quest.');
        }
      });
    });
  }

  /**
   * Attach click handlers
   */
  function attachClickHandlers() {
    if (!listElement) return;

    const items = listElement.querySelectorAll('.nearby-list-item');
    items.forEach((item, index) => {
      item.addEventListener('click', (e) => {
        selectedIndex = index;
        targetEntity(nearbyEntities[index].entity, e);
        renderList();
      });
    });
  }

  /**
   * Target an entity
   */
  function targetEntity(entity, clickEvent) {
    if (entity && global.Targeting) {
      global.Targeting.setTarget(entity, clickEvent);
      update(); // Re-render to show targeted state
    }
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeyboard(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return; // Don't handle if typing
    }

    if (nearbyEntities.length === 0) return;

    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          selectedIndex = selectedIndex <= 0 ? nearbyEntities.length - 1 : selectedIndex - 1;
        } else {
          selectedIndex = (selectedIndex + 1) % nearbyEntities.length;
        }
        renderList();
        
        // Scroll selected into view
        const selectedItem = listElement?.querySelector(`.nearby-list-item[data-index="${selectedIndex}"]`);
        if (selectedItem) {
          selectedItem.scrollIntoView({ block: 'nearest' });
        }
        break;

      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < nearbyEntities.length) {
          targetEntity(nearbyEntities[selectedIndex].entity, null);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = selectedIndex <= 0 ? nearbyEntities.length - 1 : selectedIndex - 1;
        renderList();
        break;

      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = (selectedIndex + 1) % nearbyEntities.length;
        renderList();
        break;
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }

  // Update periodically
  setInterval(() => {
    if (listElement) update();
  }, 500); // Update every 500ms

  const NearbyList = {
    update,
    targetEntity
  };

  global.NearbyList = NearbyList;
})(window);

