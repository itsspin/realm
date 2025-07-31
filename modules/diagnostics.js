import { loader, fetchJson } from '../data/loader.js';
import { worldState } from '../worldState.js';

export async function runDiagnostics() {
  console.log('Running startup diagnostics...');

  // Validate core datasets exist
  const world = loader.data.world;
  if (!world || !Array.isArray(world.continents)) {
    throw new Error('World data failed to load');
  }
  const zones = world.continents.flatMap((c) => c.zones || []);
  if (zones.length === 0) throw new Error('No zones found');
  console.log(`Zones loaded: ${zones.length}`);

  const categories = ['mobs', 'npcs', 'classes', 'abilities'];
  for (const cat of categories) {
    const data = loader.data[cat];
    const count = data && typeof data === 'object' ? Object.keys(data).length : 0;
    if (count === 0) throw new Error(`Data missing or empty for ${cat}`);
    console.log(`${cat} loaded: ${count}`);
  }

  // Verify zone exits reference valid zones
  const zoneSet = new Set(zones.map((z) => z.id));
  zones.forEach((z) => {
    Object.values(z.exits || {}).forEach((dest) => {
      if (!zoneSet.has(dest)) {
        throw new Error(`Zone ${z.id} exit references unknown zone ${dest}`);
      }
    });
  });
  console.log('Zone exits validated');

  // Load and validate mob files per zone
  let sampleZone = null;
  for (const { id } of zones) {
    const mobData = await fetchJson(`data/mobs/${id}.json`);
    if (mobData.zone !== id) {
      throw new Error(`Mob file ${id} has mismatched zone property`);
    }
    if (!Array.isArray(mobData.mobs) || mobData.mobs.length === 0) {
      throw new Error(`Mob file ${id} contains no mobs`);
    }
    if (!sampleZone) sampleZone = mobData;
    console.log(`Loaded mobs for ${id}: ${mobData.mobs.length}`);
  }

  // Cross-check abilities referenced by classes exist
  const abilities = loader.data.abilities;
  Object.entries(loader.data.classes).forEach(([clsId, cls]) => {
    Object.values(cls.abilities || {}).forEach((arr) => {
      arr.forEach((ab) => {
        if (!abilities[ab]) {
          throw new Error(`Class ${clsId} references missing ability ${ab}`);
        }
      });
    });
  });
  console.log('Class ability references validated');

  if (typeof document !== 'undefined') {
    if (!document.getElementById('create-form')) {
      throw new Error('Character creation UI not found');
    }
    console.log('Character creation UI exists');

    const zoneEl = document.getElementById('zone-name');
    if (!zoneEl) throw new Error('Zone name element missing');
    zoneEl.textContent = 'Diagnostic Zone';
    console.log('Zone render logic executed');
  }

  // Execute spawn logic with sample data
  if (sampleZone) {
    loader.data.locations.diag_zone = { name: 'Diag Zone', spawns: [] };
    worldState.initZone('diag_zone', sampleZone.mobs);
    if (!worldState.zones.diag_zone) throw new Error('Spawn logic failed');
    delete worldState.zones.diag_zone;
    delete loader.data.locations.diag_zone;
    console.log('Spawn logic executed');
  }

  console.log('Diagnostics completed');
}
