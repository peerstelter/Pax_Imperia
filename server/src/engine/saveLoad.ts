import type Database from 'better-sqlite3';
import type { GameState, Faction, Province, Army, Commander, DiplomaticRelation, IntrigueAction } from '@pax-imperia/shared';

interface GameRow { id: string; player_faction: string; turn: number; winner: string | null; victory_path: string | null }
interface FactionRow { id: string; name: string; color: string; gold: number; food: number; manpower: number; personality: string; is_player: number }
interface ProvinceRow { id: string; name: string; owner_id: string; biome: string; garrison: number; fort_level: number; strategic_value: number; adjacent_ids: string; is_revealed: number }
interface ArmyRow { id: string; faction_id: string; province_id: string; commander_id: string | null; formation: string }
interface CommanderRow { id: string; name: string; faction_id: string; attack: number; defense: number; maneuver: number; is_alive: number }
interface RelationRow { faction_a: string; faction_b: string; opinion: number; treaties: string }
interface IntrigueRow { id: string; type: string; source_faction_id: string; target_faction_id: string; target_province_id: string | null; success_chance: number; status: string; turn: number }
interface ShadowRow { source_faction: string; target_faction: string; influence: number }

/** Load the full game state from SQLite into a GameState object. */
export function loadGameState(db: Database.Database, gameId: string): GameState {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as GameRow | undefined;
  if (!game) throw new Error('Game not found');

  const factionRows  = db.prepare('SELECT * FROM factions WHERE game_id = ?').all(gameId) as FactionRow[];
  const provinceRows = db.prepare('SELECT * FROM provinces WHERE game_id = ?').all(gameId) as ProvinceRow[];
  const armyRows     = db.prepare('SELECT * FROM armies WHERE game_id = ?').all(gameId) as ArmyRow[];
  const cmdRows      = db.prepare('SELECT * FROM commanders WHERE game_id = ?').all(gameId) as CommanderRow[];
  const relRows      = db.prepare('SELECT * FROM diplomatic_relations WHERE game_id = ?').all(gameId) as RelationRow[];
  const intrigueRows = db.prepare('SELECT * FROM intrigue_actions WHERE game_id = ?').all(gameId) as IntrigueRow[];
  const shadowRows   = db.prepare('SELECT * FROM shadow_influence WHERE game_id = ?').all(gameId) as ShadowRow[];

  // Build shadow influence map per faction
  const shadowMap: Record<string, Record<string, number>> = {};
  for (const row of shadowRows) {
    if (!shadowMap[row.source_faction]) shadowMap[row.source_faction] = {};
    shadowMap[row.source_faction][row.target_faction] = row.influence;
  }

  const factions: Faction[] = factionRows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    gold: r.gold,
    food: r.food,
    manpower: r.manpower,
    personality: r.personality as Faction['personality'],
    isPlayer: r.is_player === 1,
    shadowInfluence: shadowMap[r.id] ?? {},
  }));

  const provinces: Province[] = provinceRows.map((r) => ({
    id: r.id,
    name: r.name,
    ownerId: r.owner_id,
    biome: r.biome as Province['biome'],
    garrison: r.garrison,
    fortLevel: r.fort_level,
    strategicValue: r.strategic_value as 1 | 2 | 3,
    adjacentIds: JSON.parse(r.adjacent_ids),
    isRevealed: r.is_revealed === 1,
  }));

  const armies: Army[] = armyRows.map((r) => ({
    id: r.id,
    factionId: r.faction_id,
    provinceId: r.province_id,
    commanderId: r.commander_id ?? undefined,
    units: [],
    formation: JSON.parse(r.formation),
  }));

  const commanders: Commander[] = cmdRows.map((r) => ({
    id: r.id,
    name: r.name,
    factionId: r.faction_id,
    attack: r.attack,
    defense: r.defense,
    maneuver: r.maneuver,
    isAlive: r.is_alive === 1,
  }));

  const diplomaticRelations: DiplomaticRelation[] = relRows.map((r) => ({
    factionA: r.faction_a,
    factionB: r.faction_b,
    opinion: r.opinion,
    treaties: JSON.parse(r.treaties),
  }));

  const intrigueActions: IntrigueAction[] = intrigueRows.map((r) => ({
    id: r.id,
    type: r.type as IntrigueAction['type'],
    sourceFactionId: r.source_faction_id,
    targetFactionId: r.target_faction_id,
    targetProvinceId: r.target_province_id ?? undefined,
    successChance: r.success_chance,
    status: r.status as IntrigueAction['status'],
    turn: r.turn,
  }));

  return {
    id: game.id,
    turn: game.turn,
    playerFactionId: game.player_faction,
    factions,
    provinces,
    armies,
    commanders,
    diplomaticRelations,
    intrigueActions,
    victoryPath: game.victory_path as GameState['victoryPath'],
    winner: game.winner ?? undefined,
  };
}

/** Export the full game state as a JSON string (for download / backup). */
export function exportGameJson(db: Database.Database, gameId: string): string {
  return JSON.stringify(loadGameState(db, gameId), null, 2);
}
