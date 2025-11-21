/**
 * Health Regeneration System
 * 
 * Implements Project 1999-style health regeneration based on:
 * - Race (Iksar/Troll have higher regen, others use standard)
 * - Level (different rates at different level ranges)
 * - Position (Standing, Sitting, Feigned)
 * 
 * REGEN RATES (per 6-second tick):
 * 
 * Standard Races:
 * - Level 1-19:  1 HP standing, 2 HP sitting
 * - Level 20-49: 1 HP standing, 3 HP sitting
 * - Level 50:    1 HP standing, 4 HP sitting
 * - Level 51-55: 2 HP standing, 5 HP sitting
 * - Level 56-59: 3 HP standing, 6 HP sitting
 * - Level 60:    4 HP standing, 7 HP sitting
 * 
 * Iksar/Troll (enhanced regen):
 * - Level 1-19:  2 HP standing, 4 HP sitting
 * - Level 20-49: 2 HP standing, 6 HP sitting
 * - Level 50:    2 HP standing, 8 HP sitting
 * - Level 51-55: 6 HP standing, 12 HP sitting
 * - Level 56-59: 10 HP standing, 16 HP sitting
 * - Level 60:    12 HP standing, 18 HP sitting
 * 
 * RULES:
 * - Cannot sit while in combat
 * - Sitting automatically cancels when entering combat
 * - Regen ticks every 6 seconds (server-side tick)
 * 
 * @module HealthRegen
 */
(function (global) {
  let regenInterval = null;
  const TICK_INTERVAL = 6000; // 6 seconds (matches P99 server tick)

  /**
   * Check if race has enhanced regeneration (Iksar/Troll)
   */
  function hasEnhancedRegen(raceId) {
    if (!raceId) return false;
    const raceLower = raceId.toLowerCase();
    // Check for Iksar or Troll (or future equivalents)
    return raceLower === 'iksar' || raceLower === 'troll' || 
           raceLower.includes('iksar') || raceLower.includes('troll');
  }

  /**
   * Get regeneration rate based on level and race
   * Returns { standing, sitting }
   */
  function getRegenRates(level, raceId) {
    const enhanced = hasEnhancedRegen(raceId);
    
    if (enhanced) {
      // Iksar/Troll regen rates
      if (level >= 60) {
        return { standing: 12, sitting: 18 };
      } else if (level >= 56) {
        return { standing: 10, sitting: 16 };
      } else if (level >= 51) {
        return { standing: 6, sitting: 12 };
      } else if (level >= 50) {
        return { standing: 2, sitting: 8 };
      } else if (level >= 20) {
        return { standing: 2, sitting: 6 };
      } else {
        return { standing: 2, sitting: 4 };
      }
    } else {
      // Standard race regen rates
      if (level >= 60) {
        return { standing: 4, sitting: 7 };
      } else if (level >= 56) {
        return { standing: 3, sitting: 6 };
      } else if (level >= 51) {
        return { standing: 2, sitting: 5 };
      } else if (level >= 50) {
        return { standing: 1, sitting: 4 };
      } else if (level >= 20) {
        return { standing: 1, sitting: 3 };
      } else {
        return { standing: 1, sitting: 2 };
      }
    }
  }

  /**
   * Apply health regeneration tick
   */
  function applyRegenTick() {
    const player = global.State?.getPlayer();
    if (!player || !player.stats) return;

    // Don't regen if at max HP
    const currentHp = player.stats.hp || 0;
    const maxHp = player.stats.maxHp || 20;
    if (currentHp >= maxHp) return;

    // Check if in combat - no regen during combat
    if (global.Combat?.isInCombat && global.Combat.isInCombat()) {
      // Also cancel sitting if in combat
      if (player.isSitting) {
        setSitting(false);
      }
      return;
    }

    // Get regen rates
    const level = player.level || 1;
    const raceId = player.race;
    const rates = getRegenRates(level, raceId);

    // Determine position (sitting or standing)
    const isSitting = player.isSitting === true;
    const regenAmount = isSitting ? rates.sitting : rates.standing;

    // Apply regeneration
    const newHp = Math.min(maxHp, currentHp + regenAmount);
    
    if (newHp > currentHp) {
      global.State?.updatePlayer({
        stats: {
          ...player.stats,
          hp: newHp
        }
      });

      // Update UI if available
      if (global.Rendering?.updateCharacterPanel) {
        global.Rendering.updateCharacterPanel();
      }
      if (global.UIRedesign?.updateResourceBars) {
        global.UIRedesign.updateResourceBars();
      }
    }
  }

  /**
   * Set sitting state
   */
  function setSitting(sitting) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    // Cannot sit in combat
    if (sitting && global.Combat?.isInCombat && global.Combat.isInCombat()) {
      global.ChatSystem?.addSystemMessage('You cannot sit while in combat.');
      return false;
    }

    global.State?.updatePlayer({
      isSitting: sitting
    });

    // Update UI
    if (global.Rendering?.updateCharacterPanel) {
      global.Rendering.updateCharacterPanel();
    }
    if (global.UIRedesign?.updateResourceBars) {
      global.UIRedesign.updateResourceBars();
    }

    return true;
  }

  /**
   * Toggle sitting state
   */
  function toggleSitting() {
    const player = global.State?.getPlayer();
    if (!player) return false;

    const currentlySitting = player.isSitting === true;
    return setSitting(!currentlySitting);
  }

  /**
   * Start regeneration system
   */
  function start() {
    if (regenInterval) {
      clearInterval(regenInterval);
    }

    // Apply initial tick immediately, then every 6 seconds
    applyRegenTick();
    regenInterval = setInterval(applyRegenTick, TICK_INTERVAL);

    console.log('[HealthRegen] Regeneration system started');
  }

  /**
   * Stop regeneration system
   */
  function stop() {
    if (regenInterval) {
      clearInterval(regenInterval);
      regenInterval = null;
    }
    console.log('[HealthRegen] Regeneration system stopped');
  }

  /**
   * Get current regen rates for display
   */
  function getCurrentRegenRates() {
    const player = global.State?.getPlayer();
    if (!player) return { standing: 0, sitting: 0 };

    const level = player.level || 1;
    const raceId = player.race;
    return getRegenRates(level, raceId);
  }

  const HealthRegen = {
    start,
    stop,
    setSitting,
    toggleSitting,
    getCurrentRegenRates,
    hasEnhancedRegen
  };

  global.HealthRegen = HealthRegen;
})(window);

