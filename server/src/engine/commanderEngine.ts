import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface CommanderDef {
  name: string;
  factionId: string;
  attack: number;
  defense: number;
  maneuver: number;
}

interface CombatResultSummary {
  winner: 'attacker' | 'defender' | 'draw';
  totalAttackerCasualties: number;
  totalDefenderCasualties: number;
}

/**
 * Hire a commander for a faction. Costs 200 gold.
 * Returns the new commander id, or an error string.
 */
export function hireCommander(
  db: Database.Database,
  gameId: string,
  def: CommanderDef,
): { ok: boolean; id?: string; reason?: string } {
  const faction = db
    .prepare('SELECT gold FROM factions WHERE game_id = ? AND id = ?')
    .get(gameId, def.factionId) as { gold: number } | undefined;

  if (!faction) return { ok: false, reason: 'Faction not found' };
  if (faction.gold < 200) return { ok: false, reason: 'Insufficient gold (need 200)' };

  db.prepare('UPDATE factions SET gold = gold - 200 WHERE game_id = ? AND id = ?')
    .run(gameId, def.factionId);

  const id = randomUUID();
  db.prepare(
    'INSERT INTO commanders (id, game_id, name, faction_id, attack, defense, maneuver, is_alive) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
  ).run(id, gameId, def.name, def.factionId, def.attack, def.defense, def.maneuver);

  return { ok: true, id };
}

/**
 * Assign a commander to an army.
 */
export function assignCommander(
  db: Database.Database,
  gameId: string,
  commanderId: string,
  armyId: string,
): void {
  db.prepare('UPDATE armies SET commander_id = ? WHERE game_id = ? AND id = ?')
    .run(commanderId, gameId, armyId);
}

/**
 * Roll commander mortality after a battle.
 *
 * Losing commanders have a 15% chance of dying.
 * Winning commanders: 5% chance.
 * Draw: 8% chance.
 */
export function rollCommanderMortality(
  db: Database.Database,
  gameId: string,
  attackerCommanderId: string | undefined,
  defenderCommanderId: string | undefined,
  result: CombatResultSummary,
): string[] {
  const deaths: string[] = [];

  const check = (cmdId: string | undefined, isLoser: boolean) => {
    if (!cmdId) return;
    const chance = isLoser ? 0.15 : result.winner === 'draw' ? 0.08 : 0.05;
    if (Math.random() < chance) {
      db.prepare('UPDATE commanders SET is_alive = 0 WHERE game_id = ? AND id = ?')
        .run(gameId, cmdId);
      db.prepare('UPDATE armies SET commander_id = NULL WHERE game_id = ? AND commander_id = ?')
        .run(gameId, cmdId);
      const cmd = db.prepare('SELECT name FROM commanders WHERE game_id = ? AND id = ?')
        .get(gameId, cmdId) as { name: string } | undefined;
      if (cmd) deaths.push(`${cmd.name} was slain in battle`);
    }
  };

  check(attackerCommanderId, result.winner === 'defender');
  check(defenderCommanderId, result.winner === 'attacker');

  return deaths;
}

/**
 * Generate a random commander name (used for AI factions).
 */
const FIRST = ['Aldric', 'Brennar', 'Caelith', 'Doran', 'Eadric', 'Gavar', 'Holt', 'Ivar', 'Jarek', 'Kael'];
const LAST  = ['the Bold', 'Ironhand', 'Shadowbane', 'of the North', 'Ashwood', 'Steelborn', 'the Cruel', 'Firemarch'];

export function randomCommanderName(): string {
  return `${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}`;
}

/**
 * Seed starting commanders for all factions in a game.
 */
export function seedCommanders(db: Database.Database, gameId: string): void {
  const factions = db
    .prepare('SELECT id FROM factions WHERE game_id = ?')
    .all(gameId) as { id: string }[];

  for (const { id: factionId } of factions) {
    // Each faction starts with one commander
    hireCommander(db, gameId, {
      name:      randomCommanderName(),
      factionId,
      attack:   Math.floor(Math.random() * 5) + 3,   // 3–7
      defense:  Math.floor(Math.random() * 5) + 3,
      maneuver: Math.floor(Math.random() * 5) + 3,
    });
  }
}
