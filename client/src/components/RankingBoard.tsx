import type { Faction, Province } from '@pax-imperia/shared';

interface RankingBoardProps {
  factions: Faction[];
  provinces: Province[];
  playerFactionId: string;
  onClose: () => void;
}

export default function RankingBoard({ factions, provinces, playerFactionId, onClose }: RankingBoardProps) {
  const total = provinces.length;

  const rows = factions
    .filter((f) => f.id !== 'f_neutral')
    .map((f) => {
      const owned = provinces.filter((p) => p.ownerId === f.id).length;
      const garrison = provinces
        .filter((p) => p.ownerId === f.id)
        .reduce((sum, p) => sum + p.garrison, 0);
      return { faction: f, owned, garrison };
    })
    .sort((a, b) => b.owned - a.owned || b.garrison - a.garrison);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-stone-900 border border-stone-600 rounded-lg w-[480px] max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
          <h2 className="text-amber-400 font-bold tracking-widest text-sm uppercase">Rankings</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200 text-xl leading-none">×</button>
        </div>

        {/* Table */}
        <table className="w-full text-xs">
          <thead>
            <tr className="text-stone-500 uppercase tracking-wide border-b border-stone-700">
              <th className="text-left px-5 py-2 w-6">#</th>
              <th className="text-left px-2 py-2">Faction</th>
              <th className="text-right px-2 py-2">Provinces</th>
              <th className="text-right px-2 py-2">Share</th>
              <th className="text-right px-5 py-2">Garrison</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isPlayer = row.faction.id === playerFactionId;
              const pct = total > 0 ? Math.round((row.owned / total) * 100) : 0;
              return (
                <tr
                  key={row.faction.id}
                  className={`border-b border-stone-800 ${isPlayer ? 'bg-stone-800' : 'hover:bg-stone-800/50'}`}
                >
                  <td className="px-5 py-3 text-stone-500 font-bold">{i + 1}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: row.faction.color }}
                      />
                      <span className={isPlayer ? 'text-amber-300 font-bold' : 'text-stone-200'}>
                        {row.faction.name}
                      </span>
                      {isPlayer && <span className="text-stone-500 text-xs">(you)</span>}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1 h-1 bg-stone-700 rounded-full overflow-hidden w-36">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: row.faction.color }}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right text-stone-200 font-semibold">{row.owned}</td>
                  <td className="px-2 py-3 text-right text-stone-400">{pct}%</td>
                  <td className="px-5 py-3 text-right text-stone-400">{row.garrison.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="text-stone-600 text-xs text-center py-3">
          War victory: control 60% of {total} provinces ({Math.ceil(total * 0.6)} needed)
        </p>
      </div>
    </div>
  );
}
