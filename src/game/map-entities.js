(function (global) {
  let nearbyMonsters = [];
  let nearbyPlayers = [];

  function updateMapEntities() {
    const player = global.State?.getPlayer();
    if (!player || !player.currentTile) return;

    const currentX = player.currentTile.x;
    const currentY = player.currentTile.y;
    const viewRadius = 5; // Tiles visible around player

    // Get nearby monsters (spawn on tiles)
    nearbyMonsters = [];
    const zone = global.Zones?.getCurrentZone();
    if (zone) {
      // Spawn monsters on nearby tiles (simulated)
      for (let dy = -viewRadius; dy <= viewRadius; dy++) {
        for (let dx = -viewRadius; dx <= viewRadius; dx++) {
          const tileX = currentX + dx;
          const tileY = currentY + dy;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= viewRadius && distance > 0) {
            // 10% chance for monster on each tile
            if (Math.random() < 0.1) {
              const monster = global.Zones?.getRandomMonster();
              if (monster) {
                nearbyMonsters.push({
                  id: `monster_${tileX}_${tileY}_${Date.now()}`,
                  monsterId: monster.id,
                  monster: monster,
                  x: tileX,
                  y: tileY,
                  distance: distance
                });
              }
            }
          }
        }
      }
    }

    // Get nearby players (from server in real game)
    // For now, simulate some players
    nearbyPlayers = global.NearbyPlayers?.nearbyPlayers || [];

    renderMapEntities();
  }

  function renderMapEntities() {
    // Entities are rendered on the map canvas
    if (global.MapRender) {
      global.MapRender.renderMap();
    }
  }

  function getMonsterAtTile(x, y) {
    return nearbyMonsters.find(m => m.x === x && m.y === y);
  }

  function attackMonsterAtTile(x, y) {
    const monsterEntity = getMonsterAtTile(x, y);
    if (!monsterEntity) return false;

    const player = global.State?.getPlayer();
    if (!player) return false;

    const playerX = player.currentTile?.x || player.x;
    const playerY = player.currentTile?.y || player.y;
    const distance = Math.abs(x - playerX) + Math.abs(y - playerY);

    // Must be adjacent to attack
    if (distance > 1) {
      global.ChatSystem?.addSystemMessage('You are too far away to attack. Move closer.');
      return false;
    }

    // Remove monster from map
    nearbyMonsters = nearbyMonsters.filter(m => m.id !== monsterEntity.id);

    // Start combat
    global.Combat?.startCombat(monsterEntity.monsterId);

    return true;
  }

  function handleEntityClick(x, y, type, entityId) {
    if (type === 'monster') {
      attackMonsterAtTile(x, y);
    } else if (type === 'player') {
      // Show player menu
      const player = nearbyPlayers.find(p => p.id === entityId);
      if (player) {
        global.NearbyPlayers?.showPlayerMenu(player.id, { clientX: x, clientY: y });
      }
    }
  }

  // Update entities periodically
  setInterval(updateMapEntities, 2000);
  updateMapEntities();

  const MapEntities = {
    updateMapEntities,
    getMonsterAtTile,
    attackMonsterAtTile,
    handleEntityClick,
    getNearbyMonsters: () => nearbyMonsters,
    getNearbyPlayers: () => nearbyPlayers
  };

  global.MapEntities = MapEntities;
})(window);

