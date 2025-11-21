/**
 * Ranged Pulling System (P99 Style)
 * 
 * Allows players to pull mobs from distance using:
 * - Ranged spells (range > 1)
 * - Bows/ranged weapons
 * 
 * Pull Mechanics:
 * - Mobs have "aggro range" (default: 3-5 tiles for spells, 4-6 for bows)
 * - Pulled mobs chase the puller
 * - Mobs reset if puller gets too far (leash distance)
 * - Mobs can be pulled into party for group engagement
 * 
 * Reference: https://wiki.project1999.com/Game_Mechanics
 */

(function (global) {
  const DEFAULT_AGGRO_RANGE = 4; // Tiles - default aggro range for melee mobs
  const SPELL_AGGRO_RANGE = 8; // Spells can pull from farther
  const BOW_AGGRO_RANGE = 10; // Bows have longest range
  
  // Leash distance - mob resets if puller gets this far
  const LEASH_DISTANCE = 15; // Tiles
  
  /**
   * Check if attack/spell can pull a mob from distance
   */
  function canPullMob(mobEntity, attackerPosition, attackRange, attackType = 'spell') {
    if (!mobEntity || !attackerPosition || !attackRange) return false;
    
    // Calculate distance
    const distance = Math.abs(mobEntity.x - attackerPosition.x) + 
                     Math.abs(mobEntity.y - attackerPosition.y);
    
    // Check if in range
    if (distance > attackRange) return false;
    
    // Check if mob can be pulled (not already in combat with someone else in party)
    // For now, any mob can be pulled if in range
    
    return true;
  }

  /**
   * Pull a mob (aggro it from distance)
   */
  function pullMob(mobEntity, pullerId, attackType = 'spell') {
    if (!mobEntity || !mobEntity.alive) return false;
    
    const player = global.State?.getPlayer();
    if (!player || player.id !== pullerId) return false;
    
    // Check if mob can be pulled
    const pullerPos = player.currentTile || { x: 0, y: 0 };
    const mobPos = { x: mobEntity.x, y: mobEntity.y };
    
    // Get appropriate range based on attack type
    let pullRange = SPELL_AGGRO_RANGE;
    if (attackType === 'bow' || attackType === 'ranged') {
      pullRange = BOW_AGGRO_RANGE;
    }
    
    if (!canPullMob(mobEntity, pullerPos, pullRange, attackType)) {
      global.ChatSystem?.addSystemMessage('Target is too far away to pull.');
      return false;
    }
    
    // Set mob to chase puller
    // This would set the mob's target to the puller
    // In spawn system, mobs would have a chase state
    
    // Notify puller
    const mobName = mobEntity.mobTemplate?.name || 'mob';
    global.ChatSystem?.addSystemMessage(`${mobName} has been pulled!`);
    global.Narrative?.addEntry({
      type: 'combat',
      text: `${mobName} is now chasing you!`,
      meta: 'Pull Success'
    });
    
    // Set target
    if (global.Targeting) {
      global.Targeting.setTarget(mobEntity);
    }
    
    // Start mob chase (handled by spawn system) - mark as pulled
    if (global.SpawnSystem && global.SpawnSystem.startChasing) {
      global.SpawnSystem.startChasing(mobEntity, true); // true = was pulled
    }
    
    return true;
  }

  /**
   * Check if ranged attack should pull instead of just damage
   */
  function shouldPullOnAttack(mobEntity, attackerPosition, attackRange, attackType) {
    if (!mobEntity || !attackerPosition) return false;
    
    // Calculate distance
    const distance = Math.abs(mobEntity.x - attackerPosition.x) + 
                     Math.abs(mobEntity.y - attackerPosition.y);
    
    // If attack range is > 1, it's a ranged attack and can pull
    if (attackRange > 1) {
      // Check if mob is not already in melee range
      if (distance > 1) {
        return true; // Ranged attack at distance = pull
      }
    }
    
    return false; // Melee range or already in combat = normal attack
  }

  /**
   * Handle ranged attack (spell/bow) - may pull instead of engage
   */
  function handleRangedAttack(target, attackRange, attackType = 'spell') {
    const player = global.State?.getPlayer();
    if (!player || !target) return false;
    
    const attackerPos = player.currentTile || { x: 0, y: 0 };
    
    // Check if this should pull the mob
    if (shouldPullOnAttack(target, attackerPos, attackRange, attackType)) {
      // Pull the mob
      return pullMob(target, player.id, attackType);
    }
    
    // Otherwise, normal attack (if in range or already in combat)
    return false;
  }

  const PullingSystem = {
    canPullMob,
    pullMob,
    shouldPullOnAttack,
    handleRangedAttack,
    DEFAULT_AGGRO_RANGE,
    SPELL_AGGRO_RANGE,
    BOW_AGGRO_RANGE,
    LEASH_DISTANCE
  };

  global.PullingSystem = PullingSystem;
})(window);

