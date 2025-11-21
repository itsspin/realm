/**
 * DoT (Damage Over Time) System - P99 Style
 * 
 * Implements P99 DoT mechanics:
 * - DoT spells apply damage over time
 * - If target is moving when DoT ticks, damage is reduced to 66%
 * - Only applies when target moves during the tick
 * - Static targets take full damage
 * 
 * Reference: https://wiki.project1999.com/Game_Mechanics
 */

(function (global) {
  const TICK_INTERVAL = 6000; // 6 seconds per tick (P99 standard)
  let activeDoTs = new Map(); // Map<targetId, DoTEntry[]>
  let lastTargetPositions = new Map(); // Map<targetId, {x, y, timestamp}>
  
  /**
   * DoT Entry structure
   * {
   *   id: unique DoT ID
   *   casterId: player/mob ID that cast the DoT
   *   skillId: skill/spell that created the DoT
   *   damage: damage per tick
   *   ticks: number of ticks remaining
   *   totalTicks: total ticks
   *   duration: total duration in ms
   *   appliedAt: timestamp when DoT was applied
   *   lastTick: timestamp of last tick
   *   targetId: target entity ID
   * }
   */
  
  /**
   * Apply a DoT to a target
   */
  function applyDoT(target, casterId, skillId, dotData) {
    if (!target || !target.id || !dotData) return false;
    
    const dotId = `dot_${Date.now()}_${Math.random()}`;
    
    // Remove existing DoT from same spell (stacks don't exist in P99)
    removeDoT(target.id, skillId);
    
    const dotEntry = {
      id: dotId,
      casterId: casterId,
      skillId: skillId,
      damage: dotData.damage || 1,
      ticks: dotData.ticks || 1,
      totalTicks: dotData.ticks || 1,
      duration: (dotData.duration || 6) * 1000, // Convert seconds to ms
      appliedAt: Date.now(),
      lastTick: Date.now(),
      targetId: target.id
    };
    
    // Initialize DoT list for target if needed
    if (!activeDoTs.has(target.id)) {
      activeDoTs.set(target.id, []);
    }
    
    activeDoTs.get(target.id).push(dotEntry);
    
    // Initialize target position tracking
    lastTargetPositions.set(target.id, {
      x: target.x || 0,
      y: target.y || 0,
      timestamp: Date.now()
    });
    
    // Start DoT tick loop if not already running
    startDoTTickLoop();
    
    return true;
  }

  /**
   * Remove a DoT from a target
   */
  function removeDoT(targetId, skillId) {
    if (!activeDoTs.has(targetId)) return false;
    
    const dots = activeDoTs.get(targetId);
    const initialLength = dots.length;
    
    activeDoTs.set(targetId, dots.filter(dot => dot.skillId !== skillId));
    
    return activeDoTs.get(targetId).length < initialLength;
  }

  /**
   * Remove all DoTs from a target
   */
  function removeAllDoTs(targetId) {
    activeDoTs.delete(targetId);
    lastTargetPositions.delete(targetId);
  }

  /**
   * Check if target moved since last tick
   */
  function didTargetMove(targetId, currentX, currentY) {
    const lastPos = lastTargetPositions.get(targetId);
    if (!lastPos) {
      // First check - initialize position
      lastTargetPositions.set(targetId, {
        x: currentX,
        y: currentY,
        timestamp: Date.now()
      });
      return false;
    }
    
    // Check if position changed
    const moved = (lastPos.x !== currentX) || (lastPos.y !== currentY);
    
    // Update position
    lastTargetPositions.set(targetId, {
      x: currentX,
      y: currentY,
      timestamp: Date.now()
    });
    
    return moved;
  }

  /**
   * Process a DoT tick
   */
  function processDoTTick(dotEntry, target) {
    if (!dotEntry || !target || !target.alive) return false;
    
    // Check if enough time has passed for a tick
    const now = Date.now();
    const timeSinceLastTick = now - dotEntry.lastTick;
    
    if (timeSinceLastTick < TICK_INTERVAL) {
      return false; // Not time for tick yet
    }
    
    // Check if target moved during this tick period
    const currentX = target.x || 0;
    const currentY = target.y || 0;
    const targetMoved = didTargetMove(target.id, currentX, currentY);
    
    // Calculate damage (66% if moving, 100% if static)
    let damage = dotEntry.damage;
    if (targetMoved) {
      // P99 mechanic: 66% damage if target is moving
      damage = Math.floor(damage * 0.66);
    }
    
    // Apply damage to target
    if (target.stats && target.stats.hp !== undefined) {
      target.stats.hp = Math.max(0, target.stats.hp - damage);
      
      // Update narrative
      const skillName = getSkillName(dotEntry.skillId);
      const moveText = targetMoved ? ' (reduced while moving)' : '';
      global.Narrative?.addEntry({
        type: 'combat',
        text: `${target.name || 'Target'} takes ${damage} damage from ${skillName}${moveText}!`,
        meta: `${target.name || 'Target'} HP: ${target.stats.hp}/${target.stats.maxHp}`
      });
    }
    
    // Decrement tick counter
    dotEntry.ticks--;
    dotEntry.lastTick = now;
    
    // Remove DoT if no ticks remaining
    if (dotEntry.ticks <= 0) {
      removeDoT(target.id, dotEntry.skillId);
      return false; // DoT expired
    }
    
    return true; // DoT still active
  }

  /**
   * Get skill name for display
   */
  function getSkillName(skillId) {
    const skill = global.REALM?.data?.skillsById?.[skillId?.toLowerCase()];
    return skill?.name || skillId || 'DoT';
  }

  /**
   * DoT tick loop - processes all active DoTs
   */
  function processAllDoTs() {
    const now = Date.now();
    const expiredTargets = [];
    
    activeDoTs.forEach((dots, targetId) => {
      // Get target entity
      const player = global.State?.getPlayer();
      if (!player || !player.currentZone) return;
      
      // Try to get target from spawn system
      let target = null;
      
      // Check if it's a mob
      const allMobs = global.SpawnSystem?.getAliveMobs(player.currentZone) || [];
      target = allMobs.find(mob => mob.id === targetId);
      
      if (!target || !target.alive) {
        // Target is dead or gone, remove DoTs
        expiredTargets.push(targetId);
        return;
      }
      
      // Process each DoT on this target
      const activeDots = dots.filter(dot => {
        return processDoTTick(dot, target);
      });
      
      // Update DoT list
      if (activeDots.length === 0) {
        expiredTargets.push(targetId);
      } else {
        activeDoTs.set(targetId, activeDots);
      }
      
      // Check if target is dead
      if (target.stats && target.stats.hp <= 0) {
        target.alive = false;
        expiredTargets.push(targetId);
      }
    });
    
    // Clean up expired targets
    expiredTargets.forEach(targetId => {
      removeAllDoTs(targetId);
    });
    
    // If no active DoTs, stop the loop
    if (activeDoTs.size === 0) {
      stopDoTTickLoop();
    }
  }

  let dotTickInterval = null;

  /**
   * Start DoT tick loop
   */
  function startDoTTickLoop() {
    if (dotTickInterval) return; // Already running
    
    // Process DoTs every second (check for tick intervals)
    dotTickInterval = setInterval(processAllDoTs, 1000);
  }

  /**
   * Stop DoT tick loop
   */
  function stopDoTTickLoop() {
    if (dotTickInterval) {
      clearInterval(dotTickInterval);
      dotTickInterval = null;
    }
  }

  /**
   * Get active DoTs on a target
   */
  function getActiveDoTs(targetId) {
    return activeDoTs.get(targetId) || [];
  }

  /**
   * Clear all DoTs (on zone change, etc.)
   */
  function clearAllDoTs() {
    activeDoTs.clear();
    lastTargetPositions.clear();
    stopDoTTickLoop();
  }

  const DoTSystem = {
    applyDoT,
    removeDoT,
    removeAllDoTs,
    getActiveDoTs,
    clearAllDoTs,
    TICK_INTERVAL
  };

  global.DoTSystem = DoTSystem;
})(window);

