/**
 * Realm Core Type Definitions
 * 
 * These are JSDoc-style type definitions for the Realm codebase.
 * They serve as documentation and can be used with TypeScript or JSDoc tools.
 */

/**
 * @typedef {Object} Zone
 * @property {string} id - Unique zone identifier
 * @property {string} name - Display name
 * @property {string} description - Zone description
 * @property {number} level - Minimum level required
 * @property {string[]} [monsters] - Array of monster IDs that spawn here
 * @property {string} [lore] - Optional lore text
 * @property {boolean} [isCity] - Whether this is a city (safe haven)
 * @property {string} [faction] - Controlling faction ID
 */

/**
 * @typedef {Object} Tile
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {string} [id] - Unique tile identifier
 * @property {string} terrain - Terrain type (plains, forest, hills, water, desert, etc.)
 * @property {string} [biome] - Biome classification
 * @property {string} [zoneId] - Zone this tile belongs to
 * @property {string} [owner] - Player ID who owns this tile
 * @property {string} [faction] - Faction controlling this tile
 * @property {Object} [resources] - Resource deposits (ore, timber, food)
 * @property {Object[]} [structures] - Structures built on this tile
 * @property {boolean} [isOwned] - Whether tile is owned
 * @property {boolean} [hasSettlement] - Whether tile has a settlement
 */

/**
 * @typedef {Object} Mob
 * @property {string} id - Unique mob identifier
 * @property {string} name - Display name
 * @property {string} description - Mob description
 * @property {number} level - Mob level
 * @property {number} maxHp - Maximum hit points
 * @property {number} atk - Attack stat
 * @property {number} def - Defense stat
 * @property {string} [zoneId] - Zone where this mob spawns
 * @property {Object[]} [lootTable] - Loot drop table
 * @property {number} [xp] - Experience reward
 * @property {string} [faction] - Faction alignment
 */

/**
 * @typedef {Object} NPC
 * @property {string} id - Unique NPC identifier
 * @property {string} name - Display name
 * @property {string} type - NPC type (class_trainer, merchant, banker, auctioneer, guard)
 * @property {string} zone - Zone ID where NPC is located
 * @property {string} description - NPC description
 * @property {string} [class] - Class this NPC trains (for trainers)
 * @property {string} [faction] - Faction alignment
 * @property {string[]} [aggressiveTo] - Alignments this NPC attacks
 * @property {number} [x] - X coordinate in zone
 * @property {number} [y] - Y coordinate in zone
 */

/**
 * @typedef {Object} Faction
 * @property {string} id - Unique faction identifier
 * @property {string} name - Display name
 * @property {string} alignment - Alignment (good, evil, neutral)
 * @property {string} description - Faction description
 * @property {string[]} [aggressiveTo] - Alignments this faction attacks
 * @property {string[]} [enemyFactions] - Array of enemy faction IDs
 */

/**
 * @typedef {Object} Item
 * @property {string} id - Unique item identifier (itemId)
 * @property {string} name - Display name
 * @property {string} type - Item type (weapon, armor, charm, consumable, etc.)
 * @property {string} description - Item description
 * @property {Object} [stats] - Stat bonuses (atk, def, hp, all)
 * @property {number} [value] - Gold value
 * @property {number} [level] - Required level
 * @property {string} [slot] - Equipment slot (weapon, armor, charm)
 */

/**
 * @typedef {Object} Character
 * @property {string} id - Unique character identifier
 * @property {string} name - Character name
 * @property {string} race - Race ID
 * @property {string} class - Class ID
 * @property {number} level - Character level
 * @property {number} xp - Current experience
 * @property {number} xpToNext - Experience needed for next level
 * @property {Object} stats - Combat stats (hp, maxHp, atk, def)
 * @property {number} gold - Gold amount
 * @property {Object[]} inventory - Array of inventory items
 * @property {Object} equipment - Equipped items (weapon, armor, charm)
 * @property {Object} skills - Learned skills (skillId -> { level, xp })
 * @property {string} currentZone - Current zone ID
 * @property {Object} currentTile - Current tile position { x, y }
 * @property {Object} factions - Faction standings (factionId -> value)
 * @property {string[]} activeQuests - Active quest IDs
 * @property {string[]} completedQuests - Completed quest IDs
 * @property {string[]} discoveredLore - Discovered lore IDs
 * @property {string[]} achievements - Achievement IDs
 */

/**
 * @typedef {Object} Account
 * @property {string} id - Unique account identifier
 * @property {string} username - Account username
 * @property {string} email - Account email
 * @property {CharacterSlot[]} characters - Array of character slots
 * @property {number} maxCharacters - Maximum characters per account
 * @property {Date} createdAt - Account creation date
 * @property {Date} lastLogin - Last login timestamp
 */

/**
 * @typedef {Object} CharacterSlot
 * @property {string} id - Slot identifier
 * @property {Character|null} character - Character data (null if empty)
 * @property {Date} [lastPlayed] - Last time this character was played
 */

/**
 * @typedef {Object} Dungeon
 * @property {string} id - Unique dungeon identifier
 * @property {string} name - Display name
 * @property {string} description - Dungeon description
 * @property {number} minLevel - Minimum level to enter
 * @property {number} maxLevel - Maximum level for content
 * @property {Zone[]} zones - Array of zones within the dungeon
 */

/**
 * @typedef {Object} DungeonZone
 * @property {string} id - Unique zone identifier
 * @property {string} name - Display name
 * @property {string} description - Zone description
 * @property {number} level - Zone level
 * @property {string[]} monsters - Array of monster IDs
 * @property {string[]} [namedMobs] - Array of named mob IDs
 * @property {SpawnPoint[]} [spawnPoints] - Static spawn points for monsters
 * @property {string[]} connections - Connected zone IDs
 */

/**
 * @typedef {Object} SpawnPoint
 * @property {string} id - Unique spawn point identifier
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {string} mobId - Monster ID to spawn
 * @property {number} respawnTime - Respawn time in seconds
 * @property {number} [maxSpawns] - Maximum concurrent spawns
 */

/**
 * @typedef {Object} GameState
 * @property {Character} player - Current player character
 * @property {Object} resources - Resource counts (food, ore, timber, essence, gold)
 * @property {string[]} ownedTiles - Array of owned tile IDs
 * @property {Object[]} structures - Array of structures
 * @property {Set|string[]} visibility - Visible tile IDs
 */

/**
 * World Flow Documentation:
 * 
 * 1. LOGIN → Account authentication (future: backend API)
 *    - Load account data
 *    - Show character selection screen
 * 
 * 2. CHARACTER SELECTION → Choose or create character
 *    - Load character slots
 *    - Create new character if slot available
 *    - Load character data into state
 * 
 * 3. MAP → Initialize world map
 *    - Load current zone
 *    - Render tiles
 *    - Place player at spawn point
 *    - Load NPCs and mobs for zone
 * 
 * 4. MOVEMENT → Player moves on grid
 *    - Click tile to move
 *    - Check zone boundaries
 *    - Update player position
 *    - Check for encounters (mobs, NPCs)
 *    - Update visibility
 * 
 * 5. COMBAT → Engage with mobs
 *    - Click mob to target
 *    - Start combat system
 *    - Turn-based combat
 *    - Award XP and loot on victory
 * 
 * 6. INTERACTION → NPCs, items, quests
 *    - Click NPC to interact
 *    - Open merchant/trainer/banker UI
 *    - Accept/complete quests
 *    - Use items
 */

