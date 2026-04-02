import type { Faction, DiplomaticRelation, DiplomacyType } from '@pax-imperia/shared';
import { OPINION_ALLIANCE_THRESHOLD, OPINION_WAR_THRESHOLD } from '@pax-imperia/shared';

interface DiplomacyMenuProps {
  playerFaction: Faction;
  factions: Faction[];
  relations: DiplomaticRelation[];
  onClose: () => void;
  onOffer: (targetId: string, treaty: DiplomacyType) => void;
  onGift: (targetId: string, amount: number) => void;
  onMission?: (targetId: string, gold: number) => void;
}

export default function DiplomacyMenu({
  playerFaction,
  factions,
  relations,
  onClose,
  onOffer,
  onGift,
  onMission,
}: DiplomacyMenuProps) {
  const others = factions.filter((f) => !f.isPlayer);

  function getRelation(targetId: string): DiplomaticRelation | undefined {
    const [a, b] = [playerFaction.id, targetId].sort();
    return relations.find((r) => r.factionA === a && r.factionB === b);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 border border-stone-600 rounded w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-700">
          <h2 className="text-amber-400 font-bold text-lg">Diplomacy</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200 text-xl">×</button>
        </div>

        <div className="p-4 space-y-3">
          {others.map((faction) => {
            const rel    = getRelation(faction.id);
            const opinion = rel?.opinion ?? 0;
            const treaties: DiplomacyType[] = rel ? rel.treaties : [];

            return (
              <FactionRow
                key={faction.id}
                faction={faction}
                opinion={opinion}
                treaties={treaties}
                playerGold={playerFaction.gold}
                onOffer={(treaty) => onOffer(faction.id, treaty)}
                onGift={(amount) => onGift(faction.id, amount)}
                onMission={onMission ? (gold) => onMission(faction.id, gold) : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Single faction row ────────────────────────────────────────────────────────

interface FactionRowProps {
  faction: Faction;
  opinion: number;
  treaties: DiplomacyType[];
  playerGold: number;
  onOffer: (treaty: DiplomacyType) => void;
  onGift: (amount: number) => void;
  onMission?: (gold: number) => void;
}

function FactionRow({ faction, opinion, treaties, playerGold, onOffer, onGift, onMission }: FactionRowProps) {
  const opinionColor =
    opinion >= OPINION_ALLIANCE_THRESHOLD ? 'text-green-400' :
    opinion <= OPINION_WAR_THRESHOLD      ? 'text-red-400'   :
    'text-stone-300';

  const opinionBar = Math.abs(opinion);
  const barColor   = opinion >= 0 ? 'bg-green-600' : 'bg-red-600';

  const canAlly    = opinion >= OPINION_ALLIANCE_THRESHOLD && !treaties.includes('alliance');
  const canVassalize = opinion >= 80 && !treaties.includes('vassalage');
  const canTrade   = !treaties.includes('trade');
  const canMarriage = opinion >= 40 && !treaties.includes('marriage');
  const canNap     = !treaties.includes('non_aggression');

  return (
    <div className="bg-stone-800 border border-stone-700 rounded p-3">
      <div className="flex items-start justify-between gap-4">
        {/* Faction info */}
        <div className="flex items-center gap-2 min-w-[160px]">
          <span
            className="w-3 h-3 rounded-full border border-stone-500 shrink-0"
            style={{ background: faction.color }}
          />
          <span className="text-stone-100 font-semibold text-sm">{faction.name}</span>
        </div>

        {/* Opinion */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <span className={`text-xs font-bold ${opinionColor}`}>{opinion > 0 ? '+' : ''}{opinion}</span>
          <div className="w-20 h-1.5 bg-stone-700 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${opinionBar}%` }} />
          </div>
        </div>

        {/* Active treaties */}
        <div className="flex flex-wrap gap-1 flex-1">
          {treaties.length === 0 && <span className="text-stone-600 text-xs italic">No treaties</span>}
          {treaties.map((t) => (
            <span key={t} className="px-1.5 py-0.5 bg-stone-700 text-stone-300 rounded text-xs">
              {TREATY_LABEL[t] ?? t}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-1">
          {canAlly     && <ActionBtn label="Ally"      onClick={() => onOffer('alliance')} color="green" />}
          {canTrade    && <ActionBtn label="Trade"     onClick={() => onOffer('trade')} color="amber" />}
          {canMarriage && <ActionBtn label="Marriage"  onClick={() => onOffer('marriage')} color="pink" />}
          {canNap      && <ActionBtn label="NAP"       onClick={() => onOffer('non_aggression')} color="blue" />}
          {canVassalize && <ActionBtn label="Vassalize" onClick={() => onOffer('vassalage')} color="purple" />}
          <ActionBtn label="Gift 50g" onClick={() => onGift(50)} color="stone" disabled={playerGold < 50} />
          {onMission && <ActionBtn label="Mission 50g" onClick={() => onMission(50)} color="stone" disabled={playerGold < 50} title="Spend 50g on a diplomatic mission to boost opinion" />}
        </div>
      </div>
    </div>
  );
}

const TREATY_LABEL: Partial<Record<DiplomacyType, string>> = {
  alliance:       '⚔ Alliance',
  marriage:       '💍 Marriage',
  trade:          '💰 Trade',
  vassalage:      '🏳 Vassal',
  non_aggression: '🤝 NAP',
};

function ActionBtn({ label, onClick, color, disabled, title }: { label: string; onClick: () => void; color: string; disabled?: boolean; title?: string }) {
  const base = 'px-2 py-0.5 rounded text-xs border transition-colors';
  const colors: Record<string, string> = {
    green:  'bg-green-900 hover:bg-green-800 border-green-700 text-green-300',
    amber:  'bg-amber-900 hover:bg-amber-800 border-amber-700 text-amber-300',
    pink:   'bg-pink-900 hover:bg-pink-800 border-pink-700 text-pink-300',
    blue:   'bg-blue-900 hover:bg-blue-800 border-blue-700 text-blue-300',
    purple: 'bg-purple-900 hover:bg-purple-800 border-purple-700 text-purple-300',
    stone:  'bg-stone-700 hover:bg-stone-600 border-stone-600 text-stone-300',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${colors[color]} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );
}
