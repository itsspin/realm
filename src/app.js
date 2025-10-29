
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
  const RESOURCE_ORDER = [
    { key: 'food', fallbackIcon: '🌾', label: 'Food' },
    { key: 'ore', fallbackIcon: '⛏️', label: 'Ore' },
    { key: 'timber', fallbackIcon: '🌲', label: 'Timber' },
    { key: 'essence', fallbackIcon: '💠', label: 'Essence' },
    { key: 'gold', fallbackIcon: '💰', label: 'Gold' },
  ];

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

    if (REALM.state && typeof REALM.state === 'object') {
      Object.defineProperty(REALM.state, 'tiles', {
        value: REALM.data.tiles || [],
        enumerable: false,
        configurable: true,
        writable: true,
      });
      if (REALM.state.visibilitySet instanceof Set === false) {
        const visibilitySet = normaliseVisibility(REALM.state.visibility);
        defineVisibilitySet(REALM.state, visibilitySet);
      }
      window.GameState = REALM.state;
    } else {
      const gameState = (window.GameState = window.GameState || {});
      gameState.player = REALM.state?.player || gameState.player || null;
      gameState.resources = REALM.state?.resources || gameState.resources || {};
      gameState.tiles = REALM.data.tiles || [];
    }

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
        if (f === 'resources') {
          REALM.data.resourceMap = Array.isArray(REALM.data[f])
            ? REALM.data[f].reduce((acc, entry) => {
                if (entry && entry.id) {
                  const key = String(entry.id).toLowerCase();
                  acc[key] = entry;
                }
                return acc;
              }, {})
            : {};
        }
        if (f === 'items') {
          REALM.data.itemsById = Array.isArray(REALM.data[f])
            ? REALM.data[f].reduce((acc, entry) => {
                const id = entry?.itemId || entry?.id;
                if (id) {
                  const key = String(id).toLowerCase();
                  acc[key] = entry;
                }
                return acc;
              }, {})
            : {};
        }
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
          REALM.data.resourceMap = REALM.data.resources.reduce((acc, entry) => {
            acc[String(entry.id).toLowerCase()] = entry;
            return acc;
          }, {});
        } else {
          REALM.data[f] = [];
          if (f === 'items') {
            REALM.data.itemsById = {};
          }
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
      window.UI.el.itemTooltip = document.getElementById('itemTooltip');
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
    if (typeof window.Economy.applyCost !== 'function') {
      alert('Economy system unavailable.');
      return;
    }

    const paid = window.Economy.applyCost(farm.cost);
    if (paid === false) {
      alert('Not enough resources');
      return;
    }
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
      const visibility = normaliseVisibility(REALM.state?.visibilitySet || REALM.state?.visibility);
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

  function normaliseVisibility(source) {
    if (!source) {
      return new Set();
    }

    if (source instanceof Set) {
      return source;
    }

    if (Array.isArray(source)) {
      return new Set(source);
    }

    if (typeof source === 'object') {
      if (source.tileSet instanceof Set) {
        return source.tileSet;
      }
      if (Array.isArray(source.tiles)) {
        return new Set(source.tiles);
      }
      if (Array.isArray(source.visibleTiles)) {
        return new Set(source.visibleTiles);
      }
    }

    return new Set();
  }

  function defineVisibilitySet(target, visibilitySet) {
    if (!target || typeof target !== 'object') {
      return;
    }

    const setInstance = visibilitySet instanceof Set ? visibilitySet : new Set();
    Object.defineProperty(target, 'visibilitySet', {
      value: setInstance,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }

  function resourceIconFor(key) {
    const map = REALM.data?.resourceMap || {};
    const entry = map[String(key).toLowerCase()];
    if (entry && entry.icon) {
      return entry.icon;
    }
    const fallback = RESOURCE_ORDER.find((res) => res.key === key);
    return fallback ? fallback.fallbackIcon : '❔';
  }

  function describeResource(key) {
    const fallback = RESOURCE_ORDER.find((res) => res.key === key);
    return fallback?.label || key;
  }

  function formatNumber(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '0';
    }
    return Math.trunc(value).toLocaleString();
  }

  function findItem(itemId) {
    if (!itemId) {
      return null;
    }
    const normalized = String(itemId).toLowerCase();
    const map = REALM.data?.itemsById || {};
    if (map[normalized]) {
      return map[normalized];
    }
    const array = REALM.data?.items;
    if (Array.isArray(array)) {
      return array.find((entry) => {
        const id = entry?.itemId || entry?.id;
        return id && String(id).toLowerCase() === normalized;
      }) || null;
    }
    return null;
  }

  function renderItemTooltip(item) {
    if (!item) {
      return '';
    }
    const displayName = (item.name || item.itemId || '').replace(/_/g, ' ');
    const tier = item.tier ? String(item.tier).toUpperCase() : null;
    const stats = item.stats && typeof item.stats === 'object'
      ? Object.entries(item.stats)
          .map(([key, val]) => `${key.toUpperCase()}: ${val}`)
          .join(' • ')
      : null;
    return `
      <div class="tt-title">${displayName || 'Unknown Item'}${
        tier ? `<span class="tt-tier">${tier}</span>` : ''
      }</div>
      ${item.type ? `<div class="tt-row">Type: ${item.type}</div>` : ''}
      ${stats ? `<div class="tt-row">${stats}</div>` : ''}
    `;
  }

  window.UI = window.UI || {
    el: {
      tooltip: document.getElementById('tooltip'),
      itemTooltip: document.getElementById('itemTooltip'),
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
    showItemTooltip(itemId, anchor) {
      const tooltip = this.el.itemTooltip;
      if (!tooltip || !anchor) {
        return;
      }
      const item = findItem(itemId);
      if (!item) {
        this.hideItemTooltip();
        return;
      }

      tooltip.innerHTML = renderItemTooltip(item);

      const rect = anchor.getBoundingClientRect();
      const offset = 12;
      const initialLeft = rect.left + rect.width / 2 + window.scrollX;
      const initialTop = rect.top + window.scrollY - offset;
      tooltip.style.left = `${initialLeft}px`;
      tooltip.style.top = `${initialTop}px`;
      tooltip.classList.remove('hidden');
      tooltip.hidden = false;

      const bounds = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const adjustedLeft = Math.min(
        Math.max(initialLeft - bounds.width / 2, window.scrollX + 8),
        window.scrollX + viewportWidth - bounds.width - 8
      );
      let adjustedTop = initialTop - bounds.height - 4;
      const minTop = window.scrollY + 8;
      if (adjustedTop < minTop) {
        adjustedTop = Math.min(
          initialTop + offset,
          window.scrollY + viewportHeight - bounds.height - 8
        );
      }
      if (adjustedTop < minTop) {
        adjustedTop = minTop;
      }
      tooltip.style.left = `${adjustedLeft}px`;
      tooltip.style.top = `${adjustedTop}px`;
    },
    hideItemTooltip() {
      const tooltip = this.el.itemTooltip;
      if (!tooltip) {
        return;
      }
      tooltip.classList.add('hidden');
      tooltip.hidden = true;
    },
    refreshHeader() {
      const resources = REALM.state?.resources;
      const resBar = this.el.resBar;
      if (!resources || !resBar) {
        return;
      }
      const content = RESOURCE_ORDER.map(({ key }) => {
        const amount = formatNumber(resources[key] ?? 0);
        const icon = resourceIconFor(key);
        const label = describeResource(key);
        return `<span class="pill" data-resource="${key}" title="${label}">${icon} ${amount}</span>`;
      }).join('');
      resBar.innerHTML = content;
    },
  };
})();
