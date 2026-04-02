// Victory thresholds
export const WAR_VICTORY_PROVINCE_RATIO = 0.6;       // 60% of provinces
export const INTRIGUE_PUPPET_THRESHOLD = 75;          // shadow influence % to puppet a faction
export const DIPLOMACY_ELECTION_VOTES_NEEDED = 3;    // factions that must vote for player

// Opinion thresholds
export const OPINION_WAR_THRESHOLD = -50;
export const OPINION_ALLIANCE_THRESHOLD = 50;
export const OPINION_VASSALAGE_THRESHOLD = 80;

// Biome unit variants
export const BIOME_SPECIAL_UNITS: Record<string, { type: string; variant: string; biome: string }> = {
  steppe:  { type: 'cavalry',        variant: 'horse_archers',        biome: 'steppe'  },
  desert:  { type: 'light_infantry', variant: 'sabre_light_infantry', biome: 'desert'  },
  isles:   { type: 'polearms',       variant: 'lochaber_poleaxe',     biome: 'isles'   },
  tundra:  { type: 'cavalry',        variant: 'reindeer_cavalry',     biome: 'tundra'  },
};

// Siege weapons
export const SIEGE_WEAPONS = ['ram', 'catapult', 'siege_tower', 'ladders'] as const;
export type SiegeWeapon = typeof SIEGE_WEAPONS[number];
