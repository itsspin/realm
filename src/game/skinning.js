(function (global) {
  function skinMonster(monsterId) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    // Check skinning skill
    const skinningLevel = global.Skills?.getSkillLevel('skinning') || 0;
    if (skinningLevel < 1) {
      global.Toast?.show({
        type: 'error',
        title: 'Skill Required',
        text: 'You need at least level 1 in Skinning to harvest materials from beasts.'
      });
      return false;
    }

    const monster = global.REALM?.data?.monstersById?.[monsterId];
    if (!monster) return false;

    // Determine loot based on monster and skill level
    const baseChance = 0.3 + (skinningLevel * 0.05); // 30% base + 5% per level
    const success = Math.random() < Math.min(0.95, baseChance);

    if (!success) {
      global.Narrative?.addEntry({
        type: 'gathering',
        text: `You attempt to skin the ${monster.name}, but the hide is too damaged to salvage.`,
        meta: 'Skinning Failed'
      });
      return false;
    }

    // Award materials
    const hideAmount = 1 + Math.floor(skinningLevel / 10);
    const resources = global.State?.data?.resources || {};
    
    // Add hide to inventory or resources
    if (!global.State?.addItem('hide')) {
      // Inventory full, add to resources as raw material
      resources.hide = (resources.hide || 0) + hideAmount;
    }

    global.State?.data.resources = resources;

    // Award skill XP
    global.Skills?.addSkillXP('skinning', hideAmount * 5);

    // Track stats
    global.PlayerStats?.incrementStat('hidesSkinned', hideAmount);
    global.Leaderboards?.updatePlayerRanking();

    global.Narrative?.addEntry({
      type: 'gathering',
      text: `You skillfully skin the ${monster.name}, harvesting ${hideAmount} hide${hideAmount > 1 ? 's' : ''}.`,
      meta: `Skinning +${hideAmount * 5} XP`
    });

    global.Toast?.show({
      type: 'success',
      title: 'Materials Harvested',
      text: `Gained ${hideAmount} hide`
    });

    return true;
  }

  const Skinning = {
    skinMonster
  };

  global.Skinning = Skinning;
})(window);


