// ── Enums / Literals ─────────────────────────────────────────────────────────

export type Biome =
  | 'default'
  | 'steppe'
  | 'desert'
  | 'isles'
  | 'tundra';

export type TroopType =
  | 'cavalry'
  | 'polearms'
  | 'archers'
  | 'heavy_infantry'
  | 'light_infantry';

export type DiplomacyType =
  | 'alliance'
  | 'marriage'
  | 'trade'
  | 'vassalage'
  | 'non_aggression';

export type IntrigueActionType =
  | 'spy'
  | 'assassinate'
  | 'sabotage'
  | 'bribe'
  | 'propaganda'
  | 'blackmail';

export type VictoryPath = 'war' | 'diplomacy' | 'intrigue';

export type FactionPersonality =
  | 'aggressive'
  | 'expansionist'
  | 'isolationist'
  | 'merchant';

// ── Domain Interfaces ─────────────────────────────────────────────────────────

export interface Faction {
  id: string;
  name: string;
  color: string;
  gold: number;
  food: number;
  manpower: number;
  personality: FactionPersonality;
  isPlayer: boolean;
  shadowInfluence: Record<string, number>; // factionId → 0–100
}

export interface Province {
  id: string;
  name: string;
  ownerId: string;
  biome: Biome;
  garrison: number;
  fortLevel: number; // 0–5
  strategicValue: number; // 1–3
  adjacentIds: string[];
  isRevealed: boolean; // for fog of war
}

export interface Unit {
  type: TroopType;
  variant?: string; // biome-specific sub-type (e.g. 'horse_archers')
  count: number;
  morale: number; // 0–100
  attack: number;
  defense: number;
  speed: number;
}

export interface Army {
  id: string;
  factionId: string;
  provinceId: string;
  units: Unit[];
  commanderId?: string;
  formation: Formation;
}

export interface Formation {
  frontLine: Unit[];
  secondRank: Unit[];
  flanks: Unit[];
}

export interface Commander {
  id: string;
  name: string;
  factionId: string;
  attack: number;
  defense: number;
  maneuver: number;
  isAlive: boolean;
}

export interface DiplomaticRelation {
  factionA: string;
  factionB: string;
  opinion: number; // −100 to +100
  treaties: DiplomacyType[];
}

export interface IntrigueAction {
  id: string;
  type: IntrigueActionType;
  sourceFactionId: string;
  targetFactionId: string;
  targetProvinceId?: string;
  successChance: number; // 0–1
  status: 'pending' | 'success' | 'failure' | 'discovered';
  turn: number;
}

export interface GameState {
  id: string;
  turn: number;
  playerFactionId: string;
  factions: Faction[];
  provinces: Province[];
  armies: Army[];
  commanders: Commander[];
  diplomaticRelations: DiplomaticRelation[];
  intrigueActions: IntrigueAction[];
  victoryPath?: VictoryPath;
  winner?: string;
}

export interface TurnEvent {
  id: string;
  turn: number;
  type: string;
  description: string;
  factionId?: string;
  provinceId?: string;
  data?: Record<string, unknown>;
}
