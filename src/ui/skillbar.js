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

    // Get player's class and skills
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
      combat: '⚔️',
      default: '⚔️'
    };
    return icons[skillType.toLowerCase()] || icons.default;
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
    const requiresTarget = skill.requiresTarget !== false;
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
    update: updateSkillbar,
    useSkill
  };

  global.Skillbar = Skillbar;
})(window);

