(function (global) {
  function initializeQuests() {
    const player = global.State?.getPlayer();
    if (!player) return;

    // Start first quest if no active quests
    if (!player.activeQuests || player.activeQuests.length === 0) {
      const firstQuest = global.REALM?.data?.questsById?.['first_steps'];
      if (firstQuest) {
        player.activeQuests = [firstQuest.id];
        global.State?.updatePlayer({ activeQuests: player.activeQuests });
        global.Narrative?.addEntry({
          type: 'quest',
          text: `New Quest: ${firstQuest.title}`,
          meta: firstQuest.description
        });
      }
    }
  }

  function checkKillQuest(monsterId) {
    const player = global.State?.getPlayer();
    if (!player || !player.activeQuests) return;

    const activeQuests = [...player.activeQuests];
    let updated = false;

    for (const questId of activeQuests) {
      const quest = global.REALM?.data?.questsById?.[questId];
      if (!quest || quest.type !== 'kill' || quest.target !== monsterId) continue;

      quest.progress = (quest.progress || 0) + 1;

      if (quest.progress >= quest.targetCount) {
        // Complete quest
        completeQuest(questId);
        updated = true;
      } else {
        global.Narrative?.addEntry({
          type: 'quest',
          text: `Quest Progress: ${quest.title} (${quest.progress}/${quest.targetCount})`,
          meta: ''
        });
      }
    }

    if (updated) {
      global.Rendering?.updateQuestLog();
    }
  }

  function completeQuest(questId) {
    const player = global.State?.getPlayer();
    if (!player) return;

    const quest = global.REALM?.data?.questsById?.[questId];
    if (!quest) return;

    // Remove from active
    player.activeQuests = (player.activeQuests || []).filter(id => id !== questId);
    player.completedQuests = [...(player.completedQuests || []), questId];

    // Award rewards
    if (quest.rewards) {
      if (quest.rewards.xp) {
        global.Leveling?.addXP(quest.rewards.xp);
      }
      if (quest.rewards.gold) {
        global.State?.updatePlayer({
          gold: (player.gold || 0) + quest.rewards.gold
        });
      }
      if (quest.rewards.items) {
        quest.rewards.items.forEach(itemId => {
          global.State?.addItem(itemId);
        });
      }
    }

    global.Narrative?.addEntry({
      type: 'quest',
      text: `Quest Complete: ${quest.title}`,
      meta: 'Rewards received!'
    });

    global.Toast?.show({
      type: 'quest',
      title: 'Quest Complete!',
      text: quest.title
    });

    // Check for new quests
    checkQuestPrerequisites();

    global.State?.updatePlayer({
      activeQuests: player.activeQuests,
      completedQuests: player.completedQuests
    });

    global.Rendering?.updateQuestLog();
    global.Rendering?.updateCharacterPanel();
  }

  function checkQuestPrerequisites() {
    const player = global.State?.getPlayer();
    if (!player) return;

    const allQuests = global.REALM?.data?.quests || [];
    const completed = new Set(player.completedQuests || []);
    const active = new Set(player.activeQuests || []);

    for (const quest of allQuests) {
      if (active.has(quest.id) || completed.has(quest.id)) continue;

      const prereqsMet = !quest.prerequisites || quest.prerequisites.every(prereq => completed.has(prereq));
      if (prereqsMet) {
        player.activeQuests = [...(player.activeQuests || []), quest.id];
        global.Narrative?.addEntry({
          type: 'quest',
          text: `New Quest: ${quest.title}`,
          meta: quest.description
        });
      }
    }

    if (player.activeQuests.length > (active.size)) {
      global.State?.updatePlayer({ activeQuests: player.activeQuests });
      global.Rendering?.updateQuestLog();
    }
  }

  const Quests = {
    initializeQuests,
    checkKillQuest,
    completeQuest,
    checkQuestPrerequisites
  };

  global.Quests = Quests;
})(window);


