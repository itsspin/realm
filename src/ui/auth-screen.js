/**
 * Authentication Screen UI
 * 
 * Handles login and registration UI.
 */

(function (global) {
  let authOverlay = null;
  let currentMode = 'login'; // 'login' or 'register'

  /**
   * Show authentication screen
   */
  function showAuthScreen() {
    if (authOverlay) {
      authOverlay.remove();
    }

    authOverlay = document.createElement('div');
    authOverlay.className = 'auth-overlay';
    authOverlay.innerHTML = `
      <div class="auth-panel">
        <h1 class="auth-title">REALM</h1>
        <div class="auth-tabs">
          <button class="auth-tab ${currentMode === 'login' ? 'active' : ''}" data-mode="login">Login</button>
          <button class="auth-tab ${currentMode === 'register' ? 'active' : ''}" data-mode="register">Register</button>
        </div>
        
        <div class="auth-form-container">
          <form id="authForm" class="auth-form">
            <div class="auth-field">
              <label for="authEmail">Email</label>
              <input type="email" id="authEmail" required autocomplete="email" />
            </div>
            
            <div class="auth-field" id="usernameField" style="display: ${currentMode === 'register' ? 'block' : 'none'};">
              <label for="authUsername">Username</label>
              <input type="text" id="authUsername" autocomplete="username" />
            </div>
            
            <div class="auth-field">
              <label for="authPassword">Password</label>
              <input type="password" id="authPassword" required autocomplete="${currentMode === 'login' ? 'current-password' : 'new-password'}" />
            </div>
            
            <div id="authError" class="auth-error" style="display: none;"></div>
            
            <button type="submit" class="auth-submit-btn">
              ${currentMode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
        </div>
        
        <div class="auth-footer">
          <p>For demo purposes, you can use any email/password combination.</p>
        </div>
      </div>
    `;

    document.body.appendChild(authOverlay);

    // Tab switching
    authOverlay.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentMode = tab.dataset.mode;
        authOverlay.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const usernameField = document.getElementById('usernameField');
        const form = document.getElementById('authForm');
        const submitBtn = form.querySelector('.auth-submit-btn');
        
        if (currentMode === 'register') {
          usernameField.style.display = 'block';
          document.getElementById('authUsername').required = true;
          submitBtn.textContent = 'Register';
        } else {
          usernameField.style.display = 'none';
          document.getElementById('authUsername').required = false;
          submitBtn.textContent = 'Login';
        }
        
        document.getElementById('authError').style.display = 'none';
      });
    });

    // Form submission
    const form = document.getElementById('authForm');
    form.addEventListener('submit', handleAuthSubmit);
  }

  /**
   * Handle authentication form submission
   */
  async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const errorEl = document.getElementById('authError');
    errorEl.style.display = 'none';
    errorEl.textContent = '';

    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const username = currentMode === 'register' ? document.getElementById('authUsername').value.trim() : null;

    if (!email || !password) {
      showError('Email and password are required');
      return;
    }

    if (currentMode === 'register' && !username) {
      showError('Username is required');
      return;
    }

    try {
      const submitBtn = form.querySelector('.auth-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = currentMode === 'login' ? 'Logging in...' : 'Registering...';

      if (currentMode === 'register') {
        await global.Auth?.register(email, username, password);
      } else {
        await global.Auth?.login(email, password);
      }

      // Success - hide auth screen
      hideAuthScreen();
      
      // Check if we have backend - if not, go directly to character creation
      const hasBackend = (window.REALM_SUPABASE_URL && window.REALM_SUPABASE_ANON_KEY) || 
                        (window.REALM_API_URL && window.REALM_API_URL !== 'http://localhost:3000/api');
      
      if (hasBackend && global.CharacterSelect) {
        // Backend mode: show character select
        global.CharacterSelect.show();
      } else {
        // Local-only mode: check if character exists, if not show creation
        const player = global.State?.getPlayer();
        if (!player || !player.race || !player.class || !player.name) {
          // Show character creation
          if (global.CharacterCreation && typeof global.CharacterCreation.showCharacterCreation === 'function') {
            global.CharacterCreation.showCharacterCreation();
          }
        } else {
          // Character exists, initialize game
          if (window.App && window.App.initializeGame) {
            window.App.initializeGame();
          } else if (global.App && global.App.initializeGame) {
            global.App.initializeGame();
          }
        }
      }
    } catch (error) {
      showError(error.message || 'Authentication failed. Please try again.');
      const submitBtn = form.querySelector('.auth-submit-btn');
      submitBtn.disabled = false;
      submitBtn.textContent = currentMode === 'login' ? 'Login' : 'Register';
    }
  }

  /**
   * Show error message
   */
  function showError(message) {
    const errorEl = document.getElementById('authError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  /**
   * Hide authentication screen
   */
  function hideAuthScreen() {
    if (authOverlay) {
      authOverlay.remove();
      authOverlay = null;
    }
  }

  const AuthScreen = {
    show: showAuthScreen,
    hide: hideAuthScreen
  };

  global.AuthScreen = AuthScreen;
})(window);

