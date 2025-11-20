# Realm Architecture Report

## Tech Stack

**Framework**: Plain JavaScript (Vanilla JS) - No framework dependencies
- All code uses IIFE (Immediately Invoked Function Expression) pattern
- Global namespace: `window.REALM`, `window.State`, `window.Zones`, etc.
- No build system, transpilation, or bundling
- Direct DOM manipulation via vanilla JS
- Canvas API for map rendering

**Data Storage**: 
- LocalStorage for player state (`REALM_SAVE_V2`)
- JSON files in `data/` directory for game data (loaded via `fetch`)

**UI**: 
- HTML5 Canvas for grid map rendering
- Standard HTML/CSS for UI panels
- No UI framework (React, Vue, Svelte, etc.)

---

## Grid Map Implementation

**Location**: 
- Core logic: `src/map/map-core.js` - Tile operations, visibility, neighbors
- Rendering: `src/ui/map-render.js` - Canvas-based rendering with zoom/pan
- World generation: `src/game/settlement.js` - Creates 50x50 tile world

**Current Implementation**:
- 50x50 tile grid world (hardcoded in `settlement.js`)
- Canvas-based rendering with zoom (0.5x - 4x) and pan controls
- Tile-based movement (click-to-move)
- Visibility system based on owned tiles/settlements (3-tile radius + watchtowers)
- Terrain types: plains, forest, hills, water, desert
- Player position tracked in `player.currentTile` (x, y coordinates)

**Issues**:
- Map size is hardcoded (50x50) - too small for MMO
- No zone boundaries defined in tile coordinates
- Map rendering split between `src/map/map-render.js` and `src/ui/map-render.js` (duplication?)

---

## NPCs/Mobs Modeling

**Location**:
- NPCs: `src/game/npcs.js` - NPC interactions, trainers, merchants
- Mobs/Entities: `src/game/map-entities.js` - Monster spawning and rendering
- Dungeons: `src/game/dungeons.js` - Dungeon-specific mobs and named mobs

**Current Implementation**:
- NPCs loaded from `data/npcs.json` with types: `class_trainer`, `merchant`, `banker`, `auctioneer`, `guard`
- Monsters loaded from `data/monsters.json`, `data/dungeon-monsters.json`, `data/named-mobs.json`
- NPCs filtered by zone (`npc.zone === zoneId`)
- Monsters spawn randomly on nearby tiles (10% chance per tile in `map-entities.js`)
- Guards check faction/alignment for aggression

**Issues**:
- **NPCs not static in dungeons**: Monsters spawn randomly (not static spawn points)
- No persistent mob positions - monsters are generated on-the-fly
- Dungeon mobs should have static spawn points per zone, but current system uses random generation
- No respawn timers or spawn point definitions

---

## Items, Classes, and Reputation/Factions

### Items
**Location**: `data/items.json`, `data/items-extended.json`
- Loaded in `src/app.js` into `REALM.data.itemsById`
- Items have: `itemId`, `name`, `type`, `stats`, `description`
- Equipment slots: `weapon`, `armor`, `charm` (in `player.equipment`)

### Classes
**Location**: `data/classes.json`, `data/class-skills.json`
- Loaded in `src/app.js` into `REALM.data.classesById`
- Classes have: `id`, `name`, `role`, `description`, `bonuses`, `skills`
- Skills defined per class in `class-skills.json` with `requiredLevel`, `cost`

### Factions/Reputation
**Location**: 
- Data: `data/factions.json`
- Logic: `src/game/factions.js`, `src/game/reputation.js`
- Faction standings: Ally, Warmly, Kindly, Amiable, Indifferent, Apprehensive, Dubious, Threatening, Scowls
- Faction values range: -2000 to +2000
- Guards check faction standing and race alignment for aggression

**Current State**: ✅ Well-defined in JSON, logic exists

---

## State Management

**Location**: `src/game/state.js`

**Current Implementation**:
- Single global state object: `State.data`
- Persisted to LocalStorage (`REALM_SAVE_V2`)
- Structure:
  ```javascript
  {
    player: { id, name, race, class, level, xp, stats, inventory, equipment, skills, currentZone, currentTile, factions, ... },
    resources: { food, ore, timber, essence, gold },
    ownedTiles: [],
    structures: [],
    visibility: []
  }
  ```
- State updates via `State.updatePlayer(updates)` which auto-saves
- No reactive system, manual UI updates required

