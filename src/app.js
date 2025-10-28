(function () {
  // Detect the repo base when hosted on GitHub Pages, e.g. /realm/
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

  const TICK_INTERVAL_MS = 5 * 1000;

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

  DIAG.ok('app:script-loaded');
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      DIAG.ok('app:dom-ready');
      await loadData();
      DIAG.ok('app:data-loaded');
      await initializeApp();
      DIAG.ok('state:init');
      bindUI();
      DIAG.ok('ui:bound');
      renderAll();
      setInterval(() => {
        try {
          if (window.Economy && typeof window.Economy.tick === 'function') {
            window.Economy.tick();
          }
        } catch (error) {
          DIAG.fail('tick:error', error);
        }
        renderAll();
      }, TICK_INTERVAL_MS);
      DIAG.ok('tick:start');
    } catch (err) {
      DIAG.fail('app:boot', err);
    }
  });

  async function initializeApp() {
    if (window.MapCore) {
      window.MapCore.tiles = REALM.data.tiles || [];
      if (window.MapCore.map) {
        window.MapCore.map.tiles = REALM.data.tiles || [];
      } else {
        window.MapCore.map = { tiles: REALM.data.tiles || [] };
      }
    }

    if (window.State && typeof window.State.init === 'function') {
      try {
        const stateData = window.State.init();
        if (stateData) {
          REALM.state = stateData;
        }
      } catch (error) {
        DIAG.fail('state:init-error', error);
      }
    } else {
      DIAG.note('state:init-missing');
    }

    if (REALM.state && REALM.state.player) {
      if (!REALM.state.player.resources) {
        REALM.state.player.resources = REALM.state.resources || {};
      }
      REALM.state.resources = REALM.state.player.resources;
    }

    const gameState = (window.GameState = window.GameState || {});
    gameState.player = REALM.state?.player || gameState.player || null;
    gameState.resources = REALM.state?.resources || gameState.resources || {};
    gameState.tiles = REALM.data.tiles || [];

    setupDebug();
    if (window.UI && typeof window.UI.refreshHeader === 'function') {
      window.UI.refreshHeader();
    }
  }

  function setupDebug() {
    window.rDebug = function rDebug() {
      console.log(window.REALM?.state ?? 'No state available');
    };
  }

  async function loadData() {
    const files = ['resources', 'items', 'structures', 'tiles'];
    for (const f of files) {
      try {
        REALM.data[f] = await fetchJSON(`data/${f}.json`);
        DIAG.ok(`data:${f}`);
      } catch (err) {
        if (f === 'tiles') {
          REALM.data.tiles = genSampleTiles(24, 14);
        } else if (f === 'resources') {
          REALM.data.resources = [
            { id: 'food', icon: '🌾', stack: 999999 },
            { id: 'ore', icon: '⛏️', stack: 999999 },
            { id: 'timber', icon: '🌲', stack: 999999 },
            { id: 'essence', icon: '💠', stack: 999999 },
            { id: 'gold', icon: '💰', stack: 999999 },
          ];
        } else {
          REALM.data[f] = [];
        }
      }
    }

    DIAG.note('BASE_PATH=' + BASE_PATH);
    const checks = [
      'src/app.js',
      'src/map/map-core.js',
      'src/map/map-render.js',
      'src/game/state.js',
      'src/game/economy.js',
      'src/game/chat.js',
      'data/resources.json',
      'data/items.json',
      'data/structures.json',
      'data/tiles.json',
    ];
    for (const rel of checks) {
      const url = `${BASE_PATH}/${rel}`.replace(/\/+/g, '/');
      DIAG.note('try ' + url);
    }
  }

  function bindUI() {
    if (window.UI && window.UI.el) {
      window.UI.el.tooltip = document.getElementById('tooltip');
      window.UI.el.resBar = document.getElementById('resourceBar');
    }
    const buildFarmBtn = document.getElementById('buildFarmBtn');
    buildFarmBtn?.addEventListener('click', handleBuildFarmClick);
    window.addEventListener('resize', renderAll);
  }

  function handleBuildFarmClick() {
    const state = REALM.state || {};
    const playerId = state.player?.id;
    if (!playerId) {
      alert('Player data is not ready yet.');
      return;
    }

    const tiles = REALM.data.tiles || [];
    const centerTile = tiles.find((tile) => tile.owner === playerId);
    const farm = (REALM.data.structures || []).find((s) => s.id === 'farm');

    if (!centerTile) {
      alert('No owned tile available');
      return;
    }
    if (!farm) {
      alert('Farm definition missing');
      return;
    }
    if (!window.Economy || typeof window.Economy.canAfford !== 'function') {
      alert('Economy system unavailable.');
      return;
    }
    if (!window.Economy.canAfford(farm.cost)) {
      alert('Not enough resources');
      return;
    }

    window.Economy.applyCost?.(farm.cost);
    if (window.State && typeof window.State.addStructure === 'function') {
      window.State.addStructure(centerTile.id, 'farm');
    }
    try {
      window.Economy.tick?.();
    } catch (error) {
      DIAG.fail('economy:tick', error);
    }
    renderAll();
  }

  function renderAll() {
    const canvas = document.getElementById('mapCanvas');
    if (!canvas) {
      return;
    }

    const container = canvas.parentElement;
    if (container) {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    }

    const tiles = REALM.data.tiles || [];
    if (window.MapRender && typeof window.MapRender.draw === 'function') {
      const visibilitySource = REALM.state?.visibility;
      const visibility =
        visibilitySource instanceof Set
          ? visibilitySource
          : new Set(Array.isArray(visibilitySource) ? visibilitySource : []);
      const renderState = {
        playerId: REALM.state?.player?.id,
        ownedTileIds: REALM.state?.ownedTiles,
        resources: REALM.state?.resources,
      };
      window.MapRender.draw(tiles, visibility, renderState);
    }

    if (window.UI && typeof window.UI.refreshHeader === 'function') {
      window.UI.refreshHeader();
    }
  }

  function genSampleTiles(width, height) {
    const biomes = ['plains', 'forest', 'hills', 'mountains', 'water'];
    const tiles = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const biome = biomes[(x + y) % biomes.length];
        const id = `sample-${x}-${y}`;
        const baseRate = (index) => Math.max(0, (index % 5) - 1);
        tiles.push({
          id,
          x,
          y,
          biome,
          owner: null,
          resources: {
            foodRate: baseRate(x + y + 2),
            oreRate: baseRate(x * 2 + y),
            timberRate: baseRate(x + y * 2 + 1),
            essenceRate: baseRate(x + y * 3 + 3),
            goldRate: baseRate(x * 3 + y * 2),
          },
          structures: [],
        });
      }
    }
    return tiles;
  }

  window.UI = window.UI || {
    el: {
      tooltip: document.getElementById('tooltip'),
      resBar: document.getElementById('resourceBar'),
    },
    showTooltip(tile, px, py) {
      const tt = this.el.tooltip;
      if (!tt || !tile) {
        return;
      }
      tt.innerHTML = `
        <div class="tt-title">${tile.biome?.toUpperCase?.() || 'UNKNOWN'} <span class="tt-tier">Tile ${tile.x},${tile.y}</span></div>
        <div class="tt-row">Owner: ${tile.owner ?? 'Unclaimed'}</div>
        <div class="tt-row">Rates: 🌾${tile.resources?.foodRate ?? 0} ⛏️${tile.resources?.oreRate ?? 0} 🌲${tile.resources?.timberRate ?? 0} 💠${tile.resources?.essenceRate ?? 0} 💰${tile.resources?.goldRate ?? 0}</div>
        <div class="tt-foot">Structures: ${Array.isArray(tile.structures) && tile.structures.length ? tile.structures.join(', ') : 'None'}</div>
      `;
      tt.style.left = `${px + 12}px`;
      tt.style.top = `${py + 12}px`;
      tt.classList.remove('hidden');
      tt.hidden = false;
    },
    hideTooltip() {
      const tt = this.el.tooltip;
      if (!tt) {
        return;
      }
      tt.classList.add('hidden');
      tt.hidden = true;
    },
    refreshHeader() {
      const resources = REALM.state?.resources;
      const resBar = this.el.resBar;
      if (!resources || !resBar) {
        return;
      }
      resBar.innerHTML = `
        <span class="pill">🌾 ${resources.food ?? 0}</span>
        <span class="pill">⛏️ ${resources.ore ?? 0}</span>
        <span class="pill">🌲 ${resources.timber ?? 0}</span>
        <span class="pill">💠 ${resources.essence ?? 0}</span>
        <span class="pill">💰 ${resources.gold ?? 0}</span>
      `;
    },
  };
})();
