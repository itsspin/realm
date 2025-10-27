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
})();
