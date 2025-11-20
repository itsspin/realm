(function (global) {
  const POTIONS = [
    {
      id: 'health_potion',
      name: 'Health Potion',
      description: 'Restores 50 HP',
      recipe: [
        ['herb', 2],
        ['essence', 1]
      ],
      effect: { restoreHp: 50 }
    },
    {
      id: 'strength_potion',
      name: 'Strength Potion',
      description: 'Increases attack by 5 for 10 minutes',
      recipe: [
        ['herb', 3],
        ['essence', 2]
      ],
      effect: { buffAtk: 5, duration: 600000 }
    },
    {
      id: 'essence_extract',
      name: 'Essence Extract',
      description: 'Concentrated magical essence',
      recipe: [
        ['essence', 5]
      ],
      effect: { essence: 10 }
    }
  ];

  function brewPotion(potionId) {
    const potion = POTIONS.find(p => p.id === potionId);
    if (!potion) return false;

    const player = global.State?.getPlayer();
    if (!player) return false;

    // Check alchemy skill
    const alchemyLevel = global.Skills?.getSkillLevel('alchemy') || 0;
    if (alchemyLevel < 1) {
      global.Toast?.show({
        type: 'error',
        title: 'Skill Required',
        text: 'You need at least level 1 in Alchemy to brew potions.'
      });
      return false;
    }

    // Check materials
    const resources = global.State?.data?.resources || {};
    const canBrew = potion.recipe.every(([material, amount]) => {
      return (resources[material] || 0) >= amount;
    });

    if (!canBrew) {
      global.Toast?.show({
        type: 'error',
        title: 'Insufficient Materials',
        text: 'You do not have the required materials to brew this potion.'
      });
      return false;
    }

    // Check inventory space
    if (player.inventory.length >= 20) {
      global.Toast?.show({
        type: 'error',
        title: 'Inventory Full',
        text: 'Your satchel overflows — no more can be carried.'
      });
      return false;
    }

    // Consume materials
    potion.recipe.forEach(([material, amount]) => {
      resources[material] = (resources[material] || 0) - amount;
    });
    global.State?.data.resources = resources;

    // Calculate success chance (base 70% + 2% per alchemy level)
    const successChance = Math.min(0.95, 0.7 + (alchemyLevel * 0.02));
    const success = Math.random() < successChance;

    if (!success) {
      global.Narrative?.addEntry({
        type: 'crafting',
        text: `Your attempt to brew ${potion.name} fails. The mixture bubbles and turns to ash.`,
        meta: 'Brewing Failed'
      });
      return false;
    }

    // Add potion to inventory
    global.State?.addItem(potionId);

    // Award skill XP
    global.Skills?.addSkillXP('alchemy', 10 + alchemyLevel);

    // Track stats
    global.PlayerStats?.incrementStat('potionsBrewed', 1);
    global.PlayerStats?.incrementStat('itemsCrafted', 1);
    global.Leaderboards?.updatePlayerRanking();

    global.Narrative?.addEntry({
      type: 'crafting',
      text: `You successfully brew ${potion.name}. ${potion.description}`,
      meta: `Alchemy +${10 + alchemyLevel} XP`
    });

    global.Toast?.show({
      type: 'craft',
      title: 'Potion Brewed!',
      text: potion.name
    });

    global.Rendering?.updateResourceBar();
    global.Rendering?.updateInventory();

    return true;
  }

  function usePotion(potionId) {
    const potion = POTIONS.find(p => p.id === potionId);
    if (!potion || !potion.effect) return false;

    const player = global.State?.getPlayer();
    if (!player) return false;

    // Remove from inventory
    if (!global.State?.removeItem(potionId)) {
      return false;
    }

    // Apply effect
    if (potion.effect.restoreHp) {
      const currentHp = player.stats.hp || 0;
      const maxHp = player.stats.maxHp || 20;
      const newHp = Math.min(maxHp, currentHp + potion.effect.restoreHp);
      global.State?.updatePlayer({
        stats: {
          ...player.stats,
          hp: newHp
        }
      });

      global.Narrative?.addEntry({
        type: 'system',
        text: `You drink ${potion.name} and restore ${potion.effect.restoreHp} health.`,
        meta: `HP: ${newHp}/${maxHp}`
      });
    }

    global.Rendering?.updateCharacterPanel();
    return true;
  }

  const Alchemy = {
    brewPotion,
    usePotion,
    POTIONS
  };

  global.Alchemy = Alchemy;
})(window);


