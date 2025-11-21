/**
 * Pet UI Panel
 * 
 * Displays pet information and controls for pet classes (Necromancer, Magician).
 * Shows pet HP bar and control buttons: Attack, Taunt, Stay, Follow.
 */

(function (global) {
  let petPanel = null;
  let petNameEl = null;
  let petHpBarEl = null;
  let petHpTextEl = null;
  let petLevelEl = null;
  let petAttackBtn = null;
  let petTauntBtn = null;
  let petStayBtn = null;
  let petFollowBtn = null;
  let petDismissBtn = null;

  /**
   * Initialize pet UI panel
   */
  function init() {
    // Find or create pet panel in left panel
    const leftPanel = document.querySelector('.game-panel--left');
    if (!leftPanel) return;

    // Check if pet panel already exists
    petPanel = document.getElementById('petPanel');
    if (!petPanel) {
      petPanel = document.createElement('div');
      petPanel.id = 'petPanel';
      petPanel.className = 'pet-panel';
      petPanel.hidden = true;

      petPanel.innerHTML = `
        <div class="pet-panel-header">
          <h3>Pet</h3>
          <button class="pet-panel-toggle" id="petPanelToggle" title="Minimize/Maximize Pet Panel">▼</button>
        </div>
        <div class="pet-panel-content" id="petPanelContent" style="display: flex;">
          <div class="pet-info">
            <div class="pet-name" id="petName">-</div>
            <div class="pet-level" id="petLevel">Level -</div>
          </div>
          <div class="pet-resource-bar">
            <div class="pet-hp-label">
              <span>Health</span>
              <span class="pet-hp-value" id="petHpText">- / -</span>
            </div>
            <div class="pet-hp-bar-fill">
              <div class="pet-hp-fill" id="petHpBar" style="width: 100%"></div>
            </div>
          </div>
          <div class="pet-controls" id="petControls">
            <button class="pet-control-btn" id="petAttackBtn" title="Command pet to attack target">Attack</button>
            <button class="pet-control-btn" id="petTauntBtn" title="Command pet to taunt target (generates high threat)">Taunt</button>
            <button class="pet-control-btn" id="petStayBtn" title="Command pet to stay in place">Stay</button>
            <button class="pet-control-btn" id="petFollowBtn" title="Command pet to follow you">Follow</button>
            <button class="pet-control-btn" id="petGuardBtn" title="Command pet to guard location and defend you">Guard</button>
            <button class="pet-control-btn" id="petSitBtn" title="Command pet to sit and regenerate faster">Sit</button>
            <button class="pet-control-btn" id="petHoldBtn" title="Command pet to hold (passive, ignore combat)">Hold</button>
            <button class="pet-control-btn pet-control-btn--dismiss" id="petDismissBtn" title="Dismiss pet">Dismiss</button>
          </div>
        </div>
        <!-- Compact minimized view -->
        <div class="pet-panel-compact" id="petPanelCompact" style="display: none; flex-direction: column;">
          <div class="pet-compact-hp-bar">
            <div class="pet-hp-fill-compact" id="petHpBarCompact" style="width: 100%"></div>
            <span class="pet-hp-text-compact" id="petHpTextCompact">- / -</span>
          </div>
          <div class="pet-compact-controls" id="petCompactControls">
            <!-- Compact buttons will be populated dynamically -->
          </div>
        </div>
      `;

      // Insert after stats grid (before buffs/inventory)
      const statsGrid = leftPanel.querySelector('.stats-grid');
      if (statsGrid && statsGrid.nextSibling) {
        leftPanel.insertBefore(petPanel, statsGrid.nextSibling);
      } else if (statsGrid) {
        statsGrid.insertAdjacentElement('afterend', petPanel);
      } else {
        // Fallback: insert after player panel
        const playerPanel = leftPanel.querySelector('.player-panel');
        if (playerPanel && playerPanel.nextSibling) {
          leftPanel.insertBefore(petPanel, playerPanel.nextSibling);
        } else {
          leftPanel.appendChild(petPanel);
        }
      }
    }

    // Get UI elements
    petNameEl = document.getElementById('petName');
    petHpBarEl = document.getElementById('petHpBar');
    petHpTextEl = document.getElementById('petHpText');
    petLevelEl = document.getElementById('petLevel');
    petAttackBtn = document.getElementById('petAttackBtn');
    petTauntBtn = document.getElementById('petTauntBtn');
    petStayBtn = document.getElementById('petStayBtn');
    petFollowBtn = document.getElementById('petFollowBtn');
    petGuardBtn = document.getElementById('petGuardBtn');
    petSitBtn = document.getElementById('petSitBtn');
    petHoldBtn = document.getElementById('petHoldBtn');
    petDismissBtn = document.getElementById('petDismissBtn');
    
    // Pet panel toggle button
    const petPanelToggle = document.getElementById('petPanelToggle');
    if (petPanelToggle) {
      petPanelToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePetPanel();
      });
    }

    // Attach event handlers
    if (petAttackBtn) {
      petAttackBtn.addEventListener('click', () => {
        const target = global.Targeting?.getTarget();
        if (!target) {
          global.ChatSystem?.addSystemMessage('You need a target for your pet to attack.');
          return;
        }
        if (global.PetSystem) {
          global.PetSystem.commandPetAttack(target);
        }
      });
    }

    if (petTauntBtn) {
      petTauntBtn.addEventListener('click', () => {
        const target = global.Targeting?.getTarget();
        if (!target) {
          global.ChatSystem?.addSystemMessage('You need a target for your pet to taunt.');
          return;
        }
        if (global.PetSystem) {
          global.PetSystem.commandPetTaunt(target);
        }
      });
    }

    if (petStayBtn) {
      petStayBtn.addEventListener('click', () => {
        if (global.PetSystem) {
          global.PetSystem.setPetBehavior('stay');
        }
      });
    }

    if (petFollowBtn) {
      petFollowBtn.addEventListener('click', () => {
        if (global.PetSystem) {
          global.PetSystem.setPetBehavior('follow');
        }
      });
    }

    if (petGuardBtn) {
      petGuardBtn.addEventListener('click', () => {
        if (global.PetSystem) {
          global.PetSystem.setPetBehavior('guard');
        }
      });
    }

    if (petSitBtn) {
      petSitBtn.addEventListener('click', () => {
        if (global.PetSystem) {
          global.PetSystem.setPetBehavior('sit');
        }
      });
    }

    if (petHoldBtn) {
      petHoldBtn.addEventListener('click', () => {
        if (global.PetSystem) {
          global.PetSystem.setPetBehavior('hold');
        }
      });
    }

    if (petDismissBtn) {
      petDismissBtn.addEventListener('click', () => {
        if (global.PetSystem) {
          global.PetSystem.dismissPet();
        }
      });
    }

    // Update pet panel periodically
    setInterval(updatePetPanel, 500);
    updatePetPanel();
  }

  /**
   * Update pet panel UI
   */
  function updatePetPanel() {
    const player = global.State?.getPlayer();
    if (!player || !petPanel) return;

    const pet = player.pet;

    // Check if player has a pet class
    const classData = global.REALM?.data?.classesEnhancedById?.[player.class?.toLowerCase()] ||
                     global.REALM?.data?.classesById?.[player.class?.toLowerCase()];
    const hasPetClass = classData?.hasPets || false;

    // Show/hide panel based on pet existence or pet class
    if (pet && pet.alive) {
      petPanel.hidden = false;
      
      // Check if minimized
      const isMinimized = petPanel.classList.contains('pet-panel--minimized');
      const content = document.getElementById('petPanelContent');
      const compact = document.getElementById('petPanelCompact');
      
      // Update pet info (always needed, even if minimized)
      if (petNameEl) petNameEl.textContent = pet.name || '-';
      if (petLevelEl) petLevelEl.textContent = `Level ${pet.level || 1}`;

      // Update HP bar
      const hp = pet.stats?.hp || 0;
      const maxHp = pet.stats?.maxHp || 1;
      const hpPercent = (hp / maxHp) * 100;

      if (isMinimized) {
        // Show compact view
        if (content) content.style.display = 'none';
        if (compact) compact.style.display = 'flex';
        // Update compact view
        updatePetPanelCompact(pet);
      } else {
        // Show full view
        if (content) content.style.display = 'flex';
        if (compact) compact.style.display = 'none';
        
        // Update full HP bar
        if (petHpBarEl) {
          petHpBarEl.style.width = `${hpPercent}%`;
          // Color based on health
          if (hpPercent > 75) petHpBarEl.style.backgroundColor = '#4caf50';
          else if (hpPercent > 50) petHpBarEl.style.backgroundColor = '#ffeb3b';
          else if (hpPercent > 25) petHpBarEl.style.backgroundColor = '#ff9800';
          else petHpBarEl.style.backgroundColor = '#f44336';
        }

        if (petHpTextEl) petHpTextEl.textContent = `${hp} / ${maxHp}`;

        // Update button states based on behavior
        const behavior = pet.behavior || 'follow';
        if (petAttackBtn) {
          petAttackBtn.classList.toggle('active', behavior === 'attack');
        }
        if (petTauntBtn) {
          petTauntBtn.classList.toggle('active', behavior === 'taunt');
        }
        if (petStayBtn) {
          petStayBtn.classList.toggle('active', behavior === 'stay');
        }
        if (petFollowBtn) {
          petFollowBtn.classList.toggle('active', behavior === 'follow');
        }
        if (petGuardBtn) {
          petGuardBtn.classList.toggle('active', behavior === 'guard');
        }
        if (petSitBtn) {
          petSitBtn.classList.toggle('active', behavior === 'sit');
        }
        if (petHoldBtn) {
          petHoldBtn.classList.toggle('active', behavior === 'hold');
        }
      }
    } else {
      // Hide panel if no pet or pet is dead
      petPanel.hidden = true;
    }
  }
  
  /**
   * Toggle pet panel minimized/maximized state
   */
  /**
   * Toggle pet panel minimized/maximized state
   */
  function togglePetPanel() {
    if (!petPanel) {
      console.warn('[PetUI] togglePetPanel: petPanel not found');
      return;
    }
    
    const isMinimized = petPanel.classList.contains('pet-panel--minimized');
    const content = document.getElementById('petPanelContent');
    const compact = document.getElementById('petPanelCompact');
    const toggleBtn = document.getElementById('petPanelToggle');
    
    console.log('[PetUI] Toggling pet panel, isMinimized:', isMinimized);
    
    if (isMinimized) {
      // Expand - show full content
      petPanel.classList.remove('pet-panel--minimized');
      if (content) {
        content.style.display = 'flex';
        console.log('[PetUI] Showing full pet panel content');
      }
      if (compact) {
        compact.style.display = 'none';
      }
      if (toggleBtn) {
        toggleBtn.textContent = '▼';
        toggleBtn.title = 'Minimize Pet Panel';
      }
    } else {
      // Minimize - show compact view
      petPanel.classList.add('pet-panel--minimized');
      if (content) {
        content.style.display = 'none';
        console.log('[PetUI] Hiding full pet panel content');
      }
      if (compact) {
        compact.style.display = 'flex';
        console.log('[PetUI] Showing compact pet panel');
      }
      if (toggleBtn) {
        toggleBtn.textContent = '▲';
        toggleBtn.title = 'Maximize Pet Panel';
      }
      
      // Update compact view
      const player = global.State?.getPlayer();
      if (player && player.pet) {
        updatePetPanelCompact(player.pet);
      }
    }
    
    // Force a panel update after toggle
    setTimeout(() => {
      updatePetPanel();
    }, 50);
  }
  
  /**
   * Update minimized pet panel view
   */
  function updatePetPanelCompact(pet) {
    if (!pet) return;
    
    const hpBarCompact = document.getElementById('petHpBarCompact');
    const hpTextCompact = document.getElementById('petHpTextCompact');
    const compactControls = document.getElementById('petCompactControls');
    
    if (!hpBarCompact || !hpTextCompact || !compactControls) return;
    
    // Update HP bar
    const hp = pet.stats?.hp || 0;
    const maxHp = pet.stats?.maxHp || 1;
    const hpPercent = (hp / maxHp) * 100;
    
    hpBarCompact.style.width = `${hpPercent}%`;
    hpTextCompact.textContent = `${hp} / ${maxHp}`;
    
    // Color based on health
    if (hpPercent > 75) hpBarCompact.style.backgroundColor = '#4caf50';
    else if (hpPercent > 50) hpBarCompact.style.backgroundColor = '#ffeb3b';
    else if (hpPercent > 25) hpBarCompact.style.backgroundColor = '#ff9800';
    else hpBarCompact.style.backgroundColor = '#f44336';
    
    // Update compact control buttons
    const behavior = pet.behavior || 'follow';
    const compactButtons = [
      { id: 'attack', label: '⚔', title: 'Attack', action: 'attack' },
      { id: 'taunt', label: '🛡', title: 'Taunt', action: 'taunt' },
      { id: 'stay', label: '📍', title: 'Stay', action: 'stay' },
      { id: 'follow', label: '👣', title: 'Follow', action: 'follow' },
      { id: 'guard', label: '🔒', title: 'Guard', action: 'guard' },
      { id: 'sit', label: '🪑', title: 'Sit', action: 'sit' },
      { id: 'hold', label: '✋', title: 'Hold', action: 'hold' },
      { id: 'dismiss', label: '❌', title: 'Dismiss', action: 'dismiss', isDismiss: true }
    ];
    
    compactControls.innerHTML = compactButtons.map(btn => {
      const isActive = behavior === btn.action;
      const btnClass = btn.isDismiss ? 'pet-compact-btn pet-compact-btn--dismiss' : 
                       isActive ? 'pet-compact-btn pet-compact-btn--active' : 'pet-compact-btn';
      return `<button class="${btnClass}" data-action="${btn.action}" title="${btn.title}">${btn.label}</button>`;
    }).join('');
    
    // Attach event listeners to compact buttons
    compactControls.querySelectorAll('.pet-compact-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'dismiss') {
          if (global.PetSystem && global.PetSystem.dismissPet) {
            global.PetSystem.dismissPet();
          }
        } else if (action === 'attack' || action === 'taunt') {
          const target = global.Targeting?.getTarget();
          if (!target) {
            global.ChatSystem?.addSystemMessage('You need a target for your pet to attack.');
            return;
          }
          if (action === 'attack' && global.PetSystem && global.PetSystem.commandPetAttack) {
            global.PetSystem.commandPetAttack(target);
          } else if (action === 'taunt' && global.PetSystem && global.PetSystem.commandPetTaunt) {
            global.PetSystem.commandPetTaunt(target);
          }
        } else {
          if (global.PetSystem && global.PetSystem.setPetBehavior) {
            global.PetSystem.setPetBehavior(action);
          }
        }
        updatePetPanel(); // Refresh UI
      });
    });
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  const PetUI = {
    init,
    updatePetPanel,
    togglePetPanel
  };

  global.PetUI = PetUI;
})(window);

