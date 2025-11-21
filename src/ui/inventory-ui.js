/**
 * Inventory UI Enhancements
 * 
 * Adds minimize/maximize functionality to inventory panel
 */

(function (global) {
  let inventoryToggleBtn = null;
  let inventoryContainer = null;

  /**
   * Initialize inventory UI enhancements
   */
  function init() {
    inventoryToggleBtn = document.getElementById('inventoryToggleBtn');
    inventoryContainer = document.querySelector('.inventory-container');
    
    if (!inventoryToggleBtn || !inventoryContainer) {
      // Wait for DOM to be ready
      setTimeout(init, 100);
      return;
    }
    
    inventoryToggleBtn.addEventListener('click', () => {
      toggleInventory();
    });
    
    console.log('[InventoryUI] Initialized inventory minimize/maximize');
  }

  /**
   * Toggle inventory minimized/maximized state
   */
  function toggleInventory() {
    if (!inventoryContainer) return;
    
    const isMinimized = inventoryContainer.classList.contains('inventory-container--minimized');
    
    if (isMinimized) {
      inventoryContainer.classList.remove('inventory-container--minimized');
      if (inventoryToggleBtn) inventoryToggleBtn.textContent = '▼';
    } else {
      inventoryContainer.classList.add('inventory-container--minimized');
      if (inventoryToggleBtn) inventoryToggleBtn.textContent = '▲';
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  const InventoryUI = {
    init,
    toggleInventory
  };

  global.InventoryUI = InventoryUI;
})(window);

