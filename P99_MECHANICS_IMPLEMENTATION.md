# P99 Mechanics Implementation Plan

Based on [Project 1999 Game Mechanics](https://wiki.project1999.com/Game_Mechanics), [Experience System](https://wiki.project1999.com/Experience), and [Pet Guide](https://wiki.project1999.com/Pet_Guide).

## Core Mechanics to Implement

### 1. Experience System (P99 Style)

**Group Experience Distribution:**
- XP is divided among party members based on level contributions
- Higher level members get proportionally more XP
- Formula: `memberXP = totalXP * (memberLevel / sumOfAllMemberLevels)`
- Solo players get 100% of XP
- Group bonus exists (typically 1.5x base XP for 2 members, scaling up)

**Level-based XP Scaling:**
- Already implemented: 5+ levels below = 5% XP, same level = 100% XP, 5+ above = 10% XP
- Keep current implementation, add group distribution

**ZEM (Zone Experience Modifiers):**
- Different zones give different XP multipliers
- Encourage exploration and strategic leveling

### 2. DoT (Damage Over Time) Mechanics

**Moving Target Penalty:**
- If target is moving when DoT ticks, deal 66% damage (from P99 wiki)
- Only applies when target moves during the tick
- Static targets take full damage

**DoT Implementation:**
- Track DoT effects on targets
- Check if target moved since last tick
- Apply damage penalty if moving

### 3. Ranged Pulling System

**Pull Mechanics:**
- Spells with range > 1 can pull from distance
- Bows/ranged weapons can pull from distance
- Pulled mobs chase the puller
- Mobs have "aggro range" - can be pulled within this range
- Mobs return to spawn if puller gets too far away (leash distance)

**Party Pulling:**
- Puller uses ranged attack (spell/bow) to aggro mob
- Mob chases puller back to party
- Party engages when mob arrives
- Core mechanic for party gameplay

### 4. Advanced Pet Commands

**Current:** Attack, Taunt, Stay, Follow

**Add:**
- **Guard:** Pet stays at location, attacks anything that attacks player within range
- **Sit:** Pet sits, regenerates HP/mana faster, less responsive
- **Hold:** Pet stops all actions, ignores combat, passive

**Pet Behavior:**
- Pets auto-defend player if player is attacked (while on Guard/Follow)
- Pets generate threat for tanking
- Pets can receive buffs from players

### 5. Smooth Real-Time Movement

**Current:** Grid-based tile movement

**Target:** Smooth WASD movement with real-time position updates

**Implementation:**
- Track player position as (x, y) floats instead of integer tiles
- WASD keys for movement
- Collision detection with terrain/mobs
- Smooth interpolation for rendering
- Maintain tile-based pathfinding for AI

### 6. Combat Improvements

**Threat System:**
- Track threat per mob encounter
- Damage generates threat
- Healing generates threat (50% of healing amount)
- Taunt generates high threat
- Highest threat = mob target

**Aggro Ranges:**
- Mobs have vision/aggro range (default: 3-5 tiles)
- Can pull with ranged attacks within this range
- Mobs chase within leash distance

**Mob Behavior:**
- Mobs flee at low HP (20%)
- Mobs can gate if player is far enough away
- Mobs regain 25% HP after gating
- Mobs have respawn timers after death

## Implementation Priority

1. **High Priority:**
   - Group XP distribution
   - Ranged pulling system
   - DoT moving penalty
   - Advanced pet commands

2. **Medium Priority:**
   - Smooth movement conversion
   - Threat system improvements
   - Aggro range mechanics

3. **Low Priority:**
   - ZEM (Zone Experience Modifiers)
   - Advanced mob behaviors (gate, flee)

