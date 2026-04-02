import type Database from 'better-sqlite3';

interface ProvinceRow {
  id: string;
  owner_id: string;
  adjacent_ids: string; // JSON
}

/**
 * Recompute fog of war for a faction.
 *
 * A province is REVEALED if any of the following is true:
 *  1. The faction owns it
 *  2. It is adjacent to a province the faction owns
 *  3. The faction has a spy action that succeeded this turn (handled in turnEngine)
 *
 * All other provinces remain hidden (is_revealed = 0) for this faction's perspective.
 * Because the DB stores a single is_revealed flag (not per-faction), we reveal
 * from the player faction's POV — AI factions see everything server-side.
 */
export function updateFogOfWar(
  db: Database.Database,
  gameId: string,
  playerFactionId: string,
): void {
  const provinces = db
    .prepare('SELECT id, owner_id, adjacent_ids FROM provinces WHERE game_id = ?')
    .all(gameId) as ProvinceRow[];

  const ownedIds = new Set(
    provinces.filter((p) => p.owner_id === playerFactionId).map((p) => p.id),
  );

  const visibleIds = new Set(ownedIds);

  // Reveal all neighbours of owned provinces
  for (const prov of provinces) {
    if (ownedIds.has(prov.id)) {
      const neighbours: string[] = JSON.parse(prov.adjacent_ids);
      for (const nid of neighbours) visibleIds.add(nid);
    }
  }

  const revealStmt = db.prepare(
    'UPDATE provinces SET is_revealed = ? WHERE game_id = ? AND id = ?',
  );

  db.transaction(() => {
    for (const prov of provinces) {
      revealStmt.run(visibleIds.has(prov.id) ? 1 : 0, gameId, prov.id);
    }
  })();
}
