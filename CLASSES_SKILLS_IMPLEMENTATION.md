# Classes, Skills, Professions, and 1-10 Progression Implementation

## Completed Implementation

### ✅ Data Models

1. **Class Model** (`data/classes-enhanced.json`)
   - Properties: id, name, role, primaryStats, armorTypes, weaponTypes, resourceType, skillIdsByLevel
   - 4 starter classes: Warden (tank), Stalker (melee DPS), Arcanist (caster DPS), Templar (healer)
   - Unique Realm names inspired by EverQuest P99 classes

2. **Skill Model** (`data/skills-enhanced.json`)
   - Properties: id, name, description, classId, requiredLevel, type, cooldown, cost, effect formula
   - Skills for levels 1-10: Bash, Taunt, Kick, Defensive Stance, Backstab, Sneak, Poison Strike, Evasion, Minor Nuke, Flame Bolt, Frost Snare, Lightning Strike, Minor Heal, Light Heal, Smite Undead, Cure Disease

3. **Profession Model** (`data/professions.json`)
   - Properties: id, name, type, relatedSkills, resourceTypes, gatheringNodes, recipes
   - 2 starter professions: Foraging, Basic Crafting

4. **Item Model** (`data/items-starter.json`)
   - Enhanced with: levelReq, rarity, flags (starter, noDrop, quest)
   - Items for levels 1-10: starter gear, weapons, armor, consumables, materials

5. **LootTable Model** (`data/loot-tables.json`)
   - Properties: id, name, entries (itemId, chance, minQuantity, maxQuantity, flags)
   - Tables: wildlife_loot, goblin_loot, bandit_loot, corrupted_loot, shadow_loot, guard_loot

### ✅ Starter Classes (Inspired by EQ P99)

1. **Warden** (Tank) - Inspired by Warrior
   - Primary Stats: STR 90, STA 95, AGI 70, DEX 75
   - Armor: Plate, Chain, Mail
   - Weapons: Sword, Mace, Axe, Shield
   - Resource: Rage
   - Skills: Bash (L1), Taunt (L5), Kick (L8), Defensive Stance (L10)

2. **Stalker** (Melee DPS) - Inspired by Rogue
   - Primary Stats: STR 80, STA 75, AGI 105, DEX 110
   - Armor: Leather, Cloth
   - Weapons: Dagger, Sword, Throwing
   - Resource: Energy
   - Skills: Backstab (L1), Sneak (L4), Poison Strike (L7), Evasion (L10)

3. **Arcanist** (Caster DPS) - Inspired by Wizard
   - Primary Stats: STR 50, STA 60, AGI 70, DEX 75, WIS 80, INT 110
   - Armor: Cloth
   - Weapons: Staff, Wand, Orb
   - Resource: Mana
   - Skills: Minor Nuke (L1), Flame Bolt (L4), Frost Snare (L7), Lightning Strike (L10)

4. **Templar** (Healer) - Inspired by Cleric
   - Primary Stats: STR 65, STA 75, AGI 65, DEX 70, WIS 110, INT 80, CHA 90
   - Armor: Plate, Chain, Cloth
   - Weapons: Mace, Hammer, Staff
   - Resource: Mana
   - Skills: Minor Heal (L1), Light Heal (L4), Smite Undead (L7), Cure Disease (L10)

### ✅ Skills System

**Skill Types:**
- **Ability**: Melee/ranged abilities (Bash, Backstab, Taunt, etc.)
- **Spell**: Magic spells (Nuke, Heal, Snare, etc.)
- **Buff**: Temporary buffs (Defensive Stance, Sneak, Evasion, etc.)

**Skill Effects:**
- **Damage**: Formula-based damage (atk * multiplier + bonus)
- **Heal**: Formula-based healing (wis * multiplier + bonus)
- **Threat**: Threat generation for tanking
- **Buff**: Stat modifiers, stealth, dodge, etc.
- **Debuff**: Snare, stun, interrupt, etc.

### ✅ Combat Loop (1-10)

**Auto-Attack:**
- Triggers every 3 seconds during combat
- Uses hit chance calculation
- Applies crit chance
- Generates threat

**Skills:**
- Can be used on player's turn
- Cooldown tracking
- Resource cost (mana, rage, energy)
- Effect formulas based on stats

**Combat Resolution:**
- **Hit Chance**: Based on level difference, DEX vs AGI
- **Crit Chance**: Based on level difference, DEX
- **Resist Check**: For spells, based on level difference, resist stat
- **Damage**: ATK vs DEF with variance, crit multiplier
- **Threat**: Damage * multiplier (taunt generates 3x threat)

### ✅ XP and Leveling

**XP Scaling** (EverQuest style):
- Same level: 100% XP
- 1-2 levels below: 75% XP
- 3-4 levels below: 50% XP
- 5+ levels below: 25% XP
- 1-2 levels above: 50% XP
- 3-4 levels above: 25% XP
- 5+ levels above: 10% XP

