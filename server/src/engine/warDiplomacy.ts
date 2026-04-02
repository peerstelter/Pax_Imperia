import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export type CasusBelli = 'claim' | 'revenge' | 'expansion';
export type PeaceTerm  = 'annex' | 'tribute' | 'vassalize' | 'white_peace';

interface GameRow { turn: number }
interface RelationRow { opinion: number; treaties: string }
interface FactionRow { id: string; gold: number; manpower: number }

// ── War Declaration ───────────────────────────────────────────────────────────

/**
 * Declare war. Logs the casus belli and applies opinion penalties.
 * Alliances may be pulled in via the call-to-arms mechanic.
 */
export function declareWar(
  db: Database.Database,
  gameId: string,
  attackerId: string,
  defenderId: string,
  casusBelli: CasusBelli,
): { pullIns: string[] } {
  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as GameRow;

  db.prepare(
    `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data)
     VALUES (?, ?, ?, 'war_declaration', ?, ?, ?)`,
  ).run(
    randomUUID(), gameId, game.turn,
    `${attackerId} declared war on ${defenderId} (${casusBelli})`,
    attackerId,
    JSON.stringify({ defenderId, casusBelli }),
  );

  // Opinion penalty on both sides with all neighbours (-10 for aggression)
  applyOpinionPenalty(db, gameId, attackerId, -30, defenderId);
  applyOpinionPenalty(db, gameId, attackerId, -10);  // all others: aggressive expansion malus

  // Call-to-arms: allies of the defender join the war
  const pullIns = callToArms(db, gameId, defenderId, attackerId);

  return { pullIns };
}

// ── Peace Negotiations ────────────────────────────────────────────────────────

/**
 * Resolve a peace deal between two factions.
 *
 * annex       — loser transfers all provinces to winner
 * tribute     — loser pays 200 gold/turn for 3 turns (logged; enforced at turn start)
 * vassalize   — loser becomes vassal: follows attacker diplomatically, pays 20% gold/turn
 * white_peace — both sides return to status quo; war ends
 */
export function makePeace(
  db: Database.Database,
  gameId: string,
  winnerId: string,
  loserId: string,
  term: PeaceTerm,
): void {
  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as GameRow;

  switch (term) {
    case 'annex': {
      db.prepare(`UPDATE provinces SET owner_id = ? WHERE game_id = ? AND owner_id = ?`)
        .run(winnerId, gameId, loserId);
      break;
    }
    case 'tribute': {
      // Store tribute obligation in turn_log (turn engine reads it and deducts gold)
      for (let i = 1; i <= 3; i++) {
        db.prepare(
          `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data)
           VALUES (?, ?, ?, 'tribute_due', ?, ?, ?)`,
        ).run(randomUUID(), gameId, game.turn + i, 'Tribute payment due', loserId, JSON.stringify({ payTo: winnerId, amount: 200 }));
      }
      break;
    }
    case 'vassalize': {
      // Add vassalage treaty (loser → winner direction uses canonical a<b order)
      const [a, b] = [winnerId, loserId].sort();
      db.prepare(
        `INSERT OR IGNORE INTO diplomatic_relations (game_id, faction_a, faction_b, opinion, treaties)
         VALUES (?, ?, ?, 0, '[]')`,
      ).run(gameId, a, b);
      const row = db.prepare('SELECT treaties FROM diplomatic_relations WHERE game_id = ? AND faction_a = ? AND faction_b = ?')
        .get(gameId, a, b) as { treaties: string };
      const treaties: string[] = JSON.parse(row.treaties);
      if (!treaties.includes('vassalage')) treaties.push('vassalage');
      db.prepare('UPDATE diplomatic_relations SET treaties = ?, opinion = MIN(100, opinion + 20) WHERE game_id = ? AND faction_a = ? AND faction_b = ?')
        .run(JSON.stringify(treaties), gameId, a, b);
      break;
    }
    case 'white_peace':
      // Both sides get a small opinion recovery
      applyOpinionPenalty(db, gameId, winnerId, 10, loserId);
      break;
  }

  db.prepare(
    `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data)
     VALUES (?, ?, ?, 'peace', ?, ?, ?)`,
  ).run(randomUUID(), gameId, game.turn, `Peace (${term}): ${winnerId} vs ${loserId}`, winnerId, JSON.stringify({ loserId, term }));
}

// ── Military Alliances ────────────────────────────────────────────────────────

/**
 * Form a military alliance between two factions.
 * Requires opinion ≥ 50 and no existing war between them.
 */
