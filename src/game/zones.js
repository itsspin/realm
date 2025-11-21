/**
 * Zone Management System
 * 
 * Handles zone loading, zone changes, and zone-specific data.
 * 
 * ZONE TYPES:
 * - Regular zones: Outdoor areas, cities (from zones.json)
 * - Dungeon zones: Indoor dungeon areas (from dungeons.json)
 * 
 * FLOW:
 * 1. Get current zone from player.currentZone
 * 2. Check if zone is dungeon or regular
 * 3. Load zone data (monsters, NPCs, description)
 * 4. Handle zone changes (level requirements, lore unlocks)
 * 
 * CURRENT LIMITATIONS:
 * - Zone boundaries not defined in tile coordinates
 * - No zone-specific spawn points
 * - Monsters spawn randomly (not static)
 */
(function (global) {
  function getCurrentZone() {
    const player = global.State?.getPlayer();
    if (!player) return null;

    const zoneId = player.currentZone || 'thronehold';
    
    // Try new World system first
    if (global.World) {
      const zone = global.World.getZone(zoneId);
      if (zone) return zone;
    }
    
    // Fallback to old zones system
    
    // Check if it's a dungeon zone
    const dungeon = Object.values(global.REALM?.data?.dungeonsById || {}).find(d => {
      return d.zones.some(z => z.id === zoneId);
    });

    if (dungeon) {
      return dungeon.zones.find(z => z.id === zoneId) || null;
    }

    return global.REALM?.data?.zonesById?.[zoneId] || null;
  }

  function changeZone(zoneId) {
    // Check if it's a dungeon zone first
    const dungeon = Object.values(global.REALM?.data?.dungeonsById || {}).find(d => {
      return d.zones.some(z => z.id === zoneId);
    });

    let zone = null;
    if (dungeon) {
      zone = dungeon.zones.find(z => z.id === zoneId);
    } else {
      zone = global.REALM?.data?.zonesById?.[zoneId];
    }

    if (!zone) return false;

    const player = global.State?.getPlayer();
    if (!player) return false;

    // Check level requirement (only for regular zones, not dungeon zones)
    if (!dungeon && player.level < zone.level) {
      global.Toast?.show({
        type: 'error',
        title: 'Zone Locked',
        text: `You must be level ${zone.level} to enter this zone.`
      });
      return false;
    }

    // Check dungeon level requirement
    if (dungeon && player.level < dungeon.minLevel) {
      global.Toast?.show({
        type: 'error',
        title: 'Dungeon Locked',
        text: `You must be level ${dungeon.minLevel} to enter ${dungeon.name}.`
      });
      return false;
    }

    // Get new zone from World system
    const newZone = global.World?.getZone(zoneId);
    
    // Set starting position in new zone (center or entrance point)
    let startTile = { x: Math.floor((newZone?.gridWidth || 50) / 2), y: Math.floor((newZone?.gridHeight || 50) / 2) };
    
    // If transitioning from another zone, try to find entrance point
    if (player.currentZone) {
      const oldZone = global.World?.getZone(player.currentZone);
      if (oldZone && oldZone.neighboringZones?.includes(zoneId)) {
        // Find entrance point (opposite side of zone from where we came)
        // For now, use center - can be improved with zone-specific entrance data
        startTile = { x: Math.floor((newZone?.gridWidth || 50) / 2), y: Math.floor((newZone?.gridHeight || 50) / 2) };
      }
    }
    
    // Update zone and position
    global.State?.updatePlayer({ 
      currentZone: zoneId,
      currentTile: startTile,
      x: startTile.x,
      y: startTile.y
    });
    
    // If it's a dungeon zone, update the zone data structure
    if (dungeon) {
      // Store dungeon context
      global.State?.updatePlayer({ currentDungeon: dungeon.id, currentDungeonZone: zoneId });
    }

    // Initialize spawn system for new zone
    if (global.SpawnSystem) {
      global.SpawnSystem.initializeZone(zoneId);
    }

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
      const updatedPlayer = global.State?.getPlayer();
      if (!updatedPlayer.discoveredLore?.includes(loreId)) {
        updatedPlayer.discoveredLore = [...(updatedPlayer.discoveredLore || []), loreId];
        global.State?.updatePlayer({ discoveredLore: updatedPlayer.discoveredLore });
        global.Narrative?.addEntry({
          type: 'lore',
          text: zone.lore,
          meta: 'Lore Discovered'
        });
      }
    }

    // Update UI
    global.Rendering?.updateZoneHeader();
    global.Rendering?.updateActionButtons();
    
    // Reload map for new zone
    if (global.WorldMapRender) {
      setTimeout(() => {
        global.WorldMapRender.renderMap();
        global.WorldMapRender.centerOnPlayer();
      }, 100);
    }

    // Force save on zone change
    if (global.State?.forceSave) {
      global.State.forceSave().catch(err => {
        console.error('Failed to save on zone change:', err);
      });
    }

    return true;
  }

  function getAvailableZones() {
    const player = global.State?.getPlayer();
    if (!player) return [];

    const allZones = global.REALM?.data?.zones || [];
    const available = allZones.filter(zone => zone.level <= (player.level || 1));
    
    // Add dungeon entrance if player is high enough level
    const dungeons = Object.values(global.REALM?.data?.dungeonsById || {});
    dungeons.forEach(dungeon => {
      if (player.level >= dungeon.minLevel) {
        // Find entrance zone
        const entranceZone = dungeon.zones.find(z => z.id.includes('entrance'));
        if (entranceZone) {
          // Check if it's already in zones.json, if not add it
          const exists = allZones.find(z => z.id === entranceZone.id);
          if (!exists) {
            available.push({
              id: entranceZone.id,
              name: dungeon.name + ' (Entrance)',
              level: dungeon.minLevel,
              description: entranceZone.description
            });
          }
        }
      }
    });
    
    return available;
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

