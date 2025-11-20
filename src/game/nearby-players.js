(function (global) {
  // Simulated nearby players (in real game, this would come from server)
  let nearbyPlayers = [];

  function updateNearbyPlayers() {
    const player = global.State?.getPlayer();
    if (!player || !player.currentTile) {
      nearbyPlayers = [];
      renderNearbyPlayers();
      return;
    }

    // In real game, fetch from server based on currentTile
    // For now, simulate some nearby players with positions
    const currentX = player.currentTile.x;
    const currentY = player.currentTile.y;
    
    const simulated = [
      { 
        id: 'player-2', 
        name: 'TestPlayer', 
        level: 5, 
        class: 'warrior', 
        race: 'human',
        currentTile: { x: currentX + 2, y: currentY + 1 }
      },
      { 
        id: 'player-3', 
        name: 'AnotherPlayer', 
        level: 3, 
        class: 'mage', 
        race: 'elf',
        currentTile: { x: currentX - 1, y: currentY + 2 }
      }
    ];

    // Filter by proximity (within 5 tiles)
    nearbyPlayers = simulated.filter(p => {
      if (!p.currentTile) return false;
      const distance = Math.sqrt(
        Math.pow(p.currentTile.x - currentX, 2) + 
        Math.pow(p.currentTile.y - currentY, 2)
      );
      return distance <= 5;
    });
    
    // Add self
    nearbyPlayers.push({
      id: player.id,
      name: player.name,
      level: player.level,
      class: player.class,
      race: player.race,
      currentTile: player.currentTile,
      isSelf: true
    });

    renderNearbyPlayers();
  }

  function renderNearbyPlayers() {
    const container = document.getElementById('nearbyPlayers');
    if (!container) return;

    if (nearbyPlayers.length === 0) {
      container.innerHTML = '<div style="color: var(--fg-secondary); font-style: italic; font-size: 0.85rem; padding: var(--spacing-sm);">No players nearby</div>';
      return;
    }

    container.innerHTML = nearbyPlayers.map(player => {
      const raceName = global.REALM?.data?.racesById?.[player.race]?.name || player.race;
      const className = player.class || 'Unknown';
      return `
        <div class="nearby-player-item" data-player-id="${player.id}">
          <div>
            <div class="nearby-player-name">${player.name}</div>
            <div class="nearby-player-level">${raceName} ${className} - Level ${player.level}</div>
          </div>
          <button class="player-menu-btn" onclick="global.NearbyPlayers.showPlayerMenu('${player.id}', event)">⋯</button>
        </div>
      `;
    }).join('');
  }

  function showPlayerMenu(playerId, event) {
    event.stopPropagation();
    
    const player = nearbyPlayers.find(p => p.id === playerId);
    if (!player) return;

    // Remove existing menu
    const existing = document.getElementById('playerMenu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'playerMenu';
    menu.className = 'nearby-player-menu';
    menu.style.position = 'fixed';
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';

    const currentPlayer = global.State?.getPlayer();
    const isInParty = currentPlayer?.party?.members?.includes(playerId);
    const isInGuild = currentPlayer?.guild?.members?.includes(playerId);

    menu.innerHTML = `
      <button onclick="global.NearbyPlayers.whisperPlayer('${playerId}')">Whisper</button>
      ${!isInParty ? `<button onclick="global.NearbyPlayers.inviteToParty('${playerId}')">Invite to Party</button>` : ''}
      ${!isInGuild && currentPlayer?.guild ? `<button onclick="global.NearbyPlayers.inviteToGuild('${playerId}')">Invite to Guild</button>` : ''}
      <button onclick="global.NearbyPlayers.initiateTrade('${playerId}')">Trade</button>
      <button onclick="global.NearbyPlayers.viewProfile('${playerId}')">View Profile</button>
    `;

    document.body.appendChild(menu);

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }, { once: true });
    }, 100);
  }

  function whisperPlayer(playerId) {
    const player = nearbyPlayers.find(p => p.id === playerId);
    if (!player) return;

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.value = `/tell ${player.name} `;
      chatInput.focus();
    }
  }

  function inviteToParty(playerId) {
    const player = nearbyPlayers.find(p => p.id === playerId);
    if (!player) return;

    global.Party?.invitePlayer(playerId, player.name);
  }

  function inviteToGuild(playerId) {
    const player = nearbyPlayers.find(p => p.id === playerId);
    if (!player) return;

    const currentPlayer = global.State?.getPlayer();
    if (!currentPlayer?.guild) {
      global.ChatSystem?.addSystemMessage('You are not in a guild.');
      return;
    }

    global.Guilds?.invitePlayer(playerId, player.name);
  }

  function initiateTrade(playerId) {
    const player = nearbyPlayers.find(p => p.id === playerId);
    if (!player) return;

    const currentPlayer = global.State?.getPlayer();
    if (!currentPlayer?.currentTile) return;

    // Check proximity (must be on same tile)
    // In real game, check distance
    global.Trade?.initiateTrade(playerId, player.name);
  }

  function viewProfile(playerId) {
    const player = nearbyPlayers.find(p => p.id === playerId);
    if (!player) return;

    global.ChatSystem?.addSystemMessage(`Viewing profile of ${player.name} (Level ${player.level} ${player.class})`);
    // In real game, open profile window
  }

  // Update nearby players periodically
  setInterval(updateNearbyPlayers, 5000);
  updateNearbyPlayers();

  const NearbyPlayers = {
    updateNearbyPlayers,
    renderNearbyPlayers,
    getNearbyPlayers: () => nearbyPlayers,
    showPlayerMenu,
    whisperPlayer,
    inviteToParty,
    inviteToGuild,
    initiateTrade,
    viewProfile
  };

  global.NearbyPlayers = NearbyPlayers;
})(window);

