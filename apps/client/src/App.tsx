import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";
const SESSION_KEY = "wenziyouxi.client.session";
const REMEMBER_AUTH_KEY = "wenziyouxi.client.rememberAuth";
const SESSION_VERSION = 1;

type OnboardingStep = "auth" | "server" | "avatar" | "profile" | "game";
type AuthMode = "login" | "register";
type NativeHomePage = "leaderboard" | "cross-server" | "season" | "shop" | "privilege" | "pass" | "bag" | "negotiation" | "vip" | "profile" | "guild" | "finance" | "chat" | "mail";
type ActivityNativeView = "main" | "shop" | "leaderboard" | "buffs";

type ApiSuccess<T> = {
  success: true;
  data: T;
  traceId: string;
};

type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
  traceId: string;
};

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

type AccountSession = {
  accountId: string;
  username: string;
  token: string;
};

type ServerOption = {
  id: string;
  name: string;
  status?: string;
  label: string;
  isRecommended: boolean;
};

type AvatarOption = {
  id: string;
  name: string;
  glyph: string;
  specialty: string;
};

type PlayerProfile = {
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

type StoredSession = {
  version: typeof SESSION_VERSION;
  account: AccountSession;
  server: ServerOption;
  avatar: AvatarOption;
  profile: PlayerProfile;
};

type RememberedAuth = {
  version: typeof SESSION_VERSION;
  username: string;
  password: string;
};

type Employee = {
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

type BusinessProject = {
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

type TaskItem = {
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
  rewardItem: { id: string; name: string; quantity: number } | null;
  guideAction: string;
  unlockKind: "none" | "knowledge" | "compliance";
  knowledgeId: string | null;
  isClaimed: boolean;
  isClaimable: boolean;
};

type CompanyGrowth = {
  profile: PlayerProfile;
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
      item: { id: string; name: string; quantity: number } | null;
    };
  };
};

type LongTermGoal = {
  id: string;
  title: string;
  description: string;
  source: string;
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

type LongTermGoals = {
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
    goals: LongTermGoal[];
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

type RandomTask = {
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
  knowledge: KnowledgeLink | null;
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

type RandomTaskCenter = {
  profile: PlayerProfile;
  tasks: RandomTask[];
  dailyLimit: number;
  pendingCount: number;
  handledToday: number;
};

type RandomTaskActionResult = {
  center: RandomTaskCenter;
  task: RandomTask;
  profile: PlayerProfile;
  result: string;
  usedItem?: {
    itemId: string;
    itemName: string;
    effectSummary: string;
  };
};

type BusinessClockPulse = {
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
  nightBriefing: NightBusinessBriefing | null;
};

type NightBusinessBriefing = {
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

type CompanyFinance = {
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
  reportMonth?: number;
  income?: number;
  expense?: number;
  endingCash?: number;
  createdAt?: string;
  businessClock?: BusinessClockPulse;
};

type EventOption = {
  key: "A" | "B";
  label: string;
  impactPreview: string;
};

type BusinessEvent = {
  id: string;
  configId: string;
  title: string;
  source: string;
  channel: string;
  summary: string;
  context: string;
  options: EventOption[];
  status: "pending" | "resolved";
  selectedOption: "A" | "B" | null;
  resultSummary: string | null;
  knowledgeTitle: string | null;
  knowledgeUnlocked: boolean;
  riskExplanation: string;
  knowledge: KnowledgeLink | null;
  createdAt: string;
  resolvedAt: string | null;
};

type EventChoiceResult = {
  event: BusinessEvent;
  finance: CompanyFinance;
  followupEvent: BusinessEvent | null;
  result: {
    summary: string;
    riskExplanation: string;
    knowledgeUnlocked: boolean;
    knowledge: KnowledgeLink | null;
    followupEventId: string | null;
  };
};

type LoanOffer = {
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

type PlayerLoan = {
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

type LoanCenter = {
  offers: LoanOffer[];
  loans: PlayerLoan[];
  finance: CompanyFinance;
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

type LoanActionResult = {
  loan: PlayerLoan | null;
  loanCenter: LoanCenter;
  result: string;
};

type FundingTextBlock = string | string[] | null;
type FundingUiStatus = "未达条件" | "可谈" | "高风险可谈" | "谈判中" | "已完成" | "已失败";

type FundingOffer = {
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
  gateStatus?: {
    isAvailable: boolean;
    blockers: Array<{ code: string; message: string }>;
  };
  postInvestmentFocus?: FundingTextBlock;
  recentResult?: string | null;
  isAvailable: boolean;
  lockedReason: string | null;
};

type PlayerFunding = {
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
  disbursementStatus?: "paused" | "scheduled" | "completed" | string;
  legalReviewStatus?: string;
  followOnCount?: number;
  status: "pending" | "funded" | "failed";
  resultSummary: string | null;
  postInvestmentFocus?: FundingTextBlock;
  recentResult?: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

type FundingCenter = {
  offers: FundingOffer[];
  fundings: PlayerFunding[];
  finance: CompanyFinance;
  postInvestmentFocus?: FundingTextBlock;
  recentResult?: string | null;
};

type FundingActionResult = {
  funding: PlayerFunding;
  fundingCenter: FundingCenter;
  result: string;
};

type ProductStage = "idea" | "mvp" | "beta" | "launched" | "growth" | "mature" | "decline" | "closed";

type ProductOffer = {
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

type PlayerProduct = {
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

type ProductCenter = {
  offers: ProductOffer[];
  products: PlayerProduct[];
  finance: CompanyFinance;
};

type ProductActionResult = {
  product: PlayerProduct;
  productCenter: ProductCenter;
  result: string;
};

type CompetitorActionType = "price_war" | "poach" | "public_opinion" | "patent";

type MarketTrackOffer = {
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

type PlayerMarket = {
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

type CompetitorAction = {
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

type MarketCenter = {
  offers: MarketTrackOffer[];
  markets: PlayerMarket[];
  actions: CompetitorAction[];
  finance: CompanyFinance;
};

type MarketActionResult = {
  market: PlayerMarket;
  action: CompetitorAction | null;
  marketCenter: MarketCenter;
  result: string;
};

type PlatformWallet = {
  profileId: string;
  balance: number;
  totalSpent: number;
  vipExperience: number;
  ledgers: Array<{
    id: string;
    changeAmount: number;
    balanceAfter: number;
    source: string;
    referenceId: string | null;
    reason: string;
    createdAt: string;
  }>;
};

type ShopProduct = {
  id: string;
  name: string;
  category: string;
  pricePlatformCoins: number;
  rewardCash: number;
  rewardActionPower: number;
  rewardReputation: number;
  rewardItem: { id: string; name: string; quantity: number } | null;
  durationDays: number;
  purchaseLimit: number;
  summary: string;
  isAvailable: boolean;
  lockedReason: string | null;
};

type ShopCenter = {
  wallet: PlatformWallet;
  products: ShopProduct[];
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
    rewardItem: { id: string; name: string; quantity: number } | null;
  }>;
};

type ShopPurchaseResult = {
  wallet: PlatformWallet;
  product: ShopProduct;
  purchase: ShopCenter["purchases"][number];
  profile: PlayerProfile;
  isDuplicate: boolean;
  result: string;
};
type PrivilegeDailyClaimResult = {
  shopCenter: ShopCenter;
  profile: PlayerProfile;
  claim: {
    id: string;
    purchaseId: string;
    claimDate: string;
    rewardCash: number;
    rewardActionPower: number;
    rewardReputation: number;
    rewardItem: { id: string; name: string; quantity: number } | null;
    createdAt: string;
  };
  result: string;
};
type ShopCategoryFilter = "recommended" | "supplies" | "items";

type InventoryCenter = {
  items: Array<{
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
  }>;
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

type InventoryUseResult = {
  item: InventoryCenter["items"][number];
  inventory: InventoryCenter;
  profile: PlayerProfile;
  result: string;
};

type VipLevel = {
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

type VipCenter = {
  wallet: PlatformWallet;
  currentLevel: VipLevel;
  nextLevel: VipLevel | null;
  levels: VipLevel[];
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

type VipDailyGiftResult = {
  vipCenter: VipCenter;
  profile: PlayerProfile;
  result: string;
};

type LeaderboardRow = {
  rank: number;
  profileId: string;
  founderName: string;
  companyName: string;
  value: number;
  valueLabel: string;
  equippedTitle: string | null;
};

type LeaderboardPlayerCard = LeaderboardRow & {
  boardName: string;
  levelLabel: string;
  achievementLabel: string;
  avatarUrl: string;
  displayValueLabel: string;
  realAssetPercent: number;
  techAssetPercent: number;
  financeAssetPercent: number;
};

type LeaderboardCenter = {
  boards: Array<{
    key: string;
    name: string;
    scope: "server" | "cross" | "activity";
    isActive: boolean;
    rows: LeaderboardRow[];
    snapshotDate: string;
  }>;
  activityBoards: Array<{
    key: string;
    name: string;
    scope: "server" | "cross" | "activity";
    isActive: boolean;
    rows: LeaderboardRow[];
    snapshotDate: string;
  }>;
};

type SeasonStatus = "upcoming" | "active" | "ended";

type SeasonCenter = {
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
  tasks: Array<{ id: string; title: string; description: string; progress: number; target: number; rewardPoints: number; rewardItem: { id: string; name: string; quantity: number } | null; isClaimed: boolean }>;
  activities: Array<{
    id: string;
    name: string;
    status: SeasonStatus;
    leaderboardKey: string;
    isJoined: boolean;
    score: number;
    targetScore: number;
    progressMode: "target" | "leaderboard" | "scenario";
    progressScore: number;
    dailyProgressLimit: number;
    dailyProgressCount: number;
    actionPowerCost: number;
    rewardClaimed: boolean;
    canProgress: boolean;
    progressLockedReason: string | null;
  }>;
  activityBoards: LeaderboardCenter["activityBoards"];
  activityRecaps: Array<{
    activityId: string;
    name: string;
    status: SeasonStatus;
    startDate: string;
    endDate: string;
    isSettled: boolean;
    personalRank: number | null;
    personalScore: number;
    rows: LeaderboardRow[];
  }>;
  shopItems: Array<{ id: string; name: string; costPoints: number; summary: string; rewardItem: { id: string; name: string; quantity: number } | null; isAvailable: boolean; lockedReason: string | null }>;
  scenarios: Array<{ id: string; name: string; summary: string; bestScore: number | null }>;
  wallet: PlatformWallet;
};

type SeasonTaskProgressResult = {
  season: SeasonCenter["season"];
  task: SeasonCenter["tasks"][number];
};

type SeasonPassPurchaseResult = {
  season: SeasonCenter["season"];
  wallet: PlatformWallet;
  isDuplicate: boolean;
};

type SeasonActivityActionResult = {
  season: SeasonCenter["season"];
  activity: SeasonCenter["activities"][number];
  profile: PlayerProfile;
};

type ActivityShopPurchaseResult = {
  season: SeasonCenter["season"];
  wallet: PlatformWallet;
  item: SeasonCenter["shopItems"][number];
  profile: PlayerProfile;
  isDuplicate: boolean;
};

type ScenarioRunResult = {
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

type CrossServerCenter = {
  group: {
    id: string;
    name: string;
    ruleLabel: string;
    serverIds: string[];
  };
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
  boards: LeaderboardCenter["boards"];
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
  battleReport: CrossServerBattleReport;
};

type CrossServerBattleReport = {
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

type ChatChannelId = "system" | "world" | "guild" | "cross";

type ChatMessage = {
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

type ChatCenter = {
  channels: Array<{
    id: ChatChannelId;
    label: string;
    description: string;
    canSend: boolean;
    readonlyReason: string | null;
    unreadCount: number;
  }>;
  messages: ChatMessage[];
  keywordPolicy: {
    mode: "local_first";
    source: string;
    license: string;
    sourceHash: string;
    importBatch: string;
  };
};

type MailChannelId = "system" | "reward" | "compensation";
type MailStatusFilter = "all" | "unread" | "read";
type CrossServerMode = "season" | "board" | "guild" | "rewards" | "history";
type LeaderboardScope = "server" | "activity" | "cross";

type MailRecord = {
  id: string;
  profileId: string;
  channel: MailChannelId;
  subject: string;
  body: string;
  rewardSummary: string | null;
  platformCoins: number;
  createdAt: string;
  isRead: boolean;
  canClaim: boolean;
  claimStatus: "none" | "claimable" | "claimed";
  statusLabel: string;
};

type MailCenter = {
  summary: {
    totalCount: number;
    unreadCount: number;
  };
  filters: {
    channels: Array<"all" | MailChannelId>;
  };
  mails: MailRecord[];
};

type MailClaimAttachmentsResult = {
  claimedCount: number;
  platformCoins: number;
  mailCenter: MailCenter;
  profile: PlayerProfile;
};

type CrossServerDailyRewardResult = {
  deliveredRewards: number;
  rewardReputation: number;
  crossServer: CrossServerCenter;
};

type CrossServerStageRewardResult = {
  deliveredRewards: number;
  rewardReputation: number;
  crossServer: CrossServerCenter;
};

type LeaderboardSettlement = {
  leaderboard: LeaderboardCenter;
  deliveredRewards: number;
  battleReport?: CrossServerBattleReport;
};

type TitleItem = {
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

type TitleCenter = {
  equippedTitle: TitleItem | null;
  titles: TitleItem[];
};

type AchievementItem = {
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

type KnowledgeEntry = {
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

type KnowledgeLink = Pick<
  KnowledgeEntry,
  "id" | "title" | "summary" | "sourceName" | "sourceUrl" | "collectedAt" | "contentVersion" | "disclaimer" | "isUnlocked"
>;

type GuildCenter = {
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
  leaderboard: LeaderboardRow[];
};

type AchievementClaimResult = {
  achievement: AchievementItem;
  profile: PlayerProfile;
  titleCenter: TitleCenter;
  result: string;
};

type GuildActionResult = {
  guildCenter: GuildCenter;
  result: string;
  applicationStatus?: "approved" | "pending";
};

type GuildLeaderboardSettlement = GuildActionResult & {
  deliveredRewards: number;
  rewards: Array<{
    profileId: string;
    founderName: string;
    companyName: string;
    rank: number;
    reputationReward: number;
  }>;
};

type GuildHistory = {
  guild: { id: string; name: string; serverId: string };
  currentTopMembers: Array<{
    profileId: string;
    founderName: string;
    companyName: string;
    rank: number;
    contributionScore: number;
    reputationReward: number;
  }>;
  settlements: Array<{
    snapshotDate: string;
    deliveredRewards: number;
    topMembers: Array<{
      profileId: string;
      founderName: string;
      companyName: string;
      rank: number;
      contributionScore: number;
      reputationReward: number;
    }>;
  }>;
};

type CrossServerGuildHistory = {
  guild: { id: string; name: string; serverId: string };
  group: { id: string; name: string; ruleLabel: string; serverIds: string[] } | null;
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

const productStageLabels: Record<ProductStage, string> = {
  idea: "立项",
  mvp: "MVP",
  beta: "内测",
  launched: "上线",
  growth: "增长",
  mature: "成熟",
  decline: "衰退",
  closed: "关闭"
};

const competitorActionLabels: Record<CompetitorActionType, string> = {
  price_war: "价格战",
  poach: "挖员工",
  public_opinion: "舆论战",
  patent: "专利诉讼"
};

const shopCategoryTabs: Array<{ id: ShopCategoryFilter; label: string }> = [
  { id: "recommended", label: "推荐" },
  { id: "supplies", label: "补给" },
  { id: "items", label: "道具" }
];
const shopCategoryGroups: Record<Exclude<ShopCategoryFilter, "recommended">, string[]> = {
  supplies: ["first_charge", "daily_pack", "operation_pack", "risk_insurance"],
  items: ["recruit_ticket", "employee_pack"]
};

const VIP_LEVEL_WINDOW_SIZE = 5;
const sideActions = ["VIP", "财务", "融资", "贷款"];
const rightActions = ["活动", "排行", "商城", "特权", "通行证", "专属经理"];
const navItems = ["公司", "员工", "业务", "市场", "商会", "背包"];
const homeActionIcons: Record<string, string> = {
  "财务": "pie-chart",
  "融资": "handshake",
  "贷款": "circle-dollar-sign",
  "风险": "shield-check",
  "合同": "file-text",
  "首充": "gift",
  "首充豪礼": "gift",
  "月卡": "calendar",
  "礼包": "package-open",
  "活动": "calendar",
  "排行": "trophy",
  "跨服": "trophy",
  "商城": "shopping-bag",
  "商业": "shopping-bag",
  "特权": "award",
  "通行证": "ticket",
  "VIP": "award",
  "福利中心": "gift",
  "七日目标": "calendar",
  "创业基金": "landmark",
  "专属经理": "contact",
  "排行榜": "trophy",
  "财务中心": "pie-chart",
  "特惠商城": "shopping-cart",
  "邮件": "mail",
  "限时活动": "package-open",
  "投资合作": "handshake",
  "商战竞争": "trending-up",
  "市场营销": "megaphone",
  "产品研发": "box",
  "企业并购": "building-2",
  "扩建": "building"
};
const homeActionIconClasses: Record<string, string> = {
  "财务": "text-blue-400",
  "融资": "text-emerald-400",
  "贷款": "text-amber-400",
  "风险": "text-red-400",
  "合同": "text-business-gold",
  "首充": "text-red-400",
  "首充豪礼": "text-red-400",
  "月卡": "text-business-gold",
  "礼包": "text-pink-400",
  "活动": "text-blue-400",
  "排行": "text-amber-400",
  "跨服": "text-cyan-400",
  "商城": "text-business-gold",
  "商业": "text-business-gold",
  "特权": "text-business-gold",
  "通行证": "text-emerald-400",
  "VIP": "text-business-gold",
  "福利中心": "text-business-gold",
  "七日目标": "text-business-gold",
  "创业基金": "text-emerald-400",
  "专属经理": "text-pink-400",
  "排行榜": "text-amber-400",
  "邮件": "text-business-gold",
  "限时活动": "text-pink-400",
  "投资合作": "text-amber-400",
  "商战竞争": "text-blue-400",
  "市场营销": "text-blue-400",
  "产品研发": "text-cyan-400",
  "企业并购": "text-business-gold",
  "扩建": "text-emerald-400"
};
const navIcons: Record<string, string> = {
  "公司": "home",
  "员工": "users",
  "项目": "layout-dashboard",
  "产品": "box",
  "业务": "layout-dashboard",
  "市场": "megaphone",
  "商会": "building-2",
  "背包": "package"
};
const iconPaths: Record<string, string[]> = {
  "award": ["M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z", "m8 14-2 7 6-3 6 3-2-7"],
  "box": ["M21 8 12 3 3 8l9 5 9-5Z", "M3 8v8l9 5 9-5V8", "M12 13v8"],
  "briefcase": ["M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1", "M4 7h16v12H4Z", "M9 12h6"],
  "building": ["M6 22V4h12v18", "M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"],
  "building-2": ["M6 22V4h8v18", "M14 9h4v13", "M9 8h2M9 12h2M9 16h2"],
  "calendar": ["M7 3v4M17 3v4", "M4 7h16v14H4Z", "M4 11h16"],
  "check": ["M20 6 9 17l-5-5"],
  "chevron-left": ["M15 18 9 12l6-6"],
  "circle-dollar-sign": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 6v12", "M16 9c-1-1-3-1-4-1s-3 .5-3 2 1 2 3 2 3 .5 3 2-1 2-3 2-3 0-4-1"],
  "clipboard-check": ["M9 5h6l1 2h2v14H6V7h2Z", "m9 14 2 2 4-5"],
  "contact": ["M7 7a5 5 0 0 1 10 0", "M5 21a7 7 0 0 1 14 0", "M4 4h16v18H4Z"],
  "crown": ["m3 7 5 5 4-8 4 8 5-5-2 12H5Z"],
  "file-search": ["M6 2h8l4 4v16H6Z", "M14 2v6h6", "M10 15a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z", "m15 18 3 3"],
  "file-text": ["M6 2h8l4 4v16H6Z", "M14 2v6h6", "M9 13h6M9 17h6"],
  "gem": ["M6 3h12l4 6-10 12L2 9Z", "M2 9h20", "m8 9 4 12 4-12"],
  "gift": ["M3 9h18v4H3Z", "M5 13h14v8H5Z", "M12 9v12", "M12 9C9 9 7 7 7 5.5S9 3 12 9Zm0 0c3 0 5-2 5-3.5S15 3 12 9Z"],
  "handshake": ["M8 12 5 15a3 3 0 0 1-3-3l5-5 4 4", "m16 12 3 3a3 3 0 0 0 3-3l-5-5-4 4", "M8 12l4 4 4-4", "m12 16 2 2a2 2 0 0 0 3-3"],
  "home": ["M3 11 12 3l9 8", "M5 10v11h14V10", "M10 21v-6h4v6"],
  "landmark": ["M3 21h18", "M5 10h14", "M12 3 4 8h16Z", "M6 10v8M10 10v8M14 10v8M18 10v8"],
  "layout-dashboard": ["M4 4h7v7H4Z", "M13 4h7v4h-7Z", "M13 10h7v10h-7Z", "M4 13h7v7H4Z"],
  "loader-2": ["M21 12a9 9 0 1 1-6.2-8.6"],
  "lock": ["M6 10V8a6 6 0 0 1 12 0v2", "M5 10h14v11H5Z"],
  "mail": ["M4 6h16v12H4Z", "m4 7 8 6 8-6"],
  "megaphone": ["M3 11v4h4l10 4V7L7 11Z", "M7 15l2 5"],
  "message-circle": ["M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.2-4.2A8.5 8.5 0 1 1 21 11.5Z", "M8 10h8M8 14h5"],
  "package": ["M21 8 12 3 3 8l9 5 9-5Z", "M3 8v8l9 5 9-5V8", "M12 13v8"],
  "package-open": ["M3 9 12 4l9 5-9 5Z", "M3 9v8l9 5 9-5V9", "M12 14v8"],
  "plus": ["M12 5v14", "M5 12h14"],
  "radar": ["M12 20a8 8 0 1 0-8-8", "M12 12l6-6", "M12 12h8", "M12 4v4", "M4 12h4"],
  "refresh-cw": ["M21 12a9 9 0 0 1-15 6.7L3 16", "M3 21v-5h5", "M3 12a9 9 0 0 1 15-6.7L21 8", "M21 3v5h-5"],
  "rocket": ["M4 14c4-8 8-10 16-10-1 8-2 12-10 16l-2-4-4-2Z", "M14 6l4 4", "M5 19l-2 2"],
  "send": ["M22 2 11 13", "M22 2 15 22l-4-9-9-4Z"],
  "shield-check": ["M12 3 5 6v6c0 5 3 8 7 10 4-2 7-5 7-10V6Z", "m9 12 2 2 4-5"],
  "shopping-bag": ["M6 8h12l1 13H5Z", "M9 8a3 3 0 0 1 6 0"],
  "shopping-cart": ["M3 4h2l2 12h11l3-8H7", "M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"],
  "star": ["m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"],
  "swords": ["M14 4 20 10", "M20 4 4 20", "M4 14l6 6", "M14 20l6-6"],
  "ticket": ["M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4Z", "M9 5v14", "M13 9h3M13 15h3"],
  "trending-up": ["M3 17 9 11l4 4 7-8", "M14 7h6v6"],
  "trophy": ["M8 4h8v5a4 4 0 0 1-8 0Z", "M6 6H3v2a4 4 0 0 0 4 4", "M18 6h3v2a4 4 0 0 1-4 4", "M12 13v5", "M8 21h8"],
  "user-plus": ["M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M19 8v6", "M16 11h6"],
  "users": ["M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2", "M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M22 21v-2a4 4 0 0 0-3-3.8", "M17 3.2a4 4 0 0 1 0 7.6"],
  "x": ["M6 6l12 12", "M18 6 6 18"],
  "zap": ["M13 2 4 14h7l-1 8 9-12h-7Z"]
};
const Icon = ({ name, className }: { name: string; className: string }) => {
  const paths = iconPaths[name] ?? iconPaths["box"] ?? [];

  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
};
const eventEntryNames = new Set(["专属经理"]);
const initialEmployees: Employee[] = [];
const initialProjects: BusinessProject[] = [];
const defaultServers: ServerOption[] = [
  { id: "s1", name: "长宁一服", status: "recommended", label: "推荐", isRecommended: true },
  { id: "s2", name: "滨江新区", status: "new", label: "新服", isRecommended: false },
  { id: "s3", name: "中关村路演场", status: "busy", label: "繁忙", isRecommended: false }
];
const homePanelContent: Record<string, { title: string; lines: string[]; action: string }> = {
  "财务": {
    title: "财务",
    lines: ["查看现金、月收入、月支出和现金流状态。", "财务数据以后端档案为准，刷新后仍保持一致。"],
    action: "查看财务"
  },
  "融资": {
    title: "融资",
    lines: ["融资入口用于查看投资合作和公司估值进展。", "融资判断会受到现金流、团队能力和市场环境影响。"],
    action: "查看融资"
  },
  "贷款": {
    title: "贷款",
    lines: ["贷款入口用于查看授信、还款和负债预警。", "负债状态会在主页顶部同步提示。"],
    action: "查看贷款"
  },
  "风险": {
    title: "风险",
    lines: ["风险入口汇总合同、现金流、用工和舆情提醒。", "待处理事件会在主页状态区展示。"],
    action: "查看风险"
  },
  "合同": {
    title: "合同",
    lines: ["合同入口用于处理客户回款、交付条款和合规复核。", "合同状态会影响后续项目和经营事件。"],
    action: "查看合同"
  },
  "首充": {
    title: "首充",
    lines: ["首充入口提供创业启动礼包。", "平台币相关消费以后端记录为准。"],
    action: "查看首充"
  },
  "首充豪礼": {
    title: "首充豪礼",
    lines: ["首充任意金额可领取创业启动礼包。", "礼包含钻石、资金和橙色员工招募券。"],
    action: "前往充值"
  },
  "月卡": {
    title: "月卡",
    lines: ["月卡提供每日平台币、行动力和经营补贴。", "每日领取记录由后端系统记录。"],
    action: "查看月卡"
  },
  "礼包": {
    title: "礼包",
    lines: ["礼包入口按公司阶段、活动和经营压力展示。", "礼包不直接替代现金流经营。"],
    action: "查看礼包"
  },
  "活动": {
    title: "活动",
    lines: ["活动入口展示开服目标、限时挑战和赛季任务。", "活动榜只在活动开启时展示。"],
    action: "查看活动"
  },
  "排行": {
    title: "排行",
    lines: ["查看本服公司估值、项目收益和商会贡献排名。", "排行榜每日按服务器时间刷新。"],
    action: "查看排行"
  },
  "商业": {
    title: "商城",
    lines: ["首充、礼包、猎头和保险等商品集中展示。", "月卡和成长基金在特权页，赛季奖励在通行证页。"],
    action: "进入商城"
  },
  "特权": {
    title: "特权",
    lines: ["月卡、成长基金和 VIP 经验集中展示。", "开通后奖励立即发放，并计入经营加速。"],
    action: "查看特权"
  },
  "通行证": {
    title: "通行证",
    lines: ["赛季通行证购买、状态和奖励线索集中展示。", "活动页只展示状态，不直接购买。"],
    action: "查看通行证"
  },
  "VIP": {
    title: "VIP",
    lines: ["VIP 入口展示身份、每日礼包和便利权益。", "游戏内平台币消费会计入 VIP 经验。"],
    action: "查看 VIP"
  },
  "福利中心": {
    title: "福利中心",
    lines: ["每日登录、在线时长和成长节点奖励集中领取。", "未领取奖励会在入口显示红点。"],
    action: "领取福利"
  },
  "商城": {
    title: "商城",
    lines: ["首充、礼包、猎头和保险等商品集中展示。", "购买商品会消耗平台币，并计入平台消费记录。"],
    action: "进入商城"
  },
  "七日目标": {
    title: "七日目标",
    lines: ["完成七日创业目标，解锁高级员工和稀有项目。", "当前目标：完成 3 次项目洽谈。"],
    action: "查看目标"
  },
  "创业基金": {
    title: "创业基金",
    lines: ["达成公司等级后返还钻石。", "基金权益与平台币消费记录分开结算。"],
    action: "查看基金"
  },
  "专属经理": {
    title: "专属经理",
    lines: ["专属经理提供经营提醒、礼包推荐和成长规划。", "提升 VIP 等级可解锁更多服务。"],
    action: "联系经理"
  },
  "排行榜": {
    title: "排行榜",
    lines: ["查看本服公司估值、项目收益和商战积分排名。", "排行榜每日 0 点刷新。"],
    action: "查看排名"
  },
  "邮件": {
    title: "邮件",
    lines: ["系统奖励、补偿和活动结算会通过邮件发放。", "含附件邮件请及时领取。"],
    action: "打开邮箱"
  },
  "限时活动": {
    title: "限时活动",
    lines: ["当前开放：开服冲榜、项目翻倍、员工培养返利。", "活动奖励以页面规则为准。"],
    action: "参加活动"
  },
  "投资合作": {
    title: "投资合作",
    lines: ["选择合作方提升项目融资效率。", "高价值合作需要声望和公司等级。"],
    action: "洽谈合作"
  },
  "商战竞争": {
    title: "商战竞争",
    lines: ["挑战竞争对手，争夺市场份额和排名积分。", "布阵员工会影响谈判胜率。"],
    action: "进入商战"
  },
  "市场营销": {
    title: "市场营销",
    lines: ["投放营销资源，提高项目曝光和订单转化。", "营销等级越高，收益加成越稳定。"],
    action: "升级营销"
  },
  "产品研发": {
    title: "产品研发",
    lines: ["研发新产品线，提升公司长期估值。", "研发进度受员工能力和资金投入影响。"],
    action: "开始研发"
  },
  "企业并购": {
    title: "企业并购",
    lines: ["收购潜力公司，获取团队、专利和现金流。", "并购目标会随主线进度开放。"],
    action: "查看目标"
  },
  "扩建": {
    title: "扩建",
    lines: ["扩建办公楼层，解锁更多岗位和部门容量。", "扩建需要资金、声望和对应章节进度。"],
    action: "扩建公司"
  },
  "任务": {
    title: "主线任务",
    lines: ["主线、每日、支线任务会在任务系统中统一追踪。", "任务奖励由服务器记录，已领取奖励不能重复领取。"],
    action: "打开任务"
  },
  "创业知识": {
    title: "创业知识",
    lines: ["知识卡用于解释劳动合同、税务、回款、融资等经营常识。", "阅读后可推进对应知识任务。"],
    action: "已阅读"
  },
  "合规支线": {
    title: "合规支线",
    lines: ["合同复核、用工规范和客户回款会影响公司长期风险。", "完成合规支线可降低后续经营事件损失。"],
    action: "完成复核"
  },
  "出门谈判": {
    title: "出门谈判",
    lines: ["当前章节：第15章。", "推进谈判可解锁新客户、新项目和商战对手。"],
    action: "开始谈判"
  },
  "设置": {
    title: "设置",
    lines: ["账号切换会回到登录界面。", "公告、客服和声音设置统一从这里进入。"],
    action: "切换账号"
  },
  "员工": {
    title: "员工管理",
    lines: ["管理员工岗位、等级、薪资、忠诚度和能力值。", "招募、培养、解雇和股权激励都从员工系统进入。"],
    action: "进入员工"
  },
  "项目": {
    title: "项目中心",
    lines: ["查看项目阶段、投入成本、预计收益和负责人。", "完成主线任务会解锁更高收益项目。"],
    action: "进入项目"
  },
  "商战": {
    title: "商战大厅",
    lines: ["配置谈判阵容，挑战竞品公司。", "商战积分可兑换员工培养资源。"],
    action: "进入商战"
  },
  "产品": {
    title: "产品中心",
    lines: ["产品线会承接项目经验和研发投入。", "产品中心用于跟踪研发方向、用户增长和商业化表现。"],
    action: "查看产品"
  },
  "市场": {
    title: "市场中心",
    lines: ["市场入口用于查看品牌声誉、获客和竞争态势。", "市场变化会影响客户订单、活动传播和竞争压力。"],
    action: "查看市场"
  },
  "商会": {
    title: "商会",
    lines: ["加入商会可参与集体投资、商会任务和成员互助。", "商会入口按公司等级和服务器规则进入。"],
    action: "查看商会"
  },
  "背包": {
    title: "背包",
    lines: ["管理道具、礼包、招募券和活动材料。", "部分奖励领取后会自动进入背包。"],
    action: "打开背包"
  }
};
const avatarClassById: Record<string, string> = {
  strategist: "strategy",
  builder: "product",
  operator: "operation"
};

const compactNumber = (value: number): string => {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(value % 100000000 === 0 ? 0 : 2)}亿`;
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(value % 10000 === 0 ? 0 : 1)}万`;
  }

  return value.toLocaleString("zh-CN");
};

const shopProductSummaryOverrides: Record<string, string> = {
  "first-charge-starter": "首日启动资源，包含现金、行动力和首次猎头机会。",
  "daily-founder-pack": "补足今日项目推进和经营事件所需资源。",
  "weekly-operation-card": "连续 7 天领取行动力和培养材料。",
  "monthly-card-basic": "30 天每日补给，立即发放启动材料。",
  "growth-fund-weekly": "完成首周目标，领取成长返利。",
  "growth-fund-seed": "跟随公司成长，解锁长期奖励。",
  "targeted-headhunt-pack": "提供岗位定向选择机会，帮助补齐关键员工。",
  "risk-insurance-trial": "降低早期经营波动，提供一段时间的风险保障。",
  "market-sprint-pack": "提供市场情报和行动力，帮助推进市场竞争。",
  "project-delivery-pack": "补足项目交付资源，帮助推进主线和赛季任务。"
};

const getShopProductSummary = (productId: string, summary: string): string => shopProductSummaryOverrides[productId] ?? summary;
const getShopProductIcon = (category: string): string => {
  if (category === "risk_insurance") {
    return "shield-check";
  }
  if (category === "recruit_ticket" || category === "employee_pack") {
    return "file-search";
  }
  if (category === "operation_pack" || category === "daily_pack") {
    return "zap";
  }
  if (category === "first_charge") {
    return "gift";
  }
  return "package";
};
const getShopProductRarityClass = (category: string): string => {
  if (category === "first_charge" || category === "operation_pack") {
    return "is-legendary";
  }
  if (category === "recruit_ticket" || category === "employee_pack") {
    return "is-epic";
  }
  if (category === "risk_insurance") {
    return "is-rare";
  }
  return "is-basic";
};
const getShopProductRewardChips = (product: ShopProduct): string[] => {
  const chips: string[] = [];
  if (product.rewardItem) {
    chips.push(`${product.rewardItem.name} x${product.rewardItem.quantity}`);
  }
  if (product.rewardCash > 0) {
    chips.push(`资金 +${compactNumber(product.rewardCash)}`);
  }
  if (product.rewardActionPower > 0) {
    chips.push(`行动力 +${product.rewardActionPower}`);
  }
  if (product.rewardReputation > 0) {
    chips.push(`声望 +${product.rewardReputation}`);
  }
  return chips;
};
const getPrivilegeProductBenefit = (category: string): string => {
  if (category === "growth_fund") {
    return "成长返利";
  }
  if (category === "weekly_card" || category === "monthly_card") {
    return "经营加速";
  }
  return "特权权益";
};
const getPrivilegeProductRewardChips = (product: ShopProduct): string[] => {
  const chips = [product.durationDays > 0 ? `${product.durationDays}天权益` : "阶段权益", `VIP经验 +${product.pricePlatformCoins.toLocaleString("zh-CN")}`];
  return [...chips, ...getShopProductRewardChips(product)];
};
const getPrivilegeProductIcon = (category: string): string => {
  if (category === "monthly_card") return "calendar";
  if (category === "growth_fund") return "landmark";
  return "award";
};
const getPrivilegeProductTypeLabel = (product: ShopProduct): string =>
  product.durationDays > 0 ? `${product.durationDays}天权益` : "成长基金";
const isDailyPrivilegeProduct = (product: Pick<ShopProduct, "durationDays">): boolean => product.durationDays > 0;
const getPrivilegeRewardTitle = (product: Pick<ShopProduct, "durationDays">): string =>
  isDailyPrivilegeProduct(product) ? "每日可领" : "购买即得";
const getPrivilegeProductFootLabel = (product: ShopProduct): string =>
  isDailyPrivilegeProduct(product)
    ? `${product.durationDays}天 · 每日可领`
    : "长期有效 · 购买即得";
const getPrivilegeDailyRewardChips = (reward: Pick<ShopProduct, "rewardCash" | "rewardActionPower" | "rewardReputation" | "rewardItem">): string[] => {
  const chips: string[] = [];
  if (reward.rewardItem) {
    chips.push(`${reward.rewardItem.name} x${reward.rewardItem.quantity}`);
  }
  if (reward.rewardCash > 0) {
    chips.push(`资金 +${compactNumber(reward.rewardCash)}`);
  }
  if (reward.rewardActionPower > 0) {
    chips.push(`行动力 +${reward.rewardActionPower}`);
  }
  if (reward.rewardReputation > 0) {
    chips.push(`声望 +${reward.rewardReputation}`);
  }
  return chips;
};
const getPrivilegeClaimStatusClass = (purchase: ShopCenter["purchases"][number] | undefined): string => {
  if (purchase === undefined) return "is-locked";
  if (purchase.claimStatus === "claimable") return "is-claimable";
  if (purchase.claimStatus === "claimed") return "is-claimed";
  if (purchase.claimStatus === "expired") return "is-expired";
  return "is-active";
};
const isActivePrivilegePurchase = (purchase: { expiresAt: string | null }): boolean =>
  purchase.expiresAt === null || Date.parse(purchase.expiresAt) >= Date.now();
const formatPrivilegeExpiresAt = (expiresAt: string | null): string =>
  expiresAt === null ? "长期有效" : `有效至 ${expiresAt.slice(5, 10).replace("-", "/")}`;
const getPrivilegeClaimStatusLabel = (purchase: ShopCenter["purchases"][number] | undefined): string => {
  if (purchase === undefined) return "未开通";
  if (purchase.claimStatus === "claimable") return "今日可领";
  if (purchase.claimStatus === "claimed") return "今日已领";
  if (purchase.claimStatus === "expired") return "已过期";
  return purchase.claimStatus === "instant" ? "已发放" : "已开通";
};

const formatWan = (value: number): string => `${(value / 10000).toFixed(1)}万`;
const FUNDING_HIGH_RISK_BOARD_PRESSURE = 30;

const creditStatusLabel = (rating: string): string => {
  if (rating === "A") {
    return "优秀";
  }
  if (rating === "B") {
    return "良好";
  }
  if (rating === "C") {
    return "承压";
  }
  return "危险";
};

const debtRatioClass = (basisPoints: number): string => {
  if (basisPoints >= 7500) {
    return "is-danger";
  }
  if (basisPoints >= 6000) {
    return "is-warning";
  }
  return "is-safe";
};

const loanKnownLockedReasons = new Set(["信用不足", "公司等级不足", "月收入不足", "现金流不足", "负债率过高", "尚未进入危机场景", "尚未出现逾期", "需要已有贷款", "同类未结清"]);

const loanOfferStatusLabel = (offer: LoanOffer, activeLoan: PlayerLoan | undefined): string => {
  if (activeLoan !== undefined) {
    return activeLoan.status === "overdue" ? `逾期${activeLoan.overduePeriods}期` : "还款中";
  }
  if (!offer.isAvailable) {
    return offer.lockedReason && loanKnownLockedReasons.has(offer.lockedReason) ? offer.lockedReason : "信用不足";
  }
  return offer.isHighRisk ? "高风险" : "可签约";
};

const loanPrimaryActionLabel = (offer: LoanOffer | undefined, activeLoan: PlayerLoan | undefined): string => {
  if (activeLoan !== undefined) {
    return activeLoan.status === "overdue" ? "补缴逾期账单" : "提前还本期";
  }
  if (offer === undefined) {
    return "暂无授信";
  }
  return offer.isAvailable ? "申请签约拨备" : (offer.lockedReason ?? "信用不足");
};

const loanCrisisIcon = (routeId: string): string => {
  if (routeId === "cost_cut") {
    return "trending-up";
  }
  if (routeId === "restructure") {
    return "refresh-cw";
  }
  return "handshake";
};

const normalizeFundingTextList = (value: FundingTextBlock | undefined): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item) => item.trim().length > 0);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
};

const fundingOfferStatusLabel = (offer: FundingOffer): FundingUiStatus => {
  if (!offer.isAvailable) {
    return "未达条件";
  }

  return offer.boardPressure >= FUNDING_HIGH_RISK_BOARD_PRESSURE ? "高风险可谈" : "可谈";
};

const fundingRecordStatusLabel = (funding: PlayerFunding): FundingUiStatus => {
  if (funding.status === "funded") {
    return "已完成";
  }

  if (funding.status === "failed") {
    return "已失败";
  }

  return "谈判中";
};

const fundingStatusClass = (status: FundingUiStatus): string => {
  const classNameByStatus: Record<FundingUiStatus, string> = {
    "未达条件": "is-locked",
    "可谈": "is-open",
    "高风险可谈": "is-risk",
    "谈判中": "is-pending",
    "已完成": "is-done",
    "已失败": "is-failed"
  };

  return `finance-funding-status ${classNameByStatus[status]}`;
};

const fundingOfferDisplayStatus = (offer: FundingOffer, funding: PlayerFunding | undefined): FundingUiStatus => {
  if (funding !== undefined) {
    return fundingRecordStatusLabel(funding);
  }

  return fundingOfferStatusLabel(offer);
};

const fundingOfferReason = (offer: FundingOffer, funding: PlayerFunding | undefined): string => {
  if (funding?.status === "pending") {
    return "等待敲定条款";
  }

  if (funding?.status === "funded") {
    return "条款已生效";
  }

  if (funding?.status === "failed") {
    return "本轮已失败";
  }

  return offer.lockedReason ?? offer.gateStatus?.blockers[0]?.message ?? "可谈";
};

const fundingLegalReviewLabel = (status: string | undefined): string => {
  const labels: Record<string, string> = {
    not_required: "无需法务",
    pending: "法务待看",
    passed: "法务通过",
    blocked: "法务卡住"
  };

  return labels[status ?? "not_required"] ?? "法务待看";
};

const fundingDisbursementLabel = (status: string | undefined): string => {
  const labels: Record<string, string> = {
    scheduled: "等待打款",
    completed: "已到账",
    paused: "打款暂停"
  };

  return labels[status ?? "scheduled"] ?? "等待打款";
};

const fundingRoadshowStatusLabel = (status: FundingUiStatus): string => {
  const labels: Record<FundingUiStatus, string> = {
    "未达条件": "锁定",
    "可谈": "可谈",
    "高风险可谈": "可谈",
    "谈判中": "谈判",
    "已完成": "完成",
    "已失败": "失败"
  };

  return labels[status];
};

const fundingRoadshowStatusIcon = (status: FundingUiStatus): string => {
  const icons: Record<FundingUiStatus, string> = {
    "未达条件": "lock",
    "可谈": "zap",
    "高风险可谈": "zap",
    "谈判中": "loader-2",
    "已完成": "check",
    "已失败": "x"
  };

  return icons[status];
};

const fundingRoadshowFooterStatus = (status: FundingUiStatus): string => {
  const labels: Record<FundingUiStatus, string> = {
    "未达条件": "不满足",
    "可谈": "就绪",
    "高风险可谈": "高风险",
    "谈判中": "谈判中",
    "已完成": "生效",
    "已失败": "失败"
  };

  return labels[status];
};

const fundingPrimaryActionLabel = (offer: FundingOffer, funding: PlayerFunding | undefined): string => {
  if (funding?.status === "pending") {
    if (funding.legalReviewStatus === "blocked" || funding.disbursementStatus === "paused") {
      return "条款受阻";
    }

    return "敲定条款";
  }

  if (funding?.status === "funded") {
    return "已完成";
  }

  if (funding?.status === "failed") {
    return "已失败";
  }

  return offer.isAvailable ? "开始谈判" : "开始谈判";
};

const canSettleFunding = (funding: PlayerFunding): boolean =>
  funding.status === "pending" && funding.legalReviewStatus !== "blocked" && funding.disbursementStatus !== "paused";

const fundingPressureLabel = (value: number): string => {
  if (value > 80) {
    return "危急";
  }

  if (value > 50) {
    return "高压";
  }

  if (value > 30) {
    return "中等";
  }

  return "轻微";
};

const serverStatusClass = (server: ServerOption): string => {
  if (server.status === "busy" || server.label === "繁忙") {
    return "busy";
  }

  if (server.status === "new" || server.label === "新服") {
    return "new";
  }

  return "smooth";
};

const serverStatusText = (server: ServerOption): string => {
  if (server.isRecommended) {
    return "流畅";
  }

  return server.label;
};

const rarityClass = (rarity: string): string => {
  if (rarity === "传奇") {
    return "ssr";
  }

  if (rarity === "顶尖" || rarity === "稀缺") {
    return "sr";
  }

  return "r";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStoredSession = (value: unknown): value is StoredSession => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === SESSION_VERSION &&
    isRecord(value.account) &&
    typeof value.account.token === "string" &&
    isRecord(value.server) &&
    isRecord(value.avatar) &&
    isRecord(value.profile) &&
    typeof value.profile.companyName === "string"
  );
};

const isRememberedAuth = (value: unknown): value is RememberedAuth => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === SESSION_VERSION &&
    typeof value.username === "string" &&
    typeof value.password === "string"
  );
};

const loadSession = (): StoredSession | null => {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const loadRememberedAuth = (): RememberedAuth | null => {
  const raw = window.localStorage.getItem(REMEMBER_AUTH_KEY);
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isRememberedAuth(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveSession = (session: StoredSession): void => {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const saveRememberedAuth = (username: string, password: string): void => {
  window.localStorage.setItem(
    REMEMBER_AUTH_KEY,
    JSON.stringify({
      version: SESSION_VERSION,
      username,
      password
    })
  );
};

const clearSession = (): void => {
  window.localStorage.removeItem(SESSION_KEY);
};

const clearRememberedAuth = (): void => {
  window.localStorage.removeItem(REMEMBER_AUTH_KEY);
};

const readApiFailure = async (response: Response): Promise<ApiFailure> => {
  const traceId = response.headers.get("x-trace-id") ?? "";

  try {
    const body = (await response.json()) as ApiFailure;
    if (
      body.success === false &&
      typeof body.error?.code === "string" &&
      typeof body.error.message === "string"
    ) {
      return {
        ...body,
        traceId: body.traceId || traceId
      };
    }
  } catch {
    // Fall back to a generic client-side failure below when the response is not JSON.
  }

  return {
    success: false,
    error: {
      code: String(response.status),
      message: "请求失败，请稍后再试。"
    },
    traceId
  };
};

const apiRequest = async <T,>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<ApiResponse<T>> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    return readApiFailure(response);
  }

  return (await response.json()) as ApiResponse<T>;
};

function App() {
  const initialSession = loadSession();
  const rememberedAuth = loadRememberedAuth();
  const [step, setStep] = useState<OnboardingStep>("auth");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState(initialSession?.account.username ?? rememberedAuth?.username ?? "");
  const [password, setPassword] = useState(rememberedAuth?.password ?? "");
  const [rememberPassword, setRememberPassword] = useState(rememberedAuth !== null);
  const [account, setAccount] = useState<AccountSession | null>(initialSession?.account ?? null);
  const [servers, setServers] = useState<ServerOption[]>(initialSession ? [initialSession.server] : defaultServers);
  const [avatars, setAvatars] = useState<AvatarOption[]>(initialSession ? [initialSession.avatar] : []);
  const [serverId, setServerId] = useState(initialSession?.server.id ?? defaultServers[0]?.id ?? "");
  const [avatarId, setAvatarId] = useState(initialSession?.avatar.id ?? "");
  const [founderName, setFounderName] = useState(initialSession?.profile.founderName ?? "");
  const [companyName, setCompanyName] = useState(initialSession?.profile.companyName ?? "");
  const [profile, setProfile] = useState<PlayerProfile | null>(initialSession?.profile ?? null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isRestoring, setIsRestoring] = useState(initialSession !== null);
  const [isServerPickerOpen, setIsServerPickerOpen] = useState(false);
  const [activeServerCategory, setActiveServerCategory] = useState<"recent" | "all">("all");
  const [activeNav, setActiveNav] = useState("公司");
  const [businessTab, setBusinessTab] = useState<"项目" | "产品">("项目");
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [nativeHomePage, setNativeHomePage] = useState<NativeHomePage | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployees[0]?.id ?? "");
  const [projects, setProjects] = useState<BusinessProject[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0]?.id ?? "");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeTaskType, setActiveTaskType] = useState<TaskItem["type"]>("main");
  const [taskError, setTaskError] = useState("");
  const [taskNotice, setTaskNotice] = useState("");
  const [claimingTaskId, setClaimingTaskId] = useState("");
  const [activeKnowledgeTask, setActiveKnowledgeTask] = useState<TaskItem | null>(null);
  const [companyGrowth, setCompanyGrowth] = useState<CompanyGrowth | null>(null);
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoals | null>(null);
  const [randomTaskCenter, setRandomTaskCenter] = useState<RandomTaskCenter | null>(null);
  const [randomTaskError, setRandomTaskError] = useState("");
  const [randomTaskNotice, setRandomTaskNotice] = useState("");
  const [selectedRandomTaskId, setSelectedRandomTaskId] = useState("");
  const [managerTab, setManagerTab] = useState<"events" | "random" | "goals">("events");
  const [randomTaskModalId, setRandomTaskModalId] = useState("");
  const [randomTaskModifierItemId, setRandomTaskModifierItemId] = useState("");
  const [snoozedRandomTaskIds, setSnoozedRandomTaskIds] = useState<string[]>([]);
  const [randomTaskGameEnteredAt, setRandomTaskGameEnteredAt] = useState(() => Date.now());
  const [companyFinance, setCompanyFinance] = useState<CompanyFinance | null>(null);
  const [financeError, setFinanceError] = useState("");
  const [employeeError, setEmployeeError] = useState("");
  const [projectError, setProjectError] = useState("");
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventError, setEventError] = useState("");
  const [eventNotice, setEventNotice] = useState("");
  const [loanCenter, setLoanCenter] = useState<LoanCenter | null>(null);
  const [selectedLoanOfferId, setSelectedLoanOfferId] = useState("");
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [loanError, setLoanError] = useState("");
  const [loanNotice, setLoanNotice] = useState("");
  const [loanCrisisModalRoute, setLoanCrisisModalRoute] = useState<LoanCenter["crisis"]["routes"][number] | null>(null);
  const [fundingCenter, setFundingCenter] = useState<FundingCenter | null>(null);
  const [selectedFundingOfferId, setSelectedFundingOfferId] = useState("");
  const [selectedFundingId, setSelectedFundingId] = useState("");
  const [fundingError, setFundingError] = useState("");
  const [fundingNotice, setFundingNotice] = useState("");
  const [isFundingSyncing, setIsFundingSyncing] = useState(false);
  const [productCenter, setProductCenter] = useState<ProductCenter | null>(null);
  const [selectedProductOfferId, setSelectedProductOfferId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productError, setProductError] = useState("");
  const [productNotice, setProductNotice] = useState("");
  const [marketCenter, setMarketCenter] = useState<MarketCenter | null>(null);
  const [selectedMarketOfferId, setSelectedMarketOfferId] = useState("");
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [selectedCompetitorActionId, setSelectedCompetitorActionId] = useState("");
  const [marketError, setMarketError] = useState("");
  const [marketNotice, setMarketNotice] = useState("");
  const [shopCenter, setShopCenter] = useState<ShopCenter | null>(null);
  const [selectedShopProductId, setSelectedShopProductId] = useState("");
  const [activeShopCategory, setActiveShopCategory] = useState<ShopCategoryFilter>("recommended");
  const [shopError, setShopError] = useState("");
  const [shopNotice, setShopNotice] = useState("");
  const [inventoryCenter, setInventoryCenter] = useState<InventoryCenter | null>(null);
  const [inventoryError, setInventoryError] = useState("");
  const [vipCenter, setVipCenter] = useState<VipCenter | null>(null);
  const [selectedProfileVipLevel, setSelectedProfileVipLevel] = useState<number | null>(null);
  const [profileVipLevelWindowStart, setProfileVipLevelWindowStart] = useState<number | null>(null);
  const [vipError, setVipError] = useState("");
  const [vipNotice, setVipNotice] = useState("");
  const [seasonCenter, setSeasonCenter] = useState<SeasonCenter | null>(null);
  const [seasonError, setSeasonError] = useState("");
  const [seasonNotice, setSeasonNotice] = useState("");
  const [activeActivityView, setActiveActivityView] = useState<ActivityNativeView>("main");
  const [selectedActivityShopItemId, setSelectedActivityShopItemId] = useState("");
  const [scenarioRun, setScenarioRun] = useState<ScenarioRunResult["run"] | null>(null);
  const [leaderboardCenter, setLeaderboardCenter] = useState<LeaderboardCenter | null>(null);
  const [crossServerCenter, setCrossServerCenter] = useState<CrossServerCenter | null>(null);
  const [crossServerGuildHistory, setCrossServerGuildHistory] = useState<CrossServerGuildHistory | null>(null);
  const [titleCenter, setTitleCenter] = useState<TitleCenter | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [selectedKnowledgeEntryId, setSelectedKnowledgeEntryId] = useState("");
  const [guildCenter, setGuildCenter] = useState<GuildCenter | null>(null);
  const [guildHistory, setGuildHistory] = useState<GuildHistory | null>(null);
  const [guildAnnouncementDraft, setGuildAnnouncementDraft] = useState("");
  const [guildRulesDraft, setGuildRulesDraft] = useState("");
  const [chatCenter, setChatCenter] = useState<ChatCenter | null>(null);
  const [activeChatChannel, setActiveChatChannel] = useState<ChatChannelId>("world");
  const [chatDraft, setChatDraft] = useState("");
  const [chatNotice, setChatNotice] = useState("");
  const [chatError, setChatError] = useState("");
  const [mailCenter, setMailCenter] = useState<MailCenter | null>(null);
  const [activeMailChannel, setActiveMailChannel] = useState<"all" | MailChannelId>("all");
  const [activeMailStatus, setActiveMailStatus] = useState<MailStatusFilter>("all");
  const [selectedMailId, setSelectedMailId] = useState("");
  const [mailNotice, setMailNotice] = useState("");
  const [mailError, setMailError] = useState("");
  const [activeCrossServerMode, setActiveCrossServerMode] = useState<CrossServerMode>("season");
  const [activeLeaderboardScope, setActiveLeaderboardScope] = useState<LeaderboardScope>("server");
  const [selectedLeaderboardPlayer, setSelectedLeaderboardPlayer] = useState<LeaderboardPlayerCard | null>(null);
  const [leaderboardToast, setLeaderboardToast] = useState("");
  const [phase14Error, setPhase14Error] = useState("");
  const [phase14Notice, setPhase14Notice] = useState("");

  const selectedServer = useMemo(
    () => servers.find((server) => server.id === serverId) ?? servers[0],
    [serverId, servers]
  );
  const serverPickerServers = useMemo(() => {
    if (activeServerCategory === "all") {
      return servers;
    }

    const recentServers = [
      ...(selectedServer ? [selectedServer] : []),
      ...servers.filter((server) => server.isRecommended && server.id !== selectedServer?.id)
    ];

    return recentServers.length > 0 ? recentServers : servers;
  }, [activeServerCategory, selectedServer, servers]);
  const selectedAvatar = useMemo(
    () => avatars.find((avatar) => avatar.id === avatarId) ?? avatars[0],
    [avatarId, avatars]
  );
  const selectedKnowledgeEntry = useMemo(
    () => knowledgeEntries.find((entry) => entry.id === selectedKnowledgeEntryId) ?? knowledgeEntries.find((entry) => entry.isUnlocked) ?? knowledgeEntries[0],
    [knowledgeEntries, selectedKnowledgeEntryId]
  );
  const activeTaskKnowledgeEntry = useMemo(() => {
    if (activeKnowledgeTask === null) {
      return undefined;
    }
    return knowledgeEntries.find((entry) => entry.id === activeKnowledgeTask.knowledgeId);
  }, [activeKnowledgeTask, knowledgeEntries]);
  const openKnowledgeLink = useCallback((knowledge: KnowledgeLink | null): void => {
    if (knowledge === null) {
      return;
    }
    setSelectedKnowledgeEntryId(knowledge.id);
    setNativeHomePage("leaderboard");
  }, []);
  const reportTelemetry = useCallback((
    token: string,
    nextServerId: string,
    eventName: string,
    targetId?: string,
    metadata: Record<string, string | number | boolean | null> = {}
  ): void => {
    void apiRequest<{ eventId: string }>(
      "/telemetry/events",
      {
        method: "POST",
        body: JSON.stringify({
          serverId: nextServerId,
          eventName,
          targetId,
          metadata
        })
      },
      token
    );
  }, []);
  const reportCurrentTelemetry = (eventName: string, targetId: string, metadata: Record<string, string | number | boolean | null> = {}): void => {
    if (!account || !selectedServer) {
      return;
    }
    reportTelemetry(account.token, selectedServer.id, eventName, targetId, metadata);
  };
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0],
    [employees, selectedEmployeeId]
  );
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.isActive), [employees]);
  const employeePower = useMemo(
    () =>
      activeEmployees.reduce(
        (total, employee) => total + employee.management + employee.negotiation + employee.execution + employee.level * 3,
        0
      ),
    [activeEmployees]
  );
  const averageEmployeeLoyalty = useMemo(
    () =>
      activeEmployees.length === 0
        ? 0
        : Math.round(activeEmployees.reduce((total, employee) => total + employee.loyalty, 0) / activeEmployees.length),
    [activeEmployees]
  );
  const totalEmployeeSalary = useMemo(
    () => activeEmployees.reduce((total, employee) => total + employee.salary, 0),
    [activeEmployees]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0],
    [projects, selectedProjectId]
  );
  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "active" || project.status === "ready"),
    [projects]
  );
  const totalProjectRevenue = useMemo(
    () => activeProjects.reduce((total, project) => total + project.revenueReward, 0),
    [activeProjects]
  );
  const highestProjectStage = useMemo(
    () => projects.reduce((highest, project) => Math.max(highest, project.stage), 0),
    [projects]
  );
  const currentMainTask = useMemo(
    () => tasks.find((task) => task.type === "main" && !task.isClaimed) ?? tasks.find((task) => task.type === "main"),
    [tasks]
  );
  const highlightedTask = useMemo(
    () => tasks.find((task) => task.isClaimable && !task.isClaimed) ?? currentMainTask,
    [currentMainTask, tasks]
  );
  const businessClockHint = useMemo(() => {
    const pulse = companyFinance?.businessClock;
    if (pulse === undefined) {
      return null;
    }
    if (pulse.settledTicks <= 0) {
      return "经营时钟已同步";
    }

    const prefix = pulse.elapsedMinutes > pulse.settledMinutes ? "离线经营" : "经营波动";
    const cashLabel = pulse.cashDelta >= 0 ? `+${compactNumber(pulse.cashDelta)}` : compactNumber(pulse.cashDelta);
    return `${prefix} ${cashLabel}`;
  }, [companyFinance?.businessClock]);
  const pendingRandomTasks = useMemo(
    () => randomTaskCenter?.tasks.filter((task) => task.status === "pending") ?? [],
    [randomTaskCenter?.tasks]
  );
  const selectedRandomTask = useMemo(
    () => pendingRandomTasks.find((task) => task.id === selectedRandomTaskId) ?? pendingRandomTasks[0],
    [pendingRandomTasks, selectedRandomTaskId]
  );
  const activeRandomTask = useMemo(
    () => pendingRandomTasks.find((task) => task.id === randomTaskModalId) ?? null,
    [pendingRandomTasks, randomTaskModalId]
  );
  const selectedEvent = useMemo(
    () => events.find((item) => item.id === selectedEventId) ?? events[0],
    [events, selectedEventId]
  );
  const pendingEvents = useMemo(() => events.filter((item) => item.status === "pending"), [events]);
  const selectedLoanOffer = useMemo(
    () => loanCenter?.offers.find((item) => item.id === selectedLoanOfferId) ?? loanCenter?.offers[0],
    [loanCenter?.offers, selectedLoanOfferId]
  );
  const activeLoans = useMemo(
    () => loanCenter?.loans.filter((item) => item.status !== "settled") ?? [],
    [loanCenter?.loans]
  );
  const selectedLoan = useMemo(
    () => activeLoans.find((item) => item.id === selectedLoanId) ?? activeLoans[0],
    [activeLoans, selectedLoanId]
  );
  const selectedOfferLoan = useMemo(
    () => activeLoans.find((item) => item.configId === selectedLoanOffer?.id),
    [activeLoans, selectedLoanOffer?.id]
  );
  const sortedLoanOffers = useMemo(() => {
    const statusRank = (offer: LoanOffer): number => {
      const active = activeLoans.some((loan) => loan.configId === offer.id);
      if (active) {
        return 0;
      }
      if (offer.isAvailable && !offer.isHighRisk) {
        return 1;
      }
      if (offer.isAvailable) {
        return 2;
      }
      return 3;
    };
    return [...(loanCenter?.offers ?? [])].sort((left, right) => statusRank(left) - statusRank(right));
  }, [activeLoans, loanCenter?.offers]);
  const selectedFundingOffer = useMemo(
    () => fundingCenter?.offers.find((item) => item.id === selectedFundingOfferId) ?? fundingCenter?.offers[0],
    [fundingCenter?.offers, selectedFundingOfferId]
  );
  const pendingFundings = useMemo(
    () => fundingCenter?.fundings.filter((item) => item.status === "pending") ?? [],
    [fundingCenter?.fundings]
  );
  const selectedFunding = useMemo(
    () =>
      pendingFundings.find((item) => item.id === selectedFundingId && item.investorId === selectedFundingOffer?.id) ??
      pendingFundings.find((item) => item.investorId === selectedFundingOffer?.id),
    [pendingFundings, selectedFundingId, selectedFundingOffer?.id]
  );
  const selectedFundingRecord = useMemo(
    () => fundingCenter?.fundings.find((item) => item.investorId === selectedFundingOffer?.id),
    [fundingCenter?.fundings, selectedFundingOffer?.id]
  );
  const fundingHistory = useMemo(
    () =>
      [...(fundingCenter?.fundings ?? [])].sort((left, right) => {
        const leftTime = new Date(left.resolvedAt ?? left.createdAt).getTime();
        const rightTime = new Date(right.resolvedAt ?? right.createdAt).getTime();
        return rightTime - leftTime;
      }),
    [fundingCenter?.fundings]
  );
  const selectedFundingPostFocus = useMemo(() => {
    const centerFocus = normalizeFundingTextList(fundingCenter?.postInvestmentFocus);
    if (selectedFundingOffer === undefined) {
      return centerFocus;
    }

    const matchedFunding = fundingCenter?.fundings.find((item) => item.investorId === selectedFundingOffer.id);
    const offerFocus = normalizeFundingTextList(selectedFundingOffer.postInvestmentFocus);
    const fundingFocus = normalizeFundingTextList(matchedFunding?.postInvestmentFocus);
    if (offerFocus.length > 0) {
      return offerFocus;
    }

    if (fundingFocus.length > 0) {
      return fundingFocus;
    }

    if (centerFocus.length > 0) {
      return centerFocus;
    }

    const founderEquityAfter =
      ((fundingCenter?.finance.founderEquityBasisPoints ?? profile?.founderEquityBasisPoints ?? 0) - selectedFundingOffer.equityBasisPoints) / 100;
    return [
      `创始人持股降至 ${founderEquityAfter.toFixed(1)}%`,
      `治理压力 ${selectedFundingOffer.boardPressure}`,
      `投后估值 ${compactNumber(selectedFundingOffer.postMoneyValuation)}`
    ];
  }, [fundingCenter?.finance.founderEquityBasisPoints, fundingCenter?.fundings, fundingCenter?.postInvestmentFocus, profile?.founderEquityBasisPoints, selectedFundingOffer]);
  const selectedFundingRecentResult = useMemo(() => {
    if (selectedFundingOffer === undefined) {
      return fundingCenter?.recentResult ?? "";
    }

    const matchedFunding = fundingHistory.find((item) => item.investorId === selectedFundingOffer.id);
    return selectedFundingOffer.recentResult ?? matchedFunding?.recentResult ?? matchedFunding?.resultSummary ?? fundingCenter?.recentResult ?? "";
  }, [fundingCenter?.recentResult, fundingHistory, selectedFundingOffer]);
  const selectedProductOffer = useMemo(
    () => productCenter?.offers.find((item) => item.id === selectedProductOfferId) ?? productCenter?.offers[0],
    [productCenter?.offers, selectedProductOfferId]
  );
  const activeProducts = useMemo(
    () => productCenter?.products.filter((item) => item.status !== "closed") ?? [],
    [productCenter?.products]
  );
  const selectedProduct = useMemo(
    () => activeProducts.find((item) => item.id === selectedProductId) ?? activeProducts[0],
    [activeProducts, selectedProductId]
  );
  const totalProductUsers = useMemo(
    () => activeProducts.reduce((total, item) => total + item.users, 0),
    [activeProducts]
  );
  const selectedMarketOffer = useMemo(
    () => marketCenter?.offers.find((item) => item.id === selectedMarketOfferId) ?? marketCenter?.offers[0],
    [marketCenter?.offers, selectedMarketOfferId]
  );
  const selectedMarket = useMemo(
    () => marketCenter?.markets.find((item) => item.id === selectedMarketId) ?? marketCenter?.markets[0],
    [marketCenter?.markets, selectedMarketId]
  );
  const pendingCompetitorActions = useMemo(
    () => marketCenter?.actions.filter((item) => item.status === "pending") ?? [],
    [marketCenter?.actions]
  );
  const selectedCompetitorAction = useMemo(
    () => pendingCompetitorActions.find((item) => item.id === selectedCompetitorActionId) ?? pendingCompetitorActions[0],
    [pendingCompetitorActions, selectedCompetitorActionId]
  );
  const selectedShopProduct = useMemo(
    () => shopCenter?.products.find((item) => item.id === selectedShopProductId) ?? null,
    [selectedShopProductId, shopCenter?.products]
  );
  const privilegeProducts = useMemo(
    () => shopCenter?.products.filter((item) => item.category === "monthly_card" || item.category === "weekly_card" || item.category === "growth_fund") ?? [],
    [shopCenter?.products]
  );
  const commerceProducts = useMemo(
    () => shopCenter?.products.filter((item) => item.category !== "monthly_card" && item.category !== "weekly_card" && item.category !== "growth_fund") ?? [],
    [shopCenter?.products]
  );
  const visibleCommerceProducts = useMemo(
    () =>
      commerceProducts.filter((item) => {
        if (activeShopCategory === "recommended") {
          return true;
        }
        return shopCategoryGroups[activeShopCategory].includes(item.category);
      }),
    [activeShopCategory, commerceProducts]
  );
  const privilegePurchases = useMemo(
    () =>
      shopCenter?.purchases.filter((purchase) => {
        const product = shopCenter.products.find((item) => item.id === purchase.productId);
        return product?.category === "monthly_card" || product?.category === "weekly_card" || product?.category === "growth_fund";
      }) ?? [],
    [shopCenter]
  );
  const activePrivilegePurchases = useMemo(
    () => privilegePurchases.filter((purchase) => isActivePrivilegePurchase(purchase)),
    [privilegePurchases]
  );
  const claimablePrivilegePurchases = useMemo(
    () => activePrivilegePurchases.filter((purchase) => purchase.isClaimableToday),
    [activePrivilegePurchases]
  );
  const activePrivilegeProducts = useMemo(
    () => privilegeProducts.filter((product) => activePrivilegePurchases.some((purchase) => purchase.productId === product.id)),
    [activePrivilegePurchases, privilegeProducts]
  );
  const nextPrivilegeProduct = useMemo(
    () => privilegeProducts.find((product) => !activePrivilegePurchases.some((purchase) => purchase.productId === product.id)) ?? null,
    [activePrivilegePurchases, privilegeProducts]
  );
  const privilegeBoostLabel = activePrivilegeProducts.some((product) => product.category === "growth_fund")
    ? "经营经验 x2"
    : activePrivilegeProducts.length > 0
      ? "经营经验 x1.5"
      : "暂未开启";
  const privilegeNextAction =
    activePrivilegeProducts.length === 0
      ? "开通月卡，每日多领经营补给。"
      : claimablePrivilegePurchases.length > 0
        ? "先领今日奖励，错过不补发。"
      : nextPrivilegeProduct
        ? "开通月卡，每日多领经营补给。"
        : "特权已拉满，继续经营拿加速。";
  const selectedInventoryItem = useMemo(
    () => inventoryCenter?.items.find((item) => item.itemId === "action-drink") ?? inventoryCenter?.items[0] ?? null,
    [inventoryCenter?.items]
  );
  const riskInsuranceItem = useMemo(
    () => inventoryCenter?.items.find((item) => item.itemId === "risk-insurance") ?? null,
    [inventoryCenter?.items]
  );
  const marketIntelItem = useMemo(
    () => inventoryCenter?.items.find((item) => item.itemId === "market-intel") ?? null,
    [inventoryCenter?.items]
  );
  const financeAdvisorItem = useMemo(
    () => inventoryCenter?.items.find((item) => item.itemId === "finance-advisor-card") ?? null,
    [inventoryCenter?.items]
  );
  const activeRandomTaskAllowsRiskInsurance = useMemo(
    () =>
      activeRandomTask !== null &&
      activeRandomTask.category !== "season" &&
      activeRandomTask.options.some((option) => option.cashReward < 0 || option.reputationReward < 0),
    [activeRandomTask]
  );
  const activeRandomTaskAllowsMarketIntel = useMemo(
    () => activeRandomTask !== null && (activeRandomTask.category === "market" || activeRandomTask.category === "season"),
    [activeRandomTask]
  );
  const activeRandomTaskAllowsFinanceAdvisor = useMemo(
    () => activeRandomTask !== null && (activeRandomTask.category === "finance" || activeRandomTask.category === "funding" || activeRandomTask.category === "loan"),
    [activeRandomTask]
  );
  const activeRandomTaskModifier = useMemo(() => {
    if (activeRandomTaskAllowsFinanceAdvisor) {
      return {
        itemId: "finance-advisor-card",
        item: financeAdvisorItem,
        label: "财务顾问卡",
        enabledHint: "优化本次现金流判断",
        emptyHint: "背包暂无可用顾问卡"
      };
    }
    if (activeRandomTaskAllowsMarketIntel) {
      return {
        itemId: "market-intel",
        item: marketIntelItem,
        label: "市场情报",
        enabledHint: "优化本次市场判断",
        emptyHint: "背包暂无可用情报"
      };
    }
    if (activeRandomTaskAllowsRiskInsurance) {
      return {
        itemId: "risk-insurance",
        item: riskInsuranceItem,
        label: "风险保险",
        enabledHint: "降低本次现金或声望损失",
        emptyHint: "背包暂无可用保险"
      };
    }
    return null;
  }, [activeRandomTaskAllowsFinanceAdvisor, activeRandomTaskAllowsMarketIntel, activeRandomTaskAllowsRiskInsurance, financeAdvisorItem, marketIntelItem, riskInsuranceItem]);
  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.type === activeTaskType),
    [activeTaskType, tasks]
  );
  const primaryLeaderboard = leaderboardCenter?.boards[0] ?? null;
  const primaryCrossLeaderboard = crossServerCenter?.boards[0] ?? null;
  const personalCrossRank = profile === null ? "-" : primaryCrossLeaderboard?.rows.find((row) => row.profileId === profile.id)?.rank ?? "-";
  const currentCrossGuildRank = crossServerCenter?.guildBoard.rows.find((row) => row.guildId === crossServerCenter.guildSeason.guildId)?.rank ?? "-";
  const crossServerBattleReport = crossServerCenter?.battleReport ?? null;
  const latestGuildSettlement = guildHistory?.settlements[0] ?? null;
  const latestCrossGuildSettlement = crossServerGuildHistory?.settlements[0] ?? null;
  const todayGoalSection = longTermGoals?.sections.find((section) => section.key === "today") ?? null;
  const currentGuildMember = profile === null ? null : guildCenter?.members.find((member) => member.profileId === profile.id) ?? null;
  const activeChatMessages = useMemo(
    () => chatCenter?.messages.filter((message) => message.channel === activeChatChannel) ?? [],
    [activeChatChannel, chatCenter?.messages]
  );
  const latestChatMessage = chatCenter?.messages.find((message) => message.channel !== "system") ?? chatCenter?.messages[0] ?? null;
  const activeChatChannelConfig = chatCenter?.channels.find((channel) => channel.id === activeChatChannel) ?? null;
  const visibleMails = useMemo(
    () => (mailCenter?.mails ?? [])
      .filter((mail) => activeMailChannel === "all" || mail.channel === activeMailChannel)
      .filter((mail) => activeMailStatus === "all" || (activeMailStatus === "unread" ? !mail.isRead : mail.isRead)),
    [activeMailChannel, activeMailStatus, mailCenter?.mails]
  );
  const selectedMail = visibleMails.find((mail) => mail.id === selectedMailId) ?? visibleMails[0] ?? null;
  const rewardMails = mailCenter?.mails.filter((mail) => mail.channel === "reward") ?? [];
  const pendingRewardMail = rewardMails.find((mail) => !mail.isRead || mail.canClaim) ?? rewardMails[0] ?? null;
  const canReviewGuildApplications = currentGuildMember?.role === "leader" || currentGuildMember?.role === "vice_leader";
  const canManageGuildMembers = currentGuildMember?.role === "leader";
  const guildRoleLabel = (role: string): string =>
    role === "leader" ? "会长" : role === "vice_leader" ? "副会长" : "成员";
  const guildAnnouncement = guildCenter?.guild?.announcement.trim() || "暂无公告";
  const guildRules = guildCenter?.guild?.collaborationRules.trim() || "暂无协作规则";
  const primarySeasonTask = seasonCenter?.tasks[0] ?? null;
  const seasonActivities = seasonCenter?.activities ?? [];
  const groupedSeasonActivities = [
    { key: "active", title: "当前活动", activities: seasonActivities.filter((activity) => activity.status === "active") },
    { key: "upcoming", title: "即将开放", activities: seasonActivities.filter((activity) => activity.status === "upcoming") },
    { key: "ended", title: "已结束回顾", activities: seasonActivities.filter((activity) => activity.status === "ended") }
  ].filter((group) => group.activities.length > 0);
  const activeActivityBoards = seasonCenter?.activityBoards ?? [];
  const latestActivityRecaps = seasonCenter?.activityRecaps.slice(0, 2) ?? [];
  const activeTitleCount = titleCenter?.titles.filter((title) => !title.isExpired).length ?? 0;
  const completedAchievementCount = achievements.filter((achievement) => achievement.isCompleted).length;
  const claimableAchievementCount = achievements.filter((achievement) => achievement.isCompleted && !achievement.isClaimed).length;
  const bestActivityRecap = seasonCenter?.activityRecaps.find((recap) => recap.personalRank !== null) ?? seasonCenter?.activityRecaps[0] ?? null;
  const activityShopItems = seasonCenter?.shopItems ?? [];
  const activeSeasonActivities = seasonActivities.filter((activity) => activity.status === "active");
  const currentSeasonActivity = activeSeasonActivities[0] ?? seasonActivities.find((activity) => activity.status === "upcoming") ?? seasonActivities[0] ?? null;
  const claimableSeasonActivities = seasonActivities.filter((activity) =>
    activity.status === "active" && activity.score >= activity.targetScore && !activity.rewardClaimed
  );
  const exchangeableActivityShopItems = activityShopItems.filter((item) => item.isAvailable);
  const seasonPoints = seasonCenter?.season.points ?? 0;
  const selectedActivityShopItem = activityShopItems.find((item) => item.id === selectedActivityShopItemId) ?? null;
  const primaryActivityBoard = activeActivityBoards[0] ?? null;
  const getLeaderboardSelfValue = (boardKey: string): number => {
    if (boardKey === "cashflow") {
      return (profile?.monthlyIncome ?? 0) - (profile?.monthlyExpense ?? 0);
    }
    if (boardKey === "product-growth") {
      return activeProducts.reduce((total, product) => total + product.users + product.monthlyRevenue, 0);
    }
    if (boardKey === "guild") {
      return currentGuildMember?.contributionScore ?? 0;
    }
    return profile?.valuation ?? 0;
  };
  const formatLeaderboardSelfValue = (boardKey: string, value: number): string => {
    if (boardKey === "cashflow") {
      return `净流 ${compactNumber(value)}`;
    }
    if (boardKey === "product-growth") {
      return `增长 ${compactNumber(value)}`;
    }
    if (boardKey === "guild") {
      return `贡献 ${compactNumber(value)}`;
    }
    return `估值 ${compactNumber(value)}`;
  };
  const getLeaderboardAction = (boardKey: string): { label: string; panel: string } => {
    if (boardKey === "cashflow") {
      return { label: "去财务", panel: "财务" };
    }
    if (boardKey === "product-growth") {
      return { label: "去产品", panel: "产品" };
    }
    if (boardKey === "guild") {
      return { label: "去商会", panel: "商会" };
    }
    return { label: "去业务", panel: "项目" };
  };
  const serverLeaderboardSummaries = (leaderboardCenter?.boards ?? []).map((board) => {
    const selfRowIndex = profile === null ? -1 : board.rows.findIndex((row) => row.profileId === profile.id);
    const selfRow = selfRowIndex >= 0 ? board.rows[selfRowIndex] ?? null : null;
    const previousRow = selfRowIndex > 0 ? board.rows[selfRowIndex - 1] ?? null : null;
    const selfValue = selfRow?.value ?? getLeaderboardSelfValue(board.key);
    const action = getLeaderboardAction(board.key);
    return {
      board,
      selfRank: selfRow?.rank ?? null,
      selfValueLabel: selfRow?.valueLabel ?? formatLeaderboardSelfValue(board.key, selfValue),
      gapLabel: selfRow === null
        ? "冲进前20"
        : previousRow === null
          ? "领先中"
          : `还差 ${formatLeaderboardSelfValue(board.key, Math.max(0, previousRow.value - selfRow.value))}`,
      rewardStatus: selfRow !== null && selfRow.rank <= 3 ? "前3名邮件奖励" : "冲击前3名",
      action
    };
  });
  const primaryLeaderboardSummary = serverLeaderboardSummaries[0] ?? null;
  const activitySelfRow = profile === null ? null : primaryActivityBoard?.rows.find((row) => row.profileId === profile.id) ?? null;
  const crossRewardClaimable = Boolean(crossServerCenter?.dailyReward.canClaim || (crossServerCenter?.stageRewards ?? []).some((reward) => reward.isClaimable));
  const activeLeaderboardBoard = activeLeaderboardScope === "activity"
    ? primaryActivityBoard
    : activeLeaderboardScope === "cross"
      ? primaryCrossLeaderboard
      : primaryLeaderboard;
  const activeLeaderboardBoardName = activeLeaderboardBoard?.name ?? (activeLeaderboardScope === "activity" ? "活动榜" : activeLeaderboardScope === "cross" ? "跨服榜" : "公司估值榜");
  const makeLeaderboardPlayerCard = (row: LeaderboardRow, boardName = activeLeaderboardBoardName): LeaderboardPlayerCard => {
    const seed = Math.abs(row.value + row.rank * 17);
    const realAssetPercent = 18 + (seed % 34);
    const techAssetPercent = 22 + ((seed + row.rank * 11) % 38);
    const financeAssetPercent = Math.max(8, 100 - realAssetPercent - techAssetPercent);
    const avatarPool = [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=140&h=140&fit=crop",
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=140&h=140&fit=crop",
      "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=120&h=120&fit=crop"
    ];
    const avatarUrl = avatarPool[(row.rank - 1) % avatarPool.length] ?? "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=120&h=120&fit=crop";
    const displayValueLabel = activeLeaderboardScope === "activity" ? `${row.value}分` : compactNumber(row.value);
    return {
      ...row,
      boardName,
      levelLabel: `LV.${Math.max(1, 100 - row.rank * 3)}`,
      achievementLabel: row.equippedTitle ?? (row.rank <= 3 ? "巅峰席位" : activeLeaderboardScope === "activity" ? "活动新贵" : activeLeaderboardScope === "cross" ? "跨服强者" : "市场黑马"),
      avatarUrl,
      displayValueLabel,
      realAssetPercent,
      techAssetPercent,
      financeAssetPercent
    };
  };
  const activeLeaderboardCards = (activeLeaderboardBoard?.rows ?? []).map((row) => makeLeaderboardPlayerCard(row));
  const podiumLeaderboardCards = activeLeaderboardCards.slice(0, 3);
  const listedLeaderboardCards = activeLeaderboardCards.slice(3, 12);
  const openLeaderboardPlayer = (player: LeaderboardPlayerCard): void => {
    setSelectedLeaderboardPlayer(player);
  };
  const showLeaderboardToast = (message: string): void => {
    setLeaderboardToast(message);
    window.setTimeout(() => setLeaderboardToast(""), 2200);
  };
  const currentActivityProgressPercent = currentSeasonActivity === null
    ? 0
    : Math.max(0, Math.min(100, (currentSeasonActivity.score * 100) / Math.max(1, currentSeasonActivity.targetScore)));
  const currentActivityClaimable = currentSeasonActivity !== null
    && currentSeasonActivity.status === "active"
    && currentSeasonActivity.score >= currentSeasonActivity.targetScore
    && !currentSeasonActivity.rewardClaimed;
  const currentActivityProgressLabel = currentSeasonActivity === null
    ? "暂无活动"
    : `${currentSeasonActivity.score}/${currentSeasonActivity.targetScore}`
      + (currentSeasonActivity.status === "active" && currentSeasonActivity.dailyProgressLimit > 0 ? ` · 今日 ${currentSeasonActivity.dailyProgressCount}/${currentSeasonActivity.dailyProgressLimit}` : "")
      + (currentSeasonActivity.actionPowerCost > 0 ? ` · 消耗 ${currentSeasonActivity.actionPowerCost} 行动力` : "");
  const currentActivityStatusLabel = currentSeasonActivity === null
    ? "读取中"
    : currentSeasonActivity.rewardClaimed ? "已完成"
      : currentActivityClaimable ? "可领奖"
        : currentSeasonActivity.status === "active" ? "进行中"
          : currentSeasonActivity.status === "upcoming" ? "预告"
            : "已结束";
  const currentActivityProgressButtonLabel = currentSeasonActivity === null
    ? "等待活动"
    : currentSeasonActivity.progressMode === "scenario"
      ? "剧本结算"
      : currentSeasonActivity.progressLockedReason ?? (currentSeasonActivity.progressMode === "leaderboard" ? "冲榜一次" : "完成目标");
  const activityTodayGuide = currentActivityClaimable
    ? "今日重点：活动目标已达成，先领取奖励，再把积分用于活动商店。"
    : exchangeableActivityShopItems.length > 0
      ? "今日重点：活动积分足够，先兑换限时资源补强经营。"
      : currentSeasonActivity?.canProgress
        ? "今日重点：完成当前活动推进，积累赛季积分和榜单荣誉。"
        : "今日重点：查看赛季任务和通行证收益，准备下一轮活动。";
  const passBenefitCopy = seasonCenter?.season.pass.isPurchased
    ? "通行证已开通：额外赛季随机任务、付费线奖励和 VIP 经验收益已激活。"
    : "未开通通行证：开通后获得额外赛季随机任务、立即奖励、VIP 经验，并帮助追赶赛季进度。";
  const passImmediateRewards = ["赛季经验券 x3", "限定称号碎片 x2", "办公室皮肤券 x1"];
  const passTaskRows = (seasonCenter?.tasks ?? []).map((task, index) => ({
    ...task,
    stageLabel: task.isClaimed || task.progress >= task.target ? "已完成" : index === 0 ? "今日可完成" : "待推进"
  }));
  const passTaskStageCounts = ["今日可完成", "待推进", "已完成"].map((stage) => ({
    stage,
    count: passTaskRows.filter((task) => task.stageLabel === stage).length
  }));
  const activityManagerReminders = [
    ...claimableSeasonActivities.map((activity) => ({
      id: `activity-claim:${activity.id}`,
      source: "活动",
      title: `${activity.name} 可领奖`,
      summary: "活动目标已达成，先领取奖励再继续经营。",
      status: "可领奖"
    })),
    ...exchangeableActivityShopItems.slice(0, 3).map((item) => ({
      id: `activity-shop:${item.id}`,
      source: "商店",
      title: `${item.name} 可兑换`,
      summary: "活动积分足够，适合兑换限时资源。",
      status: "可兑换"
    }))
  ];
  const hasActivityAttention = seasonActivities.some((activity) =>
    activity.status === "active" && (!activity.isJoined || activity.score >= activity.targetScore && !activity.rewardClaimed)
  ) || activityShopItems.some((item) => item.isAvailable);
  const hasPassAttention = (seasonCenter?.tasks ?? []).some((task) => task.progress >= task.target && !task.isClaimed)
    || companyGrowth !== null && companyGrowth.fullLevelChest.claimableCount > 0;
  const hasLeaderboardAttention = activeActivityBoards.length > 0
    || crossRewardClaimable
    || (pendingRewardMail !== null && (!pendingRewardMail.isRead || pendingRewardMail.canClaim))
    || (mailCenter === null && (profile?.unreadMailCount ?? 0) > 0);
  const hasPrivilegeAttention = claimablePrivilegePurchases.length > 0;
  const hasManagerAttention = pendingEvents.length > 0
    || pendingRandomTasks.length > 0
    || (profile?.pendingEventCount ?? 0) > 0
    || longTermGoals !== null && longTermGoals.summaries.todayClaimableCount > 0
    || activityManagerReminders.length > 0;
  const shouldShowRightActionRedDot = (item: string): boolean => {
    if (item === "活动") {
      return hasActivityAttention;
    }
    if (item === "通行证") {
      return hasPassAttention;
    }
    if (item === "排行") {
      return hasLeaderboardAttention;
    }
    if (item === "特权") {
      return hasPrivilegeAttention;
    }
    if (item === "专属经理") {
      return hasManagerAttention;
    }
    return false;
  };
  const primaryScenario = seasonCenter?.scenarios[0] ?? null;
  const activeTaskTip =
    activeTaskType === "daily"
      ? "每日任务按服务器日刷新，已领取奖励不会在同一天重复发放。"
      : activeTaskType === "side"
        ? "支线任务由知识阅读、合规复核和经营动作触发。"
        : "主线任务用于推进前 7 日公司成长路线。";

  const replaceTask = (nextTask: TaskItem): void => {
    setTasks((currentTasks) => currentTasks.map((task) => (task.id === nextTask.id ? nextTask : task)));
  };

  const loadTasks = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<TaskItem[]>(
      `/tasks?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setTasks(response.data);
      setTaskError("");
      return;
    }

    setTaskError(response.error.message);
  };

  const loadCompanyGrowth = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<CompanyGrowth>(
      `/company/growth?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setCompanyGrowth(response.data);
      setProfile(response.data.profile);
    }
  };

  const claimFullLevelChest = async (): Promise<void> => {
    if (!account || !selectedServer) {
      setSeasonError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<CompanyGrowth>(
      "/company/growth/full-level-chest/claim",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setCompanyGrowth(response.data);
      setProfile(response.data.profile);
      setSeasonNotice("满级宝箱奖励已领取。");
      setSeasonError("");
      await loadInventoryCenter(account.token, selectedServer.id);
      return;
    }

    setSeasonError(response.error.message);
  };

  const loadRandomTasks = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<RandomTaskCenter>(
      `/random-tasks?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setRandomTaskCenter(response.data);
      setSelectedRandomTaskId((currentId) => response.data.tasks.find((task) => task.id === currentId && task.status === "pending")?.id ?? response.data.tasks.find((task) => task.status === "pending")?.id ?? "");
      setProfile(response.data.profile);
      setRandomTaskError("");
      return;
    }

    setRandomTaskError(response.error.message);
  };

  const loadEvents = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<BusinessEvent[]>(
      `/events?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setEvents(response.data);
      setSelectedEventId((currentId) => response.data.find((item) => item.id === currentId)?.id ?? response.data[0]?.id ?? "");
      setEventError("");
      setProfile((currentProfile) =>
        currentProfile === null
          ? currentProfile
          : {
              ...currentProfile,
              pendingEventCount: response.data.filter((item) => item.status === "pending").length
            }
      );
      return;
    }

    setEventError(response.error.message);
  };

  const applyCompanyFinance = (finance: CompanyFinance): void => {
    setCompanyFinance(finance);
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            cash: finance.cash,
            monthlyIncome: finance.monthlyIncome,
            monthlyExpense: finance.monthlyExpense,
            valuation: finance.valuation,
            founderEquityBasisPoints: finance.founderEquityBasisPoints,
            totalDebt: finance.totalDebt,
            creditRating: finance.creditRating,
            reputation: finance.brandReputation,
            employeeSatisfaction: finance.employeeSatisfaction,
            customerSatisfaction: finance.customerSatisfaction,
            financeMonth: finance.financeMonth,
            operatingDay: finance.operatingDay,
            riskStatus: finance.riskStatus,
            debtWarning: finance.debtRatioBasisPoints >= 6000 ? "高" : finance.totalDebt > 0 ? "中" : "低"
          }
    );
  };

  const loadCompanyFinance = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<CompanyFinance>(
      `/company/status?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      applyCompanyFinance(response.data);
      setFinanceError("");
      return;
    }

    setFinanceError(response.error.message);
  };

  const applyLoanCenter = (nextLoanCenter: LoanCenter): void => {
    setLoanCenter(nextLoanCenter);
    setSelectedLoanOfferId((currentId) => nextLoanCenter.offers.find((item) => item.id === currentId)?.id ?? nextLoanCenter.offers[0]?.id ?? "");
    const active = nextLoanCenter.loans.filter((item) => item.status !== "settled");
    setSelectedLoanId((currentId) => active.find((item) => item.id === currentId)?.id ?? active[0]?.id ?? "");
    setCompanyFinance(nextLoanCenter.finance);
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            cash: nextLoanCenter.finance.cash,
            monthlyIncome: nextLoanCenter.finance.monthlyIncome,
            monthlyExpense: nextLoanCenter.finance.monthlyExpense,
            valuation: nextLoanCenter.finance.valuation,
            totalDebt: nextLoanCenter.finance.totalDebt,
            creditRating: nextLoanCenter.finance.creditRating,
            reputation: nextLoanCenter.finance.brandReputation,
            employeeSatisfaction: nextLoanCenter.finance.employeeSatisfaction,
            customerSatisfaction: nextLoanCenter.finance.customerSatisfaction,
            financeMonth: nextLoanCenter.finance.financeMonth,
            operatingDay: nextLoanCenter.finance.operatingDay,
            riskStatus: nextLoanCenter.finance.riskStatus,
            debtWarning: nextLoanCenter.finance.debtRatioBasisPoints >= 6000 ? "高" : nextLoanCenter.finance.totalDebt > 0 ? "中" : "低"
          }
    );
  };

  const applyFundingCenter = (nextFundingCenter: FundingCenter): void => {
    setFundingCenter(nextFundingCenter);
    setSelectedFundingOfferId((currentId) => nextFundingCenter.offers.find((item) => item.id === currentId)?.id ?? nextFundingCenter.offers[0]?.id ?? "");
    const pending = nextFundingCenter.fundings.filter((item) => item.status === "pending");
    setSelectedFundingId((currentId) => pending.find((item) => item.id === currentId)?.id ?? pending[0]?.id ?? "");
    setCompanyFinance(nextFundingCenter.finance);
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            cash: nextFundingCenter.finance.cash,
            monthlyIncome: nextFundingCenter.finance.monthlyIncome,
            monthlyExpense: nextFundingCenter.finance.monthlyExpense,
            valuation: nextFundingCenter.finance.valuation,
            founderEquityBasisPoints: nextFundingCenter.finance.founderEquityBasisPoints,
            totalDebt: nextFundingCenter.finance.totalDebt,
            creditRating: nextFundingCenter.finance.creditRating,
            reputation: nextFundingCenter.finance.brandReputation,
            employeeSatisfaction: nextFundingCenter.finance.employeeSatisfaction,
            customerSatisfaction: nextFundingCenter.finance.customerSatisfaction,
            financeMonth: nextFundingCenter.finance.financeMonth,
            operatingDay: nextFundingCenter.finance.operatingDay,
            riskStatus: nextFundingCenter.finance.riskStatus,
            debtWarning: nextFundingCenter.finance.debtRatioBasisPoints >= 6000 ? "高" : nextFundingCenter.finance.totalDebt > 0 ? "中" : "低"
          }
    );
  };

  const applyProductCenter = (nextProductCenter: ProductCenter): void => {
    setProductCenter(nextProductCenter);
    setSelectedProductOfferId((currentId) => nextProductCenter.offers.find((item) => item.id === currentId)?.id ?? nextProductCenter.offers[0]?.id ?? "");
    const active = nextProductCenter.products.filter((item) => item.status !== "closed");
    setSelectedProductId((currentId) => active.find((item) => item.id === currentId)?.id ?? active[0]?.id ?? "");
    setCompanyFinance(nextProductCenter.finance);
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            cash: nextProductCenter.finance.cash,
            monthlyIncome: nextProductCenter.finance.monthlyIncome,
            monthlyExpense: nextProductCenter.finance.monthlyExpense,
            valuation: nextProductCenter.finance.valuation,
            totalDebt: nextProductCenter.finance.totalDebt,
            creditRating: nextProductCenter.finance.creditRating,
            reputation: nextProductCenter.finance.brandReputation,
            customerSatisfaction: nextProductCenter.finance.customerSatisfaction,
            financeMonth: nextProductCenter.finance.financeMonth,
            operatingDay: nextProductCenter.finance.operatingDay,
            riskStatus: nextProductCenter.finance.riskStatus,
            debtWarning: nextProductCenter.finance.debtRatioBasisPoints >= 6000 ? "高" : nextProductCenter.finance.totalDebt > 0 ? "中" : "低"
          }
    );
  };

  const applyMarketCenter = (nextMarketCenter: MarketCenter): void => {
    setMarketCenter(nextMarketCenter);
    setSelectedMarketOfferId((currentId) => nextMarketCenter.offers.find((item) => item.id === currentId)?.id ?? nextMarketCenter.offers[0]?.id ?? "");
    setSelectedMarketId((currentId) => nextMarketCenter.markets.find((item) => item.id === currentId)?.id ?? nextMarketCenter.markets[0]?.id ?? "");
    const pending = nextMarketCenter.actions.filter((item) => item.status === "pending");
    setSelectedCompetitorActionId((currentId) => pending.find((item) => item.id === currentId)?.id ?? pending[0]?.id ?? "");
    setCompanyFinance(nextMarketCenter.finance);
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            cash: nextMarketCenter.finance.cash,
            monthlyIncome: nextMarketCenter.finance.monthlyIncome,
            monthlyExpense: nextMarketCenter.finance.monthlyExpense,
            valuation: nextMarketCenter.finance.valuation,
            totalDebt: nextMarketCenter.finance.totalDebt,
            creditRating: nextMarketCenter.finance.creditRating,
            reputation: nextMarketCenter.finance.brandReputation,
            employeeSatisfaction: nextMarketCenter.finance.employeeSatisfaction,
            customerSatisfaction: nextMarketCenter.finance.customerSatisfaction,
            financeMonth: nextMarketCenter.finance.financeMonth,
            operatingDay: nextMarketCenter.finance.operatingDay,
            riskStatus: nextMarketCenter.finance.riskStatus,
            debtWarning: nextMarketCenter.finance.debtRatioBasisPoints >= 6000 ? "高" : nextMarketCenter.finance.totalDebt > 0 ? "中" : "低"
          }
    );
  };

  const applyShopCenter = (nextShopCenter: ShopCenter): void => {
    setShopCenter(nextShopCenter);
    setSelectedShopProductId((currentId) => nextShopCenter.products.find((item) => item.id === currentId)?.id ?? "");
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            platformCoins: nextShopCenter.wallet.balance
          }
    );
  };

  const resolveVipLevelWindowStart = (targetLevel: number | null | undefined, levels: VipLevel[]): number | null => {
    if (levels.length === 0) {
      return null;
    }
    const targetIndex = Math.max(0, levels.findIndex((level) => level.level === targetLevel));
    const windowStartIndex = Math.floor(targetIndex / VIP_LEVEL_WINDOW_SIZE) * VIP_LEVEL_WINDOW_SIZE;
    return levels[windowStartIndex]?.level ?? levels[0]?.level ?? null;
  };

  const applyVipCenter = (nextVipCenter: VipCenter): void => {
    setVipCenter(nextVipCenter);
    setSelectedProfileVipLevel((currentLevel) => {
      const visibleLevels = nextVipCenter.levels.filter((level) => level.level > 0);
      if (visibleLevels.some((level) => level.level === currentLevel)) {
        return currentLevel;
      }
      return nextVipCenter.currentLevel.level > 0 ? nextVipCenter.currentLevel.level : visibleLevels[0]?.level ?? null;
    });
    setProfileVipLevelWindowStart((currentStart) => {
      const visibleLevels = nextVipCenter.levels.filter((level) => level.level > 0);
      if (visibleLevels.some((level) => level.level === currentStart)) {
        return currentStart;
      }
      return resolveVipLevelWindowStart(nextVipCenter.currentLevel.level, visibleLevels);
    });
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            platformCoins: nextVipCenter.wallet.balance,
            actionPowerLimit: Math.max(currentProfile.actionPowerLimit, nextVipCenter.benefits.actionPowerLimit)
          }
    );
  };

  const loadLoanCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<LoanCenter>(
      `/finance/loans?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      applyLoanCenter(response.data);
      setLoanError("");
      return;
    }

    setLoanError(response.error.message);
  };

  const loadFundingCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<FundingCenter>(
      `/finance/fundings?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      applyFundingCenter(response.data);
      setFundingError("");
      return;
    }

    setFundingError(response.error.message);
  };

  const syncFundingCenter = async (): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    setIsFundingSyncing(true);
    await loadFundingCenter(account.token, selectedServer.id);
    window.setTimeout(() => setIsFundingSyncing(false), 800);
  };

  const loadProductCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<ProductCenter>(
      `/products?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      applyProductCenter(response.data);
      setProductError("");
      return;
    }

    setProductError(response.error.message);
  };

  const loadMarketCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<MarketCenter>(
      `/markets?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      applyMarketCenter(response.data);
      setMarketError("");
      return;
    }

    setMarketError(response.error.message);
  };

  const loadShopCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<ShopCenter>(
      `/shop?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      applyShopCenter(response.data);
      setShopError("");
      return;
    }

    setShopError(response.error.message);
  };

  const loadInventoryCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<InventoryCenter>(
      `/inventory?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setInventoryCenter(response.data);
      setInventoryError("");
      return;
    }

    setInventoryError(response.error.message);
  };

  const useInventoryItem = async (itemId: string): Promise<void> => {
    if (!account || !selectedServer) {
      setInventoryError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<InventoryUseResult>(
      "/inventory/use",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, itemId })
      },
      account.token
    );

    if (response.success) {
      setProfile(response.data.profile);
      setInventoryCenter(response.data.inventory);
      setInventoryError(response.data.result);
      return;
    }

    setInventoryError(response.error.message);
  };

  const loadVipCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<VipCenter>(
      `/vip?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      applyVipCenter(response.data);
      setVipError("");
      return;
    }

    setVipError(response.error.message);
  };

  const loadSeasonCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<SeasonCenter>(
      `/season?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setSeasonCenter(response.data);
      setSeasonError("");
      return;
    }

    setSeasonError(response.error.message);
  };

  const runSeasonAction = async <T,>(
    path: string,
    body: Record<string, unknown>,
    onSuccess: (data: T) => void,
    notice: string
  ): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<T>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, ...body })
      },
      account.token
    );

    if (response.success) {
      onSuccess(response.data);
      await loadSeasonCenter(account.token, selectedServer.id);
      await loadInventoryCenter(account.token, selectedServer.id);
      setSeasonNotice(notice);
      setSeasonError("");
      return;
    }

    setSeasonError(response.error.message);
  };

  const progressSeasonTask = async (taskId: string): Promise<void> => {
    await runSeasonAction<SeasonTaskProgressResult>(
      `/season/tasks/${encodeURIComponent(taskId)}/progress`,
      {},
      (data) => {
        setSeasonCenter((current) => current === null ? current : {
          ...current,
          season: data.season,
          tasks: current.tasks.map((task) => task.id === data.task.id ? data.task : task)
        });
      },
      "赛季任务进度已更新。"
    );
  };

  const purchaseSeasonPass = async (): Promise<void> => {
    if (!seasonCenter) {
      return;
    }

    reportCurrentTelemetry("paid_product_entry_click", "season_pass");
    await runSeasonAction<SeasonPassPurchaseResult>(
      "/season/pass/purchase",
      { seasonId: seasonCenter.season.id, requestId: `season-pass-${Date.now()}` },
      (data) => {
        setSeasonCenter((current) => current === null ? current : { ...current, season: data.season, wallet: data.wallet });
      },
      "赛季通行证已开通，VIP 经验同步增加。"
    );
  };

  const joinSeasonActivity = async (activityId: string): Promise<void> => {
    await runSeasonAction<SeasonActivityActionResult>(
      `/activities/${encodeURIComponent(activityId)}/join`,
      {},
      (data) => {
        setSeasonCenter((current) => current === null ? current : {
          ...current,
          season: data.season,
          activities: current.activities.map((activity) => activity.id === data.activity.id ? data.activity : activity)
        });
      },
      "活动报名成功。"
    );
  };

  const progressSeasonActivity = async (activityId: string): Promise<void> => {
    await runSeasonAction<SeasonActivityActionResult>(
      `/activities/${encodeURIComponent(activityId)}/progress`,
      {},
      (data) => {
        setProfile(data.profile);
        setSeasonCenter((current) => current === null ? current : {
          ...current,
          season: data.season,
          activities: current.activities.map((activity) => activity.id === data.activity.id ? data.activity : activity)
        });
      },
      "活动积分已推进。"
    );
  };

  const claimSeasonActivity = async (activityId: string): Promise<void> => {
    await runSeasonAction<SeasonActivityActionResult>(
      `/activities/${encodeURIComponent(activityId)}/claim`,
      {},
      (data) => {
        setProfile(data.profile);
        setSeasonCenter((current) => current === null ? current : {
          ...current,
          season: data.season,
          activities: current.activities.map((activity) => activity.id === data.activity.id ? data.activity : activity)
        });
      },
      "活动奖励已领取。"
    );
  };

  const purchaseActivityShopItem = async (itemId: string): Promise<void> => {
    reportCurrentTelemetry("paid_product_entry_click", "activity_shop", { itemId });
    await runSeasonAction<ActivityShopPurchaseResult>(
      "/activity-shop/purchase",
      { itemId, requestId: `activity-shop-${Date.now()}` },
      (data) => {
        setProfile(data.profile);
        setSeasonCenter((current) => current === null ? current : { ...current, season: data.season, wallet: data.wallet });
      },
      "活动商店道具已兑换。"
    );
  };

  const startSeasonScenario = async (scenarioId: string): Promise<void> => {
    await runSeasonAction<ScenarioRunResult>(
      `/scenarios/${encodeURIComponent(scenarioId)}/start`,
      {},
      (data) => setScenarioRun(data.run),
      "经营剧本已启动。"
    );
  };

  const settleSeasonScenario = async (): Promise<void> => {
    if (!scenarioRun || !account || !selectedServer) {
      return;
    }

    await runSeasonAction<ScenarioRunResult>(
      `/scenarios/${encodeURIComponent(scenarioRun.id)}/settle`,
      { choices: ["cost_cut", "debt_restructure", "compliance_fix"] },
      (data) => {
        setScenarioRun(data.run);
        void loadSeasonCenter(account.token, selectedServer.id);
      },
      "经营剧本已结算并发放奖励。"
    );
  };

  const loadPhase14Center = async (token: string, nextServerId: string): Promise<void> => {
    const [leaderboards, crossServer, titles, achievementList, knowledge, guild, longTermGoalResponse, guildHistoryResponse, crossGuildHistoryResponse] = await Promise.all([
      apiRequest<LeaderboardCenter>(`/leaderboards?serverId=${encodeURIComponent(nextServerId)}`, {}, token),
      apiRequest<CrossServerCenter>(`/cross-server?serverId=${encodeURIComponent(nextServerId)}`, {}, token),
      apiRequest<TitleCenter>(`/titles?serverId=${encodeURIComponent(nextServerId)}`, {}, token),
      apiRequest<AchievementItem[]>(`/achievements?serverId=${encodeURIComponent(nextServerId)}`, {}, token),
      apiRequest<KnowledgeEntry[]>(`/knowledge?serverId=${encodeURIComponent(nextServerId)}`, {}, token),
      apiRequest<GuildCenter>(`/guild?serverId=${encodeURIComponent(nextServerId)}`, {}, token),
      apiRequest<LongTermGoals>(`/long-term-goals?serverId=${encodeURIComponent(nextServerId)}`, {}, token),
      apiRequest<GuildHistory>(`/guild/history?serverId=${encodeURIComponent(nextServerId)}`, {}, token),
      apiRequest<CrossServerGuildHistory>(`/cross-server/guild/history?serverId=${encodeURIComponent(nextServerId)}`, {}, token)
    ]);

    if (leaderboards.success) {
      setLeaderboardCenter(leaderboards.data);
    }
    if (crossServer.success) {
      setCrossServerCenter(crossServer.data);
    }
    if (titles.success) {
      setTitleCenter(titles.data);
    }
    if (achievementList.success) {
      setAchievements(achievementList.data);
    }
    if (knowledge.success) {
      setKnowledgeEntries(knowledge.data);
      setSelectedKnowledgeEntryId((currentId) => currentId || knowledge.data.find((entry) => entry.isUnlocked)?.id || knowledge.data[0]?.id || "");
      if (knowledge.data.length > 0) {
        reportTelemetry(token, nextServerId, "knowledge_view", "knowledge-center", { count: knowledge.data.length });
      }
    }
    if (guild.success) {
      setGuildCenter(guild.data);
    }
    if (longTermGoalResponse.success) {
      setLongTermGoals(longTermGoalResponse.data);
    }
    setGuildHistory(guildHistoryResponse.success ? guildHistoryResponse.data : null);
    setCrossServerGuildHistory(crossGuildHistoryResponse.success ? crossGuildHistoryResponse.data : null);

    const firstError = [leaderboards, crossServer, titles, achievementList, knowledge, guild, longTermGoalResponse].find((response) => !response.success);
    setPhase14Error(firstError && !firstError.success ? firstError.error.message : "");
  };

  const registerCrossServer = async (): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<CrossServerCenter>(
      "/cross-server/register",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setCrossServerCenter(response.data);
      setPhase14Notice(`${response.data.group.name} 报名成功。`);
      setPhase14Error("");
      return;
    }

    setPhase14Error(response.error.message);
  };

  const claimCrossServerDailyReward = async (): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<CrossServerDailyRewardResult>(
      "/cross-server/daily-reward/claim",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setCrossServerCenter(response.data.crossServer);
      setProfile((current) => current === null ? current : { ...current, reputation: current.reputation + response.data.rewardReputation });
      await syncMailCenterAfterReward(response.data.deliveredRewards);
      setPhase14Notice(response.data.deliveredRewards > 0 ? `今日跨服奖励已领取：声望 +${response.data.rewardReputation}` : "今日跨服奖励已领取。");
      setPhase14Error("");
      return;
    }

    setPhase14Error(response.error.message);
  };

  const claimCrossServerStageReward = async (stageId: string): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<CrossServerStageRewardResult>(
      "/cross-server/stage-reward/claim",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, stageId })
      },
      account.token
    );

    if (response.success) {
      setCrossServerCenter(response.data.crossServer);
      setProfile((current) => current === null ? current : { ...current, reputation: current.reputation + response.data.rewardReputation });
      await syncMailCenterAfterReward(response.data.deliveredRewards);
      setPhase14Notice(response.data.deliveredRewards > 0 ? `跨服阶段奖励已领取：声望 +${response.data.rewardReputation}` : "跨服阶段奖励已领取。");
      setPhase14Error("");
      return;
    }

    setPhase14Error(response.error.message);
  };

  const settleCrossServer = async (): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<LeaderboardSettlement>(
      "/cross-server/settle",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setPhase14Notice(response.data.deliveredRewards > 0 ? `赛果回放已生成，跨服奖励已结算 ${response.data.deliveredRewards} 份。` : "赛果回放已生成，本日没有重复发放。");
      setPhase14Error("");
      setActiveCrossServerMode("history");
      await loadPhase14Center(account.token, selectedServer.id);
      if (response.data.battleReport) {
        setCrossServerCenter((current) => current === null ? current : { ...current, battleReport: response.data.battleReport! });
      }
      return;
    }

    setPhase14Error(response.error.message);
  };

  const registerCrossServerGuild = async (): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<CrossServerCenter>(
      "/cross-server/guild/register",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setCrossServerCenter(response.data);
      setPhase14Notice(`${response.data.guildSeason.guildName ?? "商会"} 已报名跨服商会赛季。`);
      setPhase14Error("");
      await loadPhase14Center(account.token, selectedServer.id);
      return;
    }

    setPhase14Error(response.error.message);
  };

  const claimAchievement = async (achievementId: string): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<AchievementClaimResult>(
      `/achievements/${encodeURIComponent(achievementId)}/claim`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setProfile(response.data.profile);
      setTitleCenter(response.data.titleCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      await loadPhase14Center(account.token, selectedServer.id);
      return;
    }

    setPhase14Error(response.error.message);
  };

  const equipTitle = async (titleId: string): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<TitleCenter>(
      "/titles/equip",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, titleId })
      },
      account.token
    );

    if (response.success) {
      setTitleCenter(response.data);
      setPhase14Notice("称号已装备。");
      setPhase14Error("");
      return;
    }

    setPhase14Error(response.error.message);
  };

  const joinGuild = async (): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<GuildActionResult>(
      "/guild/join",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, guildName: `${selectedServer.name}创业会` })
      },
      account.token
    );

    if (response.success) {
      setGuildCenter(response.data.guildCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      await loadPhase14Center(account.token, selectedServer.id);
      return;
    }

    setPhase14Error(response.error.message);
  };

  const requestGuildHelp = async (): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<GuildActionResult>(
      "/guild/help",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, requestType: "project-advice" })
      },
      account.token
    );

    if (response.success) {
      setGuildCenter(response.data.guildCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      await loadPhase14Center(account.token, selectedServer.id);
      return;
    }

    setPhase14Error(response.error.message);
  };

  const claimGuildTask = async (taskId: string): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<GuildActionResult>(
      `/guild/tasks/${encodeURIComponent(taskId)}/claim`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setGuildCenter(response.data.guildCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      await loadPhase14Center(account.token, selectedServer.id);
      return;
    }

    setPhase14Error(response.error.message);
  };

  const upgradeGuildTech = async (techId: string): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<GuildActionResult>(
      `/guild/techs/${encodeURIComponent(techId)}/upgrade`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setGuildCenter(response.data.guildCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      await loadPhase14Center(account.token, selectedServer.id);
      return;
    }

    setPhase14Error(response.error.message);
  };

  const fulfillGuildHelp = async (requestId: string): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<GuildActionResult>(
      `/guild/help/${encodeURIComponent(requestId)}/fulfill`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setGuildCenter(response.data.guildCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      await loadPhase14Center(account.token, selectedServer.id);
      return;
    }

    setPhase14Error(response.error.message);
  };

  const settleGuildLeaderboard = async (): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<GuildLeaderboardSettlement>(
      "/guild/leaderboard/settle",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setGuildCenter(response.data.guildCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      await loadPhase14Center(account.token, selectedServer.id);
      return;
    }

    setPhase14Error(response.error.message);
  };

  const claimGuildProjectReward = async (projectId: string): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<GuildActionResult>(
      `/guild/projects/${encodeURIComponent(projectId)}/claim`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setGuildCenter(response.data.guildCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      const profileResponse = await apiRequest<PlayerProfile>(
        `/players?serverId=${encodeURIComponent(selectedServer.id)}`,
        {},
        account.token
      );
      if (profileResponse.success) {
        setProfile(profileResponse.data);
      }
      return;
    }

    setPhase14Error(response.error.message);
  };

  const updateGuildSettings = async (): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<GuildActionResult>(
      "/guild/settings",
      {
        method: "POST",
        body: JSON.stringify({
          serverId: selectedServer.id,
          announcement: guildAnnouncementDraft.trim(),
          collaborationRules: guildRulesDraft.trim()
        })
      },
      account.token
    );

    if (response.success) {
      setGuildCenter(response.data.guildCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      return;
    }

    setPhase14Error(response.error.message);
  };

  const reviewGuildApplication = async (requestId: string, decision: "approved" | "rejected"): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<GuildActionResult>(
      `/guild/applications/${encodeURIComponent(requestId)}/review`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, decision })
      },
      account.token
    );

    if (response.success) {
      setGuildCenter(response.data.guildCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      return;
    }

    setPhase14Error(response.error.message);
  };

  const updateGuildMemberRole = async (profileId: string, role: "member" | "vice_leader"): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<GuildActionResult>(
      `/guild/members/${encodeURIComponent(profileId)}/role`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, role })
      },
      account.token
    );

    if (response.success) {
      setGuildCenter(response.data.guildCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      return;
    }

    setPhase14Error(response.error.message);
  };

  const removeGuildMember = async (profileId: string): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<GuildActionResult>(
      `/guild/members/${encodeURIComponent(profileId)}`,
      {
        method: "DELETE",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setGuildCenter(response.data.guildCenter);
      setPhase14Notice(response.data.result);
      setPhase14Error("");
      return;
    }

    setPhase14Error(response.error.message);
  };

  const loadEmployees = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<Employee[]>(
      `/employees?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setEmployees(response.data);
      setSelectedEmployeeId((currentId) => response.data.find((employee) => employee.id === currentId)?.id ?? response.data[0]?.id ?? "");
      setEmployeeError("");
      return;
    }

    setEmployeeError(response.error.message);
  };

  const loadProjects = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<BusinessProject[]>(
      `/projects?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setProjects(response.data);
      setSelectedProjectId((currentId) => response.data.find((project) => project.id === currentId)?.id ?? response.data[0]?.id ?? "");
      setProjectError("");
      return;
    }

    setProjectError(response.error.message);
  };

  const enterGame = (
    nextAccount: AccountSession,
    nextServer: ServerOption,
    nextAvatar: AvatarOption,
    nextProfile: PlayerProfile
  ): void => {
    const stored: StoredSession = {
      version: SESSION_VERSION,
      account: nextAccount,
      server: nextServer,
      avatar: nextAvatar,
      profile: nextProfile
    };

    saveSession(stored);
    setAccount(nextAccount);
    setServerId(nextServer.id);
    setAvatarId(nextAvatar.id);
    setFounderName(nextProfile.founderName);
    setCompanyName(nextProfile.companyName);
    setProfile(nextProfile);
    setStep("game");
    void loadChatCenter(nextAccount.token, nextServer.id);
  };

  useEffect(() => {
    if (initialSession === null) {
      return;
    }

    let isMounted = true;

    const restoreSession = async (): Promise<void> => {
      try {
        const [sessionResponse, serverResponse, avatarResponse, profileResponse] = await Promise.all([
          apiRequest<{ accountId: string; username: string }>("/auth/session", {}, initialSession.account.token),
          apiRequest<ServerOption[]>("/servers", {}, initialSession.account.token),
          apiRequest<AvatarOption[]>("/avatars", {}, initialSession.account.token),
          apiRequest<PlayerProfile>(
            `/players?serverId=${encodeURIComponent(initialSession.server.id)}`,
            {},
            initialSession.account.token
          )
        ]);

        if (!isMounted) {
          return;
        }

        if (!sessionResponse.success || !serverResponse.success || !avatarResponse.success || !profileResponse.success) {
          clearSession();
          setStep("auth");
          setError("登录状态已过期，请重新登录。");
          return;
        }

        setServers(serverResponse.data);
        setAvatars(avatarResponse.data);
        enterGame(
          initialSession.account,
          serverResponse.data.find((server) => server.id === profileResponse.data.serverId) ?? initialSession.server,
          avatarResponse.data.find((avatar) => avatar.id === profileResponse.data.avatarId) ?? initialSession.avatar,
          profileResponse.data
        );
      } catch {
        if (isMounted) {
          clearSession();
          setAccount(null);
          setProfile(null);
          setStep("auth");
          setError("无法恢复登录状态，请确认 API 服务和数据库已启动。");
        }
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (step !== "game" || !account || !selectedServer) {
      return;
    }

    void loadTasks(account.token, selectedServer.id);
    void loadCompanyGrowth(account.token, selectedServer.id);
    void loadRandomTasks(account.token, selectedServer.id);
    void loadEvents(account.token, selectedServer.id);
    void loadCompanyFinance(account.token, selectedServer.id);
    void loadLoanCenter(account.token, selectedServer.id);
    void loadFundingCenter(account.token, selectedServer.id);
    void loadProductCenter(account.token, selectedServer.id);
    void loadMarketCenter(account.token, selectedServer.id);
    void loadShopCenter(account.token, selectedServer.id);
    void loadInventoryCenter(account.token, selectedServer.id);
    void loadVipCenter(account.token, selectedServer.id);
    void loadPhase14Center(account.token, selectedServer.id);
    void loadEmployees(account.token, selectedServer.id);
    void loadProjects(account.token, selectedServer.id);
    reportTelemetry(account.token, selectedServer.id, "tutorial_step", "home-entered", { step: "home_entered" });
  }, [step, account?.token, selectedServer?.id, reportTelemetry]);

  useEffect(() => {
    if (!loanNotice && !loanError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLoanNotice("");
      setLoanError("");
    }, loanError ? 3200 : 2200);

    return () => window.clearTimeout(timer);
  }, [loanNotice, loanError]);

  useEffect(() => {
    if (!fundingNotice && !fundingError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFundingNotice("");
      setFundingError("");
    }, fundingError ? 3200 : 2200);

    return () => window.clearTimeout(timer);
  }, [fundingNotice, fundingError]);

  useEffect(() => {
    if (!productNotice && !productError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setProductNotice("");
      setProductError("");
    }, productError ? 3200 : 2200);

    return () => window.clearTimeout(timer);
  }, [productNotice, productError]);

  useEffect(() => {
    if (!marketNotice && !marketError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMarketNotice("");
      setMarketError("");
    }, marketError ? 3200 : 2200);

    return () => window.clearTimeout(timer);
  }, [marketNotice, marketError]);

  useEffect(() => {
    if (!shopNotice && !shopError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShopNotice("");
      setShopError("");
    }, shopError ? 3200 : 2200);

    return () => window.clearTimeout(timer);
  }, [shopNotice, shopError]);

  useEffect(() => {
    setGuildAnnouncementDraft(guildCenter?.guild?.announcement ?? "");
    setGuildRulesDraft(guildCenter?.guild?.collaborationRules ?? "");
  }, [guildCenter?.guild?.id, guildCenter?.guild?.announcement, guildCenter?.guild?.collaborationRules]);

  useEffect(() => {
    if (step !== "game" || !profile) {
      setRandomTaskModalId("");
      setSnoozedRandomTaskIds([]);
      return;
    }

    setRandomTaskGameEnteredAt(Date.now());
    setSnoozedRandomTaskIds([]);
  }, [step, profile?.id, selectedServer?.id]);

  useEffect(() => {
    const isHomeIdle =
      step === "game" &&
      activeNav === "公司" &&
      activePanel === null &&
      nativeHomePage === null &&
      activeKnowledgeTask === null &&
      randomTaskModalId === "";
    const nextTask = pendingRandomTasks.find((task) => !snoozedRandomTaskIds.includes(task.id));

    if (!isHomeIdle || !nextTask) {
      return;
    }

    const elapsed = Date.now() - randomTaskGameEnteredAt;
    const delay = elapsed < 120_000 ? 120_000 - elapsed : 180_000 + Math.floor(Math.random() * 300_000);
    const timer = window.setTimeout(() => {
      setSelectedRandomTaskId(nextTask.id);
      setRandomTaskModalId(nextTask.id);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    activeKnowledgeTask,
    activeNav,
    activePanel,
    nativeHomePage,
    pendingRandomTasks,
    randomTaskGameEnteredAt,
    randomTaskModalId,
    snoozedRandomTaskIds,
    step
  ]);

  const runAuth = async (mode: AuthMode): Promise<void> => {
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || password.length < 6) {
      setError("账号至少 3 个字符，密码至少 6 个字符。");
      return;
    }

    setIsBusy(true);
    setError("");
    setAuthMode(mode);

    try {
      let auth = await apiRequest<AccountSession>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: trimmedUsername, password })
      });

      if (!auth.success && mode === "login" && auth.error.code === "INVALID_CREDENTIALS") {
        auth = await apiRequest<AccountSession>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ username: trimmedUsername, password })
        });
      }

      if (!auth.success) {
        setError(auth.error.code === "ACCOUNT_EXISTS" ? "账号已存在，请确认密码后重试。" : auth.error.message);
        return;
      }

      const [serverResponse, avatarResponse] = await Promise.all([
        apiRequest<ServerOption[]>("/servers", {}, auth.data.token),
        apiRequest<AvatarOption[]>("/avatars", {}, auth.data.token)
      ]);

      if (!serverResponse.success) {
        setError(serverResponse.error.message);
        return;
      }

      if (!avatarResponse.success) {
        setError(avatarResponse.error.message);
        return;
      }

      const preferredServer = serverResponse.data.find((server) => server.id === serverId);
      const recommendedServer =
        preferredServer ?? serverResponse.data.find((server) => server.isRecommended) ?? serverResponse.data[0];
      const firstAvatar = avatarResponse.data[0];

      if (recommendedServer === undefined || firstAvatar === undefined) {
        setError("服务器或头像配置为空，暂时无法进入游戏。");
        return;
      }

      clearSession();
      if (rememberPassword) {
        saveRememberedAuth(trimmedUsername, password);
      } else {
        clearRememberedAuth();
      }
      setAccount(auth.data);
      setUsername(trimmedUsername);
      setFounderName("");
      setCompanyName("");
      setServers(serverResponse.data);
      setAvatars(avatarResponse.data);
      setServerId(recommendedServer.id);
      setAvatarId(firstAvatar.id);

      const existing = await apiRequest<PlayerProfile>(
        `/players?serverId=${encodeURIComponent(recommendedServer.id)}`,
        {},
        auth.data.token
      );

      if (existing.success) {
        const avatar = avatarResponse.data.find((item) => item.id === existing.data.avatarId) ?? firstAvatar;
        enterGame(auth.data, recommendedServer, avatar, existing.data);
        return;
      }

      if (existing.error.code !== "PLAYER_NOT_FOUND") {
        setError(existing.error.message);
        return;
      }

      setStep("profile");
    } catch {
      setError("暂时无法连接游戏服务器。");
    } finally {
      setIsBusy(false);
    }
  };

  const submitAuth = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void runAuth("login");
  };

  const continueFromServer = async (): Promise<void> => {
    if (!account || !selectedServer) {
      setError("账号或服务器状态缺失，请重新登录。");
      return;
    }

    setIsBusy(true);
    setError("");

    try {
      const existing = await apiRequest<PlayerProfile>(
        `/players?serverId=${encodeURIComponent(selectedServer.id)}`,
        {},
        account.token
      );

      if (existing.success) {
        const avatar = avatars.find((item) => item.id === existing.data.avatarId) ?? avatars[0];
        if (avatar === undefined) {
          setError("头像配置为空，暂时无法进入游戏。");
          return;
        }

        enterGame(account, selectedServer, avatar, existing.data);
        return;
      }

      if (existing.error.code !== "PLAYER_NOT_FOUND") {
        setError(existing.error.message);
        return;
      }

      setStep("avatar");
    } catch {
      setError("无法读取角色档案，请稍后重试。");
    } finally {
      setIsBusy(false);
    }
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedFounder = founderName.trim();
    const trimmedCompany = companyName.trim();

    if (!account || !selectedServer || !selectedAvatar) {
      setError("账号、服务器或头像状态缺失，请重新登录。");
      return;
    }

    if (trimmedFounder.length < 2 || trimmedCompany.length < 2) {
      setError("创始人和公司名都需要至少 2 个字符。");
      return;
    }

    setIsBusy(true);
    setError("");

    try {
      const created = await apiRequest<PlayerProfile>(
        "/players",
        {
          method: "POST",
          body: JSON.stringify({
            serverId: selectedServer.id,
            avatarId: selectedAvatar.id,
            founderName: trimmedFounder,
            companyName: trimmedCompany
          })
        },
        account.token
      );

      if (!created.success) {
        setError(created.error.message);
        return;
      }

      reportTelemetry(account.token, selectedServer.id, "tutorial_step", "profile-created", { step: "profile_created" });
      enterGame(account, selectedServer, selectedAvatar, created.data);
    } catch {
      setError("创建角色失败，请稍后重试。");
    } finally {
      setIsBusy(false);
    }
  };

  const leaveGame = (): void => {
    clearSession();
    setProfile(null);
    setAccount(null);
    if (!rememberPassword) {
      setUsername("");
      setPassword("");
    }
    setFounderName("");
    setCompanyName("");
    setStep("auth");
  };

  const loadChatCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<ChatCenter>(`/chat?serverId=${encodeURIComponent(nextServerId)}`, {}, token);
    if (response.success) {
      setChatCenter(response.data);
      setChatError("");
      return;
    }
    setChatError(response.error.message);
  };

  const loadMailCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<MailCenter>(`/mails?serverId=${encodeURIComponent(nextServerId)}`, {}, token);
    if (response.success) {
      setMailCenter(response.data);
      setSelectedMailId(response.data.mails[0]?.id ?? "");
      setMailError("");
      return;
    }
    setMailError(response.error.message);
  };

  const syncMailCenterAfterReward = async (deliveredRewards: number): Promise<void> => {
    if (!account || !selectedServer || deliveredRewards <= 0) {
      return;
    }
    setProfile((current) => current === null ? current : { ...current, unreadMailCount: current.unreadMailCount + deliveredRewards });
    if (mailCenter !== null || nativeHomePage === "mail") {
      await loadMailCenter(account.token, selectedServer.id);
    }
  };

  const getMailStatusLabel = (mail: MailRecord): string => mail.statusLabel || (mail.claimStatus === "claimable" ? "待领取" : mail.claimStatus === "claimed" ? "已领取" : mail.rewardSummary ? "已入账" : "已读");

  const markAllMailsRead = async (): Promise<void> => {
    if (!account || !selectedServer) {
      setMailError("账号或区服状态缺失，请重新登录。");
      return;
    }
    const response = await apiRequest<{ updatedCount: number; mailCenter: MailCenter }>(
      "/mails/read-all",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );
    if (response.success) {
      setMailCenter(response.data.mailCenter);
      setProfile((current) => current === null ? current : { ...current, unreadMailCount: 0 });
      setMailNotice(response.data.updatedCount > 0 ? `已标记 ${response.data.updatedCount} 封邮件为已读。` : "当前没有未读邮件。");
      setMailError("");
      return;
    }
    setMailNotice("");
    setMailError(response.error.message || "全部已读失败");
  };

  const claimMailAttachments = async (): Promise<void> => {
    if (!account || !selectedServer) {
      setMailError("账号或区服状态缺失，请重新登录。");
      return;
    }
    const response = await apiRequest<MailClaimAttachmentsResult>(
      "/mails/claim-attachments",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );
    if (response.success) {
      setMailCenter(response.data.mailCenter);
      setProfile(response.data.profile);
      setMailNotice(response.data.claimedCount > 0 ? `已领取附件：平台币 +${response.data.platformCoins}` : "当前没有可领取附件。");
      setMailError("");
      return;
    }
    setMailNotice("");
    setMailError(response.error.message || "领取附件失败");
  };

  const sendChatMessage = async (): Promise<void> => {
    if (!account || !selectedServer) {
      setChatError("账号或区服状态缺失，请重新登录。");
      return;
    }
    const content = chatDraft.trim();
    if (content === "") {
      setChatError("请输入聊天内容。");
      return;
    }
    const response = await apiRequest<{ message: ChatMessage; chat: ChatCenter }>(
      "/chat/messages",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, channel: activeChatChannel, content })
      },
      account.token
    );
    if (response.success) {
      setChatCenter(response.data.chat);
      setChatDraft("");
      setChatError("");
      setChatNotice(response.data.message.filterAction === "mask" ? "内容已自动处理。" : "已发送。");
      return;
    }
    setChatNotice("");
    setChatError(response.error.code === "CHAT_CONTENT_BLOCKED" ? "内容包含不可发送内容。" : response.error.message || "发送失败");
  };

  const openHomePanel = (panelName: string): void => {
    if (panelName === "邮件") {
      setActivePanel(null);
      setNativeHomePage("mail");
      if (account && selectedServer) {
        void loadMailCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "聊天") {
      setActivePanel(null);
      setNativeHomePage("chat");
      if (account && selectedServer) {
        void loadChatCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "财务") {
      setActivePanel(null);
      setNativeHomePage("finance");
      if (account && selectedServer) {
        void loadCompanyFinance(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "活动" || panelName === "限时活动") {
      reportCurrentTelemetry("commercial_entry_click", "activity");
      setActivePanel(null);
      setActiveActivityView("main");
      setSelectedActivityShopItemId("");
      setNativeHomePage("season");
      if (account && selectedServer) {
        void loadSeasonCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "排行榜" || panelName === "排行") {
      reportCurrentTelemetry("commercial_entry_click", "rank");
      reportCurrentTelemetry("long_term_goal_click", "rank-center");
      setActivePanel(null);
      setActiveLeaderboardScope("server");
      setNativeHomePage("leaderboard");
      if (account && selectedServer) {
        void loadPhase14Center(account.token, selectedServer.id);
        void loadSeasonCenter(account.token, selectedServer.id);
        void loadMailCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "跨服") {
      reportCurrentTelemetry("long_term_goal_click", "cross-server-center");
      setActivePanel(null);
      setNativeHomePage("cross-server");
      if (account && selectedServer) {
        void loadPhase14Center(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "商业" || panelName === "商城" || panelName === "特惠商城") {
      reportCurrentTelemetry("commercial_entry_click", "shop");
      setActivePanel(null);
      setSelectedShopProductId("");
      setNativeHomePage("shop");
      if (account && selectedServer) {
        void loadShopCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "特权" || panelName === "月卡" || panelName === "创业基金") {
      reportCurrentTelemetry("commercial_entry_click", "privilege");
      setActivePanel(null);
      setNativeHomePage("privilege");
      if (account && selectedServer) {
        void loadShopCenter(account.token, selectedServer.id);
        void loadVipCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "通行证" || panelName === "赛季通行证") {
      reportCurrentTelemetry("commercial_entry_click", "pass");
      setActivePanel(null);
      setNativeHomePage("pass");
      if (account && selectedServer) {
        void loadSeasonCenter(account.token, selectedServer.id);
        void loadShopCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "VIP") {
      setActivePanel(null);
      setNativeHomePage("vip");
      if (account && selectedServer) {
        void loadVipCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "个人中心") {
      setActivePanel(null);
      setNativeHomePage("profile");
      if (account && selectedServer) {
        void loadSeasonCenter(account.token, selectedServer.id);
        void loadPhase14Center(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "专属经理") {
      reportCurrentTelemetry("commercial_entry_click", "manager");
      if (account && selectedServer) {
        void loadRandomTasks(account.token, selectedServer.id);
        void loadEvents(account.token, selectedServer.id);
      }
      setManagerTab(pendingRandomTasks.length > 0 ? "random" : "events");
      setNativeHomePage(null);
      setActivePanel(null);
      setActiveNav("事件");
      return;
    }

    if (panelName === "背包") {
      setActivePanel(null);
      setActiveNav("背包");
      setNativeHomePage("bag");
      if (account && selectedServer) {
        void loadInventoryCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "出门谈判") {
      setActivePanel(null);
      setNativeHomePage("negotiation");
      return;
    }

    if (eventEntryNames.has(panelName)) {
      setActivePanel(null);
      setNativeHomePage(null);
      setActiveNav("事件");
      return;
    }

    if (panelName === "商会") {
      setActivePanel(null);
      setNativeHomePage("guild");
      if (account && selectedServer) {
        void loadPhase14Center(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "项目" || panelName === "产品") {
      setActivePanel(null);
      setNativeHomePage(null);
      setBusinessTab(panelName);
      setActiveNav("业务");
      return;
    }

    if (panelName === "贷款" || panelName === "融资" || panelName === "市场") {
      setActivePanel(null);
      setNativeHomePage(null);
      setActiveNav(panelName);
      return;
    }

    setNativeHomePage(null);
    setActivePanel(panelName);
  };

  const openTaskScreen = (): void => {
    setActivePanel(null);
    setNativeHomePage(null);
    setActiveNav("任务");
  };

  const openLongTermGoalAction = (goal: LongTermGoal): void => {
    if (goal.action.href === "#tasks") {
      openTaskScreen();
      return;
    }
    if (goal.action.href === "#finance") {
      openHomePanel("财务");
      return;
    }
    if (goal.action.href === "#season") {
      openHomePanel("活动");
      return;
    }
    if (goal.action.href === "#leaderboard") {
      openHomePanel("排行");
      return;
    }
    if (goal.action.href === "#guild") {
      openHomePanel("商会");
      return;
    }
    if (goal.action.href === "#pass") {
      openHomePanel("通行证");
      return;
    }
    if (goal.action.href === "#cross-server") {
      openHomePanel("跨服");
      return;
    }
    if (goal.action.href === "#titles" || goal.action.href === "#achievements" || goal.action.href === "#company-growth") {
      openHomePanel("个人中心");
      return;
    }
    openHomePanel(goal.action.label);
  };

  const openEventScreen = (): void => {
    setActivePanel(null);
    setNativeHomePage(null);
    setManagerTab("events");
    setActiveNav("事件");
  };

  const openRandomTaskModal = (taskId: string): void => {
    setSelectedRandomTaskId(taskId);
    setRandomTaskModalId(taskId);
    setRandomTaskModifierItemId("");
    setRandomTaskNotice("");
    setRandomTaskError("");
  };

  const snoozeRandomTaskModal = (): void => {
    if (activeRandomTask) {
      setSnoozedRandomTaskIds((currentIds) => currentIds.includes(activeRandomTask.id) ? currentIds : [...currentIds, activeRandomTask.id]);
      setSelectedRandomTaskId(activeRandomTask.id);
      setManagerTab("random");
      setRandomTaskNotice("已转入专属经理待办，本次不消耗行动力。");
      setRandomTaskError("");
    }

    setRandomTaskModalId("");
    setRandomTaskModifierItemId("");
  };

  const closeNativeHomePage = (): void => {
    setNativeHomePage(null);
    setActiveNav("公司");
  };

  const progressTask = async (taskId: string, knowledgeId?: string | null): Promise<void> => {
    if (!account || !selectedServer) {
      setTaskError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<TaskItem>(
      `/tasks/${encodeURIComponent(taskId)}/progress`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, knowledgeId })
      },
      account.token
    );

    if (response.success) {
      replaceTask(response.data);
      setTaskError("");
      await loadCompanyGrowth(account.token, selectedServer.id);
      return;
    }

    setTaskError(response.error.message);
  };

  const claimTask = async (taskId: string): Promise<void> => {
    if (!account || !selectedServer) {
      setTaskError("账号或区服状态缺失，请重新登录。");
      return;
    }

    setClaimingTaskId(taskId);
    const response = await apiRequest<TaskItem>(
      `/tasks/${encodeURIComponent(taskId)}/claim`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      replaceTask(response.data);
      setProfile((currentProfile) =>
        currentProfile === null
          ? currentProfile
          : {
              ...currentProfile,
              cash: currentProfile.cash + response.data.rewardCash,
              platformCoins: currentProfile.platformCoins + response.data.rewardPlatformCoins,
              reputation: currentProfile.reputation + response.data.rewardReputation,
              actionPower: currentProfile.actionPower + response.data.rewardActionPower
            }
      );
      setTaskNotice(`奖励已发放：${response.data.rewardLabel}`);
      setTaskError("");
      setClaimingTaskId("");
      await loadInventoryCenter(account.token, selectedServer.id);
      await loadCompanyGrowth(account.token, selectedServer.id);
      await loadTasks(account.token, selectedServer.id);
      return;
    }

    setTaskError(response.error.message);
    setClaimingTaskId("");
  };

  const resolveRandomTask = async (taskId: string, option: "A" | "B", modifierItemId?: string): Promise<void> => {
    if (!account || !selectedServer) {
      setRandomTaskError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<RandomTaskActionResult>(
      `/random-tasks/${encodeURIComponent(taskId)}/resolve`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, option, modifierItemId })
      },
      account.token
    );

    if (response.success) {
      reportCurrentTelemetry("business_clock_todo_handled", response.data.task.configId, { status: "resolved" });
      setRandomTaskCenter(response.data.center);
      setProfile(response.data.profile);
      setRandomTaskNotice(response.data.task.knowledge === null ? response.data.result : `${response.data.result} · 相关知识卡：${response.data.task.knowledge.title}`);
      setRandomTaskError("");
      setRandomTaskModalId("");
      setRandomTaskModifierItemId("");
      await loadInventoryCenter(account.token, selectedServer.id);
      await loadCompanyGrowth(account.token, selectedServer.id);
      await loadTasks(account.token, selectedServer.id);
      return;
    }

    setRandomTaskError(response.error.message);
  };

  const refreshCompanyAndEmployees = (): void => {
    if (!account || !selectedServer) {
      return;
    }

    void loadCompanyFinance(account.token, selectedServer.id);
    void loadEmployees(account.token, selectedServer.id);
  };

  const refreshCompanyAndProjects = (): void => {
    if (!account || !selectedServer) {
      return;
    }

    void loadCompanyFinance(account.token, selectedServer.id);
    void loadProjects(account.token, selectedServer.id);
  };

  const runEmployeeAction = async (path: string): Promise<boolean> => {
    if (!account || !selectedServer) {
      setEmployeeError("账号或服务器状态缺失，请重新登录。");
      return false;
    }

    const response = await apiRequest<Employee>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setSelectedEmployeeId(response.data.id);
      setEmployeeError("");
      refreshCompanyAndEmployees();
      return true;
    }

    setEmployeeError(response.error.message);
    return false;
  };

  const recruitEmployee = (): void => {
    void runEmployeeAction("/employees/recruit");
  };

  const cultivateEmployee = async (): Promise<void> => {
    if (!selectedEmployee || !selectedEmployee.isActive) {
      return;
    }

    const isSuccess = await runEmployeeAction(`/employees/${encodeURIComponent(selectedEmployee.id)}/train`);
    if (isSuccess && account && selectedServer) {
      void loadTasks(account.token, selectedServer.id);
    }
  };

  const grantEmployeeEquity = (): void => {
    if (!selectedEmployee || !selectedEmployee.isActive) {
      return;
    }

    if (!window.confirm("股权激励会降低创始人持股，并提升员工忠诚。确认执行？")) {
      return;
    }

    void runEmployeeAction(`/employees/${encodeURIComponent(selectedEmployee.id)}/equity`);
  };

  const dismissEmployee = async (): Promise<void> => {
    if (!account || !selectedServer || !selectedEmployee || !selectedEmployee.isActive) {
      return;
    }

    if (!window.confirm("裁员会降低月支出，但会影响士气和声誉。确认裁员？")) {
      return;
    }

    const response = await apiRequest<CompanyFinance>(
      `/employees/${encodeURIComponent(selectedEmployee.id)}/fire`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setCompanyFinance(response.data);
      setSelectedEmployeeId("");
      setEmployeeError("");
      refreshCompanyAndEmployees();
      return;
    }

    setEmployeeError(response.error.message);
  };

  const runProjectAction = async <T,>(path: string, body: Record<string, string> = {}): Promise<ApiResponse<T> | undefined> => {
    if (!account || !selectedServer) {
      setProjectError("账号或服务器状态缺失，请重新登录。");
      return undefined;
    }

    return apiRequest<T>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, ...body })
      },
      account.token
    );
  };

  const startProject = async (): Promise<void> => {
    const response = await runProjectAction<BusinessProject>("/projects/start");
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setSelectedProjectId(response.data.id);
      setProjectError("");
      refreshCompanyAndProjects();
      return;
    }

    setProjectError(response.error.message);
  };

  const assignProjectEmployee = async (employeeId: string): Promise<void> => {
    if (!selectedProject || employeeId === "") {
      return;
    }

    const response = await runProjectAction<BusinessProject>(
      `/projects/${encodeURIComponent(selectedProject.id)}/assign`,
      { employeeId }
    );
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setSelectedProjectId(response.data.id);
      setProjectError("");
      refreshCompanyAndProjects();
      return;
    }

    setProjectError(response.error.message);
  };

  const advanceProject = async (): Promise<void> => {
    if (!selectedProject) {
      return;
    }

    const response = await runProjectAction<BusinessProject>(`/projects/${encodeURIComponent(selectedProject.id)}/advance`);
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setSelectedProjectId(response.data.id);
      setProjectError("");
      refreshCompanyAndProjects();
      if (account && selectedServer) {
        void loadTasks(account.token, selectedServer.id);
      }
      return;
    }

    setProjectError(response.error.message);
  };

  const settleProject = async (): Promise<void> => {
    if (!selectedProject) {
      return;
    }

    const response = await runProjectAction<{ project: BusinessProject; finance: CompanyFinance }>(
      `/projects/${encodeURIComponent(selectedProject.id)}/settle`
    );
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setCompanyFinance(response.data.finance);
      setSelectedProjectId(response.data.project.id);
      setProjectError("");
      refreshCompanyAndProjects();
      return;
    }

    setProjectError(response.error.message);
  };

  const chooseEvent = async (eventId: string, option: "A" | "B"): Promise<void> => {
    if (!account || !selectedServer) {
      setEventError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<EventChoiceResult>(
      `/events/${encodeURIComponent(eventId)}/choose`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, option })
      },
      account.token
    );

    if (response.success) {
      setCompanyFinance(response.data.finance);
      setEventNotice(response.data.result.knowledge === null ? response.data.result.summary : `${response.data.result.summary} · 已解锁知识卡：${response.data.result.knowledge.title}`);
      setEventError("");
      await loadEvents(account.token, selectedServer.id);
      await loadTasks(account.token, selectedServer.id);
      setProfile((currentProfile) =>
        currentProfile === null
          ? currentProfile
          : {
              ...currentProfile,
              cash: response.data.finance.cash,
              monthlyIncome: response.data.finance.monthlyIncome,
              monthlyExpense: response.data.finance.monthlyExpense,
              valuation: response.data.finance.valuation,
              totalDebt: response.data.finance.totalDebt,
              creditRating: response.data.finance.creditRating,
              reputation: response.data.finance.brandReputation,
              employeeSatisfaction: response.data.finance.employeeSatisfaction,
              customerSatisfaction: response.data.finance.customerSatisfaction,
              financeMonth: response.data.finance.financeMonth,
              operatingDay: response.data.finance.operatingDay,
              riskStatus: response.data.finance.riskStatus
            }
      );
      return;
    }

    setEventError(response.error.message);
  };

  const runLoanAction = async (path: string, body: Record<string, string> = {}): Promise<void> => {
    if (!account || !selectedServer) {
      setLoanError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<LoanActionResult>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, ...body })
      },
      account.token
    );

    if (response.success) {
      applyLoanCenter(response.data.loanCenter);
      setLoanNotice(response.data.result);
      setLoanError("");
      return;
    }

    setLoanError(response.error.message);
  };

  const runFundingAction = async (path: string, body: Record<string, string | number> = {}): Promise<void> => {
    if (!account || !selectedServer) {
      setFundingError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<FundingActionResult>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, ...body })
      },
      account.token
    );

    if (response.success) {
      applyFundingCenter(response.data.fundingCenter);
      setFundingNotice(response.data.result);
      setFundingError("");
      return;
    }

    setFundingError(response.error.message);
  };

  const runProductAction = async (path: string, body: Record<string, string> = {}): Promise<void> => {
    if (!account || !selectedServer) {
      setProductError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<ProductActionResult>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, ...body })
      },
      account.token
    );

    if (response.success) {
      applyProductCenter(response.data.productCenter);
      setSelectedProductId(response.data.product.id);
      setProductNotice(response.data.result);
      setProductError("");
      if (response.data.product.techDebt >= 75) {
        void loadEvents(account.token, selectedServer.id);
      }
      return;
    }

    setProductError(response.error.message);
  };

  const runMarketAction = async (path: string, body: Record<string, string> = {}): Promise<void> => {
    if (!account || !selectedServer) {
      setMarketError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<MarketActionResult>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, ...body })
      },
      account.token
    );

    if (response.success) {
      applyMarketCenter(response.data.marketCenter);
      setSelectedMarketId(response.data.market.id);
      if (response.data.action) {
        setSelectedCompetitorActionId(response.data.action.id);
      }
      setMarketNotice(response.data.result);
      setMarketError("");
      return;
    }

    setMarketError(response.error.message);
  };

  const purchaseShopProduct = async (productId: string): Promise<void> => {
    if (!account || !selectedServer) {
      setShopError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const product = shopCenter?.products.find((item) => item.id === productId);
    const isPrivilegeProduct = product?.category === "weekly_card" || product?.category === "monthly_card" || product?.category === "growth_fund";
    if (isPrivilegeProduct) {
      reportCurrentTelemetry("paid_product_entry_click", product.category, { productId });
    }

    const response = await apiRequest<ShopPurchaseResult>(
      "/shop/purchase",
      {
        method: "POST",
        body: JSON.stringify({
          serverId: selectedServer.id,
          productId,
          requestId: `${productId}-${Date.now()}`
        })
      },
      account.token
    );

    if (response.success) {
      setProfile(response.data.profile);
      setShopNotice(isPrivilegeProduct ? "已购买" : response.data.result);
      setShopError("");
      await loadShopCenter(account.token, selectedServer.id);
      await loadInventoryCenter(account.token, selectedServer.id);
      await loadVipCenter(account.token, selectedServer.id);
      return;
    }

    setShopError(response.error.message);
  };

  const claimPrivilegeDailyReward = async (purchaseId: string): Promise<void> => {
    if (!account || !selectedServer) {
      setShopError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<PrivilegeDailyClaimResult>(
      "/shop/privilege-claims",
      {
        method: "POST",
        body: JSON.stringify({
          serverId: selectedServer.id,
          purchaseId,
          requestId: `privilege-${purchaseId}-${Date.now()}`
        })
      },
      account.token
    );

    if (response.success) {
      setProfile(response.data.profile);
      applyShopCenter(response.data.shopCenter);
      setShopNotice("今日已领取");
      setShopError("");
      await loadInventoryCenter(account.token, selectedServer.id);
      await loadVipCenter(account.token, selectedServer.id);
      return;
    }

    setShopError(response.error.message);
  };

  const claimVipDailyGift = async (): Promise<void> => {
    if (!account || !selectedServer) {
      setVipError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<VipDailyGiftResult>(
      "/vip/daily-gift",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setProfile(response.data.profile);
      applyVipCenter(response.data.vipCenter);
      setVipNotice(response.data.result);
      setVipError("");
      await loadShopCenter(account.token, selectedServer.id);
      return;
    }

    setVipError(response.error.message);
  };

  const resolveCrisis = async (route: "financing" | "cost_cut" | "restructure"): Promise<void> => {
    if (!account || !selectedServer) {
      setLoanError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<LoanCenter>(
      "/finance/crisis/resolve",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, route })
      },
      account.token
    );

    if (response.success) {
      applyLoanCenter(response.data);
      setLoanNotice("危机处理方案已执行，公司状态已更新。");
      setLoanError("");
      return;
    }

    setLoanError(response.error.message);
  };

  const guideTask = (task: TaskItem): void => {
    if (task.isClaimable) {
      void claimTask(task.id);
      return;
    }

    if (task.type === "main") {
      void progressTask(task.id);
    }

    if (task.guideAction.includes("员工")) {
      setActiveNav("员工");
      return;
    }

    if (task.guideAction.includes("项目")) {
      setActiveNav("业务");
      setBusinessTab("项目");
      return;
    }

    if (task.guideAction.includes("产品")) {
      setActiveNav("业务");
      setBusinessTab("产品");
      return;
    }

    if (task.guideAction.includes("财务")) {
      openHomePanel("财务");
      return;
    }

    if (task.guideAction.includes("商业")) {
      openHomePanel("商城");
      return;
    }

    if (task.guideAction.includes("特权")) {
      openHomePanel("特权");
      return;
    }

    if (task.guideAction.includes("VIP")) {
      openHomePanel("VIP");
      return;
    }

    if (task.guideAction.includes("融资")) {
      setActiveNav("融资");
      return;
    }

    if (task.guideAction.includes("贷款")) {
      setActiveNav("贷款");
      return;
    }

    if (task.guideAction.includes("市场")) {
      setActiveNav("市场");
      return;
    }

    if (task.guideAction.includes("排行")) {
      openHomePanel("排行");
      return;
    }

    if (task.guideAction.includes("通行证")) {
      openHomePanel("通行证");
      return;
    }

    if (task.guideAction.includes("商会")) {
      openHomePanel("商会");
      return;
    }

    if (task.guideAction.includes("背包")) {
      openHomePanel("背包");
      return;
    }

    if (task.guideAction.includes("事件")) {
      openEventScreen();
      return;
    }

    if (task.unlockKind === "knowledge") {
      setActiveKnowledgeTask(task);
      setActivePanel(null);
      return;
    }

    if (task.unlockKind === "compliance") {
      setActiveKnowledgeTask(task);
      setActivePanel(null);
    }
  };

  const selectedPanel = activePanel ? homePanelContent[activePanel] : undefined;
  const hasVipAttention = vipCenter ? !vipCenter.dailyGift.isClaimed : false;
  const profileVipLevels = vipCenter?.levels.filter((level) => level.level > 0) ?? [];
  const selectedProfileVip =
    profileVipLevels.find((level) => level.level === selectedProfileVipLevel) ??
    (vipCenter?.currentLevel.level && vipCenter.currentLevel.level > 0 ? vipCenter.currentLevel : profileVipLevels[0]) ??
    null;
  const profileVipLevelWindowStartValue = profileVipLevelWindowStart ?? resolveVipLevelWindowStart(selectedProfileVip?.level, profileVipLevels);
  const profileVipLevelWindowStartIndex = Math.max(0, profileVipLevels.findIndex((level) => level.level === profileVipLevelWindowStartValue));
  const profileVipVisibleLevels = profileVipLevels.slice(profileVipLevelWindowStartIndex, profileVipLevelWindowStartIndex + VIP_LEVEL_WINDOW_SIZE);
  const handleSelectProfileVipLevel = (level: number): void => {
    const selectedIndex = profileVipLevels.findIndex((item) => item.level === level);
    if (selectedIndex < 0) {
      return;
    }
    const currentStartIndex = Math.max(0, profileVipLevels.findIndex((item) => item.level === profileVipLevelWindowStartValue));
    const currentEndIndex = Math.min(profileVipLevels.length - 1, currentStartIndex + VIP_LEVEL_WINDOW_SIZE - 1);
    setSelectedProfileVipLevel(level);
    if (selectedIndex === currentEndIndex && selectedIndex < profileVipLevels.length - 1) {
      setProfileVipLevelWindowStart(profileVipLevels[selectedIndex + 1]?.level ?? null);
      return;
    }
    if (selectedIndex === currentStartIndex && selectedIndex > 0) {
      setProfileVipLevelWindowStart(profileVipLevels[Math.max(0, selectedIndex - VIP_LEVEL_WINDOW_SIZE)]?.level ?? null);
      return;
    }
    setProfileVipLevelWindowStart(profileVipLevels[currentStartIndex]?.level ?? null);
  };
  const nextVipLabel = vipCenter?.nextLevel ? `距 ${vipCenter.nextLevel.name}` : "已达上限";
  const isNavActive = (item: string): boolean => {
    if (item === "业务") {
      return activeNav === "业务" || activeNav === "项目" || activeNav === "产品";
    }

    if (item === "背包") {
      return activeNav === "背包" || nativeHomePage === "bag";
    }

    return activeNav === item;
  };

  if (isRestoring) {
    return (
      <main className="login-shell" aria-label="恢复登录状态">
        <section className="login-stage" aria-label="登录状态检查">
          <div className="login-brand">
            <span>创</span>
            <div>
              <h1>写字楼创业记</h1>
              <p>正在进入游戏</p>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
        </section>
      </main>
    );
  }

  if (step === "game" && profile && selectedServer && selectedAvatar) {
    return (
      <main className="game-shell" aria-label="游戏主界面">
        <section className="app-viewport shadow-2xl" aria-label="公司经营主页">
          <header className="absolute top-0 left-0 right-0 z-[60] p-4 space-y-3 pointer-events-none">
            <div className="flex items-center justify-between pointer-events-auto">
              <button className="flex items-center gap-2 text-left" type="button" onClick={() => openHomePanel("个人中心")}>
                <span className="relative group">
                  {hasVipAttention && <span className="red-dot" />}
                  <span className="block w-12 h-12 rounded-full border-2 border-business-gold p-0.5 overflow-hidden shadow-lg shadow-business-gold/10">
                    <img src="/game-ui/html-design/founder.jpg" alt="" className="w-full h-full object-cover rounded-full" />
                  </span>
                  <span className="absolute -bottom-1 -right-1 bg-business-gold text-business-dark text-[9px] font-black px-1.5 rounded-sm border border-business-dark">
                    VIP {vipCenter?.currentLevel.level ?? 0}
                  </span>
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="flex items-center gap-1.5">
                    <strong className="font-black text-sm text-white drop-shadow-md truncate max-w-[120px]">{profile.founderName || account?.username || "创业新星"}</strong>
                    <span className="bg-blue-500/20 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold border border-blue-500/30">创业先驱</span>
                  </span>
                  <span className="flex items-center gap-2 mt-1">
                    <span className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                      <span className="block h-full bg-business-gold shadow-[0_0_8px_rgba(251,191,36,0.5)]" style={{ width: `${(companyGrowth?.progressToNextBasisPoints ?? 0) / 100}%` }} />
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">LV.{profile.companyLevel}/{companyGrowth?.maxLevel ?? 80}</span>
                  </span>
                  {companyGrowth?.nextLevelExperience === null && (
                    <span className="mt-1 text-[9px] text-business-gold font-bold">
                      满级宝箱 {companyGrowth.fullLevelChest.progressExperience}/{companyGrowth.fullLevelChest.requiredExperience}
                      {companyGrowth.fullLevelChest.claimableCount > 0 ? ` · 可领 ${companyGrowth.fullLevelChest.claimableCount}` : ""}
                    </span>
                  )}
                </span>
              </button>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-medium">公司估值</span>
                <strong className="text-xs text-business-gold font-black">{compactNumber(profile.valuation)}</strong>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto scroll-hide pb-1 pointer-events-auto" aria-label="资源">
              {[
                { icon: "circle-dollar-sign", iconClass: "text-emerald-400", label: compactNumber(profile.cash), key: "cash" },
                { icon: "gem", iconClass: "text-business-gold", label: profile.platformCoins.toLocaleString("zh-CN"), key: "platform-coins" },
                { icon: "award", iconClass: "text-blue-400", label: compactNumber(profile.reputation), key: "reputation" },
                { icon: "zap", iconClass: "text-amber-500", label: `${profile.actionPower}/${profile.actionPowerLimit}`, key: "action-power" }
              ].map((resource) => (
                <span className="resource-tag min-w-[86px]" key={resource.key}>
                  <Icon name={resource.icon} className={`w-3 h-3 ${resource.iconClass}`} />
                  <span className="text-[10px] font-bold truncate">{resource.label}</span>
                </span>
              ))}
            </div>
            {businessClockHint && (
              <button className="pointer-events-auto inline-flex w-fit items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-slate-950/70 px-3 py-1 text-[10px] font-black text-emerald-200" type="button" onClick={() => {
                reportCurrentTelemetry("business_clock_briefing_open", "finance-hud");
                openHomePanel("财务");
              }}>
                <Icon name="clock" className="w-3 h-3" />
                {businessClockHint}
              </button>
            )}
          </header>

          <main id="home-scene" className="flex-1 main-bg relative flex flex-col items-center justify-center">
            <div className="animate-float text-center pointer-events-none">
              <div>
                <h2 className="text-2xl font-black tracking-widest text-white drop-shadow-2xl">{profile.companyName}</h2>
              </div>
            </div>

            <div className="absolute left-4 top-36 space-y-4">
              {sideActions.map((item, index) => (
                <button className="flex flex-col items-center gap-1 group relative" type="button" key={item} onClick={() => openHomePanel(item)}>
                  {[3, 4].includes(index) && <span className="red-dot" />}
                  <span className="w-12 h-12 glass-panel rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name={homeActionIcons[item] ?? "box"} className={`w-6 h-6 ${homeActionIconClasses[item] ?? ""}`} />
                  </span>
                  <span className="text-[10px] text-white/90 font-bold drop-shadow-md">{item}</span>
                </button>
              ))}
            </div>

            <div className="absolute right-4 top-28 space-y-4">
              {rightActions.map((item) => (
                <button
                  className="flex flex-col items-center gap-1 group relative"
                  data-testid={item === "跨服" ? "home-cross-server-entry" : undefined}
                  type="button"
                  key={item}
                  onClick={() => openHomePanel(item)}
                >
                  {shouldShowRightActionRedDot(item) && <span className="red-dot" />}
                  <span className="w-12 h-12 glass-panel rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name={homeActionIcons[item] ?? "box"} className={`w-6 h-6 ${homeActionIconClasses[item] ?? ""}`} />
                  </span>
                  <span className="text-[10px] text-white/90 font-bold drop-shadow-md">{item}</span>
                </button>
              ))}
            </div>

            <div aria-label="少年三国志式快捷入口" className="home-social-dock absolute left-1/2 bottom-44 z-[70] flex -translate-x-1/2 items-end justify-center gap-3" data-testid="home-social-dock">
              <button className="group relative flex w-16 flex-col items-center gap-1 active:scale-95 transition-transform" data-testid="home-cross-server-entry" type="button" onClick={() => openHomePanel("跨服")}>
                <span className="red-dot" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-business-gold/50 bg-gradient-to-b from-business-gold/25 to-slate-950/85 shadow-[0_8px_18px_rgba(0,0,0,0.45)] group-hover:scale-110 transition-transform">
                  <Icon name="trophy" className="h-6 w-6 text-cyan-400" />
                </span>
                <span className="text-[10px] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">跨服</span>
              </button>
              <button className="group relative flex w-16 flex-col items-center gap-1 active:scale-95 transition-transform" data-testid="home-chat-entry" type="button" onClick={() => openHomePanel("聊天")}>
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-business-gold/50 bg-gradient-to-b from-business-gold/25 to-slate-950/85 shadow-[0_8px_18px_rgba(0,0,0,0.45)] group-hover:scale-110 transition-transform">
                  <Icon name="message-circle" className="h-6 w-6 text-business-gold" />
                </span>
                <span className="text-[10px] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]" title={latestChatMessage ? `${latestChatMessage.founderName}：${latestChatMessage.content}` : "聊天"}>聊天</span>
              </button>
              <button aria-label={profile.unreadMailCount > 0 ? `邮件 ${profile.unreadMailCount}` : "邮件"} className="group relative flex w-16 flex-col items-center gap-1 active:scale-95 transition-transform" data-testid="home-mail-entry" type="button" onClick={() => openHomePanel("邮件")}>
                {profile.unreadMailCount > 0 && <span className="red-dot" />}
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-business-gold/50 bg-gradient-to-b from-business-gold/25 to-slate-950/85 shadow-[0_8px_18px_rgba(0,0,0,0.45)] group-hover:scale-110 transition-transform">
                  <Icon name="mail" className="h-6 w-6 text-business-gold" />
                </span>
                <span className="text-[10px] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]" data-testid="home-mail-unread-count">{profile.unreadMailCount > 0 ? `邮件 ${profile.unreadMailCount}` : "邮件"}</span>
              </button>
            </div>

            <button className="absolute bottom-24 left-4 right-24 glass-panel p-2.5 rounded-2xl flex items-center gap-3 active:scale-95 transition-transform cursor-pointer text-left" data-testid="home-task-strip" type="button" onClick={openTaskScreen}>
              <span className="w-12 h-12 bg-business-gold/15 rounded-xl flex items-center justify-center relative border border-business-gold/20">
                <span className="red-dot" />
                <Icon name="clipboard-check" className="w-7 h-7 text-business-gold" />
              </span>
              <span className="flex-1 overflow-hidden">
                <span className="flex justify-between items-center mb-0.5">
                  <span className="text-business-gold text-[10px] font-black uppercase tracking-wider">{highlightedTask?.isClaimable ? "可领取" : "主线任务"}</span>
                  <span className="text-slate-500 text-[10px] font-bold">{highlightedTask ? `${highlightedTask.progress}/${highlightedTask.target}` : "0/0"}</span>
                </span>
                <strong className="block text-xs font-black truncate text-white">{highlightedTask ? highlightedTask.title : "任务配置读取中"}</strong>
                <span className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold truncate">
                    <Icon name="gem" className="w-2.5 h-2.5" /> {highlightedTask ? highlightedTask.rewardLabel : "暂无奖励"}
                  </span>
                </span>
              </span>
              <span className="btn-gold px-3 py-2 rounded-xl text-xs font-black text-business-dark">{highlightedTask?.isClaimable ? "领取" : "前往"}</span>
            </button>

          </main>

          <nav className="h-24 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 px-2 flex items-center justify-between z-[100] pb-6" aria-label="底部导航">
            {navItems.map((item, index) => (
              <button
                className={`flex flex-col items-center gap-1.5 flex-1 transition-colors ${isNavActive(item) ? "text-business-gold" : "text-slate-500"}`}
                type="button"
                key={item}
                onClick={() => {
                  if (item === "公司") {
                    setActiveNav(item);
                    setActivePanel(null);
                    setNativeHomePage(null);
                  } else if (item === "业务") {
                    setActiveNav(item);
                    setBusinessTab("项目");
                    setActivePanel(null);
                    setNativeHomePage(null);
                  } else if (item === "员工" || item === "市场") {
                    setActiveNav(item);
                    setActivePanel(null);
                    setNativeHomePage(null);
                  } else {
                    openHomePanel(item);
                  }
                }}
              >
                <span className="relative">
                  {[1, 2, 5].includes(index) && <span className="red-dot" />}
                  <Icon name={navIcons[item] ?? "box"} className="w-6 h-6" />
                </span>
                <span className="text-[10px] font-bold">{item}</span>
              </button>
            ))}
          </nav>

          {nativeHomePage === "profile" && (
            <section className="page-container page-active" aria-label="个人中心" data-testid="native-profile-center">
              <div className="flex-1 overflow-hidden px-4 pb-5 pt-10">
                <div className="relative flex h-full flex-col overflow-hidden rounded-[1.7rem] border border-business-gold/30 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
                  <button className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-200" data-testid="profile-close-button" type="button" aria-label="关闭个人中心" onClick={closeNativeHomePage}>
                    <Icon name="x" className="h-4 w-4" />
                  </button>

                  <div className="relative px-5 pb-4 pt-5">
                    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_20%_10%,rgba(251,191,36,0.22),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.16),transparent_48%)]" />
                    <div className="relative flex items-center gap-4">
                      <span className="relative block h-20 w-20 rounded-full border-2 border-business-gold p-1 shadow-[0_0_24px_rgba(251,191,36,0.2)]">
                        <img src="/game-ui/html-design/founder.jpg" alt="" className="h-full w-full rounded-full object-cover" />
                        <span className="absolute bottom-1 -right-1 rounded-md border border-business-dark bg-business-gold px-1.5 py-0.5 text-[9px] font-black leading-none text-business-dark shadow-[0_3px_8px_rgba(0,0,0,0.45)]">
                          VIP {vipCenter?.currentLevel.level ?? 0}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <span className="text-[10px] font-black text-business-gold">个人中心</span>
                        <h2 className="mt-1 truncate text-2xl font-black text-white">{profile.founderName || account?.username || "创业新星"}</h2>
                        <p className="mt-1 truncate text-xs font-bold text-slate-300">{profile.companyName}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-slate-950/55 px-2.5 py-1 text-[10px] font-bold text-slate-300">{selectedServer.name}</span>
                          <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 text-[10px] font-bold text-blue-200">创业先驱</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto scroll-hide px-5 pb-5" data-testid="profile-scroll-area">
                    <div className="border-y border-business-gold/25 bg-[linear-gradient(90deg,rgba(251,191,36,0.16),rgba(15,23,42,0.24))] px-4 py-4">
                      <span className="text-[10px] font-black text-business-gold">公司估值</span>
                      <strong className="mt-1 block truncate text-3xl font-black italic text-white">{compactNumber(profile.valuation)}</strong>
                    </div>

                    <div className="mt-3 overflow-hidden border-y border-white/10" data-testid="profile-attribute-panel">
                      {[
                        ["公司等级", `LV.${profile.companyLevel}`],
                        ["现金", compactNumber(profile.cash)],
                        ["声望", compactNumber(profile.reputation)],
                        ["行动力", `${profile.actionPower}/${profile.actionPowerLimit}`]
                      ].map(([label, value]) => (
                        <div className="flex items-center justify-between gap-4 border-b border-white/5 px-1 py-3 last:border-b-0" key={label}>
                          <span className="text-[11px] font-bold text-slate-400">{label}</span>
                          <strong className="truncate text-sm font-black text-white">{value}</strong>
                        </div>
                      ))}
                    </div>

                    <section className="mt-4 border-y border-business-gold/20 py-3" aria-label="我的荣誉">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <strong className="block text-sm font-black text-white">我的荣誉</strong>
                          <span className="text-[9px] font-bold text-slate-500">称号、成就和经营回顾</span>
                        </div>
                        <span className="shrink-0 rounded-full bg-business-gold/15 px-2 py-1 text-[9px] font-black text-business-gold">
                          {activeTitleCount} 称号
                        </span>
                      </div>
                      <div className="space-y-2">
                        {[
                          ["当前称号", titleCenter?.equippedTitle?.name ?? "未装备称号", titleCenter?.equippedTitle?.bonusLabel ?? "完成榜单或成就后装备"],
                          ["已获得称号", `${activeTitleCount}/${titleCenter?.titles.length ?? 0}`, (titleCenter?.titles ?? [])[0]?.name ?? "暂无称号"],
                          ["成就进度", `${completedAchievementCount}/${achievements.length}`, claimableAchievementCount > 0 ? `${claimableAchievementCount} 个可领取` : "继续推进经营"],
                          ["赛季荣誉", seasonCenter?.season.name ?? "赛季读取中", `${seasonCenter?.season.points ?? 0} 积分`],
                          ["活动回顾", bestActivityRecap?.name ?? "暂无已结束活动", bestActivityRecap?.personalRank === null || bestActivityRecap === null ? "活动结算后生成" : `第 ${bestActivityRecap.personalRank} 名`],
                          ["商会历史", guildHistory?.guild?.name ?? guildCenter?.guild?.name ?? "未加入商会", latestGuildSettlement === null ? "贡献榜结算后生成" : `${latestGuildSettlement.snapshotDate} / 发放 ${latestGuildSettlement.deliveredRewards}`],
                          ["跨服历史", crossServerGuildHistory?.guild.name ?? crossServerCenter?.guildSeason.guildName ?? "跨服报名后生成", latestCrossGuildSettlement === null ? "赛季结算后回顾" : `${latestCrossGuildSettlement.snapshotDate} / 第 ${latestCrossGuildSettlement.finalRank ?? "-"}`],
                          ["知识卡", `${knowledgeEntries.filter((entry) => entry.isUnlocked).length}/${knowledgeEntries.length} 张`, selectedKnowledgeEntry?.title ?? "经营事件和成就解锁"]
                        ].map(([label, value, hint]) => (
                          <div className="border-b border-white/5 px-1 py-2.5 last:border-b-0" key={label}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-black text-slate-400">{label}</span>
                              <strong className="min-w-0 truncate text-xs font-black text-white">{value}</strong>
                            </div>
                            <span className="mt-1 block truncate text-[9px] font-bold text-business-gold">{hint}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="mt-4 space-y-3" aria-label="称号成就知识卡">
                      {(titleCenter?.titles.length ?? 0) > 0 && (
                        <div className="border-y border-white/10 py-3">
                          <div className="mb-2 flex items-center justify-between">
                            <strong className="text-xs font-black text-white">称号</strong>
                            <span className="text-[9px] font-bold text-slate-500">{titleCenter?.equippedTitle?.name ?? "未装备"}</span>
                          </div>
                          <div className="space-y-2">
                            {(titleCenter?.titles ?? []).slice(0, 3).map((title) => (
                              <button
                                className={`w-full border px-3 py-2 text-left ${title.isEquipped ? "border-business-gold bg-business-gold/10" : "border-white/10 bg-slate-950/55"}`}
                                disabled={title.isExpired}
                                key={title.id}
                                type="button"
                                onClick={() => void equipTitle(title.id)}
                              >
                                <strong className="block text-[11px] font-black text-white">{title.name}</strong>
                                <span className="text-[9px] font-bold text-slate-500">{title.isExpired ? "已过期" : title.bonusLabel}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {achievements.length > 0 && (
                        <div className="border-y border-white/10 py-3">
                          <div className="mb-2 flex items-center justify-between">
                            <strong className="text-xs font-black text-white">成就</strong>
                            <span className="text-[9px] font-bold text-slate-500">{completedAchievementCount}/{achievements.length}</span>
                          </div>
                          <div className="space-y-2">
                            {achievements.slice(0, 3).map((achievement) => (
                              <div className="border-b border-white/5 px-1 py-2 last:border-b-0" key={achievement.id}>
                                <div className="flex items-center justify-between gap-3">
                                  <strong className="truncate text-[11px] font-black text-white">{achievement.name}</strong>
                                  <span className="text-[9px] font-bold text-slate-500">{achievement.progress}/{achievement.target}</span>
                                </div>
                                <p className="mt-1 truncate text-[9px] font-bold text-slate-500">{achievement.description}</p>
                                <button
                                  className="mt-2 rounded-lg bg-business-gold px-3 py-1 text-[9px] font-black text-business-dark disabled:opacity-45"
                                  disabled={!achievement.isCompleted || achievement.isClaimed}
                                  type="button"
                                  onClick={() => void claimAchievement(achievement.id)}
                                >
                                  {achievement.isClaimed ? "已领取" : achievement.isCompleted ? "领取" : "未完成"}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {knowledgeEntries.length > 0 && (
                        <div className="border-y border-white/10 py-3">
                          <div className="mb-2 flex items-center justify-between">
                            <strong className="text-xs font-black text-white">知识卡</strong>
                            <span className="text-[9px] font-bold text-business-gold">{knowledgeEntries.filter((entry) => entry.isUnlocked).length}/{knowledgeEntries.length} 张</span>
                          </div>
                          <div className="space-y-2">
                            {knowledgeEntries.slice(0, 3).map((entry) => (
                              <button
                                className={`w-full border px-3 py-2 text-left ${entry.id === selectedKnowledgeEntry?.id ? "border-business-gold bg-business-gold/10" : "border-white/10 bg-slate-950/55"}`}
                                key={entry.id}
                                type="button"
                                onClick={() => setSelectedKnowledgeEntryId(entry.id)}
                              >
                                <strong className="block truncate text-[11px] font-black text-white">{entry.title}</strong>
                                <span className={`mt-1 block text-[9px] font-black ${entry.isUnlocked ? "text-business-gold" : "text-slate-500"}`}>{entry.isUnlocked ? "已解锁" : "未解锁"}</span>
                              </button>
                            ))}
                          </div>
                          {selectedKnowledgeEntry && (
                            <p className="mt-3 text-[10px] font-bold leading-5 text-slate-300">{selectedKnowledgeEntry.summary}</p>
                          )}
                        </div>
                      )}
                    </section>

                    <button className="mt-4 w-full rounded-2xl border border-white/5 bg-slate-950/70 py-3 text-xs font-black text-slate-200" type="button" onClick={leaveGame}>
                      切换账号
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {nativeHomePage === "chat" && (
            <section className="page-container page-active bg-[radial-gradient(circle_at_top,#5b3a16_0%,#111827_42%,#020617_100%)]" aria-label="聊天" data-testid="native-chat">
              <div className="flex-1 overflow-hidden px-4 pb-4 pt-9">
                <div className="relative grid h-full grid-cols-[4.75rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-business-gold/30 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] shadow-[0_18px_40px_rgba(0,0,0,0.42)]" data-testid="chat-unified-shell">
                  <button className="absolute right-2 top-2 z-20 w-8 h-8 bg-slate-950/75 border border-business-gold/25 rounded-full flex items-center justify-center text-slate-200" data-testid="chat-close-button" type="button" aria-label="关闭聊天" onClick={closeNativeHomePage}>
                    <Icon name="x" className="w-5 h-5" />
                  </button>
                  <nav className="flex h-full flex-col border-r border-business-gold/20 bg-slate-950/45 py-3" aria-label="聊天频道" data-testid="chat-channel-rail">
                    {(chatCenter?.channels ?? [
                      { id: "system" as const, label: "系统", canSend: false, readonlyReason: "系统频道只读" },
                      { id: "world" as const, label: "世界", canSend: true, readonlyReason: null },
                      { id: "guild" as const, label: "商会", canSend: false, readonlyReason: "加入商会后可发言" },
                      { id: "cross" as const, label: "跨服", canSend: false, readonlyReason: "进入跨服分组后可发言" }
                    ]).map((channel) => (
                      <button className={`relative h-14 text-[11px] font-black transition ${activeChatChannel === channel.id ? "bg-business-gold/15 text-business-gold" : "text-slate-300"}`} data-testid={`chat-channel-${channel.id}`} key={channel.id} type="button" onClick={() => setActiveChatChannel(channel.id)}>
                        {activeChatChannel === channel.id && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-business-gold shadow-[0_0_12px_rgba(245,158,11,0.8)]" />}
                        <span className="relative">{channel.label}</span>
                      </button>
                    ))}
                  </nav>

                  <div className="min-w-0 flex h-full flex-col overflow-hidden" data-testid="chat-content-pane">
                    <section className="shrink-0 border-b border-business-gold/15 bg-slate-950/35 px-4 pr-14 py-3" data-testid="chat-channel-status">
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-sm text-white">{activeChatChannelConfig?.label ?? "世界"}频道</strong>
                      </div>
                    </section>

                    <section className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scroll-hide" aria-label="聊天消息" data-testid="chat-message-list">
                      {activeChatMessages.length === 0 && <p className="py-4 text-xs text-slate-400 font-bold">暂无消息。</p>}
                      {activeChatMessages.map((message) => (
                        <article className="border-b border-white/5 py-3 last:border-b-0" key={message.id}>
                          <div className="flex items-center justify-between gap-3">
                            <strong className="text-xs text-business-gold">{message.founderName}</strong>
                            <span className="text-[9px] text-slate-500">{new Date(message.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-300 font-bold">{message.content}</p>
                          {message.filterAction === "mask" && <span className="mt-2 block text-[9px] text-business-gold">内容已自动处理</span>}
                        </article>
                      ))}
                    </section>

                    {(chatNotice || chatError) && <p className={chatError ? "task-error mx-3 mb-2" : "task-notice mx-3 mb-2"}>{chatError || chatNotice}</p>}

                    <form className="shrink-0 border-t border-business-gold/15 bg-slate-950/45 p-3" data-testid="chat-input-bar" onSubmit={(event) => {
                      event.preventDefault();
                      void sendChatMessage();
                    }}>
                      <div className="flex items-center gap-2">
                        <label className="min-w-0 flex-1 text-[0px]">
                          发言内容
                          <input
                            className="w-full rounded-full bg-black/45 border border-business-gold/20 px-4 py-3 text-xs text-white outline-none focus:border-business-gold/60"
                            disabled={!activeChatChannelConfig?.canSend}
                            maxLength={120}
                            onChange={(event) => setChatDraft(event.target.value)}
                            placeholder={activeChatChannelConfig?.canSend ? "输入消息" : activeChatChannelConfig?.readonlyReason ?? "系统频道只读"}
                            value={chatDraft}
                          />
                        </label>
                        <button className="btn-gold h-10 w-16 shrink-0 rounded-full text-sm font-black text-business-dark disabled:opacity-50" disabled={!activeChatChannelConfig?.canSend} type="submit">
                          {activeChatChannel === "system" ? "只读" : "发送"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </section>
          )}

          {nativeHomePage === "mail" && (
            <section className="page-container page-active" aria-label="邮件" data-testid="native-mail">
              <div className="flex-1 overflow-hidden px-4 pb-5 pt-10">
                <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-business-gold/30 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] shadow-[0_18px_40px_rgba(0,0,0,0.42)]" data-testid="mail-unified-shell">
                  <button className="absolute right-2 top-2 z-20 w-8 h-8 bg-slate-950/75 border border-business-gold/25 rounded-full flex items-center justify-center text-slate-200" data-testid="mail-close-button" type="button" aria-label="关闭邮件" onClick={closeNativeHomePage}>
                    <Icon name="x" className="w-5 h-5" />
                  </button>
                  <div className="min-w-0 flex h-full flex-col overflow-hidden" data-testid="mail-content-pane">
                    <div className="border-b border-business-gold/15 px-4 pb-3 pt-4 pr-12">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-black text-white">邮件</strong>
                          <span className="text-[10px] font-bold text-business-gold">未读 {mailCenter?.summary.unreadCount ?? profile.unreadMailCount} / 共 {mailCenter?.summary.totalCount ?? 0}</span>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button className="rounded-full border border-business-gold/40 px-3 py-2 text-[11px] font-black text-business-gold" data-testid="mail-claim-attachments" type="button" onClick={() => void claimMailAttachments()}>
                            领取附件
                          </button>
                          <button className="btn-gold rounded-full px-3 py-2 text-[11px] font-black text-business-dark" data-testid="mail-mark-all-read" type="button" onClick={() => void markAllMailsRead()}>
                            全部已读
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2" data-testid="mail-filter-bar" aria-label="邮件筛选">
                        <div className="flex gap-2 overflow-x-auto scroll-hide">
                          {[
                            ["all", "全部"],
                            ["system", "系统"],
                            ["reward", "奖励"],
                            ["compensation", "补偿"]
                          ].map(([id, label]) => (
                            <button
                              className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black ${activeMailChannel === id ? "border-business-gold bg-business-gold text-business-dark" : "border-white/10 bg-slate-950/50 text-slate-300"}`}
                              key={id}
                              type="button"
                              onClick={() => setActiveMailChannel(id as "all" | MailChannelId)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            ["all", "全部"],
                            ["unread", "未读"],
                            ["read", "已读"]
                          ].map(([id, label]) => (
                            <button className={`rounded-full border px-2 py-1.5 text-[10px] font-black ${activeMailStatus === id ? "border-business-gold bg-business-gold text-business-dark" : "border-white/10 bg-slate-950/50 text-slate-300"}`} key={id} type="button" onClick={() => setActiveMailStatus(id as MailStatusFilter)}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {(mailNotice || mailError) && <p className={mailError ? "task-error mt-2" : "task-notice mt-2"}>{mailError || mailNotice}</p>}
                    </div>
                    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
                      <section className="min-h-0 overflow-y-auto scroll-hide divide-y divide-white/5" data-testid="mail-list" aria-label="邮件列表">
                        {mailCenter === null && <p className="px-4 py-5 text-xs font-bold text-slate-300">暂无邮件</p>}
                        {mailCenter !== null && visibleMails.length === 0 && <p className="px-4 py-5 text-xs font-bold text-slate-300">暂无邮件</p>}
                        {visibleMails.map((mail) => (
                          <button
                            className={`w-full px-4 py-3 text-left transition-colors ${mail.id === selectedMail?.id ? "bg-business-gold/10" : mail.isRead ? "bg-transparent" : "bg-slate-900/45"}`}
                            data-testid={`mail-item-${mail.id}`}
                            key={mail.id}
                            type="button"
                            onClick={() => setSelectedMailId(mail.id)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <strong className="min-w-0 truncate text-xs text-white">{mail.subject}</strong>
                              <span className="shrink-0 text-[9px] text-business-gold">{mail.channel === "reward" ? "奖励" : mail.channel === "compensation" ? "补偿" : "系统"}</span>
                            </div>
                            <p className="mt-1 truncate text-[10px] text-slate-400">{mail.body}</p>
                            {mail.rewardSummary && <span className="mt-1 block text-[9px] font-black text-business-gold">{mail.rewardSummary} · {getMailStatusLabel(mail)}</span>}
                          </button>
                        ))}
                      </section>
                      <section className="border-t border-business-gold/15 bg-slate-950/35 px-4 py-3" data-testid="mail-detail" aria-label="邮件详情">
                        {selectedMail === null ? (
                          <p className="text-xs font-bold text-slate-300">请选择邮件</p>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-3">
                              <strong className="min-w-0 truncate text-sm text-white">{selectedMail.subject}</strong>
                              <span className="shrink-0 text-[9px] text-slate-500">{new Date(selectedMail.createdAt).toLocaleDateString("zh-CN")}</span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-300 font-bold">{selectedMail.body}</p>
                            {selectedMail.rewardSummary && <p className="mt-2 rounded-xl bg-business-gold/10 px-3 py-2 text-[10px] font-black text-business-gold">奖励：{selectedMail.rewardSummary} · {getMailStatusLabel(selectedMail)}</p>}
                            {selectedMail.canClaim && (
                              <button className="mt-2 w-full btn-gold rounded-xl py-2 text-[11px] font-black text-business-dark" type="button" onClick={() => void claimMailAttachments()}>
                                领取附件
                              </button>
                            )}
                          </>
                        )}
                      </section>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {nativeHomePage === "finance" && (
            <section className="page-container page-active" aria-label="财务" data-testid="native-finance">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="pie-chart" className="w-7 h-7 text-business-gold" />
                  <div>
                    <h2 className="text-xl font-black text-white">财务</h2>
                    <span className="text-[10px] text-slate-500">现金流、负债、风险</span>
                  </div>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭财务" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 scroll-hide">
                {companyFinance ? (
                  <>
                    <section className={`glass-panel rounded-3xl p-4 border ${companyFinance.riskStatus === "稳健" ? "border-business-gold/30" : "border-amber-400/40"} bg-gradient-to-br from-business-gold/10 to-slate-950`} aria-label="财务账本">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong className="block text-sm text-white font-black">财务账本</strong>
                          <span className="text-[10px] text-slate-500">第 {companyFinance.financeMonth} 月 · 第 {companyFinance.operatingDay} 天</span>
                        </div>
                        <span className={companyFinance.riskStatus === "稳健" ? "rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] text-emerald-200 font-black" : "rounded-full bg-amber-400/15 px-3 py-1 text-[10px] text-amber-200 font-black"}>
                          {companyFinance.riskStatus}
                        </span>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400 font-bold">现金流总览</div>
                          <div className="mt-1 truncate text-3xl text-business-gold font-black">{compactNumber(companyFinance.cash)}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[10px] text-slate-400 font-bold">净现金流</div>
                          <div className={companyFinance.netCashFlow >= 0 ? "mt-1 text-lg text-emerald-200 font-black" : "mt-1 text-lg text-amber-200 font-black"}>
                            {companyFinance.netCashFlow >= 0 ? `+${compactNumber(companyFinance.netCashFlow)}` : compactNumber(companyFinance.netCashFlow)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
                        {[
                          ["月收入", compactNumber(companyFinance.monthlyIncome)],
                          ["月支出", compactNumber(companyFinance.monthlyExpense)],
                          ["估值", compactNumber(companyFinance.valuation)],
                          ["股权", `${(companyFinance.founderEquityBasisPoints / 100).toFixed(1)}%`],
                          ["负债率", `${(companyFinance.debtRatioBasisPoints / 100).toFixed(1)}%`],
                          ["信用", companyFinance.creditRating]
                        ].map(([label, value]) => (
                          <div className="flex items-center justify-between gap-3 py-2.5" key={label}>
                            <span className="text-[10px] text-slate-500 font-bold">{label}</span>
                            <strong className="truncate text-sm text-white font-black">{value}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/10" aria-label="财务顾问提示">
                        <div className="flex items-center justify-between gap-3">
                          <strong className="text-xs text-white font-black">财务顾问提示</strong>
                          <span className={companyFinance.riskStatus === "稳健" ? "text-[10px] text-emerald-200 font-black" : "text-[10px] text-amber-200 font-black"}>
                            {companyFinance.riskStatus}
                          </span>
                        </div>
                        {companyFinance.riskTips.map((tip) => (
                          <p className="mt-2 text-xs text-slate-300 font-bold leading-5" key={tip}>{tip}</p>
                        ))}
                      </div>
                    </section>

                    {companyFinance.businessClock && (
                      <section className="glass-panel rounded-3xl p-4" aria-label="经营流水">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <strong className="block text-sm text-white font-black">经营流水</strong>
                            <span className="text-[10px] text-slate-500">经营已更新</span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-200">状态已更新</span>
                        </div>
                        <p className="mt-3 text-xs text-slate-300 font-bold leading-5">
                          {companyFinance.businessClock.settledTicks > 0 ? companyFinance.businessClock.summary : "经营暂无新增变化。"}
                        </p>
                        <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
                          {[
                            ["经营时间", `${companyFinance.businessClock.settledMinutes} 分钟`],
                            ["现金变化", companyFinance.businessClock.cashDelta >= 0 ? `+${compactNumber(companyFinance.businessClock.cashDelta)}` : compactNumber(companyFinance.businessClock.cashDelta)],
                            ["估值变化", companyFinance.businessClock.valuationDelta >= 0 ? `+${compactNumber(companyFinance.businessClock.valuationDelta)}` : compactNumber(companyFinance.businessClock.valuationDelta)],
                            ["离线时长", `${companyFinance.businessClock.elapsedMinutes} 分钟`]
                          ].map(([label, value]) => (
                            <div className="flex items-center justify-between gap-3 py-2.5" key={label}>
                              <span className="text-[10px] text-slate-500 font-bold">{label}</span>
                              <strong className="text-sm text-white font-black">{value}</strong>
                            </div>
                          ))}
                        </div>
                        {companyFinance.businessClock.nightBriefing && (
                          <article className="mt-3 border-t border-emerald-400/20 pt-3" aria-label="夜间经营简报">
                            <div className="flex items-center justify-between gap-3">
                              <strong className="text-xs text-emerald-100 font-black">夜间经营简报</strong>
                              <span className="text-[10px] text-emerald-200 font-black">{companyFinance.businessClock.nightBriefing.offlineMinutes} 分钟</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-200 font-bold leading-5">{companyFinance.businessClock.nightBriefing.summary}</p>
                            <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
                              {[
                                ["行动力恢复", `+${companyFinance.businessClock.nightBriefing.actionPowerRecovered}`],
                                ["新待办", `${companyFinance.businessClock.nightBriefing.newTodoCount} 个`]
                              ].map(([label, value]) => (
                                <div className="flex items-center justify-between gap-3 py-2" key={label}>
                                  <span className="text-[10px] text-slate-500 font-bold">{label}</span>
                                  <strong className="text-sm text-white font-black">{value}</strong>
                                </div>
                              ))}
                            </div>
                            <p className="mt-3 text-[10px] text-slate-300 font-bold leading-5">{companyFinance.businessClock.nightBriefing.riskTip}</p>
                            <p className="mt-1 text-[10px] text-business-gold font-black">建议动作：{companyFinance.businessClock.nightBriefing.nextAction}</p>
                          </article>
                        )}
                      </section>
                    )}

                    {companyFinance.reportMonth !== undefined && (
                      <section className="glass-panel rounded-3xl p-4" aria-label="月度经营报告">
                        <div className="flex items-center justify-between mb-3">
                          <strong className="text-sm text-white font-black">第 {companyFinance.reportMonth} 月经营报告</strong>
                          <span className="text-[10px] text-slate-500">已生成</span>
                        </div>
                        <div className="divide-y divide-white/10 border-y border-white/10">
                          {[
                            ["收入", compactNumber(companyFinance.income ?? companyFinance.monthlyIncome)],
                            ["支出", compactNumber(companyFinance.expense ?? companyFinance.monthlyExpense)],
                            ["净现金流", compactNumber(companyFinance.netCashFlow)],
                            ["期末现金", compactNumber(companyFinance.endingCash ?? companyFinance.cash)]
                          ].map(([label, value]) => (
                            <div className="flex items-center justify-between gap-3 py-2.5" key={label}>
                              <span className="text-[10px] text-slate-500 font-bold">{label}</span>
                              <strong className="text-sm text-white font-black">{value}</strong>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {financeError && <p className="rounded-2xl px-4 py-3 text-xs font-bold bg-red-500/15 text-red-200">{financeError}</p>}
                  </>
                ) : (
                  <section className="glass-panel rounded-3xl p-5">
                    <p className="text-xs text-slate-300 font-bold leading-5">{financeError || "财务数据暂未同步。"}</p>
                    <button
                      className="mt-4 btn-gold w-full py-3 rounded-2xl text-sm font-black text-business-dark"
                      type="button"
                      onClick={() => account && selectedServer && void loadCompanyFinance(account.token, selectedServer.id)}
                    >
                      刷新财务
                    </button>
                  </section>
                )}
              </div>
            </section>
          )}

          {nativeHomePage === "season" && (
            <section className="page-container page-active activity-native-shell" aria-label="赛季活动" data-testid="native-season">
              <div className="activity-scan-line" />
              <button className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-200 backdrop-blur-xl" type="button" aria-label="关闭赛季活动" onClick={closeNativeHomePage}>
                <Icon name="x" className="h-6 w-6" />
              </button>

              {activeActivityView === "main" && (
                <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-28 pt-12 scroll-hide">
                  {(seasonNotice || seasonError) && (
                    <p className={`mb-4 rounded-2xl px-4 py-3 text-xs font-bold ${seasonError ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-100"}`}>
                      {seasonError || seasonNotice}
                    </p>
                  )}

                  <header className="mb-6 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="mb-1 inline-block rounded border border-cyan-400/30 bg-cyan-400/20 px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-cyan-300">第4赛季 新纪元</span>
                      <h2 className="text-3xl font-black leading-tight text-white">
                        {seasonCenter?.season.name ?? "AI 创投风口"}
                        <br />
                        <span className="text-cyan-300">赛季主题</span>
                      </h2>
                      <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Icon name="calendar" className="h-3 w-3 text-cyan-300" />
                        {seasonCenter ? `${seasonCenter.season.startDate} 至 ${seasonCenter.season.endDate}` : "赛季配置读取中"}
                      </p>
                    </div>
                    <button className="group flex shrink-0 flex-col items-center gap-1" type="button" onClick={() => setActiveActivityView("buffs")}>
                      <span className="activity-glass relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-cyan-400/30 transition-transform duration-300 group-hover:scale-110">
                        <span className="absolute inset-0 bg-cyan-400/10 group-active:bg-cyan-400/25" />
                        <Icon name="zap" className="relative h-6 w-6 animate-pulse text-cyan-300" />
                      </span>
                      <span className="text-[10px] font-bold text-cyan-300">赛季通行证</span>
                    </button>
                  </header>

                  <section className="activity-glass relative mb-6 overflow-hidden rounded-[2rem] p-6">
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-[40px]" />
                    <p className="mb-1 text-[11px] font-bold text-slate-400">当前积分</p>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tight text-white tabular-nums">{compactNumber(seasonPoints)}</span>
                      <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs font-black text-cyan-300">
                        {seasonCenter?.season.pass.isPurchased ? "通行证收益已开启" : "通行证可提升赛季收益"}
                      </span>
                    </div>
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between text-[10px] font-black tracking-[0.16em]">
                        <span className="text-slate-500">赛季进度 <span className="text-white">{Math.round(currentActivityProgressPercent)}%</span></span>
                        <span className="text-slate-500">{activeSeasonActivities.length} 个活动进行中</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5 p-[2px]">
                        <div className="activity-tech-gradient activity-shimmer h-full rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)]" style={{ width: `${currentActivityProgressPercent}%` }} />
                      </div>
                    </div>
                  </section>

                  <div className="mb-8 grid grid-cols-2 gap-4">
                    <button className="activity-glass group flex h-28 flex-col justify-between rounded-3xl p-5 text-left transition-all active:scale-95" type="button" onClick={() => setActiveActivityView("shop")}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 transition-transform group-hover:scale-110">
                        <Icon name="shopping-bag" className="h-5 w-5 text-cyan-300" />
                      </span>
                      <span>
                        <strong className="block text-sm font-black text-white">活动商店</strong>
                        <small className="text-[11px] font-medium text-slate-500">兑换限时奖励</small>
                      </span>
                    </button>
                    <button className="activity-glass group flex h-28 flex-col justify-between rounded-3xl p-5 text-left transition-all active:scale-95" type="button" onClick={() => setActiveActivityView("leaderboard")}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/10 transition-transform group-hover:scale-110">
                        <Icon name="award" className="h-5 w-5 text-amber-400" />
                      </span>
                      <span>
                        <strong className="block text-sm font-black text-white">荣誉榜单</strong>
                        <small className="text-[11px] font-medium text-slate-500">查看活动排名</small>
                      </span>
                    </button>
                  </div>

                  <section className="mb-8">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-base font-black text-white">
                        <span className="h-4 w-1 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]" />
                        今日活动
                      </h3>
                      <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[10px] font-black text-amber-300">{currentActivityStatusLabel}</span>
                    </div>
                    {currentSeasonActivity ? (
                      <article className="activity-glass relative overflow-hidden rounded-3xl border-amber-400/20 p-5">
                        <div className="flex items-center gap-5">
                          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-violet-500/15 to-amber-400/15" />
                            <Icon name="rocket" className="relative h-10 w-10 text-cyan-300" />
                            <span className="absolute left-1 top-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-black">限时</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-base font-black text-white">{currentSeasonActivity.name}</h4>
                            <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500">{activityTodayGuide}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-black text-cyan-300">{currentActivityProgressLabel}</span>
                              <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] font-black text-amber-300">{currentActivityClaimable ? "目标已达成" : currentActivityProgressButtonLabel}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5 p-[2px]">
                          <div className="activity-tech-gradient activity-shimmer h-full rounded-full" style={{ width: `${currentActivityProgressPercent}%` }} />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <button className="rounded-xl border border-white/10 py-2 text-xs font-bold text-white disabled:opacity-45" disabled={currentSeasonActivity.status !== "active" || currentSeasonActivity.isJoined} type="button" onClick={() => void joinSeasonActivity(currentSeasonActivity.id)}>
                            {currentSeasonActivity.isJoined ? "已报名" : "报名"}
                          </button>
                          <button className="rounded-xl border border-cyan-400/30 py-2 text-xs font-bold text-cyan-300 disabled:opacity-45" disabled={!currentSeasonActivity.canProgress} type="button" onClick={() => void progressSeasonActivity(currentSeasonActivity.id)}>
                            {currentActivityProgressButtonLabel}
                          </button>
                          <button className="activity-gold-gradient activity-glow-gold rounded-xl py-2 text-xs font-black text-black disabled:opacity-45" disabled={currentSeasonActivity.status !== "active" || currentSeasonActivity.score < currentSeasonActivity.targetScore || currentSeasonActivity.rewardClaimed} type="button" onClick={() => void claimSeasonActivity(currentSeasonActivity.id)}>
                            {currentSeasonActivity.rewardClaimed ? "已领" : "领奖"}
                          </button>
                        </div>
                      </article>
                    ) : (
                      <p className="activity-glass rounded-3xl p-5 text-xs font-bold text-slate-400">暂无活动配置。</p>
                    )}
                  </section>

                  <section className="activity-glass mb-4 rounded-3xl p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <strong className="block text-sm font-black text-white">后续活动</strong>
                      <span className="text-[10px] font-black text-cyan-300">{groupedSeasonActivities.length} 组</span>
                    </div>
                    <div className="space-y-2">
                      {groupedSeasonActivities.map((group) => {
                        const visibleActivities = group.activities.filter((activity) => activity.id !== currentSeasonActivity?.id);
                        if (visibleActivities.length === 0) return null;
                        return (
                          <div className="space-y-2" key={group.key}>
                            <strong className="block text-[10px] font-black text-slate-500">{group.title}</strong>
                            {visibleActivities.slice(0, 2).map((activity) => (
                              <div className="rounded-2xl border border-white/5 bg-white/5 p-3" key={activity.id}>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <strong className="block truncate text-xs font-black text-white">{activity.name}</strong>
                                    <span className="text-[10px] font-medium text-slate-500">
                                      {activity.score}/{activity.targetScore}
                                      {activity.status === "active" && activity.dailyProgressLimit > 0 ? ` · 今日 ${activity.dailyProgressCount}/${activity.dailyProgressLimit}` : ""}
                                    </span>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-300">
                                    {activity.rewardClaimed ? "已完成" : activity.status === "active" && activity.score >= activity.targetScore ? "可领奖" : activity.status === "active" ? "进行中" : activity.status === "upcoming" ? "预告" : "已结束"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {seasonCenter && seasonActivities.length === 0 && <p className="text-xs font-bold text-slate-400">暂无活动配置。</p>}
                    </div>
                  </section>

                  {latestActivityRecaps.length > 0 && (
                    <section className="activity-glass mb-4 rounded-3xl p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <strong className="block text-sm font-black text-white">活动回顾</strong>
                        <span className="text-[10px] font-black text-amber-300">{latestActivityRecaps.length} 场</span>
                      </div>
                      <div className="space-y-2">
                        {latestActivityRecaps.map((recap) => (
                          <article className="rounded-2xl border border-white/5 bg-white/5 p-3" key={recap.activityId}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <strong className="block truncate text-xs font-black text-white">{recap.name}</strong>
                                <span className="text-[10px] font-medium text-slate-500">{recap.endDate} · {recap.isSettled ? "已结算" : "待结算"}</span>
                              </div>
                              <span className="shrink-0 text-[10px] font-black text-amber-300">
                                {recap.personalRank === null ? "未上榜" : `第 ${recap.personalRank} 名`}
                              </span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="activity-glass mb-4 rounded-3xl border-cyan-400/20 p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block text-sm font-black text-white">赛季任务</strong>
                        <span className="text-[11px] font-medium text-slate-500">{primarySeasonTask?.description ?? "推进经营动作获得赛季积分"}</span>
                      </div>
                      <span className="shrink-0 text-[10px] font-black text-cyan-300">{primarySeasonTask ? `${primarySeasonTask.progress}/${primarySeasonTask.target}` : "0/0"}</span>
                    </div>
                    <button className="activity-tech-gradient w-full rounded-xl py-2 text-xs font-black text-white disabled:opacity-45" disabled={!primarySeasonTask || primarySeasonTask.isClaimed} type="button" onClick={() => primarySeasonTask && void progressSeasonTask(primarySeasonTask.id)}>
                      {primarySeasonTask?.isClaimed ? "任务已完成" : "推进赛季任务"}
                    </button>
                  </section>

                  <section className="activity-glass rounded-3xl p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block text-sm font-black text-white">{primaryScenario?.name ?? "经营剧本"}</strong>
                        <span className="text-[11px] font-medium text-slate-500">{primaryScenario?.summary ?? "按经营选择结算评分和奖励。"}</span>
                      </div>
                      <span className="text-[10px] font-black text-amber-300">{scenarioRun?.grade ?? primaryScenario?.bestScore ?? "-"}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button className="rounded-xl border border-white/10 py-2 text-xs font-black text-white disabled:opacity-45" disabled={!primaryScenario || scenarioRun?.score !== null && scenarioRun !== null} type="button" onClick={() => primaryScenario && void startSeasonScenario(primaryScenario.id)}>
                        启动剧本
                      </button>
                      <button className="activity-gold-gradient rounded-xl py-2 text-xs font-black text-black disabled:opacity-45" disabled={!scenarioRun || scenarioRun.score !== null} type="button" onClick={() => void settleSeasonScenario()}>
                        结算剧本
                      </button>
                    </div>
                  </section>
                  {!seasonCenter && <p className="activity-glass mt-4 rounded-3xl p-4 text-xs font-bold text-slate-300">暂无赛季活动。</p>}
                </div>
              )}

              {activeActivityView === "shop" && (
                <div className="activity-slide-up relative z-10 flex flex-1 flex-col overflow-hidden">
                  <header className="flex items-center justify-between border-b border-white/5 px-6 pb-4 pt-12">
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5" type="button" aria-label="返回活动首页" onClick={() => setActiveActivityView("main")}>
                      <Icon name="chevron-left" className="h-5 w-5" />
                    </button>
                    <h2 className="text-sm font-black tracking-[0.22em] text-white">赛季商店</h2>
                    <div className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5">
                      <Icon name="gem" className="h-3 w-3 text-cyan-300" />
                      <span className="text-xs font-black text-cyan-300 tabular-nums">{compactNumber(seasonPoints)}</span>
                    </div>
                  </header>
                  <div className="flex-1 overflow-y-auto px-6 pb-12 pt-6 scroll-hide">
                    <p className="mb-4 text-[11px] font-medium text-slate-500">当前 {seasonPoints} 积分 · {exchangeableActivityShopItems.length} 项可兑换。点击道具查看用途。</p>
                    <div className="grid grid-cols-2 gap-4">
                      {activityShopItems.map((item) => {
                        const missingPoints = Math.max(0, item.costPoints - seasonPoints);
                        return (
                          <button className={`rounded-3xl border p-4 text-left transition-all active:scale-95 ${item.isAvailable ? "border-cyan-400/30 bg-cyan-400/10" : "border-white/5 bg-white/5"}`} key={item.id} type="button" onClick={() => setSelectedActivityShopItemId(item.id)}>
                            <span className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-3">
                              <span className={`absolute inset-0 ${item.isAvailable ? "bg-gradient-to-br from-cyan-400/20 to-violet-500/10" : "bg-white/5"}`} />
                              <Icon name={item.isAvailable ? "package-open" : "lock"} className={`relative h-10 w-10 ${item.isAvailable ? "text-cyan-300" : "text-slate-600"}`} />
                              <span className="absolute bottom-1 right-1 rounded bg-cyan-400/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">经营</span>
                            </span>
                            <strong className="block truncate text-xs font-black text-white">{item.name}</strong>
                            <span className="mt-2 flex items-center gap-1.5 text-xs font-black text-cyan-300">
                              <Icon name="gem" className="h-3 w-3" />
                              {item.costPoints} 分
                            </span>
                            <small className={`mt-1 block text-[10px] font-bold ${item.isAvailable ? "text-amber-300" : "text-slate-500"}`}>
                              {item.isAvailable ? "可兑换" : item.lockedReason ?? `还差 ${missingPoints} 分`}
                            </small>
                          </button>
                        );
                      })}
                    </div>
                    {seasonCenter && activityShopItems.length === 0 && <p className="activity-glass rounded-3xl p-4 text-xs font-bold text-slate-400">活动商店暂未配置商品。</p>}
                  </div>
                </div>
              )}

              {activeActivityView === "leaderboard" && (
                <div className="activity-slide-up relative z-10 flex flex-1 flex-col overflow-hidden">
                  <header className="flex items-center justify-between border-b border-white/5 px-6 pb-4 pt-12">
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5" type="button" aria-label="返回活动首页" onClick={() => setActiveActivityView("main")}>
                      <Icon name="chevron-left" className="h-5 w-5" />
                    </button>
                    <h2 className="text-sm font-black tracking-[0.3em] text-white">荣誉榜单</h2>
                    <div className="w-10" />
                  </header>
                  <div className="flex-1 overflow-y-auto px-6 pb-24 pt-12 scroll-hide">
                    {primaryActivityBoard ? (
                      <>
                        <div className="mb-14 flex items-end justify-between px-2">
                          {primaryActivityBoard.rows.slice(0, 3).map((row) => (
                            <div className={`flex flex-col items-center gap-3 ${row.rank === 1 ? "w-[100px] -translate-y-6" : "w-[80px]"}`} key={row.profileId}>
                              <div className="relative">
                                {row.rank === 1 && <Icon name="crown" className="absolute -top-10 left-1/2 h-8 w-8 -translate-x-1/2 animate-bounce text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />}
                                <div className={`${row.rank === 1 ? "activity-podium-1 h-24 w-24 p-1.5" : row.rank === 2 ? "activity-podium-2 h-16 w-16 p-1" : "activity-podium-3 h-16 w-16 p-1"} overflow-hidden rounded-full bg-slate-950`}>
                                  <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-lg font-black text-white">{row.founderName.slice(0, 1)}</span>
                                </div>
                                <span className={`absolute -right-1 -top-1 flex rounded-xl text-black shadow-lg ${row.rank === 1 ? "h-8 w-8 bg-amber-400 text-[12px]" : row.rank === 2 ? "h-6 w-6 bg-slate-300 text-[10px]" : "h-6 w-6 bg-amber-800 text-[10px] text-white"} items-center justify-center rotate-12 font-black`}>
                                  {row.rank}
                                </span>
                              </div>
                              <div className="w-full text-center">
                                <p className="truncate text-[11px] font-black text-white">{row.companyName}</p>
                                <p className={`mt-0.5 text-[10px] font-bold ${row.rank === 1 ? "text-amber-300" : "text-slate-500"}`}>{row.valueLabel}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          {primaryActivityBoard.rows.slice(3, 6).map((row) => (
                            <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4" key={row.profileId}>
                              <span className="w-6 text-sm font-black text-slate-500">#{row.rank}</span>
                              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xs font-black text-white">{row.founderName.slice(0, 1)}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-black text-white">{row.founderName} · {row.companyName}</p>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-500">{row.equippedTitle ?? "活动称号待争夺"}</p>
                              </div>
                              <div className="text-[11px] font-black text-slate-400">{row.valueLabel}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="activity-glass rounded-3xl p-5 text-xs font-bold text-slate-400">活动榜未开启。</p>
                    )}
                  </div>
                </div>
              )}

              {activeActivityView === "buffs" && (
                <div className="activity-slide-up relative z-10 flex flex-1 flex-col overflow-hidden">
                  <header className="flex items-center justify-between border-b border-white/5 px-6 pb-4 pt-12">
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5" type="button" aria-label="返回活动首页" onClick={() => setActiveActivityView("main")}>
                      <Icon name="chevron-left" className="h-5 w-5" />
                    </button>
                    <h2 className="text-sm font-black text-white">通行证收益</h2>
                    <div className="w-10" />
                  </header>
                  <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-24 pt-6 scroll-hide">
                    <section className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-5">
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl" />
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                            <Icon name="zap" className="h-6 w-6 text-white" />
                          </span>
                          <div>
                            <p className="text-sm font-black text-white">赛季收益加速</p>
                            <p className="text-[10px] font-bold text-cyan-300">{seasonCenter?.season.pass.isPurchased ? "已开启" : "查看后可开通"}</p>
                          </div>
                        </div>
                        <span className="rounded-lg bg-cyan-400 px-2 py-1 text-[11px] font-black text-black">赛季</span>
                      </div>
                      <p className="mb-4 text-xs font-bold leading-5 text-slate-400">{passBenefitCopy}</p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div className="activity-shimmer h-full w-1/2 rounded-full bg-cyan-400" />
                      </div>
                    </section>
                    <section className="rounded-3xl border border-white/5 bg-white/5 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800">
                            <Icon name="gift" className="h-6 w-6 text-amber-300" />
                          </span>
                          <div>
                            <p className="text-sm font-black text-white">开通即得</p>
                            <p className="text-[10px] font-black tracking-[0.18em] text-slate-500">立即奖励</p>
                          </div>
                        </div>
                        <button className="rounded-xl border border-cyan-400/40 px-3 py-2 text-[10px] font-black text-cyan-300" type="button" onClick={() => openHomePanel("通行证")}>
                          查看通行证
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {passImmediateRewards.map((reward) => (
                          <span className="rounded-xl bg-slate-950/60 px-2 py-2 text-center text-[10px] font-bold text-amber-200" key={reward}>{reward}</span>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              )}

              {activeActivityView === "main" && (
                <button className="activity-glass relative z-20 mx-auto mb-2 flex w-[280px] shrink-0 items-center justify-between rounded-full border-white/10 px-5 py-2.5 shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all" type="button" onClick={() => currentActivityClaimable && currentSeasonActivity ? void claimSeasonActivity(currentSeasonActivity.id) : setActiveActivityView("shop")}>
                  <span className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400 shadow-[0_0_10px_#F59E0B]" />
                    <span className="text-xs font-black text-white">{currentActivityClaimable ? "领取赛季奖励" : "去活动商店"}</span>
                  </span>
                  <Icon name="award" className="h-6 w-6 text-amber-400" />
                </button>
              )}

              {selectedActivityShopItem && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 px-6 backdrop-blur-sm" onClick={() => setSelectedActivityShopItemId("")}>
                  <section className="activity-glass activity-slide-up w-full rounded-[2.5rem] border-cyan-400/40 p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)]" onClick={(event) => event.stopPropagation()}>
                    <div className="mb-4 flex justify-end">
                      <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition-transform active:scale-90" type="button" aria-label="关闭道具详情" onClick={() => setSelectedActivityShopItemId("")}>
                        <Icon name="x" className="h-5 w-5 text-slate-500" />
                      </button>
                    </div>
                    <div className="relative mb-6 flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl bg-slate-950 p-6">
                      <div className="absolute inset-0 bg-gradient-to-t from-cyan-400/10 to-transparent" />
                      <Icon name={selectedActivityShopItem.isAvailable ? "package-open" : "lock"} className="relative h-20 w-20 text-cyan-300" />
                    </div>
                    <h3 className="mb-1 text-2xl font-black tracking-tight text-white">{selectedActivityShopItem.name}</h3>
                    <div className="mb-6 flex items-center gap-2">
                      <span className="text-lg font-black text-cyan-300">{selectedActivityShopItem.costPoints}</span>
                      <Icon name="gem" className="h-4 w-4 text-cyan-300" />
                      <span className="ml-2 text-[10px] font-bold text-slate-600">库存：限时</span>
                    </div>
                    <div className="mb-8 rounded-2xl border border-white/5 bg-white/5 p-5">
                      <p className="mb-2 text-[10px] font-black tracking-[0.16em] text-slate-500">道具效果</p>
                      <p className="text-sm font-bold leading-6 text-slate-200">{selectedActivityShopItem.summary}</p>
                      {selectedActivityShopItem.rewardItem && (
                        <p className="mt-3 text-xs font-black text-amber-300">{selectedActivityShopItem.rewardItem.name} x{selectedActivityShopItem.rewardItem.quantity}</p>
                      )}
                    </div>
                    <button className="activity-tech-gradient w-full rounded-[1.5rem] py-5 text-sm font-black tracking-[0.12em] text-white shadow-[0_15px_30px_rgba(6,182,212,0.3)] transition-all active:scale-95 disabled:opacity-45" disabled={!selectedActivityShopItem.isAvailable} type="button" onClick={() => {
                      const itemId = selectedActivityShopItem.id;
                      setSelectedActivityShopItemId("");
                      void purchaseActivityShopItem(itemId);
                    }}>
                      {selectedActivityShopItem.isAvailable ? "确认兑换" : selectedActivityShopItem.lockedReason ?? `还差 ${Math.max(0, selectedActivityShopItem.costPoints - seasonPoints)} 分`}
                    </button>
                  </section>
                </div>
              )}
            </section>
          )}

          {nativeHomePage === "leaderboard" && (
            <section className="page-container page-active leaderboard-native-shell" aria-label="排行榜" data-testid="native-leaderboard">
              <div className="leaderboard-orb" />
              <header className="leaderboard-native-header">
                <button className="leaderboard-icon-button" type="button" aria-label="关闭排行榜" onClick={closeNativeHomePage}>
                  <Icon name="chevron-left" className="h-6 w-6" />
                </button>
                <div className="text-center">
                  <h2>财富巅峰</h2>
                  <span>商业精英榜</span>
                </div>
                <button className="leaderboard-icon-button" type="button" aria-label="榜单说明" onClick={() => showLeaderboardToast("榜单奖励将通过邮件发放。")}>
                  <Icon name="help-circle" className="h-5 w-5" />
                </button>
              </header>

              <nav className="leaderboard-tabs" aria-label="排行榜分类">
                {[
                  ["server", "本服榜"],
                  ["activity", "活动榜"],
                  ["cross", "跨服榜"]
                ].map(([scope, label]) => (
                  <button
                    className={activeLeaderboardScope === scope ? "is-active" : ""}
                    data-testid={`leaderboard-scope-${scope}`}
                    key={scope}
                    type="button"
                    onClick={() => setActiveLeaderboardScope(scope as LeaderboardScope)}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className="leaderboard-content scroll-hide">
                {(phase14Notice || phase14Error) && (
                  <p className={`rounded-2xl px-4 py-3 text-xs font-bold ${phase14Error ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-100"}`}>
                    {phase14Error || phase14Notice}
                  </p>
                )}

                <section className="leaderboard-podium" aria-label="巅峰席位">
                  {podiumLeaderboardCards.length > 0 ? (
                    <div className="leaderboard-podium-grid">
                      {[podiumLeaderboardCards[1], podiumLeaderboardCards[0], podiumLeaderboardCards[2]].filter((player): player is LeaderboardPlayerCard => Boolean(player)).map((player) => (
                        <button className={`leaderboard-podium-player rank-${player.rank}`} key={player.profileId} type="button" onClick={() => openLeaderboardPlayer(player)}>
                          {player.rank === 1 && <Icon name="crown" className="leaderboard-crown" />}
                          <span className="leaderboard-avatar"><img src={player.avatarUrl} alt="" /></span>
                          <em>{player.rank === 1 ? "NO.1" : player.rank}</em>
                          <strong>{player.founderName}</strong>
                          <span>{player.displayValueLabel}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="leaderboard-empty">暂无上榜玩家。</p>
                  )}
                </section>

                <section className="leaderboard-scroll-list" aria-label="排行榜列表">
                  <div className="space-y-3">
                    {listedLeaderboardCards.map((player) => (
                      <button className="leaderboard-list-item" key={player.profileId} type="button" onClick={() => openLeaderboardPlayer(player)}>
                        <span className="leaderboard-rank-number">{String(player.rank).padStart(2, "0")}</span>
                        <span className="leaderboard-list-avatar"><img src={player.avatarUrl} alt="" /></span>
                        <span className="leaderboard-list-main">
                          <strong>{player.founderName}</strong>
                          <small>{player.companyName}</small>
                        </span>
                        <span className="leaderboard-list-value">
                          <strong>{player.displayValueLabel}</strong>
                          <small>{activeLeaderboardScope === "activity" ? "活动积分" : "商业净值"}</small>
                        </span>
                      </button>
                    ))}
                    {activeLeaderboardCards.length === 0 && <p className="leaderboard-empty">暂无榜单数据。</p>}
                  </div>
                </section>
              </div>

              <footer className="leaderboard-footer">
                <div className="leaderboard-footer-avatar">
                  <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop" alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <p><span>我的排名: {activeLeaderboardScope === "activity" ? activitySelfRow?.rank ?? "-" : activeLeaderboardScope === "cross" ? personalCrossRank : primaryLeaderboardSummary?.selfRank ?? "-"}</span><i>|</i><span>距上一名: {activeLeaderboardScope === "server" ? primaryLeaderboardSummary?.gapLabel ?? "冲进前20" : activeLeaderboardScope === "activity" ? (activitySelfRow ? "继续冲榜" : "未上榜") : crossServerBattleReport?.personal.previousGapLabel ?? "报名后查看"}</span></p>
                  <strong>{profile.founderName || account?.username || "首席执行官"} · 您</strong>
                </div>
                <div className="leaderboard-footer-value">
                  <strong>{activeLeaderboardScope === "activity" ? activitySelfRow === null ? currentActivityProgressLabel : `${activitySelfRow.value}分` : activeLeaderboardScope === "cross" ? crossServerBattleReport?.personal.myValueLabel ?? "-" : compactNumber(profile.valuation)}</strong>
                  <span>{activeLeaderboardScope === "activity" ? "活动积分" : "商业净值"}</span>
                </div>
              </footer>

              {selectedLeaderboardPlayer && (
                <div className="leaderboard-player-modal" role="dialog" aria-modal="true" aria-label="玩家资料">
                  <section>
                    <button className="leaderboard-modal-close" type="button" aria-label="关闭玩家资料" onClick={() => setSelectedLeaderboardPlayer(null)}>
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                    <header>
                      <span className="leaderboard-modal-avatar"><img src={selectedLeaderboardPlayer.avatarUrl} alt="" /></span>
                      <div>
                        <h3>{selectedLeaderboardPlayer.founderName}</h3>
                        <p>{selectedLeaderboardPlayer.companyName}</p>
                        <div>
                          <em>{selectedLeaderboardPlayer.levelLabel}</em>
                          <em>{selectedLeaderboardPlayer.achievementLabel}</em>
                        </div>
                      </div>
                    </header>
                    <div className="leaderboard-modal-stats">
                      <div><span>财富净值</span><strong>{selectedLeaderboardPlayer.displayValueLabel}</strong></div>
                      <div><span>行业地位</span><strong>TOP-TIER</strong></div>
                    </div>
                    <div className="leaderboard-asset-panel">
                      <h4><Icon name="trending-up" className="h-3 w-3" />资产结构分析</h4>
                      {[
                        ["地产资源", selectedLeaderboardPlayer.realAssetPercent, "gold"],
                        ["科技研发", selectedLeaderboardPlayer.techAssetPercent, "blue"],
                        ["金融衍生", selectedLeaderboardPlayer.financeAssetPercent, "purple"]
                      ].map(([label, percent, tone]) => (
                        <div className="leaderboard-asset-row" key={label}>
                          <div><span>{label}</span><strong>{percent}%</strong></div>
                          <span className="leaderboard-asset-bar"><i className={`leaderboard-asset-fill ${tone}`} style={{ width: `${percent}%` }} /></span>
                        </div>
                      ))}
                    </div>
                    <div className="leaderboard-modal-actions">
                      <button type="button" onClick={() => showLeaderboardToast(`已向 ${selectedLeaderboardPlayer.founderName} 发送好友申请。`)}><Icon name="user-plus" className="h-4 w-4" />添加好友</button>
                      <button type="button" onClick={() => showLeaderboardToast("正在建立加密通信频道...")}><Icon name="message-circle" className="h-4 w-4" />私密会谈</button>
                      <button type="button" onClick={() => showLeaderboardToast("商业拜访功能预留。")}>前往商业拜访</button>
                    </div>
                  </section>
                </div>
              )}

              {leaderboardToast && (
                <div className="leaderboard-toast">
                  <Icon name="check" className="h-4 w-4" />
                  <span>{leaderboardToast}</span>
                </div>
              )}
            </section>
          )}

          {nativeHomePage === "cross-server" && (
            <section className="page-container page-active" aria-label="跨服" data-testid="native-cross-server">
              <div className="flex-1 px-4 pb-5 pt-10 overflow-hidden">
                <div className="relative flex h-full flex-col overflow-hidden rounded-[1.7rem] border border-business-gold/30 bg-[#121722]/95 shadow-[0_18px_45px_rgba(0,0,0,0.55)]" data-testid="cross-server-unified-shell">
                  <button className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-business-gold/30 bg-slate-950/80 text-slate-200" data-testid="cross-server-close-button" type="button" aria-label="关闭跨服" onClick={closeNativeHomePage}>
                    <Icon name="x" className="h-5 w-5" />
                  </button>
                  <div className="flex min-w-0 flex-col overflow-hidden" data-testid="cross-server-content-pane">
                    <div className="border-b border-business-gold/20 px-4 pb-3 pt-5">
                      <div className="flex items-start justify-between gap-10">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-business-gold">
                            <Icon name="trophy" className="h-5 w-5" />
                            <span className="text-[10px] font-black">跨服中心</span>
                          </div>
                          <h2 className="mt-1 text-xl font-black text-white">跨服创业赛</h2>
                          <p className="mt-1 truncate text-[10px] leading-5 text-slate-400">{crossServerCenter?.group.name ?? "暂无跨服数据"} · {crossServerCenter?.isRegistered ? "已报名" : "未报名"} · {titleCenter?.equippedTitle?.name ?? "当前荣誉收集中"}</p>
                        </div>
                        <div className="shrink-0 pr-14 text-right">
                          <strong className="block text-lg text-business-gold">{personalCrossRank}</strong>
                          <span className="text-[9px] font-bold text-slate-500">我的排名</span>
                        </div>
                      </div>
                      <nav className="mt-3 flex gap-2 overflow-x-auto scroll-hide" data-testid="cross-server-stage-bar" aria-label="跨服赛事阶段">
                        {[
                          ["season", "赛季"],
                          ["board", "榜单"],
                          ["guild", "商会"],
                          ["rewards", "奖励"],
                          ["history", "战报"]
                        ].map(([mode, label]) => (
                          <button
                            className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black transition-colors ${activeCrossServerMode === mode ? "border-business-gold bg-business-gold text-business-dark shadow-[0_8px_18px_rgba(245,158,11,0.22)]" : "border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/5"}`}
                            key={mode}
                            type="button"
                            onClick={() => setActiveCrossServerMode(mode as CrossServerMode)}
                          >
                            {label}
                          </button>
                        ))}
                      </nav>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-hide">
                {(phase14Notice || phase14Error) && (
                  <p className={`rounded-2xl px-4 py-3 text-xs font-bold ${phase14Error ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-100"}`}>
                    {phase14Error || phase14Notice}
                  </p>
                )}

                <div className="space-y-3" hidden={activeCrossServerMode !== "season"}>
                <section className="rounded-2xl border border-business-gold/25 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <strong className="block text-sm text-white font-black">今日跨服目标</strong>
                      <span className="text-[9px] text-slate-500">完成今日目标，领取跨服声望。</span>
                    </div>
                    <span className="rounded-full bg-business-gold/15 px-2 py-1 text-[9px] font-black text-business-gold">{crossServerCenter?.isRegistered ? "进行中" : "待报名"}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-900/70 p-2"><strong className="block text-sm text-white">{crossServerCenter?.isRegistered ? "已报名" : "待报名"}</strong><span className="text-[9px] text-slate-500">参赛状态</span></div>
                    <div className="rounded-xl bg-slate-900/70 p-2"><strong className="block truncate text-sm text-white">{crossServerCenter?.dailyReward.statusLabel ?? "报名后领取"}</strong><span className="text-[9px] text-slate-500">今日奖励</span></div>
                    <div className="rounded-xl bg-slate-900/70 p-2"><strong className="block text-sm text-white">+{crossServerCenter?.dailyReward.rewardReputation ?? 30}</strong><span className="text-[9px] text-slate-500">声望奖励</span></div>
                  </div>
                  <p className="mt-3 rounded-xl bg-slate-900/60 px-3 py-2 text-[10px] leading-5 text-slate-300 font-bold">
                    今日任务：{crossServerCenter?.dailyGoals.find((goal) => goal.id === "cross-daily-reward")?.statusLabel ?? todayGoalSection?.goals[0]?.statusLabel ?? "推进经营目标"} · 待领奖励 {longTermGoals?.summaries.todayClaimableCount ?? 0}
                  </p>
                </section>

                <section className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-white font-black">跨服进度</strong>
                    <span className="text-[9px] text-business-gold">{crossServerCenter?.seasonProgress.statusLabel ?? "0/3 目标完成"}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-900/70 p-2"><strong className="block text-sm text-white">{crossServerCenter?.seasonProgress.progressPercent ?? 0}%</strong><span className="text-[9px] text-slate-500">目标完成</span></div>
                    <div className="rounded-xl bg-slate-900/70 p-2"><strong className="block text-sm text-white">{crossServerCenter?.seasonProgress.completedGoals ?? 0}</strong><span className="text-[9px] text-slate-500">已完成</span></div>
                    <div className="rounded-xl bg-slate-900/70 p-2"><strong className="block text-sm text-white">{crossServerCenter?.seasonProgress.targetGoals ?? 3}</strong><span className="text-[9px] text-slate-500">今日目标</span></div>
                  </div>
                </section>

                <section className="rounded-2xl border border-business-gold/20 bg-slate-950/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-white font-black">下一奖励</strong>
                    <span className="text-[9px] text-business-gold">下一档</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-900/70 p-2"><strong className="block truncate text-sm text-white">{crossServerCenter?.nextReward.title ?? "今日奖励"}</strong><span className="text-[9px] text-slate-500">奖励</span></div>
                    <div className="rounded-xl bg-slate-900/70 p-2"><strong className="block truncate text-sm text-white">{crossServerCenter?.nextReward.statusLabel ?? "待领取"}</strong><span className="text-[9px] text-slate-500">状态</span></div>
                    <div className="rounded-xl bg-slate-900/70 p-2"><strong className="block truncate text-sm text-white">{crossServerCenter?.nextReward.rewardLabel ?? "声望 +30"}</strong><span className="text-[9px] text-slate-500">内容</span></div>
                  </div>
                  <p className="mt-3 rounded-xl bg-slate-900/60 px-3 py-2 text-[10px] leading-5 text-slate-300 font-bold">
                    {crossServerCenter?.nextReward.conditionLabel ?? "完成今日跨服目标"}
                  </p>
                  <button
                    className="mt-3 w-full btn-gold rounded-xl py-2 text-[11px] font-black text-business-dark disabled:opacity-45"
                    disabled={!crossServerCenter?.dailyReward.canClaim}
                    type="button"
                    onClick={() => void claimCrossServerDailyReward()}
                  >
                    {crossServerCenter?.dailyReward.actionLabel ?? (crossServerCenter?.dailyReward.isClaimed ? "今日已领取" : "领取今日奖励")}
                  </button>
                </section>

                <section className="rounded-2xl border border-business-gold/20 bg-business-gold/10 p-4">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-white font-black">冲榜助力</strong>
                    <span className="text-[9px] text-business-gold">{guildCenter?.todayCollaborationCount ?? 0} 次协作</span>
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-slate-300 font-bold">行动力、通行证、VIP 和商会协作提升经营效率，不直接购买排名。</p>
                </section>
                </div>

                <section className="glass-panel rounded-3xl p-4" data-testid="cross-server-personal-board" hidden={activeCrossServerMode !== "board"}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <strong className="block text-sm text-white font-black">跨服创业大赛</strong>
                      <span className="text-[9px] text-slate-500">{crossServerCenter?.group.ruleLabel ?? "暂无跨服数据"}</span>
                    </div>
                    <span className="text-[10px] text-business-gold">{crossServerCenter?.isRegistered ? "已报名" : "未报名"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-slate-900/60 p-2">
                      <strong className="block text-sm text-white">{primaryCrossLeaderboard?.rows.find((row) => row.profileId === profile.id)?.rank ?? "-"}</strong>
                      <span className="text-[9px] text-slate-500">我的排名</span>
                    </div>
                    <div className="rounded-2xl bg-slate-900/60 p-2">
                      <strong className="block truncate text-sm text-white">{crossServerBattleReport?.personal.championName ?? "-"}</strong>
                      <span className="text-[9px] text-slate-500">榜首</span>
                    </div>
                    <div className="rounded-2xl bg-slate-900/60 p-2">
                      <strong className="block truncate text-sm text-white">{crossServerBattleReport?.personal.rewardStatus ?? "待结算"}</strong>
                      <span className="text-[9px] text-slate-500">奖励状态</span>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-2xl bg-slate-900/60 p-2"><strong className="block truncate text-[11px] text-white">{crossServerBattleReport?.personal.previousGapLabel ?? "赛前情报"}</strong><span className="text-[9px] text-slate-500">距上一名</span></div>
                    <div className="rounded-2xl bg-slate-900/60 p-2"><strong className="block truncate text-[11px] text-white">{crossServerBattleReport?.personal.nextGapLabel ?? "保持优势"}</strong><span className="text-[9px] text-slate-500">领先下一名</span></div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(primaryCrossLeaderboard?.rows ?? []).slice(0, 3).map((row) => (
                      <article className={`rounded-2xl border p-3 flex items-center gap-3 ${row.rank === 1 ? "border-business-gold/30 bg-business-gold/10" : "border-white/5 bg-slate-900/60"}`} key={row.profileId}>
                        <span className="w-7 text-center text-business-gold font-black italic">{row.rank}</span>
                        <div className="flex-1 min-w-0">
                          <strong className="block text-xs text-white font-black truncate">{row.founderName} · {row.companyName}</strong>
                          <span className="text-[9px] text-slate-500">{row.equippedTitle ?? "跨服称号待争夺"}</span>
                        </div>
                        <span className="text-[10px] text-business-gold font-black">{row.valueLabel}</span>
                      </article>
                    ))}
                    {(primaryCrossLeaderboard?.rows.length ?? 0) === 0 && <p className="rounded-2xl bg-slate-900/60 px-3 py-3 text-[10px] text-slate-500 font-bold">暂无跨服数据。</p>}
                  </div>
                  <p className="mt-3 rounded-2xl bg-slate-900/60 px-3 py-2 text-[10px] leading-5 text-emerald-200 font-bold">
                    奖励通过邮件发放。
                  </p>
                </section>

                <section className="glass-panel rounded-3xl p-4" data-testid="cross-server-guild-season" hidden={activeCrossServerMode !== "guild"}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <strong className="block text-sm text-white font-black">跨服商会赛季</strong>
                      <span className="text-[9px] text-slate-500">{crossServerCenter?.guildSeason.guildName ?? "加入商会后参与"}</span>
                    </div>
                    <span className="shrink-0 rounded-full bg-business-gold/15 px-2 py-1 text-[9px] font-black text-business-gold">
                      {crossServerCenter?.guildSeason.statusLabel ?? "读取中"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-slate-900/60 p-2">
                      <strong className="block text-sm text-white">{crossServerCenter?.guildSeason.memberCount ?? 0}/{crossServerCenter?.guildSeason.minMembers ?? 2}</strong>
                      <span className="text-[9px] text-slate-500">成员</span>
                    </div>
                    <div className="rounded-2xl bg-slate-900/60 p-2">
                      <strong className="block text-sm text-white">{crossServerCenter?.guildSeason.todayActiveMemberCount ?? 0}/{crossServerCenter?.guildSeason.minTodayActiveMembers ?? 2}</strong>
                      <span className="text-[9px] text-slate-500">活跃</span>
                    </div>
                    <div className="rounded-2xl bg-slate-900/60 p-2">
                      <strong className="block text-sm text-white">{currentCrossGuildRank}</strong>
                      <span className="text-[9px] text-slate-500">排名</span>
                    </div>
                  </div>
                  <p className="mt-3 rounded-2xl bg-slate-900/60 px-3 py-2 text-[10px] leading-5 text-emerald-200 font-bold">
                    {crossServerCenter?.guildSeason.rewardLabel ?? "前 3 名会长获得声望奖励"} · 普通成员贡献计入商会排名。
                  </p>
                  <div className="mt-3 space-y-2">
                    {(crossServerCenter?.guildBoard.rows ?? []).slice(0, 3).map((row) => (
                      <article className="rounded-2xl bg-slate-900/60 border border-white/5 p-3 flex items-center gap-3" key={row.guildId}>
                        <span className="w-6 text-center text-business-gold font-black italic">{row.rank}</span>
                        <div className="flex-1 min-w-0">
                          <strong className="block text-xs text-white font-black truncate">{row.guildName}</strong>
                          <span className="text-[9px] text-slate-500">会长 {row.leaderFounderName} · {row.memberCount} 人</span>
                        </div>
                        <span className="text-[10px] text-business-gold font-black">{row.valueLabel}</span>
                      </article>
                    ))}
                    {(crossServerCenter?.guildBoard.rows.length ?? 0) === 0 && (
                      <p className="rounded-2xl bg-slate-900/60 px-3 py-3 text-[10px] text-slate-500 font-bold">暂无已报名商会。</p>
                    )}
                  </div>
                </section>

                <section className="glass-panel rounded-3xl p-4" aria-label="跨服战报" data-testid="cross-server-battle-report" hidden={activeCrossServerMode !== "history"}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <strong className="block text-sm text-white font-black">赛果回放</strong>
                      <span className="text-[9px] text-slate-500">{crossServerBattleReport?.snapshotDate ?? "跨服赛季结算后生成战报"}</span>
                    </div>
                    <span className="rounded-full bg-business-gold/15 px-2 py-1 text-[9px] font-black text-business-gold">{crossServerBattleReport?.personal.rewardStatus ?? "赛前情报"}</span>
                  </div>
                  <p className="mt-3 rounded-2xl bg-slate-900/60 px-3 py-2 text-[10px] leading-5 text-slate-300 font-bold">赛果摘要：个人排名、商会表现和奖励去向已汇总。</p>
                  <div className="mt-3 space-y-2">
                    {(crossServerBattleReport?.lines.length ?? 0) === 0 ? (
                      <p className="rounded-2xl bg-slate-900/60 px-3 py-3 text-[10px] text-slate-500 font-bold">赛前情报将在跨服数据生成后显示。</p>
                    ) : (
                      crossServerBattleReport?.lines.slice(0, 5).map((line) => (
                        <p className="rounded-2xl bg-slate-900/60 px-3 py-2 text-[10px] leading-5 text-slate-300 font-bold" key={line}>{line}</p>
                      ))
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-slate-950/70 p-3">
                      <span className="text-[9px] text-slate-500">个人对比</span>
                      <strong className="mt-1 block text-sm text-white">{crossServerBattleReport?.personal.myRank ?? "-"}</strong>
                      <span className="mt-1 block text-[9px] text-business-gold">{crossServerBattleReport?.personal.myValueLabel ?? "暂无跨服数据"}</span>
                      <span className="mt-1 block text-[9px] text-slate-500">{crossServerBattleReport?.personal.previousGapLabel ?? "赛前情报"}</span>
                      <span className="mt-1 block text-[9px] text-slate-500">{crossServerBattleReport?.personal.nextGapLabel ?? "保持优势"}</span>
                      <span className="mt-1 block text-[9px] text-business-gold">{crossServerBattleReport?.personal.titleStatus ?? "称号待争夺"}</span>
                    </div>
                    <div className="rounded-2xl bg-slate-950/70 p-3">
                      <span className="text-[9px] text-slate-500">商会对比</span>
                      <strong className="mt-1 block text-sm text-white">{crossServerBattleReport?.guild.myGuildRank ?? "-"}</strong>
                      <span className="mt-1 block text-[9px] text-white">{crossServerBattleReport?.guild.topGuildName ?? "榜首商会待定"}</span>
                      <span className="mt-1 block text-[9px] text-business-gold">{crossServerBattleReport?.guild.myGuildValueLabel ?? "暂无商会排名"}</span>
                      <span className="mt-1 block text-[9px] text-slate-500">{crossServerBattleReport?.guild.activeProgressLabel ?? "加入商会后参与"}</span>
                      <span className="mt-1 block text-[9px] text-business-gold">{crossServerBattleReport?.guild.rewardStatus ?? "待结算"}</span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-business-gold/20 bg-business-gold/10 px-3 py-2">
                    <strong className="block text-[10px] text-white">奖励去向</strong>
                    <span className="mt-1 block text-[10px] leading-5 text-business-gold font-bold">奖励通过邮件发放。</span>
                  </div>
                  {latestCrossGuildSettlement !== null && (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-slate-950/70 p-2"><strong className="block text-sm text-white">{latestCrossGuildSettlement.finalRank ?? "-"}</strong><span className="text-[9px] text-slate-500">最终名次</span></div>
                      <div className="rounded-xl bg-slate-950/70 p-2"><strong className="block text-sm text-white">{latestCrossGuildSettlement.deliveredRewards}</strong><span className="text-[9px] text-slate-500">发放</span></div>
                      <div className="rounded-xl bg-slate-950/70 p-2"><strong className="block text-sm text-white">{latestCrossGuildSettlement.snapshotDate.slice(5)}</strong><span className="text-[9px] text-slate-500">赛季日</span></div>
                    </div>
                  )}
                </section>

                <section className="glass-panel rounded-3xl p-4" aria-label="奖励规则" hidden={activeCrossServerMode !== "rewards"}>
                  <strong className="text-sm text-white font-black">奖励规则</strong>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-950/70 p-2"><strong className="block text-sm text-white">参与奖励</strong><span className="text-[9px] text-slate-500">声望 +30</span></div>
                    <div className="rounded-xl bg-slate-950/70 p-2"><strong className="block text-sm text-white">阶段奖励</strong><span className="text-[9px] text-slate-500">三日目标</span></div>
                    <div className="rounded-xl bg-slate-950/70 p-2"><strong className="block text-sm text-white">排名奖励</strong><span className="text-[9px] text-slate-500">180/120/80</span></div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(crossServerCenter?.stageRewards ?? []).map((reward) => (
                      <article className="rounded-2xl border border-white/5 bg-slate-950/70 p-3" key={reward.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <strong className="block truncate text-xs font-black text-white">{reward.title}</strong>
                            <span className="text-[9px] text-slate-500">{reward.currentDailyClaims}/{reward.requiredDailyClaims} 今日目标 · 声望 +{reward.rewardReputation}</span>
                          </div>
                          <span className="shrink-0 rounded-full bg-business-gold/15 px-2 py-1 text-[9px] font-black text-business-gold">{reward.statusLabel}</span>
                        </div>
                        <button
                          className="mt-2 w-full rounded-xl border border-business-gold/40 py-2 text-[10px] font-black text-business-gold disabled:opacity-45"
                          disabled={!reward.isClaimable}
                          type="button"
                          onClick={() => void claimCrossServerStageReward(reward.id)}
                        >
                          {reward.isClaimed ? "阶段已领取" : "领取阶段奖励"}
                        </button>
                      </article>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-slate-400 font-bold">奖励通过邮件发放，结算后查看邮件。</p>
                </section>
                    </div>
                    <div className="border-t border-business-gold/20 bg-slate-950/55 p-3" data-testid="cross-server-action-bar">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    className="btn-gold py-2 rounded-xl text-[10px] font-black text-business-dark disabled:opacity-45"
                    data-testid="cross-server-register-button"
                    disabled={crossServerCenter?.isRegistered}
                    type="button"
                    onClick={() => void registerCrossServer()}
                  >
                    {crossServerCenter?.isRegistered ? "已报名" : "报名跨服"}
                  </button>
                  <button className="rounded-xl border border-business-gold/40 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => void settleCrossServer()}>
                    结算跨服
                  </button>
                  <button
                    className="rounded-xl border border-business-gold/40 py-2 text-[10px] font-black text-business-gold disabled:opacity-45"
                    data-testid="cross-server-guild-register-button"
                    disabled={!crossServerCenter?.guildSeason.canRegister || crossServerCenter.guildSeason.isRegistered}
                    type="button"
                    onClick={() => void registerCrossServerGuild()}
                  >
                    {crossServerCenter?.guildSeason.isRegistered ? "商会已报名" : "报名商会赛季"}
                  </button>
                </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {nativeHomePage === "guild" && (
            <section className="page-container page-active" aria-label="商会" data-testid="native-guild">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="building-2" className="w-7 h-7 text-business-gold" />
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase">Guild 商会</h2>
                    <span className="text-[10px] text-slate-500">{guildCenter?.guild?.name ?? "加入后解锁成员互助"}</span>
                  </div>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭商会" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 scroll-hide">
                {guildCenter?.guild ? (
                  <>
                    <section className="glass-panel rounded-3xl p-5 border-business-gold/40 bg-gradient-to-br from-business-gold/15 to-slate-950">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] text-business-gold font-black uppercase">本服商会</div>
                          <h3 className="mt-1 text-2xl font-black text-white">{guildCenter.guild.name}</h3>
                          <p className="mt-1 text-xs text-slate-400 font-bold">成员互助 · 任务贡献 · 科技加成</p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button className="btn-gold px-4 py-2 rounded-xl text-xs font-black text-business-dark" type="button" onClick={() => void requestGuildHelp()}>
                            发布互助
                          </button>
                          <button className="rounded-xl bg-slate-900/80 border border-business-gold/30 px-4 py-2 text-xs font-black text-business-gold" type="button" onClick={() => void settleGuildLeaderboard()}>
                            结算贡献榜
                          </button>
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-5 gap-2 text-center">
                        <div className="rounded-2xl bg-slate-900/60 p-3"><strong className="block text-lg text-white">{guildCenter.guild.level}</strong><span className="text-[9px] text-slate-500">等级</span></div>
                        <div className="rounded-2xl bg-slate-900/60 p-3"><strong className="block text-lg text-white">{guildCenter.members.length}</strong><span className="text-[9px] text-slate-500">成员</span></div>
                        <div className="rounded-2xl bg-slate-900/60 p-3"><strong className="block text-lg text-white">{guildCenter.guild.contributionScore}</strong><span className="text-[9px] text-slate-500">贡献</span></div>
                        <div className="rounded-2xl bg-slate-900/60 p-3"><strong className="block text-lg text-white">{guildCenter.todayActiveMemberCount}</strong><span className="text-[9px] text-slate-500">活跃</span></div>
                        <div className="rounded-2xl bg-slate-900/60 p-3"><strong className="block text-lg text-white">{guildCenter.todayCollaborationCount}</strong><span className="text-[9px] text-slate-500">协作</span></div>
                      </div>
                    </section>
                    <section className="glass-panel rounded-3xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <strong className="text-sm text-white font-black">历史荣誉</strong>
                        <span className="text-[10px] text-business-gold">{latestGuildSettlement?.snapshotDate ?? "待结算"}</span>
                      </div>
                      {latestGuildSettlement === null ? (
                        <p className="rounded-2xl bg-slate-900/60 px-3 py-3 text-[10px] text-slate-500 font-bold">贡献榜结算后生成商会历史荣誉。</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-2xl bg-slate-900/60 p-3"><strong className="block text-lg text-white">{latestGuildSettlement.deliveredRewards}</strong><span className="text-[9px] text-slate-500">奖励发放</span></div>
                            <div className="rounded-2xl bg-slate-900/60 p-3"><strong className="block text-lg text-white">{guildHistory?.currentTopMembers[0]?.contributionScore ?? 0}</strong><span className="text-[9px] text-slate-500">当前最高贡献</span></div>
                          </div>
                          {latestGuildSettlement.topMembers.slice(0, 3).map((member) => (
                            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900/60 px-3 py-2" key={`${member.profileId}:${member.rank}`}>
                              <div className="min-w-0">
                                <strong className="block text-xs text-white truncate">#{member.rank} {member.founderName}</strong>
                                <span className="text-[9px] text-slate-500 truncate">{member.companyName}</span>
                              </div>
                              <span className="shrink-0 text-[10px] text-business-gold font-black">声望 +{member.reputationReward}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                    <section className="glass-panel rounded-3xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <strong className="text-sm text-white font-black">公告与规则</strong>
                        <span className="text-[10px] text-business-gold">{canReviewGuildApplications ? "可编辑" : "成员可见"}</span>
                      </div>
                      {canReviewGuildApplications ? (
                        <div className="space-y-3">
                          <label className="block">
                            <span className="mb-1 block text-[9px] text-slate-500 font-black">商会公告</span>
                            <textarea
                              className="w-full min-h-20 resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs leading-5 text-white outline-none focus:border-business-gold/60"
                              maxLength={240}
                              value={guildAnnouncementDraft}
                              onChange={(event) => setGuildAnnouncementDraft(event.target.value)}
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[9px] text-slate-500 font-black">协作规则</span>
                            <textarea
                              className="w-full min-h-20 resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs leading-5 text-white outline-none focus:border-business-gold/60"
                              maxLength={240}
                              value={guildRulesDraft}
                              onChange={(event) => setGuildRulesDraft(event.target.value)}
                            />
                          </label>
                          <button className="w-full btn-gold rounded-xl py-2 text-[10px] font-black text-business-dark" type="button" onClick={() => void updateGuildSettings()}>
                            保存公告
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="rounded-2xl bg-slate-900/60 px-3 py-3 text-[10px] leading-5 text-slate-300 font-bold">{guildAnnouncement}</p>
                          <p className="rounded-2xl bg-slate-900/60 px-3 py-3 text-[10px] leading-5 text-slate-400 font-bold">{guildRules}</p>
                        </div>
                      )}
                    </section>
                    <section className="glass-panel rounded-3xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <strong className="text-sm text-white font-black">最近动态</strong>
                        <span className="text-[10px] text-slate-500">{guildCenter.recentActivities.length} 条</span>
                      </div>
                      <div className="space-y-2">
                        {guildCenter.recentActivities.length === 0 && (
                          <p className="rounded-2xl bg-slate-900/60 px-3 py-3 text-[10px] text-slate-500 font-bold">暂无成员动态。</p>
                        )}
                        {guildCenter.recentActivities.slice(0, 5).map((activity) => (
                          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900/60 px-3 py-2" key={activity.id}>
                            <div className="min-w-0">
                              <strong className="block text-xs text-white truncate">{activity.founderName}</strong>
                              <span className="text-[9px] text-slate-500">{activity.actionLabel}</span>
                            </div>
                            <span className="shrink-0 text-[9px] text-slate-600">{activity.createdAt.slice(0, 10)}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="glass-panel rounded-3xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <strong className="text-sm text-white font-black">协作项目</strong>
                        <span className="text-[10px] text-business-gold">{guildCenter.projects.length} 项</span>
                      </div>
                      <div className="space-y-2">
                        {guildCenter.projects.slice(0, 3).map((project) => {
                          const progressRate = project.target <= 0 ? 0 : Math.min(100, Math.round((project.progress / project.target) * 100));
                          return (
                            <article className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={project.id}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <strong className="block text-xs text-white font-black">{project.name}</strong>
                                  <p className="mt-1 text-[9px] leading-4 text-slate-500">{project.description}</p>
                                </div>
                                <span className="shrink-0 text-[9px] text-business-gold font-black">{project.progress}/{project.target}</span>
                              </div>
                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/70">
                                <div className="h-full rounded-full bg-business-gold" style={{ width: `${progressRate}%` }} />
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-emerald-200 font-black">{project.rewardLabel}</span>
                                <button
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black ${project.isClaimable ? "btn-gold text-business-dark" : "bg-slate-800 text-slate-500"}`}
                                  disabled={!project.isClaimable}
                                  type="button"
                                  onClick={() => void claimGuildProjectReward(project.id)}
                                >
                                  {project.isClaimed ? "已领取" : project.isClaimable ? "领奖" : "推进中"}
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                    <section className="glass-panel rounded-3xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <strong className="text-sm text-white font-black">互助请求</strong>
                        <span className="text-[10px] text-slate-500">{guildCenter.helpRequests.length} 条</span>
                      </div>
                      <div className="space-y-2">
                        {guildCenter.helpRequests.length === 0 && (
                          <p className="rounded-2xl bg-slate-900/60 px-3 py-3 text-[10px] text-slate-500 font-bold">暂无互助请求。</p>
                        )}
                        {guildCenter.helpRequests.slice(0, 5).map((request) => {
                          const requestTypeLabel = request.requestType === "project-advice"
                            ? "项目建议"
                            : request.requestType === "risk-review"
                              ? "风险复核"
                              : "经营协作";
                          const statusLabel = request.status === "fulfilled" ? "已完成" : request.canFulfill ? "可协助" : "等待成员协助";
                          return (
                            <article className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={request.id}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <strong className="block text-xs text-white font-black">{requestTypeLabel}</strong>
                                  <span className="mt-1 block text-[9px] text-slate-500 truncate">{request.founderName} · {request.companyName}</span>
                                  <span className="mt-1 block text-[9px] text-slate-600">{request.createdAt.slice(0, 10)}</span>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${request.status === "fulfilled" ? "bg-emerald-500/15 text-emerald-200" : "bg-business-gold/15 text-business-gold"}`}>{statusLabel}</span>
                              </div>
                              {request.status === "open" && request.canFulfill && (
                                <button className="mt-3 w-full btn-gold py-2 rounded-xl text-[10px] font-black text-business-dark" type="button" onClick={() => void fulfillGuildHelp(request.id)}>
                                  协助
                                </button>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                    <section className="glass-panel rounded-3xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <strong className="text-sm text-white font-black">商会任务</strong>
                        <span className="text-[10px] text-business-gold">{guildCenter.tasks.length} 项</span>
                      </div>
                      <div className="space-y-2">
                        {guildCenter.tasks.slice(0, 3).map((task) => (
                          <article className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={task.id}>
                            <div className="flex items-center justify-between">
                              <strong className="text-xs text-white font-black">{task.title}</strong>
                              <span className="text-[9px] text-slate-500">{task.progress}/{task.target}</span>
                            </div>
                            <p className="mt-1 text-[9px] text-slate-400">{task.description}</p>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-business-gold font-black">贡献 +{task.contributionReward}</span>
                              <button
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black ${task.isClaimable ? "btn-gold text-business-dark" : "bg-slate-800 text-slate-500"}`}
                                disabled={!task.isClaimable}
                                type="button"
                                onClick={() => void claimGuildTask(task.id)}
                              >
                                {task.isClaimed ? "已领取" : task.isClaimable ? "领取" : "未完成"}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                    <section className="grid grid-cols-2 gap-3">
                      {guildCenter.techs.slice(0, 4).map((tech) => (
                        <article className="glass-panel rounded-2xl p-3" key={tech.id}>
                          <div className="text-[10px] text-business-gold font-black">{tech.name}</div>
                          <strong className="mt-1 block text-sm text-white">Lv.{tech.level}/{tech.maxLevel}</strong>
                          <p className="mt-1 text-[9px] text-slate-500">{tech.description}</p>
                          <p className="mt-2 text-[9px] text-emerald-200 font-bold">{tech.bonusLabel}</p>
                          <button
                            className={`mt-3 w-full rounded-xl py-2 text-[10px] font-black ${tech.isUpgradable ? "btn-gold text-business-dark" : "bg-slate-800 text-slate-500"}`}
                            disabled={!tech.isUpgradable}
                            type="button"
                            onClick={() => void upgradeGuildTech(tech.id)}
                          >
                            {tech.upgradeCost === null ? "已满级" : `升级 ${tech.upgradeCost} 贡献`}
                          </button>
                        </article>
                      ))}
                    </section>
                    <section className="glass-panel rounded-3xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <strong className="text-sm text-white font-black">入会申请</strong>
                        <span className="text-[10px] text-slate-500">{guildCenter.joinRequests.length} 条</span>
                      </div>
                      <div className="space-y-2">
                        {guildCenter.joinRequests.length === 0 && (
                          <p className="rounded-2xl bg-slate-900/60 px-3 py-3 text-[10px] text-slate-500 font-bold">暂无待审核申请。</p>
                        )}
                        {guildCenter.joinRequests.slice(0, 4).map((request) => (
                          <article className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={request.id}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <strong className="block text-xs text-white font-black">{request.founderName}</strong>
                                <span className="mt-1 block text-[9px] text-slate-500 truncate">{request.companyName} · {request.createdAt.slice(0, 10)}</span>
                              </div>
                              <span className="shrink-0 rounded-full bg-business-gold/15 px-2 py-1 text-[9px] font-black text-business-gold">待审核</span>
                            </div>
                            {canReviewGuildApplications && (
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button className="btn-gold rounded-xl py-2 text-[10px] font-black text-business-dark" type="button" onClick={() => void reviewGuildApplication(request.id, "approved")}>
                                  通过
                                </button>
                                <button className="rounded-xl bg-slate-800 py-2 text-[10px] font-black text-slate-300" type="button" onClick={() => void reviewGuildApplication(request.id, "rejected")}>
                                  拒绝
                                </button>
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                    <section className="glass-panel rounded-3xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <strong className="text-sm text-white font-black">成员贡献</strong>
                        <span className="text-[10px] text-slate-500">{guildCenter.members.length} 人</span>
                      </div>
                      <div className="space-y-2">
                        {guildCenter.members.slice(0, 5).map((member) => (
                          <div className="rounded-2xl bg-slate-900/60 px-3 py-2" key={member.profileId}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                              <strong className="block text-xs text-white">{member.founderName}</strong>
                                <span className="text-[9px] text-slate-500 truncate">{member.companyName} · {guildRoleLabel(member.role)}</span>
                              </div>
                              <span className="text-xs text-business-gold font-black">{member.contributionScore}</span>
                            </div>
                            {canManageGuildMembers && member.profileId !== profile.id && member.role === "member" && (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <button className="rounded-xl bg-business-gold/15 py-1.5 text-[9px] font-black text-business-gold" type="button" onClick={() => void updateGuildMemberRole(member.profileId, "vice_leader")}>
                                  任命副会长
                                </button>
                                <button className="rounded-xl bg-red-500/15 py-1.5 text-[9px] font-black text-red-200" type="button" onClick={() => void removeGuildMember(member.profileId)}>
                                  移除成员
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                ) : (
                  <section className="glass-panel rounded-3xl p-5 border-business-gold/40 bg-gradient-to-br from-business-gold/15 to-slate-950">
                    <div className="flex items-center gap-3">
                      <span className="w-14 h-14 bg-business-gold/15 rounded-2xl flex items-center justify-center border border-business-gold/20">
                        <Icon name="building-2" className="w-8 h-8 text-business-gold" />
                      </span>
                      <div className="flex-1">
                        <h3 className="text-lg font-black text-white">加入本服商会</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-400 font-medium">加入后可参与集体投资、商会任务和成员互助。</p>
                      </div>
                    </div>
                    <button className="mt-5 w-full btn-gold py-3 rounded-2xl text-sm font-black text-business-dark" type="button" onClick={() => void joinGuild()}>
                      加入本服商会
                    </button>
                  </section>
                )}
                {(phase14Notice || phase14Error) && (
                  <p className={`rounded-2xl px-4 py-3 text-xs font-bold ${phase14Error ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-100"}`}>
                    {phase14Error || phase14Notice}
                  </p>
                )}
                {!guildCenter && <p className="glass-panel rounded-3xl p-4 text-xs text-slate-300 font-bold">暂无商会数据。</p>}
              </div>
            </section>
          )}

          {nativeHomePage === "shop" && (
            <section className="page-container page-active game-shop-native" aria-label="商城" data-testid="native-shop">
              <header className="game-shop-header">
                <div className="game-shop-wallets" aria-label="商城货币">
                  <span>
                    <Icon name="gem" className="h-3 w-3" />
                    {compactNumber(shopCenter?.wallet.balance ?? profile.platformCoins)}
                  </span>
                  <span>
                    <Icon name="circle-dollar-sign" className="h-3 w-3" />
                    {compactNumber(profile.cash)}
                  </span>
                </div>
                <button className="game-shop-close" type="button" aria-label="关闭商城" onClick={closeNativeHomePage}>
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </header>

              <div className="game-shop-ticker" aria-label="商城公告">
                <span>经营补给上架中 · 平台币可兑换启动资源、猎头道具和风险保障 · 点击商品查看详情</span>
              </div>

              <div className="game-shop-title">
                <h2>商城</h2>
                <p>资源中心 · 经营补给</p>
              </div>

              <nav className="game-shop-tabs" aria-label="商城分类">
                {shopCategoryTabs.map((tab) => (
                  <button
                    className={activeShopCategory === tab.id ? "is-active" : ""}
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveShopCategory(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="game-shop-scroll scroll-hide" id="items-container">
                {visibleCommerceProducts.length > 0 && (
                  <section className="game-shop-section" aria-label="推荐补给">
                    <header>
                      <span><Icon name="shopping-bag" className="h-3 w-3" />推荐补给</span>
                    </header>
                    <div className="game-shop-grid">
                      {visibleCommerceProducts.map((product) => (
                        <article
                          className={`game-shop-card ${getShopProductRarityClass(product.category)} ${product.isAvailable ? "" : "is-locked"}`}
                          key={product.id}
                          onClick={() => {
                            setSelectedShopProductId(product.id);
                            if (account && selectedServer) {
                              reportTelemetry(account.token, selectedServer.id, "shop_product_click", product.id, { category: product.category });
                            }
                          }}
                        >
                          {product.purchaseLimit > 0 && <em>限购</em>}
                          {!product.isAvailable && <strong>{product.lockedReason ?? "已售罄"}</strong>}
                          <span className="game-shop-card-icon">
                            <Icon name={getShopProductIcon(product.category)} className="h-8 w-8" />
                          </span>
                          <b>{product.name}</b>
                          <span className="game-shop-card-price">
                            <Icon name="gem" className="h-3 w-3" />
                            {product.pricePlatformCoins.toLocaleString("zh-CN")}
                          </span>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {shopCenter && visibleCommerceProducts.length === 0 && (
                  <p className="game-shop-empty">当前分类暂无可购买商品。</p>
                )}

                {!shopCenter && (
                  <p className="game-shop-empty">商城暂未开放。</p>
                )}
              </div>

              {selectedShopProduct && (
                <div className="game-shop-detail" role="dialog" aria-modal="true" aria-label="商品详情">
                  <button className="game-shop-detail-backdrop" type="button" aria-label="关闭商品详情" onClick={() => setSelectedShopProductId("")} />
                  <section>
                    <button className="game-shop-detail-close" type="button" aria-label="关闭商品详情" onClick={() => setSelectedShopProductId("")}>
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                    <span className={`game-shop-detail-icon ${getShopProductRarityClass(selectedShopProduct.category)}`}>
                      <Icon name={getShopProductIcon(selectedShopProduct.category)} className="h-10 w-10" />
                    </span>
                    <h3>{selectedShopProduct.name}</h3>
                    <p>{getShopProductSummary(selectedShopProduct.id, selectedShopProduct.summary)}</p>
                    <div className="game-shop-reward-list" aria-label="获得内容">
                      {getShopProductRewardChips(selectedShopProduct).map((chip) => (
                        <span className="game-shop-reward-chip" key={chip}>
                          {chip}
                        </span>
                      ))}
                    </div>
                    <button
                      className="game-shop-buy"
                      type="button"
                      disabled={!selectedShopProduct.isAvailable}
                      onClick={() => void purchaseShopProduct(selectedShopProduct.id)}
                    >
                      <Icon name="gem" className="h-4 w-4" />
                      {selectedShopProduct.lockedReason ?? `${selectedShopProduct.pricePlatformCoins.toLocaleString("zh-CN")} 购买`}
                    </button>
                  </section>
                </div>
              )}

              {(shopNotice || shopError) && (
                <div className={`shop-purchase-popup ${shopError ? "is-error" : "is-success"}`} role="status" aria-live="polite">
                  {shopError || shopNotice}
                </div>
              )}
            </section>
          )}

          {nativeHomePage === "privilege" && (
            <section className="page-container page-active game-privilege-native" aria-label="特权" data-testid="native-privilege">
              <div className="game-privilege-scroll scroll-hide">
                <section className="game-privilege-book" aria-label="今日权益">
                  <button className="game-shop-close game-privilege-close" type="button" aria-label="关闭特权" onClick={closeNativeHomePage}>
                    <Icon name="x" className="h-5 w-5" />
                  </button>
                  <div className="game-privilege-title">
                    <h2>特权中心</h2>
                    <p>每日权益专属领取</p>
                  </div>
                  <div className="game-privilege-ledger">
                    <div className="game-privilege-ledger-copy">
                      <strong>{claimablePrivilegePurchases.length > 0 ? `${claimablePrivilegePurchases.length} 项待领取` : "今日已领完"}</strong>
                      <p>{privilegeNextAction}</p>
                    </div>
                    <em className={claimablePrivilegePurchases.length > 0 ? "is-hot" : ""}>
                      {claimablePrivilegePurchases.length > 0 ? "可领" : "已领完"}
                    </em>
                    <span className="game-privilege-reminder">今日未领作废</span>
                  </div>
                </section>

                <section className="game-privilege-summary" aria-label="已开通权益">
                  <h3>已开通权益</h3>
                  <span>
                    <Icon name="file-text" className="h-4 w-4" />
                    <b>{activePrivilegeProducts.length}</b>
                    生效合约
                  </span>
                  <span className={claimablePrivilegePurchases.length > 0 ? "is-hot" : ""}>
                    <Icon name="gift" className="h-4 w-4" />
                    <b>{claimablePrivilegePurchases.length}</b>
                    今日可领
                  </span>
                  <span>
                    <Icon name="trending-up" className="h-4 w-4" />
                    <b>{privilegeBoostLabel}</b>
                    经营加速
                  </span>
                </section>

                <section className="game-privilege-section" aria-label="权益卡">
                  <header>
                    <span>特权礼包</span>
                  </header>
                  {privilegeProducts.map((product) => {
                    const activePurchase = activePrivilegePurchases.find((purchase) => purchase.productId === product.id);
                    const isPurchased = activePurchase !== undefined;
                    const productRewardChips = getPrivilegeProductRewardChips(product);
                    return (
                      <article className={`game-privilege-card ${getPrivilegeClaimStatusClass(activePurchase)} ${isPurchased ? "is-owned" : "is-unowned"}`} key={product.id}>
                        <i className="game-privilege-ticket-notch is-left" aria-hidden="true" />
                        <i className="game-privilege-ticket-notch is-right" aria-hidden="true" />
                        <div className="game-privilege-card-main">
                          <span className="game-privilege-card-icon">
                            <Icon name={getPrivilegeProductIcon(product.category)} className="h-7 w-7" />
                          </span>
                          <div className="game-privilege-card-copy">
                            <div className="game-privilege-card-title">
                              <strong>{product.name}</strong>
                              <span>{isPurchased ? getPrivilegeClaimStatusLabel(activePurchase) : getPrivilegeProductBenefit(product.category)}</span>
                            </div>
                            <p>{getShopProductSummary(product.id, product.summary)}</p>
                            <div className="game-privilege-rewards" aria-label={getPrivilegeRewardTitle(product)}>
                              <span>{getPrivilegeRewardTitle(product)}</span>
                              {getPrivilegeDailyRewardChips(activePurchase ?? product).map((chip) => (
                                <em key={chip}>{chip}</em>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="game-privilege-card-foot">
                          <span>
                            {isPurchased
                              ? isDailyPrivilegeProduct(product)
                                ? formatPrivilegeExpiresAt(activePurchase.expiresAt)
                                : "长期有效 · 购买即得"
                              : `${getPrivilegeProductFootLabel(product)} · ${productRewardChips[1] ?? `VIP经验 +${product.pricePlatformCoins.toLocaleString("zh-CN")}`}`}
                          </span>
                          <button
                            type="button"
                            disabled={isPurchased ? !activePurchase.isClaimableToday : !product.isAvailable}
                            onClick={() => {
                              if (isPurchased) {
                                void claimPrivilegeDailyReward(activePurchase.id);
                                return;
                              }
                              void purchaseShopProduct(product.id);
                            }}
                          >
                            {isPurchased
                              ? activePurchase.isClaimableToday
                                ? "领取"
                                : getPrivilegeClaimStatusLabel(activePurchase)
                              : product.lockedReason ?? `${product.pricePlatformCoins.toLocaleString("zh-CN")} 开通`}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
                {shopCenter && privilegeProducts.length === 0 && (
                  <p className="game-shop-empty">月卡和成长基金暂未配置。</p>
                )}
                {!shopCenter && (
                  <p className="game-shop-empty">暂无特权配置。</p>
                )}
              </div>
              {(shopNotice || shopError) && (
                <div className={`shop-purchase-popup ${shopError ? "is-error" : "is-success"}`} role="status" aria-live="polite">
                  {shopError || shopNotice}
                </div>
              )}
            </section>
          )}

          {nativeHomePage === "pass" && (
            <section className="page-container page-active" aria-label="赛季通行证" data-testid="native-pass">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="ticket" className="w-7 h-7 text-emerald-400" />
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase">Pass 通行证</h2>
                    <span className="text-[10px] text-slate-500">{seasonCenter ? `${seasonCenter.season.startDate} 至 ${seasonCenter.season.endDate}` : "赛季配置读取中"}</span>
                  </div>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭赛季通行证" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 scroll-hide">
                {(seasonNotice || seasonError) && (
                  <p className={`rounded-2xl px-4 py-3 text-xs font-bold ${seasonError ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-100"}`}>
                    {seasonError || seasonNotice}
                  </p>
                )}
                <section className="glass-panel rounded-3xl p-5 border-emerald-400/30 bg-gradient-to-br from-emerald-400/15 to-slate-950">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] text-emerald-300 font-black uppercase">赛季通行证</div>
                      <h3 className="mt-1 text-2xl font-black italic text-white">{seasonCenter?.season.name ?? "赛季通行证"}</h3>
                      <p className="mt-2 text-xs leading-5 text-slate-300 font-bold">购买消耗平台币并计入 VIP 经验；开通后每日额外获得 1 个赛季随机任务，帮助追赶活动积分和赛季奖励线。</p>
                    </div>
                    <span className="rounded-2xl bg-slate-900/70 border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200 font-black">
                      {seasonCenter?.season.pass.isPurchased ? "已开通" : "未开通"}
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-slate-900/60 p-3"><strong className="block text-sm text-white">{seasonCenter?.season.points ?? 0}</strong><span className="text-[9px] text-slate-500">赛季积分</span></div>
                    <div className="rounded-2xl bg-slate-900/60 p-3"><strong className="block text-sm text-business-gold">{seasonCenter?.season.pass.pricePlatformCoins ?? 0}</strong><span className="text-[9px] text-slate-500">开通价格</span></div>
                    <div className="rounded-2xl bg-slate-900/60 p-3"><strong className="block text-sm text-white">{seasonCenter?.wallet.balance ?? shopCenter?.wallet.balance ?? profile.platformCoins}</strong><span className="text-[9px] text-slate-500">平台币</span></div>
                  </div>
                  {companyGrowth && companyGrowth.nextLevelExperience === null && (
                    <div className="mt-3 rounded-2xl bg-slate-900/60 border border-business-gold/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong className="block text-xs text-business-gold font-black">满级宝箱</strong>
                          <span className="mt-1 block text-[10px] leading-4 text-slate-400 font-bold">
                            已满 {companyGrowth.maxLevel} 级，溢出经验进入宝箱进度；当前溢出经验 {companyGrowth.fullLevelOverflowExperience}。
                          </span>
                        </div>
                        <span className="shrink-0 rounded-xl bg-business-gold/15 border border-business-gold/30 px-2 py-1 text-[10px] text-business-gold font-black">
                          {companyGrowth.fullLevelChest.claimedCount}/{companyGrowth.fullLevelChest.earnedCount}
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-950 overflow-hidden border border-business-gold/20">
                        <span
                          className="block h-full bg-business-gold"
                          style={{ width: `${Math.max(0, Math.min(100, (companyGrowth.fullLevelChest.progressExperience * 100) / companyGrowth.fullLevelChest.requiredExperience))}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-[10px] text-slate-500 font-bold">
                          奖励：声望 {companyGrowth.fullLevelChest.rewards.reputation} · 行动力 {companyGrowth.fullLevelChest.rewards.actionPower}
                          {companyGrowth.fullLevelChest.rewards.item ? ` · ${companyGrowth.fullLevelChest.rewards.item.name} ${companyGrowth.fullLevelChest.rewards.item.quantity}` : ""}
                        </span>
                        <button
                          className="rounded-xl bg-business-gold px-3 py-1.5 text-[10px] font-black text-business-dark disabled:opacity-45"
                          disabled={companyGrowth.fullLevelChest.claimableCount <= 0}
                          type="button"
                          onClick={() => void claimFullLevelChest()}
                        >
                          {companyGrowth.fullLevelChest.claimableCount > 0 ? "领取宝箱" : "积累中"}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {passImmediateRewards.map((reward) => (
                      <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/50 p-2" key={reward}>
                        <strong className="block text-[10px] font-black text-emerald-200">{reward}</strong>
                        <span className="text-[8px] text-slate-500">开通即得</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-2xl border border-business-gold/20 bg-business-gold/10 p-3">
                    <strong className="block text-xs font-black text-business-gold">活动增益说明</strong>
                    <span className="mt-1 block text-[10px] font-bold leading-4 text-slate-300">
                      通行证不直接提高排行榜结算，但会提供赛季随机任务、经验券和限定资源，让玩家更稳定地完成每日活动和商店兑换目标。
                    </span>
                  </div>
                  <button
                    className="mt-5 w-full btn-gold py-3 rounded-2xl text-sm font-black text-business-dark disabled:opacity-45"
                    disabled={!seasonCenter || seasonCenter.season.pass.isPurchased}
                    type="button"
                    onClick={() => void purchaseSeasonPass()}
                  >
                    {seasonCenter?.season.pass.isPurchased ? "通行证已开通" : `开通通行证 ${seasonCenter?.season.pass.pricePlatformCoins ?? 0}`}
                  </button>
                </section>
                <section className="grid grid-cols-2 gap-3">
                  <article className="glass-panel rounded-3xl p-4">
                    <strong className="block text-sm text-white font-black">免费线</strong>
                    <p className="mt-2 text-[10px] leading-4 text-slate-400 font-bold">
                      完成赛季任务获得积分、经验券、培养手册和活动资源。
                    </p>
                  </article>
                  <article className="glass-panel rounded-3xl p-4 border-business-gold/30">
                    <strong className="block text-sm text-business-gold font-black">付费线</strong>
                    <p className="mt-2 text-[10px] leading-4 text-slate-400 font-bold">
                      开通即得赛季经验券、限定称号碎片和办公室皮肤券，后续奖励线继续承接员工与外观深度。
                    </p>
                  </article>
                </section>
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <strong className="text-sm text-white font-black">赛季任务线</strong>
                    <span className="text-[10px] text-business-gold">{seasonCenter?.tasks.length ?? 0} 项</span>
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                    {passTaskStageCounts.map((item) => (
                      <div className="rounded-xl bg-slate-950/60 px-2 py-2" key={item.stage}>
                        <strong className="block text-[9px] font-black text-slate-300">{item.stage}</strong>
                        <span className="text-[9px] font-black text-business-gold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {["今日可完成", "待推进", "已完成"].map((stage) => {
                      const stagedTasks = passTaskRows.filter((task) => task.stageLabel === stage);
                      if (stagedTasks.length === 0) return null;
                      return (
                        <div className="space-y-2" key={stage}>
                          <strong className="block text-[10px] font-black text-slate-400">{stage}</strong>
                          {stagedTasks.map((task) => (
                            <div className={`rounded-2xl p-3 ${stage === "已完成" ? "bg-emerald-500/10 border border-emerald-400/20" : "bg-slate-900/60"}`} key={task.id}>
                              <div className="flex items-center justify-between gap-2">
                                <strong className="text-xs text-white">{task.title}</strong>
                                <span className="text-[10px] text-business-gold">{task.progress}/{task.target}</span>
                              </div>
                              <p className="mt-1 text-[9px] leading-4 text-slate-500">{task.description}</p>
                              <div className="mt-2 flex items-center justify-between text-[9px] font-black">
                                <span className="text-emerald-300">积分 +{task.rewardPoints}</span>
                                <span className="text-business-gold">{task.rewardItem ? `${task.rewardItem.name} x${task.rewardItem.quantity}` : "基础奖励"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </section>
                {!seasonCenter && (
                  <p className="glass-panel rounded-3xl p-4 text-xs text-slate-300 font-bold">暂无通行证配置。</p>
                )}
              </div>
            </section>
          )}

          {nativeHomePage === "vip" && (
            <section className="page-container page-active" aria-label="VIP中心" data-testid="native-vip">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="award" className="w-7 h-7 text-business-gold" />
                  <h2 className="text-xl font-black text-white">VIP中心</h2>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭VIP中心" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 pb-10 scroll-hide">
                <section className="border-y border-business-gold/25 bg-business-gold/5 px-4 py-4" data-testid="vip-current-summary">
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black text-business-gold">我的等级</span>
                      <strong className="mt-1 block truncate text-3xl font-black italic text-white">{vipCenter?.currentLevel.name ?? "VIP 0"}</strong>
                      <span className="mt-1 block truncate text-xs font-bold text-slate-300">{vipCenter?.benefits.title ?? "创业新星"}</span>
                    </div>
                    <span className="shrink-0 text-right text-[10px] font-black text-business-gold">{nextVipLabel}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>VIP经验 {compactNumber(vipCenter?.wallet.vipExperience ?? shopCenter?.wallet.vipExperience ?? 0)}</span>
                    <span>{((vipCenter?.progressToNextBasisPoints ?? 0) / 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full border border-business-gold/25 bg-slate-950/70">
                    <div className="h-full bg-business-gold" style={{ width: `${(vipCenter?.progressToNextBasisPoints ?? 0) / 100}%` }} />
                  </div>
                </section>
                {(vipNotice || vipError) && (
                  <p className={`mt-3 border-y px-3 py-2 text-xs font-bold ${vipError ? "border-red-400/25 bg-red-500/10 text-red-200" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"}`}>
                    {vipError || vipNotice}
                  </p>
                )}
                <section className="border-b border-white/10 px-1 py-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <strong className="block text-sm text-white font-black">每日礼包</strong>
                      <span className="mt-1 block truncate text-xs text-slate-400 font-bold">
                        平台币 {vipCenter?.dailyGift.rewardPlatformCoins ?? 0} · 行动力 {vipCenter?.dailyGift.rewardActionPower ?? 0}
                      </span>
                    </div>
                    <button
                      className="shrink-0 rounded-xl bg-business-gold px-4 py-2 text-[11px] font-black text-business-dark disabled:opacity-45"
                      type="button"
                      disabled={vipCenter?.dailyGift.isClaimed}
                      onClick={() => void claimVipDailyGift()}
                    >
                      {vipCenter?.dailyGift.isClaimed ? "今日已领" : "领取"}
                    </button>
                  </div>
                </section>

                <section className="border-b border-white/10 px-1 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <strong className="block text-sm text-white font-black">VIP等级</strong>
                    <span className="text-[10px] font-bold text-business-gold">选中 {selectedProfileVip?.name ?? "VIP 1"}</span>
                  </div>
                  <div className="flex gap-2 overflow-hidden" aria-label="VIP等级" data-testid="vip-level-strip">
                    {profileVipVisibleLevels.map((level) => (
                      <button
                        aria-label={`${level.name}${selectedProfileVip?.level === level.level ? " 选中" : ""}`}
                        className={`h-8 min-w-0 flex-1 whitespace-nowrap rounded-full border px-1 text-[10px] font-black ${selectedProfileVip?.level === level.level ? "border-business-gold bg-business-gold text-business-dark" : "border-business-gold/25 bg-slate-950/60 text-slate-300"}`}
                        key={level.level}
                        type="button"
                        onClick={() => handleSelectProfileVipLevel(level.level)}
                      >
                        {level.name}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="border-b border-business-gold/20">
                  {[
                    ["权益称号", selectedProfileVip?.title ?? vipCenter?.benefits.title ?? "创业新星"],
                    ["行动力上限", Math.max(profile.actionPowerLimit, 120 + (selectedProfileVip?.actionPowerLimitBonus ?? 0))],
                    ["每日礼包", `平台币 ${selectedProfileVip?.dailyGiftPlatformCoins ?? 0} · 行动力 ${selectedProfileVip?.dailyGiftActionPower ?? 0}`],
                    ["商城折扣", `${((selectedProfileVip?.shopDiscountBasisPoints ?? 10000) / 100).toFixed(0)}%`]
                  ].map(([label, value]) => (
                    <div className="flex items-center justify-between gap-4 border-b border-white/5 px-1 py-3 last:border-b-0" key={label}>
                      <span className="text-[11px] font-bold text-slate-400">{label}</span>
                      <strong className="truncate text-sm font-black text-white">{value}</strong>
                    </div>
                  ))}
                </section>
                <div className="h-8" aria-hidden="true" />
              </div>
            </section>
          )}

          {nativeHomePage === "bag" && (
            <section className="page-container page-active" aria-label="背包" data-testid="native-bag">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="package" className="w-7 h-7 text-business-gold" />
                  <h2 className="text-xl font-black text-white italic uppercase">Inventory 背包</h2>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭背包" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 pb-10 scroll-hide">
                <section className="glass-panel rounded-3xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-business-gold font-black uppercase">资产中心</p>
                      <h3 className="mt-1 text-lg font-black text-white">道具、招募券、赛季材料</h3>
                    </div>
                    <span className="rounded-full bg-business-gold/15 px-3 py-1 text-[10px] font-black text-business-gold">
                      {inventoryCenter?.items.length ?? 0} 类
                    </span>
                  </div>
                  {inventoryError && <p className="mt-3 text-xs font-bold text-red-300">{inventoryError}</p>}
                </section>
                <section className="glass-panel rounded-3xl p-4 mb-4" aria-label="背包入口导航">
                  <strong className="block text-sm text-white font-black">背包入口导航</strong>
                  <p className="mt-2 text-[10px] leading-5 text-slate-400 font-bold">
                    背包保存已获得的道具和材料；需要普通补给去商城，需要效率权益去特权，需要赛季奖励线去通行证。
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("商城")}>去商城</button>
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("特权")}>去特权</button>
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("通行证")}>去通行证</button>
                  </div>
                </section>
                <div className="grid grid-cols-4 gap-3">
                  {(inventoryCenter?.items ?? []).map((item) => (
                    <div
                      className={`aspect-square glass-panel rounded-2xl flex flex-col items-center justify-center border-white/5 transition-colors relative ${selectedInventoryItem?.id === item.id ? "border-business-gold/50 bg-business-gold/5" : ""}`}
                      key={item.id}
                    >
                      <Icon name={item.icon} className="w-7 h-7 text-business-gold" />
                      <span className="mt-1 max-w-full px-1 text-center text-[9px] font-black text-slate-300 truncate">{item.name}</span>
                      <span className="absolute bottom-1 right-2 text-[10px] font-black text-white">{item.quantity}</span>
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 16 - (inventoryCenter?.items.length ?? 0)) }, (_, index) => (
                    <div className="aspect-square glass-panel rounded-2xl flex items-center justify-center border-white/5 opacity-30" key={index} />
                  ))}
                </div>
                {inventoryCenter && inventoryCenter.items.length === 0 && (
                  <p className="mt-4 rounded-3xl border border-dashed border-white/10 p-5 text-center text-xs font-bold text-slate-400">
                    完成主线、每日任务、特权购买或通行证任务后，道具会进入背包。
                  </p>
                )}
              </div>
              <footer className="p-6 bg-slate-900 border-t border-white/5 h-48 flex gap-6">
                <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center border border-business-gold/30 shrink-0">
                  <Icon name={selectedInventoryItem?.icon ?? "package"} className="w-10 h-10 text-business-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-white">{selectedInventoryItem?.name ?? "暂无道具"}</h3>
                  <p className="text-xs text-slate-400 mt-2 font-medium">{selectedInventoryItem?.summary ?? "背包用于承载任务、商城、特权和通行证奖励。"}</p>
                  <p className="mt-2 text-[10px] font-black text-business-gold">{selectedInventoryItem?.usageHint ?? "完成经营循环后获得"}</p>
                  <button
                    className="mt-4 btn-gold px-8 py-2 rounded-xl text-xs font-black text-business-dark"
                    type="button"
                    disabled={selectedInventoryItem?.itemId !== "action-drink"}
                    onClick={() => selectedInventoryItem?.itemId === "action-drink" && void useInventoryItem(selectedInventoryItem.itemId)}
                  >
                    {selectedInventoryItem?.itemId === "action-drink" ? "使用" : selectedInventoryItem ? "查看用途" : "待获得"}
                  </button>
                </div>
              </footer>
            </section>
          )}

          {nativeHomePage === "negotiation" && (
            <section className="page-container page-active" aria-label="出门谈判" data-testid="native-negotiation">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="handshake" className="w-7 h-7 text-business-gold" />
                  <h2 className="text-xl font-black text-white italic uppercase">Chapter 谈判</h2>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭出门谈判" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-4 scroll-hide">
                <section className="glass-panel rounded-3xl p-5 border-business-gold/30 bg-gradient-to-br from-business-gold/10 to-slate-950">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-business-gold font-black uppercase tracking-wider">当前章节</span>
                    <span className="text-[10px] text-slate-400 font-bold">行动力 {profile.actionPower}/{profile.actionPowerLimit}</span>
                  </div>
                  <h3 className="text-2xl font-black text-white">第15章 · 扩张谈判</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-400 font-medium">
                    推进谈判可解锁新客户、新项目和商战对手，承接主线任务与后续经营事件。
                  </p>
                </section>

                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-12 h-12 bg-business-gold/15 rounded-2xl flex items-center justify-center border border-business-gold/20 shrink-0">
                      <Icon name="clipboard-check" className="w-7 h-7 text-business-gold" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-business-gold text-[10px] font-black uppercase">主线任务</span>
                        <span className="text-slate-500 text-[10px] font-bold">{highlightedTask ? `${highlightedTask.progress}/${highlightedTask.target}` : "0/0"}</span>
                      </div>
                      <strong className="block text-sm font-black text-white truncate">{highlightedTask ? highlightedTask.title : "任务配置读取中"}</strong>
                      <p className="mt-2 text-[10px] text-slate-400 font-medium">
                        {highlightedTask ? highlightedTask.rewardLabel : "暂无奖励"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-3 gap-3">
                  {[
                    ["客户", "新合同"],
                    ["项目", "高收益"],
                    ["商战", "新对手"]
                  ].map(([label, value]) => (
                    <div className="glass-panel rounded-2xl p-3 text-center" key={label}>
                      <div className="text-[10px] text-slate-500 font-bold">{label}</div>
                      <div className="mt-1 text-xs text-white font-black">{value}</div>
                    </div>
                  ))}
                </section>
              </div>
              <footer className="p-6 bg-slate-900 border-t border-white/5">
                <button className="w-full btn-gold py-3 rounded-2xl text-sm font-black text-business-dark" type="button" onClick={openEventScreen}>
                  开始谈判
                </button>
              </footer>
            </section>
          )}

          {activeNav === "员工" && (
            <section className="employee-screen" aria-label="员工系统">
              <header className="employee-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>员工</strong>
                  <span>团队战力 {employeePower.toLocaleString("zh-CN")}</span>
                </div>
                <button type="button" onClick={() => openHomePanel("员工")}>规则</button>
              </header>

              <section className="employee-summary" aria-label="员工概览">
                <span>在岗 {activeEmployees.length}</span>
                <span>平均忠诚 {averageEmployeeLoyalty}</span>
                <span>月薪合计 {formatWan(totalEmployeeSalary)}</span>
              </section>
              <section className="employee-summary" aria-label="员工付费深度">
                <span>普通招募 免费补位</span>
                <span>猎头招募 稀缺提升</span>
                <span>定向猎头 岗位选择</span>
              </section>
              {employeeError && <p className="employee-error">{employeeError}</p>}

              <section className="employee-layout">
                <div className="employee-list" aria-label="员工列表">
                  {employees.map((employee) => (
                    <button
                      className={employee.id === selectedEmployee?.id ? "selected" : undefined}
                      key={employee.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(employee.id)}
                    >
                      <span className={`quality ${rarityClass(employee.rarity)}`}>{employee.rarity}</span>
                      <strong>{employee.name}</strong>
                      <em>{employee.role} · {employee.careerLevel}</em>
                      <small>{employee.isActive ? `Lv.${employee.level}` : "离岗"}</small>
                    </button>
                  ))}
                </div>

                <article className="employee-detail" aria-label="员工详情">
                  {selectedEmployee ? (
                    <>
                      <div className="employee-portrait">
                        <span>{selectedEmployee.name.slice(0, 1)}</span>
                        <strong>{selectedEmployee.name}</strong>
                        <em>{selectedEmployee.rarity} · {selectedEmployee.role} · {selectedEmployee.careerLevel}</em>
                      </div>

                      <dl className="employee-stats">
                        <div>
                          <dt>等级</dt>
                          <dd>Lv.{selectedEmployee.level}</dd>
                        </div>
                        <div>
                          <dt>薪资</dt>
                          <dd>{formatWan(selectedEmployee.salary)}/月</dd>
                        </div>
                        <div>
                          <dt>忠诚</dt>
                          <dd>{selectedEmployee.loyalty}</dd>
                        </div>
                        <div>
                          <dt>压力</dt>
                          <dd>{selectedEmployee.pressure}</dd>
                        </div>
                        <div>
                          <dt>管理</dt>
                          <dd>{selectedEmployee.management}</dd>
                        </div>
                        <div>
                          <dt>谈判</dt>
                          <dd>{selectedEmployee.negotiation}</dd>
                        </div>
                        <div>
                          <dt>执行</dt>
                          <dd>{selectedEmployee.execution}</dd>
                        </div>
                        <div>
                          <dt>股权</dt>
                          <dd>{(selectedEmployee.equityBasisPoints / 100).toFixed(0)}%</dd>
                        </div>
                      </dl>

                      <p>{selectedEmployee.specialty} 成长潜力 {selectedEmployee.growthPotential}。</p>
                      <p>
                        员工池已扩展为岗位收集和养成主线：项目看执行，产品看产品/工程/运营组合，融资看财务和投资关系，风险事件看法务、HR 与顾问道具。
                      </p>

                      <div className="employee-actions">
                        <button type="button" onClick={() => void cultivateEmployee()} disabled={!selectedEmployee.isActive}>培养</button>
                        <button type="button" onClick={recruitEmployee}>招募</button>
                        <button type="button" onClick={grantEmployeeEquity} disabled={!selectedEmployee.isActive}>股权</button>
                        <button type="button" onClick={() => void dismissEmployee()} disabled={!selectedEmployee.isActive}>裁员</button>
                      </div>
                    </>
                  ) : (
                    <div className="employee-empty">
                      <strong>暂无员工</strong>
                      <p>通过招募建立第一支核心团队，员工薪资会计入公司月支出。</p>
                      <button type="button" onClick={recruitEmployee}>招募员工</button>
                    </div>
                  )}
                </article>
              </section>
            </section>
          )}

          {(activeNav === "项目" || (activeNav === "业务" && businessTab === "项目")) && (
            <section className="project-screen" aria-label="项目系统">
              <header className="project-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>{activeNav === "业务" ? "业务" : "项目"}</strong>
                  <span>项目交付 · 预计回款 {compactNumber(totalProjectRevenue)}</span>
                </div>
                <button type="button" onClick={() => openHomePanel("项目")}>规则</button>
              </header>

              {activeNav === "业务" && (
                <nav className="business-tabs" aria-label="业务分类">
                  <button className={businessTab === "项目" ? "active" : undefined} type="button" onClick={() => setBusinessTab("项目")}>项目交付</button>
                  <button className={businessTab === "产品" ? "active" : undefined} type="button" onClick={() => setBusinessTab("产品")}>产品研发</button>
                </nav>
              )}

              <section className="project-summary" aria-label="项目概览">
                <span>在研 {activeProjects.length}</span>
                <span>最高阶段 {highestProjectStage}</span>
                <span>可结算 {projects.filter((project) => project.status === "ready").length}</span>
              </section>
              {projectError && <p className="project-error">{projectError}</p>}

              <section className="project-layout">
                <div className="project-list" aria-label="项目列表">
                  {projects.map((project) => (
                    <button
                      className={project.id === selectedProject?.id ? "selected" : undefined}
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <strong>{project.name}</strong>
                      <em>{project.category} · 阶段 {project.stage}</em>
                      <span>
                        <i style={{ width: `${project.progress}%` }} />
                      </span>
                      <small>{project.status === "ready" ? "待结算" : `预计 ${compactNumber(project.revenueReward)}`}</small>
                    </button>
                  ))}
                </div>

                <article className="project-detail" aria-label="项目详情">
                  {selectedProject ? (
                    <>
                      <div className="project-title">
                        <span>{selectedProject.category.slice(0, 2)}</span>
                        <strong>{selectedProject.name}</strong>
                        <em>阶段 {selectedProject.stage} · 风险 {selectedProject.risk} · 成功率 {selectedProject.successRate}%</em>
                      </div>

                      <dl className="project-stats">
                        <div>
                          <dt>进度</dt>
                          <dd>{selectedProject.progress}%</dd>
                        </div>
                        <div>
                          <dt>周期</dt>
                          <dd>{selectedProject.cycleDays}天</dd>
                        </div>
                        <div>
                          <dt>预算</dt>
                          <dd>{compactNumber(selectedProject.budget)}</dd>
                        </div>
                        <div>
                          <dt>回款</dt>
                          <dd>{compactNumber(selectedProject.revenueReward)}</dd>
                        </div>
                        <div>
                          <dt>负责人</dt>
                          <dd>{selectedProject.assignedEmployeeName ?? "待分配"}</dd>
                        </div>
                        <div>
                          <dt>状态</dt>
                          <dd>{selectedProject.status === "ready" ? "待结算" : selectedProject.status === "settled" ? "已成功" : selectedProject.status === "failed" ? "已失败" : "推进中"}</dd>
                        </div>
                      </dl>

                      <label className="project-assignee">
                        <span>派员工</span>
                        <select
                          value={selectedProject.assignedEmployeeId ?? ""}
                          onChange={(event) => void assignProjectEmployee(event.target.value)}
                          disabled={selectedProject.status === "settled" || selectedProject.status === "failed"}
                        >
                          <option value="">待分配</option>
                          {activeEmployees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name} · {employee.role}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="project-progress" aria-label="项目进度">
                        <span>
                          <i style={{ width: `${selectedProject.progress}%` }} />
                        </span>
                        <strong>{selectedProject.progress}%</strong>
                      </div>

                      <p>{selectedProject.summary}</p>

                      <div className="project-actions">
                        <button type="button" onClick={() => void advanceProject()} disabled={selectedProject.status !== "active"}>推进</button>
                        <button type="button" onClick={() => void startProject()}>接项目</button>
                        <button type="button" onClick={() => void settleProject()} disabled={selectedProject.status !== "ready"}>结算</button>
                        <button type="button" onClick={() => selectedProject.assignedEmployeeId && void assignProjectEmployee(selectedProject.assignedEmployeeId)} disabled={selectedProject.assignedEmployeeId === null || selectedProject.status === "settled" || selectedProject.status === "failed"}>派遣</button>
                      </div>
                    </>
                  ) : (
                    <div className="project-empty">
                      <strong>暂无项目</strong>
                      <p>接下第一单项目，分配员工后推进交付，结算结果会影响现金、声誉和客户满意度。</p>
                      <button type="button" onClick={() => void startProject()}>接项目</button>
                    </div>
                  )}
                </article>
              </section>
            </section>
          )}

          {(activeNav === "产品" || (activeNav === "业务" && businessTab === "产品")) && (
            <section className="funding-screen product-screen" aria-label="产品生命周期">
              <header className="funding-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>{activeNav === "业务" ? "业务" : "产品"}</strong>
                  <span>产品研发 · 用户 {compactNumber(totalProductUsers)} · 月收入 {compactNumber(productCenter?.products.reduce((total, item) => total + item.monthlyRevenue, 0) ?? 0)}</span>
                </div>
                <button type="button" onClick={() => account && selectedServer && void loadProductCenter(account.token, selectedServer.id)}>刷新</button>
              </header>

              {activeNav === "业务" && (
                <nav className="business-tabs" aria-label="业务分类">
                  <button className={businessTab === "项目" ? "active" : undefined} type="button" onClick={() => setBusinessTab("项目")}>项目交付</button>
                  <button className={businessTab === "产品" ? "active" : undefined} type="button" onClick={() => setBusinessTab("产品")}>产品研发</button>
                </nav>
              )}

              <section className="funding-summary" aria-label="产品概览">
                <span>在营 {activeProducts.length}</span>
                <span>现金 {compactNumber(productCenter?.finance.cash ?? profile.cash)}</span>
                <span>风险 {productCenter?.finance.riskStatus ?? profile.riskStatus}</span>
              </section>
              {(productNotice || productError) && (
                <div className={`operation-toast is-product ${productError ? "is-error" : "is-success"}`} role="status" aria-live="polite">
                  {productError || productNotice}
                </div>
              )}

              <section className="funding-layout">
                <div className="funding-list" aria-label="产品方向列表">
                  {(productCenter?.offers ?? []).map((offer) => (
                    <button
                      className={offer.id === selectedProductOffer?.id ? "selected" : undefined}
                      key={offer.id}
                      type="button"
                      onClick={() => setSelectedProductOfferId(offer.id)}
                    >
                      <strong>{offer.name}</strong>
                      <em>{offer.category} · 启动 {compactNumber(offer.launchCost)}</em>
                      <span>基准{compactNumber(offer.baseUsers)}用户 / 留存{(offer.retentionBasisPoints / 100).toFixed(1)}% / 付费{(offer.payRateBasisPoints / 100).toFixed(1)}%</span>
                      <small>{offer.lockedReason ?? "可立项"}</small>
                    </button>
                  ))}
                </div>

                <article className="funding-detail" aria-label="产品详情">
                  {selectedProductOffer ? (
                    <>
                      <div className="funding-title">
                        <span>产</span>
                        <strong>{selectedProduct?.name ?? selectedProductOffer.name}</strong>
                        <em>{selectedProduct?.resultSummary ?? selectedProductOffer.summary}</em>
                      </div>

                      <dl className="funding-stats">
                        <div>
                          <dt>阶段</dt>
                          <dd>{selectedProduct ? productStageLabels[selectedProduct.stage] : "未立项"}</dd>
                        </div>
                        <div>
                          <dt>用户</dt>
                          <dd>{compactNumber(selectedProduct?.users ?? selectedProductOffer.baseUsers)}</dd>
                        </div>
                        <div>
                          <dt>留存</dt>
                          <dd>{((selectedProduct?.retentionBasisPoints ?? selectedProductOffer.retentionBasisPoints) / 100).toFixed(1)}%</dd>
                        </div>
                        <div>
                          <dt>付费</dt>
                          <dd>{((selectedProduct?.payRateBasisPoints ?? selectedProductOffer.payRateBasisPoints) / 100).toFixed(1)}%</dd>
                        </div>
                        <div>
                          <dt>收入</dt>
                          <dd>{compactNumber(selectedProduct?.monthlyRevenue ?? 0)}</dd>
                        </div>
                        <div>
                          <dt>技术债</dt>
                          <dd>{selectedProduct?.techDebt ?? 8}</dd>
                        </div>
                      </dl>

                      {selectedProduct && (
                        <section className="funding-active">
                          <strong>{productStageLabels[selectedProduct.stage]} · {selectedProduct.category}</strong>
                          <span>服务器成本 {compactNumber(selectedProduct.serverCost)}，获客成本 {compactNumber(selectedProduct.acquisitionCost)}。</span>
                          <small>口碑 {selectedProduct.reputationScore} · 状态 {selectedProduct.status === "closed" ? "已关闭" : "运营中"}</small>
                        </section>
                      )}

                      <div className="funding-actions">
                        <button
                          type="button"
                          disabled={!selectedProductOffer.isAvailable}
                          onClick={() => void runProductAction("/products/start", { productConfigId: selectedProductOffer.id })}
                        >
                          立项
                        </button>
                        <button
                          type="button"
                          disabled={!selectedProduct}
                          onClick={() => selectedProduct && void runProductAction(`/products/${encodeURIComponent(selectedProduct.id)}/advance`)}
                        >
                          推进
                        </button>
                        <button
                          type="button"
                          disabled={!selectedProduct}
                          onClick={() => selectedProduct && void runProductAction(`/products/${encodeURIComponent(selectedProduct.id)}/refactor`)}
                        >
                          重构
                        </button>
                        <button
                          type="button"
                          disabled={!selectedProduct}
                          onClick={() => selectedProduct && window.confirm("关闭产品会停止长期收入，并降低部分口碑。确认关闭？") && void runProductAction(`/products/${encodeURIComponent(selectedProduct.id)}/close`)}
                        >
                          关闭
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="funding-empty">暂无产品配置。</div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "市场" && (
            <section className="funding-screen market-screen" aria-label="市场竞争">
              <header className="funding-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>市场</strong>
                  <span>份额 {((selectedMarket?.playerShareBasisPoints ?? selectedMarketOffer?.baseShareBasisPoints ?? 0) / 100).toFixed(1)}% · 待应对 {pendingCompetitorActions.length}</span>
                </div>
                <button type="button" onClick={() => account && selectedServer && void loadMarketCenter(account.token, selectedServer.id)}>刷新</button>
              </header>

              <section className="funding-summary" aria-label="市场概览">
                <span>赛道 {marketCenter?.markets.length ?? 0}</span>
                <span>热度 {selectedMarket?.industryHeat ?? selectedMarketOffer?.industryHeat ?? 0}</span>
                <span>风险 {marketCenter?.finance.riskStatus ?? profile.riskStatus}</span>
              </section>
              {(marketNotice || marketError) && (
                <div className={`operation-toast is-market ${marketError ? "is-error" : "is-success"}`} role="status" aria-live="polite">
                  {marketError || marketNotice}
                </div>
              )}

              <section className="funding-layout">
                <div className="funding-list" aria-label="赛道列表">
                  {(marketCenter?.offers ?? []).map((offer) => (
                    <button
                      className={offer.id === selectedMarketOffer?.id ? "selected" : undefined}
                      key={offer.id}
                      type="button"
                      onClick={() => setSelectedMarketOfferId(offer.id)}
                    >
                      <strong>{offer.name}</strong>
                      <em>热度 {offer.industryHeat} · 政策风险 {offer.policyRisk}</em>
                      <span>基础份额 {(offer.baseShareBasisPoints / 100).toFixed(1)}% / 客户池 {compactNumber(offer.customerPool)}</span>
                      <small>{offer.lockedReason ?? "可进入"}</small>
                    </button>
                  ))}
                </div>

                <article className="funding-detail" aria-label="市场详情">
                  {selectedMarketOffer ? (
                    <>
                      <div className="funding-title">
                        <span>市</span>
                        <strong>{selectedMarket?.trackName ?? selectedMarketOffer.name}</strong>
                        <em>{selectedMarket?.resultSummary ?? selectedMarketOffer.summary}</em>
                      </div>

                      <dl className="funding-stats">
                        <div>
                          <dt>我方份额</dt>
                          <dd>{((selectedMarket?.playerShareBasisPoints ?? selectedMarketOffer.baseShareBasisPoints) / 100).toFixed(1)}%</dd>
                        </div>
                        <div>
                          <dt>竞品份额</dt>
                          <dd>{((selectedMarket?.competitorShareBasisPoints ?? 0) / 100).toFixed(1)}%</dd>
                        </div>
                        <div>
                          <dt>价格战</dt>
                          <dd>{selectedMarket?.pricePressure ?? 0}</dd>
                        </div>
                        <div>
                          <dt>挖人</dt>
                          <dd>{selectedMarket?.talentPressure ?? 0}</dd>
                        </div>
                        <div>
                          <dt>舆论</dt>
                          <dd>{selectedMarket?.reputationPressure ?? 0}</dd>
                        </div>
                        <div>
                          <dt>专利</dt>
                          <dd>{selectedMarket?.patentRisk ?? selectedMarketOffer.policyRisk}</dd>
                        </div>
                      </dl>

                      <section className="funding-active">
                        <strong>成本结构</strong>
                        <span>{selectedMarketOffer.costStructure}</span>
                        <small>行业热度 {selectedMarketOffer.industryHeat}，政策风险 {selectedMarketOffer.policyRisk}。</small>
                      </section>

                      {selectedCompetitorAction && (
                        <section className="funding-active">
                          <strong>{competitorActionLabels[selectedCompetitorAction.actionType]} · {selectedCompetitorAction.competitorName}</strong>
                          <span>{selectedCompetitorAction.title}</span>
                          <small>{selectedCompetitorAction.summary}</small>
                        </section>
                      )}

                      <div className="funding-actions">
                        <button
                          type="button"
                          disabled={!selectedMarketOffer.isAvailable}
                          onClick={() => void runMarketAction("/markets/enter", { trackId: selectedMarketOffer.id })}
                        >
                          进入
                        </button>
                        <button
                          type="button"
                          disabled={!selectedMarket}
                          onClick={() => selectedMarket && void runMarketAction("/markets/competitor-action", { trackId: selectedMarket.trackId })}
                        >
                          竞品行动
                        </button>
                        <button
                          type="button"
                          disabled={!selectedCompetitorAction}
                          onClick={() => selectedCompetitorAction && void runMarketAction(`/markets/actions/${encodeURIComponent(selectedCompetitorAction.id)}/respond`, { response: "defend" })}
                        >
                          防守
                        </button>
                        <button
                          type="button"
                          disabled={!selectedCompetitorAction}
                          onClick={() => selectedCompetitorAction && void runMarketAction(`/markets/actions/${encodeURIComponent(selectedCompetitorAction.id)}/respond`, { response: "counter" })}
                        >
                          反击
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="funding-empty">暂无市场配置。</div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "融资" && (
            <section className="finance-funding-screen" aria-label="融资路演">
              <header className="finance-funding-header">
                <button className="finance-funding-back" type="button" onClick={() => setActiveNav("公司")}>
                  <Icon name="chevron-left" className="finance-funding-header-icon" />
                  返回
                </button>
                <h1>融资路演</h1>
                <button className={isFundingSyncing ? "finance-funding-sync is-syncing" : "finance-funding-sync"} type="button" aria-label="同步融资数据" onClick={() => void syncFundingCenter()}>
                  <Icon name="refresh-cw" className="finance-funding-header-icon" />
                </button>
              </header>

              <section className="finance-funding-summary" aria-label="融资核心数据">
                <div>
                  <span>公司估值</span>
                  <strong>{compactNumber(fundingCenter?.finance.valuation ?? profile.valuation)}</strong>
                </div>
                <div>
                  <span>账上现金</span>
                  <strong>{compactNumber(fundingCenter?.finance.cash ?? profile.cash)}</strong>
                </div>
                <div>
                  <span>创始人持股</span>
                  <strong>{((fundingCenter?.finance.founderEquityBasisPoints ?? profile.founderEquityBasisPoints) / 100).toFixed(1)}%</strong>
                </div>
                <div>
                  <span>可谈方案</span>
                  <strong>{(fundingCenter?.offers ?? []).filter((offer) => offer.isAvailable).length} / {fundingCenter?.offers.length ?? 0}</strong>
                </div>
              </section>

              {(fundingNotice || fundingError) && (
                <div className={`finance-funding-toast ${fundingError ? "is-error" : "is-success"}`} role="status" aria-live="polite">
                  {fundingError || fundingNotice}
                </div>
              )}

              <section className="finance-funding-layout">
                <div className="finance-funding-list" aria-label="融资方案列表">
                  <div className="finance-funding-list-head">
                    <span>融资方案列表</span>
                    <span>当前状态</span>
                  </div>
                  {(fundingCenter?.offers ?? []).map((offer) => {
                    const matchedFunding = fundingCenter?.fundings.find((item) => item.investorId === offer.id);
                    const status = fundingOfferDisplayStatus(offer, matchedFunding);
                    const reason = fundingOfferReason(offer, matchedFunding);
                    return (
                      <button
                        className={offer.id === selectedFundingOffer?.id ? "finance-funding-card selected" : "finance-funding-card"}
                        key={offer.id}
                        type="button"
                        onClick={() => setSelectedFundingOfferId(offer.id)}
                      >
                        <span className="finance-funding-card-main">
                          <span>
                            <small>{offer.roundName}</small>
                            <strong>{offer.investorName}</strong>
                          </span>
                          <em>
                            <b>{formatWan(offer.amount)}</b>
                            <small>{(offer.equityBasisPoints / 100).toFixed(1)}%</small>
                          </em>
                        </span>
                        <span className="finance-funding-state">
                          <strong className={fundingStatusClass(status)}>
                            <Icon name={fundingRoadshowStatusIcon(status)} className="finance-funding-status-icon" />
                            {fundingRoadshowStatusLabel(status)}
                          </strong>
                          {reason !== "可谈" && <small>{reason}</small>}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <article className="finance-funding-detail" aria-label="融资方案详情">
                  {selectedFundingOffer ? (
                    <>
                      <div className="finance-funding-title">
                        <strong>{selectedFundingOffer.investorName}</strong>
                        <em>{selectedFundingOffer.summary}</em>
                      </div>

                      <dl className="finance-funding-stats">
                        <div>
                          <dt>路演把握</dt>
                          <dd>
                            <span>{selectedFundingOffer.successRate}%</span>
                            <i style={{ width: `${selectedFundingOffer.successRate}%` }} />
                          </dd>
                        </div>
                        <div>
                          <dt>治理压力</dt>
                          <dd className={selectedFundingOffer.boardPressure > 80 ? "is-danger" : selectedFundingOffer.boardPressure > 50 ? "is-high" : selectedFundingOffer.boardPressure > 30 ? "is-mid" : "is-low"}>
                            <span>{fundingPressureLabel(selectedFundingOffer.boardPressure)} ({selectedFundingOffer.boardPressure}%)</span>
                            <i style={{ width: `${Math.min(100, selectedFundingOffer.boardPressure)}%` }} />
                          </dd>
                        </div>
                        <div>
                          <dt>到账金额</dt>
                          <dd>{compactNumber(selectedFundingOffer.amount)}</dd>
                        </div>
                        <div>
                          <dt>投后持股</dt>
                          <dd>{(((fundingCenter?.finance.founderEquityBasisPoints ?? profile.founderEquityBasisPoints) - selectedFundingOffer.equityBasisPoints) / 100).toFixed(1)}%</dd>
                        </div>
                      </dl>

                      <section className="finance-funding-panel">
                        <strong>门槛与条款</strong>
                        <ul>
                          <li>{selectedFundingOffer.term}</li>
                          <li>{fundingOfferReason(selectedFundingOffer, selectedFundingRecord)}</li>
                        </ul>
                      </section>

                      <section className="finance-funding-panel">
                        <strong>投后管理事件</strong>
                        <ul>
                          {selectedFundingPostFocus.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>

                      <section className="finance-funding-results">
                        <header>
                          <strong>最近谈判结果</strong>
                          <span>{fundingHistory.length > 0 ? `${fundingHistory.length} 条记录` : "暂无记录"}</span>
                        </header>
                        <p>{selectedFundingRecentResult || "敲定后显示投后反馈。"}</p>
                        {fundingHistory.length > 0 && (
                          <div>
                            {fundingHistory.slice(0, 3).map((funding) => {
                              const status = fundingRecordStatusLabel(funding);
                              return (
                                <article key={funding.id}>
                                  <span className={fundingStatusClass(status)}>{status}</span>
                                  <strong>{funding.investorName}</strong>
                                  <small>{funding.resultSummary ?? funding.term}</small>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </section>

                      {selectedFunding && (
                        <section className="finance-funding-panel">
                          <strong>谈判中 · {selectedFunding.investorName}</strong>
                          <span>{selectedFunding.roundName} 正在谈判，路演把握 {selectedFunding.successRate}。</span>
                          <small>{selectedFunding.term} · {fundingLegalReviewLabel(selectedFunding.legalReviewStatus)} · {fundingDisbursementLabel(selectedFunding.disbursementStatus)}</small>
                        </section>
                      )}

                      <div className="finance-funding-actions">
                        <div>
                          <span>当前状态</span>
                          <strong className={fundingStatusClass(fundingOfferDisplayStatus(selectedFundingOffer, selectedFundingRecord))}>
                            {fundingRoadshowFooterStatus(fundingOfferDisplayStatus(selectedFundingOffer, selectedFundingRecord))}
                          </strong>
                        </div>
                        {selectedFunding ? (
                          <button
                            className="finance-funding-primary-action"
                            type="button"
                            disabled={!canSettleFunding(selectedFunding)}
                            onClick={() => void runFundingAction(`/finance/fundings/${encodeURIComponent(selectedFunding.id)}/settle`)}
                          >
                            {fundingPrimaryActionLabel(selectedFundingOffer, selectedFunding)}
                          </button>
                        ) : (
                          <button
                            className="finance-funding-primary-action"
                            type="button"
                            disabled={Boolean(selectedFundingRecord) || !selectedFundingOffer.isAvailable}
                            onClick={() => void runFundingAction("/finance/fundings/start", { investorId: selectedFundingOffer.id })}
                          >
                            {fundingPrimaryActionLabel(selectedFundingOffer, selectedFundingRecord)}
                          </button>
                        )}
                        <div className="finance-funding-secondary-actions">
                          <button
                            type="button"
                            disabled={!selectedFunding || selectedFunding.legalReviewStatus === "blocked"}
                            onClick={() => selectedFunding && void runFundingAction(`/finance/fundings/${encodeURIComponent(selectedFunding.id)}/legal-review`)}
                          >
                            {selectedFunding ? fundingLegalReviewLabel(selectedFunding.legalReviewStatus) : "无需法务"}
                          </button>
                          <button
                            type="button"
                            disabled={!selectedFunding || selectedFunding.disbursementStatus === "paused" || selectedFunding.legalReviewStatus === "blocked"}
                            onClick={() => selectedFunding && void runFundingAction(`/finance/fundings/${encodeURIComponent(selectedFunding.id)}/pause-disbursement`, { reason: "等待法务复核确认" })}
                          >
                            暂停打款
                          </button>
                          <button
                            type="button"
                            disabled={selectedFundingRecord?.status !== "funded" || !selectedFundingOffer.isAvailable}
                            onClick={() => selectedFundingRecord?.status === "funded" && void runFundingAction(`/finance/fundings/${encodeURIComponent(selectedFundingRecord.id)}/follow-on`, { amount: 200000, equityBasisPoints: 150 })}
                          >
                            加投
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="finance-funding-empty">暂无可谈方案。</div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "贷款" && (
            <section className="loan-screen loan-native-screen" aria-label="授信与债务管理">
              <header className="loan-native-header">
                <button className="loan-native-icon-button" type="button" onClick={() => setActiveNav("公司")} aria-label="返回">
                  <Icon name="chevron-left" className="loan-native-icon" />
                </button>
                <strong>授信与债务管理</strong>
                <button className="loan-native-icon-button" type="button" onClick={() => account && selectedServer && void loadLoanCenter(account.token, selectedServer.id)} aria-label="刷新">
                  <Icon name="refresh-cw" className="loan-native-icon is-muted" />
                </button>
              </header>

              <section className="loan-native-fixed">
                <section className="loan-native-dashboard" aria-label="授信状态">
                  <div className="loan-native-metric">
                    <span>当前信用评级</span>
                    <strong>{loanCenter?.finance.creditRating ?? profile.creditRating}</strong>
                    <small>{creditStatusLabel(loanCenter?.finance.creditRating ?? profile.creditRating)}</small>
                  </div>
                  <div className="loan-native-metric">
                    <span>负债率</span>
                    <strong>{((loanCenter?.finance.debtRatioBasisPoints ?? 0) / 100).toFixed(1)}%</strong>
                    <i className="loan-debt-progress-track">
                      <b className={`loan-debt-progress ${debtRatioClass(loanCenter?.finance.debtRatioBasisPoints ?? 0)}`} style={{ width: `${Math.min(100, (loanCenter?.finance.debtRatioBasisPoints ?? 0) / 100)}%` }} />
                    </i>
                  </div>
                  <div className={`loan-native-debt-bar ${loanCenter?.crisis.isActive ? "is-crisis" : ""}`}>
                    <div>
                      <span>总负债额度</span>
                      <strong>¥{compactNumber(loanCenter?.finance.totalDebt ?? profile.totalDebt)}</strong>
                    </div>
                    <div>
                      <span>本期应还</span>
                      <strong>¥{compactNumber(activeLoans.reduce((total, item) => total + item.monthlyPayment + item.penaltyAccrued, 0))}</strong>
                    </div>
                  </div>
                </section>

                {loanCenter?.crisis.isActive && (
                  <section className="loan-native-crisis" aria-label="债务危机">
                    <div>
                      <Icon name="zap" className="loan-native-icon is-danger" />
                      <strong>债务危机：{loanCenter.crisis.summary}</strong>
                    </div>
                    <div>
                      {loanCenter.crisis.routes.map((route) => (
                        <button key={route.id} type="button" onClick={() => setLoanCrisisModalRoute(route)}>
                          {route.title}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

              </section>

              {(loanNotice || loanError) && (
                <div className={`loan-native-toast ${loanError ? "is-error" : "is-success"}`} role="status" aria-live="polite">
                  {loanError || loanNotice}
                </div>
              )}

              <section className="loan-native-scroll">
                <section className="loan-native-products" aria-label="可用授信产品">
                  <header>
                    <Icon name="package" className="loan-native-small-icon" />
                    <span>可用授信产品</span>
                  </header>
                  <div className="loan-native-product-list">
                    {sortedLoanOffers.map((offer) => {
                      const activeLoan = activeLoans.find((loan) => loan.configId === offer.id);
                      const statusLabel = loanOfferStatusLabel(offer, activeLoan);
                      return (
                        <button
                          className={[
                            "loan-native-product",
                            offer.id === selectedLoanOffer?.id ? "selected" : "",
                            offer.isHighRisk ? "is-high-risk" : "",
                            activeLoan !== undefined ? "is-active" : ""
                          ].filter(Boolean).join(" ")}
                          key={offer.id}
                          type="button"
                          onClick={() => setSelectedLoanOfferId(offer.id)}
                        >
                          <span>
                            <strong>{offer.name}</strong>
                            {offer.isHighRisk && <em>高风险</em>}
                            <small>{offer.lender}</small>
                          </span>
                          <span>
                            <strong>¥{formatWan(offer.principal)}</strong>
                            <small className={offer.isAvailable || activeLoan !== undefined ? "is-open" : "is-locked"}>{statusLabel}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {selectedLoanOffer ? (
                  <article className="loan-native-detail" aria-label="贷款详情">
                    <header>
                      <div>
                        <strong>{selectedLoanOffer.name}</strong>
                        <span>{selectedLoanOffer.purposeTag}</span>
                      </div>
                      <em className={selectedLoanOffer.isAvailable || selectedOfferLoan ? "is-open" : "is-locked"}>
                        {loanOfferStatusLabel(selectedLoanOffer, selectedOfferLoan)}
                      </em>
                    </header>
                    <dl>
                      <div>
                        <dt>到账金额</dt>
                        <dd>¥{compactNumber(selectedLoanOffer.principal)}</dd>
                      </div>
                      <div>
                        <dt>月供账单</dt>
                        <dd>¥{compactNumber(selectedLoanOffer.monthlyPayment)}</dd>
                      </div>
                      <div>
                        <dt>授信期限</dt>
                        <dd>{selectedLoanOffer.termMonths}期</dd>
                      </div>
                      <div>
                        <dt>年化利率</dt>
                        <dd>{(selectedLoanOffer.annualRateBasisPoints / 100).toFixed(1)}%</dd>
                      </div>
                    </dl>
                    {selectedOfferLoan && (
                      <section className="loan-native-active">
                        <div>
                          <span>剩余本金</span>
                          <strong>¥{compactNumber(selectedOfferLoan.remainingPrincipal)}</strong>
                        </div>
                        <div>
                          <span>剩余期数</span>
                          <strong>{selectedOfferLoan.remainingMonths}/{selectedOfferLoan.termMonths}期</strong>
                        </div>
                        <div>
                          <span>罚息</span>
                          <strong>¥{compactNumber(selectedOfferLoan.penaltyAccrued)}</strong>
                        </div>
                      </section>
                    )}
                    {selectedOfferLoan && (
                      <p className="loan-native-due-text">下期账单：{selectedOfferLoan.nextDueText || `还差 ${selectedOfferLoan.nextDueTicks} 次经营脉冲`}</p>
                    )}
                    <p>{selectedLoanOffer.summary}</p>
                    <small className="loan-native-impact-note">月供压力高 · 逾期会降信用</small>
                    <ul>
                      {selectedLoanOffer.applicationImpact.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ) : (
                  <div className="loan-empty">暂无贷款配置。</div>
                )}
              </section>

              <footer className="loan-native-actions">
                <div>
                  <button
                    type="button"
                    disabled={!selectedLoan}
                    onClick={() => selectedLoan && void runLoanAction(`/finance/loans/${encodeURIComponent(selectedLoan.id)}/repay`, { mode: "full" })}
                  >
                    提前结清
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!selectedLoanOffer || (!selectedLoanOffer.isAvailable && !selectedOfferLoan)}
                  onClick={() => {
                    if (selectedOfferLoan) {
                      void runLoanAction(`/finance/loans/${encodeURIComponent(selectedOfferLoan.id)}/repay`, { mode: "scheduled" });
                      return;
                    }
                    if (selectedLoanOffer?.isAvailable) {
                      void runLoanAction("/finance/loans/apply", { loanConfigId: selectedLoanOffer.id });
                    }
                  }}
                >
                  {selectedOfferLoan ? loanPrimaryActionLabel(selectedLoanOffer, selectedOfferLoan) : selectedLoanOffer?.isAvailable ? "申请签约拨备" : loanPrimaryActionLabel(selectedLoanOffer, selectedOfferLoan)}
                </button>
              </footer>

              {loanCrisisModalRoute && (
                <div className="loan-native-modal" role="dialog" aria-modal="true" aria-label="债务危机方案">
                  <button className="loan-native-modal-backdrop" type="button" aria-label="关闭" onClick={() => setLoanCrisisModalRoute(null)} />
                  <section>
                    <header>
                      <span>
                        <Icon name={loanCrisisIcon(loanCrisisModalRoute.id)} className="loan-native-icon" />
                      </span>
                      <div>
                        <strong>{loanCrisisModalRoute.title}</strong>
                        <small>债务危机处理</small>
                      </div>
                    </header>
                    <p>{loanCrisisModalRoute.impact}</p>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          const routeId = loanCrisisModalRoute.id;
                          setLoanCrisisModalRoute(null);
                          void resolveCrisis(routeId);
                        }}
                      >
                        确认执行方案
                      </button>
                      <button type="button" onClick={() => setLoanCrisisModalRoute(null)}>暂时放弃</button>
                    </div>
                  </section>
                </div>
              )}
            </section>
          )}

          {activeNav === "任务" && (
            <section className="task-screen" aria-label="任务系统">
              <header className="task-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>任务</strong>
                  <span>主线 / 每日 / 支线</span>
                </div>
                <button type="button" onClick={() => selectedServer && account && void loadTasks(account.token, selectedServer.id)}>刷新</button>
              </header>

              <nav className="task-tabs" aria-label="任务分类">
                {[
                  ["main", "主线"],
                  ["daily", "每日"],
                  ["side", "支线"]
                ].map(([type, label]) => (
                  <button
                    className={activeTaskType === type ? "active" : undefined}
                    key={type}
                    type="button"
                    onClick={() => setActiveTaskType(type as TaskItem["type"])}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <p className="task-tip">{activeTaskTip}</p>
              {taskNotice && <p className="task-notice">{taskNotice}</p>}
              {taskError && <p className="task-error">{taskError}</p>}

              <section className="task-list" aria-label="任务列表">
                {visibleTasks.length === 0 ? (
                  <div className="task-empty">当前分类暂无任务，继续经营后会出现新的目标。</div>
                ) : visibleTasks.map((task) => (
                  <article className={task.isClaimed ? "claimed" : undefined} key={task.id}>
                    <header>
                      <strong>{task.title}</strong>
                      <span>{task.progress}/{task.target}</span>
                    </header>
                    <p>{task.description}</p>
                    <div className="task-progress-line">
                      <span>
                        <i style={{ width: `${Math.min((task.progress / task.target) * 100, 100)}%` }} />
                      </span>
                    </div>
                    <footer>
                      <small>奖励：{task.rewardLabel}{task.rewardCompanyExperience > 0 ? ` · 公司经验 ${task.rewardCompanyExperience}` : ""}{task.rewardItem ? ` · ${task.rewardItem.name} x${task.rewardItem.quantity}` : ""}</small>
                      <button disabled={task.isClaimed || claimingTaskId === task.id} type="button" onClick={() => guideTask(task)}>
                        {claimingTaskId === task.id ? "领取中" : task.isClaimed ? "已领取" : task.isClaimable ? "领取" : task.guideAction}
                      </button>
                    </footer>
                  </article>
                ))}
              </section>
            </section>
          )}

          {activeNav === "事件" && (
            <section className="event-screen" aria-label="专属经理提醒">
              <header className="event-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>专属经理</strong>
                  <span>经营提醒 / 随机任务 / 成长规划</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (account && selectedServer) {
                      void loadEvents(account.token, selectedServer.id);
                      void loadRandomTasks(account.token, selectedServer.id);
                      void loadPhase14Center(account.token, selectedServer.id);
                    }
                  }}
                >
                  刷新
                </button>
              </header>

              <section className="event-summary" aria-label="经营提醒概览">
                <span>提醒待办 {pendingEvents.length + activityManagerReminders.length}</span>
                <span>随机待办 {pendingRandomTasks.length}</span>
                <span>今日处理 {randomTaskCenter?.handledToday ?? 0}/{randomTaskCenter?.dailyLimit ?? 6}</span>
              </section>
              {eventNotice && <p className="event-notice">{eventNotice}</p>}
              {eventError && <p className="event-error">{eventError}</p>}
              {randomTaskNotice && <p className="event-notice">{randomTaskNotice}</p>}
              {randomTaskError && <p className="event-error">{randomTaskError}</p>}

              <nav className="business-tabs manager-tabs" aria-label="专属经理待办分类">
                <button className={managerTab === "events" ? "active" : undefined} type="button" onClick={() => setManagerTab("events")}>经营提醒</button>
                <button className={managerTab === "random" ? "active" : undefined} type="button" onClick={() => setManagerTab("random")}>随机任务</button>
                <button className={managerTab === "goals" ? "active" : undefined} type="button" onClick={() => setManagerTab("goals")}>成长目标</button>
              </nav>

              {managerTab === "goals" ? (
                <section className="event-layout">
                  <div className="event-list" aria-label="成长目标列表">
                    {longTermGoals === null ? (
                      <div className="event-empty">成长目标读取中，请稍候。</div>
                    ) : longTermGoals.sections.map((section) => (
                      <button
                        className={section.key === "today" ? "selected" : undefined}
                        key={section.key}
                        type="button"
                        onClick={() => undefined}
                      >
                        <span>{section.goals.filter((goal) => goal.isCompleted || goal.isClaimable).length}/{section.goals.length}</span>
                        <strong>{section.title}</strong>
                        <em>{section.summary}</em>
                        <small>{section.goals.some((goal) => goal.isClaimable) ? "可领取" : "推进中"}</small>
                      </button>
                    ))}
                  </div>

                  <article className="event-detail" aria-label="成长目标详情">
                    {longTermGoals ? (
                      <>
                        <div className="event-title">
                          <span>目</span>
                          <strong>成长目标</strong>
                          <em>今天做什么，本周追什么，赛季争什么，长期收集什么</em>
                        </div>
                        <dl className="event-risk">
                          <div>
                            <dt>公司等级</dt>
                            <dd>LV.{longTermGoals.profile.companyLevel}/{longTermGoals.profile.maxLevel}</dd>
                          </div>
                          <div>
                            <dt>今日待领</dt>
                            <dd>{longTermGoals.summaries.todayClaimableCount}</dd>
                          </div>
                          <div>
                            <dt>长期收集</dt>
                            <dd>成就 {longTermGoals.summaries.achievementCompletedCount} · 称号 {longTermGoals.summaries.titleCount} · 宝箱 {longTermGoals.summaries.fullLevelChestClaimableCount}</dd>
                          </div>
                        </dl>
                        <div className="event-options">
                          {longTermGoals.sections.flatMap((section) => section.goals.slice(0, 3).map((goal) => (
                            <button key={goal.id} type="button" onClick={() => openLongTermGoalAction(goal)}>
                              <strong>{goal.title}</strong>
                              <span>{goal.statusLabel} · {goal.description}</span>
                            </button>
                          )))}
                        </div>
                      </>
                    ) : (
                      <div className="event-empty">成长目标读取中，请稍候。</div>
                    )}
                  </article>
                </section>
              ) : managerTab === "events" ? (
                <section className="event-layout">
                  <div className="event-list" aria-label="提醒列表">
                    {events.length === 0 && activityManagerReminders.length === 0 ? (
                      <div className="event-empty">暂无经营提醒，继续推进公司后会出现新的待办。</div>
                    ) : [...activityManagerReminders, ...events.map((item) => ({
                      id: item.id,
                      source: item.source,
                      title: item.title,
                      summary: item.summary,
                      status: item.status === "pending" ? "待决策" : "已处理"
                    }))].map((item) => (
                      <button
                        className={item.id === selectedEvent?.id ? "selected" : undefined}
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.id.startsWith("activity-")) {
                            setActiveNav("公司");
                            setNativeHomePage("season");
                          } else {
                            setSelectedEventId(item.id);
                          }
                        }}
                      >
                        <span>{item.source}</span>
                        <strong>{item.title}</strong>
                        <em>{item.summary}</em>
                        <small>{item.status}</small>
                      </button>
                    ))}
                  </div>

                  <article className="event-detail" aria-label="提醒详情">
                    {selectedEvent ? (
                      <>
                        <div className="event-title">
                          <span>{selectedEvent.source.slice(0, 2)}</span>
                          <strong>{selectedEvent.title}</strong>
                          <em>{selectedEvent.channel} · {selectedEvent.status === "pending" ? "待处理" : "已结算"}</em>
                        </div>

                        <p>{selectedEvent.context}</p>

                        <dl className="event-risk">
                          <div>
                            <dt>摘要</dt>
                            <dd>{selectedEvent.summary}</dd>
                          </div>
                          <div>
                            <dt>风险解释</dt>
                            <dd>{selectedEvent.riskExplanation}</dd>
                          </div>
                          <div>
                            <dt>知识点</dt>
                            <dd>{selectedEvent.knowledge?.title ?? selectedEvent.knowledgeTitle ?? "待解锁"} · {selectedEvent.knowledge?.isUnlocked ? "已解锁" : "待解锁"}</dd>
                          </div>
                          {selectedEvent.knowledge && (
                            <div>
                              <dt>相关知识卡</dt>
                              <dd>
                                {selectedEvent.knowledge.summary}
                                <button type="button" onClick={() => openKnowledgeLink(selectedEvent.knowledge)}>查看知识库</button>
                              </dd>
                            </div>
                          )}
                          {selectedEvent.knowledge && (
                            <div>
                              <dt>来源</dt>
                              <dd>{selectedEvent.knowledge.sourceName} · {selectedEvent.knowledge.collectedAt}</dd>
                            </div>
                          )}
                        </dl>

                        {selectedEvent.status === "resolved" && selectedEvent.knowledge && (
                          <section className="event-result">
                            <strong>相关知识卡</strong>
                            <p>{selectedEvent.knowledge.title}：{selectedEvent.knowledge.summary}</p>
                            <span>{selectedEvent.knowledge.sourceName} · {selectedEvent.knowledge.contentVersion}</span>
                            <button type="button" onClick={() => openKnowledgeLink(selectedEvent.knowledge)}>查看完整卡片</button>
                          </section>
                        )}

                        {selectedEvent.status === "pending" ? (
                          <div className="event-options">
                            {selectedEvent.options.map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                onClick={() => void chooseEvent(selectedEvent.id, option.key)}
                              >
                                <strong>{option.label}</strong>
                                <span>{option.impactPreview}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <section className="event-result">
                            <strong>处理结果</strong>
                            <p>{selectedEvent.resultSummary}</p>
                            <span>选择：{selectedEvent.selectedOption}</span>
                          </section>
                        )}
                      </>
                    ) : (
                      <div className="event-empty">经营提醒读取中，请稍候。</div>
                    )}
                  </article>
                </section>
              ) : (
                <section className="event-layout">
                  <div className="event-list" aria-label="随机任务列表">
                    {pendingRandomTasks.length === 0 ? (
                      <div className="event-empty">当前没有待处理随机任务，继续推进主线或稍后刷新。</div>
                    ) : pendingRandomTasks.map((task) => (
                      <button
                        className={task.id === selectedRandomTask?.id ? "selected" : undefined}
                        key={task.id}
                        type="button"
                        onClick={() => setSelectedRandomTaskId(task.id)}
                      >
                        <span>{task.source}</span>
                        <strong>{task.title}</strong>
                        <em>{task.description}</em>
                        <small>{task.riskLabel}</small>
                      </button>
                    ))}
                  </div>

                  <article className="event-detail" aria-label="随机任务详情">
                    {selectedRandomTask ? (
                      <>
                        <div className="event-title">
                          <span>{selectedRandomTask.source.slice(0, 2)}</span>
                          <strong>{selectedRandomTask.title}</strong>
                          <em>{selectedRandomTask.source} · {selectedRandomTask.riskLabel}</em>
                        </div>

                        <p>{selectedRandomTask.description}</p>

                        <dl className="event-risk">
                          <div>
                            <dt>行动力</dt>
                            <dd>{profile.actionPower}/{profile.actionPowerLimit}</dd>
                          </div>
                          <div>
                            <dt>待办说明</dt>
                            <dd>随机任务第一触达使用独立短决策弹窗；在专属经理中可随时重新打开。</dd>
                          </div>
                          {selectedRandomTask.knowledge && (
                            <div>
                              <dt>相关知识卡</dt>
                              <dd>{selectedRandomTask.knowledge.title} · {selectedRandomTask.knowledge.isUnlocked ? "已解锁" : "结算后查看提示"}</dd>
                            </div>
                          )}
                        </dl>

                        <div className="event-options">
                          <button type="button" onClick={() => openRandomTaskModal(selectedRandomTask.id)}>
                            <strong>打开决策弹窗</strong>
                            <span>查看 2 个经营选择、行动力消耗和收益预览</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="event-empty">随机任务会在主页空闲时弹出，也可稍后刷新后从这里处理。</div>
                    )}
                  </article>
                </section>
              )}
            </section>
          )}

          {activeKnowledgeTask && (
            <section className="page-container page-active" aria-label={activeKnowledgeTask.unlockKind === "compliance" ? "合规支线" : "创业知识"} data-testid="native-knowledge-task">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name={activeKnowledgeTask.unlockKind === "compliance" ? "shield-check" : "file-search"} className="w-7 h-7 text-business-gold" />
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase">
                      {activeKnowledgeTask.unlockKind === "compliance" ? "合同复核支线" : "创业知识卡"}
                    </h2>
                    <span className="text-[10px] text-slate-500">阅读后推进支线进度</span>
                  </div>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭知识页" onClick={() => setActiveKnowledgeTask(null)}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 scroll-hide">
                <article className="glass-panel rounded-3xl p-5">
                  <h3 className="text-lg text-white font-black">{activeKnowledgeTask.title}</h3>
                  <p className="mt-2 text-xs text-slate-300 font-bold leading-5">{activeTaskKnowledgeEntry?.summary || activeKnowledgeTask.description}</p>
                  {activeTaskKnowledgeEntry && !activeTaskKnowledgeEntry.isUnlocked && (
                    <p className="mt-3 rounded-2xl bg-slate-900/60 border border-white/5 p-3 text-[10px] text-slate-400 font-bold leading-5">
                      这张知识卡尚未解锁，先通过对应经营事件或成就解锁后再推进支线。
                    </p>
                  )}
                  <dl className="mt-5 space-y-3">
                    <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-4">
                      <dt className="text-[10px] text-business-gold font-black">经营场景</dt>
                      <dd className="mt-2 text-xs text-slate-300 font-bold leading-5">{activeTaskKnowledgeEntry?.scenarioText || (activeKnowledgeTask.unlockKind === "compliance" ? "客户合同进入交付前复核，确认回款、验收和违约条款。" : "员工入职后需要规范签署劳动合同，避免用工争议扩大。")}</dd>
                    </div>
                    <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-4">
                      <dt className="text-[10px] text-business-gold font-black">风险提示</dt>
                      <dd className="mt-2 text-xs text-slate-300 font-bold leading-5">{activeTaskKnowledgeEntry?.riskText || (activeKnowledgeTask.unlockKind === "compliance" ? "合同条款不清会影响项目结算、客户满意度和现金回收。" : "用工资料不完整会增加劳动争议、赔偿和声誉风险。")}</dd>
                    </div>
                    <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-4">
                      <dt className="text-[10px] text-business-gold font-black">游戏影响</dt>
                      <dd className="mt-2 text-xs text-slate-300 font-bold leading-5">{activeTaskKnowledgeEntry?.gameImpactText || "阅读并确认后推进支线进度，奖励领取仍以后端任务状态为准。"}</dd>
                    </div>
                    <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-4">
                      <dt className="text-[10px] text-business-gold font-black">行动建议</dt>
                      <dd className="mt-2 text-xs text-slate-300 font-bold leading-5">{activeTaskKnowledgeEntry?.actionTipText || "先确认资料、流程和经营边界，再推进高风险动作。"}</dd>
                    </div>
                  </dl>
                  {activeTaskKnowledgeEntry && (
                    <a className="mt-4 block text-[10px] text-business-gold underline decoration-business-gold/40" href={activeTaskKnowledgeEntry.sourceUrl} target="_blank" rel="noreferrer">
                      {activeTaskKnowledgeEntry.sourceName} · {activeTaskKnowledgeEntry.collectedAt} · {activeTaskKnowledgeEntry.contentVersion}
                    </a>
                  )}
                  <p className="mt-4 text-[10px] text-slate-500 font-bold leading-5">{activeTaskKnowledgeEntry?.disclaimer ?? "本内容用于游戏内经营知识提示，不构成法律、财务或投资建议。"}</p>
                </article>
                <button
                  className="btn-gold w-full py-3 rounded-2xl text-sm font-black text-business-dark"
                  disabled={activeTaskKnowledgeEntry === undefined || !activeTaskKnowledgeEntry.isUnlocked}
                  type="button"
                  onClick={() => {
                    void progressTask(activeKnowledgeTask.id, activeKnowledgeTask.knowledgeId);
                    setActiveKnowledgeTask(null);
                    openTaskScreen();
                  }}
                >
                  {activeTaskKnowledgeEntry?.isUnlocked ? "我已理解" : "知识卡未解锁"}
                </button>
              </div>
            </section>
          )}

          {selectedPanel && (
            <section className="page-container page-active" aria-label={selectedPanel.title} data-testid="native-info-panel">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="file-text" className="w-7 h-7 text-business-gold" />
                  <h2 className="text-xl font-black text-white italic uppercase">{selectedPanel.title}</h2>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭说明页" onClick={() => setActivePanel(null)}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 scroll-hide">
                <section className="glass-panel rounded-3xl p-5 space-y-3">
                  {selectedPanel.lines.map((line) => (
                    <p className="text-xs text-slate-300 font-bold leading-6" key={line}>{line}</p>
                  ))}
                </section>
                <button
                  className="btn-gold w-full py-3 rounded-2xl text-sm font-black text-business-dark"
                  type="button"
                  onClick={activePanel === "设置" ? leaveGame : () => setActivePanel(null)}
                >
                  {selectedPanel.action}
                </button>
              </div>
            </section>
          )}

          {activeRandomTask && (
            <section className="random-task-overlay" aria-label="随机经营任务弹窗" data-testid="random-task-modal">
              <article className="random-task-modal">
                <header className="random-task-modal-hero">
                  <button className="random-task-close" type="button" aria-label="稍后处理随机任务" onClick={snoozeRandomTaskModal}>
                    <Icon name="x" className="w-5 h-5" />
                  </button>
                  <span className="random-task-badge">{activeRandomTask.riskLabel}</span>
                  <h3>{activeRandomTask.title}</h3>
                  <p>来源：{activeRandomTask.source}</p>
                </header>

                <div className="random-task-modal-body">
                  <p>{activeRandomTask.description}</p>

                  {activeRandomTask.knowledge && (
                    <section className="event-result">
                      <strong>相关知识卡</strong>
                      <p>{activeRandomTask.knowledge.title}：{activeRandomTask.knowledge.summary}</p>
                      <span>{activeRandomTask.knowledge.sourceName} · {activeRandomTask.knowledge.contentVersion}</span>
                      <button type="button" onClick={() => openKnowledgeLink(activeRandomTask.knowledge)}>查看知识库</button>
                    </section>
                  )}

                  {(randomTaskNotice || randomTaskError) && (
                    <span className={randomTaskError ? "random-task-error" : "random-task-notice"}>
                      {randomTaskError || randomTaskNotice}
                    </span>
                  )}

                  {activeRandomTaskModifier && (
                    <label className="random-task-modifier">
                      <input
                        checked={randomTaskModifierItemId === activeRandomTaskModifier.itemId}
                        disabled={(activeRandomTaskModifier.item?.quantity ?? 0) <= 0}
                        type="checkbox"
                        onChange={(event) => setRandomTaskModifierItemId(event.target.checked ? activeRandomTaskModifier.itemId : "")}
                      />
                      <span>
                        <strong>{activeRandomTaskModifier.label} x{activeRandomTaskModifier.item?.quantity ?? 0}</strong>
                        <em>{(activeRandomTaskModifier.item?.quantity ?? 0) > 0 ? activeRandomTaskModifier.enabledHint : activeRandomTaskModifier.emptyHint}</em>
                      </span>
                    </label>
                  )}

                  <div className="random-task-options">
                    {activeRandomTask.options.map((option) => {
                      const shouldUseRiskInsurance =
                        randomTaskModifierItemId === "risk-insurance" &&
                        (riskInsuranceItem?.quantity ?? 0) > 0 &&
                        activeRandomTask.category !== "season" &&
                        (option.cashReward < 0 || option.reputationReward < 0);
                      const shouldUseMarketIntel =
                        randomTaskModifierItemId === "market-intel" &&
                        (marketIntelItem?.quantity ?? 0) > 0 &&
                        (activeRandomTask.category === "market" || activeRandomTask.category === "season");
                      const shouldUseFinanceAdvisor =
                        randomTaskModifierItemId === "finance-advisor-card" &&
                        (financeAdvisorItem?.quantity ?? 0) > 0 &&
                        (activeRandomTask.category === "finance" || activeRandomTask.category === "funding" || activeRandomTask.category === "loan");
                      const modifierItemId = shouldUseFinanceAdvisor ? "finance-advisor-card" : shouldUseMarketIntel ? "market-intel" : shouldUseRiskInsurance ? "risk-insurance" : undefined;
                      return (
                        <button
                          disabled={profile.actionPower < option.actionPowerCost}
                          key={option.key}
                          type="button"
                          onClick={() => void resolveRandomTask(activeRandomTask.id, option.key, modifierItemId)}
                        >
                          <span>
                            <strong>{option.label}</strong>
                            <em>行动力 -{option.actionPowerCost}</em>
                          </span>
                          <small>
                            资金 {compactNumber(option.cashReward)} · 声望 {option.reputationReward} · 经验 {option.companyExperienceReward}
                            {modifierItemId === "risk-insurance" ? " · 使用风险保险" : modifierItemId === "market-intel" ? " · 使用市场情报" : modifierItemId === "finance-advisor-card" ? " · 使用财务顾问卡" : ""}
                          </small>
                        </button>
                      );
                    })}
                  </div>

                  <button className="random-task-snooze" type="button" onClick={snoozeRandomTaskModal}>
                    稍后处理，转入专属经理待办
                  </button>
                </div>
              </article>
            </section>
          )}
        </section>
      </main>
    );
  }

  if (step === "auth") {
    return (
      <main className="auth-screen" aria-label="玩家登录">
        <section className="auth-canvas" aria-label="游戏入口">
          <img alt="" className="design-image" src="/game-ui/zhucegai2.png" />
          <div className="auth-title" aria-hidden="true">
            <span>写字楼</span>
            <strong>创业记</strong>
            <em>从一间办公室到商业帝国</em>
          </div>

          <div className="server-ribbon" aria-label="当前区服">
            <span className="server-label">{selectedServer?.name ?? "S1 创业中心"}</span>
            <button
              aria-expanded={isServerPickerOpen}
              aria-label="换服"
              onClick={() => setIsServerPickerOpen(true)}
              type="button"
            />
          </div>

          <form className="auth-panel" onSubmit={submitAuth}>
            <label className="game-input-row">
              <span className="sr-only">账号</span>
              <input
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder=""
                value={username}
              />
            </label>
            <label className="game-input-row">
              <span className="sr-only">密码</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder=""
                type="text"
                value={password}
              />
            </label>
            <label className="auth-remember">
              <input
                checked={rememberPassword}
                onChange={(event) => setRememberPassword(event.target.checked)}
                type="checkbox"
              />
              <span>记住密码</span>
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="auth-actions">
              <button aria-label={isBusy && authMode === "login" ? "正在登录" : "登录进入游戏"} className="gold-button" disabled={isBusy} type="submit" />
            </div>
          </form>
          {isServerPickerOpen && (
            <section className="server-picker" aria-label="选择区服">
              <button
                className="server-picker-backdrop"
                type="button"
                aria-label="关闭区服列表"
                onClick={() => setIsServerPickerOpen(false)}
              />
              <div className="server-list-card">
                <div className="server-list-header">
                  <div>
                    <span className="server-list-icon layers" aria-hidden="true" />
                    <h2>选择区服</h2>
                  </div>
                  <button
                    className="server-list-close"
                    type="button"
                    aria-label="关闭区服列表"
                    onClick={() => setIsServerPickerOpen(false)}
                  >
                    <span aria-hidden="true" />
                  </button>
                </div>

                <div className="server-list-body">
                  <div className="server-category-nav" aria-label="区服分类">
                    <button
                      className={activeServerCategory === "recent" ? "cat-tab active" : "cat-tab"}
                      type="button"
                      onClick={() => setActiveServerCategory("recent")}
                    >
                      <span className="server-list-icon clock" aria-hidden="true" />
                      <span>最近登录</span>
                    </button>
                    <button
                      className={activeServerCategory === "all" ? "cat-tab active" : "cat-tab"}
                      type="button"
                      onClick={() => setActiveServerCategory("all")}
                    >
                      <span className="server-list-icon server" aria-hidden="true" />
                      <span>全部区服</span>
                    </button>
                  </div>

                  <div className="server-list-scroll">
                    {serverPickerServers.map((server, index) => {
                      const statusClass = serverStatusClass(server);
                      return (
                        <button
                          className={server.id === serverId ? "server-item selected" : "server-item"}
                          key={server.id}
                          style={{ animationDelay: `${0.04 + index * 0.06}s` }}
                          type="button"
                          onClick={() => {
                            setServerId(server.id);
                          }}
                        >
                          <span className="server-item-main">
                            <span className="server-list-id">{server.id.toUpperCase()}</span>
                            <span className="server-list-name">{server.name}</span>
                            {server.isRecommended && <span className="server-recommend-tag">推荐</span>}
                          </span>
                          <span className={`server-list-status ${statusClass}`}>
                            <i className="status-dot" />
                            {serverStatusText(server)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="server-list-footer">
                  <div>
                    <i aria-hidden="true" />
                    <span>
                      <em>当前选择</em>
                      <strong>{selectedServer ? `${selectedServer.id.toUpperCase()}区 · ${selectedServer.name}` : "未选择"}</strong>
                    </span>
                  </div>
                  <span>v1.0.42</span>
                </div>
              </div>
            </section>
          )}
        </section>
      </main>
    );
  }

  if (step === "profile") {
    return (
      <main className="founder-screen" aria-label="选择角色与命名">
        <section className="founder-canvas" aria-label="创建创始人档案">
          <img alt="" className="design-image" src="/game-ui/xuanjiao.png" />
          <div className="founder-title" aria-hidden="true">
            <span>写字楼</span>
            <strong>创业记</strong>
            <em>从一间办公室到商业帝国</em>
          </div>

          <section className="founder-cards" aria-label="选择创业者类型">
            {avatars.map((avatar) => (
              <button
                aria-pressed={avatar.id === avatarId}
                className={`founder-card ${avatarClassById[avatar.id] ?? "strategy"} ${
                  avatar.id === avatarId ? "selected" : ""
                }`}
                key={avatar.id}
                onClick={() => setAvatarId(avatar.id)}
                type="button"
              >
                <span className="founder-medal">{avatar.glyph}</span>
                <strong>{avatar.name.replace("创始人", "")}</strong>
                <small>{avatar.specialty}</small>
              </button>
            ))}
          </section>

          <form className="founder-panel" onSubmit={(event) => void submitProfile(event)}>
            <label className="game-input-row">
              <span className="sr-only">创始人姓名</span>
              <input
                autoComplete="name"
                onChange={(event) => setFounderName(event.target.value)}
                placeholder=""
                value={founderName}
              />
            </label>
            <label className="game-input-row">
              <span className="sr-only">公司名称</span>
              <input
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder=""
                value={companyName}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button aria-label={isBusy ? "创建中" : "创建档案"} className="gold-button" disabled={isBusy} type="submit" />
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-panel" aria-label="进入游戏">
        <div className="panel-heading">
          <h1>写字楼创业记</h1>
          <p>选择区服，创建你的创始人和公司档案。</p>
        </div>

        <ol className="step-list" aria-label="引导步骤">
          {["账号", "服务器", "头像", "档案"].map((label, index) => (
            <li className={index <= ["auth", "server", "avatar", "profile"].indexOf(step) ? "active" : ""} key={label}>
              {label}
            </li>
          ))}
        </ol>

        {error && <p className="form-error">{error}</p>}

        {step === "server" && (
          <section className="choice-list" aria-label="选择服务器">
            {servers.map((server) => (
              <button
                className={server.id === serverId ? "choice selected" : "choice"}
                key={server.id}
                onClick={() => setServerId(server.id)}
                type="button"
              >
                <span>{server.name}</span>
                <small>{server.label}</small>
              </button>
            ))}
            <div className="flow-actions">
              <button type="button" onClick={() => setStep("auth")}>
                返回
              </button>
              <button className="primary-button" disabled={isBusy} type="button" onClick={() => void continueFromServer()}>
                {isBusy ? "读取中" : "进入区服"}
              </button>
            </div>
          </section>
        )}

        {step === "avatar" && (
          <section className="avatar-grid" aria-label="选择头像">
            {avatars.map((avatar) => (
              <button
                className={avatar.id === avatarId ? "avatar-choice selected" : "avatar-choice"}
                key={avatar.id}
                onClick={() => setAvatarId(avatar.id)}
                type="button"
              >
                <span>{avatar.glyph}</span>
                <strong>{avatar.name}</strong>
                <small>{avatar.specialty}</small>
              </button>
            ))}
            <div className="flow-actions wide">
              <button type="button" onClick={() => setStep("server")}>
                返回
              </button>
              <button className="primary-button" type="button" onClick={() => setStep("profile")}>
                填写档案
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
