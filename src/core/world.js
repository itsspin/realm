/**
 * Core World System
 * 
 * Manages zones, tiles, spawn groups, and territory regions.
 * Provides utilities for looking up world data.
 * 
 * CONTENT LOADING:
 * - All data loaded from JSON files in data/ directory
 * - Zones: data/world-zones.json
 * - Spawn Groups: data/spawn-groups.json
 * - Mob Templates: data/mob-templates.json
 * - Territory Regions: data/territory-regions.json
 * 
 * CONTENT OVERRIDES:
 * - Later entries with same ID override earlier ones
 * - Can add override files that load after base files
 * - Use World.getWorldData() to inspect loaded data
 * 
 * @module World
 */

(function (global) {
  let worldData = {
    zones: {},
    tiles: {},
    spawnGroups: {},
    mobTemplates: {},
    territoryRegions: {}
  };

  /**
   * Initialize world data from JSON files
   */
  async function initializeWorld() {
    try {
      // Load world zones
      const zones = await global.REALM.fetchJSON('data/world-zones.json');
      zones.forEach(zone => {
        worldData.zones[zone.id] = zone;
      });

      // Load spawn groups
      const spawnGroups = await global.REALM.fetchJSON('data/spawn-groups.json');
      spawnGroups.forEach(group => {
        worldData.spawnGroups[group.id] = group;
      });

      // Load mob templates
      const mobTemplates = await global.REALM.fetchJSON('data/mob-templates.json');
      mobTemplates.forEach(template => {
        worldData.mobTemplates[template.id] = template;
      });

      // Load territory regions
      const territories = await global.REALM.fetchJSON('data/territory-regions.json');
      territories.forEach(territory => {
        worldData.territoryRegions[territory.id] = territory;
      });

      // Generate tiles for all zones
      generateZoneTiles();

      global.DIAG?.ok('world:initialized');
      return worldData;
    } catch (error) {
      global.DIAG?.fail('world:init-error', error);
      return null;
    }
  }

  /**
   * Generate tiles for all loaded zones
   */
  function generateZoneTiles() {
    Object.values(worldData.zones).forEach(zone => {
      const tiles = generateTilesForZone(zone);
      tiles.forEach(tile => {
        const key = `${zone.id}_${tile.x}_${tile.y}`;
        worldData.tiles[key] = tile;
      });
    });
  }

  /**
   * Generate tiles for a specific zone
   */
  function generateTilesForZone(zone) {
    const tiles = [];
    const { gridWidth, gridHeight } = zone;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const tile = createTileForZone(zone, x, y);
        tiles.push(tile);
      }
    }

    return tiles;
  }

  /**
   * Create a single tile for a zone based on zone type and position
   */
  function createTileForZone(zone, x, y) {
    const { type, id: zoneId } = zone;
    let terrainType = 'grass';
    let walkable = true;
    let spawnGroupId = null;
    let guardPathNodeId = null;

    if (type === 'city') {
      // City layout: streets, buildings, walls
      const isWall = x === 0 || x === zone.gridWidth - 1 || y === 0 || y === zone.gridHeight - 1;
      const isStreet = (x % 5 === 0) || (y % 5 === 0) || (x === Math.floor(zone.gridWidth / 2)) || (y === Math.floor(zone.gridHeight / 2));
      const isBuilding = !isWall && !isStreet && Math.random() > 0.3;

      if (isWall) {
        terrainType = 'wall';
        walkable = false;
      } else if (isStreet) {
        terrainType = 'city_street';
        walkable = true;
      } else if (isBuilding) {
        terrainType = 'building';
        walkable = false;
      } else {
        terrainType = 'city_plaza';
        walkable = true;
      }

      // Check if this tile is on a guard patrol route
      const spawnGroup = Object.values(worldData.spawnGroups).find(sg => sg.zoneId === zoneId && sg.spawnType === 'static');
      if (spawnGroup && spawnGroup.patrolRoutes) {
        spawnGroup.patrolRoutes.forEach(route => {
          if (route.route.some(([rx, ry]) => rx === x && ry === y)) {
            guardPathNodeId = `${spawnGroup.id}_${route.spawnPointIndex}`;
          }
        });
      }
    } else if (type === 'outdoor') {
      // Outdoor layout: grass, paths, water, trees
      const distanceFromCenter = Math.sqrt(Math.pow(x - zone.gridWidth / 2, 2) + Math.pow(y - zone.gridHeight / 2, 2));
      const maxDistance = Math.sqrt(Math.pow(zone.gridWidth / 2, 2) + Math.pow(zone.gridHeight / 2, 2));

      if (distanceFromCenter / maxDistance > 0.9) {
        // Edge of zone - could be water or impassable
        terrainType = Math.random() > 0.7 ? 'water' : 'rock';
        walkable = terrainType !== 'water' && terrainType !== 'rock';
      } else if ((x + y) % 8 === 0) {
        // Path through the zone
        terrainType = 'path';
        walkable = true;
      } else if (Math.random() > 0.85) {
        // Trees/obstacles
        terrainType = 'tree';
        walkable = false;
      } else {
        terrainType = 'grass';
        walkable = true;
      }
    } else if (type === 'dungeon') {
      // Dungeon layout: stone floors, walls, dungeon entrance
      const isWall = x === 0 || x === zone.gridWidth - 1 || y === 0 || y === zone.gridHeight - 1 || (x % 3 === 0 && y % 3 === 0);
      terrainType = isWall ? 'dungeon_wall' : 'dungeon_floor';
      walkable = !isWall;
    }

    // Check for spawn points
    const spawnGroup = Object.values(worldData.spawnGroups).find(sg => {
      if (sg.zoneId !== zoneId) return false;
      return sg.spawnPoints && sg.spawnPoints.some(sp => sp.x === x && sp.y === y);
    });
    if (spawnGroup) {
      spawnGroupId = spawnGroup.id;
    }

    return {
      x,
      y,
      zoneId,
      terrainType,
      walkable,
      spawnGroupId: spawnGroupId || undefined,
      guardPathNodeId: guardPathNodeId || undefined
    };
  }

  /**
   * Get zone by ID
   */
  function getZone(zoneId) {
    return worldData.zones[zoneId] || null;
  }

  /**
   * Get tile at coordinates in a zone
   */
  function getTile(zoneId, x, y) {
    const key = `${zoneId}_${x}_${y}`;
    return worldData.tiles[key] || null;
  }

  /**
   * Get all tiles for a zone
   */
  function getZoneTiles(zoneId) {
    return Object.values(worldData.tiles).filter(tile => tile.zoneId === zoneId);
  }

  /**
   * Get all spawn groups for a zone
   */
  function getSpawnGroupsForZone(zoneId) {
    return Object.values(worldData.spawnGroups).filter(sg => sg.zoneId === zoneId);
  }

  /**
   * Get spawn group by ID
   */
  function getSpawnGroup(spawnGroupId) {
    return worldData.spawnGroups[spawnGroupId] || null;
  }

  /**
   * Get mob template by ID
   */
  function getMobTemplate(mobTemplateId) {
    return worldData.mobTemplates[mobTemplateId] || null;
  }

  /**
   * Get territory region for a tile
   */
  function getTerritoryForTile(zoneId, x, y) {
    const territories = Object.values(worldData.territoryRegions).filter(territory => {
      const bounds = territory.tileBounds;
      return bounds.zoneId === zoneId &&
        x >= bounds.minX && x <= bounds.maxX &&
        y >= bounds.minY && y <= bounds.maxY;
    });

    // Return the territory with highest control score, or null if none
    if (territories.length === 0) return null;
    return territories.reduce((best, current) => 
      current.controlScore > (best?.controlScore || 0) ? current : best
    );
  }

  /**
   * Get controlling faction for a tile
   */
  function getControllingFaction(zoneId, x, y) {
    const territory = getTerritoryForTile(zoneId, x, y);
    if (!territory || !territory.controllingFactionId) return null;
    return global.REALM?.data?.factionsById?.[territory.controllingFactionId] || null;
  }

  /**
   * Check if tile is walkable
   */
  function isTileWalkable(zoneId, x, y) {
    const tile = getTile(zoneId, x, y);
    return tile ? tile.walkable : false;
  }

  /**
   * Get zone that contains a specific tile coordinate
   * (For future use when zones are positioned on a world map)
   */
  function getZoneAtWorldPosition(worldX, worldY) {
    // For now, return current zone from player state
    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) return null;
    return getZone(player.currentZone);
  }

  const World = {
    initialize: initializeWorld,
    getZone,
    getTile,
    getZoneTiles,
    getSpawnGroupsForZone,
    getSpawnGroup,
    getMobTemplate,
    getTerritoryForTile,
    getControllingFaction,
    isTileWalkable,
    getZoneAtWorldPosition,
    getWorldData: () => worldData
  };

  global.World = World;
})(window);

