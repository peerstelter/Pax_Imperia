import type { Unit, Biome, TroopType } from '@pax-imperia/shared';
import { getTroopStats, BIOME_VARIANTS } from '@pax-imperia/shared';

/**
 * Create a Unit with stats resolved from troop type + optional biome variant.
 *
 * If the biome has a matching variant for the requested type, it is used automatically.
 * This means the combat resolver never needs special-case biome logic — variants are
 * just units with different numbers, same counter relationships.
 */
export function createUnit(
  type: TroopType,
  count: number,
  biome?: Biome,
): Unit {
  // Find variant if biome supports it
  const variantDef = biome
    ? BIOME_VARIANTS.find((v) => v.type === type && v.biome === biome)
    : undefined;

  const stats = getTroopStats(type, variantDef?.variant);

  return {
    type,
    variant: variantDef?.variant,
    count,
    morale: stats.morale,
    attack: stats.attack,
    defense: stats.defense,
    speed: stats.speed,
  };
}

/** Scale a unit's effective attack/defense based on its current morale (0–100). */
export function moraleFactor(morale: number): number {
  // Full effectiveness above 50, degrades linearly to 50% at morale 0
  return 0.5 + (morale / 100) * 0.5;
}

/** Return available troop types recruitable from a biome province. */
export function recruitableTroops(biome: Biome): TroopType[] {
  const base: TroopType[] = ['light_infantry', 'archers', 'polearms'];
  if (biome === 'steppe' || biome === 'tundra') base.push('cavalry');
  if (biome === 'default' || biome === 'isles') base.push('heavy_infantry');
  return base;
}
