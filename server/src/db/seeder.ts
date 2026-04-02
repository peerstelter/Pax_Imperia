import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { buildProvinceGrid, coordToId } from '@pax-imperia/shared';
import type { FactionPersonality } from '@pax-imperia/shared';
import { seedCommanders } from '../engine/commanderEngine.js';

// Starting faction definitions — 1 player + 6 AI
interface FactionDef {
  id: string;
  name: string;
  color: string;
  personality: FactionPersonality;
  isPlayer: boolean;
  startCol: number;
  startRow: number;
  gold: number;
  food: number;
  manpower: number;
}

const FACTION_DEFS: FactionDef[] = [
  { id: 'f_valden',   name: 'Valdenmarch',   color: '#c0392b', personality: 'aggressive',   isPlayer: true,  startCol: 3, startRow: 2, gold: 150, food: 80, manpower: 300 },
  { id: 'f_khos',     name: 'Khos Horde',    color: '#e67e22', personality: 'aggressive',   isPlayer: false, startCol: 5, startRow: 3, gold: 80,  food: 60, manpower: 400 },
  { id: 'f_dunmara',  name: 'Dunmara Reach', color: '#2980b9', personality: 'isolationist', isPlayer: false, startCol: 0, startRow: 2, gold: 120, food: 70, manpower: 200 },
  { id: 'f_solaris',  name: 'Solaris Pact',  color: '#f1c40f', personality: 'merchant',     isPlayer: false, startCol: 7, startRow: 1, gold: 250, food: 50, manpower: 150 },
  { id: 'f_ironveil', name: 'Ironveil',       color: '#8e44ad', personality: 'expansionist', isPlayer: false, startCol: 1, startRow: 0, gold: 100, food: 100, manpower: 250 },
  { id: 'f_ashen',    name: 'Ashen Crown',   color: '#27ae60', personality: 'expansionist', isPlayer: false, startCol: 6, startRow: 4, gold: 110, food: 90, manpower: 220 },
  { id: 'f_neutral',  name: 'Freeholds',     color: '#7f8c8d', personality: 'isolationist', isPlayer: false, startCol: 3, startRow: 4, gold: 60,  food: 60, manpower: 100 },
];

export function seedGame(db: Database.Database, gameId: string, playerFactionId: string): void {
  // Validate player faction
  const playerDef = FACTION_DEFS.find((f) => f.id === playerFactionId);
  if (!playerDef) throw new Error(`Unknown faction: ${playerFactionId}`);

  const insertFaction = db.prepare(
    `INSERT INTO factions (id, game_id, name, color, gold, food, manpower, personality, is_player)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const insertProvince = db.prepare(
    `INSERT INTO provinces
       (id, game_id, name, owner_id, biome, garrison, fort_level, strategic_value, adjacent_ids, is_revealed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const insertRelation = db.prepare(
    `INSERT OR IGNORE INTO diplomatic_relations (game_id, faction_a, faction_b, opinion, treaties)
     VALUES (?, ?, ?, 0, '[]')`,
  );

  const insertShadow = db.prepare(
    `INSERT OR IGNORE INTO shadow_influence (game_id, source_faction, target_faction, influence)
     VALUES (?, ?, ?, 0)`,
  );

  db.transaction(() => {
    // Insert factions (mark correct player)
    for (const def of FACTION_DEFS) {
      insertFaction.run(
        def.id,
        gameId,
        def.name,
        def.color,
        def.gold,
        def.food,
        def.manpower,
        def.personality,
        def.id === playerFactionId ? 1 : 0,
      );
    }

    // Build province grid and assign starting provinces
    const grid = buildProvinceGrid();

    // Map start coords → faction id
    const startMap = new Map(
      FACTION_DEFS.map((f) => [coordToId(f.startCol, f.startRow), f.id]),
    );

    // Expand each faction to own adjacent province too (starting territory of 2)
    const ownerMap = new Map<string, string>();
    for (const def of FACTION_DEFS) {
      const homeId = coordToId(def.startCol, def.startRow);
      ownerMap.set(homeId, def.id);
      // Give one adjacent province as well
      const prov = grid.find((p) => p.id === homeId);
      if (prov && prov.adjacentIds.length > 0) {
        const secondId = prov.adjacentIds[0];
        if (!ownerMap.has(secondId)) ownerMap.set(secondId, def.id);
      }
    }

    for (const prov of grid) {
      const ownerId = ownerMap.get(prov.id) ?? 'f_neutral';
      const isStartCapital = startMap.has(prov.id);
      const garrison = isStartCapital ? 500 : ownerMap.has(prov.id) ? 200 : 0;
      const fortLevel = isStartCapital ? 2 : 0;
      // Player's provinces and capital are revealed; rest hidden
      const isRevealed = ownerId === playerFactionId ? 1 : 0;

      insertProvince.run(
        prov.id,
        gameId,
        prov.name,
        ownerId,
        prov.biome,
        garrison,
        fortLevel,
        prov.strategicValue,
        JSON.stringify(prov.adjacentIds),
        isRevealed,
      );
    }

    // Seed diplomatic relations for all faction pairs (opinion starts at 0)
    const ids = FACTION_DEFS.map((f) => f.id);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [ids[i], ids[j]].sort();
        insertRelation.run(gameId, a, b);
      }
    }

    // Seed shadow influence rows
    for (let i = 0; i < ids.length; i++) {
      for (let j = 0; j < ids.length; j++) {
        if (i !== j) insertShadow.run(gameId, ids[i], ids[j]);
      }
    }
  })();

  // Seed starting commanders (one per faction) — outside transaction (uses its own writes)
  seedCommanders(db, gameId);
}

export { FACTION_DEFS };
