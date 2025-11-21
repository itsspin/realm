# P99 Data Import Guide

This guide explains how to import Project 1999-inspired data into Realm using the translation pipeline.

## Overview

The import system converts P99-style JSON data into Realm's data models with:
- **Deterministic renaming**: Same P99 name always produces the same Realm name
- **Stat mapping**: P99 levels/stats scaled to Realm's 1-10 balance curve
- **Faction mapping**: P99 factions mapped to Realm's faction system
- **Automatic loot table generation**: Loot entries converted to Realm loot tables

## Input Format

### Mobs (`p99_mobs.json`)

```json
[
  {
    "name": "Goblin Warrior",
    "level": 2,                    // or { "min": 2, "max": 5 }
    "hp": 45,
    "damage": 8,
    "ac": 15,
    "faction": "indifferent",      // P99 faction name
    "zone": "qeynos_hills",        // Zone where mob spawns
    "loot": [                       // Optional loot entries
      { "item": "Rusty Dagger", "chance": 0.3, "quantity": 1 }
    ],
    "isGuard": false,              // Optional: is this a guard?
    "aggressive": false            // Optional: is this mob aggressive?
  }
]
```

**Required fields:**
- `name`: Mob name
- `level`: Number or `{ min, max }` object
- `hp`: Hit points
- `damage`: Damage value
- `ac`: Armor class

**Optional fields:**
- `faction`: Faction name (mapped to Realm factions)
- `zone`: Zone name
- `loot`: Array of loot entries
- `isGuard`: Boolean
- `aggressive`: Boolean

### Items (`p99_items.json`)

```json
[
  {
    "name": "Rusty Dagger",
    "type": "weapon",              // weapon, armor, consumable, misc
    "slot": "weapon",              // weapon, chest, head, etc.
    "level": 1,                    // Required level
    "damage": 5,                   // For weapons
    "ac": 0,                       // Armor class (for armor)
    "stats": {                     // Optional stat bonuses
      "hp": 5,
      "mana": 10,
      "str": 3
    },
    "value": 5,                    // Vendor value
    "rarity": "common"             // common, uncommon, rare, epic, legendary
  }
]
```

**Required fields:**
- `name`: Item name
- `type`: Item type (weapon/armor/consumable/misc)
- `level`: Required level

**Optional fields:**
- `slot`: Equipment slot
- `damage`: Weapon damage
- `ac`: Armor class
- `stats`: Stat bonuses object
- `value`: Vendor value
- `rarity`: Rarity level

### Zones (`p99_zones.json`)

```json
[
  {
    "name": "Qeynos Hills",
    "level": 1,                    // or { "min": 1, "max": 5 }
    "type": "outdoor",             // city, outdoor, dungeon
    "description": "Rolling hills...",
    "mobs": ["Goblin Warrior"],    // Array of mob names/ids
    "lore": "Optional lore text"   // Optional
  }
]
```

**Required fields:**
- `name`: Zone name
- `level`: Number or `{ min, max }` object
- `type`: Zone type

**Optional fields:**
- `description`: Zone description
- `mobs`: Array of mob names
- `lore`: Lore text

## Output Format

The importer generates Realm-compatible JSON files:

### Mobs (`mob-templates-p99.json`)

```json
[
  {
    "id": "shadow_beast_123",
    "name": "Shadow Beast",
    "levelRange": { "min": 1, "max": 2 },
    "factionId": null,
    "baseStats": {
      "hp": 20,
      "maxHp": 20,
      "atk": 4,
      "def": 2
    },
    "xp": 10,
    "gold": 3,
    "lootTableId": "shadow_beast_123_loot",
    "isGuard": false
  }
]
```

### Items (`items-p99.json`)

```json
[
  {
    "itemId": "iron_blade_456",
    "name": "Iron Blade",
    "type": "weapon",
    "slot": "weapon",
    "weaponType": "sword",
    "levelReq": 1,
    "rarity": "common",
    "stats": {
      "atk": 2
    },
    "value": 5
  }
]
```

### Zones (`zones-p99.json`)

```json
[
  {
    "id": "shadowweave",
    "name": "Shadowweave",
    "description": "...",
    "level": 1,
    "levelRange": { "min": 1, "max": 2 },
    "type": "outdoor",
    "monsters": ["shadow_beast_123"]
  }
]
```

### Loot Tables (`loot-tables-p99.json`)

