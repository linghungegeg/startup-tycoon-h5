export type ProductStage = "idea" | "mvp" | "beta" | "launched" | "growth" | "mature" | "decline" | "closed";

export type ProductMetricsInput = {
  stage: ProductStage;
  users: number;
  retentionBasisPoints: number;
  payRateBasisPoints: number;
  revenuePerPayingUser: number;
  acquisitionCost: number;
  serverCost: number;
  reputationScore: number;
  techDebt: number;
  techDebtGrowth: number;
  reputationGrowth: number;
};

export type ProductMetricsResult = {
  stage: ProductStage;
  users: number;
  retentionBasisPoints: number;
  payRateBasisPoints: number;
  serverCost: number;
  reputationScore: number;
  techDebt: number;
  monthlyRevenue: number;
  resultSummary: string;
  incidentTriggered: boolean;
};

const nextStageMap: Record<ProductStage, ProductStage> = {
  idea: "mvp",
  mvp: "beta",
  beta: "launched",
  launched: "growth",
  growth: "mature",
  mature: "decline",
  decline: "decline",
  closed: "closed"
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const calculateProductRevenue = (users: number, payRateBasisPoints: number, revenuePerPayingUser: number): number =>
  Math.max(0, Math.round((users * payRateBasisPoints * revenuePerPayingUser) / 10000));

export const calculateNextProductMetrics = (input: ProductMetricsInput): ProductMetricsResult => {
  const stage = nextStageMap[input.stage];
  const growthBase = stage === "mvp" ? 600 : stage === "beta" ? 2600 : stage === "launched" ? 9000 : stage === "growth" ? 18000 : stage === "mature" ? 9000 : -5000;
  const reputationMultiplier = Math.max(1, Math.round(input.reputationScore / 20));
  const users = stage === "decline" ? Math.max(0, input.users + growthBase) : input.users + growthBase * reputationMultiplier;
  const retentionBasisPoints = clamp(
    input.retentionBasisPoints + (stage === "mature" ? 200 : stage === "decline" ? -700 : 120),
    500,
    8500
  );
  const payRateBasisPoints = clamp(input.payRateBasisPoints + (stage === "growth" || stage === "mature" ? 20 : 10), 20, 1200);
  const serverCost = Math.max(input.serverCost, Math.round(users * 1.8));
  const techDebt = clamp(input.techDebt + input.techDebtGrowth + (stage === "growth" ? 12 : stage === "mature" ? 8 : 4), 0, 100);
  const reputationScore = clamp(input.reputationScore + input.reputationGrowth + (stage === "decline" ? -8 : 3), 0, 100);
  const monthlyRevenue = stage === "idea" || stage === "mvp" || stage === "beta" ? 0 : calculateProductRevenue(users, payRateBasisPoints, input.revenuePerPayingUser);
  const incidentTriggered = techDebt >= 75;

  return {
    stage,
    users,
    retentionBasisPoints,
    payRateBasisPoints,
    serverCost,
    reputationScore,
    techDebt,
    monthlyRevenue,
    resultSummary: incidentTriggered
      ? "产品继续增长，但技术债已触发事故预警，需要安排重构。"
      : stage === "decline"
        ? "产品进入衰退期，用户增长放缓，需要重构或关闭止损。"
        : "产品阶段已推进，收入、用户和成本同步更新。",
    incidentTriggered
  };
};
