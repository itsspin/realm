(function (global) {
  const STAT_CATEGORIES = {
    combat: ['monstersKilled', 'deaths', 'damageDealt', 'damageTaken', 'criticalHits'],
    gathering: ['oreMined', 'fishCaught', 'herbsGathered', 'essenceHarvested', 'resourcesGathered'],
    crafting: ['itemsCrafted', 'recipesLearned', 'craftingXP'],
    trading: ['itemsListed', 'itemsPurchased', 'totalListedValue', 'totalSpent', 'tradesCompleted', 'profit'],
    exploration: ['zonesDiscovered', 'tilesExplored', 'settlementsFounded'],
    social: ['guildsJoined', 'territoryClaimed', 'playersHelped']
  };

  function getPlayerStats() {
    const player = global.State?.getPlayer();
    if (!player) return {};

    // Player stats are separate from combat stats (hp, atk, def)
    if (!player.playerStats) {
      player.playerStats = {};
      global.State?.updatePlayer({ playerStats: player.playerStats });
    }

    return player.playerStats;
  }

  function incrementStat(statName, amount = 1) {
    const stats = getPlayerStats();
    if (!stats) return;

    stats[statName] = (stats[statName] || 0) + amount;
    global.State?.updatePlayer({ playerStats: stats });

    // Check for achievements
    global.Achievements?.checkAchievements(statName, stats[statName]);
  }

  function getStat(statName) {
    const stats = getPlayerStats();
    return stats?.[statName] || 0;
  }

  function calculatePlayerTitle() {
    const stats = getPlayerStats();
    if (!stats) return null;

    const titles = [];

    // Combat titles
    if (stats.monstersKilled >= 1000) titles.push('Slayer');
    if (stats.monstersKilled >= 100) titles.push('Hunter');
    if (stats.criticalHits >= 500) titles.push('Precise');

    // Gathering titles
    if (stats.oreMined >= 10000) titles.push('Master Miner');
    if (stats.fishCaught >= 5000) titles.push('Angler');
    if (stats.resourcesGathered >= 50000) titles.push('Gatherer');

    // Crafting titles
    if (stats.itemsCrafted >= 1000) titles.push('Artisan');
    if (stats.itemsCrafted >= 100) titles.push('Craftsman');

    // Trading titles
    if (stats.tradesCompleted >= 1000) titles.push('Merchant');
    if (stats.tradesCompleted >= 100) titles.push('Trader');
    if (stats.profit >= 100000) titles.push('Tycoon');
    if (stats.totalSpent >= 50000 && stats.profit > 0) titles.push('Investor');

    // Exploration titles
    if (stats.settlementsFounded >= 10) titles.push('Founder');
    if (stats.tilesExplored >= 1000) titles.push('Explorer');

    // Return most prestigious title
    return titles.length > 0 ? titles[titles.length - 1] : null;
  }

  function getPlayerReputation() {
    const player = global.State?.getPlayer();
    if (global.Reputation && typeof global.Reputation.getPlayerReputation === 'function') {
      return global.Reputation.getPlayerReputation();
    }
    
    // Fallback
    const stats = getPlayerStats();
    if (!stats || Object.keys(stats).length === 0) return { level: 0, title: 'Unknown', fame: 0 };

    const totalActivity = 
      (stats.monstersKilled || 0) +
      (stats.resourcesGathered || 0) +
      (stats.itemsCrafted || 0) +
      (stats.tradesCompleted || 0) +
      (stats.settlementsFounded || 0) * 100;

    const reputationLevel = Math.floor(totalActivity / 1000);
    const title = calculatePlayerTitle();

    return {
      level: reputationLevel,
      title: title,
      fame: totalActivity
    };
  }

  const PlayerStats = {
    getPlayerStats,
    incrementStat,
    getStat,
    calculatePlayerTitle,
    getPlayerReputation,
    STAT_CATEGORIES
  };

  global.PlayerStats = PlayerStats;
})(window);