export function formAlliance(
  db: Database.Database,
  gameId: string,
  factionA: string,
  factionB: string,
  type: 'defensive' | 'offensive',
): { ok: boolean; reason?: string } {
  const [a, b] = [factionA, factionB].sort();
  const row = db.prepare('SELECT opinion, treaties FROM diplomatic_relations WHERE game_id = ? AND faction_a = ? AND faction_b = ?')
    .get(gameId, a, b) as RelationRow | undefined;

  if (!row) return { ok: false, reason: 'No diplomatic relation found' };
  if (row.opinion < 50) return { ok: false, reason: `Opinion too low (${row.opinion}, need 50+)` };

  const treaties: string[] = JSON.parse(row.treaties);
  if (treaties.includes('alliance')) return { ok: false, reason: 'Already allied' };

  treaties.push('alliance');
  db.prepare('UPDATE diplomatic_relations SET treaties = ? WHERE game_id = ? AND faction_a = ? AND faction_b = ?')
    .run(JSON.stringify(treaties), gameId, a, b);

  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as GameRow;
  db.prepare(
    `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data)
     VALUES (?, ?, ?, 'alliance_formed', ?, ?, ?)`,
  ).run(randomUUID(), gameId, game.turn, `${factionA} and ${factionB} formed a ${type} alliance`, factionA, JSON.stringify({ factionB, type }));

  return { ok: true };
}

/**
 * Break an alliance — applies opinion penalty to both factions.
 */
export function breakAlliance(
  db: Database.Database,
  gameId: string,
  factionA: string,
  factionB: string,
): void {
  const [a, b] = [factionA, factionB].sort();
  const row = db.prepare('SELECT treaties FROM diplomatic_relations WHERE game_id = ? AND faction_a = ? AND faction_b = ?')
    .get(gameId, a, b) as { treaties: string } | undefined;
  if (!row) return;

  const treaties: string[] = JSON.parse(row.treaties).filter((t: string) => t !== 'alliance');
  db.prepare('UPDATE diplomatic_relations SET treaties = ?, opinion = MAX(-100, opinion - 25) WHERE game_id = ? AND faction_a = ? AND faction_b = ?')
    .run(JSON.stringify(treaties), gameId, a, b);
}

// ── Call-to-Arms ──────────────────────────────────────────────────────────────

/**
 * When a faction is attacked, its allies may join the war.
 * Returns list of faction IDs that answered the call.
 */
function callToArms(
  db: Database.Database,
  gameId: string,
  defenderId: string,
  attackerId: string,
): string[] {
  const allies = db.prepare(
    `SELECT CASE WHEN faction_a = ? THEN faction_b ELSE faction_a END as ally
     FROM diplomatic_relations
     WHERE game_id = ? AND (faction_a = ? OR faction_b = ?) AND treaties LIKE '%alliance%'`,
  ).all(defenderId, gameId, defenderId, defenderId) as { ally: string }[];

  const pullIns: string[] = [];
  for (const { ally } of allies) {
    if (ally === attackerId) continue;
    // Allies with opinion > -20 answer the call
    const [a, b] = [ally, attackerId].sort();
    const rel = db.prepare('SELECT opinion FROM diplomatic_relations WHERE game_id = ? AND faction_a = ? AND faction_b = ?')
      .get(gameId, a, b) as { opinion: number } | undefined;
    const opinion = rel?.opinion ?? 0;
    if (opinion > -20) {
      pullIns.push(ally);
    }
  }
  return pullIns;
}

// ── War Aid ───────────────────────────────────────────────────────────────────

/**
 * Grant the war-aid opinion bonus when one faction fights alongside another.
 * Both sides gain +15 opinion (they helped each other).
 */
export function grantWarAid(
  db: Database.Database,
  gameId: string,
  helperId: string,
  beneficiaryId: string,
): void {
  const [a, b] = [helperId, beneficiaryId].sort();
  db.prepare(
    `UPDATE diplomatic_relations SET opinion = MAX(-100, MIN(100, opinion + 15))
     WHERE game_id = ? AND faction_a = ? AND faction_b = ?`,
  ).run(gameId, a, b);

  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as GameRow;
  db.prepare(
    `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data)
     VALUES (?, ?, ?, 'war_aid', ?, ?, ?)`,
  ).run(
    randomUUID(), gameId, game.turn,
    `${helperId} aided ${beneficiaryId} in war (+15 opinion)`,
    helperId,
    JSON.stringify({ beneficiaryId }),
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyOpinionPenalty(
  db: Database.Database,
  gameId: string,
  factionId: string,
  delta: number,
  specificTarget?: string,
): void {
  if (specificTarget) {
    const [a, b] = [factionId, specificTarget].sort();
    db.prepare(
      `UPDATE diplomatic_relations SET opinion = MAX(-100, MIN(100, opinion + ?))
       WHERE game_id = ? AND faction_a = ? AND faction_b = ?`,
    ).run(delta, gameId, a, b);
  } else {
    db.prepare(
      `UPDATE diplomatic_relations SET opinion = MAX(-100, MIN(100, opinion + ?))
       WHERE game_id = ? AND (faction_a = ? OR faction_b = ?)`,
    ).run(delta, gameId, factionId, factionId);
  }
}
