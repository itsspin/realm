/**
 * Player Movement System
 * 
 * Handles grid-based movement on the world map.
 * Players can only move one tile at a time (adjacent tiles only).
 * 
 * FLOW:
 * 1. Player clicks adjacent tile on map
 * 2. Validate tile is walkable and adjacent
 * 3. Move player one tile per second
 * 4. Check collision (walkable tiles only)
 * 5. Update player position (currentTile)
 * 6. Check for zone changes
 * 7. Check for nearby enemies/NPCs
 * 8. Update map rendering
 * 
 * MOVEMENT:
 * - Single-tile movement only (adjacent tiles)
 * - Supports 8-directional movement (including diagonals)
 * - Non-walkable tiles (walls, water, etc.) block movement
 * - Movement speed: 1 tile per second
 * 
 * NOTE: Multi-tile pathfinding will be a premium feature in the future.
 * 
 * @module Movement
 */
(function (global) {
  let isMoving = false;
  let movementQueue = [];
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

  /**
   * Move to a target tile (single-tile movement only)
   */
  function moveToTile(targetX, targetY) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    const playerZone = player.currentZone || 'thronehold';
    const currentX = player.currentTile?.x || player.x || 0;
    const currentY = player.currentTile?.y || player.y || 0;

    // Check if already moving - queue new destination
    if (isMoving) {
      movementQueue.push({ x: targetX, y: targetY });
      return true;
    }

    // Calculate distance to target
    const distance = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);

    // Only allow movement to adjacent tiles (distance <= 1 for diagonal, distance === 1 for cardinal)
    // For 8-directional: max distance is 1 tile away (including diagonals)
    if (distance > 1) {
      // Too far away - only allow adjacent movement
      // Calculate direction toward target for feedback
      const dx = targetX > currentX ? 1 : targetX < currentX ? -1 : 0;
      const dy = targetY > currentY ? 1 : targetY < currentY ? -1 : 0;
      
      // Suggest moving one step toward the target
      const suggestedX = currentX + dx;
      const suggestedY = currentY + dy;
      
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage('You can only move to adjacent tiles. Move closer first.');
      }
      
      // Optionally auto-move one step toward target (but let's not do this - user should click adjacent)
      return false;
    }

    // If already at target, do nothing
    if (distance === 0) {
      return true;
    }

    // Check if target tile is valid
    const tile = global.World?.getTile(playerZone, targetX, targetY);
    if (!tile) {
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage('Cannot move to that location.');
      }
      return false;
    }

    // Check if target is walkable
    if (!global.World?.isTileWalkable(playerZone, targetX, targetY)) {
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage('You cannot walk there.');
      }
      return false;
    }

    // Cancel sitting when moving
    if (player.isSitting && global.HealthRegen) {
      global.HealthRegen.setSitting(false);
    }

    // Start single-tile movement
    isMoving = true;

    // Update player position
    global.State?.updatePlayer({
      currentTile: { x: targetX, y: targetY },
      x: targetX,
      y: targetY
    });

    // Update map rendering
    if (global.WorldMapRender && typeof global.WorldMapRender.renderMap === 'function') {
      global.WorldMapRender.renderMap();
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
        global.Targeting.setTarget(mob, null); // No click event for auto-targeting
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


