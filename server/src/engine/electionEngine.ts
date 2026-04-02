import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { DIPLOMACY_ELECTION_VOTES_NEEDED, OPINION_ALLIANCE_THRESHOLD } from '@pax-imperia/shared';

interface ElectionResult {
  candidateId: string;
  votes: number;
  voters: string[];
  needed: number;
  won: boolean;
}

/**
 * Conduct the Imperial Election.
 *
 * A faction "votes" for the candidate if:
 *   - It is not the candidate itself
 *   - Its opinion of the candidate is ≥ OPINION_ALLIANCE_THRESHOLD (50)
 *
 * If votes ≥ DIPLOMACY_ELECTION_VOTES_NEEDED the candidate wins the diplomatic victory.
 */
export function conductElection(
  db: Database.Database,
  gameId: string,
  candidateId: string,
): ElectionResult {
  const relations = db
    .prepare(
      `SELECT faction_a, faction_b, opinion
       FROM diplomatic_relations
       WHERE game_id = ? AND (faction_a = ? OR faction_b = ?)`,
    )
    .all(gameId, candidateId, candidateId) as { faction_a: string; faction_b: string; opinion: number }[];

  const voters: string[] = [];
  for (const rel of relations) {
    const voter = rel.faction_a === candidateId ? rel.faction_b : rel.faction_a;
    if (rel.opinion >= OPINION_ALLIANCE_THRESHOLD) {
      voters.push(voter);
    }
  }

  const won = voters.length >= DIPLOMACY_ELECTION_VOTES_NEEDED;

  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as { turn: number };
  db.prepare(
    `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data)
     VALUES (?, ?, ?, 'imperial_election', ?, ?, ?)`,
  ).run(
    randomUUID(), gameId, game.turn,
    won
      ? `Imperial Election: ${candidateId} elected Emperor with ${voters.length} votes`
      : `Imperial Election: ${candidateId} received ${voters.length}/${DIPLOMACY_ELECTION_VOTES_NEEDED} votes`,
    candidateId,
    JSON.stringify({ voters, votes: voters.length, needed: DIPLOMACY_ELECTION_VOTES_NEEDED, won }),
  );

  return { candidateId, votes: voters.length, voters, needed: DIPLOMACY_ELECTION_VOTES_NEEDED, won };
}

/**
 * Check whether any faction already qualifies for a diplomatic victory
 * (used by the turn engine victory checker).
 */
export function checkDiplomaticVictory(
  db: Database.Database,
  gameId: string,
): string | null {
  const factions = db
    .prepare('SELECT id FROM factions WHERE game_id = ?')
    .all(gameId) as { id: string }[];

  for (const { id } of factions) {
    const result = conductElectionSilent(db, gameId, id);
    if (result >= DIPLOMACY_ELECTION_VOTES_NEEDED) return id;
  }
  return null;
}

/** Count votes without writing a log entry. */
function conductElectionSilent(
  db: Database.Database,
  gameId: string,
  candidateId: string,
): number {
  const relations = db
    .prepare(
      `SELECT opinion FROM diplomatic_relations
       WHERE game_id = ? AND (faction_a = ? OR faction_b = ?) AND opinion >= ?`,
    )
    .all(gameId, candidateId, candidateId, OPINION_ALLIANCE_THRESHOLD) as { opinion: number }[];
  return relations.length;
}
