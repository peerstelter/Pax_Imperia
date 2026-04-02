import type { Biome } from './types.js';

export type TerrainType = 'open' | 'forest' | 'hills' | 'river' | 'marsh';

export interface TerrainModifiers {
  attackerMod: number;
  defenderMod: number;
  ambushChance: number;    // probability attacker can be ambushed (0–1)
  cavalryPenalty: number;  // multiplied onto cavalry attack in this terrain
  description: string;
}

export const TERRAIN_MODIFIERS: Record<TerrainType, TerrainModifiers> = {
  open:   { attackerMod: 1.0,  defenderMod: 1.0,  ambushChance: 0.0,  cavalryPenalty: 1.0,  description: 'Open field — no modifiers.' },
  forest: { attackerMod: 0.85, defenderMod: 1.15, ambushChance: 0.3,  cavalryPenalty: 0.6,  description: 'Dense forest. Defender advantage; cavalry severely hindered.' },
  hills:  { attackerMod: 0.8,  defenderMod: 1.25, ambushChance: 0.15, cavalryPenalty: 0.8,  description: 'High ground gives defender strong advantage.' },
  river:  { attackerMod: 0.7,  defenderMod: 1.2,  ambushChance: 0.0,  cavalryPenalty: 0.5,  description: 'River crossing. Attacker heavily penalised.' },
  marsh:  { attackerMod: 0.75, defenderMod: 1.1,  ambushChance: 0.25, cavalryPenalty: 0.4,  description: 'Boggy ground. All movement slowed; cavalry near-useless.' },
};

/** Derive a plausible terrain type from a biome (used as default for field battles). */
export function defaultTerrain(biome: Biome): TerrainType {
  switch (biome) {
    case 'tundra':  return 'open';
    case 'steppe':  return 'open';
    case 'desert':  return 'open';
    case 'isles':   return 'marsh';
    case 'default': return 'open';
  }
}
