import { useRef } from 'react';
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

  // Touch pinch-to-zoom state
  const touchRef = useRef<{ dist: number; scale: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current = { dist: Math.sqrt(dx * dx + dy * dy), scale: 1 };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && touchRef.current && containerRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.min(2, Math.max(0.5, dist / touchRef.current.dist));
      containerRef.current.style.transform = `scale(${newScale})`;
      containerRef.current.style.transformOrigin = 'top left';
      touchRef.current.scale = newScale;
    }
  }

  function handleTouchEnd() {
    touchRef.current = null;
  }

  return (
    <div
      className="overflow-auto border border-stone-700 rounded flex-1 touch-pan-x touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={containerRef} style={{ display: 'inline-block' }}>
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
    </div>
  );
}
