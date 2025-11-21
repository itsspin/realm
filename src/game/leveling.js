(function (global) {
  function calculateXPForLevel(level) {
    // Slow grind - exponential XP curve (similar to EverQuest)
    return Math.floor(200 * Math.pow(1.8, level - 1));
  }

  function addXP(amount) {
    const player = global.State?.getPlayer();
    if (!player) return;

    let currentXP = player.xp || 0;
    let currentLevel = player.level || 1;
    let xpToNext = player.xpToNext || 100;

    currentXP += amount;

    // Level up check
    while (currentXP >= xpToNext && currentLevel < 50) {
      currentXP -= xpToNext;
      currentLevel++;
      xpToNext = calculateXPForLevel(currentLevel);

      // Level up bonuses (class-based stat gains)
      const stats = player.stats || {};
      const maxHp = stats.maxHp || 20;
      const maxMana = stats.maxMana || 0;
      const atk = stats.atk || 5;
      const def = stats.def || 2;
      
      // Get class data for stat gains
      const classData = global.REALM?.data?.classesEnhancedById?.[player.class?.toLowerCase()] || 
                        global.REALM?.data?.classesById?.[player.class?.toLowerCase()];
      
      // Stat gains per level based on class
      let hpGain = 3;
      let atkGain = 1;
      let defGain = 1;
      let manaGain = 0;
      
      const resourceType = classData?.resourceType;
      
      if (classData) {
        // Tanks get more HP and DEF
        if (classData.role === 'tank') {
          hpGain = 5;
          defGain = 2;
          atkGain = 0.5;
          // Hybrid tanks (Paladin, Shadow Knight) get some mana
          if (resourceType === 'mana') {
            manaGain = 3;
          }
        }
        // DPS get more ATK
        else if (classData.role === 'dps') {
          hpGain = 2;
          atkGain = 2;
          defGain = 0.5;
          // Pure casters get more mana
          if (resourceType === 'mana') {
            const isPureCaster = classData.id === 'arcanist' || 
                                 classData.id === 'necromancer' || 
                                 classData.id === 'magician';
            manaGain = isPureCaster ? 8 : 5;
          }
        }
        // Healers get balanced
        else if (classData.role === 'healer') {
          hpGain = 3;
          atkGain = 0.5;
          defGain = 1;
          // Priests get good mana
          if (resourceType === 'mana') {
            manaGain = 6;
          }
        }
        // Support classes (Bard)
        else if (classData.role === 'support' && resourceType === 'mana') {
          manaGain = 4;
        }
      }

      const updatedStats = {
        hp: maxHp + hpGain, // Restore HP on level up
        maxHp: maxHp + hpGain,
        atk: atk + atkGain,
        def: def + defGain
      };
      
      // Add mana gains for mana-using classes
      if (resourceType === 'mana' && manaGain > 0) {
        updatedStats.mana = maxMana + manaGain; // Restore mana on level up
        updatedStats.maxMana = maxMana + manaGain;
      }

      global.State?.updatePlayer({
        level: currentLevel,
        xp: currentXP,
        xpToNext: xpToNext,
        stats: updatedStats
      });

      global.Toast?.show({
        type: 'level-up',
        title: 'Level Up!',
        text: `You have reached level ${currentLevel}!`
      });

      global.Narrative?.addEntry({
        type: 'system',
        text: `You have reached level ${currentLevel}! Your power grows.`,
        meta: 'Level Up'
      });

      // Force save on level up
      if (global.State?.forceSave) {
        global.State.forceSave().catch(err => {
          console.error('Failed to save on level up:', err);
        });
      }

      // Update player reference
      const updatedPlayer = global.State?.getPlayer();
      if (updatedPlayer) {
        Object.assign(player, updatedPlayer);
      }
    }

    // Update XP if no level up
    if (currentLevel < 50) {
      global.State?.updatePlayer({
        xp: currentXP,
        xpToNext: xpToNext
      });
    }

    global.Rendering?.updateCharacterPanel();
  }

  const Leveling = {
    addXP,
    calculateXPForLevel
  };

  global.Leveling = Leveling;
})(window);

