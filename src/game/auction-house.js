(function (global) {
  let auctionListings = [];

  function loadAuctionHouse() {
    const saved = localStorage.getItem('REALM_AUCTION_HOUSE');
    if (saved) {
      try {
        auctionListings = JSON.parse(saved);
      } catch (e) {
        auctionListings = [];
      }
    }
  }

  function saveAuctionHouse() {
    try {
      localStorage.setItem('REALM_AUCTION_HOUSE', JSON.stringify(auctionListings));
    } catch (e) {
      console.error('Failed to save auction house:', e);
    }
  }

  function listItem(itemId, quantity, pricePerUnit, sellerId) {
    const player = global.State?.getPlayer();
    if (!player || player.id !== sellerId) return false;

    // Check if player is in a city with auction house
    const currentZone = global.Zones?.getCurrentZone();
    const npcs = global.REALM?.data?.npcsById || {};
    const hasAuctioneer = Object.values(npcs).some(npc => 
      npc.type === 'auctioneer' && npc.zone === currentZone?.id
    );

    // Premium players can list remotely
    const isPremium = player.premium || false;
    
    if (!hasAuctioneer && !isPremium) {
      global.Toast?.show({
        type: 'error',
        title: 'Not in City',
        text: 'You must be in a city with an auction house to list items. Premium members can list remotely.'
      });
      return false;
    }

    // Check if player has the item
    const itemIndex = player.inventory?.findIndex(item => item.itemId === itemId);
    if (itemIndex === -1) {
      global.Toast?.show({
        type: 'error',
        title: 'Item Not Found',
        text: 'You do not have this item in your inventory.'
      });
      return false;
    }

    // Remove item from inventory
    const item = player.inventory[itemIndex];
    player.inventory.splice(itemIndex, 1);
    global.State?.updatePlayer({ inventory: player.inventory });

    // Create listing
    const listing = {
      id: `listing_${Date.now()}_${Math.random()}`,
      itemId: itemId,
      quantity: quantity || 1,
      pricePerUnit: pricePerUnit,
      sellerId: sellerId,
      sellerName: player.name,
      listedAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };

    auctionListings.push(listing);
    saveAuctionHouse();

    global.Narrative?.addEntry({
      type: 'system',
      text: `You have listed ${quantity || 1}x ${itemId.replace(/_/g, ' ')} on the auction house for ${pricePerUnit} gold each.`,
      meta: 'Auction House'
    });

    global.Toast?.show({
      type: 'success',
      title: 'Item Listed',
      text: `Listed on auction house for ${pricePerUnit * (quantity || 1)} gold total`
    });

    // Track trading stats
    if (global.PlayerStats) {
      global.PlayerStats.incrementStat('itemsListed', 1);
      global.PlayerStats.incrementStat('totalListedValue', pricePerUnit * (quantity || 1));
    }

    return true;
  }

  function buyItem(listingId, buyerId) {
    const listing = auctionListings.find(l => l.id === listingId);
    if (!listing) return false;

    if (listing.expiresAt < Date.now()) {
      // Expired listing - return item to seller
      returnExpiredListing(listing);
      return false;
    }

    const buyer = global.State?.getPlayer();
    if (!buyer || buyer.id !== buyerId) return false;

    const totalPrice = listing.pricePerUnit * listing.quantity;

    if (buyer.gold < totalPrice) {
      global.Toast?.show({
        type: 'error',
        title: 'Insufficient Gold',
        text: `You need ${totalPrice} gold to purchase this item.`
      });
      return false;
    }

    // Transfer gold (in real multiplayer, this would go to seller)
    buyer.gold -= totalPrice;
    global.State?.updatePlayer({ gold: buyer.gold });

    // Add item to buyer inventory
    if (!global.State?.addItem(listing.itemId)) {
      // Inventory full - refund
      buyer.gold += totalPrice;
      global.State?.updatePlayer({ gold: buyer.gold });
      global.Toast?.show({
        type: 'error',
        title: 'Inventory Full',
        text: 'Your satchel overflows — no more can be carried.'
      });
      return false;
    }

    // Remove listing
    auctionListings = auctionListings.filter(l => l.id !== listingId);
    saveAuctionHouse();

    global.Narrative?.addEntry({
      type: 'system',
      text: `You purchased ${listing.quantity}x ${listing.itemId.replace(/_/g, ' ')} from ${listing.sellerName} for ${totalPrice} gold.`,
      meta: 'Auction House'
    });

    global.Toast?.show({
      type: 'success',
      title: 'Purchase Complete',
      text: `Bought from ${listing.sellerName}`
    });

    // Track trading stats
    if (global.PlayerStats) {
      global.PlayerStats.incrementStat('itemsPurchased', 1);
      global.PlayerStats.incrementStat('totalSpent', totalPrice);
      global.PlayerStats.incrementStat('tradesCompleted', 1);
      
      // Calculate profit (for seller - in real multiplayer)
      const sellerStats = global.PlayerStats?.getPlayerStats();
      if (sellerStats) {
        const currentProfit = sellerStats.profit || 0;
        global.PlayerStats.incrementStat('profit', totalPrice);
      }
    }

    return true;
  }

  function returnExpiredListing(listing) {
    // In real multiplayer, return item to seller
    auctionListings = auctionListings.filter(l => l.id !== listing.id);
    saveAuctionHouse();
  }

  function getListings(filter = {}) {
    const now = Date.now();
    // Remove expired listings
    auctionListings = auctionListings.filter(l => l.expiresAt > now);
    saveAuctionHouse();

    let filtered = [...auctionListings];

    if (filter.itemId) {
      filtered = filtered.filter(l => l.itemId === filter.itemId);
    }
    if (filter.sellerId) {
      filtered = filtered.filter(l => l.sellerId === filter.sellerId);
    }
    if (filter.maxPrice) {
      filtered = filtered.filter(l => l.pricePerUnit <= filter.maxPrice);
    }

    return filtered.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  }

  function getMyListings(playerId) {
    return auctionListings.filter(l => l.sellerId === playerId && l.expiresAt > Date.now());
  }

  // Initialize on load
  loadAuctionHouse();

  const AuctionHouse = {
    listItem,
    buyItem,
    getListings,
    getMyListings
  };

  global.AuctionHouse = AuctionHouse;
})(window);

