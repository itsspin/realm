# 12×12 Player-Centered Viewport Implementation

## Overview

The world map now uses a fixed 12×12 tile viewport centered on the player. The player always appears at the center of the viewport (position 6, 6), and the world scrolls around them as they move.

## Viewport System

### Constants
- `VIEW_SIZE = 12` - 12×12 tiles total
- `VIEW_CENTER = 6` - Center index (0-11, center is 6)
- `VIEW_RADIUS = 6` - 6 tiles on each side of center

### Coordinate Calculation

**Viewport to World:**
```javascript
worldX = playerX + (vx - VIEW_CENTER)
worldY = playerY + (vy - VIEW_CENTER)
```

**World to Viewport:**
```javascript
vx = VIEW_CENTER + (worldX - playerX)
vy = VIEW_CENTER + (worldY - playerY)
```

### Screen Positioning

The 12×12 viewport is centered on the canvas:
```javascript
offsetX = (containerWidth - VIEW_SIZE * tileSize) / 2
offsetY = (containerHeight - VIEW_SIZE * tileSize) / 2

screenX = vx * tileSize + offsetX
screenY = vy * tileSize + offsetY
```

## Features

### 1. Entity Detection Per Tile
- Each tile is checked for entities (mobs, NPCs, players)
- Entities are detected using `getEntitiesAtTile(zoneId, x, y)`
- Returns separate arrays for mobs, NPCs, and players

### 2. Crowding Indicators
- **Border Colors:**
  - Red: Hostile mobs present
  - Gold: Guards/important NPCs
  - Blue: Friendly NPCs
  - Green: Players
  - No border: Empty tiles

- **Crowding Badge:**
  - Shows "+N" badge if multiple entities on a tile
  - Appears in top-right corner of tile
  - Only visible if 2+ entities present

### 3. Tile Detail Panel
- Shows all entities on a clicked/hovered tile
- Click entity in panel to target
- Updates automatically when hovering over tiles
- Located in right panel

### 4. Nearby List
- Text-based list of entities within 1-tile radius
- Keyboard navigation (Tab, Arrow keys, Enter)
- Updates automatically as player moves
- Located in right panel above tile detail panel

### 5. Click-to-Target
- Click a tile to target entities on it
- Priority: Hostile mobs > NPCs > Players > Empty
- If adjacent to hostile mob, attacks automatically
- Otherwise, moves towards target

### 6. Hover Highlight
- Tiles highlight when hovered
- Tile Detail Panel updates on hover
- Shows entity information

## Removed Features

### Dragging/Panning
- All mouse drag handlers removed
- Map no longer draggable
- `panX` and `panY` are deprecated (always 0)
- `centerOnPlayer()` is now a no-op (always centered)

### Zoom
- Zoom still works for accessibility
- Mouse wheel zoom in/out
- Zoom controls (+, -) still functional
- Zoom doesn't affect viewport size (always 12×12)

## Integration

### Movement System
- Movement system calls `WorldMapRender.renderMap()` after moves
- Viewport automatically updates to show new tiles
- Nearby list updates on movement

### Spawn System
- Entities use world coordinates (`x`, `y` in zone)
- Entities are filtered by viewport before rendering
- Only entities within `VIEW_RADIUS` are drawn

### Targeting System
- Click-to-target works with new viewport
- Tile Detail Panel integrates with targeting
- Nearby list integrates with targeting
- Targeted entities highlighted in both viewport and panels

### Zone Transitions
- Zone transition arrows shown if visible in viewport
- Clicking transition arrows still works
- Zone changes trigger viewport update

## Files Modified

1. **`src/ui/world-map-render.js`** - Core viewport refactor
2. **`src/ui/tile-detail-panel.js`** - New component
3. **`src/ui/nearby-list.js`** - New component
4. **`src/game/movement.js`** - Integration updates
5. **`styles-ui-redesign.css`** - Panel styles
6. **`index.html`** - Script tags

## Future Enhancements

1. **Entity Icons** - Add visual icons for different entity types
2. **Target Cycling** - Tab through entities on a tile
3. **Pathfinding Visualization** - Show path to target
4. **Zone Border Highlighting** - Visual zone boundaries
5. **Entity Health Bars** - Show HP above entities

## Testing Checklist

- [x] 12×12 viewport renders correctly
- [x] Player always at center
- [x] Tiles outside zone bounds show fog
- [x] Entities render correctly
- [x] Crowding indicators work
- [x] Tile detail panel shows entities
- [x] Click-to-target works
- [x] Movement updates viewport
- [x] Zone transitions work
- [x] Zoom still works
- [x] Nearby list updates
- [x] Keyboard navigation works

