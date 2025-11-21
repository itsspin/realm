# Grid Viewport Refactor Documentation

## Current System Analysis

### Rendering Stack
- **Primary Renderer**: `src/ui/world-map-render.js` (WorldMapRender)
- **Canvas**: HTML5 Canvas element (`#worldMapCanvas`)
- **Old Renderer**: `src/ui/map-render.js` (disabled/legacy)
- **World System**: `src/core/world.js` provides zone/tile data

### Data Structures

**Player Position:**
- `player.currentZone`: String (zone ID)
- `player.currentTile`: `{x: number, y: number}` (world coordinates in zone)

**Zone Structure:**
- `zone.id`: Unique identifier
- `zone.gridWidth`: Number of tiles wide
- `zone.gridHeight`: Number of tiles tall
- `zone.type`: "city" | "outdoor" | "dungeon"

**Tile Structure:**
- `tile.x`, `tile.y`: Coordinates within zone
- `tile.zoneId`: Zone this tile belongs to
- `tile.terrainType`: Visual type (city_street, grass, etc.)
- `tile.walkable`: Boolean
- `tile.spawnGroupId`: Optional spawn point
- `tile.guardPathNodeId`: Optional guard patrol node

**Entity Structure (Mobs):**
- `mob.id`: Unique entity ID
- `mob.x`, `mob.y`: Position in zone
- `mob.zoneId`: Zone the mob is in
- `mob.mobTemplate`: Template data (name, stats, level, etc.)

### Current Viewport Logic

**Existing Pan/Drag System:**
- Uses `panX`, `panY` offsets to calculate visible area
- Calculates `startX/endX/startY/endY` based on pan offsets
- Allows dragging to pan the map
- Has zoom levels that affect tile size

**Movement Integration:**
- Movement system calls `renderMap()` and `centerOnPlayer()` after moves
- `centerOnPlayer()` updates pan offsets to keep player centered

### Where New Viewport Logic Will Be Plugged In

1. **`renderMap()` function** (`src/ui/world-map-render.js:248`)
   - Replace pan-based visible area calculation
   - Implement 12×12 viewport centered on player
   - Calculate world coordinates from viewport coordinates

2. **Remove drag handlers** (`src/ui/world-map-render.js:94-155`)
   - Disable all mouse drag/pan events
   - Keep click handling for targeting/movement

3. **`centerOnPlayer()` function** (`src/ui/world-map-render.js:558`)
   - No longer needed (player always centered)
   - Can be simplified or removed

4. **Tile rendering loop** (`src/ui/world-map-render.js:279-298`)
   - Add entity detection per tile
   - Add crowding indicators
   - Add border colors based on entity types

## New 12×12 Viewport Design

### Viewport Constants
- `VIEW_RADIUS_X = 6` (6 tiles left + 6 tiles right + player = 13 total, but we want 12×12)
- `VIEW_RADIUS_Y = 6` (6 tiles up + 6 tiles down + player = 13 total)
- Actually: Show 6 tiles on each side of player = 12×12 total (player in center would make it 13×13, so we offset by 0.5)

### Coordinate Calculation
```
For viewport coordinate (vx, vy) where vx, vy ∈ [0, 11]:
  worldX = playerX + (vx - 6)  // Center is at viewport (6, 6)
  worldY = playerY + (vy - 6)
```

### Entity Detection Per Tile
- Get all mobs at (worldX, worldY) from SpawnSystem
- Get all players at (worldX, worldY) from MapEntities
- Determine priority icon based on entity types
- Count entities for crowding indicator

## Integration Points

1. **Movement System** (`src/game/movement.js`)
   - Already calls `renderMap()` after moves
   - Will automatically show new viewport when player moves

2. **Spawn System** (`src/core/spawn-system.js`)
   - Entities already have `x`, `y` coordinates
   - Need helper to get entities at specific tile

3. **Targeting System** (`src/game/targeting.js`)
   - Will integrate with Tile Detail Panel
   - Click-to-target will use tile coordinates

