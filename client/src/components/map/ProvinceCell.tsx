import type { Province, Faction } from '@pax-imperia/shared';
import { BIOME_FILL, BIOME_STROKE, BIOME_ICON } from './biomeColors.js';

interface ProvinceCellProps {
  province: Province;
  faction: Faction | undefined;
  cellSize: number;
  col: number;
  row: number;
  isSelected: boolean;
  onClick: (provinceId: string) => void;
}

function darken(hex: string, amount = 40): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

export default function ProvinceCell({
  province, faction, cellSize, col, row, isSelected, onClick,
}: ProvinceCellProps) {
  const x = col * cellSize;
  const y = row * cellSize;
  const pad = 3;
  const gradId = `grad-${province.id}`;
  const glowId = `glow-${province.id}`;

  const baseColor = province.isRevealed
    ? (faction?.color ?? BIOME_FILL[province.biome])
    : '#1a1a1a';

  const stroke = isSelected ? '#fbbf24' : BIOME_STROKE[province.biome];
  const strokeWidth = isSelected ? 2.5 : 1;

  return (
    <g
      onClick={() => province.isRevealed && onClick(province.id)}
      style={{ cursor: province.isRevealed ? 'pointer' : 'default' }}
    >
      <defs>
        {province.isRevealed && (
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={baseColor} stopOpacity="1" />
            <stop offset="100%" stopColor={darken(baseColor, 50)} stopOpacity="1" />
          </linearGradient>
        )}
        {isSelected && (
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        )}
      </defs>

      {/* Cell background */}
      <rect
        x={x + pad}
        y={y + pad}
        width={cellSize - pad * 2}
        height={cellSize - pad * 2}
        fill={province.isRevealed ? `url(#${gradId})` : '#111111'}
        stroke={stroke}
        strokeWidth={strokeWidth}
        rx={6}
        opacity={province.isRevealed ? 1 : 0.5}
        filter={isSelected ? `url(#${glowId})` : undefined}
      />

      {/* Fog cross-hatch */}
      {!province.isRevealed && (
        <>
          <line x1={x+pad} y1={y+pad} x2={x+cellSize-pad} y2={y+cellSize-pad} stroke="#2a2a2a" strokeWidth={1} />
          <line x1={x+cellSize-pad} y1={y+pad} x2={x+pad} y2={y+cellSize-pad} stroke="#2a2a2a" strokeWidth={1} />
          <text x={x+cellSize/2} y={y+cellSize/2+5} textAnchor="middle" fontSize={20} opacity={0.15} style={{pointerEvents:'none',userSelect:'none'}}>?</text>
        </>
      )}

      {/* Selected glow ring */}
      {isSelected && (
        <rect
          x={x + pad - 1} y={y + pad - 1}
          width={cellSize - pad * 2 + 2} height={cellSize - pad * 2 + 2}
          fill="none" stroke="#fbbf24" strokeWidth={2} rx={7} opacity={0.6}
        />
      )}

      {province.isRevealed && (
        <>
          {/* Biome icon top-right */}
          <text
            x={x + cellSize - 10} y={y + 16}
            textAnchor="middle" fontSize={12}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
            opacity={0.7}
          >
            {BIOME_ICON[province.biome]}
          </text>

          {/* Province name */}
          <text
            x={x + cellSize / 2}
            y={y + cellSize / 2 - 5}
            textAnchor="middle"
            fontSize={cellSize > 80 ? 11 : 9}
            fontWeight="bold"
            fill="#fff"
            style={{ pointerEvents: 'none', userSelect: 'none', textShadow: '0 1px 3px #000' }}
            filter="url(#textShadow)"
          >
            {province.name.split(' ')[0]}
          </text>

          {/* Garrison */}
          {province.garrison > 0 && (
            <text
              x={x + cellSize / 2}
              y={y + cellSize / 2 + 10}
              textAnchor="middle"
              fontSize={9}
              fill="#fde68a"
              opacity={0.9}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              ⚔ {province.garrison}
            </text>
          )}

          {/* Fort */}
          {province.fortLevel > 0 && (
            <text
              x={x + 12} y={y + cellSize - 8}
              textAnchor="middle" fontSize={10}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {'🏰'.repeat(Math.min(province.fortLevel, 3))}
            </text>
          )}

          {/* Strategic value dots */}
          {[1,2,3].map((v) => (
            <circle
              key={v}
              cx={x + cellSize - 8 - (3 - v) * 8}
              cy={y + cellSize - 8}
              r={3}
              fill={v <= province.strategicValue ? '#fbbf24' : '#374151'}
              stroke="#111" strokeWidth={0.5}
            />
          ))}
        </>
      )}
    </g>
  );
}
