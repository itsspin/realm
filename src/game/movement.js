/**
 * Player Movement System
 * 
 * Handles grid-based movement on the world map.
 * 
 * FLOW:
 * 1. Player clicks tile on map
 * 2. Calculate distance and validate move
 * 3. Check collision (walkable tiles only)
 * 4. Update player position (currentTile)
 * 5. Check for zone changes
 * 6. Check for nearby enemies/NPCs
 * 7. Update map rendering
 * 
 * COLLISION DETECTION:
 * - Uses World.isTileWalkable(zoneId, x, y) to check if tile is walkable
 * - Non-walkable tiles (walls, water, etc.) block movement
 * - Movement queue handles multiple move requests
 * 
 * CURRENT LIMITATIONS:
 * - No pathfinding (moves one tile at a time)
 * - Zone boundaries not defined in tile coordinates
 * - Movement speed is fixed (except bard speed song)
 * 
 * @module Movement
 */
(function (global) {
  let isMoving = false;
  let movementQueue = [];
  let currentMovement = null;
  const BASE_MOVE_SPEED = 1000; // 1 second per tile
  let moveSpeed = BASE_MOVE_SPEED;

  function getMoveSpeed() {
    const player = global.State?.getPlayer();
    if (!player) return BASE_MOVE_SPEED;

    // Check for bard speed song
    if (player.class === 'bard' && player.activeBuffs?.speedSong) {
      // Bards can move 3-5 tiles at once with speed song
      return BASE_MOVE_SPEED / 4; // 4x faster = can move 4 tiles in 1 second
    }

    return BASE_MOVE_SPEED;
  }

  function moveToTile(targetX, targetY) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    if (isMoving) {
      // Queue movement
      movementQueue.push({ x: targetX, y: targetY });
      return true;
    }

    const currentX = player.currentTile?.x || player.x || 0;
    const currentY = player.currentTile?.y || player.y || 0;

    // Calculate distance
    const distance = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);

    // Check if bard with speed song can move multiple tiles
    const canMultiMove = player.class === 'bard' && player.activeBuffs?.speedSong;
    const maxMove = canMultiMove ? 5 : 1;

    if (distance > maxMove) {
      // Move one step at a time
      const dx = targetX > currentX ? 1 : targetX < currentX ? -1 : 0;
      const dy = targetY > currentY ? 1 : targetY < currentY ? -1 : 0;
      
      const nextX = currentX + dx;
      const nextY = currentY + dy;

      return moveToTile(nextX, nextY);
    }

    // Check if tile is valid using World system
    const playerZone = player.currentZone || 'thronehold';
    const tile = global.World?.getTile(playerZone, targetX, targetY);
    if (!tile) {
      global.ChatSystem?.addSystemMessage('Cannot move to that location.');
      return false;
    }

    // Check if tile is walkable
    if (!global.World?.isTileWalkable(playerZone, targetX, targetY)) {
      global.ChatSystem?.addSystemMessage('You cannot walk there.');
      return false;
    }

    // Cancel sitting when moving
    if (player.isSitting && global.HealthRegen) {
      global.HealthRegen.setSitting(false);
    }

    // Start movement
    isMoving = true;
    currentMovement = { x: targetX, y: targetY };

    // Update player position
    global.State?.updatePlayer({
      currentTile: { x: targetX, y: targetY },
      x: targetX,
      y: targetY
    });

    // Update map - only use WorldMapRender
    if (global.WorldMapRender && typeof global.WorldMapRender.renderMap === 'function') {
      global.WorldMapRender.renderMap();
      // centerOnPlayer is now a no-op since viewport is always centered
      global.WorldMapRender.centerOnPlayer();
    }

    // Update nearby list
    if (global.NearbyList && typeof global.NearbyList.update === 'function') {
      global.NearbyList.update();
    }

    // Check for zone change
    checkZoneChange(targetX, targetY);

    // Check for nearby enemies
    checkNearbyEnemies(targetX, targetY);

    // Check for nearby players
    checkNearbyPlayers(targetX, targetY);

    // Movement animation delay
    moveSpeed = getMoveSpeed();
    setTimeout(() => {
      isMoving = false;
      currentMovement = null;

      // Process queued movement
      if (movementQueue.length > 0) {
        const next = movementQueue.shift();
        moveToTile(next.x, next.y);
      }
    }, moveSpeed);

    return true;
  }

  function checkZoneChange(x, y) {
    // Check if tile is in a different zone
    // For now, zones are based on coordinates
    // In real game, this would check zone boundaries
    
    const player = global.State?.getPlayer();
    if (!player) return;

    // Check if near a city entrance
    const cities = [
      { name: 'Thronehold', zone: 'thronehold_gates', x: 12, y: 12, radius: 3 },
      { name: 'Silverweave', zone: 'weeping_woods_outskirts', x: 15, y: 10, radius: 3 },
      { name: 'Ironhold', zone: 'stonecrag_outskirts', x: 10, y: 15, radius: 3 },
      { name: 'Bloodmire', zone: 'boglands_outskirts', x: 8, y: 8, radius: 3 },
      { name: 'Shadowgrave', zone: 'cryptlands_outskirts', x: 5, y: 5, radius: 3 }
    ];

    for (const city of cities) {
      const distance = Math.sqrt(Math.pow(x - city.x, 2) + Math.pow(y - city.y, 2));
      if (distance <= city.radius && player.currentZone !== city.zone) {
        global.Zones?.changeZone(city.zone);
        global.Narrative?.addEntry({
          type: 'zone',
          text: `You approach ${city.name}. The city gates loom ahead.`,
          meta: ''
        });
        break;
      }
    }
  }

  function checkNearbyEnemies(x, y) {
    // Check for monsters on this tile or adjacent tiles
    // REMOVED: Random encounters - mobs are now visible on map
    // Only check for actual mobs at current tile position for aggro
    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) return;

    // Check if there's a hostile mob at current position
    const mob = global.SpawnSystem?.getMobAtTile(player.currentZone, x, y);
    if (mob && mob.alive && mob.mobTemplate && !mob.mobTemplate.isGuard) {
      // Auto-engage if stepping directly on mob (aggro)
      // But don't auto-attack - just set as target
      if (global.Targeting) {
        global.Targeting.setTarget(mob);
      }
      
      // Only auto-start combat if player is already in combat mode or mob is aggressive
      // Otherwise, user must manually attack using Attack button or skillbar
      const isInCombat = global.Combat?.isInCombat?.() || false;
      if (!isInCombat) {
        // Just target, don't auto-attack
        return;
      }
    }
  }

  function checkNearbyPlayers(x, y) {
    // Update nearby players list
    if (global.NearbyPlayers) {
      global.NearbyPlayers.updateNearbyPlayers();
    }
  }

  function handleMapClick(event) {
    if (isMoving) return;

    const canvas = document.getElementById('worldMapCanvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    
    const clickX = (event.clientX - rect.left) * scale;
    const clickY = (event.clientY - rect.top) * scale;

    const tileSize = 16 * (global.MapRender?.zoomLevel || 1);
    const panX = global.MapRender?.panX || 0;
    const panY = global.MapRender?.panY || 0;

    const tileX = Math.floor((clickX - panX) / tileSize);
    const tileY = Math.floor((clickY - panY) / tileSize);

    // Validate tile coordinates
    if (tileX < 0 || tileX >= 50 || tileY < 0 || tileY >= 50) return;

    moveToTile(tileX, tileY);
  }

  function initMovement() {
    const canvas = document.getElementById('worldMapCanvas');
    if (canvas) {
      canvas.addEventListener('click', handleMapClick);
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMovement);
  } else {
    setTimeout(initMovement, 100);
  }

  const Movement = {
    moveToTile,
    getMoveSpeed,
    isMoving: () => isMoving
  };

  global.Movement = Movement;
})(window);


