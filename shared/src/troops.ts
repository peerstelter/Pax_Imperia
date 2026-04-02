import type { TroopType, Biome } from './types.js';
import { COUNTER_MATRIX, COUNTER_BONUS } from './combat.js';

export interface TroopStats {
  type: TroopType;
  variant?: string;
  attack: number;
  defense: number;
  speed: number;
  morale: number;       // starting morale 0–100
  recruitCost: number;  // gold per 100 troops
  manpowerCost: number; // manpower per 100 troops
  trainingTurns: number;
  biome?: Biome;        // required biome province to recruit
  description: string;
}

// ── Base troop stats ──────────────────────────────────────────────────────────

export const BASE_TROOP_STATS: Record<TroopType, TroopStats> = {
  cavalry: {
    type: 'cavalry',
    attack: 18, defense: 10, speed: 14, morale: 80,
    recruitCost: 40, manpowerCost: 30, trainingTurns: 2,
    description: 'Fast shock troops. Devastate archers but shattered by polearms.',
  },
  polearms: {
    type: 'polearms',
    attack: 14, defense: 16, speed: 7, morale: 75,
    recruitCost: 20, manpowerCost: 20, trainingTurns: 1,
    description: 'Stalwart spearmen. Break cavalry charges but vulnerable to heavy infantry.',
  },
  archers: {
    type: 'archers',
    attack: 12, defense: 8, speed: 9, morale: 65,
    recruitCost: 18, manpowerCost: 15, trainingTurns: 1,
    description: 'Ranged fire cuts through light infantry but helpless against cavalry.',
  },
  heavy_infantry: {
    type: 'heavy_infantry',
    attack: 16, defense: 18, speed: 5, morale: 85,
    recruitCost: 35, manpowerCost: 25, trainingTurns: 2,
    description: 'Armoured elite. Crush polearms but outmanoeuvred by light infantry.',
  },
  light_infantry: {
    type: 'light_infantry',
    attack: 10, defense: 10, speed: 12, morale: 70,
    recruitCost: 12, manpowerCost: 12, trainingTurns: 1,
    description: 'Cheap and fast. Wear down heavy infantry but routed by archers.',
  },
};

// ── Biome variant overrides ───────────────────────────────────────────────────

export const BIOME_VARIANTS: TroopStats[] = [
  {
    // Steppe — Horse Archers: cavalry that also fires at range
    type: 'cavalry',
    variant: 'horse_archers',
    biome: 'steppe',
    attack: 15, defense: 9, speed: 16, morale: 78,
    recruitCost: 45, manpowerCost: 30, trainingTurns: 2,
    description: 'Mounted archers. Harass from range; still countered by polearms.',
  },
  {
    // Desert — Sabre Light Infantry: faster and more lethal than standard
    type: 'light_infantry',
    variant: 'sabre_light_infantry',
    biome: 'desert',
    attack: 13, defense: 10, speed: 14, morale: 72,
    recruitCost: 16, manpowerCost: 14, trainingTurns: 1,
    description: 'Swift desert warriors. Extra speed; same counter relationships.',
  },
  {
    // Isles — Lochaber Poleaxe: heavier, harder-hitting polearms variant
    type: 'polearms',
    variant: 'lochaber_poleaxe',
    biome: 'isles',
    attack: 17, defense: 15, speed: 6, morale: 80,
    recruitCost: 24, manpowerCost: 22, trainingTurns: 2,
    description: 'Island axemen. Higher attack than standard polearms; same counters.',
  },
  {
    // Tundra — Reindeer Cavalry: robust cold-weather riders
    type: 'cavalry',
    variant: 'reindeer_cavalry',
    biome: 'tundra',
    attack: 16, defense: 13, speed: 12, morale: 82,
    recruitCost: 38, manpowerCost: 28, trainingTurns: 2,
    description: 'Hardy northern riders. No winter attrition penalty.',
  },
];

/** Look up the stat block for a unit by type and optional variant. */
export function getTroopStats(type: TroopType, variant?: string): TroopStats {
  if (variant) {
    const found = BIOME_VARIANTS.find((v) => v.type === type && v.variant === variant);
    if (found) return found;
  }
  return BASE_TROOP_STATS[type];
}

/** Effective attack after counter bonus. */
export function effectiveAttack(
  attackerType: TroopType,
  defenderType: TroopType,
  baseAttack: number,
): number {
  const bonus = COUNTER_MATRIX[attackerType].beats === defenderType ? COUNTER_BONUS : 0;
  return Math.round(baseAttack * (1 + bonus));
}
