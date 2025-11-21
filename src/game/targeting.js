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

    // Update con (consider) with faction-based description
    if (conEl) {
      const player = global.State?.getPlayer();
      if (!player) return;
      
      // Use enhanced faction system if available
      if (global.FactionSystem) {
        const conDesc = global.FactionSystem.getConDescription(currentTarget, player);
        // Extract just the description part for display
        const descMatch = conDesc.match(/\((.+)\)/);
        const displayText = descMatch ? descMatch[1] : conDesc;
        conEl.textContent = displayText;
        
        // Color based on faction standing
        const mob = currentTarget.mobTemplate;
        if (mob && mob.factionId) {
          const standing = global.FactionSystem.getPlayerStanding(mob.factionId);
          if (standing === 'scowls' || standing === 'threatening') {
            conEl.style.color = '#ff4444'; // Red - hostile
          } else if (standing === 'ally' || standing === 'warmly' || standing === 'kindly') {
            conEl.style.color = '#4caf50'; // Green - friendly
          } else {
            conEl.style.color = '#ffffff'; // White - neutral
          }
        } else {
          // Level-based color for neutral mobs
          const playerLevel = player.level || 1;
          const mobLevel = currentTarget.level;
          const levelDiff = mobLevel - playerLevel;
          
          if (levelDiff <= -10) {
            conEl.style.color = '#2196f3'; // Blue (trivial)
          } else if (levelDiff <= -5) {
            conEl.style.color = '#00bcd4'; // Cyan (easy)
          } else if (levelDiff <= -3) {
            conEl.style.color = '#4caf50'; // Green (weak)
          } else if (levelDiff <= -1) {
            conEl.style.color = '#ffeb3b'; // Yellow (decent)
          } else if (levelDiff === 0) {
            conEl.style.color = '#ffffff'; // White (even)
          } else if (levelDiff <= 2) {
            conEl.style.color = '#ff9800'; // Orange (tough)
          } else if (levelDiff <= 4) {
            conEl.style.color = '#f44336'; // Red (very tough)
          } else {
            conEl.style.color = '#9c27b0'; // Purple (impossible)
          }
        }
      } else {
        // Fallback to level-based con
        const playerLevel = player.level || 1;
        const mobLevel = currentTarget.level;
        const levelDiff = mobLevel - playerLevel;

        let conColor = '#808080';
        let conText = 'Even Match';

        if (levelDiff <= -10) {
          conColor = '#2196f3';
          conText = 'Trivial';
        } else if (levelDiff <= -5) {
          conColor = '#00bcd4';
          conText = 'Easy';
        } else if (levelDiff <= -3) {
          conColor = '#4caf50';
          conText = 'Weak';
        } else if (levelDiff <= -1) {
          conColor = '#ffeb3b';
          conText = 'Decent';
        } else if (levelDiff === 0) {
          conColor = '#ffffff';
          conText = 'Even Match';
        } else if (levelDiff <= 2) {
          conColor = '#ff9800';
          conText = 'Tough';
        } else if (levelDiff <= 4) {
          conColor = '#f44336';
          conText = 'Very Tough';
        } else {
          conColor = '#9c27b0';
          conText = 'Impossible';
        }

        conEl.textContent = conText;
        conEl.style.color = conColor;
      }
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
    // Target panel is now integrated into main UI (no longer draggable)
    // Clear any saved draggable position data
    try {
      localStorage.removeItem('REALM_TARGET_PANEL_POSITION');
    } catch (e) {
      // Ignore errors
    }
    
    // Ensure panel is in normal flow (not fixed position)
    const panel = document.getElementById('targetPanel');
    if (panel) {
      panel.style.position = '';
      panel.style.left = '';
      panel.style.top = '';
      panel.style.zIndex = '';
    }
    
    // Target close button
    const closeBtn = document.getElementById('targetClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        clearTarget();
      });
    }

    // Attack button
    const attackBtn = document.getElementById('attackBtn');
    if (attackBtn) {
      attackBtn.addEventListener('click', () => {
        if (!currentTarget) {
          if (global.ChatSystem) {
            global.ChatSystem.addSystemMessage('You have no target.');
          }
          return;
        }

        const player = global.State?.getPlayer();
        if (!player || !player.currentTile) return;

        // Check if target is adjacent
        const playerX = player.currentTile.x || 0;
        const playerY = player.currentTile.y || 0;
        const distance = Math.abs(currentTarget.x - playerX) + Math.abs(currentTarget.y - playerY);

        if (distance > 1) {
          if (global.ChatSystem) {
            global.ChatSystem.addSystemMessage('You are too far away. Move closer.');
          }
          // Move towards target
          if (global.Movement) {
            global.Movement.moveToTile(currentTarget.x, currentTarget.y);
          }
          return;
        }

        // Check if it's a hostile mob
        if (currentTarget.mobTemplate && !currentTarget.mobTemplate.isGuard && currentTarget.alive) {
          // Start combat
          if (global.Combat) {
            if (global.Combat.startCombatWithMob) {
              global.Combat.startCombatWithMob(currentTarget);
            } else if (global.Combat.startCombat) {
              global.Combat.startCombat(currentTarget.mobTemplateId);
            }
          }
        } else {
          if (global.ChatSystem) {
            global.ChatSystem.addSystemMessage('You cannot attack that target.');
          }
        }
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

