import type { Biome, Province } from './types.js';

export interface GridCoord {
  col: number;
  row: number;
}

export interface ProvinceLayout extends GridCoord {
  provinceId: string;
}

// The world is a rectangular grid of columns × rows.
// Adjacency is 4-directional (N/E/S/W) — diagonal adjacency possible via config.
export const MAP_COLS = 8;
export const MAP_ROWS = 5;

/** Convert grid coord to a deterministic province id string. */
export function coordToId(col: number, row: number): string {
  return `p_${col}_${row}`;
}

/** Parse a province id back to grid coord. */
export function idToCoord(id: string): GridCoord {
  const [, col, row] = id.split('_');
  return { col: parseInt(col, 10), row: parseInt(row, 10) };
}

/** Return all 4-directional neighbours that exist within the grid. */
export function getAdjacentIds(col: number, row: number): string[] {
  const neighbours: string[] = [];
  if (col > 0)            neighbours.push(coordToId(col - 1, row));
  if (col < MAP_COLS - 1) neighbours.push(coordToId(col + 1, row));
  if (row > 0)            neighbours.push(coordToId(col, row - 1));
  if (row < MAP_ROWS - 1) neighbours.push(coordToId(col, row + 1));
  return neighbours;
}

// Biome distribution by column band
// West  (0–1): isles
// North (row 0): tundra
// Center-east (2–5): default / steppe
// Far east (6–7): desert
export function deriveBiome(col: number, row: number): Biome {
  if (col <= 1)  return 'isles';
  if (row === 0) return 'tundra';
  if (col >= 6)  return 'desert';
  if (col >= 4 && row >= 3) return 'steppe';
  return 'default';
}

/** Build the full province list for a new game (no ownership yet). */
export function buildProvinceGrid(): Omit<Province, 'ownerId' | 'isRevealed'>[] {
  const provinces: Omit<Province, 'ownerId' | 'isRevealed'>[] = [];
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const id = coordToId(col, row);
      const biome = deriveBiome(col, row);
      provinces.push({
        id,
        name: generateProvinceName(col, row, biome),
        biome,
        garrison: 0,
        fortLevel: 0,
        strategicValue: deriveStrategicValue(col, row),
        adjacentIds: getAdjacentIds(col, row),
      });
    }
  }
  return provinces;
}

function deriveStrategicValue(col: number, row: number): 1 | 2 | 3 {
  // Central provinces and corners are high value
  const isCentral = col >= 3 && col <= 4 && row >= 1 && row <= 3;
  const isCorner  = (col === 0 || col === MAP_COLS - 1) && (row === 0 || row === MAP_ROWS - 1);
  if (isCentral) return 3;
  if (isCorner)  return 2;
  return 1;
}

// Flavourful province names by biome
const NAMES: Record<Biome, string[]> = {
  default: [
    'Valdenmoor', 'Ironholt', 'Greyveil', 'Castreth', 'Dunwall',
    'Aldenmere', 'Thornfield', 'Ashford', 'Rindwick', 'Colspire',
  ],
  steppe: [
    'Kharvask', 'Durathaan', 'Orhun Plain', 'Temurak', 'Veldt of Kos',
  ],
  desert: [
    'Al-Qassar', 'Dune Keep', 'Sahrabad', 'Sunken Oasis', 'Scorchfield',
  ],
  isles: [
    'Dunmara', 'Stormhaven', 'Loch Anvar', 'Seacliff', 'Rockfall Isle',
  ],
  tundra: [
    'Frostmere', 'Icelund', 'Borealis Hold', 'Snowgate', 'Glaciermark',
  ],
};

const _nameCounters: Record<string, number> = {};

function generateProvinceName(col: number, row: number, biome: Biome): string {
  const key = biome;
  _nameCounters[key] = (_nameCounters[key] ?? 0);
  const pool = NAMES[biome];
  const name = pool[_nameCounters[key] % pool.length];
  _nameCounters[key]++;
  // Suffix to guarantee uniqueness when pool wraps
  const suffix = _nameCounters[key] > pool.length ? ` ${col}${row}` : '';
  return name + suffix;
}
