# Spawn System & Targeting Implementation Summary

## Completed Implementation

### ✅ Data-Driven Spawn System

**New System**: `src/core/spawn-system.js`

1. **Static Spawns (Dungeons)**
   - Mobs spawn at fixed tile coordinates from spawn groups
   - On death, mob respawns at same tile after `respawnSeconds`
   - No wandering outside leash radius (5 tiles) from spawn point
   - Respawn timers tracked per spawn point

2. **Roaming Spawns (Outdoor Zones)**
   - Mobs spawn at random valid (walkable) tiles
   - Mobs wander between nearby tiles (5-tile radius)
   - Wandering happens every 5-10 seconds
   - Maintains `maxConcurrent` mob count per spawn group

3. **Spawn Groups**
   - Defined in `data/spawn-groups.json`
   - Each group has: `spawnType`, `maxConcurrent`, `respawnSeconds`, `mobTemplates`, `spawnPoints`
   - Static groups: Fixed spawn points with respawn timers
   - Roaming groups: Random spawns with wandering behavior

### ✅ Click-to-Target System

**New System**: `src/game/targeting.js`

1. **Click Targeting**
   - Click on a tile with a mob to set as target
   - Target highlighted with yellow circle and border
   - Target info displayed in dedicated panel

2. **Target Panel UI**
   - Shows: Name, Level, HP bar, Faction, "Con" (consider) color
   - HP bar changes color: Green (>75%), Yellow (>50%), Orange (>25%), Red (<25%)
   - "Con" color based on level difference:
     - Blue (Trivial): -10 or more
     - Cyan (Easy): -5 to -10
     - Green (Weak): -3 to -5
     - Yellow (Decent): -1 to -3
     - White (Even): 0
     - Orange (Tough): +1 to +2
     - Red (Very Tough): +3 to +4
     - Purple (Impossible): +5 or more

3. **Keyboard Targeting**
   - **Tab**: Cycle to next target (forward)
   - **Shift+Tab**: Cycle to previous target (backward)
   - **Escape**: Clear target
   - Targets sorted by distance (closest first)

### ✅ Debug Overlay

**Debug Features**:
- Toggle button (🔍) in map controls
- **D key**: Toggle debug overlay (keyboard shortcut)
- Shows spawn points:
  - **Green circles**: Static spawn points
  - **Blue circles**: Roaming spawn points
  - Labels: S0, S1, etc. for static; R0, R1, etc. for roaming

### ✅ Integration

1. **Combat System**
   - When mob dies, `SpawnSystem.killMob()` is called
   - Respawn timer starts for static spawns
   - Target cleared on death

2. **Map Rendering**
   - Mobs rendered from spawn system
   - Targeted mobs highlighted in yellow
   - Target tile has yellow border

3. **Movement**
   - Click on mob tile: Sets target
   - If adjacent: Starts combat
   - If not adjacent: Moves towards target

## Files Created

1. `src/core/spawn-system.js` - Spawn system with static/roaming support
2. `src/game/targeting.js` - Targeting system with click/keyboard support
3. `SPAWN_TARGETING_IMPLEMENTATION.md` - This file

## Files Modified

1. `index.html` - Added target panel HTML, spawn/targeting scripts
2. `src/app.js` - Initialize spawn system on load
3. `src/game/combat.js` - Kill mob in spawn system on death
4. `src/ui/world-map-render.js` - Render mobs from spawn system, targeting, debug overlay
5. `styles.css` - Target panel CSS

## Data Structure

### Spawn Groups (`data/spawn-groups.json`)
```json
{
  "id": "thronehold_gates_wildlife",
  "zoneId": "thronehold_gates",
  "spawnType": "roaming",
  "maxConcurrent": 12,
  "respawnSeconds": 180,
  "mobTemplates": ["wild_boar", "goblin_scout"],
  "spawnPoints": [] // Empty for roaming
}
```

### Static Spawn Example
```json
{
  "id": "thronehold_gates_bandits",
  "zoneId": "thronehold_gates",
  "spawnType": "static",
  "maxConcurrent": 4,
  "respawnSeconds": 600,
  "mobTemplates": ["bandit_scout"],
  "spawnPoints": [
    { "x": 45, "y": 45 },
    { "x": 48, "y": 48 }
  ]
}
```

## API

### Spawn System
```javascript
// Initialize zone
SpawnSystem.initializeZone(zoneId)

// Get alive mobs
SpawnSystem.getAliveMobs(zoneId)

// Get mob at tile
SpawnSystem.getMobAtTile(zoneId, x, y)

// Get nearby mobs
SpawnSystem.getNearbyMobs(zoneId, centerX, centerY, radius)

// Kill mob (triggers respawn timer for static)
SpawnSystem.killMob(entityId)
```

### Targeting System
```javascript
// Set target
Targeting.setTarget(mobEntity)

// Clear target
Targeting.clearTarget()

// Get current target
Targeting.getTarget()

// Check if mob is targeted
Targeting.isTargeted(mobEntity)

// Cycle targets (keyboard)
Targeting.cycleTarget(forward)

// Handle tile click
Targeting.handleTileClick(zoneId, x, y)
```

## Usage

### Adding New Static Spawns (Dungeon)

1. Edit `data/spawn-groups.json`
2. Add spawn group with `spawnType: "static"`
3. Add `spawnPoints` array with coordinates
4. No code changes needed!

### Adding New Roaming Spawns (Outdoor)

1. Edit `data/spawn-groups.json`
2. Add spawn group with `spawnType: "roaming"`
3. Set `spawnPoints` to empty array or omit
4. Set `maxConcurrent` to desired max mob count
5. No code changes needed!

### Toggling Debug Overlay

- Click 🔍 button in map controls
- Press **D** key (when not typing)

## Testing

1. **Static Spawns**: Go to dungeon zone, kill mob, wait for respawn timer
2. **Roaming Spawns**: Go to outdoor zone, watch mobs wander around
3. **Click-to-Target**: Click on mob tile, see target panel update
4. **Keyboard Targeting**: Press Tab to cycle through nearby targets
5. **Debug Overlay**: Press D to see spawn points

## Future Enhancements

- Guard patrol routes (currently spawn points only)
- Mob aggro on player proximity
- Mob combat AI (fight back when attacked)
- Loot drops on death
- More sophisticated wandering (pathfinding)

