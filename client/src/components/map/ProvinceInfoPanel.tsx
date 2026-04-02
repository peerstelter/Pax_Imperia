import type { Province, Faction } from '@pax-imperia/shared';

interface ProvinceInfoPanelProps {
  province: Province;
  faction: Faction | undefined;
  onClose: () => void;
}

const BIOME_LABEL: Record<string, string> = {
  default: 'Lowlands',
  steppe:  'Steppe',
  desert:  'Desert',
  isles:   'Isles',
  tundra:  'Tundra',
};

export default function ProvinceInfoPanel({ province, faction, onClose }: ProvinceInfoPanelProps) {
  return (
    <aside className="w-72 bg-stone-800 border border-stone-600 rounded p-4 flex flex-col gap-3 text-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-amber-400 font-bold text-base">{province.name}</h2>
          <p className="text-stone-400 text-xs">{BIOME_LABEL[province.biome]} · ID: {province.id}</p>
        </div>
        <button
          onClick={onClose}
          className="text-stone-500 hover:text-stone-200 text-lg leading-none"
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      <hr className="border-stone-600" />

      {/* Owner */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 rounded-full border border-stone-500"
          style={{ background: faction?.color ?? '#7f8c8d' }}
        />
        <span className="text-stone-300">
          Owner: <span className="text-stone-100 font-medium">{faction?.name ?? 'Unclaimed'}</span>
        </span>
      </div>

      {/* Stats */}
      <ul className="space-y-1 text-stone-300">
        <li>
          <span className="text-stone-500 mr-1">Garrison:</span>
          <span className="text-stone-100">{province.garrison.toLocaleString()} troops</span>
        </li>
        <li>
          <span className="text-stone-500 mr-1">Fort Level:</span>
          <span className="text-stone-100">
            {province.fortLevel === 0 ? 'None' : '🏰'.repeat(province.fortLevel)}
          </span>
        </li>
        <li>
          <span className="text-stone-500 mr-1">Strategic Value:</span>
          <span className="text-stone-100">
            {'★'.repeat(province.strategicValue)}{'☆'.repeat(3 - province.strategicValue)}
          </span>
        </li>
        <li>
          <span className="text-stone-500 mr-1">Biome:</span>
          <span className="text-stone-100">{BIOME_LABEL[province.biome]}</span>
        </li>
      </ul>

      {/* Adjacent provinces */}
      {province.adjacentIds.length > 0 && (
        <>
          <hr className="border-stone-600" />
          <div>
            <p className="text-stone-500 text-xs mb-1">Adjacent Provinces</p>
            <div className="flex flex-wrap gap-1">
              {province.adjacentIds.map((adjId) => (
                <span key={adjId} className="px-2 py-0.5 bg-stone-700 rounded text-xs text-stone-300">
                  {adjId}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Diplomatic status placeholder */}
      <hr className="border-stone-600" />
      <p className="text-stone-500 text-xs italic">
        Diplomacy & intrigue status available in Phase 3–4.
      </p>
    </aside>
  );
}
