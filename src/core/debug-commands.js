/**
 * Debug Commands System
 * 
 * Provides debug commands for development mode:
 * - Teleport to zones/tiles
 * - Spawn/despawn specific mobs
 * - Grant XP, levels, items
 * - Adjust faction standings
 * 
 * Only available when dev mode is enabled.
 * 
 * Usage:
 * - In console: debug.teleport('zoneId', x, y)
 * - Via chat: /teleport zoneId x y
 * - Via chat: /spawn mobTemplateId
 * - Via chat: /xp amount
 * - Via chat: /level level
 * - Via chat: /item itemId
 * - Via chat: /faction factionId amount
 * 
 * @module DebugCommands
 */

(function (global) {
  let isEnabled = false;
  let commandHistory = [];

  /**
   * Check if dev mode is enabled
   */
  function checkDevMode() {
    return localStorage.getItem('realm_dev_mode') === 'true' || 
           new URLSearchParams(window.location.search).get('dev') === 'true';
  }

  /**
   * Enable dev mode
   */
  function enableDevMode() {
    localStorage.setItem('realm_dev_mode', 'true');
    isEnabled = true;
    console.log('[Debug] Dev mode enabled. Type /help for debug commands.');
    if (global.ChatSystem) {
      global.ChatSystem.addSystemMessage('Debug mode enabled. Type /help for debug commands.');
    }
  }

  /**
   * Disable dev mode
   */
  function disableDevMode() {
    localStorage.removeItem('realm_dev_mode');
    isEnabled = false;
    console.log('[Debug] Dev mode disabled.');
  }

  /**
   * Teleport player to a zone and tile
   * 
   * @param {string} zoneId - Zone ID to teleport to
   * @param {number} x - X coordinate (optional, defaults to zone center)
   * @param {number} y - Y coordinate (optional, defaults to zone center)
   */
  function teleport(zoneId, x, y) {
    if (!checkDevMode()) {
      console.warn('[Debug] Dev mode not enabled. Use debug.enableDevMode() first.');
      return false;
    }

    const player = global.State?.getPlayer();
    if (!player) {
      console.error('[Debug] No player found');
      return false;
    }

    const zone = global.World?.getZone(zoneId);
    if (!zone) {
      console.error(`[Debug] Zone ${zoneId} not found`);
      return false;
    }

    // Default to zone center if coordinates not provided
    const targetX = x !== undefined ? x : Math.floor(zone.gridWidth / 2);
    const targetY = y !== undefined ? y : Math.floor(zone.gridHeight / 2);

    // Validate tile
    if (!global.World?.isTileWalkable(zoneId, targetX, targetY)) {
      console.warn(`[Debug] Tile (${targetX}, ${targetY}) is not walkable, finding nearest walkable tile...`);
      // Find nearest walkable tile
      let found = false;
      for (let radius = 1; radius <= 10 && !found; radius++) {
        for (let dx = -radius; dx <= radius && !found; dx++) {
          for (let dy = -radius; dy <= radius && !found; dy++) {
            const testX = targetX + dx;
            const testY = targetY + dy;
            if (global.World?.isTileWalkable(zoneId, testX, testY)) {
              found = true;
              global.State?.updatePlayer({
                currentZone: zoneId,
                currentTile: { x: testX, y: testY },
                x: testX,
                y: testY
              });
              console.log(`[Debug] Teleported to ${zoneId} at (${testX}, ${testY})`);
              if (global.ChatSystem) {
                global.ChatSystem.addSystemMessage(`Teleported to ${zone.name} at (${testX}, ${testY})`);
              }
              // Initialize spawn system for new zone
              if (global.SpawnSystem) {
                global.SpawnSystem.initializeZone(zoneId);
              }
              // Update map
              if (global.WorldMapRender) {
                global.WorldMapRender.renderMap();
                global.WorldMapRender.centerOnPlayer();
              }
              return true;
            }
          }
        }
      }
      console.error(`[Debug] Could not find walkable tile near (${targetX}, ${targetY})`);
      return false;
    }

    global.State?.updatePlayer({
      currentZone: zoneId,
      currentTile: { x: targetX, y: targetY },
      x: targetX,
      y: targetY
    });

    console.log(`[Debug] Teleported to ${zoneId} at (${targetX}, ${targetY})`);
    if (global.ChatSystem) {
      global.ChatSystem.addSystemMessage(`Teleported to ${zone.name} at (${targetX}, ${targetY})`);
    }

    // Initialize spawn system for new zone
    if (global.SpawnSystem) {
      global.SpawnSystem.initializeZone(zoneId);
    }

    // Update map
    if (global.WorldMapRender) {
      global.WorldMapRender.renderMap();
      global.WorldMapRender.centerOnPlayer();
    }

    return true;
  }

  /**
   * Spawn a mob at player's location
   * 
   * @param {string} mobTemplateId - Mob template ID to spawn
   * @param {number} x - X coordinate (optional, defaults to player position)
   * @param {number} y - Y coordinate (optional, defaults to player position)
   */
  function spawnMob(mobTemplateId, x, y) {
    if (!checkDevMode()) {
      console.warn('[Debug] Dev mode not enabled.');
      return false;
    }

    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) {
      console.error('[Debug] No player or zone found');
      return false;
    }

    const mobTemplate = global.World?.getMobTemplate(mobTemplateId);
    if (!mobTemplate) {
      console.error(`[Debug] Mob template ${mobTemplateId} not found`);
      return false;
    }

    const zoneId = player.currentZone;
    const spawnX = x !== undefined ? x : (player.currentTile?.x || player.x || 0);
    const spawnY = y !== undefined ? y : (player.currentTile?.y || player.y || 0);

    // Check if tile is walkable
    if (!global.World?.isTileWalkable(zoneId, spawnX, spawnY)) {
      console.error(`[Debug] Tile (${spawnX}, ${spawnY}) is not walkable`);
      return false;
    }

    // Create mob entity
    const entityId = `debug_${mobTemplateId}_${Date.now()}`;
    const mobEntity = global.SpawnSystem?._debugCreateMobEntity?.(mobTemplate, zoneId, spawnX, spawnY, null);
    
    if (mobEntity && global.SpawnSystem) {
      // Access internal activeMobs map (hacky but works for debug)
      if (global.SpawnSystem._debugAddMob) {
        global.SpawnSystem._debugAddMob(entityId, mobEntity);
      } else {
        console.warn('[Debug] Cannot directly add mob. Use spawn group system instead.');
        return false;
      }
      
      console.log(`[Debug] Spawned ${mobTemplateId} at (${spawnX}, ${spawnY})`);
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage(`Spawned ${mobTemplate.name || mobTemplateId} at (${spawnX}, ${spawnY})`);
      }
      return true;
    }

    return false;
  }

  /**
   * Despawn a mob at a tile
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  function despawnMob(x, y) {
    if (!checkDevMode()) {
      console.warn('[Debug] Dev mode not enabled.');
      return false;
    }

    const player = global.State?.getPlayer();
    if (!player || !player.currentZone) {
      console.error('[Debug] No player or zone found');
      return false;
    }

    const zoneId = player.currentZone;
    const mob = global.SpawnSystem?.getMobAtTile(zoneId, x, y);
    
    if (mob) {
      global.SpawnSystem?.killMob(mob.id);
      console.log(`[Debug] Despawned mob at (${x}, ${y})`);
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage(`Despawned mob at (${x}, ${y})`);
      }
      return true;
    } else {
      console.warn(`[Debug] No mob found at (${x}, ${y})`);
      return false;
    }
  }

  /**
   * Grant XP to player
   * 
   * @param {number} amount - Amount of XP to grant
   */
  function grantXP(amount) {
    if (!checkDevMode()) {
      console.warn('[Debug] Dev mode not enabled.');
      return false;
    }

    if (!amount || amount <= 0) {
      console.error('[Debug] Invalid XP amount');
      return false;
    }

    if (global.Leveling?.addXP) {
      global.Leveling.addXP(amount);
      console.log(`[Debug] Granted ${amount} XP`);
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage(`Granted ${amount} XP`);
      }
      return true;
    }

    return false;
  }

  /**
   * Set player level
   * 
   * @param {number} level - Target level
   */
  function setLevel(level) {
    if (!checkDevMode()) {
      console.warn('[Debug] Dev mode not enabled.');
      return false;
    }

    if (!level || level < 1 || level > 50) {
      console.error('[Debug] Invalid level (must be 1-50)');
      return false;
    }

    const player = global.State?.getPlayer();
    if (!player) {
      console.error('[Debug] No player found');
      return false;
    }

    const currentLevel = player.level || 1;
    if (currentLevel === level) {
      console.log(`[Debug] Player already at level ${level}`);
      return true;
    }

    // Calculate XP needed to reach target level
    let totalXPNeeded = 0;
    for (let l = 1; l < level; l++) {
      totalXPNeeded += global.Leveling?.calculateXPForLevel?.(l) || 100;
    }

    // Set player to target level
    global.State?.updatePlayer({
      level: level,
      xp: 0,
      xpToNext: global.Leveling?.calculateXPForLevel?.(level) || 100
    });

    console.log(`[Debug] Set player level to ${level}`);
    if (global.ChatSystem) {
      global.ChatSystem.addSystemMessage(`Level set to ${level}`);
    }

    // Update UI
    if (global.Rendering) {
      global.Rendering.updateCharacterPanel();
    }

    return true;
  }

  /**
   * Grant an item to player
   * 
   * @param {string} itemId - Item ID to grant
   * @param {number} quantity - Quantity (default: 1)
   */
  function grantItem(itemId, quantity = 1) {
    if (!checkDevMode()) {
      console.warn('[Debug] Dev mode not enabled.');
      return false;
    }

    const item = global.REALM?.data?.itemsById?.[itemId.toLowerCase()];
    if (!item) {
      console.error(`[Debug] Item ${itemId} not found`);
      return false;
    }

    let granted = 0;
    for (let i = 0; i < quantity; i++) {
      if (global.State?.addItem(itemId)) {
        granted++;
      }
    }

    if (granted > 0) {
      console.log(`[Debug] Granted ${granted}x ${item.name || itemId}`);
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage(`Granted ${granted}x ${item.name || itemId}`);
      }
      return true;
    }

    return false;
  }

  /**
   * Adjust faction standing
   * 
   * @param {string} factionId - Faction ID
   * @param {number} amount - Amount to adjust (positive or negative)
   */
  function adjustFaction(factionId, amount) {
    if (!checkDevMode()) {
      console.warn('[Debug] Dev mode not enabled.');
      return false;
    }

    const faction = global.REALM?.data?.factionsById?.[factionId];
    if (!faction) {
      console.error(`[Debug] Faction ${factionId} not found`);
      return false;
    }

    if (global.Factions?.modifyFaction) {
      global.Factions.modifyFaction(factionId, amount);
      const newStanding = global.Factions?.getPlayerFactions?.()[factionId] || 0;
      const standingName = global.Factions?.getFactionStanding?.(newStanding) || 'Unknown';
      
      console.log(`[Debug] Adjusted ${factionId} by ${amount}. New standing: ${standingName} (${newStanding})`);
      if (global.ChatSystem) {
        global.ChatSystem.addSystemMessage(`${faction.name}: ${standingName} (${newStanding})`);
      }
      return true;
    }

    return false;
  }

  /**
   * Show help message
   */
  function showHelp() {
    if (!checkDevMode()) {
      console.warn('[Debug] Dev mode not enabled.');
      return;
    }

    const help = `
Debug Commands:
  /teleport <zoneId> [x] [y]  - Teleport to zone/tile
  /spawn <mobTemplateId> [x] [y]  - Spawn mob at location
  /despawn [x] [y]  - Despawn mob at tile
  /xp <amount>  - Grant XP
  /level <level>  - Set player level (1-50)
  /item <itemId> [quantity]  - Grant item
  /faction <factionId> <amount>  - Adjust faction standing
  /help  - Show this help

Console API:
  debug.teleport(zoneId, x, y)
  debug.spawnMob(mobTemplateId, x, y)
  debug.grantXP(amount)
  debug.setLevel(level)
  debug.grantItem(itemId, quantity)
  debug.adjustFaction(factionId, amount)
  debug.enableDevMode()
  debug.disableDevMode()
`;
    console.log(help);
    if (global.ChatSystem) {
      global.ChatSystem.addSystemMessage('Debug commands available. Type /help in console for details.');
    }
  }

  /**
   * Handle chat command
   * 
   * @param {string} command - Command string (e.g., "/teleport zoneId 10 10")
   */
  function handleCommand(command) {
    if (!checkDevMode()) {
      return false;
    }

    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/teleport':
      case '/tp':
        if (parts.length >= 2) {
          const zoneId = parts[1];
          const x = parts.length >= 3 ? parseInt(parts[2]) : undefined;
          const y = parts.length >= 4 ? parseInt(parts[3]) : undefined;
          return teleport(zoneId, x, y);
        }
        break;

      case '/spawn':
        if (parts.length >= 2) {
          const mobTemplateId = parts[1];
          const x = parts.length >= 3 ? parseInt(parts[2]) : undefined;
          const y = parts.length >= 4 ? parseInt(parts[3]) : undefined;
          return spawnMob(mobTemplateId, x, y);
        }
        break;

      case '/despawn':
        const player = global.State?.getPlayer();
        if (player) {
          const x = parts.length >= 2 ? parseInt(parts[1]) : (player.currentTile?.x || player.x || 0);
          const y = parts.length >= 3 ? parseInt(parts[2]) : (player.currentTile?.y || player.y || 0);
          return despawnMob(x, y);
        }
        break;

      case '/xp':
        if (parts.length >= 2) {
          const amount = parseInt(parts[1]);
          return grantXP(amount);
        }
        break;

      case '/level':
        if (parts.length >= 2) {
          const level = parseInt(parts[1]);
          return setLevel(level);
        }
        break;

      case '/item':
        if (parts.length >= 2) {
          const itemId = parts[1];
          const quantity = parts.length >= 3 ? parseInt(parts[2]) : 1;
          return grantItem(itemId, quantity);
        }
        break;

      case '/faction':
        if (parts.length >= 3) {
          const factionId = parts[1];
          const amount = parseInt(parts[2]);
          return adjustFaction(factionId, amount);
        }
        break;

      case '/help':
      case '/debug':
        showHelp();
        return true;
    }

    return false;
  }

  // Initialize
  isEnabled = checkDevMode();

  // Hook into chat system if available
  if (global.ChatSystem && typeof global.ChatSystem.addCommandHandler === 'function') {
    global.ChatSystem.addCommandHandler(handleCommand);
  } else {
    // Fallback: intercept chat messages
    const originalSendMessage = global.ChatSystem?.sendMessage;
    if (originalSendMessage) {
      global.ChatSystem.sendMessage = function(message) {
        if (message.startsWith('/') && handleCommand(message)) {
          return; // Command handled
        }
        return originalSendMessage.call(this, message);
      };
    }
  }

  const DebugCommands = {
    isEnabled: () => isEnabled,
    enableDevMode,
    disableDevMode,
    teleport,
    spawnMob,
    despawnMob,
    grantXP,
    setLevel,
    grantItem,
    adjustFaction,
    showHelp,
    handleCommand
  };

  global.DebugCommands = DebugCommands;
  global.debug = DebugCommands; // Short alias

  // Auto-enable if URL has ?dev=true
  if (new URLSearchParams(window.location.search).get('dev') === 'true') {
    enableDevMode();
  }
})(window);

