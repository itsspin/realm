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
  function setTarget(mobEntity, clickEvent) {
    if (!mobEntity) {
      clearTarget();
      return;
    }

    currentTarget = mobEntity;
    updateTargetPanel(clickEvent);
    highlightTargetedTile();
  }

  /**
   * Clear current target
   */
  function clearTarget() {
    currentTarget = null;
    updateTargetPanel(); // Will use default position
    highlightTargetedTile();
  }
  
  /**
   * Position target panel near cursor (avoiding UI elements)
   */
  function positionPanelNearCursor(panel, clickEvent) {
    if (!panel || !clickEvent) return;
    
    const mouseX = clickEvent.clientX;
    const mouseY = clickEvent.clientY;
    
    // Get panel dimensions (estimate if not rendered yet)
    const panelWidth = 280; // Approximate width
    const panelHeight = 200; // Approximate height
    
    // Padding from cursor
    const padding = 20;
    
    // Calculate position - prefer top-right of cursor
    let left = mouseX + padding;
    let top = mouseY - panelHeight - padding;
    
    // Check viewport bounds and adjust
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // If panel would go off right edge, position to left of cursor
    if (left + panelWidth > viewportWidth - 20) {
      left = mouseX - panelWidth - padding;
    }
    
    // If panel would go off top edge, position below cursor
    if (top < 80) { // Leave space for header
      top = mouseY + padding;
    }
    
    // If panel would go off bottom edge, adjust up
    if (top + panelHeight > viewportHeight - 100) { // Leave space for chat
      top = viewportHeight - panelHeight - 100;
    }
    
    // Ensure it doesn't overlap left panel (if exists)
    const leftPanel = document.querySelector('.game-panel--left');
    if (leftPanel) {
      const leftPanelRect = leftPanel.getBoundingClientRect();
      if (left < leftPanelRect.right + 10) {
        left = leftPanelRect.right + 10;
      }
    }
    
    // Ensure it doesn't overlap right panel (if exists)
    const rightPanel = document.querySelector('.game-panel--right');
    if (rightPanel) {
      const rightPanelRect = rightPanel.getBoundingClientRect();
      if (left + panelWidth > rightPanelRect.left - 10) {
        left = rightPanelRect.left - panelWidth - 10;
      }
    }
    
    // Apply positioning
    panel.style.position = 'fixed';
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.transform = 'none';
    panel.style.zIndex = '9998'; // High z-index but below admin panel
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
   * @param {MouseEvent} clickEvent - Optional click event to position panel near cursor
   */
  function updateTargetPanel(clickEvent) {
    let panel = document.getElementById('targetPanel');
    
    // Create panel if it doesn't exist (floating popup)
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'targetPanel';
      panel.className = 'target-panel target-panel--floating';
      panel.hidden = true;
      panel.innerHTML = `
        <div class="target-header">
          <h3 class="target-name" id="targetName">No Target</h3>
          <button class="target-close" id="targetClose" aria-label="Clear target">×</button>
        </div>
        <div class="target-info">
          <div class="target-level" id="targetLevel"></div>
          <div class="target-hp-container">
            <div class="target-hp-bar">
              <div class="target-hp-fill" id="targetHpFill"></div>
            </div>
            <div class="target-hp-text" id="targetHpText"></div>
          </div>
          <div class="target-faction" id="targetFaction"></div>
          <div class="target-con" id="targetCon"></div>
          <!-- Target Action Buttons -->
          <div class="target-actions">
            <button class="target-action-btn" id="attackBtn" title="Attack target">Attack</button>
            <button class="target-action-btn" id="conBtn" title="Consider target">Con</button>
            <button class="target-action-btn" id="hailBtn" title="Hail target">Hail</button>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
      
      // Attach close button handler
      const closeBtn = panel.querySelector('#targetClose');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          clearTarget();
        });
      }
      
      // Attach action button handlers
      const attackBtn = panel.querySelector('#attackBtn');
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
                global.Combat.startCombat(currentTarget.mobTemplateId || currentTarget.mobTemplate.id);
              }
            }
          } else {
            if (global.ChatSystem) {
              global.ChatSystem.addSystemMessage('You cannot attack that target.');
            }
          }
        });
      }
      
      const conBtn = panel.querySelector('#conBtn');
      if (conBtn) {
        conBtn.addEventListener('click', () => {
          if (!currentTarget) {
            if (global.ChatSystem) {
              global.ChatSystem.addSystemMessage('You have no target.');
            }
            return;
          }

          // Consider target - show detailed info
          const player = global.State?.getPlayer();
          if (!player) return;

          let conText = '';
          let conColor = '#ffffff';

          // Use FactionSystem if available for faction-based con
          if (global.FactionSystem && currentTarget.mobTemplate?.factionId) {
            const conDesc = global.FactionSystem.getConDescription(currentTarget, player);
            const descMatch = conDesc.match(/\((.+)\)/);
            conText = descMatch ? descMatch[1] : conDesc;
            
            const standing = global.FactionSystem.getPlayerStanding(currentTarget.mobTemplate.factionId);
            if (standing === 'scowls' || standing === 'threatening') {
              conColor = '#ff4444'; // Red - hostile
            } else if (standing === 'ally' || standing === 'warmly' || standing === 'kindly') {
              conColor = '#4caf50'; // Green - friendly
            } else {
              conColor = '#ffffff'; // White - neutral
            }
          } else {
            // Level-based con
            const playerLevel = player.level || 1;
            const mobLevel = currentTarget.level || 1;
            const levelDiff = mobLevel - playerLevel;

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
          }

          // Show consider message
          const mobName = currentTarget.mobTemplate?.name || currentTarget.name || 'Target';
          const conMessage = `${mobName} looks ${conText.toLowerCase()} to you.`;
          
          if (global.ChatSystem) {
            global.ChatSystem.addSystemMessage(conMessage);
          }
          if (global.Narrative) {
            global.Narrative.addEntry({
              type: 'system',
              text: conMessage,
              meta: `Level ${currentTarget.level || '?'} ${mobName}`
            });
          }
        });
      }
      
      const hailBtn = panel.querySelector('#hailBtn');
      if (hailBtn) {
        hailBtn.addEventListener('click', () => {
          if (global.NPCInteraction && currentTarget) {
            global.NPCInteraction.hail(currentTarget);
          }
        });
      }
    }
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
    
    // Position panel near cursor if click event provided
    if (clickEvent) {
      positionPanelNearCursor(panel, clickEvent);
    } else {
      // Position in top-right corner by default (if no click event)
      panel.style.position = 'fixed';
      panel.style.top = '80px';
      panel.style.right = '20px';
      panel.style.left = 'auto';
      panel.style.bottom = 'auto';
      panel.style.transform = 'none';
    }

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

    setTarget(nearbyTargets[nextIndex], null); // No click event for keyboard targeting
  }

  /**
   * Handle click on tile
   */
  function handleTileClick(zoneId, x, y) {
    const mob = global.SpawnSystem?.getMobAtTile(zoneId, x, y);
    
    if (mob) {
      setTarget(mob, null); // No click event for tile click
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
    // Target panel is now created dynamically as floating popup
    // Clear any saved draggable position data
    try {
      localStorage.removeItem('REALM_TARGET_PANEL_POSITION');
    } catch (e) {
      // Ignore errors
    }
    
    // Panel will be created on first target selection
    // No need to set up handlers here - they're set up in updateTargetPanel when panel is created
    console.log('[Targeting] Targeting system initialized');
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
    updateNearbyTargets,
    initialize
  };

  global.Targeting = Targeting;
})(window);

