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
        </div>
        <div class="pet-panel-content">
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
          <div class="pet-controls">
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
      `;

      // Insert after player panel
      const playerPanel = leftPanel.querySelector('.player-panel');
      if (playerPanel && playerPanel.nextSibling) {
        leftPanel.insertBefore(petPanel, playerPanel.nextSibling);
      } else {
        leftPanel.appendChild(petPanel);
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
    if (pet) {
      petPanel.hidden = false;

      // Update pet info
      if (petNameEl) petNameEl.textContent = pet.name || '-';
      if (petLevelEl) petLevelEl.textContent = `Level ${pet.level || 1}`;

      // Update HP bar
      const hp = pet.stats?.hp || 0;
      const maxHp = pet.stats?.maxHp || 1;
      const hpPercent = (hp / maxHp) * 100;

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

      // Check if pet is alive
      if (!pet.alive) {
        petPanel.hidden = true;
      }
    } else {
      // Hide panel if no pet (even if pet class)
      petPanel.hidden = true;
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  const PetUI = {
    init,
    updatePetPanel
  };

  global.PetUI = PetUI;
})(window);

