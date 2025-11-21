/**
 * Full Map Modal
 * 
 * Displays the entire zone grid with player location and zone transitions.
 * Shows zone boundaries, POIs, and neighboring zones.
 */

(function (global) {
  let modalElement = null;
  let mapCanvas = null;
  let mapCtx = null;
  let isOpen = false;

  /**
   * Initialize full map modal
   */
  function initialize() {
    // Create modal element
    modalElement = document.createElement('div');
    modalElement.id = 'fullMapModal';
    modalElement.className = 'full-map-modal hidden';
    modalElement.innerHTML = `
      <div class="full-map-modal-content">
        <div class="full-map-header">
          <h2 id="fullMapZoneName">Zone Map</h2>
          <button class="full-map-close" id="fullMapClose" title="Close Map">×</button>
        </div>
        <div class="full-map-body">
          <canvas id="fullMapCanvas"></canvas>
        </div>
      </div>
    `;
    document.body.appendChild(modalElement);

    // Get canvas
    mapCanvas = document.getElementById('fullMapCanvas');
    if (mapCanvas) {
      mapCtx = mapCanvas.getContext('2d');
      
      // Setup canvas sizing
      setupCanvas();
      
      // Handle resize
      window.addEventListener('resize', setupCanvas);
    }

    // Close button
    const closeBtn = document.getElementById('fullMapClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    });

    // Close on backdrop click
    if (modalElement) {
      modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) {
          close();
        }
      });
    }

    // Map button click handler
    const mapBtn = document.getElementById('mapBtn');
    if (mapBtn) {
      mapBtn.addEventListener('click', open);
    }

    // Keyboard shortcut (M key)
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'm' || e.key === 'M') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
    });
  }

  /**
   * Setup canvas size
   */
  function setupCanvas() {
    if (!mapCanvas || !mapCtx) return;

    const modalContent = document.querySelector('.full-map-modal-content');
    if (!modalContent) return;

    const rect = modalContent.getBoundingClientRect();
    const maxWidth = Math.min(800, window.innerWidth - 40);
    const maxHeight = Math.min(600, window.innerHeight - 100);
    
    mapCanvas.width = maxWidth;
    mapCanvas.height = maxHeight;
    mapCanvas.style.width = maxWidth + 'px';
    mapCanvas.style.height = maxHeight + 'px';
    
    // Clear blur
    mapCtx.imageSmoothingEnabled = true;
    mapCtx.imageSmoothingQuality = 'high';
  }

  /**
   * Open full map modal
   */
  function open() {
    if (!modalElement) initialize();
    
    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) return;

    isOpen = true;
    modalElement.classList.remove('hidden');
    
    // Update zone name
    const zoneNameEl = document.getElementById('fullMapZoneName');
    const zone = global.World?.getZone(player.currentZone);
    if (zoneNameEl && zone) {
      zoneNameEl.textContent = zone.name || 'Zone Map';
    }

    renderFullMap();
  }

  /**
   * Close full map modal
   */
  function close() {
    if (!modalElement) return;
    isOpen = false;
    modalElement.classList.add('hidden');
  }

  /**
   * Render full zone map
   */
  function renderFullMap() {
    if (!mapCanvas || !mapCtx) return;

    const player = global.State?.getPlayer();
    if (!player || !player.currentZone || !player.currentTile) return;

    const zone = global.World?.getZone(player.currentZone);
    if (!zone) return;

    // Clear canvas
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    // Calculate tile size to fit entire zone
    const padding = 40; // Padding for labels
    const availableWidth = mapCanvas.width - padding * 2;
    const availableHeight = mapCanvas.height - padding * 2;
    const tileSize = Math.min(
      Math.floor(availableWidth / zone.gridWidth),
      Math.floor(availableHeight / zone.gridHeight),
      20 // Max tile size
    );

    const offsetX = (mapCanvas.width - (zone.gridWidth * tileSize)) / 2;
    const offsetY = (mapCanvas.height - (zone.gridHeight * tileSize)) / 2;

    // Terrain colors
    const TERRAIN_COLORS = {
      city_street: '#6b6b6b',
      city_plaza: '#8b8b8b',
      building: '#4a4a4a',
      wall: '#2a2a2a',
      grass: '#4a7c3a',
      path: '#8b7355',
      tree: '#2d5016',
      water: '#1a3a5c',
      rock: '#5a5a5a',
      dungeon_floor: '#6b5b4f',
      dungeon_wall: '#3a3a3a',
      default: '#4a4a4a'
    };

    // Draw all tiles
    for (let y = 0; y < zone.gridHeight; y++) {
      for (let x = 0; x < zone.gridWidth; x++) {
        const tile = global.World?.getTile(player.currentZone, x, y);
        if (!tile) continue;

        const screenX = x * tileSize + offsetX;
        const screenY = y * tileSize + offsetY;

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
      }
    }

    // Draw zone boundaries
    mapCtx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    mapCtx.lineWidth = 2;
    mapCtx.strokeRect(offsetX, offsetY, zone.gridWidth * tileSize, zone.gridHeight * tileSize);

    // Draw zone transition arrows at edges
    if (zone.neighboringZones && zone.neighboringZones.length > 0) {
      zone.neighboringZones.forEach(neighborZoneId => {
        const neighborZone = global.World?.getZone(neighborZoneId);
        if (!neighborZone) return;

        // Determine transition point (edge of current zone)
        // Draw arrows at zone edges to show neighboring zones
        // Check all 4 edges and draw arrows where neighboring zones exist
        const edgePoints = [
          { x: Math.floor(zone.gridWidth / 2), y: 0, dir: 'up', screenX: Math.floor(zone.gridWidth / 2) * tileSize + offsetX, screenY: offsetY },
          { x: zone.gridWidth - 1, y: Math.floor(zone.gridHeight / 2), dir: 'right', screenX: (zone.gridWidth - 1) * tileSize + offsetX, screenY: Math.floor(zone.gridHeight / 2) * tileSize + offsetY },
          { x: Math.floor(zone.gridWidth / 2), y: zone.gridHeight - 1, dir: 'down', screenX: Math.floor(zone.gridWidth / 2) * tileSize + offsetX, screenY: (zone.gridHeight - 1) * tileSize + offsetY },
          { x: 0, y: Math.floor(zone.gridHeight / 2), dir: 'left', screenX: offsetX, screenY: Math.floor(zone.gridHeight / 2) * tileSize + offsetY }
        ];

        // Use first edge point for now (can be improved with zone-specific data)
        const edgePoint = edgePoints[0];
        const transitionX = edgePoint.screenX;
        const transitionY = edgePoint.screenY;
        const arrowDir = edgePoint.dir;

        // Draw transition arrow
        mapCtx.save();
        mapCtx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        mapCtx.strokeStyle = '#ffd700';
        mapCtx.lineWidth = 2;
        
        const arrowSize = tileSize * 0.8;
        const centerX = transitionX + tileSize / 2;
        const centerY = transitionY + tileSize / 2;

        // Draw arrow
        mapCtx.beginPath();
        if (arrowDir === 'up') {
          mapCtx.moveTo(centerX, centerY - arrowSize / 2);
          mapCtx.lineTo(centerX - arrowSize / 2, centerY + arrowSize / 2);
          mapCtx.lineTo(centerX, centerY + arrowSize / 3);
          mapCtx.lineTo(centerX + arrowSize / 2, centerY + arrowSize / 2);
        } else if (arrowDir === 'down') {
          mapCtx.moveTo(centerX, centerY + arrowSize / 2);
          mapCtx.lineTo(centerX - arrowSize / 2, centerY - arrowSize / 2);
          mapCtx.lineTo(centerX, centerY - arrowSize / 3);
          mapCtx.lineTo(centerX + arrowSize / 2, centerY - arrowSize / 2);
        } else if (arrowDir === 'left') {
          mapCtx.moveTo(centerX - arrowSize / 2, centerY);
          mapCtx.lineTo(centerX + arrowSize / 2, centerY - arrowSize / 2);
          mapCtx.lineTo(centerX + arrowSize / 3, centerY);
          mapCtx.lineTo(centerX + arrowSize / 2, centerY + arrowSize / 2);
        } else if (arrowDir === 'right') {
          mapCtx.moveTo(centerX + arrowSize / 2, centerY);
          mapCtx.lineTo(centerX - arrowSize / 2, centerY - arrowSize / 2);
          mapCtx.lineTo(centerX - arrowSize / 3, centerY);
          mapCtx.lineTo(centerX - arrowSize / 2, centerY + arrowSize / 2);
        }
        mapCtx.closePath();
        mapCtx.fill();
        mapCtx.stroke();

        // Draw zone name label
        mapCtx.fillStyle = '#fff';
        mapCtx.strokeStyle = '#000';
        mapCtx.lineWidth = 3;
        mapCtx.font = `bold ${Math.max(12, tileSize / 3)}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-body')}`;
        mapCtx.textAlign = 'center';
        
        let labelX = centerX;
        let labelY = centerY - tileSize;
        if (arrowDir === 'down') labelY = centerY + tileSize * 1.5;
        else if (arrowDir === 'left') { labelX = centerX - tileSize; labelY = centerY; }
        else if (arrowDir === 'right') { labelX = centerX + tileSize; labelY = centerY; }

        const labelText = `→ ${neighborZone.name}`;
        mapCtx.strokeText(labelText, labelX, labelY);
        mapCtx.fillText(labelText, labelX, labelY);
        mapCtx.restore();
      });
    }

    // Draw player location (large and visible)
    const playerX = player.currentTile.x * tileSize + offsetX;
    const playerY = player.currentTile.y * tileSize + offsetY;
    
    mapCtx.fillStyle = '#ff4444';
    mapCtx.beginPath();
    mapCtx.arc(playerX + tileSize / 2, playerY + tileSize / 2, tileSize / 2, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.strokeStyle = '#fff';
    mapCtx.lineWidth = 3;
    mapCtx.stroke();

    // Draw player name
    mapCtx.fillStyle = '#fff';
    mapCtx.strokeStyle = '#000';
    mapCtx.lineWidth = 3;
    mapCtx.font = `bold ${Math.max(12, tileSize / 2)}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-body')}`;
    mapCtx.textAlign = 'center';
    const playerName = player.name || 'You';
    mapCtx.strokeText(playerName, playerX + tileSize / 2, playerY - tileSize * 0.5);
    mapCtx.fillText(playerName, playerX + tileSize / 2, playerY - tileSize * 0.5);

    // Draw grid lines (subtle)
    mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    mapCtx.lineWidth = 1;
    for (let x = 0; x <= zone.gridWidth; x++) {
      const lineX = x * tileSize + offsetX;
      mapCtx.beginPath();
      mapCtx.moveTo(lineX, offsetY);
      mapCtx.lineTo(lineX, offsetY + zone.gridHeight * tileSize);
      mapCtx.stroke();
    }
    for (let y = 0; y <= zone.gridHeight; y++) {
      const lineY = y * tileSize + offsetY;
      mapCtx.beginPath();
      mapCtx.moveTo(offsetX, lineY);
      mapCtx.lineTo(offsetX + zone.gridWidth * tileSize, lineY);
      mapCtx.stroke();
    }

    // Draw coordinate labels at corners
    mapCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    mapCtx.font = `${Math.max(10, tileSize / 4)}px monospace`;
    mapCtx.textAlign = 'left';
    mapCtx.fillText(`(0, 0)`, offsetX + 5, offsetY + 15);
    mapCtx.textAlign = 'right';
    mapCtx.fillText(`(${zone.gridWidth - 1}, ${zone.gridHeight - 1})`, offsetX + zone.gridWidth * tileSize - 5, offsetY + zone.gridHeight * tileSize - 5);
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }

  const FullMapModal = {
    open,
    close,
    renderFullMap,
    isOpen: () => isOpen
  };

  global.FullMapModal = FullMapModal;
})(window);

