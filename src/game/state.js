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
    currentZone: 'edgewood_clearing',
    currentTile: null,
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

    init() {
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
