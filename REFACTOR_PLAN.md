# Realm Refactor Plan

## Summary

This document outlines the refactor plan for Realm based on the architecture analysis. The plan is divided into phases, with Phase 1 focusing on safe, mechanical improvements that don't break existing functionality.

## Phase 1: Safe Mechanical Improvements ✅ (COMPLETED)

### 1.1 Architecture Documentation
- ✅ Created `ARCHITECTURE.md` with comprehensive codebase analysis
- ✅ Documented tech stack, map implementation, NPCs/mobs, state management, UI layout
- ✅ Listed current problems and gaps vs vision

### 1.2 Type Definitions
- ✅ Created `src/types/core.js` with JSDoc-style type definitions
- ✅ Defined interfaces for: Zone, Tile, Mob, NPC, Faction, Item, Character, Account, CharacterSlot, Dungeon, SpawnPoint, GameState
- ✅ Added world flow documentation

### 1.3 High-Level Comments
- ✅ Added flow documentation to `src/app.js` (main entry point)
- ✅ Added comments to `src/game/state.js` (state management)
- ✅ Added comments to `src/game/movement.js` (movement system)
- ✅ Added comments to `src/game/combat.js` (combat system)
- ✅ Added comments to `src/game/zones.js` (zone management)
- ✅ Added comments to `src/game/map-entities.js` (entity management)
- ✅ Added comments to `src/game/dungeons.js` (dungeon system)

## Phase 2: Data Structure Cleanup (NEXT)

### 2.1 Consolidate Data Loading
- [ ] Create `src/data/loader.js` to centralize all data loading
- [ ] Remove duplicate lookup map creation code
- [ ] Add data validation on load
- [ ] Create consistent error handling

### 2.2 Data Structure Improvements
- [ ] Ensure all JSON files follow consistent schema
- [ ] Add required/optional field documentation
- [ ] Create data validation functions

## Phase 3: Folder Structure Refactor (BREAKING)

### 3.1 Proposed Structure
```
realm/
├── data/                    # JSON game data (unchanged)
├── src/
│   ├── core/               # Core game systems
│   │   ├── world/          # World, zones, tiles
│   │   │   ├── zones.js
│   │   │   ├── tiles.js
│   │   │   └── world.js
│   │   ├── entities/       # NPCs, mobs, players
│   │   │   ├── npcs.js
│   │   │   ├── mobs.js
│   │   │   └── players.js
│   │   └── systems/        # Combat, movement, etc.
│   │       ├── combat.js
│   │       ├── movement.js
│   │       └── leveling.js
│   ├── ui/                 # UI rendering (existing)
│   ├── map/                # Map rendering (existing)
│   ├── data/               # Data loading/management
│   │   └── loader.js
│   └── types/              # Type definitions (existing)
├── server/                 # Future: Backend API
│   └── api/                # REST endpoints
└── docs/                   # Documentation
    ├── ARCHITECTURE.md
    └── REFACTOR_PLAN.md
```

### 3.2 Migration Strategy
- [ ] Create new folder structure
- [ ] Move files incrementally
- [ ] Update all import paths
- [ ] Test after each move

## Phase 4: Core System Improvements (BREAKING)

### 4.1 Account System
- [ ] Create `src/core/account.js` for account management
- [ ] Add character slot system (multiple characters per account)
- [ ] Create character selection UI
- [ ] Add account creation/login UI
- [ ] Integrate with backend API (future)

### 4.2 Static Dungeon Spawns
- [ ] Add `spawnPoints` array to dungeon zone definitions
- [ ] Create spawn point management system
- [ ] Implement respawn timers
- [ ] Update `map-entities.js` to use static spawns instead of random

### 4.3 Guard System
- [ ] Add guard patrolling behavior
- [ ] Implement safe zone enforcement
- [ ] Add guard spawn points in cities
- [ ] Create guard AI (patrol routes)

### 4.4 Map Size Expansion
- [ ] Make map size configurable (not hardcoded 50x50)
- [ ] Add zone boundaries in tile coordinates
- [ ] Update world generation to support larger maps
- [ ] Optimize rendering for larger maps

## Phase 5: UI Improvements

### 5.1 Missing UI Components
- [ ] Add mini-map component
- [ ] Add target info panel
- [ ] Add buffs panel
- [ ] Improve map area width (if too narrow)

### 5.2 UI Polish
- [ ] Ensure mobile-friendly layout
- [ ] Add loading states
- [ ] Improve error messages
- [ ] Add tooltips for all UI elements

## Phase 6: Backend Integration (FUTURE)

### 6.1 API Structure
- [ ] Design REST API endpoints
- [ ] Create authentication system
- [ ] Implement cloud save/load
- [ ] Add multiplayer sync

### 6.2 Server Implementation
- [ ] Choose backend framework (Node.js, Python, etc.)
- [ ] Set up database (PostgreSQL, MongoDB, etc.)
- [ ] Implement WebSocket for real-time updates
- [ ] Add rate limiting and security

## Implementation Priority

### Immediate (Safe)
1. ✅ Architecture documentation
2. ✅ Type definitions
3. ✅ High-level comments
4. [ ] Data loading consolidation

### Short-term (Breaking Changes)
1. [ ] Folder structure refactor
2. [ ] Account system
3. [ ] Static dungeon spawns
4. [ ] Map size expansion

### Long-term
1. [ ] Backend integration
2. [ ] Multiplayer sync
3. [ ] Territory control system
4. [ ] Advanced combat features

## Notes

- All Phase 1 improvements are safe and don't break existing functionality
- Phase 2+ will require testing after each change
- Backend integration should be planned carefully to avoid breaking existing localStorage saves
- Consider migration path for existing players when implementing account system

