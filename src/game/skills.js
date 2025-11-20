(function (global) {
  const SKILL_DEFINITIONS = {
    mining: { name: 'Mining', icon: '⛏️', description: 'Extract ore and stone from the earth' },
    fishing: { name: 'Fishing', icon: '🎣', description: 'Catch fish and aquatic resources' },
    skinning: { name: 'Skinning', icon: '🔪', description: 'Harvest hides and materials from beasts' },
    herbalism: { name: 'Herbalism', icon: '🌿', description: 'Gather plants and herbs' },
    arcane: { name: 'Arcane', icon: '✨', description: 'Channel magical energies' },
    alchemy: { name: 'Alchemy', icon: '⚗️', description: 'Brew potions and elixirs' },
    crafting: { name: 'Crafting', icon: '🔨', description: 'Create items and equipment' },
    combat: { name: 'Combat', icon: '⚔️', description: 'Master of battle' }
  };

  function getSkillLevel(skillId) {
    const player = global.State?.getPlayer();
    if (!player || !player.skills) return 0;
    return player.skills[skillId]?.level || 0;
  }

  function getSkillXP(skillId) {
    const player = global.State?.getPlayer();
    if (!player || !player.skills) return 0;
    return player.skills[skillId]?.xp || 0;
  }

  function addSkillXP(skillId, amount) {
    const player = global.State?.getPlayer();
    if (!player) return;

    if (!player.skills) {
      player.skills = {};
    }

    if (!player.skills[skillId]) {
      player.skills[skillId] = { level: 1, xp: 0 };
    }

    const skill = player.skills[skillId];
    skill.xp += amount;

    // Calculate XP needed for next level (exponential)
    const xpNeeded = Math.floor(100 * Math.pow(1.5, skill.level - 1));

    if (skill.xp >= xpNeeded && skill.level < 100) {
      skill.xp -= xpNeeded;
      skill.level++;

      global.Toast?.show({
        type: 'skill',
        title: 'Skill Level Up!',
        text: `${SKILL_DEFINITIONS[skillId]?.name || skillId} increased to level ${skill.level}!`
      });

      global.Narrative?.addEntry({
        type: 'system',
        text: `Your ${SKILL_DEFINITIONS[skillId]?.name || skillId} skill has reached level ${skill.level}.`,
        meta: 'Skill Progress'
      });
    }

    global.State?.updatePlayer({ skills: player.skills });
    global.Rendering?.updateSkillsPanel();
  }

  function canPerformAction(skillId, requiredLevel) {
    return getSkillLevel(skillId) >= requiredLevel;
  }

  const Skills = {
    getSkillLevel,
    getSkillXP,
    addSkillXP,
    canPerformAction,
    SKILL_DEFINITIONS
  };

  global.Skills = Skills;
})(window);


