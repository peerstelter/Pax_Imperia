import { useState } from 'react';
import type { Province, Faction } from '@pax-imperia/shared';
import { buildProvinceGrid, coordToId, MAP_COLS, MAP_ROWS } from '@pax-imperia/shared';
import ProvinceMap from './components/map/ProvinceMap.js';
import ProvinceInfoPanel from './components/map/ProvinceInfoPanel.js';
import Minimap from './components/map/Minimap.js';

// Placeholder factions for local dev before API is connected (Task 13 / Task 64)
const DEV_FACTIONS: Faction[] = [
  { id: 'f_valden',   name: 'Valdenmarch',   color: '#c0392b', gold: 150, food: 80,  manpower: 300, personality: 'aggressive',   isPlayer: true,  shadowInfluence: {} },
  { id: 'f_khos',     name: 'Khos Horde',    color: '#e67e22', gold: 80,  food: 60,  manpower: 400, personality: 'aggressive',   isPlayer: false, shadowInfluence: {} },
  { id: 'f_dunmara',  name: 'Dunmara Reach', color: '#2980b9', gold: 120, food: 70,  manpower: 200, personality: 'isolationist', isPlayer: false, shadowInfluence: {} },
  { id: 'f_solaris',  name: 'Solaris Pact',  color: '#f1c40f', gold: 250, food: 50,  manpower: 150, personality: 'merchant',     isPlayer: false, shadowInfluence: {} },
  { id: 'f_ironveil', name: 'Ironveil',       color: '#8e44ad', gold: 100, food: 100, manpower: 250, personality: 'expansionist', isPlayer: false, shadowInfluence: {} },
  { id: 'f_ashen',    name: 'Ashen Crown',   color: '#27ae60', gold: 110, food: 90,  manpower: 220, personality: 'expansionist', isPlayer: false, shadowInfluence: {} },
  { id: 'f_neutral',  name: 'Freeholds',     color: '#7f8c8d', gold: 60,  food: 60,  manpower: 100, personality: 'isolationist', isPlayer: false, shadowInfluence: {} },
];

const FACTION_START: [string, string][] = [
  [coordToId(3, 2), 'f_valden'],
  [coordToId(4, 2), 'f_valden'],   // adjacent
  [coordToId(5, 3), 'f_khos'],
  [coordToId(5, 4), 'f_khos'],
  [coordToId(0, 2), 'f_dunmara'],
  [coordToId(0, 3), 'f_dunmara'],
  [coordToId(7, 1), 'f_solaris'],
  [coordToId(7, 0), 'f_solaris'],
  [coordToId(1, 0), 'f_ironveil'],
  [coordToId(2, 0), 'f_ironveil'],
  [coordToId(6, 4), 'f_ashen'],
  [coordToId(6, 3), 'f_ashen'],
];

const ownerMap = new Map(FACTION_START);

function buildDevProvinces(): Province[] {
  return buildProvinceGrid().map((p) => ({
    ...p,
    ownerId: ownerMap.get(p.id) ?? 'f_neutral',
    isRevealed: ownerMap.get(p.id) === 'f_valden' || !ownerMap.has(p.id),
  }));
}

export default function App() {
  const [provinces] = useState<Province[]>(buildDevProvinces);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedProvince = provinces.find((p) => p.id === selectedId) ?? null;
  const selectedFaction = selectedProvince
    ? DEV_FACTIONS.find((f) => f.id === selectedProvince.ownerId)
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-stone-900 text-stone-100">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-stone-950 border-b border-stone-700">
        <h1 className="text-amber-400 font-bold tracking-widest text-lg">PAX IMPERIA</h1>
        <span className="text-stone-500 text-xs">Turn 1 · Dev mode</span>
      </header>

      {/* Main content */}
      <main className="flex flex-1 gap-4 p-4 overflow-hidden relative">
        <ProvinceMap
          provinces={provinces}
          factions={DEV_FACTIONS}
          selectedProvinceId={selectedId}
          onSelectProvince={setSelectedId}
          cellSize={90}
        />

        {/* Minimap — bottom-left overlay */}
        <div className="absolute bottom-6 left-6 z-10">
          <Minimap
            provinces={provinces}
            factions={DEV_FACTIONS}
            selectedProvinceId={selectedId}
            onSelectProvince={setSelectedId}
          />
        </div>

        {selectedProvince && selectedFaction !== undefined ? (
          <ProvinceInfoPanel
            province={selectedProvince}
            faction={selectedFaction}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="w-72 flex items-center justify-center text-stone-600 text-sm italic">
            Click a province to inspect it
          </div>
        )}
      </main>
    </div>
  );
}
