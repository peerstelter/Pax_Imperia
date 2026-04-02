import type Database from 'better-sqlite3';
import type { FactionPersonality } from '@pax-imperia/shared';
import { INTRIGUE_PUPPET_THRESHOLD } from '@pax-imperia/shared';
import { proposeAlliance, proposeTrade, proposeMarriage, proposeNap } from './diplomacyEngine.js';
import { declareWar } from './warDiplomacy.js';

interface FactionRow {
  id: string;
  personality: FactionPersonality;
  gold: number;
  manpower: number;
  is_player: number;
}

interface RelationRow {
  faction_a: string;
  faction_b: string;
  opinion: number;
  treaties: string;
}

interface ProvinceCount { owner_id: string; cnt: number }

/**
 * Run AI decisions for all non-player factions.
 * Called once per turn from advanceTurn (after resource tick, before log).
 *
 * Each personality has weighted tendencies:
 *   aggressive   — prefers war when militarily superior
 *   expansionist — declares war at lower strength advantage, rarely seeks peace
 *   isolationist — avoids war, signs NAPs, rarely allies
 *   merchant     — prioritises trade agreements, gifts, diplomatic missions
 */
export function runAiDecisions(db: Database.Database, gameId: string): void {
  const factions = db
    .prepare('SELECT id, personality, gold, manpower, is_player FROM factions WHERE game_id = ?')
    .all(gameId) as FactionRow[];

  const relations = db
    .prepare('SELECT faction_a, faction_b, opinion, treaties FROM diplomatic_relations WHERE game_id = ?')
    .all(gameId) as RelationRow[];

  const provinceCounts = db
    .prepare('SELECT owner_id, COUNT(*) as cnt FROM provinces WHERE game_id = ? GROUP BY owner_id')
    .all(gameId) as ProvinceCount[];

  const strengthMap = buildStrengthMap(factions, provinceCounts);

  for (const faction of factions) {
    if (faction.is_player) continue;
    runFactionAI(db, gameId, faction, factions, relations, strengthMap);
  }
}

// ── Puppet check ─────────────────────────────────────────────────────────────

/**
 * Returns the ID of the faction that controls this faction as a puppet,
 * or null if not puppeted.
 */
export function getPuppetMaster(
  db: Database.Database,
  gameId: string,
  factionId: string,
): string | null {
  const row = db
    .prepare(
      `SELECT source_faction FROM shadow_influence
       WHERE game_id = ? AND target_faction = ? AND influence >= ?
       LIMIT 1`,
    )
    .get(gameId, factionId, INTRIGUE_PUPPET_THRESHOLD) as { source_faction: string } | undefined;
  return row?.source_faction ?? null;
}

// ── Per-faction AI ────────────────────────────────────────────────────────────

function runFactionAI(
  db: Database.Database,
  gameId: string,
  self: FactionRow,
  allFactions: FactionRow[],
  relations: RelationRow[],
  strengthMap: Map<string, number>,
): void {
  // Puppeted factions follow their master's alliances instead of acting independently
  const puppetMaster = getPuppetMaster(db, gameId, self.id);
  if (puppetMaster) {
    runPuppetAI(db, gameId, self.id, puppetMaster, relations);
    return;
  }

  const myStrength = strengthMap.get(self.id) ?? 1;

  for (const other of allFactions) {
    if (other.id === self.id) continue;

    const rel = getRelation(relations, self.id, other.id);
    const opinion = rel?.opinion ?? 0;
    const treaties: string[] = rel ? JSON.parse(rel.treaties) : [];
    const otherStrength = strengthMap.get(other.id) ?? 1;
    const roll = Math.random();

    switch (self.personality) {
      case 'aggressive':
        // Declare war if much stronger and no NAP
        if (myStrength > otherStrength * 1.5 && !treaties.includes('non_aggression') && !treaties.includes('alliance') && roll < 0.15) {
          declareWar(db, gameId, self.id, other.id, 'expansion');
        }
        // Occasionally ally with the strongest neighbour
        if (opinion >= 50 && !treaties.includes('alliance') && myStrength < otherStrength && roll < 0.1) {
          proposeAlliance(db, gameId, self.id, other.id);
        }
        break;

      case 'expansionist':
        // Lower bar for war declaration
        if (myStrength > otherStrength * 1.2 && !treaties.includes('non_aggression') && !treaties.includes('alliance') && roll < 0.18) {
          declareWar(db, gameId, self.id, other.id, 'expansion');
        }
        // Also seeks alliances to flank enemies
        if (opinion >= 50 && !treaties.includes('alliance') && roll < 0.12) {
          proposeAlliance(db, gameId, self.id, other.id);
        }
        break;

      case 'isolationist':
        // Prefer peace: sign NAPs, avoid war
        if (!treaties.includes('non_aggression') && opinion >= 0 && roll < 0.2) {
          proposeNap(db, gameId, self.id, other.id, 10);
        }
        // Very rarely ally
        if (opinion >= 70 && !treaties.includes('alliance') && roll < 0.05) {
          proposeAlliance(db, gameId, self.id, other.id);
        }
        break;

      case 'merchant':
        // Seek trade above all
        if (!treaties.includes('trade') && opinion >= -20 && roll < 0.25) {
          proposeTrade(db, gameId, self.id, other.id);
        }
        // Marriage to lock in good relations
        if (opinion >= 40 && !treaties.includes('marriage') && roll < 0.1) {
          proposeMarriage(db, gameId, self.id, other.id);
        }
        // Defensive alliances with trading partners
        if (opinion >= 50 && treaties.includes('trade') && !treaties.includes('alliance') && roll < 0.08) {
          proposeAlliance(db, gameId, self.id, other.id);
        }
        break;
    }
  }
}

// ── Puppet AI ─────────────────────────────────────────────────────────────────

/**
 * A puppeted faction mirrors its master's alliances: if the master is allied
 * with someone, the puppet will also attempt to ally with them (if opinion allows).
 */
function runPuppetAI(
  db: Database.Database,
  gameId: string,
  puppetId: string,
  masterId: string,
  relations: RelationRow[],
): void {
  // Find factions allied with the master
  const masterAllies = relations
    .filter((r) => {
      const treaties = JSON.parse(r.treaties) as string[];
      return (r.faction_a === masterId || r.faction_b === masterId) && treaties.includes('alliance');
    })
    .map((r) => (r.faction_a === masterId ? r.faction_b : r.faction_a));

  for (const allyId of masterAllies) {
    if (allyId === puppetId) continue;
    const rel = getRelation(relations, puppetId, allyId);
    const opinion = rel?.opinion ?? 0;
    const treaties = rel ? (JSON.parse(rel.treaties) as string[]) : [];
    if (!treaties.includes('alliance') && opinion >= 30) {
      proposeAlliance(db, gameId, puppetId, allyId);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strength = provinces × 2 + manpower / 100 */
function buildStrengthMap(factions: FactionRow[], counts: ProvinceCount[]): Map<string, number> {
  const map = new Map<string, number>();
  const countMap = new Map(counts.map((r) => [r.owner_id, r.cnt]));
  for (const f of factions) {
    const provinces = countMap.get(f.id) ?? 0;
    map.set(f.id, provinces * 2 + Math.floor(f.manpower / 100));
  }
  return map;
}

function getRelation(relations: RelationRow[], a: string, b: string): RelationRow | undefined {
  const [fa, fb] = [a, b].sort();
  return relations.find((r) => r.faction_a === fa && r.faction_b === fb);
}
