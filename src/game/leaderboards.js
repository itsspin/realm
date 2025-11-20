(function (global) {
  function getLeaderboard(category) {
    // In real multiplayer, this would fetch from server
    // For now, we'll use localStorage to simulate
    const saved = localStorage.getItem(`REALM_LEADERBOARD_${category}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  function updateLeaderboard(category, playerId, playerName, value) {
    let leaderboard = getLeaderboard(category);
    
    const existing = leaderboard.findIndex(entry => entry.playerId === playerId);
    if (existing !== -1) {
      if (leaderboard[existing].value < value) {
        leaderboard[existing].value = value;
      }
    } else {
      leaderboard.push({ playerId, playerName, value });
    }

    leaderboard.sort((a, b) => b.value - a.value);
    leaderboard = leaderboard.slice(0, 100); // Top 100

    try {
      localStorage.setItem(`REALM_LEADERBOARD_${category}`, JSON.stringify(leaderboard));
    } catch (e) {
      console.error('Failed to save leaderboard:', e);
    }
  }

  function showLeaderboard(category) {
    const leaderboard = getLeaderboard(category);
    const player = global.State?.getPlayer();

    const overlay = document.createElement('div');
    overlay.id = 'leaderboardOverlay';
    overlay.className = 'character-creation-overlay';
    
    const categoryNames = {
      level: 'Highest Level',
      gold: 'Wealthiest',
      monstersKilled: 'Most Monsters Slain',
      itemsCrafted: 'Master Craftsmen',
      tradesCompleted: 'Top Traders',
      oreMined: 'Master Miners',
      settlementsFounded: 'Greatest Founders',
      fame: 'Most Famous'
    };

    overlay.innerHTML = `
      <div class="creation-panel" style="max-width: 600px;">
        <h2 class="creation-title">${categoryNames[category] || category}</h2>
        <div style="max-height: 500px; overflow-y: auto; margin-top: 1rem;">
          ${leaderboard.length === 0 
            ? '<p style="text-align: center; color: var(--fg-secondary); font-style: italic;">No entries yet. Be the first!</p>'
            : leaderboard.map((entry, index) => {
                const isYou = player && entry.playerId === player.id;
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; margin-bottom: 0.5rem; background: ${isYou ? 'rgba(201, 125, 61, 0.2)' : 'rgba(10, 14, 26, 0.4)'}; border-radius: 0.25rem; border-left: 3px solid ${isYou ? 'var(--ember-orange)' : 'transparent'};">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                      <span style="font-family: var(--font-mono); color: var(--gold-bright); font-weight: 600; min-width: 2rem;">#${index + 1}</span>
                      <span style="color: var(--fg-primary); ${isYou ? 'font-weight: 600;' : ''}">${entry.playerName}${isYou ? ' (You)' : ''}</span>
                    </div>
                    <span style="font-family: var(--font-mono); color: var(--ember-bright);">${entry.value.toLocaleString()}</span>
                  </div>
                `;
              }).join('')
          }
        </div>
        <button class="action-btn" onclick="document.getElementById('leaderboardOverlay')?.remove()" style="margin-top: 1rem; width: 100%;">Close</button>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function updatePlayerRanking() {
    const player = global.State?.getPlayer();
    if (!player) return;

    const stats = global.PlayerStats?.getPlayerStats() || {};
    const reputation = global.PlayerStats?.getPlayerReputation() || { fame: 0 };

    // Update various leaderboards
    updateLeaderboard('level', player.id, player.name, player.level || 1);
    updateLeaderboard('gold', player.id, player.name, player.gold || 0);
    updateLeaderboard('monstersKilled', player.id, player.name, stats.monstersKilled || 0);
    updateLeaderboard('itemsCrafted', player.id, player.name, stats.itemsCrafted || 0);
    updateLeaderboard('tradesCompleted', player.id, player.name, stats.tradesCompleted || 0);
    updateLeaderboard('oreMined', player.id, player.name, stats.oreMined || 0);
    updateLeaderboard('settlementsFounded', player.id, player.name, stats.settlementsFounded || 0);
    updateLeaderboard('fame', player.id, player.name, reputation.fame || 0);
  }

  const Leaderboards = {
    getLeaderboard,
    updateLeaderboard,
    showLeaderboard,
    updatePlayerRanking
  };

  global.Leaderboards = Leaderboards;
})(window);

