import type { Province, Faction } from '@pax-imperia/shared';
import { BIOME_FILL, BIOME_STROKE } from './biomeColors.js';

interface ProvinceCellProps {
  province: Province;
  faction: Faction | undefined;
  cellSize: number;
  col: number;
  row: number;
  isSelected: boolean;
  onClick: (provinceId: string) => void;
}

export default function ProvinceCell({
  province,
  faction,
  cellSize,
  col,
  row,
  isSelected,
  onClick,
}: ProvinceCellProps) {
  const x = col * cellSize;
  const y = row * cellSize;
  const pad = 2;

  // Owner color tints the fill; biome color is fallback
  const fill = province.isRevealed
    ? (faction?.color ?? BIOME_FILL[province.biome])
    : '#1a1a1a';

  const stroke = isSelected ? '#f5e6c8' : BIOME_STROKE[province.biome];
  const strokeWidth = isSelected ? 3 : 1;

  return (
    <g
      onClick={() => province.isRevealed && onClick(province.id)}
      style={{ cursor: province.isRevealed ? 'pointer' : 'default' }}
    >
      <rect
        x={x + pad}
        y={y + pad}
        width={cellSize - pad * 2}
        height={cellSize - pad * 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        rx={4}
        opacity={province.isRevealed ? 1 : 0.4}
      />
      {province.isRevealed && (
        <>
          {/* Province name */}
          <text
            x={x + cellSize / 2}
            y={y + cellSize / 2 - 4}
            textAnchor="middle"
            fontSize={cellSize > 80 ? 11 : 9}
            fill="#f5e6c8"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {province.name.split(' ')[0]}
          </text>
          {/* Garrison count */}
          {province.garrison > 0 && (
            <text
              x={x + cellSize / 2}
              y={y + cellSize / 2 + 10}
              textAnchor="middle"
              fontSize={8}
              fill="#f5e6c8"
              opacity={0.8}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              ⚔ {province.garrison}
            </text>
          )}
          {/* Fort indicator */}
          {province.fortLevel > 0 && (
            <text
              x={x + cellSize - 10}
              y={y + 14}
              textAnchor="middle"
              fontSize={10}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {'🏰'.repeat(Math.min(province.fortLevel, 3))}
            </text>
          )}
          {/* Strategic value dot */}
          {province.strategicValue === 3 && (
            <circle
              cx={x + 10}
              cy={y + 10}
              r={4}
              fill="#c9a84c"
              stroke="#8a6c2a"
              strokeWidth={1}
            />
          )}
        </>
      )}
    </g>
  );
}
