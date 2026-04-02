import { useState } from 'react';
import { buildProvinceGrid } from '@pax-imperia/shared';
import type { Faction } from '@pax-imperia/shared';
import ProvinceMap from '../components/map/ProvinceMap.js';

// Available starting factions (mirrors server seeder)
const SELECTABLE_FACTIONS: Pick<Faction, 'id' | 'name' | 'color' | 'personality'>[] = [
  { id: 'f_valden',   name: 'Valdenmarch',   color: '#c0392b', personality: 'aggressive'   },
  { id: 'f_khos',     name: 'Khos Horde',    color: '#e67e22', personality: 'aggressive'   },
  { id: 'f_dunmara',  name: 'Dunmara Reach', color: '#2980b9', personality: 'isolationist' },
  { id: 'f_solaris',  name: 'Solaris Pact',  color: '#f1c40f', personality: 'merchant'     },
  { id: 'f_ironveil', name: 'Ironveil',       color: '#8e44ad', personality: 'expansionist' },
  { id: 'f_ashen',    name: 'Ashen Crown',   color: '#27ae60', personality: 'expansionist' },
];

type Difficulty = 'easy' | 'normal' | 'hard';

interface MenuPageProps {
  onStart: (gameId: string, playerFactionId: string) => void;
}

export default function MenuPage({ onStart }: MenuPageProps) {
  const [selectedFactionId, setSelectedFactionId] = useState('f_valden');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewProvinces = buildProvinceGrid().map((p) => ({
    ...p,
    ownerId: 'neutral',
    isRevealed: true,
  }));

  const previewFactions = SELECTABLE_FACTIONS.map((f) => ({
    ...f,
    gold: 0, food: 0, manpower: 0, isPlayer: f.id === selectedFactionId, shadowInfluence: {},
  }));

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerFactionId: selectedFactionId, difficulty }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { id: string };
      onStart(data.id, selectedFactionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start game');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone-900 text-stone-100">
      {/* Title */}
      <header className="flex flex-col items-center py-10 gap-2">
        <h1 className="text-6xl font-bold tracking-widest text-amber-400 drop-shadow-lg">PAX IMPERIA</h1>
        <p className="text-stone-400 italic text-sm">There is no peace, only the illusion of it.</p>
      </header>

      <div className="flex flex-1 gap-6 px-8 pb-8">
        {/* Map preview */}
        <div className="flex-1 rounded border border-stone-700 overflow-hidden opacity-70">
          <ProvinceMap
            provinces={previewProvinces}
            factions={previewFactions}
            selectedProvinceId={null}
            onSelectProvince={() => {}}
            cellSize={72}
          />
        </div>

        {/* Config panel */}
        <div className="w-80 flex flex-col gap-6">
          {/* Faction selection */}
          <div>
            <h2 className="text-amber-400 font-bold mb-3 text-sm uppercase tracking-widest">Choose Your Realm</h2>
            <div className="space-y-2">
              {SELECTABLE_FACTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFactionId(f.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded border transition-colors text-left
                    ${selectedFactionId === f.id
                      ? 'border-amber-500 bg-stone-700'
                      : 'border-stone-700 bg-stone-800 hover:border-stone-500'}`}
                >
                  <span className="w-4 h-4 rounded-full border border-stone-500 shrink-0" style={{ background: f.color }} />
                  <div>
                    <div className="text-stone-100 font-semibold text-sm">{f.name}</div>
                    <div className="text-stone-500 text-xs capitalize">{f.personality}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <h2 className="text-amber-400 font-bold mb-3 text-sm uppercase tracking-widest">Difficulty</h2>
            <div className="flex gap-2">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded border text-xs font-bold uppercase transition-colors
                    ${difficulty === d
                      ? 'border-amber-500 bg-amber-900 text-amber-300'
                      : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-500'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleStart}
            disabled={loading}
            className="mt-auto py-3 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed
              text-white rounded border border-amber-500 font-bold tracking-wide transition-colors"
          >
            {loading ? 'Starting…' : 'Begin Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