**Issues**:
- No account system (single character per browser)
- No character slots
- No cloud save/backend integration
- State structure is flat, could be better organized

---

## UI Layout

**Location**: `index.html`, `styles.css`, `styles-chat.css`

**Current Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Header: REALM + Resource Bar                            │
├──────────┬──────────────────────────────┬──────────────┤
│          │                              │              │
│ Left     │     Center: Grid Map         │ Right        │
│ Sidebar  │     (Canvas)                 │ Sidebar      │
│          │                              │              │
│ - Char   │                              │ - Narrative  │
│   Stats  │                              │ - Combat Log │
│ - XP Bar │                              │ - Actions    │
│ - Inv    │                              │              │
│ - Quests │                              │              │
│ - Nearby │                              │              │
│   Players│                              │              │
└──────────┴──────────────────────────────┴──────────────┘
│ Chat Window (Always Visible at Bottom)                  │
└─────────────────────────────────────────────────────────┘
```

**Rendering**: `src/ui/rendering.js` - Updates all UI panels manually

**Issues**:
- Map area may be too narrow (depends on CSS, not analyzed)
- No mini-map component
- No target info panel (mentioned in vision)
- No buffs panel (mentioned in vision)

---

## Current Problems & Gaps vs Vision

### Critical Gaps

1. **Account System**: ❌ Missing
   - No login/authentication
   - No cloud save
   - No multiple characters per account
   - Single character stored in LocalStorage

2. **Starter Cities**: ⚠️ Partially Implemented
   - Cities exist in zone data (`thronehold_gates`, `silverweave_outskirts`, etc.)
   - No city-specific zones or safe havens
   - Guards exist but may not patrol properly

3. **Guards**: ⚠️ Partially Implemented
   - Guard NPCs exist in `data/npcs.json`
   - Faction-based aggression exists
   - No patrolling behavior
   - No safe zone enforcement

4. **Static Dungeon Spawns**: ❌ Missing
   - Monsters spawn randomly (10% chance per tile)
   - No static spawn points per dungeon zone
   - No respawn timers

5. **Structured Classes/Professions**: ⚠️ Partially Implemented
   - Classes exist with bonuses
   - Skills exist per class
   - No profession system (gathering/crafting exists but not structured)

6. **Map Size**: ⚠️ Too Small
   - Hardcoded 50x50 tiles
   - Should be larger for MMO scale

### Medium Priority Gaps

7. **Zone Boundaries**: Missing tile-based zone boundaries
8. **Mini-map**: Not implemented
9. **Target Info Panel**: Not implemented
10. **Buffs Panel**: Not implemented
11. **Backend Integration**: No server/API layer

---

## Proposed Refactor Plan

### Phase 1: Folder Structure (Safe)

```
realm/
├── data/              # JSON game data (unchanged)
├── src/
│   ├── core/          # Core game systems
│   │   ├── world/     # World, zones, tiles
│   │   ├── entities/  # NPCs, mobs, players
│   │   └── systems/   # Combat, movement, etc.
│   ├── ui/            # UI rendering (existing)
│   ├── map/           # Map rendering (existing)
│   └── data/          # Data loading/management
├── server/            # Future: Backend API
│   └── api/           # REST endpoints
└── types/             # TypeScript/JS type definitions
```

### Phase 2: Type Definitions (Safe)

Create `src/types/` with JSDoc or TypeScript-style interfaces:
- `Zone`, `Tile`, `Mob`, `NPC`, `Faction`, `Item`, `Character`, `Account`, `CharacterSlot`

### Phase 3: Data Structure Cleanup (Safe)

- Move ad-hoc data into structured modules
- Create lookup maps consistently
- Add validation for data loading

### Phase 4: High-Level Comments (Safe)

Add flow documentation:
- Login → Character Selection → Map → Movement → Combat

### Phase 5: Core Systems (Future)

- Account system
- Static dungeon spawns
- Guard patrolling
- Zone boundaries
- Backend integration

---

## Implementation Priority

**Immediate (Safe, Mechanical)**:
1. ✅ Create type definitions/interfaces
2. ✅ Add high-level flow comments
3. ✅ Clean up data loading structure
4. ✅ Document architecture (this file)

**Short-term (Breaking Changes)**:
1. Refactor folder structure
2. Implement account system
3. Add static dungeon spawns
4. Expand map size

**Long-term**:
1. Backend integration
2. Multiplayer sync
3. Territory control system

