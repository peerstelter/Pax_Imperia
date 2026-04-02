import type { Province } from '@pax-imperia/shared';

/**
 * Returns the province list with fog-of-war applied for the client.
 * Provinces where is_revealed=false have their sensitive data stripped.
 */
export function applyFogOfWar(provinces: Province[], _playerFactionId: string): Province[] {
  return provinces.map((p) => {
    if (p.isRevealed) return p;
    // Return a stub with no intelligence data
    return {
      ...p,
      garrison: 0,
      fortLevel: 0,
      ownerId: 'unknown',
    };
  });
}
