(function (global) {
  let activeTrades = {};

  function initiateTrade(targetPlayerId, targetPlayerName) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    // Check proximity (must be on same tile)
    // In real game, check distance
    const tradeId = `trade_${player.id}_${targetPlayerId}_${Date.now()}`;
    
    activeTrades[tradeId] = {
      id: tradeId,
      player1: player.id,
      player1Name: player.name,
      player2: targetPlayerId,
      player2Name: targetPlayerName,
      player1Items: [],
      player2Items: [],
      player1Gold: 0,
      player2Gold: 0,
      player1Accepted: false,
      player2Accepted: false,
      status: 'pending'
    };

    global.ChatSystem?.addSystemMessage(`Trade window opened with ${targetPlayerName}.`);
    showTradeWindow(tradeId);
    return true;
  }

  function showTradeWindow(tradeId) {
    const trade = activeTrades[tradeId];
    if (!trade) return;

    const player = global.State?.getPlayer();
    if (!player) return;

    const isPlayer1 = trade.player1 === player.id;
    const otherPlayerName = isPlayer1 ? trade.player2Name : trade.player1Name;
    const myItems = isPlayer1 ? trade.player1Items : trade.player2Items;
    const myGold = isPlayer1 ? trade.player1Gold : trade.player2Gold;
    const theirItems = isPlayer1 ? trade.player2Items : trade.player1Items;
    const theirGold = isPlayer1 ? trade.player2Gold : trade.player1Gold;
    const myAccepted = isPlayer1 ? trade.player1Accepted : trade.player2Accepted;
    const theirAccepted = isPlayer1 ? trade.player2Accepted : trade.player1Accepted;

    const overlay = document.createElement('div');
    overlay.id = 'tradeWindow';
    overlay.className = 'character-creation-overlay';
    
    overlay.innerHTML = `
      <div class="creation-panel" style="max-width: 800px;">
        <h2 class="creation-title">Trading with ${otherPlayerName}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
          <div>
            <h3 style="color: var(--gold-muted); margin-bottom: 0.5rem;">Your Offer</h3>
            <div id="myTradeItems" style="min-height: 200px; background: rgba(10, 14, 26, 0.4); border-radius: 0.25rem; padding: 0.5rem; margin-bottom: 0.5rem;">
              ${myItems.length === 0 ? '<p style="color: var(--fg-secondary); font-style: italic; text-align: center;">No items</p>' : myItems.map(item => {
                const itemData = global.REALM?.data?.itemsById?.[item.itemId];
                return `<div style="padding: 0.25rem; background: rgba(201, 125, 61, 0.2); border-radius: 0.25rem; margin-bottom: 0.25rem;">
                  ${itemData?.name || item.itemId} <button onclick="global.Trade.removeTradeItem('${tradeId}', '${item.id}')" style="float: right; background: #c44; border: none; color: white; padding: 0.1rem 0.3rem; border-radius: 0.2rem; cursor: pointer;">×</button>
                </div>`;
              }).join('')}
            </div>
            <div style="margin-bottom: 0.5rem;">
              <label style="display: block; margin-bottom: 0.25rem;">Gold:</label>
              <input type="number" id="myTradeGold" value="${myGold}" min="0" max="${player.gold || 0}" class="creation-input" onchange="global.Trade.updateTradeGold('${tradeId}', ${isPlayer1}, this.value)">
            </div>
            <button class="action-btn" onclick="global.Trade.addTradeItem('${tradeId}')" style="width: 100%;">Add Item</button>
          </div>
          <div>
            <h3 style="color: var(--gold-muted); margin-bottom: 0.5rem;">${otherPlayerName}'s Offer</h3>
            <div id="theirTradeItems" style="min-height: 200px; background: rgba(10, 14, 26, 0.4); border-radius: 0.25rem; padding: 0.5rem; margin-bottom: 0.5rem;">
              ${theirItems.length === 0 ? '<p style="color: var(--fg-secondary); font-style: italic; text-align: center;">No items</p>' : theirItems.map(item => {
                const itemData = global.REALM?.data?.itemsById?.[item.itemId];
                return `<div style="padding: 0.25rem; background: rgba(74, 138, 138, 0.2); border-radius: 0.25rem; margin-bottom: 0.25rem;">
                  ${itemData?.name || item.itemId}
                </div>`;
              }).join('')}
            </div>
            <div style="margin-bottom: 0.5rem;">
              <label style="display: block; margin-bottom: 0.25rem;">Gold:</label>
              <input type="text" value="${theirGold}" disabled class="creation-input" style="opacity: 0.6;">
            </div>
            <div style="color: var(--fg-secondary); font-size: 0.9rem;">
              ${theirAccepted ? '✓ Accepted' : 'Waiting...'}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button class="action-btn" ${myAccepted ? 'disabled' : ''} onclick="global.Trade.acceptTrade('${tradeId}')" style="flex: 1;">
            ${myAccepted ? 'Accepted' : 'Accept Trade'}
          </button>
          <button class="action-btn" onclick="global.Trade.cancelTrade('${tradeId}')" style="flex: 1; background: rgba(204, 68, 68, 0.3);">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function addTradeItem(tradeId) {
    const trade = activeTrades[tradeId];
    if (!trade) return;

    const player = global.State?.getPlayer();
    if (!player || !player.inventory) return;

    const isPlayer1 = trade.player1 === player.id;
    const myItems = isPlayer1 ? trade.player1Items : trade.player2Items;

    // Show inventory selection
    const itemSelect = player.inventory.map((item, index) => {
      const itemData = global.REALM?.data?.itemsById?.[item.itemId];
      return `<option value="${index}">${itemData?.name || item.itemId}</option>`;
    }).join('');

    if (!itemSelect) {
      global.ChatSystem?.addSystemMessage('Your inventory is empty.');
      return;
    }

    const itemIndex = prompt(`Select item to trade (0-${player.inventory.length - 1}):`);
    if (itemIndex === null) return;

    const index = parseInt(itemIndex);
    if (isNaN(index) || index < 0 || index >= player.inventory.length) {
      global.ChatSystem?.addSystemMessage('Invalid item selection.');
      return;
    }

    const item = player.inventory[index];
    myItems.push({ ...item, id: `trade_item_${Date.now()}_${Math.random()}` });
    
    // Remove from inventory temporarily (will be restored if trade cancelled)
    player.inventory.splice(index, 1);
    global.State.updatePlayer({ inventory: player.inventory });

    showTradeWindow(tradeId);
  }

  function removeTradeItem(tradeId, itemId) {
    const trade = activeTrades[tradeId];
    if (!trade) return;

    const player = global.State?.getPlayer();
    if (!player) return;

    const isPlayer1 = trade.player1 === player.id;
    const myItems = isPlayer1 ? trade.player1Items : trade.player2Items;

    const itemIndex = myItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;

    const item = myItems[itemIndex];
    myItems.splice(itemIndex, 1);

    // Return to inventory
    global.State.addItem(item.itemId);
    showTradeWindow(tradeId);
  }

  function updateTradeGold(tradeId, isPlayer1, gold) {
    const trade = activeTrades[tradeId];
    if (!trade) return;

    const amount = parseInt(gold) || 0;
    const player = global.State?.getPlayer();
    if (amount > (player?.gold || 0)) {
      global.ChatSystem?.addSystemMessage('You do not have enough gold.');
      return;
    }

    if (isPlayer1) {
      trade.player1Gold = amount;
    } else {
      trade.player2Gold = amount;
    }

    trade.player1Accepted = false;
    trade.player2Accepted = false;
  }

  function acceptTrade(tradeId) {
    const trade = activeTrades[tradeId];
    if (!trade) return;

    const player = global.State?.getPlayer();
    if (!player) return;

    const isPlayer1 = trade.player1 === player.id;

    if (isPlayer1) {
      trade.player1Accepted = true;
    } else {
      trade.player2Accepted = true;
    }

    // If both accepted, complete trade
    if (trade.player1Accepted && trade.player2Accepted) {
      completeTrade(tradeId);
    } else {
      showTradeWindow(tradeId);
    }
  }

  function completeTrade(tradeId) {
    const trade = activeTrades[tradeId];
    if (!trade) return;

    const player = global.State?.getPlayer();
    if (!player) return;

    const isPlayer1 = trade.player1 === player.id;

    // Give items and gold
    if (isPlayer1) {
      // Player 1 receives player 2's items and gold
      trade.player2Items.forEach(item => {
        global.State.addItem(item.itemId);
      });
      global.State.updatePlayer({ gold: (player.gold || 0) + trade.player2Gold - trade.player1Gold });
    } else {
      // Player 2 receives player 1's items and gold
      trade.player1Items.forEach(item => {
        global.State.addItem(item.itemId);
      });
      global.State.updatePlayer({ gold: (player.gold || 0) + trade.player1Gold - trade.player2Gold });
    }

    global.ChatSystem?.addSystemMessage('Trade completed!');
    global.Rendering?.updateInventory();
    global.Rendering?.updateResourceBar();

    // Close window
    const window = document.getElementById('tradeWindow');
    if (window) window.remove();

    delete activeTrades[tradeId];
  }

  function cancelTrade(tradeId) {
    const trade = activeTrades[tradeId];
    if (!trade) return;

    const player = global.State?.getPlayer();
    if (!player) return;

    const isPlayer1 = trade.player1 === player.id;
    const myItems = isPlayer1 ? trade.player1Items : trade.player2Items;

    // Return items to inventory
    myItems.forEach(item => {
      global.State.addItem(item.itemId);
    });

    global.ChatSystem?.addSystemMessage('Trade cancelled.');
    global.Rendering?.updateInventory();

    // Close window
    const window = document.getElementById('tradeWindow');
    if (window) window.remove();

    delete activeTrades[tradeId];
  }

  const Trade = {
    initiateTrade,
    showTradeWindow,
    addTradeItem,
    removeTradeItem,
    updateTradeGold,
    acceptTrade,
    cancelTrade
  };

  global.Trade = Trade;
})(window);


