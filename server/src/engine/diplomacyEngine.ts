import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { adjustOpinion, getOpinion, OPINION_MODS } from './opinionEngine.js';
import type { DiplomacyType } from '@pax-imperia/shared';

interface GameRow  { turn: number }
interface RelRow   { treaties: string; opinion: number }
interface FactionRow { gold: number; manpower: number }

// ── Shared helpers ────────────────────────────────────────────────────────────

function getRelation(db: Database.Database, gameId: string, a: string, b: string): RelRow {
  const [fa, fb] = [a, b].sort();
  return (
    db.prepare('SELECT treaties, opinion FROM diplomatic_relations WHERE game_id = ? AND faction_a = ? AND faction_b = ?')
      .get(gameId, fa, fb) as RelRow | undefined
  ) ?? { treaties: '[]', opinion: 0 };
}

function hasTreaty(db: Database.Database, gameId: string, a: string, b: string, type: DiplomacyType): boolean {
  const rel = getRelation(db, gameId, a, b);
  return (JSON.parse(rel.treaties) as string[]).includes(type);
}

function addTreaty(db: Database.Database, gameId: string, a: string, b: string, type: DiplomacyType): void {
  const [fa, fb] = [a, b].sort();
  db.prepare(`INSERT OR IGNORE INTO diplomatic_relations (game_id, faction_a, faction_b, opinion, treaties) VALUES (?, ?, ?, 0, '[]')`).run(gameId, fa, fb);
  const rel = db.prepare('SELECT treaties FROM diplomatic_relations WHERE game_id = ? AND faction_a = ? AND faction_b = ?').get(gameId, fa, fb) as { treaties: string };
  const treaties: string[] = JSON.parse(rel.treaties);
  if (!treaties.includes(type)) {
    treaties.push(type);
    db.prepare('UPDATE diplomatic_relations SET treaties = ? WHERE game_id = ? AND faction_a = ? AND faction_b = ?').run(JSON.stringify(treaties), gameId, fa, fb);
  }
}

function removeTreaty(db: Database.Database, gameId: string, a: string, b: string, type: DiplomacyType): void {
  const [fa, fb] = [a, b].sort();
  const rel = db.prepare('SELECT treaties FROM diplomatic_relations WHERE game_id = ? AND faction_a = ? AND faction_b = ?').get(gameId, fa, fb) as { treaties: string } | undefined;
  if (!rel) return;
  const treaties = (JSON.parse(rel.treaties) as string[]).filter((t) => t !== type);
  db.prepare('UPDATE diplomatic_relations SET treaties = ? WHERE game_id = ? AND faction_a = ? AND faction_b = ?').run(JSON.stringify(treaties), gameId, fa, fb);
}

