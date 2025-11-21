/**
 * Guard System
 * 
 * Handles guard patrols and guard aggression toward hostile mobs/players.
 */

(function (global) {
  let guardPatrols = new Map(); // Map<guardEntityId, patrolState>
  let guardUpdateInterval = null;

  /**
   * Initialize guards for a zone
   */
  function initializeGuards(zoneId) {
    const patrols = global.REALM?.data?.guardPatrolsById || {};
    const zonePatrols = Object.values(patrols).filter(p => p.zoneId === zoneId);
    
    zonePatrols.forEach(patrol => {
      // Guards are spawned via spawn groups, we just track their patrol routes
      // The spawn system handles spawning, we handle patrol behavior
    });
  }

  /**
   * Update guard behavior (patrol, aggression)
   */
  function updateGuards() {
    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) return;

    const zone = global.World?.getZone(player.currentZone);
    if (!zone || !zone.isSafeHaven) return; // Only update guards in safe havens

    const activeMobs = global.SpawnSystem?.getAllMobs?.(player.currentZone) || [];
    
    activeMobs.forEach(mob => {
      const mobTemplate = mob.mobTemplate;
      if (!mobTemplate || !mobTemplate.isGuard) return; // Only process guards
      
      // Check if guard should attack player
      if (global.FactionSystem && global.FactionSystem.shouldGuardAttackPlayer(mobTemplate.factionId, player)) {
        // Guard attacks player
        if (!global.Combat?.isInCombat()) {
          global.Combat?.startCombatWithMob(mob);
          global.Narrative?.addEntry({
            type: 'combat',
            text: `${mobTemplate.name} attacks you!`,
            meta: 'Guard Aggression'
          });
        }
        return;
      }
      
      // Check if guard should attack nearby hostile mobs
      const nearbyMobs = activeMobs.filter(otherMob => {
        if (otherMob.id === mob.id) return false;
        if (!otherMob.mobTemplate) return false;
        if (otherMob.mobTemplate.isGuard) return false; // Guards don't attack other guards
        
        const distance = Math.abs(otherMob.x - mob.x) + Math.abs(otherMob.y - mob.y);
        return distance <= 5; // 5 tile range
      });
      
      nearbyMobs.forEach(otherMob => {
        if (global.FactionSystem && global.FactionSystem.shouldGuardAttackMob(mobTemplate.factionId, otherMob)) {
          // Guard attacks hostile mob
          // TODO: Implement guard AI to attack mobs
          // For now, guards will just patrol
        }
      });
      
      // Handle patrol routes
      updateGuardPatrol(mob, zone);
    });
  }

  /**
   * Update guard patrol movement
   */
  function updateGuardPatrol(guard, zone) {
    // Get patrol route for this guard
    const patrols = global.REALM?.data?.guardPatrolsById || {};
    const zonePatrol = Object.values(patrols).find(p => 
      p.zoneId === zone.id && p.guardTemplateId === guard.mobTemplateId
    );
    
    if (!zonePatrol || !zonePatrol.patrolRoutes || zonePatrol.patrolRoutes.length === 0) {
      return; // No patrol route defined
    }
    
    // Get or create patrol state
    let patrolState = guardPatrols.get(guard.id);
    if (!patrolState) {
      // Assign a random patrol route
      const route = zonePatrol.patrolRoutes[Math.floor(Math.random() * zonePatrol.patrolRoutes.length)];
      patrolState = {
        routeId: route.id,
        waypoints: route.waypoints,
        currentWaypointIndex: 0,
        lastMoveTime: Date.now(),
        pauseUntil: Date.now() + (route.pauseAtWaypoint || 3000),
        speed: route.speed || 1
      };
      guardPatrols.set(guard.id, patrolState);
    }
    
    const now = Date.now();
    
    // Check if paused at waypoint
    if (now < patrolState.pauseUntil) {
      return; // Still pausing
    }
    
    // Move toward current waypoint
    const currentWaypoint = patrolState.waypoints[patrolState.currentWaypointIndex];
    if (!currentWaypoint) return;
    
    const dx = currentWaypoint.x - guard.x;
    const dy = currentWaypoint.y - guard.y;
    
    // If at waypoint, move to next
    if (dx === 0 && dy === 0) {
      patrolState.currentWaypointIndex = (patrolState.currentWaypointIndex + 1) % patrolState.waypoints.length;
      const nextWaypoint = patrolState.waypoints[patrolState.currentWaypointIndex];
      patrolState.pauseUntil = now + (patrolState.pauseAtWaypoint || 3000);
      
      // Update guard position (this would need to be handled by spawn system)
      // For now, we'll just track the state
      return;
    }
    
    // Move one step toward waypoint (every 2 seconds)
    if (now - patrolState.lastMoveTime >= 2000) {
      let newX = guard.x;
      let newY = guard.y;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        newX += dx > 0 ? 1 : -1;
      } else {
        newY += dy > 0 ? 1 : -1;
      }
      
      // Check if tile is walkable
      if (global.World?.isTileWalkable(zone.id, newX, newY)) {
        // Update guard position (would need spawn system API)
        guard.x = newX;
        guard.y = newY;
        patrolState.lastMoveTime = now;
      }
    }
  }

  /**
   * Start guard update loop
   */
  function startGuardUpdates() {
    if (guardUpdateInterval) return;
    
    guardUpdateInterval = setInterval(() => {
      updateGuards();
    }, 1000); // Update every second
  }

  /**
   * Stop guard update loop
   */
  function stopGuardUpdates() {
    if (guardUpdateInterval) {
      clearInterval(guardUpdateInterval);
      guardUpdateInterval = null;
    }
    guardPatrols.clear();
  }

  /**
   * Clear guards for zone change
   */
  function clearGuards() {
    guardPatrols.clear();
  }

  const GuardSystem = {
    initializeGuards,
    updateGuards,
    startGuardUpdates,
    stopGuardUpdates,
    clearGuards
  };

  global.GuardSystem = GuardSystem;
})(window);

