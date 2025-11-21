/**
 * Smooth Real-Time Movement System
 * 
 * Implements smooth WASD movement with real-time position updates.
 * Maintains tile-based coordinates for game logic while using float positions for smooth rendering.
 * 
 * Movement:
 * - WASD keys for continuous movement
 * - Real-time position updates (60 FPS)
 * - Float coordinates for smooth rendering
 * - Tile coordinates maintained for game logic (AI, pathfinding, collision)
 * 
 * Reference: P99-style smooth movement while maintaining grid-based game logic
 */

(function (global) {
  let keysPressed = {}; // Track which keys are currently pressed
  let isMoving = false;
  let movementVelocity = { x: 0, y: 0 };
  
  // Movement constants
  const BASE_MOVE_SPEED = 100; // pixels per second (adjust based on tile size)
  const TILE_SIZE_PIXELS = 16; // Base tile size in pixels (will scale with zoom)
  const MOVE_UPDATE_INTERVAL = 16; // ~60 FPS (16ms per frame)
  
  let moveUpdateInterval = null;
  
  /**
   * Convert tile coordinates to pixel position
   */
  function tileToPixel(tileX, tileY) {
    const zoomLevel = global.WorldMapRender?.zoomLevel || 1.5;
    const tileSize = TILE_SIZE_PIXELS * zoomLevel;
    return {
      x: tileX * tileSize + (tileSize / 2),
      y: tileY * tileSize + (tileSize / 2)
    };
  }
  
  /**
   * Convert pixel position to tile coordinates
   */
  function pixelToTile(pixelX, pixelY) {
    const zoomLevel = global.WorldMapRender?.zoomLevel || 1.5;
    const tileSize = TILE_SIZE_PIXELS * zoomLevel;
    return {
      x: Math.floor(pixelX / tileSize),
      y: Math.floor(pixelY / tileSize)
    };
  }
  
  /**
   * Get current player position (float pixels)
   */
  function getPlayerPosition() {
    const player = global.State?.getPlayer();
    if (!player) return null;
    
    // Check if player has smooth position, otherwise convert from tile
    if (player.position && typeof player.position.x === 'number' && typeof player.position.y === 'number') {
      return { x: player.position.x, y: player.position.y };
    }
    
    // Convert from tile coordinates
    const tile = player.currentTile || { x: 20, y: 20 };
    return tileToPixel(tile.x, tile.y);
  }
  
  /**
   * Update player position (smooth float coordinates)
   */
  function updatePlayerPosition(pixelX, pixelY) {
    const player = global.State?.getPlayer();
    if (!player) return;
    
    const zoomLevel = global.WorldMapRender?.zoomLevel || 1.5;
    const tileSize = TILE_SIZE_PIXELS * zoomLevel;
    
    // Calculate current tile (for game logic)
    const currentTile = pixelToTile(pixelX, pixelY);
    
    // Check if tile changed
    const oldTile = player.currentTile || { x: 0, y: 0 };
    const tileChanged = oldTile.x !== currentTile.x || oldTile.y !== currentTile.y;
    
    // Update player position
    const updates = {
      position: { x: pixelX, y: pixelY },
      currentTile: currentTile,
      x: currentTile.x, // Keep for backward compatibility
      y: currentTile.y
    };
    
    global.State?.updatePlayer(updates);
    
    // If tile changed, trigger tile-based events
    if (tileChanged) {
      checkTileEvents(currentTile.x, currentTile.y);
    }
  }
  
  /**
   * Check tile-based events (zone changes, aggro, etc.)
   */
  function checkTileEvents(tileX, tileY) {
    const player = global.State?.getPlayer();
    if (!player) return;
    
    // Check for zone change
    checkZoneChange(tileX, tileY);
    
    // Check for nearby enemies (aggro check)
    checkNearbyEnemies(tileX, tileY);
    
    // Update nearby players
    if (global.NearbyPlayers) {
      global.NearbyPlayers.updateNearbyPlayers();
    }
    
    // Update nearby list
    if (global.NearbyList) {
      global.NearbyList.update();
    }
  }
  
  /**
   * Check for zone change (from original movement.js)
   */
  function checkZoneChange(x, y) {
    const player = global.State?.getPlayer();
    if (!player) return;

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
  
  /**
   * Check for nearby enemies (aggro check)
   */
  function checkNearbyEnemies(tileX, tileY) {
    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) return;

    // Check if there's a hostile mob at current position
    const mob = global.SpawnSystem?.getMobAtTile(player.currentZone, tileX, tileY);
    if (mob && mob.alive && mob.mobTemplate && !mob.mobTemplate.isGuard) {
      // Set as target
      if (global.Targeting) {
        global.Targeting.setTarget(mob);
      }
      
      // Only auto-start combat if player is already in combat mode
      const isInCombat = global.Combat?.isInCombat?.() || false;
      if (!isInCombat) {
        return; // Just target, don't auto-attack
      }
    }
  }
  
  /**
   * Get movement speed (affected by buffs, class abilities)
   */
  function getMoveSpeed() {
    const player = global.State?.getPlayer();
    if (!player) return BASE_MOVE_SPEED;
    
    let speed = BASE_MOVE_SPEED;
    
    // Check for bard speed song
    if (player.class === 'bard' && player.activeBuffs?.speedSong) {
      speed *= 1.5; // 50% faster
    }
    
    // Check for snare effects (movement speed reduction)
    if (player.activeBuffs?.snared) {
      speed *= 0.5; // 50% slower
    }
    
    return speed;
  }
  
  /**
   * Process movement input (WASD keys)
   */
  function processMovement(deltaTime) {
    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) return;
    
    // Calculate movement velocity from key presses
    let velX = 0;
    let velY = 0;
    
    if (keysPressed['w'] || keysPressed['W'] || keysPressed['ArrowUp']) {
      velY -= 1; // Move up
    }
    if (keysPressed['s'] || keysPressed['S'] || keysPressed['ArrowDown']) {
      velY += 1; // Move down
    }
    if (keysPressed['a'] || keysPressed['A'] || keysPressed['ArrowLeft']) {
      velX -= 1; // Move left
    }
    if (keysPressed['d'] || keysPressed['D'] || keysPressed['ArrowRight']) {
      velX += 1; // Move right
    }
    
    // Normalize diagonal movement
    if (velX !== 0 && velY !== 0) {
      velX *= 0.707; // 1/sqrt(2) for diagonal normalization
      velY *= 0.707;
    }
    
    // No movement
    if (velX === 0 && velY === 0) {
      if (isMoving) {
        isMoving = false;
        // Cancel sitting when moving stops
        if (player.isSitting && global.HealthRegen) {
          global.HealthRegen.setSitting(false);
        }
      }
      movementVelocity = { x: 0, y: 0 };
      return;
    }
    
    // Calculate movement
    isMoving = true;
    
    // Cancel sitting when moving
    if (player.isSitting && global.HealthRegen) {
      global.HealthRegen.setSitting(false);
    }
    
    const moveSpeed = getMoveSpeed();
    const moveDistance = (moveSpeed * deltaTime) / 1000; // Convert to pixels per frame
    
    // Get current position
    const currentPos = getPlayerPosition();
    if (!currentPos) return;
    
    // Calculate new position
    let newX = currentPos.x + (velX * moveDistance);
    let newY = currentPos.y + (velY * moveDistance);
    
    // Convert to tile coordinates for collision check
    const newTile = pixelToTile(newX, newY);
    const currentTile = pixelToTile(currentPos.x, currentPos.y);
    
    // Check collision (only check if moving to a different tile)
    if (newTile.x !== currentTile.x || newTile.y !== currentTile.y) {
      // Check if new tile is walkable
      if (!global.World?.isTileWalkable(player.currentZone, newTile.x, newTile.y)) {
        // Hit a wall - clamp to current tile
        newTile.x = currentTile.x;
        newTile.y = currentTile.y;
        const clampedPos = tileToPixel(newTile.x, newTile.y);
        newX = clampedPos.x;
        newY = clampedPos.y;
      } else {
        // Check if there's a blocking entity (mob, player) at new tile
        const blockingEntity = getBlockingEntity(player.currentZone, newTile.x, newTile.y);
        if (blockingEntity) {
          // Blocked - clamp to current tile
          newTile.x = currentTile.x;
          newTile.y = currentTile.y;
          const clampedPos = tileToPixel(newTile.x, newTile.y);
          newX = clampedPos.x;
          newY = clampedPos.y;
        }
      }
    }
    
    // Update player position
    updatePlayerPosition(newX, newY);
    movementVelocity = { x: velX, y: velY };
    
    // Update map rendering
    if (global.WorldMapRender) {
      global.WorldMapRender.renderMap();
    }
  }
  
  /**
   * Check if there's a blocking entity at a tile
   */
  function getBlockingEntity(zoneId, tileX, tileY) {
    // Check for mobs
    const mob = global.SpawnSystem?.getMobAtTile(zoneId, tileX, tileY);
    if (mob && mob.alive) {
      return mob; // Blocked by mob
    }
    
    // Check for other players (would need multiplayer integration)
    // For now, no blocking from other players
    
    return null; // No blocking entity
  }
  
  /**
   * Handle key down events
   */
  function handleKeyDown(event) {
    // Ignore if typing in input/textarea
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }
    
    keysPressed[event.key] = true;
    
    // Start movement update loop if not running
    if (!moveUpdateInterval && (keysPressed['w'] || keysPressed['W'] || keysPressed['a'] || keysPressed['A'] || 
        keysPressed['s'] || keysPressed['S'] || keysPressed['d'] || keysPressed['D'] ||
        keysPressed['ArrowUp'] || keysPressed['ArrowDown'] || keysPressed['ArrowLeft'] || keysPressed['ArrowRight'])) {
      startMovementLoop();
    }
  }
  
  /**
   * Handle key up events
   */
  function handleKeyUp(event) {
    keysPressed[event.key] = false;
    
    // Stop movement loop if no keys pressed
    const anyKeyPressed = keysPressed['w'] || keysPressed['W'] || keysPressed['a'] || keysPressed['A'] || 
                          keysPressed['s'] || keysPressed['S'] || keysPressed['d'] || keysPressed['D'] ||
                          keysPressed['ArrowUp'] || keysPressed['ArrowDown'] || keysPressed['ArrowLeft'] || keysPressed['ArrowRight'];
    
    if (!anyKeyPressed && moveUpdateInterval) {
      stopMovementLoop();
    }
  }
  
  /**
   * Start movement update loop
   */
  function startMovementLoop() {
    if (moveUpdateInterval) return; // Already running
    
    let lastTime = Date.now();
    
    moveUpdateInterval = setInterval(() => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      processMovement(deltaTime);
    }, MOVE_UPDATE_INTERVAL);
  }
  
  /**
   * Stop movement update loop
   */
  function stopMovementLoop() {
    if (moveUpdateInterval) {
      clearInterval(moveUpdateInterval);
      moveUpdateInterval = null;
    }
    isMoving = false;
    movementVelocity = { x: 0, y: 0 };
  }
  
  /**
   * Initialize smooth movement system
   */
  function initialize() {
    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Initialize player position if needed
    const player = global.State?.getPlayer();
    if (player && (!player.position || typeof player.position.x !== 'number')) {
      const tile = player.currentTile || { x: 20, y: 20 };
      const pixelPos = tileToPixel(tile.x, tile.y);
      updatePlayerPosition(pixelPos.x, pixelPos.y);
    }
  }
  
  /**
   * Move to a specific tile (click-to-move, for backward compatibility)
   */
  function moveToTile(targetX, targetY) {
    const player = global.State?.getPlayer();
    if (!player) return false;
    
    const currentTile = player.currentTile || { x: 0, y: 0 };
    
    // For click-to-move, we can either:
    // 1. Instantly teleport to tile (current behavior)
    // 2. Set a destination and pathfind there (future enhancement)
    // For now, use instant movement for click-to-move
    
    const targetPos = tileToPixel(targetX, targetY);
    updatePlayerPosition(targetPos.x, targetPos.y);
    
    return true;
  }
  
  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }
  
  const SmoothMovement = {
    initialize,
    moveToTile,
    getPlayerPosition,
    tileToPixel,
    pixelToTile,
    isMoving: () => isMoving,
    getVelocity: () => ({ ...movementVelocity })
  };
  
  global.SmoothMovement = SmoothMovement;
})(window);

