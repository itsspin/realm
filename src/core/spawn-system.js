/**
 * Spawn System
 * 
 * Data-driven mob spawning system using spawn groups from the World system.
 * Supports static spawns (dungeons) and roaming spawns (outdoor zones).
 * 
 * SPAWN TYPES:
 * - Static: Fixed spawn points with respawn timers (dungeons)
 * - Roaming: Random valid tiles, wandering behavior (outdoor zones)
 * 
 * DATA SOURCES:
 * - Spawn Groups: data/spawn-groups.json
 * - Mob Templates: data/mob-templates.json
 * 
 * DEBUG METHODS (dev mode only):
 * - _debugAddMob(entityId, mobEntity) - Add mob directly
 * - _debugCreateMobEntity(template, zoneId, x, y, spawnPointId) - Create mob entity
 * 
 * @module SpawnSystem
 */

(function (global) {
  let activeMobs = new Map(); // Map<entityId, mobEntity>
  let spawnTimers = new Map(); // Map<spawnPointId, timestamp>
  let roamingMobs = new Map(); // Map<entityId, roamingState>
  
  // Leash radius for static spawns (tiles they can wander from spawn point)
  const LEASH_RADIUS = 5;

  /**
   * Initialize spawn system for current zone
   */
  function initializeZone(zoneId) {
    clearZone();
    
    const spawnGroups = global.World?.getSpawnGroupsForZone(zoneId) || [];
    
    spawnGroups.forEach(spawnGroup => {
      if (spawnGroup.spawnType === 'static') {
        initializeStaticSpawns(spawnGroup);
      } else if (spawnGroup.spawnType === 'roaming') {
        initializeRoamingSpawns(spawnGroup);
      }
    });
  }

  /**
   * Clear all mobs for current zone
   */
  function clearZone() {
    activeMobs.clear();
    spawnTimers.clear();
    roamingMobs.clear();
    
    // Also clear corpses when changing zones
    if (global.CorpseSystem) {
      const player = global.State?.getPlayer();
      if (player && player.currentZone) {
        global.CorpseSystem.clearZone(player.currentZone);
      }
    }
  }

  /**
   * Initialize static spawns (fixed positions, respawn timers)
   */
  function initializeStaticSpawns(spawnGroup) {
    if (!spawnGroup.spawnPoints || spawnGroup.spawnPoints.length === 0) {
      return;
    }

    spawnGroup.spawnPoints.forEach((spawnPoint, index) => {
      const spawnPointId = `${spawnGroup.id}_${index}`;
      
      // Spawn immediately
      spawnMobAtPoint(spawnGroup, spawnPoint, spawnPointId);
    });
  }

  /**
   * Initialize roaming spawns (random valid tiles, wandering)
   * NOTE: Cities should NOT use roaming spawns - only static spawns (guards)
   */
  function initializeRoamingSpawns(spawnGroup) {
    const zone = global.World?.getZone(spawnGroup.zoneId);
    if (!zone) return;

    // Don't spawn roaming mobs in cities (only static spawns/guards allowed)
    if (zone.type === 'city' || zone.isSafeHaven) {
      // Cities should only have static spawns (guards on patrol)
      return;
    }

    // Spawn initial mobs randomly across the zone
    const count = Math.min(spawnGroup.maxConcurrent, 5); // Start with a few
    
    for (let i = 0; i < count; i++) {
      spawnRoamingMob(spawnGroup, zone);
    }
  }

  /**
   * Spawn a mob at a static spawn point
   */
  function spawnMobAtPoint(spawnGroup, spawnPoint, spawnPointId) {
    const zone = global.World?.getZone(spawnGroup.zoneId);
    if (!zone) return;

    const { x, y } = spawnPoint;
    
    // Check if tile is walkable
    if (!global.World?.isTileWalkable(zone.id, x, y)) {
      return; // Skip invalid spawn points
    }

    // Choose random mob template from spawn group
    const mobTemplateId = spawnGroup.mobTemplates[
      Math.floor(Math.random() * spawnGroup.mobTemplates.length)
    ];
    const mobTemplate = global.World?.getMobTemplate(mobTemplateId);
    if (!mobTemplate) return;

    // Create mob entity
    const entityId = `${spawnPointId}_${Date.now()}`;
    const mobEntity = createMobEntity(mobTemplate, zone.id, x, y, spawnPointId);
    
    activeMobs.set(entityId, mobEntity);
    spawnTimers.set(spawnPointId, null); // Not dead yet
  }

  /**
   * Spawn a roaming mob at a random valid tile
   */
  function spawnRoamingMob(spawnGroup, zone) {
    // Find a random walkable tile in the zone
    const tiles = global.World?.getZoneTiles(zone.id) || [];
    let walkableTiles = tiles.filter(tile => tile.walkable);
    
    // If in a city (safe haven), filter out hostile mobs from city tiles
    if (zone.isSafeHaven) {
      // Only allow guards and neutral mobs in city tiles
      walkableTiles = walkableTiles.filter(tile => {
        // Check if this tile is a city tile (city_street, building, etc.)
        const isCityTile = tile.terrainType === 'city_street' || 
                          tile.terrainType === 'building' ||
                          tile.terrainType === 'path';
        
        if (!isCityTile) return true; // Non-city tiles are fine
        
        // For city tiles, only allow guards or neutral mobs
        const mobTemplateId = spawnGroup.mobTemplates[
          Math.floor(Math.random() * spawnGroup.mobTemplates.length)
        ];
        const mobTemplate = global.World?.getMobTemplate(mobTemplateId);
        if (!mobTemplate) return false;
        
        // Allow guards and neutral mobs
        if (mobTemplate.isGuard) return true;
        if (!mobTemplate.factionId) return true; // Neutral
        
        // Check if mob faction is hostile to city faction
        const cityFaction = global.REALM?.data?.factionsById?.[zone.controllingFaction];
        const mobFaction = global.REALM?.data?.factionsById?.[mobTemplate.factionId];
        
        if (!cityFaction || !mobFaction) return true;
        
        // Don't spawn evil mobs in good cities
        if (cityFaction.alignment === 'good' && mobFaction.alignment === 'evil') {
          return false;
        }
        
        return true;
      });
    }
    
    if (walkableTiles.length === 0) return;

    const randomTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
    
    // Check if there's already a mob here
    const mobsAtTile = Array.from(activeMobs.values()).filter(m => 
      m.x === randomTile.x && m.y === randomTile.y && m.zoneId === zone.id
    );
    if (mobsAtTile.length > 0) return; // Skip if tile occupied

    // Choose random mob template
    const mobTemplateId = spawnGroup.mobTemplates[
      Math.floor(Math.random() * spawnGroup.mobTemplates.length)
    ];
    const mobTemplate = global.World?.getMobTemplate(mobTemplateId);
    if (!mobTemplate) return;

    // Create roaming mob entity
    const entityId = `roaming_${spawnGroup.id}_${Date.now()}`;
    const mobEntity = createMobEntity(mobTemplate, zone.id, randomTile.x, randomTile.y, null);
    
    // Set up roaming state
    roamingMobs.set(entityId, {
      spawnGroupId: spawnGroup.id,
      lastWanderTime: Date.now(),
      wanderCooldown: 5000 + Math.random() * 5000, // 5-10 seconds
      targetX: randomTile.x,
      targetY: randomTile.y
    });
    
    activeMobs.set(entityId, mobEntity);
  }

  /**
   * Create a mob entity from a template
   */
  function createMobEntity(mobTemplate, zoneId, x, y, spawnPointId) {
    // Generate random level within range
    const levelRange = mobTemplate.levelRange || { min: 1, max: 1 };
    const level = levelRange.min + Math.floor(Math.random() * (levelRange.max - levelRange.min + 1));
    
    // Scale stats by level
    const levelMultiplier = 1 + (level - levelRange.min) * 0.15;
    const stats = {
      hp: Math.floor(mobTemplate.baseStats.maxHp * levelMultiplier),
      maxHp: Math.floor(mobTemplate.baseStats.maxHp * levelMultiplier),
      atk: Math.floor(mobTemplate.baseStats.atk * levelMultiplier),
      def: Math.floor(mobTemplate.baseStats.def * levelMultiplier),
      agi: Math.floor((mobTemplate.baseStats.agi || 50) * levelMultiplier),
      magicResist: Math.floor((mobTemplate.baseStats.magicResist || 0) * levelMultiplier)
    };

    return {
      id: `mob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mobTemplateId: mobTemplate.id,
      mobTemplate: mobTemplate,
      zoneId: zoneId,
      x: x,
      y: y,
      spawnPointId: spawnPointId, // null for roaming
      level: level,
      stats: stats,
      alive: true,
      lastUpdate: Date.now(),
      xp: mobTemplate.xp || 10,
      gold: mobTemplate.gold || 5
    };
  }

  /**
   * Update all active mobs (handle roaming, respawning, etc.)
   */
  function updateMobs() {
    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) return;

    const zone = global.World?.getZone(player.currentZone);
    if (!zone) return;

    const now = Date.now();
    const spawnGroups = global.World?.getSpawnGroupsForZone(zone.id) || [];

    // Update roaming mobs (only if spawn group is actually roaming)
    const roamingToRemove = [];
    roamingMobs.forEach((roamingState, entityId) => {
      const mob = activeMobs.get(entityId);
      if (!mob || !mob.alive) {
        roamingToRemove.push(entityId);
        return;
      }
      
      // Check if this mob's spawn group is actually roaming
      const spawnGroup = global.World?.getSpawnGroup(roamingState.spawnGroupId);
      if (!spawnGroup || spawnGroup.spawnType !== 'roaming') {
        // Shouldn't be roaming - remove from roaming list
        roamingToRemove.push(entityId);
        return;
      }

      // Check if it's time to wander (only for actual roaming spawns)
      if (now - roamingState.lastWanderTime >= roamingState.wanderCooldown) {
        wanderMob(mob, roamingState, zone);
        roamingState.lastWanderTime = now;
        roamingState.wanderCooldown = 5000 + Math.random() * 5000;
      }
    });
    
    // Remove mobs that shouldn't be roaming
    roamingToRemove.forEach(entityId => {
      roamingMobs.delete(entityId);
    });

    // Handle static spawn respawning
    spawnGroups.forEach(spawnGroup => {
      if (spawnGroup.spawnType !== 'static') return;
      
      spawnGroup.spawnPoints.forEach((spawnPoint, index) => {
        const spawnPointId = `${spawnGroup.id}_${index}`;
        const lastDeath = spawnTimers.get(spawnPointId);
        
        // Check if mob is alive at this spawn point
        const aliveAtPoint = Array.from(activeMobs.values()).some(m => 
          m.spawnPointId === spawnPointId && m.alive && m.zoneId === zone.id
        );
        
        if (!aliveAtPoint && lastDeath && (now - lastDeath) >= spawnGroup.respawnSeconds * 1000) {
          spawnMobAtPoint(spawnGroup, spawnPoint, spawnPointId);
          spawnTimers.set(spawnPointId, null);
        }
      });
    });

    // Maintain roaming mob count
    spawnGroups.forEach(spawnGroup => {
      if (spawnGroup.spawnType !== 'roaming') return;
      
      const aliveCount = Array.from(activeMobs.values()).filter(m => {
        const roamingState = roamingMobs.get(m.id);
        return roamingState && roamingState.spawnGroupId === spawnGroup.id && m.alive && m.zoneId === zone.id;
      }).length;

      if (aliveCount < spawnGroup.maxConcurrent) {
        spawnRoamingMob(spawnGroup, zone);
      }
    });
  }

  /**
   * Make a roaming mob wander to a nearby random tile
   */
  function wanderMob(mob, roamingState, zone) {
    const tiles = global.World?.getZoneTiles(zone.id) || [];
    const walkableTiles = tiles.filter(tile => 
      tile.walkable && 
      Math.abs(tile.x - mob.x) <= 5 && 
      Math.abs(tile.y - mob.y) <= 5
    );
    
    if (walkableTiles.length === 0) return;

    // Check if target tile is occupied
    const randomTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
    const mobsAtTile = Array.from(activeMobs.values()).filter(m => 
      m.x === randomTile.x && m.y === randomTile.y && m.zoneId === zone.id && m.id !== mob.id
    );
    
    if (mobsAtTile.length === 0) {
      mob.x = randomTile.x;
      mob.y = randomTile.y;
      roamingState.targetX = randomTile.x;
      roamingState.targetY = randomTile.y;
    }
  }

  /**
   * Mark a mob as dead and handle respawning
   */
  function killMob(entityId) {
    const mob = activeMobs.get(entityId);
    if (!mob) return;

    mob.alive = false;
    
    if (mob.spawnPointId) {
      // Static spawn - set respawn timer
      spawnTimers.set(mob.spawnPointId, Date.now());
    } else {
      // Roaming spawn - remove from active list
      activeMobs.delete(entityId);
      roamingMobs.delete(entityId);
    }
  }

  /**
   * Get all alive mobs in current zone
   */
  function getAliveMobs(zoneId) {
    return Array.from(activeMobs.values()).filter(m => 
      m.zoneId === zoneId && m.alive
    );
  }

  /**
   * Get mob at specific tile
   */
  function getMobAtTile(zoneId, x, y) {
    return Array.from(activeMobs.values()).find(m => 
      m.zoneId === zoneId && m.x === x && m.y === y && m.alive
    );
  }

  /**
   * Get nearby mobs (within view radius)
   */
  function getNearbyMobs(zoneId, centerX, centerY, radius = 10) {
    return Array.from(activeMobs.values()).filter(m => {
      if (m.zoneId !== zoneId || !m.alive) return false;
      const distance = Math.abs(m.x - centerX) + Math.abs(m.y - centerY);
      return distance <= radius;
    });
  }

  // Initialize zone on zone change
  if (window.State) {
    // Watch for zone changes
    const originalUpdatePlayer = window.State.updatePlayer;
    if (originalUpdatePlayer) {
      window.State.updatePlayer = function(updates) {
        originalUpdatePlayer.call(this, updates);
        if (updates.currentZone) {
          initializeZone(updates.currentZone);
        }
      };
    }
  }

  // Update mobs periodically
  setInterval(updateMobs, 1000); // Update every second

  // Initialize on load
  if (window.State) {
    const player = window.State.getPlayer();
    if (player && player.currentZone) {
      setTimeout(() => initializeZone(player.currentZone), 500);
    }
  }

  /**
   * Debug method: Add mob directly (for debug commands)
   * @private
   */
  function _debugAddMob(entityId, mobEntity) {
    activeMobs.set(entityId, mobEntity);
  }

  /**
   * Debug method: Create mob entity (exposed for debug commands)
   * @param {Object} mobTemplate - Mob template
   * @param {string} zoneId - Zone ID
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string|null} spawnPointId - Spawn point ID (null for roaming)
   * @returns {Object} Mob entity
   */
  function _debugCreateMobEntity(mobTemplate, zoneId, x, y, spawnPointId) {
    return createMobEntity(mobTemplate, zoneId, x, y, spawnPointId);
  }

  const SpawnSystem = {
    initializeZone,
    clearZone,
    killMob,
    getAliveMobs,
    getMobAtTile,
    getNearbyMobs,
    updateMobs,
    // Debug methods (only in dev mode)
    _debugAddMob: (typeof window !== 'undefined' && (localStorage.getItem('realm_dev_mode') === 'true' || new URLSearchParams(window.location.search).get('dev') === 'true')) ? _debugAddMob : undefined,
    _debugCreateMobEntity: (typeof window !== 'undefined' && (localStorage.getItem('realm_dev_mode') === 'true' || new URLSearchParams(window.location.search).get('dev') === 'true')) ? _debugCreateMobEntity : undefined
  };

  global.SpawnSystem = SpawnSystem;
})(window);

