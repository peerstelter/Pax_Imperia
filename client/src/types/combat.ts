export interface CombatRound {
  round: number;
  attackerCasualties: number;
  defenderCasualties: number;
  attackerMoraleDrop: number;
  defenderMoraleDrop: number;
  events: string[];
}
