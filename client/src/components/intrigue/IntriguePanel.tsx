import { useState } from 'react';
import type { Faction } from '@pax-imperia/shared';

type IntrigueActionType = 'spy' | 'assassinate' | 'sabotage' | 'bribe' | 'propaganda' | 'blackmail';

const ACTION_META: Record<IntrigueActionType, { label: string; base: number; desc: string; color: string }> = {
  spy:        { label: 'Spy',         base: 0.70, desc: 'Reveal enemy troop strength, resources, and active ops',   color: 'blue'   },
  assassinate:{ label: 'Assassinate', base: 0.30, desc: 'Eliminate an enemy commander (high risk)',                  color: 'red'    },
  sabotage:   { label: 'Sabotage',    base: 0.50, desc: 'Damage fort level in target province',                      color: 'orange' },
  bribe:      { label: 'Bribe',       base: 0.50, desc: 'Turn an enemy commander to your side',                      color: 'amber'  },
  propaganda: { label: 'Propaganda',  base: 0.60, desc: 'Cause unrest: garrison -100 in target province',            color: 'purple' },
  blackmail:  { label: 'Blackmail',   base: 0.40, desc: 'Force tribute + shadow influence; lasting opinion penalty',  color: 'rose'   },
};

interface NetworkInfo {
  provinceId: string;
  agents: number;
  strength: number;
}

interface ShadowInfo {
  targetFactionId: string;
  influence: number;
  isPuppet: boolean;
}

interface IntriguePanelProps {
  playerFaction: Faction;
  factions: Faction[];
  networks: NetworkInfo[];
  shadow: ShadowInfo[];
  onQueueAction: (type: IntrigueActionType, targetFactionId: string, targetProvinceId?: string) => void;
  onBuildNetwork: (provinceId: string) => void;
  onClose: () => void;
}

export default function IntriguePanel({
  playerFaction,
  factions,
  networks,
  shadow,
  onQueueAction,
  onBuildNetwork,
  onClose,
}: IntriguePanelProps) {
  const [selectedAction, setSelectedAction] = useState<IntrigueActionType>('spy');
  const [targetFactionId, setTargetFactionId] = useState(factions.find((f) => !f.isPlayer)?.id ?? '');
  const [targetProvinceId, setTargetProvinceId] = useState('');

  const others = factions.filter((f) => !f.isPlayer);
  const meta = ACTION_META[selectedAction];
  const networkBonus = networks.reduce((sum, n) => sum + n.agents * 0.1, 0);
  const effectiveChance = Math.min(0.95, meta.base + networkBonus);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 border border-stone-600 rounded w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-700">
          <h2 className="text-purple-400 font-bold text-lg">Intrigue</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200 text-xl">×</button>
        </div>

        <div className="p-4 space-y-5">
          {/* Shadow influence bars */}
          <section>
            <h3 className="text-stone-400 text-xs uppercase tracking-widest mb-2">Shadow Influence</h3>
            <div className="space-y-1">
              {shadow.map((s) => {
                const faction = factions.find((f) => f.id === s.targetFactionId);
                return (
                  <div key={s.targetFactionId} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-stone-600 shrink-0"
                      style={{ background: faction?.color ?? '#7f8c8d' }}
                    />
                    <span className="text-stone-300 w-28 truncate">{faction?.name ?? s.targetFactionId}</span>
                    <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.influence >= 75 ? 'bg-purple-500' : 'bg-purple-800'}`}
                        style={{ width: `${s.influence}%` }}
                      />
                    </div>
                    <span className="text-stone-400 w-8 text-right">{s.influence}%</span>
                    {s.isPuppet && <span className="text-purple-400 font-bold text-xs">PUPPET</span>}
                  </div>
                );
              })}
              {shadow.length === 0 && <p className="text-stone-600 text-xs italic">No shadow influence yet</p>}
            </div>
          </section>

          {/* Spy networks */}
          <section>
            <h3 className="text-stone-400 text-xs uppercase tracking-widest mb-2">Active Networks</h3>
            {networks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {networks.map((n) => (
                  <div key={n.provinceId} className="bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs">
                    <div className="text-stone-300 font-semibold">{n.provinceId}</div>
                    <div className="text-stone-500">Agents: {n.agents} · Strength: {n.strength}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-600 text-xs italic">No networks established</p>
            )}
          </section>

          {/* Action queue */}
          <section>
            <h3 className="text-stone-400 text-xs uppercase tracking-widest mb-2">Queue Action</h3>

            {/* Action type selector */}
            <div className="flex flex-wrap gap-1 mb-3">
              {(Object.keys(ACTION_META) as IntrigueActionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedAction(type)}
                  className={`px-2 py-1 rounded text-xs border transition-colors
                    ${selectedAction === type
                      ? 'border-purple-500 bg-purple-900 text-purple-200'
                      : 'border-stone-600 bg-stone-800 text-stone-400 hover:border-stone-500'}`}
                >
                  {ACTION_META[type].label}
                </button>
              ))}
            </div>

            {/* Description & risk */}
            <div className="bg-stone-800 border border-stone-700 rounded p-3 mb-3 text-xs">
              <p className="text-stone-300 mb-2">{meta.desc}</p>
              <div className="flex gap-4">
                <div>
                  <span className="text-stone-500">Base chance: </span>
                  <span className="text-stone-200">{(meta.base * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-stone-500">Network bonus: </span>
                  <span className="text-green-400">+{(networkBonus * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-stone-500">Effective: </span>
                  <span className={effectiveChance >= 0.7 ? 'text-green-400' : effectiveChance >= 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                    {(effectiveChance * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">Discovery: </span>
                  <span className="text-red-400">{(effectiveChance * 10).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Target selectors */}
            <div className="flex gap-2 mb-3">
              <select
                value={targetFactionId}
                onChange={(e) => setTargetFactionId(e.target.value)}
                className="flex-1 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs text-stone-200"
              >
                {others.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {['sabotage', 'propaganda'].includes(selectedAction) && (
                <input
                  type="text"
                  placeholder="Province ID (e.g. p3_2)"
                  value={targetProvinceId}
                  onChange={(e) => setTargetProvinceId(e.target.value)}
                  className="flex-1 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs text-stone-200 placeholder-stone-600"
                />
              )}
            </div>

            <button
              onClick={() => {
                onQueueAction(selectedAction, targetFactionId, targetProvinceId || undefined);
                setTargetProvinceId('');
              }}
              disabled={!targetFactionId}
              className="w-full py-2 bg-purple-800 hover:bg-purple-700 border border-purple-600 rounded text-xs text-purple-200 font-bold disabled:opacity-40"
            >
              Queue {meta.label} (resolves next turn)
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