```json
[
  {
    "id": "shadow_beast_123_loot",
    "name": "Shadow Beast Loot",
    "entries": [
      {
        "itemId": "iron_blade_456",
        "chance": 0.3,
        "minQuantity": 1,
        "maxQuantity": 1
      }
    ]
  }
]
```

## Running the Importer

### Command Line

```bash
node src/tools/p99-importer.js \
  --mobs data/sample-p99-mobs.json \
  --items data/sample-p99-items.json \
  --zones data/sample-p99-zones.json \
  --output data/
```

### Programmatic

```javascript
const P99Importer = require('./src/tools/p99-importer');

const importer = new P99Importer('data');
await importer.run(
  'p99_mobs.json',
  'p99_items.json',
  'p99_zones.json'
);
```

## Translation Details

### Name Translation

Names are translated deterministically using a hash-based system:
- Same P99 name → Same Realm name (always)
- Uses fantasy name components (Shadow, Iron, Crimson, etc.)
- Type-specific suffixes (beast, blade, weave, etc.)

### Stat Mapping

**Level Compression:**
- P99 levels 1-5 → Realm levels 1-2
- P99 levels 6-15 → Realm levels 3-5
- P99 levels 16-30 → Realm levels 6-8
- P99 levels 31-50 → Realm levels 9-10

**HP Scaling:**
- Low levels (1-3): `P99_HP / 5`
- Mid levels (4-6): `P99_HP / 8`
- High levels (7-10): `P99_HP / 10`

**ATK/DEF Scaling:**
- Similar aggressive scaling based on level

### Faction Mapping

P99 factions are mapped to Realm factions:
- `qeynos`, `freeport` → `thronehold_citizens`
- `kelethin`, `felwithe` → `silverweave_citizens`
- `kaladim`, `akanon` → `ironhold_citizens`
- `neriak` → `shadowgrave_citizens`
- `oggok`, `grobb` → `bloodmire_citizens`
- `indifferent`, `threatening` → `null` (neutral)

## Validation

After importing, validate the data:

1. **Check import summary** (`p99-import-summary.json`):
   ```json
   {
     "importedAt": "2024-01-01T00:00:00.000Z",
     "mobs": 6,
     "items": 7,
     "zones": 4,
     "lootTables": 6,
     "factions": ["thronehold_citizens", ...]
   }
   ```

2. **Verify files created:**
   - `data/mob-templates-p99.json`
   - `data/items-p99.json`
   - `data/zones-p99.json`
   - `data/loot-tables-p99.json`

3. **Test in game:**
   - Load a zone with imported mobs
   - Verify mobs spawn correctly
   - Check loot drops
   - Verify item stats

## Rerunning the Importer

When new P99 data is added:

1. **Update source files:**
   - Add new entries to `p99_mobs.json`, `p99_items.json`, etc.

2. **Run importer again:**
   ```bash
   node src/tools/p99-importer.js --mobs p99_mobs.json --items p99_items.json --zones p99_zones.json
   ```

3. **Merge with existing data:**
   - The importer creates separate `-p99.json` files
   - Manually merge into main data files if desired:
     ```bash
     # Example: Merge mobs
     jq -s '.[0] + .[1]' data/mob-templates.json data/mob-templates-p99.json > data/mob-templates-merged.json
     ```

4. **Or keep separate:**
   - Load both files in `src/app.js`:
     ```javascript
     const mobs = [...await fetchJSON('data/mob-templates.json'), 
                   ...await fetchJSON('data/mob-templates-p99.json')];
     ```

## Sample Data

Sample P99 data files are provided:
- `data/sample-p99-mobs.json`
- `data/sample-p99-items.json`
- `data/sample-p99-zones.json`

Test the importer with:
```bash
node src/tools/p99-importer.js \
  --mobs data/sample-p99-mobs.json \
  --items data/sample-p99-items.json \
  --zones data/sample-p99-zones.json
```

## Troubleshooting

### "File not found" warnings
- Check file paths are correct
- Use absolute paths if relative paths fail

### "Error converting" messages
- Check required fields are present
- Verify JSON syntax is valid
- Check field types match expected format

### Names not translating consistently
- Ensure using same `NameTranslator` instance
- Check seed value is consistent
- Clear cache if needed: `nameTranslator.cache.clear()`

### Stats seem off
- Adjust `StatMapper` scaling factors if needed
- Check level mapping is appropriate for your balance curve

## Next Steps

After importing:
1. Review translated names and adjust if needed
2. Test mob balance in-game
3. Adjust stat scaling if mobs are too easy/hard
4. Create spawn groups for imported zones
5. Add imported zones to world map

