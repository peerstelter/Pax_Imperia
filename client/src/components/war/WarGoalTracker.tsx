import type { Province, Faction } from '@pax-imperia/shared';
import { WAR_VICTORY_PROVINCE_RATIO } from '@pax-imperia/shared';

interface WarGoalTrackerProps {
  provinces: Province[];
  factions: Faction[];
  playerFactionId: string;
}

interface FactionStats {
  id: string;
  name: string;
  color: string;
  count: number;
  pct: number;
  isPlayer: boolean;
}

export default function WarGoalTracker({ provinces, factions, playerFactionId }: WarGoalTrackerProps) {
  const total = provinces.length;
  const threshold = Math.ceil(total * WAR_VICTORY_PROVINCE_RATIO);

  const countMap: Record<string, number> = {};
  for (const p of provinces) {
    countMap[p.ownerId] = (countMap[p.ownerId] ?? 0) + 1;
  }

  const stats: FactionStats[] = factions
    .map((f) => ({
      id:       f.id,
      name:     f.name,
      color:    f.color,
      count:    countMap[f.id] ?? 0,
      pct:      ((countMap[f.id] ?? 0) / total) * 100,
      isPlayer: f.id === playerFactionId,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="bg-stone-800 border border-stone-600 rounded p-3 w-64 text-sm">
      <h3 className="text-amber-400 font-bold text-sm mb-1">War Goal Progress</h3>
      <p className="text-stone-500 text-xs mb-3">
        Control {threshold}/{total} provinces ({Math.round(WAR_VICTORY_PROVINCE_RATIO * 100)}%) to win by conquest
      </p>

      <div className="space-y-2">
        {stats.map((s) => (
          <div key={s.id}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className={s.isPlayer ? 'text-stone-100 font-semibold' : 'text-stone-400'}>
                {s.name}
              </span>
              <span className={s.isPlayer ? 'text-amber-400' : 'text-stone-500'}>
                {s.count} / {threshold}
                {s.count >= threshold && ' ✓'}
              </span>
            </div>
            <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, s.pct)}%`,
                  background: s.color,
                  opacity: s.isPlayer ? 1 : 0.6,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Victory threshold line marker */}
      <div className="mt-3 text-xs text-stone-500 border-t border-stone-700 pt-2">
        Victory threshold: {Math.round(WAR_VICTORY_PROVINCE_RATIO * 100)}% ({threshold} provinces)
      </div>
    </div>
  );
}
