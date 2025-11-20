(function (global) {
  const WORLD_SIZE = { width: 50, height: 50 };
  let worldMap = null;

  function initializeWorldMap() {
    // Load or create world map
    const saved = localStorage.getItem('REALM_WORLD_MAP');
    if (saved) {
      try {
        worldMap = JSON.parse(saved);
      } catch (e) {
        worldMap = createEmptyWorld();
      }
    } else {
      worldMap = createEmptyWorld();
    }
  }

  function createEmptyWorld() {
    const map = [];
    for (let y = 0; y < WORLD_SIZE.height; y++) {
      for (let x = 0; x < WORLD_SIZE.width; x++) {
        map.push({
          x, y,
          owner: null,
          guild: null,
          faction: null,
          settlement: null,
          resources: {
            ore: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
            timber: Math.random() > 0.6 ? Math.floor(Math.random() * 2) : 0,
            food: Math.random() > 0.5 ? Math.floor(Math.random() * 2) : 0
          },
          terrain: getRandomTerrain(x, y)
        });
      }
    }
    saveWorldMap();
    return map;
  }

  function getRandomTerrain(x, y) {
    const types = ['plains', 'forest', 'hills', 'water', 'desert'];
    const hash = (x * 73856093) ^ (y * 19349663);
    return types[Math.abs(hash) % types.length];
  }

  function getTile(x, y) {
    if (!worldMap) initializeWorldMap();
    const tile = worldMap.find(t => t.x === x && t.y === y);
    if (!tile && x >= 0 && x < WORLD_SIZE.width && y >= 0 && y < WORLD_SIZE.height) {
      // Create tile if it doesn't exist (shouldn't happen, but safety check)
      const newTile = {
        x, y,
        owner: null,
        guild: null,
        faction: null,
        settlement: null,
        resources: {
          ore: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
          timber: Math.random() > 0.6 ? Math.floor(Math.random() * 2) : 0,
          food: Math.random() > 0.5 ? Math.floor(Math.random() * 2) : 0
        },
        terrain: getRandomTerrain(x, y)
      };
      worldMap.push(newTile);
      saveWorldMap();
      return newTile;
    }
    return tile;
  }

  function canPlaceSettlement(x, y, playerId) {
    const tile = getTile(x, y);
    if (!tile) return { can: false, reason: 'Invalid coordinates' };
    if (tile.owner && tile.owner !== playerId) {
      return { can: false, reason: 'Tile is owned by another player' };
    }
    if (tile.guild) {
      return { can: false, reason: 'Tile is claimed by a guild' };
    }
    if (tile.terrain === 'water') {
      return { can: false, reason: 'Cannot build on water' };
    }
    return { can: true };
  }

  function placeSettlement(x, y, playerId, settlementName) {
    const check = canPlaceSettlement(x, y, playerId);
    if (!check.can) {
      global.Toast?.show({
        type: 'error',
        title: 'Cannot Place Settlement',
        text: check.reason
      });
      return false;
    }

    const tile = getTile(x, y);
    tile.owner = playerId;
    tile.settlement = {
      name: settlementName || 'Settlement',
      level: 1,
      structures: [],
      population: 10,
      founded: Date.now()
    };

    const player = global.State?.getPlayer();
    if (!player.settlements) {
      player.settlements = [];
    }
    player.settlements.push({ x, y, name: tile.settlement.name });
    player.currentTile = { x, y };

    global.State?.updatePlayer({ settlements: player.settlements, currentTile: { x, y } });
    saveWorldMap();

    global.Narrative?.addEntry({
      type: 'system',
      text: `You have founded ${tile.settlement.name} at coordinates (${x}, ${y}). Your settlement begins to grow.`,
      meta: 'Settlement Founded'
    });

    global.Toast?.show({
      type: 'success',
      title: 'Settlement Founded!',
      text: `${tile.settlement.name} established at (${x}, ${y})`
    });

    // Track settlement stats
    global.PlayerStats?.incrementStat('settlementsFounded', 1);
    global.Leaderboards?.updatePlayerRanking();

    global.Rendering?.updateWorldMap();
    return true;
  }

  function saveWorldMap() {
    if (worldMap) {
      try {
        localStorage.setItem('REALM_WORLD_MAP', JSON.stringify(worldMap));
      } catch (e) {
        console.error('Failed to save world map:', e);
      }
    }
  }

  function updateWorldMap() {
    saveWorldMap();
    if (global.Rendering) {
      global.Rendering.updateWorldMap();
    }
  }

  function getWorldMap() {
    if (!worldMap) initializeWorldMap();
    return worldMap;
  }

  const Settlement = {
    initializeWorldMap,
    getTile,
    canPlaceSettlement,
    placeSettlement,
    getWorldMap,
    saveWorldMap,
    updateWorldMap,
    WORLD_SIZE
  };

  global.Settlement = Settlement;
})(window);

