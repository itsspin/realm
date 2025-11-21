# World Structure Documentation

## Overview

The Realm world is built on a grid-based system with zones, tiles, spawn groups, and territory regions. This document explains how these systems work together.

## Core Concepts

### Zones

A **Zone** is a distinct area of the world with its own grid layout, spawn groups, and controlling faction. Zones can be:
- **City**: Safe havens with guards, buildings, and NPCs
- **Outdoor**: Open areas with roaming and static mobs
- **Dungeon**: Indoor areas with static spawn points

**Zone Properties:**
- `id`: Unique identifier
- `name`: Display name
- `type`: "city" | "outdoor" | "dungeon"
- `levelRange`: { min, max } - Level range for this zone
- `controllingFaction`: Faction ID that controls this zone
- `neighboringZones`: Array of zone IDs that connect to this zone
- `isSafeHaven`: Boolean - Whether this is a safe zone (cities)
- `gridWidth`: Number of tiles wide
- `gridHeight`: Number of tiles tall
- `spawnGroups`: Array of spawn group IDs for this zone

**Example:**
```json
{
  "id": "thronehold",
  "name": "Thronehold",
  "type": "city",
  "levelRange": { "min": 1, "max": 10 },
  "controllingFaction": "thronehold_citizens",
  "neighboringZones": ["thronehold_gates", "thronehold_plains"],
  "isSafeHaven": true,
  "gridWidth": 40,
  "gridHeight": 40
}
```

### Tiles

A **Tile** is a single grid cell within a zone. Each tile has:
- Position (x, y) within the zone
- Terrain type (determines appearance and walkability)
- Zone ID (which zone it belongs to)
- Optional spawn group ID (if this tile has a spawn point)
- Optional guard path node ID (if guards patrol here)

**Terrain Types:**
- **City**: `city_street`, `city_plaza`, `building`, `wall`
- **Outdoor**: `grass`, `path`, `tree`, `water`, `rock`
- **Dungeon**: `dungeon_floor`, `dungeon_wall`

**Tile Properties:**
- `x`, `y`: Coordinates within the zone
- `zoneId`: Zone this tile belongs to
- `terrainType`: Visual and functional type
- `walkable`: Boolean - Can players walk here?
- `spawnGroupId`: Optional - Spawn group that uses this tile
- `guardPathNodeId`: Optional - Guard patrol route node

**Example:**
```json
{
  "x": 10,
  "y": 15,
  "zoneId": "thronehold",
  "terrainType": "city_street",
  "walkable": true,
  "spawnGroupId": "thronehold_guards_patrol"
}
```

### Spawn Groups

A **Spawn Group** defines how and where mobs spawn in a zone. There are two spawn types:

1. **Static**: Mobs spawn at fixed locations (spawn points)
2. **Roaming**: Mobs spawn randomly within the zone

**Spawn Group Properties:**
- `id`: Unique identifier
- `zoneId`: Zone this spawn group belongs to
- `spawnType`: "static" | "roaming"
- `maxConcurrent`: Maximum mobs alive at once
- `respawnSeconds`: Time before respawn after death
- `mobTemplates`: Array of mob template IDs that can spawn
- `spawnPoints`: Array of { x, y } coordinates (for static spawns)
- `patrolRoutes`: Optional - Guard patrol routes

**Example:**
```json
{
  "id": "thronehold_gates_wildlife",
  "zoneId": "thronehold_gates",
  "spawnType": "roaming",
  "maxConcurrent": 12,
  "respawnSeconds": 180,
  "mobTemplates": ["wild_boar", "goblin_scout"],
  "spawnPoints": []
}
```

### Mob Templates

A **Mob Template** defines the base stats and properties of a monster type.

**Mob Template Properties:**
- `id`: Unique identifier
- `name`: Display name
- `levelRange`: { min, max } - Level range for this mob
- `factionId`: Faction this mob belongs to (null for neutral)
- `baseStats`: { hp, maxHp, atk, def }
- `lootTableId`: Loot table to use when killed
- `isGuard`: Boolean - Is this a guard NPC?
- `aggressiveTo`: Optional - Array of alignments this mob attacks

**Example:**
```json
{
  "id": "wild_boar",
  "name": "Wild Boar",
  "levelRange": { "min": 1, "max": 2 },
  "factionId": null,
  "baseStats": {
    "hp": 20,
    "maxHp": 20,
    "atk": 4,
    "def": 2
  },
  "lootTableId": "wildlife_loot",
  "isGuard": false
}
```

