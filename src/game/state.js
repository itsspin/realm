/**
 * Game State Management
 * 
 * Handles player state persistence to localStorage.
 * 
 * CURRENT STATE STRUCTURE:
 * {
 *   player: { id, name, race, class, level, xp, stats, inventory, equipment, skills, currentZone, currentTile, ... },
 *   resources: { food, ore, timber, essence, gold },
 *   ownedTiles: [],
 *   structures: [],
 *   visibility: []
 * }
 * 
 * LIMITATIONS:
 * - No account system (single character per browser)
 * - No character slots
 * - No cloud save/backend integration
 * - All state stored in localStorage (limited to ~5-10MB)
 * 
 * FUTURE: Should integrate with backend API for cloud saves and multi-character support
 */
(function (global) {
  const STORAGE_KEY = 'REALM_SAVE_V2';
  
  const DEFAULT_PLAYER = {
    id: 'player-1',
    name: 'Wanderer',
    race: null,
    class: null,
    level: 1,
    xp: 0,
    xpToNext: 100,
    stats: {
      hp: 20,
      maxHp: 20,
      atk: 5,
      def: 2
    },
    playerStats: {}, // Separate stats for achievements/leaderboards
    gold: 25,
    inventory: [],
    equipment: {
      weapon: null,
      armor: null,
      charm: null
    },
    skills: {},
    currentZone: 'thronehold',
    currentTile: { x: 20, y: 20 },
    settlements: [],
    guild: null,
    faction: null,
    activeQuests: [],
    completedQuests: [],
    discoveredLore: [],
    achievements: [],
    shop: null
  };

  const DEFAULT_RESOURCES = {
    food: 50,
    ore: 10,
    timber: 20,
    essence: 0,
    gold: 25
  };

  function ensureArrays(state) {
    state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
    state.activeQuests = Array.isArray(state.activeQuests) ? state.activeQuests : [];
    state.completedQuests = Array.isArray(state.completedQuests) ? state.completedQuests : [];
    state.discoveredLore = Array.isArray(state.discoveredLore) ? state.discoveredLore : [];
    state.equipment = state.equipment || { weapon: null, armor: null, charm: null };
  }

  function applyDefaults(state) {
    ensureArrays(state);
    state.player = state.player ? { ...DEFAULT_PLAYER, ...state.player } : { ...DEFAULT_PLAYER };
    if (!state.player.stats) {
      state.player.stats = { ...DEFAULT_PLAYER.stats };
    }
    if (!state.player.equipment) {
      state.player.equipment = { ...DEFAULT_PLAYER.equipment };
    }
    if (!state.player.achievements) {
      state.player.achievements = [];
    }
    if (!state.player.playerStats) {
      state.player.playerStats = {}; // Player statistics object (separate from combat stats)
    }
    state.resources = state.resources
      ? { ...DEFAULT_RESOURCES, ...state.resources }
      : { ...DEFAULT_RESOURCES };
  }

  const State = {
    data: null,
    currentCharacterId: null,
    lastSaveTime: 0,
    saveInterval: null,
    pendingSave: null,

    init() {
      // Check if we have a character ID from backend
      const session = global.Auth?.getSession();
      if (session && this.currentCharacterId) {
        // Load from backend
        return this.loadFromBackend();
      }

      // Fallback to localStorage
      const loaded = this.load();
      if (loaded) {
        return loaded;
      }

      this.data = {
        player: { ...DEFAULT_PLAYER },
        resources: { ...DEFAULT_RESOURCES },
        ownedTiles: [],
        structures: [],
        visibility: []
      };

      this.save();
      return this.data;
    },

    /**
     * Load character from backend
     */
    async loadFromBackend() {
      if (!this.currentCharacterId) return null;

      try {
        const character = await global.Characters?.getCharacter(this.currentCharacterId);
        if (!character) return null;

        this.data = global.Characters?.characterToGameState(character);
        this.save(); // Save to localStorage as backup
        return this.data;
      } catch (error) {
        console.error('Failed to load from backend:', error);
        // Fallback to localStorage
        return this.load();
      }
    },

    /**
     * Save to backend (async)
     */
    async saveToBackend() {
      if (!this.data || !this.currentCharacterId) {
        return;
      }

      if (!global.Auth?.isAuthenticated()) {
        console.warn('Not authenticated, saving to localStorage only');
        this.save();
        return;
      }

      try {
        const characterData = global.Characters?.gameStateToCharacter(this.data, this.currentCharacterId);
        await global.Characters?.updateCharacter(this.currentCharacterId, characterData);
        this.lastSaveTime = Date.now();
        console.log('Character saved to backend');
      } catch (error) {
        console.error('Failed to save to backend:', error);
        // Still save to localStorage as backup
        this.save();
        throw error;
      }
    },

    save() {
      if (!this.data || !global.localStorage) {
        return;
      }

      try {
        const serialised = JSON.stringify(this.data);
        global.localStorage.setItem(STORAGE_KEY, serialised);
      } catch (error) {
        console.error('Failed to save state', error);
      }

      // Also save to backend if authenticated
      if (this.currentCharacterId && global.Auth?.isAuthenticated()) {
        // Debounce backend saves
        if (this.pendingSave) {
          clearTimeout(this.pendingSave);
        }
        this.pendingSave = setTimeout(() => {
          this.saveToBackend().catch(err => {
            console.error('Background save failed:', err);
          });
        }, 2000); // Save 2 seconds after last change
      }
    },

    load() {
      if (!global.localStorage) {
        return null;
      }

      const serialised = global.localStorage.getItem(STORAGE_KEY);
      if (!serialised) {
        return null;
      }

      try {
        const parsed = JSON.parse(serialised);
        applyDefaults(parsed);
        this.data = parsed;
        return this.data;
      } catch (error) {
        console.error('Failed to load state', error);
        return null;
      }
    },

    getPlayer() {
      return this.data?.player || null;
    },

    updatePlayer(updates) {
      if (!this.data || !this.data.player) {
        return;
      }
      Object.assign(this.data.player, updates);
      this.save();
    },

    /**
     * Force immediate save to backend
     */
    async forceSave() {
      if (this.pendingSave) {
        clearTimeout(this.pendingSave);
        this.pendingSave = null;
      }
      await this.saveToBackend();
    },

    /**
     * Start periodic auto-save
     */
    startAutoSave(intervalMs = 30000) {
      if (this.saveInterval) {
        clearInterval(this.saveInterval);
      }
      this.saveInterval = setInterval(() => {
        if (this.currentCharacterId && global.Auth?.isAuthenticated()) {
          this.saveToBackend().catch(err => {
            console.error('Auto-save failed:', err);
          });
        }
      }, intervalMs);
    },

    /**
     * Stop periodic auto-save
     */
    stopAutoSave() {
      if (this.saveInterval) {
        clearInterval(this.saveInterval);
        this.saveInterval = null;
      }
    },

    addItem(itemId) {
      if (!this.data || !this.data.player) {
        return false;
      }
      if (this.data.player.inventory.length >= 20) {
        return false; // Inventory full
      }
      this.data.player.inventory.push({ itemId, id: `item_${Date.now()}_${Math.random()}` });
      this.save();
      return true;
    },

    removeItem(itemId) {
      if (!this.data || !this.data.player) {
        return false;
      }
      const index = this.data.player.inventory.findIndex(item => item.itemId === itemId);
      if (index === -1) {
        return false;
      }
      this.data.player.inventory.splice(index, 1);
      this.save();
      return true;
    }
  };

  global.State = State;
})(window);
