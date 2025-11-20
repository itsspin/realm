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

  function calculateDamage(attackerAtk, defenderDef) {
    const baseDamage = Math.max(1, attackerAtk - defenderDef);
    const variance = Math.floor(baseDamage * 0.3);
    const damage = baseDamage + Math.floor(Math.random() * variance * 2) - variance;
    return Math.max(1, damage);
  }

  function rollCritical() {
    return Math.random() < 0.15; // 15% crit chance
  }

  function startCombat(monsterId) {
    const monsterData = global.REALM?.data?.monstersById?.[monsterId];
    if (!monsterData) {
      console.error('Monster not found:', monsterId);
      return;
    }

    currentMonster = {
      ...monsterData,
      hp: monsterData.maxHp
    };

    combatState = {
      playerTurn: true,
      turnCount: 0
    };

    global.Narrative?.addEntry({
      type: 'combat',
      text: `A ${currentMonster.name} appears! ${currentMonster.description}`,
      meta: 'Combat begins'
    });

    global.Rendering?.updateCombatUI();
  }

  function playerAttack() {
    if (!currentMonster || !combatState?.playerTurn) return;

    const playerStats = getPlayerStats();
    if (!playerStats) return;

    const isCritical = rollCritical();
    let damage = calculateDamage(playerStats.atk, currentMonster.def);
    if (isCritical) {
      damage = Math.floor(damage * 1.5);
    }

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
    }, 800);
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
    if (victory) {
      const player = global.State?.getPlayer();
      const xpGain = currentMonster.xp || 10;
      const goldGain = currentMonster.gold || 5;

      // Award XP
      global.Leveling?.addXP(xpGain);

      // Award combat skill XP
      global.Skills?.addSkillXP('combat', Math.floor(xpGain / 2));

      // Award gold
      global.State?.updatePlayer({
        gold: (player.gold || 0) + goldGain
      });

      // Roll for loot
      if (currentMonster.lootTable && currentMonster.lootTable.length > 0) {
        const roll = Math.random();
        let cumulative = 0;
        for (const loot of currentMonster.lootTable) {
          cumulative += loot.chance;
          if (roll <= cumulative && loot.itemId) {
            global.State?.addItem(loot.itemId);
            global.Toast?.show({
              type: 'loot',
              title: 'Loot Obtained',
              text: `You found: ${loot.itemId.replace(/_/g, ' ')}`
            });
            break;
          }
        }
      }

      global.Narrative?.addEntry({
        type: 'combat',
        text: `You have defeated the ${currentMonster.name}! Gained ${xpGain} XP and ${goldGain} gold.`,
        meta: 'Victory!'
      });

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

  const Combat = {
    startCombat,
    playerAttack,
    flee,
    getCurrentMonster: () => currentMonster,
    isInCombat: () => currentMonster !== null,
    getCombatState: () => combatState
  };

  global.Combat = Combat;
})(window);

