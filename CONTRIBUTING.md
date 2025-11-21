# Contributing to REALM

This guide explains how to add new content to REALM without modifying code. All game content is loaded from JSON data files in the `data/` directory.

## Table of Contents

- [Adding a New Zone](#adding-a-new-zone)
- [Adding a New Mob Template and Spawn Group](#adding-a-new-mob-template-and-spawn-group)
- [Adding a New Item and Loot Table](#adding-a-new-item-and-loot-table)
- [Adding a New Class/Skill](#adding-a-new-classskill)
- [Data File Structure](#data-file-structure)
- [Testing Your Changes](#testing-your-changes)

## Adding a New Zone

### Step 1: Create Zone Entry

Edit `data/world-zones.json` and add a new zone object:

```json
{
  "id": "my_new_zone",
  "name": "My New Zone",
  "description": "A mysterious new area to explore.",
  "type": "outdoor",
  "gridWidth": 50,
  "gridHeight": 50,
  "isSafeHaven": false,
  "controllingFaction": "neutral_faction",
  "terrain": {
    "primary": "grass",
    "secondary": ["path", "rock"]
  }
}
```

**Fields:**
- `id`: Unique identifier (lowercase, underscores)
- `name`: Display name
- `description`: Zone description shown to players
- `type`: `"city"`, `"outdoor"`, `"dungeon"`, or `"indoor"`
- `gridWidth`/`gridHeight`: Zone size in tiles (typically 50x50)
- `isSafeHaven`: `true` if guards protect this zone
- `controllingFaction`: Faction ID that controls this zone
- `terrain`: Terrain types that appear in this zone

### Step 2: Add Zone to Zones List

Edit `data/zones.json` and add a reference:

```json
{
  "id": "my_new_zone",
  "name": "My New Zone",
  "type": "outdoor",
  "levelRange": { "min": 1, "max": 10 }
}
```

### Step 3: Create Spawn Groups (Optional)

See [Adding a New Mob Template and Spawn Group](#adding-a-new-mob-template-and-spawn-group) below.

### Step 4: Test

1. Enable dev mode: `localStorage.setItem('realm_dev_mode', 'true')` in console
2. Teleport to your zone: `/teleport my_new_zone` in chat
3. Verify tiles render correctly and mobs spawn (if configured)

## Adding a New Mob Template and Spawn Group

### Step 1: Create Mob Template

Edit `data/mob-templates.json` and add a new mob:

```json
{
  "id": "my_new_mob",
  "name": "My New Mob",
  "description": "A fearsome creature.",
  "levelRange": { "min": 5, "max": 8 },
  "baseStats": {
    "maxHp": 50,
    "atk": 8,
    "def": 4,
    "agi": 60,
    "magicResist": 10
  },
  "xp": 25,
  "gold": 10,
  "factionId": "evil_faction",
  "factionChanges": {
    "evil_faction": -5,
    "good_faction": 2
  },
  "lootTableId": "my_mob_loot_table"
}
```

**Fields:**
- `id`: Unique identifier
- `name`: Display name
- `levelRange`: Min/max level for this mob
- `baseStats`: Base stats (scaled by level)
- `xp`: Base XP reward
- `gold`: Gold reward
- `factionId`: Faction this mob belongs to
- `factionChanges`: Reputation changes when killed (optional)
- `lootTableId`: Loot table to use (see below)

### Step 2: Create Spawn Group

Edit `data/spawn-groups.json` and add a spawn group:

```json
{
  "id": "my_zone_mobs",
  "zoneId": "my_new_zone",
  "spawnType": "roaming",
  "maxConcurrent": 10,
  "respawnSeconds": 180,
  "mobTemplates": ["my_new_mob", "another_mob"],
  "spawnPoints": []
}
```

**For Static Spawns (Dungeons):**

```json
{
  "id": "my_dungeon_mobs",
  "zoneId": "my_dungeon",
  "spawnType": "static",
  "maxConcurrent": 5,
  "respawnSeconds": 600,
  "mobTemplates": ["dungeon_mob"],
  "spawnPoints": [
    { "x": 10, "y": 10 },
    { "x": 20, "y": 15 },
    { "x": 30, "y": 20 }
  ]
}
```

**Fields:**
- `id`: Unique spawn group identifier
- `zoneId`: Zone this spawn group belongs to
- `spawnType`: `"static"` (fixed positions) or `"roaming"` (random tiles)
- `maxConcurrent`: Maximum mobs of this type alive at once
- `respawnSeconds`: Respawn timer (for static spawns)
- `mobTemplates`: Array of mob template IDs to spawn
- `spawnPoints`: Array of `{x, y}` coordinates (empty for roaming)

### Step 3: Test

1. Enable dev mode
2. Teleport to zone: `/teleport my_new_zone`
3. Wait a few seconds for mobs to spawn
4. Use debug overlay (press `D`) to see spawn points

## Adding a New Item and Loot Table

### Step 1: Create Item

Edit `data/items.json` or `data/items-extended.json` and add:

```json
{
  "id": "my_new_item",
  "itemId": "my_new_item",
  "name": "My New Item",
  "description": "A powerful new item.",
  "type": "weapon",
  "rarity": "uncommon",
  "stats": {
    "atk": 5,
    "def": 2
  },
  "flags": [],
  "value": 100
}
```

**Fields:**
- `id`/`itemId`: Unique identifier
- `name`: Display name
- `type`: `"weapon"`, `"armor"`, `"consumable"`, `"charm"`, etc.
- `rarity`: `"common"`, `"uncommon"`, `"rare"`, `"epic"`, `"legendary"`
- `stats`: Stat bonuses when equipped
- `flags`: Special flags (e.g., `["noDrop"]` for quest items)
- `value`: Gold value

### Step 2: Create Loot Table

Edit `data/loot-tables.json` and add:

```json
{
  "id": "my_mob_loot_table",
  "name": "My Mob Loot",
  "drops": [
    {
      "itemId": "my_new_item",
      "chance": 0.1,
      "quantity": { "min": 1, "max": 1 }
    },
    {
      "itemId": "common_item",
      "chance": 0.5,
      "quantity": { "min": 1, "max": 3 }
    }
  ]
}
```

**Fields:**
- `id`: Unique loot table identifier
- `drops`: Array of drop entries
  - `itemId`: Item to drop
  - `chance`: Drop chance (0.0 to 1.0)
  - `quantity`: Min/max quantity

### Step 3: Attach to Mob Template

Edit the mob template in `data/mob-templates.json`:

```json
{
  "id": "my_new_mob",
  "lootTableId": "my_mob_loot_table",
  ...
}
```

### Step 4: Test

1. Enable dev mode
2. Spawn mob: `/spawn my_new_mob`
3. Kill mob and verify loot drops

## Adding a New Class/Skill

### Step 1: Create Class

Edit `data/classes-enhanced.json` and add:

```json
{
  "id": "my_new_class",
  "name": "My New Class",
  "description": "A unique new class.",
  "role": "dps",
  "primaryStat": "str",
  "startingStats": {
    "maxHp": 25,
    "atk": 6,
    "def": 3,
    "agi": 50
  },
  "statGainsPerLevel": {
    "hp": 3,
    "atk": 2,
    "def": 1
  }
}
```

**Fields:**
- `id`: Unique class identifier
- `name`: Display name
- `role`: `"tank"`, `"dps"`, `"healer"`, or `"support"`
- `primaryStat`: Primary attribute
- `startingStats`: Starting stats for new characters
- `statGainsPerLevel`: Stat gains per level

### Step 2: Add to Classes List

Edit `data/classes.json` and add:

```json
{
  "id": "my_new_class",
  "name": "My New Class",
  "description": "A unique new class."
}
```

### Step 3: Create Class Skills

Edit `data/class-skills.json` and add skills for your class:

```json
{
  "classId": "my_new_class",
  "skills": [
    {
      "id": "my_class_skill",
      "name": "My Class Skill",
      "description": "A powerful ability.",
      "requiredLevel": 5,
      "cost": 50,
      "type": "ability"
    }
  ]
}
```

**Fields:**
- `classId`: Class this skill belongs to
- `id`: Unique skill identifier
- `name`: Display name
- `requiredLevel`: Level required to learn
- `cost`: Mana/energy cost
- `type`: `"ability"`, `"spell"`, or `"passive"`

### Step 4: Add Skill Definition

Edit `data/skills-enhanced.json` and add:

```json
{
  "id": "my_class_skill",
  "name": "My Class Skill",
  "description": "A powerful ability.",
  "category": "combat",
  "maxLevel": 50
}
```

### Step 5: Test

1. Create a new character with your class
2. Level up to required level
3. Verify skill appears in skills panel

## Data File Structure

All data files are in the `data/` directory:

- `world-zones.json` - Zone definitions
- `zones.json` - Zone metadata
- `mob-templates.json` - Mob templates
- `spawn-groups.json` - Spawn group configurations
- `items.json` - Base items
- `items-extended.json` - Extended items
- `loot-tables.json` - Loot table definitions
- `classes.json` - Class list
- `classes-enhanced.json` - Detailed class data
- `class-skills.json` - Class-specific skills
- `skills-enhanced.json` - Skill definitions
- `factions.json` - Faction definitions
- `races.json` - Race definitions

## Testing Your Changes

### Enable Dev Mode

In browser console:
```javascript
localStorage.setItem('realm_dev_mode', 'true');
// Reload page
```

Or add `?dev=true` to URL:
```
http://localhost:8000/?dev=true
```

### Debug Commands

Once dev mode is enabled, use these commands in chat or console:

- `/teleport <zoneId> [x] [y]` - Teleport to zone/tile
- `/spawn <mobTemplateId> [x] [y]` - Spawn mob
- `/xp <amount>` - Grant XP
- `/level <level>` - Set level
- `/item <itemId> [quantity]` - Grant item
- `/faction <factionId> <amount>` - Adjust faction

### Run Tests

In browser console:
```javascript
// Run all tests
runAllTests();

// Run specific tests
testMovement();
testSpawns();
testCombat();
testFactions();
```

### Verify Content Loading

Check browser console for data loading messages:
```
[OK] data:zones
[OK] data:mobTemplates
[OK] data:items
```

If you see `[FAIL]` messages, check:
1. JSON syntax is valid
2. File paths are correct
3. Required fields are present

## Overriding Content

You can override existing content by:
1. Adding entries with the same `id` in the same file (last one wins)
2. Creating a new data file that loads after the original (not recommended)
3. Using the admin panel (if available) to modify content at runtime

## Best Practices

1. **Use unique IDs**: Always use lowercase with underscores (e.g., `my_new_zone`)
2. **Validate JSON**: Use a JSON validator before committing
3. **Test incrementally**: Add one piece of content at a time and test
4. **Follow existing patterns**: Look at existing entries for structure
5. **Document your changes**: Add comments in JSON if needed (though JSON doesn't support comments, you can add a `_comment` field)

## Getting Help

- Check existing data files for examples
- Review `ARCHITECTURE.md` for system overview
- Check browser console for error messages
- Use debug commands to test your content

Happy contributing!

