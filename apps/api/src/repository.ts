import { randomUUID } from "node:crypto";

import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { pickRecruitCandidate } from "./employee.js";
import { calculateFinanceReport } from "./finance.js";
import { calculateMarketShare, type CompetitorActionType } from "./market.js";
import { calculateNextProductMetrics, calculateProductRevenue, type ProductStage } from "./product.js";
import { calculateProjectProgressGain, calculateProjectSuccessRate } from "./project.js";

export type AccountRecord = {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
};

export type AdminUserRecord = AccountRecord;

export type ServerRecord = {
  id: string;
  name: string;
  status: "recommended" | "new" | "busy";
  label: string;
  isRecommended: boolean;
};

export type AvatarRecord = {
  id: string;
  name: string;
  glyph: string;
  specialty: string;
};

export type PlayerProfileRecord = {
  id: string;
  accountId: string;
  serverId: string;
  avatarId: string;
  founderName: string;
  companyName: string;
  companyLevel: number;
  companyExperience: number;
  cash: number;
  platformCoins: number;
  premiumCurrency: number;
  reputation: number;
  actionPower: number;
  actionPowerLimit: number;
  actionPowerRecoveredAt: string;
  monthlyIncome: number;
  monthlyExpense: number;
  valuation: number;
  founderEquityBasisPoints: number;
  totalDebt: number;
  creditRating: string;
  employeeSatisfaction: number;
  customerSatisfaction: number;
  financeMonth: number;
  operatingDay: number;
  riskStatus: string;
  pendingEventCount: number;
  unreadMailCount: number;
  debtWarning: string;
  createdAt: string;
};

export type CreatePlayerProfileInput = Pick<
  PlayerProfileRecord,
  "accountId" | "serverId" | "avatarId" | "founderName" | "companyName"
>;

export type TaskRecord = {
  id: string;
  type: "main" | "daily" | "side";
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardLabel: string;
  rewardCash: number;
  rewardPlatformCoins: number;
  rewardReputation: number;
  rewardActionPower: number;
  rewardCompanyExperience: number;
  rewardItem: ItemRewardRecord | null;
  guideAction: string;
  unlockKind: "none" | "knowledge" | "compliance";
  knowledgeId: string | null;
  isClaimed: boolean;
  isClaimable: boolean;
};

export type CompanyGrowthRecord = {
  profile: PlayerProfileRecord;
  maxLevel: number;
  currentLevelExperience: number;
  nextLevelExperience: number | null;
  progressToNextBasisPoints: number;
  fullLevelOverflowExperience: number;
  fullLevelChest: {
    requiredExperience: number;
    progressExperience: number;
    earnedCount: number;
    claimedCount: number;
    claimableCount: number;
    rewards: {
      cash: number;
      reputation: number;
      actionPower: number;
      item: ItemRewardRecord | null;
    };
  };
};

export type KnowledgeLinkRecord = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  collectedAt: string;
  contentVersion: string;
  disclaimer: string;
  isUnlocked: boolean;
};

export type RandomTaskRecord = {
  id: string;
  configId: string;
  category: string;
  title: string;
  description: string;
  source: string;
  status: "pending" | "resolved" | "dismissed";
  dailyDate: string;
  riskLabel: string;
  expiresAt: string;
  selectedOption: "A" | "B" | null;
  resultSummary: string | null;
  knowledge: KnowledgeLinkRecord | null;
  options: Array<{
    key: "A" | "B";
    label: string;
    actionPowerCost: number;
    cashReward: number;
    reputationReward: number;
    companyExperienceReward: number;
    result: string;
  }>;
};

export type RandomTaskCenterRecord = {
  profile: PlayerProfileRecord;
  tasks: RandomTaskRecord[];
  dailyLimit: number;
  pendingCount: number;
  handledToday: number;
};

export type RandomTaskActionRecord = {
  center: RandomTaskCenterRecord;
  task: RandomTaskRecord;
  profile: PlayerProfileRecord;
  result: string;
  usedItem?: {
    itemId: string;
    itemName: string;
    effectSummary: string;
  };
};

export type ItemRewardRecord = {
  id: string;
  name: string;
  quantity: number;
};

export type InventoryItemRecord = {
  id: string;
  itemId: string;
  name: string;
  category: string;
  rarity: string;
  icon: string;
  summary: string;
  usageHint: string;
  quantity: number;
  updatedAt: string;
};

export type InventoryCenterRecord = {
  items: InventoryItemRecord[];
  recentLedgers: Array<{
    id: string;
    itemId: string;
    itemName: string;
    changeQuantity: number;
    balanceAfter: number;
    source: string;
    reason: string;
    createdAt: string;
  }>;
};

export type InventoryUseRecord = {
  item: InventoryItemRecord;
  inventory: InventoryCenterRecord;
  profile: PlayerProfileRecord;
  result: string;
};

export type CompanyFinanceRecord = {
  profileId: string;
  companyName: string;
  companyLevel: number;
  cash: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netCashFlow: number;
  valuation: number;
  founderEquityBasisPoints: number;
  totalDebt: number;
  debtRatioBasisPoints: number;
  creditRating: string;
  brandReputation: number;
  employeeSatisfaction: number;
  customerSatisfaction: number;
  financeMonth: number;
  operatingDay: number;
  riskStatus: "稳健" | "预警" | "资金紧张";
  riskTips: string[];
};

export type CompanyFinanceSettlementRecord = CompanyFinanceRecord & {
  reportMonth: number;
  income: number;
  expense: number;
  endingCash: number;
  createdAt: string;
};

export type EmployeeRecord = {
  id: string;
  configId: string;
  name: string;
  role: string;
  careerLevel: string;
  rarity: string;
  level: number;
  salary: number;
  pressure: number;
  loyalty: number;
  growthPotential: number;
  management: number;
  negotiation: number;
  execution: number;
  specialty: string;
  equityBasisPoints: number;
  assignedTo: string | null;
  isActive: boolean;
};

export type ProjectRecord = {
  id: string;
  configId: string;
  name: string;
  category: string;
  stage: number;
  progress: number;
  cycleDays: number;
  budget: number;
  risk: string;
  successRate: number;
  revenueReward: number;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  status: "active" | "ready" | "settled" | "failed";
  result: "success" | "failure" | null;
  summary: string;
  settledAt: string | null;
};

export type ProjectSettlementRecord = {
  project: ProjectRecord;
  finance: CompanyFinanceRecord;
};

export type EventOptionRecord = {
  key: "A" | "B";
  label: string;
  impactPreview: string;
};

