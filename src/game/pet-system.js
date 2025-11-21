/**
 * Pet System
 * 
 * Handles pet summoning, behavior, and control for pet classes (Necromancer, Magician).
 * 
 * PET BEHAVIORS:
 * - follow: Pet follows player and will defend if attacked
 * - stay: Pet stays at current location, will defend if attacked
 * - attack: Pet attacks target, generates moderate threat
 * - taunt: Pet attacks and generates high threat to hold aggro
 * 
 * PET TYPES:
 * - skeleton (Necromancer)
 * - water_elemental (Magician)
 * - earth_elemental (Magician)
 */

(function (global) {
  let petUpdateInterval = null;
  const PET_UPDATE_INTERVAL = 500; // Update pet position every 500ms
  const PET_FOLLOW_DISTANCE = 2; // Pet follows within 2 tiles
  const PET_ATTACK_RANGE = 3; // Pet can attack up to 3 tiles away

  /**
   * Summon a pet
   */
  function summonPet(petType, petLevel) {
    const player = global.State?.getPlayer();
    if (!player) return false;

    // If pet already exists, dismiss it first
    if (player.pet) {
      dismissPet();
    }

    // Get pet template based on type and level
    const petTemplate = getPetTemplate(petType, petLevel);
    if (!petTemplate) {
      global.ChatSystem?.addSystemMessage('Unable to summon pet.');
      return false;
    }

    const playerTile = player.currentTile || { x: 20, y: 20 };
    const petZone = player.currentZone || 'thronehold';

    // Spawn pet adjacent to player
    const petTile = findAdjacentTile(petZone, playerTile.x, playerTile.y);
    if (!petTile) {
      global.ChatSystem?.addSystemMessage('No space to summon pet.');
      return false;
    }

    // Create pet entity
    const pet = {
      id: `pet_${Date.now()}_${Math.random()}`,
      name: petTemplate.name,
      type: petType,
      level: petLevel,
      zone: petZone,
      x: petTile.x,
      y: petTile.y,
      stats: {
        hp: petTemplate.hp,
        maxHp: petTemplate.hp,
        atk: petTemplate.atk,
        def: petTemplate.def,
        agi: petTemplate.agi || 50
      },
      behavior: 'follow', // follow, stay, attack, taunt, guard, sit, hold
      target: null,
      guardLocation: null, // {x, y} for guard behavior
      ownerId: player.id,
      alive: true
    };

    // Update player state
    global.State?.updatePlayer({ pet });
    
    // Start pet AI update loop
    startPetAI();

    global.Narrative?.addEntry({
      type: 'spell',
      text: `You summon ${pet.name}!`,
      meta: 'Summon Pet'
    });
    global.ChatSystem?.addSystemMessage(`${pet.name} has been summoned.`);

    // Update UI
    if (global.PetUI) {
      global.PetUI.updatePetPanel();
    }

    // Update map rendering
    if (global.WorldMapRender) {
      global.WorldMapRender.renderMap();
    }

    return true;
  }

  /**
   * Dismiss current pet
   */
  function dismissPet() {
    const player = global.State?.getPlayer();
    if (!player || !player.pet) return;

    const petName = player.pet.name;
    global.State?.updatePlayer({ pet: null });
    
    // Stop pet AI
    stopPetAI();

    global.Narrative?.addEntry({
      type: 'spell',
      text: `${petName} has been dismissed.`,
      meta: 'Dismiss Pet'
    });
    global.ChatSystem?.addSystemMessage(`${petName} has been dismissed.`);

    // Update UI
    if (global.PetUI) {
      global.PetUI.updatePetPanel();
    }

    // Update map rendering
    if (global.WorldMapRender) {
      global.WorldMapRender.renderMap();
    }
  }

  /**
   * Get pet template by type and level
   */
  function getPetTemplate(petType, petLevel) {
    const templates = {
      skeleton: {
        name: 'Skeleton Minion',
        hp: 30 + (petLevel * 5),
        atk: 8 + (petLevel * 2),
        def: 3 + petLevel,
        agi: 45
      },
      water_elemental: {
        name: 'Water Elemental',
        hp: 35 + (petLevel * 6),
        atk: 7 + (petLevel * 2),
        def: 4 + petLevel,
        agi: 50
      },
      earth_elemental: {
        name: 'Earth Elemental',
        hp: 50 + (petLevel * 8),
        atk: 6 + (petLevel * 2),
        def: 6 + (petLevel * 2),
        agi: 40
      }
    };

    const base = templates[petType];
    if (!base) return null;

    return {
      ...base,
      level: petLevel
    };
  }

  /**
   * Find adjacent tile for pet spawn
   */
  function findAdjacentTile(zoneId, centerX, centerY) {
    const offsets = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: -1, y: -1 }
    ];

    for (const offset of offsets) {
      const x = centerX + offset.x;
      const y = centerY + offset.y;
      
      if (global.World?.isTileWalkable(zoneId, x, y)) {
        // Check if tile is empty (no mob or player)
        const mob = global.SpawnSystem?.getMobAtTile(zoneId, x, y);
        if (!mob) {
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * Set pet behavior
   */
  function setPetBehavior(behavior) {
    const player = global.State?.getPlayer();
    if (!player || !player.pet) return false;

    const pet = { ...player.pet };
    pet.behavior = behavior;

    // Clear target if switching to non-combat behaviors
    if (behavior === 'follow' || behavior === 'stay' || behavior === 'sit' || behavior === 'hold') {
      pet.target = null;
    }
    
    // Set guard location for guard behavior
    if (behavior === 'guard') {
      pet.guardLocation = { x: pet.x, y: pet.y };
    } else {
      pet.guardLocation = null;
    }

    global.State?.updatePlayer({ pet });

    const behaviorNames = {
      follow: 'Follow',
      stay: 'Stay',
      attack: 'Attack',
      taunt: 'Taunt',
      guard: 'Guard',
      sit: 'Sit',
      hold: 'Hold'
    };

    global.ChatSystem?.addSystemMessage(`${pet.name} is now set to ${behaviorNames[behavior] || behavior}.`);

    // Update UI
    if (global.PetUI) {
      global.PetUI.updatePetPanel();
    }

    return true;
  }

  /**
   * Command pet to attack target
   */
  function commandPetAttack(target) {
    const player = global.State?.getPlayer();
    if (!player || !player.pet || !target) return false;

    const pet = player.pet;
    const playerTile = player.currentTile || { x: 0, y: 0 };
    const targetX = target.x || 0;
    const targetY = target.y || 0;

    // Check range
    const distance = Math.abs(targetX - playerTile.x) + Math.abs(targetY - playerTile.y);
    if (distance > PET_ATTACK_RANGE) {
      global.ChatSystem?.addSystemMessage('Target is too far away for your pet to attack.');
      return false;
    }

    const petData = { ...pet };
    petData.behavior = 'attack';
    petData.target = {
      id: target.id,
      x: targetX,
      y: targetY,
      zone: target.zone || player.currentZone
    };

    global.State?.updatePlayer({ pet: petData });

    global.ChatSystem?.addSystemMessage(`${pet.name} attacks ${target.name || target.mobTemplate?.name || 'target'}!`);

    // Update UI
    if (global.PetUI) {
      global.PetUI.updatePetPanel();
    }

    return true;
  }

  /**
   * Command pet to taunt target
   */
  function commandPetTaunt(target) {
    const player = global.State?.getPlayer();
    if (!player || !player.pet || !target) return false;

    const pet = player.pet;
    const playerTile = player.currentTile || { x: 0, y: 0 };
    const targetX = target.x || 0;
    const targetY = target.y || 0;

    // Check range
    const distance = Math.abs(targetX - playerTile.x) + Math.abs(targetY - playerTile.y);
    if (distance > PET_ATTACK_RANGE) {
      global.ChatSystem?.addSystemMessage('Target is too far away for your pet to taunt.');
      return false;
    }

    const petData = { ...pet };
    petData.behavior = 'taunt';
    petData.target = {
      id: target.id,
      x: targetX,
      y: targetY,
      zone: target.zone || player.currentZone
    };

    global.State?.updatePlayer({ pet: petData });

    global.ChatSystem?.addSystemMessage(`${pet.name} taunts ${target.name || target.mobTemplate?.name || 'target'}!`);

    // Update UI
    if (global.PetUI) {
      global.PetUI.updatePetPanel();
    }

    return true;
  }

  /**
   * Pet AI update loop
   */
  function updatePetAI() {
    const player = global.State?.getPlayer();
    if (!player || !player.pet || !player.pet.alive) {
      stopPetAI();
      return;
    }

    const pet = player.pet;
    const playerTile = player.currentTile || { x: 0, y: 0 };
    const petZone = player.currentZone || pet.zone;

    // Update pet zone if player changed zones
    if (pet.zone !== playerZone) {
      const updatedPet = { ...pet, zone: playerZone };
      global.State?.updatePlayer({ pet: updatedPet });
      return;
    }

    // Handle different behaviors
    if (pet.behavior === 'follow') {
      updatePetFollow(pet, playerTile);
    } else if (pet.behavior === 'stay') {
      updatePetStay(pet, playerTile);
    } else if (pet.behavior === 'attack' || pet.behavior === 'taunt') {
      updatePetCombat(pet, playerTile);
    } else if (pet.behavior === 'guard') {
      updatePetGuard(pet, playerTile);
    } else if (pet.behavior === 'sit') {
      updatePetSit(pet, playerTile);
    } else if (pet.behavior === 'hold') {
      updatePetHold(pet, playerTile);
    }
  }

  /**
   * Update pet follow behavior
   */
  function updatePetFollow(pet, playerTile) {
    const distance = Math.abs(pet.x - playerTile.x) + Math.abs(pet.y - playerTile.y);
    
    if (distance > PET_FOLLOW_DISTANCE) {
      // Move pet towards player
      movePetTowards(pet, playerTile.x, playerTile.y);
    }
  }

  /**
   * Update pet stay behavior
   */
  function updatePetStay(pet, playerTile) {
    // Pet stays in place, but will defend if attacked
    // Check if there's a hostile mob nearby attacking the pet
    const nearbyMob = global.SpawnSystem?.getMobAtTile(pet.zone, pet.x, pet.y);
    if (nearbyMob && nearbyMob.alive && nearbyMob.mobTemplate && !nearbyMob.mobTemplate.isGuard) {
      // Pet is being attacked, switch to attack mode
      const updatedPet = { ...pet, behavior: 'attack', target: { id: nearbyMob.id, x: nearbyMob.x, y: nearbyMob.y, zone: nearbyMob.zone } };
      global.State?.updatePlayer({ pet: updatedPet });
      return;
    }
  }

  /**
   * Update pet guard behavior (P99 mechanic)
   */
  function updatePetGuard(pet, playerTile) {
    // Pet guards at guardLocation, attacks anything that attacks player within range
    const guardLoc = pet.guardLocation || { x: pet.x, y: pet.y };
    
    // Move pet to guard location if not there
    const distance = Math.abs(pet.x - guardLoc.x) + Math.abs(pet.y - guardLoc.y);
    if (distance > 0) {
      movePetTowards(pet, guardLoc.x, guardLoc.y);
    }
    
    // Check if player is being attacked within pet's range
    const player = global.State?.getPlayer();
    if (player && player.currentZone === pet.zone) {
      // Check for mobs attacking player
      const mobsNearPlayer = global.SpawnSystem?.getNearbyMobs(player.currentZone, playerTile.x, playerTile.y, 3) || [];
      const attackingMob = mobsNearPlayer.find(mob => {
        // In real game, check if mob is targeting player
        // For now, check if mob is adjacent to player
        const mobDistance = Math.abs(mob.x - playerTile.x) + Math.abs(mob.y - playerTile.y);
        return mobDistance <= 1 && mob.alive && mob.mobTemplate && !mob.mobTemplate.isGuard;
      });
      
      if (attackingMob) {
        // Pet defends player - switch to attack mode
        const updatedPet = { ...pet, behavior: 'attack', target: { id: attackingMob.id, x: attackingMob.x, y: attackingMob.y, zone: attackingMob.zone } };
        global.State?.updatePlayer({ pet: updatedPet });
        return;
      }
    }
  }

  /**
   * Update pet sit behavior (P99 mechanic)
   */
  function updatePetSit(pet, playerTile) {
    // Pet sits to regenerate HP/mana faster, less responsive to threats
    // Pet will defend if directly attacked
    const nearbyMob = global.SpawnSystem?.getMobAtTile(pet.zone, pet.x, pet.y);
    if (nearbyMob && nearbyMob.alive && nearbyMob.mobTemplate && !nearbyMob.mobTemplate.isGuard) {
      // Pet is being directly attacked, switch to attack mode
      const updatedPet = { ...pet, behavior: 'attack', target: { id: nearbyMob.id, x: nearbyMob.x, y: nearbyMob.y, zone: nearbyMob.zone } };
      global.State?.updatePlayer({ pet: updatedPet });
      return;
    }
    
    // Pet regenerates HP faster while sitting (handled in pet stats/regen)
    // For now, pet just stays in place
  }

  /**
   * Update pet hold behavior (P99 mechanic)
   */
  function updatePetHold(pet, playerTile) {
    // Pet holds (stops all actions, ignores combat, passive)
    // Pet does nothing, won't attack or defend
    // Just stays in place
    return; // Do nothing
  }

  /**
   * Update pet combat behavior
   */
  function updatePetCombat(pet, playerTile) {
    if (!pet.target) {
      // No target, switch to follow
      const updatedPet = { ...pet, behavior: 'follow', target: null };
      global.State?.updatePlayer({ pet: updatedPet });
      return;
    }

    // Get current target
    const target = global.SpawnSystem?.getMobAtTile(pet.zone, pet.target.x, pet.target.y);
    
    if (!target || !target.alive || target.id !== pet.target.id) {
      // Target is dead or gone, switch to follow
      const updatedPet = { ...pet, behavior: 'follow', target: null };
      global.State?.updatePlayer({ pet: updatedPet });
      return;
    }

    // Check if pet is adjacent to target
    const distance = Math.abs(pet.x - target.x) + Math.abs(pet.y - target.y);
    
    if (distance > 1) {
      // Move pet towards target
      movePetTowards(pet, target.x, target.y);
    } else {
      // Pet is adjacent, perform attack
      performPetAttack(pet, target);
    }
  }

  /**
   * Move pet towards target coordinates
   */
  function movePetTowards(pet, targetX, targetY) {
    const dx = targetX > pet.x ? 1 : targetX < pet.x ? -1 : 0;
    const dy = targetY > pet.y ? 1 : targetY < pet.y ? -1 : 0;

    const newX = pet.x + dx;
    const newY = pet.y + dy;

    // Check if new position is valid
    if (global.World?.isTileWalkable(pet.zone, newX, newY)) {
      // Check if tile is empty
      const mob = global.SpawnSystem?.getMobAtTile(pet.zone, newX, newY);
      if (!mob || mob.id === pet.id) {
        const updatedPet = { ...pet, x: newX, y: newY };
        global.State?.updatePlayer({ pet: updatedPet });
        
        // Update map rendering
        if (global.WorldMapRender) {
          global.WorldMapRender.renderMap();
        }
      }
    }
  }

  /**
   * Perform pet attack
   */
  function performPetAttack(pet, target) {
    if (!pet.alive || !target.alive) return;

    // Calculate damage
    const damage = Math.max(1, pet.stats.atk - (target.stats?.def || 0) + Math.floor(Math.random() * 5));
    
    // Apply damage to target
    // Update mob in spawn system if it's a mob
    const player = global.State?.getPlayer();
    if (target.id && player && player.currentZone) {
      const updatedTarget = global.SpawnSystem?.getMobAtTile(player.currentZone, target.x, target.y);
      if (updatedTarget && updatedTarget.id === target.id && updatedTarget.stats) {
        updatedTarget.stats.hp = Math.max(0, updatedTarget.stats.hp - damage);
        target = updatedTarget; // Use updated target
      } else if (target.stats) {
        target.stats.hp = Math.max(0, target.stats.hp - damage);
      }
    } else if (target.stats) {
      target.stats.hp = Math.max(0, target.stats.hp - damage);
    }

    // Generate threat (higher for taunt behavior)
    const threatMultiplier = pet.behavior === 'taunt' ? 3.0 : 1.0;
    const threat = Math.floor(damage * threatMultiplier);

    // If pet is in combat system, update threat
    if (global.Combat && global.Combat.addPetThreat) {
      global.Combat.addPetThreat(pet.id, threat);
    }

    // Add narrative entry
    if (global.Narrative) {
      global.Narrative.addEntry({
        type: 'combat',
        text: `${pet.name} attacks ${target.name || target.mobTemplate?.name || 'target'} for ${damage} damage!`,
        meta: `${target.name || target.mobTemplate?.name || 'target'} HP: ${target.stats?.hp || 0}/${target.stats?.maxHp || 0}`
      });
    }

    // Check if target is dead
    if (target.stats && target.stats.hp <= 0) {
      target.alive = false;
      
      // Pet returns to follow mode
      if (player && player.pet) {
        const updatedPet = { ...player.pet, behavior: 'follow', target: null };
        global.State?.updatePlayer({ pet: updatedPet });
      }

      // End combat if in combat
      if (global.Combat && global.Combat.isInCombat && global.Combat.isInCombat()) {
        global.Combat.endCombat(true);
      }
    }

    // Update map rendering
    if (global.WorldMapRender) {
      global.WorldMapRender.renderMap();
    }
  }

  /**
   * Start pet AI update loop
   */
  function startPetAI() {
    if (petUpdateInterval) {
      clearInterval(petUpdateInterval);
    }
    petUpdateInterval = setInterval(updatePetAI, PET_UPDATE_INTERVAL);
  }

  /**
   * Stop pet AI update loop
   */
  function stopPetAI() {
    if (petUpdateInterval) {
      clearInterval(petUpdateInterval);
      petUpdateInterval = null;
    }
  }

  /**
   * Get current pet
   */
  function getPet() {
    const player = global.State?.getPlayer();
    return player?.pet || null;
  }

  // Initialize
  const player = global.State?.getPlayer();
  if (player && player.pet) {
    startPetAI();
  }

  const PetSystem = {
    summonPet,
    dismissPet,
    setPetBehavior,
    commandPetAttack,
    commandPetTaunt,
    getPet,
    startPetAI,
    stopPetAI
  };

  global.PetSystem = PetSystem;
})(window);

