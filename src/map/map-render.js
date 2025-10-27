(function () {
  const canvas = document.getElementById('mapCanvas');
  if (!canvas) {
    console.warn('[MapRender] Unable to locate #mapCanvas element.');
    window.MapRender = { draw: () => {} };
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('[MapRender] Unable to acquire 2D rendering context.');
    window.MapRender = { draw: () => {} };
    return;
  }

  const DEFAULT_CANVAS_SIZE = { width: 640, height: 480 };
  const BIOME_COLORS = {
    plains: '#c4d79b',
    grassland: '#9ecb74',
    forest: '#4b9560',
    jungle: '#1f6f50',
    desert: '#f7d488',
    tundra: '#dfe7f2',
    mountain: '#b8b8b8',
    hills: '#a3a08c',
    swamp: '#3f4f2f',
    marsh: '#3d5843',
    water: '#5aa1e3',
    ocean: '#436c9e',
    volcano: '#b3472d',
    default: '#6b7280'
  };

  let currentTileSize = 32;
  let tileLookup = new Map();
  let hoveredTile = null;

  function ensureCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    let cssWidth = rect.width;
    let cssHeight = rect.height;

    if (!cssWidth || !cssHeight) {
      cssWidth = canvas.clientWidth || canvas.width || DEFAULT_CANVAS_SIZE.width;
      cssHeight = canvas.clientHeight || canvas.height || DEFAULT_CANVAS_SIZE.height;
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    const targetWidth = Math.round(cssWidth * devicePixelRatio);
    const targetHeight = Math.round(cssHeight * devicePixelRatio);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(devicePixelRatio, devicePixelRatio);

    return { cssWidth, cssHeight, devicePixelRatio };
  }

  function clearCanvas() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function colorForBiome(biome) {
    if (!biome) {
      return BIOME_COLORS.default;
    }

    const key = String(biome).toLowerCase();
    return BIOME_COLORS[key] || BIOME_COLORS.default;
  }

  function isTileVisible(tile, visibility) {
    if (!visibility) {
      return true;
    }

    const tileId = tile?.id;
    const key = `${tile?.x},${tile?.y}`;

    if (visibility instanceof Set) {
      if (tileId != null && visibility.has(tileId)) {
        return true;
      }
      return visibility.has(key);
    }

    if (Array.isArray(visibility)) {
      if (tileId != null && visibility.includes(tileId)) {
        return true;
      }
      return visibility.includes(key);
    }

    if (typeof visibility === 'object') {
      if (tileId != null && Object.prototype.hasOwnProperty.call(visibility, tileId)) {
        return Boolean(visibility[tileId]);
      }
      if (Object.prototype.hasOwnProperty.call(visibility, key)) {
        return Boolean(visibility[key]);
      }
    }

    return false;
  }

  function playerOwnsTile(tile, state) {
    if (!tile || !state) {
      return false;
    }

    const playerId = state.playerId ?? state.player?.id ?? state.id ?? state.playerID ?? null;
    if (playerId == null) {
      return false;
    }

    const ownerCandidates = [tile.ownerId, tile.ownerID, tile.owner, tile.owner?.id];
    if (ownerCandidates.some((value) => value === playerId)) {
      return true;
    }

    const ownedTiles = state.ownedTiles;
    if (Array.isArray(ownedTiles)) {
      if (tile.id != null && ownedTiles.includes(tile.id)) {
        return true;
      }
      if (ownedTiles.includes(`${tile.x},${tile.y}`)) {
        return true;
      }
    }

    if (ownedTiles instanceof Set) {
      if (tile.id != null && ownedTiles.has(tile.id)) {
        return true;
      }
      if (ownedTiles.has(`${tile.x},${tile.y}`)) {
        return true;
      }
    }

    if (ownedTiles && typeof ownedTiles === 'object') {
      if (tile.id != null && Object.prototype.hasOwnProperty.call(ownedTiles, tile.id) && ownedTiles[tile.id]) {
        return true;
      }
      const tileKey = `${tile.x},${tile.y}`;
      if (Object.prototype.hasOwnProperty.call(ownedTiles, tileKey) && ownedTiles[tileKey]) {
        return true;
      }
    }

    if (state.ownedTileIds instanceof Set) {
      if (tile.id != null && state.ownedTileIds.has(tile.id)) {
        return true;
      }
      if (state.ownedTileIds.has(`${tile.x},${tile.y}`)) {
        return true;
      }
    }

    return false;
  }

  function normalizeTiles(tiles) {
    if (!tiles) {
      return [];
    }

    if (Array.isArray(tiles)) {
      if (tiles.length > 0 && Array.isArray(tiles[0])) {
        return tiles.flat();
      }
      return tiles;
    }

    if (tiles instanceof Map) {
      return Array.from(tiles.values());
    }

    if (typeof tiles === 'object') {
      return Object.values(tiles);
    }

    return [];
  }

  function updateTileLookup(tiles) {
    tileLookup = new Map();
    for (const tile of tiles) {
      if (tile && typeof tile.x === 'number' && typeof tile.y === 'number') {
        tileLookup.set(`${tile.x},${tile.y}`, tile);
      }
    }
  }

  function tileAtPosition(cssX, cssY) {
    if (!Number.isFinite(cssX) || !Number.isFinite(cssY)) {
      return null;
    }

    const tileX = Math.floor(cssX / currentTileSize);
    const tileY = Math.floor(cssY / currentTileSize);
    return tileLookup.get(`${tileX},${tileY}`) || null;
  }

  function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;
    const tile = tileAtPosition(cssX, cssY);

    if (tile === hoveredTile) {
      if (tile && window.UI && typeof window.UI.showTooltip === 'function') {
        window.UI.showTooltip(tile, event.clientX, event.clientY);
      }
      return;
    }

    hoveredTile = tile;

    if (tile && window.UI && typeof window.UI.showTooltip === 'function') {
      window.UI.showTooltip(tile, event.clientX, event.clientY);
    } else if (!tile && window.UI && typeof window.UI.hideTooltip === 'function') {
      window.UI.hideTooltip();
    }
  }

  function handleMouseLeave() {
    hoveredTile = null;
    if (window.UI && typeof window.UI.hideTooltip === 'function') {
      window.UI.hideTooltip();
    }
  }

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);

  window.addEventListener('resize', () => {
    ensureCanvasSize();
  });

  ensureCanvasSize();

  const MapRender = {
    draw(tiles, visibility, state = {}) {
      const normalizedTiles = normalizeTiles(tiles);
      ensureCanvasSize();
      clearCanvas();

      if (!normalizedTiles.length) {
        return;
      }

      currentTileSize = state.tileSize || state.tile_size || 32;
      updateTileLookup(normalizedTiles);

      for (const tile of normalizedTiles) {
        if (!tile || typeof tile.x !== 'number' || typeof tile.y !== 'number') {
          continue;
        }

        const x = tile.x * currentTileSize;
        const y = tile.y * currentTileSize;
        const size = currentTileSize;

        ctx.fillStyle = colorForBiome(tile.biome);
        ctx.fillRect(x, y, size, size);

        const visible = isTileVisible(tile, visibility);
        if (!visible) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
          ctx.fillRect(x, y, size, size);
        }

        if (playerOwnsTile(tile, state)) {
          const borderInset = Math.max(1, size * 0.08);
          ctx.lineWidth = Math.max(1, size * 0.12);
          ctx.strokeStyle = '#facc15';
          ctx.strokeRect(
            x + borderInset / 2,
            y + borderInset / 2,
            size - borderInset,
            size - borderInset
          );
        }
      }
    }
  };

  window.MapRender = MapRender;
})();
