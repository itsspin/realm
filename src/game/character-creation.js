(function (global) {
  let creationState = null;

  // Races are loaded from data/races.json
  const RACES = [
    { id: 'human', name: 'Human', description: 'Versatile and adaptable, humans excel in all pursuits.', bonuses: { atk: 0, def: 0, hp: 0 } },
    { id: 'elf', name: 'Elf', description: 'Graceful and long-lived, elves have keen senses and arcane affinity.', bonuses: { atk: 1, def: 0, hp: -2 } },
    { id: 'dwarf', name: 'Dwarf', description: 'Stout and hardy, dwarves are natural miners and craftsmen.', bonuses: { atk: 0, def: 2, hp: 3 } },
    { id: 'orc', name: 'Orc', description: 'Strong and fierce, orcs are born warriors.', bonuses: { atk: 2, def: 0, hp: 2 } },
    { id: 'undead', name: 'Undead', description: 'Deathless and resilient, the undead walk between worlds.', bonuses: { atk: 0, def: 1, hp: 4 } }
  ];

  // Classes are loaded from data/classes.json
  const CLASSES = [
    { id: 'warrior', name: 'Warrior', description: 'Masters of melee combat, warriors excel in close quarters.', bonuses: { atk: 2, def: 4, hp: 8 }, skills: ['combat'] },
    { id: 'cleric', name: 'Cleric', description: 'Divine servants who channel the power of the gods to heal wounds.', bonuses: { atk: 1, def: 2, hp: 4 }, skills: ['healing'] },
    { id: 'paladin', name: 'Paladin', description: 'Holy warriors who combine martial prowess with divine magic.', bonuses: { atk: 3, def: 3, hp: 6 }, skills: ['combat', 'healing'] },
    { id: 'ranger', name: 'Ranger', description: 'Skilled hunters and trackers, rangers are at home in the wilds.', bonuses: { atk: 4, def: 2, hp: 5 }, skills: ['combat', 'tracking'] },
    { id: 'rogue', name: 'Rogue', description: 'Swift and cunning, rogues strike from the shadows.', bonuses: { atk: 5, def: 1, hp: 3 }, skills: ['combat', 'stealth'] },
    { id: 'monk', name: 'Monk', description: 'Unarmed combat masters who rely on speed and agility.', bonuses: { atk: 4, def: 2, hp: 4 }, skills: ['combat', 'unarmed'] },
    { id: 'mage', name: 'Mage', description: 'Wielders of destructive arcane power.', bonuses: { atk: 5, def: 0, hp: 2 }, skills: ['arcane'] },
    { id: 'enchanter', name: 'Enchanter', description: 'Masters of illusion and mind control.', bonuses: { atk: 3, def: 1, hp: 2 }, skills: ['arcane', 'enchantment'] },
    { id: 'necromancer', name: 'Necromancer', description: 'Dark mages who command the dead.', bonuses: { atk: 4, def: 0, hp: 3 }, skills: ['dark_magic'] },
    { id: 'wizard', name: 'Wizard', description: 'Pure destructive magic users.', bonuses: { atk: 6, def: 0, hp: 1 }, skills: ['arcane'] },
    { id: 'druid', name: 'Druid', description: 'Nature priests who heal with the power of the wilds.', bonuses: { atk: 2, def: 2, hp: 4 }, skills: ['healing', 'nature_magic'] },
    { id: 'shaman', name: 'Shaman', description: 'Spiritual guides who combine healing with powerful buffs.', bonuses: { atk: 2, def: 2, hp: 5 }, skills: ['healing', 'shamanism'] },
    { id: 'bard', name: 'Bard', description: 'Jacks-of-all-trades who use songs to buff allies. Can move extremely fast.', bonuses: { atk: 3, def: 2, hp: 4 }, skills: ['combat', 'song'] },
    { id: 'shadow_knight', name: 'Shadow Knight', description: 'Dark warriors who serve death itself.', bonuses: { atk: 3, def: 3, hp: 7 }, skills: ['combat', 'dark_magic'] }
  ];

  function showCharacterCreation() {
    console.log('[CharacterCreation] showCharacterCreation called');
    const player = global.State?.getPlayer();
    console.log('[CharacterCreation] Player:', player);
    
    if (player && player.race && player.class && player.name) {
      console.log('[CharacterCreation] Character already created, skipping');
      return false; // Already created
    }

    console.log('[CharacterCreation] Starting character creation');
    creationState = { step: 'race', race: null, class: null, name: '' };
    renderCreationUI();
    return true;
  }

  function renderCreationUI() {
    console.log('[CharacterCreation] renderCreationUI called, step:', creationState?.step);
    
    // Remove existing overlay if present
    const existing = document.getElementById('characterCreationOverlay');
    if (existing) {
      existing.remove();
    }

    // Create overlay - append directly to body since it's position: fixed
    const overlay = document.createElement('div');
    overlay.id = 'characterCreationOverlay';
    overlay.className = 'character-creation-overlay';
    
    if (!creationState) {
      console.error('[CharacterCreation] No creation state!');
      creationState = { step: 'race', race: null, class: null, name: '' };
    }
    
    if (creationState.step === 'race') {
      overlay.innerHTML = `
        <div class="creation-panel">
          <h2 class="creation-title">Choose Your Race</h2>
          <p class="creation-subtitle">Your race defines your heritage and natural abilities</p>
          <div class="creation-grid">
            ${RACES.map(race => `
              <div class="creation-option" data-race="${race.id}">
                <h3>${race.name}</h3>
                <p>${race.description}</p>
                <div class="creation-bonuses">
                  ${race.bonuses.atk !== 0 ? `<span>ATK: ${race.bonuses.atk > 0 ? '+' : ''}${race.bonuses.atk}</span>` : ''}
                  ${race.bonuses.def !== 0 ? `<span>DEF: ${race.bonuses.def > 0 ? '+' : ''}${race.bonuses.def}</span>` : ''}
                  ${race.bonuses.hp !== 0 ? `<span>HP: ${race.bonuses.hp > 0 ? '+' : ''}${race.bonuses.hp}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (creationState.step === 'class') {
      overlay.innerHTML = `
        <div class="creation-panel">
          <h2 class="creation-title">Choose Your Class</h2>
          <p class="creation-subtitle">Your class shapes your path in the realm</p>
          <div class="creation-grid">
            ${CLASSES.map(cls => `
              <div class="creation-option" data-class="${cls.id}">
                <h3>${cls.name}</h3>
                <p>${cls.description}</p>
                <div class="creation-bonuses">
                  ATK: +${cls.bonuses.atk} | DEF: +${cls.bonuses.def} | HP: +${cls.bonuses.hp}
                </div>
                <div class="creation-skills">
                  Skills: ${cls.skills.join(', ')}
                </div>
              </div>
            `).join('')}
          </div>
          <button class="action-btn" onclick="global.CharacterCreation.goBack()" style="margin-top: 1rem;">← Back</button>
        </div>
      `;
    } else if (creationState.step === 'name') {
      overlay.innerHTML = `
        <div class="creation-panel">
          <h2 class="creation-title">Name Your Character</h2>
          <p class="creation-subtitle">Choose a name that will be known across the realm</p>
          <div style="margin: 2rem 0;">
            <input type="text" id="characterNameInput" class="creation-input" placeholder="Enter your name" maxlength="20" value="${creationState.name}">
            <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--fg-secondary);">
              ${creationState.race ? RACES.find(r => r.id === creationState.race).name : ''} ${creationState.class ? CLASSES.find(c => c.id === creationState.class).name : ''}
            </p>
          </div>
          <div style="display: flex; gap: 1rem;">
            <button class="action-btn" onclick="window.CharacterCreation.goBack()">← Back</button>
            <button class="action-btn" id="finishCreationBtn" onclick="window.CharacterCreation.finishCreation()">Begin Your Journey</button>
          </div>
          <script>
            // Update creationState.name as user types
            const nameInput = document.getElementById('characterNameInput');
            if (nameInput) {
              nameInput.addEventListener('input', (e) => {
                if (window.CharacterCreation && window.CharacterCreation.creationState) {
                  window.CharacterCreation.creationState.name = e.target.value;
                }
              });
            }
          </script>
        </div>
      `;
      setTimeout(() => {
        const input = document.getElementById('characterNameInput');
        if (input) {
          input.focus();
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              window.CharacterCreation.finishCreation();
            }
          });
        }
      }, 100);
    }

    // Append to body
    document.body.appendChild(overlay);

    // Add event listeners
    if (creationState.step === 'race') {
      overlay.querySelectorAll('.creation-option[data-race]').forEach(option => {
        option.addEventListener('click', () => {
          creationState.race = option.dataset.race;
          creationState.step = 'class';
          renderCreationUI();
        });
      });
    } else if (creationState.step === 'class') {
      overlay.querySelectorAll('.creation-option[data-class]').forEach(option => {
        option.addEventListener('click', () => {
          creationState.class = option.dataset.class;
          creationState.step = 'name';
          renderCreationUI();
        });
      });
    }
  }

  function goBack() {
    if (creationState.step === 'class') {
      creationState.step = 'race';
      creationState.race = null;
    } else if (creationState.step === 'name') {
      creationState.step = 'class';
      creationState.class = null;
    }
    renderCreationUI();
  }

  async function finishCreation() {
    console.log('finishCreation called', creationState);
    
    const nameInput = document.getElementById('characterNameInput');
    const name = nameInput ? nameInput.value.trim() : creationState.name;
    
    if (!name || name.length < 2) {
      if (global.Toast && typeof global.Toast.show === 'function') {
        global.Toast.show({
          type: 'error',
          title: 'Invalid Name',
          text: 'Your name must be at least 2 characters long.'
        });
      }
      return;
    }

    if (!creationState || !creationState.race || !creationState.class) {
      console.error('Missing race or class', creationState);
      if (global.Toast && typeof global.Toast.show === 'function') {
        global.Toast.show({
          type: 'error',
          title: 'Selection Incomplete',
          text: 'Please select both a race and class.'
        });
      }
      return;
    }

    const race = RACES.find(r => r.id === creationState.race);
    const cls = CLASSES.find(c => c.id === creationState.class);

    // Check if we should use backend (only if backend is actually configured)
    const hasBackend = (window.REALM_SUPABASE_URL && window.REALM_SUPABASE_ANON_KEY) || 
                       (window.REALM_API_URL && window.REALM_API_URL !== 'http://localhost:3000/api');
    
    if (global.Auth?.isAuthenticated() && global.Characters && hasBackend) {
      try {
        const finishBtn = document.getElementById('finishCreationBtn');
        if (finishBtn) {
          finishBtn.disabled = true;
          finishBtn.textContent = 'Creating...';
        }

        // Create character via API
        const character = await global.Characters.createCharacter({
          name: name,
          classId: creationState.class,
          raceId: creationState.race,
          stats: calculateStartingStats(creationState.race, creationState.class)
        });

        if (character && creationCallback) {
          creationCallback(character);
        }

        // Hide creation overlay
        const overlay = document.getElementById('characterCreationOverlay');
        if (overlay) {
          overlay.remove();
        }

        creationState = null;
        return;
      } catch (error) {
        console.error('Failed to create character:', error);
        if (global.Toast && typeof global.Toast.show === 'function') {
          global.Toast.show({
            type: 'error',
            title: 'Creation Failed',
            text: `Failed to create character: ${error.message}`
          });
        }
        const finishBtn = document.getElementById('finishCreationBtn');
        if (finishBtn) {
          finishBtn.disabled = false;
          finishBtn.textContent = 'Begin Your Journey';
        }
        return;
      }
    }

    // Calculate starting stats
    const baseStats = { hp: 20, maxHp: 20, atk: 5, def: 2 };
    const finalStats = {
      hp: baseStats.hp + race.bonuses.hp + cls.bonuses.hp,
      maxHp: baseStats.maxHp + race.bonuses.hp + cls.bonuses.hp,
      atk: baseStats.atk + race.bonuses.atk + cls.bonuses.atk,
      def: baseStats.def + race.bonuses.def + cls.bonuses.def
    };

    // Initialize skills
    const skills = {};
    cls.skills.forEach(skillId => {
      skills[skillId] = { level: 1, xp: 0 };
    });

    // Update player
    if (!global.State || !global.State.updatePlayer) {
      console.error('State system not available');
      return;
    }

    // Get race data for starting location
    const raceData = global.REALM?.data?.racesById?.[creationState.race];
    const startingTile = raceData?.startingTile || { x: 12, y: 12 };
    const startingZone = raceData?.startingZone || 'edgewood_clearing';

    global.State.updatePlayer({
      name: name,
      race: creationState.race,
      class: creationState.class,
      stats: finalStats,
      skills: skills,
      currentZone: startingZone,
      currentTile: startingTile,
      x: startingTile.x,
      y: startingTile.y
    });

    // Force save
    if (global.State && typeof global.State.save === 'function') {
      global.State.save();
    }

    // Verify save
    const savedPlayer = global.State.getPlayer();
    if (!savedPlayer || !savedPlayer.race || !savedPlayer.class) {
      console.error('Character creation failed to save properly');
      if (global.Toast && typeof global.Toast.show === 'function') {
        global.Toast.show({
          type: 'error',
          title: 'Save Failed',
          text: 'Failed to save character. Please try again.'
        });
      }
      return;
    }

    // Remove overlay
    const overlay = document.getElementById('characterCreationOverlay');
    if (overlay) overlay.remove();

    // Add welcome message
    if (global.Narrative && typeof global.Narrative.addEntry === 'function') {
      global.Narrative.addEntry({
        type: 'system',
        text: `Welcome, ${name}. You are a ${race.name} ${cls.name}. Your journey in the realm begins now.`,
        meta: 'Character Created'
      });
    }

    // Re-initialize game now that character is created
    setTimeout(() => {
      // Initialize factions
      if (window.Factions && typeof window.Factions.getPlayerFactions === 'function') {
        window.Factions.getPlayerFactions();
      }

      // Initialize quests
      if (window.Quests && typeof window.Quests.initializeQuests === 'function') {
        window.Quests.initializeQuests();
      }

      // Initialize spawn system for starting zone
      if (window.SpawnSystem && typeof window.SpawnSystem.initializeZone === 'function') {
        window.SpawnSystem.initializeZone(startingZone);
      }
      
      // Update zone to starting zone
      if (window.Zones && typeof window.Zones.changeZone === 'function') {
        window.Zones.changeZone(startingZone);
      }
      
      // Update all UI
      if (window.Rendering) {
        window.Rendering.updateZoneHeader();
        window.Rendering.updateCharacterPanel();
        window.Rendering.updateInventory();
        window.Rendering.updateQuestLog();
        window.Rendering.updateSkillsPanel();
        window.Rendering.updateSettlementPanel();
        window.Rendering.updateActionButtons();
        window.Rendering.updateResourceBar();
        window.Rendering.updateNarrative();
        window.Rendering.updateWorldMap(); // Show map with player position
      }

      // Add welcome zone entry
      if (window.Zones && window.Zones.getCurrentZone) {
        const zone = window.Zones.getCurrentZone();
        if (zone) {
          window.Narrative?.addEntry({
            type: 'zone',
            text: `You stand in ${zone.name}. ${zone.description}`,
            meta: 'Welcome to REALM'
          });
        }
      }

        // Render world map with player position - use WorldMapRender
        if (window.WorldMapRender && typeof window.WorldMapRender.renderMap === 'function') {
          setTimeout(() => {
            window.WorldMapRender.renderMap();
            window.WorldMapRender.centerOnPlayer();
          }, 100);
        }
    }, 500);

    creationState = null;
  }

  /**
   * Show character creation (updated for backend)
   */
  function show(callback) {
    creationState = { step: 'race', race: null, class: null, name: '' };
    creationCallback = callback;
    renderCreationUI();
  }


  /**
   * Calculate starting stats based on race and class
   */
  function calculateStartingStats(raceId, classId) {
    const race = RACES.find(r => r.id === raceId);
    const cls = CLASSES.find(c => c.id === classId);
    
    const baseStats = { hp: 20, maxHp: 20, atk: 5, def: 2 };
    
    if (race) {
      baseStats.atk += race.bonuses.atk || 0;
      baseStats.def += race.bonuses.def || 0;
      baseStats.hp += race.bonuses.hp || 0;
      baseStats.maxHp += race.bonuses.hp || 0;
    }
    
    if (cls) {
      baseStats.atk += cls.bonuses.atk || 0;
      baseStats.def += cls.bonuses.def || 0;
      baseStats.hp += cls.bonuses.hp || 0;
      baseStats.maxHp += cls.bonuses.hp || 0;
    }
    
    return baseStats;
  }

  let creationCallback = null;

  // Expose creationState for external access
  function getCreationState() {
    return creationState;
  }

  const CharacterCreation = {
    showCharacterCreation,
    show,
    goBack,
    finishCreation,
    getCreationState,
    get creationState() { return creationState; }
  };

  global.CharacterCreation = CharacterCreation;
  window.CharacterCreation = CharacterCreation;
})(window);

