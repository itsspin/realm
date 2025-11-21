/**
 * Gathering System
 * 
 * Handles resource gathering from nodes in zones.
 * Supports foraging, mining, and other gathering professions.
 */

(function (global) {
  function gatherResource(resourceType, tile) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    const skillId = getSkillForResource(resourceType);
    if (skillId && !global.Skills?.canPerformAction(skillId, 1)) {
      global.Toast?.show({
        type: 'error',
        title: 'Skill Required',
        text: `You need at least level 1 in ${global.Skills?.SKILL_DEFINITIONS[skillId]?.name || skillId} to gather this resource.`
      });
      return false;
    }

    const resources = global.State?.data?.resources || {};
    const tileResources = tile?.resources || {};

    if (!tileResources[resourceType] || tileResources[resourceType] <= 0) {
      global.Narrative?.addEntry({
        type: 'system',
        text: `No ${resourceType} available here. You must find a richer location.`,
        meta: 'Gathering Failed'
      });
      return false;
    }

    // Gather resource
    const amount = calculateGatherAmount(resourceType, skillId);
    resources[resourceType] = (resources[resourceType] || 0) + amount;
    tileResources[resourceType] = Math.max(0, tileResources[resourceType] - amount);

    // Award skill XP
    if (skillId) {
      global.Skills?.addSkillXP(skillId, amount * 2);
    }

    global.State?.data.resources = resources;
    global.Rendering?.updateResourceBar();

    global.Narrative?.addEntry({
      type: 'gathering',
      text: `You gather ${amount} ${resourceType}. The land yields its bounty.`,
      meta: skillId ? `${global.Skills?.SKILL_DEFINITIONS[skillId]?.name || skillId} +${amount * 2} XP` : ''
    });

    // Track gathering stats
    global.PlayerStats?.incrementStat('resourcesGathered', amount);
    if (resourceType === 'ore') global.PlayerStats?.incrementStat('oreMined', amount);
    if (resourceType === 'food') global.PlayerStats?.incrementStat('fishCaught', amount);
    if (resourceType === 'timber') global.PlayerStats?.incrementStat('herbsGathered', amount);
    if (resourceType === 'essence') global.PlayerStats?.incrementStat('essenceHarvested', amount);
    global.Leaderboards?.updatePlayerRanking();

    return true;
  }

  function getSkillForResource(resourceType) {
    const mapping = {
      ore: 'mining',
      timber: 'herbalism',
      food: 'fishing',
      essence: 'arcane',
      herb: 'herbalism'
    };
    return mapping[resourceType] || null;
  }

  function gatherHerbs(tile) {
    return gatherResource('herb', tile);
  }

  function calculateGatherAmount(resourceType, skillId) {
    const baseAmount = 1;
    const skillLevel = skillId ? global.Skills?.getSkillLevel(skillId) || 1 : 1;
    const bonus = Math.floor(skillLevel / 5); // +1 per 5 levels
    return baseAmount + bonus + Math.floor(Math.random() * 2);
  }

  function mine(tile) {
    return gatherResource('ore', tile);
  }

  function fish(tile) {
    return gatherResource('food', tile);
  }

  function harvest(tile) {
    return gatherResource('timber', tile);
  }

  function gatherEssence(tile) {
    return gatherResource('essence', tile);
  }

  const Gathering = {
    gatherResource,
    mine,
    fish,
    harvest,
    gatherEssence,
    gatherHerbs
  };

  global.Gathering = Gathering;
})(window);