export type EventRecord = {
  id: string;
  configId: string;
  title: string;
  source: string;
  channel: string;
  summary: string;
  context: string;
  options: EventOptionRecord[];
  status: "pending" | "resolved";
  selectedOption: "A" | "B" | null;
  resultSummary: string | null;
  knowledgeTitle: string | null;
  knowledgeUnlocked: boolean;
  riskExplanation: string;
  knowledge: KnowledgeLinkRecord | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type EventChoiceRecord = {
  event: EventRecord;
  finance: CompanyFinanceRecord;
  followupEvent: EventRecord | null;
  result: {
    summary: string;
    riskExplanation: string;
    knowledgeUnlocked: boolean;
    knowledge: KnowledgeLinkRecord | null;
    followupEventId: string | null;
  };
};

export type LoanOfferRecord = {
  id: string;
  name: string;
  lender: string;
  principal: number;
  annualRateBasisPoints: number;
  termMonths: number;
  monthlyPayment: number;
  creditRequired: string;
  summary: string;
  isAvailable: boolean;
  lockedReason: string | null;
};

export type LoanRecord = {
  id: string;
  configId: string;
  name: string;
  lender: string;
  principal: number;
  remainingPrincipal: number;
  annualRateBasisPoints: number;
  termMonths: number;
  remainingMonths: number;
  monthlyPayment: number;
  overduePeriods: number;
  penaltyAccrued: number;
  status: "active" | "overdue" | "settled";
  createdAt: string;
  settledAt: string | null;
};

export type LoanCenterRecord = {
  offers: LoanOfferRecord[];
  loans: LoanRecord[];
  finance: CompanyFinanceRecord;
  crisis: {
    isActive: boolean;
    level: "none" | "cashflow" | "debt" | "bankruptcy";
    summary: string;
    routes: Array<{
      id: "financing" | "cost_cut" | "restructure";
      title: string;
      impact: string;
    }>;
  };
};

export type LoanActionRecord = {
  loan: LoanRecord | null;
  loanCenter: LoanCenterRecord;
  result: string;
};

export type FundingOfferRecord = {
  id: string;
  roundName: string;
  investorName: string;
  focus: string;
  amount: number;
  preMoneyValuation: number;
  postMoneyValuation: number;
  equityBasisPoints: number;
  successRate: number;
  debtToleranceBasisPoints: number;
  boardPressure: number;
  term: string;
  summary: string;
  isAvailable: boolean;
  lockedReason: string | null;
};

export type FundingRecord = {
  id: string;
  investorId: string;
  roundName: string;
  investorName: string;
  amount: number;
  preMoneyValuation: number;
  postMoneyValuation: number;
  equityBasisPoints: number;
  successRate: number;
  boardPressure: number;
  term: string;
  status: "pending" | "funded" | "failed";
  resultSummary: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type FundingCenterRecord = {
  offers: FundingOfferRecord[];
  fundings: FundingRecord[];
  finance: CompanyFinanceRecord;
};

export type FundingActionRecord = {
  funding: FundingRecord;
  fundingCenter: FundingCenterRecord;
  result: string;
};

export type ProductOfferRecord = {
  id: string;
  name: string;
  category: string;
  summary: string;
  launchCost: number;
  baseUsers: number;
  retentionBasisPoints: number;
  payRateBasisPoints: number;
  acquisitionCost: number;
  serverCost: number;
  techDebtGrowth: number;
  reputationGrowth: number;
  isAvailable: boolean;
  lockedReason: string | null;
};

export type ProductRecord = {
  id: string;
  configId: string;
  name: string;
  category: string;
  stage: ProductStage;
  users: number;
  retentionBasisPoints: number;
  payRateBasisPoints: number;
  acquisitionCost: number;
  serverCost: number;
  reputationScore: number;
  techDebt: number;
  monthlyRevenue: number;
  status: "active" | "closed";
  resultSummary: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type ProductCenterRecord = {
  offers: ProductOfferRecord[];
  products: ProductRecord[];
  finance: CompanyFinanceRecord;
};

export type ProductActionRecord = {
  product: ProductRecord;
  productCenter: ProductCenterRecord;
  result: string;
};

export type MarketTrackOfferRecord = {
  id: string;
  name: string;
  summary: string;
  costStructure: string;
  industryHeat: number;
  policyRisk: number;
  baseShareBasisPoints: number;
  customerPool: number;
  isAvailable: boolean;
  lockedReason: string | null;
};

export type PlayerMarketRecord = {
  id: string;
  trackId: string;
  trackName: string;
  playerShareBasisPoints: number;
  competitorShareBasisPoints: number;
  industryHeat: number;
  policyRisk: number;
  pricePressure: number;
  talentPressure: number;
  reputationPressure: number;
  patentRisk: number;
  resultSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompetitorActionRecord = {
  id: string;
  actionId: string;
  trackId: string;
  competitorName: string;
  actionType: CompetitorActionType;
  title: string;
  summary: string;
  status: "pending" | "resolved";
  response: "defend" | "counter" | null;
  resultSummary: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type MarketCenterRecord = {
  offers: MarketTrackOfferRecord[];
  markets: PlayerMarketRecord[];
  actions: CompetitorActionRecord[];
  finance: CompanyFinanceRecord;
};

export type MarketActionRecord = {
  market: PlayerMarketRecord;
  action: CompetitorActionRecord | null;
  marketCenter: MarketCenterRecord;
  result: string;
};

export type PlatformCoinLedgerSource =
  | "admin_grant"
  | "admin_deduct"
  | "admin_correction"
  | "shop_purchase"
  | "season_pass_purchase"
  | "activity_shop_purchase"
  | "activity_reward"
  | "reserved_payment"
  | "system_compensation";

export type PlatformWalletRecord = {
  profileId: string;
  balance: number;
  totalSpent: number;
  vipExperience: number;
  ledgers: Array<{
    id: string;
    changeAmount: number;
    balanceAfter: number;
    source: PlatformCoinLedgerSource;
    referenceId: string | null;
    reason: string;
    createdAt: string;
  }>;
};

export type ShopProductRecord = {
  id: string;
  name: string;
  category: string;
  pricePlatformCoins: number;
  rewardCash: number;
  rewardActionPower: number;
  rewardReputation: number;
  rewardItem: ItemRewardRecord | null;
  durationDays: number;
  purchaseLimit: number;
  summary: string;
  isAvailable: boolean;
  lockedReason: string | null;
};

export type ShopCenterRecord = {
  wallet: PlatformWalletRecord;
  products: ShopProductRecord[];
  purchases: Array<{
    id: string;
    productId: string;
    requestId: string;
    pricePlatformCoins: number;
    createdAt: string;
  }>;
};

export type ShopPurchaseRecord = {
  wallet: PlatformWalletRecord;
  product: ShopProductRecord;
  purchase: ShopCenterRecord["purchases"][number];
  profile: PlayerProfileRecord;
  isDuplicate: boolean;
  result: string;
};

export type AdminWalletAdjustmentRecord = {
  wallet: PlatformWalletRecord;
  profile: PlayerProfileRecord;
  auditLogId: string;
};

export type ExternalPaymentReservationRecord = {
  id: string;
  profileId: string;
  productId: string | null;
  provider: string;
  amountCents: number;
  platformCoins: number;
  status: string;
  createdAt: string;
};

export type VipLevelRecord = {
  level: number;
  name: string;
  requiredExperience: number;
  dailyGiftPlatformCoins: number;
  dailyGiftActionPower: number;
  actionPowerLimitBonus: number;
  quickSettleTimes: number;
  trainingQueueBonus: number;
  recruitRefreshTimes: number;
  shopDiscountBasisPoints: number;
  title: string;
  avatarFrame: string;
  summary: string;
};

export type VipCenterRecord = {
  wallet: PlatformWalletRecord;
  currentLevel: VipLevelRecord;
  nextLevel: VipLevelRecord | null;
  progressToNextBasisPoints: number;
  benefits: {
    title: string;
    avatarFrame: string;
    actionPowerLimit: number;
    quickSettleTimes: number;
    trainingQueueBonus: number;
    recruitRefreshTimes: number;
    shopDiscountBasisPoints: number;
  };
  dailyGift: {
    date: string;
    isClaimed: boolean;
    rewardPlatformCoins: number;
    rewardActionPower: number;
  };
};

export type VipDailyGiftRecord = {
  vipCenter: VipCenterRecord;
  profile: PlayerProfileRecord;
  result: string;
};

export type AdminVipAdjustmentRecord = {
  vipCenter: VipCenterRecord;
  auditLogId: string;
};

export type AdminVipConfigRecord = {
  config: VipLevelRecord;
  auditLogId: string;
};

export type AdminPlayerRowRecord = {
  profileId: string;
  accountId: string;
  username: string;
  serverId: string;
  serverName: string;
  founderName: string;
  companyName: string;
  cash: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netCashFlow: number;
  valuation: number;
  totalDebt: number;
  riskStatus: string;
  profileStatus: string;
  walletBalance: number;
  vipExperience: number;
  vipLevel: number;
  purchaseCount: number;
  paymentOrderCount: number;
  titleCount: number;
  achievementCompletedCount: number;
  knowledgeUnlockCount: number;
  guildName: string | null;
  createdAt: string;
};

export type AdminPlayerListRecord = {
  rows: AdminPlayerRowRecord[];
};

export type AdminCrossServerGroupRecord = CrossServerGroupRecord & {
  isActive: boolean;
};

export type AdminCrossServerGroupListRecord = {
  groups: AdminCrossServerGroupRecord[];
};

export type AdminCrossServerGroupAssignmentRecord = {
  group: AdminCrossServerGroupRecord;
  auditLogId: string;
};

export type AdminAuditLogRecord = {
  id: string;
  adminUsername: string;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
};

export type AdminConfigCenterRecord = {
  titles: Array<{
    id: string;
    name: string;
    category: string;
    source: string;
    bonusLabel: string;
    durationDays: number;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    category: string;
    conditionKind: string;
    conditionValue: number;
    rewardPlatformCoins: number;
    rewardCash: number;
  }>;
  knowledgeEntries: Array<{
    id: string;
    title: string;
    sourceUrl: string;
    collectedAt: string;
    contentVersion: string;
    auditStatus: string;
  }>;
  shopProducts: Array<{
    id: string;
    name: string;
    category: string;
    pricePlatformCoins: number;
    purchaseLimit: number;
    isActive: boolean;
  }>;
  leaderboardSnapshots: Array<{
    id: string;
    serverId: string;
    boardName: string;
    snapshotDate: string;
    createdAt: string;
  }>;
  mailCompensations: Array<{
    id: string;
    profileId: string;
    subject: string;
    platformCoins: number;
    reason: string;
    createdAt: string;
  }>;
  seasons: Array<{ id: string; name: string; status: string; startDate: string; endDate: string }>;
  activities: Array<{ id: string; name: string; status: string; leaderboardKey: string }>;
  scenarios: Array<{ id: string; name: string; rewardTitleId: string | null }>;
};

export type AdminKnowledgeEntryRecord = KnowledgeEntryRecord & {
  categoryId: string;
  sortOrder: number;
};

export type AdminKnowledgeListRecord = {
  rows: AdminKnowledgeEntryRecord[];
  total: number;
  categories: Array<{ id: string; name: string }>;
};

export type AdminKnowledgeUpdateInput = {
  summary: string;
  scenarioText: string;
  riskText: string;
  gameImpactText: string;
  actionTipText: string;
  sourceName: string;
  sourceUrl: string;
  collectedAt: string;
  contentVersion: string;
  reviewStatus: string;
  reason: string;
};

export type AdminKnowledgeUpdateRecord = AdminKnowledgeEntryRecord & {
  auditLogId: string;
};

export type AdminTitleActionRecord = {
  title: TitleRecord;
  auditLogId: string;
};

export type AdminMailCompensationRecord = {
  profile: PlayerProfileRecord;
  wallet: PlatformWalletRecord;
  auditLogId: string;
  mailId: string;
};

export type AdminProfileStatusRecord = {
  profileId: string;
  status: string;
  auditLogId: string;
};

export type TelemetryEventInput = {
  accountId: string;
  serverId: string;
  eventName: string;
  targetId: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type TelemetryEventRecord = {
  eventId: string;
};

export type ApiRequestLogInput = {
  traceId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
};

export type AdminAnalyticsRecord = {
  overview: {
    totalPlayers: number;
    retainedPlayers: number;
    apiErrorCount: number;
    slowApiCount: number;
  };
  onboarding: {
    tutorialSteps: Array<{ step: string; count: number }>;
  };
  business: {
    taskCompletionRateBasisPoints: number;
    achievementCompletionRateBasisPoints: number;
    knowledgeViewRateBasisPoints: number;
    eventChoiceRates: Array<{ option: string; count: number; rateBasisPoints: number }>;
    projectFailureRateBasisPoints: number;
    debtRatioDistribution: Array<{ band: string; count: number }>;
    fundingSuccessRateBasisPoints: number;
    employeeDepartureRateBasisPoints: number;
  };
  monetization: {
    platformCoinBalanceTotal: number;
    platformCoinGrantedTotal: number;
    platformCoinSpentTotal: number;
    vipLevelDistribution: Array<{ level: number; count: number }>;
    shopClickCount: number;
    shopPurchaseConversionBasisPoints: number;
  };
  alerts: Array<{ level: string; message: string; traceId: string | null }>;
};

export type LeaderboardRowRecord = {
  rank: number;
  profileId: string;
  founderName: string;
  companyName: string;
  value: number;
  valueLabel: string;
  equippedTitle: string | null;
};

export type LeaderboardBoardRecord = {
  key: string;
  name: string;
  scope: "server" | "cross" | "activity";
  isActive: boolean;
  rows: LeaderboardRowRecord[];
  snapshotDate: string;
};

export type LeaderboardCenterRecord = {
  boards: LeaderboardBoardRecord[];
  activityBoards: LeaderboardBoardRecord[];
};

export type LeaderboardSettlementRecord = {
  leaderboard: LeaderboardCenterRecord;
  deliveredRewards: number;
};

export type SeasonStatus = "upcoming" | "active" | "ended";

export type SeasonCenterRecord = {
  season: {
    id: string;
    name: string;
    theme: string;
    status: SeasonStatus;
    startDate: string;
    endDate: string;
    points: number;
    pass: { isPurchased: boolean; pricePlatformCoins: number };
  };
  tasks: Array<{ id: string; title: string; description: string; progress: number; target: number; rewardPoints: number; rewardItem: ItemRewardRecord | null; isClaimed: boolean }>;
  activities: Array<{ id: string; name: string; status: SeasonStatus; isJoined: boolean; score: number; targetScore: number; rewardClaimed: boolean }>;
  activityBoards: LeaderboardBoardRecord[];
  shopItems: Array<{ id: string; name: string; costPoints: number; summary: string; rewardItem: ItemRewardRecord | null; isAvailable: boolean; lockedReason: string | null }>;
  scenarios: Array<{ id: string; name: string; summary: string; bestScore: number | null }>;
  wallet: PlatformWalletRecord;
};

export type SeasonTaskProgressRecord = {
  season: SeasonCenterRecord["season"];
  task: SeasonCenterRecord["tasks"][number];
};

export type SeasonPassPurchaseRecord = {
  season: SeasonCenterRecord["season"];
  wallet: PlatformWalletRecord;
  isDuplicate: boolean;
};

export type ActivityActionRecord = {
  season: SeasonCenterRecord["season"];
  activity: SeasonCenterRecord["activities"][number];
  profile: PlayerProfileRecord;
};

export type ActivityShopPurchaseRecord = {
  season: SeasonCenterRecord["season"];
  wallet: PlatformWalletRecord;
  item: SeasonCenterRecord["shopItems"][number];
  profile: PlayerProfileRecord;
  isDuplicate: boolean;
};

export type ScenarioRunRecord = {
  run: {
    id: string;
    scenarioId: string;
    initialState: { cashDays: number; debtRatioBasisPoints: number; coreEmployeeRisk: string; customerDelay: string };
    choices: string[];
    score: number | null;
    grade: string | null;
    rewardClaimed: boolean;
  };
};

export type CrossServerGroupRecord = {
  id: string;
  name: string;
  ruleLabel: string;
  serverIds: string[];
};

export type CrossServerCenterRecord = {
  group: CrossServerGroupRecord;
  isRegistered: boolean;
  boards: LeaderboardBoardRecord[];
  guildSeason: {
    isGuildMember: boolean;
    isManager: boolean;
    isRegistered: boolean;
    canRegister: boolean;
    guildId: string | null;
    guildName: string | null;
    memberCount: number;
    todayActiveMemberCount: number;
    minMembers: number;
    minTodayActiveMembers: number;
    rewardLabel: string;
    statusLabel: string;
  };
  guildBoard: {
    key: string;
    name: string;
    scope: "cross";
    isActive: boolean;
    snapshotDate: string;
    rows: Array<{
      rank: number;
      guildId: string;
      guildName: string;
      serverId: string;
      leaderProfileId: string;
      leaderFounderName: string;
      memberCount: number;
      value: number;
      valueLabel: string;
    }>;
  };
};

export type CrossServerGuildSettlementRecord = LeaderboardSettlementRecord & {
  rewards: Array<{
    guildId: string;
    guildName: string;
    leaderProfileId: string;
    leaderFounderName: string;
    rank: number;
    reputationReward: number;
  }>;
};

export type TitleRecord = {
  id: string;
  name: string;
  category: string;
  source: string;
  bonusLabel: string;
  obtainedAt: string;
  expiresAt: string | null;
  isEquipped: boolean;
  isExpired: boolean;
};

export type TitleCenterRecord = {
  equippedTitle: TitleRecord | null;
  titles: TitleRecord[];
};

export type AchievementRecord = {
  id: string;
  name: string;
  category: string;
  description: string;
  progress: number;
  target: number;
  isHidden: boolean;
  isCompleted: boolean;
  isClaimed: boolean;
  rewardLabel: string;
};

export type AchievementClaimRecord = {
  achievement: AchievementRecord;
  profile: PlayerProfileRecord;
  titleCenter: TitleCenterRecord;
  result: string;
};

export type KnowledgeEntryRecord = {
  id: string;
  category: string;
  title: string;
  summary: string;
  scenarioText: string;
  riskText: string;
  gameImpactText: string;
  actionTipText: string;
  sourceName: string;
  sourceUrl: string;
  collectedAt: string;
  contentVersion: string;
  disclaimer: string;
  reviewStatus: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
};

export type GuildCenterRecord = {
  guild: {
    id: string;
    name: string;
    level: number;
    contributionScore: number;
    announcement: string;
    collaborationRules: string;
  } | null;
  members: Array<{
    profileId: string;
    founderName: string;
    companyName: string;
    role: string;
    contributionScore: number;
  }>;
  joinRequests: Array<{
    id: string;
    profileId: string;
    founderName: string;
    companyName: string;
    status: string;
    createdAt: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    contributionReward: number;
    isClaimed: boolean;
    isClaimable: boolean;
  }>;
  techs: Array<{
    id: string;
    name: string;
    description: string;
    level: number;
    maxLevel: number;
    upgradeCost: number | null;
    isUpgradable: boolean;
    bonusLabel: string;
  }>;
  helpRequests: Array<{
    id: string;
    profileId: string;
    founderName: string;
    companyName: string;
    requestType: string;
    status: string;
    createdAt: string;
    fulfilledAt: string | null;
    canFulfill?: boolean;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    progress: number;
    target: number;
    rewardReputation: number;
    rewardLabel: string;
    isClaimed: boolean;
    isClaimable: boolean;
  }>;
  todayActiveMemberCount: number;
  todayCollaborationCount: number;
  recentActivities: Array<{
    id: string;
    profileId: string;
    founderName: string;
    action: string;
    actionLabel: string;
    createdAt: string;
  }>;
  leaderboard: LeaderboardRowRecord[];
};

export type GuildActionRecord = {
  guildCenter: GuildCenterRecord;
  result: string;
};

export type GuildJoinActionRecord = GuildActionRecord & {
  applicationStatus: "approved" | "pending";
};

export type GuildLeaderboardSettlementRecord = GuildActionRecord & {
  deliveredRewards: number;
  rewards: Array<{
    profileId: string;
    founderName: string;
    companyName: string;
    rank: number;
    reputationReward: number;
  }>;
};

export type GameRepository = {
  createAccount(account: Omit<AccountRecord, "id">): Promise<AccountRecord | "ACCOUNT_EXISTS">;
  findAccountByUsername(username: string): Promise<AccountRecord | undefined>;
  createAccountSession(accountId: string, token: string): Promise<void>;
  getAccountBySessionToken(token: string): Promise<AccountRecord | undefined>;
  recordTelemetryEvent(event: TelemetryEventInput): Promise<TelemetryEventRecord | "PLAYER_NOT_FOUND">;
  getAdminAnalytics(today: string): Promise<AdminAnalyticsRecord>;
  recordApiRequestLog(input: ApiRequestLogInput): Promise<void>;
  findAdminByUsername(username: string): Promise<AdminUserRecord | undefined>;
  createAdminSession(adminUserId: string, token: string): Promise<void>;
  getAdminBySessionToken(token: string): Promise<AdminUserRecord | undefined>;
  listServers(): Promise<ServerRecord[]>;
  listAvatars(): Promise<AvatarRecord[]>;
  getProfile(accountId: string, serverId: string): Promise<PlayerProfileRecord | undefined>;
  createProfile(profile: CreatePlayerProfileInput): Promise<PlayerProfileRecord | "PLAYER_EXISTS">;
  getCompanyGrowth(accountId: string, serverId: string): Promise<CompanyGrowthRecord | "PLAYER_NOT_FOUND">;
  claimFullLevelChest(accountId: string, serverId: string): Promise<CompanyGrowthRecord | "PLAYER_NOT_FOUND" | "FULL_LEVEL_CHEST_NOT_READY">;
  listTasks(accountId: string, serverId: string, today: string): Promise<TaskRecord[] | "PLAYER_NOT_FOUND">;
  advanceTask(accountId: string, serverId: string, taskId: string, today: string, knowledgeId?: string | null): Promise<TaskRecord | "PLAYER_NOT_FOUND" | "TASK_NOT_FOUND" | "TASK_KNOWLEDGE_MISMATCH" | "KNOWLEDGE_LOCKED">;
  claimTask(accountId: string, serverId: string, taskId: string, today: string): Promise<TaskRecord | "PLAYER_NOT_FOUND" | "TASK_NOT_FOUND" | "TASK_INCOMPLETE" | "TASK_ALREADY_CLAIMED">;
  listRandomTasks(accountId: string, serverId: string, today: string): Promise<RandomTaskCenterRecord | "PLAYER_NOT_FOUND">;
  resolveRandomTask(accountId: string, serverId: string, randomTaskId: string, option: "A" | "B", today: string, modifierItemId?: string): Promise<RandomTaskActionRecord | "PLAYER_NOT_FOUND" | "RANDOM_TASK_NOT_FOUND" | "RANDOM_TASK_ALREADY_RESOLVED" | "INSUFFICIENT_ACTION_POWER" | "ITEM_NOT_FOUND" | "ITEM_NOT_USABLE">;
  dismissRandomTask(accountId: string, serverId: string, randomTaskId: string, today: string): Promise<RandomTaskActionRecord | "PLAYER_NOT_FOUND" | "RANDOM_TASK_NOT_FOUND" | "RANDOM_TASK_ALREADY_RESOLVED">;
  getCompanyFinance(accountId: string, serverId: string): Promise<CompanyFinanceRecord | "PLAYER_NOT_FOUND">;
  settleCompanyDay(accountId: string, serverId: string): Promise<CompanyFinanceRecord | "PLAYER_NOT_FOUND">;
  settleCompanyMonth(accountId: string, serverId: string, reportMonth: number): Promise<CompanyFinanceSettlementRecord | "PLAYER_NOT_FOUND">;
  listEmployees(accountId: string, serverId: string): Promise<EmployeeRecord[] | "PLAYER_NOT_FOUND">;
  recruitEmployee(accountId: string, serverId: string): Promise<EmployeeRecord | "PLAYER_NOT_FOUND" | "NO_EMPLOYEE_AVAILABLE">;
  cultivateEmployee(accountId: string, serverId: string, employeeId: string): Promise<EmployeeRecord | "PLAYER_NOT_FOUND" | "EMPLOYEE_NOT_FOUND">;
  grantEmployeeEquity(accountId: string, serverId: string, employeeId: string): Promise<EmployeeRecord | "PLAYER_NOT_FOUND" | "EMPLOYEE_NOT_FOUND" | "EQUITY_LIMIT_REACHED">;
  dismissEmployee(accountId: string, serverId: string, employeeId: string): Promise<CompanyFinanceRecord | "PLAYER_NOT_FOUND" | "EMPLOYEE_NOT_FOUND">;
  listProjects(accountId: string, serverId: string): Promise<ProjectRecord[] | "PLAYER_NOT_FOUND">;
  startProject(accountId: string, serverId: string): Promise<ProjectRecord | "PLAYER_NOT_FOUND" | "NO_PROJECT_AVAILABLE">;
  assignProjectEmployee(accountId: string, serverId: string, projectId: string, employeeId: string): Promise<ProjectRecord | "PLAYER_NOT_FOUND" | "PROJECT_NOT_FOUND" | "EMPLOYEE_NOT_FOUND">;
  advanceProject(accountId: string, serverId: string, projectId: string): Promise<ProjectRecord | "PLAYER_NOT_FOUND" | "PROJECT_NOT_FOUND" | "PROJECT_ALREADY_SETTLED">;
  settleProject(accountId: string, serverId: string, projectId: string): Promise<ProjectSettlementRecord | "PLAYER_NOT_FOUND" | "PROJECT_NOT_FOUND" | "PROJECT_INCOMPLETE">;
  listEvents(accountId: string, serverId: string): Promise<EventRecord[] | "PLAYER_NOT_FOUND">;
  chooseEvent(accountId: string, serverId: string, eventId: string, option: "A" | "B"): Promise<EventChoiceRecord | "PLAYER_NOT_FOUND" | "EVENT_NOT_FOUND" | "EVENT_ALREADY_RESOLVED" | "INVALID_EVENT_OPTION">;
  listLoans(accountId: string, serverId: string): Promise<LoanCenterRecord | "PLAYER_NOT_FOUND">;
  applyLoan(accountId: string, serverId: string, loanConfigId: string): Promise<LoanActionRecord | "PLAYER_NOT_FOUND" | "LOAN_NOT_FOUND" | "CREDIT_NOT_ENOUGH" | "LOAN_ALREADY_ACTIVE">;
  repayLoan(accountId: string, serverId: string, loanId: string, mode: "scheduled" | "full"): Promise<LoanActionRecord | "PLAYER_NOT_FOUND" | "LOAN_NOT_FOUND" | "INSUFFICIENT_CASH">;
  settleLoanPeriod(accountId: string, serverId: string): Promise<LoanActionRecord | "PLAYER_NOT_FOUND" | "NO_ACTIVE_LOAN">;
  resolveCrisis(accountId: string, serverId: string, route: "financing" | "cost_cut" | "restructure"): Promise<LoanCenterRecord | "PLAYER_NOT_FOUND" | "CRISIS_NOT_ACTIVE" | "INVALID_CRISIS_ROUTE">;
  listFundings(accountId: string, serverId: string): Promise<FundingCenterRecord | "PLAYER_NOT_FOUND">;
  startFunding(accountId: string, serverId: string, investorId: string): Promise<FundingActionRecord | "PLAYER_NOT_FOUND" | "INVESTOR_NOT_FOUND" | "FUNDING_LOCKED" | "FUNDING_ALREADY_ACTIVE">;
  settleFunding(accountId: string, serverId: string, fundingId: string): Promise<FundingActionRecord | "PLAYER_NOT_FOUND" | "FUNDING_NOT_FOUND" | "FUNDING_ALREADY_SETTLED">;
  listProducts(accountId: string, serverId: string): Promise<ProductCenterRecord | "PLAYER_NOT_FOUND">;
  startProduct(accountId: string, serverId: string, productConfigId: string): Promise<ProductActionRecord | "PLAYER_NOT_FOUND" | "PRODUCT_NOT_FOUND" | "PRODUCT_ALREADY_ACTIVE" | "INSUFFICIENT_CASH">;
  advanceProduct(accountId: string, serverId: string, productId: string): Promise<ProductActionRecord | "PLAYER_NOT_FOUND" | "PRODUCT_NOT_FOUND" | "PRODUCT_CLOSED" | "INSUFFICIENT_CASH">;
  refactorProduct(accountId: string, serverId: string, productId: string): Promise<ProductActionRecord | "PLAYER_NOT_FOUND" | "PRODUCT_NOT_FOUND" | "PRODUCT_CLOSED" | "INSUFFICIENT_CASH">;
  closeProduct(accountId: string, serverId: string, productId: string): Promise<ProductActionRecord | "PLAYER_NOT_FOUND" | "PRODUCT_NOT_FOUND" | "PRODUCT_CLOSED">;
  listMarkets(accountId: string, serverId: string): Promise<MarketCenterRecord | "PLAYER_NOT_FOUND">;
  enterMarket(accountId: string, serverId: string, trackId: string): Promise<MarketActionRecord | "PLAYER_NOT_FOUND" | "MARKET_NOT_FOUND" | "MARKET_ALREADY_ACTIVE">;
  triggerCompetitorAction(accountId: string, serverId: string, trackId: string): Promise<MarketActionRecord | "PLAYER_NOT_FOUND" | "MARKET_NOT_FOUND" | "COMPETITOR_ACTION_NOT_FOUND">;
  respondCompetitorAction(accountId: string, serverId: string, actionId: string, response: "defend" | "counter"): Promise<MarketActionRecord | "PLAYER_NOT_FOUND" | "MARKET_NOT_FOUND" | "COMPETITOR_ACTION_NOT_FOUND" | "COMPETITOR_ACTION_SETTLED" | "INSUFFICIENT_CASH">;
  getWallet(accountId: string, serverId: string): Promise<PlatformWalletRecord | "PLAYER_NOT_FOUND">;
  listInventory(accountId: string, serverId: string): Promise<InventoryCenterRecord | "PLAYER_NOT_FOUND">;
  useInventoryItem(accountId: string, serverId: string, itemId: string): Promise<InventoryUseRecord | "PLAYER_NOT_FOUND" | "ITEM_NOT_FOUND" | "ITEM_NOT_USABLE">;
  listShop(accountId: string, serverId: string): Promise<ShopCenterRecord | "PLAYER_NOT_FOUND">;
  purchaseShopProduct(accountId: string, serverId: string, productId: string, requestId: string, today: string): Promise<ShopPurchaseRecord | "PLAYER_NOT_FOUND" | "SHOP_PRODUCT_NOT_FOUND" | "INSUFFICIENT_PLATFORM_COINS" | "PURCHASE_LIMIT_REACHED">;
  adjustPlatformCoins(adminUserId: string, profileId: string, changeAmount: number, source: PlatformCoinLedgerSource, reason: string): Promise<AdminWalletAdjustmentRecord | "PLAYER_NOT_FOUND" | "INVALID_PLATFORM_COIN_SOURCE" | "INSUFFICIENT_PLATFORM_COINS">;
  reserveExternalPayment(accountId: string, serverId: string, productId: string | null, amountCents: number, platformCoins: number): Promise<ExternalPaymentReservationRecord | "PLAYER_NOT_FOUND">;
  getVipCenter(accountId: string, serverId: string, today: string): Promise<VipCenterRecord | "PLAYER_NOT_FOUND">;
  claimVipDailyGift(accountId: string, serverId: string, today: string): Promise<VipDailyGiftRecord | "PLAYER_NOT_FOUND" | "VIP_DAILY_GIFT_ALREADY_CLAIMED">;
  adjustVipExperience(adminUserId: string, profileId: string, vipExperience: number, reason: string): Promise<AdminVipAdjustmentRecord | "PLAYER_NOT_FOUND">;
  getAdminVipRecord(profileId: string, today: string): Promise<VipCenterRecord | "PLAYER_NOT_FOUND">;
  listVipLevelConfigs(): Promise<VipLevelRecord[]>;
  upsertVipLevelConfig(adminUserId: string, config: VipLevelRecord, reason: string): Promise<AdminVipConfigRecord>;
  listAdminPlayers(keyword: string, today: string): Promise<AdminPlayerListRecord>;
  getAdminConfigCenter(): Promise<AdminConfigCenterRecord>;
  listAdminAuditLogs(): Promise<AdminAuditLogRecord[]>;
  listAdminKnowledgeEntries(filters: { keyword: string; category: string; reviewStatus: string }): Promise<AdminKnowledgeListRecord>;
  updateAdminKnowledgeEntry(adminUserId: string, knowledgeId: string, input: AdminKnowledgeUpdateInput): Promise<AdminKnowledgeUpdateRecord | "KNOWLEDGE_NOT_FOUND">;
  grantAdminTitle(adminUserId: string, profileId: string, titleId: string, reason: string): Promise<AdminTitleActionRecord | "PLAYER_NOT_FOUND" | "TITLE_NOT_FOUND">;
  revokeAdminTitle(adminUserId: string, profileId: string, titleId: string, reason: string): Promise<{ auditLogId: string } | "PLAYER_NOT_FOUND" | "TITLE_NOT_FOUND">;
  sendAdminMailCompensation(adminUserId: string, profileId: string, subject: string, body: string, platformCoins: number, reason: string): Promise<AdminMailCompensationRecord | "PLAYER_NOT_FOUND" | "INSUFFICIENT_PLATFORM_COINS">;
  updateAdminProfileStatus(adminUserId: string, profileId: string, status: "active" | "banned", reason: string): Promise<AdminProfileStatusRecord | "PLAYER_NOT_FOUND">;
  settleAdminLeaderboards(adminUserId: string, serverId: string, today: string, reason: string): Promise<(LeaderboardSettlementRecord & { auditLogId: string }) | "PLAYER_NOT_FOUND">;
  listAdminCrossServerGroups(): Promise<AdminCrossServerGroupListRecord>;
  assignAdminCrossServerGroup(adminUserId: string, serverId: string, groupId: string, reason: string): Promise<AdminCrossServerGroupAssignmentRecord | "SERVER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND">;
  getSeasonCenter(accountId: string, serverId: string, today: string): Promise<SeasonCenterRecord | "PLAYER_NOT_FOUND" | "SEASON_NOT_FOUND">;
  progressSeasonTask(accountId: string, serverId: string, taskId: string, today: string): Promise<SeasonTaskProgressRecord | "PLAYER_NOT_FOUND" | "SEASON_NOT_FOUND" | "SEASON_TASK_NOT_FOUND" | "SEASON_NOT_ACTIVE">;
  purchaseSeasonPass(accountId: string, serverId: string, seasonId: string, requestId: string, today: string): Promise<SeasonPassPurchaseRecord | "PLAYER_NOT_FOUND" | "SEASON_NOT_FOUND" | "SEASON_NOT_ACTIVE" | "INSUFFICIENT_PLATFORM_COINS">;
  joinActivity(accountId: string, serverId: string, activityId: string, today: string): Promise<ActivityActionRecord | "PLAYER_NOT_FOUND" | "ACTIVITY_NOT_FOUND" | "ACTIVITY_NOT_ACTIVE">;
  progressActivity(accountId: string, serverId: string, activityId: string, scoreDelta: number, today: string): Promise<ActivityActionRecord | "PLAYER_NOT_FOUND" | "ACTIVITY_NOT_FOUND" | "ACTIVITY_NOT_JOINED" | "ACTIVITY_NOT_ACTIVE">;
  claimActivityReward(accountId: string, serverId: string, activityId: string, today: string): Promise<ActivityActionRecord | "PLAYER_NOT_FOUND" | "ACTIVITY_NOT_FOUND" | "ACTIVITY_NOT_JOINED" | "ACTIVITY_INCOMPLETE" | "ACTIVITY_REWARD_ALREADY_CLAIMED" | "ACTIVITY_NOT_ACTIVE">;
  purchaseActivityShopItem(accountId: string, serverId: string, itemId: string, requestId: string, today: string): Promise<ActivityShopPurchaseRecord | "PLAYER_NOT_FOUND" | "SEASON_NOT_FOUND" | "ACTIVITY_SHOP_ITEM_NOT_FOUND" | "INSUFFICIENT_ACTIVITY_POINTS" | "PURCHASE_LIMIT_REACHED">;
  startScenario(accountId: string, serverId: string, scenarioId: string): Promise<ScenarioRunRecord | "PLAYER_NOT_FOUND" | "SCENARIO_NOT_FOUND">;
  settleScenario(accountId: string, serverId: string, runId: string, choices: string[]): Promise<ScenarioRunRecord | "PLAYER_NOT_FOUND" | "SCENARIO_RUN_NOT_FOUND">;
  getLeaderboards(accountId: string, serverId: string, today: string): Promise<LeaderboardCenterRecord | "PLAYER_NOT_FOUND">;
  settleLeaderboardRewards(accountId: string, serverId: string, today: string): Promise<LeaderboardSettlementRecord | "PLAYER_NOT_FOUND">;
  getCrossServerCenter(accountId: string, serverId: string, today: string): Promise<CrossServerCenterRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND">;
  registerCrossServer(accountId: string, serverId: string, today: string): Promise<CrossServerCenterRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND">;
  settleCrossServerRewards(accountId: string, serverId: string, today: string): Promise<LeaderboardSettlementRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND">;
  registerCrossServerGuild(accountId: string, serverId: string, today: string): Promise<CrossServerCenterRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND" | "GUILD_NOT_JOINED" | "GUILD_PERMISSION_DENIED" | "GUILD_SEASON_REQUIREMENT_NOT_MET">;
  settleCrossServerGuildRewards(accountId: string, serverId: string, today: string): Promise<CrossServerGuildSettlementRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND" | "GUILD_NOT_JOINED">;
  listTitles(accountId: string, serverId: string, today: string): Promise<TitleCenterRecord | "PLAYER_NOT_FOUND">;
  equipTitle(accountId: string, serverId: string, titleId: string, today: string): Promise<TitleCenterRecord | "PLAYER_NOT_FOUND" | "TITLE_NOT_FOUND" | "TITLE_EXPIRED">;
  listAchievements(accountId: string, serverId: string): Promise<AchievementRecord[] | "PLAYER_NOT_FOUND">;
  claimAchievement(accountId: string, serverId: string, achievementId: string): Promise<AchievementClaimRecord | "PLAYER_NOT_FOUND" | "ACHIEVEMENT_NOT_FOUND" | "ACHIEVEMENT_INCOMPLETE" | "ACHIEVEMENT_ALREADY_CLAIMED">;
  listKnowledge(accountId: string, serverId: string): Promise<KnowledgeEntryRecord[] | "PLAYER_NOT_FOUND">;
  getGuildCenter(accountId: string, serverId: string, today: string): Promise<GuildCenterRecord | "PLAYER_NOT_FOUND">;
  joinOrCreateGuild(accountId: string, serverId: string, guildName: string, today: string): Promise<GuildJoinActionRecord | "PLAYER_NOT_FOUND">;
  reviewGuildApplication(accountId: string, serverId: string, requestId: string, decision: "approved" | "rejected", today: string): Promise<GuildActionRecord | "PLAYER_NOT_FOUND" | "GUILD_NOT_JOINED" | "GUILD_PERMISSION_DENIED" | "GUILD_APPLICATION_NOT_FOUND" | "GUILD_APPLICATION_ALREADY_REVIEWED">;
  updateGuildMemberRole(accountId: string, serverId: string, profileId: string, role: "member" | "vice_leader", today: string): Promise<GuildActionRecord | "PLAYER_NOT_FOUND" | "GUILD_NOT_JOINED" | "GUILD_PERMISSION_DENIED" | "GUILD_MEMBER_NOT_FOUND" | "GUILD_SELF_ROLE_FORBIDDEN">;
  removeGuildMember(accountId: string, serverId: string, profileId: string, today: string): Promise<GuildActionRecord | "PLAYER_NOT_FOUND" | "GUILD_NOT_JOINED" | "GUILD_PERMISSION_DENIED" | "GUILD_MEMBER_NOT_FOUND" | "GUILD_SELF_REMOVE_FORBIDDEN">;
  updateGuildSettings(accountId: string, serverId: string, announcement: string, collaborationRules: string, today: string): Promise<GuildActionRecord | "PLAYER_NOT_FOUND" | "GUILD_NOT_JOINED" | "GUILD_PERMISSION_DENIED">;
  requestGuildHelp(accountId: string, serverId: string, requestType: string, today: string): Promise<GuildActionRecord | "PLAYER_NOT_FOUND" | "GUILD_NOT_JOINED">;
  fulfillGuildHelp(accountId: string, serverId: string, requestId: string, today: string): Promise<GuildActionRecord | "PLAYER_NOT_FOUND" | "GUILD_NOT_JOINED" | "GUILD_HELP_NOT_FOUND" | "GUILD_HELP_ALREADY_FULFILLED" | "GUILD_HELP_SELF_FULFILL_FORBIDDEN">;
  claimGuildTask(accountId: string, serverId: string, taskId: string, today: string): Promise<GuildActionRecord | "PLAYER_NOT_FOUND" | "GUILD_NOT_JOINED" | "GUILD_TASK_NOT_FOUND" | "GUILD_TASK_NOT_READY" | "GUILD_TASK_ALREADY_CLAIMED">;
  upgradeGuildTech(accountId: string, serverId: string, techId: string, today: string): Promise<GuildActionRecord | "PLAYER_NOT_FOUND" | "GUILD_NOT_JOINED" | "GUILD_TECH_NOT_FOUND" | "GUILD_TECH_MAXED" | "GUILD_CONTRIBUTION_NOT_ENOUGH">;
  claimGuildProjectReward(accountId: string, serverId: string, projectId: string, today: string): Promise<GuildActionRecord | "PLAYER_NOT_FOUND" | "GUILD_NOT_JOINED" | "GUILD_PROJECT_NOT_FOUND" | "GUILD_PROJECT_NOT_READY" | "GUILD_PROJECT_REWARD_CLAIMED">;
  settleGuildLeaderboard(accountId: string, serverId: string, today: string): Promise<GuildLeaderboardSettlementRecord | "PLAYER_NOT_FOUND" | "GUILD_NOT_JOINED">;
  disconnect(): Promise<void>;
};

const toServerRecord = (server: {
  id: string;
  name: string;
  status: string;
  label: string;
  isRecommended: boolean;
}): ServerRecord => ({
  id: server.id,
  name: server.name,
  status: server.status === "new" || server.status === "busy" ? server.status : "recommended",
  label: server.label,
  isRecommended: server.isRecommended
});

const toProfileRecord = (profile: {
  id: string;
  accountId: string;
  serverId: string;
  avatarId: string;
  founderName: string;
  companyName: string;
  companyLevel: number;
  companyExperience: number;
  cash: number;
  platformCoins: number;
  premiumCurrency: number;
  reputation: number;
  actionPower: number;
  actionPowerLimit: number;
  actionPowerRecoveredAt: Date;
  monthlyIncome: number;
  monthlyExpense: number;
  valuation: number;
  founderEquityBasisPoints: number;
  totalDebt: number;
  creditRating: string;
  employeeSatisfaction: number;
  customerSatisfaction: number;
  financeMonth: number;
  operatingDay: number;
  riskStatus: string;
  pendingEventCount: number;
  unreadMailCount: number;
  debtWarning: string;
  createdAt: Date;
}): PlayerProfileRecord => ({
  ...profile,
  actionPowerRecoveredAt: profile.actionPowerRecoveredAt.toISOString(),
  createdAt: profile.createdAt.toISOString()
});

const toCompanyFinanceRecord = (profile: PlayerProfileRecord): CompanyFinanceRecord => {
  const report = calculateFinanceReport(profile);
  const normalizeRiskStatus = (status: string): CompanyFinanceRecord["riskStatus"] =>
    status === "预警" || status === "资金紧张" ? status : "稳健";
  const riskRank: Record<CompanyFinanceRecord["riskStatus"], number> = { "稳健": 0, "预警": 1, "资金紧张": 2 };
  const profileRiskStatus = normalizeRiskStatus(profile.riskStatus);
  const riskStatus = riskRank[profileRiskStatus] > riskRank[report.riskStatus] ? profileRiskStatus : report.riskStatus;

  return {
    profileId: profile.id,
    companyName: profile.companyName,
    companyLevel: profile.companyLevel,
    cash: profile.cash,
    monthlyIncome: profile.monthlyIncome,
    monthlyExpense: profile.monthlyExpense,
    netCashFlow: report.netCashFlow,
    valuation: profile.valuation,
    founderEquityBasisPoints: profile.founderEquityBasisPoints,
    totalDebt: profile.totalDebt,
    debtRatioBasisPoints: report.debtRatioBasisPoints,
    creditRating: profile.creditRating,
    brandReputation: profile.reputation,
    employeeSatisfaction: profile.employeeSatisfaction,
    customerSatisfaction: profile.customerSatisfaction,
    financeMonth: profile.financeMonth,
    operatingDay: profile.operatingDay,
    riskStatus,
    riskTips: report.riskTips
  };
};

const toEmployeeRecord = (employee: {
  id: string;
  configId: string;
  name: string;
  role: string;
  careerLevel: string;
  rarity: string;
  level: number;
  salary: number;
  pressure: number;
  loyalty: number;
  growthPotential: number;
  management: number;
  negotiation: number;
  execution: number;
  specialty: string;
  equityBasisPoints: number;
  assignedTo: string | null;
  isActive: boolean;
}): EmployeeRecord => ({
  ...employee
});

const readProjectStatus = (status: string): ProjectRecord["status"] =>
  status === "ready" || status === "settled" || status === "failed" ? status : "active";

const readProjectResult = (result: string | null): ProjectRecord["result"] =>
  result === "success" || result === "failure" ? result : null;

const toProjectRecord = (
  project: {
    id: string;
    configId: string;
    name: string;
    category: string;
    stage: number;
    progress: number;
    cycleDays: number;
    budget: number;
    risk: string;
    successRateBase: number;
    revenueReward: number;
    assignedEmployeeId: string | null;
    assignedEmployeeName: string | null;
    status: string;
    result: string | null;
    summary: string;
    settledAt: Date | null;
  },
  employee?: { management: number; negotiation: number; execution: number } | null
): ProjectRecord => ({
  id: project.id,
  configId: project.configId,
  name: project.name,
  category: project.category,
  stage: project.stage,
  progress: project.progress,
  cycleDays: project.cycleDays,
  budget: project.budget,
  risk: project.risk,
  successRate: calculateProjectSuccessRate({
    baseRate: project.successRateBase,
    employeeManagement: employee?.management,
    employeeNegotiation: employee?.negotiation,
    employeeExecution: employee?.execution
  }),
  revenueReward: project.revenueReward,
  assignedEmployeeId: project.assignedEmployeeId,
  assignedEmployeeName: project.assignedEmployeeName,
  status: readProjectStatus(project.status),
  result: readProjectResult(project.result),
  summary: project.summary,
  settledAt: project.settledAt?.toISOString() ?? null
});

const readEventStatus = (status: string): EventRecord["status"] =>
  status === "resolved" ? "resolved" : "pending";

const readEventOption = (option: string | null): EventRecord["selectedOption"] =>
  option === "A" || option === "B" ? option : null;

const formatEventImpact = (cash: number, reputation: number, customerSatisfaction: number, riskDelta: number): string => {
  const parts = [
    cash === 0 ? undefined : `现金${cash > 0 ? "+" : ""}${cash}`,
    reputation === 0 ? undefined : `声望${reputation > 0 ? "+" : ""}${reputation}`,
    customerSatisfaction === 0 ? undefined : `满意度${customerSatisfaction > 0 ? "+" : ""}${customerSatisfaction}`,
    riskDelta === 0 ? undefined : `风险${riskDelta > 0 ? "+" : ""}${riskDelta}`
  ].filter((part): part is string => part !== undefined);

  return parts.length === 0 ? "经营影响稳定" : parts.join(" / ");
};

const toEventRecord = (event: {
  id: string;
  configId: string;
  status: string;
  selectedOption: string | null;
  resultSummary: string | null;
  knowledgeUnlocked: boolean;
  createdAt: Date;
  resolvedAt: Date | null;
  config: {
    title: string;
    source: string;
    channel: string;
    summary: string;
    context: string;
    optionA: string;
    optionAResult: string;
    optionACash: number;
    optionAReputation: number;
    optionACustomerSatisfaction: number;
    optionARiskDelta: number;
    optionB: string;
    optionBResult: string;
    optionBCash: number;
    optionBReputation: number;
    optionBCustomerSatisfaction: number;
    optionBRiskDelta: number;
    knowledgeId: string | null;
    knowledgeTitle: string | null;
    riskExplanation: string;
  };
}, knowledge?: KnowledgeLinkRecord | null): EventRecord => ({
  id: event.id,
  configId: event.configId,
  title: event.config.title,
  source: event.config.source,
  channel: event.config.channel,
  summary: event.config.summary,
  context: event.config.context,
  options: [
    {
      key: "A",
      label: event.config.optionA,
      impactPreview: formatEventImpact(
        event.config.optionACash,
        event.config.optionAReputation,
        event.config.optionACustomerSatisfaction,
        event.config.optionARiskDelta
      )
    },
    {
      key: "B",
      label: event.config.optionB,
      impactPreview: formatEventImpact(
        event.config.optionBCash,
        event.config.optionBReputation,
        event.config.optionBCustomerSatisfaction,
        event.config.optionBRiskDelta
      )
    }
  ],
  status: readEventStatus(event.status),
  selectedOption: readEventOption(event.selectedOption),
  resultSummary: event.resultSummary,
  knowledgeTitle: event.config.knowledgeTitle,
  knowledgeUnlocked: event.knowledgeUnlocked,
  riskExplanation: event.config.riskExplanation,
  knowledge: knowledge ?? null,
  createdAt: event.createdAt.toISOString(),
  resolvedAt: event.resolvedAt?.toISOString() ?? null
});

const readLoanStatus = (status: string): LoanRecord["status"] =>
  status === "overdue" || status === "settled" ? status : "active";

const creditRank = (creditRating: string): number => {
  if (creditRating === "A") {
    return 3;
  }
  if (creditRating === "B") {
    return 2;
  }
  if (creditRating === "C") {
    return 1;
  }
  return 0;
};

const downgradeCredit = (creditRating: string): string => {
  if (creditRating === "A") {
    return "B";
  }
  if (creditRating === "B") {
    return "C";
  }
  return "D";
};

const calculatePrincipalPayment = (loan: { remainingPrincipal: number; remainingMonths: number }): number => {
  return Math.min(loan.remainingPrincipal, Math.max(1, Math.ceil(loan.remainingPrincipal / Math.max(loan.remainingMonths, 1))));
};

const toLoanRecord = (loan: {
  id: string;
  configId: string;
  name: string;
  lender: string;
  principal: number;
  remainingPrincipal: number;
  annualRateBasisPoints: number;
  termMonths: number;
  remainingMonths: number;
  monthlyPayment: number;
  overduePeriods: number;
  penaltyAccrued: number;
  status: string;
  createdAt: Date;
  settledAt: Date | null;
}): LoanRecord => ({
  id: loan.id,
  configId: loan.configId,
  name: loan.name,
  lender: loan.lender,
  principal: loan.principal,
  remainingPrincipal: loan.remainingPrincipal,
  annualRateBasisPoints: loan.annualRateBasisPoints,
  termMonths: loan.termMonths,
  remainingMonths: loan.remainingMonths,
  monthlyPayment: loan.monthlyPayment,
  overduePeriods: loan.overduePeriods,
  penaltyAccrued: loan.penaltyAccrued,
  status: readLoanStatus(loan.status),
  createdAt: loan.createdAt.toISOString(),
  settledAt: loan.settledAt?.toISOString() ?? null
});

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const toFundingRecord = (funding: {
  id: string;
  investorId: string;
  roundName: string;
  investorName: string;
  amount: number;
  preMoneyValuation: number;
  postMoneyValuation: number;
  equityBasisPoints: number;
  successRate: number;
  boardPressure: number;
  term: string;
  status: string;
  resultSummary: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}): FundingRecord => ({
  id: funding.id,
  investorId: funding.investorId,
  roundName: funding.roundName,
  investorName: funding.investorName,
  amount: funding.amount,
  preMoneyValuation: funding.preMoneyValuation,
  postMoneyValuation: funding.postMoneyValuation,
  equityBasisPoints: funding.equityBasisPoints,
  successRate: funding.successRate,
  boardPressure: funding.boardPressure,
  term: funding.term,
  status: funding.status === "funded" || funding.status === "failed" ? funding.status : "pending",
  resultSummary: funding.resultSummary,
  createdAt: funding.createdAt.toISOString(),
  resolvedAt: funding.resolvedAt?.toISOString() ?? null
});

const readProductStage = (stage: string): ProductStage =>
  stage === "mvp" ||
  stage === "beta" ||
  stage === "launched" ||
  stage === "growth" ||
  stage === "mature" ||
  stage === "decline" ||
  stage === "closed"
    ? stage
    : "idea";

const readProductStatus = (status: string): ProductRecord["status"] => (status === "closed" ? "closed" : "active");

const toProductRecord = (product: {
  id: string;
  configId: string;
  name: string;
  category: string;
  stage: string;
  users: number;
  retentionBasisPoints: number;
  payRateBasisPoints: number;
  acquisitionCost: number;
  serverCost: number;
  reputationScore: number;
  techDebt: number;
  monthlyRevenue: number;
  status: string;
  resultSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}): ProductRecord => ({
  id: product.id,
  configId: product.configId,
  name: product.name,
  category: product.category,
  stage: readProductStage(product.stage),
  users: product.users,
  retentionBasisPoints: product.retentionBasisPoints,
  payRateBasisPoints: product.payRateBasisPoints,
  acquisitionCost: product.acquisitionCost,
  serverCost: product.serverCost,
  reputationScore: product.reputationScore,
  techDebt: product.techDebt,
  monthlyRevenue: product.monthlyRevenue,
  status: readProductStatus(product.status),
  resultSummary: product.resultSummary,
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
  closedAt: product.closedAt?.toISOString() ?? null
});

const readCompetitorActionType = (actionType: string): CompetitorActionType =>
  actionType === "poach" || actionType === "public_opinion" || actionType === "patent" ? actionType : "price_war";

const readCompetitorActionStatus = (status: string): CompetitorActionRecord["status"] => (status === "resolved" ? "resolved" : "pending");

const readCompetitorResponse = (response: string | null): CompetitorActionRecord["response"] =>
  response === "defend" || response === "counter" ? response : null;

const toPlayerMarketRecord = (market: {
  id: string;
  trackId: string;
  trackName: string;
  playerShareBasisPoints: number;
  competitorShareBasisPoints: number;
  industryHeat: number;
  policyRisk: number;
  pricePressure: number;
  talentPressure: number;
  reputationPressure: number;
  patentRisk: number;
  resultSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PlayerMarketRecord => ({
  id: market.id,
  trackId: market.trackId,
  trackName: market.trackName,
  playerShareBasisPoints: market.playerShareBasisPoints,
  competitorShareBasisPoints: market.competitorShareBasisPoints,
  industryHeat: market.industryHeat,
  policyRisk: market.policyRisk,
  pricePressure: market.pricePressure,
  talentPressure: market.talentPressure,
  reputationPressure: market.reputationPressure,
  patentRisk: market.patentRisk,
  resultSummary: market.resultSummary,
  createdAt: market.createdAt.toISOString(),
  updatedAt: market.updatedAt.toISOString()
});

const toCompetitorActionRecord = (action: {
  id: string;
  actionId: string;
  trackId: string;
  competitorName: string;
  actionType: string;
  title: string;
  summary: string;
  status: string;
  response: string | null;
  resultSummary: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}): CompetitorActionRecord => ({
  id: action.id,
  actionId: action.actionId,
  trackId: action.trackId,
  competitorName: action.competitorName,
  actionType: readCompetitorActionType(action.actionType),
  title: action.title,
  summary: action.summary,
  status: readCompetitorActionStatus(action.status),
  response: readCompetitorResponse(action.response),
  resultSummary: action.resultSummary,
  createdAt: action.createdAt.toISOString(),
  resolvedAt: action.resolvedAt?.toISOString() ?? null
});

const calculateFundingOffer = (
  profile: PlayerProfileRecord,
  config: {
    id: string;
    roundName: string;
    name: string;
    focus: string;
    ticketSize: number;
    valuationMultiplierBasisPoints: number;
    equityBasisPoints: number;
    successRateBase: number;
    debtToleranceBasisPoints: number;
    boardPressure: number;
    term: string;
    summary: string;
  },
  completedInvestorIds: Set<string>
): FundingOfferRecord => {
  const finance = toCompanyFinanceRecord(profile);
  const reputationBonus = clamp(Math.floor((profile.reputation - 1000000) / 100000), -8, 8);
  const cashflowBonus = finance.netCashFlow >= 300000 ? 6 : finance.netCashFlow >= 0 ? 3 : -10;
  const debtPenalty = Math.ceil(finance.debtRatioBasisPoints / 1000) * 4;
  const creditPenalty = profile.creditRating === "A" ? 0 : profile.creditRating === "B" ? 8 : profile.creditRating === "C" ? 18 : 30;
  const riskPenalty = finance.riskStatus === "稳健" ? 0 : finance.riskStatus === "预警" ? 8 : 16;
  const successRate = clamp(config.successRateBase + reputationBonus + cashflowBonus - debtPenalty - creditPenalty - riskPenalty, 5, 95);
  const debtPressureBasisPoints = Math.min(3000, Math.max(0, finance.debtRatioBasisPoints - 2000));
  const valuationBasisPoints = Math.max(6000, config.valuationMultiplierBasisPoints - debtPressureBasisPoints);
  const preMoneyValuation = Math.max(1000000, Math.round((profile.valuation * valuationBasisPoints) / 10000));
  const postMoneyValuation = preMoneyValuation + config.ticketSize;
  const isDebtAcceptable = finance.debtRatioBasisPoints <= config.debtToleranceBasisPoints;
  const isEquityEnough = profile.founderEquityBasisPoints > config.equityBasisPoints;
  const isAvailable = isDebtAcceptable && isEquityEnough && !completedInvestorIds.has(config.id);

  return {
    id: config.id,
    roundName: config.roundName,
    investorName: config.name,
    focus: config.focus,
    amount: config.ticketSize,
    preMoneyValuation,
    postMoneyValuation,
    equityBasisPoints: config.equityBasisPoints,
    successRate,
    debtToleranceBasisPoints: config.debtToleranceBasisPoints,
    boardPressure: config.boardPressure + (isDebtAcceptable ? 0 : 10),
    term: config.term,
    summary: config.summary,
    isAvailable,
    lockedReason: completedInvestorIds.has(config.id)
      ? "本轮已完成"
      : !isEquityEnough
        ? "创始人股权不足"
        : !isDebtAcceptable
          ? "负债率过高，条款暂不可接受"
          : null
  };
};

const toFundingCenterRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord
): Promise<FundingCenterRecord> => {
  const [configs, fundings] = await Promise.all([
    prisma.investorConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.playerFunding.findMany({
      where: { profileId: profile.id },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);
  const completedInvestorIds = new Set(fundings.filter((funding) => funding.status === "funded").map((funding) => funding.investorId));

  return {
    offers: configs.map((config) => calculateFundingOffer(profile, config, completedInvestorIds)),
    fundings: fundings.map(toFundingRecord),
    finance: toCompanyFinanceRecord(profile)
  };
};

const toProductCenterRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord
): Promise<ProductCenterRecord> => {
  const [configs, products] = await Promise.all([
    prisma.productConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.playerProduct.findMany({
      where: { profileId: profile.id },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }]
    })
  ]);
  const activeConfigIds = new Set(products.filter((product) => product.status !== "closed").map((product) => product.configId));

  return {
    offers: configs.map((config) => ({
      id: config.id,
      name: config.name,
      category: config.category,
      summary: config.summary,
      launchCost: config.launchCost,
      baseUsers: config.baseUsers,
      retentionBasisPoints: config.retentionBasisPoints,
      payRateBasisPoints: config.payRateBasisPoints,
      acquisitionCost: config.acquisitionCost,
      serverCost: config.serverCost,
      techDebtGrowth: config.techDebtGrowth,
      reputationGrowth: config.reputationGrowth,
      isAvailable: !activeConfigIds.has(config.id) && profile.cash >= config.launchCost,
      lockedReason: activeConfigIds.has(config.id) ? "产品线已在运营" : profile.cash < config.launchCost ? "现金不足" : null
    })),
    products: products.map(toProductRecord),
    finance: toCompanyFinanceRecord(profile)
  };
};

const toMarketCenterRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord
): Promise<MarketCenterRecord> => {
  const [configs, markets, actions] = await Promise.all([
    prisma.marketTrackConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.playerMarketState.findMany({
      where: { profileId: profile.id },
      orderBy: [{ createdAt: "asc" }]
    }),
    prisma.playerCompetitorAction.findMany({
      where: { profileId: profile.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    })
  ]);
  const activeTrackIds = new Set(markets.map((market) => market.trackId));

  return {
    offers: configs.map((config) => ({
      id: config.id,
      name: config.name,
      summary: config.summary,
      costStructure: config.costStructure,
      industryHeat: config.industryHeat,
      policyRisk: config.policyRisk,
      baseShareBasisPoints: config.baseShareBasisPoints,
      customerPool: config.customerPool,
      isAvailable: !activeTrackIds.has(config.id),
      lockedReason: activeTrackIds.has(config.id) ? "赛道已进入" : null
    })),
    markets: markets.map(toPlayerMarketRecord),
    actions: actions.map(toCompetitorActionRecord),
    finance: toCompanyFinanceRecord(profile)
  };
};

const readPlatformCoinLedgerSource = (source: string): PlatformCoinLedgerSource =>
  source === "admin_grant" ||
  source === "admin_deduct" ||
  source === "admin_correction" ||
  source === "shop_purchase" ||
  source === "activity_reward" ||
  source === "reserved_payment" ||
  source === "system_compensation"
    ? source
    : "system_compensation";

const isAdminPlatformCoinSource = (source: PlatformCoinLedgerSource): boolean =>
  source === "admin_grant" || source === "admin_deduct" || source === "admin_correction";

const toWalletRecord = (
  wallet: {
    profileId: string;
    balance: number;
    totalSpent: number;
    vipExperience: number;
  },
  ledgers: Array<{
    id: string;
    changeAmount: number;
    balanceAfter: number;
    source: string;
    referenceId: string | null;
    reason: string;
    createdAt: Date;
  }>
): PlatformWalletRecord => ({
  profileId: wallet.profileId,
  balance: wallet.balance,
  totalSpent: wallet.totalSpent,
  vipExperience: wallet.vipExperience,
  ledgers: ledgers.map((ledger) => ({
    id: ledger.id,
    changeAmount: ledger.changeAmount,
    balanceAfter: ledger.balanceAfter,
    source: readPlatformCoinLedgerSource(ledger.source),
    referenceId: ledger.referenceId,
    reason: ledger.reason,
    createdAt: ledger.createdAt.toISOString()
  }))
});

const ensureWallet = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord
) =>
  prisma.playerPlatformWallet.upsert({
    where: { profileId: profile.id },
    update: {},
    create: {
      profileId: profile.id,
      balance: profile.platformCoins,
      totalSpent: 0,
      vipExperience: VIP3_START_EXPERIENCE
    }
  }).catch(async (error: unknown) => {
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      const wallet = await prisma.playerPlatformWallet.findUnique({ where: { profileId: profile.id } });
      if (wallet !== null) {
        return wallet;
      }
    }
    throw error;
  });

const toPlatformWalletRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord
): Promise<PlatformWalletRecord> => {
  const wallet = await ensureWallet(prisma, profile);
  const ledgers = await prisma.platformCoinLedger.findMany({
    where: { profileId: profile.id },
    orderBy: [{ createdAt: "desc" }],
    take: 20
  });

  return toWalletRecord(wallet, ledgers);
};

const toItemRewardRecord = (
  item: { id: string; name: string } | null | undefined,
  quantity: number
): ItemRewardRecord | null =>
  item === null || item === undefined || quantity <= 0 ? null : { id: item.id, name: item.name, quantity };

const grantInventoryItem = async (
  tx: Prisma.TransactionClient,
  profileId: string,
  itemId: string | null,
  quantity: number,
  source: string,
  referenceId: string | null,
  reason: string
): Promise<void> => {
  if (itemId === null || quantity <= 0) {
    return;
  }

  const inventoryItem = await tx.playerInventoryItem.upsert({
    where: { profileId_itemId: { profileId, itemId } },
    update: { quantity: { increment: quantity } },
    create: { profileId, itemId, quantity }
  });
  const balanceAfter = inventoryItem.quantity;
  await tx.playerItemLedger.create({
    data: { profileId, itemId, changeQuantity: quantity, balanceAfter, source, referenceId, reason }
  });
};

const toInventoryCenterRecord = async (
  prisma: PrismaClient,
  profileId: string
): Promise<InventoryCenterRecord> => {
  const [items, ledgers] = await Promise.all([
    prisma.playerInventoryItem.findMany({
      where: { profileId, quantity: { gt: 0 } },
      include: { item: true },
      orderBy: [{ updatedAt: "desc" }]
    }),
    prisma.playerItemLedger.findMany({
      where: { profileId },
      include: { item: true },
      orderBy: [{ createdAt: "desc" }],
      take: 20
    })
  ]);

  return {
    items: items.sort((left, right) => left.item.sortOrder - right.item.sortOrder).map((entry) => ({
      id: entry.id,
      itemId: entry.itemId,
      name: entry.item.name,
      category: entry.item.category,
      rarity: entry.item.rarity,
      icon: entry.item.icon,
      summary: entry.item.summary,
      usageHint: entry.item.usageHint,
      quantity: entry.quantity,
      updatedAt: entry.updatedAt.toISOString()
    })),
    recentLedgers: ledgers.map((ledger) => ({
      id: ledger.id,
      itemId: ledger.itemId,
      itemName: ledger.item.name,
      changeQuantity: ledger.changeQuantity,
      balanceAfter: ledger.balanceAfter,
      source: ledger.source,
      reason: ledger.reason,
      createdAt: ledger.createdAt.toISOString()
    }))
  };
};

const toShopProductRecord = (
  product: {
    id: string;
    name: string;
    category: string;
    pricePlatformCoins: number;
    rewardCash: number;
    rewardActionPower: number;
    rewardReputation: number;
    rewardItemId: string | null;
    rewardItemQuantity: number;
    rewardItem?: { id: string; name: string } | null;
    durationDays: number;
    purchaseLimit: number;
    summary: string;
    isActive: boolean;
  },
  walletBalance: number,
  purchaseCount: number
): ShopProductRecord => {
  const limitReached = product.purchaseLimit > 0 && purchaseCount >= product.purchaseLimit;
  const hasEnoughCoins = walletBalance >= product.pricePlatformCoins;

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    pricePlatformCoins: product.pricePlatformCoins,
    rewardCash: product.rewardCash,
    rewardActionPower: product.rewardActionPower,
    rewardReputation: product.rewardReputation,
    rewardItem: toItemRewardRecord(product.rewardItem, product.rewardItemQuantity),
    durationDays: product.durationDays,
    purchaseLimit: product.purchaseLimit,
    summary: product.summary,
    isAvailable: product.isActive && !limitReached && hasEnoughCoins,
    lockedReason: !product.isActive
      ? "商品暂未开放"
      : limitReached
        ? "购买次数已达上限"
        : !hasEnoughCoins
          ? "平台币不足"
          : null
  };
};

const toShopCenterRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord
): Promise<ShopCenterRecord> => {
  const wallet = await toPlatformWalletRecord(prisma, profile);
  const [products, purchases] = await Promise.all([
    prisma.shopProductConfig.findMany({
      where: { isActive: true },
      include: { rewardItem: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    }),
    prisma.playerShopPurchase.findMany({
      where: { profileId: profile.id },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);
  const purchaseCounts = purchases.reduce<Map<string, number>>((counts, purchase) => {
    counts.set(purchase.productId, (counts.get(purchase.productId) ?? 0) + 1);
    return counts;
  }, new Map());

  return {
    wallet,
    products: products.map((product) => toShopProductRecord(product, wallet.balance, purchaseCounts.get(product.id) ?? 0)),
    purchases: purchases.map((purchase) => ({
      id: purchase.id,
      productId: purchase.productId,
      requestId: purchase.requestId,
      pricePlatformCoins: purchase.pricePlatformCoins,
      createdAt: purchase.createdAt.toISOString()
    }))
  };
};

const readSeasonStatus = (startDate: string, endDate: string, today: string): SeasonStatus => {
  if (today < startDate) {
    return "upcoming";
  }
  return today > endDate ? "ended" : "active";
};

const readScenarioState = (initialStateJson: string): ScenarioRunRecord["run"]["initialState"] => {
  const fallback = {
    cashDays: 15,
    debtRatioBasisPoints: 8000,
    coreEmployeeRisk: "核心员工准备离职",
    customerDelay: "大客户延期付款"
  };
  try {
    const parsed = JSON.parse(initialStateJson) as Partial<typeof fallback>;
    return {
      cashDays: typeof parsed.cashDays === "number" ? parsed.cashDays : fallback.cashDays,
      debtRatioBasisPoints: typeof parsed.debtRatioBasisPoints === "number" ? parsed.debtRatioBasisPoints : fallback.debtRatioBasisPoints,
      coreEmployeeRisk: typeof parsed.coreEmployeeRisk === "string" ? parsed.coreEmployeeRisk : fallback.coreEmployeeRisk,
      customerDelay: typeof parsed.customerDelay === "string" ? parsed.customerDelay : fallback.customerDelay
    };
  } catch {
    return fallback;
  }
};

const scoreScenarioChoices = (choices: string[]): { score: number; grade: string } => {
  const weights = new Map([
    ["cost_cut", 28],
    ["debt_restructure", 32],
    ["compliance_fix", 32],
    ["customer_negotiate", 24],
    ["bridge_funding", 20]
  ]);
  const score = Math.min(100, choices.reduce((sum, choice) => sum + (weights.get(choice) ?? 0), 0));
  return { score, grade: score >= 90 ? "S" : score >= 75 ? "A" : score >= 60 ? "B" : "C" };
};

const toSeasonCenterRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord,
  today: string
): Promise<SeasonCenterRecord | "SEASON_NOT_FOUND"> => {
  const season = await prisma.seasonConfig.findFirst({
    orderBy: [{ sortOrder: "asc" }, { startDate: "asc" }]
  });
  if (season === null) {
    return "SEASON_NOT_FOUND";
  }

  const [progress, pass, tasks, taskProgresses, activities, activityStates, shopItems, shopPurchases, scenarios, scenarioRuns, wallet] = await Promise.all([
    prisma.playerSeasonProgress.upsert({
      where: { profileId_seasonId: { profileId: profile.id, seasonId: season.id } },
      update: {},
      create: { profileId: profile.id, seasonId: season.id, points: 0 }
    }),
    prisma.playerSeasonPassPurchase.findUnique({ where: { profileId_seasonId: { profileId: profile.id, seasonId: season.id } } }),
    prisma.seasonTaskConfig.findMany({ where: { seasonId: season.id }, include: { rewardItem: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.playerSeasonTaskProgress.findMany({ where: { profileId: profile.id } }),
    prisma.activityConfig.findMany({ where: { seasonId: season.id }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.playerActivityState.findMany({ where: { profileId: profile.id } }),
    prisma.activityShopItemConfig.findMany({ where: { seasonId: season.id, isActive: true }, include: { rewardItem: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.playerActivityShopPurchase.findMany({ where: { profileId: profile.id } }),
    prisma.scenarioConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.playerScenarioRun.findMany({ where: { profileId: profile.id, score: { not: null } } }),
    toPlatformWalletRecord(prisma, profile)
  ]);
  const taskProgressById = new Map(taskProgresses.map((item) => [item.taskId, item]));
  const activityStateById = new Map(activityStates.map((item) => [item.activityId, item]));
  const purchaseCounts = shopPurchases.reduce<Map<string, number>>((counts, purchase) => {
    counts.set(purchase.itemId, (counts.get(purchase.itemId) ?? 0) + 1);
    return counts;
  }, new Map());
  const bestScenarioScores = scenarioRuns.reduce<Map<string, number>>((scores, run) => {
    if (run.score !== null) {
      scores.set(run.scenarioId, Math.max(scores.get(run.scenarioId) ?? 0, run.score));
    }
    return scores;
  }, new Map());

  const activityBoards = await Promise.all(activities.map(async (activity) => {
    const states = await prisma.playerActivityState.findMany({
      where: { activityId: activity.id, score: { gt: 0 } },
      include: { profile: true },
      orderBy: [{ score: "desc" }],
      take: 20
    });
    return {
      key: activity.leaderboardKey,
      name: activity.name,
      scope: "activity" as const,
      isActive: readSeasonStatus(activity.startDate, activity.endDate, today) === "active",
      rows: states.map((state, index) => ({
        rank: index + 1,
        profileId: state.profileId,
        founderName: state.profile.founderName,
        companyName: state.profile.companyName,
        value: state.score,
        valueLabel: `${state.score} 分`,
        equippedTitle: null
      })),
      snapshotDate: today
    };
  }));

  return {
    season: {
      id: season.id,
      name: season.name,
      theme: season.theme,
      status: readSeasonStatus(season.startDate, season.endDate, today),
      startDate: season.startDate,
      endDate: season.endDate,
      points: progress.points,
      pass: {
        isPurchased: pass !== null,
        pricePlatformCoins: season.passPricePlatformCoins
      }
    },
    tasks: tasks.map((task) => {
      const state = taskProgressById.get(task.id);
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        progress: state?.progress ?? 0,
        target: task.target,
        rewardPoints: task.rewardPoints,
        rewardItem: toItemRewardRecord(task.rewardItem, task.rewardItemQuantity),
        isClaimed: state?.claimedAt !== null && state?.claimedAt !== undefined
      };
    }),
    activities: activities.map((activity) => {
      const state = activityStateById.get(activity.id);
      return {
        id: activity.id,
        name: activity.name,
        status: readSeasonStatus(activity.startDate, activity.endDate, today),
        isJoined: state?.isJoined ?? false,
        score: state?.score ?? 0,
        targetScore: activity.targetScore,
        rewardClaimed: state?.rewardClaimedAt !== null && state?.rewardClaimedAt !== undefined
      };
    }),
    activityBoards: activityBoards.filter((board) => board.isActive),
    shopItems: shopItems.map((item) => {
      const limitReached = item.purchaseLimit > 0 && (purchaseCounts.get(item.id) ?? 0) >= item.purchaseLimit;
      const hasEnoughPoints = progress.points >= item.costPoints;
      return {
        id: item.id,
        name: item.name,
        costPoints: item.costPoints,
        summary: item.summary,
        rewardItem: toItemRewardRecord(item.rewardItem, item.rewardItemQuantity),
        isAvailable: !limitReached && hasEnoughPoints,
        lockedReason: limitReached ? "兑换次数已达上限" : hasEnoughPoints ? null : "赛季积分不足"
      };
    }),
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      summary: scenario.summary,
      bestScore: bestScenarioScores.get(scenario.id) ?? null
    })),
    wallet
  };
};

const toScenarioRunRecord = (run: {
  id: string;
  scenarioId: string;
  initialStateJson: string;
  choicesJson: string | null;
  score: number | null;
  grade: string | null;
  rewardClaimedAt: Date | null;
}): ScenarioRunRecord => ({
  run: {
    id: run.id,
    scenarioId: run.scenarioId,
    initialState: readScenarioState(run.initialStateJson),
    choices: run.choicesJson === null ? [] : JSON.parse(run.choicesJson) as string[],
    score: run.score,
    grade: run.grade,
    rewardClaimed: run.rewardClaimedAt !== null
  }
});

const toVipLevelRecord = (level: {
  level: number;
  name: string;
  requiredExperience: number;
  dailyGiftPlatformCoins: number;
  dailyGiftActionPower: number;
  actionPowerLimitBonus: number;
  quickSettleTimes: number;
  trainingQueueBonus: number;
  recruitRefreshTimes: number;
  shopDiscountBasisPoints: number;
  title: string;
  avatarFrame: string;
  summary: string;
}): VipLevelRecord => ({
  ...level
});

const fallbackVipLevel: VipLevelRecord = {
  level: 0,
  name: "VIP 0",
  requiredExperience: 0,
  dailyGiftPlatformCoins: 0,
  dailyGiftActionPower: 20,
  actionPowerLimitBonus: 0,
  quickSettleTimes: 0,
  trainingQueueBonus: 0,
  recruitRefreshTimes: 0,
  shopDiscountBasisPoints: 10000,
  title: "创业新星",
  avatarFrame: "basic",
  summary: "基础身份，保留每日行动力补给。"
};

const BASE_ACTION_POWER_LIMIT = 120;
const COMPANY_MAX_LEVEL = 80;
const COMPANY_EXPERIENCE_PER_LEVEL = 100;
const ACTION_POWER_RECOVERY_INTERVAL_MS = 10 * 60 * 1000;
const ACTION_POWER_RECOVERY_AMOUNT = 10;
const RANDOM_TASK_VISIBLE_COUNT = 3;
const RANDOM_TASK_PASS_VISIBLE_BONUS = 1;
const RANDOM_TASK_BASE_DAILY_LIMIT = 6;
const RANDOM_TASK_PRIVILEGE_DAILY_LIMIT = 9;
const RANDOM_TASK_PASS_DAILY_LIMIT_BONUS = 1;
const RISK_INSURANCE_ITEM_ID = "risk-insurance";
const MARKET_INTEL_ITEM_ID = "market-intel";
const FINANCE_ADVISOR_ITEM_ID = "finance-advisor-card";
const FULL_LEVEL_CHEST_REQUIRED_EXPERIENCE = 500;
const FULL_LEVEL_CHEST_REWARD_REPUTATION = 300;
const FULL_LEVEL_CHEST_REWARD_ACTION_POWER = 40;
const FULL_LEVEL_CHEST_REWARD_ITEM_ID = "season-exp-ticket";
const FULL_LEVEL_CHEST_REWARD_ITEM_QUANTITY = 1;
const VIP3_START_EXPERIENCE = 3000;

const readCompanyLevel = (experience: number): number =>
  Math.max(1, Math.min(COMPANY_MAX_LEVEL, Math.floor(Math.max(0, experience) / COMPANY_EXPERIENCE_PER_LEVEL) + 1));

export const readRandomTaskConfigWhere = (
  hasSeasonPass: boolean,
  usedConfigIds: string[]
): {
  isActive: true;
  id: { notIn: string[] };
  category?: { not: "season" };
} => ({
  isActive: true,
  id: { notIn: usedConfigIds },
  ...(hasSeasonPass ? {} : { category: { not: "season" as const } })
});

export const selectFairRandomTaskConfigs = <TConfig extends { category: string }>(
  configs: TConfig[],
  usedCategories: string[],
  limit: number
): TConfig[] => {
  const selected: TConfig[] = [];
  const selectedConfigs = new Set<TConfig>();
  const seenCategories = new Set(usedCategories);
  for (const config of configs) {
    if (selected.length >= limit) {
      return selected;
    }
    if (seenCategories.has(config.category)) {
      continue;
    }
    selected.push(config);
    selectedConfigs.add(config);
    seenCategories.add(config.category);
  }

  for (const config of configs) {
    if (selected.length >= limit) {
      return selected;
    }
    if (selectedConfigs.has(config)) {
      continue;
    }
    selected.push(config);
  }

  return selected;
};

const readFullLevelChest = (fullLevelOverflowExperience: number, claimedCount: number): CompanyGrowthRecord["fullLevelChest"] => {
  const earnedCount = Math.floor(fullLevelOverflowExperience / FULL_LEVEL_CHEST_REQUIRED_EXPERIENCE);
  return {
    requiredExperience: FULL_LEVEL_CHEST_REQUIRED_EXPERIENCE,
    progressExperience: fullLevelOverflowExperience % FULL_LEVEL_CHEST_REQUIRED_EXPERIENCE,
    earnedCount,
    claimedCount,
    claimableCount: Math.max(0, earnedCount - claimedCount),
    rewards: {
      cash: 0,
      reputation: FULL_LEVEL_CHEST_REWARD_REPUTATION,
      actionPower: FULL_LEVEL_CHEST_REWARD_ACTION_POWER,
      item: {
        id: FULL_LEVEL_CHEST_REWARD_ITEM_ID,
        name: "赛季经验券",
        quantity: FULL_LEVEL_CHEST_REWARD_ITEM_QUANTITY
      }
    }
  };
};

const readCompanyGrowthRecord = (profile: PlayerProfileRecord, fullLevelChestClaimedCount = 0): CompanyGrowthRecord => {
  const levelStartExperience = (profile.companyLevel - 1) * COMPANY_EXPERIENCE_PER_LEVEL;
  const nextLevelExperience = profile.companyLevel >= COMPANY_MAX_LEVEL ? null : profile.companyLevel * COMPANY_EXPERIENCE_PER_LEVEL;
  const fullLevelOverflowExperience = profile.companyLevel >= COMPANY_MAX_LEVEL ? Math.max(0, profile.companyExperience - (COMPANY_MAX_LEVEL - 1) * COMPANY_EXPERIENCE_PER_LEVEL) : 0;
  return {
    profile,
    maxLevel: COMPANY_MAX_LEVEL,
    currentLevelExperience: Math.max(0, profile.companyExperience - levelStartExperience),
    nextLevelExperience,
    progressToNextBasisPoints:
      nextLevelExperience === null
        ? 10000
        : Math.max(0, Math.min(10000, Math.floor(((profile.companyExperience - levelStartExperience) * 10000) / COMPANY_EXPERIENCE_PER_LEVEL))),
    fullLevelOverflowExperience,
    fullLevelChest: readFullLevelChest(fullLevelOverflowExperience, fullLevelChestClaimedCount)
  };
};

const readActionPowerRecoveredAt = (profile: { actionPowerRecoveredAt: Date | string }): Date =>
  profile.actionPowerRecoveredAt instanceof Date ? profile.actionPowerRecoveredAt : new Date(profile.actionPowerRecoveredAt);

const recoverActionPowerData = (profile: {
  actionPower: number;
  actionPowerLimit: number;
  actionPowerRecoveredAt: Date | string;
}): { actionPower: number; actionPowerRecoveredAt: Date } => {
  const recoveredAt = readActionPowerRecoveredAt(profile);
  const now = new Date();
  if (profile.actionPower >= profile.actionPowerLimit) {
    return { actionPower: profile.actionPower, actionPowerRecoveredAt: now };
  }

  const recoveryTicks = Math.floor((now.getTime() - recoveredAt.getTime()) / ACTION_POWER_RECOVERY_INTERVAL_MS);
  if (recoveryTicks <= 0) {
    return { actionPower: profile.actionPower, actionPowerRecoveredAt: recoveredAt };
  }

  const nextActionPower = Math.min(profile.actionPowerLimit, profile.actionPower + recoveryTicks * ACTION_POWER_RECOVERY_AMOUNT);
  const nextRecoveredAt = nextActionPower >= profile.actionPowerLimit ? now : new Date(recoveredAt.getTime() + recoveryTicks * ACTION_POWER_RECOVERY_INTERVAL_MS);
  return { actionPower: nextActionPower, actionPowerRecoveredAt: nextRecoveredAt };
};

const resolveVipLevels = (levels: VipLevelRecord[], vipExperience: number) => {
  const sorted = [...levels].sort((left, right) => left.requiredExperience - right.requiredExperience);
  const currentLevel = [...sorted].reverse().find((level) => vipExperience >= level.requiredExperience) ?? sorted[0] ?? fallbackVipLevel;
  const nextLevel = sorted.find((level) => level.requiredExperience > currentLevel.requiredExperience) ?? null;
  const progressToNextBasisPoints =
    nextLevel === null
      ? 10000
      : Math.max(
          0,
          Math.min(
            10000,
            Math.floor(
              ((vipExperience - currentLevel.requiredExperience) * 10000) /
                Math.max(1, nextLevel.requiredExperience - currentLevel.requiredExperience)
            )
          )
        );

  return { currentLevel, nextLevel, progressToNextBasisPoints };
};

const toVipCenterRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord,
  today: string
): Promise<VipCenterRecord> => {
  const wallet = await toPlatformWalletRecord(prisma, profile);
  const levels = (await prisma.vipLevelConfig.findMany({
    orderBy: [{ requiredExperience: "asc" }, { sortOrder: "asc" }]
  })).map(toVipLevelRecord);
  const { currentLevel, nextLevel, progressToNextBasisPoints } = resolveVipLevels(levels, wallet.vipExperience);
  const gift = await prisma.playerVipDailyGift.findUnique({
    where: {
      profileId_giftDate: {
        profileId: profile.id,
        giftDate: today
      }
    }
  });

  return {
    wallet,
    currentLevel,
    nextLevel,
    progressToNextBasisPoints,
    benefits: {
      title: currentLevel.title,
      avatarFrame: currentLevel.avatarFrame,
      actionPowerLimit: Math.max(profile.actionPowerLimit, BASE_ACTION_POWER_LIMIT + currentLevel.actionPowerLimitBonus),
      quickSettleTimes: currentLevel.quickSettleTimes,
      trainingQueueBonus: currentLevel.trainingQueueBonus,
      recruitRefreshTimes: currentLevel.recruitRefreshTimes,
      shopDiscountBasisPoints: currentLevel.shopDiscountBasisPoints
    },
    dailyGift: {
      date: today,
      isClaimed: gift !== null,
      rewardPlatformCoins: currentLevel.dailyGiftPlatformCoins,
      rewardActionPower: currentLevel.dailyGiftActionPower
    }
  };
};

const leaderboardConfigs = [
  { key: "company-value", name: "公司估值榜" },
  { key: "cashflow", name: "现金流榜" },
  { key: "product-growth", name: "产品增长榜" },
  { key: "guild", name: "商会榜" }
] as const;

const crossServerLeaderboardConfigs = [
  { key: "cross-company-value", name: "跨服创业大赛榜" },
  { key: "cross-guild", name: "跨服商会榜" }
] as const;

const crossServerGuildSeasonRequirements = {
  minMembers: 2,
  minTodayActiveMembers: 2,
  rewardLabel: "前 3 名会长获得声望 180/120/80"
};

const crossServerGuildSeasonRewards = [180, 120, 80];

const formatLeaderboardValue = (key: string, value: number): string => {
  if (key === "cashflow") {
    return `净现金流 ${value.toLocaleString("zh-CN")}`;
  }
  if (key === "product-growth") {
    return `产品增长 ${value.toLocaleString("zh-CN")}`;
  }
  if (key === "guild") {
    return `贡献 ${value.toLocaleString("zh-CN")}`;
  }
  if (key === "cross-guild") {
    return `跨服贡献 ${value.toLocaleString("zh-CN")}`;
  }

  return `估值 ${value.toLocaleString("zh-CN")}`;
};

const guildTechUpgradeCost = (currentLevel: number): number | null =>
  currentLevel >= 5 ? null : [40, 120, 240, 400, 600][currentLevel] ?? null;

const guildTechBonusLabel = (level: number): string =>
  level <= 0 ? "待激活" : `协作效率 +${level * 2}%`;

const guildActivityLabel = (action: string): string => {
  if (action === "help_requested") {
    return "发布商会协作";
  }
  if (action === "help_fulfilled") {
    return "完成商会协作";
  }
  if (action === "task_claimed") {
    return "领取商会任务";
  }
  if (action === "tech_upgraded") {
    return "升级商会科技";
  }

  return "参与商会协作";
};

const guildProjectConfigs = [
  {
    id: "joint-roadshow",
    name: "联合路演",
    description: "成员通过互助、任务和科技推进路演材料共创。",
    target: 3,
    rewardReputation: 60
  },
  {
    id: "risk-review-week",
    name: "风险复核周",
    description: "集中完成合同、资金和运营风险复核协作。",
    target: 6,
    rewardReputation: 80
  },
  {
    id: "market-co-creation",
    name: "市场共创",
    description: "围绕市场洞察和增长策略沉淀商会共创成果。",
    target: 8,
    rewardReputation: 100
  }
];

const guildProjectProgressUpdates = (prisma: PrismaClient, guildId: string): Prisma.PrismaPromise<unknown>[] =>
  guildProjectConfigs.map((project) =>
    prisma.guildProjectProgress.upsert({
      where: {
        guildId_projectId: {
          guildId,
          projectId: project.id
        }
      },
      update: { progress: { increment: 1 } },
      create: {
        guildId,
        projectId: project.id,
        progress: 1
      }
    })
  );

const rateBasisPoints = (part: number, total: number): number =>
  total <= 0 ? 0 : Math.min(10000, Math.round((part / total) * 10000));

const debtRatioBand = (totalDebt: number, valuation: number): string => {
  const ratio = valuation <= 0 ? 10000 : Math.round((totalDebt / valuation) * 10000);
  if (ratio < 3000) {
    return "0-30%";
  }
  if (ratio < 6000) {
    return "30-60%";
  }
  if (ratio < 9000) {
    return "60-90%";
  }

  return "90%+";
};

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const isExpiredAt = (expiresAt: Date | null | undefined, today: string): boolean =>
  expiresAt !== null && expiresAt !== undefined && expiresAt.toISOString().slice(0, 10) < today;

const grantTitle = async (
  prisma: PrismaClient,
  profileId: string,
  titleId: string,
  source: string,
  now: Date
): Promise<void> => {
  const config = await prisma.titleConfig.findUnique({ where: { id: titleId } });
  if (config === null) {
    return;
  }
  await prisma.playerTitle.upsert({
    where: {
      profileId_titleId: {
        profileId,
        titleId
      }
    },
    update: {},
    create: {
      profileId,
      titleId,
      source,
      expiresAt: config.durationDays > 0 ? addDays(now, config.durationDays) : null
    }
  });
};

const unlockKnowledge = async (
  prisma: PrismaClient,
  profileId: string,
  knowledgeId: string | null,
  source: string
): Promise<void> => {
  if (knowledgeId === null) {
    return;
  }
  const knowledge = await prisma.knowledgeEntry.findUnique({ where: { id: knowledgeId } });
  if (knowledge === null) {
    return;
  }
  await prisma.playerKnowledgeUnlock.upsert({
    where: {
      profileId_knowledgeId: {
        profileId,
        knowledgeId
      }
    },
    update: {},
    create: {
      profileId,
      knowledgeId,
      source
    }
  });
};

const completeAchievement = async (
  prisma: PrismaClient,
  profileId: string,
  achievementId: string,
  progress: number
): Promise<void> => {
  const config = await prisma.achievementConfig.findUnique({ where: { id: achievementId } });
  if (config === null) {
    return;
  }

  await prisma.playerAchievement.upsert({
    where: {
      profileId_achievementId: {
        profileId,
        achievementId
      }
    },
    update: {
      progress,
      completedAt: new Date()
    },
    create: {
      profileId,
      achievementId,
      progress,
      completedAt: new Date()
    }
  });
};

const readAchievementProgress = (
  profile: PlayerProfileRecord,
  conditionKind: string
): number => {
  if (conditionKind === "profile_created") {
    return 1;
  }
  if (conditionKind === "positive_cashflow") {
    return profile.monthlyIncome > profile.monthlyExpense ? 1 : 0;
  }
  if (conditionKind === "valuation") {
    return profile.valuation;
  }

  return 0;
};

type PlayerAchievementProgressRecord = {
  progress: number;
  completedAt: Date | null;
};

type PlayerAchievementProgressDelegate = {
  findUnique(args: {
    where: {
      profileId_achievementId: {
        profileId: string;
        achievementId: string;
      };
    };
  }): Promise<PlayerAchievementProgressRecord | null>;
  upsert(args: {
    where: {
      profileId_achievementId: {
        profileId: string;
        achievementId: string;
      };
    };
    update: PlayerAchievementProgressRecord;
    create: PlayerAchievementProgressRecord & {
      profileId: string;
      achievementId: string;
    };
  }): Promise<unknown>;
  update(args: {
    where: {
      profileId_achievementId: {
        profileId: string;
        achievementId: string;
      };
    };
    data: PlayerAchievementProgressRecord;
  }): Promise<unknown>;
};

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof PrismaClientKnownRequestError
  || (typeof error === "object" && error !== null && "code" in error && error.code === "P2002");

export const syncPlayerAchievementProgress = async (
  delegate: PlayerAchievementProgressDelegate,
  profileId: string,
  achievementId: string,
  progress: number,
  completedAt: Date | null
): Promise<void> => {
  const where = {
    profileId_achievementId: {
      profileId,
      achievementId
    }
  };
  const existing = await delegate.findUnique({ where });
  const data = {
    progress: Math.max(existing?.progress ?? 0, progress),
    completedAt: existing?.completedAt ?? completedAt
  };

  try {
    await delegate.upsert({
      where,
      update: data,
      create: {
        profileId,
        achievementId,
        progress,
        completedAt
      }
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const current = await delegate.findUnique({ where });
    await delegate.update({
      where,
      data: {
        progress: Math.max(current?.progress ?? 0, progress),
        completedAt: current?.completedAt ?? completedAt
      }
    });
  }
};

const syncAchievements = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord
): Promise<void> => {
  const configs = await prisma.achievementConfig.findMany();
  for (const config of configs) {
    const progress = readAchievementProgress(profile, config.conditionKind);
    const completedAt = progress >= config.conditionValue ? new Date() : null;
    await syncPlayerAchievementProgress(prisma.playerAchievement, profile.id, config.id, progress, completedAt);
  }
};

const toTitleCenterRecord = async (
  prisma: PrismaClient,
  profileId: string,
  today: string
): Promise<TitleCenterRecord> => {
  const [titles, equipment] = await Promise.all([
    prisma.playerTitle.findMany({
      where: { profileId },
      include: { title: true },
      orderBy: { obtainedAt: "asc" }
    }),
    prisma.playerTitleEquipment.findUnique({ where: { profileId } })
  ]);
  const records = titles.map((title) => ({
    id: title.titleId,
    name: title.title.name,
    category: title.title.category,
    source: title.source,
    bonusLabel: title.title.bonusLabel,
    obtainedAt: title.obtainedAt.toISOString(),
    expiresAt: title.expiresAt?.toISOString() ?? null,
    isEquipped: equipment?.titleId === title.titleId,
    isExpired: isExpiredAt(title.expiresAt, today)
  }));

  return {
    equippedTitle: records.find((title) => title.isEquipped && !title.isExpired) ?? null,
    titles: records
  };
};

const toAchievementRecord = (achievement: {
  id: string;
  name: string;
  category: string;
  description: string;
  conditionValue: number;
  rewardCash: number;
  rewardPlatformCoins: number;
  rewardActionPower: number;
  rewardTitleId: string | null;
  rewardKnowledgeId: string | null;
  isHidden: boolean;
  progress: number;
  completedAt: Date | null;
  claimedAt: Date | null;
}): AchievementRecord => ({
  id: achievement.id,
  name: achievement.name,
  category: achievement.category,
  description: achievement.description,
  progress: Math.min(achievement.progress, achievement.conditionValue),
  target: achievement.conditionValue,
  isHidden: achievement.isHidden && achievement.completedAt === null,
  isCompleted: achievement.completedAt !== null,
  isClaimed: achievement.claimedAt !== null,
  rewardLabel: [
    achievement.rewardCash > 0 ? `资金 ${achievement.rewardCash.toLocaleString("zh-CN")}` : "",
    achievement.rewardPlatformCoins > 0 ? `平台币 ${achievement.rewardPlatformCoins}` : "",
    achievement.rewardActionPower > 0 ? `行动力 ${achievement.rewardActionPower}` : "",
    achievement.rewardTitleId !== null ? "称号" : "",
    achievement.rewardKnowledgeId !== null ? "知识卡" : ""
  ].filter(Boolean).join("、") || "履历记录"
});

const LOCKED_KNOWLEDGE_SUMMARY = "完成对应经营履历后解锁完整知识卡。";

const toKnowledgeLinkRecord = (
  knowledge: {
    id: string;
    title: string;
    summary: string;
    sourceName: string;
    sourceUrl: string;
    collectedAt: string;
    contentVersion: string;
    disclaimer: string;
  } | null | undefined,
  isUnlocked: boolean
): KnowledgeLinkRecord | null => knowledge === null || knowledge === undefined ? null : {
  id: knowledge.id,
  title: knowledge.title,
  summary: isUnlocked ? knowledge.summary : LOCKED_KNOWLEDGE_SUMMARY,
  sourceName: knowledge.sourceName,
  sourceUrl: knowledge.sourceUrl,
  collectedAt: knowledge.collectedAt,
  contentVersion: knowledge.contentVersion,
  disclaimer: knowledge.disclaimer,
  isUnlocked
};

const toKnowledgeEntryRecord = (
  knowledge: {
    id: string;
    title: string;
    summary: string;
    scenarioText: string;
    riskText: string;
    gameImpactText: string;
    actionTipText: string;
    sourceName: string;
    sourceUrl: string;
    collectedAt: string;
    contentVersion: string;
    disclaimer: string;
    reviewStatus: string;
    category: { name: string };
  },
  unlockedAt: Date | null
): KnowledgeEntryRecord => {
  const isUnlocked = unlockedAt !== null;

  return {
    id: knowledge.id,
    category: knowledge.category.name,
    title: knowledge.title,
    summary: isUnlocked ? knowledge.summary : LOCKED_KNOWLEDGE_SUMMARY,
    scenarioText: isUnlocked ? knowledge.scenarioText : "",
    riskText: isUnlocked ? knowledge.riskText : "",
    gameImpactText: isUnlocked ? knowledge.gameImpactText : "",
    actionTipText: isUnlocked ? knowledge.actionTipText : "",
    sourceName: knowledge.sourceName,
    sourceUrl: knowledge.sourceUrl,
    collectedAt: knowledge.collectedAt,
    contentVersion: knowledge.contentVersion,
    disclaimer: knowledge.disclaimer,
    reviewStatus: knowledge.reviewStatus,
    isUnlocked,
    unlockedAt: unlockedAt?.toISOString() ?? null
  };
};

const toAdminKnowledgeEntryRecord = (
  knowledge: {
    id: string;
    categoryId: string;
    category: { name: string };
    title: string;
    summary: string;
    scenarioText: string;
    riskText: string;
    gameImpactText: string;
    actionTipText: string;
    sourceName: string;
    sourceUrl: string;
    collectedAt: string;
    contentVersion: string;
    disclaimer: string;
    reviewStatus: string;
    sortOrder: number;
  }
): AdminKnowledgeEntryRecord => ({
  id: knowledge.id,
  categoryId: knowledge.categoryId,
  category: knowledge.category.name,
  title: knowledge.title,
  summary: knowledge.summary,
  scenarioText: knowledge.scenarioText,
  riskText: knowledge.riskText,
  gameImpactText: knowledge.gameImpactText,
  actionTipText: knowledge.actionTipText,
  sourceName: knowledge.sourceName,
  sourceUrl: knowledge.sourceUrl,
  collectedAt: knowledge.collectedAt,
  contentVersion: knowledge.contentVersion,
  disclaimer: knowledge.disclaimer,
  reviewStatus: knowledge.reviewStatus,
  sortOrder: knowledge.sortOrder,
  isUnlocked: true,
  unlockedAt: null
});

const toLoanCenterRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord
): Promise<LoanCenterRecord> => {
  const [configs, loans] = await Promise.all([
    prisma.loanConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.playerLoan.findMany({
      where: { profileId: profile.id },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }]
    })
  ]);
  const activeConfigIds = new Set(loans.filter((loan) => loan.status !== "settled").map((loan) => loan.configId));
  const finance = toCompanyFinanceRecord(profile);
  const hasOverdueLoan = loans.some((loan) => loan.status === "overdue");
  const crisisLevel: LoanCenterRecord["crisis"]["level"] =
    finance.cash < 0 || finance.debtRatioBasisPoints >= 9000
      ? "bankruptcy"
      : finance.riskStatus === "资金紧张" || hasOverdueLoan
        ? "cashflow"
        : finance.debtRatioBasisPoints >= 6000
          ? "debt"
          : "none";

  return {
    offers: configs.map((config) => {
      const isCreditEnough = creditRank(profile.creditRating) >= creditRank(config.creditRequired);
      const hasActiveLoan = activeConfigIds.has(config.id);
      return {
        id: config.id,
        name: config.name,
        lender: config.lender,
        principal: config.principal,
        annualRateBasisPoints: config.annualRateBasisPoints,
        termMonths: config.termMonths,
        monthlyPayment: config.monthlyPayment,
        creditRequired: config.creditRequired,
        summary: config.summary,
        isAvailable: isCreditEnough && !hasActiveLoan,
        lockedReason: !isCreditEnough ? "信用评级不足" : hasActiveLoan ? "同类贷款未结清" : null
      };
    }),
    loans: loans.map(toLoanRecord),
    finance,
    crisis: {
      isActive: crisisLevel !== "none",
      level: crisisLevel,
      summary:
        crisisLevel === "bankruptcy"
          ? "公司已接近破产保护线，需要立即选择重组或止血路线。"
          : crisisLevel === "cashflow"
            ? "现金流进入资金紧张状态，需要补充现金或压缩支出。"
            : crisisLevel === "debt"
              ? "负债率偏高，信用和后续融资条件正在承压。"
              : "现金流和负债处于可控区间。",
      routes: [
        { id: "financing", title: "融资谈判", impact: "现金+20万，创始人股权-2%，声望-300。" },
        { id: "cost_cut", title: "降本裁撤", impact: "月支出-10万，员工满意度-6，声望-800。" },
        { id: "restructure", title: "债务重组", impact: "负债-20万，信用降级，声望-1200。" }
      ]
    }
  };
};

const readTaskType = (type: string): TaskRecord["type"] =>
  type === "daily" || type === "side" ? type : "main";

const readUnlockKind = (unlockKind: string): TaskRecord["unlockKind"] =>
  unlockKind === "knowledge" || unlockKind === "compliance" ? unlockKind : "none";

const toTaskRecord = (
  config: {
    id: string;
    type: string;
    title: string;
    description: string;
    target: number;
    initialProgress: number;
    rewardLabel: string;
    rewardCash: number;
    rewardPlatformCoins: number;
    rewardReputation: number;
    rewardActionPower: number;
    rewardCompanyExperience: number;
    rewardItemId: string | null;
    rewardItemQuantity: number;
    rewardItem?: { id: string; name: string } | null;
    guideAction: string;
    unlockKind: string;
    knowledgeId: string | null;
  },
  progress: { progress: number; dailyDate: string | null; claimedAt: Date | null } | undefined,
  today: string
): TaskRecord => {
  const isDaily = config.type === "daily";
  const isFreshDaily = !isDaily || progress === undefined || progress.dailyDate === today;
  const currentProgress = isFreshDaily ? progress?.progress ?? config.initialProgress : 0;
  const isClaimed = isFreshDaily && progress?.claimedAt !== null && progress?.claimedAt !== undefined;

  return {
    id: config.id,
    type: readTaskType(config.type),
    title: config.title,
    description: config.description,
    progress: Math.min(currentProgress, config.target),
    target: config.target,
    rewardLabel: config.rewardLabel,
    rewardCash: config.rewardCash,
    rewardPlatformCoins: config.rewardPlatformCoins,
    rewardReputation: config.rewardReputation,
    rewardActionPower: config.rewardActionPower,
    rewardCompanyExperience: config.rewardCompanyExperience,
    rewardItem: toItemRewardRecord(config.rewardItem, config.rewardItemQuantity),
    guideAction: config.guideAction,
    unlockKind: readUnlockKind(config.unlockKind),
    knowledgeId: config.knowledgeId,
    isClaimed,
    isClaimable: currentProgress >= config.target && !isClaimed
  };
};

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const grantCompanyExperience = async (
  tx: TransactionClient,
  profileId: string,
  baseExperience: number,
  source: string
): Promise<PlayerProfileRecord> => {
  const profile = await tx.playerProfile.findUnique({ where: { id: profileId } });
  if (profile === null) {
    throw new Error("PLAYER_NOT_FOUND");
  }
  if (baseExperience <= 0) {
    return toProfileRecord(profile);
  }

  const activePrivileges = await tx.playerShopPurchase.findMany({
    where: {
      profileId,
      product: {
        category: { in: ["weekly_card", "monthly_card", "growth_fund"] }
      }
    },
    include: { product: true },
    orderBy: { createdAt: "desc" }
  });
  const hasGrowthFund = activePrivileges.some((purchase) => purchase.product.category === "growth_fund");
  const hasCard = activePrivileges.some((purchase) => purchase.product.category === "weekly_card" || purchase.product.category === "monthly_card");
  const multiplierBasisPoints = hasGrowthFund ? 20000 : hasCard ? 15000 : 10000;
  const gainedExperience = Math.max(1, Math.floor((baseExperience * multiplierBasisPoints) / 10000));
  const nextExperience = profile.companyExperience + gainedExperience;
  const nextLevel = readCompanyLevel(nextExperience);
  const maxLevelExperience = (COMPANY_MAX_LEVEL - 1) * COMPANY_EXPERIENCE_PER_LEVEL;
  const overflowExperience = Math.max(0, nextExperience - maxLevelExperience) - Math.max(0, profile.companyExperience - maxLevelExperience);
  const reputationFromOverflow = nextLevel >= COMPANY_MAX_LEVEL ? Math.floor(Math.max(0, overflowExperience) / 5) : 0;

  const updated = await tx.playerProfile.update({
    where: { id: profileId },
    data: {
      companyExperience: nextExperience,
      companyLevel: nextLevel,
      reputation: reputationFromOverflow > 0 ? { increment: reputationFromOverflow } : undefined
    }
  });

  if (source === "task_reward") {
    return toProfileRecord(updated);
  }

  return toProfileRecord(updated);
};

const toRandomTaskRecord = (task: {
  id: string;
  dailyDate: string;
  status: string;
  selectedOption: string | null;
  resultSummary: string | null;
  expiresAt: Date;
  config: {
    id: string;
    category: string;
    title: string;
    description: string;
    source: string;
    optionALabel: string;
    optionAResult: string;
    optionAActionPower: number;
    optionACash: number;
    optionAReputation: number;
    optionACompanyExperience: number;
    optionBLabel: string;
    optionBResult: string;
    optionBActionPower: number;
    optionBCash: number;
    optionBReputation: number;
    optionBCompanyExperience: number;
    riskLabel: string;
    knowledgeId: string | null;
  };
}, knowledge?: KnowledgeLinkRecord | null): RandomTaskRecord => ({
  id: task.id,
  configId: task.config.id,
  category: task.config.category,
  title: task.config.title,
  description: task.config.description,
  source: task.config.source,
  status: task.status === "resolved" || task.status === "dismissed" ? task.status : "pending",
  dailyDate: task.dailyDate,
  riskLabel: task.config.riskLabel,
  expiresAt: task.expiresAt.toISOString(),
  selectedOption: task.selectedOption === "A" || task.selectedOption === "B" ? task.selectedOption : null,
  resultSummary: task.resultSummary,
  knowledge: knowledge ?? null,
  options: [
    {
      key: "A",
      label: task.config.optionALabel,
      actionPowerCost: Math.max(0, -task.config.optionAActionPower),
      cashReward: task.config.optionACash,
      reputationReward: task.config.optionAReputation,
      companyExperienceReward: task.config.optionACompanyExperience,
      result: task.config.optionAResult
    },
    {
      key: "B",
      label: task.config.optionBLabel,
      actionPowerCost: Math.max(0, -task.config.optionBActionPower),
      cashReward: task.config.optionBCash,
      reputationReward: task.config.optionBReputation,
      companyExperienceReward: task.config.optionBCompanyExperience,
      result: task.config.optionBResult
    }
  ]
});

const canUseRiskInsurance = (category: string, cashDelta: number, reputationDelta: number): boolean =>
  category !== "season" && (cashDelta < 0 || reputationDelta < 0);

const applyRiskInsurance = (
  category: string,
  cashDelta: number,
  reputationDelta: number
): { cashDelta: number; reputationDelta: number; effectSummary: string } | undefined => {
  if (!canUseRiskInsurance(category, cashDelta, reputationDelta)) {
    return undefined;
  }

  return {
    cashDelta: cashDelta < 0 ? Math.trunc(cashDelta / 2) : cashDelta,
    reputationDelta: reputationDelta < 0 ? Math.trunc(reputationDelta / 2) : reputationDelta,
    effectSummary: "风险保险已生效，降低了本次经营损失。"
  };
};

const canUseMarketIntel = (category: string): boolean => category === "market" || category === "season";

const canUseFinanceAdvisor = (category: string): boolean => category === "finance" || category === "funding" || category === "loan";

const applyMarketIntel = (
  category: string,
  reputationDelta: number,
  companyExperience: number
): { reputationDelta: number; companyExperience: number; effectSummary: string } | undefined => {
  if (!canUseMarketIntel(category)) {
    return undefined;
  }

  return {
    reputationDelta: reputationDelta > 0 ? Math.trunc(reputationDelta * 1.2) : Math.trunc(reputationDelta * 0.8),
    companyExperience: companyExperience > 0 ? Math.trunc(companyExperience * 1.1) : companyExperience,
    effectSummary: "市场情报已生效，优化了本次市场判断。"
  };
};

const applyFinanceAdvisor = (
  category: string,
  cashDelta: number,
  reputationDelta: number,
  companyExperience: number
): { cashDelta: number; reputationDelta: number; companyExperience: number; effectSummary: string } | undefined => {
  if (!canUseFinanceAdvisor(category)) {
    return undefined;
  }

  return {
    cashDelta: cashDelta > 0 ? Math.trunc(cashDelta * 1.2) : Math.trunc(cashDelta * 0.8),
    reputationDelta: reputationDelta > 0 ? Math.trunc(reputationDelta * 1.1) : Math.trunc(reputationDelta * 0.8),
    companyExperience: companyExperience > 0 ? Math.trunc(companyExperience * 1.1) : companyExperience,
    effectSummary: "财务顾问卡已生效，优化了本次现金流判断。"
  };
};

export const createPrismaGameRepository = (
  prisma = new PrismaClient()
): GameRepository => ({
  async createAccount(account) {
    try {
      return await prisma.account.create({
        data: {
          id: randomUUID(),
          ...account
        }
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return "ACCOUNT_EXISTS";
      }
      throw error;
    }
  },

  async findAccountByUsername(username) {
    return (await prisma.account.findUnique({ where: { username } })) ?? undefined;
  },

  async createAccountSession(accountId, token) {
    await prisma.accountSession.create({
      data: {
        id: randomUUID(),
        accountId,
        token
      }
    });
  },

  async getAccountBySessionToken(token) {
    const session = await prisma.accountSession.findUnique({
      where: { token },
      include: { account: true }
    });
    return session?.account;
  },

  async recordTelemetryEvent(event) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId: event.accountId,
          serverId: event.serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const saved = await prisma.playerTelemetryEvent.create({
      data: {
        accountId: event.accountId,
        profileId: profile.id,
        serverId: event.serverId,
        eventName: event.eventName,
        targetId: event.targetId,
        metadataJson: JSON.stringify(event.metadata)
      }
    });

    return { eventId: saved.id };
  },

  async getAdminAnalytics(_today) {
    const [
      profiles,
      taskTotal,
      taskClaimed,
      achievementTotal,
      achievementCompleted,
      knowledgeUnlocks,
      knowledgeViews,
      eventChoices,
      projects,
      fundings,
      employees,
      wallets,
      ledgers,
      shopClicks,
      shopPurchases,
      vipLevels,
      apiErrors,
      slowApis,
      paymentReservedCount,
      telemetryEvents
    ] = await Promise.all([
      prisma.playerProfile.findMany(),
      prisma.playerTaskProgress.count(),
      prisma.playerTaskProgress.count({ where: { claimedAt: { not: null } } }),
      prisma.playerAchievement.count(),
      prisma.playerAchievement.count({ where: { completedAt: { not: null } } }),
      prisma.playerKnowledgeUnlock.count(),
      prisma.playerTelemetryEvent.count({ where: { eventName: "knowledge_view" } }),
      prisma.playerEvent.findMany({ where: { selectedOption: { not: null } }, select: { selectedOption: true } }),
      prisma.playerProject.findMany({ where: { status: { in: ["settled", "failed"] } }, select: { status: true, result: true } }),
      prisma.playerFunding.findMany({ where: { status: { in: ["funded", "failed"] } }, select: { status: true } }),
      prisma.playerEmployee.findMany({ select: { isActive: true } }),
      prisma.playerPlatformWallet.findMany({ select: { balance: true, vipExperience: true } }),
      prisma.platformCoinLedger.findMany({ select: { changeAmount: true, source: true } }),
      prisma.playerTelemetryEvent.count({ where: { eventName: "shop_product_click" } }),
      prisma.playerShopPurchase.count(),
      prisma.vipLevelConfig.findMany({ orderBy: [{ requiredExperience: "asc" }, { sortOrder: "asc" }] }),
      prisma.apiRequestLog.count({ where: { statusCode: { gte: 500 } } }),
      prisma.apiRequestLog.count({ where: { durationMs: { gte: 1000 } } }),
      prisma.externalPaymentOrder.count({ where: { status: "reserved" } }),
      prisma.playerTelemetryEvent.findMany({ where: { eventName: "tutorial_step" }, select: { targetId: true, metadataJson: true } })
    ]);

    const tutorialStepCounts = new Map<string, number>();
    for (const event of telemetryEvents) {
      let step = event.targetId ?? "unknown";
      if (event.metadataJson !== null) {
        try {
          const metadata = JSON.parse(event.metadataJson) as { step?: unknown };
          if (typeof metadata.step === "string" && metadata.step.trim() !== "") {
            step = metadata.step;
          }
        } catch {
          step = event.targetId ?? "unknown";
        }
      }
      tutorialStepCounts.set(step, (tutorialStepCounts.get(step) ?? 0) + 1);
    }

    const eventChoiceCounts = new Map<string, number>();
    for (const choice of eventChoices) {
      const option = choice.selectedOption ?? "unknown";
      eventChoiceCounts.set(option, (eventChoiceCounts.get(option) ?? 0) + 1);
    }
    const eventChoiceTotal = eventChoices.length;
    const debtDistribution = new Map<string, number>([
      ["0-30%", 0],
      ["30-60%", 0],
      ["60-90%", 0],
      ["90%+", 0]
    ]);
    for (const profile of profiles) {
      const band = debtRatioBand(profile.totalDebt, profile.valuation);
      debtDistribution.set(band, (debtDistribution.get(band) ?? 0) + 1);
    }
    const levelRecords = vipLevels.map(toVipLevelRecord);
    const vipLevelCounts = new Map<number, number>();
    for (const wallet of wallets) {
      const { currentLevel } = resolveVipLevels(levelRecords, wallet.vipExperience);
      vipLevelCounts.set(currentLevel.level, (vipLevelCounts.get(currentLevel.level) ?? 0) + 1);
    }
    const projectSettledTotal = projects.length;
    const projectFailedTotal = projects.filter((project) => project.status === "failed" || project.result === "failed").length;
    const fundingTotal = fundings.length;
    const fundingSuccessTotal = fundings.filter((funding) => funding.status === "funded").length;
    const employeeTotal = employees.length;
    const employeeInactiveTotal = employees.filter((employee) => !employee.isActive).length;
    const platformCoinBalanceTotal = profiles.reduce((total, profile) => total + profile.platformCoins, 0);
    const platformCoinGrantedTotal = ledgers
      .filter((ledger) => ledger.changeAmount > 0)
      .reduce((total, ledger) => total + ledger.changeAmount, 0);
    const platformCoinSpentTotal = Math.abs(
      ledgers
        .filter((ledger) => ledger.changeAmount < 0)
        .reduce((total, ledger) => total + ledger.changeAmount, 0)
    );

    return {
      overview: {
        totalPlayers: profiles.length,
        retainedPlayers: profiles.filter((profile) => profile.operatingDay > 1 || profile.financeMonth > 1).length,
        apiErrorCount: apiErrors,
        slowApiCount: slowApis
      },
      onboarding: {
        tutorialSteps: [...tutorialStepCounts.entries()].map(([step, count]) => ({ step, count }))
      },
      business: {
        taskCompletionRateBasisPoints: rateBasisPoints(taskClaimed, taskTotal),
        achievementCompletionRateBasisPoints: rateBasisPoints(achievementCompleted, achievementTotal),
        knowledgeViewRateBasisPoints: rateBasisPoints(knowledgeViews + knowledgeUnlocks, Math.max(1, profiles.length)),
        eventChoiceRates: [...eventChoiceCounts.entries()].map(([option, count]) => ({
          option,
          count,
          rateBasisPoints: rateBasisPoints(count, eventChoiceTotal)
        })),
        projectFailureRateBasisPoints: rateBasisPoints(projectFailedTotal, projectSettledTotal),
        debtRatioDistribution: [...debtDistribution.entries()].map(([band, count]) => ({ band, count })),
        fundingSuccessRateBasisPoints: rateBasisPoints(fundingSuccessTotal, fundingTotal),
        employeeDepartureRateBasisPoints: rateBasisPoints(employeeInactiveTotal, employeeTotal)
      },
      monetization: {
        platformCoinBalanceTotal,
        platformCoinGrantedTotal,
        platformCoinSpentTotal,
        vipLevelDistribution: [...vipLevelCounts.entries()].map(([level, count]) => ({ level, count })),
        shopClickCount: shopClicks,
        shopPurchaseConversionBasisPoints: rateBasisPoints(shopPurchases, shopClicks)
      },
      alerts: [
        {
          level: platformCoinGrantedTotal >= 50000 || platformCoinSpentTotal >= 50000 ? "warning" : "info",
          message: `平台币异常变动监控：发放 ${platformCoinGrantedTotal}，消耗 ${platformCoinSpentTotal}`,
          traceId: null
        },
        {
          level: paymentReservedCount > 0 ? "warning" : "info",
          message: `外部支付异常预留告警：待处理订单 ${paymentReservedCount} 条`,
          traceId: null
        }
      ]
    };
  },

  async recordApiRequestLog(input) {
    await prisma.apiRequestLog.create({ data: input });
  },

  async findAdminByUsername(username) {
    return (await prisma.adminUser.findUnique({ where: { username } })) ?? undefined;
  },

  async createAdminSession(adminUserId, token) {
    await prisma.adminSession.create({
      data: {
        id: randomUUID(),
        adminUserId,
        token
      }
    });
  },

  async getAdminBySessionToken(token) {
    const session = await prisma.adminSession.findUnique({
      where: { token },
      include: { adminUser: true }
    });
    return session?.adminUser;
  },

  async listServers() {
    const servers = await prisma.gameServer.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
    return servers.map(toServerRecord);
  },

  async listAvatars() {
    return prisma.avatarOption.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
  },

  async getProfile(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return undefined;
    }

    const recovery = recoverActionPowerData(profile);
    if (recovery.actionPower !== profile.actionPower || recovery.actionPowerRecoveredAt.getTime() !== profile.actionPowerRecoveredAt.getTime()) {
      const updated = await prisma.playerProfile.update({
        where: { id: profile.id },
        data: recovery
      });
      return toProfileRecord(updated);
    }

    return toProfileRecord(profile);
  },

  async createProfile(profile) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const nextProfile = await tx.playerProfile.create({
          data: {
            id: randomUUID(),
            ...profile,
            companyExperience: 0,
            companyLevel: 1,
            actionPower: BASE_ACTION_POWER_LIMIT,
            actionPowerLimit: BASE_ACTION_POWER_LIMIT,
            actionPowerRecoveredAt: new Date()
          }
        });
        await tx.playerPlatformWallet.create({
          data: {
            profileId: nextProfile.id,
            balance: nextProfile.platformCoins,
            totalSpent: 0,
            vipExperience: VIP3_START_EXPERIENCE
          }
        });
        return nextProfile;
      });
      return toProfileRecord(created);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return "PLAYER_EXISTS";
      }
      throw error;
    }
  },

  async getCompanyGrowth(accountId, serverId) {
    const profile = await this.getProfile(accountId, serverId);
    if (profile === undefined) {
      return "PLAYER_NOT_FOUND";
    }

    const claimedCount = await prisma.playerItemLedger.count({
      where: {
        profileId: profile.id,
        source: "full_level_chest"
      }
    });
    return readCompanyGrowthRecord(profile, claimedCount);
  },

  async claimFullLevelChest(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const result = await prisma.$transaction(async (tx) => {
      const claimedCount = await tx.playerItemLedger.count({
        where: {
          profileId: profile.id,
          source: "full_level_chest"
        }
      });
      const growth = readCompanyGrowthRecord(toProfileRecord(profile), claimedCount);
      if (growth.fullLevelChest.claimableCount <= 0) {
        return "FULL_LEVEL_CHEST_NOT_READY" as const;
      }

      const updated = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          reputation: { increment: FULL_LEVEL_CHEST_REWARD_REPUTATION },
          actionPower: { increment: FULL_LEVEL_CHEST_REWARD_ACTION_POWER }
        }
      });
      await grantInventoryItem(
        tx,
        profile.id,
        FULL_LEVEL_CHEST_REWARD_ITEM_ID,
        FULL_LEVEL_CHEST_REWARD_ITEM_QUANTITY,
        "full_level_chest",
        `${profile.id}:${claimedCount + 1}`,
        "领取满级宝箱奖励"
      );

      return readCompanyGrowthRecord(toProfileRecord(updated), claimedCount + 1);
    });

    return result;
  },

  async listRandomTasks(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const recovery = recoverActionPowerData(profile);
    const currentProfile =
      recovery.actionPower !== profile.actionPower || recovery.actionPowerRecoveredAt.getTime() !== profile.actionPowerRecoveredAt.getTime()
        ? await prisma.playerProfile.update({ where: { id: profile.id }, data: recovery })
        : profile;
    const [hasPrivilege, seasonPass] = await Promise.all([
      prisma.playerShopPurchase.findFirst({
        where: {
          profileId: profile.id,
          product: { category: { in: ["weekly_card", "monthly_card"] } }
        }
      }),
      prisma.playerSeasonPassPurchase.findFirst({
        where: {
          profileId: profile.id,
          season: {
            startDate: { lte: today },
            endDate: { gte: today }
          }
        }
      })
    ]);
    const hasSeasonPass = seasonPass !== null;
    const dailyLimit = (hasPrivilege === null ? RANDOM_TASK_BASE_DAILY_LIMIT : RANDOM_TASK_PRIVILEGE_DAILY_LIMIT) + (hasSeasonPass ? RANDOM_TASK_PASS_DAILY_LIMIT_BONUS : 0);
    const visibleCount = RANDOM_TASK_VISIBLE_COUNT + (hasSeasonPass ? RANDOM_TASK_PASS_VISIBLE_BONUS : 0);
    const existingToday = await prisma.playerRandomTask.findMany({
      where: {
        profileId: profile.id,
        dailyDate: today
      },
      include: { config: true },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }]
    });
    const pendingCount = existingToday.filter((task) => task.status === "pending").length;
    const createCount = Math.max(0, Math.min(visibleCount - pendingCount, dailyLimit - existingToday.length));
    if (createCount > 0) {
      const usedConfigIds = new Set(existingToday.map((task) => task.configId));
      const usedCategories = new Set(existingToday.map((task) => task.config.category));
      const selectedConfigs = [];
      if (hasSeasonPass && !existingToday.some((task) => task.config.category === "season")) {
        const seasonConfig = await prisma.randomTaskConfig.findFirst({
          where: { isActive: true, category: "season", id: { notIn: [...usedConfigIds] } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        });
        if (seasonConfig !== null) {
          selectedConfigs.push(seasonConfig);
          usedConfigIds.add(seasonConfig.id);
          usedCategories.add(seasonConfig.category);
        }
      }
      const remainingCreateCount = createCount - selectedConfigs.length;
      if (remainingCreateCount > 0) {
        const configs = await prisma.randomTaskConfig.findMany({
          where: readRandomTaskConfigWhere(hasSeasonPass, [...usedConfigIds]),
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        });
        selectedConfigs.push(...selectFairRandomTaskConfigs(configs, [...usedCategories], remainingCreateCount));
      }
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
      await prisma.playerRandomTask.createMany({
        data: selectedConfigs.map((config) => ({
          profileId: profile.id,
          configId: config.id,
          dailyDate: today,
          expiresAt
        })),
        skipDuplicates: true
      });
    }

    const tasks = await prisma.playerRandomTask.findMany({
      where: { profileId: profile.id, dailyDate: today },
      include: { config: true },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }]
    });
    const knowledgeIds = [...new Set(tasks.map((task) => task.config.knowledgeId).filter((id): id is string => id !== null))];
    const [knowledgeEntries, knowledgeUnlocks] = await Promise.all([
      knowledgeIds.length === 0 ? [] : prisma.knowledgeEntry.findMany({ where: { id: { in: knowledgeIds } } }),
      knowledgeIds.length === 0 ? [] : prisma.playerKnowledgeUnlock.findMany({ where: { profileId: profile.id, knowledgeId: { in: knowledgeIds } } })
    ]);
    const knowledgeById = new Map(knowledgeEntries.map((knowledge) => [knowledge.id, knowledge]));
    const unlockedKnowledgeIds = new Set(knowledgeUnlocks.map((unlock) => unlock.knowledgeId));

    return {
      profile: toProfileRecord(currentProfile),
      tasks: tasks.map((task) => toRandomTaskRecord(
        task,
        toKnowledgeLinkRecord(
          task.config.knowledgeId === null ? null : knowledgeById.get(task.config.knowledgeId),
          task.config.knowledgeId !== null && unlockedKnowledgeIds.has(task.config.knowledgeId)
        )
      )),
      dailyLimit,
      pendingCount: tasks.filter((task) => task.status === "pending").length,
      handledToday: tasks.filter((task) => task.status !== "pending").length
    };
  },

  async resolveRandomTask(accountId, serverId, randomTaskId, option, today, modifierItemId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const randomTask = await prisma.playerRandomTask.findUnique({
      where: { id: randomTaskId },
      include: { config: true }
    });
    if (randomTask === null || randomTask.profileId !== profile.id) {
      return "RANDOM_TASK_NOT_FOUND";
    }
    if (randomTask.status !== "pending") {
      return "RANDOM_TASK_ALREADY_RESOLVED";
    }

    const actionPowerDelta = option === "A" ? randomTask.config.optionAActionPower : randomTask.config.optionBActionPower;
    const rawCashDelta = option === "A" ? randomTask.config.optionACash : randomTask.config.optionBCash;
    const rawReputationDelta = option === "A" ? randomTask.config.optionAReputation : randomTask.config.optionBReputation;
    const rawCompanyExperience = option === "A" ? randomTask.config.optionACompanyExperience : randomTask.config.optionBCompanyExperience;
    const resultSummary = option === "A" ? randomTask.config.optionAResult : randomTask.config.optionBResult;
    const recovered = recoverActionPowerData(profile);
    if (actionPowerDelta < 0 && recovered.actionPower < Math.abs(actionPowerDelta)) {
      return "INSUFFICIENT_ACTION_POWER";
    }
    if (modifierItemId !== undefined && modifierItemId !== RISK_INSURANCE_ITEM_ID && modifierItemId !== MARKET_INTEL_ITEM_ID && modifierItemId !== FINANCE_ADVISOR_ITEM_ID) {
      return "ITEM_NOT_USABLE";
    }
    const insuranceEffect = modifierItemId === RISK_INSURANCE_ITEM_ID
      ? applyRiskInsurance(randomTask.config.category, rawCashDelta, rawReputationDelta)
      : undefined;
    const marketIntelEffect = modifierItemId === MARKET_INTEL_ITEM_ID
      ? applyMarketIntel(randomTask.config.category, rawReputationDelta, rawCompanyExperience)
      : undefined;
    const financeAdvisorEffect = modifierItemId === FINANCE_ADVISOR_ITEM_ID
      ? applyFinanceAdvisor(randomTask.config.category, rawCashDelta, rawReputationDelta, rawCompanyExperience)
      : undefined;
    if (modifierItemId === RISK_INSURANCE_ITEM_ID && insuranceEffect === undefined) {
      return "ITEM_NOT_USABLE";
    }
    if (modifierItemId === MARKET_INTEL_ITEM_ID && marketIntelEffect === undefined) {
      return "ITEM_NOT_USABLE";
    }
    if (modifierItemId === FINANCE_ADVISOR_ITEM_ID && financeAdvisorEffect === undefined) {
      return "ITEM_NOT_USABLE";
    }
    const cashDelta = financeAdvisorEffect?.cashDelta ?? insuranceEffect?.cashDelta ?? rawCashDelta;
    const reputationDelta = financeAdvisorEffect?.reputationDelta ?? marketIntelEffect?.reputationDelta ?? insuranceEffect?.reputationDelta ?? rawReputationDelta;
    const companyExperience = financeAdvisorEffect?.companyExperience ?? marketIntelEffect?.companyExperience ?? rawCompanyExperience;
    const modifierEffect = insuranceEffect ?? marketIntelEffect ?? financeAdvisorEffect;
    const finalResultSummary = modifierEffect === undefined ? resultSummary : `${resultSummary} ${modifierEffect.effectSummary}`;

    const result = await prisma.$transaction(async (tx) => {
      let usedItem: RandomTaskActionRecord["usedItem"];
      if (modifierItemId !== undefined && modifierEffect !== undefined) {
        const inventoryItem = await tx.playerInventoryItem.findUnique({
          where: { profileId_itemId: { profileId: profile.id, itemId: modifierItemId } },
          include: { item: true }
        });
        if (inventoryItem === null || inventoryItem.quantity <= 0) {
          return "ITEM_NOT_FOUND" as const;
        }
        const nextQuantity = inventoryItem.quantity - 1;
        await tx.playerInventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantity: nextQuantity }
        });
        await tx.playerItemLedger.create({
          data: {
            profileId: profile.id,
            itemId: modifierItemId,
            changeQuantity: -1,
            balanceAfter: nextQuantity,
            source: "random_task_modifier",
            referenceId: randomTask.id,
            reason: `随机任务使用：${inventoryItem.item.name}`
          }
        });
        usedItem = {
          itemId: modifierItemId,
          itemName: inventoryItem.item.name,
          effectSummary: modifierEffect.effectSummary
        };
      }
      await tx.playerRandomTask.update({
        where: { id: randomTask.id },
        data: {
          status: "resolved",
          selectedOption: option,
          resultSummary: finalResultSummary,
          resolvedAt: new Date()
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { increment: cashDelta },
          reputation: { increment: reputationDelta },
          actionPower: recovered.actionPower + actionPowerDelta,
          actionPowerRecoveredAt: recovered.actionPowerRecoveredAt
        }
      });
      return {
        profile: await grantCompanyExperience(tx, updatedProfile.id, companyExperience, "random_task"),
        usedItem
      };
    });
    if (result === "ITEM_NOT_FOUND") {
      return result;
    }

    const center = await this.listRandomTasks(accountId, serverId, today);
    if (center === "PLAYER_NOT_FOUND") {
      return center;
    }
    const nextTask = center.tasks.find((task) => task.id === randomTask.id);
    if (nextTask === undefined) {
      return "RANDOM_TASK_NOT_FOUND";
    }
    return {
      center,
      task: nextTask,
      profile: result.profile,
      result: finalResultSummary,
      usedItem: result.usedItem
    };
  },

  async dismissRandomTask(accountId, serverId, randomTaskId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const randomTask = await prisma.playerRandomTask.findUnique({
      where: { id: randomTaskId },
      include: { config: true }
    });
    if (randomTask === null || randomTask.profileId !== profile.id) {
      return "RANDOM_TASK_NOT_FOUND";
    }
    if (randomTask.status !== "pending") {
      return "RANDOM_TASK_ALREADY_RESOLVED";
    }

    await prisma.playerRandomTask.update({
      where: { id: randomTask.id },
      data: {
        status: "dismissed",
        resultSummary: "已转入专属经理待办，本次不消耗行动力。",
        resolvedAt: new Date()
      }
    });
    const center = await this.listRandomTasks(accountId, serverId, today);
    if (center === "PLAYER_NOT_FOUND") {
      return center;
    }
    const nextTask = center.tasks.find((task) => task.id === randomTask.id);
    if (nextTask === undefined) {
      return "RANDOM_TASK_NOT_FOUND";
    }
    return {
      center,
      task: nextTask,
      profile: center.profile,
      result: "已转入专属经理待办，本次不消耗行动力。"
    };
  },

  async listTasks(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const [configs, progresses] = await Promise.all([
      prisma.taskConfig.findMany({
        include: { rewardItem: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      }),
      prisma.playerTaskProgress.findMany({
        where: { profileId: profile.id }
      })
    ]);
    const progressByTaskId = new Map(progresses.map((progress) => [progress.taskId, progress]));
    const taskRecords = configs.map((config) => toTaskRecord(config, progressByTaskId.get(config.id), today));
    const firstOpenMainTask = taskRecords.find((task) => task.type === "main" && !task.isClaimed);

    if (firstOpenMainTask === undefined) {
      return taskRecords;
    }

    return taskRecords.filter((task) => task.type !== "main" || task.isClaimed || task.id === firstOpenMainTask.id);
  },

  async advanceTask(accountId, serverId, taskId, today, knowledgeId = null) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const config = await prisma.taskConfig.findUnique({ where: { id: taskId }, include: { rewardItem: true } });
    if (config === null) {
      return "TASK_NOT_FOUND";
    }

    const unlockKind = readUnlockKind(config.unlockKind);
    if (unlockKind !== "none" && config.knowledgeId !== null) {
      if (knowledgeId !== config.knowledgeId) {
        return "TASK_KNOWLEDGE_MISMATCH";
      }
      const unlock = await prisma.playerKnowledgeUnlock.findUnique({
        where: {
          profileId_knowledgeId: {
            profileId: profile.id,
            knowledgeId: config.knowledgeId
          }
        }
      });
      if (unlock === null) {
        return "KNOWLEDGE_LOCKED";
      }
    }

    const existing = await prisma.playerTaskProgress.findUnique({
      where: {
        profileId_taskId: {
          profileId: profile.id,
          taskId
        }
      }
    });
    const isDaily = config.type === "daily";
    const shouldResetDaily = isDaily && existing?.dailyDate !== today;
    const baseProgress = shouldResetDaily ? 0 : existing?.progress ?? config.initialProgress;
    const nextProgress = Math.min(baseProgress + 1, config.target);

    const progress = await prisma.playerTaskProgress.upsert({
      where: {
        profileId_taskId: {
          profileId: profile.id,
          taskId
        }
      },
      update: {
        progress: nextProgress,
        dailyDate: isDaily ? today : existing?.dailyDate ?? null,
        claimedAt: shouldResetDaily ? null : existing?.claimedAt ?? null
      },
      create: {
        profileId: profile.id,
        taskId,
        progress: nextProgress,
        dailyDate: isDaily ? today : null
      }
    });

    return toTaskRecord(config, progress, today);
  },

  async claimTask(accountId, serverId, taskId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const config = await prisma.taskConfig.findUnique({ where: { id: taskId }, include: { rewardItem: true } });
    if (config === null) {
      return "TASK_NOT_FOUND";
    }

    const existing = await prisma.playerTaskProgress.findUnique({
      where: {
        profileId_taskId: {
          profileId: profile.id,
          taskId
        }
      }
    });
    const isDaily = config.type === "daily";
    const isFreshDaily = !isDaily || existing === null || existing?.dailyDate === today;
    const currentProgress = isFreshDaily ? existing?.progress ?? config.initialProgress : 0;

    if (currentProgress < config.target) {
      return "TASK_INCOMPLETE";
    }

    if (isFreshDaily && existing?.claimedAt !== null && existing?.claimedAt !== undefined) {
      return "TASK_ALREADY_CLAIMED";
    }

    const progress = await prisma.$transaction(async (tx) => {
      const savedProgress = await tx.playerTaskProgress.upsert({
        where: {
          profileId_taskId: {
            profileId: profile.id,
            taskId
          }
        },
        update: {
          progress: currentProgress,
          dailyDate: isDaily ? today : existing?.dailyDate ?? null,
          claimedAt: new Date()
        },
        create: {
          profileId: profile.id,
          taskId,
          progress: currentProgress,
          dailyDate: isDaily ? today : null,
          claimedAt: new Date()
        }
      });

      const rewardedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { increment: config.rewardCash },
          platformCoins: { increment: config.rewardPlatformCoins },
          reputation: { increment: config.rewardReputation },
          actionPower: { increment: config.rewardActionPower }
        }
      });
      await grantCompanyExperience(tx, rewardedProfile.id, config.rewardCompanyExperience, "task_reward");
      await grantInventoryItem(
        tx,
        profile.id,
        config.rewardItemId,
        config.rewardItemQuantity,
        "task_reward",
        savedProgress.id,
        `领取任务奖励：${config.title}`
      );

      return savedProgress;
    });

    return toTaskRecord(config, progress, today);
  },

  async getCompanyFinance(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });

    return profile === null ? "PLAYER_NOT_FOUND" : toCompanyFinanceRecord(toProfileRecord(profile));
  },

  async settleCompanyDay(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const updated = await prisma.playerProfile.update({
      where: { id: profile.id },
      data: {
        operatingDay: profile.operatingDay + 1
      }
    });

    return toCompanyFinanceRecord(toProfileRecord(updated));
  },

  async settleCompanyMonth(accountId, serverId, reportMonth) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const existingReport = await prisma.companyFinanceReport.findUnique({
      where: {
        profileId_reportMonth: {
          profileId: profile.id,
          reportMonth
        }
      }
    });
    if (existingReport !== null) {
      const finance = toCompanyFinanceRecord(toProfileRecord(profile));
      return {
        ...finance,
        reportMonth: existingReport.reportMonth,
        income: existingReport.income,
        expense: existingReport.expense,
        endingCash: existingReport.endingCash,
        createdAt: existingReport.createdAt.toISOString()
      };
    }

    const currentProfile = toProfileRecord(profile);
    const report = calculateFinanceReport(currentProfile);
    const nextRiskStatus = report.riskStatus;
    const nextDebtWarning = report.debtRatioBasisPoints >= 6000 ? "高" : "低";
    const nextCreditRating = report.debtRatioBasisPoints >= 6000 || report.cashAfterSettlement < 0 ? "B" : "A";

    const [updated, savedReport] = await prisma.$transaction(async (tx) => {
      const nextProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: report.cashAfterSettlement,
          financeMonth: Math.max(profile.financeMonth, reportMonth + 1),
          operatingDay: 1,
          riskStatus: nextRiskStatus,
          debtWarning: nextDebtWarning,
          creditRating: nextCreditRating,
          pendingEventCount: report.riskStatus === "稳健" ? profile.pendingEventCount : profile.pendingEventCount + 1
        }
      });

      const financeReport = await tx.companyFinanceReport.upsert({
        where: {
          profileId_reportMonth: {
            profileId: profile.id,
            reportMonth
          }
        },
        update: {},
        create: {
          id: randomUUID(),
          profileId: profile.id,
          reportMonth,
          income: profile.monthlyIncome,
          expense: profile.monthlyExpense,
          netCashFlow: report.netCashFlow,
          endingCash: report.cashAfterSettlement,
          totalDebt: profile.totalDebt,
          debtRatioBasisPoints: report.debtRatioBasisPoints,
          riskStatus: report.riskStatus,
          riskTips: report.riskTips.join("\n")
        }
      });

      return [nextProfile, financeReport] as const;
    });

    const finance = toCompanyFinanceRecord(toProfileRecord(updated));
    return {
      ...finance,
      reportMonth: savedReport.reportMonth,
      income: savedReport.income,
      expense: savedReport.expense,
      endingCash: savedReport.endingCash,
      createdAt: savedReport.createdAt.toISOString()
    };
  },

  async listEmployees(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const employees = await prisma.playerEmployee.findMany({
      where: { profileId: profile.id },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }]
    });

    return employees.map(toEmployeeRecord);
  },

  async recruitEmployee(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const [configs, ownedEmployees] = await Promise.all([
      prisma.employeeConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.playerEmployee.findMany({ where: { profileId: profile.id }, select: { configId: true } })
    ]);
    const ownedConfigIds = new Set(ownedEmployees.map((employee) => employee.configId));
    const pool = configs.filter((config) => !ownedConfigIds.has(config.id));
    if (pool.length === 0) {
      return "NO_EMPLOYEE_AVAILABLE";
    }

    const totalWeight = pool.reduce((total, config) => total + Math.max(config.recruitWeight, 0), 0);
    const selected = pickRecruitCandidate(pool, Math.random() * totalWeight);
    if (selected === undefined) {
      return "NO_EMPLOYEE_AVAILABLE";
    }

    const [created] = await prisma.$transaction([
      prisma.playerEmployee.create({
        data: {
          id: randomUUID(),
          profileId: profile.id,
          configId: selected.id,
          name: selected.name,
          role: selected.role,
          careerLevel: selected.careerLevel,
          rarity: selected.rarity,
          level: 1,
          salary: selected.baseSalary,
          pressure: selected.basePressure,
          loyalty: selected.loyalty,
          growthPotential: selected.growthPotential,
          management: selected.management,
          negotiation: selected.negotiation,
          execution: selected.execution,
          specialty: selected.specialty
        }
      }),
      prisma.playerProfile.update({
        where: { id: profile.id },
        data: {
          monthlyExpense: { increment: selected.baseSalary },
          employeeSatisfaction: { increment: 1 }
        }
      })
    ]);

    return toEmployeeRecord(created);
  },

  async cultivateEmployee(accountId, serverId, employeeId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const employee = await prisma.playerEmployee.findFirst({
      where: {
        id: employeeId,
        profileId: profile.id,
        isActive: true
      }
    });
    if (employee === null) {
      return "EMPLOYEE_NOT_FOUND";
    }

    const salaryIncrease = Math.max(2000, Math.round(employee.salary * 0.08));
    const [updated] = await prisma.$transaction([
      prisma.playerEmployee.update({
        where: { id: employee.id },
        data: {
          level: employee.level + 1,
          salary: employee.salary + salaryIncrease,
          pressure: Math.min(employee.pressure + 2, 100),
          loyalty: Math.min(employee.loyalty + 1, 100),
          management: employee.management + 2,
          negotiation: employee.negotiation + 2,
          execution: employee.execution + 2
        }
      }),
      prisma.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { decrement: 20000 },
          monthlyExpense: { increment: salaryIncrease }
        }
      })
    ]);

    return toEmployeeRecord(updated);
  },

  async grantEmployeeEquity(accountId, serverId, employeeId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const employee = await prisma.playerEmployee.findFirst({
      where: {
        id: employeeId,
        profileId: profile.id,
        isActive: true
      }
    });
    if (employee === null) {
      return "EMPLOYEE_NOT_FOUND";
    }

    if (profile.founderEquityBasisPoints < 100) {
      return "EQUITY_LIMIT_REACHED";
    }

    const [updated] = await prisma.$transaction([
      prisma.playerEmployee.update({
        where: { id: employee.id },
        data: {
          equityBasisPoints: employee.equityBasisPoints + 100,
          loyalty: Math.min(employee.loyalty + 8, 100)
        }
      }),
      prisma.playerProfile.update({
        where: { id: profile.id },
        data: {
          founderEquityBasisPoints: { decrement: 100 },
          employeeSatisfaction: { increment: 2 }
        }
      })
    ]);

    return toEmployeeRecord(updated);
  },

  async dismissEmployee(accountId, serverId, employeeId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const employee = await prisma.playerEmployee.findFirst({
      where: {
        id: employeeId,
        profileId: profile.id,
        isActive: true
      }
    });
    if (employee === null) {
      return "EMPLOYEE_NOT_FOUND";
    }

    const updatedProfile = await prisma.$transaction(async (tx) => {
      await tx.playerEmployee.update({
        where: { id: employee.id },
        data: {
          isActive: false,
          assignedTo: null
        }
      });

      return tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          monthlyExpense: { decrement: employee.salary },
          employeeSatisfaction: { decrement: 5 },
          reputation: { decrement: 2000 },
          pendingEventCount: { increment: 1 }
        }
      });
    });

    return toCompanyFinanceRecord(toProfileRecord(updatedProfile));
  },

  async listProjects(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const projects = await prisma.playerProject.findMany({
      where: { profileId: profile.id },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }]
    });
    const assignedIds = projects
      .map((project) => project.assignedEmployeeId)
      .filter((employeeId): employeeId is string => employeeId !== null);
    const assignedEmployees = await prisma.playerEmployee.findMany({
      where: { id: { in: assignedIds }, profileId: profile.id },
      select: { id: true, management: true, negotiation: true, execution: true }
    });
    const employeesById = new Map(assignedEmployees.map((employee) => [employee.id, employee]));

    return projects.map((project) => toProjectRecord(project, project.assignedEmployeeId === null ? null : employeesById.get(project.assignedEmployeeId)));
  },

  async startProject(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const [configs, ownedProjects] = await Promise.all([
      prisma.projectConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.playerProject.findMany({ where: { profileId: profile.id }, select: { configId: true } })
    ]);
    const ownedConfigIds = new Set(ownedProjects.map((project) => project.configId));
    const selected = configs.find((config) => !ownedConfigIds.has(config.id));
    if (selected === undefined) {
      return "NO_PROJECT_AVAILABLE";
    }

    const created = await prisma.playerProject.create({
      data: {
        id: randomUUID(),
        profileId: profile.id,
        configId: selected.id,
        name: selected.name,
        category: selected.category,
        cycleDays: selected.cycleDays,
        budget: selected.budget,
        risk: selected.risk,
        successRateBase: selected.successRateBase,
        revenueReward: selected.revenueReward,
        reputationReward: selected.reputationReward,
        customerSatisfactionReward: selected.customerSatisfactionReward,
        failurePenalty: selected.failurePenalty,
        summary: selected.summary
      }
    });

    return toProjectRecord(created);
  },

  async assignProjectEmployee(accountId, serverId, projectId, employeeId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const [project, employee] = await Promise.all([
      prisma.playerProject.findFirst({
        where: {
          id: projectId,
          profileId: profile.id,
          status: { in: ["active", "ready"] }
        }
      }),
      prisma.playerEmployee.findFirst({
        where: {
          id: employeeId,
          profileId: profile.id,
          isActive: true
        }
      })
    ]);
    if (project === null) {
      return "PROJECT_NOT_FOUND";
    }
    if (employee === null) {
      return "EMPLOYEE_NOT_FOUND";
    }

    const updated = await prisma.playerProject.update({
      where: { id: project.id },
      data: {
        assignedEmployeeId: employee.id,
        assignedEmployeeName: employee.name
      }
    });

    return toProjectRecord(updated, employee);
  },

  async advanceProject(accountId, serverId, projectId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const project = await prisma.playerProject.findFirst({
      where: {
        id: projectId,
        profileId: profile.id
      }
    });
    if (project === null) {
      return "PROJECT_NOT_FOUND";
    }
    if (project.status === "settled" || project.status === "failed") {
      return "PROJECT_ALREADY_SETTLED";
    }

    const employee =
      project.assignedEmployeeId === null
        ? null
        : await prisma.playerEmployee.findFirst({
            where: { id: project.assignedEmployeeId, profileId: profile.id, isActive: true }
          });
    const progress = Math.min(100, project.progress + calculateProjectProgressGain(employee?.execution));
    const updated = await prisma.playerProject.update({
      where: { id: project.id },
      data: {
        progress,
        stage: progress >= 100 ? project.stage + 1 : project.stage,
        status: progress >= 100 ? "ready" : "active"
      }
    });

    return toProjectRecord(updated, employee);
  },

  async settleProject(accountId, serverId, projectId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const project = await prisma.playerProject.findFirst({
      where: {
        id: projectId,
        profileId: profile.id
      }
    });
    if (project === null) {
      return "PROJECT_NOT_FOUND";
    }

    const employee =
      project.assignedEmployeeId === null
        ? null
        : await prisma.playerEmployee.findFirst({
            where: { id: project.assignedEmployeeId, profileId: profile.id, isActive: true }
          });

    if (project.settledAt !== null) {
      return {
        project: toProjectRecord(project, employee),
        finance: toCompanyFinanceRecord(toProfileRecord(profile))
      };
    }

    if (project.progress < 100 || project.status !== "ready") {
      return "PROJECT_INCOMPLETE";
    }

    const successRate = calculateProjectSuccessRate({
      baseRate: project.successRateBase,
      employeeManagement: employee?.management,
      employeeNegotiation: employee?.negotiation,
      employeeExecution: employee?.execution
    });
    const isSuccess = Math.random() * 100 < successRate;

    const settled = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.playerProject.update({
        where: { id: project.id },
        data: {
          status: isSuccess ? "settled" : "failed",
          result: isSuccess ? "success" : "failure",
          settledAt: new Date()
        }
      });

      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: isSuccess
          ? {
              cash: { increment: project.revenueReward },
              monthlyIncome: { increment: Math.round(project.revenueReward * 0.18) },
              reputation: { increment: project.reputationReward },
              customerSatisfaction: { increment: project.customerSatisfactionReward }
            }
          : {
              cash: { decrement: project.failurePenalty },
              reputation: { decrement: Math.max(1000, project.reputationReward) },
              customerSatisfaction: { decrement: Math.max(3, project.customerSatisfactionReward) },
              pendingEventCount: { increment: 1 }
            }
      });

      return { project: updatedProject, profile: updatedProfile };
    });

    return {
      project: toProjectRecord(settled.project, employee),
      finance: toCompanyFinanceRecord(toProfileRecord(settled.profile))
    };
  },

  async listEvents(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const existingCount = await prisma.playerEvent.count({ where: { profileId: profile.id } });
    if (existingCount === 0) {
      const firstConfig = await prisma.eventConfig.findFirst({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      });
      if (firstConfig !== null) {
        await prisma.playerEvent.create({
          data: {
            id: randomUUID(),
            profileId: profile.id,
            configId: firstConfig.id
          }
        });
      }
    }

    const events = await prisma.playerEvent.findMany({
      where: { profileId: profile.id },
      include: { config: true },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }]
    });
    const knowledgeIds = [...new Set(events.map((event) => event.config.knowledgeId).filter((id): id is string => id !== null))];
    const [knowledgeEntries, knowledgeUnlocks] = await Promise.all([
      knowledgeIds.length === 0 ? [] : prisma.knowledgeEntry.findMany({ where: { id: { in: knowledgeIds } } }),
      knowledgeIds.length === 0 ? [] : prisma.playerKnowledgeUnlock.findMany({ where: { profileId: profile.id, knowledgeId: { in: knowledgeIds } } })
    ]);
    const knowledgeById = new Map(knowledgeEntries.map((knowledge) => [knowledge.id, knowledge]));
    const unlockedKnowledgeIds = new Set(knowledgeUnlocks.map((unlock) => unlock.knowledgeId));
    const pendingCount = events.filter((event) => event.status !== "resolved").length;
    if (pendingCount !== profile.pendingEventCount) {
      await prisma.playerProfile.update({
        where: { id: profile.id },
        data: { pendingEventCount: pendingCount }
      });
    }

    return events.map((event) => toEventRecord(
      event,
      toKnowledgeLinkRecord(
        event.config.knowledgeId === null ? null : knowledgeById.get(event.config.knowledgeId),
        event.config.knowledgeId !== null && unlockedKnowledgeIds.has(event.config.knowledgeId)
      )
    ));
  },

  async chooseEvent(accountId, serverId, eventId, option) {
    if (option !== "A" && option !== "B") {
      return "INVALID_EVENT_OPTION";
    }

    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const event = await prisma.playerEvent.findFirst({
      where: {
        id: eventId,
        profileId: profile.id
      },
      include: { config: true }
    });
    if (event === null) {
      return "EVENT_NOT_FOUND";
    }
    if (event.status === "resolved") {
      return "EVENT_ALREADY_RESOLVED";
    }

    const cash = option === "A" ? event.config.optionACash : event.config.optionBCash;
    const reputation = option === "A" ? event.config.optionAReputation : event.config.optionBReputation;
    const customerSatisfaction =
      option === "A" ? event.config.optionACustomerSatisfaction : event.config.optionBCustomerSatisfaction;
    const riskDelta = option === "A" ? event.config.optionARiskDelta : event.config.optionBRiskDelta;
    const resultSummary = option === "A" ? event.config.optionAResult : event.config.optionBResult;

    const settled = await prisma.$transaction(async (tx) => {
      const updatedEvent = await tx.playerEvent.update({
        where: { id: event.id },
        data: {
          status: "resolved",
          selectedOption: option,
          resultSummary,
          knowledgeUnlocked: event.config.knowledgeId !== null,
          resolvedAt: new Date()
        },
        include: { config: true }
      });
      await unlockKnowledge(tx as PrismaClient, profile.id, event.config.knowledgeId, "event");

      let followupEvent: typeof updatedEvent | null = null;
      if (event.config.followupEventId !== null) {
        const followupConfig = await tx.eventConfig.findUnique({
          where: { id: event.config.followupEventId }
        });
        const existingFollowup = await tx.playerEvent.findUnique({
          where: {
            profileId_configId: {
              profileId: profile.id,
              configId: event.config.followupEventId
            }
          },
          include: { config: true }
        });
        if (existingFollowup !== null) {
          followupEvent = existingFollowup;
        } else if (followupConfig !== null) {
          followupEvent = await tx.playerEvent.create({
            data: {
              id: randomUUID(),
              profileId: profile.id,
              configId: followupConfig.id
            },
            include: { config: true }
          });
        }
      }

      const pendingCount = await tx.playerEvent.count({
        where: {
          profileId: profile.id,
          status: "pending"
        }
      });
      const riskStatus =
        riskDelta > 0 ? "预警" : riskDelta < 0 && pendingCount === 0 && profile.riskStatus !== "资金紧张" ? "稳健" : profile.riskStatus;

      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { increment: cash },
          reputation: { increment: reputation },
          customerSatisfaction: { increment: customerSatisfaction },
          riskStatus,
          pendingEventCount: pendingCount
        }
      });

      return { event: updatedEvent, profile: updatedProfile, followupEvent };
    });

    const knowledgeEntry = event.config.knowledgeId === null
      ? null
      : await prisma.knowledgeEntry.findUnique({ where: { id: event.config.knowledgeId } });
    const knowledge = toKnowledgeLinkRecord(knowledgeEntry, event.config.knowledgeId !== null);
    const eventRecord = toEventRecord(settled.event, knowledge);
    return {
      event: eventRecord,
      finance: toCompanyFinanceRecord(toProfileRecord(settled.profile)),
      followupEvent: settled.followupEvent === null ? null : toEventRecord(settled.followupEvent),
      result: {
        summary: resultSummary,
        riskExplanation: event.config.riskExplanation,
        knowledgeUnlocked: event.config.knowledgeId !== null,
        knowledge,
        followupEventId: settled.followupEvent?.id ?? null
      }
    };
  },

  async listLoans(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    return toLoanCenterRecord(prisma, toProfileRecord(profile));
  },

  async applyLoan(accountId, serverId, loanConfigId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const config = await prisma.loanConfig.findUnique({ where: { id: loanConfigId } });
    if (config === null) {
      return "LOAN_NOT_FOUND";
    }
    if (creditRank(profile.creditRating) < creditRank(config.creditRequired)) {
      return "CREDIT_NOT_ENOUGH";
    }

    const activeLoan = await prisma.playerLoan.findFirst({
      where: {
        profileId: profile.id,
        configId: config.id,
        status: { not: "settled" }
      }
    });
    if (activeLoan !== null) {
      return "LOAN_ALREADY_ACTIVE";
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.playerLoan.create({
        data: {
          id: randomUUID(),
          profileId: profile.id,
          configId: config.id,
          name: config.name,
          lender: config.lender,
          principal: config.principal,
          remainingPrincipal: config.principal,
          annualRateBasisPoints: config.annualRateBasisPoints,
          termMonths: config.termMonths,
          remainingMonths: config.termMonths,
          monthlyPayment: config.monthlyPayment
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { increment: config.principal },
          totalDebt: { increment: config.principal },
          debtWarning: "中"
        }
      });
      return { loan, profile: updatedProfile };
    });

    return {
      loan: toLoanRecord(result.loan),
      loanCenter: await toLoanCenterRecord(prisma, toProfileRecord(result.profile)),
      result: `${config.name} 已放款，现金增加 ${config.principal.toLocaleString("zh-CN")}。`
    };
  },

  async repayLoan(accountId, serverId, loanId, mode) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const loan = await prisma.playerLoan.findFirst({
      where: {
        id: loanId,
        profileId: profile.id,
        status: { not: "settled" }
      }
    });
    if (loan === null) {
      return "LOAN_NOT_FOUND";
    }

    const principalPayment = mode === "full" ? loan.remainingPrincipal : calculatePrincipalPayment(loan);
    const payment = mode === "full" ? loan.remainingPrincipal + loan.penaltyAccrued : loan.monthlyPayment + loan.penaltyAccrued;
    if (profile.cash < payment) {
      return "INSUFFICIENT_CASH";
    }

    const result = await prisma.$transaction(async (tx) => {
      const remainingPrincipal = Math.max(0, loan.remainingPrincipal - principalPayment);
      const remainingMonths = mode === "full" || remainingPrincipal === 0 ? 0 : Math.max(0, loan.remainingMonths - 1);
      const status = remainingPrincipal === 0 ? "settled" : "active";
      const updatedLoan = await tx.playerLoan.update({
        where: { id: loan.id },
        data: {
          remainingPrincipal,
          remainingMonths,
          penaltyAccrued: 0,
          overduePeriods: status === "settled" ? loan.overduePeriods : 0,
          status,
          settledAt: status === "settled" ? new Date() : null
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { decrement: payment },
          totalDebt: { decrement: Math.min(profile.totalDebt, principalPayment + loan.penaltyAccrued) },
          debtWarning: remainingPrincipal === 0 ? "低" : profile.debtWarning
        }
      });
      return { loan: updatedLoan, profile: updatedProfile };
    });

    return {
      loan: toLoanRecord(result.loan),
      loanCenter: await toLoanCenterRecord(prisma, toProfileRecord(result.profile)),
      result: mode === "full" ? "提前结清完成，后续月供压力解除。" : "本期还款完成，剩余本金和期数已更新。"
    };
  },

  async settleLoanPeriod(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const loan = await prisma.playerLoan.findFirst({
      where: {
        profileId: profile.id,
        status: { in: ["active", "overdue"] }
      },
      orderBy: [{ overduePeriods: "desc" }, { createdAt: "asc" }]
    });
    if (loan === null) {
      return "NO_ACTIVE_LOAN";
    }

    if (profile.cash >= loan.monthlyPayment + loan.penaltyAccrued) {
      const principalPayment = calculatePrincipalPayment(loan);
      const payment = loan.monthlyPayment + loan.penaltyAccrued;
      const result = await prisma.$transaction(async (tx) => {
        const remainingPrincipal = Math.max(0, loan.remainingPrincipal - principalPayment);
        const status = remainingPrincipal === 0 ? "settled" : "active";
        const updatedLoan = await tx.playerLoan.update({
          where: { id: loan.id },
          data: {
            remainingPrincipal,
            remainingMonths: status === "settled" ? 0 : Math.max(0, loan.remainingMonths - 1),
            penaltyAccrued: 0,
            overduePeriods: status === "settled" ? loan.overduePeriods : 0,
            status,
            settledAt: status === "settled" ? new Date() : null
          }
        });
        const updatedProfile = await tx.playerProfile.update({
          where: { id: profile.id },
          data: {
            cash: { decrement: payment },
            totalDebt: { decrement: Math.min(profile.totalDebt, principalPayment + loan.penaltyAccrued) },
            debtWarning: remainingPrincipal === 0 ? "低" : profile.debtWarning
          }
        });
        return { loan: updatedLoan, profile: updatedProfile };
      });

      return {
        loan: toLoanRecord(result.loan),
        loanCenter: await toLoanCenterRecord(prisma, toProfileRecord(result.profile)),
        result: "本期还款完成，剩余本金和期数已更新。"
      };
    }

    const penalty = Math.max(1000, Math.round(loan.monthlyPayment * 0.08));
    const result = await prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.playerLoan.update({
        where: { id: loan.id },
        data: {
          status: "overdue",
          overduePeriods: { increment: 1 },
          penaltyAccrued: { increment: penalty }
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          totalDebt: { increment: penalty },
          creditRating: downgradeCredit(profile.creditRating),
          riskStatus: "资金紧张",
          debtWarning: "高",
          pendingEventCount: { increment: 1 }
        }
      });
      return { loan: updatedLoan, profile: updatedProfile };
    });

    return {
      loan: toLoanRecord(result.loan),
      loanCenter: await toLoanCenterRecord(prisma, toProfileRecord(result.profile)),
      result: `现金不足，本期逾期并产生罚息 ${penalty.toLocaleString("zh-CN")}。`
    };
  },

  async resolveCrisis(accountId, serverId, route) {
    if (route !== "financing" && route !== "cost_cut" && route !== "restructure") {
      return "INVALID_CRISIS_ROUTE";
    }

    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const center = await toLoanCenterRecord(prisma, toProfileRecord(profile));
    if (!center.crisis.isActive) {
      return "CRISIS_NOT_ACTIVE";
    }

    const updated = await prisma.playerProfile.update({
      where: { id: profile.id },
      data:
        route === "financing"
          ? {
              cash: { increment: 200000 },
              founderEquityBasisPoints: { decrement: Math.min(profile.founderEquityBasisPoints, 200) },
              reputation: { decrement: 300 },
              riskStatus: "预警"
            }
          : route === "cost_cut"
            ? {
                monthlyExpense: { decrement: Math.min(profile.monthlyExpense, 100000) },
                employeeSatisfaction: { decrement: 6 },
                reputation: { decrement: 800 },
                riskStatus: "预警"
              }
            : {
                totalDebt: { decrement: Math.min(profile.totalDebt, 200000) },
                creditRating: downgradeCredit(profile.creditRating),
                reputation: { decrement: 1200 },
                debtWarning: profile.totalDebt > 400000 ? "中" : "低",
                riskStatus: "预警"
              }
    });

    return toLoanCenterRecord(prisma, toProfileRecord(updated));
  },

  async listFundings(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    return toFundingCenterRecord(prisma, toProfileRecord(profile));
  },

  async startFunding(accountId, serverId, investorId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const config = await prisma.investorConfig.findUnique({ where: { id: investorId } });
    if (config === null) {
      return "INVESTOR_NOT_FOUND";
    }

    const fundings = await prisma.playerFunding.findMany({ where: { profileId: profile.id } });
    const completedInvestorIds = new Set(fundings.filter((funding) => funding.status === "funded").map((funding) => funding.investorId));
    const offer = calculateFundingOffer(toProfileRecord(profile), config, completedInvestorIds);
    if (!offer.isAvailable) {
      return "FUNDING_LOCKED";
    }
    const activeFunding = fundings.find((funding) => funding.investorId === investorId && funding.status === "pending");
    if (activeFunding !== undefined) {
      return "FUNDING_ALREADY_ACTIVE";
    }

    const funding = await prisma.playerFunding.create({
      data: {
        id: randomUUID(),
        profileId: profile.id,
        investorId: config.id,
        roundName: config.roundName,
        investorName: config.name,
        amount: offer.amount,
        preMoneyValuation: offer.preMoneyValuation,
        postMoneyValuation: offer.postMoneyValuation,
        equityBasisPoints: offer.equityBasisPoints,
        successRate: offer.successRate,
        boardPressure: offer.boardPressure,
        term: offer.term
      }
    });

    return {
      funding: toFundingRecord(funding),
      fundingCenter: await toFundingCenterRecord(prisma, toProfileRecord(profile)),
      result: `${config.name} 已进入路演谈判，等待确认条款。`
    };
  },

  async settleFunding(accountId, serverId, fundingId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const funding = await prisma.playerFunding.findFirst({
      where: {
        id: fundingId,
        profileId: profile.id
      }
    });
    if (funding === null) {
      return "FUNDING_NOT_FOUND";
    }
    if (funding.status !== "pending") {
      return "FUNDING_ALREADY_SETTLED";
    }

    const isSuccess = funding.successRate >= 50;
    const settled = await prisma.$transaction(async (tx) => {
      const resultSummary = isSuccess
        ? `${funding.investorName} 完成打款，创始人股权稀释 ${(funding.equityBasisPoints / 100).toFixed(1)}%。`
        : `${funding.investorName} 暂缓投资，董事会要求提交替代现金流方案。`;
      const updatedFunding = await tx.playerFunding.update({
        where: { id: funding.id },
        data: {
          status: isSuccess ? "funded" : "failed",
          resultSummary,
          resolvedAt: new Date()
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: isSuccess
          ? {
              cash: { increment: funding.amount },
              valuation: funding.postMoneyValuation,
              founderEquityBasisPoints: { decrement: funding.equityBasisPoints },
              reputation: { increment: 600 },
              riskStatus: funding.boardPressure >= 30 ? "预警" : profile.riskStatus
            }
          : {
              reputation: { decrement: 500 },
              riskStatus: "预警",
              pendingEventCount: { increment: 1 }
            }
      });

      if (!isSuccess) {
        const failureConfig = await tx.eventConfig.findUnique({ where: { id: "funding-failed-bridge-plan" } });
        if (failureConfig !== null) {
          await tx.playerEvent.upsert({
            where: {
              profileId_configId: {
                profileId: profile.id,
                configId: failureConfig.id
              }
            },
            update: { status: "pending" },
            create: {
              id: randomUUID(),
              profileId: profile.id,
              configId: failureConfig.id
            }
          });
        }
      }

      return { funding: updatedFunding, profile: updatedProfile, resultSummary };
    });

    return {
      funding: toFundingRecord(settled.funding),
      fundingCenter: await toFundingCenterRecord(prisma, toProfileRecord(settled.profile)),
      result: settled.resultSummary
    };
  },

  async listProducts(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    return toProductCenterRecord(prisma, toProfileRecord(profile));
  },

  async startProduct(accountId, serverId, productConfigId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const config = await prisma.productConfig.findUnique({ where: { id: productConfigId } });
    if (config === null) {
      return "PRODUCT_NOT_FOUND";
    }
    if (profile.cash < config.launchCost) {
      return "INSUFFICIENT_CASH";
    }

    const existing = await prisma.playerProduct.findFirst({
      where: {
        profileId: profile.id,
        configId: config.id,
        status: { not: "closed" }
      }
    });
    if (existing !== null) {
      return "PRODUCT_ALREADY_ACTIVE";
    }

    const result = await prisma.$transaction(async (tx) => {
      const monthlyRevenue = 0;
      const product = await tx.playerProduct.create({
        data: {
          id: randomUUID(),
          profileId: profile.id,
          configId: config.id,
          name: config.name,
          category: config.category,
          stage: "idea",
          users: config.baseUsers,
          retentionBasisPoints: config.retentionBasisPoints,
          payRateBasisPoints: config.payRateBasisPoints,
          acquisitionCost: config.acquisitionCost,
          serverCost: config.serverCost,
          reputationScore: 52,
          techDebt: 8,
          monthlyRevenue,
          resultSummary: "产品已立项，进入 MVP 打磨阶段前需要持续投入。"
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { decrement: config.launchCost },
          monthlyExpense: { increment: config.serverCost },
          valuation: { increment: Math.round(config.launchCost * 0.6) }
        }
      });
      return { product, profile: updatedProfile };
    });

    return {
      product: toProductRecord(result.product),
      productCenter: await toProductCenterRecord(prisma, toProfileRecord(result.profile)),
      result: `${config.name} 已完成产品立项，启动成本已计入现金流。`
    };
  },

  async advanceProduct(accountId, serverId, productId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const product = await prisma.playerProduct.findFirst({
      where: {
        id: productId,
        profileId: profile.id
      },
      include: { config: true }
    });
    if (product === null) {
      return "PRODUCT_NOT_FOUND";
    }
    if (product.status === "closed") {
      return "PRODUCT_CLOSED";
    }
    if (profile.cash < product.acquisitionCost) {
      return "INSUFFICIENT_CASH";
    }

    const nextMetrics = calculateNextProductMetrics({
      stage: readProductStage(product.stage),
      users: product.users,
      retentionBasisPoints: product.retentionBasisPoints,
      payRateBasisPoints: product.payRateBasisPoints,
      revenuePerPayingUser: product.config.revenuePerPayingUser,
      acquisitionCost: product.acquisitionCost,
      serverCost: product.serverCost,
      reputationScore: product.reputationScore,
      techDebt: product.techDebt,
      techDebtGrowth: product.config.techDebtGrowth,
      reputationGrowth: product.config.reputationGrowth
    });
    const incomeDelta = nextMetrics.monthlyRevenue - product.monthlyRevenue;
    const expenseDelta = nextMetrics.serverCost - product.serverCost;

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.playerProduct.update({
        where: { id: product.id },
        data: {
          stage: nextMetrics.stage,
          users: nextMetrics.users,
          retentionBasisPoints: nextMetrics.retentionBasisPoints,
          payRateBasisPoints: nextMetrics.payRateBasisPoints,
          serverCost: nextMetrics.serverCost,
          reputationScore: nextMetrics.reputationScore,
          techDebt: nextMetrics.techDebt,
          monthlyRevenue: nextMetrics.monthlyRevenue,
          resultSummary: nextMetrics.resultSummary
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { decrement: product.acquisitionCost },
          monthlyIncome: { increment: incomeDelta },
          monthlyExpense: { increment: expenseDelta },
          valuation: { increment: Math.max(0, Math.round(nextMetrics.monthlyRevenue * 2.4)) },
          reputation: { increment: nextMetrics.reputationScore * 20 },
          riskStatus: nextMetrics.incidentTriggered ? "预警" : profile.riskStatus,
          pendingEventCount: nextMetrics.incidentTriggered ? { increment: 1 } : undefined
        }
      });

      if (nextMetrics.incidentTriggered) {
        const incidentConfig = await tx.eventConfig.findUnique({ where: { id: "product-tech-debt-incident" } });
        if (incidentConfig !== null) {
          await tx.playerEvent.upsert({
            where: {
              profileId_configId: {
                profileId: profile.id,
                configId: incidentConfig.id
              }
            },
            update: { status: "pending" },
            create: {
              id: randomUUID(),
              profileId: profile.id,
              configId: incidentConfig.id
            }
          });
        }
      }

      return { product: updatedProduct, profile: updatedProfile };
    });

    return {
      product: toProductRecord(result.product),
      productCenter: await toProductCenterRecord(prisma, toProfileRecord(result.profile)),
      result: nextMetrics.resultSummary
    };
  },

  async refactorProduct(accountId, serverId, productId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const product = await prisma.playerProduct.findFirst({
      where: {
        id: productId,
        profileId: profile.id
      },
      include: { config: true }
    });
    if (product === null) {
      return "PRODUCT_NOT_FOUND";
    }
    if (product.status === "closed") {
      return "PRODUCT_CLOSED";
    }

    const refactorCost = Math.max(120000, Math.round(product.acquisitionCost * 0.8));
    if (profile.cash < refactorCost) {
      return "INSUFFICIENT_CASH";
    }

    const nextTechDebt = Math.max(0, product.techDebt - 38);
    const nextStage = product.stage === "decline" ? "growth" : product.stage;
    const nextUsers = product.stage === "decline" ? Math.round(product.users * 1.12) : product.users;
    const nextMonthlyRevenue = calculateProductRevenue(nextUsers, product.payRateBasisPoints, product.config.revenuePerPayingUser);
    const incomeDelta = nextMonthlyRevenue - product.monthlyRevenue;

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.playerProduct.update({
        where: { id: product.id },
        data: {
          stage: nextStage,
          users: nextUsers,
          techDebt: nextTechDebt,
          reputationScore: Math.min(100, product.reputationScore + 8),
          monthlyRevenue: nextMonthlyRevenue,
          resultSummary: "产品重构完成，技术债下降，衰退风险得到缓解。"
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { decrement: refactorCost },
          monthlyIncome: { increment: incomeDelta },
          reputation: { increment: 800 },
          riskStatus: nextTechDebt >= 70 ? "预警" : "稳健"
        }
      });
      return { product: updatedProduct, profile: updatedProfile };
    });

    return {
      product: toProductRecord(result.product),
      productCenter: await toProductCenterRecord(prisma, toProfileRecord(result.profile)),
      result: "产品重构完成，技术债下降，衰退风险得到缓解。"
    };
  },

  async closeProduct(accountId, serverId, productId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const product = await prisma.playerProduct.findFirst({
      where: {
        id: productId,
        profileId: profile.id
      }
    });
    if (product === null) {
      return "PRODUCT_NOT_FOUND";
    }
    if (product.status === "closed") {
      return "PRODUCT_CLOSED";
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.playerProduct.update({
        where: { id: product.id },
        data: {
          stage: "closed",
          status: "closed",
          monthlyRevenue: 0,
          resultSummary: "产品线已关闭，长期收入停止，服务器和客服成本同步释放。",
          closedAt: new Date()
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          monthlyIncome: { decrement: product.monthlyRevenue },
          monthlyExpense: { decrement: Math.min(profile.monthlyExpense, product.serverCost) },
          reputation: { decrement: 300 }
        }
      });
      return { product: updatedProduct, profile: updatedProfile };
    });

    return {
      product: toProductRecord(result.product),
      productCenter: await toProductCenterRecord(prisma, toProfileRecord(result.profile)),
      result: "产品线已关闭，长期收入停止，服务器和客服成本同步释放。"
    };
  },

  async listMarkets(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    return toMarketCenterRecord(prisma, toProfileRecord(profile));
  },

  async enterMarket(accountId, serverId, trackId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const config = await prisma.marketTrackConfig.findUnique({ where: { id: trackId } });
    if (config === null) {
      return "MARKET_NOT_FOUND";
    }
    const existing = await prisma.playerMarketState.findUnique({
      where: {
        profileId_trackId: {
          profileId: profile.id,
          trackId: config.id
        }
      }
    });
    if (existing !== null) {
      return "MARKET_ALREADY_ACTIVE";
    }

    const market = await prisma.playerMarketState.create({
      data: {
        profileId: profile.id,
        trackId: config.id,
        trackName: config.name,
        playerShareBasisPoints: config.baseShareBasisPoints,
        competitorShareBasisPoints: Math.max(1200, 3600 - config.baseShareBasisPoints),
        industryHeat: config.industryHeat,
        policyRisk: config.policyRisk,
        pricePressure: 0,
        talentPressure: config.name.includes("AI") ? 14 : 6,
        reputationPressure: 0,
        patentRisk: config.policyRisk,
        resultSummary: `${config.name} 赛道已进入，后续竞品行为会影响市场份额。`
      }
    });

    return {
      market: toPlayerMarketRecord(market),
      action: null,
      marketCenter: await toMarketCenterRecord(prisma, toProfileRecord(profile)),
      result: market.resultSummary ?? "赛道已进入。"
    };
  },

  async triggerCompetitorAction(accountId, serverId, trackId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const market = await prisma.playerMarketState.findUnique({
      where: {
        profileId_trackId: {
          profileId: profile.id,
          trackId
        }
      }
    });
    if (market === null) {
      return "MARKET_NOT_FOUND";
    }
    const config = await prisma.competitorActionConfig.findFirst({
      where: {
        trackId,
        playerActions: {
          none: {
            profileId: profile.id
          }
        }
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
    if (config === null) {
      return "COMPETITOR_ACTION_NOT_FOUND";
    }

    const result = await prisma.$transaction(async (tx) => {
      const action = await tx.playerCompetitorAction.create({
        data: {
          profileId: profile.id,
          actionId: config.id,
          trackId: config.trackId,
          competitorName: config.competitorName,
          actionType: config.actionType,
          title: config.title,
          summary: config.summary
        }
      });
      const updatedMarket = await tx.playerMarketState.update({
        where: { id: market.id },
        data: {
          playerShareBasisPoints: { increment: config.marketShareDeltaBasisPoints },
          competitorShareBasisPoints: { increment: config.competitorShareDeltaBasisPoints },
          pricePressure: { increment: config.pricePressure },
          talentPressure: { increment: config.talentPressure },
          policyRisk: { increment: config.policyRiskDelta },
          reputationPressure: { increment: Math.max(0, -config.reputationImpact) },
          patentRisk: { increment: readCompetitorActionType(config.actionType) === "patent" ? 18 : 0 },
          resultSummary: config.summary
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { increment: config.cashImpact },
          monthlyIncome: { increment: config.monthlyIncomeImpact },
          monthlyExpense: { increment: config.monthlyExpenseImpact },
          reputation: { increment: config.reputationImpact },
          employeeSatisfaction: { increment: config.employeeSatisfactionImpact },
          customerSatisfaction: { increment: config.customerSatisfactionImpact },
          riskStatus: "预警",
          pendingEventCount: { increment: 1 }
        }
      });

      return { action, market: updatedMarket, profile: updatedProfile };
    });

    return {
      market: toPlayerMarketRecord(result.market),
      action: toCompetitorActionRecord(result.action),
      marketCenter: await toMarketCenterRecord(prisma, toProfileRecord(result.profile)),
      result: `${config.competitorName} 已发起${config.title}。`
    };
  },

  async respondCompetitorAction(accountId, serverId, actionId, response) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const action = await prisma.playerCompetitorAction.findFirst({
      where: {
        id: actionId,
        profileId: profile.id
      },
      include: { config: true }
    });
    if (action === null) {
      return "COMPETITOR_ACTION_NOT_FOUND";
    }
    if (action.status === "resolved") {
      return "COMPETITOR_ACTION_SETTLED";
    }
    const market = await prisma.playerMarketState.findUnique({
      where: {
        profileId_trackId: {
          profileId: profile.id,
          trackId: action.trackId
        }
      }
    });
    if (market === null) {
      return "MARKET_NOT_FOUND";
    }
    const responseCost = response === "counter" ? action.config.responseCost : Math.round(action.config.responseCost * 0.55);
    if (profile.cash < responseCost) {
      return "INSUFFICIENT_CASH";
    }

    const shareResult = calculateMarketShare({
      currentShareBasisPoints: market.playerShareBasisPoints,
      competitorShareBasisPoints: market.competitorShareBasisPoints,
      industryHeat: market.industryHeat,
      reputation: profile.reputation,
      customerSatisfaction: profile.customerSatisfaction,
      monthlyIncome: profile.monthlyIncome,
      monthlyExpense: profile.monthlyExpense,
      actionShareDeltaBasisPoints:
        response === "counter"
          ? action.config.responseShareDeltaBasisPoints
          : Math.round(action.config.responseShareDeltaBasisPoints * 0.65)
    });
    const reputationImpact =
      response === "counter" ? action.config.responseReputationImpact : Math.round(action.config.responseReputationImpact * 0.45);
    const resultSummary =
      response === "counter"
        ? `${action.competitorName} 的攻势被正面反击，市场份额回升。`
        : `${action.competitorName} 的攻势被防守化解，经营压力下降。`;

    const result = await prisma.$transaction(async (tx) => {
      const updatedMarket = await tx.playerMarketState.update({
        where: { id: market.id },
        data: {
          playerShareBasisPoints: shareResult.playerShareBasisPoints,
          competitorShareBasisPoints: shareResult.competitorShareBasisPoints,
          pricePressure: { decrement: Math.min(market.pricePressure, response === "counter" ? 10 : 6) },
          talentPressure: { decrement: Math.min(market.talentPressure, response === "counter" ? 10 : 6) },
          reputationPressure: { decrement: Math.min(market.reputationPressure, response === "counter" ? 800 : 400) },
          resultSummary
        }
      });
      const updatedAction = await tx.playerCompetitorAction.update({
        where: { id: action.id },
        data: {
          status: "resolved",
          response,
          resultSummary,
          resolvedAt: new Date()
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { decrement: responseCost },
          reputation: { increment: reputationImpact },
          customerSatisfaction: { increment: response === "counter" ? 3 : 2 },
          riskStatus: "稳健"
        }
      });

      return { action: updatedAction, market: updatedMarket, profile: updatedProfile };
    });

    return {
      market: toPlayerMarketRecord(result.market),
      action: toCompetitorActionRecord(result.action),
      marketCenter: await toMarketCenterRecord(prisma, toProfileRecord(result.profile)),
      result: shareResult.resultSummary
    };
  },

  async getWallet(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    return toPlatformWalletRecord(prisma, toProfileRecord(profile));
  },

  async listInventory(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    return toInventoryCenterRecord(prisma, profile.id);
  },

  async useInventoryItem(accountId, serverId, itemId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    if (itemId !== "action-drink") {
      return "ITEM_NOT_USABLE";
    }

    const inventoryItem = await prisma.playerInventoryItem.findUnique({
      where: { profileId_itemId: { profileId: profile.id, itemId } },
      include: { item: true }
    });
    if (inventoryItem === null || inventoryItem.quantity <= 0) {
      return "ITEM_NOT_FOUND";
    }

    const updatedProfile = await prisma.$transaction(async (tx) => {
      const nextQuantity = inventoryItem.quantity - 1;
      await tx.playerInventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: nextQuantity }
      });
      await tx.playerItemLedger.create({
        data: {
          profileId: profile.id,
          itemId,
          changeQuantity: -1,
          balanceAfter: nextQuantity,
          source: "item_use",
          referenceId: inventoryItem.id,
          reason: "使用行动力饮料"
        }
      });
      return tx.playerProfile.update({
        where: { id: profile.id },
        data: { actionPower: { increment: 40 } }
      });
    });

    const inventory = await toInventoryCenterRecord(prisma, profile.id);
    return {
      item: {
        id: inventoryItem.id,
        itemId: inventoryItem.itemId,
        name: inventoryItem.item.name,
        category: inventoryItem.item.category,
        rarity: inventoryItem.item.rarity,
        icon: inventoryItem.item.icon,
        summary: inventoryItem.item.summary,
        usageHint: inventoryItem.item.usageHint,
        quantity: inventoryItem.quantity - 1,
        updatedAt: new Date().toISOString()
      },
      inventory,
      profile: toProfileRecord(updatedProfile),
      result: "行动力饮料已使用，行动力 +40。"
    };
  },

  async listShop(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    return toShopCenterRecord(prisma, toProfileRecord(profile));
  },

  async purchaseShopProduct(accountId, serverId, productId, requestId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const existingPurchase = await prisma.playerShopPurchase.findUnique({
      where: {
        profileId_requestId: {
          profileId: profile.id,
          requestId
        }
      },
      include: { product: { include: { rewardItem: true } } }
    });
    if (existingPurchase !== null) {
      const currentProfile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: profile.id } });
      const wallet = await toPlatformWalletRecord(prisma, toProfileRecord(currentProfile));
      return {
        wallet,
        product: toShopProductRecord(existingPurchase.product, wallet.balance, 1),
        purchase: {
          id: existingPurchase.id,
          productId: existingPurchase.productId,
          requestId: existingPurchase.requestId,
          pricePlatformCoins: existingPurchase.pricePlatformCoins,
          createdAt: existingPurchase.createdAt.toISOString()
        },
        profile: toProfileRecord(currentProfile),
        isDuplicate: true,
        result: "重复请求已识别，未重复扣除平台币。"
      };
    }

    const product = await prisma.shopProductConfig.findUnique({ where: { id: productId }, include: { rewardItem: true } });
    if (product === null || !product.isActive) {
      return "SHOP_PRODUCT_NOT_FOUND";
    }
    const purchaseLimitWindow =
      product.category === "daily_pack"
        ? {
            gte: new Date(`${today}T00:00:00.000Z`),
            lt: new Date(`${today}T23:59:59.999Z`)
          }
        : undefined;
    const purchaseCount = await prisma.playerShopPurchase.count({
      where: {
        profileId: profile.id,
        productId,
        createdAt: purchaseLimitWindow
      }
    });
    if (product.purchaseLimit > 0 && purchaseCount >= product.purchaseLimit) {
      return "PURCHASE_LIMIT_REACHED";
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.playerPlatformWallet.upsert({
        where: { profileId: profile.id },
        update: {},
        create: {
          profileId: profile.id,
          balance: profile.platformCoins,
          totalSpent: 0,
          vipExperience: VIP3_START_EXPERIENCE
        }
      });
      if (wallet.balance < product.pricePlatformCoins) {
        return "INSUFFICIENT_PLATFORM_COINS" as const;
      }

      const nextBalance = wallet.balance - product.pricePlatformCoins;
      const updatedWallet = await tx.playerPlatformWallet.update({
        where: { id: wallet.id },
        data: {
          balance: nextBalance,
          totalSpent: { increment: product.pricePlatformCoins },
          vipExperience: { increment: product.pricePlatformCoins }
        }
      });
      const purchase = await tx.playerShopPurchase.create({
        data: {
          profileId: profile.id,
          productId: product.id,
          requestId,
          pricePlatformCoins: product.pricePlatformCoins,
          rewardCash: product.rewardCash,
          rewardActionPower: product.rewardActionPower,
          rewardReputation: product.rewardReputation,
          createdAt: product.category === "daily_pack" ? new Date(`${today}T00:00:00.000Z`) : undefined
        }
      });
      await grantInventoryItem(
        tx,
        profile.id,
        product.rewardItemId,
        product.rewardItemQuantity,
        "shop_purchase",
        purchase.id,
        `购买商品：${product.name}`
      );
      await tx.platformCoinLedger.create({
        data: {
          profileId: profile.id,
          walletId: updatedWallet.id,
          changeAmount: -product.pricePlatformCoins,
          balanceAfter: nextBalance,
          source: "shop_purchase",
          referenceId: purchase.id,
          reason: `购买商品：${product.name}`
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          platformCoins: nextBalance,
          cash: { increment: product.rewardCash },
          actionPower: { increment: product.rewardActionPower },
          reputation: { increment: product.rewardReputation }
        }
      });

      return { wallet: updatedWallet, purchase, profile: updatedProfile };
    });
    if (result === "INSUFFICIENT_PLATFORM_COINS") {
      return result;
    }

    const ledgers = await prisma.platformCoinLedger.findMany({
      where: { profileId: profile.id },
      orderBy: [{ createdAt: "desc" }],
      take: 20
    });
    const nextPurchaseCount = purchaseCount + 1;

    return {
      wallet: toWalletRecord(result.wallet, ledgers),
      product: toShopProductRecord(product, result.wallet.balance, nextPurchaseCount),
      purchase: {
        id: result.purchase.id,
        productId: result.purchase.productId,
        requestId: result.purchase.requestId,
        pricePlatformCoins: result.purchase.pricePlatformCoins,
        createdAt: result.purchase.createdAt.toISOString()
      },
      profile: toProfileRecord(result.profile),
      isDuplicate: false,
      result: `${product.name} 已发货，平台币扣减和奖励发放已记录流水。`
    };
  },

  async adjustPlatformCoins(adminUserId, profileId, changeAmount, source, reason) {
    if (!isAdminPlatformCoinSource(source)) {
      return "INVALID_PLATFORM_COIN_SOURCE";
    }

    const profile = await prisma.playerProfile.findUnique({ where: { id: profileId } });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.playerPlatformWallet.upsert({
        where: { profileId },
        update: {},
        create: {
          profileId,
          balance: profile.platformCoins,
          totalSpent: 0,
          vipExperience: VIP3_START_EXPERIENCE
        }
      });
      const nextBalance = wallet.balance + changeAmount;
      if (nextBalance < 0) {
        return "INSUFFICIENT_PLATFORM_COINS" as const;
      }

      const updatedWallet = await tx.playerPlatformWallet.update({
        where: { id: wallet.id },
        data: {
          balance: nextBalance
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profileId },
        data: {
          platformCoins: nextBalance
        }
      });
      await tx.platformCoinLedger.create({
        data: {
          profileId,
          walletId: wallet.id,
          changeAmount,
          balanceAfter: nextBalance,
          source,
          reason,
          operatorAdminUserId: adminUserId
        }
      });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: source,
          targetType: "player_platform_wallet",
          targetId: profileId,
          detail: JSON.stringify({ changeAmount, balanceAfter: nextBalance, reason })
        }
      });

      return { wallet: updatedWallet, profile: updatedProfile, auditLogId: audit.id };
    });
    if (result === "INSUFFICIENT_PLATFORM_COINS") {
      return result;
    }

    const ledgers = await prisma.platformCoinLedger.findMany({
      where: { profileId },
      orderBy: [{ createdAt: "desc" }],
      take: 20
    });

    return {
      wallet: toWalletRecord(result.wallet, ledgers),
      profile: toProfileRecord(result.profile),
      auditLogId: result.auditLogId
    };
  },

  async reserveExternalPayment(accountId, serverId, productId, amountCents, platformCoins) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const order = await prisma.externalPaymentOrder.create({
      data: {
        profileId: profile.id,
        productId,
        provider: "reserved",
        amountCents,
        platformCoins,
        status: "reserved"
      }
    });

    return {
      id: order.id,
      profileId: order.profileId,
      productId: order.productId,
      provider: order.provider,
      amountCents: order.amountCents,
      platformCoins: order.platformCoins,
      status: order.status,
      createdAt: order.createdAt.toISOString()
    };
  },

  async getVipCenter(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    return toVipCenterRecord(prisma, toProfileRecord(profile), today);
  },

  async claimVipDailyGift(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const existing = await prisma.playerVipDailyGift.findUnique({
      where: {
        profileId_giftDate: {
          profileId: profile.id,
          giftDate: today
        }
      }
    });
    if (existing !== null) {
      return "VIP_DAILY_GIFT_ALREADY_CLAIMED";
    }

    const vipCenter = await toVipCenterRecord(prisma, toProfileRecord(profile), today);
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.playerPlatformWallet.upsert({
        where: { profileId: profile.id },
        update: {},
        create: {
          profileId: profile.id,
          balance: profile.platformCoins,
          totalSpent: 0,
          vipExperience: VIP3_START_EXPERIENCE
        }
      });
      const nextBalance = wallet.balance + vipCenter.dailyGift.rewardPlatformCoins;
      const updatedWallet = await tx.playerPlatformWallet.update({
        where: { id: wallet.id },
        data: {
          balance: nextBalance
        }
      });
      const gift = await tx.playerVipDailyGift.create({
        data: {
          profileId: profile.id,
          walletId: wallet.id,
          vipLevel: vipCenter.currentLevel.level,
          giftDate: today,
          rewardPlatformCoins: vipCenter.dailyGift.rewardPlatformCoins,
          rewardActionPower: vipCenter.dailyGift.rewardActionPower
        }
      });
      if (vipCenter.dailyGift.rewardPlatformCoins > 0) {
        await tx.platformCoinLedger.create({
          data: {
            profileId: profile.id,
            walletId: wallet.id,
            changeAmount: vipCenter.dailyGift.rewardPlatformCoins,
            balanceAfter: nextBalance,
            source: "system_compensation",
            referenceId: gift.id,
            reason: `领取 ${vipCenter.currentLevel.name} 每日礼包`
          }
        });
      }
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          platformCoins: nextBalance,
          actionPower: { increment: vipCenter.dailyGift.rewardActionPower },
          actionPowerLimit: Math.max(profile.actionPowerLimit, vipCenter.benefits.actionPowerLimit)
        }
      });

      return { wallet: updatedWallet, profile: updatedProfile };
    });

    return {
      vipCenter: await toVipCenterRecord(prisma, toProfileRecord(result.profile), today),
      profile: toProfileRecord(result.profile),
      result: `${vipCenter.currentLevel.name} 每日礼包已领取。`
    };
  },

  async adjustVipExperience(adminUserId, profileId, vipExperience, reason) {
    const profile = await prisma.playerProfile.findUnique({ where: { id: profileId } });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.playerPlatformWallet.upsert({
        where: { profileId },
        update: {
          vipExperience
        },
        create: {
          profileId,
          balance: profile.platformCoins,
          totalSpent: 0,
          vipExperience
        }
      });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin_vip_adjust",
          targetType: "player_vip",
          targetId: profileId,
          detail: JSON.stringify({ vipExperience, reason })
        }
      });

      return { wallet, auditLogId: audit.id };
    });
    void result.wallet;

    return {
      vipCenter: await toVipCenterRecord(prisma, toProfileRecord(profile), new Date().toISOString().slice(0, 10)),
      auditLogId: result.auditLogId
    };
  },

  async getAdminVipRecord(profileId, today) {
    const profile = await prisma.playerProfile.findUnique({ where: { id: profileId } });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    return toVipCenterRecord(prisma, toProfileRecord(profile), today);
  },

  async listVipLevelConfigs() {
    const levels = await prisma.vipLevelConfig.findMany({
      orderBy: [{ requiredExperience: "asc" }, { sortOrder: "asc" }]
    });

    return levels.map(toVipLevelRecord);
  },

  async upsertVipLevelConfig(adminUserId, config, reason) {
    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.vipLevelConfig.upsert({
        where: { level: config.level },
        update: config,
        create: config
      });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin_vip_config_upsert",
          targetType: "vip_level_config",
          targetId: String(config.level),
          detail: JSON.stringify({ config, reason })
        }
      });

      return { saved, auditLogId: audit.id };
    });

    return {
      config: toVipLevelRecord(result.saved),
      auditLogId: result.auditLogId
    };
  },

  async listAdminPlayers(keyword, _today) {
    const trimmedKeyword = keyword.trim();
    const where = trimmedKeyword === "" ? {} : {
      OR: [
        { founderName: { contains: trimmedKeyword } },
        { companyName: { contains: trimmedKeyword } },
        { account: { username: { contains: trimmedKeyword } } },
        { server: { name: { contains: trimmedKeyword } } }
      ]
    };
    const [profiles, vipLevels] = await Promise.all([
      prisma.playerProfile.findMany({
        where,
        include: {
          account: true,
          server: true,
          platformWallet: true,
          shopPurchases: true,
          paymentOrders: true,
          playerTitles: true,
          achievements: {
            where: { completedAt: { not: null } }
          },
          knowledgeUnlocks: true,
          guildMembership: {
            include: { guild: true }
          }
        },
        orderBy: [{ createdAt: "desc" }],
        take: 50
      }),
      prisma.vipLevelConfig.findMany({
        orderBy: [{ requiredExperience: "asc" }, { sortOrder: "asc" }]
      })
    ]);
    const levelRecords = vipLevels.map(toVipLevelRecord);

    return {
      rows: profiles.map((profile) => {
        const walletBalance = profile.platformWallet?.balance ?? profile.platformCoins;
        const vipExperience = profile.platformWallet?.vipExperience ?? 0;
        const { currentLevel } = resolveVipLevels(levelRecords, vipExperience);
        return {
          profileId: profile.id,
          accountId: profile.accountId,
          username: profile.account.username,
          serverId: profile.serverId,
          serverName: profile.server.name,
          founderName: profile.founderName,
          companyName: profile.companyName,
          cash: profile.cash,
          monthlyIncome: profile.monthlyIncome,
          monthlyExpense: profile.monthlyExpense,
          netCashFlow: profile.monthlyIncome - profile.monthlyExpense,
          valuation: profile.valuation,
          totalDebt: profile.totalDebt,
          riskStatus: profile.riskStatus,
          profileStatus: profile.status,
          walletBalance,
          vipExperience,
          vipLevel: currentLevel.level,
          purchaseCount: profile.shopPurchases.length,
          paymentOrderCount: profile.paymentOrders.length,
          titleCount: profile.playerTitles.length,
          achievementCompletedCount: profile.achievements.length,
          knowledgeUnlockCount: profile.knowledgeUnlocks.length,
          guildName: profile.guildMembership?.guild.name ?? null,
          createdAt: profile.createdAt.toISOString()
        };
      })
    };
  },

  async getAdminConfigCenter() {
    const [titles, achievements, knowledgeEntries, shopProducts, leaderboardSnapshots, mailCompensations, seasons, activities, scenarios] = await Promise.all([
      prisma.titleConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.achievementConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.knowledgeEntry.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 100 }),
      prisma.shopProductConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.leaderboardSnapshot.findMany({ orderBy: [{ createdAt: "desc" }], take: 20 }),
      prisma.adminMailCompensation.findMany({ orderBy: [{ createdAt: "desc" }], take: 20 }),
      prisma.seasonConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.activityConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.scenarioConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] })
    ]);

    return {
      titles: titles.map((title) => ({
        id: title.id,
        name: title.name,
        category: title.category,
        source: title.source,
        bonusLabel: title.bonusLabel,
        durationDays: title.durationDays
      })),
      achievements: achievements.map((achievement) => ({
        id: achievement.id,
        name: achievement.name,
        category: achievement.category,
        conditionKind: achievement.conditionKind,
        conditionValue: achievement.conditionValue,
        rewardPlatformCoins: achievement.rewardPlatformCoins,
        rewardCash: achievement.rewardCash
      })),
      knowledgeEntries: knowledgeEntries.map((knowledge) => ({
        id: knowledge.id,
        title: knowledge.title,
        sourceUrl: knowledge.sourceUrl,
        collectedAt: knowledge.collectedAt,
        contentVersion: knowledge.contentVersion,
        auditStatus: "已发布"
      })),
      shopProducts: shopProducts.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        pricePlatformCoins: product.pricePlatformCoins,
        purchaseLimit: product.purchaseLimit,
        isActive: product.isActive
      })),
      leaderboardSnapshots: leaderboardSnapshots.map((snapshot) => ({
        id: snapshot.id,
        serverId: snapshot.serverId,
        boardName: snapshot.boardName,
        snapshotDate: snapshot.snapshotDate,
        createdAt: snapshot.createdAt.toISOString()
      })),
      mailCompensations: mailCompensations.map((mail) => ({
        id: mail.id,
        profileId: mail.profileId,
        subject: mail.subject,
        platformCoins: mail.platformCoins,
        reason: mail.reason,
        createdAt: mail.createdAt.toISOString()
      })),
      seasons: seasons.map((season) => ({
        id: season.id,
        name: season.name,
        status: readSeasonStatus(season.startDate, season.endDate, new Date().toISOString().slice(0, 10)),
        startDate: season.startDate,
        endDate: season.endDate
      })),
      activities: activities.map((activity) => ({
        id: activity.id,
        name: activity.name,
        status: readSeasonStatus(activity.startDate, activity.endDate, new Date().toISOString().slice(0, 10)),
        leaderboardKey: activity.leaderboardKey
      })),
      scenarios: scenarios.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        rewardTitleId: scenario.rewardTitleId
      }))
    };
  },

  async listAdminAuditLogs() {
    const logs = await prisma.adminAuditLog.findMany({
      include: { adminUser: true },
      orderBy: [{ createdAt: "desc" }],
      take: 50
    });

    return logs.map((log) => ({
      id: log.id,
      adminUsername: log.adminUser.username,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      detail: log.detail,
      createdAt: log.createdAt.toISOString()
    }));
  },

  async listAdminKnowledgeEntries(filters) {
    const where: Prisma.KnowledgeEntryWhereInput = {};
    if (filters.keyword !== "") {
      where.OR = [
        { id: { contains: filters.keyword } },
        { title: { contains: filters.keyword } },
        { summary: { contains: filters.keyword } }
      ];
    }
    if (filters.category !== "") {
      where.category = { name: filters.category };
    }
    if (filters.reviewStatus !== "") {
      where.reviewStatus = filters.reviewStatus;
    }

    const [rows, total, categories] = await Promise.all([
      prisma.knowledgeEntry.findMany({
        where,
        include: { category: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        take: 100
      }),
      prisma.knowledgeEntry.count({ where }),
      prisma.knowledgeCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] })
    ]);

    return {
      rows: rows.map(toAdminKnowledgeEntryRecord),
      total,
      categories: categories.map((category) => ({ id: category.id, name: category.name }))
    };
  },

  async updateAdminKnowledgeEntry(adminUserId, knowledgeId, input) {
    const existing = await prisma.knowledgeEntry.findUnique({
      where: { id: knowledgeId }
    });
    if (existing === null) {
      return "KNOWLEDGE_NOT_FOUND";
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.knowledgeEntry.update({
        where: { id: knowledgeId },
        data: {
          summary: input.summary,
          scenarioText: input.scenarioText,
          riskText: input.riskText,
          gameImpactText: input.gameImpactText,
          actionTipText: input.actionTipText,
          sourceName: input.sourceName,
          sourceUrl: input.sourceUrl,
          collectedAt: input.collectedAt,
          contentVersion: input.contentVersion,
          reviewStatus: input.reviewStatus
        },
        include: { category: true }
      });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin_knowledge_update",
          targetType: "knowledge_entry",
          targetId: knowledgeId,
          detail: input.reason
        }
      });
      return { updated, audit };
    });

    return {
      ...toAdminKnowledgeEntryRecord(result.updated),
      auditLogId: result.audit.id
    };
  },

  async grantAdminTitle(adminUserId, profileId, titleId, reason) {
    const [profile, config] = await Promise.all([
      prisma.playerProfile.findUnique({ where: { id: profileId } }),
      prisma.titleConfig.findUnique({ where: { id: titleId } })
    ]);
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    if (config === null) {
      return "TITLE_NOT_FOUND";
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      await tx.playerTitle.upsert({
        where: { profileId_titleId: { profileId, titleId } },
        update: {},
        create: {
          profileId,
          titleId,
          source: "admin",
          expiresAt: config.durationDays > 0 ? addDays(now, config.durationDays) : null
        }
      });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin_title_grant",
          targetType: "player_title",
          targetId: profileId,
          detail: JSON.stringify({ titleId, reason })
        }
      });

      return { auditLogId: audit.id };
    });
    const center = await toTitleCenterRecord(prisma, profileId, now.toISOString().slice(0, 10));
    const title = center.titles.find((item) => item.id === titleId);
    if (title === undefined) {
      return "TITLE_NOT_FOUND";
    }

    return { title, auditLogId: result.auditLogId };
  },

  async revokeAdminTitle(adminUserId, profileId, titleId, reason) {
    const [profile, title] = await Promise.all([
      prisma.playerProfile.findUnique({ where: { id: profileId } }),
      prisma.playerTitle.findUnique({ where: { profileId_titleId: { profileId, titleId } } })
    ]);
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    if (title === null) {
      return "TITLE_NOT_FOUND";
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.playerTitleEquipment.deleteMany({ where: { profileId, titleId } });
      await tx.playerTitle.delete({ where: { profileId_titleId: { profileId, titleId } } });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin_title_revoke",
          targetType: "player_title",
          targetId: profileId,
          detail: JSON.stringify({ titleId, reason })
        }
      });

      return { auditLogId: audit.id };
    });

    return result;
  },

  async sendAdminMailCompensation(adminUserId, profileId, subject, body, platformCoins, reason) {
    const profile = await prisma.playerProfile.findUnique({ where: { id: profileId } });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.playerPlatformWallet.upsert({
        where: { profileId },
        update: {},
        create: {
          profileId,
          balance: profile.platformCoins,
          totalSpent: 0,
          vipExperience: VIP3_START_EXPERIENCE
        }
      });
      const nextBalance = wallet.balance + platformCoins;
      if (nextBalance < 0) {
        return "INSUFFICIENT_PLATFORM_COINS" as const;
      }
      const mail = await tx.adminMailCompensation.create({
        data: {
          profileId,
          adminUserId,
          subject,
          body,
          platformCoins,
          reason
        }
      });
      const updatedWallet = await tx.playerPlatformWallet.update({
        where: { id: wallet.id },
        data: { balance: nextBalance }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profileId },
        data: { platformCoins: nextBalance, unreadMailCount: { increment: 1 } }
      });
      if (platformCoins !== 0) {
        await tx.platformCoinLedger.create({
          data: {
            profileId,
            walletId: wallet.id,
            changeAmount: platformCoins,
            balanceAfter: nextBalance,
            source: "system_compensation",
            referenceId: mail.id,
            reason: subject,
            operatorAdminUserId: adminUserId
          }
        });
      }
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin_mail_compensation",
          targetType: "admin_mail_compensation",
          targetId: mail.id,
          detail: JSON.stringify({ profileId, subject, platformCoins, reason })
        }
      });

      return { mail, wallet: updatedWallet, profile: updatedProfile, auditLogId: audit.id };
    });
    if (result === "INSUFFICIENT_PLATFORM_COINS") {
      return result;
    }
    const ledgers = await prisma.platformCoinLedger.findMany({
      where: { profileId },
      orderBy: [{ createdAt: "desc" }],
      take: 20
    });

    return {
      profile: toProfileRecord(result.profile),
      wallet: toWalletRecord(result.wallet, ledgers),
      auditLogId: result.auditLogId,
      mailId: result.mail.id
    };
  },

  async updateAdminProfileStatus(adminUserId, profileId, status, reason) {
    const profile = await prisma.playerProfile.findUnique({ where: { id: profileId } });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.playerProfile.update({
        where: { id: profileId },
        data: { status }
      });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: status === "banned" ? "admin_player_ban" : "admin_player_unban",
          targetType: "player_profile",
          targetId: profileId,
          detail: JSON.stringify({ status, reason })
        }
      });

      return { updated, auditLogId: audit.id };
    });

    return {
      profileId: result.updated.id,
      status: result.updated.status,
      auditLogId: result.auditLogId
    };
  },

  async settleAdminLeaderboards(adminUserId, serverId, today, reason) {
    const profile = await prisma.playerProfile.findFirst({ where: { serverId }, orderBy: { createdAt: "asc" } });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const settlement = await this.settleLeaderboardRewards(profile.accountId, serverId, today);
    if (settlement === "PLAYER_NOT_FOUND") {
      return settlement;
    }
    const audit = await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: "admin_leaderboard_settle",
        targetType: "leaderboard",
        targetId: serverId,
        detail: JSON.stringify({ serverId, today, reason, deliveredRewards: settlement.deliveredRewards })
      }
    });

    return { ...settlement, auditLogId: audit.id };
  },

  async listAdminCrossServerGroups() {
    const groups = await prisma.crossServerGroup.findMany({
      include: {
        servers: { orderBy: { sortOrder: "asc" } }
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });

    return {
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        ruleLabel: group.ruleLabel,
        serverIds: group.servers.map((server) => server.serverId),
        isActive: group.isActive
      }))
    };
  },

  async assignAdminCrossServerGroup(adminUserId, serverId, groupId, reason) {
    const [server, group] = await Promise.all([
      prisma.gameServer.findUnique({ where: { id: serverId } }),
      prisma.crossServerGroup.findUnique({ where: { id: groupId } })
    ]);
    if (server === null) {
      return "SERVER_NOT_FOUND";
    }
    if (group === null) {
      return "CROSS_SERVER_GROUP_NOT_FOUND";
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.crossServerGroupServer.upsert({
        where: { serverId },
        update: { groupId },
        create: { groupId, serverId }
      });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin_cross_server_group_assign",
          targetType: "cross_server_group",
          targetId: groupId,
          detail: JSON.stringify({ serverId, groupId, reason })
        }
      });
      const savedGroup = await tx.crossServerGroup.findUnique({
        where: { id: groupId },
        include: { servers: { orderBy: { sortOrder: "asc" } } }
      });

      return { savedGroup, auditLogId: audit.id };
    });
    if (result.savedGroup === null) {
      return "CROSS_SERVER_GROUP_NOT_FOUND";
    }

    return {
      group: {
        id: result.savedGroup.id,
        name: result.savedGroup.name,
        ruleLabel: result.savedGroup.ruleLabel,
        serverIds: result.savedGroup.servers.map((item) => item.serverId),
        isActive: result.savedGroup.isActive
      },
      auditLogId: result.auditLogId
    };
  },

  async getSeasonCenter(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({ where: { accountId_serverId: { accountId, serverId } } });
    return profile === null ? "PLAYER_NOT_FOUND" : toSeasonCenterRecord(prisma, toProfileRecord(profile), today);
  },

  async progressSeasonTask(accountId, serverId, taskId, today) {
    const profile = await prisma.playerProfile.findUnique({ where: { accountId_serverId: { accountId, serverId } } });
    if (profile === null) return "PLAYER_NOT_FOUND";
    const season = await prisma.seasonConfig.findFirst({ orderBy: [{ sortOrder: "asc" }, { startDate: "asc" }] });
    if (season === null) return "SEASON_NOT_FOUND";
    if (readSeasonStatus(season.startDate, season.endDate, today) !== "active") return "SEASON_NOT_ACTIVE";
    const task = await prisma.seasonTaskConfig.findUnique({ where: { id: taskId }, include: { rewardItem: true } });
    if (task === null || task.seasonId !== season.id) return "SEASON_TASK_NOT_FOUND";

    await prisma.$transaction(async (tx) => {
      const state = await tx.playerSeasonTaskProgress.upsert({
        where: { profileId_taskId: { profileId: profile.id, taskId } },
        update: { progress: { increment: 1 } },
        create: { profileId: profile.id, taskId, progress: 1 }
      });
      if (state.claimedAt === null && state.progress + 1 >= task.target) {
        await tx.playerSeasonTaskProgress.update({ where: { id: state.id }, data: { progress: task.target, claimedAt: new Date() } });
        await tx.playerSeasonProgress.upsert({
          where: { profileId_seasonId: { profileId: profile.id, seasonId: season.id } },
          update: { points: { increment: task.rewardPoints } },
          create: { profileId: profile.id, seasonId: season.id, points: task.rewardPoints }
        });
        await grantInventoryItem(
          tx,
          profile.id,
          task.rewardItemId,
          task.rewardItemQuantity,
          "season_task",
          state.id,
          `完成赛季任务：${task.title}`
        );
      }
    });

    const center = await toSeasonCenterRecord(prisma, toProfileRecord(profile), today);
    if (center === "SEASON_NOT_FOUND") return center;
    const taskRecord = center.tasks.find((item) => item.id === taskId);
    return taskRecord === undefined ? "SEASON_TASK_NOT_FOUND" : { season: center.season, task: taskRecord };
  },

  async purchaseSeasonPass(accountId, serverId, seasonId, requestId, today) {
    const profile = await prisma.playerProfile.findUnique({ where: { accountId_serverId: { accountId, serverId } } });
    if (profile === null) return "PLAYER_NOT_FOUND";
    const season = await prisma.seasonConfig.findUnique({ where: { id: seasonId } });
    if (season === null) return "SEASON_NOT_FOUND";
    if (readSeasonStatus(season.startDate, season.endDate, today) !== "active") return "SEASON_NOT_ACTIVE";

    const existing = await prisma.playerSeasonPassPurchase.findUnique({ where: { profileId_requestId: { profileId: profile.id, requestId } } });
    if (existing !== null) {
      const currentProfile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: profile.id } });
      const center = await toSeasonCenterRecord(prisma, toProfileRecord(currentProfile), today);
      return center === "SEASON_NOT_FOUND" ? center : { season: center.season, wallet: await toPlatformWalletRecord(prisma, toProfileRecord(currentProfile)), isDuplicate: true };
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.playerPlatformWallet.upsert({
        where: { profileId: profile.id },
        update: {},
        create: { profileId: profile.id, balance: profile.platformCoins, totalSpent: 0, vipExperience: VIP3_START_EXPERIENCE }
      });
      if (wallet.balance < season.passPricePlatformCoins) return "INSUFFICIENT_PLATFORM_COINS" as const;
      const nextBalance = wallet.balance - season.passPricePlatformCoins;
      const updatedWallet = await tx.playerPlatformWallet.update({
        where: { id: wallet.id },
        data: { balance: nextBalance, totalSpent: { increment: season.passPricePlatformCoins }, vipExperience: { increment: season.passPricePlatformCoins } }
      });
      const purchase = await tx.playerSeasonPassPurchase.create({ data: { profileId: profile.id, seasonId: season.id, requestId, pricePlatformCoins: season.passPricePlatformCoins } });
      await grantInventoryItem(tx, profile.id, "season-exp-ticket", 3, "season_pass_purchase", purchase.id, `开通通行证：${season.name}`);
      await grantInventoryItem(tx, profile.id, "founder-title-shard", 2, "season_pass_purchase", purchase.id, `开通通行证：${season.name}`);
      await grantInventoryItem(tx, profile.id, "office-skin-ticket", 1, "season_pass_purchase", purchase.id, `开通通行证：${season.name}`);
      await tx.platformCoinLedger.create({
        data: { profileId: profile.id, walletId: wallet.id, changeAmount: -season.passPricePlatformCoins, balanceAfter: nextBalance, source: "season_pass_purchase", referenceId: purchase.id, reason: `购买赛季通行证：${season.name}` }
      });
      await tx.playerProfile.update({ where: { id: profile.id }, data: { platformCoins: nextBalance } });
      return updatedWallet;
    });
    if (result === "INSUFFICIENT_PLATFORM_COINS") return result;
    const currentProfile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: profile.id } });
    const center = await toSeasonCenterRecord(prisma, toProfileRecord(currentProfile), today);
    return center === "SEASON_NOT_FOUND" ? center : { season: center.season, wallet: await toPlatformWalletRecord(prisma, toProfileRecord(currentProfile)), isDuplicate: false };
  },

  async joinActivity(accountId, serverId, activityId, today) {
    const profile = await prisma.playerProfile.findUnique({ where: { accountId_serverId: { accountId, serverId } } });
    if (profile === null) return "PLAYER_NOT_FOUND";
    const activity = await prisma.activityConfig.findUnique({ where: { id: activityId } });
    if (activity === null) return "ACTIVITY_NOT_FOUND";
    if (readSeasonStatus(activity.startDate, activity.endDate, today) !== "active") return "ACTIVITY_NOT_ACTIVE";
    await prisma.playerActivityState.upsert({
      where: { profileId_activityId: { profileId: profile.id, activityId } },
      update: { isJoined: true },
      create: { profileId: profile.id, activityId, isJoined: true, score: 0 }
    });
    const center = await toSeasonCenterRecord(prisma, toProfileRecord(profile), today);
    return center === "SEASON_NOT_FOUND" ? "ACTIVITY_NOT_FOUND" : { season: center.season, activity: center.activities.find((item) => item.id === activityId)!, profile: toProfileRecord(profile) };
  },

  async progressActivity(accountId, serverId, activityId, scoreDelta, today) {
    const profile = await prisma.playerProfile.findUnique({ where: { accountId_serverId: { accountId, serverId } } });
    if (profile === null) return "PLAYER_NOT_FOUND";
    const activity = await prisma.activityConfig.findUnique({ where: { id: activityId } });
    if (activity === null) return "ACTIVITY_NOT_FOUND";
    if (readSeasonStatus(activity.startDate, activity.endDate, today) !== "active") return "ACTIVITY_NOT_ACTIVE";
    const state = await prisma.playerActivityState.findUnique({ where: { profileId_activityId: { profileId: profile.id, activityId } } });
    if (state === null || !state.isJoined) return "ACTIVITY_NOT_JOINED";
    await prisma.$transaction([
      prisma.playerActivityState.update({ where: { id: state.id }, data: { score: { increment: scoreDelta } } }),
      prisma.playerSeasonProgress.upsert({
        where: { profileId_seasonId: { profileId: profile.id, seasonId: activity.seasonId } },
        update: { points: { increment: scoreDelta } },
        create: { profileId: profile.id, seasonId: activity.seasonId, points: scoreDelta }
      })
    ]);
    const center = await toSeasonCenterRecord(prisma, toProfileRecord(profile), today);
    return center === "SEASON_NOT_FOUND" ? "ACTIVITY_NOT_FOUND" : { season: center.season, activity: center.activities.find((item) => item.id === activityId)!, profile: toProfileRecord(profile) };
  },

  async claimActivityReward(accountId, serverId, activityId, today) {
    const profile = await prisma.playerProfile.findUnique({ where: { accountId_serverId: { accountId, serverId } } });
    if (profile === null) return "PLAYER_NOT_FOUND";
    const activity = await prisma.activityConfig.findUnique({ where: { id: activityId } });
    if (activity === null) return "ACTIVITY_NOT_FOUND";
    if (readSeasonStatus(activity.startDate, activity.endDate, today) !== "active") return "ACTIVITY_NOT_ACTIVE";
    const state = await prisma.playerActivityState.findUnique({ where: { profileId_activityId: { profileId: profile.id, activityId } } });
    if (state === null || !state.isJoined) return "ACTIVITY_NOT_JOINED";
    if (state.score < activity.targetScore) return "ACTIVITY_INCOMPLETE";
    if (state.rewardClaimedAt !== null) return "ACTIVITY_REWARD_ALREADY_CLAIMED";
    const updatedProfile = await prisma.$transaction(async (tx) => {
      await tx.playerActivityState.update({ where: { id: state.id }, data: { rewardClaimedAt: new Date() } });
      await tx.playerSeasonProgress.upsert({
        where: { profileId_seasonId: { profileId: profile.id, seasonId: activity.seasonId } },
        update: { points: { increment: activity.rewardPoints } },
        create: { profileId: profile.id, seasonId: activity.seasonId, points: activity.rewardPoints }
      });
      if (activity.rewardTitleId !== null) {
        await tx.playerTitle.upsert({ where: { profileId_titleId: { profileId: profile.id, titleId: activity.rewardTitleId } }, update: {}, create: { profileId: profile.id, titleId: activity.rewardTitleId, source: "season" } });
      }
      await completeAchievement(tx as PrismaClient, profile.id, "season-ai-agent-growth", 1);
      return tx.playerProfile.update({ where: { id: profile.id }, data: { cash: { increment: activity.rewardCash }, reputation: { increment: activity.rewardReputation } } });
    });
    const center = await toSeasonCenterRecord(prisma, toProfileRecord(updatedProfile), today);
    return center === "SEASON_NOT_FOUND" ? "ACTIVITY_NOT_FOUND" : { season: center.season, activity: center.activities.find((item) => item.id === activityId)!, profile: toProfileRecord(updatedProfile) };
  },

  async purchaseActivityShopItem(accountId, serverId, itemId, requestId, today) {
    const profile = await prisma.playerProfile.findUnique({ where: { accountId_serverId: { accountId, serverId } } });
    if (profile === null) return "PLAYER_NOT_FOUND";
    const existing = await prisma.playerActivityShopPurchase.findUnique({ where: { profileId_requestId: { profileId: profile.id, requestId } } });
    if (existing !== null) {
      const center = await toSeasonCenterRecord(prisma, toProfileRecord(profile), today);
      return center === "SEASON_NOT_FOUND" ? center : { season: center.season, wallet: await toPlatformWalletRecord(prisma, toProfileRecord(profile)), item: center.shopItems.find((item) => item.id === existing.itemId)!, profile: toProfileRecord(profile), isDuplicate: true };
    }
    const item = await prisma.activityShopItemConfig.findUnique({ where: { id: itemId }, include: { rewardItem: true } });
    if (item === null || !item.isActive) return "ACTIVITY_SHOP_ITEM_NOT_FOUND";
    const progress = await prisma.playerSeasonProgress.findUnique({ where: { profileId_seasonId: { profileId: profile.id, seasonId: item.seasonId } } });
    if (progress === null || progress.points < item.costPoints) return "INSUFFICIENT_ACTIVITY_POINTS";
    const count = await prisma.playerActivityShopPurchase.count({ where: { profileId: profile.id, itemId } });
    if (item.purchaseLimit > 0 && count >= item.purchaseLimit) return "PURCHASE_LIMIT_REACHED";
    const updatedProfile = await prisma.$transaction(async (tx) => {
      await tx.playerSeasonProgress.update({ where: { id: progress.id }, data: { points: { decrement: item.costPoints } } });
      const purchase = await tx.playerActivityShopPurchase.create({ data: { profileId: profile.id, itemId, requestId, costPoints: item.costPoints } });
      await grantInventoryItem(
        tx,
        profile.id,
        item.rewardItemId,
        item.rewardItemQuantity,
        "activity_shop",
        purchase.id,
        `活动商店兑换：${item.name}`
      );
      return tx.playerProfile.update({ where: { id: profile.id }, data: { actionPower: { increment: item.rewardActionPower }, reputation: { increment: item.rewardReputation } } });
    });
    const center = await toSeasonCenterRecord(prisma, toProfileRecord(updatedProfile), today);
    return center === "SEASON_NOT_FOUND" ? center : { season: center.season, wallet: await toPlatformWalletRecord(prisma, toProfileRecord(updatedProfile)), item: center.shopItems.find((entry) => entry.id === itemId)!, profile: toProfileRecord(updatedProfile), isDuplicate: false };
  },

  async startScenario(accountId, serverId, scenarioId) {
    const profile = await prisma.playerProfile.findUnique({ where: { accountId_serverId: { accountId, serverId } } });
    if (profile === null) return "PLAYER_NOT_FOUND";
    const scenario = await prisma.scenarioConfig.findUnique({ where: { id: scenarioId } });
    if (scenario === null) return "SCENARIO_NOT_FOUND";
    return toScenarioRunRecord(await prisma.playerScenarioRun.create({ data: { profileId: profile.id, scenarioId, initialStateJson: scenario.initialStateJson } }));
  },

  async settleScenario(accountId, serverId, runId, choices) {
    const profile = await prisma.playerProfile.findUnique({ where: { accountId_serverId: { accountId, serverId } } });
    if (profile === null) return "PLAYER_NOT_FOUND";
    const run = await prisma.playerScenarioRun.findUnique({ where: { id: runId }, include: { scenario: true } });
    if (run === null || run.profileId !== profile.id) return "SCENARIO_RUN_NOT_FOUND";
    if (run.score !== null) return toScenarioRunRecord(run);
    const score = scoreScenarioChoices(choices);
    const updated = await prisma.$transaction(async (tx) => {
      const nextRun = await tx.playerScenarioRun.update({ where: { id: run.id }, data: { choicesJson: JSON.stringify(choices), score: score.score, grade: score.grade, rewardClaimedAt: new Date(), settledAt: new Date() } });
      if (run.scenario.rewardTitleId !== null) {
        await tx.playerTitle.upsert({ where: { profileId_titleId: { profileId: profile.id, titleId: run.scenario.rewardTitleId } }, update: {}, create: { profileId: profile.id, titleId: run.scenario.rewardTitleId, source: "scenario" } });
      }
      await tx.playerProfile.update({ where: { id: profile.id }, data: { cash: { increment: run.scenario.rewardCash }, reputation: { increment: run.scenario.rewardReputation } } });
      return nextRun;
    });
    return toScenarioRunRecord(updated);
  },

  async getLeaderboards(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const profiles = await prisma.playerProfile.findMany({
      where: { serverId },
      include: {
        products: true,
        guildMembership: true,
        titleEquipment: true,
        playerTitles: { include: { title: true } }
      }
    });

    const boards = await Promise.all(leaderboardConfigs.map(async (config) => {
      const rows = profiles
        .map((item) => {
          const productGrowth = item.products.reduce((total, product) => total + product.users + product.monthlyRevenue, 0);
          const value =
            config.key === "company-value"
              ? item.valuation
              : config.key === "cashflow"
                ? item.monthlyIncome - item.monthlyExpense
                : config.key === "product-growth"
                  ? productGrowth
                  : item.guildMembership?.contributionScore ?? 0;
          const equipped = item.playerTitles.find((title) => title.titleId === item.titleEquipment?.titleId);
          return {
            rank: 0,
            profileId: item.id,
            founderName: item.founderName,
            companyName: item.companyName,
            value,
            valueLabel: formatLeaderboardValue(config.key, value),
            equippedTitle: equipped?.title.name ?? null
          };
        })
        .sort((left, right) => right.value - left.value)
        .slice(0, 20)
        .map((row, index) => ({ ...row, rank: index + 1 }));

      await prisma.leaderboardSnapshot.upsert({
        where: {
          serverId_boardKey_snapshotDate: {
            serverId,
            boardKey: config.key,
            snapshotDate: today
          }
        },
        update: {
          entriesJson: JSON.stringify(rows)
        },
        create: {
          serverId,
          boardKey: config.key,
          boardName: config.name,
          snapshotDate: today,
          entriesJson: JSON.stringify(rows)
        }
      });

      return {
        key: config.key,
        name: config.name,
        scope: "server" as const,
        isActive: true,
        rows,
        snapshotDate: today
      };
    }));

    return {
      boards,
      activityBoards: []
    };
  },

  async settleLeaderboardRewards(accountId, serverId, today) {
    const leaderboard = await this.getLeaderboards(accountId, serverId, today);
    if (leaderboard === "PLAYER_NOT_FOUND") {
      return "PLAYER_NOT_FOUND";
    }

    let deliveredRewards = 0;
    for (const board of leaderboard.boards) {
      for (const row of board.rows.slice(0, 3)) {
        const rewardPlatformCoins = row.rank === 1 ? 120 : row.rank === 2 ? 80 : 40;
        const rewardTitleId = board.key === "company-value" && row.rank === 1 ? "server-richest" : null;
        const existing = await prisma.leaderboardRewardDelivery.findUnique({
          where: {
            profileId_boardKey_snapshotDate: {
              profileId: row.profileId,
              boardKey: board.key,
              snapshotDate: today
            }
          }
        });
        if (existing === null) {
          await prisma.leaderboardRewardDelivery.create({
            data: {
              profileId: row.profileId,
              serverId,
              boardKey: board.key,
              snapshotDate: today,
              rank: row.rank,
              rewardPlatformCoins,
              rewardTitleId,
              mailSubject: `${board.name} 第 ${row.rank} 名奖励`,
              mailBody: "排行榜奖励已通过邮件发放，本邮件记录用于防止重复发奖。"
            }
          });
          deliveredRewards += 1;
        }
        if (rewardTitleId !== null) {
          await grantTitle(prisma, row.profileId, rewardTitleId, "leaderboard", new Date(`${today}T00:00:00.000Z`));
        }
      }
    }

    return {
      leaderboard,
      deliveredRewards
    };
  },

  async getCrossServerCenter(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const groupServer = await prisma.crossServerGroupServer.findUnique({
      where: { serverId },
      include: {
        group: {
          include: {
            servers: { orderBy: { sortOrder: "asc" } }
          }
        }
      }
    });
    if (groupServer === null || !groupServer.group.isActive) {
      return "CROSS_SERVER_GROUP_NOT_FOUND";
    }

    const serverIds = groupServer.group.servers.map((item) => item.serverId);
    const dayStart = new Date(`${today}T00:00:00.000Z`);
    const dayEnd = new Date(`${today}T23:59:59.999Z`);
    const [profiles, signup, guildMember, guildSignups] = await Promise.all([
      prisma.playerProfile.findMany({
        where: { serverId: { in: serverIds } },
        include: {
          guildMembership: true,
          titleEquipment: true,
          playerTitles: { include: { title: true } }
        }
      }),
      prisma.crossServerSignup.findUnique({
        where: {
          profileId_groupId: {
            profileId: profile.id,
            groupId: groupServer.groupId
          }
        }
      }),
      prisma.guildMember.findUnique({
        where: { profileId: profile.id },
        include: { guild: true }
      }),
      prisma.crossServerGuildSignup.findMany({
        where: { groupId: groupServer.groupId, status: "active" },
        include: {
          guild: {
            include: {
              members: { include: { profile: true } }
            }
          }
        }
      })
    ]);

    const boards = await Promise.all(crossServerLeaderboardConfigs.map(async (config) => {
      const rows = profiles
        .map((item) => {
          const value = config.key === "cross-guild" ? item.guildMembership?.contributionScore ?? 0 : item.valuation;
          const equipped = item.playerTitles.find((title) => title.titleId === item.titleEquipment?.titleId);
          return {
            rank: 0,
            profileId: item.id,
            founderName: item.founderName,
            companyName: item.companyName,
            value,
            valueLabel: formatLeaderboardValue(config.key, value),
            equippedTitle: equipped?.title.name ?? null
          };
        })
        .sort((left, right) => right.value - left.value)
        .slice(0, 20)
        .map((row, index) => ({ ...row, rank: index + 1 }));

      await prisma.leaderboardSnapshot.upsert({
        where: {
          serverId_boardKey_snapshotDate: {
            serverId: groupServer.groupId,
            boardKey: config.key,
            snapshotDate: today
          }
        },
        update: {
          entriesJson: JSON.stringify(rows)
        },
        create: {
          serverId: groupServer.groupId,
          boardKey: config.key,
          boardName: config.name,
          snapshotDate: today,
          entriesJson: JSON.stringify(rows)
        }
      });

      return {
        key: config.key,
        name: config.name,
        scope: "cross" as const,
        isActive: true,
        rows,
        snapshotDate: today
      };
    }));
    const guildRows = guildSignups
      .map((signupRow) => {
        const leader = signupRow.guild.members.find((item) => item.role === "leader") ?? signupRow.guild.members[0];
        return {
          rank: 0,
          guildId: signupRow.guildId,
          guildName: signupRow.guild.name,
          serverId: signupRow.serverId,
          leaderProfileId: leader?.profileId ?? "",
          leaderFounderName: leader?.profile.founderName ?? "",
          memberCount: signupRow.guild.members.length,
          value: signupRow.guild.contributionScore,
          valueLabel: formatLeaderboardValue("cross-guild", signupRow.guild.contributionScore)
        };
      })
      .filter((row) => row.leaderProfileId !== "")
      .sort((left, right) => right.value - left.value)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    const memberCount = guildMember === null ? 0 : await prisma.guildMember.count({ where: { guildId: guildMember.guildId } });
    const todayActiveMemberCount = guildMember === null ? 0 : (await prisma.guildActivityLog.findMany({
      where: { guildId: guildMember.guildId, createdAt: { gte: dayStart, lte: dayEnd } },
      distinct: ["profileId"],
      select: { profileId: true }
    })).length;
    const guildSignup = guildMember === null ? null : guildSignups.find((item) => item.guildId === guildMember.guildId) ?? null;
    const isManager = guildMember?.role === "leader" || guildMember?.role === "vice_leader";
    const meetsRequirements =
      memberCount >= crossServerGuildSeasonRequirements.minMembers &&
      todayActiveMemberCount >= crossServerGuildSeasonRequirements.minTodayActiveMembers;

    return {
      group: {
        id: groupServer.group.id,
        name: groupServer.group.name,
        ruleLabel: groupServer.group.ruleLabel,
        serverIds
      },
      isRegistered: signup?.status === "active",
      boards,
      guildSeason: {
        isGuildMember: guildMember !== null,
        isManager,
        isRegistered: guildSignup !== null,
        canRegister: guildMember !== null && isManager && meetsRequirements,
        guildId: guildMember?.guildId ?? null,
        guildName: guildMember?.guild.name ?? null,
        memberCount,
        todayActiveMemberCount,
        minMembers: crossServerGuildSeasonRequirements.minMembers,
        minTodayActiveMembers: crossServerGuildSeasonRequirements.minTodayActiveMembers,
        rewardLabel: crossServerGuildSeasonRequirements.rewardLabel,
        statusLabel: guildSignup !== null ? "已报名" : meetsRequirements ? "可报名" : "未达标"
      },
      guildBoard: {
        key: "cross-guild-season",
        name: "跨服商会赛季榜",
        scope: "cross",
        isActive: true,
        snapshotDate: today,
        rows: guildRows
      }
    };
  },

  async registerCrossServer(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const groupServer = await prisma.crossServerGroupServer.findUnique({
      where: { serverId },
      include: { group: true }
    });
    if (groupServer === null || !groupServer.group.isActive) {
      return "CROSS_SERVER_GROUP_NOT_FOUND";
    }

    await prisma.crossServerSignup.upsert({
      where: {
        profileId_groupId: {
          profileId: profile.id,
          groupId: groupServer.groupId
        }
      },
      update: {
        status: "active",
        signupDate: today
      },
      create: {
        profileId: profile.id,
        serverId,
        groupId: groupServer.groupId,
        signupDate: today
      }
    });

    return this.getCrossServerCenter(accountId, serverId, today);
  },

  async registerCrossServerGuild(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const groupServer = await prisma.crossServerGroupServer.findUnique({
      where: { serverId },
      include: { group: true }
    });
    if (groupServer === null || !groupServer.group.isActive) {
      return "CROSS_SERVER_GROUP_NOT_FOUND";
    }
    const member = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (member === null) {
      return "GUILD_NOT_JOINED";
    }
    if (member.role !== "leader" && member.role !== "vice_leader") {
      return "GUILD_PERMISSION_DENIED";
    }
    const dayStart = new Date(`${today}T00:00:00.000Z`);
    const dayEnd = new Date(`${today}T23:59:59.999Z`);
    const [memberCount, todayActiveMembers] = await Promise.all([
      prisma.guildMember.count({ where: { guildId: member.guildId } }),
      prisma.guildActivityLog.findMany({
        where: { guildId: member.guildId, createdAt: { gte: dayStart, lte: dayEnd } },
        distinct: ["profileId"],
        select: { profileId: true }
      })
    ]);
    if (
      memberCount < crossServerGuildSeasonRequirements.minMembers ||
      todayActiveMembers.length < crossServerGuildSeasonRequirements.minTodayActiveMembers
    ) {
      return "GUILD_SEASON_REQUIREMENT_NOT_MET";
    }

    await prisma.crossServerGuildSignup.upsert({
      where: {
        guildId_groupId: {
          guildId: member.guildId,
          groupId: groupServer.groupId
        }
      },
      update: {
        status: "active",
        signupDate: today
      },
      create: {
        guildId: member.guildId,
        serverId,
        groupId: groupServer.groupId,
        signupDate: today
      }
    });

    return this.getCrossServerCenter(accountId, serverId, today);
  },

  async settleCrossServerRewards(accountId, serverId, today) {
    const center = await this.getCrossServerCenter(accountId, serverId, today);
    if (center === "PLAYER_NOT_FOUND" || center === "CROSS_SERVER_GROUP_NOT_FOUND") {
      return center;
    }

    let deliveredRewards = 0;
    for (const board of center.boards) {
      for (const row of board.rows.slice(0, 3)) {
        const rewardPlatformCoins = row.rank === 1 ? 180 : row.rank === 2 ? 120 : 80;
        const rewardTitleId = board.key === "cross-company-value" && row.rank === 1 ? "cross-unicorn" : null;
        const existing = await prisma.leaderboardRewardDelivery.findUnique({
          where: {
            profileId_boardKey_snapshotDate: {
              profileId: row.profileId,
              boardKey: board.key,
              snapshotDate: today
            }
          }
        });
        if (existing === null) {
          await prisma.leaderboardRewardDelivery.create({
            data: {
              profileId: row.profileId,
              serverId: center.group.id,
              boardKey: board.key,
              snapshotDate: today,
              rank: row.rank,
              rewardPlatformCoins,
              rewardTitleId,
              mailSubject: `${board.name} 第 ${row.rank} 名奖励`,
              mailBody: "跨服奖励已通过邮件发放，本记录用于重试幂等。"
            }
          });
          deliveredRewards += 1;
          if (rewardTitleId !== null) {
            await grantTitle(prisma, row.profileId, rewardTitleId, "cross_server", new Date(`${today}T00:00:00.000Z`));
          }
        }
      }
    }

    return {
      leaderboard: {
        boards: center.boards,
        activityBoards: []
      },
      deliveredRewards
    };
  },

  async settleCrossServerGuildRewards(accountId, serverId, today) {
    const center = await this.getCrossServerCenter(accountId, serverId, today);
    if (center === "PLAYER_NOT_FOUND" || center === "CROSS_SERVER_GROUP_NOT_FOUND") {
      return center;
    }
    if (!center.guildSeason.isGuildMember) {
      return "GUILD_NOT_JOINED";
    }

    const rewards = center.guildBoard.rows.slice(0, 3).map((row, index) => ({
      guildId: row.guildId,
      guildName: row.guildName,
      leaderProfileId: row.leaderProfileId,
      leaderFounderName: row.leaderFounderName,
      rank: row.rank,
      reputationReward: crossServerGuildSeasonRewards[index] ?? 0
    })).filter((reward) => reward.reputationReward > 0);

    let deliveredRewards = 0;
    for (const reward of rewards) {
      const existing = await prisma.leaderboardRewardDelivery.findUnique({
        where: {
          profileId_boardKey_snapshotDate: {
            profileId: reward.leaderProfileId,
            boardKey: "cross-guild-season",
            snapshotDate: today
          }
        }
      });
      if (existing !== null) {
        continue;
      }
      await prisma.$transaction([
        prisma.playerProfile.update({
          where: { id: reward.leaderProfileId },
          data: { reputation: { increment: reward.reputationReward } }
        }),
        prisma.leaderboardRewardDelivery.create({
          data: {
            profileId: reward.leaderProfileId,
            serverId: center.group.id,
            boardKey: "cross-guild-season",
            snapshotDate: today,
            rank: reward.rank,
            rewardPlatformCoins: 0,
            rewardTitleId: null,
            mailSubject: `跨服商会赛季榜第 ${reward.rank} 名奖励`,
            mailBody: `cross-guild-season:${reward.guildId}`
          }
        })
      ]);
      deliveredRewards += 1;
    }

    return {
      leaderboard: {
        boards: center.boards,
        activityBoards: []
      },
      deliveredRewards,
      rewards: deliveredRewards > 0 ? rewards : []
    };
  },

  async listTitles(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    await syncAchievements(prisma, toProfileRecord(profile));
    const completedAchievements = await prisma.playerAchievement.findMany({
      where: { profileId: profile.id, completedAt: { not: null } },
      include: { achievement: true }
    });
    for (const achievement of completedAchievements) {
      if (achievement.achievement.rewardTitleId !== null) {
        await grantTitle(prisma, profile.id, achievement.achievement.rewardTitleId, "achievement", new Date());
      }
    }

    return toTitleCenterRecord(prisma, profile.id, today);
  },

  async equipTitle(accountId, serverId, titleId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const title = await prisma.playerTitle.findUnique({
      where: {
        profileId_titleId: {
          profileId: profile.id,
          titleId
        }
      }
    });
    if (title === null) {
      return "TITLE_NOT_FOUND";
    }
    if (isExpiredAt(title.expiresAt, today)) {
      return "TITLE_EXPIRED";
    }
    await prisma.playerTitleEquipment.upsert({
      where: { profileId: profile.id },
      update: {
        titleId,
        equippedAt: new Date()
      },
      create: {
        profileId: profile.id,
        titleId
      }
    });

    return toTitleCenterRecord(prisma, profile.id, today);
  },

  async listAchievements(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    await syncAchievements(prisma, toProfileRecord(profile));
    const achievements = await prisma.achievementConfig.findMany({
      include: {
        progresses: {
          where: { profileId: profile.id }
        }
      },
      orderBy: [{ sortOrder: "asc" }]
    });

    return achievements.map((achievement) => {
      const progress = achievement.progresses[0];
      return toAchievementRecord({
        ...achievement,
        progress: progress?.progress ?? 0,
        completedAt: progress?.completedAt ?? null,
        claimedAt: progress?.claimedAt ?? null
      });
    }).filter((achievement) => !achievement.isHidden || achievement.isCompleted);
  },

  async claimAchievement(accountId, serverId, achievementId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    await syncAchievements(prisma, toProfileRecord(profile));
    const achievement = await prisma.playerAchievement.findUnique({
      where: {
        profileId_achievementId: {
          profileId: profile.id,
          achievementId
        }
      },
      include: { achievement: true }
    });
    if (achievement === null) {
      return "ACHIEVEMENT_NOT_FOUND";
    }
    if (achievement.completedAt === null) {
      return "ACHIEVEMENT_INCOMPLETE";
    }
    if (achievement.claimedAt !== null) {
      return "ACHIEVEMENT_ALREADY_CLAIMED";
    }

    const result = await prisma.$transaction(async (tx) => {
      const savedAchievement = await tx.playerAchievement.update({
        where: { id: achievement.id },
        data: { claimedAt: new Date() },
        include: { achievement: true }
      });
      let nextPlatformCoins = profile.platformCoins + achievement.achievement.rewardPlatformCoins;
      if (achievement.achievement.rewardPlatformCoins > 0) {
        const wallet = await tx.playerPlatformWallet.upsert({
          where: { profileId: profile.id },
          update: {},
          create: {
            profileId: profile.id,
            balance: profile.platformCoins,
            totalSpent: 0,
            vipExperience: VIP3_START_EXPERIENCE
          }
        });
        nextPlatformCoins = wallet.balance + achievement.achievement.rewardPlatformCoins;
        await tx.playerPlatformWallet.update({
          where: { id: wallet.id },
          data: { balance: nextPlatformCoins }
        });
        await tx.platformCoinLedger.create({
          data: {
            profileId: profile.id,
            walletId: wallet.id,
            changeAmount: achievement.achievement.rewardPlatformCoins,
            balanceAfter: nextPlatformCoins,
            source: "system_compensation",
            referenceId: savedAchievement.id,
            reason: `领取成就奖励：${achievement.achievement.name}`
          }
        });
      }
      const savedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { increment: achievement.achievement.rewardCash },
          platformCoins: nextPlatformCoins,
          actionPower: { increment: achievement.achievement.rewardActionPower }
        }
      });
      if (achievement.achievement.rewardTitleId !== null) {
        await grantTitle(tx as PrismaClient, profile.id, achievement.achievement.rewardTitleId, "achievement", new Date());
      }
      await unlockKnowledge(tx as PrismaClient, profile.id, achievement.achievement.rewardKnowledgeId, "achievement");

      return { savedAchievement, savedProfile };
    });

    return {
      achievement: toAchievementRecord({
        ...result.savedAchievement.achievement,
        progress: result.savedAchievement.progress,
        completedAt: result.savedAchievement.completedAt,
        claimedAt: result.savedAchievement.claimedAt
      }),
      profile: toProfileRecord(result.savedProfile),
      titleCenter: await toTitleCenterRecord(prisma, profile.id, new Date().toISOString().slice(0, 10)),
      result: `${achievement.achievement.name} 奖励已领取。`
    };
  },

  async listKnowledge(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const [entries, unlocks] = await Promise.all([
      prisma.knowledgeEntry.findMany({
        include: { category: true },
        orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { id: "asc" }]
      }),
      prisma.playerKnowledgeUnlock.findMany({
        where: { profileId: profile.id }
      })
    ]);
    const unlockedAtByKnowledgeId = new Map(unlocks.map((unlock) => [unlock.knowledgeId, unlock.unlockedAt]));

    return entries.map((entry) => toKnowledgeEntryRecord(entry, unlockedAtByKnowledgeId.get(entry.id) ?? null));
  },

  async getGuildCenter(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const member = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (member === null) {
      return {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      };
    }
    const dayStart = new Date(`${today}T00:00:00.000Z`);
    const dayEnd = new Date(`${today}T23:59:59.999Z`);
    const [
      guild,
      members,
      joinRequests,
      taskConfigs,
      progresses,
      techConfigs,
      techs,
      helpRequests,
      todayHelpCount,
      todayActivityProfiles,
      todayCollaborationCount,
      recentActivities,
      projectProgress
    ] = await Promise.all([
      prisma.guild.findUnique({ where: { id: member.guildId } }),
      prisma.guildMember.findMany({ where: { guildId: member.guildId }, include: { profile: true }, orderBy: { contributionScore: "desc" } }),
      prisma.guildJoinRequest.findMany({ where: { guildId: member.guildId, status: "pending" }, include: { profile: true }, orderBy: { createdAt: "asc" } }),
      prisma.guildTaskConfig.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.guildTaskProgress.findMany({ where: { guildId: member.guildId } }),
      prisma.guildTechConfig.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.guildTechState.findMany({ where: { guildId: member.guildId } }),
      prisma.guildHelpRequest.findMany({ where: { guildId: member.guildId }, include: { profile: true }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.guildHelpRequest.count({
        where: {
          guildId: member.guildId,
          OR: [
            { createdAt: { gte: dayStart, lte: dayEnd } },
            { fulfilledAt: { gte: dayStart, lte: dayEnd } }
          ]
        }
      }),
      prisma.guildActivityLog.findMany({
        where: { guildId: member.guildId, createdAt: { gte: dayStart, lte: dayEnd } },
        distinct: ["profileId"],
        select: { profileId: true }
      }),
      prisma.guildActivityLog.count({
        where: { guildId: member.guildId, createdAt: { gte: dayStart, lte: dayEnd } }
      }),
      prisma.guildActivityLog.findMany({
        where: { guildId: member.guildId },
        include: { profile: true },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.guildProjectProgress.findMany({ where: { guildId: member.guildId } })
    ]);

    return {
      guild: guild === null ? null : {
        id: guild.id,
        name: guild.name,
        level: guild.level,
        contributionScore: guild.contributionScore,
        announcement: guild.announcement,
        collaborationRules: guild.collaborationRules
      },
      members: members.map((item) => ({
        profileId: item.profileId,
        founderName: item.profile.founderName,
        companyName: item.profile.companyName,
        role: item.role,
        contributionScore: item.contributionScore
      })),
      joinRequests: member.role === "leader" || member.role === "vice_leader"
        ? joinRequests.map((request) => ({
          id: request.id,
          profileId: request.profileId,
          founderName: request.profile.founderName,
          companyName: request.profile.companyName,
          status: request.status,
          createdAt: request.createdAt.toISOString()
        }))
        : [],
      tasks: taskConfigs.map((task) => {
        const progress = progresses.find((item) => item.taskId === task.id);
        const currentProgress = task.id === "guild-daily-help" ? todayHelpCount : progress?.progress ?? 0;
        const isClaimed = progress?.claimedAt?.toISOString().slice(0, 10) === today;
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          progress: Math.min(currentProgress, task.target),
          target: task.target,
          contributionReward: task.contributionReward,
          isClaimed,
          isClaimable: currentProgress >= task.target && !isClaimed
        };
      }),
      techs: techConfigs.map((tech) => {
        const level = techs.find((item) => item.techId === tech.id)?.level ?? 0;
        const upgradeCost = level >= tech.maxLevel ? null : guildTechUpgradeCost(level);
        return {
          id: tech.id,
          name: tech.name,
          description: tech.description,
          level,
          maxLevel: tech.maxLevel,
          upgradeCost,
          isUpgradable: upgradeCost !== null && (guild?.contributionScore ?? 0) >= upgradeCost,
          bonusLabel: guildTechBonusLabel(level)
        };
      }),
      helpRequests: helpRequests.map((request) => ({
        id: request.id,
        profileId: request.profileId,
        founderName: request.profile.founderName,
        companyName: request.profile.companyName,
        requestType: request.requestType,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        fulfilledAt: request.fulfilledAt?.toISOString() ?? null,
        canFulfill: request.status === "open" && request.profileId !== profile.id
      })),
      projects: guildProjectConfigs.map((project) => {
        const progress = projectProgress.find((item) => item.projectId === project.id);
        const currentProgress = progress?.progress ?? 0;
        const isClaimed = progress?.claimedAt !== null && progress?.claimedAt !== undefined;
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          progress: Math.min(currentProgress, project.target),
          target: project.target,
          rewardReputation: project.rewardReputation,
          rewardLabel: `声望 +${project.rewardReputation}`,
          isClaimed,
          isClaimable: currentProgress >= project.target && !isClaimed
        };
      }),
      todayActiveMemberCount: todayActivityProfiles.length,
      todayCollaborationCount,
      recentActivities: recentActivities.map((activity) => ({
        id: activity.id,
        profileId: activity.profileId,
        founderName: activity.profile.founderName,
        action: activity.action,
        actionLabel: guildActivityLabel(activity.action),
        createdAt: activity.createdAt.toISOString()
      })),
      leaderboard: members.map((item, index) => ({
        rank: index + 1,
        profileId: item.profileId,
        founderName: item.profile.founderName,
        companyName: item.profile.companyName,
        value: item.contributionScore,
        valueLabel: formatLeaderboardValue("guild", item.contributionScore),
        equippedTitle: null
      }))
    };
  },

  async joinOrCreateGuild(accountId, serverId, guildName, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const existingMember = await prisma.guildMember.findUnique({ where: { profileId: profile.id }, include: { guild: true } });
    if (existingMember !== null) {
      const guildCenter = await this.getGuildCenter(accountId, serverId, today);
      return {
        guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
          guild: null,
          members: [],
          tasks: [],
          techs: [],
          helpRequests: [],
          joinRequests: [],
          projects: [],
          todayActiveMemberCount: 0,
          todayCollaborationCount: 0,
          recentActivities: [],
          leaderboard: []
        } : guildCenter,
        result: `${existingMember.guild.name} 已加入。`,
        applicationStatus: "approved"
      };
    }
    const existingGuild = await prisma.guild.findUnique({
      where: {
        serverId_name: {
          serverId,
          name: guildName
        }
      }
    });
    if (existingGuild !== null) {
      await prisma.guildJoinRequest.upsert({
        where: {
          guildId_profileId: {
            guildId: existingGuild.id,
            profileId: profile.id
          }
        },
        update: {
          status: "pending",
          reviewedAt: null,
          reviewedByProfileId: null
        },
        create: {
          guildId: existingGuild.id,
          profileId: profile.id,
          createdAt: new Date(`${today}T12:00:00.000Z`)
        }
      });
      return {
        guildCenter: {
          guild: null,
          members: [],
          joinRequests: [],
          tasks: [],
          techs: [],
          helpRequests: [],
          projects: [],
          todayActiveMemberCount: 0,
          todayCollaborationCount: 0,
          recentActivities: [],
          leaderboard: []
        },
        result: "入会申请已提交，等待会长或副会长审核。",
        applicationStatus: "pending"
      };
    }
    const guild = await prisma.guild.create({
      data: {
        serverId,
        name: guildName
      }
    });
    await prisma.guildMember.upsert({
      where: { profileId: profile.id },
      update: { guildId: guild.id },
      create: {
        guildId: guild.id,
        profileId: profile.id,
        role: "leader"
      }
    });
    const guildCenter = await this.getGuildCenter(accountId, serverId, today);

    return {
      guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      } : guildCenter,
      result: `${guildName} 已加入。`,
      applicationStatus: "approved"
    };
  },

  async reviewGuildApplication(accountId, serverId, requestId, decision, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const reviewer = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (reviewer === null) {
      return "GUILD_NOT_JOINED";
    }
    if (reviewer.role !== "leader" && reviewer.role !== "vice_leader") {
      return "GUILD_PERMISSION_DENIED";
    }
    const application = await prisma.guildJoinRequest.findUnique({ where: { id: requestId } });
    if (application === null || application.guildId !== reviewer.guildId) {
      return "GUILD_APPLICATION_NOT_FOUND";
    }
    if (application.status !== "pending") {
      return "GUILD_APPLICATION_ALREADY_REVIEWED";
    }
    const reviewedAt = new Date(`${today}T12:00:00.000Z`);
    if (decision === "approved") {
      await prisma.$transaction([
        prisma.guildJoinRequest.update({
          where: { id: requestId },
          data: { status: "approved", reviewedAt, reviewedByProfileId: profile.id }
        }),
        prisma.guildMember.create({
          data: {
            guildId: reviewer.guildId,
            profileId: application.profileId,
            role: "member"
          }
        })
      ]);
    } else {
      await prisma.guildJoinRequest.update({
        where: { id: requestId },
        data: { status: "rejected", reviewedAt, reviewedByProfileId: profile.id }
      });
    }
    const guildCenter = await this.getGuildCenter(accountId, serverId, today);
    return {
      guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      } : guildCenter,
      result: decision === "approved" ? "入会申请已通过。" : "入会申请已拒绝。"
    };
  },

  async updateGuildMemberRole(accountId, serverId, profileId, role, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const operator = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (operator === null) {
      return "GUILD_NOT_JOINED";
    }
    if (operator.role !== "leader") {
      return "GUILD_PERMISSION_DENIED";
    }
    if (profile.id === profileId) {
      return "GUILD_SELF_ROLE_FORBIDDEN";
    }
    const target = await prisma.guildMember.findUnique({ where: { profileId } });
    if (target === null || target.guildId !== operator.guildId) {
      return "GUILD_MEMBER_NOT_FOUND";
    }
    if (target.role === "leader") {
      return "GUILD_PERMISSION_DENIED";
    }
    await prisma.guildMember.update({ where: { id: target.id }, data: { role } });
    const guildCenter = await this.getGuildCenter(accountId, serverId, today);
    return {
      guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      } : guildCenter,
      result: role === "vice_leader" ? "已任命副会长。" : "成员职位已更新。"
    };
  },

  async removeGuildMember(accountId, serverId, profileId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const operator = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (operator === null) {
      return "GUILD_NOT_JOINED";
    }
    if (profile.id === profileId) {
      return "GUILD_SELF_REMOVE_FORBIDDEN";
    }
    if (operator.role !== "leader") {
      return "GUILD_PERMISSION_DENIED";
    }
    const target = await prisma.guildMember.findUnique({ where: { profileId } });
    if (target === null || target.guildId !== operator.guildId) {
      return "GUILD_MEMBER_NOT_FOUND";
    }
    if (target.role !== "member") {
      return "GUILD_PERMISSION_DENIED";
    }
    await prisma.guildMember.delete({ where: { id: target.id } });
    const guildCenter = await this.getGuildCenter(accountId, serverId, today);
    return {
      guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      } : guildCenter,
      result: "成员已移出商会。"
    };
  },

  async updateGuildSettings(accountId, serverId, announcement, collaborationRules, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const member = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (member === null) {
      return "GUILD_NOT_JOINED";
    }
    if (member.role !== "leader" && member.role !== "vice_leader") {
      return "GUILD_PERMISSION_DENIED";
    }

    await prisma.guild.update({
      where: { id: member.guildId },
      data: {
        announcement,
        collaborationRules
      }
    });
    const guildCenter = await this.getGuildCenter(accountId, serverId, today);
    return {
      guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      } : guildCenter,
      result: "商会公告已更新。"
    };
  },

  async requestGuildHelp(accountId, serverId, requestType, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const member = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (member === null) {
      return "GUILD_NOT_JOINED";
    }
    const createdAt = new Date(`${today}T12:00:00.000Z`);
    await prisma.$transaction([
      prisma.guildHelpRequest.create({
        data: {
          guildId: member.guildId,
          profileId: profile.id,
          requestType,
          createdAt
        }
      }),
      prisma.guildMember.update({
        where: { id: member.id },
        data: { contributionScore: { increment: 20 } }
      }),
      prisma.guild.update({
        where: { id: member.guildId },
        data: { contributionScore: { increment: 20 } }
      }),
      prisma.guildTaskProgress.upsert({
        where: {
          guildId_taskId: {
            guildId: member.guildId,
            taskId: "guild-daily-help"
          }
        },
        update: { progress: { increment: 1 } },
        create: {
          guildId: member.guildId,
          taskId: "guild-daily-help",
          progress: 1
        }
      }),
      prisma.guildActivityLog.create({
        data: {
          guildId: member.guildId,
          profileId: profile.id,
          action: "help_requested",
          createdAt
        }
      }),
      ...guildProjectProgressUpdates(prisma, member.guildId)
    ]);
    const guildCenter = await this.getGuildCenter(accountId, serverId, today);

    return {
      guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      } : guildCenter,
      result: "商会互助已发布。"
    };
  },

  async fulfillGuildHelp(accountId, serverId, requestId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const member = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (member === null) {
      return "GUILD_NOT_JOINED";
    }
    const helpRequest = await prisma.guildHelpRequest.findUnique({ where: { id: requestId } });
    if (helpRequest === null || helpRequest.guildId !== member.guildId) {
      return "GUILD_HELP_NOT_FOUND";
    }
    if (helpRequest.profileId === profile.id) {
      return "GUILD_HELP_SELF_FULFILL_FORBIDDEN";
    }
    if (helpRequest.status !== "open" || helpRequest.fulfilledAt !== null) {
      return "GUILD_HELP_ALREADY_FULFILLED";
    }

    const fulfilledAt = new Date(`${today}T12:00:00.000Z`);
    await prisma.$transaction([
      prisma.guildHelpRequest.update({
        where: { id: requestId },
        data: {
          status: "fulfilled",
          fulfilledAt
        }
      }),
      prisma.guildMember.update({
        where: { id: member.id },
        data: { contributionScore: { increment: 15 } }
      }),
      prisma.guild.update({
        where: { id: member.guildId },
        data: { contributionScore: { increment: 15 } }
      }),
      prisma.guildTaskProgress.upsert({
        where: {
          guildId_taskId: {
            guildId: member.guildId,
            taskId: "guild-daily-help"
          }
        },
        update: { progress: { increment: 1 } },
        create: {
          guildId: member.guildId,
          taskId: "guild-daily-help",
          progress: 1
        }
      }),
      prisma.guildActivityLog.create({
        data: {
          guildId: member.guildId,
          profileId: profile.id,
          action: "help_fulfilled",
          createdAt: fulfilledAt
        }
      }),
      ...guildProjectProgressUpdates(prisma, member.guildId)
    ]);

    const guildCenter = await this.getGuildCenter(accountId, serverId, today);
    return {
      guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      } : guildCenter,
      result: "商会协作已完成，贡献 +15。"
    };
  },

  async claimGuildTask(accountId, serverId, taskId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const member = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (member === null) {
      return "GUILD_NOT_JOINED";
    }
    const task = await prisma.guildTaskConfig.findUnique({ where: { id: taskId } });
    if (task === null) {
      return "GUILD_TASK_NOT_FOUND";
    }
    const progress = await prisma.guildTaskProgress.findUnique({
      where: {
        guildId_taskId: {
          guildId: member.guildId,
          taskId
        }
      }
    });
    if (progress?.claimedAt?.toISOString().slice(0, 10) === today) {
      return "GUILD_TASK_ALREADY_CLAIMED";
    }
    const dayStart = new Date(`${today}T00:00:00.000Z`);
    const dayEnd = new Date(`${today}T23:59:59.999Z`);
    const currentProgress = taskId === "guild-daily-help"
      ? await prisma.guildHelpRequest.count({
        where: {
          guildId: member.guildId,
          OR: [
            { createdAt: { gte: dayStart, lte: dayEnd } },
            { fulfilledAt: { gte: dayStart, lte: dayEnd } }
          ]
        }
      })
      : progress?.progress ?? 0;
    if (currentProgress < task.target) {
      return "GUILD_TASK_NOT_READY";
    }

    const claimedAt = new Date(`${today}T12:00:00.000Z`);
    await prisma.$transaction([
      prisma.guildMember.update({
        where: { id: member.id },
        data: { contributionScore: { increment: task.contributionReward } }
      }),
      prisma.guild.update({
        where: { id: member.guildId },
        data: { contributionScore: { increment: task.contributionReward } }
      }),
      prisma.guildTaskProgress.upsert({
        where: {
          guildId_taskId: {
            guildId: member.guildId,
            taskId
          }
        },
        update: {
          progress: Math.max(currentProgress, task.target),
          claimedAt
        },
        create: {
          guildId: member.guildId,
          taskId,
          progress: Math.max(currentProgress, task.target),
          claimedAt
        }
      }),
      prisma.guildActivityLog.create({
        data: {
          guildId: member.guildId,
          profileId: profile.id,
          action: "task_claimed",
          createdAt: claimedAt
        }
      }),
      ...guildProjectProgressUpdates(prisma, member.guildId)
    ]);

    const guildCenter = await this.getGuildCenter(accountId, serverId, today);
    return {
      guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      } : guildCenter,
      result: `商会任务已领取，贡献 +${task.contributionReward}。`
    };
  },

  async upgradeGuildTech(accountId, serverId, techId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const member = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (member === null) {
      return "GUILD_NOT_JOINED";
    }
    const [guild, tech, state] = await Promise.all([
      prisma.guild.findUnique({ where: { id: member.guildId } }),
      prisma.guildTechConfig.findUnique({ where: { id: techId } }),
      prisma.guildTechState.findUnique({
        where: {
          guildId_techId: {
            guildId: member.guildId,
            techId
          }
        }
      })
    ]);
    if (guild === null) {
      return "GUILD_NOT_JOINED";
    }
    if (tech === null) {
      return "GUILD_TECH_NOT_FOUND";
    }
    const currentLevel = state?.level ?? 0;
    if (currentLevel >= tech.maxLevel) {
      return "GUILD_TECH_MAXED";
    }
    const upgradeCost = guildTechUpgradeCost(currentLevel);
    if (upgradeCost === null || guild.contributionScore < upgradeCost) {
      return "GUILD_CONTRIBUTION_NOT_ENOUGH";
    }
    const nextLevel = currentLevel + 1;
    const allTechStates = await prisma.guildTechState.findMany({ where: { guildId: member.guildId } });
    const otherTechLevelTotal = allTechStates
      .filter((item) => item.techId !== techId)
      .reduce((total, item) => total + item.level, 0);
    await prisma.$transaction([
      prisma.guildTechState.upsert({
        where: {
          guildId_techId: {
            guildId: member.guildId,
            techId
          }
        },
        update: { level: nextLevel },
        create: {
          guildId: member.guildId,
          techId,
          level: nextLevel
        }
      }),
      prisma.guild.update({
        where: { id: member.guildId },
        data: { level: Math.max(guild.level, 1 + otherTechLevelTotal + nextLevel) }
      }),
      prisma.guildActivityLog.create({
        data: {
          guildId: member.guildId,
          profileId: profile.id,
          action: "tech_upgraded",
          createdAt: new Date(`${today}T12:00:00.000Z`)
        }
      }),
      ...guildProjectProgressUpdates(prisma, member.guildId)
    ]);

    const guildCenter = await this.getGuildCenter(accountId, serverId, today);
    return {
      guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      } : guildCenter,
      result: `${tech.name} 已升级到 Lv.${nextLevel}。`
    };
  },

  async claimGuildProjectReward(accountId, serverId, projectId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const member = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (member === null) {
      return "GUILD_NOT_JOINED";
    }
    const project = guildProjectConfigs.find((item) => item.id === projectId);
    if (project === undefined) {
      return "GUILD_PROJECT_NOT_FOUND";
    }
    const progress = await prisma.guildProjectProgress.findUnique({
      where: {
        guildId_projectId: {
          guildId: member.guildId,
          projectId
        }
      }
    });
    if (progress?.claimedAt !== null && progress?.claimedAt !== undefined) {
      return "GUILD_PROJECT_REWARD_CLAIMED";
    }
    if ((progress?.progress ?? 0) < project.target) {
      return "GUILD_PROJECT_NOT_READY";
    }

    await prisma.$transaction([
      prisma.guildProjectProgress.update({
        where: {
          guildId_projectId: {
            guildId: member.guildId,
            projectId
          }
        },
        data: { claimedAt: new Date(`${today}T12:00:00.000Z`) }
      }),
      prisma.playerProfile.update({
        where: { id: profile.id },
        data: { reputation: { increment: project.rewardReputation } }
      })
    ]);

    const guildCenter = await this.getGuildCenter(accountId, serverId, today);
    return {
      guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      } : guildCenter,
      result: `${project.name} 已完成，声望 +${project.rewardReputation}。`
    };
  },

  async settleGuildLeaderboard(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }
    const member = await prisma.guildMember.findUnique({ where: { profileId: profile.id } });
    if (member === null) {
      return "GUILD_NOT_JOINED";
    }
    const guildSettlementMarker = `guild:${member.guildId}`;
    const existingSettlement = await prisma.leaderboardRewardDelivery.findFirst({
      where: {
        serverId,
        boardKey: "guild-contribution",
        snapshotDate: today,
        mailBody: guildSettlementMarker
      }
    });
    if (existingSettlement !== null) {
      const guildCenter = await this.getGuildCenter(accountId, serverId, today);
      return {
        guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
          guild: null,
          members: [],
          tasks: [],
          techs: [],
          helpRequests: [],
          joinRequests: [],
          projects: [],
          todayActiveMemberCount: 0,
          todayCollaborationCount: 0,
          recentActivities: [],
          leaderboard: []
        } : guildCenter,
        result: "今日商会贡献榜已结算。",
        deliveredRewards: 0,
        rewards: []
      };
    }

    const rankedMembers = await prisma.guildMember.findMany({
      where: { guildId: member.guildId },
      include: { profile: true },
      orderBy: { contributionScore: "desc" },
      take: 3
    });
    const rewardValues = [120, 80, 50];
    const rewards = rankedMembers.map((rankedMember, index) => ({
      profileId: rankedMember.profileId,
      founderName: rankedMember.profile.founderName,
      companyName: rankedMember.profile.companyName,
      rank: index + 1,
      reputationReward: rewardValues[index] ?? 0
    })).filter((reward) => reward.reputationReward > 0);

    await prisma.$transaction(rewards.flatMap((reward) => [
      prisma.playerProfile.update({
        where: { id: reward.profileId },
        data: { reputation: { increment: reward.reputationReward } }
      }),
      prisma.leaderboardRewardDelivery.create({
        data: {
          profileId: reward.profileId,
          serverId,
          boardKey: "guild-contribution",
          snapshotDate: today,
          rank: reward.rank,
          rewardPlatformCoins: 0,
          rewardTitleId: null,
          mailSubject: `商会贡献榜第 ${reward.rank} 名奖励`,
          mailBody: guildSettlementMarker
        }
      })
    ]));

    const guildCenter = await this.getGuildCenter(accountId, serverId, today);
    return {
      guildCenter: guildCenter === "PLAYER_NOT_FOUND" ? {
        guild: null,
        members: [],
        tasks: [],
        techs: [],
        helpRequests: [],
        joinRequests: [],
        projects: [],
        todayActiveMemberCount: 0,
        todayCollaborationCount: 0,
        recentActivities: [],
        leaderboard: []
      } : guildCenter,
      result: `商会贡献榜已结算，发放 ${rewards.length} 份声望奖励。`,
      deliveredRewards: rewards.length,
      rewards
    };
  },

  async disconnect() {
    await prisma.$disconnect();
  }
});
