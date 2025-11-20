(function (global) {
  function openPlayerShop(shopOwnerId) {
    // In multiplayer, this would fetch from server
    // For now, simulate player shops
    const player = global.State?.getPlayer();
    if (!player) return;

    global.Narrative?.addEntry({
      type: 'system',
      text: 'Player shops are coming soon. Set up your own shop to become known as a merchant!',
      meta: 'Player Shops'
    });
  }

  function createPlayerShop(shopName, items) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    if (!player.shop) {
      player.shop = {
        name: shopName,
        items: items || [],
        sales: 0,
        revenue: 0,
        created: Date.now()
      };

      global.State?.updatePlayer({ shop: player.shop });

      global.Narrative?.addEntry({
        type: 'system',
        text: `You have opened "${shopName}". Players can now visit your shop to purchase your wares.`,
        meta: 'Shop Created'
      });

      global.Toast?.show({
        type: 'success',
        title: 'Shop Opened!',
        text: `${shopName} is now open for business`
      });

      return true;
    }

    return false;
  }

  const PlayerShop = {
    openPlayerShop,
    createPlayerShop
  };

  global.PlayerShop = PlayerShop;
})(window);

