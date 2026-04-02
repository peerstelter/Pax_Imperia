import type { Unit, Formation } from './types.js';

export type FormationSlot = 'frontLine' | 'secondRank' | 'flanks';

/**
 * Formation modifiers applied during combat resolution.
 *
 * frontLine  — takes full damage, deals full damage
 * secondRank — takes 50% incoming damage (sheltered), deals 70% damage
 * flanks     — takes 80% incoming damage, deals 110% damage (enfilading fire/flank charge)
 */
export const FORMATION_MODIFIERS: Record<FormationSlot, { attackMod: number; defenseMod: number }> = {
  frontLine:  { attackMod: 1.0,  defenseMod: 1.0  },
  secondRank: { attackMod: 0.7,  defenseMod: 0.5  },
  flanks:     { attackMod: 1.1,  defenseMod: 0.8  },
};

/** Build a default formation from a flat unit list.
 *  Heavy infantry and polearms go front; cavalry goes flanks; rest fill second rank. */
export function buildDefaultFormation(units: Unit[]): Formation {
  const frontLine: Unit[]  = [];
  const secondRank: Unit[] = [];
  const flanks: Unit[]     = [];

  for (const unit of units) {
    switch (unit.type) {
      case 'heavy_infantry':
      case 'polearms':
        frontLine.push(unit);
        break;
      case 'cavalry':
        flanks.push(unit);
        break;
      default:
        secondRank.push(unit);
    }
  }

  return { frontLine, secondRank, flanks };
}

/** Flatten a formation back to a unit list (used when persisting). */
export function flattenFormation(formation: Formation): Unit[] {
  return [...formation.frontLine, ...formation.secondRank, ...formation.flanks];
}

/** Total troop count across all slots. */
export function totalTroops(formation: Formation): number {
  return flattenFormation(formation).reduce((sum, u) => sum + u.count, 0);
}

/** Move a unit from one slot to another — returns a new Formation (immutable). */
export function moveUnit(
  formation: Formation,
  unit: Unit,
  from: FormationSlot,
  to: FormationSlot,
): Formation {
  const updated: Formation = {
    frontLine:  [...formation.frontLine],
    secondRank: [...formation.secondRank],
    flanks:     [...formation.flanks],
  };
  updated[from] = updated[from].filter((u) => u !== unit);
  updated[to]   = [...updated[to], unit];
  return updated;
}
