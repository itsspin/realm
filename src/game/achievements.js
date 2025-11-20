(function (global) {
  const ACHIEVEMENTS = [
    { id: 'first_kill', name: 'First Blood', description: 'Defeat your first monster', condition: { stat: 'monstersKilled', value: 1 } },
    { id: 'hunter', name: 'Hunter', description: 'Defeat 100 monsters', condition: { stat: 'monstersKilled', value: 100 } },
    { id: 'slayer', name: 'Slayer', description: 'Defeat 1000 monsters', condition: { stat: 'monstersKilled', value: 1000 } },
    { id: 'first_mine', name: 'Miner', description: 'Mine your first ore', condition: { stat: 'oreMined', value: 1 } },
    { id: 'master_miner', name: 'Master Miner', description: 'Mine 10,000 ore', condition: { stat: 'oreMined', value: 10000 } },
    { id: 'first_craft', name: 'Craftsman', description: 'Craft your first item', condition: { stat: 'itemsCrafted', value: 1 } },
    { id: 'artisan', name: 'Artisan', description: 'Craft 100 items', condition: { stat: 'itemsCrafted', value: 100 } },
    { id: 'first_trade', name: 'Trader', description: 'Complete your first trade', condition: { stat: 'tradesCompleted', value: 1 } },
    { id: 'merchant', name: 'Merchant', description: 'Complete 100 trades', condition: { stat: 'tradesCompleted', value: 100 } },
    { id: 'tycoon', name: 'Tycoon', description: 'Earn 100,000 gold profit', condition: { stat: 'profit', value: 100000 } },
    { id: 'first_settlement', name: 'Founder', description: 'Found your first settlement', condition: { stat: 'settlementsFounded', value: 1 } },
    { id: 'explorer', name: 'Explorer', description: 'Explore 1000 tiles', condition: { stat: 'tilesExplored', value: 1000 } },
    { id: 'guild_master', name: 'Guild Master', description: 'Create a guild', condition: { stat: 'guildsCreated', value: 1 } },
    { id: 'territory_lord', name: 'Territory Lord', description: 'Claim 10 territories', condition: { stat: 'territoryClaimed', value: 10 } }
  ];

  function checkAchievements(statName, currentValue) {
    const player = global.State?.getPlayer();
    if (!player) return;

    if (!player.achievements) {
      player.achievements = [];
    }

    ACHIEVEMENTS.forEach(achievement => {
      if (player.achievements.includes(achievement.id)) return; // Already earned

      if (achievement.condition.stat === statName && currentValue >= achievement.condition.value) {
        player.achievements.push(achievement.id);
        global.State?.updatePlayer({ achievements: player.achievements });

        global.Toast?.show({
          type: 'achievement',
          title: 'Achievement Unlocked!',
          text: `${achievement.name}: ${achievement.description}`
        });

        global.Narrative?.addEntry({
          type: 'system',
          text: `Achievement Unlocked: ${achievement.name} - ${achievement.description}`,
          meta: 'Achievement'
        });

        // Award bonus
        if (achievement.reward) {
          if (achievement.reward.gold) {
            const currentGold = player.gold || 0;
            global.State?.updatePlayer({ gold: currentGold + achievement.reward.gold });
          }
          if (achievement.reward.xp) {
            global.Leveling?.addXP(achievement.reward.xp);
          }
        }
      }
    });
  }

  function getAchievements() {
    const player = global.State?.getPlayer();
    if (!player || !player.achievements) return [];

    return ACHIEVEMENTS.filter(a => player.achievements.includes(a.id));
  }

  function getAllAchievements() {
    return ACHIEVEMENTS;
  }

  const Achievements = {
    checkAchievements,
    getAchievements,
    getAllAchievements
  };

  global.Achievements = Achievements;
})(window);

