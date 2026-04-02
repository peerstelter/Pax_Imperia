import { useState } from 'react';
import type { Unit, Formation, Commander } from '@pax-imperia/shared';
import { FORMATION_MODIFIERS, moveUnit, totalTroops } from '@pax-imperia/shared';
import type { FormationSlot } from '@pax-imperia/shared';

interface ArmyBuilderProps {
  formation: Formation;
  commander?: Commander;
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

export default function ArmyBuilder({ formation, commander, onChange }: ArmyBuilderProps) {
  const [dragging, setDragging] = useState<{ unit: Unit; from: FormationSlot } | null>(null);

  function handleDrop(to: FormationSlot) {
    if (!dragging || dragging.from === to) { setDragging(null); return; }
    onChange(moveUnit(formation, dragging.unit, dragging.from, to));
    setDragging(null);
  }

  const slots: FormationSlot[] = ['frontLine', 'secondRank', 'flanks'];
  const troops = totalTroops(formation);

  // Calculate effective strength (attack sum across slots with modifiers)
  const effectiveAttack = slots.reduce((sum, slot) => {
    const mod = FORMATION_MODIFIERS[slot].attackMod;
    return sum + formation[slot].reduce((s, u) => s + u.attack * u.count * mod / 100, 0);
  }, 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-amber-400 font-bold text-sm">Army Formation</h3>
        <span className="text-stone-500 text-xs">{troops.toLocaleString()} troops</span>
      </div>

      {/* Commander badge */}
      {commander && (
        <div className="flex items-center gap-2 bg-stone-700 rounded px-2 py-1 text-xs">
          <span className="text-amber-300 font-bold">General:</span>
          <span className="text-stone-200">{commander.name}</span>
          <span className="text-stone-500 ml-auto">
            ⚔{commander.attack} 🛡{commander.defense} ⚡{commander.maneuver}
          </span>
        </div>
      )}

      {/* Strength summary */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className="bg-stone-800 rounded px-2 py-1">
          <span className="text-stone-500">Eff. Attack</span>
          <span className="ml-1 text-red-300 font-bold">{effectiveAttack.toFixed(0)}</span>
        </div>
        <div className="bg-stone-800 rounded px-2 py-1">
          <span className="text-stone-500">Total Troops</span>
          <span className="ml-1 text-stone-200 font-bold">{troops.toLocaleString()}</span>
        </div>
      </div>

      {/* Formation slots */}
      {slots.map((slot) => {
        const mods = FORMATION_MODIFIERS[slot];
        const isDragTarget = dragging && dragging.from !== slot;
        return (
          <div
            key={slot}
            className={`border rounded p-2 min-h-[72px] transition-colors ${SLOT_COLORS[slot]}
              ${isDragTarget ? 'ring-1 ring-amber-500' : ''}`}
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
                <span className="text-stone-600 text-xs italic">Drag units here</span>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-stone-600 text-xs italic">Drag unit chips between slots to adjust formation.</p>
    </div>
  );
}

function UnitChip({ unit, onDragStart }: { unit: Unit; onDragStart: () => void }) {
  const label = unit.variant
    ? unit.variant.replace(/_/g, ' ')
    : unit.type.replace(/_/g, ' ');

  const moraleColor = unit.morale >= 80 ? 'text-green-400' : unit.morale >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="px-2 py-1 bg-stone-700 hover:bg-stone-600 border border-stone-500 rounded text-xs text-stone-200 cursor-grab select-none"
      title={`${label} — Atk:${unit.attack} Def:${unit.defense} Morale:${unit.morale}`}
    >
      <div>{label}</div>
      <div className="flex gap-1 mt-0.5">
        <span className="text-stone-400">{unit.count.toLocaleString()}</span>
        <span className={moraleColor}>M{unit.morale}</span>
      </div>
    </div>
  );
}
