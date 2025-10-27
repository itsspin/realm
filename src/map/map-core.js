(function () {
  const normalizeStructureId = (structure) => {
    if (!structure) {
      return null;
    }

    if (typeof structure === "string") {
      return structure;
    }

    if (typeof structure === "object") {
      return (
        structure.id ||
        structure.type ||
        structure.name ||
        structure.structureId ||
        null
      );
    }

    return null;
  };

  const MapCore = {
    getTileAt(x, y, tilesArray) {
      if (!Array.isArray(tilesArray)) {
        return undefined;
      }

      return tilesArray.find((tile) => tile && tile.x === x && tile.y === y);
    },

    getNeighbors(tile, tilesArray) {
      if (!tile || typeof tile.x !== "number" || typeof tile.y !== "number") {
        return [];
      }

      const { x, y } = tile;
      const candidates = [
        [x, y - 1],
        [x + 1, y],
        [x, y + 1],
        [x - 1, y],
      ];

      return candidates
        .map(([nx, ny]) => this.getTileAt(nx, ny, tilesArray))
        .filter(Boolean);
    },

    distance(a, b) {
      if (!a || !b) {
        return 0;
      }

      const ax = typeof a.x === "number" ? a.x : 0;
      const ay = typeof a.y === "number" ? a.y : 0;
      const bx = typeof b.x === "number" ? b.x : 0;
      const by = typeof b.y === "number" ? b.y : 0;

      return Math.abs(ax - bx) + Math.abs(ay - by);
    },

    computeVisibility(state) {
      if (!state || !Array.isArray(state.tiles) || state.tiles.length === 0) {
        return new Set();
      }

      const tiles = state.tiles;
      const tileById = new Map();
      tiles.forEach((tile) => {
        if (tile && tile.id) {
          tileById.set(tile.id, tile);
        }
      });

      const playerId =
        state.playerId ??
        state.player?.id ??
        state.player?.playerId ??
        state.currentPlayerId ??
        state.currentPlayer?.id ??
        null;

      const seedIds = new Set();

      const addSeed = (id) => {
        if (id && tileById.has(id)) {
          seedIds.add(id);
        }
      };

      if (Array.isArray(state.ownedTileIds)) {
        state.ownedTileIds.forEach(addSeed);
      }

      if (Array.isArray(state.settlementTileIds)) {
        state.settlementTileIds.forEach(addSeed);
      }

      const ingestSettlementCollection = (collection) => {
        if (!Array.isArray(collection)) {
          return;
        }

        collection.forEach((entry) => {
          if (!entry) {
            return;
          }

          if (typeof entry === "string") {
            addSeed(entry);
          } else if (typeof entry === "object") {
            const tileId =
              entry.tileId ?? entry.tile ?? entry.id ?? entry.tileID ?? null;
            addSeed(tileId);
          }
        });
      };

      ingestSettlementCollection(state.settlements);
      ingestSettlementCollection(state.player?.settlements);

      tiles.forEach((tile) => {
        if (!tile || !tile.id) {
          return;
        }

        const tileId = tile.id;

        const possibleOwners = [
          tile.owner,
          tile.ownerId,
          tile.ownerID,
          tile.ownership?.playerId,
          tile.ownership?.ownerId,
          tile.ownership?.owner,
        ];

        const isOwned =
          tile.isOwned === true ||
          tile.owned === true ||
          seedIds.has(tileId) ||
          (playerId !== null &&
            possibleOwners.some(
              (owner) => owner !== undefined && owner === playerId
            )) ||
          (Array.isArray(tile.owners) &&
            playerId !== null &&
            tile.owners.includes(playerId));

        if (isOwned) {
          addSeed(tileId);
        }

        let isSettlement =
          tile.hasSettlement === true ||
          tile.settlement === true ||
          tile.settlementFlag === true;

        if (!isSettlement && tile.settlement && typeof tile.settlement === "object") {
          const settlementOwner =
            tile.settlement.ownerId ??
            tile.settlement.playerId ??
            tile.settlement.owner ??
            null;
          if (settlementOwner === null || settlementOwner === playerId) {
            isSettlement = true;
          }
        }

        if (!isSettlement && Array.isArray(tile.structures)) {
          isSettlement = tile.structures.some((structure) => {
            const id = normalizeStructureId(structure);
            return typeof id === "string" && id.toLowerCase() === "settlement";
          });
        }

        if (isSettlement) {
          addSeed(tileId);
        }
      });

      if (seedIds.size === 0) {
        return new Set();
      }

      const countWatchtowers = (tile) => {
        if (!tile || !Array.isArray(tile.structures)) {
          return 0;
        }

        return tile.structures.reduce((count, structure) => {
          const id = normalizeStructureId(structure);
          if (typeof id === "string" && id.toLowerCase() === "watchtower") {
            return count + 1;
          }
          return count;
        }, 0);
      };

      const visible = new Set();
      const queue = [];
      const bestRemaining = new Map();

      seedIds.forEach((seedId) => {
        const tile = tileById.get(seedId);
        if (!tile) {
          return;
        }

        const radius = 3 + countWatchtowers(tile) * 2;
        visible.add(tile.id);
        bestRemaining.set(tile.id, radius);
        queue.push({ tile, remaining: radius });
      });

      while (queue.length > 0) {
        const { tile, remaining } = queue.shift();
        if (!tile) {
          continue;
        }

        if (remaining <= 0) {
          continue;
        }

        const neighbors = this.getNeighbors(tile, tiles);
        neighbors.forEach((neighbor) => {
          if (!neighbor || !neighbor.id) {
            return;
          }

          const nextRemaining = remaining - 1;
          const previous = bestRemaining.get(neighbor.id);
          if (previous !== undefined && previous >= nextRemaining) {
            return;
          }

          visible.add(neighbor.id);
          bestRemaining.set(neighbor.id, nextRemaining);
          if (nextRemaining > 0) {
            queue.push({ tile: neighbor, remaining: nextRemaining });
          }
        });
      }

      return visible;
    },
  };

  if (typeof window !== "undefined") {
    window.MapCore = MapCore;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = MapCore;
  }
})();
