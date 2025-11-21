/**
 * REALM - Main Application Entry Point
 * 
 * WORLD FLOW:
 * 1. Load game data (races, classes, items, zones, etc.)
 * 2. Initialize game state (load from localStorage or create new)
 * 3. Initialize world map (50x50 tile grid)
 * 4. Render map and UI
 * 5. Check for character creation (if no character exists)
 * 6. Initialize game systems (quests, narrative, rendering)
 * 
 * CURRENT LIMITATIONS:
 * - No account system (single character per browser)
 * - No cloud save/backend integration
 * - Map size hardcoded to 50x50
 * - Monsters spawn randomly (not static spawn points)
 */
(function () {
  const PATHNAME = location.pathname.endsWith('/')
    ? location.pathname
    : location.pathname + '/';
  const BASE_PATH = PATHNAME.includes('/realm/')
    ? PATHNAME.replace(/\/+$/, '')
    : '';
  window.BASE_PATH = BASE_PATH;

  const diagDefaults = {
    ok: (...args) => console.log('[OK]', ...args),
    fail: (...args) => console.error('[FAIL]', ...args),
    note: (...args) => console.info('[NOTE]', ...args),
  };
  const DIAG = (window.DIAG = window.DIAG
    ? Object.assign({}, diagDefaults, window.DIAG)
    : diagDefaults);

  window.REALM = window.REALM || { data: {}, state: {}, ui: {} };
  const REALM = window.REALM;

  async function fetchJSON(rel) {
    const url = `${BASE_PATH}/${rel}`.replace(/\/+/g, '/');
    const cacheBust = `cb=${Date.now()}`;
    const full = url + (url.includes('?') ? '&' : '?') + cacheBust;
    try {
      const res = await fetch(full, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${rel} HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      DIAG.fail('fetchJSON:' + rel, e);
      throw e;
    }
  }

  REALM.fetchJSON = fetchJSON;

  /**
   * Load all game data from JSON files
   * Creates lookup maps (e.g., itemsById, zonesById) for fast access
   * Data is stored in REALM.data namespace
   */
  async function loadGameData() {
    // Load races
    try {
      const racesRes = await fetch('data/races.json');
      if (racesRes.ok) {
        const races = await racesRes.json();
        REALM.data.racesById = {};
        races.forEach(race => {
          REALM.data.racesById[race.id] = race;
        });
        DIAG.ok('data:races');
      }
    } catch (error) {
      DIAG.fail('data:races', error);
    }

    // Load factions
    try {
      const factionsRes = await fetch('data/factions.json');
      if (factionsRes.ok) {
        const factions = await factionsRes.json();
        REALM.data.factionsById = {};
        factions.forEach(faction => {
          REALM.data.factionsById[faction.id] = faction;
        });
        DIAG.ok('data:factions');
      }
    } catch (error) {
      DIAG.fail('data:factions', error);
    }

    // Load classes
    try {
      const classesRes = await fetch('data/classes.json');
      if (classesRes.ok) {
        const classes = await classesRes.json();
        REALM.data.classesById = {};
        classes.forEach(cls => {
          REALM.data.classesById[cls.id] = cls;
        });
        DIAG.ok('data:classes');
      }
    } catch (error) {
      DIAG.fail('data:classes', error);
    }
    const files = [
      { key: 'resources', path: 'data/resources.json' },
      { key: 'items', path: 'data/items.json' },
      { key: 'itemsExtended', path: 'data/items-extended.json' },
      { key: 'structures', path: 'data/structures.json' },
      { key: 'tiles', path: 'data/tiles.json' },
      { key: 'monsters', path: 'data/monsters.json' },
      { key: 'worldZones', path: 'data/world-zones.json' },
      { key: 'spawnGroups', path: 'data/spawn-groups.json' },
      { key: 'mobTemplates', path: 'data/mob-templates.json' },
      { key: 'territoryRegions', path: 'data/territory-regions.json' },
      { key: 'classesEnhanced', path: 'data/classes-enhanced.json' },
      { key: 'skillsEnhanced', path: 'data/skills-enhanced.json' },
      { key: 'professions', path: 'data/professions.json' },
      { key: 'itemsStarter', path: 'data/items-starter.json' },
      { key: 'lootTables', path: 'data/loot-tables.json' },
      { key: 'gatheringNodes', path: 'data/gathering-nodes.json' },
      { key: 'guardPatrols', path: 'data/guard-patrols.json' },
      { key: 'dungeonMonsters', path: 'data/dungeon-monsters.json' },
      { key: 'namedMobs', path: 'data/named-mobs.json' },
      { key: 'dungeons', path: 'data/dungeons.json' },
      { key: 'dungeonMonsters', path: 'data/dungeon-monsters.json' },
      { key: 'namedMobs', path: 'data/named-mobs.json' },
      { key: 'dungeons', path: 'data/dungeons.json' },
      { key: 'npcs', path: 'data/npcs.json' },
      { key: 'classes', path: 'data/classes.json' },
      { key: 'classSkills', path: 'data/class-skills.json' },
      { key: 'zones', path: 'data/zones.json' },
      { key: 'quests', path: 'data/quests.json' },
      { key: 'lore', path: 'data/lore.json' }
    ];

    for (const { key, path } of files) {
      try {
        REALM.data[key] = await fetchJSON(path);
        DIAG.ok(`data:${key}`);

        // Create lookup maps
        if (key === 'items') {
          REALM.data.itemsById = (REALM.data[key] || []).reduce((acc, entry) => {
            const id = entry?.itemId || entry?.id;
            if (id) {
              acc[String(id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'itemsExtended') {
          // Merge extended items into itemsById
          (REALM.data[key] || []).forEach(entry => {
            const id = entry?.itemId || entry?.id;
            if (id) {
              REALM.data.itemsById[String(id).toLowerCase()] = entry;
            }
          });
        } else if (key === 'monsters') {
          REALM.data.monstersById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'dungeonMonsters') {
          // Merge dungeon monsters into monstersById
          (REALM.data[key] || []).forEach(entry => {
            if (entry?.id) {
              REALM.data.monstersById[String(entry.id).toLowerCase()] = entry;
            }
          });
        } else if (key === 'namedMobs') {
          REALM.data.namedMobsById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'dungeons') {
          REALM.data.dungeonsById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'monsters') {
          REALM.data.monstersById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'dungeonMonsters') {
          // Merge dungeon monsters into monstersById
          (REALM.data[key] || []).forEach(entry => {
            if (entry?.id) {
              REALM.data.monstersById[String(entry.id).toLowerCase()] = entry;
            }
          });
        } else if (key === 'namedMobs') {
          REALM.data.namedMobsById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'dungeons') {
          REALM.data.dungeonsById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'npcs') {
          REALM.data.npcsById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'zones') {
          REALM.data.zonesById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'quests') {
          REALM.data.questsById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'resources') {
          REALM.data.resourceMap = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry && entry.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'classesEnhanced') {
          REALM.data.classesEnhancedById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'skillsEnhanced') {
          REALM.data.skillsById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'itemsStarter') {
          // Merge starter items into itemsById
          (REALM.data[key] || []).forEach(entry => {
            const id = entry?.itemId || entry?.id;
            if (id) {
              REALM.data.itemsById[String(id).toLowerCase()] = entry;
            }
          });
        } else if (key === 'lootTables') {
          REALM.data.lootTablesById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        } else if (key === 'guardPatrols') {
          REALM.data.guardPatrolsById = (REALM.data[key] || []).reduce((acc, entry) => {
            if (entry?.id) {
              acc[String(entry.id).toLowerCase()] = entry;
            }
            return acc;
          }, {});
        }
      } catch (err) {
        DIAG.fail(`data:${key}`, err);
        REALM.data[key] = [];
        if (key === 'items') REALM.data.itemsById = {};
        if (key === 'monsters') REALM.data.monstersById = {};
        if (key === 'zones') REALM.data.zonesById = {};
        if (key === 'quests') REALM.data.questsById = {};
      }
    }
  }

  /**
   * Initialize the game after data is loaded
   * 
   * FLOW:
   * 1. Initialize game state (load player from localStorage) - MUST BE FIRST
   * 2. Check if character exists, show creation if not
   * 3. Initialize world map (create or load from localStorage)
   * 4. Render map canvas
   * 5. Initialize quests, narrative, and UI systems
   */
  window.initializeGame = async function initializeGame() {
    try {
      console.log('[App] initializeGame called');
      
      // Initialize state FIRST - this is critical!
      if (window.State && typeof window.State.init === 'function') {
        console.log('[App] Initializing State...');
        const stateData = window.State.init();
        console.log('[App] State initialized:', stateData);
        if (stateData) {
          REALM.state = stateData;
          window.GameState = stateData;
        }
      } else {
        console.error('[App] State system not available!');
        return;
      }

      // Check for character creation BEFORE doing anything else
      const player = window.State?.getPlayer();
      console.log('[App] Checking character creation');
      console.log('[App] Player object:', player);
      console.log('[App] Player race:', player?.race);
      console.log('[App] Player class:', player?.class);
      console.log('[App] Player name:', player?.name);
      
      // Check if character is complete (has race, class, and name)
      const needsCreation = !player || !player.race || !player.class || !player.name;
      console.log('[App] Needs character creation?', needsCreation);
      
      if (needsCreation) {
        console.log('[App] Character not complete, showing character creation');
        // Show character creation immediately
        if (window.CharacterCreation && typeof window.CharacterCreation.showCharacterCreation === 'function') {
          console.log('[App] CharacterCreation exists, calling showCharacterCreation');
          window.CharacterCreation.showCharacterCreation();
        } else {
          console.error('[App] CharacterCreation not available!');
          console.error('[App] window.CharacterCreation:', window.CharacterCreation);
          console.error('[App] Type:', typeof window.CharacterCreation);
          if (window.CharacterCreation) {
            console.error('[App] showCharacterCreation method:', typeof window.CharacterCreation.showCharacterCreation);
          }
        }
        // Still initialize basic systems for character creation UI
        if (window.Rendering) {
          window.Rendering.updateResourceBar();
        }
        return; // Don't initialize full game until character is created
      }

      console.log('[App] Character exists, continuing initialization');
      
      // Initialize world map
      if (window.Settlement && typeof window.Settlement.initializeWorldMap === 'function') {
        window.Settlement.initializeWorldMap();
      }

      // Initialize world map renderer
      if (window.WorldMapRender && typeof window.WorldMapRender.renderMap === 'function') {
        setTimeout(() => {
          window.WorldMapRender.renderMap();
          const player = window.State?.getPlayer();
          if (player && player.currentTile) {
            window.WorldMapRender.centerOnPlayer();
          }
        }, 200);
      }

      // Initialize quests
      if (window.Quests && typeof window.Quests.initializeQuests === 'function') {
        window.Quests.initializeQuests();
      }

      // Initial narrative entry
      if (window.Narrative && typeof window.Narrative.addEntry === 'function') {
        const zone = window.Zones?.getCurrentZone();
        if (zone) {
          window.Narrative.addEntry({
            type: 'zone',
            text: `You stand in ${zone.name}. ${zone.description}`,
            meta: 'Welcome to REALM'
          });
        } else {
          window.Narrative.addEntry({
            type: 'system',
            text: 'Welcome to REALM. Your journey begins here, in the shadows between worlds.',
            meta: 'Begin your adventure'
          });
        }
      }

      // Render initial UI
      if (window.Rendering) {
        window.Rendering.updateZoneHeader();
        window.Rendering.updateCharacterPanel();
        window.Rendering.updateInventory();
        window.Rendering.updateQuestLog();
        window.Rendering.updateSkillsPanel();
        window.Rendering.updateSettlementPanel();
        window.Rendering.updateActionButtons();
        window.Rendering.updateResourceBar();
        window.Rendering.updateNarrative();
      }
    } catch (error) {
      DIAG.fail('game:init-error', error);
    }
  }

  DIAG.ok('app:script-loaded');
  /**
   * Initialize game after authentication
   */
  async function initGame() {
    try {
      // Check authentication
      if (!window.Auth?.isAuthenticated()) {
        // Show auth screen
        if (window.AuthScreen) {
          window.AuthScreen.show();
        }
        return;
      }

      // Check if character is selected
      const characterId = window.State?.currentCharacterId;
      if (!characterId) {
        // Show character select
        if (window.CharacterSelect) {
          window.CharacterSelect.show();
        }
        return;
      }

      // Load character data
      await window.State?.loadFromBackend();
      
      // Continue with normal initialization
      await initializeGame();
      
      // Start auto-save
      if (window.State?.startAutoSave) {
        window.State.startAutoSave(30000); // Save every 30 seconds
      }
    } catch (error) {
      DIAG.fail('initGame', error);
      // Fallback to auth screen
      if (window.AuthScreen) {
        window.AuthScreen.show();
      }
    }
  }

  // Expose for character select and auth screen
  window.App = window.App || {};
  window.App.initGame = initGame;
  window.App.initializeGame = initializeGame;

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      DIAG.ok('app:dom-ready');
      await loadGameData();
      DIAG.ok('app:data-loaded');

      // Initialize world system
      if (window.World && typeof window.World.initialize === 'function') {
        await window.World.initialize();
        DIAG.ok('world:initialized');
        
        // Initialize spawn system for current zone
        const player = window.State?.getPlayer();
        if (player && player.currentZone && window.SpawnSystem) {
          window.SpawnSystem.initializeZone(player.currentZone);
          DIAG.ok('spawn:initialized');
        }
      }

      // Initialize Guard system
      if (window.GuardSystem && typeof window.GuardSystem.startGuardUpdates === 'function') {
        window.GuardSystem.startGuardUpdates();
        DIAG.ok('guard:initialized');
      }

      // Initialize State first (needed for both flows)
      if (window.State && typeof window.State.init === 'function') {
        console.log('[App] Pre-initializing State...');
        window.State.init();
      }
      
      // Initialize State FIRST - critical for both flows
      if (!window.State || !window.State.data) {
        if (window.State && typeof window.State.init === 'function') {
          console.log('[App] Initializing State...');
          window.State.init();
        }
      }
      
      // Initialize auth and character systems first
      // Only use auth flow if backend is configured
      const hasBackend = (window.REALM_SUPABASE_URL && window.REALM_SUPABASE_ANON_KEY) || 
                        (window.REALM_API_URL && window.REALM_API_URL !== 'http://localhost:3000/api');
      
      console.log('[App] Has backend?', hasBackend);
      console.log('[App] Auth available?', !!window.Auth);
      console.log('[App] AuthScreen available?', !!window.AuthScreen);
      console.log('[App] CharacterSelect available?', !!window.CharacterSelect);
      console.log('[App] State.data:', window.State?.data);
      
      if (window.Auth && window.AuthScreen && window.CharacterSelect && hasBackend) {
        // Use authenticated flow with backend
        console.log('[App] Using authenticated flow with backend');
        await initGame();
      } else {
        // Use local storage flow (no backend required)
        // Allow local account creation OR skip directly to character creation
        console.log('[App] Using local flow (no backend)');
        
        // Check if user is already authenticated (local account)
        const isAuth = window.Auth?.isAuthenticated();
        console.log('[App] Is authenticated (local)?', isAuth);
        
        if (!isAuth && window.AuthScreen && window.Auth) {
          // Show auth screen - user can register/login for local account
          console.log('[App] Showing auth screen (local mode - create account)');
          if (window.AuthScreen) {
            window.AuthScreen.show();
          }
        } else {
          // Skip auth, go directly to character creation/game check
          console.log('[App] Going to game initialization (check for character creation)');
          await initializeGame();
        }
      }
      DIAG.ok('game:initialized');
      
      // Update leaderboards on load
      if (window.Leaderboards && typeof window.Leaderboards.updatePlayerRanking === 'function') {
        window.Leaderboards.updatePlayerRanking();
      }
    } catch (err) {
      DIAG.fail('app:boot', err);
    }
  });
})();
