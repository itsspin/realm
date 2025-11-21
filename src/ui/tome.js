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
    
    // Attach hover tooltips
    attachTooltips();
  }
  
  /**
   * Attach hover tooltips to tome skill items
   */
  function attachTooltips() {
    const skillItems = document.querySelectorAll('.tome-skill-item');
    skillItems.forEach(item => {
      const skillId = item.dataset.skillId;
      if (!skillId) return;
      
      const skill = global.REALM?.data?.skillsById?.[skillId.toLowerCase()];
      if (!skill) return;
      
      // Mouse enter - show tooltip
      item.addEventListener('mouseenter', (e) => {
        showSpellTooltip(e, skill);
      });
      
      // Mouse move - update tooltip position
      item.addEventListener('mousemove', (e) => {
        updateTooltipPosition(e);
      });
      
      // Mouse leave - hide tooltip
      item.addEventListener('mouseleave', () => {
        hideSpellTooltip();
      });
    });
  }
  
  /**
   * Show spell tooltip (shared with skillbar)
   */
  function showSpellTooltip(event, skill) {
    const tooltip = document.getElementById('spellTooltip');
    if (!tooltip) {
      // Create tooltip if it doesn't exist
      const newTooltip = document.createElement('div');
      newTooltip.id = 'spellTooltip';
      newTooltip.className = 'tooltip tooltip--spell hidden';
      document.body.appendChild(newTooltip);
      return showSpellTooltip(event, skill);
    }
    
    // Build tooltip content (same as skillbar)
    let html = `<div class="tooltip-spell-name">${skill.name || skill.id}</div>`;
    
    if (skill.description) {
      html += `<div class="tooltip-spell-description">${skill.description}</div>`;
    }
    
    // Type and level
    html += `<div class="tooltip-spell-meta">`;
    if (skill.type) {
      html += `<span class="tooltip-spell-type">${skill.type.charAt(0).toUpperCase() + skill.type.slice(1)}</span>`;
    }
    if (skill.requiredLevel) {
      html += `<span class="tooltip-spell-level">Level ${skill.requiredLevel}</span>`;
    }
    html += `</div>`;
    
    // Cost
    if (skill.cost) {
      html += `<div class="tooltip-spell-cost">`;
      const costParts = [];
      if (skill.cost.mana) costParts.push(`<span class="cost-mana">${skill.cost.mana} Mana</span>`);
      if (skill.cost.rage) costParts.push(`<span class="cost-rage">${skill.cost.rage} Rage</span>`);
      if (skill.cost.energy) costParts.push(`<span class="cost-energy">${skill.cost.energy} Energy</span>`);
      if (costParts.length > 0) {
        html += `Cost: ${costParts.join(', ')}`;
      }
      html += `</div>`;
    }
    
    // Cooldown
    if (skill.cooldown) {
      html += `<div class="tooltip-spell-cooldown">Cooldown: ${skill.cooldown}s</div>`;
    }
    
    // Cast time
    if (skill.castTime) {
      html += `<div class="tooltip-spell-cast-time">Cast Time: ${skill.castTime}s</div>`;
    }
    
    // Range
    if (skill.range !== undefined) {
      html += `<div class="tooltip-spell-range">Range: ${skill.range === 0 ? 'Self' : skill.range}</div>`;
    }
    
    // Effect details
    if (skill.effect) {
      html += `<div class="tooltip-spell-effects">`;
      
      if (skill.effect.type === 'damage') {
        const formula = skill.effect.formula || 'atk * 1.0';
        const bonus = skill.effect.bonusDamage || 0;
        html += `<div class="tooltip-effect-damage">Damage: ${formula}${bonus > 0 ? ` + ${bonus}` : ''}</div>`;
        
        if (skill.effect.resistType) {
          html += `<div class="tooltip-effect-resist">Resist: ${skill.effect.resistType}</div>`;
        }
        
        if (skill.effect.stunDuration) {
          html += `<div class="tooltip-effect-stun">Stuns for ${skill.effect.stunDuration}s</div>`;
        }
        
        if (skill.effect.interrupt) {
          html += `<div class="tooltip-effect-interrupt">Interrupts enemy actions</div>`;
        }
        
        if (skill.effect.dot) {
          html += `<div class="tooltip-effect-dot">DoT: ${skill.effect.dot.damage} damage every ${skill.effect.dot.duration / skill.effect.dot.ticks}s for ${skill.effect.dot.duration}s</div>`;
        }
        
        if (skill.effect.snare) {
          html += `<div class="tooltip-effect-snare">Slows movement by ${(skill.effect.snare.movementSpeed * 100).toFixed(0)}% for ${skill.effect.snare.duration}s</div>`;
        }
      } else if (skill.effect.type === 'heal') {
        const formula = skill.effect.formula || 'wis * 1.0';
        const bonus = skill.effect.bonusHealing || 0;
        html += `<div class="tooltip-effect-heal">Healing: ${formula}${bonus > 0 ? ` + ${bonus}` : ''}</div>`;
      } else if (skill.effect.type === 'buff') {
        if (skill.effect.statModifier) {
          const mods = [];
          Object.keys(skill.effect.statModifier).forEach(stat => {
            const value = skill.effect.statModifier[stat];
            if (value > 0) {
              mods.push(`+${(value * 100).toFixed(0)}% ${stat.toUpperCase()}`);
            } else {
              mods.push(`${(value * 100).toFixed(0)}% ${stat.toUpperCase()}`);
            }
          });
          if (mods.length > 0) {
            html += `<div class="tooltip-effect-buff">${mods.join(', ')}</div>`;
          }
        }
        if (skill.effect.stealth) {
          html += `<div class="tooltip-effect-stealth">Grants stealth</div>`;
        }
        if (skill.effect.dodgeChance) {
          html += `<div class="tooltip-effect-dodge">+${(skill.effect.dodgeChance * 100).toFixed(0)}% Dodge Chance</div>`;
        }
        if (skill.effect.duration) {
          html += `<div class="tooltip-effect-duration">Duration: ${skill.effect.duration}s</div>`;
        }
      } else if (skill.effect.type === 'threat') {
        html += `<div class="tooltip-effect-threat">Threat Multiplier: ${skill.effect.threatMultiplier || 1.0}x</div>`;
      }
      
      html += `</div>`;
    }
    
    tooltip.innerHTML = html;
    tooltip.classList.remove('hidden');
    tooltip.hidden = false;
    
    updateTooltipPosition(event);
  }
  
  /**
   * Update tooltip position
   */
  function updateTooltipPosition(event) {
    const tooltip = document.getElementById('spellTooltip');
    if (!tooltip || tooltip.classList.contains('hidden')) return;
    
    const offset = 15;
    const x = event.clientX + offset;
    const y = event.clientY + offset;
    
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    
    // Keep tooltip within viewport
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.style.left = `${event.clientX - rect.width - offset}px`;
    }
    if (rect.bottom > window.innerHeight) {
      tooltip.style.top = `${event.clientY - rect.height - offset}px`;
    }
  }
  
  /**
   * Hide spell tooltip
   */
  function hideSpellTooltip() {
    const tooltip = document.getElementById('spellTooltip');
    if (tooltip) {
      tooltip.classList.add('hidden');
      tooltip.hidden = true;
    }
  }

  /**
   * Get skill icon - unique icons per spell/skill
   */
  function getSkillIcon(skill) {
    if (!skill || !skill.id) return '⚔️';
    
    // Unique icons for specific spells/skills (same as skillbar)
    const skillIcons = {
      // Warden abilities
      'bash': '🛡️',
      'taunt': '👹',
      'kick': '👢',
      'defensive_stance': '🛡️',
      
      // Stalker abilities
      'backstab': '🗡️',
      'sneak': '👤',
      'poison_strike': '☠️',
      'evasion': '💨',
      
      // Arcanist spells
      'minor_nuke': '💫',
      'flame_bolt': '🔥',
      'frost_snare': '❄️',
      'lightning_strike': '⚡',
      
      // Templar spells
      'minor_heal': '💚',
      'light_heal': '💚',
      'smite_undead': '☀️',
      'cure_disease': '✨',
      
      // Generic by type
      'heal': '💚',
      'resurrection': '🌟',
      'haste': '⚡',
      'clarity': '💎',
      'charm': '💜',
      'mesmerize': '🌀',
      'mezmerize': '🌀',
      'fireball': '🔥',
      'magic_missile': '✨',
      'frost_bolt': '❄️',
      'lightning_bolt': '⚡',
      'summon_pet': '🐾',
      'bind_soul': '🔗',
      'disarm': '🤲',
      'fury': '😡'
    };
    
    // Check for specific skill icon first
    const skillId = skill.id.toLowerCase();
    if (skillIcons[skillId]) {
      return skillIcons[skillId];
    }
    
    // Fallback to type-based icons
    const skillType = skill.type || skill.category || 'combat';
    const typeIcons = {
      'ability': '⚔️',
      'spell': '🔮',
      'buff': '✨',
      'debuff': '💀',
      'heal': '💚',
      'combat': '⚔️',
      'default': '⚔️'
    };
    
    return typeIcons[skillType.toLowerCase()] || typeIcons.default;
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

