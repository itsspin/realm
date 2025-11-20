(function (global) {
  let factionData = null;

  function loadFactions() {
    if (factionData) return factionData;
    
    // Load from data file
    fetch('data/factions.json')
      .then(res => res.json())
      .then(data => {
        factionData = {};
        data.forEach(faction => {
          factionData[faction.id] = faction;
        });
        if (global.REALM) {
          global.REALM.data = global.REALM.data || {};
          global.REALM.data.factionsById = factionData;
        }
      })
      .catch(err => {
        console.error('Failed to load factions:', err);
        factionData = {};
      });
    
    return factionData;
  }

  function getPlayerFactions() {
    const player = global.State?.getPlayer();
    if (!player) return {};
    
    if (!player.factions) {
      player.factions = {};
      // Initialize based on race
      const race = global.REALM?.data?.racesById?.[player.race];
      if (race) {
        player.factions[race.faction] = 0; // Indifferent
        // Set enemy factions to negative
        (race.enemyFactions || []).forEach(factionId => {
          player.factions[factionId] = -500; // Scowls
        });
      }
      global.State?.updatePlayer({ factions: player.factions });
    }
    
    return player.factions;
  }

  function modifyFaction(factionId, amount) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    const factions = getPlayerFactions();
    const current = factions[factionId] || 0;
    const newValue = Math.max(-2000, Math.min(2000, current + amount));
    
    factions[factionId] = newValue;
    global.State?.updatePlayer({ factions: factions });

    // Determine faction standing
    const standing = getFactionStanding(newValue);
    
    global.Narrative?.addEntry({
      type: 'system',
      text: `Your standing with ${global.REALM?.data?.factionsById?.[factionId]?.name || factionId} is now: ${standing}`,
      meta: 'Faction Change'
    });

    return true;
  }

  function getFactionStanding(value) {
    if (value >= 1100) return 'Ally';
    if (value >= 750) return 'Warmly';
    if (value >= 500) return 'Kindly';
    if (value >= 100) return 'Amiable';
    if (value >= 0) return 'Indifferent';
    if (value >= -100) return 'Apprehensive';
    if (value >= -500) return 'Dubious';
    if (value >= -750) return 'Threatening';
    return 'Scowls';
  }

  function checkGuardAggression(player, guardFaction) {
    const factions = getPlayerFactions();
    const standing = factions[guardFaction] || 0;
    const faction = global.REALM?.data?.factionsById?.[guardFaction];
    
    if (!faction) return false;
    
    // Guards attack if player is threatening or scowls
    if (standing <= -500) return true;
    
    // Guards attack evil races in good cities
    if (faction.aggressiveTo && faction.aggressiveTo.includes('evil')) {
      const race = global.REALM?.data?.racesById?.[player.race];
      if (race && race.alignment === 'evil') {
        return true;
      }
    }
    
    return false;
  }

  function getFaction(factionId) {
    return global.REALM?.data?.factionsById?.[factionId] || null;
  }

  // Initialize
  loadFactions();

  const Factions = {
    loadFactions,
    getPlayerFactions,
    modifyFaction,
    getFactionStanding,
    checkGuardAggression,
    getFaction
  };

  global.Factions = Factions;
})(window);


