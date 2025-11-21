/**
 * Targeting System
 * 
 * Handles targeting mobs via click or keyboard.
 * Shows target info in dedicated panel.
 */

(function (global) {
  let currentTarget = null;
  let nearbyTargets = [];

  /**
   * Set target from mob entity
   */
  function setTarget(mobEntity) {
    if (!mobEntity) {
      clearTarget();
      return;
    }

    currentTarget = mobEntity;
    updateTargetPanel();
    highlightTargetedTile();
  }

  /**
   * Clear current target
   */
  function clearTarget() {
    currentTarget = null;
    updateTargetPanel();
    highlightTargetedTile();
  }

  /**
   * Get current target
   */
  function getTarget() {
    return currentTarget;
  }

  /**
   * Check if a mob is targeted
   */
  function isTargeted(mobEntity) {
    return currentTarget && currentTarget.id === mobEntity.id;
  }

  /**
   * Update target panel UI
   */
  function updateTargetPanel() {
    const panel = document.getElementById('targetPanel');
    const nameEl = document.getElementById('targetName');
    const levelEl = document.getElementById('targetLevel');
    const hpBarEl = document.getElementById('targetHpFill');
    const hpTextEl = document.getElementById('targetHpText');
    const factionEl = document.getElementById('targetFaction');
    const conEl = document.getElementById('targetCon');

    if (!panel) return;

    if (!currentTarget) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;

    const mob = currentTarget.mobTemplate;
    const stats = currentTarget.stats;

    // Update name
    if (nameEl) nameEl.textContent = mob.name;

    // Update level
    if (levelEl) levelEl.textContent = `Level ${currentTarget.level}`;

    // Update HP bar
    const hpPercent = (stats.hp / stats.maxHp) * 100;
    if (hpBarEl) hpBarEl.style.width = `${hpPercent}%`;
    if (hpTextEl) hpTextEl.textContent = `${stats.hp} / ${stats.maxHp}`;

    // Set HP bar color based on health
    if (hpBarEl) {
      if (hpPercent > 75) hpBarEl.style.backgroundColor = '#4caf50';
      else if (hpPercent > 50) hpBarEl.style.backgroundColor = '#ffeb3b';
      else if (hpPercent > 25) hpBarEl.style.backgroundColor = '#ff9800';
      else hpBarEl.style.backgroundColor = '#f44336';
    }

    // Update faction
    if (factionEl) {
      if (mob.factionId) {
        const faction = global.REALM?.data?.factionsById?.[mob.factionId];
        factionEl.textContent = faction ? `Faction: ${faction.name}` : `Faction: ${mob.factionId}`;
      } else {
        factionEl.textContent = 'Faction: Neutral';
      }
    }

    // Update con (consider) color
    if (conEl) {
      const player = global.State?.getPlayer();
      const playerLevel = player?.level || 1;
      const mobLevel = currentTarget.level;
      const levelDiff = mobLevel - playerLevel;

      let conColor = '#808080'; // Gray (even)
      let conText = 'Even Match';

      if (levelDiff <= -10) {
        conColor = '#0000ff'; // Blue (trivial)
        conText = 'Trivial';
      } else if (levelDiff <= -5) {
        conColor = '#00ffff'; // Cyan (easy)
        conText = 'Easy';
      } else if (levelDiff <= -3) {
        conColor = '#00ff00'; // Green (weak)
        conText = 'Weak';
      } else if (levelDiff <= -1) {
        conColor = '#ffff00'; // Yellow (decent)
        conText = 'Decent';
      } else if (levelDiff === 0) {
        conColor = '#ffffff'; // White (even)
        conText = 'Even Match';
      } else if (levelDiff <= 2) {
        conColor = '#ff8000'; // Orange (tough)
        conText = 'Tough';
      } else if (levelDiff <= 4) {
        conColor = '#ff0000'; // Red (very tough)
        conText = 'Very Tough';
      } else {
        conColor = '#800080'; // Purple (impossible)
        conText = 'Impossible';
      }

      conEl.textContent = conText;
      conEl.style.color = conColor;
    }
  }

  /**
   * Highlight targeted tile on map
   */
  function highlightTargetedTile() {
    // This will be handled by the renderer
    if (global.WorldMapRender) {
      global.WorldMapRender.renderMap();
    }
  }

  /**
   * Update nearby targets list for keyboard targeting
   */
  function updateNearbyTargets(zoneId, centerX, centerY, radius = 10) {
    nearbyTargets = global.SpawnSystem?.getNearbyMobs(zoneId, centerX, centerY, radius) || [];
    
    // Sort by distance (closest first)
    nearbyTargets.sort((a, b) => {
      const distA = Math.abs(a.x - centerX) + Math.abs(a.y - centerY);
      const distB = Math.abs(b.x - centerX) + Math.abs(b.y - centerY);
      return distA - distB;
    });
  }

  /**
   * Cycle to next target (keyboard)
   */
  function cycleTarget(forward = true) {
    const player = global.State?.getPlayer();
    if (!player || !player.currentZone || !player.currentTile) return;

    const zoneId = player.currentZone;
    const { x, y } = player.currentTile;

    updateNearbyTargets(zoneId, x, y, 10);

    if (nearbyTargets.length === 0) {
      clearTarget();
      return;
    }

    // Find current target index
    let currentIndex = -1;
    if (currentTarget) {
      currentIndex = nearbyTargets.findIndex(t => t.id === currentTarget.id);
    }

    // Get next target
    let nextIndex;
    if (forward) {
      nextIndex = (currentIndex + 1) % nearbyTargets.length;
    } else {
      nextIndex = currentIndex <= 0 ? nearbyTargets.length - 1 : currentIndex - 1;
    }

    setTarget(nearbyTargets[nextIndex]);
  }

  /**
   * Handle click on tile
   */
  function handleTileClick(zoneId, x, y) {
    const mob = global.SpawnSystem?.getMobAtTile(zoneId, x, y);
    
    if (mob) {
      setTarget(mob);
      return true;
    } else {
      // Click on empty tile - clear target if we're just clicking to move
      // (Don't clear on combat clicks)
      return false;
    }
  }

  /**
   * Initialize targeting system
   */
  function initialize() {
    // Target close button
    const closeBtn = document.getElementById('targetClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        clearTarget();
      });
    }

    // Keyboard controls (Tab to cycle targets)
    document.addEventListener('keydown', (e) => {
      // Only handle if not typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        cycleTarget(!e.shiftKey); // Shift+Tab cycles backward
      } else if (e.key === 'Escape') {
        clearTarget();
      }
    });

    // Update target panel when target changes
    setInterval(() => {
      if (currentTarget) {
        // Refresh target data
        const player = global.State?.getPlayer();
        if (player && player.currentZone) {
          const updated = global.SpawnSystem?.getMobAtTile(
            player.currentZone,
            currentTarget.x,
            currentTarget.y
          );
          
          if (updated && updated.id === currentTarget.id) {
            currentTarget = updated; // Update stats
            updateTargetPanel();
          } else {
            clearTarget(); // Target is dead or gone
          }
        }
      }
    }, 500); // Update every 500ms
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }

  const Targeting = {
    setTarget,
    clearTarget,
    getTarget,
    isTargeted,
    cycleTarget,
    handleTileClick,
    updateNearbyTargets
  };

  global.Targeting = Targeting;
})(window);

