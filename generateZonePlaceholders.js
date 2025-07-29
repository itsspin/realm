const fs = require('fs');
const path = require('path');

const worldPath = path.join(__dirname, 'data', 'world.json');
const world = JSON.parse(fs.readFileSync(worldPath, 'utf8'));

world.continents.forEach((continent) => {
  const continentDir = path.join(__dirname, 'data', 'zones', continent.id);
  fs.mkdirSync(continentDir, { recursive: true });
  continent.zones.forEach((zone) => {
    const [minLevel, maxLevel] = zone.level_range;
    const zonePath = path.join(continentDir, `${zone.id}.json`);
    const placeholder = {
      id: zone.id,
      name: zone.name,
      description: `This is a placeholder description for ${zone.name}.`,
      level_range: [minLevel, maxLevel],
      type: zone.type,
      exits: zone.exits,
      mobs: [
        {
          id: 'placeholder_mob_01',
          name: 'Placeholder Mob',
          level: minLevel,
          spawn_rate: 0.25
        }
      ],
      items: [],
      ambient_text: [
        'The wind whistles through the trees.',
        'You hear something rustling in the distance.'
      ]
    };
    fs.writeFileSync(zonePath, JSON.stringify(placeholder, null, 2));
    console.log(`Created ${zonePath}`);
  });
});
