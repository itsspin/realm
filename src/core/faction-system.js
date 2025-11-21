/**
 * Enhanced Faction System
 * 
 * Implements EverQuest-style faction standings and /con behavior.
 * 
 * Faction Standings:
 * - Ally (1100+)
 * - Warmly (750-1100)
 * - Kindly (500-750)
 * - Amiable (100-500)
 * - Indifferent (0-100)
 * - Apprehensive (-100-0)
 * - Dubious (-500--100)
 * - Threatening (-750--500)
 * - Scowls (-2000--750)
 */

(function (global) {
  /**
   * Get faction standing from value
   */
  function getFactionStanding(value) {
    if (value >= 1100) return 'ally';
    if (value >= 750) return 'warmly';
    if (value >= 500) return 'kindly';
    if (value >= 100) return 'amiable';
    if (value >= 0) return 'indifferent';
    if (value >= -100) return 'apprehensive';
    if (value >= -500) return 'dubious';
    if (value >= -750) return 'threatening';
    return 'scowls';
  }

  /**
   * Get faction standing display name
   */
  function getFactionStandingName(value) {
    const standing = getFactionStanding(value);
    const names = {
      'ally': 'Ally',
      'warmly': 'Warmly',
      'kindly': 'Kindly',
      'amiable': 'Amiable',
      'indifferent': 'Indifferent',
      'apprehensive': 'Apprehensive',
      'dubious': 'Dubious',
      'threatening': 'Threatening',
      'scowls': 'Scowls'
    };
    return names[standing] || 'Indifferent';
  }

  /**
   * Get player's standing with a faction
   */
  function getPlayerStanding(factionId) {
    const player = global.State?.getPlayer();
    if (!player || !player.factions) return 'indifferent';
    
    const value = player.factions[factionId] || 0;
    return getFactionStanding(value);
  }

  /**
   * Get /con (consider) description for a mob
   * Combines level difference and faction standing
   */
  function getConDescription(mob, player) {
    if (!mob || !player) return 'Unknown';
    
    const playerLevel = player.level || 1;
    const mobLevel = mob.level || mob.mobTemplate?.levelRange?.min || 1;
    const levelDiff = mobLevel - playerLevel;
    
    // Get faction standing
    const mobTemplate = mob.mobTemplate || mob;
    const factionId = mobTemplate.factionId;
    let factionStanding = 'indifferent';
    let factionName = '';
    
    if (factionId) {
      factionStanding = getPlayerStanding(factionId);
      const faction = global.REALM?.data?.factionsById?.[factionId];
      factionName = faction ? faction.name : factionId;
    }
    
    // Level-based con
    let levelCon = '';
    if (levelDiff <= -10) {
      levelCon = 'trivial';
    } else if (levelDiff <= -5) {
      levelCon = 'easy';
    } else if (levelDiff <= -3) {
      levelCon = 'weak';
    } else if (levelDiff <= -1) {
      levelCon = 'decent';
    } else if (levelDiff === 0) {
      levelCon = 'even';
    } else if (levelDiff <= 2) {
      levelCon = 'tough';
    } else if (levelDiff <= 4) {
      levelCon = 'very tough';
    } else {
      levelCon = 'impossible';
    }
    
    // Faction-based description
    let factionDesc = '';
    if (factionId) {
      switch (factionStanding) {
        case 'ally':
        case 'warmly':
        case 'kindly':
          factionDesc = 'looks friendly';
          break;
        case 'amiable':
          factionDesc = 'regards you amiably';
          break;
        case 'indifferent':
          factionDesc = 'regards you indifferently';
          break;
        case 'apprehensive':
          factionDesc = 'looks apprehensive';
          break;
        case 'dubious':
          factionDesc = 'regards you dubiously';
          break;
        case 'threatening':
          factionDesc = 'glowers at you threateningly';
          break;
        case 'scowls':
          factionDesc = 'scowls at you, ready to attack';
          break;
        default:
          factionDesc = 'regards you indifferently';
      }
    } else {
      // No faction - neutral mob
      factionDesc = 'regards you indifferently';
    }
    
    // Combine level and faction
    return `${mobTemplate.name || 'Unknown'} - ${levelCon} (${factionDesc})`;
  }

  /**
   * Check if player is hostile to a faction
   */
  function isHostileToFaction(factionId) {
    const standing = getPlayerStanding(factionId);
    return standing === 'threatening' || standing === 'scowls';
  }

  /**
   * Check if player is friendly to a faction
   */
  function isFriendlyToFaction(factionId) {
    const standing = getPlayerStanding(factionId);
    return standing === 'ally' || standing === 'warmly' || standing === 'kindly';
  }

  /**
   * Check if guard should attack player
   */
  function shouldGuardAttackPlayer(guardFactionId, player) {
    if (!guardFactionId || !player) return false;
    
    // Check faction standing
    if (isHostileToFaction(guardFactionId)) {
      return true;
    }
    
    // Check if player is criminal (attacked friendlies in city)
    if (player.isCriminal && player.criminalUntil) {
      const now = Date.now();
      if (now < player.criminalUntil) {
        return true;
      } else {
        // Criminal flag expired
        global.State?.updatePlayer({ isCriminal: false, criminalUntil: null });
      }
    }
    
    // Check race alignment vs guard faction
    const guardFaction = global.REALM?.data?.factionsById?.[guardFactionId];
    if (guardFaction && guardFaction.aggressiveTo) {
      const race = global.REALM?.data?.racesById?.[player.race];
      if (race && guardFaction.aggressiveTo.includes(race.alignment)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if guard should attack mob
   */
  function shouldGuardAttackMob(guardFactionId, mob) {
    if (!guardFactionId || !mob) return false;
    
    const mobTemplate = mob.mobTemplate || mob;
    const mobFactionId = mobTemplate.factionId;
    
    if (!mobFactionId) return false; // Neutral mobs aren't attacked
    
    // Get guard faction
    const guardFaction = global.REALM?.data?.factionsById?.[guardFactionId];
    if (!guardFaction) return false;
    
    // Get mob faction
    const mobFaction = global.REALM?.data?.factionsById?.[mobFactionId];
    if (!mobFaction) return false;
    
    // Guards attack evil factions in good cities
    if (guardFaction.alignment === 'good' && mobFaction.alignment === 'evil') {
      return true;
    }
    
    // Guards attack if mob faction is in aggressiveTo list
    if (guardFaction.aggressiveTo && guardFaction.aggressiveTo.includes(mobFaction.alignment)) {
      return true;
    }
    
    // Check if mob faction is enemy of guard faction
    if (guardFaction.enemyFactions && guardFaction.enemyFactions.includes(mobFactionId)) {
      return true;
    }
    
    return false;
  }

  /**
   * Mark player as criminal (attacked friendly in city)
   */
  function markPlayerCriminal(durationSeconds = 300) {
    const player = global.State?.getPlayer();
    if (!player) return;
    
    const criminalUntil = Date.now() + (durationSeconds * 1000);
    global.State?.updatePlayer({
      isCriminal: true,
      criminalUntil: criminalUntil
    });
    
    global.Narrative?.addEntry({
      type: 'system',
      text: 'You have been flagged as a criminal! Guards will attack you on sight.',
      meta: 'Criminal Flag'
    });
  }

  /**
   * Apply faction changes from killing a mob
   */
  function applyKillFactionChanges(mobTemplate) {
    if (!mobTemplate || !mobTemplate.factionId) return;
    
    // Get faction changes from mob template
    const factionChanges = mobTemplate.factionChanges || {};
    
    // Apply changes
    Object.keys(factionChanges).forEach(factionId => {
      const change = factionChanges[factionId];
      if (global.Factions?.modifyFaction) {
        global.Factions.modifyFaction(factionId, change);
      }
    });
    
    // Default: lose standing with mob's faction
    if (!factionChanges[mobTemplate.factionId]) {
      if (global.Factions?.modifyFaction) {
        global.Factions.modifyFaction(mobTemplate.factionId, -5);
      }
    }
  }

  const FactionSystem = {
    getFactionStanding,
    getFactionStandingName,
    getPlayerStanding,
    getConDescription,
    isHostileToFaction,
    isFriendlyToFaction,
    shouldGuardAttackPlayer,
    shouldGuardAttackMob,
    markPlayerCriminal,
    applyKillFactionChanges
  };

  global.FactionSystem = FactionSystem;
})(window);

