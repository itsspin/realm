(function (global) {
  function getCurrentZone() {
    const player = global.State?.getPlayer();
    if (!player) return null;

    const zoneId = player.currentZone || 'edgewood_clearing';
    return global.REALM?.data?.zonesById?.[zoneId] || null;
  }

  function changeZone(zoneId) {
    const zone = global.REALM?.data?.zonesById?.[zoneId];
    if (!zone) return false;

    const player = global.State?.getPlayer();
    if (!player) return false;

    // Check level requirement
    if (player.level < zone.level) {
      global.Toast?.show({
        type: 'error',
        title: 'Zone Locked',
        text: `You must be level ${zone.level} to enter this zone.`
      });
      return false;
    }

    global.State?.updatePlayer({ currentZone: zoneId });

    // Track exploration
    if (player.currentTile) {
      global.PlayerStats?.incrementStat('tilesExplored', 1);
    }

    global.Narrative?.addEntry({
      type: 'zone',
      text: `You enter ${zone.name}. ${zone.description}`,
      meta: ''
    });

    // Unlock lore if available
    if (zone.lore) {
      const loreId = `lore_${zoneId}`;
      const player = global.State?.getPlayer();
      if (!player.discoveredLore?.includes(loreId)) {
        player.discoveredLore = [...(player.discoveredLore || []), loreId];
        global.State?.updatePlayer({ discoveredLore: player.discoveredLore });
        global.Narrative?.addEntry({
          type: 'lore',
          text: zone.lore,
          meta: 'Lore Discovered'
        });
      }
    }

    global.Rendering?.updateZoneHeader();
    global.Rendering?.updateActionButtons();

    return true;
  }

  function getAvailableZones() {
    const player = global.State?.getPlayer();
    if (!player) return [];

    const allZones = global.REALM?.data?.zones || [];
    return allZones.filter(zone => zone.level <= (player.level || 1));
  }

  function getRandomMonster() {
    const zone = getCurrentZone();
    if (!zone || !zone.monsters || zone.monsters.length === 0) {
      // Fallback: return a basic monster if zone has no monsters defined
      return global.REALM?.data?.monstersById?.['goblin_scout'] || null;
    }

    const monsterId = zone.monsters[Math.floor(Math.random() * zone.monsters.length)];
    return global.REALM?.data?.monstersById?.[monsterId] || null;
  }

  const Zones = {
    getCurrentZone,
    changeZone,
    getAvailableZones,
    getRandomMonster
  };

  global.Zones = Zones;
})(window);

