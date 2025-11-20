(function (global) {
  let mapCanvas = null;
  let mapCtx = null;
  let zoomLevel = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

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

    // Pan and zoom controls
    mapCanvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStartX = e.clientX - panX;
      dragStartY = e.clientY - panY;
      mapCanvas.style.cursor = 'grabbing';
    });

    mapCanvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        panX = e.clientX - dragStartX;
        panY = e.clientY - dragStartY;
        renderMap();
      }
    });

    mapCanvas.addEventListener('mouseup', () => {
      isDragging = false;
      mapCanvas.style.cursor = 'grab';
    });

    mapCanvas.addEventListener('mouseleave', () => {
      isDragging = false;
      mapCanvas.style.cursor = 'grab';
    });

    // Zoom controls
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        zoomLevel = Math.min(3, zoomLevel + 0.2);
        renderMap();
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        zoomLevel = Math.max(0.5, zoomLevel - 0.2);
        renderMap();
      });
    }

    // Initial render
    renderMap();
  }

  function renderMap() {
    if (!mapCanvas || !mapCtx) return;

    const player = global.State?.getPlayer();
    const worldMap = global.Settlement?.getWorldMap() || [];
    const tileSize = 16 * zoomLevel;

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

        // Player position
        if (player && player.currentTile && player.currentTile.x === x && player.currentTile.y === y) {
          mapCtx.fillStyle = '#ff4444';
          mapCtx.beginPath();
          mapCtx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 2.5, 0, Math.PI * 2);
          mapCtx.fill();
          mapCtx.strokeStyle = '#fff';
          mapCtx.lineWidth = 2;
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

    const tileSize = 16 * zoomLevel;
    const container = mapCanvas?.parentElement;
    if (!container) return;

    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;

    panX = centerX - (player.currentTile.x * tileSize);
    panY = centerY - (player.currentTile.y * tileSize);

    renderMap();
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
    updateMapLegend
  };

  global.MapRender = MapRender;
})(window);