**Leveling Curve:**
- Exponential XP curve: `200 * 1.8^(level-1)`
- Slow grind similar to EverQuest

**Stat Gains Per Level:**
- **Tanks**: +5 HP, +2 DEF, +0.5 ATK
- **DPS**: +2 HP, +2 ATK, +0.5 DEF
- **Healers**: +3 HP, +1 DEF, +0.5 ATK

### ✅ Loot System

**Loot Tables:**
- Each mob template has a `lootTableId`
- Tables contain entries with itemId, chance, min/maxQuantity
- Multiple items can drop from a single kill
- Entries are rolled independently

**Item Flags:**
- `starter`: Starter gear given to new characters
- `noDrop`: Cannot be dropped/traded
- `quest`: Quest item

**Rarity:**
- Common, Uncommon, Rare (for future expansion)

### ✅ Professions Integration

**Foraging:**
- Gathering nodes in newbie zones
- Respawn timers (120-180 seconds)
- Possible items with chance percentages
- Skill XP rewards

**Basic Crafting:**
- Recipes with materials and quantities
- Produces better gear than starter items
- Recipes for: Crude Sword, Minor Healing Potion, Leather Armor

**Gathering Nodes:**
- Defined in `data/gathering-nodes.json`
- Tile positions in zones
- Respawn timers
- Level requirements

## Files Created

1. `data/classes-enhanced.json` - Enhanced class definitions
2. `data/skills-enhanced.json` - Skill definitions with formulas
3. `data/professions.json` - Profession definitions
4. `data/items-starter.json` - Low-level items (1-10)
5. `data/loot-tables.json` - Loot table definitions
6. `data/gathering-nodes.json` - Gathering node definitions
7. `src/core/combat-enhanced.js` - Enhanced combat system
8. `CLASSES_SKILLS_IMPLEMENTATION.md` - This file

## Files Modified

1. `src/game/combat.js` - Integrated enhanced combat, hit chance, crits, loot tables
2. `src/game/leveling.js` - Class-based stat gains per level
3. `src/app.js` - Load new data files
4. `index.html` - Add combat-enhanced script
5. `data/mob-templates.json` - Add XP and gold to templates

## API

### Combat Enhanced
```javascript
// Hit chance
CombatEnhanced.calculateHitChance(attackerLevel, defenderLevel, attackerDex, defenderAgi)
CombatEnhanced.rollHit(attackerLevel, defenderLevel, attackerDex, defenderAgi)

// Crit chance
CombatEnhanced.calculateCritChance(attackerLevel, defenderLevel, attackerDex)
CombatEnhanced.rollCrit(attackerLevel, defenderLevel, attackerDex)

// Resist check
CombatEnhanced.calculateResistChance(casterLevel, targetLevel, resistType, targetResist)
CombatEnhanced.rollResist(casterLevel, targetLevel, resistType, targetResist)

// Damage and threat
CombatEnhanced.calculateDamage(attackerAtk, defenderDef, isCrit)
CombatEnhanced.calculateThreat(damage, threatMultiplier, isHeal)

// Skills
CombatEnhanced.useSkill(skillId, target)
CombatEnhanced.startAutoAttack(target)
CombatEnhanced.stopAutoAttack()
```

### Combat
```javascript
// Use skill in combat
Combat.useSkillInCombat(skillId)

// Roll loot from table
Combat.rollLootFromTable(monster)

// Check combat status
Combat.isInCombat()
```

## Data-Driven Design

**All content is data-driven:**
- Classes defined in JSON (no hardcoded logic)
- Skills defined in JSON with formulas
- Items defined in JSON with stats and requirements
- Loot tables defined in JSON with chances
- Gathering nodes defined in JSON with positions

**To add new content:**
1. Add class to `classes-enhanced.json`
2. Add skills to `skills-enhanced.json`
3. Add items to `items-starter.json`
4. Add loot tables to `loot-tables.json`
5. Add gathering nodes to `gathering-nodes.json`
6. No code changes needed!

## Usage

### Using Skills in Combat

```javascript
// Use a skill
Combat.useSkillInCombat('bash');

// Auto-attack starts automatically when combat begins
// Skills can be used on player's turn
```

### Loot Drops

Loot is automatically rolled from mob's loot table when killed. Multiple items can drop from a single kill based on entry chances.

### Gathering

Gathering nodes spawn at defined positions in zones. Players can gather resources by clicking on nodes (future implementation).

## Next Steps

1. **UI for Skills**: Add skill buttons to combat UI
2. **Resource System**: Implement mana/rage/energy tracking
3. **Gathering UI**: Add gathering node interaction
4. **Recipe UI**: Add crafting interface
5. **Skill Hotkeys**: Add keyboard shortcuts for skills (1-9 keys)

