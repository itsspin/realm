/**
 * World Map Rendering System
 * 
 * Renders a 16×16 player-centered grid viewport.
 * The player stays in the center of the viewport, and tiles are calculated
 * relative to the player's position.
 * 
 * VIEWPORT:
 * - 16×16 tiles total
 * - Player always at viewport center (8, 8)
 * - No dragging/panning - viewport follows player
 * - Zoom still works for accessibility
 */

(function (global) {
  let mapCanvas = null;
  let mapCtx = null;
  let zoomLevel = 1.5;
  let showDebugOverlay = false;
  let hoveredTile = null; // {x, y} in world coordinates

  // Viewport constants
  const VIEW_SIZE = 16; // 16×16 tiles
  const VIEW_CENTER = 8; // Center index (0-15, center is 8)
  const VIEW_RADIUS = 8; // 8 tiles on each side of center

  // Expose for movement system and compatibility
  global.WorldMapRender = global.WorldMapRender || {};
  global.WorldMapRender.zoomLevel = zoomLevel;
  global.WorldMapRender.panX = 0; // Deprecated - kept for compatibility
  global.WorldMapRender.panY = 0; // Deprecated - kept for compatibility
  global.WorldMapRender.toggleDebugOverlay = () => {
    showDebugOverlay = !showDebugOverlay;
    renderMap();
  };

  /**
   * Terrain color mapping
   */
  const TERRAIN_COLORS = {
    // City tiles
    city_street: '#6b6b6b',
    city_plaza: '#8b8b8b',
    building: '#4a4a4a',
    wall: '#2a2a2a',
    
    // Outdoor tiles
    grass: '#4a7c3a',
    path: '#8b7355',
    tree: '#2d5016',
    water: '#1a3a5c',
    rock: '#5a5a5a',
    
    // Dungeon tiles
    dungeon_floor: '#6b5b4f',
    dungeon_wall: '#3a3a3a',
    
    // Default
    default: '#4a4a4a'
  };

  /**
   * Initialize map canvas
   */
  function initializeMapCanvas() {
    mapCanvas = document.getElementById('worldMapCanvas');
    if (!mapCanvas) {
      console.warn('[WorldMapRender] Canvas not found');
      return;
    }

    mapCtx = mapCanvas.getContext('2d');
    if (!mapCtx) {
      console.warn('[WorldMapRender] Cannot get 2D context');
      return;
    }

    // Set canvas size
    const container = mapCanvas.closest('.map-canvas-container') || mapCanvas.parentElement;
    if (container) {
      const resizeCanvas = () => {
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          setTimeout(resizeCanvas, 100);
          return;
        }
        const dpr = window.devicePixelRatio || 1;
        mapCanvas.width = rect.width * dpr;
        mapCanvas.height = rect.height * dpr;
        mapCtx.setTransform(1, 0, 0, 1, 0, 0);
        mapCtx.scale(dpr, dpr);
        mapCanvas.style.width = rect.width + 'px';
        mapCanvas.style.height = rect.height + 'px';
        renderMap();
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(container);
      }
    }

    // Mouse wheel zoom (keep for accessibility)
    mapCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoomLevel = Math.max(0.5, Math.min(4, zoomLevel * zoomFactor));
      
      if (newZoomLevel !== zoomLevel) {
        zoomLevel = newZoomLevel;
        global.WorldMapRender.zoomLevel = zoomLevel;
        renderMap();
      }
    }, { passive: false });

    // Click to move/target
    mapCanvas.addEventListener('click', handleCanvasClick);

    // Hover for tile detail panel
    mapCanvas.addEventListener('mousemove', handleCanvasHover);
    mapCanvas.addEventListener('mouseleave', () => {
      hoveredTile = null;
      if (global.TileDetailPanel) {
        global.TileDetailPanel.hide();
      }
    });

    // Right-click to loot corpses
    mapCanvas.addEventListener('contextmenu', handleCanvasRightClick);

    // Zoom controls
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const centerPlayerBtn = document.getElementById('centerPlayerBtn');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        zoomLevel = Math.min(4, zoomLevel + 0.3);
        global.WorldMapRender.zoomLevel = zoomLevel;
        renderMap();
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        zoomLevel = Math.max(0.5, zoomLevel - 0.3);
        global.WorldMapRender.zoomLevel = zoomLevel;
        renderMap();
      });
    }

    // Center button - no-op since always centered, but keep for UI consistency
    if (centerPlayerBtn) {
      centerPlayerBtn.addEventListener('click', () => {
        renderMap(); // Just re-render
      });
    }

    // Debug toggle button
    const debugToggleBtn = document.getElementById('debugToggleBtn');
    if (debugToggleBtn) {
      debugToggleBtn.addEventListener('click', () => {
        showDebugOverlay = !showDebugOverlay;
        renderMap();
      });
    }

    // Keyboard shortcut for debug (D key)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          showDebugOverlay = !showDebugOverlay;
          renderMap();
        }
      }
    });

    // Initial render
    renderMap();
  }

  /**
   * Get all entities at a specific tile
   */
  function getEntitiesAtTile(zoneId, worldX, worldY) {
    const result = {
      mobs: [],
      players: [],
      npcs: []
    };

    // Get mobs
    const allMobs = global.SpawnSystem?.getAliveMobs(zoneId) || [];
    allMobs.forEach(mob => {
      if (mob.x === worldX && mob.y === worldY) {
        if (mob.mobTemplate?.isGuard) {
          result.npcs.push(mob);
        } else {
          result.mobs.push(mob);
        }
      }
    });

    // Get players
    const players = global.MapEntities?.getNearbyPlayers() || [];
    players.forEach(player => {
      const pTile = player.currentTile || { x: player.x, y: player.y };
      if (pTile.x === worldX && pTile.y === worldY) {
        result.players.push(player);
      }
    });

    return result;
  }

  /**
   * Determine tile border color based on entities
   */
  function getTileBorderColor(entities) {
    if (entities.mobs.length > 0) {
      return '#ff0000'; // Red for hostile mobs
    }
    if (entities.npcs.length > 0) {
      // Check if NPC is important (guard, vendor, etc.)
      const hasImportantNPC = entities.npcs.some(npc => 
        npc.mobTemplate?.isGuard
      );
      if (hasImportantNPC) {
        return '#ffd700'; // Gold for guards/important NPCs
      }
      return '#00aaff'; // Blue for friendly NPCs
    }
    if (entities.players.length > 0) {
      return '#00ff00'; // Green for players
    }
    return null; // No border for empty tiles
  }

  /**
   * Count total entities on a tile
   */
  function getEntityCount(entities) {
    return entities.mobs.length + entities.players.length + entities.npcs.length;
  }

  /**
   * Render the map using 16×16 viewport centered on player
   */
  function renderMap() {
    if (!mapCanvas || !mapCtx) return;

    const player = global.State?.getPlayer();
    if (!player || !player.currentZone || !player.currentTile) return;

    const zone = global.World?.getZone(player.currentZone);
    if (!zone) return;

    const playerX = player.currentTile.x;
    const playerY = player.currentTile.y;
    const tileSize = 16 * zoomLevel;

    // Update exposed values
    global.WorldMapRender.zoomLevel = zoomLevel;

    // Clear canvas
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    // Calculate container dimensions for centering
    const container = mapCanvas.parentElement;
    const containerWidth = container ? container.clientWidth : mapCanvas.width;
    const containerHeight = container ? container.clientHeight : mapCanvas.height;
    
    // Calculate viewport offset to center it on screen
    const viewportPixelWidth = VIEW_SIZE * tileSize;
    const viewportPixelHeight = VIEW_SIZE * tileSize;
    const offsetX = (containerWidth - viewportPixelWidth) / 2;
    const offsetY = (containerHeight - viewportPixelHeight) / 2;

    // Get all mobs and players once for efficiency
    const allMobs = global.SpawnSystem?.getAliveMobs(player.currentZone) || [];
    const allPlayers = global.MapEntities?.getNearbyPlayers() || [];
    const currentTarget = global.Targeting?.getTarget();

    // Draw tiles in 16×16 viewport
    for (let vy = 0; vy < VIEW_SIZE; vy++) {
      for (let vx = 0; vx < VIEW_SIZE; vx++) {
        // Calculate world coordinates
        const worldX = playerX + (vx - VIEW_CENTER);
        const worldY = playerY + (vy - VIEW_CENTER);

        // Calculate screen position
        const screenX = vx * tileSize + offsetX;
        const screenY = vy * tileSize + offsetY;

        // Check if tile is outside zone bounds
        if (worldX < 0 || worldX >= zone.gridWidth || worldY < 0 || worldY >= zone.gridHeight) {
          // Draw fog/darkness for out-of-bounds
          mapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          mapCtx.fillRect(screenX, screenY, tileSize, tileSize);
          mapCtx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
          mapCtx.lineWidth = 1;
          mapCtx.strokeRect(screenX, screenY, tileSize, tileSize);
          continue;
        }

        // Get tile data
        const tile = global.World?.getTile(player.currentZone, worldX, worldY);
        if (!tile) {
          // Draw placeholder for missing tiles
          mapCtx.fillStyle = TERRAIN_COLORS.default;
          mapCtx.fillRect(screenX, screenY, tileSize, tileSize);
          continue;
        }

        // Draw terrain
        const color = TERRAIN_COLORS[tile.terrainType] || TERRAIN_COLORS.default;
        mapCtx.fillStyle = color;
        mapCtx.fillRect(screenX, screenY, tileSize, tileSize);

        // Get entities at this tile
        const entities = getEntitiesAtTile(player.currentZone, worldX, worldY);

        // Draw border based on entities
        const borderColor = getTileBorderColor(entities);
        if (borderColor) {
          mapCtx.strokeStyle = borderColor;
          mapCtx.lineWidth = 2;
          mapCtx.strokeRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
        }

        // Draw border for non-walkable tiles (if no entity border)
        if (!tile.walkable && !borderColor) {
          mapCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
          mapCtx.lineWidth = 1;
          mapCtx.strokeRect(screenX, screenY, tileSize, tileSize);
        }

        // Draw crowding indicator (+N badge if multiple entities)
        const entityCount = getEntityCount(entities);
        if (entityCount > 1 && tileSize >= 16) {
          mapCtx.save();
          mapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          mapCtx.fillRect(Math.round(screenX + tileSize - 18), Math.round(screenY + 2), 16, 12);
          mapCtx.fillStyle = '#fff';
          mapCtx.strokeStyle = '#000';
          mapCtx.lineWidth = 1;
          mapCtx.font = `bold ${Math.max(8, Math.floor(tileSize / 4))}px monospace`;
          mapCtx.textAlign = 'center';
          mapCtx.textBaseline = 'middle';
          const badgeText = `+${entityCount}`;
          const badgeX = Math.round(screenX + tileSize - 10);
          const badgeY = Math.round(screenY + 8);
          mapCtx.strokeText(badgeText, badgeX, badgeY);
          mapCtx.fillText(badgeText, badgeX, badgeY);
          mapCtx.restore();
        }

        // Draw spawn point indicator (for debugging)
        if (tile.spawnGroupId && global.DIAG?.debug) {
          mapCtx.fillStyle = 'rgba(255, 255, 0, 0.3)';
          mapCtx.fillRect(screenX, screenY, tileSize, tileSize);
        }

        // Draw guard path node (for debugging)
        if (tile.guardPathNodeId && global.DIAG?.debug) {
          mapCtx.fillStyle = 'rgba(0, 255, 0, 0.3)';
          mapCtx.fillRect(screenX, screenY, tileSize, tileSize);
        }

        // Draw hover highlight
        if (hoveredTile && hoveredTile.x === worldX && hoveredTile.y === worldY) {
          mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          mapCtx.lineWidth = 2;
          mapCtx.strokeRect(screenX, screenY, tileSize, tileSize);
        }
      }
    }

    // Draw zone transition arrows/indicators (if visible in viewport)
    drawZoneTransitions(zone, tileSize, playerX, playerY, offsetX, offsetY);

    // Draw entities (monsters, NPCs, players)
    drawEntities(allMobs, allPlayers, player, currentTarget, tileSize, playerX, playerY, offsetX, offsetY);

    // Draw player (always at center)
    const playerScreenX = VIEW_CENTER * tileSize + offsetX;
    const playerScreenY = VIEW_CENTER * tileSize + offsetY;
    mapCtx.fillStyle = '#ff4444';
    mapCtx.beginPath();
    mapCtx.arc(playerScreenX + tileSize / 2, playerScreenY + tileSize / 2, tileSize / 2.5, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.strokeStyle = '#fff';
    mapCtx.lineWidth = 3;
    mapCtx.stroke();
    
    // Draw player name (with better text rendering)
    if (tileSize >= 20) {
      mapCtx.save();
      mapCtx.fillStyle = '#fff';
      mapCtx.strokeStyle = '#000';
      mapCtx.lineWidth = 2;
      mapCtx.font = `bold ${Math.max(10, Math.floor(tileSize / 3))}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-body')}`;
      mapCtx.textAlign = 'center';
      mapCtx.textBaseline = 'bottom';
      const name = player.name || 'You';
      const textX = Math.round(playerScreenX + tileSize / 2);
      const textY = Math.round(playerScreenY - tileSize * 0.3);
      mapCtx.strokeText(name, textX, textY);
      mapCtx.fillText(name, textX, textY);
      mapCtx.restore();
    }

    // Draw debug overlay (spawn points)
    if (showDebugOverlay) {
      drawDebugOverlay(zone, tileSize, playerX, playerY, offsetX, offsetY);
    }

    // Update legend
    updateMapLegend(zone);

    // Update nearby list
    if (global.NearbyList && typeof global.NearbyList.update === 'function') {
      global.NearbyList.update();
    }
  }

  /**
   * Draw entities (mobs, NPCs, other players, pets)
   */
  function drawEntities(allMobs, allPlayers, player, currentTarget, tileSize, playerX, playerY, offsetX, offsetY) {
    // Draw player's pet
    if (player && player.pet && player.pet.alive) {
      const pet = player.pet;
      if (pet.zone === player.currentZone && typeof pet.x === 'number' && typeof pet.y === 'number') {
        // Check if pet is in viewport
        const dx = pet.x - playerX;
        const dy = pet.y - playerY;
        if (Math.abs(dx) <= VIEW_RADIUS && Math.abs(dy) <= VIEW_RADIUS) {
          const vx = VIEW_CENTER + dx;
          const vy = VIEW_CENTER + dy;
          const screenX = vx * tileSize + offsetX;
          const screenY = vy * tileSize + offsetY;
          
          // Draw pet (purple/blue color to distinguish from mobs)
          mapCtx.fillStyle = '#9c27b0';
          mapCtx.beginPath();
          mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
          mapCtx.fill();
          mapCtx.strokeStyle = '#7b1fa2';
          mapCtx.lineWidth = 2;
          mapCtx.stroke();
          
          // Draw pet name
          if (tileSize >= 20) {
            mapCtx.save();
            mapCtx.fillStyle = '#fff';
            mapCtx.strokeStyle = '#000';
            mapCtx.lineWidth = 2;
            mapCtx.font = `bold ${Math.max(10, Math.floor(tileSize / 3))}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-body')}`;
            mapCtx.textAlign = 'center';
            mapCtx.textBaseline = 'bottom';
            const name = pet.name || 'Pet';
            const textX = Math.round(screenX + tileSize / 2);
            const textY = Math.round(screenY - 2);
            mapCtx.strokeText(name, textX, textY);
            mapCtx.fillText(name, textX, textY);
            mapCtx.restore();
          }
        }
      }
    }

    // Draw corpses first (so they appear under mobs)
    if (global.CorpseSystem && player && player.currentZone) {
      const allCorpses = global.CorpseSystem.getCorpsesInZone(player.currentZone) || [];
      allCorpses.forEach(corpse => {
        if (!corpse || typeof corpse.x !== 'number' || typeof corpse.y !== 'number') return;
        
        // Check if corpse is in viewport
        const dx = corpse.x - playerX;
        const dy = corpse.y - playerY;
        if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) return;

        const vx = VIEW_CENTER + dx;
        const vy = VIEW_CENTER + dy;
        const screenX = vx * tileSize + offsetX;
        const screenY = vy * tileSize + offsetY;
        
        // Draw corpse (gray/brown color, different from mobs)
        mapCtx.fillStyle = '#8b7355';
        mapCtx.beginPath();
        mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 3.5, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.strokeStyle = '#6b5b4f';
        mapCtx.lineWidth = 2;
        mapCtx.stroke();

        // Draw corpse name
        if (tileSize >= 20) {
          mapCtx.save();
          mapCtx.fillStyle = '#d4c4a8';
          mapCtx.strokeStyle = '#000';
          mapCtx.lineWidth = 2;
          mapCtx.font = `italic ${Math.max(9, Math.floor(tileSize / 3.5))}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-body')}`;
          mapCtx.textAlign = 'center';
          mapCtx.textBaseline = 'bottom';
          const name = corpse.corpseName || 'Corpse';
          const textX = Math.round(screenX + tileSize / 2);
          const textY = Math.round(screenY - 2);
          mapCtx.strokeText(name, textX, textY);
          mapCtx.fillText(name, textX, textY);
          mapCtx.restore();
        }
      });
    }

    // Draw mobs
    allMobs.forEach(mob => {
      if (!mob || typeof mob.x !== 'number' || typeof mob.y !== 'number') return;
      
      // Check if mob is in viewport
      const dx = mob.x - playerX;
      const dy = mob.y - playerY;
      if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) return;

      const vx = VIEW_CENTER + dx;
      const vy = VIEW_CENTER + dy;
      const screenX = vx * tileSize + offsetX;
      const screenY = vy * tileSize + offsetY;
      
      const isTargeted = currentTarget && currentTarget.id === mob.id;
      
      // Draw mob
      mapCtx.fillStyle = isTargeted ? '#ffff00' : '#ff6666';
      mapCtx.beginPath();
      mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.strokeStyle = isTargeted ? '#ffaa00' : '#ff0000';
      mapCtx.lineWidth = isTargeted ? 3 : 2;
      mapCtx.stroke();

      // Draw mob name (with better text rendering)
      if (tileSize >= 20) {
        mapCtx.save();
        mapCtx.fillStyle = '#fff';
        mapCtx.strokeStyle = '#000';
        mapCtx.lineWidth = 2;
        mapCtx.font = `bold ${Math.max(10, Math.floor(tileSize / 3))}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-body')}`;
        mapCtx.textAlign = 'center';
        mapCtx.textBaseline = 'bottom';
        // Draw text with outline for readability
        const name = mob.mobTemplate?.name || 'Mob';
        const textX = Math.round(screenX + tileSize / 2);
        const textY = Math.round(screenY - 2);
        mapCtx.strokeText(name, textX, textY);
        mapCtx.fillText(name, textX, textY);
        mapCtx.restore();
      }

      // Highlight targeted tile
      if (isTargeted) {
        mapCtx.strokeStyle = '#ffff00';
        mapCtx.lineWidth = 2;
        mapCtx.strokeRect(screenX - 1, screenY - 1, tileSize + 2, tileSize + 2);
      }
    });

    // Draw other players
    allPlayers.forEach(p => {
      if (p.id === player?.id) return;
      const pTile = p.currentTile || { x: p.x, y: p.y };
      if (!pTile || typeof pTile.x !== 'number' || typeof pTile.y !== 'number') return;

      // Check if player is in viewport
      const dx = pTile.x - playerX;
      const dy = pTile.y - playerY;
      if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) return;

      const vx = VIEW_CENTER + dx;
      const vy = VIEW_CENTER + dy;
      const screenX = vx * tileSize + offsetX;
      const screenY = vy * tileSize + offsetY;
      
      mapCtx.fillStyle = '#44ff44';
      mapCtx.beginPath();
      mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
      mapCtx.fill();
      
      // Draw player name (with better text rendering)
      if (tileSize >= 20) {
        mapCtx.save();
        mapCtx.fillStyle = '#fff';
        mapCtx.strokeStyle = '#000';
        mapCtx.lineWidth = 2;
        mapCtx.font = `${Math.max(10, Math.floor(tileSize / 3))}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-body')}`;
        mapCtx.textAlign = 'center';
        mapCtx.textBaseline = 'bottom';
        const name = p.name || 'Player';
        const textX = Math.round(screenX + tileSize / 2);
        const textY = Math.round(screenY - 2);
        mapCtx.strokeText(name, textX, textY);
        mapCtx.fillText(name, textX, textY);
        mapCtx.restore();
      }
    });
  }

  /**
   * Draw zone transition indicators (arrows for city entrances)
   */
  function drawZoneTransitions(zone, tileSize, playerX, playerY, offsetX, offsetY) {
    if (!zone || !zone.neighboringZones || zone.neighboringZones.length === 0) return;
    if (zone.type !== 'outdoor') return;

    zone.neighboringZones.forEach(neighborZoneId => {
      const neighborZone = global.World?.getZone(neighborZoneId);
      if (!neighborZone || neighborZone.type !== 'city') return;

      // Find transition point (usually center or edge of zone)
      const transitionPoints = [
        { x: Math.floor(zone.gridWidth / 2), y: 0, dir: 'up' },
        { x: zone.gridWidth - 1, y: Math.floor(zone.gridHeight / 2), dir: 'right' },
        { x: Math.floor(zone.gridWidth / 2), y: zone.gridHeight - 1, dir: 'down' },
        { x: 0, y: Math.floor(zone.gridHeight / 2), dir: 'left' }
      ];

      const transitionPoint = transitionPoints[0];
      
      // Check if transition point is in viewport
      const dx = transitionPoint.x - playerX;
      const dy = transitionPoint.y - playerY;
      if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) return;

      const vx = VIEW_CENTER + dx;
      const vy = VIEW_CENTER + dy;
      const screenX = vx * tileSize + offsetX;
      const screenY = vy * tileSize + offsetY;

      // Check if player is near this transition point
      const distance = Math.abs(playerX - transitionPoint.x) + Math.abs(playerY - transitionPoint.y);
      const isNearby = distance <= 5;

      // Draw arrow/indicator
      mapCtx.save();
      
      mapCtx.fillStyle = isNearby ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 215, 0, 0.5)';
      mapCtx.beginPath();
      mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize * 0.6, 0, Math.PI * 2);
      mapCtx.fill();
      
      mapCtx.strokeStyle = isNearby ? '#ffd700' : '#ffaa00';
      mapCtx.lineWidth = isNearby ? 3 : 2;
      mapCtx.stroke();

      mapCtx.fillStyle = '#fff';
      mapCtx.strokeStyle = '#000';
      mapCtx.lineWidth = 2;
      
      const centerX = screenX + tileSize / 2;
      const centerY = screenY + tileSize / 2;
      const arrowSize = tileSize * 0.4;
      
      // Arrow pointing up (to city)
      mapCtx.beginPath();
      mapCtx.moveTo(centerX, centerY - arrowSize / 2);
      mapCtx.lineTo(centerX - arrowSize / 2, centerY + arrowSize / 2);
      mapCtx.lineTo(centerX, centerY + arrowSize / 3);
      mapCtx.lineTo(centerX + arrowSize / 2, centerY + arrowSize / 2);
      mapCtx.closePath();
      mapCtx.fill();
      mapCtx.stroke();

      // Draw zone name label if nearby
      if (isNearby && tileSize >= 16) {
        mapCtx.fillStyle = '#fff';
        mapCtx.font = `bold ${Math.max(10, tileSize / 4)}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-body')}`;
        mapCtx.textAlign = 'center';
        mapCtx.strokeStyle = '#000';
        mapCtx.lineWidth = 3;
        const labelY = screenY - tileSize * 0.8;
        mapCtx.strokeText(`→ ${neighborZone.name}`, centerX, labelY);
        mapCtx.fillText(`→ ${neighborZone.name}`, centerX, labelY);
      }

      mapCtx.restore();
    });
  }

  /**
   * Draw debug overlay showing spawn points
   */
  function drawDebugOverlay(zone, tileSize, playerX, playerY, offsetX, offsetY) {
    const spawnGroups = global.World?.getSpawnGroupsForZone(zone.id) || [];
    
    spawnGroups.forEach(spawnGroup => {
      if (spawnGroup.spawnPoints && spawnGroup.spawnPoints.length > 0) {
        spawnGroup.spawnPoints.forEach((spawnPoint, index) => {
          // Check if spawn point is in viewport
          const dx = spawnPoint.x - playerX;
          const dy = spawnPoint.y - playerY;
          if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) return;

          const vx = VIEW_CENTER + dx;
          const vy = VIEW_CENTER + dy;
          const screenX = vx * tileSize + offsetX;
          const screenY = vy * tileSize + offsetY;
          
          const color = spawnGroup.spawnType === 'static' ? '#00ff00' : '#0000ff';
          mapCtx.fillStyle = color + '80';
          mapCtx.beginPath();
          mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 4, 0, Math.PI * 2);
          mapCtx.fill();
          mapCtx.strokeStyle = color;
          mapCtx.lineWidth = 2;
          mapCtx.stroke();

          mapCtx.fillStyle = '#fff';
          mapCtx.font = `${Math.max(8, tileSize / 4)}px monospace`;
          mapCtx.textAlign = 'center';
          mapCtx.fillText(`${spawnGroup.spawnType[0].toUpperCase()}${index}`, screenX + tileSize / 2, screenY + tileSize / 2 + 4);
        });
      }
    });
  }

  /**
   * Update map legend
   */
  function updateMapLegend(zone) {
    const legend = document.getElementById('mapLegend');
    if (!legend) return;

    const player = global.State?.getPlayer();
    legend.innerHTML = `
      <div class="legend-item">
        <div style="width: 12px; height: 12px; background: #ff4444; border-radius: 50%; border: 1px solid #fff;"></div>
        <span>You (${player?.name || 'Player'})</span>
      </div>
      <div class="legend-item">
        <div style="width: 12px; height: 12px; background: #ff6666; border-radius: 50%;"></div>
        <span>Monster</span>
      </div>
      <div class="legend-item">
        <div style="width: 12px; height: 12px; border: 2px solid #ff0000;"></div>
        <span>Hostile (red border)</span>
      </div>
      <div class="legend-item">
        <div style="width: 12px; height: 12px; border: 2px solid #ffd700;"></div>
        <span>Guard/NPC (gold border)</span>
      </div>
      ${zone.type === 'city' ? `
        <div class="legend-item">
          <div style="width: 12px; height: 12px; background: ${TERRAIN_COLORS.city_street};"></div>
          <span>Street</span>
        </div>
        <div class="legend-item">
          <div style="width: 12px; height: 12px; background: ${TERRAIN_COLORS.building};"></div>
          <span>Building</span>
        </div>
      ` : `
        <div class="legend-item">
          <div style="width: 12px; height: 12px; background: ${TERRAIN_COLORS.grass};"></div>
          <span>Grass</span>
        </div>
        <div class="legend-item">
          <div style="width: 12px; height: 12px; background: ${TERRAIN_COLORS.path};"></div>
          <span>Path</span>
        </div>
      `}
    `;
  }

  /**
   * Handle canvas hover
   */
  function handleCanvasHover(event) {
    const player = global.State?.getPlayer();
    if (!player || !player.currentZone || !player.currentTile) return;

    const rect = mapCanvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const tileSize = 16 * zoomLevel;
    const container = mapCanvas.parentElement;
    const containerWidth = container ? container.clientWidth : mapCanvas.width;
    const containerHeight = container ? container.clientHeight : mapCanvas.height;
    const viewportPixelWidth = VIEW_SIZE * tileSize;
    const viewportPixelHeight = VIEW_SIZE * tileSize;
    const offsetX = (containerWidth - viewportPixelWidth) / 2;
    const offsetY = (containerHeight - viewportPixelHeight) / 2;

    // Calculate viewport coordinates
    const vx = Math.floor((clickX - offsetX) / tileSize);
    const vy = Math.floor((clickY - offsetY) / tileSize);

    if (vx < 0 || vx >= VIEW_SIZE || vy < 0 || vy >= VIEW_SIZE) {
      hoveredTile = null;
      if (global.TileDetailPanel) {
        global.TileDetailPanel.hide();
      }
      return;
    }

    // Calculate world coordinates
    const worldX = player.currentTile.x + (vx - VIEW_CENTER);
    const worldY = player.currentTile.y + (vy - VIEW_CENTER);

    hoveredTile = { x: worldX, y: worldY };

    // Update tile detail panel
    if (global.TileDetailPanel) {
      global.TileDetailPanel.updateTile(player.currentZone, worldX, worldY);
    }

    renderMap(); // Re-render to show hover highlight
  }

  /**
   * Loot a corpse
   */
  function lootCorpse(corpse) {
    if (!corpse || !global.CorpseSystem) return;
    
    if (global.CorpseSystem.isCorpseLooted(corpse)) {
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage('This corpse has already been looted.');
      }
      return;
    }
    
    // Loot all remaining items
    const lootedItems = global.CorpseSystem.lootAll(corpse.id);
    
    if (lootedItems.length === 0) {
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage('The corpse has nothing of value.');
      }
      return;
    }
    
    // Add items to inventory
    let lootedCount = 0;
    let lootText = '';
    
    lootedItems.forEach(itemId => {
      const itemData = global.REALM?.data?.itemsById?.[itemId.toLowerCase()];
      if (itemData) {
        if (global.State?.addItem(itemId)) {
          lootedCount++;
          if (lootText) lootText += ', ';
          lootText += itemData.name;
          global.Toast?.show({
            type: 'success',
            title: 'Item Looted!',
            text: itemData.name
          });
        }
      }
    });
    
    // Update inventory UI
    global.Rendering?.updateInventory();
    
    // Show message
    if (lootedCount > 0) {
      global.Narrative?.addEntry({
        type: 'loot',
        text: `You loot ${lootText} from the ${corpse.corpseName}.`,
        meta: 'Loot'
      });
      
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage(`Looted ${lootedCount} item(s) from ${corpse.corpseName}.`);
      }
    }
    
    // Re-render map to update corpse display
    renderMap();
  }
  
  /**
   * Handle canvas right-click (loot corpse)
   */
  function handleCanvasRightClick(event) {
    event.preventDefault();
    
    const player = global.State?.getPlayer();
    if (!player || !player.currentZone || !player.currentTile) return;

    const zone = global.World?.getZone(player.currentZone);
    if (!zone) return;

    const rect = mapCanvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const tileSize = 16 * zoomLevel;
    const container = mapCanvas.parentElement;
    const containerWidth = container ? container.clientWidth : mapCanvas.width;
    const containerHeight = container ? container.clientHeight : mapCanvas.height;
    const viewportPixelWidth = VIEW_SIZE * tileSize;
    const viewportPixelHeight = VIEW_SIZE * tileSize;
    const offsetX = (containerWidth - viewportPixelWidth) / 2;
    const offsetY = (containerHeight - viewportPixelHeight) / 2;

    // Calculate viewport coordinates
    const vx = Math.floor((clickX - offsetX) / tileSize);
    const vy = Math.floor((clickY - offsetY) / tileSize);

    if (vx < 0 || vx >= VIEW_SIZE || vy < 0 || vy >= VIEW_SIZE) return;

    // Calculate world coordinates
    const worldX = player.currentTile.x + (vx - VIEW_CENTER);
    const worldY = player.currentTile.y + (vy - VIEW_CENTER);

    // Validate coordinates
    if (worldX < 0 || worldX >= zone.gridWidth || worldY < 0 || worldY >= zone.gridHeight) return;

    // Check for corpse (right-click to loot)
    if (global.CorpseSystem) {
      const corpse = global.CorpseSystem.getCorpseAtTile(player.currentZone, worldX, worldY);
      if (corpse) {
        lootCorpse(corpse);
        return;
      }
    }
  }
  
  /**
   * Handle canvas click
   */
  function handleCanvasClick(event) {
    const player = global.State?.getPlayer();
    if (!player || !player.currentZone || !player.currentTile) return;

    const zone = global.World?.getZone(player.currentZone);
    if (!zone) return;

    const rect = mapCanvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const tileSize = 16 * zoomLevel;
    const container = mapCanvas.parentElement;
    const containerWidth = container ? container.clientWidth : mapCanvas.width;
    const containerHeight = container ? container.clientHeight : mapCanvas.height;
    const viewportPixelWidth = VIEW_SIZE * tileSize;
    const viewportPixelHeight = VIEW_SIZE * tileSize;
    const offsetX = (containerWidth - viewportPixelWidth) / 2;
    const offsetY = (containerHeight - viewportPixelHeight) / 2;

    // Calculate viewport coordinates
    const vx = Math.floor((clickX - offsetX) / tileSize);
    const vy = Math.floor((clickY - offsetY) / tileSize);

    if (vx < 0 || vx >= VIEW_SIZE || vy < 0 || vy >= VIEW_SIZE) return;

    // Calculate world coordinates
    const worldX = player.currentTile.x + (vx - VIEW_CENTER);
    const worldY = player.currentTile.y + (vy - VIEW_CENTER);

    // Validate coordinates
    if (worldX < 0 || worldX >= zone.gridWidth || worldY < 0 || worldY >= zone.gridHeight) return;

    // Check for zone transition click
    if (zone.type === 'outdoor' && zone.neighboringZones) {
      for (const neighborZoneId of zone.neighboringZones) {
        const neighborZone = global.World?.getZone(neighborZoneId);
        if (!neighborZone || neighborZone.type !== 'city') continue;

        const transitionPoints = [
          { x: Math.floor(zone.gridWidth / 2), y: 0 },
          { x: zone.gridWidth - 1, y: Math.floor(zone.gridHeight / 2) },
          { x: Math.floor(zone.gridWidth / 2), y: zone.gridHeight - 1 },
          { x: 0, y: Math.floor(zone.gridHeight / 2) }
        ];

        for (const tp of transitionPoints) {
          const distance = Math.abs(worldX - tp.x) + Math.abs(worldY - tp.y);
          if (distance <= 2) {
            if (global.Zones?.changeZone(neighborZoneId)) {
              setTimeout(() => {
                renderMap();
                if (global.SpawnSystem && player.currentZone) {
                  global.SpawnSystem.initializeZone(player.currentZone);
                }
              }, 100);
              return;
            }
          }
        }
      }
    }

    // Check for corpse first (loot on click)
    if (global.CorpseSystem) {
      const corpse = global.CorpseSystem.getCorpseAtTile(player.currentZone, worldX, worldY);
      if (corpse) {
        // Loot the corpse
        lootCorpse(corpse);
        return;
      }
    }

    // Get all entities at this tile
    const entities = getEntitiesAtTile(player.currentZone, worldX, worldY);

    // Priority: hostile mobs > NPCs > players > empty
    let targetEntity = null;
    if (entities.mobs.length > 0) {
      targetEntity = entities.mobs[0]; // Use first mob
    } else if (entities.npcs.length > 0) {
      targetEntity = entities.npcs[0];
    } else if (entities.players.length > 0) {
      targetEntity = entities.players[0];
    }

    if (targetEntity) {
      // Check if entity is actually visible in viewport (prevent interacting with entities outside viewport)
      const dx = worldX - player.currentTile.x;
      const dy = worldY - player.currentTile.y;
      const isInViewport = Math.abs(dx) <= VIEW_RADIUS && Math.abs(dy) <= VIEW_RADIUS;
      
      if (!isInViewport) {
        // Entity is outside viewport - don't interact
        return;
      }

      // Set as target (don't auto-attack - user must use Attack button or skillbar)
      if (global.Targeting) {
        global.Targeting.setTarget(targetEntity);
      }
      
      // For mobs, just set as target - don't auto-attack
      if (targetEntity.mobTemplate && !targetEntity.mobTemplate.isGuard) {
        const playerX = player.currentTile?.x || 0;
        const playerY = player.currentTile?.y || 0;
        const distance = Math.abs(worldX - playerX) + Math.abs(worldY - playerY);
        
        if (distance > 1) {
          // Move towards target
          if (global.Movement) {
            global.Movement.moveToTile(worldX, worldY);
          }
        }
        // Update tile detail panel so user can see Attack option
        if (global.TileDetailPanel) {
          global.TileDetailPanel.updateTile(player.currentZone, worldX, worldY);
        }
      } else {
        // Update tile detail panel
        if (global.TileDetailPanel) {
          global.TileDetailPanel.updateTile(player.currentZone, worldX, worldY);
        }
      }
      return;
    }

    // Click on empty tile - try to pathfind to it
    // Check if tile is within viewport distance
    const playerX = player.currentTile?.x || 0;
    const playerY = player.currentTile?.y || 0;
    const distance = Math.abs(worldX - playerX) + Math.abs(worldY - playerY);
    
    if (distance > VIEW_RADIUS) {
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage('That location is too far away.');
      }
      return;
    }

    // Try to move to tile (pathfinding will handle the rest)
    if (global.Movement) {
      global.Movement.moveToTile(worldX, worldY);
    }

    // Update tile detail panel
    if (global.TileDetailPanel) {
      global.TileDetailPanel.updateTile(player.currentZone, worldX, worldY);
    }
  }

  /**
   * Center map on player (no-op since always centered, but kept for compatibility)
   */
  function centerOnPlayer() {
    renderMap(); // Just re-render
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMapCanvas);
  } else {
    setTimeout(initializeMapCanvas, 100);
  }

  const WorldMapRender = {
    renderMap,
    centerOnPlayer,
    updateMapLegend,
    get zoomLevel() { return zoomLevel; },
    get panX() { return 0; }, // Deprecated - always 0
    get panY() { return 0; }  // Deprecated - always 0
  };

  global.WorldMapRender = WorldMapRender;
})(window);