### Territory Regions

A **Territory Region** defines a group of tiles controlled by a faction (for Risk-like territory control).

**Territory Region Properties:**
- `id`: Unique identifier
- `name`: Display name
- `controllingFactionId`: Faction that controls this territory (null for neutral)
- `controlScore`: 0-100 - How strongly the faction controls this area
- `tileBounds`: { zoneId, minX, maxX, minY, maxY } - Bounding box

**Example:**
```json
{
  "id": "thronehold_territory",
  "name": "Thronehold Territory",
  "controllingFactionId": "thronehold_citizens",
  "controlScore": 100,
  "tileBounds": {
    "zoneId": "thronehold",
    "minX": 0,
    "maxX": 39,
    "minY": 0,
    "maxY": 39
  }
}
```

## Data Files

All world data is stored in JSON files in the `data/` directory:

- `world-zones.json`: Zone definitions
- `spawn-groups.json`: Spawn group definitions
- `mob-templates.json`: Mob template definitions
- `territory-regions.json`: Territory region definitions

## World System API

The `World` system (`src/core/world.js`) provides utilities for accessing world data:

### Zone Lookups
```javascript
// Get a zone by ID
const zone = World.getZone('thronehold');

// Get all tiles in a zone
const tiles = World.getZoneTiles('thronehold');
```

### Tile Lookups
```javascript
// Get a specific tile
const tile = World.getTile('thronehold', 10, 15);

// Check if a tile is walkable
const walkable = World.isTileWalkable('thronehold', 10, 15);
```

### Spawn Group Lookups
```javascript
// Get all spawn groups for a zone
const spawnGroups = World.getSpawnGroupsForZone('thronehold_gates');

// Get a specific spawn group
const group = World.getSpawnGroup('thronehold_gates_wildlife');
```

### Mob Template Lookups
```javascript
// Get a mob template
const template = World.getMobTemplate('wild_boar');
```

### Territory Lookups
```javascript
// Get territory region for a tile
const territory = World.getTerritoryForTile('thronehold', 10, 15);

// Get controlling faction for a tile
const faction = World.getControllingFaction('thronehold', 10, 15);
```

## Grid Layout Generation

Tiles are automatically generated when the world is initialized. The generation algorithm:

1. **City Zones**: Creates a grid with:
   - Walls on the perimeter
   - Streets in a grid pattern (every 5 tiles, plus center lines)
   - Buildings in between streets
   - Plazas in open areas

2. **Outdoor Zones**: Creates a grid with:
   - Grass as the default terrain
   - Paths every 8 tiles
   - Random trees (15% chance)
   - Water/rock on the edges (10% chance)

3. **Dungeon Zones**: Creates a grid with:
   - Stone floors as default
   - Walls on perimeter and at intervals

## Rendering

The `WorldMapRender` system (`src/ui/world-map-render.js`) renders the grid map:

- Different colors for different terrain types
- Player position highlighted in red
- Monsters shown in red circles
- Other players shown in green circles
- Non-walkable tiles have darker borders

## Starter Content

### Thronehold (Human City)
- **Zone ID**: `thronehold`
- **Type**: City
- **Grid Size**: 40x40
- **Level Range**: 1-10
- **Adjacent Zones**: 
  - `thronehold_gates` (outdoor, levels 1-5)
  - `thronehold_plains` (outdoor, levels 2-8)

### Silverweave (Elven City)
- **Zone ID**: `silverweave`
- **Type**: City
- **Grid Size**: 40x40
- **Level Range**: 1-10
- **Adjacent Zones**:
  - `weeping_woods_outskirts` (outdoor, levels 1-5)
  - `weeping_woods` (outdoor, levels 3-10)

## Extending the World

To add a new zone:

1. Add zone definition to `data/world-zones.json`
2. Add spawn groups to `data/spawn-groups.json`
3. Add mob templates to `data/mob-templates.json` (if new mobs)
4. Add territory region to `data/territory-regions.json` (if needed)
5. Tiles will be auto-generated when the world initializes

To add a new terrain type:

1. Add color to `TERRAIN_COLORS` in `src/ui/world-map-render.js`
2. Update tile generation logic in `src/core/world.js` if needed
3. Add to legend if it should be shown

## Future Enhancements

- Zone boundaries on world map (when zones are positioned globally)
- Dynamic territory control (players/guilds can capture territories)
- More complex dungeon layouts (rooms, corridors, doors)
- Weather effects per zone
- Day/night cycle affecting visibility

