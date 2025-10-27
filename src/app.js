(function () {
  const DATA_FILES = ["resources", "items", "structures", "tiles"];
  const TICK_INTERVAL_MS = 60 * 1000;

  document.addEventListener("DOMContentLoaded", () => {
    initializeApp().catch((error) => {
      console.error("Failed to initialize REALM app", error);
    });
  });

  async function initializeApp() {
    const data = await loadGameData();
    window.REALM = {
      data,
      state: {},
      ui: {},
    };

    if (window.State && typeof window.State.init === "function") {
      window.State.init();
    } else {
      console.warn("State.init is not available yet");
    }

    setupTick();
    setupCanvasResizing();
    resizeAndRenderMap();

    window.rDebug = function rDebug() {
      console.log(window.REALM?.state ?? "No state available");
    };
  }

  async function loadGameData() {
    const entries = await Promise.all(
      DATA_FILES.map(async (name) => {
        const response = await fetch(`/data/${name}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load ${name} data: ${response.status}`);
        }
        const json = await response.json();
        return [name, json];
      })
    );

    return entries.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  function setupTick() {
    if (window.Economy && typeof window.Economy.tick === "function") {
      setInterval(() => {
        try {
          window.Economy.tick();
        } catch (error) {
          console.error("Economy tick failed", error);
        }
      }, TICK_INTERVAL_MS);
    } else {
      console.warn("Economy.tick is not available yet");
    }
  }

  function setupCanvasResizing() {
    window.addEventListener("resize", resizeAndRenderMap);
  }

  function resizeAndRenderMap() {
    const canvas = document.getElementById("mapCanvas");
    if (!canvas) {
      return;
    }

    const container = canvas.parentElement;
    if (container) {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    }

    if (window.MapRender && typeof window.MapRender.render === "function") {
      window.MapRender.render(canvas, window.REALM);
    }
  }

  // Simple UI helpers
window.UI = {
  el: {
    tooltip: document.getElementById('tooltip'),
    resBar: document.getElementById('resourceBar') // make sure index.html has it
  },
  showTooltip(tile, px, py) {
    const tt = UI.el.tooltip;
    tt.innerHTML = `
      <div class="tt-title">${tile.biome.toUpperCase()} <span class="tt-tier">Tile ${tile.x},${tile.y}</span></div>
      <div class="tt-row">Owner: ${tile.owner ?? 'Unclaimed'}</div>
      <div class="tt-row">Rates: 🌾${tile.resources.foodRate} ⛏️${tile.resources.oreRate} 🌲${tile.resources.timberRate} 💠${tile.resources.essenceRate} 💰${tile.resources.goldRate}</div>
      <div class="tt-foot">Structures: ${tile.structures?.join(', ') || 'None'}</div>
    `;
    tt.style.left = `${px + 12}px`;
    tt.style.top = `${py + 12}px`;
    tt.classList.remove('hidden');
  },
  hideTooltip() {
    UI.el.tooltip?.classList.add('hidden');
  },
  refreshHeader() {
    const { resources } = REALM.state.player;
    UI.el.resBar.innerHTML = `
      <span class="pill">🌾 ${resources.food}</span>
      <span class="pill">⛏️ ${resources.ore}</span>
      <span class="pill">🌲 ${resources.timber}</span>
      <span class="pill">💠 ${resources.essence}</span>
      <span class="pill">💰 ${resources.gold}</span>
    `;
  }
};

})();
