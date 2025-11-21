/**
 * Tome UI Component
 * 
 * Displays learned skills/spells with descriptions.
 * Supports drag-and-drop to skillbar.
 */

(function (global) {
  let tomeElement = null;
  let tomeModal = null;
  let isOpen = false;

  /**
   * Initialize tome UI
   */
  function initialize() {
    // Create tome button
    const skillbarContainer = document.getElementById('skillbarContainer');
    if (skillbarContainer) {
      const tomeButton = document.createElement('button');
      tomeButton.id = 'tomeButton';
      tomeButton.className = 'tome-button';
      tomeButton.innerHTML = '📖';
      tomeButton.title = 'Open Tome (Spellbook)';
      tomeButton.addEventListener('click', toggleTome);
      
      // Insert before skillbar
      skillbarContainer.insertBefore(tomeButton, skillbarContainer.firstChild);
    }

    // Create tome modal
    createTomeModal();
  }

  /**
   * Create tome modal
   */
  function createTomeModal() {
    tomeModal = document.createElement('div');
    tomeModal.id = 'tomeModal';
    tomeModal.className = 'tome-modal hidden';
    tomeModal.innerHTML = `
      <div class="tome-modal-content">
        <div class="tome-header">
          <h2>📖 Tome of Knowledge</h2>
          <button class="tome-close" id="tomeClose">×</button>
        </div>
        <div class="tome-content">
          <div class="tome-skills-list" id="tomeSkillsList">
            <!-- Skills will be populated here -->
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(tomeModal);

    // Close button
    const closeBtn = tomeModal.querySelector('#tomeClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeTome);
    }

    // Close on outside click
    tomeModal.addEventListener('click', (e) => {
      if (e.target === tomeModal) {
        closeTome();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeTome();
      }
    });
  }

  /**
   * Toggle tome open/close
   */
  function toggleTome() {
    if (isOpen) {
      closeTome();
    } else {
      openTome();
    }
  }

  /**
   * Open tome
   */
  function openTome() {
    if (!tomeModal) createTomeModal();
    
    updateTomeContent();
    tomeModal.classList.remove('hidden');
    isOpen = true;
  }

  /**
   * Close tome
   */
  function closeTome() {
    if (tomeModal) {
      tomeModal.classList.add('hidden');
    }
    isOpen = false;
  }

  /**
   * Update tome content with learned skills
   */
  function updateTomeContent() {
    const skillsList = document.getElementById('tomeSkillsList');
    if (!skillsList) return;

    const player = global.State?.getPlayer();
    if (!player || !player.class) {
      skillsList.innerHTML = '<p class="tome-empty">No skills learned yet.</p>';
      return;
    }

    // Get player's class and available skills
    const classData = global.REALM?.data?.classesEnhancedById?.[player.class.toLowerCase()] ||
                     global.REALM?.data?.classesById?.[player.class.toLowerCase()];
    if (!classData) {
      skillsList.innerHTML = '<p class="tome-empty">Class data not found.</p>';
      return;
    }

    // Get all skills the player has learned (based on level)
    const skillIdsByLevel = classData.skillIdsByLevel || {};
    const learnedSkills = [];

    Object.keys(skillIdsByLevel).forEach(level => {
      if (player.level >= parseInt(level, 10)) {
        skillIdsByLevel[level].forEach(skillId => {
          const skill = global.REALM?.data?.skillsById?.[skillId.toLowerCase()];
          if (skill && !learnedSkills.find(s => s.id === skill.id)) {
            learnedSkills.push(skill);
          }
        });
      }
    });

    if (learnedSkills.length === 0) {
      skillsList.innerHTML = '<p class="tome-empty">No skills learned yet.</p>';
      return;
    }

    // Render skills list
    let html = '';
    learnedSkills.forEach(skill => {
      const icon = getSkillIcon(skill);
      const stats = formatSkillStats(skill);
      
      html += `
        <div class="tome-skill-item" draggable="true" data-skill-id="${skill.id}">
          <div class="tome-skill-icon">${icon}</div>
          <div class="tome-skill-info">
            <div class="tome-skill-name">${skill.name}</div>
            <div class="tome-skill-description">${skill.description || 'No description available.'}</div>
            ${stats ? `<div class="tome-skill-stats">${stats}</div>` : ''}
          </div>
        </div>
      `;
    });

    skillsList.innerHTML = html;

    // Attach drag handlers
    attachDragHandlers();
  }

  /**
   * Get skill icon
   */
  function getSkillIcon(skill) {
    const skillType = skill.type || skill.category || 'combat';
    const icons = {
      attack: '⚔️',
      heal: '✚',
      buff: '✨',
      debuff: '💀',
      spell: '🔮',
      ability: '⚡',
      combat: '⚔️',
      default: '⚔️'
    };
    return icons[skillType.toLowerCase()] || icons.default;
  }

  /**
   * Format skill stats for display
   */
  function formatSkillStats(skill) {
    const parts = [];
    
    if (skill.cooldown) {
      parts.push(`Cooldown: ${skill.cooldown}s`);
    }
    
    if (skill.cost) {
      const costParts = [];
      if (skill.cost.mana) costParts.push(`${skill.cost.mana} Mana`);
      if (skill.cost.energy) costParts.push(`${skill.cost.energy} Energy`);
      if (skill.cost.rage) costParts.push(`${skill.cost.rage} Rage`);
      if (costParts.length > 0) {
        parts.push(`Cost: ${costParts.join(', ')}`);
      }
    }
    
    if (skill.effect) {
      if (skill.effect.formula) {
        parts.push(`Damage: ${skill.effect.formula}`);
      }
      if (skill.effect.bonusDamage) {
        parts.push(`+${skill.effect.bonusDamage} bonus`);
      }
      if (skill.effect.healAmount) {
        parts.push(`Heal: ${skill.effect.healAmount}`);
      }
      if (skill.effect.duration) {
        parts.push(`Duration: ${skill.effect.duration}s`);
      }
    }
    
    if (skill.range !== undefined) {
      parts.push(`Range: ${skill.range}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
  }

  /**
   * Attach drag handlers to skill items
   */
  function attachDragHandlers() {
    const skillItems = document.querySelectorAll('.tome-skill-item');
    skillItems.forEach(item => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
    });

    // Attach drop handlers to skillbar slots
    const skillbarSlots = document.querySelectorAll('.skillbar-slot');
    skillbarSlots.forEach(slot => {
      slot.addEventListener('dragover', handleDragOver);
      slot.addEventListener('drop', handleDrop);
      slot.addEventListener('dragenter', handleDragEnter);
      slot.addEventListener('dragleave', handleDragLeave);
    });
  }

  /**
   * Handle drag start
   */
  function handleDragStart(e) {
    const skillId = e.target.closest('.tome-skill-item')?.dataset.skillId;
    if (!skillId) return;
    
    e.dataTransfer.setData('text/plain', skillId);
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
  }

  /**
   * Handle drag end
   */
  function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.skillbar-slot').forEach(slot => {
      slot.classList.remove('drag-over');
    });
  }

  /**
   * Handle drag over
   */
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  /**
   * Handle drag enter
   */
  function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }

  /**
   * Handle drag leave
   */
  function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  /**
   * Handle drop
   */
  function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const skillId = e.dataTransfer.getData('text/plain');
    if (!skillId) return;
    
    const slotIndex = parseInt(e.currentTarget.dataset.slot, 10) - 1;
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= 5) return;
    
    // Add skill to skillbar
    if (global.Skillbar && global.Skillbar.setSkill) {
      global.Skillbar.setSkill(slotIndex, skillId);
    }
    
    // Show feedback
    if (global.ChatSystem) {
      const skill = global.REALM?.data?.skillsById?.[skillId.toLowerCase()];
      if (skill) {
        global.ChatSystem.addSystemMessage(`${skill.name} added to skillbar slot ${slotIndex + 1}.`);
      }
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }

  const Tome = {
    open: openTome,
    close: closeTome,
    toggle: toggleTome,
    update: updateTomeContent
  };

  global.Tome = Tome;
})(window);

