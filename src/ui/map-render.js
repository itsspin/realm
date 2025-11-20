(function (global) {
  let mapCanvas = null;
  let mapCtx = null;
  let zoomLevel = 2; // Start zoomed in more
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  
  // Expose for movement system
  global.MapRender = global.MapRender || {};
  global.MapRender.zoomLevel = zoomLevel;
  global.MapRender.panX = panX;
  global.MapRender.panY = panY;

  function initializeMapCanvas() {
    mapCanvas = document.getElementById('worldMapCanvas');
    if (!mapCanvas) return;

    mapCtx = mapCanvas.getContext('2d');
    if (!mapCtx) return;

    // Set canvas size
    const container = mapCanvas.parentElement;
    if (container) {
      const resizeCanvas = () => {
        const rect = container.getBoundingClientRect();
        mapCanvas.width = rect.width * window.devicePixelRatio;
        mapCanvas.height = rect.height * window.devicePixelRatio;
        mapCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        mapCanvas.style.width = rect.width + 'px';
        mapCanvas.style.height = rect.height + 'px';
        renderMap();
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    }

    // Pan and zoom controls (right-click or middle-click to pan)
    mapCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 2 || e.button === 1) { // Right click or middle click
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
        global.MapRender.panX = panX;
        global.MapRender.panY = panY;
        renderMap();
      } else {
        // Update cursor based on what's under mouse
        const rect = mapCanvas.getBoundingClientRect();
        const scale = mapCanvas.width / rect.width;
        const clickX = (e.clientX - rect.left) * scale;
        const clickY = (e.clientY - rect.top) * scale;
        const tileSize = 20 * zoomLevel;
        const tileX = Math.floor((clickX - panX) / tileSize);
        const tileY = Math.floor((clickY - panY) / tileSize);
        
        // Validate coordinates
        if (tileX >= 0 && tileX < 50 && tileY >= 0 && tileY < 50) {
          const monsters = global.MapEntities?.getNearbyMonsters() || [];
          const monster = monsters.find(m => m.x === tileX && m.y === tileY);
          if (monster) {
            mapCanvas.style.cursor = 'crosshair';
            return;
          }
          
          const players = global.MapEntities?.getNearbyPlayers() || [];
          const clickedPlayer = players.find(p => {
            const pTile = p.currentTile || { x: p.x, y: p.y };
            return pTile && pTile.x === tileX && pTile.y === tileY;
          });
          if (clickedPlayer) {
            mapCanvas.style.cursor = 'pointer';
            return;
          }
        }
        
        mapCanvas.style.cursor = 'pointer';
      }
    });

    mapCanvas.addEventListener('mouseup', (e) => {
      if (e.button === 2 || e.button === 1) {
        isDragging = false;
        mapCanvas.style.cursor = 'pointer';
      }
    });

    mapCanvas.addEventListener('mouseleave', () => {
      isDragging = false;
      mapCanvas.style.cursor = 'pointer';
    });

    // Left click to move or interact
    mapCanvas.addEventListener('click', handleCanvasClick);
    
    // Prevent context menu on right click
    mapCanvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Zoom controls
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const centerPlayerBtn = document.getElementById('centerPlayerBtn');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        zoomLevel = Math.min(4, zoomLevel + 0.3);
        global.MapRender.zoomLevel = zoomLevel;
        renderMap();
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        zoomLevel = Math.max(0.5, zoomLevel - 0.3);
        global.MapRender.zoomLevel = zoomLevel;
        renderMap();
      });
    }

    if (centerPlayerBtn) {
      centerPlayerBtn.addEventListener('click', () => {
        centerOnPlayer();
      });
    }

    // Initial render
    renderMap();
  }

  function renderMap() {
    if (!mapCanvas || !mapCtx) return;

    const player = global.State?.getPlayer();
    const worldMap = global.Settlement?.getWorldMap() || [];
    const tileSize = 20 * zoomLevel; // Larger tiles for better visibility
    
    // Update exposed values
    global.MapRender.zoomLevel = zoomLevel;
    global.MapRender.panX = panX;
    global.MapRender.panY = panY;

    // Clear canvas
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    // Calculate visible area
    const startX = Math.max(0, Math.floor(-panX / tileSize));
    const endX = Math.min(50, Math.ceil((mapCanvas.width / window.devicePixelRatio - panX) / tileSize));
    const startY = Math.max(0, Math.floor(-panY / tileSize));
    const endY = Math.min(50, Math.ceil((mapCanvas.height / window.devicePixelRatio - panY) / tileSize));

    // Draw tiles
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = worldMap.find(t => t.x === x && t.y === y);
        if (!tile) continue;

        const screenX = x * tileSize + panX;
        const screenY = y * tileSize + panY;

        // Terrain color
        const terrainColors = {
          plains: '#8B7355',
          forest: '#2d5016',
          hills: '#6B5B4F',
          water: '#1a3a5c',
          desert: '#C19A6B'
        };

        mapCtx.fillStyle = terrainColors[tile.terrain] || '#4a4a4a';
        mapCtx.fillRect(screenX, screenY, tileSize, tileSize);

        // Border
        mapCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        mapCtx.lineWidth = 1;
        mapCtx.strokeRect(screenX, screenY, tileSize, tileSize);

        // Settlement marker
        if (tile.settlement) {
          mapCtx.fillStyle = 'rgba(255, 215, 0, 0.8)';
          mapCtx.beginPath();
          mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
          mapCtx.fill();
        }

        // Nearby monsters (draw before player so player is on top)
        const monsters = global.MapEntities?.getNearbyMonsters() || [];
        const monsterHere = monsters.find(m => m.x === x && m.y === y);
        if (monsterHere) {
          mapCtx.fillStyle = '#ff6666';
          mapCtx.beginPath();
          mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
          mapCtx.fill();
          mapCtx.strokeStyle = '#ff0000';
          mapCtx.lineWidth = 2;
          mapCtx.stroke();
          // Draw monster name
          mapCtx.fillStyle = '#fff';
          mapCtx.font = `${tileSize / 2}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-body')}`;
          mapCtx.textAlign = 'center';
          mapCtx.fillText(monsterHere.monster?.name || 'Monster', screenX + tileSize / 2, screenY - 2);
        }

        // Nearby players (draw before player so player is on top)
        const players = global.MapEntities?.getNearbyPlayers() || [];
        const playerHere = players.find(p => {
          const pTile = p.currentTile || { x: p.x, y: p.y };
          return pTile && pTile.x === x && pTile.y === y;
        });
        if (playerHere && playerHere.id !== player?.id) {
          mapCtx.fillStyle = '#44ff44';
          mapCtx.beginPath();
          mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
          mapCtx.fill();
          mapCtx.strokeStyle = '#00ff00';
          mapCtx.lineWidth = 2;
          mapCtx.stroke();
          // Draw player name
          mapCtx.fillStyle = '#fff';
          mapCtx.font = `${tileSize / 2}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-body')}`;
          mapCtx.textAlign = 'center';
          mapCtx.fillText(playerHere.name || 'Player', screenX + tileSize / 2, screenY - 2);
        }

        // Player position
        if (player && player.currentTile && player.currentTile.x === x && player.currentTile.y === y) {
          mapCtx.fillStyle = '#ff4444';
          mapCtx.beginPath();
          mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 2.5, 0, Math.PI * 2);
          mapCtx.fill();
          mapCtx.strokeStyle = '#fff';
          mapCtx.lineWidth = 3;
          mapCtx.stroke();
        }

        // Owned tile border
        if (tile.owner === player?.id) {
          mapCtx.strokeStyle = 'rgba(201, 125, 61, 0.8)';
          mapCtx.lineWidth = 2;
          mapCtx.strokeRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
        }
      }
    }

    // Draw legend
    updateMapLegend();
  }

  function updateMapLegend() {
    const legend = document.getElementById('mapLegend');
    if (!legend) return;

    const player = global.State?.getPlayer();
    legend.innerHTML = `
      <div class="legend-item">
        <div style="width: 12px; height: 12px; background: #ff4444; border-radius: 50%; border: 1px solid #fff;"></div>
        <span>You (${player?.name || 'Player'})</span>
      </div>
      <div class="legend-item">
        <div style="width: 12px; height: 12px; background: rgba(255, 215, 0, 0.8); border-radius: 50%;"></div>
        <span>Settlement</span>
      </div>
      <div class="legend-item">
        <div style="width: 12px; height: 12px; background: #8B7355; border: 1px solid rgba(0,0,0,0.3);"></div>
        <span>Plains</span>
      </div>
      <div class="legend-item">
        <div style="width: 12px; height: 12px; background: #2d5016; border: 1px solid rgba(0,0,0,0.3);"></div>
        <span>Forest</span>
      </div>
      <div class="legend-item">
        <div style="width: 12px; height: 12px; background: #1a3a5c; border: 1px solid rgba(0,0,0,0.3);"></div>
        <span>Water</span>
      </div>
    `;
  }

  function centerOnPlayer() {
    const player = global.State?.getPlayer();
    if (!player || !player.currentTile) return;

    const tileSize = 20 * zoomLevel;
    const container = mapCanvas?.parentElement;
    if (!container) return;

    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;

    panX = centerX - (player.currentTile.x * tileSize);
    panY = centerY - (player.currentTile.y * tileSize);
    
    global.MapRender.panX = panX;
    global.MapRender.panY = panY;

    renderMap();
  }
  
  function handleCanvasClick(event) {
    if (isDragging) return; // Don't move if we were dragging
    
    const rect = mapCanvas.getBoundingClientRect();
    const scale = mapCanvas.width / rect.width;
    
    const clickX = (event.clientX - rect.left) * scale;
    const clickY = (event.clientY - rect.top) * scale;

    const tileSize = 20 * zoomLevel;
    const tileX = Math.floor((clickX - panX) / tileSize);
    const tileY = Math.floor((clickY - panY) / tileSize);

    // Validate tile coordinates
    if (tileX < 0 || tileX >= 50 || tileY < 0 || tileY >= 50) return;

    // Check for monster click
    const monsters = global.MapEntities?.getNearbyMonsters() || [];
    const monster = monsters.find(m => m.x === tileX && m.y === tileY);
    if (monster) {
      global.MapEntities?.attackMonsterAtTile(tileX, tileY);
      return;
    }

    // Check for player click
    const players = global.MapEntities?.getNearbyPlayers() || [];
    const clickedPlayer = players.find(p => {
      const pTile = p.currentTile || { x: p.x, y: p.y };
      return pTile && pTile.x === tileX && pTile.y === tileY;
    });
    if (clickedPlayer) {
      global.NearbyPlayers?.showPlayerMenu(clickedPlayer.id, event);
      return;
    }

    // Otherwise, move to tile
    global.Movement?.moveToTile(tileX, tileY);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMapCanvas);
  } else {
    setTimeout(initializeMapCanvas, 100);
  }

  const MapRender = {
    renderMap,
    centerOnPlayer,
    updateMapLegend,
    zoomLevel,
    panX,
    panY
  };

  global.MapRender = MapRender;
})(window);

