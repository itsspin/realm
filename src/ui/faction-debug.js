/**
 * Faction Debug UI
 * 
 * Provides debug interface for viewing and adjusting faction standings.
 * Access via /factions command or debug panel.
 */

(function (global) {
  let debugPanel = null;

  /**
   * Create debug panel
   */
  function createDebugPanel() {
    if (debugPanel) return debugPanel;

    const panel = document.createElement('div');
    panel.id = 'factionDebugPanel';
    panel.className = 'faction-debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      max-height: 80vh;
      background: #1a1a1a;
      border: 2px solid #4a4a4a;
      border-radius: 8px;
      padding: 20px;
      z-index: 10000;
      overflow-y: auto;
      display: none;
    `;

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #fff;">Faction Debug Panel</h2>
        <button id="factionDebugClose" style="background: #ff4444; color: #fff; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
      <div id="factionDebugContent"></div>
    `;

    document.body.appendChild(panel);
    debugPanel = panel;

    // Close button
    document.getElementById('factionDebugClose').addEventListener('click', () => {
      hideDebugPanel();
    });

    return panel;
  }

  /**
   * Show debug panel
   */
  function showDebugPanel() {
    const panel = createDebugPanel();
    panel.style.display = 'block';
    updateDebugContent();
  }

  /**
   * Hide debug panel
   */
  function hideDebugPanel() {
    if (debugPanel) {
      debugPanel.style.display = 'none';
    }
  }

  /**
   * Update debug panel content
   */
  function updateDebugContent() {
    const content = document.getElementById('factionDebugContent');
    if (!content) return;

    const player = global.State?.getPlayer();
    if (!player) return;

    const factions = player.factions || {};
    const allFactions = global.REALM?.data?.factionsById || {};

    let html = '<div style="margin-bottom: 20px;">';
    html += '<h3 style="color: #fff; margin-bottom: 10px;">Your Faction Standings</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 10px; margin-bottom: 10px;">';
    html += '<div style="font-weight: bold; color: #aaa;">Faction</div>';
    html += '<div style="font-weight: bold; color: #aaa;">Standing</div>';
    html += '<div style="font-weight: bold; color: #aaa;">Value</div>';
    html += '<div style="font-weight: bold; color: #aaa;">Adjust</div>';
    html += '</div>';

    // Show all factions
    Object.keys(allFactions).forEach(factionId => {
      const faction = allFactions[factionId];
      const value = factions[factionId] || 0;
      const standing = global.FactionSystem?.getFactionStandingName(value) || 'Indifferent';
      
      let standingColor = '#fff';
      if (value >= 500) standingColor = '#00ff00'; // Green for friendly
      else if (value >= 0) standingColor = '#ffff00'; // Yellow for neutral
      else if (value >= -500) standingColor = '#ff8000'; // Orange for negative
      else standingColor = '#ff0000'; // Red for hostile

      html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 10px; padding: 5px; border-bottom: 1px solid #333;">';
      html += `<div style="color: #fff;">${faction.name}</div>`;
      html += `<div style="color: ${standingColor};">${standing}</div>`;
      html += `<div style="color: #aaa;">${value}</div>`;
      html += `<div style="display: flex; gap: 5px;">`;
      html += `<button onclick="window.FactionDebug.adjustFaction('${factionId}', -100)" style="background: #ff4444; color: #fff; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">-100</button>`;
      html += `<button onclick="window.FactionDebug.adjustFaction('${factionId}', -10)" style="background: #ff8844; color: #fff; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">-10</button>`;
      html += `<button onclick="window.FactionDebug.adjustFaction('${factionId}', 10)" style="background: #44ff44; color: #fff; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">+10</button>`;
      html += `<button onclick="window.FactionDebug.adjustFaction('${factionId}', 100)" style="background: #44ff88; color: #fff; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">+100</button>`;
      html += `</div>`;
      html += '</div>';
    });

    html += '</div>';

    // Add slash command info
    html += '<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">';
    html += '<h3 style="color: #fff; margin-bottom: 10px;">Slash Commands</h3>';
    html += '<div style="color: #aaa; font-family: monospace;">';
    html += '/factions - Show this panel<br>';
    html += '/faction &lt;factionId&gt; &lt;amount&gt; - Adjust faction standing<br>';
    html += '/factionreset - Reset all factions to default<br>';
    html += '</div>';
    html += '</div>';

    content.innerHTML = html;
  }

  /**
   * Adjust faction standing
   */
  function adjustFaction(factionId, amount) {
    if (global.Factions?.modifyFaction) {
      global.Factions.modifyFaction(factionId, amount);
      updateDebugContent();
    }
  }

  /**
   * Reset all factions
   */
  function resetFactions() {
    const player = global.State?.getPlayer();
    if (!player) return;

    // Reset to race defaults
    const race = global.REALM?.data?.racesById?.[player.race];
    const factions = {};
    
    if (race) {
      factions[race.faction] = 0; // Indifferent
      (race.enemyFactions || []).forEach(factionId => {
        factions[factionId] = -500; // Scowls
      });
    }

    global.State?.updatePlayer({ factions: factions });
    updateDebugContent();
    
    global.Narrative?.addEntry({
      type: 'system',
      text: 'All faction standings have been reset.',
      meta: 'Faction Reset'
    });
  }

  /**
   * Handle slash commands
   */
  function handleSlashCommand(command, args) {
    if (command === 'factions') {
      showDebugPanel();
      return true;
    } else if (command === 'faction' && args.length >= 2) {
      const factionId = args[0];
      const amount = parseInt(args[1], 10);
      if (!isNaN(amount)) {
        adjustFaction(factionId, amount);
        return true;
      }
    } else if (command === 'factionreset') {
      resetFactions();
      return true;
    }
    return false;
  }

  /**
   * Initialize debug system
   */
  function initialize() {
    // Register slash command handler
    if (global.ChatSystem?.registerSlashCommand) {
      global.ChatSystem.registerSlashCommand('factions', handleSlashCommand);
      global.ChatSystem.registerSlashCommand('faction', handleSlashCommand);
      global.ChatSystem.registerSlashCommand('factionreset', handleSlashCommand);
    }
  }

  const FactionDebug = {
    showDebugPanel,
    hideDebugPanel,
    adjustFaction,
    resetFactions,
    handleSlashCommand,
    initialize
  };

  global.FactionDebug = FactionDebug;

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }
})(window);

