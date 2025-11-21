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
  let chasingMobs = new Map(); // Map<entityId, {playerId, spawnX, spawnY, lastUpdate}>
  
  // Leash radius for static spawns (tiles they can wander from spawn point)
  const LEASH_RADIUS = 5;
  // Chase reset distance - mob resets when player gets this far away
  const CHASE_RESET_DISTANCE = 4; // 3-5 tiles (using 4 as middle)

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
    chasingMobs.clear();
    
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

    // Handle chasing mobs (mobs that are chasing the player)
    handleChasingMobs(player, zone);
  }

  /**
   * Handle mobs that are chasing the player
   * Enhanced for smooth movement support
   */
  function handleChasingMobs(player, zone) {
    if (!player || !player.currentTile) return;

    // Get player position (support both tile and smooth positions)
    let playerX, playerY;
    if (player.position && typeof player.position.x === 'number') {
      // Smooth position - convert to tile for game logic
      const playerTile = global.SmoothMovement?.pixelToTile?.(player.position.x, player.position.y);
      if (playerTile) {
        playerX = playerTile.x;
        playerY = playerTile.y;
      } else {
        playerX = player.currentTile.x;
        playerY = player.currentTile.y;
      }
    } else {
      playerX = player.currentTile.x;
      playerY = player.currentTile.y;
    }

    // Check if player is in combat
    const isInCombat = global.Combat?.isInCombat?.() || false;
    const currentTarget = global.Targeting?.getTarget();
    const currentMonster = global.Combat?.currentMonster;

    const now = Date.now();
    const CHASE_MOVE_INTERVAL = 500; // Move every 500ms for smoother chasing

    chasingMobs.forEach((chaseState, entityId) => {
      const mob = activeMobs.get(entityId);
      if (!mob || !mob.alive || mob.zoneId !== zone.id) {
        // Mob is dead or in different zone, remove from chasing
        chasingMobs.delete(entityId);
        return;
      }

      // Initialize mob position if not set
      if (!mob.position || typeof mob.position.x !== 'number') {
        // Convert tile to pixel position
        const mobPixelPos = global.SmoothMovement?.tileToPixel?.(mob.x, mob.y);
        if (mobPixelPos) {
          mob.position = { x: mobPixelPos.x, y: mobPixelPos.y };
          activeMobs.set(entityId, mob);
        }
      }

      // Calculate distance to player (in tiles)
      const distance = Math.abs(mob.x - playerX) + Math.abs(mob.y - playerY);

      // Check if player is still in combat with this mob or was pulled
      const isTargetingThisMob = currentTarget && currentTarget.id === mob.id;
      const isCombatWithThisMob = isInCombat && currentMonster && currentMonster.mobEntity && currentMonster.mobEntity.id === mob.id;
      const wasPulled = chaseState.wasPulled || false; // Track if mob was pulled (vs. aggroed)

      // Check leash distance (if pulled or too far from spawn)
      const leashDistance = wasPulled ? global.PullingSystem?.LEASH_DISTANCE || 15 : CHASE_RESET_DISTANCE;
      const distanceFromSpawn = chaseState.spawnX !== undefined && chaseState.spawnY !== undefined
        ? Math.abs(mob.x - chaseState.spawnX) + Math.abs(mob.y - chaseState.spawnY)
        : 0;

      // If player got too far away or mob too far from spawn, reset mob to spawn
      if (distance > leashDistance || (distanceFromSpawn > leashDistance && !wasPulled)) {
        // Reset mob to spawn position
        if (chaseState.spawnX !== undefined && chaseState.spawnY !== undefined) {
          mob.x = chaseState.spawnX;
          mob.y = chaseState.spawnY;
          const resetPixelPos = global.SmoothMovement?.tileToPixel?.(mob.x, mob.y);
          if (resetPixelPos) {
            mob.position = { x: resetPixelPos.x, y: resetPixelPos.y };
          }
          activeMobs.set(entityId, mob);
          
          // Remove from chasing
          chasingMobs.delete(entityId);
          
          // Notify player
          if (global.Narrative && wasPulled) {
            global.Narrative.addEntry({
              type: 'combat',
              text: `${mob.mobTemplate?.name || 'Mob'} has lost interest and returned to its spawn.`,
              meta: 'Leash Reset'
            });
          }
          
          // Update map rendering
          if (global.WorldMapRender) {
            global.WorldMapRender.renderMap();
          }
        }
        return;
      }

      // If player is not in combat with this mob anymore and wasn't pulled, reset after a delay
      if (!isTargetingThisMob && !isCombatWithThisMob && !wasPulled) {
        // Wait a bit before resetting (player might be switching targets)
        if (!chaseState.resetTimer) {
          chaseState.resetTimer = setTimeout(() => {
            if (chaseState.spawnX !== undefined && chaseState.spawnY !== undefined) {
              mob.x = chaseState.spawnX;
              mob.y = chaseState.spawnY;
              const resetPixelPos = global.SmoothMovement?.tileToPixel?.(mob.x, mob.y);
              if (resetPixelPos) {
                mob.position = { x: resetPixelPos.x, y: resetPixelPos.y };
              }
              activeMobs.set(entityId, mob);
              chasingMobs.delete(entityId);
              
              if (global.WorldMapRender) {
                global.WorldMapRender.renderMap();
              }
            }
          }, 3000); // Reset after 3 seconds of not being in combat
        }
        return;
      }

      // Clear reset timer if mob is still chasing
      if (chaseState.resetTimer) {
        clearTimeout(chaseState.resetTimer);
        chaseState.resetTimer = null;
      }

      // Chase player if mob is not adjacent
      if (distance > 0.5) { // Allow some tolerance for smooth movement
        // Check if it's time to move (throttle movement updates)
        if (now - (chaseState.lastMoveTime || 0) < CHASE_MOVE_INTERVAL) {
          return; // Not time to move yet
        }

        // Get player pixel position for smooth movement
        let targetPixelX, targetPixelY;
        if (player.position && typeof player.position.x === 'number') {
          targetPixelX = player.position.x;
          targetPixelY = player.position.y;
        } else {
          const playerPixelPos = global.SmoothMovement?.tileToPixel?.(playerX, playerY);
          if (playerPixelPos) {
            targetPixelX = playerPixelPos.x;
            targetPixelY = playerPixelPos.y;
          } else {
            targetPixelX = playerX * 16;
            targetPixelY = playerY * 16;
          }
        }

        // Get mob pixel position
        const mobPixelX = mob.position?.x || (mob.x * 16);
        const mobPixelY = mob.position?.y || (mob.y * 16);

        // Calculate direction towards player (normalized)
        const dx = targetPixelX - mobPixelX;
        const dy = targetPixelY - mobPixelY;
        const distancePixels = Math.sqrt(dx * dx + dy * dy);
        
        if (distancePixels > 5) { // Only move if more than 5 pixels away
          // Normalize direction
          const dirX = dx / distancePixels;
          const dirY = dy / distancePixels;

          // Mob move speed (pixels per second) - slightly slower than player
          const mobSpeed = 80; // pixels per second
          const moveDistance = (mobSpeed * CHASE_MOVE_INTERVAL) / 1000; // pixels per update

          // Calculate new pixel position
          let newPixelX = mobPixelX + (dirX * moveDistance);
          let newPixelY = mobPixelY + (dirY * moveDistance);

          // Convert to tile for collision check
          const newTile = global.SmoothMovement?.pixelToTile?.(newPixelX, newPixelY);
          if (!newTile) return;

          const currentTile = { x: mob.x, y: mob.y };

          // Check collision (only check if moving to a different tile)
          if (newTile.x !== currentTile.x || newTile.y !== currentTile.y) {
            // Check if new tile is walkable
            if (!global.World?.isTileWalkable(zone.id, newTile.x, newTile.y)) {
              // Hit a wall - stop movement
              return;
            }

            // Check if there's a blocking entity at new tile (excluding player)
            const blockingEntity = getBlockingEntityForChase(zone.id, newTile.x, newTile.y, mob.id);
            if (blockingEntity && blockingEntity.id !== player.id) {
              // Blocked - stop movement
              return;
            }
          }

          // Update mob position
          mob.position = { x: newPixelX, y: newPixelY };
          mob.x = newTile.x;
          mob.y = newTile.y;
          chaseState.lastMoveTime = now;
          activeMobs.set(entityId, mob);
          
          // Update map rendering (throttle to avoid too many renders)
          if (global.WorldMapRender && (now - (chaseState.lastRenderTime || 0) > 100)) {
            global.WorldMapRender.renderMap();
            chaseState.lastRenderTime = now;
          }
        }
      }
    });
  }

  /**
   * Check if there's a blocking entity at a tile (for mob chase)
   */
  function getBlockingEntityForChase(zoneId, tileX, tileY, excludeMobId) {
    // Check for other mobs
    const otherMobs = Array.from(activeMobs.values()).filter(m => 
      m.zoneId === zoneId && m.x === tileX && m.y === tileY && m.alive && m.id !== excludeMobId
    );
    if (otherMobs.length > 0) {
      return otherMobs[0];
    }
    
    return null;
  }

  /**
   * Start chasing player (called when mob is attacked or pulled)
   */
  function startChasing(mobEntity, wasPulled = false) {
    if (!mobEntity || !mobEntity.alive) return;

    const player = global.State?.getPlayer();
    if (!player || !player.currentZone || mobEntity.zoneId !== player.currentZone) return;

    // Store spawn position if not already chasing
    if (!chasingMobs.has(mobEntity.id)) {
      const spawnX = mobEntity.spawnX || mobEntity.x;
      const spawnY = mobEntity.spawnY || mobEntity.y;
      
      // Initialize mob position for smooth movement
      if (!mobEntity.position || typeof mobEntity.position.x !== 'number') {
        const mobPixelPos = global.SmoothMovement?.tileToPixel?.(mobEntity.x, mobEntity.y);
        if (mobPixelPos) {
          mobEntity.position = { x: mobPixelPos.x, y: mobPixelPos.y };
          activeMobs.set(mobEntity.id, mobEntity);
        }
      }
      
      chasingMobs.set(mobEntity.id, {
        playerId: player.id || 'player',
        spawnX: spawnX,
        spawnY: spawnY,
        lastUpdate: Date.now(),
        wasPulled: wasPulled, // Track if this was a pull vs. normal aggro
        lastMoveTime: 0,
        lastRenderTime: 0
      });

      // Remove from roaming while chasing
      roamingMobs.delete(mobEntity.id);
    } else {
      // Update chase state if already chasing
      const chaseState = chasingMobs.get(mobEntity.id);
      if (chaseState) {
        chaseState.wasPulled = wasPulled || chaseState.wasPulled;
        chaseState.lastUpdate = Date.now();
      }
    }
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

    // Update mobs periodically (more frequent for smoother chasing)
    setInterval(updateMobs, 500); // Update every 500ms for smoother mob movement

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


