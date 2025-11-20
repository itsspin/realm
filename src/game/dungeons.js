/**
 * Dungeon System
 * 
 * Handles dungeon-specific logic: zones, connections, named mobs, loot.
 * 
 * DUNGEON STRUCTURE:
 * - Dungeons contain multiple zones (entrance, tunnels, chambers, etc.)
 * - Zones have connections to other zones
 * - Named mobs spawn in specific zones
 * - Loot tables for named mobs
 * 
 * CURRENT LIMITATIONS:
 * - No static spawn points (monsters spawn randomly)
 * - No respawn timers
 * - No dungeon-specific mechanics (traps, puzzles, etc.)
 * 
 * FUTURE: Each dungeon zone should have defined spawn points with respawn timers
 */
(function (global) {
  function getDungeon(dungeonId) {
    return global.REALM?.data?.dungeonsById?.[dungeonId] || null;
  }

  function getDungeonZone(dungeonId, zoneId) {
    const dungeon = getDungeon(dungeonId);
    if (!dungeon) return null;
    return dungeon.zones.find(z => z.id === zoneId) || null;
  }

  function getConnectedZones(dungeonId, currentZoneId) {
    const currentZone = getDungeonZone(dungeonId, currentZoneId);
    if (!currentZone) return [];
    
    return (currentZone.connections || []).map(zoneId => {
      return getDungeonZone(dungeonId, zoneId);
    }).filter(z => z !== null);
  }

  function getNamedMob(namedMobId) {
    return global.REALM?.data?.namedMobsById?.[namedMobId] || null;
  }

  function getNamedMobsForZone(zoneId) {
    const dungeon = Object.values(global.REALM?.data?.dungeonsById || {}).find(d => {
      return d.zones.some(z => z.id === zoneId);
    });
    
    if (!dungeon) return [];
    
    const zone = dungeon.zones.find(z => z.id === zoneId);
    if (!zone || !zone.namedMobs) return [];
    
    return zone.namedMobs.map(mobId => getNamedMob(mobId)).filter(m => m !== null);
  }

  function getRandomMonster(zoneId) {
    const dungeon = Object.values(global.REALM?.data?.dungeonsById || {}).find(d => {
      return d.zones.some(z => z.id === zoneId);
    });
    
    if (!dungeon) return null;
    
    const zone = dungeon.zones.find(z => z.id === zoneId);
    if (!zone || !zone.monsters || zone.monsters.length === 0) return null;
    
    // 5% chance for named mob if available
    if (zone.namedMobs && zone.namedMobs.length > 0 && Math.random() < 0.05) {
      const namedMobId = zone.namedMobs[Math.floor(Math.random() * zone.namedMobs.length)];
      return getNamedMob(namedMobId);
    }
    
    // Regular monster
    const monsterId = zone.monsters[Math.floor(Math.random() * zone.monsters.length)];
    return global.REALM?.data?.monstersById?.[monsterId] || null;
  }

  function rollLoot(lootTable) {
    if (!lootTable || lootTable.length === 0) return null;
    
    const roll = Math.random();
    let cumulative = 0;
    
    for (const entry of lootTable) {
      cumulative += entry.chance;
      if (roll <= cumulative) {
        return entry.itemId;
      }
    }
    
    return null;
  }

  function getLootFromMonster(monster) {
    if (!monster) return null;
    
    // Named mobs have loot tables
    if (monster.lootTable) {
      return rollLoot(monster.lootTable);
    }
    
    // Regular monsters have loot arrays (lower chance - 10% for excitement)
    if (monster.loot && monster.loot.length > 0) {
      // 10% base chance for loot from regular monsters (low drop rate)
      if (Math.random() < 0.10) {
        return monster.loot[Math.floor(Math.random() * monster.loot.length)];
      }
    }
    
    return null;
  }

  const Dungeons = {
    getDungeon,
    getDungeonZone,
    getConnectedZones,
    getNamedMob,
    getNamedMobsForZone,
    getRandomMonster,
    rollLoot,
    getLootFromMonster
  };

  global.Dungeons = Dungeons;
})(window);

