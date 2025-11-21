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

  /**
   * Check if player can turn in quest item to NPC
   */
  function canTurnInQuest(npcId, itemId) {
    const player = global.State?.getPlayer();
    if (!player || !player.activeQuests) return false;

    const npc = global.REALM?.data?.npcsById?.[npcId];
    if (!npc || !npc.quests) return false;

    // Check if NPC has any quests that require this item
    for (const questId of player.activeQuests) {
      const quest = global.REALM?.data?.questsById?.[questId];
      if (!quest || quest.type !== 'turnin') continue;
      
      // Check if this quest is from this NPC
      if (quest.npcId !== npcId) continue;
      
      // Check if item matches quest requirements
      if (quest.requiredItems && quest.requiredItems.includes(itemId)) {
        return { quest, canComplete: true };
      }
    }

    return false;
  }

  /**
   * Turn in quest item to NPC
   */
  function turnInQuestItem(npcId, itemId) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    const result = canTurnInQuest(npcId, itemId);
    if (!result || !result.canComplete) {
      global.Narrative?.addEntry({
        type: 'system',
        text: 'This item is not needed for any quest.',
        meta: 'Quest'
      });
      return false;
    }

    const quest = result.quest;
    
    // Check if player has all required items
    const requiredItems = quest.requiredItems || [];
    const requiredCounts = quest.requiredItemCounts || {};
    
    for (const reqItemId of requiredItems) {
      const count = requiredCounts[reqItemId] || 1;
      const playerItemCount = (player.inventory || []).filter(
        invItem => invItem.itemId === reqItemId
      ).length;
      
      if (playerItemCount < count) {
        global.Narrative?.addEntry({
          type: 'system',
          text: `You need ${count}x ${reqItemId.replace(/_/g, ' ')} to complete this quest.`,
          meta: 'Quest'
        });
        return false;
      }
    }

    // Remove required items from inventory
    for (const reqItemId of requiredItems) {
      const count = requiredCounts[reqItemId] || 1;
      for (let i = 0; i < count; i++) {
        global.State?.removeItem(reqItemId);
      }
    }

    // Complete quest
    completeQuest(quest.id);
    return true;
  }

  /**
   * Get quest dialogue for NPC
   */
  function getQuestDialogue(npcId) {
    const npc = global.REALM?.data?.npcsById?.[npcId];
    if (!npc || !npc.quests) return null;

    const player = global.State?.getPlayer();
    if (!player) return null;

    const availableQuests = [];
    const activeQuests = [];
    const completedQuests = new Set(player.completedQuests || []);

    // Check each quest from this NPC
    for (const questId of npc.quests) {
      const quest = global.REALM?.data?.questsById?.[questId];
      if (!quest) continue;

      if (completedQuests.has(questId)) continue; // Already completed

      // Check prerequisites
      const prereqsMet = !quest.prerequisites || quest.prerequisites.every(
        prereq => completedQuests.has(prereq)
      );

      if (player.activeQuests && player.activeQuests.includes(questId)) {
        activeQuests.push(quest);
      } else if (prereqsMet) {
        availableQuests.push(quest);
      }
    }

    return {
      npc,
      availableQuests,
      activeQuests,
      dialogue: npc.questDialogue || npc.description
    };
  }

  /**
   * Accept quest from NPC
   */
  function acceptQuest(questId) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    const quest = global.REALM?.data?.questsById?.[questId];
    if (!quest) return false;

    // Check prerequisites
    const completedQuests = new Set(player.completedQuests || []);
    if (quest.prerequisites && !quest.prerequisites.every(prereq => completedQuests.has(prereq))) {
      global.Narrative?.addEntry({
        type: 'system',
        text: 'You have not completed the prerequisites for this quest.',
        meta: 'Quest'
      });
      return false;
    }

    // Check if already active or completed
    if (player.activeQuests && player.activeQuests.includes(questId)) {
      global.Narrative?.addEntry({
        type: 'system',
        text: 'You already have this quest.',
        meta: 'Quest'
      });
      return false;
    }

    if (completedQuests.has(questId)) {
      global.Narrative?.addEntry({
        type: 'system',
        text: 'You have already completed this quest.',
        meta: 'Quest'
      });
      return false;
    }

    // Add to active quests
    player.activeQuests = [...(player.activeQuests || []), questId];
    global.State?.updatePlayer({ activeQuests: player.activeQuests });

    global.Narrative?.addEntry({
      type: 'quest',
      text: `Quest Accepted: ${quest.title}`,
      meta: quest.description
    });

    global.Rendering?.updateQuestLog();
    return true;
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
    checkQuestPrerequisites,
    canTurnInQuest,
    turnInQuestItem,
    getQuestDialogue,
    acceptQuest
  };

  global.Quests = Quests;
})(window);


