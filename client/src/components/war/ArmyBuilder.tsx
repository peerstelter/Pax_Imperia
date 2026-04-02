import { useState } from 'react';
import type { Unit, Formation } from '@pax-imperia/shared';
import { FORMATION_MODIFIERS, moveUnit, totalTroops } from '@pax-imperia/shared';
import type { FormationSlot } from '@pax-imperia/shared';

interface ArmyBuilderProps {
  formation: Formation;
  onChange: (formation: Formation) => void;
}

const SLOT_LABELS: Record<FormationSlot, string> = {
  frontLine:  'Front Line',
  secondRank: 'Second Rank',
  flanks:     'Flanks',
};

const SLOT_COLORS: Record<FormationSlot, string> = {
  frontLine:  'border-red-700 bg-red-950/40',
  secondRank: 'border-stone-600 bg-stone-800/40',
  flanks:     'border-amber-700 bg-amber-950/40',
};

export default function ArmyBuilder({ formation, onChange }: ArmyBuilderProps) {
  const [dragging, setDragging] = useState<{ unit: Unit; from: FormationSlot } | null>(null);

  function handleDrop(to: FormationSlot) {
    if (!dragging || dragging.from === to) { setDragging(null); return; }
    onChange(moveUnit(formation, dragging.unit, dragging.from, to));
    setDragging(null);
  }

  const slots: FormationSlot[] = ['frontLine', 'secondRank', 'flanks'];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-amber-400 font-bold text-sm">Army Formation</h3>
        <span className="text-stone-500 text-xs">{totalTroops(formation).toLocaleString()} troops</span>
      </div>

      {slots.map((slot) => {
        const mods = FORMATION_MODIFIERS[slot];
        return (
          <div
            key={slot}
            className={`border rounded p-2 min-h-[72px] ${SLOT_COLORS[slot]}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(slot)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-stone-300">{SLOT_LABELS[slot]}</span>
              <span className="text-xs text-stone-500">
                ⚔ ×{mods.attackMod.toFixed(1)} · 🛡 ×{mods.defenseMod.toFixed(1)}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {formation[slot].map((unit, i) => (
                <UnitChip
                  key={`${unit.type}-${unit.variant ?? ''}-${i}`}
                  unit={unit}
                  onDragStart={() => setDragging({ unit, from: slot })}
                />
              ))}
              {formation[slot].length === 0 && (
                <span className="text-stone-600 text-xs italic">Drop units here</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UnitChip({ unit, onDragStart }: { unit: Unit; onDragStart: () => void }) {
  const label = unit.variant
    ? unit.variant.replace(/_/g, ' ')
    : unit.type.replace(/_/g, ' ');

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="px-2 py-0.5 bg-stone-700 hover:bg-stone-600 border border-stone-500 rounded text-xs text-stone-200 cursor-grab select-none"
      title={`${label} — ${unit.count} troops`}
    >
      {label} ({unit.count.toLocaleString()})
    </div>
  );
}
