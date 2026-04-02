import { MAP_COLS, MAP_ROWS, idToCoord } from '@pax-imperia/shared';
import type { Province, Faction } from '@pax-imperia/shared';
import ProvinceCell from './ProvinceCell.js';

interface ProvinceMapProps {
  provinces: Province[];
  factions: Faction[];
  selectedProvinceId: string | null;
  onSelectProvince: (id: string) => void;
  cellSize?: number;
}

export default function ProvinceMap({
  provinces,
  factions,
  selectedProvinceId,
  onSelectProvince,
  cellSize = 90,
}: ProvinceMapProps) {
  const width  = MAP_COLS * cellSize;
  const height = MAP_ROWS * cellSize;

  const factionMap = new Map(factions.map((f) => [f.id, f]));

  return (
    <div className="overflow-auto border border-stone-700 rounded">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: '#0e0e0e', display: 'block' }}
      >
        {provinces.map((province) => {
          const { col, row } = idToCoord(province.id);
          return (
            <ProvinceCell
              key={province.id}
              province={province}
              faction={factionMap.get(province.ownerId)}
              cellSize={cellSize}
              col={col}
              row={row}
              isSelected={province.id === selectedProvinceId}
              onClick={onSelectProvince}
            />
          );
        })}
      </svg>
    </div>
  );
}
