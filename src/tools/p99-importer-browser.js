/**
 * P99 Data Importer - Browser Version
 * 
 * Can be used in browser console or as a module.
 * Requires files to be loaded via fetch or FileReader API.
 */

(function (global) {
  const {
    NameTranslator,
    StatMapper,
    FactionMapper,
    MobConverter,
    ItemConverter,
    ZoneConverter,
    LootTableConverter
  } = global.P99Translator || {};

  if (!NameTranslator) {
    console.error('P99Translator module not loaded. Load p99-translator.js first.');
    return;
  }

  class P99ImporterBrowser {
    constructor() {
      this.nameTranslator = new NameTranslator();
      this.statMapper = new StatMapper();
      this.factionMapper = new FactionMapper();
      
      this.mobConverter = new MobConverter(this.nameTranslator, this.statMapper, this.factionMapper);
      this.itemConverter = new ItemConverter(this.nameTranslator, this.statMapper);
      this.zoneConverter = new ZoneConverter(this.nameTranslator, this.statMapper);
      this.lootTableConverter = new LootTableConverter(this.nameTranslator);

      this.mobs = [];
      this.items = [];
      this.zones = [];
      this.lootTables = [];
      this.factions = new Set();
    }

    /**
     * Import mobs
     */
    importMobs(p99Mobs) {
      if (!Array.isArray(p99Mobs)) {
        console.warn('Mobs data is not an array');
        return;
      }

      console.log(`Importing ${p99Mobs.length} mobs...`);

      for (const p99Mob of p99Mobs) {
        try {
          const realmMob = this.mobConverter.convert(p99Mob);
          this.mobs.push(realmMob);

          if (realmMob.factionId) {
            this.factions.add(realmMob.factionId);
          }

          if (p99Mob.loot && Array.isArray(p99Mob.loot)) {
            const lootTable = this.lootTableConverter.convert(
              { mobName: p99Mob.name, loot: p99Mob.loot },
              realmMob.id
            );
            this.lootTables.push(lootTable);
          }
        } catch (error) {
          console.error(`Error converting mob ${p99Mob.name}:`, error.message);
        }
      }

      console.log(`✓ Imported ${this.mobs.length} mobs`);
    }

    /**
     * Import items
     */
    importItems(p99Items) {
      if (!Array.isArray(p99Items)) {
        console.warn('Items data is not an array');
        return;
      }

      console.log(`Importing ${p99Items.length} items...`);

      for (const p99Item of p99Items) {
        try {
          const realmItem = this.itemConverter.convert(p99Item);
          this.items.push(realmItem);
        } catch (error) {
          console.error(`Error converting item ${p99Item.name}:`, error.message);
        }
      }

      console.log(`✓ Imported ${this.items.length} items`);
    }

    /**
     * Import zones
     */
    importZones(p99Zones) {
      if (!Array.isArray(p99Zones)) {
        console.warn('Zones data is not an array');
        return;
      }

      console.log(`Importing ${p99Zones.length} zones...`);

      for (const p99Zone of p99Zones) {
        try {
          const realmZone = this.zoneConverter.convert(p99Zone);
          this.zones.push(realmZone);
        } catch (error) {
          console.error(`Error converting zone ${p99Zone.name}:`, error.message);
        }
      }

      console.log(`✓ Imported ${this.zones.length} zones`);
    }

    /**
     * Get import results
     */
    getResults() {
      return {
        mobs: this.mobs,
        items: this.items,
        zones: this.zones,
        lootTables: this.lootTables,
        factions: Array.from(this.factions),
        summary: {
          mobs: this.mobs.length,
          items: this.items.length,
          zones: this.zones.length,
          lootTables: this.lootTables.length,
          factions: Array.from(this.factions)
        }
      };
    }

    /**
     * Download results as JSON
     */
    downloadResults() {
      const results = this.getResults();
      
      // Create download links
      const files = [
        { name: 'mob-templates-p99.json', data: results.mobs },
        { name: 'items-p99.json', data: results.items },
        { name: 'zones-p99.json', data: results.zones },
        { name: 'loot-tables-p99.json', data: results.lootTables }
      ];

      files.forEach(file => {
        const blob = new Blob([JSON.stringify(file.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      });

      console.log('✓ Downloaded all import files');
    }
  }

  global.P99ImporterBrowser = P99ImporterBrowser;
})(window);

