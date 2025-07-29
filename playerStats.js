export const playerStats = {
  data: {
    STR: 10,
    INT: 10,
    DEX: 10,
    CHA: 10,
    END: 10,
    WIS: 10,
    LUK: 10
  },
  init() {
    const saved = localStorage.getItem('playerStats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(this.data, parsed);
      } catch {
        // ignore corrupted data
      }
    }
  },
  save() {
    localStorage.setItem('playerStats', JSON.stringify(this.data));
  },
  increase(stat, amount = 1) {
    if (this.data[stat] == null) return;
    this.data[stat] += amount;
    this.save();
  }
};

/**
 * Apply stat bonuses from an item or quest reward.
 * Expected format: { STR: 1, DEX: 2 }
 * @param {Object<string, number>} bonus
 */
export function applyBonus(bonus) {
  if (!bonus) return;
  for (const [k, v] of Object.entries(bonus)) {
    if (playerStats.data[k] != null) {
      playerStats.data[k] += v;
    }
  }
  playerStats.save();
}
