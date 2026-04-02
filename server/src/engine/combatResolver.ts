import type { Unit, Formation, Army, Commander } from '@pax-imperia/shared';
import { COUNTER_MATRIX, COUNTER_BONUS, FORMATION_MODIFIERS, flattenFormation, TERRAIN_MODIFIERS } from '@pax-imperia/shared';
import { moraleFactor } from './unitFactory.js';
import type { FormationSlot, TerrainType } from '@pax-imperia/shared';

export interface CombatRound {
  round: number;
  attackerCasualties: number;
  defenderCasualties: number;
  attackerMoraleDrop: number;
  defenderMoraleDrop: number;
  events: string[];
}

export interface CombatResult {
  winner: 'attacker' | 'defender' | 'draw';
  rounds: CombatRound[];
  attackerSurvivors: Unit[];
  defenderSurvivors: Unit[];
  totalAttackerCasualties: number;
  totalDefenderCasualties: number;
}

const RANDOM_VARIANCE = 0.1;  // ±10%
const MAX_ROUNDS      = 10;
const ROUT_MORALE     = 20;   // units below this morale flee

export interface FieldBattleOptions {
  terrain?: TerrainType;
  ambush?: boolean;  // attacker is ambushed — swap terrain mods for first 2 rounds
}

/**
 * Resolve a field battle between two armies.
 * Called server-side only; client never runs this.
 */
