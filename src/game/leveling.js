(function (global) {
  function calculateXPForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
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

      // Level up bonuses
      const stats = player.stats || {};
      const maxHp = stats.maxHp || 20;
      const atk = stats.atk || 5;
      const def = stats.def || 2;

      global.State?.updatePlayer({
        level: currentLevel,
        xp: currentXP,
        xpToNext: xpToNext,
        stats: {
          hp: maxHp + 3, // Restore HP on level up
          maxHp: maxHp + 3,
          atk: atk + 1,
          def: def + 1
        }
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

