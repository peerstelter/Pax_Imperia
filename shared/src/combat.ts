import type { TroopType } from './types.js';

// Counter matrix: key beats all values in the array, loses to others
// Counter bonus: +25% attack damage when using a favored matchup
export const COUNTER_MATRIX: Record<TroopType, { beats: TroopType; losesTo: TroopType }> = {
  cavalry:        { beats: 'archers',        losesTo: 'polearms'       },
  polearms:       { beats: 'cavalry',        losesTo: 'heavy_infantry' },
  archers:        { beats: 'light_infantry', losesTo: 'cavalry'        },
  heavy_infantry: { beats: 'polearms',       losesTo: 'light_infantry' },
  light_infantry: { beats: 'heavy_infantry', losesTo: 'archers'        },
};

export const COUNTER_BONUS = 0.25; // +25% attack damage

export function getCounterBonus(attacker: TroopType, defender: TroopType): number {
  return COUNTER_MATRIX[attacker].beats === defender ? COUNTER_BONUS : 0;
}
