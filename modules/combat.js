export const resolveAttack = (attacker, defender, ability = {}) => {
  const hitChance = 0.8;
  if (Math.random() > hitChance) return { miss: true };
  const dodgeChance = Math.min((defender.dex || 0) / 100, 0.2);
  if (Math.random() < dodgeChance) return { dodge: true };
  let damage = ability.damage || attacker.damage || 1;
  const critChance = 0.1;
  const crit = Math.random() < critChance;
  if (crit) damage *= 2;
  return { damage: Math.floor(damage), crit };
};
