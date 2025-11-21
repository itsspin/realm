/**
 * P99 to Realm Data Translation Layer - Browser Version
 * 
 * Browser-compatible version using Web Crypto API instead of Node crypto.
 */

(function (global) {
  /**
   * Deterministic name translator (browser version)
   */
  class NameTranslator {
    constructor(seed = 'realm-translation-seed') {
      this.seed = seed;
      this.cache = new Map();
    }

    /**
     * Generate a deterministic hash from input (using Web Crypto API)
     */
    async hash(input) {
      const data = `${this.seed}:${input}`;
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Translate a name deterministically (async version)
     */
    async translateName(originalName, type = 'generic') {
      if (this.cache.has(originalName)) {
        return this.cache.get(originalName);
      }

      const hash = await this.hash(originalName);
      const hashNum = parseInt(hash.substring(0, 8), 16);

      const prefixes = [
        'Shadow', 'Iron', 'Crimson', 'Silver', 'Dark', 'Blood', 'Frost', 'Storm',
        'Ancient', 'Cursed', 'Forgotten', 'Eternal', 'Savage', 'Wild', 'Blighted',
        'Weeping', 'Black', 'Thorn', 'Bone', 'Soul', 'Death', 'Night', 'Dusk'
      ];

      const suffixes = [
        'weave', 'hold', 'grave', 'mire', 'wood', 'crag', 'vale', 'peak',
        'fang', 'claw', 'blade', 'shield', 'ward', 'guard', 'watch', 'keep',
        'stone', 'rock', 'bone', 'shadow', 'flame', 'frost', 'storm', 'wind'
      ];

      const creatureSuffixes = [
        'beast', 'fiend', 'wraith', 'stalker', 'hunter', 'scout', 'warrior',
        'guardian', 'sentinel', 'warden', 'keeper', 'master', 'lord', 'king'
      ];

      const itemSuffixes = [
        'blade', 'staff', 'bow', 'shield', 'armor', 'robe', 'boots', 'gauntlets',
        'helm', 'ring', 'amulet', 'potion', 'scroll', 'tome', 'gem', 'crystal'
      ];

      let translated;

      if (type === 'creature' || type === 'mob') {
        const prefix = prefixes[hashNum % prefixes.length];
        const suffix = creatureSuffixes[(hashNum >> 8) % creatureSuffixes.length];
        translated = `${prefix} ${suffix}`;
      } else if (type === 'item') {
        const prefix = prefixes[hashNum % prefixes.length];
        const suffix = itemSuffixes[(hashNum >> 8) % itemSuffixes.length];
        translated = `${prefix} ${suffix}`;
      } else if (type === 'zone') {
        const prefix = prefixes[hashNum % prefixes.length];
        const suffix = suffixes[(hashNum >> 8) % suffixes.length];
        translated = `${prefix}${suffix}`;
      } else {
        const prefix = prefixes[hashNum % prefixes.length];
        const suffix = suffixes[(hashNum >> 8) % suffixes.length];
        translated = `${prefix}${suffix}`;
      }

      this.cache.set(originalName, translated);
      return translated;
    }

    /**
     * Translate an ID (sync version using cached names)
     */
    translateId(originalId, type = 'generic') {
      const cacheKey = `id:${originalId}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Use a simple hash for IDs (deterministic but sync)
      let hash = 0;
      const str = `${this.seed}:${originalId}`;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      const hashNum = Math.abs(hash);

      const idParts = [
        'shadow', 'iron', 'crimson', 'silver', 'dark', 'blood', 'frost', 'storm',
        'ancient', 'cursed', 'forgotten', 'eternal', 'savage', 'wild', 'blighted',
        'weeping', 'black', 'thorn', 'bone', 'soul', 'death', 'night', 'dusk'
      ];

      const idSuffixes = [
        'beast', 'fiend', 'wraith', 'stalker', 'hunter', 'scout', 'warrior',
        'guardian', 'sentinel', 'warden', 'keeper', 'master', 'lord', 'king',
        'blade', 'staff', 'bow', 'shield', 'armor', 'robe', 'boots', 'gauntlets'
      ];

      const part1 = idParts[hashNum % idParts.length];
      const part2 = idSuffixes[(hashNum >> 8) % idSuffixes.length];
      const part3 = (hashNum >> 16) % 1000;

      const translated = `${part1}_${part2}_${part3}`;
      this.cache.set(cacheKey, translated);
      return translated;
    }
  }

  /**
   * Stat mapper (same as Node version)
   */
  class StatMapper {
    mapLevel(p99Level) {
      if (p99Level <= 5) return Math.max(1, Math.floor(p99Level / 3) + 1);
      if (p99Level <= 15) return Math.min(5, Math.floor((p99Level - 5) / 3) + 3);
      if (p99Level <= 30) return Math.min(8, Math.floor((p99Level - 15) / 5) + 6);
      return Math.min(10, Math.floor((p99Level - 30) / 10) + 9);
    }

    mapHP(p99HP, p99Level) {
      const realmLevel = this.mapLevel(p99Level);
      if (realmLevel <= 3) return Math.max(10, Math.floor(p99HP / 5));
      if (realmLevel <= 6) return Math.max(20, Math.floor(p99HP / 8));
      return Math.max(50, Math.floor(p99HP / 10));
    }

    mapATK(p99Damage, p99Level) {
      const realmLevel = this.mapLevel(p99Level);
      if (realmLevel <= 3) return Math.max(3, Math.floor(p99Damage / 2));
      if (realmLevel <= 6) return Math.max(8, Math.floor(p99Damage / 3));
      return Math.max(15, Math.floor(p99Damage / 4));
    }

    mapDEF(p99AC, p99Level) {
      const realmLevel = this.mapLevel(p99Level);
      if (realmLevel <= 3) return Math.max(1, Math.floor(p99AC / 5));
      if (realmLevel <= 6) return Math.max(5, Math.floor(p99AC / 8));
      return Math.max(10, Math.floor(p99AC / 10));
    }

    calculateXP(realmLevel) {
      return Math.floor(200 * Math.pow(1.8, realmLevel - 1));
    }

    calculateGold(realmLevel) {
      return Math.floor(realmLevel * 2 + Math.random() * realmLevel);
    }
  }

  /**
   * Faction mapper (same as Node version)
   */
  class FactionMapper {
    constructor() {
      this.factionMap = {
        'qeynos': 'thronehold_citizens',
        'freeport': 'thronehold_citizens',
        'kelethin': 'silverweave_citizens',
        'felwithe': 'silverweave_citizens',
        'kaladim': 'ironhold_citizens',
        'akanon': 'ironhold_citizens',
        'neriak': 'shadowgrave_citizens',
        'oggok': 'bloodmire_citizens',
        'grobb': 'bloodmire_citizens',
        'qeynos_guard': 'thronehold_guards',
        'freeport_guard': 'thronehold_guards',
        'kelethin_guard': 'silverweave_guards',
        'felwithe_guard': 'silverweave_guards',
        'kaladim_guard': 'ironhold_guards',
        'indifferent': null,
        'threatening': null,
        'scowls': null
      };
    }

    mapFaction(p99Faction) {
      if (!p99Faction) return null;
      const lower = p99Faction.toLowerCase();
      if (this.factionMap[lower]) return this.factionMap[lower];
      for (const [pattern, realmFaction] of Object.entries(this.factionMap)) {
        if (lower.includes(pattern)) return realmFaction;
      }
      return null;
    }

    getAlignment(p99Faction) {
      if (!p99Faction) return 'neutral';
      const lower = p99Faction.toLowerCase();
      if (lower.includes('qeynos') || lower.includes('kelethin') || lower.includes('kaladim') || 
          lower.includes('felwithe') || lower.includes('akanon')) return 'good';
      if (lower.includes('neriak') || lower.includes('oggok') || lower.includes('grobb')) return 'evil';
      return 'neutral';
    }
  }

  /**
   * Mob converter (needs async for name translation)
   */
  class MobConverter {
    constructor(nameTranslator, statMapper, factionMapper) {
      this.nameTranslator = nameTranslator;
      this.statMapper = statMapper;
      this.factionMapper = factionMapper;
    }

    async convert(p99Mob) {
      const level = typeof p99Mob.level === 'object' 
        ? p99Mob.level 
        : { min: p99Mob.level, max: p99Mob.level };

      const realmMinLevel = this.statMapper.mapLevel(level.min);
      const realmMaxLevel = this.statMapper.mapLevel(level.max || level.min);

      const avgLevel = Math.floor((level.min + (level.max || level.min)) / 2);
      const realmHP = this.statMapper.mapHP(p99Mob.hp || 100, avgLevel);
      const realmATK = this.statMapper.mapATK(p99Mob.damage || 10, avgLevel);
      const realmDEF = this.statMapper.mapDEF(p99Mob.ac || 10, avgLevel);

      const translatedName = await this.nameTranslator.translateName(p99Mob.name, 'creature');
      const translatedId = this.nameTranslator.translateId(p99Mob.name.toLowerCase().replace(/\s+/g, '_'), 'mob');

      return {
        id: translatedId,
        name: translatedName,
        levelRange: { min: realmMinLevel, max: realmMaxLevel },
        factionId: this.factionMapper.mapFaction(p99Mob.faction),
        baseStats: { hp: realmHP, maxHp: realmHP, atk: realmATK, def: realmDEF },
        xp: this.statMapper.calculateXP(realmMinLevel),
        gold: this.statMapper.calculateGold(realmMinLevel),
        lootTableId: p99Mob.lootTableId || `${translatedId}_loot`,
        isGuard: p99Mob.isGuard || false,
        aggressiveTo: p99Mob.aggressive ? [this.factionMapper.getAlignment(p99Mob.faction) === 'good' ? 'evil' : 'good'] : undefined
      };
    }
  }

  /**
   * Item converter (needs async for name translation)
   */
  class ItemConverter {
    constructor(nameTranslator, statMapper) {
      this.nameTranslator = nameTranslator;
      this.statMapper = statMapper;
    }

    async convert(p99Item) {
      const translatedName = await this.nameTranslator.translateName(p99Item.name, 'item');
      const translatedId = this.nameTranslator.translateId(p99Item.name.toLowerCase().replace(/\s+/g, '_'), 'item');

      const realmLevel = p99Item.level ? this.statMapper.mapLevel(p99Item.level) : 1;

      let type = 'misc';
      let slot = 'inventory';
      let armorType = null;
      let weaponType = null;

      if (p99Item.type) {
        const lowerType = p99Item.type.toLowerCase();
        if (lowerType.includes('weapon') || lowerType.includes('sword') || lowerType.includes('dagger') || 
            lowerType.includes('staff') || lowerType.includes('bow')) {
          type = 'weapon';
          slot = 'weapon';
          if (lowerType.includes('sword')) weaponType = 'sword';
          else if (lowerType.includes('dagger')) weaponType = 'dagger';
          else if (lowerType.includes('staff')) weaponType = 'staff';
          else if (lowerType.includes('bow')) weaponType = 'bow';
          else weaponType = 'sword';
        } else if (lowerType.includes('armor') || lowerType.includes('robe') || lowerType.includes('mail') || 
                   lowerType.includes('plate') || lowerType.includes('chain')) {
          type = 'armor';
          slot = p99Item.slot || 'chest';
          if (lowerType.includes('plate')) armorType = 'plate';
          else if (lowerType.includes('chain') || lowerType.includes('mail')) armorType = 'chain';
          else armorType = 'cloth';
        } else if (lowerType.includes('potion') || lowerType.includes('consumable')) {
          type = 'consumable';
        }
      }

      const stats = {};
      if (p99Item.stats) {
        if (p99Item.stats.hp) stats.hp = Math.floor(p99Item.stats.hp / 5);
        if (p99Item.stats.mana) stats.mana = Math.floor(p99Item.stats.mana / 5);
        if (p99Item.stats.str) stats.str = Math.floor(p99Item.stats.str / 5);
      }

      if (p99Item.ac) {
        stats.def = this.statMapper.mapDEF(p99Item.ac, realmLevel);
      }

      if (p99Item.damage) {
        stats.atk = this.statMapper.mapATK(p99Item.damage, realmLevel);
      }

      let rarity = 'common';
      if (p99Item.rarity) {
        const lowerRarity = p99Item.rarity.toLowerCase();
        if (lowerRarity.includes('legendary') || lowerRarity.includes('artifact')) rarity = 'legendary';
        else if (lowerRarity.includes('epic')) rarity = 'epic';
        else if (lowerRarity.includes('rare')) rarity = 'rare';
        else if (lowerRarity.includes('uncommon')) rarity = 'uncommon';
      }

      return {
        itemId: translatedId,
        name: translatedName,
        type: type,
        slot: slot,
        armorType: armorType,
        weaponType: weaponType,
        levelReq: realmLevel,
        rarity: rarity,
        flags: [],
        icon: this.getIcon(type),
        stats: stats,
        description: `A ${translatedName.toLowerCase()} from distant lands.`,
        value: p99Item.value ? Math.floor(p99Item.value / 10) : realmLevel * 5
      };
    }

    getIcon(type) {
      const icons = { weapon: '⚔️', armor: '🛡️', consumable: '🧪', misc: '📦' };
      return icons[type] || icons.misc;
    }
  }

  /**
   * Zone converter (needs async for name translation)
   */
  class ZoneConverter {
    constructor(nameTranslator, statMapper) {
      this.nameTranslator = nameTranslator;
      this.statMapper = statMapper;
    }

    async convert(p99Zone) {
      const level = typeof p99Zone.level === 'object'
        ? p99Zone.level
        : { min: p99Zone.level, max: p99Zone.level };

      const realmMinLevel = this.statMapper.mapLevel(level.min);
      const realmMaxLevel = this.statMapper.mapLevel(level.max || level.min);

      const translatedName = await this.nameTranslator.translateName(p99Zone.name, 'zone');
      const translatedId = this.nameTranslator.translateId(p99Zone.name.toLowerCase().replace(/\s+/g, '_'), 'zone');

      let zoneType = 'outdoor';
      if (p99Zone.type) {
        const lowerType = p99Zone.type.toLowerCase();
        if (lowerType.includes('city') || lowerType.includes('town')) zoneType = 'city';
        else if (lowerType.includes('dungeon') || lowerType.includes('cave')) zoneType = 'dungeon';
      }

      return {
        id: translatedId,
        name: translatedName,
        description: p99Zone.description || `The ${translatedName.toLowerCase()} stretches before you.`,
        level: realmMinLevel,
        levelRange: { min: realmMinLevel, max: realmMaxLevel },
        type: zoneType,
        monsters: p99Zone.mobs || [],
        lore: p99Zone.lore || null
      };
    }
  }

  /**
   * Loot table converter
   */
  class LootTableConverter {
    constructor(nameTranslator) {
      this.nameTranslator = nameTranslator;
    }

    convert(p99Loot, mobId) {
      const translatedId = `${mobId}_loot`;
      const entries = (p99Loot.loot || []).map(entry => {
        const itemId = this.nameTranslator.translateId(
          entry.item.toLowerCase().replace(/\s+/g, '_'),
          'item'
        );
        return {
          itemId: itemId,
          chance: Math.min(1.0, entry.chance || 0.5),
          minQuantity: entry.quantity || 1,
          maxQuantity: entry.quantity || 1
        };
      });
      return {
        id: translatedId,
        name: `${p99Loot.mobName} Loot`,
        entries: entries
      };
    }
  }

  global.P99Translator = {
    NameTranslator,
    StatMapper,
    FactionMapper,
    MobConverter,
    ItemConverter,
    ZoneConverter,
    LootTableConverter
  };
})(window);

