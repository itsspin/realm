/**
 * Corpse System
 * 
 * Handles corpses left by dead mobs. Corpses contain loot that must be manually looted.
 * Corpses disappear once all loot is taken.
 * 
 * @module CorpseSystem
 */

(function (global) {
  let activeCorpses = new Map(); // Map<corpseId, corpseEntity>
  
  /**
   * Create a corpse from a dead mob
   */
  function createCorpse(mobEntity, lootItems) {
    if (!mobEntity || !mobEntity.mobTemplate) return null;
    
    const corpseId = `corpse_${mobEntity.id}_${Date.now()}`;
    const mobName = mobEntity.mobTemplate.name || 'Unknown';
    
    const corpse = {
      id: corpseId,
      mobEntityId: mobEntity.id,
      mobTemplateId: mobEntity.mobTemplateId,
      mobName: mobName,
      corpseName: `${mobName} Corpse`,
      zoneId: mobEntity.zoneId,
      x: mobEntity.x,
      y: mobEntity.y,
      lootItems: lootItems || [], // Array of itemIds
      lootedItems: [], // Items that have been looted
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes before auto-decay
    };
    
    activeCorpses.set(corpseId, corpse);
    return corpse;
  }
  
  /**
   * Get corpse at a specific tile
   */
  function getCorpseAtTile(zoneId, x, y) {
    return Array.from(activeCorpses.values()).find(corpse => 
      corpse.zoneId === zoneId && 
      corpse.x === x && 
      corpse.y === y &&
      !isCorpseLooted(corpse)
    );
  }
  
  /**
   * Check if corpse has been fully looted
   */
  function isCorpseLooted(corpse) {
    return corpse.lootItems.length > 0 && 
           corpse.lootedItems.length >= corpse.lootItems.length;
  }
  
  /**
   * Loot an item from a corpse
   */
  function lootItem(corpseId, itemIndex) {
    const corpse = activeCorpses.get(corpseId);
    if (!corpse) return null;
    
    if (isCorpseLooted(corpse)) {
      return null; // Already fully looted
    }
    
    if (itemIndex < 0 || itemIndex >= corpse.lootItems.length) {
      return null; // Invalid index
    }
    
    if (corpse.lootedItems.includes(itemIndex)) {
      return null; // Already looted
    }
    
    const itemId = corpse.lootItems[itemIndex];
    corpse.lootedItems.push(itemIndex);
    
    // Check if fully looted
    if (isCorpseLooted(corpse)) {
      // Remove corpse after a short delay
      setTimeout(() => {
        removeCorpse(corpseId);
      }, 500);
    }
    
    return itemId;
  }
  
  /**
   * Loot all remaining items from a corpse
   */
  function lootAll(corpseId) {
    const corpse = activeCorpses.get(corpseId);
    if (!corpse) return [];
    
    const looted = [];
    
    for (let i = 0; i < corpse.lootItems.length; i++) {
      if (!corpse.lootedItems.includes(i)) {
        const itemId = lootItem(corpseId, i);
        if (itemId) {
          looted.push(itemId);
        }
      }
    }
    
    return looted;
  }
  
  /**
   * Remove a corpse
   */
  function removeCorpse(corpseId) {
    activeCorpses.delete(corpseId);
  }
  
  /**
   * Get all corpses in a zone
   */
  function getCorpsesInZone(zoneId) {
    return Array.from(activeCorpses.values()).filter(corpse => 
      corpse.zoneId === zoneId && !isCorpseLooted(corpse)
    );
  }
  
  /**
   * Get nearby corpses
   */
  function getNearbyCorpses(zoneId, centerX, centerY, radius = 10) {
    return Array.from(activeCorpses.values()).filter(corpse => {
      if (corpse.zoneId !== zoneId || isCorpseLooted(corpse)) return false;
      const distance = Math.abs(corpse.x - centerX) + Math.abs(corpse.y - centerY);
      return distance <= radius;
    });
  }
  
  /**
   * Clean up expired corpses
   */
  function cleanupExpiredCorpses() {
    const now = Date.now();
    const toRemove = [];
    
    activeCorpses.forEach((corpse, corpseId) => {
      if (now >= corpse.expiresAt) {
        toRemove.push(corpseId);
      }
    });
    
    toRemove.forEach(corpseId => {
      activeCorpses.delete(corpseId);
    });
  }
  
  /**
   * Clear all corpses in a zone
   */
  function clearZone(zoneId) {
    const toRemove = [];
    activeCorpses.forEach((corpse, corpseId) => {
      if (corpse.zoneId === zoneId) {
        toRemove.push(corpseId);
      }
    });
    toRemove.forEach(corpseId => activeCorpses.delete(corpseId));
  }
  
  /**
   * Clear all corpses
   */
  function clearAll() {
    activeCorpses.clear();
  }
  
  // Clean up expired corpses periodically
  setInterval(cleanupExpiredCorpses, 30000); // Every 30 seconds
  
  const CorpseSystem = {
    createCorpse,
    getCorpseAtTile,
    isCorpseLooted,
    lootItem,
    lootAll,
    removeCorpse,
    getCorpsesInZone,
    getNearbyCorpses,
    clearZone,
    clearAll
  };
  
  global.CorpseSystem = CorpseSystem;
})(window);

