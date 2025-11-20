(function (global) {
  let npcData = null;

  function loadNPCs() {
    if (npcData) return npcData;
    
    fetch('data/npcs.json')
      .then(res => res.json())
      .then(data => {
        npcData = {};
        data.forEach(npc => {
          npcData[npc.id] = npc;
        });
        if (global.REALM) {
          global.REALM.data = global.REALM.data || {};
          global.REALM.data.npcsById = npcData;
        }
      })
      .catch(err => {
        console.error('Failed to load NPCs:', err);
        npcData = {};
      });
    
    return npcData;
  }

  function getNPCsInZone(zoneId) {
    const npcs = global.REALM?.data?.npcsById || {};
    return Object.values(npcs).filter(npc => npc.zone === zoneId);
  }

  function interactWithNPC(npcId) {
    const npc = global.REALM?.data?.npcsById?.[npcId];
    if (!npc) return;

    const player = global.State?.getPlayer();
    if (!player) return;

    // Check guard aggression
    if (npc.type === 'guard' && npc.aggressiveTo) {
      const race = global.REALM?.data?.racesById?.[player.race];
      if (race && npc.aggressiveTo.includes(race.alignment)) {
        global.Narrative?.addEntry({
          type: 'combat',
          text: `${npc.name} attacks you! "Evil scum, you are not welcome here!"`,
          meta: 'Guard Attack'
        });
        // Start combat with guard
        global.Combat?.startCombat(npc.id);
        return;
      }
    }

    switch (npc.type) {
      case 'class_trainer':
        if (npc.class === player.class) {
          showClassTrainer(npc);
        } else {
          global.Narrative?.addEntry({
            type: 'system',
            text: `${npc.name} says: "I only train ${npc.class}s. You are a ${player.class}."`,
            meta: 'NPC'
          });
        }
        break;
      case 'merchant':
        showMerchant(npc);
        break;
      case 'banker':
        showBanker(npc);
        break;
      case 'auctioneer':
        showAuctioneer(npc);
        break;
      default:
        global.Narrative?.addEntry({
          type: 'system',
          text: `${npc.name}: "${npc.description}"`,
          meta: 'NPC'
        });
    }
  }

  function showClassTrainer(npc) {
    const player = global.State?.getPlayer();
    if (!player) return;

    const overlay = document.createElement('div');
    overlay.id = 'classTrainerWindow';
    overlay.className = 'character-creation-overlay';
    
    overlay.innerHTML = `
      <div class="creation-panel" style="max-width: 600px;">
        <h2 class="creation-title">${npc.name} - ${npc.class.charAt(0).toUpperCase() + npc.class.slice(1)} Trainer</h2>
        <p style="text-align: center; color: var(--fg-secondary); margin-bottom: 1.5rem;">
          ${npc.description}
        </p>
        <div>
          <h3 style="color: var(--gold-muted); margin-bottom: 0.5rem;">Available Skills & Spells</h3>
          <div id="trainerSkillsList" style="max-height: 400px; overflow-y: auto;">
            ${getTrainableSkills(player.class, player.level).map(skill => {
              const known = player.skills?.[skill.id] ? `Level ${player.skills[skill.id].level}` : 'Not learned';
              const canLearn = player.level >= skill.requiredLevel;
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(10, 14, 26, 0.4); border-radius: 0.25rem; margin-bottom: 0.5rem;">
                  <div>
                    <div style="font-weight: 600; color: var(--fg-primary);">${skill.name}</div>
                    <div style="font-size: 0.85rem; color: var(--fg-secondary);">${skill.description}</div>
                    <div style="font-size: 0.8rem; color: var(--fg-secondary); font-family: var(--font-mono);">Required Level: ${skill.requiredLevel} | ${known}</div>
                  </div>
                  <button class="action-btn" ${!canLearn || player.skills?.[skill.id] ? 'disabled' : ''} onclick="global.NPCs.learnSkill('${skill.id}', ${skill.cost})" style="padding: 0.5rem 1rem;">
                    Learn (${skill.cost}g)
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <button class="action-btn" onclick="document.getElementById('classTrainerWindow')?.remove()" style="margin-top: 1rem; width: 100%;">Close</button>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function getTrainableSkills(playerClass, playerLevel) {
    // Skills and spells available at different levels
    const skills = {
      warrior: [
        { id: 'bash', name: 'Bash', description: 'A powerful melee attack that stuns the enemy.', requiredLevel: 1, cost: 10 },
        { id: 'taunt', name: 'Taunt', description: 'Draw enemy attention to yourself.', requiredLevel: 5, cost: 50 },
        { id: 'kick', name: 'Kick', description: 'A quick kick that interrupts enemy actions.', requiredLevel: 8, cost: 100 }
      ],
      mage: [
        { id: 'magic_missile', name: 'Magic Missile', description: 'A bolt of arcane energy.', requiredLevel: 1, cost: 10 },
        { id: 'fireball', name: 'Fireball', description: 'A powerful explosion of fire.', requiredLevel: 5, cost: 50 },
        { id: 'frost_bolt', name: 'Frost Bolt', description: 'A bolt of ice that slows enemies.', requiredLevel: 8, cost: 100 }
      ],
      ranger: [
        { id: 'track', name: 'Track', description: 'Track nearby creatures.', requiredLevel: 1, cost: 10 },
        { id: 'arrow_shot', name: 'Arrow Shot', description: 'A precise ranged attack.', requiredLevel: 5, cost: 50 },
        { id: 'nature_call', name: 'Nature Call', description: 'Summon nature to aid you.', requiredLevel: 8, cost: 100 }
      ],
      rogue: [
        { id: 'backstab', name: 'Backstab', description: 'A devastating attack from behind.', requiredLevel: 1, cost: 10 },
        { id: 'sneak', name: 'Sneak', description: 'Move silently and avoid detection.', requiredLevel: 5, cost: 50 },
        { id: 'pick_lock', name: 'Pick Lock', description: 'Unlock doors and chests.', requiredLevel: 8, cost: 100 }
      ],
      craftsman: [
        { id: 'repair', name: 'Repair', description: 'Repair damaged equipment.', requiredLevel: 1, cost: 10 },
        { id: 'identify', name: 'Identify', description: 'Identify unknown items.', requiredLevel: 5, cost: 50 },
        { id: 'enchant', name: 'Enchant', description: 'Add magical properties to items.', requiredLevel: 8, cost: 100 }
      ]
    };

    return skills[playerClass] || [];
  }

  function learnSkill(skillId, cost) {
    const player = global.State?.getPlayer();
    if (!player) return;

    if (player.gold < cost) {
      global.ChatSystem?.addSystemMessage(`You need ${cost} gold to learn this skill.`);
      return;
    }

    if (player.skills?.[skillId]) {
      global.ChatSystem?.addSystemMessage('You already know this skill.');
      return;
    }

    player.gold -= cost;
    if (!player.skills) player.skills = {};
    player.skills[skillId] = { level: 1, xp: 0 };

    global.State.updatePlayer({ gold: player.gold, skills: player.skills });
    global.ChatSystem?.addSystemMessage(`You have learned ${skillId}!`);
    global.Rendering?.updateCharacterPanel();
    global.Rendering?.updateResourceBar();

    // Refresh trainer window
    const window = document.getElementById('classTrainerWindow');
    if (window) {
      const npc = Object.values(global.REALM?.data?.npcsById || {}).find(n => n.type === 'class_trainer' && n.class === player.class);
      if (npc) showClassTrainer(npc);
    }
  }

  function showMerchant(npc) {
    global.Narrative?.addEntry({
      type: 'system',
      text: `${npc.name} says: "Welcome! I buy and sell goods. What can I do for you?"`,
      meta: 'Merchant'
    });
    // In real game, show buy/sell interface
  }

  function showBanker(npc) {
    global.Narrative?.addEntry({
      type: 'system',
      text: `${npc.name} says: "I can store your gold safely. How much would you like to deposit?"`,
      meta: 'Banker'
    });
    // In real game, show banking interface
  }

  function showAuctioneer(npc) {
    const player = global.State?.getPlayer();
    if (!player) return;

    // Check if in city
    const currentZone = global.Zones?.getCurrentZone();
    const isInCity = npc.zone === currentZone?.id;

    if (!isInCity) {
      global.ChatSystem?.addSystemMessage('You must be in a city to access the auction house.');
      return;
    }

    global.Rendering?.showAuctionHouse();
  }

  // Initialize
  loadNPCs();

  const NPCs = {
    loadNPCs,
    getNPCsInZone,
    interactWithNPC,
    showClassTrainer,
    learnSkill,
    getTrainableSkills
  };

  global.NPCs = NPCs;
})(window);

