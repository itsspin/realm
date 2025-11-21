(function (global) {
  function canCraft(recipe) {
    if (!recipe || !Array.isArray(recipe)) return false;

    const player = global.State?.getPlayer();
    if (!player) return false;

    const resources = global.State?.data?.resources || {};

    return recipe.every(([resource, amount]) => {
      return (resources[resource] || 0) >= amount;
    });
  }

  function craftItem(itemId) {
    const item = global.REALM?.data?.itemsById?.[itemId];
    if (!item || !item.recipe) return false;

    if (!canCraft(item.recipe)) {
      global.Toast?.show({
        type: 'error',
        title: 'Cannot Craft',
        text: 'Insufficient materials'
      });
      return false;
    }

    // Check inventory space
    const player = global.State?.getPlayer();
    if (player.inventory.length >= 20) {
      global.Toast?.show({
        type: 'error',
        title: 'Inventory Full',
        text: 'Your satchel overflows — no more can be carried.'
      });
      return false;
    }

    // Consume materials
    const resources = global.State?.data?.resources || {};
    item.recipe.forEach(([resource, amount]) => {
      resources[resource] = (resources[resource] || 0) - amount;
    });
    if (global.State && global.State.data) {
      global.State.data.resources = resources;
    }

    // Add item
    global.State?.addItem(itemId);

    global.Toast?.show({
      type: 'craft',
      title: 'Item Crafted',
      text: `Created: ${itemId.replace(/_/g, ' ')}`
    });

    // Track crafting stats
    global.PlayerStats?.incrementStat('itemsCrafted', 1);
    global.Leaderboards?.updatePlayerRanking();

    global.Rendering?.updateResourceBar();
    global.Rendering?.updateInventory();

    return true;
  }

  const Crafting = {
    canCraft,
    craftItem
  };

  global.Crafting = Crafting;
})(window);

