import type Database from 'better-sqlite3';

// ── Opinion constants ─────────────────────────────────────────────────────────

export const OPINION_DECAY_PER_TURN = 1;   // drifts 1 point toward 0 each turn
export const OPINION_MIN = -100;
export const OPINION_MAX = 100;

// Modifier amounts for common events
export const OPINION_MODS = {
  giftSmall:          5,
  giftLarge:         15,
  giftDiminishing:   -2,   // stacked per prior gift this turn
  tradeActive:        3,   // per turn while trade treaty active
  allianceActive:     2,   // per turn while allied
  warDeclaration:   -70,
  aggressiveExpansion: -10,  // to all neighbours when you conquer
  treatyBroken:     -25,
  warAid:            15,   // helped ally in their war
  peace:             10,
  marriageBonus:     20,
  vassalTribute:      5,   // per turn vassal pays tribute
  mediationHelped:   12,   // both sides get this when mediation succeeds
};

// ── Per-turn opinion decay ────────────────────────────────────────────────────

/**
 * Each turn, opinions drift 1 point toward 0.
 * Active treaties slow decay: alliances and trade agreements hold opinions stable.
 */
export function tickOpinionDecay(db: Database.Database, gameId: string): void {
  const relations = db
    .prepare('SELECT faction_a, faction_b, opinion, treaties FROM diplomatic_relations WHERE game_id = ?')
    .all(gameId) as { faction_a: string; faction_b: string; opinion: number; treaties: string }[];

  const update = db.prepare(
    'UPDATE diplomatic_relations SET opinion = ? WHERE game_id = ? AND faction_a = ? AND faction_b = ?',
  );

  db.transaction(() => {
    for (const rel of relations) {
      if (rel.opinion === 0) continue;

      const treaties: string[] = JSON.parse(rel.treaties);
      const isStabilised = treaties.some((t) => ['alliance', 'trade', 'marriage'].includes(t));

      // Stabilised relations decay at half rate
      const decay = isStabilised ? Math.ceil(OPINION_DECAY_PER_TURN / 2) : OPINION_DECAY_PER_TURN;
      const newOpinion =
        rel.opinion > 0
          ? Math.max(0, rel.opinion - decay)
          : Math.min(0, rel.opinion + decay);

      update.run(newOpinion, gameId, rel.faction_a, rel.faction_b);
    }
  })();
}

// ── Active treaty passive bonuses ─────────────────────────────────────────────

/**
 * Each turn, active treaties nudge opinion upward (counteracts decay and then some).
 */
export function tickTreatyOpinionBonuses(db: Database.Database, gameId: string): void {
  const relations = db
    .prepare('SELECT faction_a, faction_b, opinion, treaties FROM diplomatic_relations WHERE game_id = ?')
    .all(gameId) as { faction_a: string; faction_b: string; opinion: number; treaties: string }[];

  const update = db.prepare(
    'UPDATE diplomatic_relations SET opinion = MAX(?, MIN(?, opinion + ?)) WHERE game_id = ? AND faction_a = ? AND faction_b = ?',
  );

  db.transaction(() => {
    for (const rel of relations) {
      const treaties: string[] = JSON.parse(rel.treaties);
      let bonus = 0;
      if (treaties.includes('trade'))    bonus += OPINION_MODS.tradeActive;
      if (treaties.includes('alliance')) bonus += OPINION_MODS.allianceActive;
      if (bonus > 0) {
        update.run(OPINION_MIN, OPINION_MAX, bonus, gameId, rel.faction_a, rel.faction_b);
      }
    }
  })();
}

// ── Opinion mutation helper ───────────────────────────────────────────────────

/**
 * Apply a delta to the opinion between two factions (canonical a<b ordering).
 */
export function adjustOpinion(
  db: Database.Database,
  gameId: string,
  factionA: string,
  factionB: string,
  delta: number,
): void {
  const [a, b] = [factionA, factionB].sort();
  db.prepare(
    `INSERT INTO diplomatic_relations (game_id, faction_a, faction_b, opinion, treaties)
     VALUES (?, ?, ?, MAX(?, MIN(?, ?)), '[]')
     ON CONFLICT(game_id, faction_a, faction_b)
     DO UPDATE SET opinion = MAX(${OPINION_MIN}, MIN(${OPINION_MAX}, opinion + ?))`,
  ).run(gameId, a, b, OPINION_MIN, OPINION_MAX, delta, delta);
}

/** Read current opinion between two factions. */
export function getOpinion(
  db: Database.Database,
  gameId: string,
  factionA: string,
  factionB: string,
): number {
  const [a, b] = [factionA, factionB].sort();
  const row = db
    .prepare('SELECT opinion FROM diplomatic_relations WHERE game_id = ? AND faction_a = ? AND faction_b = ?')
    .get(gameId, a, b) as { opinion: number } | undefined;
  return row?.opinion ?? 0;
}
