(function (global) {
  const RESOURCE_KEYS = ["food", "ore", "timber", "essence", "gold"];

  function getState() {
    if (!global.GameState) {
      global.GameState = {};
    }
    return global.GameState;
  }

  function ensurePlayerResources(player) {
    if (!player) {
      return {};
    }

    if (!player.resources || typeof player.resources !== "object") {
      player.resources = {};
    }

    RESOURCE_KEYS.forEach((key) => {
      const current = player.resources[key];
      player.resources[key] = typeof current === "number" ? current : 0;
    });

    return player.resources;
  }

  function ownsTile(tile, player) {
    if (!tile || !player) {
      return false;
    }

    const owner = tile.owner;
    if (owner == null) {
      return false;
    }

    const possibleIds = [
      player.id,
      player.playerId,
      player.uuid,
      player.name,
    ].filter((value) => value != null);

    if (possibleIds.length === 0) {
      return false;
    }

    if (typeof owner === "object") {
      const ownerId =
        owner.id ?? owner.playerId ?? owner.uuid ?? owner.name ?? owner.ownerId;
      return ownerId != null && possibleIds.includes(ownerId);
    }

    return possibleIds.includes(owner);
  }

  function rateKeyFor(resource) {
    const capitalized = resource[0].toUpperCase() + resource.slice(1);
    return `${resource}Rate`;
  }

  function createEmptyRates() {
    const store = {};
    RESOURCE_KEYS.forEach((key) => {
      store[key] = 0;
    });
    return store;
  }

  function addRates(target, addition) {
    if (!addition) {
      return;
    }
    RESOURCE_KEYS.forEach((key) => {
      const value = addition[key];
      if (typeof value === "number" && !Number.isNaN(value)) {
        target[key] += value;
      }
    });
  }

  function collectTileRates(tile) {
    const rates = createEmptyRates();
    if (!tile || typeof tile.resources !== "object") {
      return rates;
    }

    RESOURCE_KEYS.forEach((resource) => {
      const direct = tile.resources[resource];
      const rateKey = rateKeyFor(resource);
      const rateValue = tile.resources[rateKey];
      if (typeof direct === "number" && !Number.isNaN(direct)) {
        rates[resource] += direct;
      }
      if (typeof rateValue === "number" && !Number.isNaN(rateValue)) {
        rates[resource] += rateValue;
      }
    });

    return rates;
  }

  function normaliseStructureDefinitionMap(collection) {
    if (!collection) {
      return {};
    }

    if (Array.isArray(collection)) {
      return collection.reduce((map, entry) => {
        if (entry && entry.id) {
          map[entry.id] = entry;
        }
        return map;
      }, {});
    }

    if (typeof collection === "object") {
      return collection;
    }

    return {};
  }

  function getStructureLookup() {
    const state = getState();
    const candidates = [
      state.structureCatalog,
      state.structureDefinitions,
      state.structuresById,
      state.structures,
      global.StructureCatalog,
      global.StructureDefinitions,
      global.GameData && global.GameData.structures,
      global.GameData && global.GameData.structuresById,
    ];

    return candidates.reduce((accumulator, collection) => {
      const map = normaliseStructureDefinitionMap(collection);
      return Object.assign(accumulator, map);
    }, {});
  }

  function resolveStructure(structure) {
    if (!structure) {
      return null;
    }

    if (typeof structure === "string") {
      const lookup = getStructureLookup();
      return lookup[structure] || null;
    }

    if (structure.definition) {
      if (typeof structure.definition === "string") {
        const lookup = getStructureLookup();
        const resolved = lookup[structure.definition];
        if (resolved) {
          return Object.assign({}, resolved, structure);
        }
      } else if (typeof structure.definition === "object") {
        return Object.assign({}, structure.definition, structure);
      }
    }

    if (structure.id) {
      return structure;
    }

    return null;
  }

  function parsePassiveEntry(entry) {
    const rates = createEmptyRates();
    if (!entry) {
      return rates;
    }

    if (typeof entry === "number") {
      rates.gold += entry;
      return rates;
    }

    if (Array.isArray(entry)) {
      entry.forEach((value) => {
        if (Array.isArray(value) && value.length >= 2) {
          const [resource, amount] = value;
          if (RESOURCE_KEYS.includes(resource) && typeof amount === "number") {
            rates[resource] += amount;
          }
        } else if (value && typeof value === "object") {
          const resource = value.resource ?? value.id;
          const amount = value.amount ?? value.value;
          if (RESOURCE_KEYS.includes(resource) && typeof amount === "number") {
            rates[resource] += amount;
          }
        }
      });
      return rates;
    }

    if (typeof entry === "object") {
      Object.entries(entry).forEach(([resource, amount]) => {
        if (RESOURCE_KEYS.includes(resource) && typeof amount === "number") {
          rates[resource] += amount;
        }
      });
      return rates;
    }

    if (typeof entry === "string") {
      const regex = /([+-]?\d+(?:\.\d+)?)\s*(food|ore|timber|essence|gold)/gi;
      let match = regex.exec(entry);
      while (match) {
        const amount = Number.parseFloat(match[1]);
        const resource = match[2].toLowerCase();
        if (!Number.isNaN(amount) && RESOURCE_KEYS.includes(resource)) {
          rates[resource] += amount;
        }
        match = regex.exec(entry);
      }
      return rates;
    }

    return rates;
  }

  function collectStructureRates(structure) {
    const rates = createEmptyRates();
    if (!structure) {
      return rates;
    }

    addRates(rates, parsePassiveEntry(structure.passiveRates));
    addRates(rates, parsePassiveEntry(structure.resourceRates));

    if (structure.effects) {
      const passive =
        structure.effects.passiveRates ??
        structure.effects.passive ??
        structure.effects.resources;
      addRates(rates, parsePassiveEntry(passive));
    }

    if (structure.bonuses) {
      addRates(rates, parsePassiveEntry(structure.bonuses.resources));
    }

    return rates;
  }

  function aggregateTileEconomy(tile) {
    const total = createEmptyRates();
    addRates(total, collectTileRates(tile));

    const structures = Array.isArray(tile?.structures)
      ? tile.structures
      : [];
    structures.forEach((entry) => {
      const resolved = resolveStructure(entry) || entry;
      addRates(total, collectStructureRates(resolved));
    });

    return total;
  }

  function markVision(visibleSet, x, y, radius) {
    const range = Math.max(Number(radius) || 0, 0);
    for (let dx = -range; dx <= range; dx += 1) {
      for (let dy = -range; dy <= range; dy += 1) {
        const key = `${x + dx},${y + dy}`;
        visibleSet.add(key);
      }
    }
  }

  function recomputeVisibility(state, player, ownedTiles) {
    if (global.State && typeof global.State.recalculateVisibility === "function") {
      const visibilitySet = global.State.recalculateVisibility();
      if (visibilitySet instanceof Set) {
        setVisibilityMetadata(state, visibilitySet);
        if (global.Map && typeof global.Map.updateVisibility === "function") {
          global.Map.updateVisibility(visibilitySet);
        }
        if (player) {
          player.visibleTiles = visibilitySet;
        }
        return;
      }
    }

    const fallbackVisible = new Set();
    const baseRange = Math.max(Number(player?.visionRange) || 0, 0);

    ownedTiles.forEach((tile) => {
      markVision(fallbackVisible, tile.x ?? 0, tile.y ?? 0, baseRange);
      const structures = Array.isArray(tile?.structures)
        ? tile.structures
        : [];
      structures.forEach((entry) => {
        const resolved = resolveStructure(entry) || entry;
        const vision =
          Number(resolved?.vision ?? resolved?.visionRadius ?? 0) || 0;
        if (vision > 0) {
          markVision(fallbackVisible, tile.x ?? 0, tile.y ?? 0, vision);
        }
      });
    });

    setVisibilityMetadata(state, fallbackVisible);

    if (player) {
      player.visibleTiles = fallbackVisible;
    }

    if (global.Map && typeof global.Map.updateVisibility === "function") {
      global.Map.updateVisibility(fallbackVisible);
    }
  }

  function setVisibilityMetadata(state, visibilitySet) {
    if (!state || typeof state !== "object") {
      return;
    }

    const setInstance = visibilitySet instanceof Set ? visibilitySet : new Set();
    state.visibility = Array.from(setInstance);
    Object.defineProperty(state, "visibilitySet", {
      value: setInstance,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }

  function normaliseCost(cost) {
    if (!cost) {
      return [];
    }

    if (Array.isArray(cost)) {
      return cost
        .map((entry) => {
          if (Array.isArray(entry)) {
            const [resource, amount] = entry;
            return { resource, amount };
          }
          if (entry && typeof entry === "object") {
            return {
              resource: entry.resource ?? entry.id,
              amount: entry.amount ?? entry.value,
            };
          }
          return null;
        })
        .filter(
          (item) =>
            item &&
            RESOURCE_KEYS.includes(item.resource) &&
            typeof item.amount === "number"
        );
    }

    if (typeof cost === "object") {
      return Object.entries(cost)
        .map(([resource, amount]) => ({ resource, amount }))
        .filter(
          (item) =>
            RESOURCE_KEYS.includes(item.resource) &&
            typeof item.amount === "number"
        );
    }

    return [];
  }

  function applyResourceDelta(resources, delta) {
    RESOURCE_KEYS.forEach((key) => {
      const amount = delta[key];
      if (typeof amount === "number" && !Number.isNaN(amount)) {
        const next = resources[key] + amount;
        resources[key] = next < 0 ? 0 : next;
      }
    });
  }

  const Economy = {
    tick() {
      const state = getState();
      const player = state.player;
      if (!player) {
        return;
      }

      const resources = ensurePlayerResources(player);
      const tiles = Array.isArray(state.tiles) ? state.tiles : [];
      const ownedTiles = tiles.filter((tile) => ownsTile(tile, player));

      const aggregate = createEmptyRates();
      ownedTiles.forEach((tile) => {
        addRates(aggregate, aggregateTileEconomy(tile));
      });

      applyResourceDelta(resources, aggregate);

      if (global.UI && typeof global.UI.refreshHeader === "function") {
        global.UI.refreshHeader();
      }

      recomputeVisibility(state, player, ownedTiles);

      if (global.State && typeof global.State.save === "function") {
        global.State.save();
      }
    },

    canAfford(cost) {
      const state = getState();
      const player = state.player;
      if (!player) {
        return false;
      }

      const resources = ensurePlayerResources(player);
      const normalized = normaliseCost(cost);

      return normalized.every((entry) => {
        const current = resources[entry.resource];
        return typeof current === "number" && current >= entry.amount;
      });
    },

    applyCost(cost) {
      const state = getState();
      const player = state.player;
      if (!player) {
        return false;
      }

      const resources = ensurePlayerResources(player);
      const normalized = normaliseCost(cost);

      if (!normalized.length) {
        return true;
      }

      if (!Economy.canAfford(normalized)) {
        return false;
      }

      normalized.forEach((entry) => {
        const current = resources[entry.resource];
        const next = current - entry.amount;
        resources[entry.resource] = next >= 0 ? next : 0;
      });

      if (global.UI && typeof global.UI.refreshHeader === "function") {
        global.UI.refreshHeader();
      }

      return true;
    },
  };

  global.Economy = Economy;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Economy;
  }
})(typeof window !== "undefined" ? window : globalThis);
