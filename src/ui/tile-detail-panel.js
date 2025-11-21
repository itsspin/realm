/**
 * Tile Detail Panel
 * 
 * Displays all entities on a clicked or hovered tile.
 * Supports click-to-target functionality.
 */

(function (global) {
  let selectedTile = null; // {zoneId, x, y}
  let panelElement = null;

  /**
   * Initialize tile detail panel
   */
  function initialize() {
    // Create panel if it doesn't exist
    panelElement = document.getElementById('tileDetailPanel');
    if (!panelElement) {
      panelElement = document.createElement('div');
      panelElement.id = 'tileDetailPanel';
      panelElement.className = 'tile-detail-panel';
      panelElement.hidden = true;
      
      // Insert into right panel or create new section
      const rightPanel = document.querySelector('.game-panel--right');
      if (rightPanel) {
        rightPanel.insertBefore(panelElement, rightPanel.firstChild);
      } else {
        document.body.appendChild(panelElement);
      }
    }
  }

  /**
   * Update panel with tile contents
   */
  function updateTile(zoneId, x, y) {
    if (!panelElement) initialize();
    
    selectedTile = { zoneId, x, y };
    const tile = global.World?.getTile(zoneId, x, y);
    if (!tile) {
      panelElement.hidden = true;
      return;
    }

    // Get all entities at this tile
    const entities = getEntitiesAtTile(zoneId, x, y);
    
    // Build HTML
    let html = `<div class="tile-detail-header">`;
    html += `<h3>${getTileName(tile, x, y)}</h3>`;
    html += `<span class="tile-coords">(${x}, ${y})</span>`;
    html += `</div>`;

    if (entities.players.length === 0 && entities.npcs.length === 0 && entities.mobs.length === 0) {
      html += `<div class="tile-detail-empty">Empty tile</div>`;
    } else {
      // Players
      if (entities.players.length > 0) {
        html += `<div class="tile-detail-section">`;
        html += `<h4>Players (${entities.players.length})</h4>`;
        entities.players.forEach(entity => {
          html += renderEntityItem(entity, 'player');
        });
        html += `</div>`;
      }

      // NPCs (guards, vendors, etc.)
      if (entities.npcs.length > 0) {
        html += `<div class="tile-detail-section">`;
        html += `<h4>NPCs (${entities.npcs.length})</h4>`;
        entities.npcs.forEach(entity => {
          html += renderEntityItem(entity, 'npc');
        });
        html += `</div>`;
      }

      // Mobs
      if (entities.mobs.length > 0) {
        html += `<div class="tile-detail-section">`;
        html += `<h4>Monsters (${entities.mobs.length})</h4>`;
        entities.mobs.forEach(entity => {
          html += renderEntityItem(entity, 'mob');
        });
        html += `</div>`;
      }
    }

    panelElement.innerHTML = html;
    panelElement.hidden = false;

    // Attach click handlers
    attachClickHandlers();
  }

  /**
   * Get all entities at a tile
   */
  function getEntitiesAtTile(zoneId, x, y) {
    const result = {
      players: [],
      npcs: [],
      mobs: []
    };

    // Get mobs
    const allMobs = global.SpawnSystem?.getAliveMobs(zoneId) || [];
    allMobs.forEach(mob => {
      if (!mob || typeof mob.x !== 'number' || typeof mob.y !== 'number') return;
      if (mob.x === x && mob.y === y) {
        if (mob.mobTemplate?.isGuard) {
          result.npcs.push(mob);
        } else {
          result.mobs.push(mob);
        }
      }
    });

    // Get players (exclude current player)
    const player = global.State?.getPlayer();
    const players = global.MapEntities?.getNearbyPlayers() || [];
    players.forEach(p => {
      if (p.id === player?.id) return; // Exclude self
      const pTile = p.currentTile || { x: p.x, y: p.y };
      if (pTile && typeof pTile.x === 'number' && typeof pTile.y === 'number' && 
          pTile.x === x && pTile.y === y) {
        result.players.push(p);
      }
    });

    // Sort by priority (hostile mobs first, then by level/threat)
    result.mobs.sort((a, b) => {
      const levelA = a.mobTemplate?.levelRange?.max || a.mobTemplate?.levelRange?.min || 1;
      const levelB = b.mobTemplate?.levelRange?.max || b.mobTemplate?.levelRange?.min || 1;
      return levelB - levelA;
    });

    result.npcs.sort((a, b) => {
      const levelA = a.mobTemplate?.levelRange?.max || a.mobTemplate?.levelRange?.min || 1;
      const levelB = b.mobTemplate?.levelRange?.max || b.mobTemplate?.levelRange?.min || 1;
      return levelB - levelA;
    });

    return result;
  }

  /**
   * Render entity item in list
   */
  function renderEntityItem(entity, type) {
    const currentTarget = global.Targeting?.getTarget();
    const isTargeted = currentTarget && currentTarget.id === entity.id;
    const targetClass = isTargeted ? ' targeted' : '';
    
    let html = `<div class="tile-detail-item${targetClass}" data-entity-id="${entity.id}" data-entity-type="${type}">`;
    
    // Icon based on type
    let icon = '•';
    if (type === 'mob') icon = '⚔️';
    else if (type === 'npc') {
      if (entity.mobTemplate?.isGuard) icon = '🛡️';
      else icon = '👤';
    } else if (type === 'player') icon = '👤';

    html += `<span class="entity-icon">${icon}</span>`;
    html += `<span class="entity-name">${entity.name || entity.mobTemplate?.name || 'Unknown'}</span>`;
    
    // Level/class info
    if (type === 'mob' && entity.mobTemplate) {
      const level = entity.mobTemplate.levelRange?.max || entity.mobTemplate.levelRange?.min || 1;
      html += `<span class="entity-level">Lv ${level}</span>`;
    } else if (type === 'player') {
      html += `<span class="entity-level">Lv ${entity.level || 1}</span>`;
      if (entity.class) {
        html += `<span class="entity-class">${entity.class}</span>`;
      }
    }

    // HP bar for mobs
    if (type === 'mob' && entity.stats) {
      const hpPercent = (entity.stats.hp / entity.stats.maxHp) * 100;
      html += `<div class="entity-hp">`;
      html += `<div class="hp-bar" style="width: ${hpPercent}%"></div>`;
      html += `<span class="hp-text">${entity.stats.hp}/${entity.stats.maxHp}</span>`;
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  /**
   * Get tile display name
   */
  function getTileName(tile, x, y) {
    const zone = global.World?.getZone(tile.zoneId);
    if (!zone) return `Tile (${x}, ${y})`;
    
    // Use terrain type or zone-specific names
    const terrainNames = {
      city_street: 'Street',
      city_plaza: 'Plaza',
      building: 'Building',
      wall: 'Wall',
      grass: 'Grassland',
      path: 'Path',
      tree: 'Forest',
      water: 'Water',
      rock: 'Rocky Area',
      dungeon_floor: 'Dungeon Floor',
      dungeon_wall: 'Dungeon Wall'
    };
    
    return terrainNames[tile.terrainType] || zone.name || `Tile (${x}, ${y})`;
  }

  /**
   * Attach click handlers to entity items
   */
  function attachClickHandlers() {
    if (!panelElement) return;
    
    const items = panelElement.querySelectorAll('.tile-detail-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const entityId = item.dataset.entityId;
        const entityType = item.dataset.entityType;
        targetEntity(entityId, entityType);
      });
    });
  }

  /**
   * Target an entity
   */
  function targetEntity(entityId, entityType) {
    if (!selectedTile) return;

    let entity = null;

    if (entityType === 'mob' || entityType === 'npc') {
      entity = global.SpawnSystem?.getAliveMobs(selectedTile.zoneId).find(m => m.id === entityId);
    } else if (entityType === 'player') {
      const players = global.MapEntities?.getNearbyPlayers() || [];
      entity = players.find(p => p.id === entityId);
    }

    if (entity && global.Targeting) {
      global.Targeting.setTarget(entity);
      // Update panel to highlight selected
      updateTile(selectedTile.zoneId, selectedTile.x, selectedTile.y);
    }
  }

  /**
   * Hide panel
   */
  function hide() {
    if (panelElement) {
      panelElement.hidden = true;
    }
    selectedTile = null;
  }

  /**
   * Get selected tile
   */
  function getSelectedTile() {
    return selectedTile;
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }

  const TileDetailPanel = {
    updateTile,
    hide,
    getSelectedTile
  };

  global.TileDetailPanel = TileDetailPanel;
})(window);

