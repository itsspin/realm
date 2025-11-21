/**
 * UI Redesign - Map-Centered Layout
 * 
 * Handles:
 * - Chat window collapse/expand
 * - Skill hotbar population and interaction
 * - Resource bar updates (HP, Mana, Energy, Rage)
 * - Con and Hail button functionality
 * - Zone info updates
 */

(function (global) {
  /**
   * Initialize UI Redesign
   */
  function initialize() {
    setupChatToggle();
    setupSkillHotbar();
    setupConButton();
    setupHailButton();
    updateResourceBars();
    updateZoneInfo();
    
    // Update resource bars periodically
    setInterval(updateResourceBars, 1000);
    
    // Update zone info when zone changes
    if (global.Zones) {
      const originalGetCurrentZone = global.Zones.getCurrentZone;
      global.Zones.getCurrentZone = function() {
        const zone = originalGetCurrentZone.call(this);
        setTimeout(updateZoneInfo, 100);
        return zone;
      };
    }
  }

  /**
   * Setup chat window toggle
   */
  function setupChatToggle() {
    const toggleBtn = document.getElementById('chatToggle');
    const chatWindow = document.getElementById('chatWindow');
    
    if (!toggleBtn || !chatWindow) return;
    
    toggleBtn.addEventListener('click', () => {
      chatWindow.classList.toggle('collapsed');
      toggleBtn.textContent = chatWindow.classList.contains('collapsed') ? '▲' : '▼';
      
      // Update game container padding
      const gameContainer = document.querySelector('.game-container');
      if (gameContainer) {
        if (chatWindow.classList.contains('collapsed')) {
          gameContainer.style.paddingBottom = '80px';
        } else {
          gameContainer.style.paddingBottom = '300px';
        }
      }
    });
  }

  /**
   * Setup skill hotbar
   */
  function setupSkillHotbar() {
    const hotbar = document.getElementById('skillHotbar');
    if (!hotbar) return;
    
    // Get player's class and skills
    const player = global.State?.getPlayer();
    if (!player || !player.class) return;
    
    const classData = global.REALM?.data?.classesEnhancedById?.[player.class.toLowerCase()] ||
                     global.REALM?.data?.classesById?.[player.class.toLowerCase()];
    if (!classData) return;
    
    // Get skills for player's level
    const skillIdsByLevel = classData.skillIdsByLevel || {};
    const availableSkills = [];
    
    Object.keys(skillIdsByLevel).forEach(level => {
      if (player.level >= parseInt(level, 10)) {
        skillIdsByLevel[level].forEach(skillId => {
          const skill = global.REALM?.data?.skillsById?.[skillId.toLowerCase()];
          if (skill) {
            availableSkills.push(skill);
          }
        });
      }
    });
    
    // Populate hotbar (max 8 slots)
    hotbar.innerHTML = '';
    const slotsToShow = Math.min(8, availableSkills.length);
    
    for (let i = 0; i < slotsToShow; i++) {
      const skill = availableSkills[i];
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot';
      slot.dataset.skillId = skill.id;
      slot.dataset.keybind = i + 1;
      
      slot.innerHTML = `
        <div class="hotbar-slot-icon">⚔️</div>
        <div class="hotbar-slot-name">${skill.name}</div>
        <div class="hotbar-slot-keybind">${i + 1}</div>
      `;
      
      slot.addEventListener('click', () => {
        useSkillFromHotbar(skill.id);
      });
      
      hotbar.appendChild(slot);
    }
    
    // Keyboard shortcuts (1-8)
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const key = parseInt(e.key, 10);
      if (key >= 1 && key <= 8) {
        const slot = hotbar.querySelector(`[data-keybind="${key}"]`);
        if (slot) {
          const skillId = slot.dataset.skillId;
          if (skillId) {
            useSkillFromHotbar(skillId);
          }
        }
      }
    });
  }

  /**
   * Use skill from hotbar
   */
  function useSkillFromHotbar(skillId) {
    if (global.Combat?.useSkillInCombat) {
      global.Combat.useSkillInCombat(skillId);
    } else if (global.CombatEnhanced?.useSkill) {
      const target = global.Targeting?.getTarget();
      if (target) {
        global.CombatEnhanced.useSkill(skillId, target);
      }
    }
  }

  /**
   * Setup Con button
   */
  function setupConButton() {
    const conBtn = document.getElementById('conBtn');
    if (!conBtn) return;
    
    conBtn.addEventListener('click', () => {
      const target = global.Targeting?.getTarget();
      if (!target) {
        global.ChatSystem?.addSystemMessage('You have no target.');
        return;
      }
      
      const player = global.State?.getPlayer();
      if (!player) return;
      
      if (global.FactionSystem) {
        const conDesc = global.FactionSystem.getConDescription(target, player);
        global.ChatSystem?.addSystemMessage(conDesc);
        global.Narrative?.addEntry({
          type: 'system',
          text: conDesc,
          meta: 'Consider'
        });
      }
    });
  }

  /**
   * Setup Hail button
   */
  function setupHailButton() {
    const hailBtn = document.getElementById('hailBtn');
    if (!hailBtn) return;
    
    hailBtn.addEventListener('click', () => {
      const target = global.Targeting?.getTarget();
      if (!target) {
        global.ChatSystem?.addSystemMessage('You have no target.');
        return;
      }
      
      // Check if target is an NPC
      const npc = global.REALM?.data?.npcsById?.[target.id || target.mobTemplateId];
      if (npc) {
        // Interact with NPC
        if (global.NPCs?.interactWithNPC) {
          global.NPCs.interactWithNPC(npc.id);
        } else if (global.NPCs) {
          // Fallback to direct interaction
          handleNPCInteraction(npc);
        }
        return;
      }
      
      // Check if target is a mob (can't hail mobs)
      if (target.mobTemplate) {
        global.ChatSystem?.addSystemMessage(`${target.mobTemplate.name} does not respond to your hail.`);
        return;
      }
      
      // Check if target is a player
      // TODO: Implement player interaction
      global.ChatSystem?.addSystemMessage('Player interaction not yet implemented.');
    });
  }

  /**
   * Handle NPC interaction
   */
  function handleNPCInteraction(npc) {
    const player = global.State?.getPlayer();
    if (!player) return;
    
    // Check guard aggression
    if (npc.type === 'guard') {
      const guardFaction = npc.factionId || npc.faction;
      if (guardFaction && global.FactionSystem) {
        if (global.FactionSystem.shouldGuardAttackPlayer(guardFaction, player)) {
          global.Narrative?.addEntry({
            type: 'combat',
            text: `${npc.name} attacks you! "You are not welcome here!"`,
            meta: 'Guard Attack'
          });
          if (global.Combat?.startCombat) {
            global.Combat.startCombat(npc.id);
          }
          return;
        }
      }
    }
    
    // Handle different NPC types
    switch (npc.type) {
      case 'merchant':
        // Open merchant window
        if (global.Trade?.openMerchant) {
          global.Trade.openMerchant(npc);
        }
        break;
      case 'class_trainer':
        // Open trainer window
        if (global.NPCs?.showClassTrainer) {
          global.NPCs.showClassTrainer(npc);
        }
        break;
      case 'banker':
        // Open bank
        global.Narrative?.addEntry({
          type: 'system',
          text: `${npc.name} says: "Welcome to the bank. How may I assist you?"`,
          meta: 'NPC'
        });
        break;
      default:
        global.Narrative?.addEntry({
          type: 'system',
          text: `${npc.name}: "${npc.description || 'Greetings, traveler.'}"`,
          meta: 'NPC'
        });
    }
  }

  /**
   * Update resource bars (HP, Mana, Energy, Rage)
   */
  function updateResourceBars() {
    const player = global.State?.getPlayer();
    if (!player) return;
    
    const stats = player.stats || {};
    const classData = global.REALM?.data?.classesEnhancedById?.[player.class?.toLowerCase()] ||
                     global.REALM?.data?.classesById?.[player.class?.toLowerCase()];
    
    // HP Bar
    const hpBar = document.getElementById('hpBar');
    const statHp = document.getElementById('statHp');
    if (hpBar && statHp) {
      const hp = stats.hp || 0;
      const maxHp = stats.maxHp || 20;
      const percent = Math.min(100, (hp / maxHp) * 100);
      hpBar.style.width = `${percent}%`;
      statHp.textContent = `${hp} / ${maxHp}`;
    }
    
    // Resource type based on class
    const resourceType = classData?.resourceType || 'mana';
    
    // Show/hide resource bars based on class
    const manaContainer = document.getElementById('manaBarContainer');
    const energyContainer = document.getElementById('energyBarContainer');
    const rageContainer = document.getElementById('rageBarContainer');
    
    if (manaContainer) manaContainer.style.display = resourceType === 'mana' ? 'flex' : 'none';
    if (energyContainer) energyContainer.style.display = resourceType === 'energy' ? 'flex' : 'none';
    if (rageContainer) rageContainer.style.display = resourceType === 'rage' ? 'flex' : 'none';
    
    // Update resource values (placeholder - would need actual resource tracking)
    const resourceValue = player.resources?.[resourceType] || 100;
    const maxResource = 100;
    
    if (resourceType === 'mana' && manaContainer) {
      const manaBar = document.getElementById('manaBar');
      const statMana = document.getElementById('statMana');
      if (manaBar) {
        const percent = Math.min(100, (resourceValue / maxResource) * 100);
        manaBar.style.width = `${percent}%`;
      }
      if (statMana) statMana.textContent = `${resourceValue} / ${maxResource}`;
    } else if (resourceType === 'energy' && energyContainer) {
      const energyBar = document.getElementById('energyBar');
      const statEnergy = document.getElementById('statEnergy');
      if (energyBar) {
        const percent = Math.min(100, (resourceValue / maxResource) * 100);
        energyBar.style.width = `${percent}%`;
      }
      if (statEnergy) statEnergy.textContent = `${resourceValue} / ${maxResource}`;
    } else if (resourceType === 'rage' && rageContainer) {
      const rageBar = document.getElementById('rageBar');
      const statRage = document.getElementById('statRage');
      if (rageBar) {
        const percent = Math.min(100, (resourceValue / maxResource) * 100);
        rageBar.style.width = `${percent}%`;
      }
      if (statRage) statRage.textContent = `${resourceValue} / ${maxResource}`;
    }
  }

  /**
   * Update zone info panel
   */
  function updateZoneInfo() {
    const zone = global.Zones?.getCurrentZone();
    if (!zone) return;
    
    const zoneInfoName = document.getElementById('zoneInfoName');
    const zoneInfoLevel = document.getElementById('zoneInfoLevel');
    const zoneInfoFaction = document.getElementById('zoneInfoFaction');
    
    if (zoneInfoName) {
      zoneInfoName.textContent = zone.name || '-';
    }
    
    if (zoneInfoLevel) {
      const levelRange = zone.levelRange || zone.level || { min: 1, max: 10 };
      if (typeof levelRange === 'object') {
        zoneInfoLevel.textContent = `${levelRange.min}-${levelRange.max}`;
      } else {
        zoneInfoLevel.textContent = levelRange.toString();
      }
    }
    
    if (zoneInfoFaction) {
      const factionId = zone.controllingFaction || zone.faction;
      if (factionId) {
        const faction = global.REALM?.data?.factionsById?.[factionId.toLowerCase()];
        zoneInfoFaction.textContent = faction ? faction.name : factionId;
      } else {
        zoneInfoFaction.textContent = 'None';
      }
    }
  }

  /**
   * Update player class display
   */
  function updatePlayerClass() {
    const player = global.State?.getPlayer();
    if (!player || !player.class) return;
    
    const classEl = document.getElementById('characterClass');
    if (classEl) {
      const classData = global.REALM?.data?.classesEnhancedById?.[player.class.toLowerCase()] ||
                       global.REALM?.data?.classesById?.[player.class.toLowerCase()];
      classEl.textContent = classData ? classData.name : player.class;
    }
  }

  const UIRedesign = {
    initialize,
    updateResourceBars,
    updateZoneInfo,
    updatePlayerClass,
    setupSkillHotbar
  };

  global.UIRedesign = UIRedesign;

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 500); // Wait for other systems to load
  }
})(window);

