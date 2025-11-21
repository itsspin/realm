/**
 * Characters API Client
 * 
 * Handles character CRUD operations and syncing with backend.
 */

(function (global) {
  const API_BASE_URL = window.REALM_API_URL || 'http://localhost:3000/api';
  const SUPABASE_URL = window.REALM_SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = window.REALM_SUPABASE_ANON_KEY || '';
  
  const useSupabase = SUPABASE_URL && SUPABASE_ANON_KEY;

  /**
   * Get all characters for current account
   */
  async function getCharacters() {
    const authHeaders = global.Auth?.getAuthHeaders();
    if (!authHeaders || Object.keys(authHeaders).length === 0) {
      throw new Error('Not authenticated');
    }

    try {
      if (useSupabase) {
        const session = global.Auth?.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/characters?account_id=eq.${session.userId}&select=*&order=created_at.desc`,
          {
            headers: authHeaders
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch characters');
        }

        return await response.json();
      } else {
        const response = await fetch(`${API_BASE_URL}/characters`, {
          headers: authHeaders
        });

        if (!response.ok) {
          throw new Error('Failed to fetch characters');
        }

        const data = await response.json();
        return data.characters || [];
      }
    } catch (error) {
      console.error('Get characters error:', error);
      throw error;
    }
  }

  /**
   * Get character by ID
   */
  async function getCharacter(characterId) {
    const authHeaders = global.Auth?.getAuthHeaders();
    if (!authHeaders || Object.keys(authHeaders).length === 0) {
      throw new Error('Not authenticated');
    }

    try {
      if (useSupabase) {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/characters?id=eq.${characterId}&select=*`,
          {
            headers: authHeaders
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch character');
        }

        const characters = await response.json();
        return characters.length > 0 ? characters[0] : null;
      } else {
        const response = await fetch(`${API_BASE_URL}/characters/${characterId}`, {
          headers: authHeaders
        });

        if (!response.ok) {
          throw new Error('Failed to fetch character');
        }

        const data = await response.json();
        return data.character;
      }
    } catch (error) {
      console.error('Get character error:', error);
      throw error;
    }
  }

  /**
   * Create new character
   */
  async function createCharacter(characterData) {
    const authHeaders = global.Auth?.getAuthHeaders();
    if (!authHeaders || Object.keys(authHeaders).length === 0) {
      throw new Error('Not authenticated');
    }

    const session = global.Auth?.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    try {
      // Validate character data
      if (!characterData.name || !characterData.classId) {
        throw new Error('Character name and class are required');
      }

      // Check character limit (8 per account)
      const existing = await getCharacters();
      if (existing.length >= 8) {
        throw new Error('Maximum character limit reached (8 characters per account)');
      }

      // Prepare character payload
      const payload = {
        account_id: session.userId,
        name: characterData.name,
        class_id: characterData.classId,
        race_id: characterData.raceId || null,
        level: 1,
        xp: 0,
        xp_to_next: 100,
        gold: 25,
        stats: characterData.stats || {
          hp: 20,
          maxHp: 20,
          atk: 5,
          def: 2
        },
        player_stats: {},
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          charm: null
        },
        skills: {},
        current_zone: 'thronehold',
        current_tile: { x: 20, y: 20 },
        active_quests: [],
        completed_quests: [],
        discovered_lore: [],
        achievements: [],
        faction_standings: {},
        settlements: [],
        owned_tiles: [],
        structures: [],
        visibility: [],
        resources: {
          food: 50,
          ore: 10,
          timber: 20,
          essence: 0
        }
      };

      if (useSupabase) {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/characters`,
          {
            method: 'POST',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload)
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create character');
        }

        const characters = await response.json();
        return characters[0];
      } else {
        const response = await fetch(`${API_BASE_URL}/characters`, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create character');
        }

        const data = await response.json();
        return data.character;
      }
    } catch (error) {
      console.error('Create character error:', error);
      throw error;
    }
  }

  /**
   * Update character (save)
   */
  async function updateCharacter(characterId, characterData) {
    const authHeaders = global.Auth?.getAuthHeaders();
    if (!authHeaders || Object.keys(authHeaders).length === 0) {
      throw new Error('Not authenticated');
    }

    try {
      // Validate character data structure
      if (!characterData.stats || !characterData.stats.hp || !characterData.stats.maxHp) {
        throw new Error('Invalid character data: stats must contain hp and maxHp');
      }

      // Ensure arrays are arrays
      const validated = {
        ...characterData,
        inventory: Array.isArray(characterData.inventory) ? characterData.inventory : [],
        active_quests: Array.isArray(characterData.active_quests) ? characterData.active_quests : [],
        completed_quests: Array.isArray(characterData.completed_quests) ? characterData.completed_quests : [],
        discovered_lore: Array.isArray(characterData.discovered_lore) ? characterData.discovered_lore : [],
        achievements: Array.isArray(characterData.achievements) ? characterData.achievements : [],
        last_saved_at: new Date().toISOString()
      };

      if (useSupabase) {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/characters?id=eq.${characterId}`,
          {
            method: 'PATCH',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(validated)
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update character');
        }

        const characters = await response.json();
        return characters[0];
      } else {
        const response = await fetch(`${API_BASE_URL}/characters/${characterId}`, {
          method: 'PATCH',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(validated)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update character');
        }

        const data = await response.json();
        return data.character;
      }
    } catch (error) {
      console.error('Update character error:', error);
      throw error;
    }
  }

  /**
   * Delete character
   */
  async function deleteCharacter(characterId) {
    const authHeaders = global.Auth?.getAuthHeaders();
    if (!authHeaders || Object.keys(authHeaders).length === 0) {
      throw new Error('Not authenticated');
    }

    try {
      if (useSupabase) {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/characters?id=eq.${characterId}`,
          {
            method: 'DELETE',
            headers: authHeaders
          }
        );

        if (!response.ok) {
          throw new Error('Failed to delete character');
        }

        return { success: true };
      } else {
        const response = await fetch(`${API_BASE_URL}/characters/${characterId}`, {
          method: 'DELETE',
          headers: authHeaders
        });

        if (!response.ok) {
          throw new Error('Failed to delete character');
        }

        return { success: true };
      }
    } catch (error) {
      console.error('Delete character error:', error);
      throw error;
    }
  }

  /**
   * Convert database character to game state format
   */
  function characterToGameState(dbCharacter) {
    return {
      player: {
        id: dbCharacter.id,
        name: dbCharacter.name,
        race: dbCharacter.race_id,
        class: dbCharacter.class_id,
        level: dbCharacter.level,
        xp: dbCharacter.xp,
        xpToNext: dbCharacter.xp_to_next,
        gold: dbCharacter.gold,
        stats: dbCharacter.stats,
        playerStats: dbCharacter.player_stats || {},
        inventory: dbCharacter.inventory || [],
        equipment: dbCharacter.equipment || { weapon: null, armor: null, charm: null },
        skills: dbCharacter.skills || {},
        currentZone: dbCharacter.current_zone,
        currentTile: dbCharacter.current_tile,
        settlements: dbCharacter.settlements || [],
        guild: dbCharacter.guild_id,
        faction: dbCharacter.faction_id,
        activeQuests: dbCharacter.active_quests || [],
        completedQuests: dbCharacter.completed_quests || [],
        discoveredLore: dbCharacter.discovered_lore || [],
        achievements: dbCharacter.achievements || [],
        shop: dbCharacter.shop
      },
      resources: dbCharacter.resources || {
        food: 50,
        ore: 10,
        timber: 20,
        essence: 0
      },
      ownedTiles: dbCharacter.owned_tiles || [],
      structures: dbCharacter.structures || [],
      visibility: dbCharacter.visibility || []
    };
  }

  /**
   * Convert game state to database format
   */
  function gameStateToCharacter(gameState, characterId) {
    const player = gameState.player;
    return {
      id: characterId,
      name: player.name,
      class_id: player.class,
      race_id: player.race,
      level: player.level,
      xp: player.xp,
      xp_to_next: player.xpToNext,
      gold: player.gold,
      stats: player.stats,
      player_stats: player.playerStats || {},
      inventory: player.inventory || [],
      equipment: player.equipment || { weapon: null, armor: null, charm: null },
      skills: player.skills || {},
      current_zone: player.currentZone,
      current_tile: player.currentTile,
      active_quests: player.activeQuests || [],
      completed_quests: player.completedQuests || [],
      discovered_lore: player.discoveredLore || [],
      achievements: player.achievements || [],
      faction_standings: player.factionStandings || {},
      settlements: player.settlements || [],
      owned_tiles: gameState.ownedTiles || [],
      structures: gameState.structures || [],
      visibility: gameState.visibility || [],
      resources: gameState.resources || {},
      guild_id: player.guild,
      faction_id: player.faction,
      shop: player.shop
    };
  }

  const Characters = {
    getCharacters,
    getCharacter,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    characterToGameState,
    gameStateToCharacter
  };

  global.Characters = Characters;
})(window);

