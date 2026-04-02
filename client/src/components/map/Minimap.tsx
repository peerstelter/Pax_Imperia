import { MAP_COLS, MAP_ROWS, idToCoord } from '@pax-imperia/shared';
import type { Province, Faction } from '@pax-imperia/shared';
import { BIOME_FILL } from './biomeColors.js';

interface MinimapProps {
  provinces: Province[];
  factions: Faction[];
  selectedProvinceId: string | null;
  onSelectProvince: (id: string) => void;
  /** Cell size in pixels — keep small for overview */
  cellSize?: number;
}

export default function Minimap({
  provinces,
  factions,
  selectedProvinceId,
  onSelectProvince,
  cellSize = 18,
}: MinimapProps) {
  const width  = MAP_COLS * cellSize;
  const height = MAP_ROWS * cellSize;

  const factionMap = new Map(factions.map((f) => [f.id, f]));

  return (
    <div className="border border-stone-700 rounded overflow-hidden" title="Minimap overview">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: '#0e0e0e', display: 'block', cursor: 'pointer' }}
      >
        {provinces.map((province) => {
          const { col, row } = idToCoord(province.id);
          const x = col * cellSize;
          const y = row * cellSize;
          const isSelected = province.id === selectedProvinceId;

          const fill = province.isRevealed
            ? (factionMap.get(province.ownerId)?.color ?? BIOME_FILL[province.biome])
            : '#1a1a1a';

          return (
            <rect
              key={province.id}
              x={x + 1}
              y={y + 1}
              width={cellSize - 2}
              height={cellSize - 2}
              fill={fill}
              stroke={isSelected ? '#f5e6c8' : 'transparent'}
              strokeWidth={isSelected ? 2 : 0}
              opacity={province.isRevealed ? 0.85 : 0.3}
              onClick={() => province.isRevealed && onSelectProvince(province.id)}
            />
          );
        })}
      </svg>
    </div>
  );
}
