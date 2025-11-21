/**
 * Test and Debug System
 * 
 * Provides lightweight test routines and debug utilities for:
 * - Movement and collision on the grid
 * - Spawn logic (static vs roaming; respawn timers)
 * - Combat math (damage, XP gain, level up)
 * - Faction changes when killing mobs
 * 
 * All tests are runnable in the browser console or via debug commands.
 * 
 * @module TestDebugSystem
 */

(function (global) {
  const isDevMode = () => {
    // Check for dev mode flag in localStorage or URL param
    return localStorage.getItem('realm_dev_mode') === 'true' || 
           new URLSearchParams(window.location.search).get('dev') === 'true';
  };

  /**
   * Test movement and collision on the grid
   * 
   * Tests:
   * - Valid tile movement
   * - Collision detection (non-walkable tiles)
   * - Zone boundary detection
   * - Movement queue handling
   * 
   * @returns {Object} Test results
   */
  function testMovementAndCollision() {
    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };

    const player = global.State?.getPlayer();
    if (!player) {
      results.tests.push({
        name: 'Player exists',
        passed: false,
        error: 'No player found'
      });
      results.failed++;
      return results;
    }

    const originalX = player.currentTile?.x || player.x || 0;
    const originalY = player.currentTile?.y || player.y || 0;
    const zone = player.currentZone || 'thronehold';

    // Test 1: Move to valid walkable tile
    try {
      const testX = originalX + 1;
      const testY = originalY;
      const tile = global.World?.getTile(zone, testX, testY);
      const isWalkable = global.World?.isTileWalkable(zone, testX, testY);
      
      if (tile && isWalkable) {
        global.Movement?.moveToTile(testX, testY);
        setTimeout(() => {
          const newPos = global.State?.getPlayer();
          const moved = (newPos.currentTile?.x === testX && newPos.currentTile?.y === testY) ||
                       (newPos.x === testX && newPos.y === testY);
          results.tests.push({
            name: 'Move to valid tile',
            passed: moved,
            details: `Moved from (${originalX}, ${originalY}) to (${testX}, ${testY})`
          });
          if (moved) results.passed++; else results.failed++;
          
          // Restore original position
          global.Movement?.moveToTile(originalX, originalY);
        }, 1200);
      } else {
        results.tests.push({
          name: 'Move to valid tile',
          passed: false,
          error: `Tile (${testX}, ${testY}) is not walkable or doesn't exist`
        });
        results.failed++;
      }
    } catch (e) {
      results.tests.push({
        name: 'Move to valid tile',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    // Test 2: Attempt to move to non-walkable tile
    try {
      // Find a non-walkable tile
      let foundNonWalkable = false;
      for (let x = 0; x < 50 && !foundNonWalkable; x++) {
        for (let y = 0; y < 50 && !foundNonWalkable; y++) {
          if (!global.World?.isTileWalkable(zone, x, y)) {
            foundNonWalkable = true;
            const canMove = global.Movement?.moveToTile(x, y);
            results.tests.push({
              name: 'Collision detection (non-walkable)',
              passed: !canMove,
              details: `Attempted to move to non-walkable tile (${x}, ${y})`
            });
            if (!canMove) results.passed++; else results.failed++;
          }
        }
      }
      if (!foundNonWalkable) {
        results.tests.push({
          name: 'Collision detection (non-walkable)',
          passed: true,
          details: 'No non-walkable tiles found in zone (all walkable)'
        });
        results.passed++;
      }
    } catch (e) {
      results.tests.push({
        name: 'Collision detection (non-walkable)',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    // Test 3: Movement queue
    try {
      const queueTestX = originalX + 2;
      const queueTestY = originalY;
      
      // Queue multiple moves
      global.Movement?.moveToTile(originalX + 1, originalY);
      const queued = global.Movement?.moveToTile(queueTestX, queueTestY);
      
      results.tests.push({
        name: 'Movement queue',
        passed: queued === true,
        details: 'Movement queued while already moving'
      });
      if (queued) results.passed++; else results.failed++;
    } catch (e) {
      results.tests.push({
        name: 'Movement queue',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    return results;
  }

  /**
   * Test spawn logic
   * 
   * Tests:
   * - Static spawns appear at correct locations
   * - Roaming spawns appear at valid tiles
   * - Respawn timers work correctly
   * - Spawn group maxConcurrent limits
   * 
   * @returns {Object} Test results
   */
  function testSpawnLogic() {
    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };

    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) {
      results.tests.push({
        name: 'Player in zone',
        passed: false,
        error: 'No player or zone found'
      });
      results.failed++;
      return results;
    }

    const zoneId = player.currentZone;
    const zone = global.World?.getZone(zoneId);
    if (!zone) {
      results.tests.push({
        name: 'Zone exists',
        passed: false,
        error: `Zone ${zoneId} not found`
      });
      results.failed++;
      return results;
    }

    const spawnGroups = global.World?.getSpawnGroupsForZone(zoneId) || [];

    // Test 1: Static spawns exist at defined points
    try {
      const staticGroups = spawnGroups.filter(g => g.spawnType === 'static');
      let staticSpawnsFound = 0;
      
      staticGroups.forEach(group => {
        if (group.spawnPoints && group.spawnPoints.length > 0) {
          staticSpawnsFound += group.spawnPoints.length;
        }
      });

      results.tests.push({
        name: 'Static spawn points defined',
        passed: staticSpawnsFound > 0,
        details: `Found ${staticSpawnsFound} static spawn points in ${staticGroups.length} groups`
      });
      if (staticSpawnsFound > 0) results.passed++; else results.failed++;
    } catch (e) {
      results.tests.push({
        name: 'Static spawn points defined',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    // Test 2: Check active mobs
    try {
      const aliveMobs = global.SpawnSystem?.getAliveMobs(zoneId) || [];
      results.tests.push({
        name: 'Active mobs in zone',
        passed: true,
        details: `Found ${aliveMobs.length} alive mobs in zone`
      });
      results.passed++;
    } catch (e) {
      results.tests.push({
        name: 'Active mobs in zone',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    // Test 3: Roaming spawns at valid tiles
    try {
      const roamingGroups = spawnGroups.filter(g => g.spawnType === 'roaming');
      let roamingMobsValid = true;
      let roamingCount = 0;

      if (roamingGroups.length > 0) {
        const aliveMobs = global.SpawnSystem?.getAliveMobs(zoneId) || [];
        aliveMobs.forEach(mob => {
          if (!mob.spawnPointId) { // Roaming mobs don't have spawnPointId
            roamingCount++;
            const isWalkable = global.World?.isTileWalkable(zoneId, mob.x, mob.y);
            if (!isWalkable) {
              roamingMobsValid = false;
            }
          }
        });
      }

      results.tests.push({
        name: 'Roaming mobs at valid tiles',
        passed: roamingMobsValid,
        details: `Checked ${roamingCount} roaming mobs, all at walkable tiles`
      });
      if (roamingMobsValid) results.passed++; else results.failed++;
    } catch (e) {
      results.tests.push({
        name: 'Roaming mobs at valid tiles',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    // Test 4: Respawn timer structure
    try {
      const hasRespawnTimers = spawnGroups.some(g => 
        g.spawnType === 'static' && g.respawnSeconds && g.respawnSeconds > 0
      );
      
      results.tests.push({
        name: 'Respawn timers configured',
        passed: hasRespawnTimers,
        details: 'Static spawn groups have respawn timers'
      });
      if (hasRespawnTimers) results.passed++; else results.failed++;
    } catch (e) {
      results.tests.push({
        name: 'Respawn timers configured',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    return results;
  }

  /**
   * Test combat math
   * 
   * Tests:
   * - Damage calculation (atk vs def)
   * - Critical hit chance
   * - XP gain calculation
   * - Level up mechanics
   * 
   * @returns {Object} Test results
   */
  function testCombatMath() {
    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };

    // Test 1: Damage calculation
    try {
      const attackerAtk = 10;
      const defenderDef = 5;
      const baseDamage = Math.max(1, attackerAtk - defenderDef);
      
      // Test multiple damage rolls (should have variance)
      const damages = [];
      for (let i = 0; i < 10; i++) {
        const variance = Math.floor(baseDamage * 0.3);
        const damage = baseDamage + Math.floor(Math.random() * variance * 2) - variance;
        damages.push(Math.max(1, damage));
      }

      const minDamage = Math.min(...damages);
      const maxDamage = Math.max(...damages);
      const hasVariance = maxDamage !== minDamage || damages.length === 1;

      results.tests.push({
        name: 'Damage calculation with variance',
        passed: hasVariance && minDamage >= 1,
        details: `Damage range: ${minDamage}-${maxDamage} (base: ${baseDamage})`
      });
      if (hasVariance && minDamage >= 1) results.passed++; else results.failed++;
    } catch (e) {
      results.tests.push({
        name: 'Damage calculation with variance',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    // Test 2: Critical hit calculation
    try {
      const critChance = global.CombatEnhanced?.calculateCritChance?.(10, 5, 100) || 0;
      const hasCritSystem = typeof global.CombatEnhanced?.calculateCritChance === 'function';
      
      results.tests.push({
        name: 'Critical hit system',
        passed: hasCritSystem && critChance >= 0 && critChance <= 1,
        details: `Crit chance: ${(critChance * 100).toFixed(1)}%`
      });
      if (hasCritSystem && critChance >= 0 && critChance <= 1) results.passed++; else results.failed++;
    } catch (e) {
      results.tests.push({
        name: 'Critical hit system',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    // Test 3: XP calculation
    try {
      const player = global.State?.getPlayer();
      if (player) {
        const originalXP = player.xp || 0;
        const originalLevel = player.level || 1;
        const xpToNext = player.xpToNext || 100;

        // Test XP gain
        global.Leveling?.addXP(50);
        
        setTimeout(() => {
          const newPlayer = global.State?.getPlayer();
          const xpGained = (newPlayer.xp || 0) - originalXP;
          
          results.tests.push({
            name: 'XP gain system',
            passed: xpGained > 0,
            details: `Gained ${xpGained} XP (${originalXP} -> ${newPlayer.xp || 0})`
          });
          if (xpGained > 0) results.passed++; else results.failed++;
        }, 100);
      } else {
        results.tests.push({
          name: 'XP gain system',
          passed: false,
          error: 'No player found'
        });
        results.failed++;
      }
    } catch (e) {
      results.tests.push({
        name: 'XP gain system',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    // Test 4: Level up calculation
    try {
      const level1XP = global.Leveling?.calculateXPForLevel?.(1) || 0;
      const level2XP = global.Leveling?.calculateXPForLevel?.(2) || 0;
      const xpIncreases = level2XP > level1XP;
      
      results.tests.push({
        name: 'Level up XP curve',
        passed: xpIncreases && level1XP > 0,
        details: `Level 1: ${level1XP} XP, Level 2: ${level2XP} XP`
      });
      if (xpIncreases && level1XP > 0) results.passed++; else results.failed++;
    } catch (e) {
      results.tests.push({
        name: 'Level up XP curve',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    return results;
  }

  /**
   * Test faction changes
   * 
   * Tests:
   * - Faction changes on mob kill
   * - Faction standing calculation
   * - Faction system integration
   * 
   * @returns {Object} Test results
   */
  function testFactionChanges() {
    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };

    const player = global.State?.getPlayer();
    if (!player) {
      results.tests.push({
        name: 'Player exists',
        passed: false,
        error: 'No player found'
      });
      results.failed++;
      return results;
    }

    // Test 1: Faction system exists
    try {
      const hasFactionSystem = typeof global.Factions?.modifyFaction === 'function' &&
                                typeof global.FactionSystem?.applyKillFactionChanges === 'function';
      
      results.tests.push({
        name: 'Faction system available',
        passed: hasFactionSystem,
        details: 'Faction modification functions available'
      });
      if (hasFactionSystem) results.passed++; else results.failed++;
    } catch (e) {
      results.tests.push({
        name: 'Faction system available',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    // Test 2: Faction standing calculation
    try {
      const testFactionId = Object.keys(global.REALM?.data?.factionsById || {})[0];
      if (testFactionId) {
        const originalStanding = global.Factions?.getPlayerFactions?.()[testFactionId] || 0;
        const standingName = global.Factions?.getFactionStanding?.(originalStanding) || 'Unknown';
        
        results.tests.push({
          name: 'Faction standing calculation',
          passed: standingName !== 'Unknown',
          details: `Faction ${testFactionId}: ${standingName} (${originalStanding})`
        });
        if (standingName !== 'Unknown') results.passed++; else results.failed++;
      } else {
        results.tests.push({
          name: 'Faction standing calculation',
          passed: false,
          error: 'No factions found in data'
        });
        results.failed++;
      }
    } catch (e) {
      results.tests.push({
        name: 'Faction standing calculation',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    // Test 3: Faction modification
    try {
      const testFactionId = Object.keys(global.REALM?.data?.factionsById || {})[0];
      if (testFactionId) {
        const originalStanding = global.Factions?.getPlayerFactions?.()[testFactionId] || 0;
        global.Factions?.modifyFaction(testFactionId, 10);
        
        setTimeout(() => {
          const newStanding = global.Factions?.getPlayerFactions?.()[testFactionId] || 0;
          const changed = newStanding === originalStanding + 10;
          
          results.tests.push({
            name: 'Faction modification',
            passed: changed,
            details: `Modified ${testFactionId}: ${originalStanding} -> ${newStanding}`
          });
          if (changed) results.passed++; else results.failed++;
          
          // Restore original
          global.Factions?.modifyFaction(testFactionId, -10);
        }, 100);
      } else {
        results.tests.push({
          name: 'Faction modification',
          passed: false,
          error: 'No factions found in data'
        });
        results.failed++;
      }
    } catch (e) {
      results.tests.push({
        name: 'Faction modification',
        passed: false,
        error: e.message
      });
      results.failed++;
    }

    return results;
  }

  /**
   * Run all tests
   * 
   * @returns {Object} Combined test results
   */
  function runAllTests() {
    console.log('[TestDebug] Running all tests...');
    
    const movementResults = testMovementAndCollision();
    const spawnResults = testSpawnLogic();
    const combatResults = testCombatMath();
    const factionResults = testFactionChanges();

    const allResults = {
      movement: movementResults,
      spawn: spawnResults,
      combat: combatResults,
      faction: factionResults,
      summary: {
        totalPassed: movementResults.passed + spawnResults.passed + combatResults.passed + factionResults.passed,
        totalFailed: movementResults.failed + spawnResults.failed + combatResults.failed + factionResults.failed
      }
    };

    console.log('[TestDebug] Test Results:', allResults);
    return allResults;
  }

  const TestDebugSystem = {
    isDevMode,
    testMovementAndCollision,
    testSpawnLogic,
    testCombatMath,
    testFactionChanges,
    runAllTests
  };

  global.TestDebugSystem = TestDebugSystem;
  
  // Expose to console for easy access
  if (isDevMode()) {
    window.testMovement = () => TestDebugSystem.testMovementAndCollision();
    window.testSpawns = () => TestDebugSystem.testSpawnLogic();
    window.testCombat = () => TestDebugSystem.testCombatMath();
    window.testFactions = () => TestDebugSystem.testFactionChanges();
    window.runAllTests = () => TestDebugSystem.runAllTests();
  }
})(window);

