(function (global) {
  function getItemData(itemId) {
    return global.REALM?.data?.itemsById?.[itemId] || null;
  }

  function equipItem(itemId, slot) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    const item = getItemData(itemId);
    if (!item) return false;

    // Check if item is in inventory
    const inInventory = player.inventory?.some(item => item.itemId === itemId);
    if (!inInventory) return false;

    // Unequip current item if any
    const currentItem = player.equipment?.[slot];
    if (currentItem) {
      global.State?.addItem(currentItem);
    }

    // Equip new item
    player.equipment = player.equipment || {};
    player.equipment[slot] = itemId;

    // Remove from inventory
    global.State?.removeItem(itemId);

    global.State?.updatePlayer({ equipment: player.equipment });
    global.Rendering?.updateCharacterPanel();
    global.Rendering?.updateInventory();

    return true;
  }

  function unequipItem(slot) {
    const player = global.State?.getPlayer();
    if (!player || !player.equipment) return false;

    const itemId = player.equipment[slot];
    if (!itemId) return false;

    // Add back to inventory
    if (!global.State?.addItem(itemId)) {
      return false; // Inventory full
    }

    player.equipment[slot] = null;
    global.State?.updatePlayer({ equipment: player.equipment });
    global.Rendering?.updateCharacterPanel();
    global.Rendering?.updateInventory();

    return true;
  }

  const Inventory = {
    getItemData,
    equipItem,
    unequipItem
  };

  global.Inventory = Inventory;
})(window);


