(function (global) {
  const entries = [];
  const MAX_ENTRIES = 100;

  function addEntry(entry) {
    if (!entry || !entry.text) return;

    entries.push({
      ...entry,
      timestamp: Date.now(),
      id: `entry_${Date.now()}_${Math.random()}`
    });

    // Limit entries
    if (entries.length > MAX_ENTRIES) {
      entries.shift();
    }

    global.Rendering?.updateNarrative();
  }

  function getEntries() {
    return [...entries];
  }

  function clear() {
    entries.length = 0;
    global.Rendering?.updateNarrative();
  }

  const Narrative = {
    addEntry,
    getEntries,
    clear
  };

  global.Narrative = Narrative;
})(window);

