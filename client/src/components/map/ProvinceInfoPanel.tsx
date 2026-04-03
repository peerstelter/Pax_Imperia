import type { Province, Faction, DiplomaticRelation } from '@pax-imperia/shared';
import { BIOME_ICON } from './biomeColors.js';

interface ProvinceInfoPanelProps {
  province: Province;
  faction: Faction | undefined;
  playerFaction?: Faction;
  relations?: DiplomaticRelation[];
  allProvinces?: Province[];
  onClose: () => void;
}

const BIOME_LABEL: Record<string, string> = {
  default: 'Lowlands',
  steppe:  'Steppe',
  desert:  'Desert',
  isles:   'Isles',
  tundra:  'Tundra',
};

const BIOME_ECONOMY: Record<string, string> = {
  default: '+20 gold, +15 food',
  steppe:  '+15 gold, +10 food (horse archers)',
  desert:  '+25 gold, +8 food (trade routes)',
  isles:   '+30 gold, +12 food (fishing)',
  tundra:  '+12 gold, +8 food (harsh climate)',
};

const TREATY_LABEL: Record<string, string> = {
  alliance:       'Alliance',
  marriage:       'Marriage',
  trade:          'Trade',
  vassalage:      'Vassal',
  non_aggression: 'NAP',
};

export default function ProvinceInfoPanel({
  province,
  faction,
  playerFaction,
  relations = [],
  allProvinces = [],
  onClose,
}: ProvinceInfoPanelProps) {
  const provinceNameMap = new Map(allProvinces.map((p) => [p.id, p.name]));
  // Diplomatic status between player and province owner
  const dipRelation = playerFaction && faction && faction.id !== playerFaction.id
    ? (() => {
        const [a, b] = [playerFaction.id, faction.id].sort();
        return relations.find((r) => r.factionA === a && r.factionB === b);
      })()
    : undefined;

  const isPlayerOwned = playerFaction && faction?.id === playerFaction.id;

  return (
    <aside className="w-72 rounded-xl p-4 flex flex-col gap-3 text-sm overflow-y-auto max-h-full" style={{ background: 'linear-gradient(160deg, #1e1a14 0%, #12100d 100%)', border: '1px solid #78350f' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-amber-400 font-bold text-base">{province.name}</h2>
          <p className="text-stone-400 text-xs">{BIOME_ICON[province.biome]} {BIOME_LABEL[province.biome]}</p>
        </div>
        <button
          onClick={onClose}
          className="text-stone-500 hover:text-stone-200 text-lg leading-none"
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      <hr className="border-stone-700/50" />

      {/* Owner */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 rounded-full border border-stone-500 shrink-0"
          style={{ background: faction?.color ?? '#7f8c8d' }}
        />
        <span className="text-stone-300 text-xs">
          <span className="text-stone-500 mr-1">Owner:</span>
          <span className="text-stone-100 font-medium">{faction?.name ?? 'Unclaimed'}</span>
          {faction && <span className="text-stone-500 ml-1 capitalize">({faction.personality})</span>}
        </span>
      </div>

      {/* Garrison & fortification */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg p-2 bg-stone-800 border border-stone-700/50">
          <div className="text-stone-500 mb-0.5 text-xs uppercase tracking-wide">Garrison</div>
          <div className="text-stone-100 font-semibold">{province.garrison.toLocaleString()} troops</div>
        </div>
        <div className="rounded-lg p-2 bg-stone-800 border border-stone-700/50">
          <div className="text-stone-500 mb-0.5 text-xs uppercase tracking-wide">Fort Level</div>
          <div className="text-stone-100 font-semibold">
            {province.fortLevel === 0 ? 'None' : `Level ${province.fortLevel}`}
          </div>
        </div>
        <div className="rounded-lg p-2 bg-stone-800 border border-stone-700/50">
          <div className="text-stone-500 mb-0.5 text-xs uppercase tracking-wide">Strategic Value</div>
          <div className="text-amber-300 font-semibold">{'★'.repeat(province.strategicValue)}{'☆'.repeat(3 - province.strategicValue)}</div>
        </div>
        <div className="rounded-lg p-2 bg-stone-800 border border-stone-700/50">
          <div className="text-stone-500 mb-0.5 text-xs uppercase tracking-wide">Visibility</div>
          <div className={province.isRevealed ? 'text-green-400' : 'text-red-400'}>
            {province.isRevealed ? 'Revealed' : 'Hidden'}
          </div>
        </div>
      </div>

      {/* Economy */}
      <div>
        <p className="text-stone-500 text-xs mb-1 uppercase tracking-wide">💰 Economy</p>
        <p className="text-stone-300 text-xs">{BIOME_ECONOMY[province.biome]}</p>
        {isPlayerOwned && (
          <p className="text-green-400 text-xs mt-1">Your province — collecting resources each turn</p>
        )}
      </div>

      {/* Diplomatic status */}
      {dipRelation && (
        <>
          <hr className="border-stone-700/50" />
          <div>
            <p className="text-stone-500 text-xs mb-1 uppercase tracking-wide">🤝 Relations</p>
            <div className="flex items-center gap-2 text-xs mb-1">
              <span className="text-stone-400">Opinion:</span>
              <span className={
                dipRelation.opinion >= 50 ? 'text-green-400 font-bold' :
                dipRelation.opinion <= -50 ? 'text-red-400 font-bold' :
                'text-stone-200'
              }>
                {dipRelation.opinion > 0 ? '+' : ''}{dipRelation.opinion}
              </span>
            </div>
            {dipRelation.treaties.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {dipRelation.treaties.map((t) => (
                  <span key={t} className="px-1.5 py-0.5 bg-stone-600 text-stone-300 rounded text-xs">
                    {TREATY_LABEL[t] ?? t}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-stone-600 text-xs italic">No active treaties</span>
            )}
          </div>
        </>
      )}

      {/* Adjacent */}
      {province.adjacentIds.length > 0 && (
        <>
          <hr className="border-stone-700/50" />
          <div>
            <p className="text-stone-500 text-xs mb-1 uppercase tracking-wide">🗺️ Adjacent</p>
            <div className="flex flex-wrap gap-1">
              {province.adjacentIds.map((adjId) => (
                <span key={adjId} className="px-1.5 py-0.5 bg-stone-700 rounded text-xs text-stone-400">
                  {provinceNameMap.get(adjId) ?? adjId}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
