/**
 * P99-Style Experience System
 * 
 * Based on Project 1999 experience mechanics:
 * - Group experience distribution based on level contributions
 * - Higher level members get proportionally more XP
 * - Group bonus multiplier (1.5x for 2 members, scaling up)
 * - Solo players get 100% of XP
 * 
 * Reference: https://wiki.project1999.com/Experience
 */

(function (global) {
  /**
   * Calculate experience distribution for group
   * 
   * P99 Formula:
   * - Total group XP = baseXP * groupBonus
   * - Group bonus: 1.5x for 2 members, increases with more members
   * - Each member gets: totalGroupXP * (memberLevel / sumOfAllLevels)
   */
  function calculateGroupXP(baseXP, partyMembers) {
    if (!partyMembers || partyMembers.length <= 1) {
      // Solo: 100% XP, no bonus
      return { totalXP: baseXP, distribution: [] };
    }

    // Group bonus multiplier (P99-style)
    // 2 members: 1.5x, 3: 1.6x, 4: 1.7x, 5: 1.8x, 6: 1.9x
    const groupSize = partyMembers.length;
    const groupBonus = 1.4 + (groupSize * 0.1); // 1.5x for 2, up to 1.9x for 6
    
    const totalGroupXP = Math.floor(baseXP * groupBonus);
    
    // Calculate sum of all levels
    const sumOfLevels = partyMembers.reduce((sum, member) => {
      return sum + (member.level || 1);
    }, 0);
    
    // Distribute XP based on level contribution
    const distribution = partyMembers.map(member => {
      const memberLevel = member.level || 1;
      const memberXP = Math.floor(totalGroupXP * (memberLevel / sumOfLevels));
      
      return {
        playerId: member.id,
        playerName: member.name,
        level: memberLevel,
        xpGain: memberXP
      };
    });
    
    return {
      totalXP: totalGroupXP,
      groupBonus: groupBonus,
      distribution: distribution
    };
  }

  /**
   * Award XP to player (with group distribution if in party)
   */
  function awardXPForKill(baseXP, mobLevel, killerId) {
    const player = global.State?.getPlayer();
    if (!player) return;

    // Check if in party
    const partyMembers = global.Party?.getPartyMembers() || [];
    const isInParty = partyMembers.length > 1;
    
    let actualXPGain = baseXP;
    
    if (isInParty) {
      // Get all party member data (in real game, would fetch from server)
      // For now, assume all members are nearby and eligible
      const partyData = partyMembers.map(memberId => {
        // In real game, fetch member data from server
        // For now, if it's the local player, use their data
        if (memberId === player.id) {
          return {
            id: player.id,
            name: player.name,
            level: player.level || 1
          };
        }
        // For other members, would need to fetch their data
        // For single-player, this won't be called
        return {
          id: memberId,
          name: memberId,
          level: 1 // Would be fetched from server
        };
      });
      
      const groupXP = calculateGroupXP(baseXP, partyData);
      
      // Find this player's share
      const playerShare = groupXP.distribution.find(d => d.playerId === player.id);
      if (playerShare) {
        actualXPGain = playerShare.xpGain;
        
        // Notify about group XP (in party chat or system message)
        global.ChatSystem?.addChatMessage('party', 'System', 
          `Group XP: ${groupXP.totalXP} total (${groupXP.groupBonus.toFixed(1)}x bonus). You receive: ${actualXPGain} XP.`, 
          'system');
      }
    }
    
    // Award XP to player
    if (actualXPGain > 0) {
      global.Leveling?.addXP(actualXPGain);
    }
    
    // Award combat skill XP
    global.Skills?.addSkillXP('combat', Math.floor(actualXPGain / 2));
    
    return actualXPGain;
  }

  /**
   * Calculate zone experience modifier (ZEM)
   * Different zones give different XP multipliers
   * Reference: P99 zones have different ZEM values
   */
  function getZoneExperienceModifier(zoneId) {
    // ZEM values (1.0 = normal, >1.0 = bonus, <1.0 = penalty)
    const zemValues = {
      // Starter zones: slight bonus
      'thronehold_gates': 1.0,
      'weeping_woods_outskirts': 1.0,
      'stonecrag_outskirts': 1.0,
      
      // Dungeons: often higher ZEM (but dangerous)
      // Would be defined per dungeon
      
      // Default
      'default': 1.0
    };
    
    return zemValues[zoneId] || zemValues.default;
  }

  /**
   * Apply ZEM to base XP
   */
  function applyZEM(baseXP, zoneId) {
    const zem = getZoneExperienceModifier(zoneId);
    return Math.floor(baseXP * zem);
  }

  const P99Experience = {
    calculateGroupXP,
    awardXPForKill,
    getZoneExperienceModifier,
    applyZEM
  };

  global.P99Experience = P99Experience;
})(window);

