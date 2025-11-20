(function (global) {
  function calculateReputation(player) {
    if (!player) return { level: 0, title: 'Unknown', fame: 0 };

    const stats = player.playerStats || {};
    const totalActivity = 
      (stats.monstersKilled || 0) * 2 +
      (stats.resourcesGathered || 0) * 1 +
      (stats.itemsCrafted || 0) * 3 +
      (stats.tradesCompleted || 0) * 5 +
      (stats.settlementsFounded || 0) * 100 +
      (stats.territoryClaimed || 0) * 50;

    const reputationLevel = Math.floor(totalActivity / 1000);
    
    // Determine title based on specialization
    let title = null;
    const combatScore = (stats.monstersKilled || 0) * 2;
    const gatheringScore = (stats.resourcesGathered || 0) * 1;
    const craftingScore = (stats.itemsCrafted || 0) * 3;
    const tradingScore = (stats.tradesCompleted || 0) * 5;

    const maxScore = Math.max(combatScore, gatheringScore, craftingScore, tradingScore);
    
    if (maxScore === tradingScore && tradingScore > 100) {
      title = 'Merchant';
      if (tradingScore > 1000) title = 'Tycoon';
      if (tradingScore > 5000) title = 'Master Trader';
    } else if (maxScore === craftingScore && craftingScore > 50) {
      title = 'Artisan';
      if (craftingScore > 500) title = 'Master Craftsman';
    } else if (maxScore === gatheringScore && gatheringScore > 200) {
      title = 'Gatherer';
      if (gatheringScore > 2000) title = 'Master Gatherer';
    } else if (maxScore === combatScore && combatScore > 50) {
      title = 'Warrior';
      if (combatScore > 500) title = 'Slayer';
    }

    return {
      level: reputationLevel,
      title: title,
      fame: totalActivity,
      specialization: maxScore === tradingScore ? 'trader' : 
                     maxScore === craftingScore ? 'crafter' :
                     maxScore === gatheringScore ? 'gatherer' : 'combat'
    };
  }

  function getPlayerReputation() {
    const player = global.State?.getPlayer();
    return calculateReputation(player);
  }

  const Reputation = {
    calculateReputation,
    getPlayerReputation
  };

  global.Reputation = Reputation;
})(window);


