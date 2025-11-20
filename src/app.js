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

  async function loadGameData() {
    const files = [
      { key: 'resources', path: 'data/resources.json' },
      { key: 'items', path: 'data/items.json' },
      { key: 'structures', path: 'data/structures.json' },
      { key: 'tiles', path: 'data/tiles.json' },
      { key: 'monsters', path: 'data/monsters.json' },
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
        } else if (key === 'monsters') {
          REALM.data.monstersById = (REALM.data[key] || []).reduce((acc, entry) => {
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

  window.initializeGame = async function initializeGame() {
    try {
      // Initialize world map
      if (window.Settlement && typeof window.Settlement.initializeWorldMap === 'function') {
        window.Settlement.initializeWorldMap();
      }

      // Initialize state
      if (window.State && typeof window.State.init === 'function') {
        const stateData = window.State.init();
        if (stateData) {
          REALM.state = stateData;
          window.GameState = stateData;
        }
      }

      // Check for character creation
      const player = window.State?.getPlayer();
      if (!player || !player.race || !player.class) {
        // Show character creation
        setTimeout(() => {
          if (window.CharacterCreation && typeof window.CharacterCreation.showCharacterCreation === 'function') {
            window.CharacterCreation.showCharacterCreation();
          }
        }, 500);
        // Still initialize basic systems for character creation UI
        if (window.Rendering) {
          window.Rendering.updateResourceBar();
        }
        return; // Don't initialize full game until character is created
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
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      DIAG.ok('app:dom-ready');
      await loadGameData();
      DIAG.ok('app:data-loaded');

      await initializeGame();
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
