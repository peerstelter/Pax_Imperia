import { useState, useEffect, useCallback } from 'react';
import type { Province, Faction, DiplomaticRelation, DiplomacyType } from '@pax-imperia/shared';
import type { GameState } from '@pax-imperia/shared';
import ProvinceMap from './components/map/ProvinceMap.js';
import ProvinceInfoPanel from './components/map/ProvinceInfoPanel.js';
import Minimap from './components/map/Minimap.js';
import DiplomacyMenu from './components/diplomacy/DiplomacyMenu.js';
import MenuPage from './pages/MenuPage.js';

// ── App state ─────────────────────────────────────────────────────────────────

type Screen = 'menu' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerFactionId, setPlayerFactionId] = useState<string | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDiplomacy, setShowDiplomacy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Load game state ──────────────────────────────────────────────────────────

  const loadState = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/game/${id}`);
      if (!res.ok) throw new Error('Failed to load game');
      const state = await res.json() as GameState;
      setGameState(state);
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : 'Error loading game');
    }
  }, []);

  useEffect(() => {
    if (gameId && screen === 'game') loadState(gameId);
  }, [gameId, screen, loadState]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleGameStart(id: string, factionId: string) {
    setGameId(id);
    setPlayerFactionId(factionId);
    setScreen('game');
  }

  async function handleEndTurn() {
    if (!gameId) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/game/${gameId}/turn`, { method: 'PUT' });
      const data = await res.json() as { newTurn: number; events: string[]; winner?: string };
      if (data.winner) {
        setStatusMsg(`Victory! ${data.winner} wins the game!`);
      } else if (data.events.length > 0) {
        setStatusMsg(data.events.slice(0, 3).join(' · '));
      }
      await loadState(gameId);
    } catch (e) {
      setStatusMsg('Failed to advance turn');
    } finally {
      setLoading(false);
    }
  }

  async function handleDiplomacyOffer(targetId: string, treaty: DiplomacyType) {
    if (!gameId || !playerFactionId) return;
    const res = await fetch('/api/diplomacy/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, fromId: playerFactionId, toId: targetId, treaty }),
    });
    const data = await res.json() as { ok: boolean; reason?: string };
    setStatusMsg(data.ok ? `Treaty proposed!` : (data.reason ?? 'Proposal failed'));
    if (gameId) await loadState(gameId);
  }

  async function handleGift(targetId: string, amount: number) {
    if (!gameId || !playerFactionId) return;
    const res = await fetch('/api/diplomacy/gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, fromId: playerFactionId, toId: targetId, goldAmount: amount }),
    });
    const data = await res.json() as { ok: boolean; opinionGained?: number; reason?: string };
    setStatusMsg(data.ok ? `Gift sent! +${data.opinionGained} opinion` : (data.reason ?? 'Gift failed'));
    if (gameId) await loadState(gameId);
  }

  // ── Screens ───────────────────────────────────────────────────────────────────

  if (screen === 'menu') {
    return <MenuPage onStart={handleGameStart} />;
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-900 text-stone-400">
        Loading game…
      </div>
    );
  }

  const playerFaction = gameState.factions.find((f) => f.id === playerFactionId)!;

  const selectedProvince = gameState.provinces.find((p) => p.id === selectedId) ?? null;
  const selectedFaction = selectedProvince
    ? gameState.factions.find((f) => f.id === selectedProvince.ownerId)
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-stone-900 text-stone-100">
      {/* HUD */}
      <header className="flex items-center justify-between px-4 py-2 bg-stone-950 border-b border-stone-700 gap-4">
        <h1 className="text-amber-400 font-bold tracking-widest text-lg">PAX IMPERIA</h1>

        {/* Resources */}
        <div className="flex gap-4 text-xs text-stone-300">
          <span>Turn <b className="text-amber-300">{gameState.turn}</b></span>
          <span>Gold <b className="text-yellow-300">{playerFaction?.gold ?? '—'}</b></span>
          <span>Food <b className="text-green-300">{playerFaction?.food ?? '—'}</b></span>
          <span>Men <b className="text-blue-300">{playerFaction?.manpower ?? '—'}</b></span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowDiplomacy(true)}
            className="px-3 py-1 text-xs bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded"
          >
            Diplomacy
          </button>
          <button
            onClick={handleEndTurn}
            disabled={loading || !!gameState.winner}
            className="px-4 py-1 text-xs bg-amber-700 hover:bg-amber-600 disabled:opacity-50 border border-amber-500 rounded font-bold"
          >
            {loading ? '…' : 'End Turn'}
          </button>
        </div>
      </header>

      {/* Status bar */}
      {statusMsg && (
        <div className="px-4 py-1 bg-stone-800 border-b border-stone-700 text-xs text-stone-300">
          {statusMsg}
        </div>
      )}

      {/* Main content */}
      <main className="flex flex-1 gap-4 p-4 overflow-hidden relative">
        <ProvinceMap
          provinces={gameState.provinces}
          factions={gameState.factions}
          selectedProvinceId={selectedId}
          onSelectProvince={setSelectedId}
          cellSize={90}
        />

        <div className="absolute bottom-6 left-6 z-10">
          <Minimap
            provinces={gameState.provinces}
            factions={gameState.factions}
            selectedProvinceId={selectedId}
            onSelectProvince={setSelectedId}
          />
        </div>

        {selectedProvince && selectedFaction !== undefined ? (
          <ProvinceInfoPanel
            province={selectedProvince}
            faction={selectedFaction}
            playerFaction={playerFaction}
            relations={gameState.diplomaticRelations}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="w-72 flex items-center justify-center text-stone-600 text-sm italic">
            Click a province to inspect it
          </div>
        )}
      </main>

      {/* Diplomacy overlay */}
      {showDiplomacy && playerFaction && (
        <DiplomacyMenu
          playerFaction={playerFaction}
          factions={gameState.factions}
          relations={gameState.diplomaticRelations}
          onClose={() => setShowDiplomacy(false)}
          onOffer={handleDiplomacyOffer}
          onGift={handleGift}
        />
      )}

      {/* Victory banner */}
      {gameState.winner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-stone-900 border border-amber-600 rounded p-8 text-center max-w-sm">
            <h2 className="text-3xl font-bold text-amber-400 mb-2">Victory!</h2>
            <p className="text-stone-300 mb-4">{gameState.winner} has triumphed.</p>
            <button
              onClick={() => setScreen('menu')}
              className="px-6 py-2 bg-amber-700 hover:bg-amber-600 border border-amber-500 rounded font-bold"
            >
              Return to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
