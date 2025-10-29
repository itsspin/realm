(function (global) {
  const STORAGE_KEY = 'REALM_SAVE_V1';
  const DEFAULT_PLAYER = {
    id: 'player-1',
    name: 'Wanderer'
  };
  const DEFAULT_RESOURCES = {
    food: 50,
    ore: 10,
    timber: 20,
    essence: 0,
    gold: 25
  };

  function attachRuntimeMetadata(state, tiles, visibilitySet) {
    if (!state || typeof state !== 'object') {
      return;
    }

    if (tiles) {
      Object.defineProperty(state, 'tiles', {
        value: tiles,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }

    if (visibilitySet instanceof Set) {
      Object.defineProperty(state, 'visibilitySet', {
        value: visibilitySet,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }
  }

  function applyVisibility(targetState, visibilitySource) {
    if (!targetState || typeof targetState !== 'object') {
      return new Set();
    }

    const visibilitySet = visibilitySource instanceof Set
      ? visibilitySource
      : new Set(Array.isArray(visibilitySource) ? visibilitySource : []);

    targetState.visibility = Array.from(visibilitySet);
    attachRuntimeMetadata(targetState, null, visibilitySet);
    return visibilitySet;
  }

  function buildVisibilityPayload(state, tiles) {
    if (!state) {
      return null;
    }

    const ownedTileIds = Array.isArray(state.ownedTiles) ? state.ownedTiles : [];
    return {
      tiles,
      player: state.player,
      playerId: state.player?.id ?? state.playerId ?? DEFAULT_PLAYER.id,
      ownedTileIds,
      settlements: state.settlements,
      settlementTileIds: state.settlementTileIds,
    };
  }

  function computeVisibility(state, tiles) {
    if (!global.MapCore || typeof global.MapCore.computeVisibility !== 'function') {
      return applyVisibility(state, state?.visibility);
    }

    const payload = buildVisibilityPayload(state, tiles);
    if (!payload || !Array.isArray(payload.tiles) || payload.tiles.length === 0) {
      return applyVisibility(state, state?.visibility);
    }

    const visibilitySet = global.MapCore.computeVisibility(payload);
    return applyVisibility(state, visibilitySet);
  }

  function getMapTiles() {
    if (global.MapCore) {
      if (typeof global.MapCore.getAllTiles === 'function') {
        return global.MapCore.getAllTiles();
      }
      if (typeof global.MapCore.getTiles === 'function') {
        return global.MapCore.getTiles();
      }
      if (Array.isArray(global.MapCore.tiles)) {
        return global.MapCore.tiles;
      }
      if (global.MapCore.map && Array.isArray(global.MapCore.map.tiles)) {
        return global.MapCore.map.tiles;
      }
    }
    return [];
  }

  function findCenterTile(tiles) {
    if (!tiles.length) {
      return null;
    }

    const minX = Math.min(...tiles.map((tile) => tile.x));
    const maxX = Math.max(...tiles.map((tile) => tile.x));
    const minY = Math.min(...tiles.map((tile) => tile.y));
    const maxY = Math.max(...tiles.map((tile) => tile.y));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    let closestTile = tiles[0];
    let closestDistance = Infinity;

    tiles.forEach((tile) => {
      const dx = tile.x - centerX;
      const dy = tile.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < closestDistance) {
        closestTile = tile;
        closestDistance = distance;
      }
    });

    return closestTile;
  }

  function ensureArrays(state) {
    state.ownedTiles = Array.isArray(state.ownedTiles) ? state.ownedTiles : [];
    state.structures = Array.isArray(state.structures) ? state.structures : [];
    state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
    state.visibility = Array.isArray(state.visibility) ? state.visibility : [];
  }

  function applyDefaults(state) {
    ensureArrays(state);
    state.player = state.player ? { ...DEFAULT_PLAYER, ...state.player } : { ...DEFAULT_PLAYER };
    state.resources = state.resources
      ? { ...DEFAULT_RESOURCES, ...state.resources }
      : { ...DEFAULT_RESOURCES };
  }

  const State = {
    data: null,

    init() {
      const loaded = this.load();
      if (loaded) {
        return loaded;
      }

      const tiles = getMapTiles();
      if (!tiles.length) {
        throw new Error('Map tiles are required to initialise the state.');
      }

      const playerId = DEFAULT_PLAYER.id;
      const playerName = DEFAULT_PLAYER.name;

      const startingTile = findCenterTile(tiles);
      if (!startingTile) {
        throw new Error('No starting tile could be determined.');
      }

      if (!Array.isArray(startingTile.structures)) {
        startingTile.structures = [];
      }
      startingTile.owner = playerId;

      this.data = {
        player: {
          id: playerId,
          name: playerName
        },
        resources: { ...DEFAULT_RESOURCES },
        ownedTiles: [startingTile.id],
        structures: [],
        inventory: [],
        visibility: []
      };

      const visibilitySet = computeVisibility(this.data, tiles);
      attachRuntimeMetadata(this.data, tiles, visibilitySet);

      this.save();
      return this.data;
    },

    save() {
      if (!this.data || !global.localStorage) {
        return;
      }

      try {
        const serialised = JSON.stringify(this.data);
        global.localStorage.setItem(STORAGE_KEY, serialised);
      } catch (error) {
        console.error('Failed to save state', error);
      }
    },

    load() {
      if (!global.localStorage) {
        return null;
      }

      const serialised = global.localStorage.getItem(STORAGE_KEY);
      if (!serialised) {
        return null;
      }

      try {
        const parsed = JSON.parse(serialised);
        applyDefaults(parsed);
        this.data = parsed;

        const tiles = getMapTiles();
        tiles.forEach((tile) => {
          if (this.data.ownedTiles.includes(tile.id)) {
            tile.owner = this.data.player.id;
            if (!Array.isArray(tile.structures)) {
              tile.structures = [];
            }
          }
        });

        this.data.structures.forEach((structure) => {
          const tile = tiles.find((t) => t.id === structure.tileId);
          if (tile) {
            if (!Array.isArray(tile.structures)) {
              tile.structures = [];
            }
            tile.structures.push(structure.structureId);
          }
        });

        const visibilitySet = computeVisibility(this.data, tiles);
        attachRuntimeMetadata(this.data, tiles, visibilitySet);

        return this.data;
      } catch (error) {
        console.error('Failed to load state', error);
        return null;
      }
    },

    addStructure(tileId, structureId) {
      if (!this.data) {
        throw new Error('State has not been initialised.');
      }

      this.data.structures.push({ tileId, structureId });

      const tiles = getMapTiles();
      const tile = tiles.find((t) => t.id === tileId);
      if (tile) {
        if (!Array.isArray(tile.structures)) {
          tile.structures = [];
        }
        tile.structures.push(structureId);
      }

      computeVisibility(this.data, tiles);
      this.save();
    },

    recalculateVisibility() {
      if (!this.data) {
        return new Set();
      }

      const tiles = getMapTiles();
      return computeVisibility(this.data, tiles);
    }
  };

  global.State = State;
})(window);
