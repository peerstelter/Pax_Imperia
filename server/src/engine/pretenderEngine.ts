import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { INTRIGUE_PUPPET_THRESHOLD } from '@pax-imperia/shared';

// Minimum shadow influence required to back a pretender
const PRETENDER_INFLUENCE_COST = 40;

/**
 * Support a pretender to the throne in a target faction.
 *
 * Effect: if shadow influence >= PRETENDER_INFLUENCE_COST, a civil war is triggered.
 * The target faction loses ~half its provinces to a newly spawned rebel "pretender"
 * faction. The backer gains puppet-level influence over the pretender.
 *
 * Returns ok:false if influence is insufficient.
 */
export function supportPretender(
  db: Database.Database,
  gameId: string,
  backerId: string,
  targetFactionId: string,
): { ok: boolean; reason?: string; pretenderId?: string } {
  const influenceRow = db
    .prepare('SELECT influence FROM shadow_influence WHERE game_id = ? AND source_faction = ? AND target_faction = ?')
    .get(gameId, backerId, targetFactionId) as { influence: number } | undefined;

  const influence = influenceRow?.influence ?? 0;
  if (influence < PRETENDER_INFLUENCE_COST) {
    return { ok: false, reason: `Need ${PRETENDER_INFLUENCE_COST} shadow influence (have ${influence})` };
  }

  // Spend the influence
  db.prepare(
    'UPDATE shadow_influence SET influence = MAX(0, influence - ?) WHERE game_id = ? AND source_faction = ? AND target_faction = ?',
  ).run(PRETENDER_INFLUENCE_COST, gameId, backerId, targetFactionId);

  // Get target faction details to create a pretender faction
  const targetFaction = db
    .prepare('SELECT name, color FROM factions WHERE game_id = ? AND id = ?')
    .get(gameId, targetFactionId) as { name: string; color: string } | undefined;
  if (!targetFaction) return { ok: false, reason: 'Target faction not found' };

  const pretenderId = `pretender_${targetFactionId}_${randomUUID().slice(0, 8)}`;
  const pretenderColor = shiftColor(targetFaction.color);

  // Insert pretender faction
  db.prepare(
    `INSERT INTO factions (id, game_id, name, color, gold, food, manpower, personality, is_player)
     VALUES (?, ?, ?, ?, 50, 30, 100, 'aggressive', 0)`,
  ).run(pretenderId, gameId, `${targetFaction.name} (Pretender)`, pretenderColor);

  // Transfer half of target faction's provinces to pretender (every other one)
  const provinces = db
    .prepare('SELECT id FROM provinces WHERE game_id = ? AND owner_id = ? ORDER BY id')
    .all(gameId, targetFactionId) as { id: string }[];

  const toTransfer = provinces.filter((_, i) => i % 2 === 1);
  for (const { id } of toTransfer) {
    db.prepare('UPDATE provinces SET owner_id = ? WHERE game_id = ? AND id = ?')
      .run(pretenderId, gameId, id);
  }

  // Backer gets high shadow influence over the pretender (puppet-level)
  db.prepare(
    `INSERT INTO shadow_influence (game_id, source_faction, target_faction, influence)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(game_id, source_faction, target_faction)
     DO UPDATE SET influence = ?`,
  ).run(gameId, backerId, pretenderId, INTRIGUE_PUPPET_THRESHOLD, INTRIGUE_PUPPET_THRESHOLD);

  // Init shadow_influence rows for pretender vs existing factions
  db.prepare(
    `INSERT OR IGNORE INTO shadow_influence (game_id, source_faction, target_faction, influence)
     VALUES (?, ?, ?, 0)`,
  ).run(gameId, pretenderId, targetFactionId);

  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as { turn: number };
  db.prepare(
    `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data)
     VALUES (?, ?, ?, 'civil_war', ?, ?, ?)`,
  ).run(
    randomUUID(), gameId, game.turn,
    `Civil war in ${targetFaction.name}! Pretender ${pretenderId} controls ${toTransfer.length} provinces`,
    backerId,
    JSON.stringify({ targetFactionId, pretenderId, provincesLost: toTransfer.length }),
  );

  return { ok: true, pretenderId };
}

// Lighten/darken hex color slightly for visual distinction
function shiftColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = Math.min(255, parseInt(clean.slice(0, 2), 16) + 40);
  const g = Math.max(0, parseInt(clean.slice(2, 4), 16) - 20);
  const b = Math.min(255, parseInt(clean.slice(4, 6), 16) + 40);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
