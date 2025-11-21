/**
 * Combat System
 * 
 * Turn-based combat between player and monsters.
 * 
 * FLOW:
 * 1. Player clicks monster on map or encounters during movement
 * 2. Start combat (load monster stats)
 * 3. Turn-based combat (player turn, then monster turn)
 * 4. Calculate damage (atk vs def with variance)
 * 5. Check for victory/defeat
 * 6. Award XP and loot on victory
 * 
 * CURRENT FEATURES:
 * - Basic turn-based combat
 * - Critical hits (15% chance)
 * - Equipment bonuses applied
 * - XP and loot rewards
 * 
 * FUTURE: Add skills, spells, status effects, party combat
 */
(function (global) {
  let currentMonster = null;
  let combatState = null;

  function getPlayerStats() {
    const player = global.State?.getPlayer();
    if (!player) return null;

    let atk = player.stats.atk || 5;
    let def = player.stats.def || 2;
    let maxHp = player.stats.maxHp || 20;
    let hp = player.stats.hp || maxHp;

    // Apply equipment bonuses
    if (player.equipment?.weapon) {
      const item = global.REALM?.data?.itemsById?.[player.equipment.weapon];
      if (item?.stats?.atk) {
        atk += item.stats.atk;
      }
    }
    if (player.equipment?.armor) {
      const item = global.REALM?.data?.itemsById?.[player.equipment.armor];
      if (item?.stats?.def) {
        def += item.stats.def;
      }
    }
    if (player.equipment?.charm) {
      const item = global.REALM?.data?.itemsById?.[player.equipment.charm];
      if (item?.stats?.all) {
        atk += item.stats.all;
        def += item.stats.all;
      }
    }

    return { atk, def, hp, maxHp };
  }

  function calculateDamage(attackerAtk, defenderDef, isCrit = false) {
    const baseDamage = Math.max(1, attackerAtk - defenderDef);
    const variance = Math.floor(baseDamage * 0.3);
    let damage = baseDamage + Math.floor(Math.random() * variance * 2) - variance;
    
    // Apply crit multiplier
    if (isCrit) {
      damage = Math.floor(damage * 1.5);
    }
    
    return Math.max(1, damage);
  }

  function rollCritical(attackerLevel, defenderLevel, attackerDex) {
    // Use enhanced crit system if available
    if (global.CombatEnhanced) {
      return global.CombatEnhanced.rollCrit(attackerLevel, defenderLevel, attackerDex || 50);
    }
    return Math.random() < 0.15; // 15% crit chance fallback
  }

  function rollHit(attackerLevel, defenderLevel, attackerDex, defenderAgi) {
    // Use enhanced hit system if available
    if (global.CombatEnhanced) {
      return global.CombatEnhanced.rollHit(attackerLevel, defenderLevel, attackerDex || 50, defenderAgi || 50);
    }
    return Math.random() < 0.95; // 95% hit chance fallback
  }

  function isInCombat() {
    return currentMonster !== null && combatState !== null;
  }

  /**
   * Start combat with a mob entity (from spawn system)
   */
  function startCombatWithMob(mobEntity) {
    if (!mobEntity || !mobEntity.alive) return;
    
    const mobTemplate = mobEntity.mobTemplate;
    if (!mobTemplate) return;

    currentMonster = {
      id: mobEntity.mobTemplateId,
      mobTemplateId: mobEntity.mobTemplateId,
      name: mobTemplate.name,
      description: mobTemplate.description || '',
      hp: mobEntity.stats.hp,
      maxHp: mobEntity.stats.maxHp,
      atk: mobEntity.stats.atk,
      def: mobEntity.stats.def,
      stats: mobEntity.stats,
      level: mobEntity.level,
      xp: mobEntity.xp,
      gold: mobEntity.gold,
      mobEntity: mobEntity // Keep reference to entity
    };

    combatState = {
      playerTurn: true,
      turnCount: 0
    };

    global.Narrative?.addEntry({
      type: 'combat',
      text: `A ${currentMonster.name} appears! ${currentMonster.description || ''}`,
      meta: 'Combat begins'
    });

    // Start auto-attack
    if (global.CombatEnhanced) {
      global.CombatEnhanced.startAutoAttack(currentMonster);
      global.CombatEnhanced.resetThreat();
    }

    global.Rendering?.updateCombatUI();
  }

  /**
   * Start combat with monster ID (legacy/fallback)
   */
  function startCombat(monsterId) {
    // Try to get mob from spawn system first (if targeting)
    const currentTarget = global.Targeting?.getTarget();
    
    if (currentTarget && currentTarget.mobTemplateId === monsterId) {
      // Use mob entity from spawn system
      startCombatWithMob(currentTarget);
      return;
    }
    
    // Fallback to old system (for compatibility)
    const monsterData = global.REALM?.data?.monstersById?.[monsterId] || 
                        global.REALM?.data?.namedMobsById?.[monsterId];
    
    if (!monsterData) {
      console.error('Monster not found:', monsterId);
      return;
    }

    currentMonster = {
      ...monsterData,
      id: monsterId,
      mobTemplateId: monsterId,
      hp: monsterData.maxHp || monsterData.stats?.maxHp || 100,
      maxHp: monsterData.maxHp || monsterData.stats?.maxHp || 100,
      atk: monsterData.atk || monsterData.stats?.atk || 5,
      def: monsterData.def || monsterData.stats?.def || 2,
      stats: monsterData.stats || {
        hp: monsterData.maxHp || 100,
        maxHp: monsterData.maxHp || 100,
        atk: monsterData.atk || 5,
        def: monsterData.def || 2,
        agi: monsterData.agi || 50,
        magicResist: monsterData.magicResist || 0
      },
      level: monsterData.level || 1,
      xp: monsterData.xp || 10,
      gold: monsterData.gold || 5
    };

    combatState = {
      playerTurn: true,
      turnCount: 0
    };

    global.Narrative?.addEntry({
      type: 'combat',
      text: `A ${currentMonster.name} appears! ${currentMonster.description || ''}`,
      meta: 'Combat begins'
    });

    // Start auto-attack
    if (global.CombatEnhanced) {
      global.CombatEnhanced.startAutoAttack(currentMonster);
      global.CombatEnhanced.resetThreat();
    }

    global.Rendering?.updateCombatUI();
  }

  function playerAttack() {
    if (!currentMonster || !combatState?.playerTurn) return;

    const player = global.State?.getPlayer();
    const playerStats = getPlayerStats();
    if (!playerStats || !player) return;

    // Check hit chance
    if (!rollHit(player.level, currentMonster.level || 1, playerStats.dex || 50, currentMonster.agi || 50)) {
      global.Narrative?.addEntry({
        type: 'combat',
        text: `You miss ${currentMonster.name}!`,
        meta: `Monster HP: ${currentMonster.hp}/${currentMonster.maxHp}`
      });
      combatState.playerTurn = false;
      setTimeout(() => monsterAttack(), 1000);
      return;
    }

    // Roll for crit
    const isCritical = rollCritical(player.level, currentMonster.level || 1, playerStats.dex || 50);
    const damage = calculateDamage(playerStats.atk, currentMonster.def || 1, isCritical);

    currentMonster.hp = Math.max(0, currentMonster.hp - damage);

    const critText = isCritical ? ' CRITICAL HIT!' : '';
    global.Narrative?.addEntry({
      type: 'combat',
      text: `You strike the ${currentMonster.name} for ${damage} damage!${critText}`,
      meta: `Monster HP: ${currentMonster.hp}/${currentMonster.maxHp}`
    });

    if (currentMonster.hp <= 0) {
      endCombat(true);
      return;
    }

    combatState.playerTurn = false;
    combatState.turnCount++;
    global.Rendering?.updateCombatUI();

    // Monster attacks next turn
    setTimeout(() => {
      monsterAttack();
    }, 1000);
  }

  function monsterAttack() {
    if (!currentMonster || combatState?.playerTurn) return;

    const playerStats = getPlayerStats();
    if (!playerStats) return;

    const damage = calculateDamage(currentMonster.atk, playerStats.def);
    const newHp = Math.max(0, playerStats.hp - damage);

    global.State?.updatePlayer({
      stats: {
        ...playerStats,
        hp: newHp
      }
    });

    global.Narrative?.addEntry({
      type: 'combat',
      text: `The ${currentMonster.name} attacks you for ${damage} damage!`,
      meta: `Your HP: ${newHp}/${playerStats.maxHp}`
    });

    if (newHp <= 0) {
      endCombat(false);
      return;
    }

    combatState.playerTurn = true;
    global.Rendering?.updateCombatUI();
    global.Rendering?.updateCharacterPanel();
  }

  function endCombat(victory) {
    // Stop auto-attack
    if (global.CombatEnhanced) {
      global.CombatEnhanced.stopAutoAttack();
      global.CombatEnhanced.clearCooldowns();
    }

    if (victory) {
      const player = global.State?.getPlayer();
      
      // Get XP and gold from mob template
      const mobTemplate = global.World?.getMobTemplate(currentMonster.id || currentMonster.mobTemplateId);
      const xpGain = mobTemplate?.xp || currentMonster.xp || 10;
      const goldGain = mobTemplate?.gold || currentMonster.gold || 5;
      const mobLevel = mobTemplate?.levelRange?.min || currentMonster.level || 1;
      const playerLevel = player.level || 1;
      const levelDiff = playerLevel - mobLevel;
      
      // XP scaling based on level difference (EverQuest style)
      let xpMultiplier = 1.0;
      if (levelDiff <= -5) xpMultiplier = 0.05; // 5% XP if 5+ levels below
      else if (levelDiff <= -3) xpMultiplier = 0.25; // 25% XP if 3-4 levels below
      else if (levelDiff <= -1) xpMultiplier = 0.5; // 50% XP if 1-2 levels below
      else if (levelDiff === 0) xpMultiplier = 1.0; // 100% XP if same level
      else if (levelDiff <= 2) xpMultiplier = 0.75; // 75% XP if 1-2 levels above
      else if (levelDiff <= 4) xpMultiplier = 0.5; // 50% XP if 3-4 levels above
      else xpMultiplier = 0.1; // 10% XP if 5+ levels above
      
      const actualXPGain = Math.floor(xpGain * xpMultiplier);
      
      // Award XP
      global.Leveling?.addXP(actualXPGain);

      // Award combat skill XP
      global.Skills?.addSkillXP('combat', Math.floor(actualXPGain / 2));

      // Award gold
      global.State?.updatePlayer({
        gold: (player.gold || 0) + goldGain
      });

      // Kill the mob in spawn system
      if (currentMonster.mobEntity) {
        global.SpawnSystem?.killMob(currentMonster.mobEntity.id);
      } else {
        const currentTarget = global.Targeting?.getTarget();
        if (currentTarget && currentTarget.mobTemplateId === currentMonster.mobTemplateId) {
          global.SpawnSystem?.killMob(currentTarget.id);
        }
      }
      global.Targeting?.clearTarget();

      // Apply faction changes from kill
      const mobTemplate = global.World?.getMobTemplate(currentMonster.mobTemplateId || currentMonster.id);
      if (mobTemplate && global.FactionSystem) {
        global.FactionSystem.applyKillFactionChanges(mobTemplate);
        
        // Check if killed a friendly in a city (criminal flag)
        const currentZone = global.Zones?.getCurrentZone();
        if (currentZone && currentZone.isSafeHaven) {
          const mobFactionId = mobTemplate.factionId;
          if (mobFactionId && global.FactionSystem.isFriendlyToFaction(mobFactionId)) {
            global.FactionSystem.markPlayerCriminal(300); // 5 minutes
          }
        }
      }

      // Check for loot (use dungeon system if in dungeon, otherwise regular loot)
      const currentZone = global.Zones?.getCurrentZone();
      const isDungeonZone = currentZone && global.Dungeons?.getDungeonZone('gloomfang_caverns', currentZone.id);
      
      // Roll loot from loot table
      const lootItems = rollLootFromTable(currentMonster);
      let lootText = '';
      
      if (lootItems && lootItems.length > 0) {
        lootItems.forEach(itemId => {
          const itemData = global.REALM?.data?.itemsById?.[itemId.toLowerCase()];
          if (itemData) {
            // Check if item has noDrop flag
            if (itemData.flags && itemData.flags.includes('noDrop')) {
              // Skip noDrop items (guards, etc.)
              return;
            }
            
            if (global.State?.addItem(itemId)) {
              if (lootText) lootText += ', ';
              lootText += itemData.name;
              global.Toast?.show({
                type: 'success',
                title: 'Item Found!',
                text: itemData.name
              });
            }
          }
        });
        if (lootText) lootText = ' You find: ' + lootText + '!';
      }

      global.Narrative?.addEntry({
        type: 'combat',
        text: `You have defeated the ${currentMonster.name}! Gained ${actualXPGain} XP and ${goldGain} gold.${lootText}`,
        meta: 'Victory!'
      });

      // Track combat stats
      if (global.PlayerStats) {
        global.PlayerStats.incrementStat('monstersKilled', 1);
      }
      if (global.Leaderboards) {
        global.Leaderboards.updatePlayerRanking();
      }

      // Offer skinning option (if applicable)
      if (currentMonster.loot && currentMonster.loot.some(item => item.includes('hide') || item.includes('pelt'))) {
        setTimeout(() => {
          const skinBtn = document.createElement('button');
          skinBtn.className = 'action-btn';
          skinBtn.textContent = `🔪 Skin ${currentMonster.name}`;
          skinBtn.onclick = () => {
            global.Skinning?.skinMonster(currentMonster.id);
            skinBtn.remove();
          };
          const actionButtons = document.getElementById('actionButtons');
          if (actionButtons) {
            actionButtons.insertBefore(skinBtn, actionButtons.firstChild);
          }
        }, 500);
      }

      // Update quests
      global.Quests?.checkKillQuest(currentMonster.id);

      global.Toast?.show({
        type: 'victory',
        title: 'Victory!',
        text: `Defeated ${currentMonster.name}`
      });
    } else {
      global.Narrative?.addEntry({
        type: 'combat',
        text: `You have been defeated by the ${currentMonster.name}. The darkness claims you...`,
        meta: 'Defeat'
      });

      // Resurrect with half HP
      const player = global.State?.getPlayer();
      const maxHp = player.stats.maxHp || 20;
      global.State?.updatePlayer({
        stats: {
          ...player.stats,
          hp: Math.floor(maxHp / 2)
        }
      });
    }

    currentMonster = null;
    combatState = null;
    global.Rendering?.updateCombatUI();
    global.Rendering?.updateActionButtons();
    global.Rendering?.updateCharacterPanel();
  }

  function flee() {
    if (!currentMonster) return;

    // Stop auto-attack
    if (global.CombatEnhanced) {
      global.CombatEnhanced.stopAutoAttack();
      global.CombatEnhanced.clearCooldowns();
    }

    global.Narrative?.addEntry({
      type: 'combat',
      text: `You flee from the ${currentMonster.name}, escaping with your life.`,
      meta: 'Fled'
    });

    currentMonster = null;
    combatState = null;
    global.Rendering?.updateCombatUI();
    global.Rendering?.updateActionButtons();
  }

  /**
   * Roll loot from monster's loot table
   */
  function rollLootFromTable(monster) {
    const lootItems = [];
    
    // Get loot table ID from mob template
    const mobTemplate = global.World?.getMobTemplate(monster.id || monster.mobTemplateId);
    if (!mobTemplate || !mobTemplate.lootTableId) return lootItems;
    
    // Get loot table
    const lootTable = global.REALM?.data?.lootTablesById?.[mobTemplate.lootTableId.toLowerCase()];
    if (!lootTable || !lootTable.entries) return lootItems;
    
    // Roll for each entry
    lootTable.entries.forEach(entry => {
      if (Math.random() < entry.chance) {
        const quantity = entry.minQuantity + Math.floor(Math.random() * (entry.maxQuantity - entry.minQuantity + 1));
        for (let i = 0; i < quantity; i++) {
          lootItems.push(entry.itemId);
        }
      }
    });
    
    return lootItems;
  }

  /**
   * Use skill in combat
   */
  function useSkillInCombat(skillId) {
    if (!global.CombatEnhanced) {
      global.ChatSystem?.addSystemMessage('Skills system not available.');
      return false;
    }

    if (!currentMonster) {
      global.ChatSystem?.addSystemMessage('You are not in combat.');
      return false;
    }

    // Get target (use current target or current monster)
    const target = global.Targeting?.getTarget() || currentMonster;
    
    return global.CombatEnhanced.useSkill(skillId, target);
  }

  const Combat = {
    startCombat,
    startCombatWithMob,
    playerAttack,
    monsterAttack,
    endCombat,
    flee,
    getCurrentMonster: () => currentMonster,
    isInCombat: () => currentMonster !== null && combatState !== null,
    getCombatState: () => combatState,
    getPlayerStats,
    calculateDamage,
    rollCritical,
    rollHit,
    rollLootFromTable,
    useSkillInCombat
  };

  global.Combat = Combat;
})(window);

