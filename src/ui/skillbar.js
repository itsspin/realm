/**
 * Skillbar Component
 * 
 * Skillbar above chat with 1-5 slots.
 * Supports keyboard shortcuts (1-5) and click activation.
 */

(function (global) {
  let skillbarElement = null;
  let skillSlots = [];
  let selectedSlot = -1;

  /**
   * Initialize skillbar
   */
  function initialize() {
    skillbarElement = document.getElementById('skillbar');
    if (!skillbarElement) {
      skillbarElement = document.createElement('div');
      skillbarElement.id = 'skillbar';
      skillbarElement.className = 'skillbar';
      
      const container = document.getElementById('skillbarContainer');
      if (container) {
        container.appendChild(skillbarElement);
      } else {
        // Insert before chat window
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow) {
          const container = document.createElement('div');
          container.className = 'skillbar-container';
          container.id = 'skillbarContainer';
          container.appendChild(skillbarElement);
          chatWindow.parentNode.insertBefore(container, chatWindow);
        }
      }
    }

    updateSkillbar();

    // Keyboard shortcuts (1-5)
    document.addEventListener('keydown', handleKeyboard);
  }

  /**
   * Update skillbar with player's skills
   */
  function updateSkillbar() {
    if (!skillbarElement) initialize();

    const player = global.State?.getPlayer();
    if (!player || !player.class) {
      renderEmptySlots();
      return;
    }

    // Check for custom skillbar assignments first
    if (player.skillbar && Array.isArray(player.skillbar) && player.skillbar.length > 0) {
      skillSlots = [];
      player.skillbar.forEach((skillId, index) => {
        if (skillId && index < 5) {
          const skill = global.REALM?.data?.skillsById?.[skillId.toLowerCase()];
          if (skill) {
            skillSlots[index] = skill;
          }
        }
      });
      renderSkillbar();
      return;
    }

    // Fallback: Auto-populate from class skills (for new players)
    const classData = global.REALM?.data?.classesEnhancedById?.[player.class.toLowerCase()] ||
                     global.REALM?.data?.classesById?.[player.class.toLowerCase()];
    if (!classData) {
      renderEmptySlots();
      return;
    }

    // Get skills for player's level
    const skillIdsByLevel = classData.skillIdsByLevel || {};
    const availableSkills = [];

    Object.keys(skillIdsByLevel).forEach(level => {
      if (player.level >= parseInt(level, 10)) {
        skillIdsByLevel[level].forEach(skillId => {
          const skill = global.REALM?.data?.skillsById?.[skillId.toLowerCase()];
          if (skill && !availableSkills.find(s => s.id === skill.id)) {
            availableSkills.push(skill);
          }
        });
      }
    });

    // Populate skillbar (max 5 slots)
    skillSlots = availableSkills.slice(0, 5);
    renderSkillbar();
  }

  /**
   * Render empty slots
   */
  function renderEmptySlots() {
    if (!skillbarElement) return;

    skillSlots = [];
    let html = '';
    
    for (let i = 0; i < 5; i++) {
      html += `
        <div class="skillbar-slot skillbar-slot--empty" data-slot="${i + 1}">
          <div class="skillbar-slot-keybind">${i + 1}</div>
        </div>
      `;
    }
    
    skillbarElement.innerHTML = html;
  }

  /**
   * Render skillbar with skills
   */
  function renderSkillbar() {
    if (!skillbarElement) return;

    let html = '';
    
    for (let i = 0; i < 5; i++) {
      const skill = skillSlots[i];
      if (skill) {
        const icon = getSkillIcon(skill);
        html += `
          <div class="skillbar-slot" data-slot="${i + 1}" data-skill-id="${skill.id}">
            <div class="skillbar-slot-icon">${icon}</div>
            <div class="skillbar-slot-name">${skill.name}</div>
            <div class="skillbar-slot-keybind">${i + 1}</div>
          </div>
        `;
      } else {
        html += `
          <div class="skillbar-slot skillbar-slot--empty" data-slot="${i + 1}">
            <div class="skillbar-slot-keybind">${i + 1}</div>
          </div>
        `;
      }
    }
    
    skillbarElement.innerHTML = html;

    // Attach click handlers
    attachClickHandlers();
    
    // Attach drag handlers for drops from tome
    attachDropHandlers();
    
    // Attach hover tooltips
    attachTooltips();
  }
  
  /**
   * Attach hover tooltips to skillbar slots
   */
  function attachTooltips() {
    if (!skillbarElement) return;
    
    const slots = skillbarElement.querySelectorAll('.skillbar-slot[data-skill-id]');
    slots.forEach(slot => {
      const skillId = slot.dataset.skillId;
      if (!skillId) return;
      
      const skill = global.REALM?.data?.skillsById?.[skillId.toLowerCase()];
      if (!skill) return;
      
      // Mouse enter - show tooltip
      slot.addEventListener('mouseenter', (e) => {
        showSpellTooltip(e, skill);
      });
      
      // Mouse move - update tooltip position
      slot.addEventListener('mousemove', (e) => {
        updateTooltipPosition(e);
      });
      
      // Mouse leave - hide tooltip
      slot.addEventListener('mouseleave', () => {
        hideSpellTooltip();
      });
    });
  }
  
  /**
   * Show spell tooltip
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
    
    // Build tooltip content
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
    
    // Unique icons for specific spells/skills
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
      
      // Necromancer spells
      'cavorting_bones': '💀',
      'lifetap': '🩸',
      'disease_cloud': '☁️',
      'leering_corpse': '💀',
      'siphon_strength': '💪',
      'clinging_darkness': '🌑',
      'lesser_summon_skeleton': '💀',
      'ward_undead': '☀️',
      'engulfing_darkness': '🌑',
      
      // Magician spells
      'burst_of_flame': '🔥',
      'minor_shielding': '🛡️',
      'summon_dagger': '🗡️',
      'summon_food': '🍞',
      'summon_drink': '🍷',
      'elementalkin_water': '💧',
      'summon_bandages': '🩹',
      'elementalkin_earth': '🗿',
      'shielding': '🛡️',
      
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
   * Attach click handlers
   */
  function attachClickHandlers() {
    if (!skillbarElement) return;

    const slots = skillbarElement.querySelectorAll('.skillbar-slot');
    slots.forEach((slot, index) => {
      slot.addEventListener('click', () => {
        const skillId = slot.dataset.skillId;
        if (skillId) {
          useSkill(skillId, index);
        }
      });
    });
  }

  /**
   * Use skill from skillbar
   */
  function useSkill(skillId, slotIndex) {
    const skill = skillSlots[slotIndex];
    if (!skill) return;

    const target = global.Targeting?.getTarget();
    
    // Check if skill requires target
    // Pet summoning and item summoning spells don't require targets
    const effectType = skill.effect?.type;
    const isNoTargetSpell = effectType === 'summon_pet' || effectType === 'summon_item' || 
                            effectType === 'buff' || skill.canTargetSelf;
    const requiresTarget = skill.requiresTarget !== false && !isNoTargetSpell;
    
    if (requiresTarget && !target) {
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage('You need a target to use this skill.');
      }
      return;
    }

    // Use skill via combat system
    if (global.Combat?.useSkillInCombat) {
      global.Combat.useSkillInCombat(skillId);
    } else if (global.CombatEnhanced?.useSkill) {
      global.CombatEnhanced.useSkill(skillId, target);
    } else {
      // Fallback: basic attack
      if (target && target.mobTemplate && !target.mobTemplate.isGuard) {
        if (global.Combat?.startCombatWithMob) {
          global.Combat.startCombatWithMob(target);
        } else if (global.Combat?.startCombat) {
          global.Combat.startCombat(target.mobTemplateId);
        }
      }
    }

    // Visual feedback
    highlightSlot(slotIndex);
  }

  /**
   * Highlight slot
   */
  function highlightSlot(slotIndex) {
    if (!skillbarElement) return;

    const slots = skillbarElement.querySelectorAll('.skillbar-slot');
    slots.forEach((slot, index) => {
      if (index === slotIndex) {
        slot.classList.add('skillbar-slot--active');
        setTimeout(() => {
          slot.classList.remove('skillbar-slot--active');
        }, 200);
      }
    });
  }

  /**
   * Set skill in skillbar slot
   */
  function setSkill(slotIndex, skillId) {
    if (slotIndex < 0 || slotIndex >= 5) return false;
    
    const player = global.State?.getPlayer();
    if (!player) return false;
    
    // Verify player has learned this skill
    const classData = global.REALM?.data?.classesEnhancedById?.[player.class.toLowerCase()] ||
                     global.REALM?.data?.classesById?.[player.class.toLowerCase()];
    if (!classData) return false;
    
    const skillIdsByLevel = classData.skillIdsByLevel || {};
    let hasSkill = false;
    Object.keys(skillIdsByLevel).forEach(level => {
      if (player.level >= parseInt(level, 10)) {
        if (skillIdsByLevel[level].includes(skillId.toLowerCase())) {
          hasSkill = true;
        }
      }
    });
    
    if (!hasSkill) {
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage('You have not learned this skill yet.');
      }
      return false;
    }
    
    // Get skill data
    const skill = global.REALM?.data?.skillsById?.[skillId.toLowerCase()];
    if (!skill) return false;
    
    // Initialize skillbar array if needed
    if (!player.skillbar || !Array.isArray(player.skillbar)) {
      player.skillbar = new Array(5).fill(null);
    }
    
    // Set skill in slot
    player.skillbar[slotIndex] = skillId.toLowerCase();
    
    // Update state
    global.State?.updatePlayer({ skillbar: player.skillbar });
    
    // Update skillbar display
    updateSkillbar();
    
    return true;
  }

  /**
   * Wipe skillbar (on death)
   */
  function wipeSkillbar() {
    const player = global.State?.getPlayer();
    if (!player) return;
    
    global.State?.updatePlayer({ skillbar: [] });
    skillSlots = [];
    renderSkillbar();
    
    if (global.ChatSystem) {
      global.ChatSystem.addSystemMessage('Your skillbar has been cleared.');
    }
  }

  /**
   * Attach drop handlers for drag-and-drop from tome
   */
  function attachDropHandlers() {
    const slots = skillbarElement?.querySelectorAll('.skillbar-slot');
    if (!slots) return;
    
    slots.forEach(slot => {
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      
      slot.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
      });
      
      slot.addEventListener('dragleave', (e) => {
        e.currentTarget.classList.remove('drag-over');
      });
      
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const skillId = e.dataTransfer.getData('text/plain');
        if (!skillId) return;
        
        const slotIndex = parseInt(e.currentTarget.dataset.slot, 10) - 1;
        if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= 5) return;
        
        setSkill(slotIndex, skillId);
      });
    });
  }

  /**
   * Handle keyboard input
   */
  function handleKeyboard(event) {
    // Don't handle if typing in input/textarea (unless it's Enter for chat)
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      // Allow Enter key to work in chat
      if (event.key === 'Enter' && event.target.id === 'chatInput') {
        return; // Let chat system handle it
      }
      return;
    }

    // Handle skillbar keys (1-5)
    const key = parseInt(event.key, 10);
    if (key >= 1 && key <= 5) {
      event.preventDefault();
      const slotIndex = key - 1;
      if (slotIndex < skillSlots.length) {
        const skill = skillSlots[slotIndex];
        if (skill) {
          useSkill(skill.id, slotIndex);
        }
      }
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }

  // Update skillbar when player changes
  setInterval(() => {
    if (skillbarElement) {
      updateSkillbar();
    }
  }, 2000); // Update every 2 seconds

  const Skillbar = {
    initialize,
    update: updateSkillbar,
    useSkill,
    setSkill,
    wipeSkillbar
  };

  global.Skillbar = Skillbar;
})(window);

