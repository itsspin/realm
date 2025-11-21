/**
 * Mobile Menu Handler
 * 
 * Handles:
 * - Mobile menu button toggle
 * - Panel slide-in/out animations
 * - Touch gestures for panels
 * - Mobile-specific UI interactions
 */

(function (global) {
  let isMenuOpen = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let swipeThreshold = 50; // Minimum distance for swipe

  /**
   * Initialize mobile menu
   */
  function initialize() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const leftPanel = document.querySelector('.game-panel--left');
    
    if (!menuBtn || !leftPanel) return;

    // Toggle menu on button click
    menuBtn.addEventListener('click', toggleMenu);
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (isMenuOpen && !leftPanel.contains(e.target) && !menuBtn.contains(e.target)) {
        closeMenu();
      }
    });

    // Touch swipe to open/close menu
    setupSwipeGestures(leftPanel);

    // Close menu on orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        if (isMenuOpen) {
          closeMenu();
        }
      }, 100);
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isMenuOpen) {
        closeMenu();
      }
    });
  }

  /**
   * Toggle mobile menu
   */
  function toggleMenu() {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  /**
   * Open mobile menu
   */
  function openMenu() {
    const leftPanel = document.querySelector('.game-panel--left');
    const menuBtn = document.getElementById('mobileMenuBtn');
    
    if (!leftPanel || !menuBtn) return;

    leftPanel.classList.add('mobile-open');
    menuBtn.textContent = '✕';
    menuBtn.setAttribute('aria-expanded', 'true');
    isMenuOpen = true;

    // Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close mobile menu
   */
  function closeMenu() {
    const leftPanel = document.querySelector('.game-panel--left');
    const menuBtn = document.getElementById('mobileMenuBtn');
    
    if (!leftPanel || !menuBtn) return;

    leftPanel.classList.remove('mobile-open');
    menuBtn.textContent = '☰';
    menuBtn.setAttribute('aria-expanded', 'false');
    isMenuOpen = false;

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Setup swipe gestures for panels
   */
  function setupSwipeGestures(panel) {
    if (!panel) return;

    // Touch start
    panel.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    // Touch move - track swipe
    panel.addEventListener('touchmove', (e) => {
      if (!isMenuOpen) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - touchStartX;
      const deltaY = touchY - touchStartY;

      // Check if horizontal swipe (more horizontal than vertical)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        // Swiping left - close menu
        if (deltaX < 0) {
          closeMenu();
        }
      }
    }, { passive: true });

    // Swipe to open menu from left edge
    document.addEventListener('touchstart', (e) => {
      if (isMenuOpen) return;
      
      // Check if touch started at left edge of screen (< 20px from left)
      if (e.touches[0].clientX < 20) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (isMenuOpen) return;
      if (touchStartX === 0 || touchStartX >= 20) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - touchStartX;
      const deltaY = touchY - touchStartY;

      // Check if horizontal swipe right (more horizontal than vertical)
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > swipeThreshold) {
        // Swiping right from left edge - open menu
        openMenu();
        touchStartX = 0; // Reset
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      touchStartX = 0;
      touchStartY = 0;
    }, { passive: true });
  }

  /**
   * Check if device is mobile
   */
  function isMobile() {
    return window.innerWidth <= 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Show/hide mobile menu button based on screen size
   */
  function updateMobileMenuVisibility() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    if (!menuBtn) return;

    if (isMobile()) {
      menuBtn.style.display = 'flex';
      if (isMenuOpen && window.innerWidth > 768) {
        closeMenu(); // Close menu if screen size increased
      }
    } else {
      menuBtn.style.display = 'none';
      closeMenu(); // Always close menu on desktop
    }
  }

  // Update on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateMobileMenuVisibility, 100);
  });

  // Initial check
  updateMobileMenuVisibility();

  const MobileMenu = {
    initialize,
    toggleMenu,
    openMenu,
    closeMenu,
    isMobile
  };

  global.MobileMenu = MobileMenu;

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }
})(window);

