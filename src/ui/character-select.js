/**
 * Character Select Screen
 * 
 * Shows list of characters and allows selection or creation.
 */

(function (global) {
  let selectOverlay = null;
  let characters = [];
  let isLoading = false;

  /**
   * Show character select screen
   */
  async function showCharacterSelect() {
    if (selectOverlay) {
      selectOverlay.remove();
    }

    selectOverlay = document.createElement('div');
    selectOverlay.className = 'character-select-overlay';
    selectOverlay.innerHTML = `
      <div class="character-select-panel">
        <h1 class="character-select-title">Select Character</h1>
        
        <div class="character-select-header">
          <div class="account-info">
            <span id="accountUsername">Loading...</span>
            <button id="logoutBtn" class="logout-btn">Logout</button>
          </div>
        </div>
        
        <div id="characterList" class="character-list">
          <div class="loading-spinner">Loading characters...</div>
        </div>
        
        <div class="character-select-actions">
          <button id="createCharacterBtn" class="create-character-btn" ${isLoading ? 'disabled' : ''}>
            Create New Character
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(selectOverlay);

    // Update account info
    const user = global.Auth?.getCurrentUser();
    if (user) {
      document.getElementById('accountUsername').textContent = user.username || user.email;
    }

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      if (confirm('Are you sure you want to logout?')) {
        global.Auth?.logout();
        hideCharacterSelect();
        if (global.AuthScreen) {
          global.AuthScreen.show();
        }
      }
    });

    // Create character button
    document.getElementById('createCharacterBtn').addEventListener('click', () => {
      if (global.CharacterCreation) {
        global.CharacterCreation.show(handleCharacterCreated);
      }
    });

    // Load characters
    await loadCharacters();
  }

  /**
   * Load characters from backend or localStorage
   */
  async function loadCharacters() {
    isLoading = true;
    const listEl = document.getElementById('characterList');
    
    try {
      // Check if we have backend configured
      const hasBackend = (window.REALM_SUPABASE_URL && window.REALM_SUPABASE_ANON_KEY) || 
                        (window.REALM_API_URL && window.REALM_API_URL !== 'http://localhost:3000/api');
      
      if (hasBackend && global.Characters) {
        // Load from backend
        characters = await global.Characters.getCharacters() || [];
      } else {
        // Local-only mode: load from localStorage
        const player = global.State?.getPlayer();
        if (player && player.name && player.race && player.class) {
          // We have a local character
          characters = [{
            id: 'local_character',
            name: player.name,
            level: player.level || 1,
            class_id: player.class,
            race_id: player.race,
            current_zone: player.currentZone || 'thronehold_gates'
          }];
        } else {
          characters = [];
        }
      }
      
      if (characters.length === 0) {
        listEl.innerHTML = `
          <div class="no-characters">
            <p>No characters yet. Create your first character to begin!</p>
          </div>
        `;
      } else {
        listEl.innerHTML = characters.map(char => `
          <div class="character-card" data-character-id="${char.id}">
            <div class="character-card-header">
              <h3 class="character-name">${char.name}</h3>
              <span class="character-level">Level ${char.level}</span>
            </div>
            <div class="character-card-info">
              <span class="character-class">${char.class_id || 'Unknown'}</span>
              <span class="character-zone">${char.current_zone || 'Unknown'}</span>
            </div>
            <div class="character-card-actions">
              <button class="select-character-btn" data-character-id="${char.id}">Select</button>
              <button class="delete-character-btn" data-character-id="${char.id}">Delete</button>
            </div>
          </div>
        `).join('');

        // Add event listeners
        listEl.querySelectorAll('.select-character-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const charId = btn.dataset.characterId;
            selectCharacter(charId);
          });
        });

        listEl.querySelectorAll('.delete-character-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const charId = btn.dataset.characterId;
            deleteCharacter(charId);
          });
        });
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
      listEl.innerHTML = `
        <div class="error-message">
          <p>Failed to load characters: ${error.message}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    } finally {
      isLoading = false;
      document.getElementById('createCharacterBtn').disabled = false;
    }
  }

  /**
   * Select character and load into game
   */
  async function selectCharacter(characterId) {
    try {
      const selectBtn = document.querySelector(`[data-character-id="${characterId}"] .select-character-btn`);
      if (selectBtn) {
        selectBtn.disabled = true;
        selectBtn.textContent = 'Loading...';
      }

      // Check if we have backend configured
      const hasBackend = (window.REALM_SUPABASE_URL && window.REALM_SUPABASE_ANON_KEY) || 
                        (window.REALM_API_URL && window.REALM_API_URL !== 'http://localhost:3000/api');
      
      if (hasBackend && global.Characters) {
        // Load character data from backend
        const character = await global.Characters.getCharacter(characterId);
        if (!character) {
          throw new Error('Character not found');
        }

        // Convert to game state
        const gameState = global.Characters.characterToGameState(character);
        
        // Load into State
        if (global.State) {
          global.State.data = gameState;
          global.State.currentCharacterId = characterId;
          global.State.save(); // Save to localStorage as backup
        }
      } else {
        // Local-only mode: character data should already be in localStorage
        if (global.State) {
          global.State.currentCharacterId = characterId || 'local_character';
          // Ensure data is loaded from localStorage
          if (!global.State.data) {
            global.State.data = global.State.load();
          }
        }
      }

      // Hide character select
      hideCharacterSelect();

      // Initialize game
      if (global.App && global.App.initGame) {
        global.App.initGame();
      } else {
        // Fallback: reload page
        location.reload();
      }
    } catch (error) {
      console.error('Failed to select character:', error);
      alert(`Failed to load character: ${error.message}`);
      if (selectBtn) {
        selectBtn.disabled = false;
        selectBtn.textContent = 'Select';
      }
    }
  }

  /**
   * Delete character
   */
  async function deleteCharacter(characterId) {
    const character = characters.find(c => c.id === characterId);
    if (!character) return;

    if (!confirm(`Are you sure you want to delete ${character.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await global.Characters?.deleteCharacter(characterId);
      await loadCharacters(); // Reload list
    } catch (error) {
      console.error('Failed to delete character:', error);
      alert(`Failed to delete character: ${error.message}`);
    }
  }

  /**
   * Handle character created callback
   */
  function handleCharacterCreated(character) {
    loadCharacters();
  }

  /**
   * Hide character select screen
   */
  function hideCharacterSelect() {
    if (selectOverlay) {
      selectOverlay.remove();
      selectOverlay = null;
    }
  }

  const CharacterSelect = {
    show: showCharacterSelect,
    hide: hideCharacterSelect,
    loadCharacters
  };

  global.CharacterSelect = CharacterSelect;
})(window);

