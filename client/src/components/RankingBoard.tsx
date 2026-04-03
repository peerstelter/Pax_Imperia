import type { Faction, Province } from '@pax-imperia/shared';

interface RankingBoardProps {
  factions: Faction[];
  provinces: Province[];
  playerFactionId: string;
  onClose: () => void;
}

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

export default function RankingBoard({ factions, provinces, playerFactionId, onClose }: RankingBoardProps) {
  const total = provinces.length;
  const warTarget = Math.ceil(total * 0.6);

  const rows = factions
    .filter((f) => f.id !== 'f_neutral')
    .map((f) => {
      const owned = provinces.filter((p) => p.ownerId === f.id).length;
      const garrison = provinces.filter((p) => p.ownerId === f.id).reduce((s, p) => s + p.garrison, 0);
      return { faction: f, owned, garrison };
    })
    .sort((a, b) => b.owned - a.owned || b.garrison - a.garrison);

  const leader = rows[0];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-[520px] max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: 'linear-gradient(160deg, #1c1410 0%, #0f0a06 100%)', border: '1px solid #78350f' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, #78350f 0%, #92400e 50%, #78350f 100%)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <h2 className="text-white font-black tracking-widest text-lg uppercase">Power Rankings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200 hover:text-white text-2xl leading-none font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Leader spotlight */}
        {leader && (
          <div
            className="mx-4 mt-4 mb-2 rounded-xl p-4 flex items-center gap-4"
            style={{
              background: `linear-gradient(135deg, ${leader.faction.color}33 0%, ${leader.faction.color}11 100%)`,
              border: `1px solid ${leader.faction.color}66`,
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black border-4 shrink-0"
              style={{ background: leader.faction.color, borderColor: `${leader.faction.color}88` }}
            >
              👑
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-0.5">Leading</p>
              <p className="text-white font-black text-lg truncate">
                {leader.faction.name}
                {leader.faction.id === playerFactionId && <span className="text-amber-300 text-sm ml-2">(you!)</span>}
              </p>
              <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((leader.owned / warTarget) * 100))}%`,
                    background: `linear-gradient(90deg, ${leader.faction.color}, ${leader.faction.color}cc)`,
                    boxShadow: `0 0 8px ${leader.faction.color}`,
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: `${leader.faction.color}cc` }}>
                {leader.owned} / {warTarget} provinces to victory
              </p>
            </div>
          </div>
        )}

        {/* Rows */}
        <div className="px-4 pb-4 flex flex-col gap-2">
          {rows.map((row, i) => {
            const isPlayer = row.faction.id === playerFactionId;
            const pct = total > 0 ? Math.round((row.owned / total) * 100) : 0;
            const isLeader = i === 0;

            return (
              <div
                key={row.faction.id}
                className="rounded-xl px-4 py-3 flex items-center gap-3 transition-all"
                style={{
                  background: isPlayer
                    ? `linear-gradient(135deg, ${row.faction.color}22, ${row.faction.color}08)`
                    : 'rgba(255,255,255,0.03)',
                  border: isPlayer
                    ? `1px solid ${row.faction.color}55`
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Rank badge */}
                <div className="w-8 text-center shrink-0">
                  {i < 3
                    ? <span className="text-xl">{RANK_MEDAL[i]}</span>
                    : <span className="text-stone-500 font-black text-sm">#{i + 1}</span>}
                </div>

                {/* Color dot */}
                <div
                  className="w-4 h-4 rounded-full shrink-0 shadow-lg"
                  style={{ background: row.faction.color, boxShadow: `0 0 6px ${row.faction.color}88` }}
                />

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`font-bold text-sm truncate ${isPlayer ? 'text-amber-300' : 'text-stone-100'}`}>
                      {row.faction.name}
                    </span>
                    {isPlayer && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: `${row.faction.color}33`, color: row.faction.color }}>
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: isLeader
                          ? `linear-gradient(90deg, ${row.faction.color}, #fbbf24)`
                          : row.faction.color,
                        boxShadow: isLeader ? `0 0 6px ${row.faction.color}` : undefined,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-white font-black text-base leading-none">{row.owned}</p>
                    <p className="text-stone-500 text-xs">provs</p>
                  </div>
                  <div>
                    <p className="text-amber-400 font-bold text-sm leading-none">{pct}%</p>
                    <p className="text-stone-500 text-xs">share</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span className="text-base">⚔️</span>
            <span>War victory: <span className="text-amber-400 font-bold">{warTarget}</span> of {total} provinces</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span className="text-base">🕵️</span>
            <span>Intrigue: puppet <span className="text-amber-400 font-bold">4+</span> factions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
