# Realm Codebase Analysis Summary

## Quick Answers

### What tech stack is used?
**Plain JavaScript (Vanilla JS)** - No framework dependencies. Uses IIFE pattern, global namespace (`window.REALM`), Canvas API for map rendering, LocalStorage for state persistence.

### Where is the grid map implemented?
- **Core logic**: `src/map/map-core.js` (tile operations, visibility, neighbors)
- **Rendering**: `src/ui/map-render.js` (Canvas-based with zoom/pan)
- **World generation**: `src/game/settlement.js` (creates 50x50 tile grid)

### Where are NPCs/mobs modeled?
- **NPCs**: `src/game/npcs.js` (interactions, trainers, merchants, guards)
- **Mobs/Entities**: `src/game/map-entities.js` (monster spawning - currently random)
- **Dungeons**: `src/game/dungeons.js` (dungeon-specific mobs and named mobs)
- **Data**: `data/npcs.json`, `data/monsters.json`, `data/dungeon-monsters.json`, `data/named-mobs.json`

### Where are items, classes, and reputation/factions defined?
- **Items**: `data/items.json`, `data/items-extended.json` → loaded into `REALM.data.itemsById`
- **Classes**: `data/classes.json`, `data/class-skills.json` → loaded into `REALM.data.classesById`
- **Factions**: `data/factions.json` → loaded into `REALM.data.factionsById`
- **Logic**: `src/game/factions.js`, `src/game/reputation.js`

### How is state handled?
**Single global state object** (`State.data`) persisted to LocalStorage (`REALM_SAVE_V2`). No reactive system - manual UI updates required. Structure:
```javascript
{
  player: { id, name, race, class, level, xp, stats, inventory, equipment, skills, currentZone, currentTile, factions, ... },
  resources: { food, ore, timber, essence, gold },
  ownedTiles: [],
  structures: [],
  visibility: []
}
```

### What UI layout exists?
- **Left Sidebar**: Character stats, XP bar, inventory, quests, nearby players
- **Center**: Grid map (Canvas) with zoom/pan controls
- **Right Sidebar**: Narrative log, combat panel, action buttons
- **Bottom**: Chat window (always visible)

## Key Findings

### ✅ What Works Well
1. **Data Structure**: Well-organized JSON files with lookup maps
2. **Faction System**: Complete with standings and guard aggression
3. **Class System**: Classes, skills, and bonuses defined
4. **Combat System**: Turn-based combat with equipment bonuses
5. **Zone System**: Zones and dungeons defined with connections

### ❌ Critical Gaps
1. **Account System**: Missing - single character per browser, no cloud save
2. **Static Dungeon Spawns**: Monsters spawn randomly (10% chance per tile), not static
3. **Map Size**: Hardcoded 50x50 tiles (too small for MMO)
4. **Guard Patrolling**: Guards exist but don't patrol
5. **Zone Boundaries**: Not defined in tile coordinates

### ⚠️ Medium Priority Issues
1. **Starter Cities**: Exist in data but no safe haven mechanics
2. **Professions**: Gathering/crafting exists but not structured
3. **Mini-map**: Not implemented
4. **Target Info Panel**: Not implemented
5. **Buffs Panel**: Not implemented

## Files Created

1. **ARCHITECTURE.md** - Comprehensive architecture report
2. **REFACTOR_PLAN.md** - Detailed refactor plan with phases
3. **src/types/core.js** - Type definitions (JSDoc-style)
4. **ANALYSIS_SUMMARY.md** - This file

## Improvements Made

### Phase 1: Safe Mechanical Improvements ✅

1. **Architecture Documentation**
   - Complete analysis of tech stack, map, NPCs, state, UI
   - Listed all problems and gaps
   - Proposed refactor plan

2. **Type Definitions**
   - Created JSDoc-style interfaces for all core types
   - Documented world flow (login → character → map → movement → combat)
   - Added to HTML for reference

3. **High-Level Comments**
   - Added flow documentation to key files:
     - `src/app.js` - Main entry point
     - `src/game/state.js` - State management
     - `src/game/movement.js` - Movement system
     - `src/game/combat.js` - Combat system
     - `src/game/zones.js` - Zone management
     - `src/game/map-entities.js` - Entity management
     - `src/game/dungeons.js` - Dungeon system

## Next Steps

See `REFACTOR_PLAN.md` for detailed next steps:

1. **Phase 2**: Data structure cleanup (consolidate loading)
2. **Phase 3**: Folder structure refactor (breaking)
3. **Phase 4**: Core system improvements (account system, static spawns, guards)
4. **Phase 5**: UI improvements (mini-map, target info, buffs)
5. **Phase 6**: Backend integration (future)

## Recommendations

1. **Immediate**: Implement static dungeon spawns (high impact, medium effort)
2. **Short-term**: Add account system (enables multi-character, cloud save)
3. **Medium-term**: Expand map size and add zone boundaries
4. **Long-term**: Backend integration for multiplayer and cloud saves

