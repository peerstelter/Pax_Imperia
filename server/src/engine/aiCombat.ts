import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

interface ProvinceRow {
  id: string;
  owner_id: string;
  garrison: number;
  adjacent_ids: string;
}

interface FactionRow {
  id: string;
  name: string;
  is_player: number;
}

/**
 * Simple AI combat resolution.
 * For every pair of factions at war, attempt one border assault per attacker.
 * Attacker wins if its adjacent garrison exceeds defender's by > 20%.
 * Province ownership transfers on win; both sides take casualties.
 */
export function tickAiCombat(db: Database.Database, gameId: string, turn: number, events: string[]): void {
  // Find all at-war faction pairs (war = opinion < -50 with no peace treaty, or explicit war status)
  const warPairs = db.prepare(`
    SELECT faction_a, faction_b
    FROM diplomatic_relations
    WHERE game_id = ? AND opinion <= -50
      AND treaties NOT LIKE '%alliance%'
      AND treaties NOT LIKE '%non_aggression%'
  `).all(gameId) as { faction_a: string; faction_b: string }[];

  if (warPairs.length === 0) return;

  const factions = db.prepare('SELECT id, name, is_player FROM factions WHERE game_id = ?')
    .all(gameId) as FactionRow[];
  const factionNames = new Map(factions.map((f) => [f.id, f.name]));

  const provinces = db.prepare('SELECT id, owner_id, garrison, adjacent_ids FROM provinces WHERE game_id = ?')
    .all(gameId) as ProvinceRow[];
  const provinceMap = new Map(provinces.map((p) => [p.id, p]));

  // Track provinces already captured this turn to avoid double-processing
  const capturedThisTurn = new Set<string>();

  for (const { faction_a, faction_b } of warPairs) {
    // Both sides attempt to attack each other
    for (const [attacker, defender] of [[faction_a, faction_b], [faction_b, faction_a]]) {
      // Skip if attacker is the player (player controls their own combat)
      const attackerFaction = factions.find((f) => f.id === attacker);
      if (attackerFaction?.is_player) continue;

      // Find attacker's provinces adjacent to defender's provinces
      const attackerProvinces = provinces.filter((p) => p.owner_id === attacker);
      for (const atkProv of attackerProvinces) {
        const adjacentIds: string[] = JSON.parse(atkProv.adjacent_ids);
        for (const adjId of adjacentIds) {
          const target = provinceMap.get(adjId);
          if (!target || target.owner_id !== defender) continue;
          if (capturedThisTurn.has(adjId)) continue;

          // Only one assault attempt per attacker per turn (first valid border)
          const atkGarrison = atkProv.garrison;
          const defGarrison = target.garrison;

          // Attacker needs 20% advantage to attempt assault
          if (atkGarrison < defGarrison * 1.2) break;

          // Roll for success (60-80% chance when attacker has advantage)
          const successChance = Math.min(0.8, 0.5 + (atkGarrison - defGarrison) / (defGarrison + 1) * 0.3);
          if (Math.random() > successChance) {
            // Failed assault — attacker loses ~15% garrison
            const loss = Math.floor(atkGarrison * 0.15);
            db.prepare('UPDATE provinces SET garrison = MAX(0, garrison - ?) WHERE game_id = ? AND id = ?')
              .run(loss, gameId, atkProv.id);
            atkProv.garrison -= loss;
            break;
          }

          // Successful assault — transfer province
          const atkCasualties = Math.floor(atkGarrison * 0.3);
          const remainingGarrison = Math.floor(atkGarrison * 0.5); // half the attackers move in

          db.prepare('UPDATE provinces SET owner_id = ?, garrison = ? WHERE game_id = ? AND id = ?')
            .run(attacker, remainingGarrison, gameId, adjId);
          db.prepare('UPDATE provinces SET garrison = MAX(0, garrison - ?) WHERE game_id = ? AND id = ?')
            .run(atkCasualties, gameId, atkProv.id);

          // Update local cache
          target.owner_id = attacker;
          target.garrison = remainingGarrison;
          atkProv.garrison -= atkCasualties;
          capturedThisTurn.add(adjId);

          const atkName = factionNames.get(attacker) ?? attacker;
          const defName = factionNames.get(defender) ?? defender;
          const provNameRow = db.prepare('SELECT name FROM provinces WHERE game_id = ? AND id = ?')
            .get(gameId, adjId) as { name: string } | undefined;
          const provName = provNameRow?.name ?? adjId;
          const msg = `⚔️ ${atkName} captured ${provName} from ${defName}!`;
          events.push(msg);

          db.prepare(`INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, province_id, data)
            VALUES (?, ?, ?, 'province_captured', ?, ?, ?, '{}')`
          ).run(randomUUID(), gameId, turn, msg, attacker, adjId);

          break; // One assault per attacker province per turn
        }
      }
    }
  }
}
