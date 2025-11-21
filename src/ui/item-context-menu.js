/**
 * Item Context Menu
 * 
 * Shows context menu when clicking items in inventory with options like Equip, Use, etc.
 */
(function (global) {
  let contextMenu = null;
  let currentItemId = null;

  function init() {
    // Create context menu element
    contextMenu = document.createElement('div');
    contextMenu.id = 'itemContextMenu';
    contextMenu.className = 'item-context-menu';
    contextMenu.hidden = true;
    contextMenu.style.display = 'none';
    document.body.appendChild(contextMenu);
  }

  function show(event, itemId) {
    if (!contextMenu) init();
    
    const player = global.State?.getPlayer();
    if (!player) return;

    const inventoryItem = player.inventory?.find(item => item.itemId === itemId);
    if (!inventoryItem) return;

    const itemData = global.REALM?.data?.itemsById?.[itemId];
    if (!itemData) return;

    currentItemId = itemId;

    // Build menu options
    let menuHTML = `<div class="context-menu-item-name">${itemData.name || itemId.replace(/_/g, ' ')}</div>`;
    menuHTML += '<div class="context-menu-divider"></div>';

    // Equip option (if equippable)
    if (itemData.type === 'weapon' || itemData.type === 'armor' || itemData.slot) {
      menuHTML += `<button class="context-menu-option" data-action="equip">⚔️ Equip</button>`;
    }

    // Use option (if consumable)
    if (itemData.type === 'consumable' || itemData.effect) {
      menuHTML += `<button class="context-menu-option" data-action="use">🍶 Use</button>`;
    }

    // Drop option
    menuHTML += `<button class="context-menu-option" data-action="drop">🗑️ Drop</button>`;

    contextMenu.innerHTML = menuHTML;

    // Position menu near cursor
    const x = event.clientX;
    const y = event.clientY;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;

    // Show menu
    contextMenu.hidden = false;
    contextMenu.style.display = 'block';

    // Add event listeners
    contextMenu.querySelectorAll('.context-menu-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAction(option.dataset.action);
        hide();
      });
    });

    // Hide on outside click
    setTimeout(() => {
      document.addEventListener('click', hideOnOutsideClick, true);
    }, 0);
  }

  function hide() {
    if (contextMenu) {
      contextMenu.hidden = true;
      contextMenu.style.display = 'none';
      currentItemId = null;
      document.removeEventListener('click', hideOnOutsideClick, true);
    }
  }

  function hideOnOutsideClick(event) {
    if (contextMenu && !contextMenu.contains(event.target)) {
      hide();
    }
  }

  function handleAction(action) {
    if (!currentItemId) return;

    const player = global.State?.getPlayer();
    if (!player) return;

    switch (action) {
      case 'equip':
        if (global.Inventory && typeof global.Inventory.equipItem === 'function') {
          global.Inventory.equipItem(currentItemId);
        }
        break;
      case 'use':
        // TODO: Implement item use
        global.Narrative?.addEntry({
          type: 'system',
          text: 'Item use not yet implemented.',
          meta: 'System'
        });
        break;
      case 'drop':
        // Remove from inventory
        if (global.State && typeof global.State.removeItem === 'function') {
          global.State.removeItem(currentItemId);
          global.Rendering?.updateInventory();
          global.Narrative?.addEntry({
            type: 'system',
            text: `Dropped ${global.REALM?.data?.itemsById?.[currentItemId]?.name || currentItemId}.`,
            meta: 'System'
          });
        }
        break;
    }
  }

  const ItemContextMenu = {
    init,
    show,
    hide
  };

  global.ItemContextMenu = ItemContextMenu;
})(window);

