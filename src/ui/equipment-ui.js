/**
 * Equipment UI System
 * 
 * Handles the equipment panel UI, allowing players to view and manage equipped items.
 * Supports multiple equipment slots: weapon, chest, head, legs, feet, hands, etc.
 */
(function (global) {
  let equipmentPanel = null;
  let isVisible = false;

  const EQUIPMENT_SLOTS = {
    weapon: { label: 'Weapon', icon: '⚔️', position: 'center' },
    head: { label: 'Head', icon: '⛑️', position: 'top' },
    chest: { label: 'Chest', icon: '🛡️', position: 'center' },
    legs: { label: 'Legs', icon: '👖', position: 'center' },
    feet: { label: 'Feet', icon: '👢', position: 'bottom' },
    hands: { label: 'Hands', icon: '🧤', position: 'center' },
    charm: { label: 'Charm', icon: '💎', position: 'right' }
  };

  function init() {
    // Create equipment panel
    const leftPanel = document.querySelector('.game-panel--left');
    if (!leftPanel) return;

    equipmentPanel = document.createElement('div');
    equipmentPanel.id = 'equipmentPanel';
    equipmentPanel.className = 'equipment-panel';
    equipmentPanel.hidden = true;

    equipmentPanel.innerHTML = `
      <div class="equipment-panel-header">
        <h3 class="panel-subtitle">Equipment</h3>
        <button class="equipment-close-btn" id="equipmentCloseBtn" aria-label="Close equipment">×</button>
      </div>
      <div class="equipment-slots-container">
        <div class="equipment-slot-row equipment-slot-row--top">
          <div class="equipment-slot" data-slot="head" title="Head">
            <div class="equipment-slot-icon">⛑️</div>
            <div class="equipment-slot-label">Head</div>
          </div>
        </div>
        <div class="equipment-slot-row equipment-slot-row--center">
          <div class="equipment-slot" data-slot="weapon" title="Weapon">
            <div class="equipment-slot-icon">⚔️</div>
            <div class="equipment-slot-label">Weapon</div>
          </div>
          <div class="equipment-slot" data-slot="chest" title="Chest">
            <div class="equipment-slot-icon">🛡️</div>
            <div class="equipment-slot-label">Chest</div>
          </div>
          <div class="equipment-slot" data-slot="charm" title="Charm">
            <div class="equipment-slot-icon">💎</div>
            <div class="equipment-slot-label">Charm</div>
          </div>
        </div>
        <div class="equipment-slot-row equipment-slot-row--center">
          <div class="equipment-slot" data-slot="hands" title="Hands">
            <div class="equipment-slot-icon">🧤</div>
            <div class="equipment-slot-label">Hands</div>
          </div>
          <div class="equipment-slot" data-slot="legs" title="Legs">
            <div class="equipment-slot-icon">👖</div>
            <div class="equipment-slot-label">Legs</div>
          </div>
        </div>
        <div class="equipment-slot-row equipment-slot-row--bottom">
          <div class="equipment-slot" data-slot="feet" title="Feet">
            <div class="equipment-slot-icon">👢</div>
            <div class="equipment-slot-label">Feet</div>
          </div>
        </div>
      </div>
      <div class="equipment-stats-summary" id="equipmentStatsSummary">
        <div class="equipment-stats-title">Equipment Bonuses</div>
        <div class="equipment-stats-list" id="equipmentStatsList"></div>
      </div>
    `;

    // Insert after inventory container
    const inventoryContainer = leftPanel.querySelector('.inventory-container');
    if (inventoryContainer) {
      leftPanel.insertBefore(equipmentPanel, inventoryContainer.nextSibling);
    } else {
      leftPanel.appendChild(equipmentPanel);
    }

    // Event listeners
    const closeBtn = document.getElementById('equipmentCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        hide();
      });
    }

    // Add click handlers to equipment slots
    equipmentPanel.querySelectorAll('.equipment-slot').forEach(slot => {
      slot.addEventListener('click', (e) => {
        const slotName = slot.dataset.slot;
        if (slotName) {
          handleSlotClick(slotName, slot);
        }
      });

      // Hover tooltip
      slot.addEventListener('mouseenter', (e) => {
        const slotName = slot.dataset.slot;
        if (slotName) {
          showSlotTooltip(e, slotName, slot);
        }
      });

      slot.addEventListener('mouseleave', () => {
        hideSlotTooltip();
      });
    });
  }

  function show() {
    if (!equipmentPanel) init();
    if (equipmentPanel) {
      equipmentPanel.hidden = false;
      isVisible = true;
      update();
    }
  }

  function hide() {
    if (equipmentPanel) {
      equipmentPanel.hidden = true;
      isVisible = false;
    }
  }

  function toggle() {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }

  function update() {
    if (!equipmentPanel || !isVisible) return;

    const player = global.State?.getPlayer();
    if (!player) return;

    const equipment = player.equipment || {};

    // Update each slot
    Object.keys(EQUIPMENT_SLOTS).forEach(slotName => {
      const slotEl = equipmentPanel.querySelector(`[data-slot="${slotName}"]`);
      if (!slotEl) return;

      const itemId = equipment[slotName];
      if (itemId) {
        const itemData = global.REALM?.data?.itemsById?.[itemId];
        if (itemData) {
          // Get item instance from inventory or equipment
          const itemInstance = findItemInstance(itemId, player);
          const durability = itemInstance?.durability;
          const maxDurability = itemData.maxDurability || itemData.durability || 100;

          slotEl.classList.add('equipment-slot--filled');
          slotEl.innerHTML = `
            <div class="equipment-slot-item-icon" style="font-size: 1.5rem;">${itemData.icon || '📦'}</div>
            <div class="equipment-slot-item-name">${itemData.name || itemId}</div>
            ${durability !== undefined ? `
              <div class="equipment-slot-durability">
                <div class="durability-bar">
                  <div class="durability-fill" style="width: ${(durability / maxDurability) * 100}%"></div>
                </div>
                <div class="durability-text">${durability}/${maxDurability}</div>
              </div>
            ` : ''}
          `;

          // Add click handler for unequip
          slotEl.addEventListener('click', () => {
            handleUnequip(slotName);
          });
        } else {
          slotEl.classList.remove('equipment-slot--filled');
          slotEl.innerHTML = `
            <div class="equipment-slot-icon">${EQUIPMENT_SLOTS[slotName].icon}</div>
            <div class="equipment-slot-label">${EQUIPMENT_SLOTS[slotName].label}</div>
          `;
        }
      } else {
        slotEl.classList.remove('equipment-slot--filled');
        slotEl.innerHTML = `
          <div class="equipment-slot-icon">${EQUIPMENT_SLOTS[slotName].icon}</div>
          <div class="equipment-slot-label">${EQUIPMENT_SLOTS[slotName].label}</div>
        `;
      }
    });

    // Update stats summary
    updateStatsSummary();
  }

  function findItemInstance(itemId, player) {
    // Check inventory
    const invItem = player.inventory?.find(item => item.itemId === itemId);
    if (invItem) return invItem;

    // Check equipment items (durability tracking for equipped items)
    if (player.equipmentItems && player.equipmentItems[itemId]) {
      return player.equipmentItems[itemId];
    }

    return null;
  }

  function handleSlotClick(slotName, slotEl) {
    const player = global.State?.getPlayer();
    if (!player) return;

    const itemId = player.equipment?.[slotName];
    if (itemId) {
      // Unequip
      handleUnequip(slotName);
    } else {
      // Show inventory to equip (could open a selection dialog)
      // For now, just show a message
      global.Narrative?.addEntry({
        type: 'system',
        text: `Click an item in your inventory to equip it to the ${EQUIPMENT_SLOTS[slotName].label} slot.`,
        meta: 'System'
      });
    }
  }

  function handleUnequip(slotName) {
    const player = global.State?.getPlayer();
    if (!player || !player.equipment) return;

    const itemId = player.equipment[slotName];
    if (!itemId) return;

    // Try to add back to inventory
    if (global.State?.addItem(itemId)) {
      player.equipment[slotName] = null;
      global.State?.updatePlayer({ equipment: player.equipment });
      update();
      global.Rendering?.updateInventory();
      global.Rendering?.updateCharacterPanel();

      const itemData = global.REALM?.data?.itemsById?.[itemId];
      global.Narrative?.addEntry({
        type: 'system',
        text: `Unequipped ${itemData?.name || itemId}.`,
        meta: 'System'
      });
    } else {
      global.Narrative?.addEntry({
        type: 'error',
        text: 'Inventory is full! Cannot unequip item.',
        meta: 'System'
      });
    }
  }

  function showSlotTooltip(event, slotName, slotEl) {
    const player = global.State?.getPlayer();
    if (!player) return;

    const itemId = player.equipment?.[slotName];
    if (!itemId) return;

    const itemData = global.REALM?.data?.itemsById?.[itemId];
    if (!itemData) return;

    const tooltip = document.getElementById('itemTooltip');
    if (!tooltip) return;

    const itemInstance = findItemInstance(itemId, player);
    const durability = itemInstance?.durability;
    const maxDurability = itemData.maxDurability || itemData.durability || 100;

    let tooltipHTML = `<div class="tooltip-item-name">${itemData.name || itemId.replace(/_/g, ' ')}</div>`;
    
    if (itemData.description) {
      tooltipHTML += `<div class="tooltip-item-description">${itemData.description}</div>`;
    }
    
    if (itemData.stats) {
      tooltipHTML += `<div class="tooltip-item-stats">`;
      if (itemData.stats.atk) tooltipHTML += `<div>Attack: +${itemData.stats.atk}</div>`;
      if (itemData.stats.def) tooltipHTML += `<div>Defense: +${itemData.stats.def}</div>`;
      if (itemData.stats.all) tooltipHTML += `<div>All Stats: +${itemData.stats.all}</div>`;
      if (itemData.stats.hp) tooltipHTML += `<div>Health: +${itemData.stats.hp}</div>`;
      if (itemData.stats.mana) tooltipHTML += `<div>Mana: +${itemData.stats.mana}</div>`;
      tooltipHTML += `</div>`;
    }

    if (durability !== undefined) {
      const durabilityPercent = (durability / maxDurability) * 100;
      let durabilityColor = '#4a8a8a';
      if (durabilityPercent < 25) durabilityColor = '#c97d3d';
      else if (durabilityPercent < 50) durabilityColor = '#d4af37';
      
      tooltipHTML += `<div class="tooltip-item-durability" style="color: ${durabilityColor}">Durability: ${durability}/${maxDurability}</div>`;
    }
    
    if (itemData.type) {
      tooltipHTML += `<div class="tooltip-item-type">Type: ${itemData.type}</div>`;
    }
    
    if (itemData.rarity) {
      tooltipHTML += `<div class="tooltip-item-rarity">Rarity: ${itemData.rarity}</div>`;
    }

    tooltip.innerHTML = tooltipHTML;
    tooltip.classList.add('tooltip--item');
    tooltip.classList.remove('hidden');
    tooltip.hidden = false;
    
    updateTooltipPosition(event, tooltip);
  }

  function hideSlotTooltip() {
    const tooltip = document.getElementById('itemTooltip');
    if (tooltip) {
      tooltip.classList.add('hidden');
      tooltip.hidden = true;
    }
  }

  function updateTooltipPosition(event, tooltip) {
    const offset = 15;
    const x = event.clientX + offset;
    const y = event.clientY + offset;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  function updateStatsSummary() {
    const player = global.State?.getPlayer();
    if (!player) return;

    const statsListEl = document.getElementById('equipmentStatsList');
    if (!statsListEl) return;

    const equipment = player.equipment || {};
    const bonuses = {
      atk: 0,
      def: 0,
      hp: 0,
      mana: 0,
      all: 0
    };

    Object.values(equipment).forEach(itemId => {
      if (!itemId) return;
      const itemData = global.REALM?.data?.itemsById?.[itemId];
      if (!itemData || !itemData.stats) return;

      if (itemData.stats.atk) bonuses.atk += itemData.stats.atk;
      if (itemData.stats.def) bonuses.def += itemData.stats.def;
      if (itemData.stats.hp) bonuses.hp += itemData.stats.hp;
      if (itemData.stats.mana) bonuses.mana += itemData.stats.mana;
      if (itemData.stats.all) {
        bonuses.all += itemData.stats.all;
        bonuses.atk += itemData.stats.all;
        bonuses.def += itemData.stats.all;
      }
    });

    let html = '';
    if (bonuses.atk > 0) html += `<div class="equipment-stat-item">⚔️ Attack: +${bonuses.atk}</div>`;
    if (bonuses.def > 0) html += `<div class="equipment-stat-item">🛡️ Defense: +${bonuses.def}</div>`;
    if (bonuses.hp > 0) html += `<div class="equipment-stat-item">❤️ Health: +${bonuses.hp}</div>`;
    if (bonuses.mana > 0) html += `<div class="equipment-stat-item">💙 Mana: +${bonuses.mana}</div>`;
    if (Object.values(bonuses).every(v => v === 0)) {
      html = '<div class="equipment-stat-item equipment-stat-item--empty">No equipment bonuses</div>';
    }

    statsListEl.innerHTML = html;
  }

  const EquipmentUI = {
    init,
    show,
    hide,
    toggle,
    update,
    isVisible: () => isVisible
  };

  global.EquipmentUI = EquipmentUI;
})(window);

