import type { Army, Commander } from '@pax-imperia/shared';
import { initialWallStrength, isBreach, totalAssaultBonus, SIEGE_WEAPON_DEFS } from '@pax-imperia/shared';
import type { SiegeWeaponType } from '@pax-imperia/shared';
import { resolveCombat } from './combatResolver.js';
import type { CombatResult } from './combatResolver.js';

export interface SiegeState {
  fortLevel: number;
  wallStrength: number;
  turn: number;
}

export interface SiegeRoundResult {
  wallStrengthBefore: number;
  wallStrengthAfter: number;
  breached: boolean;
  assaultResult?: CombatResult;
  sortieResult?: CombatResult;
  events: string[];
}

/**
 * Resolve one turn of a siege.
 *
 * Flow per siege turn:
 *  1. Catapults bombard — reduce wallStrength
 *  2. If wallStrength <= 0 → breach; attacker may assault
 *  3. Defender may sortie (optional, risky)
 *  4. Ram + ladders/tower only used in assault phase
 */
export function resolveSiegeTurn(
  state: SiegeState,
  attackerArmy: Army,
  defenderArmy: Army,
  weapons: SiegeWeaponType[],
  options: {
    attemptAssault: boolean;
    defenderSortie: boolean;
  },
  attackerCommander?: Commander,
  defenderCommander?: Commander,
): SiegeRoundResult {
  const events: string[] = [];
  let { wallStrength } = state;
  const wallBefore = wallStrength;

  // 1. Catapult bombardment
  for (const w of weapons) {
    const def = SIEGE_WEAPON_DEFS[w];
    if (def.wallDamagePerTurn > 0) {
      wallStrength = Math.max(0, wallStrength - def.wallDamagePerTurn);
      events.push(`${def.name} deals ${def.wallDamagePerTurn} wall damage (${wallStrength} remaining)`);
    }
  }

  const breached = isBreach(wallStrength) || state.fortLevel === 0;

  // 2. Assault (only if breached or no fort)
  let assaultResult: CombatResult | undefined;
  if (options.attemptAssault && breached) {
    const assaultBonus = totalAssaultBonus(weapons);
    // Boost attacker attack stats by assault bonus
    const boostedAttacker = applyAssaultBonus(attackerArmy, assaultBonus);
    assaultResult = resolveCombat(boostedAttacker, defenderArmy, attackerCommander, defenderCommander);
    events.push(`Assault: attacker ${assaultResult.winner === 'attacker' ? 'SUCCEEDED' : assaultResult.winner === 'defender' ? 'REPELLED' : 'drew'} (bonus ×${assaultBonus.toFixed(2)})`);
  } else if (options.attemptAssault && !breached) {
    events.push('Assault failed: walls intact, no breach yet');
  }

  // 3. Defender sortie (defender attacks outside walls — risky)
  let sortieResult: CombatResult | undefined;
  if (options.defenderSortie) {
    // Defender attacks at 0.8× effectiveness outside walls
    const sortieDefender = applyAssaultBonus(defenderArmy, 0.8);
    sortieResult = resolveCombat(sortieDefender, attackerArmy, defenderCommander, attackerCommander);
    events.push(`Defender sortie: ${sortieResult.winner === 'attacker' ? 'sortie repelled' : sortieResult.winner === 'defender' ? 'sortie succeeded' : 'sortie inconclusive'}`);
  }

  return {
    wallStrengthBefore: wallBefore,
    wallStrengthAfter:  wallStrength,
    breached,
    assaultResult,
    sortieResult,
    events,
  };
}

/** Compute initial wall strength for a province fortification level. */
export function initSiege(fortLevel: number): SiegeState {
  return {
    fortLevel,
    wallStrength: initialWallStrength(fortLevel),
    turn: 0,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyAssaultBonus(army: Army, bonus: number): Army {
  return {
    ...army,
    formation: {
      frontLine:  army.formation.frontLine.map((u)  => ({ ...u, attack: Math.round(u.attack * bonus) })),
      secondRank: army.formation.secondRank.map((u) => ({ ...u, attack: Math.round(u.attack * bonus) })),
      flanks:     army.formation.flanks.map((u)     => ({ ...u, attack: Math.round(u.attack * bonus) })),
    },
  };
}
