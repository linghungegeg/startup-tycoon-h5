export type CompetitorActionType = "price_war" | "poach" | "public_opinion" | "patent";

export type MarketShareInput = {
  currentShareBasisPoints: number;
  competitorShareBasisPoints: number;
  industryHeat: number;
  reputation: number;
  customerSatisfaction: number;
  monthlyIncome: number;
  monthlyExpense: number;
  actionShareDeltaBasisPoints: number;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const calculateMarketShare = (input: MarketShareInput): {
  playerShareBasisPoints: number;
  competitorShareBasisPoints: number;
  resultSummary: string;
} => {
  const reputationBonus = Math.floor(Math.max(0, input.reputation - 1000000) / 250000) * 8;
  const satisfactionBonus = Math.max(-80, (input.customerSatisfaction - 70) * 4);
  const cashflowPenalty = input.monthlyIncome < input.monthlyExpense ? 60 : 0;
  const heatBonus = Math.max(-50, Math.min(70, input.industryHeat - 60));
  const playerDelta = input.actionShareDeltaBasisPoints + reputationBonus + satisfactionBonus + heatBonus - cashflowPenalty;
  const playerShareBasisPoints = clamp(input.currentShareBasisPoints + playerDelta, 100, 8500);
  const competitorShareBasisPoints = clamp(input.competitorShareBasisPoints - Math.round(playerDelta * 0.55), 500, 9000);

  return {
    playerShareBasisPoints,
    competitorShareBasisPoints,
    resultSummary:
      playerDelta >= 0
        ? "应对策略生效，市场份额和客户心智有所回升。"
        : "竞品压力扩大，市场份额被进一步压缩。"
  };
};
