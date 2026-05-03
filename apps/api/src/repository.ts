import { createHash, randomUUID } from "node:crypto";

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
  businessClockSyncedAt: string | null;
  lastBusinessPulseSummaryJson: string | null;
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

export type LongTermGoalRecord = {
  id: string;
  title: string;
  description: string;
  source:
    | "task"
    | "finance"
    | "seasonTask"
    | "activity"
    | "activityShop"
    | "guild"
    | "crossServer"
    | "achievement"
    | "title"
    | "companyGrowth";
  sourceId: string;
  progress: number;
  target: number;
  isCompleted: boolean;
  isClaimable: boolean;
  statusLabel: string;
  rewardLabel: string | null;
  action: {
    label: string;
    href: string;
  };
};

export type LongTermGoalsRecord = {
  profile: {
    companyLevel: number;
    maxLevel: number;
    companyExperience: number;
    reputation: number;
  };
  sections: Array<{
    key: "today" | "week" | "season" | "longTerm";
    title: string;
    summary: string;
    goals: LongTermGoalRecord[];
  }>;
  summaries: {
    todayClaimableCount: number;
    seasonActiveActivityCount: number;
    achievementCompletedCount: number;
    titleCount: number;
    guildJoined: boolean;
    crossServerRegistered: boolean;
    fullLevelChestClaimableCount: number;
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
  businessClock?: BusinessClockPulseRecord;
};

export type BusinessClockPulseRecord = {
  serverNow: string;
  syncedAt: string;
  previousSyncedAt: string | null;
  elapsedMinutes: number;
  settledMinutes: number;
  settledTicks: number;
  cashDelta: number;
  valuationDelta: number;
  employeeSatisfactionDelta: number;
  customerSatisfactionDelta: number;
  platformCoinsDelta: 0;
  vipExperienceDelta: 0;
  leaderboardRewardDelta: 0;
  summary: string;
  nightBriefing: NightBusinessBriefingRecord | null;
};

export type NightBusinessBriefingRecord = {
  offlineMinutes: number;
  actionPowerRecovered: number;
  cashDelta: number;
  valuationDelta: number;
  employeeSatisfactionDelta: number;
  customerSatisfactionDelta: number;
  riskTip: string;
  newTodoCount: number;
  nextAction: string;
  summary: string;
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
  sourceKey: string;
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
  isHighRisk: boolean;
  purposeTag: string;
  applicationImpact: string[];
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
  onTimeRepayPeriods: number;
  periodProgressTicks: number;
  nextDueTicks: number;
  nextDueText: string;
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
  offerType: "initial" | "follow_on";
  followOnSequence: number;
  gate: {
    minCompanyLevel: number;
    minReputation: number;
    maxDebtRatioBasisPoints: number;
    minFounderEquityBasisPoints: number;
    requiresLegalReview: boolean;
  };
  gateStatus: {
    isAvailable: boolean;
    blockers: Array<{ code: string; message: string }>;
  };
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
  offerType: "initial" | "follow_on";
  offerStatus: string;
  paymentStatus: string;
  disbursementStatus: string;
  legalReviewStatus: string;
  postEventStatus: string;
  followOnSequence: number;
  followOnCount: number;
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
  | "mail_reward_claim"
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
    expiresAt: string | null;
    isPrivilege: boolean;
    isActive: boolean;
    isClaimableToday: boolean;
    isClaimedToday: boolean;
    claimStatus: "not_privilege" | "claimable" | "claimed" | "expired" | "instant";
    rewardCash: number;
    rewardActionPower: number;
    rewardReputation: number;
    rewardItem: ItemRewardRecord | null;
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
  levels: VipLevelRecord[];
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

export type AdminGuildListRecord = {
  rows: Array<{
    id: string;
    serverId: string;
    name: string;
    level: number;
    contributionScore: number;
    memberCount: number;
    todayActiveMemberCount: number;
    helpRequestCount: number;
    projectCount: number;
    crossServerRegistered: boolean;
    crossServerGroupName: string | null;
    createdAt: string;
  }>;
};

export type AdminGuildDetailRecord = {
  guild: {
    id: string;
    serverId: string;
    name: string;
    level: number;
    contributionScore: number;
    announcement: string;
    collaborationRules: string;
    createdAt: string;
  };
  members: Array<{
    profileId: string;
    founderName: string;
    companyName: string;
    role: string;
    contributionScore: number;
    joinedAt: string;
  }>;
  techs: Array<{ id: string; name: string; level: number; maxLevel: number }>;
  helpRequests: Array<{
    id: string;
    profileId: string;
    founderName: string;
    requestType: string;
    status: string;
    createdAt: string;
    fulfilledAt: string | null;
  }>;
  projects: Array<{ id: string; name: string; progress: number; target: number; claimedAt: string | null }>;
  crossServer: {
    isRegistered: boolean;
    groupId: string | null;
    groupName: string | null;
    signupDate: string | null;
  };
  history: {
    guildSettlements: GuildHistoryRecord["settlements"];
    crossServerSettlements: CrossServerGuildHistoryRecord["settlements"];
  };
};

export type AdminGuildSettlementRecord = GuildActionRecord & {
  auditLogId: string;
};

export type AdminCrossServerGuildSettlementRecord = CrossServerGuildSettlementRecord & {
  auditLogId: string;
};

export type AdminActivityListRecord = {
  rows: Array<{
    id: string;
    name: string;
    status: SeasonStatus;
    startDate: string;
    endDate: string;
    leaderboardKey: string;
    participantCount: number;
    totalScore: number;
    isSettled: boolean;
    topRows: LeaderboardRowRecord[];
  }>;
};

export type AdminActivitySettlementRecord = {
  activity: AdminActivityListRecord["rows"][number];
  leaderboard: LeaderboardBoardRecord;
  deliveredRewards: number;
  rewards: Array<{
    profileId: string;
    founderName: string;
    companyName: string;
    rank: number;
    reputationReward: number;
  }>;
  auditLogId: string;
};

export type AdminAuditLogRecord = {
  id: string;
  adminUsername: string;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: string | null;
  detailJson: Record<string, string | number | boolean | null> | null;
  summary: string;
  createdAt: string;
};

export type AdminAuditLogFilters = {
  action: string;
  targetType: string;
  targetId: string;
  admin: string;
  from: string;
  to: string;
};

export type AdminAuditLogListRecord = {
  rows: AdminAuditLogRecord[];
  total: number;
  filters: {
    actions: string[];
    targetTypes: string[];
    admins: string[];
  };
};

export type ChatChannelId = "system" | "world" | "guild" | "cross";

export type ChatKeywordAction = "mask" | "block" | "allow";

export type ChatKeywordSourceType = "public" | "custom" | "whitelist";

export type ChatMessageRecord = {
  id: string;
  channel: ChatChannelId;
  serverId: string;
  profileId: string | null;
  founderName: string;
  content: string;
  originalContent: string;
  filterAction: "none" | "mask" | "block";
  matchedKeywords: string[];
  createdAt: string;
};

export type ChatCenterRecord = {
  channels: Array<{
    id: ChatChannelId;
    label: string;
    description: string;
    canSend: boolean;
    readonlyReason: string | null;
    unreadCount: number;
  }>;
  messages: ChatMessageRecord[];
  keywordPolicy: {
    mode: "local_first";
    source: string;
    license: string;
    sourceHash: string;
    importBatch: string;
  };
};

export type AdminChatKeywordRecord = {
  id: string;
  keyword: string;
  replacement: string;
  action: ChatKeywordAction;
  sourceType: ChatKeywordSourceType;
  sourceName: string;
  license: string;
  sourceHash: string;
  importBatch: string;
  isEnabled: boolean;
  updatedAt: string;
};

export type AdminChatKeywordListRecord = {
  rows: AdminChatKeywordRecord[];
  total: number;
  filters: {
    sourceTypes: ChatKeywordSourceType[];
    actions: ChatKeywordAction[];
    statuses: string[];
  };
};

export type AdminChatKeywordUpdateInput = {
  action: ChatKeywordAction;
  isEnabled: boolean;
  replacement: string;
  reason: string;
};

export type AdminChatKeywordUpdateRecord = {
  keyword: AdminChatKeywordRecord;
  auditLogId: string;
};

export const defaultChatKeywords = (): AdminChatKeywordRecord[] => {
  const batch = "phase28-public-game-chat-20260522";
  const sourceName = "公开游戏聊天安全词库";
  const license = "CC BY-SA 4.0";
  const createKeyword = (
    id: string,
    keyword: string,
    sourceType: ChatKeywordSourceType,
    action: ChatKeywordAction,
    replacement = "***"
  ): AdminChatKeywordRecord => ({
    id,
    keyword,
    replacement,
    action,
    sourceType,
    sourceName,
    license,
    sourceHash: createHash("sha256").update(`${batch}:${keyword}:${sourceType}`).digest("hex"),
    importBatch: batch,
    isEnabled: true,
    updatedAt: "2026-05-22T00:00:00.000Z"
  });

  return [
    createKeyword("public-cheat-tool", "外挂", "public", "mask"),
    createKeyword("public-private-trade", "私下交易", "public", "block"),
    createKeyword("public-political-xi-jinping", "习近平", "public", "block"),
    createKeyword("public-political-li-qiang", "李强", "public", "block"),
    createKeyword("public-political-zhao-leji", "赵乐际", "public", "block"),
    createKeyword("public-political-wang-huning", "王沪宁", "public", "block"),
    createKeyword("public-political-cai-qi", "蔡奇", "public", "block"),
    createKeyword("public-political-ding-xuexiang", "丁薛祥", "public", "block"),
    createKeyword("public-political-li-xi", "李希", "public", "block"),
    createKeyword("public-political-han-zheng", "韩正", "public", "block"),
    createKeyword("public-political-mao-zedong", "毛泽东", "public", "block"),
    createKeyword("public-political-deng-xiaoping", "邓小平", "public", "block"),
    createKeyword("public-political-jiang-zemin", "江泽民", "public", "block"),
    createKeyword("public-political-hu-jintao", "胡锦涛", "public", "block"),
    createKeyword("public-political-falun", "法轮功", "public", "block"),
    createKeyword("public-ad-qq-group", "QQ群", "public", "block"),
    createKeyword("public-ad-recharge-proxy", "代充", "public", "block"),
    createKeyword("public-ad-brush-recharge", "刷充值", "public", "block"),
    createKeyword("public-abuse-trash-player", "垃圾玩家", "public", "block"),
    createKeyword("custom-ad-spam", "广告群", "custom", "block"),
    createKeyword("whitelist-guild-business", "商会", "whitelist", "allow", "商会")
  ];
};

const normalizeChatKeywordText = (value: string): string => value.normalize("NFKC").toLowerCase().replace(/[\s\u200B-\u200D\uFEFF\p{P}\p{S}_]+/gu, "");

export const maskChatContent = (
  content: string,
  keywords: AdminChatKeywordRecord[]
): { content: string; filterAction: "none" | "mask" | "block"; matchedKeywords: string[] } => {
  const whitelist = keywords.filter((keyword) => keyword.isEnabled && keyword.sourceType === "whitelist");
  const normalizedContent = normalizeChatKeywordText(content);
  const blockedByWhitelist = (keyword: string): boolean => {
    const normalizedKeyword = normalizeChatKeywordText(keyword);
    return whitelist.some((item) => item.keyword === keyword || normalizeChatKeywordText(item.keyword) === normalizedKeyword);
  };
  let nextContent = content;
  const matchedKeywords: string[] = [];
  let filterAction: "none" | "mask" | "block" = "none";

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeChatKeywordText(keyword.keyword);
    const isMatched = content.includes(keyword.keyword) || (normalizedKeyword.length > 0 && normalizedContent.includes(normalizedKeyword));
    if (!keyword.isEnabled || keyword.sourceType === "whitelist" || blockedByWhitelist(keyword.keyword) || !isMatched) {
      continue;
    }

    matchedKeywords.push(keyword.keyword);
    if (keyword.action === "block") {
      filterAction = "block";
      continue;
    }
    if (keyword.action === "mask" && filterAction !== "block") {
      filterAction = "mask";
      nextContent = nextContent.split(keyword.keyword).join(keyword.replacement || "***");
    }
  }

  return { content: nextContent, filterAction, matchedKeywords };
};

const listChatKeywords = (
  keywords: AdminChatKeywordRecord[],
  filters: { keyword: string; sourceType: string; action: string; status: string }
): AdminChatKeywordListRecord => {
  const rows = keywords
    .filter((keyword) => filters.keyword === "" || keyword.keyword.includes(filters.keyword) || keyword.id.includes(filters.keyword))
    .filter((keyword) => filters.sourceType === "" || keyword.sourceType === filters.sourceType)
    .filter((keyword) => filters.action === "" || keyword.action === filters.action)
    .filter((keyword) => filters.status === "" || (filters.status === "enabled" ? keyword.isEnabled : !keyword.isEnabled));

  return {
    rows,
    total: rows.length,
    filters: {
      sourceTypes: ["public", "custom", "whitelist"],
      actions: ["mask", "block", "allow"],
      statuses: ["enabled", "disabled"]
    }
  };
};

const buildMailCenterRecord = (
  profile: { id: string; unreadMailCount: number },
  mails: MailRecord[]
): MailCenterRecord => {
  const sortedMails = [...mails].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return {
    summary: {
      totalCount: sortedMails.length,
      unreadCount: Math.max(0, profile.unreadMailCount)
    },
    filters: {
      channels: ["all", "system", "reward", "compensation"]
    },
    mails: sortedMails.map((mail) => ({
      ...mail,
      isRead: profile.unreadMailCount === 0 ? true : mail.isRead
    }))
  };
};

export const buildChatCenterRecord = (
  profile: PlayerProfileRecord,
  messages: ChatMessageRecord[],
  keywords: AdminChatKeywordRecord[],
  today: string,
  canUseGuild: boolean,
  canUseCross: boolean
): ChatCenterRecord => ({
  channels: [
    { id: "system", label: "系统", description: "系统公告与奖励提醒，只读。", canSend: false, readonlyReason: "系统频道只读", unreadCount: 0 },
    { id: "world", label: "世界", description: "本区玩家交流。", canSend: true, readonlyReason: null, unreadCount: 0 },
    { id: "guild", label: "商会", description: "加入商会后解锁。", canSend: canUseGuild, readonlyReason: canUseGuild ? null : "加入商会后可发言", unreadCount: 0 },
    { id: "cross", label: "跨服", description: "进入跨服分组后解锁。", canSend: canUseCross, readonlyReason: canUseCross ? null : "进入跨服分组后可发言", unreadCount: 0 }
  ],
  messages: [
    {
      id: `system-${profile.serverId}-${today}`,
      channel: "system",
      serverId: profile.serverId,
      profileId: null,
      founderName: "系统",
      content: "经营时钟已同步，邮件奖励待查看。",
      originalContent: "经营时钟已同步，邮件奖励待查看。",
      filterAction: "none",
      matchedKeywords: [],
      createdAt: `${today}T08:00:00.000Z`
    },
    ...messages.filter((message) => message.serverId === profile.serverId || message.channel === "cross").slice(0, 40)
  ],
  keywordPolicy: {
    mode: "local_first",
    source: "公开游戏聊天安全词库",
    license: "CC BY-SA 4.0",
    sourceHash: createHash("sha256").update(keywords.map((keyword) => `${keyword.id}:${keyword.sourceHash}`).join("|")).digest("hex"),
    importBatch: keywords[0]?.importBatch ?? "phase28-public-game-chat-20260522"
  }
});

const parseAdminAuditDetail = (detail: string | null): Record<string, string | number | boolean | null> | null => {
  if (detail === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(detail);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    const entries = Object.entries(parsed).filter(([, value]) => (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ));
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
};

const summarizeAdminAuditDetail = (detailJson: Record<string, string | number | boolean | null> | null, detail: string | null): string => {
  if (detailJson === null) {
    return detail ?? "-";
  }

  const deliveredRewards = detailJson.deliveredRewards;
  const retryLabel = detailJson.isRetry === true ? "重试" : "首次";
  if (typeof deliveredRewards === "number") {
    return `${retryLabel}，发放 ${deliveredRewards} 条奖励`;
  }

  const reason = detailJson.reason;
  return typeof reason === "string" && reason !== "" ? reason : "已记录结构化明细";
};

const toAdminAuditLogRecord = (log: {
  id: string;
  adminUser: { username: string };
  action: string;
  targetType: string;
  targetId: string | null;
  detail: string | null;
  createdAt: Date;
}): AdminAuditLogRecord => {
  const detailJson = parseAdminAuditDetail(log.detail);
  return {
    id: log.id,
    adminUsername: log.adminUser.username,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    detail: log.detail,
    detailJson,
    summary: summarizeAdminAuditDetail(detailJson, log.detail),
    createdAt: log.createdAt.toISOString()
  };
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
  chatKeywords: Array<{
    id: string;
    keyword: string;
    sourceType: ChatKeywordSourceType;
    action: ChatKeywordAction;
    isEnabled: boolean;
    license: string;
    sourceHash: string;
    importBatch: string;
  }>;
  seasons: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
    passPricePlatformCoins: number;
    taskCount: number;
    activityCount: number;
    passPurchaseCount: number;
  }>;
  activities: Array<{
    id: string;
    seasonId: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
    leaderboardKey: string;
    targetScore: number;
    participantCount: number;
    totalScore: number;
    isSettled: boolean;
    deliveredRewards: number;
    rewardLabel: string;
    rewardBoundary: string;
  }>;
  activityShopItems: Array<{
    id: string;
    seasonId: string;
    name: string;
    costPoints: number;
    purchaseLimit: number;
    purchaseCount: number;
    rewardLabel: string;
    isActive: boolean;
  }>;
  seasonPass: Array<{
    seasonId: string;
    pricePlatformCoins: number;
    purchaseCount: number;
    rewardLabel: string;
  }>;
  leaderboardSettlements: Array<{
    boardKey: string;
    snapshotDate: string;
    deliveredRewards: number;
    rewardPlatformCoinsTotal: number;
    rewardBoundary: string;
  }>;
  scenarios: Array<{ id: string; name: string; rewardTitleId: string | null }>;
};

export type AdminMonetizationBoundaryRecord = {
  summary: {
    platformCoinSourceCount: number;
    platformCoinSpendCount: number;
    vipExperienceSourceCount: number;
    paidProductCount: number;
    riskCount: number;
  };
  walletPolicies: Array<{
    id: string;
    flow: "source" | "spend";
    vipExperiencePolicy: string;
    boundaryLabel: string;
  }>;
  paidProductBoundaries: Array<{
    id: string;
    name: string;
    category: string;
    pricePlatformCoins: number;
    rewardType: string;
    vipExperiencePolicy: string;
    leaderboardRewardPolicy: string;
  }>;
  seasonPassBoundary: {
    seasonId: string;
    pricePlatformCoins: number;
    vipExperiencePolicy: string;
    leaderboardRewardPolicy: string;
  };
  activityShopBoundary: {
    itemCount: number;
    platformCoinRewardItemCount: number;
    rewardPolicy: string;
  };
  riskItems: Array<{
    id: string;
    level: AdminOperationConfigAlertLevel;
    message: string;
    suggestion: string;
  }>;
};

export type AdminEconomyAlertRecord = {
  id: string;
  level: AdminOperationConfigAlertLevel;
  type: string;
  targetType: string;
  targetId: string;
  message: string;
  suggestion: string;
};

export type AdminEconomyAlertListRecord = {
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    platformCoinRiskCount: number;
    vipExperienceRiskCount: number;
    offlineCashRiskCount: number;
    settlementRiskCount: number;
    businessClockSyncRiskCount: number;
  };
  checkpoints: Array<{ key: string; label: string; status: "normal" | "warning" | "critical"; value: number }>;
  alerts: AdminEconomyAlertRecord[];
};

export type AdminActivityScheduleRecord = {
  summary: {
    totalActivities: number;
    activeCount: number;
    upcomingCount: number;
    endedCount: number;
    maxConcurrentActive: number;
    rewardBoundaryRiskCount: number;
    missingLeaderboardKeyCount: number;
  };
  windows: Array<{
    date: string;
    activeActivityIds: string[];
    activeActivityNames: string[];
    activeCount: number;
    status: "normal" | "crowded" | "empty";
  }>;
  activities: Array<{
    id: string;
    name: string;
    status: SeasonStatus;
    startDate: string;
    endDate: string;
    leaderboardKey: string;
    rewardLabel: string;
    rewardBoundary: "safe" | "risk";
    riskLabels: string[];
  }>;
  alerts: Array<{
    id: string;
    level: AdminOperationConfigAlertLevel;
    type: string;
    targetId: string;
    message: string;
    suggestion: string;
  }>;
};

export type AdminActivityConfigDraftInput = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  leaderboardKey: string;
  targetScore: number;
  progressMode: ActivityProgressMode;
  progressScore: number;
  dailyProgressLimit: number;
  actionPowerCost: number;
  rewardReputation: number;
  rewardPoints: number;
  rewardTitleId: string | null;
  rewardCash: number;
  rewardPlatformCoins: number;
};

export type AdminActivityConfigDraftStatus = "draft" | "pending_review" | "approved" | "rejected" | "published";

export type AdminActivityConfigDraftValidationRecord = {
  summary: {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
    riskCount: number;
  };
  errors: Array<{
    type: string;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    type: string;
    field: string | null;
    message: string;
    suggestion: string;
  }>;
  riskLabels: string[];
  preview: {
    id: string;
    name: string;
    status: SeasonStatus;
    startDate: string;
    endDate: string;
    leaderboardKey: string;
    targetScore: number;
    progressMode: ActivityProgressMode;
    progressScore: number;
    dailyProgressLimit: number;
    actionPowerCost: number;
    rewardLabel: string;
    concurrentActiveCount: number;
  };
};

export type AdminActivityConfigDraftRecord = {
  id: string;
  activityId: string;
  name: string;
  startDate: string;
  endDate: string;
  leaderboardKey: string;
  targetScore: number;
  progressMode: ActivityProgressMode;
  progressScore: number;
  dailyProgressLimit: number;
  actionPowerCost: number;
  rewardCash: number;
  rewardPlatformCoins: number;
  rewardReputation: number;
  rewardPoints: number;
  rewardTitleId: string | null;
  status: AdminActivityConfigDraftStatus;
  createdByAdminUserId: string;
  updatedByAdminUserId: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByAdminUserId: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  validation: AdminActivityConfigDraftValidationRecord;
};

export type AdminActivityConfigDraftActionRecord = {
  draft: AdminActivityConfigDraftRecord;
  validation: AdminActivityConfigDraftValidationRecord;
  auditLogId: string | null;
};

export type AdminActivityConfigDraftListRecord = {
  rows: AdminActivityConfigDraftRecord[];
  summary: Record<AdminActivityConfigDraftStatus | "total", number>;
};

export type AdminActivityConfigDraftPublishedActivityRecord = {
  id: string;
  seasonId: string;
  name: string;
  startDate: string;
  endDate: string;
  leaderboardKey: string;
  targetScore: number;
  progressMode: ActivityProgressMode;
  progressScore: number;
  dailyProgressLimit: number;
  actionPowerCost: number;
  rewardCash: number;
  rewardReputation: number;
  rewardPoints: number;
  rewardTitleId: string | null;
  sortOrder: number;
};

export type AdminActivityConfigDraftPublishRecord = AdminActivityConfigDraftActionRecord & {
  activity: AdminActivityConfigDraftPublishedActivityRecord;
};

export type AdminActivityPublishObservationRecord = {
  draftId: string;
  activityId: string;
  name: string;
  status: SeasonStatus;
  startDate: string;
  endDate: string;
  leaderboardKey: string;
  participantCount: number;
  totalScore: number;
  isSettled: boolean;
  deliveredRewards: number;
  rewardBoundary: "safe" | "risk";
  riskLabels: string[];
  publishAuditLogId: string | null;
  publishReason: string | null;
  publishedAt: string | null;
  suggestion: string;
};

export type AdminActivityPublishObservationListRecord = {
  summary: {
    total: number;
    published: number;
    rewardRiskCount: number;
    unsettledEndedCount: number;
  };
  rows: AdminActivityPublishObservationRecord[];
};

export type AdminOperationConfigAlertLevel = "critical" | "warning" | "info";
export type AdminOperationConfigAlertStatus = "pending" | "acknowledged" | "ignored";

export type AdminOperationConfigAlertRecord = {
  id: string;
  level: AdminOperationConfigAlertLevel;
  type: string;
  targetType: string;
  targetId: string;
  message: string;
  suggestion: string;
  createdAt: string;
  status: AdminOperationConfigAlertStatus;
  handledBy: string | null;
  handledAt: string | null;
  note: string | null;
};

export type AdminOperationConfigAlertListRecord = {
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    pending: number;
    acknowledged: number;
    ignored: number;
    unsettledActivityCount: number;
    rewardBoundaryRiskCount: number;
  };
  filters: {
    levels: AdminOperationConfigAlertLevel[];
    types: string[];
    targetTypes: string[];
    statuses: AdminOperationConfigAlertStatus[];
  };
  alerts: AdminOperationConfigAlertRecord[];
};

export type AdminOperationConfigAlertActionRecord = {
  alert: AdminOperationConfigAlertRecord;
  auditLogId: string;
};

const OPERATION_CONFIG_ALERT_TARGET_TYPE = "operation_config_alert";

const operationConfigAlertActionByStatus: Record<AdminOperationConfigAlertStatus, string> = {
  pending: "admin_operation_config_alert_reopen",
  acknowledged: "admin_operation_config_alert_ack",
  ignored: "admin_operation_config_alert_ignore"
};

const operationConfigAlertStatusByAction = new Map<string, AdminOperationConfigAlertStatus>(
  Object.entries(operationConfigAlertActionByStatus).map(([status, action]) => [action, status as AdminOperationConfigAlertStatus])
);

type OperationConfigAlertAuditLogSource = {
  id: string;
  adminUser: { username: string };
  action: string;
  targetId: string | null;
  detail: string | null;
  createdAt: Date;
};

const createOperationConfigAlert = (
  alert: Omit<AdminOperationConfigAlertRecord, "status" | "handledBy" | "handledAt" | "note">
): AdminOperationConfigAlertRecord => ({
  ...alert,
  status: "pending",
  handledBy: null,
  handledAt: null,
  note: null
});

const applyOperationConfigAlertHandling = (
  alerts: AdminOperationConfigAlertRecord[],
  logs: OperationConfigAlertAuditLogSource[]
): AdminOperationConfigAlertRecord[] => {
  const latestByAlert = new Map<string, OperationConfigAlertAuditLogSource>();
  for (const log of [...logs].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())) {
    if (log.targetId === null || latestByAlert.has(log.targetId) || !operationConfigAlertStatusByAction.has(log.action)) {
      continue;
    }
    latestByAlert.set(log.targetId, log);
  }

  return alerts.map((alert) => {
    const log = latestByAlert.get(alert.id);
    if (log === undefined) {
      return alert;
    }

    const detailJson = parseAdminAuditDetail(log.detail);
    const status = operationConfigAlertStatusByAction.get(log.action) ?? "pending";
    const note = typeof detailJson?.note === "string" ? detailJson.note : null;
    return {
      ...alert,
      status,
      handledBy: log.adminUser.username,
      handledAt: log.createdAt.toISOString(),
      note
    };
  });
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

export type MailChannel = "system" | "reward" | "compensation";

export type MailRecord = {
  id: string;
  profileId: string;
  channel: MailChannel;
  subject: string;
  body: string;
  rewardSummary: string | null;
  platformCoins: number;
  canClaim: boolean;
  claimStatus: "none" | "claimable" | "claimed";
  statusLabel: string;
  createdAt: string;
  isRead: boolean;
};

export type MailCenterRecord = {
  summary: {
    totalCount: number;
    unreadCount: number;
  };
  filters: {
    channels: Array<"all" | MailChannel>;
  };
  mails: MailRecord[];
};

export type MailReadAllRecord = {
  updatedCount: number;
  mailCenter: MailCenterRecord;
};

export type MailClaimAttachmentsRecord = {
  claimedCount: number;
  platformCoins: number;
  mailCenter: MailCenterRecord;
  profile: PlayerProfileRecord;
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
    commercialEntryClickTotal: number;
    commercialEntryClicks: Array<{ entry: string; count: number }>;
    paidProductEntryClickTotal: number;
    paidProductEntryClicks: Array<{ product: string; count: number }>;
    longTermGoalClickCount: number;
    businessClockBriefingOpenCount: number;
    businessClockTodoHandledCount: number;
  };
  alerts: Array<{ level: string; message: string; traceId: string | null }>;
};

export type AdminBusinessClockObservationRecord = {
  profileId: string;
  serverId: string;
  companyName: string;
  lastSyncedAt: string | null;
  offlineMinutes: number;
  settledMinutes: number;
  cashDelta: number;
  riskStatus: string;
  managerTodoCount: number;
  anomaly: string | null;
};

