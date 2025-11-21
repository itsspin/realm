/**
 * World Map Rendering System
 * 
 * Renders the grid-based world map using the new World system.
 * Supports different tile types: city streets, buildings, walls, grass, paths, water, etc.
 */

(function (global) {
  let mapCanvas = null;
  let mapCtx = null;
  let zoomLevel = 1.5;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let showDebugOverlay = false;

  // Expose for movement system
  global.WorldMapRender = global.WorldMapRender || {};
  global.WorldMapRender.zoomLevel = zoomLevel;
  global.WorldMapRender.panX = panX;
  global.WorldMapRender.panY = panY;
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

    // Set canvas size (new UI structure: map-canvas-container)
    const container = mapCanvas.closest('.map-canvas-container') || mapCanvas.parentElement;
    if (container) {
      const resizeCanvas = () => {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        mapCanvas.width = rect.width * dpr;
        mapCanvas.height = rect.height * dpr;
        mapCtx.scale(dpr, dpr);
        mapCanvas.style.width = rect.width + 'px';
        mapCanvas.style.height = rect.height + 'px';
        renderMap();
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    }

    // Pan controls (right-click or middle-click)
    mapCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 2 || e.button === 1) {
        isDragging = true;
        dragStartX = e.clientX - panX;
        dragStartY = e.clientY - panY;
        mapCanvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    mapCanvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        panX = e.clientX - dragStartX;
        panY = e.clientY - dragStartY;
        global.WorldMapRender.panX = panX;
        global.WorldMapRender.panY = panY;
        renderMap();
      }
    });

    mapCanvas.addEventListener('mouseup', (e) => {
      if (e.button === 2 || e.button === 1) {
        isDragging = false;
        mapCanvas.style.cursor = 'pointer';
      }
    });

    mapCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Click to move
    mapCanvas.addEventListener('click', handleCanvasClick);

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

    if (centerPlayerBtn) {
      centerPlayerBtn.addEventListener('click', centerOnPlayer);
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
   * Render the map
   */
  function renderMap() {
    if (!mapCanvas || !mapCtx) return;

    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) return;

    const zone = global.World?.getZone(player.currentZone);
    if (!zone) return;

    const tiles = global.World?.getZoneTiles(player.currentZone) || [];
    const tileSize = 16 * zoomLevel;

    // Update exposed values
    global.WorldMapRender.zoomLevel = zoomLevel;
    global.WorldMapRender.panX = panX;
    global.WorldMapRender.panY = panY;

    // Clear canvas
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    // Calculate visible area
    const container = mapCanvas.parentElement;
    const containerWidth = container ? container.clientWidth : mapCanvas.width;
    const containerHeight = container ? container.clientHeight : mapCanvas.height;

    const startX = Math.max(0, Math.floor(-panX / tileSize));
    const endX = Math.min(zone.gridWidth, Math.ceil((containerWidth - panX) / tileSize));
    const startY = Math.max(0, Math.floor(-panY / tileSize));
    const endY = Math.min(zone.gridHeight, Math.ceil((containerHeight - panY) / tileSize));

    // Draw tiles
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = global.World?.getTile(player.currentZone, x, y);
        if (!tile) continue;

        const screenX = x * tileSize + panX;
        const screenY = y * tileSize + panY;

        // Draw terrain
        const color = TERRAIN_COLORS[tile.terrainType] || TERRAIN_COLORS.default;
        mapCtx.fillStyle = color;
        mapCtx.fillRect(screenX, screenY, tileSize, tileSize);

        // Draw border for non-walkable tiles
        if (!tile.walkable) {
          mapCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
          mapCtx.lineWidth = 1;
          mapCtx.strokeRect(screenX, screenY, tileSize, tileSize);
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
      }
    }

    // Draw entities (monsters from spawn system)
    if (player && player.currentZone && player.currentTile) {
      const mobs = global.SpawnSystem?.getAliveMobs(player.currentZone) || [];
      const currentTarget = global.Targeting?.getTarget();

      // Draw monsters
      mobs.forEach(mob => {
        const screenX = mob.x * tileSize + panX;
        const screenY = mob.y * tileSize + panY;
        
        // Check if this is the current target
        const isTargeted = currentTarget && currentTarget.id === mob.id;
        
        // Draw mob
        mapCtx.fillStyle = isTargeted ? '#ffff00' : '#ff6666'; // Yellow if targeted
        mapCtx.beginPath();
        mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.strokeStyle = isTargeted ? '#ffaa00' : '#ff0000';
        mapCtx.lineWidth = isTargeted ? 3 : 2;
        mapCtx.stroke();

        // Draw mob name
        if (tileSize >= 20) {
          mapCtx.fillStyle = '#fff';
          mapCtx.font = `${Math.max(10, tileSize / 3)}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-body')}`;
          mapCtx.textAlign = 'center';
          mapCtx.fillText(mob.mobTemplate?.name || 'Mob', screenX + tileSize / 2, screenY - 2);
        }

        // Highlight targeted tile
        if (isTargeted) {
          mapCtx.strokeStyle = '#ffff00';
          mapCtx.lineWidth = 2;
          mapCtx.strokeRect(screenX - 1, screenY - 1, tileSize + 2, tileSize + 2);
        }
      });
    }

    // Draw other players
    players.forEach(p => {
      const pTile = p.currentTile || { x: p.x, y: p.y };
      if (!pTile || p.id === player?.id) return;
      const screenX = pTile.x * tileSize + panX;
      const screenY = pTile.y * tileSize + panY;
      mapCtx.fillStyle = '#44ff44';
      mapCtx.beginPath();
      mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
      mapCtx.fill();
    });

    // Draw player
    if (player.currentTile) {
      const screenX = player.currentTile.x * tileSize + panX;
      const screenY = player.currentTile.y * tileSize + panY;
      mapCtx.fillStyle = '#ff4444';
      mapCtx.beginPath();
      mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 2.5, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.strokeStyle = '#fff';
      mapCtx.lineWidth = 3;
      mapCtx.stroke();
    }

    // Draw debug overlay (spawn points)
    if (showDebugOverlay) {
      drawDebugOverlay(zone, tileSize);
    }

    // Update legend
    updateMapLegend(zone);
  }

  /**
   * Draw debug overlay showing spawn points
   */
  function drawDebugOverlay(zone, tileSize) {
    const spawnGroups = global.World?.getSpawnGroupsForZone(zone.id) || [];
    
    spawnGroups.forEach(spawnGroup => {
      if (spawnGroup.spawnPoints && spawnGroup.spawnPoints.length > 0) {
        spawnGroup.spawnPoints.forEach((spawnPoint, index) => {
          const screenX = spawnPoint.x * tileSize + panX;
          const screenY = spawnPoint.y * tileSize + panY;
          
          // Draw spawn point marker
          const color = spawnGroup.spawnType === 'static' ? '#00ff00' : '#0000ff';
          mapCtx.fillStyle = color + '80'; // Semi-transparent
          mapCtx.beginPath();
          mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 4, 0, Math.PI * 2);
          mapCtx.fill();
          mapCtx.strokeStyle = color;
          mapCtx.lineWidth = 2;
          mapCtx.stroke();

          // Draw spawn point label
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
   * Center map on player
   */
  function centerOnPlayer() {
    const player = global.State?.getPlayer();
    if (!player || !player.currentTile) return;

    const zone = global.World?.getZone(player.currentZone);
    if (!zone) return;

    const tileSize = 16 * zoomLevel;
    const container = mapCanvas?.parentElement;
    if (!container) return;

    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;

    panX = centerX - (player.currentTile.x * tileSize);
    panY = centerY - (player.currentTile.y * tileSize);

    global.WorldMapRender.panX = panX;
    global.WorldMapRender.panY = panY;

    renderMap();
  }

  /**
   * Handle canvas click
   */
  function handleCanvasClick(event) {
    if (isDragging) return;

    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) return;

    const zone = global.World?.getZone(player.currentZone);
    if (!zone) return;

    const rect = mapCanvas.getBoundingClientRect();
    const scale = mapCanvas.width / rect.width;
    const clickX = (event.clientX - rect.left) * scale;
    const clickY = (event.clientY - rect.top) * scale;

    const tileSize = 16 * zoomLevel;
    const tileX = Math.floor((clickX / scale - panX) / tileSize);
    const tileY = Math.floor((clickY / scale - panY) / tileSize);

    // Validate coordinates
    if (tileX < 0 || tileX >= zone.gridWidth || tileY < 0 || tileY >= zone.gridHeight) return;

    // Check for monster click (targeting)
    const mob = global.SpawnSystem?.getMobAtTile(player.currentZone, tileX, tileY);
    if (mob) {
      // Set as target
      global.Targeting?.setTarget(mob);
      
      // If adjacent, attack
      const playerX = player.currentTile?.x || 0;
      const playerY = player.currentTile?.y || 0;
      const distance = Math.abs(tileX - playerX) + Math.abs(tileY - playerY);
      
      if (distance <= 1) {
        // Attack if adjacent
        global.Combat?.startCombat(mob.mobTemplateId);
      } else {
        // Move towards target
        global.Movement?.moveToTile(tileX, tileY);
      }
      return;
    }

    // Click on empty tile - clear target if just moving
    if (global.Targeting?.getTarget()) {
      // Keep target when moving
    }

    // Check if tile is walkable
    if (!global.World?.isTileWalkable(player.currentZone, tileX, tileY)) {
      global.ChatSystem?.addSystemMessage('You cannot move there.');
      return;
    }

    // Move to tile
    global.Movement?.moveToTile(tileX, tileY);
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
    zoomLevel,
    panX,
    panY
  };

  global.WorldMapRender = WorldMapRender;
})(window);