export function resolveCombat(
  attacker: Army,
  defender: Army,
  attackerCommander?: Commander,
  defenderCommander?: Commander,
  options?: FieldBattleOptions,
): CombatResult {
  const terrain = options?.terrain ?? 'open';
  const terrainMods = TERRAIN_MODIFIERS[terrain];
  const ambush = options?.ambush ?? false;
  // Deep-copy units so we mutate state here without touching originals
  let atkFormation = deepCopyFormation(attacker.formation);
  let defFormation = deepCopyFormation(defender.formation);

  const rounds: CombatRound[] = [];
  let round = 0;

  // In an ambush, first 2 rounds the attacker is penalised
  if (ambush) {
    applyMoraleDrop(atkFormation, 15);
  }

  while (round < MAX_ROUNDS) {
    round++;
    const roundLog: string[] = [];

    // Terrain modifiers: ambush reverses attacker/defender bonus for first 2 rounds
    const atkTerrainMod = ambush && round <= 2 ? terrainMods.defenderMod : terrainMods.attackerMod;
    const defTerrainMod = ambush && round <= 2 ? terrainMods.attackerMod : terrainMods.defenderMod;

    if (ambush && round === 1) roundLog.push(`Ambush! Attacker penalised for rounds 1–2`);
    if (terrain !== 'open') roundLog.push(`Terrain: ${terrain} (atk ×${atkTerrainMod.toFixed(2)}, def ×${defTerrainMod.toFixed(2)})`);

    const atkUnits = flattenFormation(atkFormation);
    const defUnits = flattenFormation(defFormation);

    if (atkUnits.every((u) => u.count <= 0 || u.morale <= ROUT_MORALE)) break;
    if (defUnits.every((u) => u.count <= 0 || u.morale <= ROUT_MORALE)) break;

    let totalAtkCasualties = 0;
    let totalDefCasualties = 0;

    // Each formation slot attacks the opponent's front line
    const slots: FormationSlot[] = ['frontLine', 'secondRank', 'flanks'];
    for (const slot of slots) {
      const attackingUnits = atkFormation[slot].filter((u) => u.count > 0 && u.morale > ROUT_MORALE);
      const targetSlot: FormationSlot = slot === 'flanks' ? 'flanks' : 'frontLine';
      const targetUnits = defFormation[targetSlot].filter((u) => u.count > 0);

      if (attackingUnits.length === 0 || targetUnits.length === 0) continue;

      const { casualties, events } = resolveSlot(
        attackingUnits,
        targetUnits,
        FORMATION_MODIFIERS[slot].attackMod * atkTerrainMod,
        FORMATION_MODIFIERS[targetSlot].defenseMod * defTerrainMod,
        attackerCommander,
        round,
        terrain,
        terrainMods.cavalryPenalty,
      );
      totalDefCasualties += casualties;
      roundLog.push(...events);

      // Apply casualties to defender formation
      applyLosses(defFormation[targetSlot], casualties);
    }

    // Defender fires back at attacker front line
    for (const slot of slots) {
      const attackingUnits = defFormation[slot].filter((u) => u.count > 0 && u.morale > ROUT_MORALE);
      const targetSlot: FormationSlot = slot === 'flanks' ? 'flanks' : 'frontLine';
      const targetUnits = atkFormation[targetSlot].filter((u) => u.count > 0);

      if (attackingUnits.length === 0 || targetUnits.length === 0) continue;

      const { casualties } = resolveSlot(
        attackingUnits,
        targetUnits,
        FORMATION_MODIFIERS[slot].attackMod * defTerrainMod,
        FORMATION_MODIFIERS[targetSlot].defenseMod * atkTerrainMod,
        defenderCommander,
        round,
        terrain,
        terrainMods.cavalryPenalty,
      );
      totalAtkCasualties += casualties;
      applyLosses(atkFormation[targetSlot], casualties);
    }

    // Morale drop proportional to casualties taken relative to total force
    const atkTotal  = flattenFormation(atkFormation).reduce((s, u) => s + u.count, 0);
    const defTotal  = flattenFormation(defFormation).reduce((s, u) => s + u.count, 0);
    const atkMorale = atkTotal > 0 ? Math.floor((totalAtkCasualties / atkTotal) * 30) : 30;
    const defMorale = defTotal > 0 ? Math.floor((totalDefCasualties / defTotal) * 30) : 30;

    applyMoraleDrop(atkFormation, atkMorale);
    applyMoraleDrop(defFormation, defMorale);

    rounds.push({
      round,
      attackerCasualties: totalAtkCasualties,
      defenderCasualties: totalDefCasualties,
      attackerMoraleDrop: atkMorale,
      defenderMoraleDrop: defMorale,
      events: roundLog,
    });
  }

  const atkSurvivors = flattenFormation(atkFormation).filter((u) => u.count > 0);
  const defSurvivors = flattenFormation(defFormation).filter((u) => u.count > 0);

  const atkStrength = atkSurvivors.reduce((s, u) => s + u.count * moraleFactor(u.morale), 0);
  const defStrength = defSurvivors.reduce((s, u) => s + u.count * moraleFactor(u.morale), 0);

  const winner: CombatResult['winner'] =
    atkStrength > defStrength * 1.1 ? 'attacker'
    : defStrength > atkStrength * 1.1 ? 'defender'
    : 'draw';

  return {
    winner,
    rounds,
    attackerSurvivors: atkSurvivors,
    defenderSurvivors: defSurvivors,
    totalAttackerCasualties: rounds.reduce((s, r) => s + r.attackerCasualties, 0),
    totalDefenderCasualties: rounds.reduce((s, r) => s + r.defenderCasualties, 0),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveSlot(
  attackers: Unit[],
  defenders: Unit[],
  attackMod: number,
  defenseMod: number,
  commander: Commander | undefined,
  _round: number,
  _terrain: TerrainType = 'open',
  cavalryPenalty: number = 1.0,
): { casualties: number; events: string[] } {
  const events: string[] = [];
  let totalCasualties = 0;

  for (const atk of attackers) {
    for (const def of defenders) {
      if (def.count <= 0) continue;

      const counterBonus  = COUNTER_MATRIX[atk.type].beats === def.type ? COUNTER_BONUS : 0;
      const variance      = 1 + (Math.random() * 2 - 1) * RANDOM_VARIANCE;
      const cmdBonus      = commander ? commander.attack * 0.01 : 0;
      const cavPenalty    = atk.type === 'cavalry' ? cavalryPenalty : 1.0;

      const rawDamage =
        atk.attack
        * (1 + counterBonus)
        * attackMod
        * moraleFactor(atk.morale)
        * (1 + cmdBonus)
        * variance
        * cavPenalty;

      const netDamage = rawDamage / (def.defense * defenseMod);
      // casualties = damage × 5 troops per damage point (tuning knob)
      const casualties = Math.min(def.count, Math.floor(netDamage * 5 * (atk.count / 100)));

      totalCasualties += casualties;

      if (counterBonus > 0) {
        events.push(`${atk.type} counters ${def.type} (+25% attack)`);
      }
    }
  }

  return { casualties: totalCasualties, events };
}

function applyLosses(units: Unit[], totalCasualties: number): void {
  let remaining = totalCasualties;
  for (const unit of units) {
    if (remaining <= 0) break;
    const lost = Math.min(unit.count, remaining);
    unit.count -= lost;
    remaining  -= lost;
  }
}

function applyMoraleDrop(formation: Formation, drop: number): void {
  for (const slot of ['frontLine', 'secondRank', 'flanks'] as FormationSlot[]) {
    for (const unit of formation[slot]) {
      unit.morale = Math.max(0, unit.morale - drop);
    }
  }
}

function deepCopyFormation(f: Formation): Formation {
  return {
    frontLine:  f.frontLine.map((u)  => ({ ...u })),
    secondRank: f.secondRank.map((u) => ({ ...u })),
    flanks:     f.flanks.map((u)     => ({ ...u })),
  };
}