function logDiploEvent(db: Database.Database, gameId: string, turn: number, type: string, description: string, factionId: string, data: object): void {
  db.prepare(`INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), gameId, turn, type, description, factionId, JSON.stringify(data));
}

// ── Task 33: Alliances ────────────────────────────────────────────────────────

export function proposeAlliance(
  db: Database.Database,
  gameId: string,
  proposerId: string,
  targetId: string,
  allianceType: 'defensive' | 'offensive' = 'defensive',
): { ok: boolean; reason?: string } {
  const opinion = getOpinion(db, gameId, proposerId, targetId);
  if (opinion < 50) return { ok: false, reason: `Opinion too low (${opinion}, need 50+)` };
  if (hasTreaty(db, gameId, proposerId, targetId, 'alliance')) return { ok: false, reason: 'Already allied' };

  addTreaty(db, gameId, proposerId, targetId, 'alliance');
  adjustOpinion(db, gameId, proposerId, targetId, 10);

  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as GameRow;
  logDiploEvent(db, gameId, game.turn, 'alliance_formed', `${proposerId} + ${targetId}: ${allianceType} alliance`, proposerId, { targetId, allianceType });
  return { ok: true };
}

export function dissolveAlliance(
  db: Database.Database,
  gameId: string,
  factionA: string,
  factionB: string,
): void {
  removeTreaty(db, gameId, factionA, factionB, 'alliance');
  adjustOpinion(db, gameId, factionA, factionB, OPINION_MODS.treatyBroken);
  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as GameRow;
  logDiploEvent(db, gameId, game.turn, 'alliance_dissolved', `Alliance between ${factionA} and ${factionB} dissolved`, factionA, { factionB });
}

// ── Task 34: Marriage treaties ────────────────────────────────────────────────

export function proposeMarriage(
  db: Database.Database,
  gameId: string,
  proposerId: string,
  targetId: string,
): { ok: boolean; reason?: string } {
  const opinion = getOpinion(db, gameId, proposerId, targetId);
  if (opinion < 30) return { ok: false, reason: `Opinion too low (${opinion}, need 30+)` };
  if (hasTreaty(db, gameId, proposerId, targetId, 'marriage')) return { ok: false, reason: 'Marriage treaty already exists' };

  addTreaty(db, gameId, proposerId, targetId, 'marriage');
  adjustOpinion(db, gameId, proposerId, targetId, OPINION_MODS.marriageBonus);

  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as GameRow;
  logDiploEvent(db, gameId, game.turn, 'marriage', `${proposerId} and ${targetId} formed a dynastic marriage`, proposerId, { targetId });
  return { ok: true };
}

// ── Task 35: Trade agreements ─────────────────────────────────────────────────

export function proposeTrade(
  db: Database.Database,
  gameId: string,
  proposerId: string,
  targetId: string,
): { ok: boolean; reason?: string } {
  if (hasTreaty(db, gameId, proposerId, targetId, 'trade')) return { ok: false, reason: 'Trade agreement already active' };

  addTreaty(db, gameId, proposerId, targetId, 'trade');
  adjustOpinion(db, gameId, proposerId, targetId, 5);

  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as GameRow;
  logDiploEvent(db, gameId, game.turn, 'trade_agreement', `Trade agreement: ${proposerId} ↔ ${targetId}`, proposerId, { targetId });
  return { ok: true };
}

/** Per-turn gold from active trade agreements (called by faction resource tick). */
export function tradeGoldTick(db: Database.Database, gameId: string): void {
  const relations = db.prepare('SELECT faction_a, faction_b, treaties FROM diplomatic_relations WHERE game_id = ?').all(gameId) as { faction_a: string; faction_b: string; treaties: string }[];
  for (const rel of relations) {
    if (!(JSON.parse(rel.treaties) as string[]).includes('trade')) continue;
    // Both sides earn 30 gold/turn from trade
    db.prepare('UPDATE factions SET gold = gold + 30 WHERE game_id = ? AND id = ?').run(gameId, rel.faction_a);
    db.prepare('UPDATE factions SET gold = gold + 30 WHERE game_id = ? AND id = ?').run(gameId, rel.faction_b);
  }
}

// ── Task 36: Vassalization ────────────────────────────────────────────────────

export function vassalize(
  db: Database.Database,
  gameId: string,
  overlordId: string,
  vassalId: string,
): { ok: boolean; reason?: string } {
  const opinion = getOpinion(db, gameId, overlordId, vassalId);
  if (opinion < 80) return { ok: false, reason: `Opinion too low (${opinion}, need 80+)` };
  if (hasTreaty(db, gameId, overlordId, vassalId, 'vassalage')) return { ok: false, reason: 'Already a vassal' };

  addTreaty(db, gameId, overlordId, vassalId, 'vassalage');
  adjustOpinion(db, gameId, overlordId, vassalId, 15);

  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as GameRow;
  logDiploEvent(db, gameId, game.turn, 'vassalization', `${vassalId} became a vassal of ${overlordId}`, overlordId, { vassalId });
  return { ok: true };
}

/** Per-turn tribute from vassals (20% of vassal gold goes to overlord). */
export function vassalTributeTick(db: Database.Database, gameId: string): void {
  const relations = db.prepare('SELECT faction_a, faction_b, treaties FROM diplomatic_relations WHERE game_id = ?').all(gameId) as { faction_a: string; faction_b: string; treaties: string }[];
  for (const rel of relations) {
    if (!(JSON.parse(rel.treaties) as string[]).includes('vassalage')) continue;
    // Determine which is overlord: faction with higher province count
    const aCount = (db.prepare('SELECT COUNT(*) as c FROM provinces WHERE game_id = ? AND owner_id = ?').get(gameId, rel.faction_a) as { c: number }).c;
    const bCount = (db.prepare('SELECT COUNT(*) as c FROM provinces WHERE game_id = ? AND owner_id = ?').get(gameId, rel.faction_b) as { c: number }).c;
    const [overlord, vassal] = aCount >= bCount ? [rel.faction_a, rel.faction_b] : [rel.faction_b, rel.faction_a];

    const vassalFaction = db.prepare('SELECT gold FROM factions WHERE game_id = ? AND id = ?').get(gameId, vassal) as FactionRow | undefined;
    if (!vassalFaction) continue;
    const tribute = Math.floor(vassalFaction.gold * 0.2);
    if (tribute <= 0) continue;
    db.prepare('UPDATE factions SET gold = gold - ? WHERE game_id = ? AND id = ?').run(tribute, gameId, vassal);
    db.prepare('UPDATE factions SET gold = gold + ? WHERE game_id = ? AND id = ?').run(tribute, gameId, overlord);
    adjustOpinion(db, gameId, overlord, vassal, OPINION_MODS.vassalTribute);
  }
}

// ── Task 37: Non-aggression pacts ─────────────────────────────────────────────

export function proposeNap(
  db: Database.Database,
  gameId: string,
  factionA: string,
  factionB: string,
  durationTurns: number = 10,
): { ok: boolean; reason?: string } {
  if (hasTreaty(db, gameId, factionA, factionB, 'non_aggression')) return { ok: false, reason: 'NAP already active' };

  addTreaty(db, gameId, factionA, factionB, 'non_aggression');
  adjustOpinion(db, gameId, factionA, factionB, 8);

  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as GameRow;
  logDiploEvent(db, gameId, game.turn, 'nap_signed', `NAP: ${factionA} ↔ ${factionB} (${durationTurns} turns)`, factionA, { factionB, expiresAtTurn: game.turn + durationTurns });
  return { ok: true };
}
