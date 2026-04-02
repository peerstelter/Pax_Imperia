import { useState, useCallback } from 'react';
import type { Faction, Province } from '@pax-imperia/shared';

/**
 * Minimal in-memory game store for Phase 1.
 * Full Zustand/context store wired to API comes in Task 13 (save/load).
 */
export interface GameStore {
  gameId: string | null;
  turn: number;
  playerFactionId: string | null;
  factions: Faction[];
  provinces: Province[];
  setGame: (gameId: string, playerFactionId: string, factions: Faction[], provinces: Province[]) => void;
  updateFaction: (factionId: string, patch: Partial<Faction>) => void;
  updateProvince: (provinceId: string, patch: Partial<Province>) => void;
  advanceTurn: () => void;
}

export function useGameStore(): GameStore {
  const [gameId, setGameId] = useState<string | null>(null);
  const [turn, setTurn] = useState(1);
  const [playerFactionId, setPlayerFactionId] = useState<string | null>(null);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);

  const setGame = useCallback(
    (gid: string, pfid: string, f: Faction[], p: Province[]) => {
      setGameId(gid);
      setPlayerFactionId(pfid);
      setFactions(f);
      setProvinces(p);
      setTurn(1);
    },
    [],
  );

  const updateFaction = useCallback((factionId: string, patch: Partial<Faction>) => {
    setFactions((prev) =>
      prev.map((f) => (f.id === factionId ? { ...f, ...patch } : f)),
    );
  }, []);

  const updateProvince = useCallback((provinceId: string, patch: Partial<Province>) => {
    setProvinces((prev) =>
      prev.map((p) => (p.id === provinceId ? { ...p, ...patch } : p)),
    );
  }, []);

  const advanceTurn = useCallback(() => setTurn((t) => t + 1), []);

  return {
    gameId,
    turn,
    playerFactionId,
    factions,
    provinces,
    setGame,
    updateFaction,
    updateProvince,
    advanceTurn,
  };
}
