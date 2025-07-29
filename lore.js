// Lore generation module for REALM

/**
 * Pick a random element from an array.
 * @param {any[]} arr
 * @returns {any}
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a single haunted forest lore line.
 * @param {string} region Placeholder for region name.
 * @returns {string}
 */
function hauntedLine(region) {
  const intros = [
    `Whispers echo through the crooked pines of ${region},`,
    `The twilight mists coil around ${region}'s haunted groves where`,
    `Old travelers warn that within ${region},`,
    `Legends of ${region} speak of the hour when`,
    `Among the shadows of ${region},`
  ];
  const subjects = [
    'the ghost of an ancient ranger',
    'a spectral wolf pack',
    'the lingering spirit of a fallen hero',
    'an ethereal maiden',
    'the restless shade of an old druid'
  ];
  const actions = [
    'haunts the misty paths',
    'guards a forgotten shrine',
    'searches for lost relics',
    'calls to wandering souls',
    'silently stalks the unwary'
  ];
  const endings = [
    'in service to the Realm.',
    'seeking vengeance from ages past.',
    'bound to secrets best left untouched.',
    'watching over ruins swallowed by gloom.',
    'forever tethered to unseen tragedy.'
  ];
  return `${pick(intros)} ${pick(subjects)} ${pick(actions)} ${pick(endings)}`;
}

/**
 * Generate a single desert lore line.
 * @param {string} region Placeholder for region name.
 * @returns {string}
 */
function desertLine(region) {
  const intros = [
    `Beyond the blistering dunes of ${region},`,
    `Caravans speak of ${region} where`,
    `Sun-baked winds sweep across ${region}, and`,
    `Lost travellers whisper that ${region}`,
    `Ancient maps of ${region} reveal that`
  ];
  const subjects = [
    'ruined obelisks',
    'forgotten tombs',
    'crumbled palaces',
    'sunken temples',
    'shattered statues'
  ];
  const actions = [
    'hide beneath the sand',
    'mark the graves of old kings',
    'await brave explorers',
    'echo with silent prayers',
    'guard secrets in scorched stone'
  ];
  const endings = [
    'bound forever to the Realm.',
    'holding relics no mortal remembers.',
    'speaking in silence to those who listen.',
    'offering riches and curses alike.',
    'casting long shadows at dusk.'
  ];
  return `${pick(intros)} ${pick(subjects)} ${pick(actions)} ${pick(endings)}`;
}

/**
 * Generate a single tundra lore line.
 * @param {string} region Placeholder for region name.
 * @returns {string}
 */
function tundraLine(region) {
  const intros = [
    `Frozen winds scour the plains of ${region}, where`,
    `In the bleak icefields of ${region},`,
    `Snow buries ancient trails across ${region} as`,
    `The aurora over ${region} shines upon`,
    `Myths of ${region} tell of the day when`
  ];
  const subjects = [
    'a slumbering beast of frost',
    'lost hunters',
    'the bones of giants',
    'an icy fortress',
    'wandering spirits of the cold'
  ];
  const actions = [
    'awakens beneath the snow',
    'search for forgotten fires',
    'lie half-buried in silence',
    'glitters with frozen runes',
    'sing mournful dirges'
  ];
  const endings = [
    'remembering the Realm.',
    'waiting for the thaw that never comes.',
    'echoing through endless winter.',
    'guarding pathways to other worlds.',
    'promising power to the brave.'
  ];
  return `${pick(intros)} ${pick(subjects)} ${pick(actions)} ${pick(endings)}`;
}

/**
 * Generate a single volcanic lore line.
 * @param {string} region Placeholder for region name.
 * @returns {string}
 */
function volcanicLine(region) {
  const intros = [
    `Molten rivers scar ${region} where`,
    `The ground trembles in ${region} as`,
    `${region} is said to be cursed, for`,
    `Ash clouds darken the skies above ${region} and`,
    `The fires of ${region} roar when`
  ];
  const subjects = [
    'flames from ancient wars',
    'the rage of earth spirits',
    'smoldering ruins',
    'echoes of draconic battles',
    'cracked altars'
  ];
  const actions = [
    'erupt without warning',
    'seal away hidden vaults',
    'forge weapons of legend',
    'devour reckless adventurers',
    'illuminate secrets below'
  ];
  const endings = [
    'at the heart of the Realm.',
    'as warnings to heedless travelers.',
    'revealing passages of power.',
    'in honor of forgotten fire gods.',
    'until the realm itself cools.'
  ];
  return `${pick(intros)} ${pick(subjects)} ${pick(actions)} ${pick(endings)}`;
}

const loreDB = {};

function buildLore() {
  const envBuilders = {
    hauntedForest: hauntedLine,
    desert: desertLine,
    tundra: tundraLine,
    volcanic: volcanicLine
  };
  Object.keys(envBuilders).forEach((env) => {
    loreDB[env] = [];
    for (let i = 0; i < 50; i++) {
      // Use placeholder which will be replaced when generating
      loreDB[env].push(envBuilders[env]('{{region}}'));
    }
  });
}

buildLore();

/**
 * Generate a piece of lore for a given environment and region.
 * @param {string} environment One of 'hauntedForest', 'desert', 'tundra', 'volcanic'.
 * @param {string} region Name of the region where the lore applies.
 * @returns {string}
 */
export function generateLoreEntry(environment, region) {
  const entries = loreDB[environment] || loreDB.hauntedForest;
  const line = pick(entries);
  return line.replace('{{region}}', region);
}