export type AdminBusinessClockObservationListRecord = {
  summary: {
    totalPlayers: number;
    syncedPlayers: number;
    staleSyncCount: number;
    riskPulseCount: number;
    managerTodoCount: number;
    anomalyCount: number;
  };
  offlineMinuteBands: Array<{ band: string; count: number }>;
  cashDeltaBands: Array<{ band: string; count: number }>;
  rows: AdminBusinessClockObservationRecord[];
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
  battleReport?: CrossServerBattleReportRecord;
};

export type SeasonStatus = "upcoming" | "active" | "ended";
export type ActivityProgressMode = "target" | "leaderboard" | "scenario";

export type ActivityRecapRecord = {
  activityId: string;
  name: string;
  status: SeasonStatus;
  startDate: string;
  endDate: string;
  isSettled: boolean;
  personalRank: number | null;
  personalScore: number;
  rows: LeaderboardRowRecord[];
};

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
  activities: Array<{
    id: string;
    name: string;
    status: SeasonStatus;
    leaderboardKey: string;
    isJoined: boolean;
    score: number;
    targetScore: number;
    progressMode: ActivityProgressMode;
    progressScore: number;
    dailyProgressLimit: number;
    dailyProgressCount: number;
    actionPowerCost: number;
    rewardClaimed: boolean;
    canProgress: boolean;
    progressLockedReason: string | null;
  }>;
  activityBoards: LeaderboardBoardRecord[];
  activityRecaps: ActivityRecapRecord[];
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
  dailyReward: {
    isClaimed: boolean;
    canClaim: boolean;
    rewardReputation: number;
    statusLabel: string;
    actionLabel: string;
  };
  dailyGoals: Array<{
    id: string;
    title: string;
    progress: number;
    target: number;
    isCompleted: boolean;
    statusLabel: string;
    rewardLabel: string;
  }>;
  seasonProgress: {
    completedGoals: number;
    targetGoals: number;
    progressPercent: number;
    statusLabel: string;
  };
  nextReward: {
    title: string;
    conditionLabel: string;
    rewardLabel: string;
    statusLabel: string;
  };
  stageRewards: Array<{
    id: string;
    title: string;
    requiredDailyClaims: number;
    currentDailyClaims: number;
    rewardReputation: number;
    isClaimable: boolean;
    isClaimed: boolean;
    statusLabel: string;
  }>;
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
  battleReport: CrossServerBattleReportRecord;
};

