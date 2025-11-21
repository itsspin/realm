(function (global) {
  function getItemData(itemId) {
    return global.REALM?.data?.itemsById?.[itemId] || null;
  }

  function getItemSlot(item) {
    // Determine slot from item data
    if (item.slot) return item.slot;
    if (item.type === 'weapon') return 'weapon';
    if (item.type === 'armor') {
      // Default to chest if no specific slot
      return item.slot || 'chest';
    }
    return null;
  }

  function equipItem(itemId, slot = null) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    const item = getItemData(itemId);
    if (!item) return false;

    // Determine slot if not provided
    if (!slot) {
      slot = getItemSlot(item);
      if (!slot) {
        global.Narrative?.addEntry({
          type: 'error',
          text: 'This item cannot be equipped.',
          meta: 'System'
        });
        return false;
      }
    }

    // Check if item is in inventory
    const inventoryItem = player.inventory?.find(invItem => invItem.itemId === itemId);
    if (!inventoryItem) {
      global.Narrative?.addEntry({
        type: 'error',
        text: 'Item not found in inventory.',
        meta: 'System'
      });
      return false;
    }

    // Check level requirement
    if (item.levelReq && player.level < item.levelReq) {
      global.Narrative?.addEntry({
        type: 'error',
        text: `You must be level ${item.levelReq} to equip this item.`,
        meta: 'System'
      });
      return false;
    }

    // Unequip current item if any
    const currentItemId = player.equipment?.[slot];
    if (currentItemId) {
      const currentItemInstance = findEquipmentItemInstance(currentItemId, player);
      if (!global.State?.addItem(currentItemId, currentItemInstance)) {
        global.Narrative?.addEntry({
          type: 'error',
          text: 'Inventory is full! Cannot unequip current item.',
          meta: 'System'
        });
        return false;
      }
    }

    // Equip new item (keep the item instance with durability)
    player.equipment = player.equipment || {};
    player.equipment[slot] = itemId;
    
    // Store item instance in equipment items if it has durability
    if (!player.equipmentItems) player.equipmentItems = {};
    if (inventoryItem.durability !== undefined) {
      player.equipmentItems[itemId] = {
        durability: inventoryItem.durability,
        maxDurability: inventoryItem.maxDurability || item.maxDurability || item.durability || 100
      };
    }

    // Remove from inventory
    global.State?.removeItem(itemId);

    global.State?.updatePlayer({ 
      equipment: player.equipment,
      equipmentItems: player.equipmentItems
    });
    
    global.Rendering?.updateCharacterPanel();
    global.Rendering?.updateInventory();
    global.EquipmentUI?.update();

    const itemName = item.name || itemId.replace(/_/g, ' ');
    global.Narrative?.addEntry({
      type: 'system',
      text: `Equipped ${itemName} to ${slot}.`,
      meta: 'System'
    });

    return true;
  }

  function findEquipmentItemInstance(itemId, player) {
    // Check if item instance exists in equipmentItems
    if (player.equipmentItems && player.equipmentItems[itemId]) {
      return player.equipmentItems[itemId];
    }
    return null;
  }

  function unequipItem(slot) {
    const player = global.State?.getPlayer();
    if (!player || !player.equipment) return false;

    const itemId = player.equipment[slot];
    if (!itemId) return false;

    // Get item instance from equipment
    const itemInstance = findEquipmentItemInstance(itemId, player);
    
    // Add back to inventory with item instance
    if (!global.State?.addItem(itemId, itemInstance)) {
      return false; // Inventory full
    }

    player.equipment[slot] = null;
    
    // Remove from equipmentItems
    if (player.equipmentItems && player.equipmentItems[itemId]) {
      delete player.equipmentItems[itemId];
    }
    
    global.State?.updatePlayer({ 
      equipment: player.equipment,
      equipmentItems: player.equipmentItems
    });
    
    global.Rendering?.updateCharacterPanel();
    global.Rendering?.updateInventory();
    global.EquipmentUI?.update();

    return true;
  }

  const Inventory = {
    getItemData,
    equipItem,
    unequipItem
  };

  global.Inventory = Inventory;
})(window);


