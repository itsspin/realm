# Faction System Documentation

## Overview

The faction system in Realm implements EverQuest-style faction standings and guard behavior. Players have reputation with various factions, which affects how NPCs and guards react to them.

## Faction Standings

Faction standings range from -2000 to +2000, with the following thresholds:

- **Ally** (1100+): Maximum positive standing
- **Warmly** (750-1100): Very friendly
- **Kindly** (500-750): Friendly
- **Amiable** (100-500): Positive
- **Indifferent** (0-100): Neutral
- **Apprehensive** (-100-0): Slightly negative
- **Dubious** (-500--100): Negative
- **Threatening** (-750--500): Very negative
- **Scowls** (-2000--750): Maximum negative (hostile)

## Adding New Factions

### 1. Define Faction in `data/factions.json`

```json
{
  "id": "my_faction",
  "name": "My Faction",
  "alignment": "good",
  "description": "Description of the faction",
  "aggressiveTo": ["evil"],
  "enemyFactions": ["enemy_faction_id"]
}
```

**Fields:**
- `id`: Unique identifier (lowercase, underscores)
- `name`: Display name
- `alignment`: "good", "evil", or "neutral"
- `description`: Flavor text
- `aggressiveTo`: Array of alignments this faction attacks (optional)
- `enemyFactions`: Array of faction IDs this faction is hostile to (optional)

### 2. Initialize Player Standing

Player faction standings are initialized in `src/game/factions.js` based on race. To add default standings for a new faction:

1. Edit `data/races.json` to add the faction to `faction` or `enemyFactions` arrays
2. Or manually set in character creation

## Adding Guards

### 1. Create Guard Mob Template

In `data/mob-templates.json`:

```json
{
  "id": "my_city_guard",
  "name": "My City Guard",
  "levelRange": { "min": 10, "max": 15 },
  "factionId": "my_city_guards",
  "baseStats": {
    "hp": 150,
    "maxHp": 150,
    "atk": 25,
    "def": 20
  },
  "lootTableId": "guard_loot",
  "isGuard": true,
  "aggressiveTo": ["evil"]
}
```

**Required fields:**
- `isGuard`: Must be `true`
- `factionId`: Must match guard faction ID

### 2. Create Guard Faction

In `data/factions.json`:

```json
{
  "id": "my_city_guards",
  "name": "My City Guards",
  "alignment": "good",
  "description": "The guards of My City",
  "aggressiveTo": ["evil"]
}
```

### 3. Add Guard Spawn Group

In `data/spawn-groups.json`:

```json
{
  "id": "my_city_guards_patrol",
  "zoneId": "my_city",
  "spawnType": "static",
  "maxConcurrent": 8,
  "respawnSeconds": 300,
  "mobTemplates": ["my_city_guard"],
  "spawnPoints": [
    { "x": 10, "y": 10 },
    { "x": 20, "y": 10 }
  ]
}
```

### 4. Add Guard Patrol Routes

In `data/guard-patrols.json`:

```json
{
  "id": "my_city_guards_patrol",
  "zoneId": "my_city",
  "guardTemplateId": "my_city_guard",
  "patrolRoutes": [
    {
      "id": "patrol_1",
      "waypoints": [
        { "x": 10, "y": 10 },
        { "x": 30, "y": 10 },
        { "x": 30, "y": 30 },
        { "x": 10, "y": 30 }
      ],
      "speed": 1,
      "pauseAtWaypoint": 5000
    }
  ]
}
```

**Fields:**
- `id`: Must match spawn group ID
- `zoneId`: Zone where guards patrol
- `guardTemplateId`: Guard mob template ID
- `patrolRoutes`: Array of patrol routes
  - `id`: Unique route ID
  - `waypoints`: Array of {x, y} coordinates
  - `speed`: Movement speed (1 = normal)
  - `pauseAtWaypoint`: Milliseconds to pause at each waypoint

### 5. Mark Zone as Safe Haven

In `data/world-zones.json`:

```json
{
  "id": "my_city",
  "name": "My City",
  "type": "city",
  "isSafeHaven": true,
  "controllingFaction": "my_city_citizens"
}
```

## Adding Reputation Changes

### On Mob Kill

Add `factionChanges` to mob template in `data/mob-templates.json`:

```json
{
  "id": "hostile_mob",
  "factionId": "evil_faction",
  "factionChanges": {
    "evil_faction": -5,
    "good_faction": 2,
    "city_guards": 1
  }
}
```

**Fields:**
- Keys are faction IDs
- Values are reputation change amounts (positive = gain, negative = loss)

### On Quest Completion

In quest data, add `factionRewards`:

```json
{
  "id": "my_quest",
  "factionRewards": {
    "good_faction": 50,
    "evil_faction": -25
  }
}
```

Then in quest completion code:

```javascript
if (quest.factionRewards) {
  Object.keys(quest.factionRewards).forEach(factionId => {
    global.Factions?.modifyFaction(factionId, quest.factionRewards[factionId]);
  });
}
```

### On Crime (Attacking Friendlies)

Automatically handled by the system:
- Killing a friendly mob in a safe haven marks player as criminal
- Criminal flag lasts 5 minutes (configurable)
- Guards attack criminals on sight

## /con (Consider) System

