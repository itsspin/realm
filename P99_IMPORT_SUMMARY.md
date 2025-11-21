# P99 Import System - Implementation Summary

## Overview

A complete data import/translation pipeline that converts Project 1999-inspired JSON data into Realm's data models with deterministic renaming, stat mapping, and faction conversion.

## Files Created

### Core Translation System
- **`src/tools/p99-translator.js`** - Node.js translation module
  - `NameTranslator`: Deterministic name conversion using SHA-256 hashing
  - `StatMapper`: Maps P99 levels/stats to Realm's 1-10 balance curve
  - `FactionMapper`: Maps P99 factions to Realm's faction system
  - `MobConverter`: Converts P99 mobs to Realm MobTemplates
  - `ItemConverter`: Converts P99 items to Realm Items
  - `ZoneConverter`: Converts P99 zones to Realm Zones
  - `LootTableConverter`: Converts P99 loot to Realm LootTables

- **`src/tools/p99-translator-browser.js`** - Browser-compatible version
  - Uses Web Crypto API instead of Node crypto
  - Async name translation (Web Crypto is async)

### Import Tools
- **`src/tools/p99-importer.js`** - Node.js CLI import tool
  - Command-line interface for batch imports
  - Reads P99 JSON files and writes Realm JSON files
  - Generates import summary

- **`src/tools/p99-importer-browser.js`** - Browser import tool
  - Can be used in browser console
  - Downloads results as JSON files

### Sample Data
- **`data/sample-p99-mobs.json`** - Example P99 mob format
- **`data/sample-p99-items.json`** - Example P99 item format
- **`data/sample-p99-zones.json`** - Example P99 zone format

### Validation Examples
- **`data/zones-p99-imported.json`** - Sample imported zone
- **`data/spawn-groups-p99-imported.json`** - Sample spawn groups for imported zone
- **`data/dungeons-p99-imported.json`** - Sample dungeon with static spawns

### Documentation
- **`P99_IMPORT_GUIDE.md`** - Complete import guide with:
  - Input format specifications
  - Output format examples
  - Translation details
  - Usage instructions
  - Troubleshooting

## Key Features

### 1. Deterministic Renaming
- Same P99 name always produces same Realm name
- Uses hash-based selection from fantasy name components
- Type-specific suffixes (beast, blade, weave, etc.)
- Cached for consistency

### 2. Stat Mapping
- **Level Compression**: P99 levels 1-50 → Realm levels 1-10
- **HP Scaling**: Aggressive scaling based on level range
- **ATK/DEF Scaling**: Proportional to level compression
- **XP/Gold**: Calculated from Realm level

### 3. Faction Mapping
- P99 cities → Realm cities (Qeynos → Thronehold, etc.)
- P99 guards → Realm guards
- Neutral/creature factions → null (neutral)

### 4. Automatic Loot Table Generation
- Converts P99 loot arrays to Realm LootTable format
- Links loot tables to mob IDs automatically
- Preserves drop chances and quantities

## Usage

### Node.js (Recommended)

```bash
node src/tools/p99-importer.js \
  --mobs p99_mobs.json \
  --items p99_items.json \
  --zones p99_zones.json \
  --output data/
```

### Browser

1. Load translation module:
```html
<script src="src/tools/p99-translator-browser.js"></script>
<script src="src/tools/p99-importer-browser.js"></script>
```

2. Use in console:
```javascript
const importer = new P99ImporterBrowser();
const p99Mobs = await fetch('p99_mobs.json').then(r => r.json());
importer.importMobs(p99Mobs);
importer.downloadResults();
```

## Input Format

### Mobs
```json
{
  "name": "Goblin Warrior",
  "level": 2,
  "hp": 45,
  "damage": 8,
  "ac": 15,
  "faction": "indifferent",
  "zone": "qeynos_hills",
  "loot": [
    { "item": "Rusty Dagger", "chance": 0.3, "quantity": 1 }
  ]
}
```

### Items
```json
{
  "name": "Rusty Dagger",
  "type": "weapon",
  "level": 1,
  "damage": 5,
  "value": 5,
  "rarity": "common"
}
```

### Zones
```json
{
  "name": "Qeynos Hills",
  "level": 1,
  "type": "outdoor",
  "description": "Rolling hills...",
  "mobs": ["Goblin Warrior"]
}
```

## Output Format

All outputs follow Realm's existing data model structure:
- `mob-templates-p99.json` - MobTemplate format
- `items-p99.json` - Item format
- `zones-p99.json` - Zone format
- `loot-tables-p99.json` - LootTable format

## Validation

### Starter Zone Example
- **Zone**: "Shadowweave" (translated from "Qeynos Hills")
- **Level**: 1-2 (compressed from P99 level 1)
- **Mobs**: Translated mobs with scaled stats
- **Spawn Groups**: Roaming spawns configured

### Sample Dungeon
- **Dungeon**: "Ancient Catacombs"
- **Zones**: Entrance, Halls, Burial Chamber
- **Static Spawns**: Fixed spawn points with respawn timers
- **Mobs**: Level-appropriate translated mobs

## Integration

To use imported data in game:

1. **Load imported files in `src/app.js`**:
```javascript
// After loading existing data
const p99Mobs = await fetchJSON('data/mob-templates-p99.json');
REALM.data.mobTemplates = [...(REALM.data.mobTemplates || []), ...p99Mobs];
```

2. **Or merge manually**:
```bash
jq -s '.[0] + .[1]' data/mob-templates.json data/mob-templates-p99.json > data/mob-templates-merged.json
```

## Rerunning Imports

When new P99 data is added:
1. Update source JSON files
2. Run importer again
3. Files are overwritten (or use different output directory)
4. Merge or load separately as needed

## Translation Consistency

- **Same seed**: Uses `'realm-translation-seed'` by default
- **Deterministic**: Same input always produces same output
- **Cached**: Names are cached during import session
- **Persistent**: Can save/load translation cache for consistency across runs

## Next Steps

1. Export P99 data from wiki/scraper
2. Format as JSON matching input spec
3. Run importer
4. Review translated names (adjust if needed)
5. Test in-game balance
6. Adjust stat scaling if needed
7. Integrate into game data loading

