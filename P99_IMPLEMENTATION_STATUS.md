# P99 Mechanics Implementation Status

Based on [Project 1999 Game Mechanics](https://wiki.project1999.com/Game_Mechanics), [Experience System](https://wiki.project1999.com/Experience), and [Pet Guide](https://wiki.project1999.com/Pet_Guide).

## ✅ Completed Implementations

### 1. DoT (Damage Over Time) System with Moving Penalty
**File:** `src/core/dot-system.js`

- ✅ DoT spells apply damage over time (6-second ticks)
- ✅ **Moving penalty: 66% damage if target moves during tick** (P99 mechanic)
- ✅ Static targets take full damage
- ✅ Tracks target position to detect movement
- ✅ Automatic cleanup when DoT expires or target dies
- ✅ Integrated into combat system - DoT effects on damage spells automatically apply

**Reference:** [P99 Wiki - DoT Moving Penalty](https://wiki.project1999.com/Game_Mechanics)

### 2. Advanced Pet Commands (P99 Style)
**File:** `src/game/pet-system.js`, `src/ui/pet-ui.js`

**Pet Behaviors Implemented:**
- ✅ **Follow:** Pet follows player within 2 tiles
- ✅ **Stay:** Pet stays in place, defends if attacked
- ✅ **Attack:** Pet attacks target, generates moderate threat
- ✅ **Taunt:** Pet attacks and generates high threat (3x) to hold aggro
- ✅ **Guard:** Pet guards at location, attacks anything that attacks player within range
- ✅ **Sit:** Pet sits to regenerate HP/mana faster (less responsive)
- ✅ **Hold:** Pet stops all actions, ignores combat (passive)

**UI Controls:** All 7 commands available in pet panel

**Reference:** [P99 Pet Guide](https://wiki.project1999.com/Pet_Guide)

### 3. Pet Summoning Spells
**Files:** `data/classes-enhanced.json`, `data/skills-enhanced.json`

**Necromancer Pet Spells (Levels 1-10):**
- ✅ Level 1: Cavorting Bones (Skeleton pet level 1-2)
- ✅ Level 4: Leering Corpse (Skeleton pet level 3-4)
- ✅ Level 8: Lesser Summon Skeleton (Skeleton pet level 5-6)

**Magician Pet Spells (Levels 1-10):**
- ✅ Level 2: Elementalkin: Water (Water Elemental pet level 2-4)
- ✅ Level 4: Elementalkin: Earth (Earth Elemental pet level 4-6)

**All pet summoning spells:**
- ✅ No target required (`requiresTarget: false`)
- ✅ Unique icons (💀 for skeleton pets, 💧/🗿 for elementals)

### 4. Spell Icons
**Files:** `src/ui/skillbar.js`, `src/ui/tome.js`

**All Necromancer and Magician spells now have unique icons:**
- Cavorting Bones: 💀
- Lifetap: 🩸
- Disease Cloud: ☁️
- Leering Corpse: 💀
- Siphon Strength: 💪
- Clinging Darkness: 🌑
- Lesser Summon Skeleton: 💀
- Ward Undead: ☀️
- Engulfing Darkness: 🌑
- Burst of Flame: 🔥
- Minor Shielding: 🛡️
- Summon Dagger: 🗡️
- Summon Food: 🍞
- Summon Drink: 🍷
- Elementalkin: Water: 💧
- Summon Bandages: 🩹
- Elementalkin: Earth: 🗿
- Shielding: 🛡️

## 🚧 In Progress

### 5. Group Experience Distribution (P99 Style)
**File:** `src/game/p99-experience.js`

**Implemented:**
- ✅ Group XP calculation with level-weighted distribution
- ✅ Group bonus multiplier (1.5x for 2 members, scaling up to 1.9x for 6)
- ✅ Formula: `memberXP = totalXP * groupBonus * (memberLevel / sumOfAllLevels)`
- ✅ Integrated into combat system

**TODO:**
- ⏳ Full party member data fetching (currently placeholder for multiplayer)
- ⏳ XP distribution notifications to party members

**Reference:** [P99 Experience System](https://wiki.project1999.com/Experience)

### 6. Ranged Pulling System
**File:** `src/core/pulling-system.js`

**Implemented:**
- ✅ Pull detection for ranged attacks (spells with range > 1)
- ✅ Aggro range calculations (8 tiles for spells, 10 for bows)
- ✅ Pull mechanics framework

**TODO:**
- ⏳ Mob chase behavior integration with spawn system
- ⏳ Leash distance implementation (mobs reset if puller too far)
- ⏳ Visual feedback for pulled mobs (chasing animation)

**Reference:** [P99 Game Mechanics - Pulling](https://wiki.project1999.com/Game_Mechanics)

## 📋 Planned (High Priority)

### 7. Smooth Real-Time Movement (WASD)
**Current:** Grid-based tile movement (click to move)
**Target:** Smooth WASD movement with real-time position updates

**Implementation Plan:**
- Track player position as floats (x, y) instead of integer tiles
- WASD key handling for continuous movement
- Collision detection with terrain/mobs
- Smooth interpolation for rendering
- Maintain tile-based pathfinding for AI

**Files to Modify:**
- `src/game/movement.js` - Convert to smooth movement
- `src/ui/world-map-render.js` - Update rendering for smooth positions
- `src/core/spawn-system.js` - Update collision detection

### 8. Threat/Aggro System
**File:** `src/core/combat-enhanced.js` (partially implemented)

**Current:**
- ✅ Threat generation from damage
- ✅ Threat multipliers for taunt abilities
- ✅ Basic threat tracking

**TODO:**
- ⏳ Per-mob threat tracking (not just global)
- ⏳ Threat-based target selection for mobs
- ⏳ Threat decay over time
- ⏳ Healing generates threat (50% of healing amount)

**Reference:** [P99 Game Mechanics - Threat](https://wiki.project1999.com/Game_Mechanics)

### 9. Aggro Ranges and Mob Behavior
**File:** `src/core/spawn-system.js`

**TODO:**
- ⏳ Mob aggro range (3-5 tiles default)
- ⏳ Mobs chase pullers back to party
- ⏳ Mob leash distance (return to spawn if puller too far)
- ⏳ Mob flee behavior at low HP (20%)
- ⏳ Mob gate ability (if player far enough away)

**Reference:** [P99 Game Mechanics - NPC Behavior](https://wiki.project1999.com/Game_Mechanics)

### 10. Zone Experience Modifiers (ZEM)
**File:** `src/game/p99-experience.js` (framework exists)

**TODO:**
- ⏳ Define ZEM values for each zone
- ⏳ Apply ZEM to base XP before group distribution
- ⏳ Encourage exploration and strategic leveling

## 📝 Integration Notes

### DoT System Integration
- DoT effects are automatically applied when damage spells with `dot` effect are cast
- DoT ticks every 6 seconds (P99 standard)
- Moving penalty applies automatically based on target movement detection

### Group XP Integration
- Combat system now uses `P99Experience.awardXPForKill()` for XP distribution
- Solo players still get 100% XP (no group = no bonus)
- Group members will share XP based on level contributions

### Pulling System Integration
- Combat system checks for ranged attacks before engaging
- Spells with range > 1 can pull mobs from distance
- Integration with spawn system needed for mob chase behavior

### Pet System Integration
- All pet commands work in UI
- Pet AI updates every 500ms
- Pets render on map as purple circles
- Pet panel shows HP bar and all 7 command buttons

## 🎯 Next Steps

1. **Complete Mob Chase Behavior** - Make pulled mobs actually chase the puller
2. **Implement Smooth Movement** - Convert from grid-based to WASD real-time movement
3. **Threat System Enhancement** - Per-mob threat tracking for proper aggro management
4. **Party Pulling Flow** - Full integration: puller → mob chases → party engages
5. **ZEM Implementation** - Add zone experience modifiers for varied leveling speeds

## 📚 References

- [P99 Game Mechanics](https://wiki.project1999.com/Game_Mechanics)
- [P99 Experience System](https://wiki.project1999.com/Experience)
- [P99 Pet Guide](https://wiki.project1999.com/Pet_Guide)