The /con system shows mob descriptions based on:
1. **Level difference**: Trivial, Easy, Weak, Decent, Even, Tough, Very Tough, Impossible
2. **Faction standing**: Friendly, Amiable, Indifferent, Apprehensive, Dubious, Threatening, Scowls

**Example outputs:**
- "Goblin Scout - weak (regards you indifferently)"
- "City Guard - very tough (scowls at you, ready to attack)"
- "Friendly NPC - trivial (looks friendly)"

## Guard Behavior

Guards automatically:
1. **Patrol** along defined waypoint routes
2. **Attack players** if:
   - Player has "Scowls" or "Threatening" standing with guard faction
   - Player is flagged as criminal
   - Player's race alignment matches `aggressiveTo` list
3. **Attack mobs** if:
   - Mob faction is evil and guard faction is good
   - Mob faction is in guard's `aggressiveTo` list
   - Mob faction is in guard's `enemyFactions` list

## Safe Havens

Cities marked as `isSafeHaven: true`:
- Prevent hostile mob spawning on city tiles (city_street, building, path)
- Only allow guards and neutral mobs in city tiles
- Guards patrol and protect the city

## Debug Commands

### `/factions`
Opens the faction debug panel showing all standings and adjustment buttons.

### `/faction <factionId> <amount>`
Adjusts faction standing by amount.

**Example:**
```
/faction thronehold_guards 100
/faction gloomfang_tribes -50
```

### `/factionreset`
Resets all faction standings to race defaults.

## API Reference

### FactionSystem

```javascript
// Get faction standing name
FactionSystem.getFactionStandingName(value) // Returns: "Ally", "Warmly", etc.

// Get player's standing with faction
FactionSystem.getPlayerStanding(factionId) // Returns: "ally", "warmly", etc.

// Get /con description
FactionSystem.getConDescription(mob, player) // Returns: "Mob Name - level (faction desc)"

// Check if hostile/friendly
FactionSystem.isHostileToFaction(factionId) // Returns: boolean
FactionSystem.isFriendlyToFaction(factionId) // Returns: boolean

// Check guard aggression
FactionSystem.shouldGuardAttackPlayer(guardFactionId, player) // Returns: boolean
FactionSystem.shouldGuardAttackMob(guardFactionId, mob) // Returns: boolean

// Mark player as criminal
FactionSystem.markPlayerCriminal(durationSeconds) // Marks player as criminal

// Apply faction changes from kill
FactionSystem.applyKillFactionChanges(mobTemplate) // Applies factionChanges
```

### Factions

```javascript
// Modify faction standing
Factions.modifyFaction(factionId, amount) // Adjusts standing by amount

// Get player factions
Factions.getPlayerFactions() // Returns: { factionId: value, ... }

// Get faction standing
Factions.getFactionStanding(value) // Returns: "ally", "warmly", etc.
```

## Examples

### Example: Adding a New City with Guards

1. **Create city zone** (`data/world-zones.json`):
```json
{
  "id": "new_city",
  "name": "New City",
  "type": "city",
  "isSafeHaven": true,
  "controllingFaction": "new_city_citizens"
}
```

2. **Create citizen faction** (`data/factions.json`):
```json
{
  "id": "new_city_citizens",
  "name": "Citizens of New City",
  "alignment": "good"
}
```

3. **Create guard faction** (`data/factions.json`):
```json
{
  "id": "new_city_guards",
  "name": "New City Guard",
  "alignment": "good",
  "aggressiveTo": ["evil"]
}
```

4. **Create guard template** (`data/mob-templates.json`):
```json
{
  "id": "new_city_guard",
  "name": "New City Guard",
  "levelRange": { "min": 10, "max": 15 },
  "factionId": "new_city_guards",
  "baseStats": { "hp": 150, "maxHp": 150, "atk": 25, "def": 20 },
  "isGuard": true
}
```

5. **Create spawn group** (`data/spawn-groups.json`):
```json
{
  "id": "new_city_guards_patrol",
  "zoneId": "new_city",
  "spawnType": "static",
  "mobTemplates": ["new_city_guard"],
  "spawnPoints": [{ "x": 10, "y": 10 }]
}
```

6. **Create patrol route** (`data/guard-patrols.json`):
```json
{
  "id": "new_city_guards_patrol",
  "zoneId": "new_city",
  "guardTemplateId": "new_city_guard",
  "patrolRoutes": [{
    "id": "patrol_1",
    "waypoints": [{ "x": 10, "y": 10 }, { "x": 20, "y": 10 }],
    "speed": 1,
    "pauseAtWaypoint": 5000
  }]
}
```

### Example: Adding Reputation Changes to a Mob

```json
{
  "id": "evil_bandit",
  "factionId": "crimson_marauders",
  "factionChanges": {
    "crimson_marauders": -5,
    "thronehold_guards": 3,
    "thronehold_citizens": 3
  }
}
```

Killing this mob:
- Loses 5 reputation with Crimson Marauders
- Gains 3 reputation with Thronehold Guards
- Gains 3 reputation with Thronehold Citizens

## Testing

Use the debug panel (`/factions`) to:
- View all faction standings
- Adjust standings for testing
- Reset to defaults

## Future Enhancements

- Guard AI to attack hostile mobs (currently only patrols)
- Faction-based quest givers (only give quests if friendly)
- Faction-based merchants (different prices based on standing)
- Faction-based zone access (some zones require certain standing)
- Faction-based PvP (players of hostile factions can attack each other)