export type CrossServerBattleReportRecord = {
  snapshotDate: string;
  groupName: string;
  serverIds: string[];
  personal: {
    myRank: number | null;
    myValueLabel: string;
    championName: string | null;
    previousGapLabel: string | null;
    nextGapLabel: string | null;
    rewardStatus: "待结算" | "已生成邮件" | "已结算";
    titleStatus: string;
  };
  guild: {
    myGuildRank: number | null;
    myGuildValueLabel: string;
    topGuildName: string | null;
    activeProgressLabel: string;
    rewardStatus: "待结算" | "已生成邮件" | "已结算";
  };
  lines: string[];
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

export type GuildHistoryMemberRecord = {
  profileId: string;
  founderName: string;
  companyName: string;
  rank: number;
  contributionScore: number;
  reputationReward: number;
};

export type GuildHistoryRecord = {
  guild: {
    id: string;
    name: string;
    serverId: string;
  };
  currentTopMembers: GuildHistoryMemberRecord[];
  settlements: Array<{
    snapshotDate: string;
    deliveredRewards: number;
    topMembers: GuildHistoryMemberRecord[];
  }>;
};

export type CrossServerGuildHistoryRecord = {
  guild: {
    id: string;
    name: string;
    serverId: string;
  };
  group: CrossServerGroupRecord | null;
  isRegistered: boolean;
  settlements: Array<{
    snapshotDate: string;
    deliveredRewards: number;
    finalRank: number | null;
    reportLines: string[];
    topGuilds: Array<{
      guildId: string;
      guildName: string;
      serverId: string;
      leaderProfileId: string;
      leaderFounderName: string;
      rank: number;
      reputationReward: number;
    }>;
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

export type PrivilegeDailyClaimRecord = {
  shopCenter: ShopCenterRecord;
  profile: PlayerProfileRecord;
  claim: {
    id: string;
    purchaseId: string;
    claimDate: string;
    rewardCash: number;
    rewardActionPower: number;
    rewardReputation: number;
    rewardItem: ItemRewardRecord | null;
    createdAt: string;
  };
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
  getAdminBusinessClockObservations(today: string): Promise<AdminBusinessClockObservationListRecord>;
  recordApiRequestLog(input: ApiRequestLogInput): Promise<void>;
  findAdminByUsername(username: string): Promise<AdminUserRecord | undefined>;
  createAdminSession(adminUserId: string, token: string): Promise<void>;
  getAdminBySessionToken(token: string): Promise<AdminUserRecord | undefined>;
  listServers(): Promise<ServerRecord[]>;
  listAvatars(): Promise<AvatarRecord[]>;
  getProfile(accountId: string, serverId: string): Promise<PlayerProfileRecord | undefined>;
  createProfile(profile: CreatePlayerProfileInput): Promise<PlayerProfileRecord | "PLAYER_EXISTS">;
  getCompanyGrowth(accountId: string, serverId: string): Promise<CompanyGrowthRecord | "PLAYER_NOT_FOUND">;
  getLongTermGoals(accountId: string, serverId: string, today: string): Promise<LongTermGoalsRecord | "PLAYER_NOT_FOUND">;
  listMails(accountId: string, serverId: string): Promise<MailCenterRecord | "PLAYER_NOT_FOUND">;
  readAllMails(accountId: string, serverId: string): Promise<MailReadAllRecord | "PLAYER_NOT_FOUND">;
  claimMailAttachments(accountId: string, serverId: string): Promise<MailClaimAttachmentsRecord | "PLAYER_NOT_FOUND">;
  getChatCenter(accountId: string, serverId: string, today: string): Promise<ChatCenterRecord | "PLAYER_NOT_FOUND">;
  sendChatMessage(accountId: string, serverId: string, channel: ChatChannelId, content: string, today: string): Promise<{ message: ChatMessageRecord; chat: ChatCenterRecord } | "PLAYER_NOT_FOUND" | "CHAT_CHANNEL_READONLY" | "CHAT_GUILD_REQUIRED" | "CHAT_CROSS_REQUIRED" | "CHAT_CONTENT_BLOCKED">;
  claimFullLevelChest(accountId: string, serverId: string): Promise<CompanyGrowthRecord | "PLAYER_NOT_FOUND" | "FULL_LEVEL_CHEST_NOT_READY">;
  listTasks(accountId: string, serverId: string, today: string): Promise<TaskRecord[] | "PLAYER_NOT_FOUND">;
  advanceTask(accountId: string, serverId: string, taskId: string, today: string, knowledgeId?: string | null): Promise<TaskRecord | "PLAYER_NOT_FOUND" | "TASK_NOT_FOUND" | "TASK_KNOWLEDGE_MISMATCH" | "KNOWLEDGE_LOCKED">;
  claimTask(accountId: string, serverId: string, taskId: string, today: string): Promise<TaskRecord | "PLAYER_NOT_FOUND" | "TASK_NOT_FOUND" | "TASK_INCOMPLETE" | "TASK_ALREADY_CLAIMED">;
  listRandomTasks(accountId: string, serverId: string, today: string): Promise<RandomTaskCenterRecord | "PLAYER_NOT_FOUND">;
  resolveRandomTask(accountId: string, serverId: string, randomTaskId: string, option: "A" | "B", today: string, modifierItemId?: string): Promise<RandomTaskActionRecord | "PLAYER_NOT_FOUND" | "RANDOM_TASK_NOT_FOUND" | "RANDOM_TASK_ALREADY_RESOLVED" | "INSUFFICIENT_ACTION_POWER" | "ITEM_NOT_FOUND" | "ITEM_NOT_USABLE">;
  dismissRandomTask(accountId: string, serverId: string, randomTaskId: string, today: string): Promise<RandomTaskActionRecord | "PLAYER_NOT_FOUND" | "RANDOM_TASK_NOT_FOUND" | "RANDOM_TASK_ALREADY_RESOLVED">;
  getCompanyFinance(accountId: string, serverId: string, now: Date): Promise<CompanyFinanceRecord | "PLAYER_NOT_FOUND">;
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
  applyLoan(accountId: string, serverId: string, loanConfigId: string): Promise<LoanActionRecord | "PLAYER_NOT_FOUND" | "LOAN_NOT_FOUND" | "CREDIT_NOT_ENOUGH" | "LOAN_ALREADY_ACTIVE" | "LOAN_LOCKED">;
  repayLoan(accountId: string, serverId: string, loanId: string, mode: "scheduled" | "full"): Promise<LoanActionRecord | "PLAYER_NOT_FOUND" | "LOAN_NOT_FOUND" | "INSUFFICIENT_CASH">;
  settleLoanPeriod(accountId: string, serverId: string): Promise<LoanActionRecord | "PLAYER_NOT_FOUND" | "NO_ACTIVE_LOAN">;
  resolveCrisis(accountId: string, serverId: string, route: "financing" | "cost_cut" | "restructure"): Promise<LoanCenterRecord | "PLAYER_NOT_FOUND" | "CRISIS_NOT_ACTIVE" | "INVALID_CRISIS_ROUTE">;
  listFundings(accountId: string, serverId: string): Promise<FundingCenterRecord | "PLAYER_NOT_FOUND">;
  startFunding(accountId: string, serverId: string, investorId: string): Promise<FundingActionRecord | "PLAYER_NOT_FOUND" | "INVESTOR_NOT_FOUND" | "FUNDING_LOCKED" | "FUNDING_ALREADY_ACTIVE">;
  settleFunding(accountId: string, serverId: string, fundingId: string): Promise<FundingActionRecord | "PLAYER_NOT_FOUND" | "FUNDING_NOT_FOUND" | "FUNDING_ALREADY_SETTLED" | "FUNDING_LOCKED">;
  reviewFundingLegalTerms(accountId: string, serverId: string, fundingId: string): Promise<FundingActionRecord | "PLAYER_NOT_FOUND" | "FUNDING_NOT_FOUND" | "FUNDING_ALREADY_SETTLED">;
  pauseFundingDisbursement(accountId: string, serverId: string, fundingId: string, reason: string): Promise<FundingActionRecord | "PLAYER_NOT_FOUND" | "FUNDING_NOT_FOUND" | "FUNDING_ALREADY_SETTLED">;
  applyFundingFollowOn(accountId: string, serverId: string, fundingId: string, amount: number, equityBasisPoints: number): Promise<FundingActionRecord | "PLAYER_NOT_FOUND" | "FUNDING_NOT_FOUND" | "FUNDING_LOCKED">;
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
  listShop(accountId: string, serverId: string, today: string): Promise<ShopCenterRecord | "PLAYER_NOT_FOUND">;
  purchaseShopProduct(accountId: string, serverId: string, productId: string, requestId: string, today: string): Promise<ShopPurchaseRecord | "PLAYER_NOT_FOUND" | "SHOP_PRODUCT_NOT_FOUND" | "INSUFFICIENT_PLATFORM_COINS" | "PURCHASE_LIMIT_REACHED">;
  claimPrivilegeDailyReward(accountId: string, serverId: string, purchaseId: string, requestId: string, today: string): Promise<PrivilegeDailyClaimRecord | "PLAYER_NOT_FOUND" | "PRIVILEGE_PURCHASE_NOT_FOUND" | "PRIVILEGE_NOT_DAILY_CLAIMABLE" | "PRIVILEGE_EXPIRED" | "PRIVILEGE_DAILY_ALREADY_CLAIMED">;
  adjustPlatformCoins(adminUserId: string, profileId: string, changeAmount: number, source: PlatformCoinLedgerSource, reason: string): Promise<AdminWalletAdjustmentRecord | "PLAYER_NOT_FOUND" | "INVALID_PLATFORM_COIN_SOURCE" | "INSUFFICIENT_PLATFORM_COINS">;
  reserveExternalPayment(accountId: string, serverId: string, productId: string | null, amountCents: number, platformCoins: number): Promise<ExternalPaymentReservationRecord | "PLAYER_NOT_FOUND">;
  getVipCenter(accountId: string, serverId: string, today: string): Promise<VipCenterRecord | "PLAYER_NOT_FOUND">;
  claimVipDailyGift(accountId: string, serverId: string, today: string): Promise<VipDailyGiftRecord | "PLAYER_NOT_FOUND" | "VIP_DAILY_GIFT_ALREADY_CLAIMED">;
  adjustVipExperience(adminUserId: string, profileId: string, vipExperience: number, reason: string): Promise<AdminVipAdjustmentRecord | "PLAYER_NOT_FOUND">;
  getAdminVipRecord(profileId: string, today: string): Promise<VipCenterRecord | "PLAYER_NOT_FOUND">;
  listVipLevelConfigs(): Promise<VipLevelRecord[]>;
  upsertVipLevelConfig(adminUserId: string, config: VipLevelRecord, reason: string): Promise<AdminVipConfigRecord>;
  listAdminPlayers(keyword: string, today: string): Promise<AdminPlayerListRecord>;
  getAdminConfigCenter(today: string): Promise<AdminConfigCenterRecord>;
  listAdminChatKeywords(filters: { keyword: string; sourceType: string; action: string; status: string }): Promise<AdminChatKeywordListRecord>;
  updateAdminChatKeyword(adminUserId: string, keywordId: string, input: AdminChatKeywordUpdateInput): Promise<AdminChatKeywordUpdateRecord | "CHAT_KEYWORD_NOT_FOUND">;
  getAdminMonetizationBoundaries(today: string): Promise<AdminMonetizationBoundaryRecord>;
  getAdminEconomyAlerts(today: string): Promise<AdminEconomyAlertListRecord>;
  getAdminActivitySchedule(today: string): Promise<AdminActivityScheduleRecord>;
  validateAdminActivityConfigDraft(draft: AdminActivityConfigDraftInput, today: string): Promise<AdminActivityConfigDraftValidationRecord>;
  listAdminActivityConfigDrafts(status: string, today: string): Promise<AdminActivityConfigDraftListRecord>;
  saveAdminActivityConfigDraft(adminUserId: string, draft: AdminActivityConfigDraftInput, today: string): Promise<AdminActivityConfigDraftActionRecord>;
  submitAdminActivityConfigDraft(adminUserId: string, draftId: string, reason: string, today: string): Promise<AdminActivityConfigDraftActionRecord | "ACTIVITY_DRAFT_NOT_FOUND" | "ACTIVITY_DRAFT_VALIDATION_FAILED">;
  reviewAdminActivityConfigDraft(adminUserId: string, draftId: string, status: "approved" | "rejected", reason: string, today: string): Promise<AdminActivityConfigDraftActionRecord | "ACTIVITY_DRAFT_NOT_FOUND" | "ACTIVITY_DRAFT_NOT_PENDING">;
  publishAdminActivityConfigDraft(adminUserId: string, draftId: string, reason: string, today: string): Promise<AdminActivityConfigDraftPublishRecord | "ACTIVITY_DRAFT_NOT_FOUND" | "ACTIVITY_DRAFT_NOT_APPROVED" | "ACTIVITY_DRAFT_VALIDATION_FAILED" | "ACTIVITY_SEASON_NOT_FOUND">;
  getAdminActivityPublishObservations(today: string): Promise<AdminActivityPublishObservationListRecord>;
  getAdminOperationConfigAlerts(today: string): Promise<AdminOperationConfigAlertListRecord>;
  handleAdminOperationConfigAlert(adminUserId: string, alertId: string, status: AdminOperationConfigAlertStatus, note: string, today: string): Promise<AdminOperationConfigAlertActionRecord | "ALERT_NOT_FOUND">;
  listAdminAuditLogs(filters: AdminAuditLogFilters): Promise<AdminAuditLogListRecord>;
  listAdminKnowledgeEntries(filters: { keyword: string; category: string; reviewStatus: string }): Promise<AdminKnowledgeListRecord>;
  updateAdminKnowledgeEntry(adminUserId: string, knowledgeId: string, input: AdminKnowledgeUpdateInput): Promise<AdminKnowledgeUpdateRecord | "KNOWLEDGE_NOT_FOUND">;
  grantAdminTitle(adminUserId: string, profileId: string, titleId: string, reason: string): Promise<AdminTitleActionRecord | "PLAYER_NOT_FOUND" | "TITLE_NOT_FOUND">;
  revokeAdminTitle(adminUserId: string, profileId: string, titleId: string, reason: string): Promise<{ auditLogId: string } | "PLAYER_NOT_FOUND" | "TITLE_NOT_FOUND">;
  sendAdminMailCompensation(adminUserId: string, profileId: string, subject: string, body: string, platformCoins: number, reason: string): Promise<AdminMailCompensationRecord | "PLAYER_NOT_FOUND" | "INSUFFICIENT_PLATFORM_COINS">;
  updateAdminProfileStatus(adminUserId: string, profileId: string, status: "active" | "banned", reason: string): Promise<AdminProfileStatusRecord | "PLAYER_NOT_FOUND">;
  settleAdminLeaderboards(adminUserId: string, serverId: string, today: string, reason: string): Promise<(LeaderboardSettlementRecord & { auditLogId: string }) | "PLAYER_NOT_FOUND">;
  listAdminCrossServerGroups(): Promise<AdminCrossServerGroupListRecord>;
  assignAdminCrossServerGroup(adminUserId: string, serverId: string, groupId: string, reason: string): Promise<AdminCrossServerGroupAssignmentRecord | "SERVER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND">;
  listAdminActivities(today: string): Promise<AdminActivityListRecord>;
  settleAdminActivityLeaderboard(adminUserId: string, activityId: string, today: string, reason: string): Promise<AdminActivitySettlementRecord | "ACTIVITY_NOT_FOUND" | "ACTIVITY_NOT_ENDED">;
  listAdminGuilds(filters: { keyword: string; serverId: string; crossRegistered: string; activeStatus: string }, today: string): Promise<AdminGuildListRecord>;
  getAdminGuildDetail(guildId: string, today: string): Promise<AdminGuildDetailRecord | "GUILD_NOT_FOUND">;
  settleAdminGuildLeaderboard(adminUserId: string, guildId: string, today: string, reason: string): Promise<AdminGuildSettlementRecord | "GUILD_NOT_FOUND" | "PLAYER_NOT_FOUND">;
  settleAdminCrossServerGuild(adminUserId: string, serverId: string, today: string, reason: string): Promise<AdminCrossServerGuildSettlementRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND" | "GUILD_NOT_JOINED">;
  getSeasonCenter(accountId: string, serverId: string, today: string): Promise<SeasonCenterRecord | "PLAYER_NOT_FOUND" | "SEASON_NOT_FOUND">;
  progressSeasonTask(accountId: string, serverId: string, taskId: string, today: string): Promise<SeasonTaskProgressRecord | "PLAYER_NOT_FOUND" | "SEASON_NOT_FOUND" | "SEASON_TASK_NOT_FOUND" | "SEASON_NOT_ACTIVE">;
  purchaseSeasonPass(accountId: string, serverId: string, seasonId: string, requestId: string, today: string): Promise<SeasonPassPurchaseRecord | "PLAYER_NOT_FOUND" | "SEASON_NOT_FOUND" | "SEASON_NOT_ACTIVE" | "INSUFFICIENT_PLATFORM_COINS">;
  joinActivity(accountId: string, serverId: string, activityId: string, today: string): Promise<ActivityActionRecord | "PLAYER_NOT_FOUND" | "ACTIVITY_NOT_FOUND" | "ACTIVITY_NOT_ACTIVE">;
  progressActivity(accountId: string, serverId: string, activityId: string, scoreDelta: number, today: string): Promise<ActivityActionRecord | "PLAYER_NOT_FOUND" | "ACTIVITY_NOT_FOUND" | "ACTIVITY_NOT_JOINED" | "ACTIVITY_NOT_ACTIVE" | "ACTIVITY_TARGET_REACHED" | "ACTIVITY_DAILY_LIMIT_REACHED" | "ACTIVITY_ACTION_POWER_NOT_ENOUGH" | "ACTIVITY_SCENARIO_ONLY">;
  claimActivityReward(accountId: string, serverId: string, activityId: string, today: string): Promise<ActivityActionRecord | "PLAYER_NOT_FOUND" | "ACTIVITY_NOT_FOUND" | "ACTIVITY_NOT_JOINED" | "ACTIVITY_INCOMPLETE" | "ACTIVITY_REWARD_ALREADY_CLAIMED" | "ACTIVITY_NOT_ACTIVE">;
  purchaseActivityShopItem(accountId: string, serverId: string, itemId: string, requestId: string, today: string): Promise<ActivityShopPurchaseRecord | "PLAYER_NOT_FOUND" | "SEASON_NOT_FOUND" | "ACTIVITY_SHOP_ITEM_NOT_FOUND" | "INSUFFICIENT_ACTIVITY_POINTS" | "PURCHASE_LIMIT_REACHED">;
  startScenario(accountId: string, serverId: string, scenarioId: string): Promise<ScenarioRunRecord | "PLAYER_NOT_FOUND" | "SCENARIO_NOT_FOUND">;
  settleScenario(accountId: string, serverId: string, runId: string, choices: string[]): Promise<ScenarioRunRecord | "PLAYER_NOT_FOUND" | "SCENARIO_RUN_NOT_FOUND">;
  getLeaderboards(accountId: string, serverId: string, today: string): Promise<LeaderboardCenterRecord | "PLAYER_NOT_FOUND">;
  settleLeaderboardRewards(accountId: string, serverId: string, today: string): Promise<LeaderboardSettlementRecord | "PLAYER_NOT_FOUND">;
  getCrossServerCenter(accountId: string, serverId: string, today: string): Promise<CrossServerCenterRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND">;
  getCrossServerGuildHistory(accountId: string, serverId: string): Promise<CrossServerGuildHistoryRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND" | "GUILD_NOT_JOINED">;
  registerCrossServer(accountId: string, serverId: string, today: string): Promise<CrossServerCenterRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND">;
  settleCrossServerRewards(accountId: string, serverId: string, today: string): Promise<LeaderboardSettlementRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND">;
  claimCrossServerDailyReward(accountId: string, serverId: string, today: string): Promise<{ deliveredRewards: number; rewardReputation: number; crossServer: CrossServerCenterRecord } | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND" | "CROSS_SERVER_NOT_REGISTERED">;
  claimCrossServerStageReward(accountId: string, serverId: string, stageId: string, today: string): Promise<{ deliveredRewards: number; rewardReputation: number; crossServer: CrossServerCenterRecord } | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND" | "CROSS_SERVER_NOT_REGISTERED" | "CROSS_STAGE_REWARD_NOT_FOUND" | "CROSS_STAGE_REWARD_NOT_READY">;
  registerCrossServerGuild(accountId: string, serverId: string, today: string): Promise<CrossServerCenterRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND" | "GUILD_NOT_JOINED" | "GUILD_PERMISSION_DENIED" | "GUILD_SEASON_REQUIREMENT_NOT_MET">;
  settleCrossServerGuildRewards(accountId: string, serverId: string, today: string): Promise<CrossServerGuildSettlementRecord | "PLAYER_NOT_FOUND" | "CROSS_SERVER_GROUP_NOT_FOUND" | "GUILD_NOT_JOINED">;
  listTitles(accountId: string, serverId: string, today: string): Promise<TitleCenterRecord | "PLAYER_NOT_FOUND">;
  equipTitle(accountId: string, serverId: string, titleId: string, today: string): Promise<TitleCenterRecord | "PLAYER_NOT_FOUND" | "TITLE_NOT_FOUND" | "TITLE_EXPIRED">;
  listAchievements(accountId: string, serverId: string): Promise<AchievementRecord[] | "PLAYER_NOT_FOUND">;
  claimAchievement(accountId: string, serverId: string, achievementId: string): Promise<AchievementClaimRecord | "PLAYER_NOT_FOUND" | "ACHIEVEMENT_NOT_FOUND" | "ACHIEVEMENT_INCOMPLETE" | "ACHIEVEMENT_ALREADY_CLAIMED">;
  listKnowledge(accountId: string, serverId: string): Promise<KnowledgeEntryRecord[] | "PLAYER_NOT_FOUND">;
  getGuildCenter(accountId: string, serverId: string, today: string): Promise<GuildCenterRecord | "PLAYER_NOT_FOUND">;
  getGuildHistory(accountId: string, serverId: string): Promise<GuildHistoryRecord | "PLAYER_NOT_FOUND" | "GUILD_NOT_JOINED">;
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
  businessClockSyncedAt: Date | null;
  lastBusinessPulseSummaryJson: string | null;
  createdAt: Date;
}): PlayerProfileRecord => ({
  ...profile,
  actionPowerRecoveredAt: profile.actionPowerRecoveredAt.toISOString(),
  businessClockSyncedAt: profile.businessClockSyncedAt?.toISOString() ?? null,
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
  sourceKey: string;
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
  sourceKey: event.sourceKey,
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

const LOAN_PERIOD_TICKS = 72;

const readLoanNextDueTicks = (loan: { status: string; periodProgressTicks: number }): number => {
  if (loan.status === "settled" || loan.status === "overdue") {
    return 0;
  }
  return Math.max(0, LOAN_PERIOD_TICKS - loan.periodProgressTicks);
};

const readLoanNextDueText = (loan: { status: string; periodProgressTicks: number }): string => {
  if (loan.status === "overdue") {
    return "已逾期";
  }
  if (loan.status === "settled") {
    return "已结清";
  }
  const nextDueTicks = readLoanNextDueTicks(loan);
  return nextDueTicks <= 0 ? "已到期" : `还差 ${nextDueTicks} 次经营脉冲`;
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
  onTimeRepayPeriods: number;
  periodProgressTicks: number;
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
  onTimeRepayPeriods: loan.onTimeRepayPeriods,
  periodProgressTicks: loan.periodProgressTicks,
  nextDueTicks: readLoanNextDueTicks(loan),
  nextDueText: readLoanNextDueText(loan),
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
  offerType: string;
  offerStatus: string;
  paymentStatus: string;
  disbursementStatus: string;
  legalReviewStatus: string;
  postEventStatus: string;
  followOnSequence: number;
  followOnCount: number;
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
  offerType: funding.offerType === "follow_on" ? "follow_on" : "initial",
  offerStatus: funding.offerStatus,
  paymentStatus: funding.paymentStatus,
  disbursementStatus: funding.disbursementStatus,
  legalReviewStatus: funding.legalReviewStatus,
  postEventStatus: funding.postEventStatus,
  followOnSequence: funding.followOnSequence,
  followOnCount: funding.followOnCount,
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

const loanApplicationImpact = (config: {
  principal: number;
  monthlyPayment: number;
  termMonths: number;
  annualRateBasisPoints: number;
  isHighRisk: boolean;
  purposeTag: string;
}): string[] => {
  const impact = [
    `现金 +${config.principal.toLocaleString("zh-CN")}`,
    `月供 ${config.monthlyPayment.toLocaleString("zh-CN")}`,
    `期限 ${config.termMonths}期`
  ];
  if (config.annualRateBasisPoints >= 1200) {
    impact.push("月供压力高");
  }
  if (config.isHighRisk) {
    impact.push("高风险");
  }
  impact.push(config.purposeTag);
  impact.push("逾期会降信用");
  return impact;
};

const evaluateLoanGate = (
  profile: PlayerProfileRecord,
  finance: CompanyFinanceRecord,
  config: {
    creditRequired: string;
    minCompanyLevel: number;
    minMonthlyIncome: number;
    minNetCashFlow: number;
    maxDebtRatioBasisPoints: number;
    requiresCrisis: boolean;
    requiresOverdue: boolean;
    requiresActiveLoan: boolean;
  },
  context: { hasActiveLoan: boolean; hasAnyActiveLoan: boolean; hasOverdueLoan: boolean; crisisLevel: LoanCenterRecord["crisis"]["level"] }
): { isAvailable: boolean; lockedReason: string | null } => {
  const blockers = [
    context.hasActiveLoan ? "同类未结清" : null,
    creditRank(profile.creditRating) < creditRank(config.creditRequired) ? "信用不足" : null,
    profile.companyLevel < config.minCompanyLevel ? "公司等级不足" : null,
    finance.monthlyIncome < config.minMonthlyIncome ? "月收入不足" : null,
    finance.netCashFlow < config.minNetCashFlow ? "现金流不足" : null,
    finance.debtRatioBasisPoints >= config.maxDebtRatioBasisPoints ? "负债率过高" : null,
    config.requiresCrisis && context.crisisLevel === "none" ? "尚未进入危机场景" : null,
    config.requiresOverdue && !context.hasOverdueLoan ? "尚未出现逾期" : null,
    config.requiresActiveLoan && !context.hasAnyActiveLoan ? "需要已有贷款" : null
  ].filter((item): item is string => item !== null);

  return {
    isAvailable: blockers.length === 0,
    lockedReason: blockers[0] ?? null
  };
};

type FundingProductMetrics = {
  activeProductCount: number;
  monthlyRevenue: number;
  maxRetentionBasisPoints: number;
  maxPayRateBasisPoints: number;
};

const calculateFundingProductMetrics = (products: Array<{
  status: string;
  monthlyRevenue: number;
  retentionBasisPoints: number;
  payRateBasisPoints: number;
}>): FundingProductMetrics => {
  const activeProducts = products.filter((product) => product.status !== "closed");
  return {
    activeProductCount: activeProducts.length,
    monthlyRevenue: activeProducts.reduce((total, product) => total + product.monthlyRevenue, 0),
    maxRetentionBasisPoints: activeProducts.reduce((max, product) => Math.max(max, product.retentionBasisPoints), 0),
    maxPayRateBasisPoints: activeProducts.reduce((max, product) => Math.max(max, product.payRateBasisPoints), 0)
  };
};

const shouldCreatePostFundingEvent = (funding: { boardPressure: number; offerType: string }): boolean =>
  funding.offerType === "follow_on" || funding.boardPressure >= 12;

const fundingSettlementRoll = (investorId: string): number => {
  let hash = 0;
  for (const character of investorId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash % 100;
};

const calculateFundingOffer = (
  profile: PlayerProfileRecord,
  productMetrics: FundingProductMetrics,
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
    minProductCount: number;
    minMonthlyIncome: number;
    minRetentionBasisPoints: number;
    minPayRateBasisPoints: number;
    minValuation: number;
    minReputation: number;
    minCompanyLevel: number;
    requiresLegalReview: boolean;
    allowFollowOn: boolean;
    boardPressure: number;
    term: string;
    summary: string;
  },
  fundedInvestorCounts: Map<string, number>,
  activeInvestorIds: Set<string>
): FundingOfferRecord => {
  const finance = toCompanyFinanceRecord(profile);
  const reputationBonus = clamp(Math.floor((profile.reputation - 1000000) / 100000), -8, 8);
  const cashflowBonus = finance.netCashFlow >= 300000 ? 6 : finance.netCashFlow >= 0 ? 3 : -10;
  const productBonus = clamp(Math.floor(productMetrics.monthlyRevenue / 300000), 0, 10);
  const retentionBonus = productMetrics.maxRetentionBasisPoints >= 6000 ? 6 : productMetrics.maxRetentionBasisPoints >= 4500 ? 3 : 0;
  const payRateBonus = productMetrics.maxPayRateBasisPoints >= 800 ? 4 : productMetrics.maxPayRateBasisPoints >= 500 ? 2 : 0;
  const debtPenalty = Math.ceil(finance.debtRatioBasisPoints / 1000) * 4;
  const creditPenalty = profile.creditRating === "A" ? 0 : profile.creditRating === "B" ? 8 : profile.creditRating === "C" ? 18 : 30;
  const riskPenalty = finance.riskStatus === "稳健" ? 0 : finance.riskStatus === "预警" ? 8 : 16;
  const successRate = clamp(
    config.successRateBase + reputationBonus + cashflowBonus + productBonus + retentionBonus + payRateBonus - debtPenalty - creditPenalty - riskPenalty,
    5,
    95
  );
  const debtPressureBasisPoints = Math.min(3000, Math.max(0, finance.debtRatioBasisPoints - 2000));
  const valuationBasisPoints = Math.max(6000, config.valuationMultiplierBasisPoints - debtPressureBasisPoints);
  const preMoneyValuation = Math.max(1000000, Math.round((profile.valuation * valuationBasisPoints) / 10000));
  const postMoneyValuation = preMoneyValuation + config.ticketSize;
  const isDebtAcceptable = finance.debtRatioBasisPoints <= config.debtToleranceBasisPoints;
  const isEquityEnough = profile.founderEquityBasisPoints > config.equityBasisPoints;
  const fundedCount = fundedInvestorCounts.get(config.id) ?? 0;
  const isFollowOn = fundedCount > 0;
  const isInvestorAvailable = !activeInvestorIds.has(config.id) && (fundedCount === 0 || config.allowFollowOn);
  const hasProductCount = productMetrics.activeProductCount >= config.minProductCount;
  const hasMonthlyIncome = profile.monthlyIncome >= config.minMonthlyIncome;
  const hasRetention = productMetrics.maxRetentionBasisPoints >= config.minRetentionBasisPoints;
  const hasPayRate = productMetrics.maxPayRateBasisPoints >= config.minPayRateBasisPoints;
  const hasValuation = profile.valuation >= config.minValuation;
  const hasReputation = profile.reputation >= config.minReputation;
  const hasCompanyLevel = profile.companyLevel >= config.minCompanyLevel;
  const isBridgeInvestor = config.id === "crisis-bridge-capital";
  const hasBridgeNeed =
    !isBridgeInvestor ||
    finance.netCashFlow < 0 ||
    finance.riskStatus !== "稳健" ||
    finance.debtRatioBasisPoints >= 2000 ||
    profile.cash < profile.monthlyExpense * 2;
  const isAvailable =
    isInvestorAvailable &&
    isDebtAcceptable &&
    isEquityEnough &&
    hasProductCount &&
    hasMonthlyIncome &&
    hasRetention &&
    hasPayRate &&
    hasValuation &&
    hasReputation &&
    hasCompanyLevel &&
    hasBridgeNeed;
  const blockers = [
    activeInvestorIds.has(config.id) ? { code: "active_funding", message: "已有进行中的融资谈判" } : undefined,
    fundedCount > 0 && !config.allowFollowOn ? { code: "round_completed", message: "本轮已完成" } : undefined,
    !isEquityEnough ? { code: "founder_equity", message: "创始人股权不足" } : undefined,
    !isDebtAcceptable ? { code: "debt_ratio", message: "负债率过高，条款暂不可接受" } : undefined,
    !hasProductCount ? { code: "product_count", message: "产品线数量不足" } : undefined,
    !hasMonthlyIncome ? { code: "monthly_income", message: "月收入未达投资人门槛" } : undefined,
    !hasRetention ? { code: "retention", message: "产品留存率未达投资人门槛" } : undefined,
    !hasPayRate ? { code: "pay_rate", message: "产品付费率未达投资人门槛" } : undefined,
    !hasValuation ? { code: "valuation", message: "估值未达投资人门槛" } : undefined,
    !hasReputation ? { code: "reputation", message: "声望未达投资人门槛" } : undefined,
    !hasCompanyLevel ? { code: "company_level", message: "公司等级未达投资人门槛" } : undefined,
    !hasBridgeNeed ? { code: "bridge_need", message: "现金流尚未进入桥接场景" } : undefined
  ].filter((blocker): blocker is { code: string; message: string } => blocker !== undefined);

  return {
    id: config.id,
    roundName: isFollowOn ? `${config.roundName}加投` : config.roundName,
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
    offerType: isFollowOn ? "follow_on" : "initial",
    followOnSequence: fundedCount,
    gate: {
      minCompanyLevel: config.minCompanyLevel,
      minReputation: config.minReputation,
      maxDebtRatioBasisPoints: config.debtToleranceBasisPoints,
      minFounderEquityBasisPoints: config.equityBasisPoints + 1,
      requiresLegalReview: config.requiresLegalReview
    },
    gateStatus: {
      isAvailable,
      blockers
    },
    isAvailable,
    lockedReason: activeInvestorIds.has(config.id)
      ? "已有进行中的融资谈判"
      : fundedCount > 0 && !config.allowFollowOn
        ? "本轮已完成"
      : !isEquityEnough
        ? "创始人股权不足"
        : !isDebtAcceptable
          ? "负债率过高，条款暂不可接受"
          : !hasProductCount
            ? "产品线数量不足"
            : !hasMonthlyIncome
              ? "月收入未达投资人门槛"
              : !hasRetention
                ? "产品留存率未达投资人门槛"
                : !hasPayRate
                  ? "产品付费率未达投资人门槛"
                  : !hasValuation
                    ? "估值未达投资人门槛"
                    : !hasReputation
                      ? "声望未达投资人门槛"
                      : !hasCompanyLevel
                        ? "公司等级未达投资人门槛"
                        : !hasBridgeNeed
                          ? "现金流尚未进入桥接场景"
                          : null
  };
};

const toFundingCenterRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord
): Promise<FundingCenterRecord> => {
  const [configs, fundings, products] = await Promise.all([
    prisma.investorConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.playerFunding.findMany({
      where: { profileId: profile.id },
      orderBy: [{ createdAt: "desc" }]
    }),
    prisma.playerProduct.findMany({
      where: { profileId: profile.id }
    })
  ]);
  const fundedInvestorCounts = new Map<string, number>();
  for (const funding of fundings.filter((funding) => funding.status === "funded")) {
    fundedInvestorCounts.set(funding.investorId, (fundedInvestorCounts.get(funding.investorId) ?? 0) + 1);
  }
  const activeInvestorIds = new Set(fundings.filter((funding) => funding.status === "pending").map((funding) => funding.investorId));
  const productMetrics = calculateFundingProductMetrics(products);

  return {
    offers: configs.map((config) => calculateFundingOffer(profile, productMetrics, config, fundedInvestorCounts, activeInvestorIds)),
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
  source === "mail_reward_claim" ||
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

const isActiveShopPurchase = (expiresAt: Date | null | undefined, now: Date): boolean =>
  expiresAt === null || expiresAt === undefined || expiresAt >= now;
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const toServerDate = (today: string): Date => new Date(`${today}T00:00:00.000Z`);
const isPrivilegeProductCategory = (category: string): boolean =>
  category === "weekly_card" || category === "monthly_card" || category === "growth_fund";
const resolveShopPurchaseExpiresAt = (
  createdAt: Date,
  durationDays: number,
  expiresAt: Date | null | undefined
): Date | null => expiresAt ?? (durationDays > 0 ? addDays(createdAt, durationDays) : null);
const isDailyClaimPrivilegeProduct = (product: { category: string; durationDays: number }): boolean =>
  isPrivilegeProductCategory(product.category) && product.durationDays > 0;
const toShopPurchaseRecord = (
  purchase: {
    id: string;
    productId: string;
    requestId: string;
    pricePlatformCoins: number;
    rewardCash: number;
    rewardActionPower: number;
    rewardReputation: number;
    createdAt: Date;
    expiresAt: Date | null;
  },
  product: {
    category: string;
    durationDays: number;
    rewardCash: number;
    rewardActionPower: number;
    rewardReputation: number;
    rewardItemQuantity: number;
    rewardItem?: { id: string; name: string } | null;
  },
  today = new Date().toISOString().slice(0, 10),
  state: { isClaimableToday?: boolean; isClaimedToday?: boolean } = {}
): ShopCenterRecord["purchases"][number] => {
  const expiresAt = resolveShopPurchaseExpiresAt(purchase.createdAt, product.durationDays, purchase.expiresAt);
  const isPrivilege = isPrivilegeProductCategory(product.category);
  const isDailyClaimableProduct = isDailyClaimPrivilegeProduct(product);
  const isActive = isActiveShopPurchase(expiresAt, toServerDate(today));
  const isClaimedToday = state.isClaimedToday ?? false;
  const isClaimableToday = state.isClaimableToday ?? (isDailyClaimableProduct && isActive && !isClaimedToday);
  return {
    id: purchase.id,
    productId: purchase.productId,
    requestId: purchase.requestId,
    pricePlatformCoins: purchase.pricePlatformCoins,
    createdAt: purchase.createdAt.toISOString(),
    expiresAt: expiresAt?.toISOString() ?? null,
    isPrivilege,
    isActive,
    isClaimableToday,
    isClaimedToday,
    claimStatus: !isPrivilege
      ? "not_privilege"
      : !isDailyClaimableProduct
        ? "instant"
        : !isActive
          ? "expired"
          : isClaimedToday
            ? "claimed"
            : "claimable",
    rewardCash: product.rewardCash,
    rewardActionPower: product.rewardActionPower,
    rewardReputation: product.rewardReputation,
    rewardItem: toItemRewardRecord(product.rewardItem, product.rewardItemQuantity)
  };
};

const toShopCenterRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord,
  today: string
): Promise<ShopCenterRecord> => {
  const wallet = await toPlatformWalletRecord(prisma, profile);
  const now = toServerDate(today);
  const [products, purchases, dailyClaims] = await Promise.all([
    prisma.shopProductConfig.findMany({
      where: { isActive: true },
      include: { rewardItem: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    }),
    prisma.playerShopPurchase.findMany({
      where: { profileId: profile.id },
      orderBy: [{ createdAt: "desc" }]
    }),
    prisma.playerPrivilegeDailyClaim.findMany({
      where: { profileId: profile.id, claimDate: today }
    })
  ]);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const claimedPurchaseIds = new Set(dailyClaims.map((claim) => claim.purchaseId));
  const purchaseCounts = purchases.reduce<Map<string, number>>((counts, purchase) => {
    const product = productsById.get(purchase.productId);
    const expiresAt = resolveShopPurchaseExpiresAt(purchase.createdAt, product?.durationDays ?? 0, purchase.expiresAt);
    if (product?.durationDays !== undefined && product.durationDays > 0 && !isActiveShopPurchase(expiresAt, now)) {
      return counts;
    }
    counts.set(purchase.productId, (counts.get(purchase.productId) ?? 0) + 1);
    return counts;
  }, new Map());

  return {
    wallet,
    products: products.map((product) => toShopProductRecord(product, wallet.balance, purchaseCounts.get(product.id) ?? 0)),
    purchases: purchases.map((purchase) => {
      const product = productsById.get(purchase.productId);
      const isClaimedToday = claimedPurchaseIds.has(purchase.id);
      return toShopPurchaseRecord(purchase, product ?? { category: "", durationDays: 0, rewardCash: purchase.rewardCash, rewardActionPower: purchase.rewardActionPower, rewardReputation: purchase.rewardReputation, rewardItemQuantity: 0, rewardItem: null }, today, { isClaimedToday });
    })
  };
};

const readSeasonStatus = (startDate: string, endDate: string, today: string): SeasonStatus => {
  if (today < startDate) {
    return "upcoming";
  }
  return today > endDate ? "ended" : "active";
};

const readActivityProgressMode = (mode: string): ActivityProgressMode =>
  mode === "leaderboard" || mode === "scenario" ? mode : "target";

const getActivityDailyProgressCount = (state: { dailyProgressDate: string | null; dailyProgressCount: number } | undefined, today: string): number =>
  state?.dailyProgressDate === today ? state.dailyProgressCount : 0;

const getActivityDisplayScore = (
  activity: { progressMode: string; targetScore: number } | null,
  score: number
): number => activity !== null && readActivityProgressMode(activity.progressMode) === "target"
  ? Math.min(score, activity.targetScore)
  : score;

const getActivityProgressLock = (
  activity: { progressMode: string; targetScore: number; dailyProgressLimit: number; actionPowerCost: number },
  state: { isJoined: boolean; score: number; dailyProgressDate: string | null; dailyProgressCount: number } | undefined,
  profile: Pick<PlayerProfileRecord, "actionPower">,
  today: string,
  status: SeasonStatus
): string | null => {
  const mode = readActivityProgressMode(activity.progressMode);
  if (status !== "active") return "活动未开放";
  if (state === undefined || !state.isJoined) return "先报名";
  if (mode === "scenario") return "剧本结算";
  if (mode === "target" && state.score >= activity.targetScore) return "目标已达成";
  if (activity.dailyProgressLimit > 0 && getActivityDailyProgressCount(state, today) >= activity.dailyProgressLimit) return "今日次数已用完";
  if (activity.actionPowerCost > 0 && profile.actionPower < activity.actionPowerCost) return "行动力不足";
  return null;
};

const calculateActivityScoreIncrement = (
  activity: { progressMode: string; targetScore: number; progressScore: number },
  state: { score: number }
): number => {
  const progressScore = Math.max(1, activity.progressScore);
  return readActivityProgressMode(activity.progressMode) === "target"
    ? Math.max(0, Math.min(progressScore, activity.targetScore - state.score))
    : progressScore;
};

const ACTIVITY_SCHEDULE_MAX_RECOMMENDED_ACTIVE = 3;

type ActivityScheduleConfigLike = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  leaderboardKey: string;
  progressMode?: string;
  dailyProgressLimit?: number;
  actionPowerCost?: number;
  rewardCash: number;
  rewardReputation: number;
  rewardPoints: number;
  rewardTitleId: string | null;
};

type ActivityDraftExistingConfigLike = ActivityScheduleConfigLike & {
  targetScore: number;
  progressMode: string;
  progressScore: number;
  dailyProgressLimit: number;
  actionPowerCost: number;
};

type ActivityConfigDraftSource = Omit<AdminActivityConfigDraftInput, "progressMode"> & {
  progressMode: string;
  draftId: string;
  status: AdminActivityConfigDraftStatus;
  createdByAdminUserId: string;
  updatedByAdminUserId: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByAdminUserId: string | null;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const addUtcDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const formatUtcDate = (date: Date): string => date.toISOString().slice(0, 10);

export const buildAdminActivitySchedule = (
  activities: ActivityScheduleConfigLike[],
  today: string,
  platformCoinRewardBoardKeys: Set<string>
): AdminActivityScheduleRecord => {
  const orderedActivities = [...activities].sort((left, right) => left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id));
  const activityRecords = orderedActivities.map((activity) => {
    const riskLabels = [
      activity.rewardCash > 0 ? "cash_reward_configured" : "",
      platformCoinRewardBoardKeys.has(activity.leaderboardKey) ? "platform_coin_delivery_found" : "",
      activity.leaderboardKey.trim() === "" ? "missing_leaderboard_key" : ""
    ].filter(Boolean);
    const rewardLabel = [
      activity.rewardReputation > 0 ? `声望 +${activity.rewardReputation}` : "",
      activity.rewardPoints > 0 ? `活动积分 +${activity.rewardPoints}` : "",
      activity.rewardTitleId !== null ? `称号 ${activity.rewardTitleId}` : ""
    ].filter(Boolean).join(" / ") || "荣誉奖励";

    return {
      id: activity.id,
      name: activity.name,
      status: readSeasonStatus(activity.startDate, activity.endDate, today),
      startDate: activity.startDate,
      endDate: activity.endDate,
      leaderboardKey: activity.leaderboardKey,
      rewardLabel,
      rewardBoundary: riskLabels.length > 0 ? "risk" as const : "safe" as const,
      riskLabels
    };
  });
  const minStartDate = orderedActivities[0]?.startDate ?? today;
  const maxEndDate = orderedActivities.reduce((latest, activity) => activity.endDate > latest ? activity.endDate : latest, minStartDate);
  const windows: AdminActivityScheduleRecord["windows"] = [];
  for (let date = new Date(`${minStartDate}T00:00:00.000Z`); formatUtcDate(date) <= maxEndDate; date = addUtcDays(date, 1)) {
    const currentDate = formatUtcDate(date);
    const activeActivities = orderedActivities.filter((activity) => activity.startDate <= currentDate && currentDate <= activity.endDate);
    windows.push({
      date: currentDate,
      activeActivityIds: activeActivities.map((activity) => activity.id),
      activeActivityNames: activeActivities.map((activity) => activity.name),
      activeCount: activeActivities.length,
      status: activeActivities.length === 0 ? "empty" : activeActivities.length > ACTIVITY_SCHEDULE_MAX_RECOMMENDED_ACTIVE ? "crowded" : "normal"
    });
  }
  const maxConcurrentActive = windows.reduce((max, window) => Math.max(max, window.activeCount), 0);
  const alerts: AdminActivityScheduleRecord["alerts"] = [];
  const firstCrowdedWindow = windows.find((window) => window.status === "crowded");
  if (firstCrowdedWindow !== undefined) {
    alerts.push({
      id: `activity-schedule-crowded:${firstCrowdedWindow.date}`,
      level: "warning",
      type: "activity_schedule_crowded",
      targetId: firstCrowdedWindow.date,
      message: `${firstCrowdedWindow.date} 有 ${firstCrowdedWindow.activeCount} 个活动同期开启。`,
      suggestion: "后续活动配置建议错峰排期，保持同时进行活动数量不超过 3 个。"
    });
  }
  for (const activity of activityRecords) {
    if (activity.rewardBoundary === "risk") {
      alerts.push({
        id: `activity-reward-boundary:${activity.id}`,
        level: "critical",
        type: "reward_boundary_risk",
        targetId: activity.id,
        message: `活动 ${activity.name} 存在奖励边界风险。`,
        suggestion: "活动榜奖励保持声望、称号、外观券或碎片，不进入现金或平台币链路。"
      });
    }
    if (activity.leaderboardKey.trim() === "") {
      alerts.push({
        id: `activity-missing-board:${activity.id}`,
        level: "critical",
        type: "activity_missing_leaderboard_key",
        targetId: activity.id,
        message: `活动 ${activity.name} 缺少活动榜 key。`,
        suggestion: "补齐活动榜 key 后再开放活动榜展示和结算。"
      });
    }
  }
  if (!orderedActivities.some((activity) => activity.endDate >= today)) {
    alerts.push({
      id: `activity-no-upcoming:${today}`,
      level: "info",
      type: "activity_no_upcoming",
      targetId: today,
      message: "当前日期之后没有可轮换活动。",
      suggestion: "补充下一轮活动配置，避免活动页长期无运营内容。"
    });
  }

  return {
    summary: {
      totalActivities: activityRecords.length,
      activeCount: activityRecords.filter((activity) => activity.status === "active").length,
      upcomingCount: activityRecords.filter((activity) => activity.status === "upcoming").length,
      endedCount: activityRecords.filter((activity) => activity.status === "ended").length,
      maxConcurrentActive,
      rewardBoundaryRiskCount: activityRecords.filter((activity) => activity.rewardBoundary === "risk").length,
      missingLeaderboardKeyCount: activityRecords.filter((activity) => activity.leaderboardKey.trim() === "").length
    },
    windows,
    activities: activityRecords,
    alerts
  };
};

const isDateString = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && formatUtcDate(date) === value;
};

export const validateAdminActivityConfigDraft = (
  draft: AdminActivityConfigDraftInput,
  existingActivities: ActivityDraftExistingConfigLike[],
  today: string
): AdminActivityConfigDraftValidationRecord => {
  const errors: AdminActivityConfigDraftValidationRecord["errors"] = [];
  const warnings: AdminActivityConfigDraftValidationRecord["warnings"] = [];
  const riskLabels = [
    draft.rewardCash > 0 ? "cash_reward_configured" : "",
    draft.rewardPlatformCoins > 0 ? "platform_coin_reward_configured" : ""
  ].filter(Boolean);
  const pushError = (type: string, field: string, message: string) => {
    errors.push({ type, field, message });
  };
  const pushWarning = (type: string, field: string | null, message: string, suggestion: string) => {
    warnings.push({ type, field, message, suggestion });
  };

  if (!/^[a-z0-9-]{3,64}$/.test(draft.id)) {
    pushError("invalid_activity_id", "id", "活动 ID 只能使用小写字母、数字和短横线，长度 3 到 64。");
  }
  if (existingActivities.some((activity) => activity.id === draft.id)) {
    pushError("activity_id_exists", "id", "活动 ID 已存在。");
  }
  if (draft.name.trim() === "") {
    pushError("missing_name", "name", "活动名称不能为空。");
  }
  if (!isDateString(draft.startDate)) {
    pushError("invalid_start_date", "startDate", "开始日期必须是 YYYY-MM-DD。");
  }
  if (!isDateString(draft.endDate)) {
    pushError("invalid_end_date", "endDate", "结束日期必须是 YYYY-MM-DD。");
  }
  if (isDateString(draft.startDate) && isDateString(draft.endDate) && draft.startDate > draft.endDate) {
    pushError("invalid_date_range", "endDate", "结束日期不能早于开始日期。");
  }
  if (draft.leaderboardKey.trim() === "") {
    pushError("missing_leaderboard_key", "leaderboardKey", "活动榜 key 不能为空。");
  }
  if (draft.leaderboardKey.trim() !== "" && existingActivities.some((activity) => activity.leaderboardKey === draft.leaderboardKey)) {
    pushError("leaderboard_key_exists", "leaderboardKey", "活动榜 key 已存在。");
  }
  if (!Number.isInteger(draft.targetScore) || draft.targetScore <= 0) {
    pushError("invalid_target_score", "targetScore", "目标分必须是大于 0 的整数。");
  }
  if (!["target", "leaderboard", "scenario"].includes(draft.progressMode)) {
    pushError("invalid_progress_mode", "progressMode", "活动类型必须是 target、leaderboard 或 scenario。");
  }
  if (!Number.isInteger(draft.progressScore) || draft.progressScore <= 0) {
    pushError("invalid_progress_score", "progressScore", "单次推进分必须是大于 0 的整数。");
  }
  if (!Number.isInteger(draft.dailyProgressLimit) || draft.dailyProgressLimit < 0) {
    pushError("invalid_daily_progress_limit", "dailyProgressLimit", "每日推进次数不能小于 0。");
  }
  if (draft.progressMode !== "target" && draft.dailyProgressLimit <= 0) {
    pushError("missing_activity_limit", "dailyProgressLimit", "冲榜或剧本活动必须配置每日次数上限。");
  }
  if (!Number.isInteger(draft.actionPowerCost) || draft.actionPowerCost < 0) {
    pushError("invalid_action_power_cost", "actionPowerCost", "行动力消耗不能小于 0。");
  }
  if (draft.rewardReputation < 0 || draft.rewardPoints < 0) {
    pushError("invalid_reward_amount", "rewardReputation", "声望和活动积分奖励必须为非负数。");
  }
  if (draft.rewardCash > 0) {
    pushWarning("reward_boundary_risk", "rewardCash", "草案包含现金奖励。", "活动奖励应保持声望、活动积分、称号、外观券或碎片。");
  }
  if (draft.rewardPlatformCoins > 0) {
    pushWarning("reward_boundary_risk", "rewardPlatformCoins", "草案包含平台币奖励。", "活动奖励不应进入平台币链路。");
  }

  let concurrentActiveCount = 0;
  if (isDateString(draft.startDate) && isDateString(draft.endDate) && draft.startDate <= draft.endDate) {
    for (let date = new Date(`${draft.startDate}T00:00:00.000Z`); formatUtcDate(date) <= draft.endDate; date = addUtcDays(date, 1)) {
      const currentDate = formatUtcDate(date);
      const activeCount = existingActivities.filter((activity) => activity.startDate <= currentDate && currentDate <= activity.endDate).length + 1;
      concurrentActiveCount = Math.max(concurrentActiveCount, activeCount);
    }
    if (concurrentActiveCount > ACTIVITY_SCHEDULE_MAX_RECOMMENDED_ACTIVE) {
      pushWarning(
        "activity_schedule_crowded",
        null,
        `草案上线后最多会有 ${concurrentActiveCount} 个活动同期开启。`,
        "建议错峰排期，保持同时进行活动数量不超过 3 个。"
      );
    }
  }

  const rewardLabel = [
    draft.rewardReputation > 0 ? `声望 +${draft.rewardReputation}` : "",
    draft.rewardPoints > 0 ? `活动积分 +${draft.rewardPoints}` : "",
    draft.rewardTitleId !== null && draft.rewardTitleId.trim() !== "" ? `称号 ${draft.rewardTitleId}` : ""
  ].filter(Boolean).join(" / ") || "荣誉奖励";

  return {
    summary: {
      isValid: errors.length === 0 && riskLabels.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      riskCount: riskLabels.length
    },
    errors,
    warnings,
    riskLabels,
    preview: {
      id: draft.id,
      name: draft.name,
      status: readSeasonStatus(draft.startDate, draft.endDate, today),
      startDate: draft.startDate,
      endDate: draft.endDate,
      leaderboardKey: draft.leaderboardKey,
      targetScore: draft.targetScore,
      progressMode: draft.progressMode,
      progressScore: draft.progressScore,
      dailyProgressLimit: draft.dailyProgressLimit,
      actionPowerCost: draft.actionPowerCost,
      rewardLabel,
      concurrentActiveCount
    }
  };
};

const toAdminActivityConfigDraftInput = (draft: ActivityConfigDraftSource): AdminActivityConfigDraftInput => ({
  id: draft.id,
  name: draft.name,
  startDate: draft.startDate,
  endDate: draft.endDate,
  leaderboardKey: draft.leaderboardKey,
  targetScore: draft.targetScore,
  progressMode: readActivityProgressMode(draft.progressMode),
  progressScore: draft.progressScore,
  dailyProgressLimit: draft.dailyProgressLimit,
  actionPowerCost: draft.actionPowerCost,
  rewardReputation: draft.rewardReputation,
  rewardPoints: draft.rewardPoints,
  rewardTitleId: draft.rewardTitleId,
  rewardCash: draft.rewardCash,
  rewardPlatformCoins: draft.rewardPlatformCoins
});

export const toAdminActivityConfigDraftRecord = (
  draft: ActivityConfigDraftSource,
  existingActivities: ActivityDraftExistingConfigLike[],
  today: string
): AdminActivityConfigDraftRecord => {
  const validationActivities = draft.status === "published"
    ? existingActivities.filter((activity) => activity.id !== draft.id)
    : existingActivities;
  return {
    id: draft.draftId,
    activityId: draft.id,
    name: draft.name,
    startDate: draft.startDate,
    endDate: draft.endDate,
    leaderboardKey: draft.leaderboardKey,
    targetScore: draft.targetScore,
    progressMode: readActivityProgressMode(draft.progressMode),
    progressScore: draft.progressScore,
    dailyProgressLimit: draft.dailyProgressLimit,
    actionPowerCost: draft.actionPowerCost,
    rewardCash: draft.rewardCash,
    rewardPlatformCoins: draft.rewardPlatformCoins,
    rewardReputation: draft.rewardReputation,
    rewardPoints: draft.rewardPoints,
    rewardTitleId: draft.rewardTitleId,
    status: draft.status,
    createdByAdminUserId: draft.createdByAdminUserId,
    updatedByAdminUserId: draft.updatedByAdminUserId,
    submittedAt: draft.submittedAt?.toISOString() ?? null,
    reviewedAt: draft.reviewedAt?.toISOString() ?? null,
    reviewedByAdminUserId: draft.reviewedByAdminUserId,
    reviewNote: draft.reviewNote,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    validation: validateAdminActivityConfigDraft(toAdminActivityConfigDraftInput(draft), validationActivities, today)
  };
};

const toAdminActivityConfigDraftPublishedActivityRecord = (activity: ActivityDraftExistingConfigLike & { seasonId: string; sortOrder: number }): AdminActivityConfigDraftPublishedActivityRecord => ({
  id: activity.id,
  seasonId: activity.seasonId,
  name: activity.name,
  startDate: activity.startDate,
  endDate: activity.endDate,
  leaderboardKey: activity.leaderboardKey,
  targetScore: activity.targetScore,
  progressMode: readActivityProgressMode(activity.progressMode),
  progressScore: activity.progressScore,
  dailyProgressLimit: activity.dailyProgressLimit,
  actionPowerCost: activity.actionPowerCost,
  rewardCash: activity.rewardCash,
  rewardReputation: activity.rewardReputation,
  rewardPoints: activity.rewardPoints,
  rewardTitleId: activity.rewardTitleId,
  sortOrder: activity.sortOrder
});

const readAdminAuditDetailReason = (detail: string | null): string | null => {
  if (detail === null || detail.trim() === "") {
    return null;
  }
  try {
    const parsed = JSON.parse(detail) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const reason = (parsed as { reason?: unknown }).reason;
      return typeof reason === "string" && reason.trim() !== "" ? reason : null;
    }
  } catch {
    return null;
  }
  return null;
};

const toAdminActivityPublishSuggestion = (input: {
  status: SeasonStatus;
  isSettled: boolean;
  rewardBoundary: "safe" | "risk";
}): string => {
  if (input.rewardBoundary === "risk") {
    return "发布后观察发现奖励边界风险，先暂停新增运营动作并进入配置复核。";
  }
  if (input.status === "ended" && !input.isSettled) {
    return "活动已结束但尚未结算，进入活动运营页按幂等结算流程处理。";
  }
  if (input.status === "active") {
    return "活动进行中，继续观察报名、积分和榜单波动。";
  }
  return "活动尚未开启，继续观察档期、榜单 key 和奖励边界。";
};

type ActivityLeaderboardConfigLike = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  leaderboardKey: string;
  progressMode: string;
  targetScore: number;
};

const activityLeaderboardRewards = [120, 80, 50];

const toActivityLeaderboardRows = async (
  prisma: PrismaClient,
  activityId: string,
  serverId?: string,
  activityConfig?: { progressMode: string; targetScore: number }
): Promise<LeaderboardRowRecord[]> => {
  const [activity, states] = await Promise.all([
    activityConfig === undefined
      ? prisma.activityConfig.findUnique({ where: { id: activityId }, select: { progressMode: true, targetScore: true } })
      : Promise.resolve(activityConfig),
    prisma.playerActivityState.findMany({
    where: {
      activityId,
      score: { gt: 0 },
      ...(serverId === undefined ? {} : { profile: { serverId } })
    },
    include: {
      profile: {
        include: {
          titleEquipment: true,
          playerTitles: { include: { title: true } }
        }
      }
    },
    orderBy: [{ score: "desc" }, { updatedAt: "asc" }]
    })
  ]);

  return states
    .map((state) => ({ state, displayScore: getActivityDisplayScore(activity, state.score) }))
    .sort((left, right) => right.displayScore - left.displayScore || left.state.updatedAt.getTime() - right.state.updatedAt.getTime())
    .map(({ state, displayScore }, index) => {
    const equipped = state.profile.playerTitles.find((title) => title.titleId === state.profile.titleEquipment?.titleId);
    return {
      rank: index + 1,
      profileId: state.profileId,
      founderName: state.profile.founderName,
      companyName: state.profile.companyName,
      value: displayScore,
      valueLabel: formatLeaderboardValue("activity", displayScore),
      equippedTitle: equipped?.title.name ?? null
    };
  });
};

const toActivityLeaderboardBoard = async (
  prisma: PrismaClient,
  activity: ActivityLeaderboardConfigLike,
  today: string,
  serverId?: string
): Promise<LeaderboardBoardRecord> => ({
  key: activity.leaderboardKey,
  name: activity.name,
  scope: "activity",
  isActive: readSeasonStatus(activity.startDate, activity.endDate, today) === "active",
  rows: (await toActivityLeaderboardRows(prisma, activity.id, serverId, activity)).slice(0, 20),
  snapshotDate: today
});

const isActivityLeaderboardSettled = async (
  prisma: PrismaClient,
  activity: ActivityLeaderboardConfigLike
): Promise<boolean> => {
  const delivery = await prisma.leaderboardRewardDelivery.findFirst({
    where: {
      boardKey: activity.leaderboardKey,
      snapshotDate: activity.endDate
    },
    select: { id: true }
  });

  return delivery !== null;
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

  const activityBoards = await Promise.all(activities.map((activity) => toActivityLeaderboardBoard(prisma, activity, today, profile.serverId)));
  const activityRecaps = await Promise.all(activities
    .filter((activity) => readSeasonStatus(activity.startDate, activity.endDate, today) === "ended")
    .map(async (activity) => {
      const rows = await toActivityLeaderboardRows(prisma, activity.id, profile.serverId, activity);
      const personalRow = rows.find((row) => row.profileId === profile.id);
      const personalState = activityStateById.get(activity.id);
      return {
        activityId: activity.id,
        name: activity.name,
        status: "ended" as const,
        startDate: activity.startDate,
        endDate: activity.endDate,
        isSettled: await isActivityLeaderboardSettled(prisma, activity),
        personalRank: personalRow?.rank ?? null,
        personalScore: getActivityDisplayScore(activity, personalState?.score ?? 0),
        rows: rows.slice(0, 20)
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
      const status = readSeasonStatus(activity.startDate, activity.endDate, today);
      const progressLockedReason = getActivityProgressLock(activity, state, profile, today, status);
      const score = getActivityDisplayScore(activity, state?.score ?? 0);
      return {
        id: activity.id,
        name: activity.name,
        status,
        leaderboardKey: activity.leaderboardKey,
        isJoined: state?.isJoined ?? false,
        score,
        targetScore: activity.targetScore,
        progressMode: readActivityProgressMode(activity.progressMode),
        progressScore: activity.progressScore,
        dailyProgressLimit: activity.dailyProgressLimit,
        dailyProgressCount: getActivityDailyProgressCount(state, today),
        actionPowerCost: activity.actionPowerCost,
        canProgress: progressLockedReason === null,
        progressLockedReason,
        rewardClaimed: state?.rewardClaimedAt !== null && state?.rewardClaimedAt !== undefined
      };
    }),
    activityBoards: activityBoards.filter((board) => board.isActive),
    activityRecaps,
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
const BUSINESS_CLOCK_TICK_MS = 5 * 60 * 1000;
const BUSINESS_CLOCK_MAX_OFFLINE_MINUTES = 8 * 60;
const BUSINESS_CLOCK_MONTHLY_MINUTES = 30 * 24 * 60;
const BUSINESS_CLOCK_MAX_CASH_DELTA = 80000;
const BUSINESS_CLOCK_LOAN_PERIOD_TICKS = LOAN_PERIOD_TICKS;
const NIGHT_BUSINESS_BRIEFING_MINUTES = 30;
const BUSINESS_CLOCK_MANAGER_TODO_EXPIRES_HOURS = 6;
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

const clampNumber = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const BUSINESS_CLOCK_MANAGER_TASK_CONFIG_IDS = [
  "random-loan-rate-review",
  "random-cashflow-warning",
  "random-employee-burnout",
  "random-market-counter"
] as const;

export const calculateBusinessClockPulse = (
  profile: Pick<PlayerProfileRecord, "businessClockSyncedAt" | "actionPower" | "actionPowerLimit" | "monthlyIncome" | "monthlyExpense" | "cash" | "valuation" | "employeeSatisfaction" | "customerSatisfaction" | "riskStatus">,
  now: Date
): BusinessClockPulseRecord => {
  const previousSyncedAt = profile.businessClockSyncedAt;
  if (previousSyncedAt === null) {
    return {
      serverNow: now.toISOString(),
      syncedAt: now.toISOString(),
      previousSyncedAt,
      elapsedMinutes: 0,
      settledMinutes: 0,
      settledTicks: 0,
      cashDelta: 0,
      valuationDelta: 0,
      employeeSatisfactionDelta: 0,
      customerSatisfactionDelta: 0,
      platformCoinsDelta: 0,
      vipExperienceDelta: 0,
      leaderboardRewardDelta: 0,
      summary: "经营时钟已建立，等待下一次经营脉冲。",
      nightBriefing: null
    };
  }

  const elapsedMs = Math.max(0, now.getTime() - new Date(previousSyncedAt).getTime());
  const settledTicks = Math.min(
    Math.floor(elapsedMs / BUSINESS_CLOCK_TICK_MS),
    Math.floor(BUSINESS_CLOCK_MAX_OFFLINE_MINUTES / 5)
  );
  if (settledTicks <= 0) {
    return {
      serverNow: now.toISOString(),
      syncedAt: previousSyncedAt,
      previousSyncedAt,
      elapsedMinutes: Math.floor(elapsedMs / 60000),
      settledMinutes: 0,
      settledTicks: 0,
      cashDelta: 0,
      valuationDelta: 0,
      employeeSatisfactionDelta: 0,
      customerSatisfactionDelta: 0,
      platformCoinsDelta: 0,
      vipExperienceDelta: 0,
      leaderboardRewardDelta: 0,
      summary: "经营时钟冷却中，5 分钟内不重复结算。",
      nightBriefing: null
    };
  }

  const settledMinutes = settledTicks * 5;
  const netCashFlow = profile.monthlyIncome - profile.monthlyExpense;
  const rawCashDelta = Math.round((netCashFlow * settledMinutes) / BUSINESS_CLOCK_MONTHLY_MINUTES);
  const cashDelta = clampNumber(rawCashDelta, -BUSINESS_CLOCK_MAX_CASH_DELTA, BUSINESS_CLOCK_MAX_CASH_DELTA);
  const valuationDelta = Math.round(cashDelta * 0.4);
  const employeeSatisfactionDelta = cashDelta >= 0 ? 1 : -1;
  const customerSatisfactionDelta = cashDelta >= 0 ? 1 : -1;
  const signedCash = cashDelta >= 0 ? `+${cashDelta}` : `${cashDelta}`;
  const actionPowerRecovered = Math.min(
    Math.max(0, profile.actionPowerLimit - profile.actionPower),
    Math.floor((settledMinutes * 60 * 1000) / ACTION_POWER_RECOVERY_INTERVAL_MS) * ACTION_POWER_RECOVERY_AMOUNT
  );
  const hasNightBriefing = settledMinutes >= NIGHT_BUSINESS_BRIEFING_MINUTES;
  const riskTip = cashDelta < 0 || profile.riskStatus !== "稳健"
    ? "经营波动偏高，建议先查看财务风险和专属经理待办。"
    : "现金流稳定，可以继续推进项目、产品和活动目标。";
  const nightBriefing: NightBusinessBriefingRecord | null = hasNightBriefing
    ? {
        offlineMinutes: settledMinutes,
        actionPowerRecovered,
        cashDelta,
        valuationDelta,
        employeeSatisfactionDelta,
        customerSatisfactionDelta,
        riskTip,
        newTodoCount: cashDelta < 0 || profile.riskStatus !== "稳健" ? 2 : 1,
        nextAction: cashDelta < 0 ? "先处理财务风险，再推进项目。" : "查看财务页后继续推进项目或活动。",
        summary: `夜间经营简报：离线 ${settledMinutes} 分钟，公司经营已完成一次轻量同步。`
      }
    : null;

  return {
    serverNow: now.toISOString(),
    syncedAt: now.toISOString(),
    previousSyncedAt,
    elapsedMinutes: Math.floor(elapsedMs / 60000),
    settledMinutes,
    settledTicks,
    cashDelta,
    valuationDelta,
    employeeSatisfactionDelta,
    customerSatisfactionDelta,
    platformCoinsDelta: 0,
    vipExperienceDelta: 0,
    leaderboardRewardDelta: 0,
    summary: `经营时钟同步 ${settledMinutes} 分钟，现金 ${signedCash}，平台币/VIP/榜单奖励不变。`,
    nightBriefing
  };
};

const resolveBusinessClockManagerTaskConfigId = (
  profile: Pick<PlayerProfileRecord, "cash" | "monthlyIncome" | "monthlyExpense" | "totalDebt" | "valuation" | "riskStatus">,
  pulse: BusinessClockPulseRecord
): string | null => {
  if (pulse.settledTicks <= 0) {
    return null;
  }

  const report = calculateFinanceReport(profile);
  if (report.debtRatioBasisPoints >= 6000) {
    return "random-loan-rate-review";
  }
  if (pulse.cashDelta < 0 || report.netCashFlow < 0 || profile.riskStatus !== "稳健") {
    return "random-cashflow-warning";
  }
  if (pulse.employeeSatisfactionDelta < 0) {
    return "random-employee-burnout";
  }
  if (pulse.customerSatisfactionDelta < 0) {
    return "random-market-counter";
  }

  return null;
};

const parseBusinessClockPulse = (summaryJson: string | null): BusinessClockPulseRecord | null => {
  if (summaryJson === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(summaryJson) as Partial<BusinessClockPulseRecord>;
    if (typeof parsed.syncedAt !== "string" || typeof parsed.settledMinutes !== "number" || typeof parsed.cashDelta !== "number") {
      return null;
    }
    return parsed as BusinessClockPulseRecord;
  } catch {
    return null;
  }
};

const businessClockOfflineBand = (lastSyncedAt: string | null, offlineMinutes: number): string => {
  if (lastSyncedAt === null) {
    return "unsynced";
  }
  if (offlineMinutes < 30) {
    return "0-30";
  }
  if (offlineMinutes < 60) {
    return "30-60";
  }
  if (offlineMinutes < 240) {
    return "60-240";
  }
  return "240+";
};

const businessClockCashDeltaBand = (pulse: BusinessClockPulseRecord | null): string => {
  if (pulse === null) {
    return "none";
  }
  if (pulse.cashDelta > 0) {
    return "positive";
  }
  if (pulse.cashDelta < 0) {
    return "negative";
  }
  return "zero";
};

const incrementBand = (bands: Map<string, number>, band: string): void => {
  bands.set(band, (bands.get(band) ?? 0) + 1);
};

const createBusinessClockManagerTodo = async (
  tx: Prisma.TransactionClient,
  profile: PlayerProfileRecord,
  pulse: BusinessClockPulseRecord
): Promise<void> => {
  const configId = resolveBusinessClockManagerTaskConfigId(profile, pulse);
  if (configId === null) {
    return;
  }

  const today = pulse.syncedAt.slice(0, 10);
  const [existingCount, existingTask, hasPrivilege, seasonPass, config] = await Promise.all([
    tx.playerRandomTask.count({ where: { profileId: profile.id, dailyDate: today } }),
    tx.playerRandomTask.findUnique({
      where: {
        profileId_configId_dailyDate: {
          profileId: profile.id,
          configId,
          dailyDate: today
        }
      }
    }),
    tx.playerShopPurchase.findFirst({
      where: {
        profileId: profile.id,
        product: { category: { in: ["weekly_card", "monthly_card"] } }
      }
    }),
    tx.playerSeasonPassPurchase.findFirst({
      where: {
        profileId: profile.id,
        season: {
          startDate: { lte: today },
          endDate: { gte: today }
        }
      }
    }),
    tx.randomTaskConfig.findFirst({ where: { id: configId, isActive: true } })
  ]);
  if (existingTask !== null || config === null) {
    return;
  }

  const dailyLimit = (hasPrivilege === null ? RANDOM_TASK_BASE_DAILY_LIMIT : RANDOM_TASK_PRIVILEGE_DAILY_LIMIT) + (seasonPass === null ? 0 : RANDOM_TASK_PASS_DAILY_LIMIT_BONUS);
  if (existingCount >= dailyLimit) {
    return;
  }

  await tx.playerRandomTask.createMany({
    data: [{
      profileId: profile.id,
      configId,
      dailyDate: today,
      expiresAt: new Date(new Date(pulse.syncedAt).getTime() + BUSINESS_CLOCK_MANAGER_TODO_EXPIRES_HOURS * 60 * 60 * 1000)
    }],
    skipDuplicates: true
  });
};

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

const toGoalStatusLabel = (isCompleted: boolean, isClaimable: boolean): string => {
  if (isClaimable) return "可领取";
  return isCompleted ? "已完成" : "推进中";
};

const createLongTermGoal = (
  goal: Omit<LongTermGoalRecord, "isCompleted" | "statusLabel"> & { isCompleted?: boolean }
): LongTermGoalRecord => {
  const isCompleted = goal.isCompleted ?? goal.progress >= goal.target;
  return {
    ...goal,
    progress: Math.max(0, goal.progress),
    target: Math.max(1, goal.target),
    isCompleted,
    statusLabel: toGoalStatusLabel(isCompleted, goal.isClaimable)
  };
};

export const buildLongTermGoalsRecord = (input: {
  profile: PlayerProfileRecord;
  growth: CompanyGrowthRecord;
  tasks: TaskRecord[];
  season: SeasonCenterRecord | null;
  leaderboards: LeaderboardCenterRecord | null;
  crossServer: CrossServerCenterRecord | null;
  titles: TitleCenterRecord;
  achievements: AchievementRecord[];
  guild: GuildCenterRecord | null;
}): LongTermGoalsRecord => {
  const dailyTask = input.tasks.find((task) => task.type === "daily" && !task.isClaimed) ?? input.tasks.find((task) => !task.isClaimed) ?? null;
  const mainTask = input.tasks.find((task) => task.type === "main" && !task.isClaimed) ?? dailyTask;
  const activeActivities = input.season?.activities.filter((activity) => activity.status === "active") ?? [];
  const activityGoal = activeActivities.find((activity) => activity.isJoined) ?? activeActivities[0] ?? null;
  const seasonTask = input.season?.tasks.find((task) => !task.isClaimed) ?? null;
  const guildTask = input.guild?.tasks.find((task) => !task.isClaimed) ?? null;
  const completedAchievements = input.achievements.filter((achievement) => achievement.isCompleted).length;
  const claimableAchievements = input.achievements.filter((achievement) => achievement.isCompleted && !achievement.isClaimed).length;
  const activeTitleCount = input.titles.titles.filter((title) => !title.isExpired).length;

  return {
    profile: {
      companyLevel: input.profile.companyLevel,
      maxLevel: input.growth.maxLevel,
      companyExperience: input.profile.companyExperience,
      reputation: input.profile.reputation
    },
    sections: [
      {
        key: "today",
        title: "今日建议",
        summary: "今天做什么：优先处理可领取任务、现金流巡检、每日经营和活动参与。",
        goals: [
          createLongTermGoal({
            id: "today-daily-task",
            title: dailyTask?.title ?? "完成每日经营任务",
            description: dailyTask?.description ?? "完成一次日常经营动作，维持公司节奏。",
            source: "task",
            sourceId: dailyTask?.id ?? "daily",
            progress: dailyTask?.progress ?? 0,
            target: dailyTask?.target ?? 1,
            isClaimable: dailyTask?.isClaimable ?? false,
            rewardLabel: dailyTask?.rewardLabel ?? null,
            action: { label: dailyTask?.isClaimable ? "领取任务" : "查看任务", href: "#tasks" }
          }),
          createLongTermGoal({
            id: "today-finance",
            title: "检查财务状态",
            description: `现金 ${input.profile.cash.toLocaleString("zh-CN")}，债务预警 ${input.profile.debtWarning}。`,
            source: "finance",
            sourceId: input.profile.id,
            progress: input.profile.monthlyIncome,
            target: Math.max(1, input.profile.monthlyExpense),
            isClaimable: false,
            isCompleted: input.profile.monthlyIncome >= input.profile.monthlyExpense,
            rewardLabel: null,
            action: { label: "查看财务", href: "#finance" }
          }),
          createLongTermGoal({
            id: "today-main-task",
            title: mainTask?.title ?? "推进主线履历",
            description: mainTask?.description ?? "完成主线或支线目标，积累公司经验。",
            source: "task",
            sourceId: mainTask?.id ?? "main",
            progress: mainTask?.progress ?? 0,
            target: mainTask?.target ?? 1,
            isClaimable: mainTask?.isClaimable ?? false,
            rewardLabel: mainTask?.rewardLabel ?? null,
            action: { label: mainTask?.isClaimable ? "领取主线" : "查看主线", href: "#tasks" }
          }),
          createLongTermGoal({
            id: "today-activity",
            title: activityGoal?.name ?? "参与赛季活动",
            description: activityGoal === null ? "赛季活动开放后参与，获取活动积分和荣誉进度。" : `${activityGoal.isJoined ? "已参与" : "待参与"}，目标 ${activityGoal.targetScore} 分。`,
            source: "activity",
            sourceId: activityGoal?.id ?? "activity",
            progress: activityGoal?.score ?? 0,
            target: activityGoal?.targetScore ?? 1,
            isClaimable: activityGoal !== null && activityGoal.score >= activityGoal.targetScore && !activityGoal.rewardClaimed,
            rewardLabel: "活动积分与荣誉",
            action: { label: "查看活动", href: "#season" }
          })
        ]
      },
      {
        key: "week",
        title: "本周目标",
        summary: "本周追什么：经营报告、活动榜、商会协作和项目产品推进。",
        goals: [
          createLongTermGoal({
            id: "week-report",
            title: "经营报告复盘",
            description: `第 ${input.profile.financeMonth} 月，估值 ${input.profile.valuation.toLocaleString("zh-CN")}。`,
            source: "finance",
            sourceId: input.profile.id,
            progress: input.profile.monthlyIncome,
            target: Math.max(1, input.profile.monthlyExpense),
            isClaimable: false,
            isCompleted: input.profile.monthlyIncome >= input.profile.monthlyExpense,
            rewardLabel: null,
            action: { label: "查看报告", href: "#finance" }
          }),
          createLongTermGoal({
            id: "week-activity-board",
            title: "活动榜追赶",
            description: `${input.leaderboards?.activityBoards.length ?? 0} 张活动榜进行中。`,
            source: "activity",
            sourceId: "activity-boards",
            progress: input.leaderboards?.activityBoards.length ?? 0,
            target: 1,
            isClaimable: false,
            rewardLabel: "榜单荣誉",
            action: { label: "查看榜单", href: "#leaderboard" }
          }),
          createLongTermGoal({
            id: "week-guild",
            title: input.guild?.guild === null || input.guild === null ? "加入商会协作" : "商会贡献",
            description: input.guild?.guild === null || input.guild === null ? "加入商会后参与每日协作和商会项目。" : `今日活跃 ${input.guild.todayActiveMemberCount} 人，协作 ${input.guild.todayCollaborationCount} 次。`,
            source: "guild",
            sourceId: input.guild?.guild?.id ?? "guild",
            progress: guildTask?.progress ?? (input.guild?.todayCollaborationCount ?? 0),
            target: guildTask?.target ?? 1,
            isClaimable: guildTask?.isClaimable ?? false,
            rewardLabel: guildTask === null ? null : `贡献 +${guildTask.contributionReward}`,
            action: { label: input.guild?.guild === null || input.guild === null ? "前往商会" : "查看商会", href: "#guild" }
          }),
          createLongTermGoal({
            id: "week-business",
            title: "项目与产品推进",
            description: "用主线任务承接项目、产品、市场动作，避免经营停滞。",
            source: "task",
            sourceId: mainTask?.id ?? "business",
            progress: mainTask?.progress ?? 0,
            target: mainTask?.target ?? 1,
            isClaimable: mainTask?.isClaimable ?? false,
            rewardLabel: mainTask?.rewardLabel ?? null,
            action: { label: "查看经营", href: "#business" }
          })
        ]
      },
      {
        key: "season",
        title: "赛季目标",
        summary: "赛季争什么：通行证进度、活动积分、活动商店和限定称号。",
        goals: [
          createLongTermGoal({
            id: "season-pass",
            title: "通行证进度",
            description: input.season?.season.pass.isPurchased ? "通行证已开通，继续完成赛季任务。" : "通行证未开通，仍可查看赛季任务与普通进度。",
            source: "seasonTask",
            sourceId: input.season?.season.id ?? "season",
            progress: input.season?.season.points ?? 0,
            target: 100,
            isClaimable: false,
            rewardLabel: null,
            action: { label: "查看通行证", href: "#pass" }
          }),
          createLongTermGoal({
            id: "season-activity-points",
            title: seasonTask?.title ?? "活动积分积累",
            description: seasonTask?.description ?? "完成赛季任务，累积活动积分。",
            source: "seasonTask",
            sourceId: seasonTask?.id ?? "season-task",
            progress: seasonTask?.progress ?? (input.season?.season.points ?? 0),
            target: seasonTask?.target ?? 100,
            isClaimable: false,
            rewardLabel: seasonTask === null ? "活动积分" : `积分 +${seasonTask.rewardPoints}`,
            action: { label: "查看赛季", href: "#season" }
          }),
          createLongTermGoal({
            id: "season-activity-shop",
            title: "活动商店兑换",
            description: `${input.season?.shopItems.filter((item) => item.isAvailable).length ?? 0} 个商品可兑换。`,
            source: "activityShop",
            sourceId: "activity-shop",
            progress: input.season?.shopItems.filter((item) => item.isAvailable).length ?? 0,
            target: 1,
            isClaimable: false,
            rewardLabel: "活动积分兑换",
            action: { label: "查看商店", href: "#season" }
          }),
          createLongTermGoal({
            id: "season-title",
            title: "赛季称号",
            description: input.titles.equippedTitle === null ? "完成活动、成就或榜单目标后解锁称号。" : `已装备：${input.titles.equippedTitle.name}。`,
            source: "title",
            sourceId: input.titles.equippedTitle?.id ?? "season-title",
            progress: activeTitleCount,
            target: 1,
            isClaimable: false,
            rewardLabel: "称号荣誉",
            action: { label: "查看称号", href: "#titles" }
          })
        ]
      },
      {
        key: "longTerm",
        title: "长期目标",
        summary: "长期收集什么：公司等级、满级宝箱、成就、称号、跨服和商会历史。",
        goals: [
          createLongTermGoal({
            id: "long-company-growth",
            title: "公司等级成长",
            description: `LV.${input.profile.companyLevel}/${input.growth.maxLevel}，持续积累公司经验。`,
            source: "companyGrowth",
            sourceId: input.profile.id,
            progress: input.profile.companyLevel,
            target: input.growth.maxLevel,
            isClaimable: false,
            rewardLabel: null,
            action: { label: "查看成长", href: "#company-growth" }
          }),
          createLongTermGoal({
            id: "long-full-level-chest",
            title: "满级宝箱",
            description: `可领取 ${input.growth.fullLevelChest.claimableCount} 个，满级后每 ${input.growth.fullLevelChest.requiredExperience} 经验生成 1 个。`,
            source: "companyGrowth",
            sourceId: "full-level-chest",
            progress: input.growth.fullLevelChest.progressExperience,
            target: input.growth.fullLevelChest.requiredExperience,
            isClaimable: input.growth.fullLevelChest.claimableCount > 0,
            rewardLabel: "声望与行动力",
            action: { label: "查看宝箱", href: "#company-growth" }
          }),
          createLongTermGoal({
            id: "long-achievements",
            title: "成就收集",
            description: `已完成 ${completedAchievements}/${input.achievements.length}，${claimableAchievements} 个待领取。`,
            source: "achievement",
            sourceId: "achievements",
            progress: completedAchievements,
            target: Math.max(1, input.achievements.length),
            isClaimable: claimableAchievements > 0,
            rewardLabel: "成就与知识卡",
            action: { label: "查看成就", href: "#achievements" }
          }),
          createLongTermGoal({
            id: "long-titles",
            title: "称号收藏",
            description: input.titles.equippedTitle === null ? `已拥有 ${activeTitleCount} 个有效称号。` : `已装备：${input.titles.equippedTitle.name}。`,
            source: "title",
            sourceId: "titles",
            progress: activeTitleCount,
            target: 1,
            isClaimable: false,
            rewardLabel: "称号加成",
            action: { label: "管理称号", href: "#titles" }
          }),
          createLongTermGoal({
            id: "long-cross-server",
            title: "跨服创业履历",
            description: input.crossServer?.isRegistered ? `${input.crossServer.group.name} 已报名。` : "报名跨服创业大赛后沉淀跨服履历。",
            source: "crossServer",
            sourceId: input.crossServer?.group.id ?? "cross-server",
            progress: input.crossServer?.isRegistered ? 1 : 0,
            target: 1,
            isClaimable: false,
            rewardLabel: "跨服荣誉",
            action: { label: "查看跨服", href: "#cross-server" }
          }),
          createLongTermGoal({
            id: "long-guild-history",
            title: "商会历史",
            description: input.guild?.guild === null || input.guild === null ? "加入商会后记录贡献、项目和赛季历史。" : `${input.guild.guild.name} LV.${input.guild.guild.level}，贡献 ${input.guild.guild.contributionScore}。`,
            source: "guild",
            sourceId: input.guild?.guild?.id ?? "guild-history",
            progress: input.guild?.guild === null || input.guild === null ? 0 : input.guild.guild.contributionScore,
            target: 1,
            isClaimable: false,
            rewardLabel: "商会履历",
            action: { label: "查看商会", href: "#guild" }
          })
        ]
      }
    ],
    summaries: {
      todayClaimableCount: input.tasks.filter((task) => task.isClaimable && !task.isClaimed).length,
      seasonActiveActivityCount: activeActivities.length,
      achievementCompletedCount: completedAchievements,
      titleCount: activeTitleCount,
      guildJoined: input.guild?.guild !== null && input.guild !== null,
      crossServerRegistered: input.crossServer?.isRegistered ?? false,
      fullLevelChestClaimableCount: input.growth.fullLevelChest.claimableCount
    }
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
    levels,
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

const crossServerStageRewardConfigs = [
  { id: "cross-stage-3", title: "三日目标", requiredDailyClaims: 3, rewardReputation: 60 },
  { id: "cross-stage-7", title: "七日目标", requiredDailyClaims: 7, rewardReputation: 120 },
  { id: "cross-stage-14", title: "十四日目标", requiredDailyClaims: 14, rewardReputation: 240 }
] as const;

const guildLeaderboardRewards = [120, 80, 50];
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
  if (key === "activity") {
    return `活动积分 ${value.toLocaleString("zh-CN")}`;
  }

  return `估值 ${value.toLocaleString("zh-CN")}`;
};

const buildCrossServerBattleReport = (
  center: Omit<CrossServerCenterRecord, "battleReport">,
  profileId: string,
  rewardStatus: CrossServerBattleReportRecord["personal"]["rewardStatus"] = "待结算"
): CrossServerBattleReportRecord => {
  const personalBoard = center.boards.find((board) => board.key === "cross-company-value") ?? center.boards[0];
  const personalRows = personalBoard?.rows ?? [];
  const personalRow = personalRows.find((row) => row.profileId === profileId) ?? null;
  const previousRow = personalRow === null ? null : personalRows.find((row) => row.rank === personalRow.rank - 1) ?? null;
  const nextRow = personalRow === null ? null : personalRows.find((row) => row.rank === personalRow.rank + 1) ?? null;
  const guildRow = center.guildSeason.guildId === null ? null : center.guildBoard.rows.find((row) => row.guildId === center.guildSeason.guildId) ?? null;
  const topGuild = center.guildBoard.rows[0] ?? null;
  const personalRankLabel = personalRow === null ? "暂无个人排名" : `本赛季估值进入跨服第 ${personalRow.rank}`;
  const guildRankLabel = guildRow === null ? "商会报名后生成商会战报" : `${guildRow.guildName} 当前跨服商会第 ${guildRow.rank}`;
  const settlementLine =
    rewardStatus === "待结算"
      ? "赛前情报：结算后生成赛果回放。"
      : rewardStatus === "已生成邮件"
        ? "赛果回放：本次跨服结算已生成奖励邮件。"
        : "赛果回放：本次跨服排名已复核，无重复奖励。";
  const gapLabel = previousRow === null
    ? nextRow === null
      ? "当前暂无相邻名次差距。"
      : `领先下一名 ${Math.max((personalRow?.value ?? 0) - nextRow.value, 0).toLocaleString("zh-CN")} 估值。`
    : `距离上一名还差 ${Math.max(previousRow.value - (personalRow?.value ?? 0), 0).toLocaleString("zh-CN")} 估值。`;

  return {
    snapshotDate: personalBoard?.snapshotDate ?? center.guildBoard.snapshotDate,
    groupName: center.group.name,
    serverIds: center.group.serverIds,
    personal: {
      myRank: personalRow?.rank ?? null,
      myValueLabel: personalRow?.valueLabel ?? "暂无跨服数据",
      championName: personalRows[0]?.founderName ?? null,
      previousGapLabel: personalRow === null || previousRow === null ? null : `距上一名 ${Math.max(previousRow.value - personalRow.value, 0).toLocaleString("zh-CN")} 估值`,
      nextGapLabel: personalRow === null || nextRow === null ? null : `领先下一名 ${Math.max(personalRow.value - nextRow.value, 0).toLocaleString("zh-CN")} 估值`,
      rewardStatus,
      titleStatus: personalRow?.equippedTitle ?? "当前荣誉收集中"
    },
    guild: {
      myGuildRank: guildRow?.rank ?? null,
      myGuildValueLabel: guildRow?.valueLabel ?? "暂无商会排名",
      topGuildName: topGuild?.guildName ?? null,
      activeProgressLabel: `${center.guildSeason.todayActiveMemberCount}/${center.guildSeason.minTodayActiveMembers} 活跃`,
      rewardStatus
    },
    lines: [
      settlementLine,
      `个人对比：${personalRankLabel}，${gapLabel}`,
      `榜首对比：${personalRows[0]?.founderName ?? "榜首待定"} 领跑 ${center.group.serverIds.length} 个区服。`,
      `商会对比：${guildRankLabel}，活跃 ${center.guildSeason.todayActiveMemberCount}/${center.guildSeason.minTodayActiveMembers}。`,
      `奖励去向：${rewardStatus === "待结算" ? "结算后通过邮件发放。" : "奖励通过邮件发放。"}`
    ]
  };
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

const readCrossGuildIdFromMailBody = (mailBody: string | null): string | null => {
  const prefix = "cross-guild-season:";
  return mailBody?.startsWith(prefix) === true ? mailBody.slice(prefix.length) : null;
};

const buildGuildHistory = async (
  database: PrismaClient,
  guild: { id: string; name: string; serverId: string }
): Promise<GuildHistoryRecord> => {
  const currentMembers = await database.guildMember.findMany({
    where: { guildId: guild.id },
    include: { profile: true },
    orderBy: { contributionScore: "desc" },
    take: 3
  });
  const contributionByProfileId = new Map(currentMembers.map((member) => [member.profileId, member.contributionScore]));
  const currentTopMembers = currentMembers.map((member, index) => ({
    profileId: member.profileId,
    founderName: member.profile.founderName,
    companyName: member.profile.companyName,
    rank: index + 1,
    contributionScore: member.contributionScore,
    reputationReward: guildLeaderboardRewards[index] ?? 0
  }));
  const deliveries = await database.leaderboardRewardDelivery.findMany({
    where: {
      serverId: guild.serverId,
      boardKey: "guild-contribution",
      mailBody: `guild:${guild.id}`
    },
    include: { profile: true },
    orderBy: [{ snapshotDate: "desc" }, { rank: "asc" }]
  });
  const snapshotDates = [...new Set(deliveries.map((delivery) => delivery.snapshotDate))].slice(0, 5);

  return {
    guild: {
      id: guild.id,
      name: guild.name,
      serverId: guild.serverId
    },
    currentTopMembers,
    settlements: snapshotDates.map((snapshotDate) => {
      const rows = deliveries.filter((delivery) => delivery.snapshotDate === snapshotDate);
      return {
        snapshotDate,
        deliveredRewards: rows.length,
        topMembers: rows.map((delivery) => ({
          profileId: delivery.profileId,
          founderName: delivery.profile.founderName,
          companyName: delivery.profile.companyName,
          rank: delivery.rank,
          contributionScore: contributionByProfileId.get(delivery.profileId) ?? 0,
          reputationReward: guildLeaderboardRewards[delivery.rank - 1] ?? 0
        }))
      };
    })
  };
};

const buildCrossServerGuildHistory = async (
  database: PrismaClient,
  guild: { id: string; name: string; serverId: string },
  group: CrossServerGroupRecord | null
): Promise<CrossServerGuildHistoryRecord> => {
  if (group === null) {
    return {
      guild: { id: guild.id, name: guild.name, serverId: guild.serverId },
      group: null,
      isRegistered: false,
      settlements: []
    };
  }
  const [signup, deliveries] = await Promise.all([
    database.crossServerGuildSignup.findUnique({
      where: {
        guildId_groupId: {
          guildId: guild.id,
          groupId: group.id
        }
      }
    }),
    database.leaderboardRewardDelivery.findMany({
      where: {
        serverId: group.id,
        boardKey: "cross-guild-season"
      },
      include: { profile: true },
      orderBy: [{ snapshotDate: "desc" }, { rank: "asc" }]
    })
  ]);
  const guildIds = [...new Set(deliveries.map((delivery) => readCrossGuildIdFromMailBody(delivery.mailBody)).filter((id): id is string => id !== null))];
  const guilds = await database.guild.findMany({ where: { id: { in: guildIds } } });
  const guildById = new Map(guilds.map((item) => [item.id, item]));
  const snapshotDates = [...new Set(deliveries.map((delivery) => delivery.snapshotDate))].slice(0, 5);

  return {
    guild: { id: guild.id, name: guild.name, serverId: guild.serverId },
    group,
    isRegistered: signup?.status === "active",
    settlements: snapshotDates.map((snapshotDate) => {
      const rows = deliveries.filter((delivery) => delivery.snapshotDate === snapshotDate);
      const topGuilds = rows.map((delivery) => {
        const settledGuildId = readCrossGuildIdFromMailBody(delivery.mailBody) ?? "";
        const settledGuild = guildById.get(settledGuildId);
        return {
          guildId: settledGuildId,
          guildName: settledGuild?.name ?? "",
          serverId: settledGuild?.serverId ?? "",
          leaderProfileId: delivery.profileId,
          leaderFounderName: delivery.profile.founderName,
          rank: delivery.rank,
          reputationReward: crossServerGuildSeasonRewards[delivery.rank - 1] ?? 0
        };
      });
      return {
        snapshotDate,
        deliveredRewards: rows.length,
        finalRank: topGuilds.find((row) => row.guildId === guild.id)?.rank ?? null,
        reportLines: [
          topGuilds.find((row) => row.guildId === guild.id)?.rank === undefined ? "本商会未进入本次跨服商会奖励榜。" : `${guild.name} 本次跨服商会第 ${topGuilds.find((row) => row.guildId === guild.id)?.rank}。`,
          `本次跨服商会发放 ${rows.length} 份奖励。`,
          "奖励通过邮件发放。"
        ],
        topGuilds
      };
    })
  };
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

const ECONOMY_PLATFORM_COIN_DELTA_ALERT = 50000;
const ECONOMY_VIP_EXPERIENCE_ALERT = 100000;
const ECONOMY_OFFLINE_CASH_DELTA_ALERT = 500000;
const ECONOMY_BUSINESS_CLOCK_STALE_MINUTES = 24 * 60;

const countTelemetryTargets = <TKey extends string>(
  events: Array<{ targetId: string | null }>,
  keyName: TKey
): Array<Record<TKey, string> & { count: number }> => {
  const counts = new Map<string, number>();
  for (const event of events) {
    const target = event.targetId === null || event.targetId.trim() === "" ? "unknown" : event.targetId;
    counts.set(target, (counts.get(target) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([leftKey, leftCount], [rightKey, rightCount]) => rightCount - leftCount || leftKey.localeCompare(rightKey))
    .map(([target, count]) => ({ [keyName]: target, count }) as Record<TKey, string> & { count: number });
};

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
  const hasAnyActiveLoan = loans.some((loan) => loan.status !== "settled");
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
      const hasActiveLoan = activeConfigIds.has(config.id);
      const gate = evaluateLoanGate(profile, finance, config, { hasActiveLoan, hasAnyActiveLoan, hasOverdueLoan, crisisLevel });
      return {
        id: config.id,
        name: config.name,
        lender: config.lender,
        principal: config.principal,
        annualRateBasisPoints: config.annualRateBasisPoints,
        termMonths: config.termMonths,
        monthlyPayment: config.monthlyPayment,
        creditRequired: config.creditRequired,
        isHighRisk: config.isHighRisk,
        purposeTag: config.purposeTag,
        applicationImpact: loanApplicationImpact(config),
        summary: config.summary,
        isAvailable: gate.isAvailable,
        lockedReason: gate.lockedReason
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

  const now = new Date();
  const privilegePurchases = await tx.playerShopPurchase.findMany({
    where: {
      profileId,
      product: {
        category: { in: ["weekly_card", "monthly_card", "growth_fund"] }
      }
    },
    include: { product: true },
    orderBy: { createdAt: "desc" }
  });
  const activePrivileges = privilegePurchases.filter((purchase) =>
    isActiveShopPurchase(resolveShopPurchaseExpiresAt(purchase.createdAt, purchase.product.durationDays, purchase.expiresAt), now)
  );
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

const runtimeChatKeywords = defaultChatKeywords();
const runtimeChatMessages: ChatMessageRecord[] = [];

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
      telemetryEvents,
      commercialEntryEvents,
      paidProductEntryEvents,
      longTermGoalClickCount,
      businessClockBriefingOpenCount,
      businessClockTodoHandledCount
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
      prisma.playerTelemetryEvent.findMany({ where: { eventName: "tutorial_step" }, select: { targetId: true, metadataJson: true } }),
      prisma.playerTelemetryEvent.findMany({ where: { eventName: "commercial_entry_click" }, select: { targetId: true } }),
      prisma.playerTelemetryEvent.findMany({ where: { eventName: "paid_product_entry_click" }, select: { targetId: true } }),
      prisma.playerTelemetryEvent.count({ where: { eventName: "long_term_goal_click" } }),
      prisma.playerTelemetryEvent.count({ where: { eventName: "business_clock_briefing_open" } }),
      prisma.playerTelemetryEvent.count({ where: { eventName: "business_clock_todo_handled" } })
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
        shopPurchaseConversionBasisPoints: rateBasisPoints(shopPurchases, shopClicks),
        commercialEntryClickTotal: commercialEntryEvents.length,
        commercialEntryClicks: countTelemetryTargets(commercialEntryEvents, "entry"),
        paidProductEntryClickTotal: paidProductEntryEvents.length,
        paidProductEntryClicks: countTelemetryTargets(paidProductEntryEvents, "product"),
        longTermGoalClickCount,
        businessClockBriefingOpenCount,
        businessClockTodoHandledCount
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

  async getAdminEconomyAlerts(today) {
    const now = new Date(`${today}T23:59:59.000Z`);
    const [profiles, wallets, ledgers, reservedPaymentCount, platformCoinRewardDeliveryCount] = await Promise.all([
      prisma.playerProfile.findMany({
        select: {
          id: true,
          companyName: true,
          serverId: true,
          businessClockSyncedAt: true,
          lastBusinessPulseSummaryJson: true
        }
      }),
      prisma.playerPlatformWallet.findMany({ select: { profileId: true, balance: true, vipExperience: true } }),
      prisma.platformCoinLedger.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 200,
        select: { profileId: true, changeAmount: true, source: true, reason: true }
      }),
      prisma.externalPaymentOrder.count({ where: { status: "reserved" } }),
      prisma.leaderboardRewardDelivery.count({ where: { rewardPlatformCoins: { gt: 0 } } })
    ]);
    const profileNames = new Map(profiles.map((profile) => [profile.id, profile.companyName]));
    const alerts: AdminEconomyAlertRecord[] = [];

    for (const ledger of ledgers) {
      if (ledger.changeAmount >= ECONOMY_PLATFORM_COIN_DELTA_ALERT) {
        alerts.push({
          id: `platform-coin-${ledger.profileId}`,
          level: "warning",
          type: "platform_coin_abnormal_growth",
          targetType: "player_profile",
          targetId: ledger.profileId,
          message: `平台币异常增长：${profileNames.get(ledger.profileId) ?? ledger.profileId} 单笔增加 ${ledger.changeAmount}`,
          suggestion: "复核平台币流水来源、审计日志和发放原因，不自动修正玩家资产。"
        });
      }
    }

    for (const wallet of wallets) {
      if (wallet.vipExperience >= ECONOMY_VIP_EXPERIENCE_ALERT) {
        alerts.push({
          id: `vip-experience-${wallet.profileId}`,
          level: "warning",
          type: "vip_experience_abnormal",
          targetType: "player_profile",
          targetId: wallet.profileId,
          message: `VIP 经验异常：${profileNames.get(wallet.profileId) ?? wallet.profileId} 当前 ${wallet.vipExperience}`,
          suggestion: "复核付费商品、后台调整和 VIP 经验来源，不自动降级或扣减。"
        });
      }
    }

    for (const profile of profiles) {
      const pulse = parseBusinessClockPulse(profile.lastBusinessPulseSummaryJson);
      if (pulse !== null && Math.abs(pulse.cashDelta) >= ECONOMY_OFFLINE_CASH_DELTA_ALERT) {
        alerts.push({
          id: `offline-cash-${profile.id}`,
          level: "warning",
          type: "offline_cash_abnormal",
          targetType: "player_profile",
          targetId: profile.id,
          message: `离线现金异常：${profile.companyName} 最近脉冲 ${pulse.cashDelta}`,
          suggestion: "复核经营时钟摘要和财务页展示，不通过巡检接口修改现金。"
        });
      }
    }

    const businessClockSyncRiskCount = profiles.filter((profile) => {
      if (profile.businessClockSyncedAt === null) {
        return true;
      }
      return Math.floor((now.getTime() - profile.businessClockSyncedAt.getTime()) / 60000) >= ECONOMY_BUSINESS_CLOCK_STALE_MINUTES;
    }).length;
    if (businessClockSyncRiskCount > 0) {
      alerts.push({
        id: "business-clock-sync-frequency",
        level: "info",
        type: "business_clock_sync_frequency",
        targetType: "business_clock",
        targetId: today,
        message: `经营时钟同步频率：${businessClockSyncRiskCount} 名玩家未同步或超过 24 小时未同步。`,
        suggestion: "进入经营时钟观测页确认最近同步时间，本巡检只读不触发懒同步。"
      });
    }
    if (platformCoinRewardDeliveryCount > 0) {
      alerts.push({
        id: "settlement-duplicate-risk",
        level: "info",
        type: "settlement_duplicate_risk",
        targetType: "leaderboard_reward_delivery",
        targetId: today,
        message: `重复结算风险：已有 ${platformCoinRewardDeliveryCount} 条榜单平台币奖励投递记录。`,
        suggestion: "继续依赖唯一键和审计日志追溯，手动结算前确认活动榜和常驻榜状态。"
      });
    }
    if (reservedPaymentCount > 0) {
      alerts.push({
        id: "external-payment-reserved",
        level: "info",
        type: "external_payment_reserved",
        targetType: "external_payment_order",
        targetId: today,
        message: `外部支付预留订单：${reservedPaymentCount} 条仍为预留状态。`,
        suggestion: "本地阶段不接真实支付回调，仅确认预留订单不会直接发放平台币。"
      });
    }

    const platformCoinRiskCount = alerts.filter((alert) => alert.type === "platform_coin_abnormal_growth").length;
    const vipExperienceRiskCount = alerts.filter((alert) => alert.type === "vip_experience_abnormal").length;
    const offlineCashRiskCount = alerts.filter((alert) => alert.type === "offline_cash_abnormal").length;
    const settlementRiskCount = alerts.filter((alert) => alert.type === "settlement_duplicate_risk").length;
    const checkpoint = (key: string, label: string, value: number): AdminEconomyAlertListRecord["checkpoints"][number] => ({
      key,
      label,
      status: value === 0 ? "normal" : "warning",
      value
    });

    return {
      summary: {
        total: alerts.length,
        critical: alerts.filter((alert) => alert.level === "critical").length,
        warning: alerts.filter((alert) => alert.level === "warning").length,
        info: alerts.filter((alert) => alert.level === "info").length,
        platformCoinRiskCount,
        vipExperienceRiskCount,
        offlineCashRiskCount,
        settlementRiskCount,
        businessClockSyncRiskCount
      },
      checkpoints: [
        checkpoint("platform_coin_abnormal_growth", "平台币异常增长", platformCoinRiskCount),
        checkpoint("vip_experience_abnormal", "VIP 经验异常", vipExperienceRiskCount),
        checkpoint("offline_cash_abnormal", "离线现金异常", offlineCashRiskCount),
        checkpoint("settlement_duplicate_risk", "重复结算风险", settlementRiskCount),
        checkpoint("business_clock_sync_frequency", "经营时钟同步频率", businessClockSyncRiskCount)
      ],
      alerts
    };
  },

  async getAdminBusinessClockObservations(today) {
    const profiles = await prisma.playerProfile.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 50,
      include: {
        randomTasks: {
          where: {
            dailyDate: today,
            configId: { in: [...BUSINESS_CLOCK_MANAGER_TASK_CONFIG_IDS] }
          },
          select: { id: true }
        }
      }
    });
    const now = new Date(`${today}T23:59:59.000Z`);
    const offlineBands = new Map<string, number>([
      ["unsynced", 0],
      ["0-30", 0],
      ["30-60", 0],
      ["60-240", 0],
      ["240+", 0]
    ]);
    const cashDeltaBands = new Map<string, number>([
      ["none", 0],
      ["negative", 0],
      ["zero", 0],
      ["positive", 0]
    ]);

    const rows = profiles.map((profile) => {
      const record = toProfileRecord(profile);
      const pulse = parseBusinessClockPulse(record.lastBusinessPulseSummaryJson);
      const offlineMinutes = pulse?.elapsedMinutes ?? (
        record.businessClockSyncedAt === null
          ? 0
          : Math.max(0, Math.floor((now.getTime() - new Date(record.businessClockSyncedAt).getTime()) / 60000))
      );
      const managerTodoCount = profile.randomTasks.length;
      const anomaly = record.businessClockSyncedAt === null
        ? "未建立经营时钟"
        : pulse === null
          ? "经营脉冲摘要缺失"
          : offlineMinutes >= 1440
            ? "同步超过 24 小时未刷新"
            : null;

      incrementBand(offlineBands, businessClockOfflineBand(record.businessClockSyncedAt, offlineMinutes));
      incrementBand(cashDeltaBands, businessClockCashDeltaBand(pulse));

      return {
        profileId: record.id,
        serverId: record.serverId,
        companyName: record.companyName,
        lastSyncedAt: record.businessClockSyncedAt,
        offlineMinutes,
        settledMinutes: pulse?.settledMinutes ?? 0,
        cashDelta: pulse?.cashDelta ?? 0,
        riskStatus: record.riskStatus,
        managerTodoCount,
        anomaly
      };
    });

    return {
      summary: {
        totalPlayers: rows.length,
        syncedPlayers: rows.filter((row) => row.lastSyncedAt !== null).length,
        staleSyncCount: rows.filter((row) => row.lastSyncedAt !== null && row.offlineMinutes >= 240).length,
        riskPulseCount: rows.filter((row) => row.cashDelta < 0 || row.riskStatus !== "稳健" || row.managerTodoCount > 0).length,
        managerTodoCount: rows.reduce((total, row) => total + row.managerTodoCount, 0),
        anomalyCount: rows.filter((row) => row.anomaly !== null).length
      },
      offlineMinuteBands: [...offlineBands.entries()].map(([band, count]) => ({ band, count })),
      cashDeltaBands: [...cashDeltaBands.entries()].map(([band, count]) => ({ band, count })),
      rows
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

  async getLongTermGoals(accountId, serverId, today) {
    const profile = await this.getProfile(accountId, serverId);
    if (profile === undefined) {
      return "PLAYER_NOT_FOUND";
    }

    const [growth, tasks, season, leaderboards, crossServer, titles, achievements, guild] = await Promise.all([
      this.getCompanyGrowth(accountId, serverId),
      this.listTasks(accountId, serverId, today),
      this.getSeasonCenter(accountId, serverId, today),
      this.getLeaderboards(accountId, serverId, today),
      this.getCrossServerCenter(accountId, serverId, today),
      this.listTitles(accountId, serverId, today),
      this.listAchievements(accountId, serverId),
      this.getGuildCenter(accountId, serverId, today)
    ]);
    if (
      growth === "PLAYER_NOT_FOUND" ||
      tasks === "PLAYER_NOT_FOUND" ||
      leaderboards === "PLAYER_NOT_FOUND" ||
      titles === "PLAYER_NOT_FOUND" ||
      achievements === "PLAYER_NOT_FOUND" ||
      guild === "PLAYER_NOT_FOUND"
    ) {
      return "PLAYER_NOT_FOUND";
    }

    return buildLongTermGoalsRecord({
      profile,
      growth,
      tasks,
      season: season === "PLAYER_NOT_FOUND" || season === "SEASON_NOT_FOUND" ? null : season,
      leaderboards,
      crossServer: crossServer === "PLAYER_NOT_FOUND" || crossServer === "CROSS_SERVER_GROUP_NOT_FOUND" ? null : crossServer,
      titles,
      achievements,
      guild
    });
  },

  async listMails(accountId, serverId) {
    const profile = await this.getProfile(accountId, serverId);
    if (profile === undefined) {
      return "PLAYER_NOT_FOUND";
    }
    const [compensations, deliveries, claimedLedgers] = await Promise.all([
      prisma.adminMailCompensation.findMany({
        where: { profileId: profile.id },
        orderBy: [{ createdAt: "desc" }]
      }),
      prisma.leaderboardRewardDelivery.findMany({
        where: { profileId: profile.id, serverId },
        orderBy: [{ deliveredAt: "desc" }]
      }),
      prisma.platformCoinLedger.findMany({
        where: { profileId: profile.id, source: "mail_reward_claim" },
        select: { referenceId: true }
      })
    ]);
    const claimedReferenceIds = new Set(claimedLedgers.map((ledger) => ledger.referenceId).filter((id): id is string => id !== null));
    const mails: MailRecord[] = [
      ...compensations.map((mail): MailRecord => ({
        id: `admin:${mail.id}`,
        profileId: profile.id,
        channel: "compensation",
        subject: mail.subject,
        body: mail.body,
        rewardSummary: mail.platformCoins > 0 ? `平台币 +${mail.platformCoins}` : null,
        platformCoins: mail.platformCoins,
        canClaim: false,
        claimStatus: "claimed",
        statusLabel: mail.platformCoins > 0 ? "已领取" : "已读",
        createdAt: mail.createdAt.toISOString(),
        isRead: profile.unreadMailCount === 0
      })),
      ...deliveries.map((delivery): MailRecord => ({
        id: `reward:${delivery.id}`,
        profileId: profile.id,
        channel: "reward",
        subject: delivery.mailSubject,
        body: delivery.mailBody.startsWith("cross-daily-goal:") ? "今日跨服目标已完成。" : delivery.mailBody.startsWith("cross-stage-reward:") ? "跨服阶段奖励已完成。" : delivery.mailBody.includes("cross") ? "跨服奖励已送达邮箱。" : "榜单奖励已送达邮箱。",
        rewardSummary: delivery.rewardPlatformCoins > 0
          ? `平台币 +${delivery.rewardPlatformCoins}`
          : delivery.mailBody.startsWith("cross-daily-goal:reputation:")
            ? `声望 +${delivery.mailBody.slice("cross-daily-goal:reputation:".length)}`
            : delivery.mailBody.startsWith("cross-stage-reward:reputation:")
              ? `声望 +${delivery.mailBody.slice("cross-stage-reward:reputation:".length)}`
            : delivery.rewardTitleId === null ? "荣誉奖励" : `称号 ${delivery.rewardTitleId}`,
        platformCoins: delivery.rewardPlatformCoins,
        canClaim: delivery.rewardPlatformCoins > 0 && !claimedReferenceIds.has(delivery.id),
        claimStatus: delivery.rewardPlatformCoins <= 0 ? "none" : claimedReferenceIds.has(delivery.id) ? "claimed" : "claimable",
        statusLabel: delivery.rewardPlatformCoins <= 0 ? "已入账" : claimedReferenceIds.has(delivery.id) ? "已领取" : "待领取",
        createdAt: delivery.deliveredAt.toISOString(),
        isRead: profile.unreadMailCount === 0
      }))
    ];
    return buildMailCenterRecord(profile, mails);
  },

  async readAllMails(accountId, serverId) {
    const profile = await this.getProfile(accountId, serverId);
    if (profile === undefined) {
      return "PLAYER_NOT_FOUND";
    }
    const updatedCount = Math.max(0, profile.unreadMailCount);
    if (updatedCount > 0) {
      await prisma.playerProfile.update({
        where: { id: profile.id },
        data: { unreadMailCount: 0 }
      });
    }
    const mailCenter = await this.listMails(accountId, serverId);
    if (mailCenter === "PLAYER_NOT_FOUND") {
      return "PLAYER_NOT_FOUND";
    }
    return { updatedCount, mailCenter };
  },

  async claimMailAttachments(accountId, serverId) {
    const profile = await this.getProfile(accountId, serverId);
    if (profile === undefined) {
      return "PLAYER_NOT_FOUND";
    }
    const deliveries = await prisma.leaderboardRewardDelivery.findMany({
      where: {
        profileId: profile.id,
        serverId,
        rewardPlatformCoins: { gt: 0 }
      },
      orderBy: [{ deliveredAt: "asc" }]
    });
    const existingLedgers = await prisma.platformCoinLedger.findMany({
      where: {
        profileId: profile.id,
        source: "mail_reward_claim",
        referenceId: { in: deliveries.map((delivery) => delivery.id) }
      },
      select: { referenceId: true }
    });
    const claimedIds = new Set(existingLedgers.map((ledger) => ledger.referenceId).filter((id): id is string => id !== null));
    const claimableDeliveries = deliveries.filter((delivery) => !claimedIds.has(delivery.id));
    const platformCoins = claimableDeliveries.reduce((sum, delivery) => sum + delivery.rewardPlatformCoins, 0);

    if (claimableDeliveries.length > 0) {
      await prisma.$transaction(async (tx) => {
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
        let nextBalance = wallet.balance;
        for (const delivery of claimableDeliveries) {
          nextBalance += delivery.rewardPlatformCoins;
          await tx.platformCoinLedger.create({
            data: {
              profileId: profile.id,
              walletId: wallet.id,
              changeAmount: delivery.rewardPlatformCoins,
              balanceAfter: nextBalance,
              source: "mail_reward_claim",
              referenceId: delivery.id,
              reason: delivery.mailSubject
            }
          });
        }
        await tx.playerPlatformWallet.update({
          where: { id: wallet.id },
          data: { balance: nextBalance }
        });
        await tx.playerProfile.update({
          where: { id: profile.id },
          data: { platformCoins: nextBalance }
        });
      });
    }

    const [mailCenter, updatedProfile] = await Promise.all([
      this.listMails(accountId, serverId),
      this.getProfile(accountId, serverId)
    ]);
    if (mailCenter === "PLAYER_NOT_FOUND" || updatedProfile === undefined) {
      return "PLAYER_NOT_FOUND";
    }
    return {
      claimedCount: claimableDeliveries.length,
      platformCoins,
      mailCenter,
      profile: updatedProfile
    };
  },

  async getChatCenter(accountId, serverId, today) {
    const profile = await this.getProfile(accountId, serverId);
    if (profile === undefined) {
      return "PLAYER_NOT_FOUND";
    }
    const [guild, crossServer] = await Promise.all([
      prisma.guildMember.findUnique({ where: { profileId: profile.id } }),
      prisma.crossServerSignup.findFirst({ where: { profileId: profile.id, serverId, status: "active" } })
    ]);
    return buildChatCenterRecord(profile, runtimeChatMessages, runtimeChatKeywords, today, guild !== null, crossServer !== null);
  },

  async sendChatMessage(accountId, serverId, channel, content, today) {
    const profile = await this.getProfile(accountId, serverId);
    if (profile === undefined) {
      return "PLAYER_NOT_FOUND";
    }
    if (channel === "system") {
      return "CHAT_CHANNEL_READONLY";
    }
    const [guild, crossServer] = await Promise.all([
      prisma.guildMember.findUnique({ where: { profileId: profile.id } }),
      prisma.crossServerSignup.findFirst({ where: { profileId: profile.id, serverId, status: "active" } })
    ]);
    if (channel === "guild" && guild === null) {
      return "CHAT_GUILD_REQUIRED";
    }
    if (channel === "cross" && crossServer === null) {
      return "CHAT_CROSS_REQUIRED";
    }
    const filtered = maskChatContent(content, runtimeChatKeywords);
    if (filtered.filterAction === "block") {
      return "CHAT_CONTENT_BLOCKED";
    }
    const message: ChatMessageRecord = {
      id: randomUUID(),
      channel,
      serverId,
      profileId: profile.id,
      founderName: profile.founderName,
      content: filtered.content,
      originalContent: content,
      filterAction: filtered.filterAction,
      matchedKeywords: filtered.matchedKeywords,
      createdAt: new Date().toISOString()
    };
    runtimeChatMessages.unshift(message);
    return {
      message,
      chat: buildChatCenterRecord(profile, runtimeChatMessages, runtimeChatKeywords, today, guild !== null, crossServer !== null)
    };
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

  async getCompanyFinance(accountId, serverId, now) {
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

    const currentProfile = toProfileRecord(profile);
    const pulse = calculateBusinessClockPulse(currentProfile, now);
    if (pulse.previousSyncedAt !== null && pulse.settledTicks <= 0) {
      return {
        ...toCompanyFinanceRecord(currentProfile),
        businessClock: pulse
      };
    }

    const { profile: updated, loanSummaries } = await prisma.$transaction(async (tx) => {
      let savedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          businessClockSyncedAt: new Date(pulse.syncedAt),
          lastBusinessPulseSummaryJson: JSON.stringify(pulse),
          cash: { increment: pulse.cashDelta },
          valuation: { increment: pulse.valuationDelta },
          employeeSatisfaction: { increment: pulse.employeeSatisfactionDelta },
          customerSatisfaction: { increment: pulse.customerSatisfactionDelta }
        }
      });

      const loanSummaries: string[] = [];
      if (pulse.settledTicks > 0) {
        const loans = await tx.playerLoan.findMany({
          where: {
            profileId: profile.id,
            status: { in: ["active", "overdue"] }
          },
          orderBy: [{ overduePeriods: "desc" }, { createdAt: "asc" }]
        });

        for (const loan of loans) {
          const nextProgress = loan.periodProgressTicks + pulse.settledTicks;
          if (loan.status !== "overdue" && nextProgress < BUSINESS_CLOCK_LOAN_PERIOD_TICKS) {
            await tx.playerLoan.update({
              where: { id: loan.id },
              data: { periodProgressTicks: nextProgress }
            });
            continue;
          }

          const carryProgress =
            loan.status === "overdue"
              ? 0
              : Math.min(nextProgress - BUSINESS_CLOCK_LOAN_PERIOD_TICKS, BUSINESS_CLOCK_LOAN_PERIOD_TICKS - 1);
          const payment = loan.monthlyPayment + loan.penaltyAccrued;
          if (savedProfile.cash >= payment) {
            const principalPayment = calculatePrincipalPayment(loan);
            const remainingPrincipal = Math.max(0, loan.remainingPrincipal - principalPayment);
            const status = remainingPrincipal === 0 ? "settled" : "active";
            const nextOnTimeRepayPeriods = loan.onTimeRepayPeriods + 1;
            await tx.playerLoan.update({
              where: { id: loan.id },
              data: {
                remainingPrincipal,
                remainingMonths: status === "settled" ? 0 : Math.max(0, loan.remainingMonths - 1),
                penaltyAccrued: 0,
                overduePeriods: status === "settled" ? loan.overduePeriods : 0,
                onTimeRepayPeriods: nextOnTimeRepayPeriods,
                periodProgressTicks: status === "settled" ? 0 : carryProgress,
                status,
                settledAt: status === "settled" ? new Date() : null
              }
            });
            savedProfile = await tx.playerProfile.update({
              where: { id: profile.id },
              data: {
                cash: { decrement: payment },
                totalDebt: { decrement: Math.min(savedProfile.totalDebt, principalPayment + loan.penaltyAccrued) },
                riskStatus: nextOnTimeRepayPeriods >= 3 && savedProfile.riskStatus === "资金紧张" ? "预警" : savedProfile.riskStatus,
                debtWarning: remainingPrincipal === 0 ? "低" : savedProfile.debtWarning
              }
            });
            loanSummaries.push(`贷款自动扣款 ${payment.toLocaleString("zh-CN")}，${loan.name} 已还本期。`);
            continue;
          }

          const penalty = Math.max(1000, Math.round(loan.monthlyPayment * 0.08));
          await tx.playerLoan.update({
            where: { id: loan.id },
            data: {
              status: "overdue",
              overduePeriods: { increment: 1 },
              onTimeRepayPeriods: 0,
              penaltyAccrued: { increment: penalty },
              periodProgressTicks: 0
            }
          });
          savedProfile = await tx.playerProfile.update({
            where: { id: profile.id },
            data: {
              totalDebt: { increment: penalty },
              creditRating: downgradeCredit(savedProfile.creditRating),
              riskStatus: "资金紧张",
              debtWarning: "高",
              pendingEventCount: { increment: 1 }
            }
          });
          loanSummaries.push(`现金不足，${loan.name} 已逾期。`);
        }
      }

      const settledPulse = loanSummaries.length > 0 ? { ...pulse, summary: `${pulse.summary} ${loanSummaries.join(" ")}` } : pulse;
      if (loanSummaries.length > 0) {
        savedProfile = await tx.playerProfile.update({
          where: { id: profile.id },
          data: {
            lastBusinessPulseSummaryJson: JSON.stringify(settledPulse)
          }
        });
      }
      await createBusinessClockManagerTodo(tx, toProfileRecord(savedProfile), settledPulse);

      return { profile: savedProfile, loanSummaries };
    });

    const businessClock = loanSummaries.length > 0 ? { ...pulse, summary: `${pulse.summary} ${loanSummaries.join(" ")}` } : pulse;

    return {
      ...toCompanyFinanceRecord(toProfileRecord(updated)),
      businessClock
    };
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
            configId: firstConfig.id,
            sourceKey: `event:${firstConfig.id}:initial`
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
        const existingFollowup = await tx.playerEvent.findFirst({
          where: {
            profileId: profile.id,
            configId: event.config.followupEventId
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
              configId: followupConfig.id,
              sourceKey: `event:${event.id}:followup:${followupConfig.id}`
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

    const loans = await prisma.playerLoan.findMany({
      where: {
        profileId: profile.id,
        status: { not: "settled" }
      }
    });
    const activeLoan = loans.find((loan) => loan.configId === config.id);
    if (activeLoan !== undefined) {
      return "LOAN_ALREADY_ACTIVE";
    }
    if (creditRank(profile.creditRating) < creditRank(config.creditRequired)) {
      return "CREDIT_NOT_ENOUGH";
    }

    const finance = toCompanyFinanceRecord(toProfileRecord(profile));
    const hasOverdueLoan = loans.some((loan) => loan.status === "overdue");
    const crisisLevel: LoanCenterRecord["crisis"]["level"] =
      finance.cash < 0 || finance.debtRatioBasisPoints >= 9000
        ? "bankruptcy"
        : finance.riskStatus === "资金紧张" || hasOverdueLoan
          ? "cashflow"
          : finance.debtRatioBasisPoints >= 6000
            ? "debt"
            : "none";
    const gate = evaluateLoanGate(toProfileRecord(profile), finance, config, {
      hasActiveLoan: false,
      hasAnyActiveLoan: loans.length > 0,
      hasOverdueLoan,
      crisisLevel
    });
    if (!gate.isAvailable) {
      return "LOAN_LOCKED";
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
          riskStatus: config.riskDeltaOnApply > 0 ? "预警" : profile.riskStatus,
          creditRating: config.creditPenaltyOnApply > 0 ? downgradeCredit(profile.creditRating) : profile.creditRating,
          debtWarning: "中"
        }
      });
      return { loan, profile: updatedProfile };
    });

    return {
      loan: toLoanRecord(result.loan),
      loanCenter: await toLoanCenterRecord(prisma, toProfileRecord(result.profile)),
      result: `${config.name} 放款 +${config.principal.toLocaleString("zh-CN")}`
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
      const nextOnTimeRepayPeriods = mode === "scheduled" ? loan.onTimeRepayPeriods + 1 : loan.onTimeRepayPeriods;
      const updatedLoan = await tx.playerLoan.update({
        where: { id: loan.id },
        data: {
          remainingPrincipal,
          remainingMonths,
          penaltyAccrued: 0,
          overduePeriods: status === "settled" ? loan.overduePeriods : 0,
          onTimeRepayPeriods: nextOnTimeRepayPeriods,
          periodProgressTicks: 0,
          status,
          settledAt: status === "settled" ? new Date() : null
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { decrement: payment },
          totalDebt: { decrement: Math.min(profile.totalDebt, principalPayment + loan.penaltyAccrued) },
          riskStatus: mode === "scheduled" && nextOnTimeRepayPeriods >= 3 && profile.riskStatus === "资金紧张" ? "预警" : profile.riskStatus,
          debtWarning: remainingPrincipal === 0 ? "低" : profile.debtWarning
        }
      });
      return { loan: updatedLoan, profile: updatedProfile };
    });

    return {
      loan: toLoanRecord(result.loan),
      loanCenter: await toLoanCenterRecord(prisma, toProfileRecord(result.profile)),
      result: mode === "full" ? "贷款已结清" : "本期已还"
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
        const nextOnTimeRepayPeriods = loan.onTimeRepayPeriods + 1;
        const updatedLoan = await tx.playerLoan.update({
          where: { id: loan.id },
          data: {
            remainingPrincipal,
            remainingMonths: status === "settled" ? 0 : Math.max(0, loan.remainingMonths - 1),
            penaltyAccrued: 0,
            overduePeriods: status === "settled" ? loan.overduePeriods : 0,
            onTimeRepayPeriods: nextOnTimeRepayPeriods,
            periodProgressTicks: 0,
            status,
            settledAt: status === "settled" ? new Date() : null
          }
        });
        const updatedProfile = await tx.playerProfile.update({
          where: { id: profile.id },
          data: {
          cash: { decrement: payment },
          totalDebt: { decrement: Math.min(profile.totalDebt, principalPayment + loan.penaltyAccrued) },
          riskStatus: nextOnTimeRepayPeriods >= 3 && profile.riskStatus === "资金紧张" ? "预警" : profile.riskStatus,
          debtWarning: remainingPrincipal === 0 ? "低" : profile.debtWarning
        }
      });
        return { loan: updatedLoan, profile: updatedProfile };
      });

      return {
        loan: toLoanRecord(result.loan),
        loanCenter: await toLoanCenterRecord(prisma, toProfileRecord(result.profile)),
        result: "本期已还"
      };
    }

    const penalty = Math.max(1000, Math.round(loan.monthlyPayment * 0.08));
    const result = await prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.playerLoan.update({
        where: { id: loan.id },
        data: {
          status: "overdue",
          overduePeriods: { increment: 1 },
          onTimeRepayPeriods: 0,
          penaltyAccrued: { increment: penalty },
          periodProgressTicks: 0
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
      result: `现金不足，已逾期 +罚息 ${penalty.toLocaleString("zh-CN")}`
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

    const [fundings, products] = await Promise.all([
      prisma.playerFunding.findMany({ where: { profileId: profile.id } }),
      prisma.playerProduct.findMany({ where: { profileId: profile.id } })
    ]);
    const fundedInvestorCounts = new Map<string, number>();
    for (const funding of fundings.filter((funding) => funding.status === "funded")) {
      fundedInvestorCounts.set(funding.investorId, (fundedInvestorCounts.get(funding.investorId) ?? 0) + 1);
    }
    const activeInvestorIds = new Set(fundings.filter((funding) => funding.status === "pending").map((funding) => funding.investorId));
    const offer = calculateFundingOffer(
      toProfileRecord(profile),
      calculateFundingProductMetrics(products),
      config,
      fundedInvestorCounts,
      activeInvestorIds
    );
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
        term: offer.term,
        offerType: offer.offerType,
        offerStatus: "accepted",
        paymentStatus: "pending",
        disbursementStatus: "scheduled",
        legalReviewStatus: offer.gate.requiresLegalReview ? "pending" : "not_required",
        postEventStatus: "none",
        followOnSequence: offer.followOnSequence,
        followOnCount: 0
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

    if (funding.legalReviewStatus === "blocked" || funding.disbursementStatus === "paused") {
      return "FUNDING_LOCKED";
    }

    const isSuccess = fundingSettlementRoll(funding.investorId) < funding.successRate;
    const settled = await prisma.$transaction(async (tx) => {
      const resultSummary = isSuccess
        ? `${funding.investorName} 完成打款，创始人股权稀释 ${(funding.equityBasisPoints / 100).toFixed(1)}%。`
        : `${funding.investorName} 暂缓投资，董事会要求提交替代现金流方案。`;
      const updatedFunding = await tx.playerFunding.update({
        where: { id: funding.id },
        data: {
          status: isSuccess ? "funded" : "failed",
          offerStatus: "closed",
          paymentStatus: isSuccess ? "paid" : "none",
          disbursementStatus: isSuccess ? "completed" : funding.disbursementStatus,
          postEventStatus: isSuccess ? (shouldCreatePostFundingEvent(funding) ? "pending" : "not_required") : "none",
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
              riskStatus: "预警"
            }
      });

      const postInvestmentEvents: Array<{ eventId: string; configId: string; title: string }> = [];
      if (isSuccess && shouldCreatePostFundingEvent(funding)) {
        const postFundingConfig = await tx.eventConfig.findUnique({ where: { id: "post-funding-board-review" } });
        if (postFundingConfig !== null) {
          const postEvent = await tx.playerEvent.upsert({
            where: {
              profileId_configId_sourceKey: {
                profileId: profile.id,
                configId: postFundingConfig.id,
                sourceKey: `funding:${funding.id}:post-investment`
              }
            },
            update: { status: "pending" },
            create: {
              id: randomUUID(),
              profileId: profile.id,
              configId: postFundingConfig.id,
              sourceKey: `funding:${funding.id}:post-investment`
            }
          });
          postInvestmentEvents.push({ eventId: postEvent.id, configId: postFundingConfig.id, title: postFundingConfig.title });
        }
      }

      if (!isSuccess) {
        const failureConfig = await tx.eventConfig.findUnique({ where: { id: "funding-failed-bridge-plan" } });
        if (failureConfig !== null) {
          await tx.playerEvent.upsert({
            where: {
              profileId_configId_sourceKey: {
                profileId: profile.id,
                configId: failureConfig.id,
                sourceKey: `funding:${funding.id}:failed-bridge-plan`
              }
            },
            update: { status: "pending" },
            create: {
              id: randomUUID(),
              profileId: profile.id,
              configId: failureConfig.id,
              sourceKey: `funding:${funding.id}:failed-bridge-plan`
            }
          });
        }
      }

      const pendingEventCount = await tx.playerEvent.count({
        where: {
          profileId: profile.id,
          status: "pending"
        }
      });
      const syncedProfile = await tx.playerProfile.update({
        where: { id: updatedProfile.id },
        data: { pendingEventCount }
      });

      return { funding: updatedFunding, profile: syncedProfile, resultSummary, postInvestmentEvents };
    });

    return {
      funding: toFundingRecord(settled.funding),
      fundingCenter: await toFundingCenterRecord(prisma, toProfileRecord(settled.profile)),
      result: settled.resultSummary,
      postInvestmentEvents: settled.postInvestmentEvents
    };
  },

  async reviewFundingLegalTerms(accountId, serverId, fundingId) {
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

    const riskLevel = funding.boardPressure >= 30 ? "medium" : "low";
    const status = funding.boardPressure >= 45 ? "blocked" : "passed";
    const updatedFunding = await prisma.playerFunding.update({
      where: { id: funding.id },
      data: {
        legalReviewStatus: status
      }
    });

    return {
      funding: toFundingRecord(updatedFunding),
      fundingCenter: await toFundingCenterRecord(prisma, toProfileRecord(profile)),
      result: status === "passed" ? "法务复核已通过，融资条款可以继续推进。" : "法务复核发现高风险条款，需要暂缓推进。",
      legalReview: {
        status,
        riskLevel,
        checkedClauses: ["股权稀释", "董事会观察权", "回购和对赌条款"]
      }
    };
  },

  async pauseFundingDisbursement(accountId, serverId, fundingId, reason) {
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

    const paused = await prisma.$transaction(async (tx) => {
      const updatedFunding = await tx.playerFunding.update({
        where: { id: funding.id },
        data: {
          disbursementStatus: "paused",
          paymentStatus: "paused"
        }
      });

      const pausedConfig = await tx.eventConfig.findUnique({ where: { id: "funding-disbursement-paused" } });
      const event = pausedConfig === null
        ? null
        : await tx.playerEvent.upsert({
            where: {
              profileId_configId_sourceKey: {
                profileId: profile.id,
                configId: pausedConfig.id,
                sourceKey: `funding:${funding.id}:pause-disbursement`
              }
            },
            update: { status: "pending", resultSummary: reason },
            create: {
              id: randomUUID(),
              profileId: profile.id,
              configId: pausedConfig.id,
              sourceKey: `funding:${funding.id}:pause-disbursement`,
              resultSummary: reason
            },
            include: { config: true }
          });

      const pendingEventCount = await tx.playerEvent.count({
        where: {
          profileId: profile.id,
          status: "pending"
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: { pendingEventCount }
      });

      return { funding: updatedFunding, profile: updatedProfile, event };
    });

    return {
      funding: toFundingRecord(paused.funding),
      fundingCenter: await toFundingCenterRecord(prisma, toProfileRecord(paused.profile)),
      result: "融资打款已暂停，等待条款复核确认。",
      event: paused.event === null ? null : toEventRecord(paused.event)
    };
  },

  async applyFundingFollowOn(accountId, serverId, fundingId, amount, equityBasisPoints) {
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
      },
      include: { investor: true }
    });
    if (funding === null) {
      return "FUNDING_NOT_FOUND";
    }
    if (funding.status !== "funded" || !funding.investor.allowFollowOn || amount <= 0 || equityBasisPoints <= 0 || profile.founderEquityBasisPoints <= equityBasisPoints) {
      return "FUNDING_LOCKED";
    }

    const followed = await prisma.$transaction(async (tx) => {
      const updatedFunding = await tx.playerFunding.update({
        where: { id: funding.id },
        data: {
          offerType: "follow_on",
          followOnCount: { increment: 1 },
          disbursementStatus: "completed",
          paymentStatus: "paid"
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { increment: amount },
          founderEquityBasisPoints: { decrement: equityBasisPoints },
          valuation: { increment: amount },
          reputation: { increment: 200 }
        }
      });
      return { funding: updatedFunding, profile: updatedProfile };
    });

    return {
      funding: toFundingRecord(followed.funding),
      fundingCenter: await toFundingCenterRecord(prisma, toProfileRecord(followed.profile)),
      result: `${funding.investorName} 完成加投，追加资金 ${amount.toLocaleString("zh-CN")}。`,
      followOn: {
        amount,
        equityBasisPoints
      }
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
              profileId_configId_sourceKey: {
                profileId: profile.id,
                configId: incidentConfig.id,
                sourceKey: `product:${product.id}:tech-debt-incident`
              }
            },
            update: { status: "pending" },
            create: {
              id: randomUUID(),
              profileId: profile.id,
              configId: incidentConfig.id,
              sourceKey: `product:${product.id}:tech-debt-incident`
            }
          });
        }
      }

      const pendingEventCount = await tx.playerEvent.count({
        where: {
          profileId: profile.id,
          status: "pending"
        }
      });
      const syncedProfile = nextMetrics.incidentTriggered
        ? await tx.playerProfile.update({
            where: { id: updatedProfile.id },
            data: { pendingEventCount }
          })
        : updatedProfile;

      return { product: updatedProduct, profile: syncedProfile };
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

  async listShop(accountId, serverId, today) {
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

    return toShopCenterRecord(prisma, toProfileRecord(profile), today);
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
        purchase: toShopPurchaseRecord(existingPurchase, existingPurchase.product, today, {
          isClaimableToday: false,
          isClaimedToday: isDailyClaimPrivilegeProduct(existingPurchase.product)
        }),
        profile: toProfileRecord(currentProfile),
        isDuplicate: true,
        result: "重复请求已识别，未重复扣除平台币。"
      };
    }

    const product = await prisma.shopProductConfig.findUnique({ where: { id: productId }, include: { rewardItem: true } });
    if (product === null || !product.isActive) {
      return "SHOP_PRODUCT_NOT_FOUND";
    }
    const now = toServerDate(today);
    const purchaseCount = product.category === "daily_pack"
      ? await prisma.playerShopPurchase.count({
          where: {
            profileId: profile.id,
            productId,
            createdAt: {
              gte: new Date(`${today}T00:00:00.000Z`),
              lt: new Date(`${today}T23:59:59.999Z`)
            }
          }
        })
      : product.durationDays > 0
        ? (await prisma.playerShopPurchase.findMany({ where: { profileId: profile.id, productId }, select: { createdAt: true, expiresAt: true } }))
            .filter((purchase) => isActiveShopPurchase(resolveShopPurchaseExpiresAt(purchase.createdAt, product.durationDays, purchase.expiresAt), now))
            .length
        : await prisma.playerShopPurchase.count({ where: { profileId: profile.id, productId } });
    if (product.purchaseLimit > 0 && purchaseCount >= product.purchaseLimit) {
      return "PURCHASE_LIMIT_REACHED";
    }

    const isDailyPrivilege = isDailyClaimPrivilegeProduct(product);
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
          expiresAt: product.durationDays > 0 ? addDays(now, product.durationDays) : null,
          createdAt: product.category === "daily_pack" ? new Date(`${today}T00:00:00.000Z`) : undefined
        }
      });
      if (!isDailyPrivilege) {
        await grantInventoryItem(
          tx,
          profile.id,
          product.rewardItemId,
          product.rewardItemQuantity,
          "shop_purchase",
          purchase.id,
          `购买商品：${product.name}`
        );
      }
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
          cash: isDailyPrivilege ? undefined : { increment: product.rewardCash },
          actionPower: isDailyPrivilege ? undefined : { increment: product.rewardActionPower },
          reputation: isDailyPrivilege ? undefined : { increment: product.rewardReputation }
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
      purchase: toShopPurchaseRecord(result.purchase, product, today, { isClaimableToday: isDailyPrivilege }),
      profile: toProfileRecord(result.profile),
      isDuplicate: false,
      result: isDailyPrivilege
        ? `${product.name} 已开通，今日权益可手动领取。`
        : `${product.name} 已发货，平台币扣减和奖励发放已记录流水。`
    };
  },

  async claimPrivilegeDailyReward(accountId, serverId, purchaseId, requestId, today) {
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

    const purchase = await prisma.playerShopPurchase.findFirst({
      where: { id: purchaseId, profileId: profile.id },
      include: { product: { include: { rewardItem: true } } }
    });
    if (purchase === null) {
      return "PRIVILEGE_PURCHASE_NOT_FOUND";
    }
    if (!isDailyClaimPrivilegeProduct(purchase.product)) {
      return "PRIVILEGE_NOT_DAILY_CLAIMABLE";
    }
    const expiresAt = resolveShopPurchaseExpiresAt(purchase.createdAt, purchase.product.durationDays, purchase.expiresAt);
    if (!isActiveShopPurchase(expiresAt, toServerDate(today))) {
      return "PRIVILEGE_EXPIRED";
    }

    const existingRequest = await prisma.playerPrivilegeDailyClaim.findUnique({
      where: {
        profileId_requestId: {
          profileId: profile.id,
          requestId
        }
      }
    });
    if (existingRequest !== null) {
      return "PRIVILEGE_DAILY_ALREADY_CLAIMED";
    }

    const existingDailyClaim = await prisma.playerPrivilegeDailyClaim.findUnique({
      where: {
        profileId_purchaseId_claimDate: {
          profileId: profile.id,
          purchaseId,
          claimDate: today
        }
      }
    });
    if (existingDailyClaim !== null) {
      return "PRIVILEGE_DAILY_ALREADY_CLAIMED";
    }

    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.playerPrivilegeDailyClaim.create({
        data: {
          profileId: profile.id,
          purchaseId,
          requestId,
          claimDate: today,
          rewardCash: purchase.product.rewardCash,
          rewardActionPower: purchase.product.rewardActionPower,
          rewardReputation: purchase.product.rewardReputation,
          rewardItemId: purchase.product.rewardItemId,
          rewardItemQuantity: purchase.product.rewardItemQuantity
        }
      });
      await grantInventoryItem(
        tx,
        profile.id,
        purchase.product.rewardItemId,
        purchase.product.rewardItemQuantity,
        "shop_purchase",
        claim.id,
        `领取特权每日权益：${purchase.product.name}`
      );
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { increment: purchase.product.rewardCash },
          actionPower: { increment: purchase.product.rewardActionPower },
          reputation: { increment: purchase.product.rewardReputation }
        }
      });
      return { claim, profile: updatedProfile };
    });

    return {
      shopCenter: await toShopCenterRecord(prisma, toProfileRecord(result.profile), today),
      profile: toProfileRecord(result.profile),
      claim: {
        id: result.claim.id,
        purchaseId: result.claim.purchaseId,
        claimDate: result.claim.claimDate,
        rewardCash: result.claim.rewardCash,
        rewardActionPower: result.claim.rewardActionPower,
        rewardReputation: result.claim.rewardReputation,
        rewardItem: toItemRewardRecord(purchase.product.rewardItem, purchase.product.rewardItemQuantity),
        createdAt: result.claim.createdAt.toISOString()
      },
      result: `${purchase.product.name} 今日权益已领取。`
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

  async getAdminConfigCenter(today) {
    const [titles, achievements, knowledgeEntries, shopProducts, leaderboardSnapshots, mailCompensations, seasons, activities, activityShopItems, scenarios] = await Promise.all([
      prisma.titleConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.achievementConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.knowledgeEntry.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 100 }),
      prisma.shopProductConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.leaderboardSnapshot.findMany({ orderBy: [{ createdAt: "desc" }], take: 20 }),
      prisma.adminMailCompensation.findMany({ orderBy: [{ createdAt: "desc" }], take: 20 }),
      prisma.seasonConfig.findMany({
        include: {
          _count: {
            select: {
              tasks: true,
              activities: true,
              passPurchases: true
            }
          }
        },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
      }),
      prisma.activityConfig.findMany({
        include: { states: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
      }),
      prisma.activityShopItemConfig.findMany({
        include: {
          rewardItem: true,
          purchases: true
        },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
      }),
      prisma.scenarioConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] })
    ]);
    const activityBoardKeys = activities.map((activity) => activity.leaderboardKey);
    const leaderboardDeliveries = activityBoardKeys.length === 0
      ? []
      : await prisma.leaderboardRewardDelivery.findMany({
        where: { boardKey: { in: activityBoardKeys } },
        orderBy: [{ snapshotDate: "desc" }, { rank: "asc" }],
        take: 200
      });
    const countDeliveries = (boardKey: string, snapshotDate: string) =>
      leaderboardDeliveries.filter((delivery) => delivery.boardKey === boardKey && delivery.snapshotDate === snapshotDate).length;
    const activityRewardLabel = (activity: (typeof activities)[number]) => [
      activity.rewardReputation > 0 ? `声望 +${activity.rewardReputation}` : "",
      activity.rewardPoints > 0 ? `活动积分 +${activity.rewardPoints}` : "",
      activity.rewardTitleId !== null ? `称号 ${activity.rewardTitleId}` : ""
    ].filter(Boolean).join(" / ") || "荣誉奖励";
    const shopRewardLabel = (item: (typeof activityShopItems)[number]) => [
      item.rewardActionPower > 0 ? `行动力 +${item.rewardActionPower}` : "",
      item.rewardReputation > 0 ? `声望 +${item.rewardReputation}` : "",
      item.rewardItem !== null && item.rewardItemQuantity > 0 ? `${item.rewardItem.name} x${item.rewardItemQuantity}` : ""
    ].filter(Boolean).join(" / ") || "活动权益";
    const settlementMap = new Map<string, {
      boardKey: string;
      snapshotDate: string;
      deliveredRewards: number;
      rewardPlatformCoinsTotal: number;
      rewardBoundary: string;
    }>();
    for (const delivery of leaderboardDeliveries) {
      const key = `${delivery.boardKey}:${delivery.snapshotDate}`;
      const current = settlementMap.get(key) ?? {
        boardKey: delivery.boardKey,
        snapshotDate: delivery.snapshotDate,
        deliveredRewards: 0,
        rewardPlatformCoinsTotal: 0,
        rewardBoundary: "leaderboard_no_cash_no_platform_coins"
      };
      current.deliveredRewards += 1;
      current.rewardPlatformCoinsTotal += delivery.rewardPlatformCoins;
      settlementMap.set(key, current);
    }

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
      chatKeywords: runtimeChatKeywords.map((keyword) => ({
        id: keyword.id,
        keyword: keyword.keyword,
        sourceType: keyword.sourceType,
        action: keyword.action,
        isEnabled: keyword.isEnabled,
        license: keyword.license,
        sourceHash: keyword.sourceHash,
        importBatch: keyword.importBatch
      })),
      seasons: seasons.map((season) => ({
        id: season.id,
        name: season.name,
        status: readSeasonStatus(season.startDate, season.endDate, today),
        startDate: season.startDate,
        endDate: season.endDate,
        passPricePlatformCoins: season.passPricePlatformCoins,
        taskCount: season._count.tasks,
        activityCount: season._count.activities,
        passPurchaseCount: season._count.passPurchases
      })),
      activities: activities.map((activity) => {
        const joinedStates = activity.states.filter((state) => state.isJoined || state.score > 0);
        return {
          id: activity.id,
          seasonId: activity.seasonId,
          name: activity.name,
          status: readSeasonStatus(activity.startDate, activity.endDate, today),
          startDate: activity.startDate,
          endDate: activity.endDate,
          leaderboardKey: activity.leaderboardKey,
          targetScore: activity.targetScore,
          participantCount: joinedStates.length,
          totalScore: joinedStates.reduce((total, state) => total + state.score, 0),
          isSettled: countDeliveries(activity.leaderboardKey, activity.endDate) > 0,
          deliveredRewards: countDeliveries(activity.leaderboardKey, activity.endDate),
          rewardLabel: activityRewardLabel(activity),
          rewardBoundary: "leaderboard_no_cash_no_platform_coins"
        };
      }),
      activityShopItems: activityShopItems.map((item) => ({
        id: item.id,
        seasonId: item.seasonId,
        name: item.name,
        costPoints: item.costPoints,
        purchaseLimit: item.purchaseLimit,
        purchaseCount: item.purchases.length,
        rewardLabel: shopRewardLabel(item),
        isActive: item.isActive
      })),
      seasonPass: seasons.map((season) => ({
        seasonId: season.id,
        pricePlatformCoins: season.passPricePlatformCoins,
        purchaseCount: season._count.passPurchases,
        rewardLabel: "解锁赛季高级奖励轨"
      })),
      leaderboardSettlements: [...settlementMap.values()],
      scenarios: scenarios.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        rewardTitleId: scenario.rewardTitleId
      }))
    };
  },

  async listAdminChatKeywords(filters) {
    return listChatKeywords(runtimeChatKeywords, filters);
  },

  async updateAdminChatKeyword(adminUserId, keywordId, input) {
    const keyword = runtimeChatKeywords.find((item) => item.id === keywordId);
    if (keyword === undefined) {
      return "CHAT_KEYWORD_NOT_FOUND";
    }
    Object.assign(keyword, {
      action: input.action,
      isEnabled: input.isEnabled,
      replacement: input.replacement || keyword.replacement,
      updatedAt: new Date().toISOString()
    });
    const audit = await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: "admin_chat_keyword_update",
        targetType: "chat_keyword",
        targetId: keyword.id,
        detail: JSON.stringify({ keyword: keyword.keyword, action: keyword.action, isEnabled: keyword.isEnabled, reason: input.reason })
      }
    });
    return { keyword, auditLogId: audit.id };
  },

  async getAdminMonetizationBoundaries(today) {
    const [shopProducts, seasons, activityShopItems] = await Promise.all([
      prisma.shopProductConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.seasonConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.activityShopItemConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] })
    ]);
    const walletPolicies: AdminMonetizationBoundaryRecord["walletPolicies"] = [
      {
        id: "reserved_payment",
        flow: "source",
        vipExperiencePolicy: "外部支付只生成待核销订单，不自动计入 VIP 经验。",
        boundaryLabel: "现金支付与平台币入账分离"
      },
      {
        id: "admin_grant",
        flow: "source",
        vipExperiencePolicy: "后台发放平台币不自动计入 VIP 经验。",
        boundaryLabel: "后台发放只记平台币账本和审计"
      },
      {
        id: "system_compensation",
        flow: "source",
        vipExperiencePolicy: "系统补偿不自动计入 VIP 经验。",
        boundaryLabel: "补偿平台币不放大付费等级"
      },
      {
        id: "shop_purchase",
        flow: "spend",
        vipExperiencePolicy: "平台币消费计入 VIP 经验。",
        boundaryLabel: "平台币消费进入商品发放链路"
      },
      {
        id: "season_pass_purchase",
        flow: "spend",
        vipExperiencePolicy: "购买消耗平台币时计入 VIP 经验。",
        boundaryLabel: "通行证只解锁赛季高级奖励轨"
      }
    ];
    const rewardType = (product: (typeof shopProducts)[number]) => {
      const rewards = [
        product.durationDays > 0 && (product.category === "monthly_card" || product.category === "weekly_card") ? "长期权益" : "",
        product.category === "growth_fund" ? "成长返还" : "",
        product.rewardCash > 0 ? "经营现金" : "",
        product.rewardActionPower > 0 ? "行动力" : "",
        product.rewardReputation > 0 ? "声望" : "",
        product.rewardItemId !== null && product.rewardItemQuantity > 0 ? "经营道具" : ""
      ].filter(Boolean);
      return rewards.join(" / ") || "经营权益";
    };
    const paidProductBoundaries = shopProducts.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      pricePlatformCoins: product.pricePlatformCoins,
      rewardType: rewardType(product),
      vipExperiencePolicy: "购买消耗平台币时计入 VIP 经验，后台发放不补记。",
      leaderboardRewardPolicy: "不改变排行榜结算奖励。"
    }));
    const activeSeason = seasons.find((season) => readSeasonStatus(season.startDate, season.endDate, today) === "active") ?? seasons[0] ?? null;
    const riskItems: AdminMonetizationBoundaryRecord["riskItems"] = [];
    for (const product of shopProducts) {
      if (product.pricePlatformCoins < 0) {
        riskItems.push({
          id: `shop-price:${product.id}`,
          level: "critical",
          message: `商品 ${product.name} 的平台币价格小于 0。`,
          suggestion: "修正商品平台币价格，避免破坏平台币消耗边界。"
        });
      }
    }
    for (const season of seasons) {
      if (season.passPricePlatformCoins < 0) {
        riskItems.push({
          id: `season-pass-price:${season.id}`,
          level: "critical",
          message: `赛季 ${season.name} 的通行证价格小于 0。`,
          suggestion: "修正通行证平台币价格，保持付费消耗为非负数。"
        });
      }
    }
    for (const item of activityShopItems) {
      if (item.costPoints < 0 || item.purchaseLimit < 0) {
        riskItems.push({
          id: `activity-shop-invalid:${item.id}`,
          level: "critical",
          message: `活动商店 ${item.name} 的积分或限购小于 0。`,
          suggestion: "修正活动商店积分消耗与限购，避免活动积分兑换链路失真。"
        });
      }
    }
    return {
      summary: {
        platformCoinSourceCount: walletPolicies.filter((policy) => policy.flow === "source").length,
        platformCoinSpendCount: walletPolicies.filter((policy) => policy.flow === "spend").length,
        vipExperienceSourceCount: walletPolicies.filter((policy) => policy.vipExperiencePolicy.includes("计入 VIP 经验") && !policy.vipExperiencePolicy.includes("不自动")).length,
        paidProductCount: paidProductBoundaries.length,
        riskCount: riskItems.length
      },
      walletPolicies,
      paidProductBoundaries,
      seasonPassBoundary: {
        seasonId: activeSeason?.id ?? "",
        pricePlatformCoins: activeSeason?.passPricePlatformCoins ?? 0,
        vipExperiencePolicy: "购买消耗平台币时计入 VIP 经验，通行证本身不直接发放 VIP 经验。",
        leaderboardRewardPolicy: "不改变排行榜结算奖励。"
      },
      activityShopBoundary: {
        itemCount: activityShopItems.length,
        platformCoinRewardItemCount: 0,
        rewardPolicy: "活动商店只消耗活动积分，不产出平台币；经营道具只缓解风险，不免除经营判断。"
      },
      riskItems
    };
  },

  async getAdminActivitySchedule(today) {
    const activities = await prisma.activityConfig.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
    });
    const activityBoardKeys = activities.map((activity) => activity.leaderboardKey).filter((boardKey) => boardKey.trim() !== "");
    const platformCoinRewardBoardKeys = new Set(
      activityBoardKeys.length === 0
        ? []
        : (await prisma.leaderboardRewardDelivery.findMany({
          where: {
            boardKey: { in: activityBoardKeys },
            rewardPlatformCoins: { gt: 0 }
          },
          select: { boardKey: true }
        })).map((delivery) => delivery.boardKey)
    );

    return buildAdminActivitySchedule(activities, today, platformCoinRewardBoardKeys);
  },

  async validateAdminActivityConfigDraft(draft, today) {
    const activities = await prisma.activityConfig.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
    });

    return validateAdminActivityConfigDraft(draft, activities, today);
  },

  async listAdminActivityConfigDrafts(status, today) {
    const [activities, drafts] = await Promise.all([
      prisma.activityConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.activityConfigDraft.findMany({
        where: ["draft", "pending_review", "approved", "rejected", "published"].includes(status) ? { status } : undefined,
        orderBy: [{ updatedAt: "desc" }, { activityId: "asc" }]
      })
    ]);
    const rows = drafts.map((draft) => toAdminActivityConfigDraftRecord({
      ...draft,
      draftId: draft.id,
      id: draft.activityId,
      status: draft.status as AdminActivityConfigDraftStatus
    }, activities, today));

    return {
      rows,
      summary: {
        total: rows.length,
        draft: rows.filter((draft) => draft.status === "draft").length,
        pending_review: rows.filter((draft) => draft.status === "pending_review").length,
        approved: rows.filter((draft) => draft.status === "approved").length,
        rejected: rows.filter((draft) => draft.status === "rejected").length,
        published: rows.filter((draft) => draft.status === "published").length
      }
    };
  },

  async saveAdminActivityConfigDraft(adminUserId, draft, today) {
    const [activities, result] = await prisma.$transaction(async (tx) => {
      const saved = await tx.activityConfigDraft.upsert({
        where: { activityId: draft.id },
        update: {
          name: draft.name,
          startDate: draft.startDate,
          endDate: draft.endDate,
          leaderboardKey: draft.leaderboardKey,
          targetScore: draft.targetScore,
          progressMode: draft.progressMode,
          progressScore: draft.progressScore,
          dailyProgressLimit: draft.dailyProgressLimit,
          actionPowerCost: draft.actionPowerCost,
          rewardCash: draft.rewardCash,
          rewardPlatformCoins: draft.rewardPlatformCoins,
          rewardReputation: draft.rewardReputation,
          rewardPoints: draft.rewardPoints,
          rewardTitleId: draft.rewardTitleId,
          status: "draft",
          updatedByAdminUserId: adminUserId,
          submittedAt: null,
          reviewedAt: null,
          reviewedByAdminUserId: null,
          reviewNote: null
        },
        create: {
          activityId: draft.id,
          name: draft.name,
          startDate: draft.startDate,
          endDate: draft.endDate,
          leaderboardKey: draft.leaderboardKey,
          targetScore: draft.targetScore,
          progressMode: draft.progressMode,
          progressScore: draft.progressScore,
          dailyProgressLimit: draft.dailyProgressLimit,
          actionPowerCost: draft.actionPowerCost,
          rewardCash: draft.rewardCash,
          rewardPlatformCoins: draft.rewardPlatformCoins,
          rewardReputation: draft.rewardReputation,
          rewardPoints: draft.rewardPoints,
          rewardTitleId: draft.rewardTitleId,
          status: "draft",
          createdByAdminUserId: adminUserId,
          updatedByAdminUserId: adminUserId
        }
      });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin_activity_draft_save",
          targetType: "activity_config_draft",
          targetId: saved.id,
          detail: JSON.stringify({ activityId: saved.activityId, status: saved.status })
        }
      });
      const configs = await tx.activityConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
      return [configs, { saved, audit }] as const;
    });
    const record = toAdminActivityConfigDraftRecord({
      ...result.saved,
      draftId: result.saved.id,
      id: result.saved.activityId,
      status: result.saved.status as AdminActivityConfigDraftStatus
    }, activities, today);

    return { draft: record, validation: record.validation, auditLogId: result.audit.id };
  },

  async submitAdminActivityConfigDraft(adminUserId, draftId, reason, today) {
    const current = await prisma.activityConfigDraft.findUnique({ where: { id: draftId } });
    if (current === null) {
      return "ACTIVITY_DRAFT_NOT_FOUND";
    }
    const activities = await prisma.activityConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
    const currentRecord = toAdminActivityConfigDraftRecord({
      ...current,
      draftId: current.id,
      id: current.activityId,
      status: current.status as AdminActivityConfigDraftStatus
    }, activities, today);
    if (!currentRecord.validation.summary.isValid) {
      return "ACTIVITY_DRAFT_VALIDATION_FAILED";
    }
    if (current.status === "pending_review") {
      return { draft: currentRecord, validation: currentRecord.validation, auditLogId: null };
    }

    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.activityConfigDraft.update({
        where: { id: draftId },
        data: {
          status: "pending_review",
          updatedByAdminUserId: adminUserId,
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedByAdminUserId: null,
          reviewNote: null
        }
      });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin_activity_draft_submit",
          targetType: "activity_config_draft",
          targetId: saved.id,
          detail: JSON.stringify({ activityId: saved.activityId, reason, status: saved.status })
        }
      });
      return { saved, audit };
    });
    const record = toAdminActivityConfigDraftRecord({
      ...result.saved,
      draftId: result.saved.id,
      id: result.saved.activityId,
      status: result.saved.status as AdminActivityConfigDraftStatus
    }, activities, today);

    return { draft: record, validation: record.validation, auditLogId: result.audit.id };
  },

  async reviewAdminActivityConfigDraft(adminUserId, draftId, status, reason, today) {
    const current = await prisma.activityConfigDraft.findUnique({ where: { id: draftId } });
    if (current === null) {
      return "ACTIVITY_DRAFT_NOT_FOUND";
    }
    const activities = await prisma.activityConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
    const currentRecord = toAdminActivityConfigDraftRecord({
      ...current,
      draftId: current.id,
      id: current.activityId,
      status: current.status as AdminActivityConfigDraftStatus
    }, activities, today);
    if (current.status === status) {
      return { draft: currentRecord, validation: currentRecord.validation, auditLogId: null };
    }
    if (current.status !== "pending_review") {
      return "ACTIVITY_DRAFT_NOT_PENDING";
    }

    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.activityConfigDraft.update({
        where: { id: draftId },
        data: {
          status,
          updatedByAdminUserId: adminUserId,
          reviewedAt: new Date(),
          reviewedByAdminUserId: adminUserId,
          reviewNote: reason
        }
      });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: status === "approved" ? "admin_activity_draft_approve" : "admin_activity_draft_reject",
          targetType: "activity_config_draft",
          targetId: saved.id,
          detail: JSON.stringify({ activityId: saved.activityId, reason, status: saved.status })
        }
      });
      return { saved, audit };
    });
    const record = toAdminActivityConfigDraftRecord({
      ...result.saved,
      draftId: result.saved.id,
      id: result.saved.activityId,
      status: result.saved.status as AdminActivityConfigDraftStatus
    }, activities, today);

    return { draft: record, validation: record.validation, auditLogId: result.audit.id };
  },

  async publishAdminActivityConfigDraft(adminUserId, draftId, reason, today) {
    const current = await prisma.activityConfigDraft.findUnique({ where: { id: draftId } });
    if (current === null) {
      return "ACTIVITY_DRAFT_NOT_FOUND";
    }

    const activities = await prisma.activityConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
    if (current.status === "published") {
      const activity = activities.find((item) => item.id === current.activityId);
      if (activity === undefined) {
        return "ACTIVITY_DRAFT_NOT_FOUND";
      }
      const record = toAdminActivityConfigDraftRecord({
        ...current,
        draftId: current.id,
        id: current.activityId,
        status: "published"
      }, activities, today);
      return { draft: record, validation: record.validation, activity: toAdminActivityConfigDraftPublishedActivityRecord(activity), auditLogId: null };
    }
    if (current.status !== "approved") {
      return "ACTIVITY_DRAFT_NOT_APPROVED";
    }

    const currentRecord = toAdminActivityConfigDraftRecord({
      ...current,
      draftId: current.id,
      id: current.activityId,
      status: current.status as AdminActivityConfigDraftStatus
    }, activities, today);
    if (!currentRecord.validation.summary.isValid) {
      return "ACTIVITY_DRAFT_VALIDATION_FAILED";
    }

    const season = await prisma.seasonConfig.findFirst({
      where: {
        startDate: { lte: today },
        endDate: { gte: today }
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
    }) ?? await prisma.seasonConfig.findFirst({ orderBy: [{ sortOrder: "desc" }, { id: "asc" }] });
    if (season === null) {
      return "ACTIVITY_SEASON_NOT_FOUND";
    }

    const result = await prisma.$transaction(async (tx) => {
      const sort = await tx.activityConfig.aggregate({ _max: { sortOrder: true } });
      const activity = await tx.activityConfig.create({
        data: {
          id: current.activityId,
          seasonId: season.id,
          name: current.name,
          startDate: current.startDate,
          endDate: current.endDate,
          leaderboardKey: current.leaderboardKey,
          targetScore: current.targetScore,
          progressMode: current.progressMode,
          progressScore: current.progressScore,
          dailyProgressLimit: current.dailyProgressLimit,
          actionPowerCost: current.actionPowerCost,
          rewardCash: current.rewardCash,
          rewardReputation: current.rewardReputation,
          rewardPoints: current.rewardPoints,
          rewardTitleId: current.rewardTitleId,
          sortOrder: (sort._max.sortOrder ?? 0) + 10
        }
      });
      const saved = await tx.activityConfigDraft.update({
        where: { id: draftId },
        data: {
          status: "published",
          updatedByAdminUserId: adminUserId
        }
      });
      const audit = await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin_activity_draft_publish",
          targetType: "activity_config_draft",
          targetId: saved.id,
          detail: JSON.stringify({ activityId: saved.activityId, reason, status: saved.status })
        }
      });
      return { activity, saved, audit };
    });
    const updatedActivities = [...activities, result.activity];
    const record = toAdminActivityConfigDraftRecord({
      ...result.saved,
      draftId: result.saved.id,
      id: result.saved.activityId,
      status: result.saved.status as AdminActivityConfigDraftStatus
    }, updatedActivities, today);

    return {
      draft: record,
      validation: record.validation,
      activity: toAdminActivityConfigDraftPublishedActivityRecord(result.activity),
      auditLogId: result.audit.id
    };
  },

  async getAdminActivityPublishObservations(today) {
    const drafts = await prisma.activityConfigDraft.findMany({
      where: { status: "published" },
      orderBy: [{ updatedAt: "desc" }, { activityId: "asc" }]
    });
    const activityIds = drafts.map((draft) => draft.activityId);
    const activities = activityIds.length === 0
      ? []
      : await prisma.activityConfig.findMany({
        where: { id: { in: activityIds } },
        include: { states: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
      });
    const boardKeys = activities.map((activity) => activity.leaderboardKey).filter((boardKey) => boardKey.trim() !== "");
    const deliveries = boardKeys.length === 0
      ? []
      : await prisma.leaderboardRewardDelivery.findMany({
        where: { boardKey: { in: boardKeys } },
        select: { boardKey: true, snapshotDate: true }
      });
    const auditLogs = drafts.length === 0
      ? []
      : await prisma.adminAuditLog.findMany({
        where: {
          action: "admin_activity_draft_publish",
          targetType: "activity_config_draft",
          targetId: { in: drafts.map((draft) => draft.id) }
        },
        orderBy: { createdAt: "desc" }
      });
    const countDeliveries = (boardKey: string, snapshotDate: string) =>
      deliveries.filter((delivery) => delivery.boardKey === boardKey && delivery.snapshotDate === snapshotDate).length;
    const rows = drafts.flatMap((draft): AdminActivityPublishObservationRecord[] => {
      const activity = activities.find((item) => item.id === draft.activityId);
      if (activity === undefined) {
        return [];
      }
      const joinedStates = activity.states.filter((state) => state.isJoined || state.score > 0);
      const status = readSeasonStatus(activity.startDate, activity.endDate, today);
      const deliveredRewards = countDeliveries(activity.leaderboardKey, activity.endDate);
      const riskLabels = [
        ...(activity.rewardCash > 0 ? ["reward_cash"] : []),
        ...(activity.leaderboardKey.trim() === "" ? ["missing_leaderboard_key"] : [])
      ];
      const rewardBoundary = riskLabels.length === 0 ? "safe" : "risk";
      const auditLog = auditLogs.find((log) => log.targetId === draft.id) ?? null;
      const isSettled = deliveredRewards > 0;
      return [{
        draftId: draft.id,
        activityId: activity.id,
        name: activity.name,
        status,
        startDate: activity.startDate,
        endDate: activity.endDate,
        leaderboardKey: activity.leaderboardKey,
        participantCount: joinedStates.length,
        totalScore: joinedStates.reduce((total, state) => total + state.score, 0),
        isSettled,
        deliveredRewards,
        rewardBoundary,
        riskLabels,
        publishAuditLogId: auditLog?.id ?? null,
        publishReason: readAdminAuditDetailReason(auditLog?.detail ?? null),
        publishedAt: auditLog?.createdAt.toISOString() ?? null,
        suggestion: toAdminActivityPublishSuggestion({ status, isSettled, rewardBoundary })
      }];
    });

    return {
      summary: {
        total: rows.length,
        published: drafts.length,
        rewardRiskCount: rows.filter((row) => row.rewardBoundary === "risk").length,
        unsettledEndedCount: rows.filter((row) => row.status === "ended" && !row.isSettled).length
      },
      rows
    };
  },

  async getAdminOperationConfigAlerts(today) {
    const [seasons, activities, activityShopItems] = await Promise.all([
      prisma.seasonConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.activityConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.activityShopItemConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] })
    ]);
    const activityBoardKeys = activities.map((activity) => activity.leaderboardKey).filter((boardKey) => boardKey.trim() !== "");
    const leaderboardDeliveries = activityBoardKeys.length === 0
      ? []
      : await prisma.leaderboardRewardDelivery.findMany({
        where: { boardKey: { in: activityBoardKeys } },
        select: { boardKey: true, snapshotDate: true, rewardPlatformCoins: true }
      });
    const alerts: AdminOperationConfigAlertRecord[] = [];
    const pushAlert = (alert: Omit<AdminOperationConfigAlertRecord, "status" | "handledBy" | "handledAt" | "note">) => {
      alerts.push(createOperationConfigAlert(alert));
    };
    const createdAt = `${today}T00:00:00.000Z`;
    const hasActivitySettlement = (boardKey: string, snapshotDate: string) =>
      leaderboardDeliveries.some((delivery) => delivery.boardKey === boardKey && delivery.snapshotDate === snapshotDate);
    for (const season of seasons) {
      if (season.passPricePlatformCoins < 0) {
        pushAlert({
          id: `season-pass-price:${season.id}`,
          level: "critical",
          type: "season_pass_price_invalid",
          targetType: "season",
          targetId: season.id,
          message: `赛季 ${season.name} 的通行证价格小于 0。`,
          suggestion: "检查赛季通行证配置，保持价格为非负数。",
          createdAt
        });
      }
    }
    for (const activity of activities) {
      const status = readSeasonStatus(activity.startDate, activity.endDate, today);
      if (activity.leaderboardKey.trim() === "") {
        pushAlert({
          id: `activity-missing-board:${activity.id}`,
          level: "critical",
          type: "activity_missing_leaderboard_key",
          targetType: "activity",
          targetId: activity.id,
          message: `活动 ${activity.name} 缺少活动榜 key。`,
          suggestion: "补齐活动榜 key 后再开放活动榜展示与结算。",
          createdAt
        });
      }
      if (status === "ended" && activity.leaderboardKey.trim() !== "" && !hasActivitySettlement(activity.leaderboardKey, activity.endDate)) {
        pushAlert({
          id: `activity-unsettled:${activity.id}:${activity.endDate}`,
          level: "warning",
          type: "activity_ended_unsettled",
          targetType: "activity",
          targetId: activity.id,
          message: `活动 ${activity.name} 已结束但活动榜未结算。`,
          suggestion: "在活动运营页手动触发活动榜结算，重复触发会按幂等规则处理。",
          createdAt
        });
      }
      if (activity.rewardCash > 0) {
        pushAlert({
          id: `reward-boundary:${activity.id}:cash`,
          level: "critical",
          type: "reward_boundary_risk",
          targetType: "activity",
          targetId: activity.id,
          message: `活动 ${activity.name} 配置包含现金奖励 ${activity.rewardCash}。`,
          suggestion: "活动榜结算奖励应保持声望、称号等荣誉资源，避免现金或平台币进入榜单奖励链路。",
          createdAt
        });
      }
      if (leaderboardDeliveries.some((delivery) => delivery.boardKey === activity.leaderboardKey && delivery.rewardPlatformCoins > 0)) {
        pushAlert({
          id: `reward-boundary:${activity.id}:platform-coins`,
          level: "critical",
          type: "reward_boundary_risk",
          targetType: "activity",
          targetId: activity.id,
          message: `活动 ${activity.name} 的活动榜结算记录包含平台币奖励。`,
          suggestion: "复核活动榜结算记录，后续奖励保持声望、称号等荣誉资源。",
          createdAt
        });
      }
    }
    for (const item of activityShopItems) {
      if (item.purchaseLimit < 0 || item.costPoints < 0) {
        pushAlert({
          id: `activity-shop-invalid:${item.id}`,
          level: "critical",
          type: "activity_shop_invalid",
          targetType: "activity_shop_item",
          targetId: item.id,
          message: `活动商店商品 ${item.name} 的积分或限购配置小于 0。`,
          suggestion: "修正活动商店积分消耗与限购配置，保持非负数。",
          createdAt
        });
      }
      if (!item.isActive) {
        pushAlert({
          id: `activity-shop-inactive:${item.id}`,
          level: "info",
          type: "activity_shop_inactive",
          targetType: "activity_shop_item",
          targetId: item.id,
          message: `活动商店商品 ${item.name} 当前停用。`,
          suggestion: "如活动仍在进行，确认该商品是否应继续停用。",
          createdAt
        });
      }
    }
    const alertIds = alerts.map((alert) => alert.id);
    const handlingLogs = alertIds.length === 0
      ? []
      : await prisma.adminAuditLog.findMany({
        where: { targetType: OPERATION_CONFIG_ALERT_TARGET_TYPE, targetId: { in: alertIds } },
        include: { adminUser: true },
        orderBy: [{ createdAt: "desc" }]
      });
    const handledAlerts = applyOperationConfigAlertHandling(alerts, handlingLogs);
    const summary = {
      total: handledAlerts.length,
      critical: handledAlerts.filter((alert) => alert.level === "critical").length,
      warning: handledAlerts.filter((alert) => alert.level === "warning").length,
      info: handledAlerts.filter((alert) => alert.level === "info").length,
      pending: handledAlerts.filter((alert) => alert.status === "pending").length,
      acknowledged: handledAlerts.filter((alert) => alert.status === "acknowledged").length,
      ignored: handledAlerts.filter((alert) => alert.status === "ignored").length,
      unsettledActivityCount: handledAlerts.filter((alert) => alert.type === "activity_ended_unsettled").length,
      rewardBoundaryRiskCount: handledAlerts.filter((alert) => alert.type === "reward_boundary_risk").length
    };
    return {
      summary,
      filters: {
        levels: [...new Set(handledAlerts.map((alert) => alert.level))],
        types: [...new Set(handledAlerts.map((alert) => alert.type))].sort(),
        targetTypes: [...new Set(handledAlerts.map((alert) => alert.targetType))].sort(),
        statuses: [...new Set(handledAlerts.map((alert) => alert.status))]
      },
      alerts: handledAlerts
    };
  },

  async handleAdminOperationConfigAlert(adminUserId, alertId, status, note, today) {
    const current = await this.getAdminOperationConfigAlerts(today);
    const alert = current.alerts.find((item) => item.id === alertId);
    if (alert === undefined) {
      return "ALERT_NOT_FOUND";
    }

    const audit = await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: operationConfigAlertActionByStatus[status],
        targetType: OPERATION_CONFIG_ALERT_TARGET_TYPE,
        targetId: alertId,
        detail: JSON.stringify({ alertId, status, note })
      },
      include: { adminUser: true }
    });
    const [handledAlert] = applyOperationConfigAlertHandling([alert], [audit]);
    return { alert: handledAlert ?? alert, auditLogId: audit.id };
  },

  async listAdminAuditLogs(filters) {
    const where: Prisma.AdminAuditLogWhereInput = {};
    if (filters.action !== "") {
      where.action = filters.action;
    }
    if (filters.targetType !== "") {
      where.targetType = filters.targetType;
    }
    if (filters.targetId !== "") {
      where.targetId = filters.targetId;
    }
    if (filters.admin !== "") {
      where.adminUser = { username: { contains: filters.admin } };
    }
    if (filters.from !== "" || filters.to !== "") {
      where.createdAt = {};
      if (filters.from !== "") {
        where.createdAt.gte = new Date(`${filters.from}T00:00:00.000Z`);
      }
      if (filters.to !== "") {
        where.createdAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
      }
    }

    const [logs, total, filterSource] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: { adminUser: true },
        orderBy: [{ createdAt: "desc" }],
        take: 100
      }),
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        include: { adminUser: true },
        orderBy: [{ createdAt: "desc" }],
        take: 200
      })
    ]);

    return {
      rows: logs.map(toAdminAuditLogRecord),
      total,
      filters: {
        actions: [...new Set(filterSource.map((log) => log.action))].sort(),
        targetTypes: [...new Set(filterSource.map((log) => log.targetType))].sort(),
        admins: [...new Set(filterSource.map((log) => log.adminUser.username))].sort()
      }
    };
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
        detail: JSON.stringify({
          serverId,
          today,
          reason,
          deliveredRewards: settlement.deliveredRewards,
          isRetry: settlement.deliveredRewards === 0,
          rewardBoundary: "no_cash_no_platform_coins"
        })
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

  async listAdminActivities(today) {
    const activities = await prisma.activityConfig.findMany({
      orderBy: [{ startDate: "desc" }, { sortOrder: "asc" }, { id: "asc" }]
    });
    const rows = await Promise.all(activities.map(async (activity) => {
      const [states, topRows, isSettled] = await Promise.all([
        prisma.playerActivityState.findMany({ where: { activityId: activity.id, score: { gt: 0 } }, select: { score: true } }),
        toActivityLeaderboardRows(prisma, activity.id),
        isActivityLeaderboardSettled(prisma, activity)
      ]);

      return {
        id: activity.id,
        name: activity.name,
        status: readSeasonStatus(activity.startDate, activity.endDate, today),
        startDate: activity.startDate,
        endDate: activity.endDate,
        leaderboardKey: activity.leaderboardKey,
        participantCount: states.length,
        totalScore: states.reduce((total, state) => total + state.score, 0),
        isSettled,
        topRows: topRows.slice(0, 3)
      };
    }));

    return { rows };
  },

  async settleAdminActivityLeaderboard(adminUserId, activityId, today, reason) {
    const activity = await prisma.activityConfig.findUnique({ where: { id: activityId } });
    if (activity === null) {
      return "ACTIVITY_NOT_FOUND";
    }
    if (readSeasonStatus(activity.startDate, activity.endDate, today) !== "ended") {
      return "ACTIVITY_NOT_ENDED";
    }

    const rows = await toActivityLeaderboardRows(prisma, activity.id);
    const rewards = rows.slice(0, 3).map((row, index) => ({
      profileId: row.profileId,
      founderName: row.founderName,
      companyName: row.companyName,
      rank: row.rank,
      reputationReward: activityLeaderboardRewards[index] ?? 0
    })).filter((reward) => reward.reputationReward > 0);

    let deliveredRewards = 0;
    for (const reward of rewards) {
      const existing = await prisma.leaderboardRewardDelivery.findUnique({
        where: {
          profileId_boardKey_snapshotDate: {
            profileId: reward.profileId,
            boardKey: activity.leaderboardKey,
            snapshotDate: activity.endDate
          }
        }
      });
      if (existing !== null) {
        continue;
      }
      await prisma.$transaction([
        prisma.playerProfile.update({
          where: { id: reward.profileId },
          data: { reputation: { increment: reward.reputationReward } }
        }),
        prisma.leaderboardRewardDelivery.create({
          data: {
            profileId: reward.profileId,
            serverId: "activity",
            boardKey: activity.leaderboardKey,
            snapshotDate: activity.endDate,
            rank: reward.rank,
            rewardPlatformCoins: 0,
            rewardTitleId: null,
            mailSubject: `活动榜第 ${reward.rank} 名奖励`,
            mailBody: `activity-leaderboard:${activity.id}`
          }
        })
      ]);
      deliveredRewards += 1;
    }

    const audit = await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: "admin_activity_leaderboard_settle",
        targetType: "activity_leaderboard",
        targetId: activity.id,
        detail: JSON.stringify({
          activityId: activity.id,
          today,
          reason,
          deliveredRewards,
          isRetry: deliveredRewards === 0,
          rewardBoundary: "no_cash_no_platform_coins"
        })
      }
    });
    const list = await this.listAdminActivities(today);
    const activityRow = list.rows.find((row) => row.id === activity.id);

    return {
      activity: activityRow ?? {
        id: activity.id,
        name: activity.name,
        status: readSeasonStatus(activity.startDate, activity.endDate, today),
        startDate: activity.startDate,
        endDate: activity.endDate,
        leaderboardKey: activity.leaderboardKey,
        participantCount: rows.length,
        totalScore: rows.reduce((total, row) => total + row.value, 0),
        isSettled: deliveredRewards > 0 || await isActivityLeaderboardSettled(prisma, activity),
        topRows: rows.slice(0, 3)
      },
      leaderboard: {
        key: activity.leaderboardKey,
        name: activity.name,
        scope: "activity",
        isActive: false,
        rows: rows.slice(0, 20),
        snapshotDate: activity.endDate
      },
      deliveredRewards,
      rewards: deliveredRewards > 0 ? rewards : [],
      auditLogId: audit.id
    };
  },

  async listAdminGuilds(filters, today) {
    const dayStart = new Date(`${today}T00:00:00.000Z`);
    const dayEnd = new Date(`${today}T23:59:59.999Z`);
    const groups = await prisma.crossServerGroup.findMany({
      include: { servers: true }
    });
    const serverGroupByServerId = new Map<string, { id: string; name: string }>();
    for (const group of groups) {
      for (const server of group.servers) {
        serverGroupByServerId.set(server.serverId, { id: group.id, name: group.name });
      }
    }

    const guilds = await prisma.guild.findMany({
      where: {
        ...(filters.serverId === "" ? {} : { serverId: filters.serverId }),
        ...(filters.keyword === "" ? {} : { name: { contains: filters.keyword } })
      },
      include: {
        members: true,
        helpRequests: true,
        projectProgress: true,
        activityLogs: { where: { createdAt: { gte: dayStart, lte: dayEnd } } },
        crossServerGuildSignups: { where: { status: "active" } }
      },
      orderBy: [{ contributionScore: "desc" }, { createdAt: "asc" }]
    });

    return {
      rows: guilds
        .map((guild) => {
          const group = serverGroupByServerId.get(guild.serverId);
          const crossServerRegistered = guild.crossServerGuildSignups.some((signup) => signup.groupId === group?.id);
          const todayActiveMemberCount = new Set(guild.activityLogs.map((activity) => activity.profileId)).size;
          return {
            id: guild.id,
            serverId: guild.serverId,
            name: guild.name,
            level: guild.level,
            contributionScore: guild.contributionScore,
            memberCount: guild.members.length,
            todayActiveMemberCount,
            helpRequestCount: guild.helpRequests.length,
            projectCount: guild.projectProgress.length,
            crossServerRegistered,
            crossServerGroupName: group?.name ?? null,
            createdAt: guild.createdAt.toISOString()
          };
        })
        .filter((guild) => {
          if (filters.crossRegistered === "registered" && !guild.crossServerRegistered) {
            return false;
          }
          if (filters.crossRegistered === "unregistered" && guild.crossServerRegistered) {
            return false;
          }
          if (filters.activeStatus === "active" && guild.todayActiveMemberCount <= 0) {
            return false;
          }
          if (filters.activeStatus === "inactive" && guild.todayActiveMemberCount > 0) {
            return false;
          }
          return true;
        })
    };
  },

  async getAdminGuildDetail(guildId, _today) {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        members: { include: { profile: true }, orderBy: [{ role: "asc" }, { contributionScore: "desc" }] },
        techStates: { include: { tech: true }, orderBy: { techId: "asc" } },
        helpRequests: { include: { profile: true }, orderBy: { createdAt: "desc" }, take: 10 },
        projectProgress: true,
        crossServerGuildSignups: { where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    if (guild === null) {
      return "GUILD_NOT_FOUND";
    }

    const group = await prisma.crossServerGroup.findFirst({
      where: { servers: { some: { serverId: guild.serverId } } }
    });
    const signup = guild.crossServerGuildSignups.find((item) => item.groupId === group?.id) ?? null;

    return {
      guild: {
        id: guild.id,
        serverId: guild.serverId,
        name: guild.name,
        level: guild.level,
        contributionScore: guild.contributionScore,
        announcement: guild.announcement,
        collaborationRules: guild.collaborationRules,
        createdAt: guild.createdAt.toISOString()
      },
      members: guild.members.map((member) => ({
        profileId: member.profileId,
        founderName: member.profile.founderName,
        companyName: member.profile.companyName,
        role: member.role,
        contributionScore: member.contributionScore,
        joinedAt: member.joinedAt.toISOString()
      })),
      techs: guild.techStates.map((state) => ({
        id: state.techId,
        name: state.tech.name,
        level: state.level,
        maxLevel: state.tech.maxLevel
      })),
      helpRequests: guild.helpRequests.map((request) => ({
        id: request.id,
        profileId: request.profileId,
        founderName: request.profile.founderName,
        requestType: request.requestType,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        fulfilledAt: request.fulfilledAt?.toISOString() ?? null
      })),
      projects: guildProjectConfigs.map((project) => {
        const progress = guild.projectProgress.find((item) => item.projectId === project.id);
        return {
          id: project.id,
          name: project.name,
          progress: Math.min(progress?.progress ?? 0, project.target),
          target: project.target,
          claimedAt: progress?.claimedAt?.toISOString() ?? null
        };
      }),
      crossServer: {
        isRegistered: signup !== null,
        groupId: signup?.groupId ?? null,
        groupName: signup === null ? null : group?.name ?? null,
        signupDate: signup?.signupDate ?? null
      },
      history: {
        guildSettlements: (await buildGuildHistory(prisma, guild)).settlements,
        crossServerSettlements: (await buildCrossServerGuildHistory(
          prisma,
          guild,
          group === null ? null : {
            id: group.id,
            name: group.name,
            ruleLabel: group.ruleLabel,
            serverIds: [guild.serverId]
          }
        )).settlements
      }
    };
  },

  async settleAdminGuildLeaderboard(adminUserId, guildId, today, reason) {
    const member = await prisma.guildMember.findFirst({
      where: { guildId },
      include: { profile: true },
      orderBy: [{ role: "asc" }, { contributionScore: "desc" }]
    });
    if (member === null) {
      return "GUILD_NOT_FOUND";
    }

    const settlement = await this.settleGuildLeaderboard(member.profile.accountId, member.profile.serverId, today);
    if (settlement === "PLAYER_NOT_FOUND" || settlement === "GUILD_NOT_JOINED") {
      return "PLAYER_NOT_FOUND";
    }
    const audit = await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: "admin_guild_leaderboard_settle",
        targetType: "guild",
        targetId: guildId,
        detail: JSON.stringify({
          guildId,
          today,
          reason,
          deliveredRewards: settlement.deliveredRewards,
          isRetry: settlement.deliveredRewards === 0,
          rewardBoundary: "no_cash_no_platform_coins"
        })
      }
    });

    return { ...settlement, auditLogId: audit.id };
  },

  async settleAdminCrossServerGuild(adminUserId, serverId, today, reason) {
    const profile = await prisma.playerProfile.findFirst({
      where: { serverId, guildMembership: { isNot: null } },
      orderBy: { createdAt: "asc" }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const settlement = await this.settleCrossServerGuildRewards(profile.accountId, serverId, today);
    if (
      settlement === "PLAYER_NOT_FOUND" ||
      settlement === "CROSS_SERVER_GROUP_NOT_FOUND" ||
      settlement === "GUILD_NOT_JOINED"
    ) {
      return settlement;
    }
    const audit = await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: "admin_cross_guild_season_settle",
        targetType: "cross_server_guild",
        targetId: serverId,
        detail: JSON.stringify({
          serverId,
          today,
          reason,
          deliveredRewards: settlement.deliveredRewards,
          isRetry: settlement.deliveredRewards === 0,
          rewardBoundary: "no_cash_no_platform_coins"
        })
      }
    });

    return { ...settlement, auditLogId: audit.id };
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
    void scoreDelta;
    const profile = await prisma.playerProfile.findUnique({ where: { accountId_serverId: { accountId, serverId } } });
    if (profile === null) return "PLAYER_NOT_FOUND";
    const activity = await prisma.activityConfig.findUnique({ where: { id: activityId } });
    if (activity === null) return "ACTIVITY_NOT_FOUND";
    if (readSeasonStatus(activity.startDate, activity.endDate, today) !== "active") return "ACTIVITY_NOT_ACTIVE";
    const state = await prisma.playerActivityState.findUnique({ where: { profileId_activityId: { profileId: profile.id, activityId } } });
    if (state === null || !state.isJoined) return "ACTIVITY_NOT_JOINED";
    const mode = readActivityProgressMode(activity.progressMode);
    if (mode === "scenario") return "ACTIVITY_SCENARIO_ONLY";
    if (mode === "target" && state.score >= activity.targetScore) return "ACTIVITY_TARGET_REACHED";
    if (activity.dailyProgressLimit > 0 && getActivityDailyProgressCount(state, today) >= activity.dailyProgressLimit) return "ACTIVITY_DAILY_LIMIT_REACHED";
    if (activity.actionPowerCost > 0 && profile.actionPower < activity.actionPowerCost) return "ACTIVITY_ACTION_POWER_NOT_ENOUGH";
    const effectiveScoreDelta = calculateActivityScoreIncrement(activity, state);
    if (effectiveScoreDelta <= 0) return "ACTIVITY_TARGET_REACHED";
    const updatedProfile = await prisma.$transaction(async (tx) => {
      await tx.playerActivityState.update({
        where: { id: state.id },
        data: {
          score: { increment: effectiveScoreDelta },
          dailyProgressDate: today,
          dailyProgressCount: state.dailyProgressDate === today ? { increment: 1 } : 1
        }
      });
      await tx.playerSeasonProgress.upsert({
        where: { profileId_seasonId: { profileId: profile.id, seasonId: activity.seasonId } },
        update: { points: { increment: effectiveScoreDelta } },
        create: { profileId: profile.id, seasonId: activity.seasonId, points: effectiveScoreDelta }
      });
      return activity.actionPowerCost > 0
        ? tx.playerProfile.update({ where: { id: profile.id }, data: { actionPower: { decrement: activity.actionPowerCost } } })
        : profile;
    });
    const profileRecord = toProfileRecord(updatedProfile);
    const center = await toSeasonCenterRecord(prisma, profileRecord, today);
    return center === "SEASON_NOT_FOUND" ? "ACTIVITY_NOT_FOUND" : { season: center.season, activity: center.activities.find((item) => item.id === activityId)!, profile: profileRecord };
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

    const activeActivities = await prisma.activityConfig.findMany({
      where: {
        startDate: { lte: today },
        endDate: { gte: today }
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
    });
    const activityBoards = await Promise.all(activeActivities.map((activity) => toActivityLeaderboardBoard(prisma, activity, today, serverId)));

    return {
      boards,
      activityBoards
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
              mailBody: "榜单奖励已送达邮箱。"
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
    const stageBoardKeys = crossServerStageRewardConfigs.map((reward) => reward.id);
    const [profiles, signup, rewardDeliveries, guildMember, guildSignups] = await Promise.all([
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
      prisma.leaderboardRewardDelivery.findMany({
        where: {
          profileId: profile.id,
          boardKey: { in: ["cross-daily-goal", ...stageBoardKeys] }
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
    const isRegistered = signup?.status === "active";
    const dailyRewardDelivery = rewardDeliveries.find((delivery) => delivery.boardKey === "cross-daily-goal" && delivery.snapshotDate === today) ?? null;
    const dailyClaimDays = new Set(rewardDeliveries.filter((delivery) => delivery.boardKey === "cross-daily-goal").map((delivery) => delivery.snapshotDate)).size;
    const claimedStageRewardIds = new Set(rewardDeliveries.filter((delivery) => stageBoardKeys.includes(delivery.boardKey as typeof stageBoardKeys[number])).map((delivery) => delivery.boardKey));
    const isDailyRewardClaimed = dailyRewardDelivery !== null;
    const guildGoalProgress = Math.min(todayActiveMemberCount, crossServerGuildSeasonRequirements.minTodayActiveMembers);
    const dailyGoals = [
      {
        id: "cross-register",
        title: "报名跨服",
        progress: isRegistered ? 1 : 0,
        target: 1,
        isCompleted: isRegistered,
        statusLabel: isRegistered ? "已完成" : "待报名",
        rewardLabel: "参赛资格"
      },
      {
        id: "cross-daily-reward",
        title: "领取今日奖励",
        progress: isDailyRewardClaimed ? 1 : 0,
        target: 1,
        isCompleted: isDailyRewardClaimed,
        statusLabel: !isRegistered ? "报名后领取" : isDailyRewardClaimed ? "今日已领取" : "待领取",
        rewardLabel: "声望 +30"
      },
      {
        id: "cross-guild-active",
        title: "商会活跃达标",
        progress: guildGoalProgress,
        target: crossServerGuildSeasonRequirements.minTodayActiveMembers,
        isCompleted: guildGoalProgress >= crossServerGuildSeasonRequirements.minTodayActiveMembers,
        statusLabel: guildGoalProgress >= crossServerGuildSeasonRequirements.minTodayActiveMembers ? "已达标" : "推进中",
        rewardLabel: "商会赛季资格"
      }
    ];
    const completedGoals = dailyGoals.filter((goal) => goal.isCompleted).length;
    const nextReward = !isRegistered
      ? { title: "今日跨服声望", conditionLabel: "报名跨服后领取", rewardLabel: "声望 +30", statusLabel: "报名后领取" }
      : !isDailyRewardClaimed
        ? { title: "今日跨服声望", conditionLabel: "完成今日跨服目标", rewardLabel: "声望 +30", statusLabel: "待领取" }
        : { title: "冲击排名奖励", conditionLabel: "结算跨服榜单", rewardLabel: "称号与邮件奖励", statusLabel: "冲榜中" };
    const stageRewards = crossServerStageRewardConfigs.map((reward) => {
      const isClaimed = claimedStageRewardIds.has(reward.id);
      const isClaimable = isRegistered && dailyClaimDays >= reward.requiredDailyClaims && !isClaimed;
      return {
        id: reward.id,
        title: reward.title,
        requiredDailyClaims: reward.requiredDailyClaims,
        currentDailyClaims: Math.min(dailyClaimDays, reward.requiredDailyClaims),
        rewardReputation: reward.rewardReputation,
        isClaimable,
        isClaimed,
        statusLabel: isClaimed ? "已领取" : isClaimable ? "可领取" : `${Math.min(dailyClaimDays, reward.requiredDailyClaims)}/${reward.requiredDailyClaims}`
      };
    });

    const center = {
      group: {
        id: groupServer.group.id,
        name: groupServer.group.name,
        ruleLabel: groupServer.group.ruleLabel,
        serverIds
      },
      isRegistered,
      dailyReward: {
        isClaimed: isDailyRewardClaimed,
        canClaim: isRegistered && !isDailyRewardClaimed,
        rewardReputation: 30,
        statusLabel: !isRegistered ? "报名后领取" : isDailyRewardClaimed ? "今日已领取" : "待领取",
        actionLabel: isDailyRewardClaimed ? "今日已领取" : "领取今日奖励"
      },
      dailyGoals,
      seasonProgress: {
        completedGoals,
        targetGoals: dailyGoals.length,
        progressPercent: Math.round((completedGoals / dailyGoals.length) * 100),
        statusLabel: `${completedGoals}/${dailyGoals.length} 目标完成`
      },
      nextReward,
      stageRewards,
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
        scope: "cross" as const,
        isActive: true,
        snapshotDate: today,
        rows: guildRows
      }
    };
    return {
      ...center,
      battleReport: buildCrossServerBattleReport(center, profile.id)
    };
  },

  async getCrossServerGuildHistory(accountId, serverId) {
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
    const member = await prisma.guildMember.findUnique({
      where: { profileId: profile.id },
      include: { guild: true }
    });
    if (member === null) {
      return "GUILD_NOT_JOINED";
    }

    return buildCrossServerGuildHistory(prisma, member.guild, {
      id: groupServer.group.id,
      name: groupServer.group.name,
      ruleLabel: groupServer.group.ruleLabel,
      serverIds: groupServer.group.servers.map((item) => item.serverId)
    });
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
              mailBody: "跨服奖励已送达邮箱。"
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
      deliveredRewards,
      battleReport: buildCrossServerBattleReport(center, profile.id, deliveredRewards > 0 ? "已生成邮件" : "已结算")
    };
  },

  async claimCrossServerDailyReward(accountId, serverId, today) {
    const center = await this.getCrossServerCenter(accountId, serverId, today);
    if (center === "PLAYER_NOT_FOUND" || center === "CROSS_SERVER_GROUP_NOT_FOUND") {
      return center;
    }
    if (!center.isRegistered) {
      return "CROSS_SERVER_NOT_REGISTERED";
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
    const existing = await prisma.leaderboardRewardDelivery.findUnique({
      where: {
        profileId_boardKey_snapshotDate: {
          profileId: profile.id,
          boardKey: "cross-daily-goal",
          snapshotDate: today
        }
      }
    });
    if (existing !== null) {
      return { deliveredRewards: 0, rewardReputation: 0, crossServer: center };
    }
    const rewardReputation = center.dailyReward.rewardReputation;
    await prisma.$transaction([
      prisma.playerProfile.update({
        where: { id: profile.id },
        data: { reputation: { increment: rewardReputation }, unreadMailCount: { increment: 1 } }
      }),
      prisma.leaderboardRewardDelivery.create({
        data: {
          profileId: profile.id,
          serverId,
          boardKey: "cross-daily-goal",
          snapshotDate: today,
          rank: center.battleReport.personal.myRank ?? 0,
          rewardPlatformCoins: 0,
          rewardTitleId: null,
          mailSubject: "跨服今日目标奖励",
          mailBody: `cross-daily-goal:reputation:${rewardReputation}`
        }
      })
    ]);
    const nextCenter = await this.getCrossServerCenter(accountId, serverId, today);
    if (nextCenter === "PLAYER_NOT_FOUND" || nextCenter === "CROSS_SERVER_GROUP_NOT_FOUND") {
      return nextCenter;
    }
    return { deliveredRewards: 1, rewardReputation, crossServer: nextCenter };
  },

  async claimCrossServerStageReward(accountId, serverId, stageId, today) {
    const center = await this.getCrossServerCenter(accountId, serverId, today);
    if (center === "PLAYER_NOT_FOUND" || center === "CROSS_SERVER_GROUP_NOT_FOUND") {
      return center;
    }
    if (!center.isRegistered) {
      return "CROSS_SERVER_NOT_REGISTERED";
    }
    const stageReward = center.stageRewards.find((reward) => reward.id === stageId) ?? null;
    if (stageReward === null) {
      return "CROSS_STAGE_REWARD_NOT_FOUND";
    }
    if (!stageReward.isClaimable && !stageReward.isClaimed) {
      return "CROSS_STAGE_REWARD_NOT_READY";
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
    const existing = await prisma.leaderboardRewardDelivery.findUnique({
      where: {
        profileId_boardKey_snapshotDate: {
          profileId: profile.id,
          boardKey: stageId,
          snapshotDate: "season"
        }
      }
    });
    if (existing !== null) {
      return { deliveredRewards: 0, rewardReputation: 0, crossServer: center };
    }
    const rewardReputation = stageReward.rewardReputation;
    await prisma.$transaction([
      prisma.playerProfile.update({
        where: { id: profile.id },
        data: { reputation: { increment: rewardReputation }, unreadMailCount: { increment: 1 } }
      }),
      prisma.leaderboardRewardDelivery.create({
        data: {
          profileId: profile.id,
          serverId,
          boardKey: stageId,
          snapshotDate: "season",
          rank: stageReward.requiredDailyClaims,
          rewardPlatformCoins: 0,
          rewardTitleId: null,
          mailSubject: `${stageReward.title}跨服阶段奖励`,
          mailBody: `cross-stage-reward:reputation:${rewardReputation}`
        }
      })
    ]);
    const nextCenter = await this.getCrossServerCenter(accountId, serverId, today);
    if (nextCenter === "PLAYER_NOT_FOUND" || nextCenter === "CROSS_SERVER_GROUP_NOT_FOUND") {
      return nextCenter;
    }
    return { deliveredRewards: 1, rewardReputation, crossServer: nextCenter };
  },

  async settleCrossServerGuildRewards(accountId, serverId, today) {
    const center = await this.getCrossServerCenter(accountId, serverId, today);
    if (center === "PLAYER_NOT_FOUND" || center === "CROSS_SERVER_GROUP_NOT_FOUND") {
      return center;
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
      battleReport: buildCrossServerBattleReport(center, profile.id, deliveredRewards > 0 ? "已生成邮件" : "已结算"),
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

  async getGuildHistory(accountId, serverId) {
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
    const member = await prisma.guildMember.findUnique({
      where: { profileId: profile.id },
      include: { guild: true }
    });
    if (member === null) {
      return "GUILD_NOT_JOINED";
    }

    return buildGuildHistory(prisma, member.guild);
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
    const rewards = rankedMembers.map((rankedMember, index) => ({
      profileId: rankedMember.profileId,
      founderName: rankedMember.profile.founderName,
      companyName: rankedMember.profile.companyName,
      rank: index + 1,
      reputationReward: guildLeaderboardRewards[index] ?? 0
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
