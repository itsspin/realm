#!/usr/bin/env node

/**
 * P99 Data Importer
 * 
 * Imports Project 1999-style JSON data and converts it to Realm data models.
 * 
 * Usage:
 *   node src/tools/p99-importer.js --mobs p99_mobs.json --items p99_items.json --zones p99_zones.json --output data/
 */

const fs = require('fs');
const path = require('path');
const {
  NameTranslator,
  StatMapper,
  FactionMapper,
  MobConverter,
  ItemConverter,
  ZoneConverter,
  LootTableConverter
} = require('./p99-translator');

class P99Importer {
  constructor(outputDir = 'data') {
    this.outputDir = outputDir;
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
   * Load P99 JSON file
   */
  loadP99File(filePath) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error.message);
      return null;
    }
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

        // Track factions
        if (realmMob.factionId) {
          this.factions.add(realmMob.factionId);
        }

        // Create loot table if loot data exists
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
   * Write output files
   */
  writeOutput() {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Write mobs
    if (this.mobs.length > 0) {
      const mobsFile = path.join(this.outputDir, 'mob-templates-p99.json');
      fs.writeFileSync(mobsFile, JSON.stringify(this.mobs, null, 2));
      console.log(`✓ Wrote ${this.mobs.length} mobs to ${mobsFile}`);
    }

    // Write items
    if (this.items.length > 0) {
      const itemsFile = path.join(this.outputDir, 'items-p99.json');
      fs.writeFileSync(itemsFile, JSON.stringify(this.items, null, 2));
      console.log(`✓ Wrote ${this.items.length} items to ${itemsFile}`);
    }

    // Write zones
    if (this.zones.length > 0) {
      const zonesFile = path.join(this.outputDir, 'zones-p99.json');
      fs.writeFileSync(zonesFile, JSON.stringify(this.zones, null, 2));
      console.log(`✓ Wrote ${this.zones.length} zones to ${zonesFile}`);
    }

    // Write loot tables
    if (this.lootTables.length > 0) {
      const lootFile = path.join(this.outputDir, 'loot-tables-p99.json');
      fs.writeFileSync(lootFile, JSON.stringify(this.lootTables, null, 2));
      console.log(`✓ Wrote ${this.lootTables.length} loot tables to ${lootFile}`);
    }

    // Write import summary
    const summary = {
      importedAt: new Date().toISOString(),
      mobs: this.mobs.length,
      items: this.items.length,
      zones: this.zones.length,
      lootTables: this.lootTables.length,
      factions: Array.from(this.factions)
    };

    const summaryFile = path.join(this.outputDir, 'p99-import-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`✓ Wrote import summary to ${summaryFile}`);
  }

  /**
   * Run full import
   */
  async run(mobsFile, itemsFile, zonesFile) {
    console.log('=== P99 to Realm Data Importer ===\n');

    // Load and import mobs
    if (mobsFile) {
      const p99Mobs = this.loadP99File(mobsFile);
      if (p99Mobs) {
        this.importMobs(p99Mobs);
      }
    }

    // Load and import items
    if (itemsFile) {
      const p99Items = this.loadP99File(itemsFile);
      if (p99Items) {
        this.importItems(p99Items);
      }
    }

    // Load and import zones
    if (zonesFile) {
      const p99Zones = this.loadP99File(zonesFile);
      if (p99Zones) {
        this.importZones(p99Zones);
      }
    }

    // Write output
    this.writeOutput();

    console.log('\n=== Import Complete ===');
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
      options[key] = value;
    }
  }

  const importer = new P99Importer(options.output || 'data');
  importer.run(options.mobs, options.items, options.zones).catch(console.error);
}

module.exports = P99Importer;

