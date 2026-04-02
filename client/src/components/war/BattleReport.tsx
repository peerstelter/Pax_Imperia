import type { CombatRound } from '../../types/combat.js';

interface CombatResult {
  winner: 'attacker' | 'defender' | 'draw';
  rounds: CombatRound[];
  totalAttackerCasualties: number;
  totalDefenderCasualties: number;
  attackerSurvivors: { type: string; count: number; morale: number }[];
  defenderSurvivors: { type: string; count: number; morale: number }[];
}

interface BattleReportProps {
  attackerName: string;
  defenderName: string;
  result: CombatResult;
  onClose: () => void;
}

const WINNER_LABEL = {
  attacker: '⚔ Attacker Victorious',
  defender: '🛡 Defender Held',
  draw:     '⚖ Battle Inconclusive',
};

const WINNER_COLOR = {
  attacker: 'text-green-400',
  defender: 'text-blue-400',
  draw:     'text-yellow-400',
};

export default function BattleReport({ attackerName, defenderName, result, onClose }: BattleReportProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 border border-stone-600 rounded w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-700">
          <h2 className="text-amber-400 font-bold text-lg">Battle Report</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200 text-xl">×</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Outcome banner */}
          <div className={`text-center text-xl font-bold ${WINNER_COLOR[result.winner]}`}>
            {WINNER_LABEL[result.winner]}
          </div>

          {/* Participants */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Attacker', name: attackerName, casualties: result.totalAttackerCasualties, survivors: result.attackerSurvivors },
              { label: 'Defender', name: defenderName, casualties: result.totalDefenderCasualties, survivors: result.defenderSurvivors },
            ].map(({ label, name, casualties, survivors }) => (
              <div key={label} className="bg-stone-800 rounded p-3 space-y-1">
                <p className="text-stone-400 text-xs">{label}</p>
                <p className="text-stone-100 font-semibold">{name}</p>
                <p className="text-red-400 text-xs">Casualties: {casualties.toLocaleString()}</p>
                <div className="mt-1 space-y-0.5">
                  {survivors.map((u, i) => (
                    <p key={i} className="text-stone-300 text-xs">
                      {u.type.replace(/_/g, ' ')}: {u.count.toLocaleString()} (morale {u.morale})
                    </p>
                  ))}
                  {survivors.length === 0 && <p className="text-stone-600 text-xs italic">Routed</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Round log */}
          <div>
            <h3 className="text-stone-400 text-xs font-semibold uppercase mb-2">Round Log</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {result.rounds.map((round) => (
                <div key={round.round} className="bg-stone-800 rounded p-2 text-xs">
                  <p className="text-amber-400 font-semibold mb-1">Round {round.round}</p>
                  <div className="grid grid-cols-2 gap-2 text-stone-300 mb-1">
                    <span>⚔ Atk casualties: <span className="text-red-400">{round.attackerCasualties.toLocaleString()}</span></span>
                    <span>⚔ Def casualties: <span className="text-red-400">{round.defenderCasualties.toLocaleString()}</span></span>
                    <span>↓ Atk morale: <span className="text-orange-400">−{round.attackerMoraleDrop}</span></span>
                    <span>↓ Def morale: <span className="text-orange-400">−{round.defenderMoraleDrop}</span></span>
                  </div>
                  {round.events.map((e, i) => (
                    <p key={i} className="text-stone-400 italic">{e}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
