/**
 * Durability System
 * 
 * Handles item durability degradation over time.
 * Items slowly lose durability while equipped or in use.
 */
(function (global) {
  let durabilityInterval = null;
  const DURABILITY_DEGRADE_INTERVAL = 60000; // 1 minute
  const DURABILITY_DEGRADE_AMOUNT = 1; // Lose 1 durability per interval

  function start() {
    if (durabilityInterval) return; // Already running

    durabilityInterval = setInterval(() => {
      degradeDurability();
    }, DURABILITY_DEGRADE_INTERVAL);

    console.log('[DurabilitySystem] Started durability degradation');
  }

  function stop() {
    if (durabilityInterval) {
      clearInterval(durabilityInterval);
      durabilityInterval = null;
      console.log('[DurabilitySystem] Stopped durability degradation');
    }
  }

  function degradeDurability() {
    const player = global.State?.getPlayer();
    if (!player) return;

    let updated = false;

    // Degrade equipped items
    if (player.equipment && player.equipmentItems) {
      Object.keys(player.equipment).forEach(slot => {
        const itemId = player.equipment[slot];
        if (!itemId) return;

        const itemInstance = player.equipmentItems[itemId];
        if (!itemInstance || itemInstance.durability === undefined) return;

        const itemData = global.REALM?.data?.itemsById?.[itemId];
        if (!itemData) return;

        // Only degrade items that have durability
        const maxDurability = itemInstance.maxDurability || itemData.maxDurability || itemData.durability || 100;
        if (maxDurability <= 0) return; // No durability system for this item

        // Degrade durability
        const newDurability = Math.max(0, itemInstance.durability - DURABILITY_DEGRADE_AMOUNT);
        
        if (newDurability !== itemInstance.durability) {
          itemInstance.durability = newDurability;
          updated = true;

          // Warn if durability is low
          const durabilityPercent = (newDurability / maxDurability) * 100;
          if (durabilityPercent <= 25 && durabilityPercent > 20) {
            global.Narrative?.addEntry({
              type: 'warning',
              text: `Your ${itemData.name || itemId} is wearing down! (${newDurability}/${maxDurability})`,
              meta: 'Durability'
            });
          } else if (durabilityPercent <= 10 && durabilityPercent > 5) {
            global.Narrative?.addEntry({
              type: 'warning',
              text: `Your ${itemData.name || itemId} is about to break! (${newDurability}/${maxDurability})`,
              meta: 'Durability'
            });
          } else if (newDurability === 0) {
            global.Narrative?.addEntry({
              type: 'error',
              text: `Your ${itemData.name || itemId} has broken! It no longer provides bonuses.`,
              meta: 'Durability'
            });
          }
        }
      });
    }

    // Degrade items in inventory (at a slower rate)
    if (player.inventory) {
      player.inventory.forEach(invItem => {
        if (!invItem.durability || invItem.durability === undefined) return;

        const itemData = global.REALM?.data?.itemsById?.[invItem.itemId];
        if (!itemData) return;

        const maxDurability = invItem.maxDurability || itemData.maxDurability || itemData.durability || 100;
        if (maxDurability <= 0) return;

        // Inventory items degrade at 1/3 the rate
        if (Math.random() < 0.33) {
          const newDurability = Math.max(0, invItem.durability - DURABILITY_DEGRADE_AMOUNT);
          if (newDurability !== invItem.durability) {
            invItem.durability = newDurability;
            updated = true;
          }
        }
      });
    }

    if (updated) {
      global.State?.updatePlayer({
        equipmentItems: player.equipmentItems,
        inventory: player.inventory
      });

      // Update UI
      global.Rendering?.updateInventory();
      global.EquipmentUI?.update();
    }
  }

  function getItemDurability(itemId, player) {
    if (!player) return null;

    // Check equipment
    if (player.equipmentItems && player.equipmentItems[itemId]) {
      return player.equipmentItems[itemId];
    }

    // Check inventory
    const invItem = player.inventory?.find(item => item.itemId === itemId);
    if (invItem && invItem.durability !== undefined) {
      return invItem;
    }

    return null;
  }

  function isItemBroken(itemId, player) {
    const itemInstance = getItemDurability(itemId, player);
    if (!itemInstance || itemInstance.durability === undefined) return false;
    return itemInstance.durability <= 0;
  }

  const DurabilitySystem = {
    start,
    stop,
    getItemDurability,
    isItemBroken
  };

  global.DurabilitySystem = DurabilitySystem;
})(window);

