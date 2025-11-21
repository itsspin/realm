# 12×12 Player-Centered Viewport Refactor Plan

## Overview
Transform the map from a draggable/zoomable system to a fixed 12×12 viewport centered on the player.

## Key Changes Required

### 1. Viewport Constants
- `VIEW_SIZE = 12` (12×12 tiles)
- `VIEW_RADIUS = 6` (6 tiles on each side of player center)
- Player always at viewport center: (6, 6) in viewport coordinates

### 2. Remove Dragging/Panning
- Remove all `mousedown`, `mousemove`, `mouseup` drag handlers
- Remove `panX`, `panY` variables (no longer needed)
- Remove `centerOnPlayer()` function (always centered)
- Remove zoom controls (or keep minimal zoom for accessibility)

### 3. Viewport Coordinate Calculation
```javascript
// For viewport tile (vx, vy) where vx, vy ∈ [0, 11]:
const worldX = playerX + (vx - 6);
const worldY = playerY + (vy - 6);

// For screen position of viewport tile:
const screenX = vx * tileSize;
const screenY = vy * tileSize;
```

### 4. Entity Detection Per Tile
- Create helper function to get all entities at (worldX, worldY)
- Detect: mobs, players, NPCs (guards)
- Count entities for crowding indicators

### 5. Crowding Indicators
- Border colors:
  - Red: Hostile mobs present
  - Blue/Green: Friendly/neutral entities
  - Gold: Important NPCs (quest, vendor, trainer)
  - Gray: Empty
- Crowd count: Show "+N" badge if multiple entities

### 6. Tile Detail Panel Integration
- On tile click, show TileDetailPanel with all entities
- Click entity in panel to target
- Highlight targeted entity

### 7. Nearby List (Optional)
- Text-based list of entities within 1-tile radius
- Keyboard navigation (Tab/arrow keys)

## Implementation Order

1. ✅ Create Tile Detail Panel component
2. ⏳ Refactor viewport calculation (remove pan, center on player)
3. ⏳ Add entity detection helpers
4. ⏳ Add crowding indicators
5. ⏳ Remove dragging logic
6. ⏳ Integrate tile detail panel
7. ⏳ Add nearby list (optional)
8. ⏳ Update click handling
9. ⏳ Test and refine

## Files to Modify

1. `src/ui/world-map-render.js` - Core viewport refactor
2. `src/ui/tile-detail-panel.js` - Already created
3. `src/ui/nearby-list.js` - New component (optional)
4. `index.html` - Add script tags
5. `styles-ui-redesign.css` - Add tile detail panel styles

