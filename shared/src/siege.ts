export type SiegeWeaponType = 'ram' | 'catapult' | 'siege_tower' | 'ladders';

export interface SiegeWeaponDef {
  type: SiegeWeaponType;
  name: string;
  goldCost: number;
  manpowerCost: number;
  trainingTurns: number;
  /** Wall damage per turn of bombardment (0 = no wall damage) */
  wallDamagePerTurn: number;
  /** Fort level reduction on successful breach */
  fortReduction: number;
  /** Multiplier to attacker assault damage when this weapon is present */
  assaultBonus: number;
  description: string;
}

export const SIEGE_WEAPON_DEFS: Record<SiegeWeaponType, SiegeWeaponDef> = {
  ram: {
    type: 'ram',
    name: 'Battering Ram',
    goldCost: 60,
    manpowerCost: 0,
    trainingTurns: 1,
    wallDamagePerTurn: 0,
    fortReduction: 1,    // breaks gates → reduces fort level by 1 on breach
    assaultBonus: 1.3,   // +30% assault damage
    description: 'Breaks gates. Enables assault even against fortified positions.',
  },
  catapult: {
    type: 'catapult',
    name: 'Catapult',
    goldCost: 120,
    manpowerCost: 0,
    trainingTurns: 2,
    wallDamagePerTurn: 20,  // damages wall strength over time
    fortReduction: 0,
    assaultBonus: 1.0,
    description: 'Bombards walls each turn, reducing wall strength until breach.',
  },
  siege_tower: {
    type: 'siege_tower',
    name: 'Siege Tower',
    goldCost: 100,
    manpowerCost: 0,
    trainingTurns: 2,
    wallDamagePerTurn: 0,
    fortReduction: 0,
    assaultBonus: 1.5,   // +50% assault damage — direct wall assault
    description: 'Enables direct assault on walls. Massive attack bonus.',
  },
  ladders: {
    type: 'ladders',
    name: 'Scaling Ladders',
    goldCost: 20,
    manpowerCost: 0,
    trainingTurns: 0,   // available immediately
    wallDamagePerTurn: 0,
    fortReduction: 0,
    assaultBonus: 1.15,  // +15% assault damage
    description: 'Any melee infantry can attempt to scale walls. Cheap but risky.',
  },
};

/** Wall strength: starts at fortLevel × 100, reduced by catapult bombardment. */
export function initialWallStrength(fortLevel: number): number {
  return fortLevel * 100;
}

/** Returns true if wall strength has been reduced to 0 (breach achieved). */
export function isBreach(wallStrength: number): boolean {
  return wallStrength <= 0;
}

/** Compute total assault bonus from a list of siege weapons. */
export function totalAssaultBonus(weapons: SiegeWeaponType[]): number {
  if (weapons.length === 0) return 1.0;
  return weapons.reduce((max, w) => Math.max(max, SIEGE_WEAPON_DEFS[w].assaultBonus), 1.0);
}
