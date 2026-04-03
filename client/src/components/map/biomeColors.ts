import type { Biome } from '@pax-imperia/shared';

export const BIOME_FILL: Record<Biome, string> = {
  default: '#6b7c52',  // muted green
  steppe:  '#c8a84b',  // golden yellow
  desert:  '#d4a55a',  // warm sand
  isles:   '#4a7c8c',  // sea blue-grey
  tundra:  '#8ba8b8',  // icy blue
};

export const BIOME_STROKE: Record<Biome, string> = {
  default: '#4a5a38',
  steppe:  '#8a6c2a',
  desert:  '#9a6c3a',
  isles:   '#2a5c6a',
  tundra:  '#5a7888',
};

export const BIOME_ICON: Record<Biome, string> = {
  default: '🌿',
  steppe:  '🌾',
  desert:  '🏜️',
  isles:   '⛵',
  tundra:  '❄️',
};
