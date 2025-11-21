/**
 * Repair System
 * 
 * Handles item repair at anvils/repair benches in towns.
 */
(function (global) {
  function canRepair(player) {
    // Check if player is near a repair bench/anvil
    // For now, check if player is in a city/town zone
    const zone = global.Zones?.getCurrentZone();
    if (!zone) return false;

    // Check if zone is a city (has repair facilities)
    const isCity = zone.type === 'city' || zone.type === 'town' || 
                   zone.flags?.includes('city') || zone.flags?.includes('town');
    
    return isCity;
  }

  function getRepairCost(itemId, itemInstance) {
    const itemData = global.REALM?.data?.itemsById?.[itemId];
    if (!itemData) return 0;

    const maxDurability = itemInstance?.maxDurability || itemData.maxDurability || itemData.durability || 100;
    const currentDurability = itemInstance?.durability || maxDurability;
    const missingDurability = maxDurability - currentDurability;
    
    if (missingDurability <= 0) return 0; // Already at full durability

    // Base repair cost: 1 gold per point of durability
    const baseCost = missingDurability;
    
    // Scale by item value (more valuable items cost more to repair)
    const itemValue = itemData.value || 10;
    const valueMultiplier = 1 + (itemValue / 100); // 1% per gold of item value
    
    return Math.ceil(baseCost * valueMultiplier);
  }

  function repairItem(itemId, itemInstance) {
    const player = global.State?.getPlayer();
    if (!player) return { success: false, message: 'Player not found.' };

    if (!canRepair(player)) {
      return { success: false, message: 'You must be in a town to repair items.' };
    }

    const itemData = global.REALM?.data?.itemsById?.[itemId];
    if (!itemData) {
      return { success: false, message: 'Item not found.' };
    }

    const maxDurability = itemInstance?.maxDurability || itemData.maxDurability || itemData.durability || 100;
    const currentDurability = itemInstance?.durability || maxDurability;

    if (currentDurability >= maxDurability) {
      return { success: false, message: 'Item is already at full durability.' };
    }

    const cost = getRepairCost(itemId, itemInstance);
    if (player.gold < cost) {
      return { success: false, message: `You need ${cost} gold to repair this item.` };
    }

    // Repair the item
    itemInstance.durability = maxDurability;
    player.gold -= cost;

    // Update state
    global.State?.updatePlayer({
      gold: player.gold,
      equipmentItems: player.equipmentItems,
      inventory: player.inventory
    });

    // Update UI
    global.Rendering?.updateCharacterPanel();
    global.Rendering?.updateInventory();
    global.EquipmentUI?.update();

    return {
      success: true,
      message: `Repaired ${itemData.name || itemId} for ${cost} gold.`,
      cost: cost
    };
  }

  function repairAllItems() {
    const player = global.State?.getPlayer();
    if (!player) return { success: false, message: 'Player not found.' };

    if (!canRepair(player)) {
      return { success: false, message: 'You must be in a town to repair items.' };
    }

    let totalCost = 0;
    const repairedItems = [];

    // Repair equipped items
    if (player.equipment && player.equipmentItems) {
      Object.keys(player.equipment).forEach(slot => {
        const itemId = player.equipment[slot];
        if (!itemId) return;

        const itemInstance = player.equipmentItems[itemId];
        if (!itemInstance || itemInstance.durability === undefined) return;

        const cost = getRepairCost(itemId, itemInstance);
        if (cost > 0) {
          totalCost += cost;
          itemInstance.durability = itemInstance.maxDurability || 
                                   global.REALM?.data?.itemsById?.[itemId]?.maxDurability || 
                                   global.REALM?.data?.itemsById?.[itemId]?.durability || 100;
          repairedItems.push(itemId);
        }
      });
    }

    // Repair inventory items
    if (player.inventory) {
      player.inventory.forEach(invItem => {
        if (!invItem.durability || invItem.durability === undefined) return;

        const maxDurability = invItem.maxDurability || 
                             global.REALM?.data?.itemsById?.[invItem.itemId]?.maxDurability || 
                             global.REALM?.data?.itemsById?.[invItem.itemId]?.durability || 100;
        
        if (invItem.durability < maxDurability) {
          const cost = getRepairCost(invItem.itemId, invItem);
          if (cost > 0) {
            totalCost += cost;
            invItem.durability = maxDurability;
            repairedItems.push(invItem.itemId);
          }
        }
      });
    }

    if (totalCost === 0) {
      return { success: false, message: 'No items need repair.' };
    }

    if (player.gold < totalCost) {
      return { success: false, message: `You need ${totalCost} gold to repair all items.` };
    }

    player.gold -= totalCost;

    global.State?.updatePlayer({
      gold: player.gold,
      equipmentItems: player.equipmentItems,
      inventory: player.inventory
    });

    global.Rendering?.updateCharacterPanel();
    global.Rendering?.updateInventory();
    global.EquipmentUI?.update();

    return {
      success: true,
      message: `Repaired ${repairedItems.length} item(s) for ${totalCost} gold.`,
      cost: totalCost,
      count: repairedItems.length
    };
  }

  function showRepairInterface() {
    const player = global.State?.getPlayer();
    if (!player) return;

    if (!canRepair(player)) {
      global.Narrative?.addEntry({
        type: 'error',
        text: 'You must be in a town to repair items. Find an anvil or repair bench.',
        meta: 'Repair'
      });
      return;
    }

    // Create repair overlay
    const overlay = document.createElement('div');
    overlay.id = 'repairOverlay';
    overlay.className = 'character-creation-overlay';
    overlay.innerHTML = `
      <div class="character-creation-panel">
        <div class="character-creation-header">
          <h2>🔨 Repair Items</h2>
          <button class="character-creation-close" id="repairCloseBtn">×</button>
        </div>
        <div class="repair-content">
          <p style="margin-bottom: 1rem; color: var(--fg-secondary);">
            Repair your equipment at the anvil. Items slowly lose durability over time.
          </p>
          <div class="repair-actions">
            <button class="action-btn" id="repairAllBtn" style="width: 100%; margin-bottom: 0.5rem;">
              Repair All Items
            </button>
            <div class="repair-items-list" id="repairItemsList"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close button
    const closeBtn = document.getElementById('repairCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        overlay.remove();
      });
    }

    // Repair all button
    const repairAllBtn = document.getElementById('repairAllBtn');
    if (repairAllBtn) {
      repairAllBtn.addEventListener('click', () => {
        const result = repairAllItems();
        if (result.success) {
          global.Narrative?.addEntry({
            type: 'system',
            text: result.message,
            meta: 'Repair'
          });
          updateRepairList();
        } else {
          global.Narrative?.addEntry({
            type: 'error',
            text: result.message,
            meta: 'Repair'
          });
        }
      });
    }

    function updateRepairList() {
      const listEl = document.getElementById('repairItemsList');
      if (!listEl) return;

      let html = '<div style="margin-top: 1rem;"><strong>Items needing repair:</strong></div>';

      const itemsNeedingRepair = [];

      // Check equipped items
      if (player.equipment && player.equipmentItems) {
        Object.keys(player.equipment).forEach(slot => {
          const itemId = player.equipment[slot];
          if (!itemId) return;

          const itemInstance = player.equipmentItems[itemId];
          if (!itemInstance || itemInstance.durability === undefined) return;

          const itemData = global.REALM?.data?.itemsById?.[itemId];
          if (!itemData) return;

          const maxDurability = itemInstance.maxDurability || itemData.maxDurability || itemData.durability || 100;
          if (itemInstance.durability < maxDurability) {
            const cost = getRepairCost(itemId, itemInstance);
            itemsNeedingRepair.push({
              itemId,
              itemData,
              itemInstance,
              cost,
              slot: `Equipped (${slot})`
            });
          }
        });
      }

      // Check inventory items
      if (player.inventory) {
        player.inventory.forEach(invItem => {
          if (!invItem.durability || invItem.durability === undefined) return;

          const itemData = global.REALM?.data?.itemsById?.[invItem.itemId];
          if (!itemData) return;

          const maxDurability = invItem.maxDurability || itemData.maxDurability || itemData.durability || 100;
          if (invItem.durability < maxDurability) {
            const cost = getRepairCost(invItem.itemId, invItem);
            itemsNeedingRepair.push({
              itemId: invItem.itemId,
              itemData,
              itemInstance: invItem,
              cost,
              slot: 'Inventory'
            });
          }
        });
      }

      if (itemsNeedingRepair.length === 0) {
        html += '<div style="margin-top: 0.5rem; color: var(--fg-secondary);">All items are at full durability!</div>';
      } else {
        itemsNeedingRepair.forEach(item => {
          const durabilityPercent = (item.itemInstance.durability / (item.itemInstance.maxDurability || 100)) * 100;
          html += `
            <div class="repair-item-entry" style="padding: 0.5rem; margin: 0.5rem 0; border: 1px solid var(--border-subtle); border-radius: 0.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong>${item.itemData.name || item.itemId}</strong>
                  <div style="font-size: 0.85rem; color: var(--fg-secondary);">${item.slot}</div>
                  <div style="font-size: 0.85rem; color: ${durabilityPercent < 25 ? '#c97d3d' : '#d4af37'};">
                    Durability: ${item.itemInstance.durability}/${item.itemInstance.maxDurability || 100}
                  </div>
                </div>
                <div>
                  <button class="action-btn" data-repair-item="${item.itemId}" data-repair-slot="${item.slot}">
                    Repair (${item.cost} gold)
                  </button>
                </div>
              </div>
            </div>
          `;
        });
      }

      listEl.innerHTML = html;

      // Add repair button handlers
      listEl.querySelectorAll('[data-repair-item]').forEach(btn => {
        btn.addEventListener('click', () => {
          const itemId = btn.dataset.repairItem;
          const slot = btn.dataset.repairSlot;

          // Find the item instance
          let itemInstance = null;
          if (slot.startsWith('Equipped')) {
            itemInstance = player.equipmentItems?.[itemId];
          } else {
            itemInstance = player.inventory?.find(item => item.itemId === itemId);
          }

          if (itemInstance) {
            const result = repairItem(itemId, itemInstance);
            if (result.success) {
              global.Narrative?.addEntry({
                type: 'system',
                text: result.message,
                meta: 'Repair'
              });
              updateRepairList();
            } else {
              global.Narrative?.addEntry({
                type: 'error',
                text: result.message,
                meta: 'Repair'
              });
            }
          }
        });
      });
    }

    updateRepairList();
  }

  const RepairSystem = {
    canRepair,
    getRepairCost,
    repairItem,
    repairAllItems,
    showRepairInterface
  };

  global.RepairSystem = RepairSystem;
})(window);

