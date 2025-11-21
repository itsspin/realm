/**
 * Player Movement System
 * 
 * Handles grid-based movement on the world map with pathfinding.
 * 
 * FLOW:
 * 1. Player clicks tile on map (any tile within viewport)
 * 2. Pathfinding calculates route to target
 * 3. Player moves along path one tile per second
 * 4. Check collision (walkable tiles only)
 * 5. Update player position (currentTile)
 * 6. Check for zone changes
 * 7. Check for nearby enemies/NPCs
 * 8. Update map rendering
 * 
 * PATHFINDING:
 * - Uses A* algorithm for optimal pathfinding
 * - Supports 8-directional movement (including diagonals)
 * - Non-walkable tiles (walls, water, etc.) block paths
 * - Maximum pathfinding distance limited to viewport radius (8 tiles)
 * 
 * @module Movement
 */
(function (global) {
  let isMoving = false;
  let currentPath = []; // Array of {x, y} coordinates
  let currentPathIndex = 0;
  let movementQueue = [];
  const BASE_MOVE_SPEED = 1000; // 1 second per tile
  let moveSpeed = BASE_MOVE_SPEED;
  const VIEW_RADIUS = 8; // Maximum pathfinding distance (viewport radius)

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
   * A* pathfinding algorithm
   * Returns array of {x, y} coordinates from start to goal, or empty array if no path found
   */
  function findPath(startX, startY, goalX, goalY, zoneId) {
    // Check if goal is within viewport radius
    const distance = Math.abs(goalX - startX) + Math.abs(goalY - startY);
    if (distance > VIEW_RADIUS) {
      return []; // Too far away
    }

    // Check if goal tile is walkable
    if (!global.World?.isTileWalkable(zoneId, goalX, goalY)) {
      return []; // Goal is not walkable
    }

    // If already at goal, return empty path
    if (startX === goalX && startY === goalY) {
      return [];
    }

    // A* pathfinding
    const openSet = [{ x: startX, y: startY, g: 0, h: heuristic(startX, startY, goalX, goalY), f: 0, parent: null }];
    const closedSet = new Set();
    const cameFrom = new Map();

    // Helper to get key for position
    const getKey = (x, y) => `${x},${y}`;

    // 8-directional neighbors (including diagonals)
    const neighbors = [
      { dx: -1, dy: -1, cost: 1.414 }, // Diagonal
      { dx: -1, dy: 0, cost: 1.0 },    // Left
      { dx: -1, dy: 1, cost: 1.414 },  // Diagonal
      { dx: 0, dy: -1, cost: 1.0 },    // Up
      { dx: 0, dy: 1, cost: 1.0 },     // Down
      { dx: 1, dy: -1, cost: 1.414 },  // Diagonal
      { dx: 1, dy: 0, cost: 1.0 },     // Right
      { dx: 1, dy: 1, cost: 1.414 }    // Diagonal
    ];

    openSet[0].f = openSet[0].g + openSet[0].h;

    while (openSet.length > 0) {
      // Get node with lowest f score
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }
      const current = openSet.splice(currentIndex, 1)[0];
      const currentKey = getKey(current.x, current.y);

      // Check if we reached the goal
      if (current.x === goalX && current.y === goalY) {
        // Reconstruct path
        const path = [];
        let node = current;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        // Remove start position (we're already there)
        path.shift();
        return path;
      }

      closedSet.add(currentKey);
      cameFrom.set(currentKey, current);

      // Check neighbors
      for (const neighbor of neighbors) {
        const neighborX = current.x + neighbor.dx;
        const neighborY = current.y + neighbor.dy;
        const neighborKey = getKey(neighborX, neighborY);

        // Skip if already in closed set
        if (closedSet.has(neighborKey)) continue;

        // Check if neighbor is walkable
        if (!global.World?.isTileWalkable(zoneId, neighborX, neighborY)) {
          closedSet.add(neighborKey);
          continue;
        }

        // Check if neighbor is within viewport radius
        const neighborDistance = Math.abs(neighborX - startX) + Math.abs(neighborY - startY);
        if (neighborDistance > VIEW_RADIUS) {
          continue;
        }

        // Calculate g score (cost from start)
        const tentativeG = current.g + neighbor.cost;

        // Check if neighbor is in open set
        let neighborInOpenSet = false;
        let neighborNode = null;
        for (let i = 0; i < openSet.length; i++) {
          if (openSet[i].x === neighborX && openSet[i].y === neighborY) {
            neighborInOpenSet = true;
            neighborNode = openSet[i];
            break;
          }
        }

        if (!neighborInOpenSet) {
          // New node, add to open set
          const h = heuristic(neighborX, neighborY, goalX, goalY);
          neighborNode = {
            x: neighborX,
            y: neighborY,
            g: tentativeG,
            h: h,
            f: tentativeG + h,
            parent: current
          };
          openSet.push(neighborNode);
        } else if (tentativeG < neighborNode.g) {
          // Better path found, update neighbor
          neighborNode.g = tentativeG;
          neighborNode.f = tentativeG + neighborNode.h;
          neighborNode.parent = current;
        }
      }
    }

    // No path found
    return [];
  }

  /**
   * Heuristic function for A* (Manhattan distance)
   */
  function heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  /**
   * Move player along current path
   */
  function moveAlongPath() {
    if (currentPath.length === 0 || currentPathIndex >= currentPath.length) {
      // Path complete
      isMoving = false;
      currentPath = [];
      currentPathIndex = 0;

      // Process queued movement
      if (movementQueue.length > 0) {
        const next = movementQueue.shift();
        moveToTile(next.x, next.y);
      }
      return;
    }

    const player = global.State?.getPlayer();
    if (!player) {
      isMoving = false;
      currentPath = [];
      currentPathIndex = 0;
      return;
    }

    // Get next tile in path
    const nextTile = currentPath[currentPathIndex];
    const playerZone = player.currentZone || 'thronehold';

    // Verify next tile is still walkable (dynamic obstacles might have appeared)
    if (!global.World?.isTileWalkable(playerZone, nextTile.x, nextTile.y)) {
      // Path blocked, cancel movement
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage('Path blocked.');
      }
      isMoving = false;
      currentPath = [];
      currentPathIndex = 0;
      return;
    }

    // Cancel sitting when moving
    if (player.isSitting && global.HealthRegen) {
      global.HealthRegen.setSitting(false);
    }

    // Update player position
    global.State?.updatePlayer({
      currentTile: { x: nextTile.x, y: nextTile.y },
      x: nextTile.x,
      y: nextTile.y
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
    checkZoneChange(nextTile.x, nextTile.y);

    // Check for nearby enemies
    checkNearbyEnemies(nextTile.x, nextTile.y);

    // Check for nearby players
    checkNearbyPlayers(nextTile.x, nextTile.y);

    // Move to next tile in path
    currentPathIndex++;

    // Continue movement after delay
    moveSpeed = getMoveSpeed();
    setTimeout(() => {
      moveAlongPath();
    }, moveSpeed);
  }

  /**
   * Move to a target tile using pathfinding
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

    // Check if target is within viewport
    const distance = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
    if (distance > VIEW_RADIUS) {
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage('That location is too far away.');
      }
      return false;
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

    // If already at target, do nothing
    if (currentX === targetX && currentY === targetY) {
      return true;
    }

    // Find path to target
    const path = findPath(currentX, currentY, targetX, targetY, playerZone);

    if (path.length === 0) {
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage('No path found to that location.');
      }
      return false;
    }

    // Start following path
    isMoving = true;
    currentPath = path;
    currentPathIndex = 0;
    moveAlongPath();

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


