import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";
const SESSION_KEY = "wenziyouxi.client.session";
const REMEMBER_AUTH_KEY = "wenziyouxi.client.rememberAuth";
const SESSION_VERSION = 1;

type OnboardingStep = "auth" | "server" | "avatar" | "profile" | "game";
type AuthMode = "login" | "register";
type NativeHomePage = "leaderboard" | "season" | "shop" | "privilege" | "pass" | "bag" | "negotiation" | "vip" | "guild" | "finance";

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
  status: "pending" | "funded" | "failed";
  resultSummary: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

type FundingCenter = {
  offers: FundingOffer[];
  fundings: PlayerFunding[];
  finance: CompanyFinance;
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
  activities: Array<{ id: string; name: string; status: SeasonStatus; leaderboardKey: string; isJoined: boolean; score: number; targetScore: number; rewardClaimed: boolean }>;
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
};

type LeaderboardSettlement = {
  leaderboard: LeaderboardCenter;
  deliveredRewards: number;
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

const shopCategoryLabels: Record<string, string> = {
  first_charge: "首充",
  daily_pack: "每日",
  weekly_card: "周卡",
  monthly_card: "月卡",
  growth_fund: "基金",
  recruit_ticket: "猎头",
  employee_pack: "员工",
  operation_pack: "经营",
  risk_insurance: "保险",
  activity_shop: "活动"
};

const sideActions = ["财务", "融资", "贷款"];
const rightActions = ["活动", "排行", "商业", "特权", "通行证", "专属经理"];
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
  "mail": ["M4 6h16v12H4Z", "m4 7 8 6 8-6"],
  "megaphone": ["M3 11v4h4l10 4V7L7 11Z", "M7 15l2 5"],
  "package": ["M21 8 12 3 3 8l9 5 9-5Z", "M3 8v8l9 5 9-5V8", "M12 13v8"],
  "package-open": ["M3 9 12 4l9 5-9 5Z", "M3 9v8l9 5 9-5V9", "M12 14v8"],
  "plus": ["M12 5v14", "M5 12h14"],
  "radar": ["M12 20a8 8 0 1 0-8-8", "M12 12l6-6", "M12 12h8", "M12 4v4", "M4 12h4"],
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
    title: "商业",
    lines: ["首充、礼包、猎头和保险等普通商品集中展示。", "月卡基金归特权，赛季付费归通行证。"],
    action: "进入商业"
  },
  "特权": {
    title: "特权",
    lines: ["月卡和成长基金集中展示。", "平台币消费会计入 VIP 经验。"],
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
    title: "特惠商城",
    lines: ["月卡、成长基金、猎头契约和经营保险集中展示。", "平台币消费会计入 VIP 经验，后台发放平台币不直接计入。"],
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

const formatWan = (value: number): string => `${(value / 10000).toFixed(1)}万`;

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
  const [managerTab, setManagerTab] = useState<"events" | "random">("events");
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
  const [fundingCenter, setFundingCenter] = useState<FundingCenter | null>(null);
  const [selectedFundingOfferId, setSelectedFundingOfferId] = useState("");
  const [selectedFundingId, setSelectedFundingId] = useState("");
  const [fundingError, setFundingError] = useState("");
  const [fundingNotice, setFundingNotice] = useState("");
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
  const [shopError, setShopError] = useState("");
  const [shopNotice, setShopNotice] = useState("");
  const [inventoryCenter, setInventoryCenter] = useState<InventoryCenter | null>(null);
  const [inventoryError, setInventoryError] = useState("");
  const [vipCenter, setVipCenter] = useState<VipCenter | null>(null);
  const [vipError, setVipError] = useState("");
  const [vipNotice, setVipNotice] = useState("");
  const [seasonCenter, setSeasonCenter] = useState<SeasonCenter | null>(null);
  const [seasonError, setSeasonError] = useState("");
  const [seasonNotice, setSeasonNotice] = useState("");
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
  const knowledgeByCategory = useMemo(() => {
    const groups: Array<{ category: string; entries: KnowledgeEntry[] }> = [];
    for (const entry of knowledgeEntries) {
      const group = groups.find((item) => item.category === entry.category);
      if (group) {
        group.entries.push(entry);
      } else {
        groups.push({ category: entry.category, entries: [entry] });
      }
    }
    return groups;
  }, [knowledgeEntries]);
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
  const selectedFundingOffer = useMemo(
    () => fundingCenter?.offers.find((item) => item.id === selectedFundingOfferId) ?? fundingCenter?.offers[0],
    [fundingCenter?.offers, selectedFundingOfferId]
  );
  const pendingFundings = useMemo(
    () => fundingCenter?.fundings.filter((item) => item.status === "pending") ?? [],
    [fundingCenter?.fundings]
  );
  const selectedFunding = useMemo(
    () => pendingFundings.find((item) => item.id === selectedFundingId) ?? pendingFundings[0],
    [pendingFundings, selectedFundingId]
  );
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
    () => shopCenter?.products.find((item) => item.id === selectedShopProductId) ?? shopCenter?.products[0],
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
  const commercePurchases = useMemo(
    () =>
      shopCenter?.purchases.filter((purchase) => {
        const product = shopCenter.products.find((item) => item.id === purchase.productId);
        return product !== undefined && product.category !== "monthly_card" && product.category !== "weekly_card" && product.category !== "growth_fund";
      }) ?? [],
    [shopCenter]
  );
  const privilegePurchases = useMemo(
    () =>
      shopCenter?.purchases.filter((purchase) => {
        const product = shopCenter.products.find((item) => item.id === purchase.productId);
        return product?.category === "monthly_card" || product?.category === "weekly_card" || product?.category === "growth_fund";
      }) ?? [],
    [shopCenter]
  );
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
  const currentCrossGuildRank = crossServerCenter?.guildBoard.rows.find((row) => row.guildId === crossServerCenter.guildSeason.guildId)?.rank ?? "-";
  const latestGuildSettlement = guildHistory?.settlements[0] ?? null;
  const latestCrossGuildSettlement = crossServerGuildHistory?.settlements[0] ?? null;
  const currentGuildMember = profile === null ? null : guildCenter?.members.find((member) => member.profileId === profile.id) ?? null;
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
    setSelectedShopProductId((currentId) => nextShopCenter.products.find((item) => item.id === currentId)?.id ?? nextShopCenter.products[0]?.id ?? "");
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            platformCoins: nextShopCenter.wallet.balance
          }
    );
  };

  const applyVipCenter = (nextVipCenter: VipCenter): void => {
    setVipCenter(nextVipCenter);
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
      { scoreDelta: 260 },
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
      setPhase14Notice(response.data.deliveredRewards > 0 ? `跨服奖励已结算 ${response.data.deliveredRewards} 份。` : "跨服奖励已结算，本日没有重复发放。");
      setPhase14Error("");
      await loadPhase14Center(account.token, selectedServer.id);
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

  const settleCrossServerGuild = async (): Promise<void> => {
    if (!account || !selectedServer) {
      return;
    }

    const response = await apiRequest<LeaderboardSettlement>(
      "/cross-server/guild/settle",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setPhase14Notice(response.data.deliveredRewards > 0 ? `跨服商会赛季已结算 ${response.data.deliveredRewards} 份声望奖励。` : "跨服商会赛季已结算，本日没有重复发放。");
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
      setError("无法连接游戏服务器，请确认 API 服务已启动。");
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
      setError("创建角色失败，请确认 API 服务已启动。");
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

  const openHomePanel = (panelName: string): void => {
    if (panelName === "财务") {
      setActivePanel(null);
      setNativeHomePage("finance");
      if (account && selectedServer) {
        void loadCompanyFinance(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "活动" || panelName === "限时活动") {
      setActivePanel(null);
      setNativeHomePage("season");
      if (account && selectedServer) {
        void loadSeasonCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "排行榜" || panelName === "排行") {
      setActivePanel(null);
      setNativeHomePage("leaderboard");
      if (account && selectedServer) {
        void loadPhase14Center(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "商业" || panelName === "商城" || panelName === "特惠商城") {
      setActivePanel(null);
      setNativeHomePage("shop");
      if (account && selectedServer) {
        void loadShopCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "特权" || panelName === "月卡" || panelName === "创业基金") {
      setActivePanel(null);
      setNativeHomePage("privilege");
      if (account && selectedServer) {
        void loadShopCenter(account.token, selectedServer.id);
        void loadVipCenter(account.token, selectedServer.id);
      }
      return;
    }

    if (panelName === "通行证" || panelName === "赛季通行证") {
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

    if (panelName === "专属经理") {
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

  const settleFinanceMonth = async (): Promise<void> => {
    if (!account || !selectedServer || !companyFinance) {
      return;
    }

    const response = await apiRequest<CompanyFinance>(
      "/finance/settle-month",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, reportMonth: companyFinance.financeMonth })
      },
      account.token
    );

    if (response.success) {
      applyCompanyFinance(response.data);
      setFinanceError("");
      return;
    }

    setFinanceError(response.error.message);
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

  const runFundingAction = async (path: string, body: Record<string, string> = {}): Promise<void> => {
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
      setShopNotice(response.data.result);
      setShopError("");
      await loadShopCenter(account.token, selectedServer.id);
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
      openHomePanel("商业");
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
              <button className="flex items-center gap-2 text-left" type="button" onClick={() => openHomePanel("VIP")}>
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
              <button className="pointer-events-auto inline-flex w-fit items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-slate-950/70 px-3 py-1 text-[10px] font-black text-emerald-200" type="button" onClick={() => openHomePanel("财务")}>
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
              {rightActions.map((item, index) => (
                <button className="flex flex-col items-center gap-1 group relative" type="button" key={item} onClick={() => openHomePanel(item)}>
                  {[0, 3, 4].includes(index) && <span className="red-dot" />}
                  <span className="w-12 h-12 glass-panel rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name={homeActionIcons[item] ?? "box"} className={`w-6 h-6 ${homeActionIconClasses[item] ?? ""}`} />
                  </span>
                  <span className="text-[10px] text-white/90 font-bold drop-shadow-md">{item}</span>
                </button>
              ))}
            </div>

            <button className="absolute bottom-24 left-4 right-24 glass-panel p-2.5 rounded-2xl flex items-center gap-3 active:scale-95 transition-transform cursor-pointer text-left" type="button" onClick={openTaskScreen}>
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
                    <Icon name="gem" className="w-2.5 h-2.5" /> {highlightedTask ? highlightedTask.rewardLabel : "请确认 API 服务已启动"}
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

          {nativeHomePage === "finance" && (
            <section className="page-container page-active" aria-label="财务" data-testid="native-finance">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="pie-chart" className="w-7 h-7 text-business-gold" />
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase">Finance 财务</h2>
                    <span className="text-[10px] text-slate-500">现金流、估值、负债与月度经营报告</span>
                  </div>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭财务" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 scroll-hide">
                {companyFinance ? (
                  <>
                    <section className="grid grid-cols-2 gap-3">
                      {[
                        ["现金", compactNumber(companyFinance.cash)],
                        ["月收入", compactNumber(companyFinance.monthlyIncome)],
                        ["月支出", compactNumber(companyFinance.monthlyExpense)],
                        ["净现金流", compactNumber(companyFinance.netCashFlow)],
                        ["估值", compactNumber(companyFinance.valuation)],
                        ["股权", `${(companyFinance.founderEquityBasisPoints / 100).toFixed(1)}%`],
                        ["负债率", `${(companyFinance.debtRatioBasisPoints / 100).toFixed(1)}%`],
                        ["信用", companyFinance.creditRating]
                      ].map(([label, value]) => (
                        <div className="glass-panel rounded-2xl p-4" key={label}>
                          <div className="text-[10px] text-slate-400 font-bold">{label}</div>
                          <div className="mt-2 text-xl text-business-gold font-black">{value}</div>
                        </div>
                      ))}
                    </section>

                    <section className={`glass-panel rounded-3xl p-4 border ${companyFinance.riskStatus === "稳健" ? "border-emerald-400/40" : "border-amber-400/40"}`}>
                      <strong className={companyFinance.riskStatus === "稳健" ? "text-emerald-200 font-black" : "text-amber-200 font-black"}>
                        {companyFinance.riskStatus}
                      </strong>
                      <div className="mt-2 space-y-1">
                        {companyFinance.riskTips.map((tip) => (
                          <p className="text-xs text-slate-300 font-bold leading-5" key={tip}>{tip}</p>
                        ))}
                      </div>
                    </section>

                    {companyFinance.businessClock && (
                      <section className="glass-panel rounded-3xl p-4" aria-label="最近经营脉冲">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <strong className="block text-sm text-white font-black">最近经营脉冲</strong>
                            <span className="text-[10px] text-slate-500">经营时钟使用服务器时间懒同步</span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-200">平台币 / VIP / 榜单不变</span>
                        </div>
                        <p className="mt-3 text-xs text-slate-300 font-bold leading-5">{companyFinance.businessClock.summary}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {[
                            ["同步分钟", `${companyFinance.businessClock.settledMinutes} 分钟`],
                            ["现金变化", companyFinance.businessClock.cashDelta >= 0 ? `+${compactNumber(companyFinance.businessClock.cashDelta)}` : compactNumber(companyFinance.businessClock.cashDelta)],
                            ["估值变化", companyFinance.businessClock.valuationDelta >= 0 ? `+${compactNumber(companyFinance.businessClock.valuationDelta)}` : compactNumber(companyFinance.businessClock.valuationDelta)],
                            ["离线经营", `${companyFinance.businessClock.elapsedMinutes} 分钟`]
                          ].map(([label, value]) => (
                            <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={label}>
                              <div className="text-[10px] text-slate-500 font-bold">{label}</div>
                              <div className="mt-1 text-sm text-white font-black">{value}</div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {companyFinance.reportMonth !== undefined && (
                      <section className="glass-panel rounded-3xl p-4" aria-label="月度经营报告">
                        <div className="flex items-center justify-between mb-3">
                          <strong className="text-sm text-white font-black">第 {companyFinance.reportMonth} 月经营报告</strong>
                          <span className="text-[10px] text-slate-500">已生成</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ["收入", compactNumber(companyFinance.income ?? companyFinance.monthlyIncome)],
                            ["支出", compactNumber(companyFinance.expense ?? companyFinance.monthlyExpense)],
                            ["净现金流", compactNumber(companyFinance.netCashFlow)],
                            ["期末现金", compactNumber(companyFinance.endingCash ?? companyFinance.cash)]
                          ].map(([label, value]) => (
                            <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={label}>
                              <div className="text-[10px] text-slate-500 font-bold">{label}</div>
                              <div className="mt-1 text-sm text-white font-black">{value}</div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {financeError && <p className="rounded-2xl px-4 py-3 text-xs font-bold bg-red-500/15 text-red-200">{financeError}</p>}
                    <button className="btn-gold w-full py-3 rounded-2xl text-sm font-black text-business-dark" type="button" onClick={() => void settleFinanceMonth()}>
                      生成第 {companyFinance.financeMonth} 月经营报告
                    </button>
                  </>
                ) : (
                  <section className="glass-panel rounded-3xl p-5">
                    <p className="text-xs text-slate-300 font-bold leading-5">{financeError || "财务数据读取中，请确认 API 服务已启动。"}</p>
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
            <section className="page-container page-active" aria-label="赛季活动" data-testid="native-season">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="calendar" className="w-7 h-7 text-business-gold" />
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase">{seasonCenter?.season.name ?? "Season 活动中心"}</h2>
                    <span className="text-[10px] text-slate-500">{seasonCenter ? `${seasonCenter.season.startDate} 至 ${seasonCenter.season.endDate}` : "赛季配置读取中"}</span>
                  </div>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭赛季活动" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="px-6 grid grid-cols-3 gap-2 mb-4">
                <div className="glass-panel rounded-2xl p-2 text-center">
                  <strong className="block text-sm text-business-gold font-black">{seasonCenter?.season.points ?? 0}</strong>
                  <span className="text-[9px] text-slate-500">赛季积分</span>
                </div>
                <div className="glass-panel rounded-2xl p-2 text-center">
                  <strong className="block text-sm text-white font-black">{seasonCenter?.season.status === "active" ? "进行中" : "未开放"}</strong>
                  <span className="text-[9px] text-slate-500">赛季状态</span>
                </div>
                <div className="glass-panel rounded-2xl p-2 text-center">
                  <strong className="block text-sm text-business-gold font-black">{seasonCenter?.season.pass.isPurchased ? "已开通" : "未开通"}</strong>
                  <span className="text-[9px] text-slate-500">通行证</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-10 scroll-hide">
                {(seasonNotice || seasonError) && (
                  <p className={`rounded-2xl px-4 py-3 text-xs font-bold ${seasonError ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-100"}`}>
                    {seasonError || seasonNotice}
                  </p>
                )}
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <strong className="block text-sm text-white font-black">赛季任务</strong>
                      <span className="text-[9px] text-slate-500">{primarySeasonTask?.description ?? "推进经营动作获得赛季积分"}</span>
                    </div>
                    <span className="text-[10px] text-business-gold">{primarySeasonTask ? `${primarySeasonTask.progress}/${primarySeasonTask.target}` : "0/0"}</span>
                  </div>
                  <button
                    className="btn-gold w-full py-2 rounded-xl text-xs font-black text-business-dark disabled:opacity-45"
                    disabled={!primarySeasonTask || primarySeasonTask.isClaimed}
                    type="button"
                    onClick={() => primarySeasonTask && void progressSeasonTask(primarySeasonTask.id)}
                  >
                    {primarySeasonTask?.isClaimed ? "任务已完成" : "推进赛季任务"}
                  </button>
                </section>
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <strong className="block text-sm text-white font-black">限时活动轮换</strong>
                      <span className="text-[9px] text-slate-500">活动榜随活动开放显示。</span>
                    </div>
                    <span className="text-[10px] text-business-gold">{seasonActivities.filter((activity) => activity.status === "active").length} 个进行中</span>
                  </div>
                  <div className="space-y-2">
                    {groupedSeasonActivities.map((group) => (
                      <div className="space-y-2" key={group.key}>
                        <strong className="block text-[10px] font-black text-slate-400">{group.title}</strong>
                        {group.activities.map((activity) => (
                          <article className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={activity.id}>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="min-w-0">
                                <strong className="block text-xs text-white font-black truncate">{activity.name}</strong>
                                <span className="text-[9px] text-slate-500">{activity.score}/{activity.targetScore}</span>
                              </div>
                              <span className="shrink-0 rounded-full bg-business-gold/15 px-2 py-1 text-[9px] font-black text-business-gold">
                                {activity.status === "active" ? "进行中" : activity.status === "upcoming" ? "预告" : "已结束"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <button className="rounded-xl border border-white/10 py-2 text-[10px] font-black text-white disabled:opacity-45" disabled={activity.status !== "active" || activity.isJoined} type="button" onClick={() => void joinSeasonActivity(activity.id)}>
                                {activity.isJoined ? "已报名" : "报名"}
                              </button>
                              <button className="rounded-xl border border-business-gold/40 py-2 text-[10px] font-black text-business-gold disabled:opacity-45" disabled={activity.status !== "active" || !activity.isJoined || activity.rewardClaimed} type="button" onClick={() => void progressSeasonActivity(activity.id)}>
                                推进
                              </button>
                              <button className="btn-gold py-2 rounded-xl text-[10px] font-black text-business-dark disabled:opacity-45" disabled={activity.status !== "active" || activity.score < activity.targetScore || activity.rewardClaimed} type="button" onClick={() => void claimSeasonActivity(activity.id)}>
                                {activity.rewardClaimed ? "已领" : "领奖"}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ))}
                    {seasonCenter && seasonActivities.length === 0 && <p className="text-xs text-slate-400 font-bold">暂无活动配置。</p>}
                  </div>
                  <div className="mt-3 space-y-2">
                    {activeActivityBoards.slice(0, 3).map((board) => (
                      <div className="rounded-2xl bg-slate-950/50 border border-white/5 p-3" key={board.key}>
                        <div className="mb-2 flex items-center justify-between">
                          <strong className="text-xs text-white font-black">{board.name}</strong>
                          <span className="text-[9px] text-business-gold">榜单</span>
                        </div>
                        <div className="space-y-2">
                          {board.rows.slice(0, 3).map((row) => (
                            <div className="flex items-center gap-3" key={row.profileId}>
                              <span className="w-6 text-center text-business-gold font-black italic">{row.rank}</span>
                              <div className="flex-1 min-w-0">
                                <strong className="block text-xs text-white font-black truncate">{row.founderName} · {row.companyName}</strong>
                                <span className="text-[9px] text-slate-500">{row.equippedTitle ?? "活动称号待争夺"}</span>
                              </div>
                              <span className="text-[10px] text-business-gold font-black">{row.valueLabel}</span>
                            </div>
                          ))}
                          {board.rows.length === 0 && <p className="text-[10px] text-slate-500 font-bold">暂无上榜玩家。</p>}
                        </div>
                      </div>
                    ))}
                    {seasonCenter && activeActivityBoards.length === 0 && <p className="text-xs text-slate-400 font-bold">活动榜未开启。</p>}
                  </div>
                </section>
                {latestActivityRecaps.length > 0 && (
                  <section className="glass-panel rounded-3xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <strong className="block text-sm text-white font-black">活动回顾</strong>
                      <span className="text-[10px] text-business-gold">{latestActivityRecaps.length} 场</span>
                    </div>
                    <div className="space-y-2">
                      {latestActivityRecaps.map((recap) => (
                        <article className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={recap.activityId}>
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <strong className="block text-xs text-white font-black truncate">{recap.name}</strong>
                              <span className="text-[9px] text-slate-500">{recap.endDate} / {recap.isSettled ? "已结算" : "待结算"}</span>
                            </div>
                            <span className="shrink-0 text-[10px] text-business-gold font-black">
                              {recap.personalRank === null ? "未上榜" : `第 ${recap.personalRank} 名`}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {recap.rows.slice(0, 3).map((row) => (
                              <div className="flex items-center gap-3" key={row.profileId}>
                                <span className="w-6 text-center text-business-gold font-black italic">{row.rank}</span>
                                <div className="flex-1 min-w-0">
                                  <strong className="block text-xs text-white font-black truncate">{row.founderName} · {row.companyName}</strong>
                                  <span className="text-[9px] text-slate-500">{row.equippedTitle ?? "活动回顾"}</span>
                                </div>
                                <span className="text-[10px] text-business-gold font-black">{row.valueLabel}</span>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <strong className="block text-sm text-white font-black">活动商店</strong>
                      <span className="text-[9px] text-slate-500">用活动积分兑换限时资源。</span>
                    </div>
                    <span className="text-[10px] text-business-gold">{activityShopItems.length} 项</span>
                  </div>
                  <div className="space-y-2">
                    {activityShopItems.map((item) => (
                      <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={item.id}>
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <strong className="block text-xs text-white font-black truncate">{item.name}</strong>
                            <span className="text-[9px] text-slate-500">{item.summary}</span>
                          </div>
                          <span className="shrink-0 text-[10px] text-business-gold font-black">{item.costPoints} 分</span>
                        </div>
                        <button className="w-full rounded-xl border border-business-gold/40 py-2 text-xs font-black text-business-gold disabled:opacity-45" disabled={!item.isAvailable} type="button" onClick={() => void purchaseActivityShopItem(item.id)}>
                          {item.lockedReason ?? "兑换"}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <strong className="block text-sm text-white font-black">{primaryScenario?.name ?? "经营剧本"}</strong>
                      <span className="text-[9px] text-slate-500">{primaryScenario?.summary ?? "按经营选择结算评分和奖励。"}</span>
                    </div>
                    <span className="text-[10px] text-business-gold">{scenarioRun?.grade ?? primaryScenario?.bestScore ?? "-"}</span>
                  </div>
                  {scenarioRun && (
                    <div className="mb-3 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-2xl bg-slate-900/60 p-2"><strong className="block text-sm text-white">{scenarioRun.initialState.cashDays}</strong><span className="text-[9px] text-slate-500">现金天数</span></div>
                      <div className="rounded-2xl bg-slate-900/60 p-2"><strong className="block text-sm text-white">{scenarioRun.score ?? "-"}</strong><span className="text-[9px] text-slate-500">评分</span></div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-xl border border-white/10 py-2 text-xs font-black text-white disabled:opacity-45" disabled={!primaryScenario || scenarioRun?.score !== null && scenarioRun !== null} type="button" onClick={() => primaryScenario && void startSeasonScenario(primaryScenario.id)}>
                      启动剧本
                    </button>
                    <button className="btn-gold py-2 rounded-xl text-xs font-black text-business-dark disabled:opacity-45" disabled={!scenarioRun || scenarioRun.score !== null} type="button" onClick={() => void settleSeasonScenario()}>
                      结算剧本
                    </button>
                  </div>
                </section>
                {!seasonCenter && <p className="glass-panel rounded-3xl p-4 text-xs text-slate-300 font-bold">赛季活动读取中，请确认 API 服务已启动。</p>}
              </div>
            </section>
          )}

          {nativeHomePage === "leaderboard" && (
            <section className="page-container page-active" aria-label="排行榜" data-testid="native-leaderboard">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="award" className="w-7 h-7 text-business-gold" />
                  <h2 className="text-xl font-black text-white italic uppercase">Rank 荣誉中心</h2>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭排行榜" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="px-6 grid grid-cols-4 gap-2 mb-4">
                {(leaderboardCenter?.boards ?? []).map((board) => (
                  <div className="glass-panel rounded-2xl p-2 text-center" key={board.key}>
                    <strong className="block text-[10px] text-business-gold font-black">{board.name.replace("榜", "")}</strong>
                    <span className="text-[8px] text-slate-500">{board.snapshotDate}</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-10 scroll-hide">
                {(phase14Notice || phase14Error) && (
                  <p className={`rounded-2xl px-4 py-3 text-xs font-bold ${phase14Error ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-100"}`}>
                    {phase14Error || phase14Notice}
                  </p>
                )}
                {longTermGoals && (
                  <section className="glass-panel rounded-3xl p-4" aria-label="长期目标中心">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block text-sm text-white font-black">长期目标</strong>
                        <span className="text-[9px] text-slate-500">今天做什么，本周追什么，赛季争什么，长期收集什么</span>
                      </div>
                      <span className="shrink-0 rounded-full bg-business-gold/15 px-2 py-1 text-[9px] font-black text-business-gold">
                        LV.{longTermGoals.profile.companyLevel}/{longTermGoals.profile.maxLevel}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {longTermGoals.sections.map((section) => (
                        <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-3" key={section.key}>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <strong className="text-xs text-white font-black">{section.title}</strong>
                            <span className="text-[9px] text-business-gold">{section.goals.filter((goal) => goal.isCompleted || goal.isClaimable).length}/{section.goals.length}</span>
                          </div>
                          <p className="mb-3 text-[9px] leading-4 text-slate-500 font-bold">{section.summary}</p>
                          <div className="space-y-2">
                            {section.goals.slice(0, 3).map((goal) => (
                              <div className="rounded-xl bg-slate-950/70 px-3 py-2" key={goal.id}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 truncate text-[10px] text-slate-200 font-black">{goal.title}</span>
                                  <span className={`shrink-0 text-[9px] font-black ${goal.isClaimable ? "text-business-gold" : goal.isCompleted ? "text-emerald-300" : "text-slate-500"}`}>
                                    {goal.statusLabel}
                                  </span>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                                  <div
                                    className="h-full rounded-full bg-business-gold"
                                    style={{ width: `${Math.min(100, Math.round((goal.progress / Math.max(1, goal.target)) * 100))}%` }}
                                  />
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <span className="min-w-0 truncate text-[9px] text-slate-500">{goal.description}</span>
                                  <span className="shrink-0 text-[9px] text-business-gold">{goal.action.label}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-slate-900/60 p-2">
                        <strong className="block text-sm text-white">{longTermGoals.summaries.achievementCompletedCount}</strong>
                        <span className="text-[9px] text-slate-500">成就</span>
                      </div>
                      <div className="rounded-2xl bg-slate-900/60 p-2">
                        <strong className="block text-sm text-white">{longTermGoals.summaries.titleCount}</strong>
                        <span className="text-[9px] text-slate-500">称号</span>
                      </div>
                      <div className="rounded-2xl bg-slate-900/60 p-2">
                        <strong className="block text-sm text-white">{longTermGoals.summaries.fullLevelChestClaimableCount}</strong>
                        <span className="text-[9px] text-slate-500">宝箱</span>
                      </div>
                    </div>
                  </section>
                )}
                <section className="glass-panel rounded-3xl p-4" aria-label="我的荣誉">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block text-sm text-white font-black">我的荣誉</strong>
                      <span className="text-[9px] text-slate-500">称号、成就、赛季、活动、商会和跨服历史集中回顾</span>
                    </div>
                    <span className="shrink-0 rounded-full bg-business-gold/15 px-2 py-1 text-[9px] font-black text-business-gold">
                      {activeTitleCount} 称号
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-3">
                      <span className="block text-[9px] text-slate-500 font-black">当前装备</span>
                      <strong className="mt-1 block truncate text-xs text-white font-black">{titleCenter?.equippedTitle?.name ?? "未装备称号"}</strong>
                      <span className="mt-1 block truncate text-[9px] text-business-gold">{titleCenter?.equippedTitle?.bonusLabel ?? "完成榜单、活动或成就后装备"}</span>
                    </article>
                    <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-3">
                      <span className="block text-[9px] text-slate-500 font-black">已获得称号</span>
                      <strong className="mt-1 block text-xs text-white font-black">{activeTitleCount}/{titleCenter?.titles.length ?? 0}</strong>
                      <span className="mt-1 block truncate text-[9px] text-business-gold">{(titleCenter?.titles ?? [])[0]?.name ?? "暂无称号"}</span>
                    </article>
                    <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-3">
                      <span className="block text-[9px] text-slate-500 font-black">成就进度</span>
                      <strong className="mt-1 block text-xs text-white font-black">{completedAchievementCount}/{achievements.length}</strong>
                      <span className="mt-1 block text-[9px] text-business-gold">{claimableAchievementCount > 0 ? `${claimableAchievementCount} 个可领取` : "继续推进经营目标"}</span>
                    </article>
                    <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-3">
                      <span className="block text-[9px] text-slate-500 font-black">赛季荣誉</span>
                      <strong className="mt-1 block truncate text-xs text-white font-black">{seasonCenter?.season.name ?? "赛季读取中"}</strong>
                      <span className="mt-1 block text-[9px] text-business-gold">{seasonCenter?.season.points ?? 0} 积分 / {seasonCenter?.season.pass.isPurchased ? "通行证已开通" : "普通进度"}</span>
                    </article>
                    <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-3">
                      <span className="block text-[9px] text-slate-500 font-black">活动回顾</span>
                      <strong className="mt-1 block truncate text-xs text-white font-black">{bestActivityRecap?.name ?? "暂无已结束活动"}</strong>
                      <span className="mt-1 block text-[9px] text-business-gold">{bestActivityRecap?.personalRank === null || bestActivityRecap === null ? "活动结算后生成排名" : `第 ${bestActivityRecap.personalRank} 名 / ${bestActivityRecap.personalScore} 分`}</span>
                    </article>
                    <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-3">
                      <span className="block text-[9px] text-slate-500 font-black">商会历史</span>
                      <strong className="mt-1 block truncate text-xs text-white font-black">{guildHistory?.guild?.name ?? guildCenter?.guild?.name ?? "未加入商会"}</strong>
                      <span className="mt-1 block text-[9px] text-business-gold">{latestGuildSettlement === null ? "贡献榜结算后生成" : `${latestGuildSettlement.snapshotDate} / 发放 ${latestGuildSettlement.deliveredRewards}`}</span>
                    </article>
                    <article className="col-span-2 rounded-2xl border border-white/5 bg-slate-900/60 p-3">
                      <span className="block text-[9px] text-slate-500 font-black">跨服历史</span>
                      <strong className="mt-1 block truncate text-xs text-white font-black">{crossServerGuildHistory?.guild.name ?? crossServerCenter?.guildSeason.guildName ?? "跨服报名后生成"}</strong>
                      <span className="mt-1 block text-[9px] text-business-gold">{latestCrossGuildSettlement === null ? "跨服商会赛季结算后回顾" : `${latestCrossGuildSettlement.snapshotDate} / 最终名次 ${latestCrossGuildSettlement.finalRank ?? "-"}`}</span>
                    </article>
                  </div>
                </section>
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <strong className="text-sm text-white font-black">{primaryLeaderboard?.name ?? "公司估值榜"}</strong>
                    <span className="text-[10px] text-slate-500">{leaderboardCenter?.activityBoards.length ? "活动榜进行中" : "活动榜未开启"}</span>
                  </div>
                  <div className="space-y-3">
                {(primaryLeaderboard?.rows ?? []).slice(0, 5).map((row) => (
                  <article
                    className={`p-3 rounded-2xl flex items-center gap-3 border ${row.rank === 1 ? "bg-business-gold/10 border-business-gold/30" : "bg-slate-900/60 border-white/5"}`}
                    key={row.profileId}
                  >
                    <div className={row.rank === 1 ? "w-8 h-8 flex items-center justify-center" : "w-8 text-center text-slate-500 font-black text-lg italic"}>
                      {row.rank === 1 ? <Icon name="crown" className="w-6 h-6 text-business-gold" /> : row.rank}
                    </div>
                    <div className={`w-10 h-10 rounded-full border-2 ${row.rank === 1 ? "border-business-gold" : "border-slate-700"} p-0.5`}>
                      <span className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-white">{row.founderName.slice(0, 1)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-black text-white">{row.founderName} · {row.companyName}</div>
                      <div className="text-[9px] text-slate-500">{row.equippedTitle ?? "未装备称号"}</div>
                    </div>
                    <div className="text-[10px] font-black text-business-gold">{row.valueLabel}</div>
                  </article>
                ))}
                  </div>
                </section>
                {(leaderboardCenter?.activityBoards.length ?? 0) > 0 && (
                  <section className="glass-panel rounded-3xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <strong className="text-sm text-white font-black">活动榜轮换</strong>
                      <span className="text-[10px] text-business-gold">{leaderboardCenter?.activityBoards.length ?? 0} 张进行中</span>
                    </div>
                    <div className="space-y-3">
                      {(leaderboardCenter?.activityBoards ?? []).slice(0, 3).map((board) => (
                        <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={board.key}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <strong className="text-xs text-white font-black truncate">{board.name}</strong>
                            <span className="text-[9px] text-business-gold">{board.snapshotDate}</span>
                          </div>
                          <div className="space-y-2">
                            {board.rows.slice(0, 3).map((row) => (
                              <article className="flex items-center gap-3" key={row.profileId}>
                                <span className="w-6 text-center text-business-gold font-black italic">{row.rank}</span>
                                <div className="flex-1 min-w-0">
                                  <strong className="block text-xs text-white font-black truncate">{row.founderName} · {row.companyName}</strong>
                                  <span className="text-[9px] text-slate-500">{row.equippedTitle ?? "限时活动冲榜"}</span>
                                </div>
                                <span className="text-[10px] text-business-gold font-black">{row.valueLabel}</span>
                              </article>
                            ))}
                            {board.rows.length === 0 && <p className="text-[10px] text-slate-500 font-bold">暂无上榜玩家。</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <strong className="block text-sm text-white font-black">跨服创业大赛</strong>
                      <span className="text-[9px] text-slate-500">{crossServerCenter?.group.ruleLabel ?? "跨服分组读取中"}</span>
                    </div>
                    <span className="text-[10px] text-business-gold">{crossServerCenter?.isRegistered ? "已报名" : "未报名"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(crossServerCenter?.boards ?? []).map((board) => (
                      <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={board.key}>
                        <strong className="block text-xs text-white font-black">{board.name}</strong>
                        <span className="text-[9px] text-slate-500">{board.snapshotDate}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {(primaryCrossLeaderboard?.rows ?? []).slice(0, 3).map((row) => (
                      <article className="rounded-2xl bg-slate-900/60 border border-white/5 p-3 flex items-center gap-3" key={row.profileId}>
                        <span className="w-6 text-center text-business-gold font-black italic">{row.rank}</span>
                        <div className="flex-1 min-w-0">
                          <strong className="block text-xs text-white font-black truncate">{row.founderName} · {row.companyName}</strong>
                          <span className="text-[9px] text-slate-500">{row.equippedTitle ?? "跨服称号待争夺"}</span>
                        </div>
                        <span className="text-[10px] text-business-gold font-black">{row.valueLabel}</span>
                      </article>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      className="btn-gold py-2 rounded-xl text-xs font-black text-business-dark disabled:opacity-45"
                      disabled={crossServerCenter?.isRegistered}
                      type="button"
                      onClick={() => void registerCrossServer()}
                    >
                      {crossServerCenter?.isRegistered ? "已报名" : "报名跨服"}
                    </button>
                    <button className="rounded-xl border border-business-gold/40 py-2 text-xs font-black text-business-gold" type="button" onClick={() => void settleCrossServer()}>
                      结算跨服
                    </button>
                  </div>
                </section>
                <section className="glass-panel rounded-3xl p-4">
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
                    {crossServerCenter?.guildSeason.rewardLabel ?? "前 3 名会长获得声望奖励"}
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
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      className="btn-gold py-2 rounded-xl text-xs font-black text-business-dark disabled:opacity-45"
                      disabled={!crossServerCenter?.guildSeason.canRegister || crossServerCenter.guildSeason.isRegistered}
                      type="button"
                      onClick={() => void registerCrossServerGuild()}
                    >
                      {crossServerCenter?.guildSeason.isRegistered ? "已报名" : "报名商会赛季"}
                    </button>
                    <button className="rounded-xl border border-business-gold/40 py-2 text-xs font-black text-business-gold" type="button" onClick={() => void settleCrossServerGuild()}>
                      结算商会赛季
                    </button>
                  </div>
                  <div className="mt-4 rounded-2xl bg-slate-900/60 border border-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-xs text-white font-black">赛季回顾</strong>
                      <span className="text-[9px] text-business-gold">{crossServerGuildHistory?.isRegistered ? "已报名" : "未报名"}</span>
                    </div>
                    {latestCrossGuildSettlement === null ? (
                      <p className="mt-3 text-[10px] leading-5 text-slate-500 font-bold">跨服商会赛季结算后生成回顾。</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-xl bg-slate-950/70 p-2"><strong className="block text-sm text-white">{latestCrossGuildSettlement.finalRank ?? "-"}</strong><span className="text-[9px] text-slate-500">最终名次</span></div>
                          <div className="rounded-xl bg-slate-950/70 p-2"><strong className="block text-sm text-white">{latestCrossGuildSettlement.deliveredRewards}</strong><span className="text-[9px] text-slate-500">发放</span></div>
                          <div className="rounded-xl bg-slate-950/70 p-2"><strong className="block text-sm text-white">{latestCrossGuildSettlement.snapshotDate.slice(5)}</strong><span className="text-[9px] text-slate-500">赛季日</span></div>
                        </div>
                        {latestCrossGuildSettlement.topGuilds.slice(0, 3).map((row) => (
                          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/70 px-3 py-2" key={`${row.guildId}:${row.rank}`}>
                            <span className="min-w-0 truncate text-[10px] text-slate-300 font-bold">#{row.rank} {row.guildName}</span>
                            <span className="shrink-0 text-[9px] text-business-gold">声望 +{row.reputationReward}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <strong className="text-sm text-white font-black">称号</strong>
                    <span className="text-[10px] text-business-gold">{titleCenter?.equippedTitle?.name ?? "未装备"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(titleCenter?.titles ?? []).slice(0, 4).map((title) => (
                      <button
                        className={`rounded-2xl border p-3 text-left ${title.isEquipped ? "border-business-gold bg-business-gold/10" : "border-white/10 bg-slate-900/60"}`}
                        disabled={title.isExpired}
                        key={title.id}
                        type="button"
                        onClick={() => void equipTitle(title.id)}
                      >
                        <strong className="block text-xs text-white font-black">{title.name}</strong>
                        <span className="text-[9px] text-slate-500">{title.isExpired ? "已过期" : title.bonusLabel}</span>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <strong className="text-sm text-white font-black">成就</strong>
                    <span className="text-[10px] text-slate-500">{achievements.filter((item) => item.isCompleted).length}/{achievements.length}</span>
                  </div>
                  <div className="space-y-2">
                    {achievements.slice(0, 4).map((achievement) => (
                      <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-3" key={achievement.id}>
                        <div className="flex items-center justify-between">
                          <strong className="text-xs text-white font-black">{achievement.name}</strong>
                          <span className="text-[9px] text-slate-500">{achievement.progress}/{achievement.target}</span>
                        </div>
                        <p className="mt-1 text-[9px] text-slate-400">{achievement.description}</p>
                        <button
                          className="mt-2 btn-gold px-3 py-1 rounded-lg text-[10px] font-black text-business-dark disabled:opacity-45"
                          disabled={!achievement.isCompleted || achievement.isClaimed}
                          type="button"
                          onClick={() => void claimAchievement(achievement.id)}
                        >
                          {achievement.isClaimed ? "已领取" : achievement.isCompleted ? "领取" : "未完成"}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <strong className="text-sm text-white font-black">知识库</strong>
                    <span className="text-[10px] text-business-gold">{knowledgeEntries.filter((entry) => entry.isUnlocked).length}/{knowledgeEntries.length} 张</span>
                  </div>
                  {knowledgeEntries.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold">领取成就后解锁知识卡。</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2 overflow-x-auto pb-1 scroll-hide">
                        {knowledgeByCategory.map((group) => (
                          <button
                            className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black border ${selectedKnowledgeEntry?.category === group.category ? "bg-business-gold text-business-dark border-business-gold" : "bg-slate-900/60 text-slate-300 border-white/5"}`}
                            key={group.category}
                            type="button"
                            onClick={() => setSelectedKnowledgeEntryId(group.entries[0]?.id ?? "")}
                          >
                            {group.category} {group.entries.filter((entry) => entry.isUnlocked).length}/{group.entries.length}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(knowledgeByCategory.find((group) => group.category === selectedKnowledgeEntry?.category)?.entries ?? knowledgeEntries).map((entry) => (
                          <button
                            className={`min-h-16 rounded-2xl border p-3 text-left ${entry.id === selectedKnowledgeEntry?.id ? "border-business-gold bg-business-gold/10" : "border-white/5 bg-slate-900/60"}`}
                            key={entry.id}
                            type="button"
                            onClick={() => setSelectedKnowledgeEntryId(entry.id)}
                          >
                            <strong className="block text-[11px] text-white font-black leading-4">{entry.title}</strong>
                            <span className={`mt-1 block text-[9px] font-black ${entry.isUnlocked ? "text-business-gold" : "text-slate-500"}`}>{entry.isUnlocked ? "已解锁" : "未解锁"}</span>
                          </button>
                        ))}
                      </div>
                      {selectedKnowledgeEntry && (
                        <article className="rounded-2xl bg-slate-900/70 border border-white/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <strong className="block text-sm text-white font-black">{selectedKnowledgeEntry.title}</strong>
                              <span className="mt-1 block text-[9px] text-business-gold">{selectedKnowledgeEntry.category} · {selectedKnowledgeEntry.contentVersion}</span>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${selectedKnowledgeEntry.isUnlocked ? "bg-business-gold text-business-dark" : "bg-slate-800 text-slate-400"}`}>{selectedKnowledgeEntry.isUnlocked ? "完整" : "锁定"}</span>
                          </div>
                          <p className="mt-3 text-xs text-slate-300 font-bold leading-5">{selectedKnowledgeEntry.summary}</p>
                          {selectedKnowledgeEntry.isUnlocked && (
                            <dl className="mt-3 space-y-2">
                              {[
                                ["经营场景", selectedKnowledgeEntry.scenarioText],
                                ["风险提示", selectedKnowledgeEntry.riskText],
                                ["游戏影响", selectedKnowledgeEntry.gameImpactText],
                                ["行动建议", selectedKnowledgeEntry.actionTipText]
                              ].map(([label, value]) => (
                                <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3" key={label}>
                                  <dt className="text-[9px] text-business-gold font-black">{label}</dt>
                                  <dd className="mt-1 text-[11px] text-slate-300 font-bold leading-5">{value}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                          <a className="mt-3 block text-[9px] text-business-gold underline decoration-business-gold/40" href={selectedKnowledgeEntry.sourceUrl} target="_blank" rel="noreferrer">
                            {selectedKnowledgeEntry.sourceName} · {selectedKnowledgeEntry.collectedAt}
                          </a>
                          <span className="mt-2 block text-[8px] text-slate-500">{selectedKnowledgeEntry.disclaimer}</span>
                        </article>
                      )}
                    </div>
                  )}
                </section>
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <strong className="text-sm text-white font-black">商会</strong>
                    <span className="text-[10px] text-business-gold">{guildCenter?.guild?.name ?? "未加入"}</span>
                  </div>
                  {guildCenter?.guild ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-2xl bg-slate-900/60 p-2"><strong className="block text-sm text-white">{guildCenter.guild.level}</strong><span className="text-[9px] text-slate-500">等级</span></div>
                        <div className="rounded-2xl bg-slate-900/60 p-2"><strong className="block text-sm text-white">{guildCenter.members.length}</strong><span className="text-[9px] text-slate-500">成员</span></div>
                        <div className="rounded-2xl bg-slate-900/60 p-2"><strong className="block text-sm text-white">{guildCenter.guild.contributionScore}</strong><span className="text-[9px] text-slate-500">贡献</span></div>
                      </div>
                      <button className="mt-3 w-full btn-gold py-2 rounded-xl text-xs font-black text-business-dark" type="button" onClick={() => void requestGuildHelp()}>发布互助</button>
                    </>
                  ) : (
                    <button className="w-full btn-gold py-2 rounded-xl text-xs font-black text-business-dark" type="button" onClick={() => void joinGuild()}>加入本服商会</button>
                  )}
                </section>
                {!leaderboardCenter && <p className="glass-panel rounded-3xl p-4 text-xs text-slate-300 font-bold">排行榜读取中，请确认 API 服务已启动。</p>}
              </div>
              <footer className="p-4 bg-slate-900 border-t border-business-gold/30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-4 px-2">
                  <div className="w-8 text-center text-business-gold font-black italic">{primaryLeaderboard?.rows.find((row) => row.profileId === profile.id)?.rank ?? "-"}</div>
                  <div className="w-10 h-10 rounded-full border-2 border-business-gold p-0.5">
                    <img src="/game-ui/html-design/founder.jpg" alt="" className="w-full h-full rounded-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-black text-white">{profile.founderName || account?.username || "创业新星"} · {profile.companyName}</div>
                    <div className="text-[9px] text-slate-400 italic">{titleCenter?.equippedTitle?.name ?? "创业履历收集中"}</div>
                  </div>
                  <div className="text-xs font-black text-business-gold">{compactNumber(profile.valuation)}</div>
                </div>
              </footer>
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
                {!guildCenter && <p className="glass-panel rounded-3xl p-4 text-xs text-slate-300 font-bold">商会配置读取中，请确认 API 服务已启动。</p>}
              </div>
            </section>
          )}

          {nativeHomePage === "shop" && (
            <section className="page-container page-active" aria-label="钱包商城" data-testid="native-shop">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="shopping-bag" className="w-7 h-7 text-pink-400" />
                  <h2 className="text-xl font-black text-white italic uppercase">Wallet 钱包商城</h2>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭钱包商城" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 scroll-hide">
                <section className="w-full h-28 rounded-3xl overflow-hidden relative" aria-label="商城余额">
                  <img src="/game-ui/html-design/main-bg.jpg" alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-business-dark to-transparent flex flex-col justify-center p-6">
                    <h3 className="text-lg font-black italic text-white">平台币余额 {compactNumber(shopCenter?.wallet.balance ?? profile.platformCoins)}</h3>
                    <p className="text-[10px] text-business-gold font-bold">
                      普通商品商城 · 首充、礼包、猎头与保险
                    </p>
                  </div>
                </section>
                {(shopNotice || shopError) && (
                  <p className={`rounded-2xl px-4 py-3 text-xs font-bold ${shopError ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-100"}`}>
                    {shopError || shopNotice}
                  </p>
                )}
                <section className="glass-panel rounded-3xl p-4" aria-label="商业入口导航">
                  <strong className="block text-sm text-white font-black">商业入口导航</strong>
                  <p className="mt-2 text-[10px] leading-5 text-slate-400 font-bold">
                    普通商品用于缓解经营压力；周卡、月卡和成长基金用于提高效率；赛季通行证承接赛季奖励线；背包保存已获得的道具和材料。
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("特权")}>去特权</button>
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("通行证")}>去通行证</button>
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("背包")}>去背包</button>
                  </div>
                </section>
                <div className="grid grid-cols-2 gap-4">
                  {commerceProducts.map((product) => (
                    <article
                      className={`glass-panel p-4 rounded-3xl flex flex-col items-center gap-2 relative ${selectedShopProduct?.id === product.id ? "border-business-gold/60" : ""}`}
                      key={product.id}
                      onClick={() => {
                        setSelectedShopProductId(product.id);
                        if (account && selectedServer) {
                          reportTelemetry(account.token, selectedServer.id, "shop_product_click", product.id, { category: product.category });
                        }
                      }}
                    >
                      <div className="absolute -top-1 -right-1 bg-red-500 text-[8px] font-black px-1.5 rounded-sm">
                        {shopCategoryLabels[product.category] ?? "商城"}
                      </div>
                      <div className="w-16 h-16 flex items-center justify-center">
                        <Icon
                          name={product.category === "risk_insurance" ? "shield-check" : product.category === "recruit_ticket" ? "file-search" : "gift"}
                          className={`w-10 h-10 ${product.category === "risk_insurance" ? "text-emerald-400" : "text-business-gold"}`}
                        />
                      </div>
                      <div className="text-xs font-black text-white text-center">{product.name}</div>
                      <p className="h-8 overflow-hidden text-[9px] text-slate-400 font-bold text-center leading-4">{product.summary}</p>
                      {product.rewardItem && (
                        <span className="rounded-full bg-business-gold/10 px-2 py-1 text-[9px] font-black text-business-gold">
                          {product.rewardItem.name} x{product.rewardItem.quantity}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <Icon name="gem" className="w-3 h-3 text-business-gold" />
                        <span className="text-sm font-black">{product.pricePlatformCoins.toLocaleString("zh-CN")}</span>
                      </div>
                      <button
                        className="w-full btn-gold py-1.5 rounded-xl text-[10px] font-black text-business-dark disabled:opacity-45"
                        type="button"
                        disabled={!product.isAvailable}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (account && selectedServer) {
                            reportTelemetry(account.token, selectedServer.id, "shop_product_click", product.id, { category: product.category });
                          }
                          void purchaseShopProduct(product.id);
                        }}
                      >
                        {product.lockedReason ?? "购买"}
                      </button>
                    </article>
                  ))}
                </div>
                {shopCenter && commerceProducts.length === 0 && (
                  <p className="glass-panel rounded-3xl p-4 text-xs text-slate-300 font-bold">普通商城商品暂未配置。</p>
                )}
                {shopCenter && commercePurchases.length > 0 && (
                  <section className="glass-panel rounded-3xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <strong className="text-sm text-white font-black">最近购买</strong>
                      <span className="text-[10px] text-business-gold font-bold">{commercePurchases.length} 笔</span>
                    </div>
                    <div className="space-y-2">
                      {commercePurchases.slice(0, 3).map((purchase) => (
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-300" key={purchase.id}>
                          <span>{shopCenter.products.find((product) => product.id === purchase.productId)?.name ?? purchase.productId}</span>
                          <span className="text-business-gold">-{purchase.pricePlatformCoins}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {!shopCenter && (
                  <p className="glass-panel rounded-3xl p-4 text-xs text-slate-300 font-bold">商城配置读取中，请确认 API 服务已启动。</p>
                )}
              </div>
            </section>
          )}

          {nativeHomePage === "privilege" && (
            <section className="page-container page-active" aria-label="特权" data-testid="native-privilege">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="award" className="w-7 h-7 text-business-gold" />
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase">Privilege 特权</h2>
                    <span className="text-[10px] text-slate-500">月卡、成长基金与 VIP 经验</span>
                  </div>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭特权" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 scroll-hide">
                <section className="glass-panel rounded-3xl p-5 border-business-gold/40 bg-gradient-to-br from-business-gold/15 to-slate-950">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-business-gold font-black uppercase">特权余额</div>
                      <h3 className="mt-1 text-2xl font-black italic text-white">{compactNumber(shopCenter?.wallet.balance ?? profile.platformCoins)} 平台币</h3>
                      <p className="mt-1 text-xs text-slate-300 font-bold">已消费 {compactNumber(shopCenter?.wallet.totalSpent ?? 0)} · VIP经验 {compactNumber(shopCenter?.wallet.vipExperience ?? vipCenter?.wallet.vipExperience ?? 0)}</p>
                    </div>
                    <span className="w-14 h-14 rounded-2xl bg-business-gold/15 border border-business-gold/30 flex items-center justify-center">
                      <Icon name="landmark" className="w-8 h-8 text-business-gold" />
                    </span>
                  </div>
                </section>
                {(shopNotice || shopError) && (
                  <p className={`rounded-2xl px-4 py-3 text-xs font-bold ${shopError ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-100"}`}>
                    {shopError || shopNotice}
                  </p>
                )}
                <section className="glass-panel rounded-3xl p-4" aria-label="特权入口导航">
                  <strong className="block text-sm text-white font-black">特权入口导航</strong>
                  <p className="mt-2 text-[10px] leading-5 text-slate-400 font-bold">
                    周卡、月卡和成长基金用于提高效率，普通商品留在商业，赛季奖励线留在通行证，已获得道具回到背包查看。
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("商业")}>去商业</button>
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("通行证")}>去通行证</button>
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("背包")}>去背包</button>
                  </div>
                </section>
                <div className="grid grid-cols-1 gap-3">
                  {privilegeProducts.map((product) => (
                    <article className="glass-panel rounded-3xl p-4 border-business-gold/20" key={product.id}>
                      <div className="flex items-start gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-business-gold/10 border border-business-gold/20 flex items-center justify-center">
                          <Icon name={product.category === "monthly_card" ? "calendar" : "landmark"} className="w-7 h-7 text-business-gold" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <strong className="text-sm text-white font-black">{product.name}</strong>
                            <span className="text-sm text-business-gold font-black">{product.pricePlatformCoins.toLocaleString("zh-CN")}</span>
                          </div>
                          <p className="mt-1 text-[10px] leading-4 text-slate-400 font-bold">{product.summary}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-900/70 px-2 py-1 text-[9px] font-black text-slate-300">
                              {product.durationDays > 0 ? `${product.durationDays}天权益` : "阶段领取"}
                            </span>
                            {product.rewardItem && (
                              <span className="rounded-full bg-business-gold/10 px-2 py-1 text-[9px] font-black text-business-gold">
                                {product.rewardItem.name} x{product.rewardItem.quantity}
                              </span>
                            )}
                          </div>
                          <button
                            className="mt-3 w-full btn-gold py-2 rounded-xl text-xs font-black text-business-dark disabled:opacity-45"
                            type="button"
                            disabled={!product.isAvailable}
                            onClick={() => void purchaseShopProduct(product.id)}
                          >
                            {product.lockedReason ?? "开通特权"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {shopCenter && privilegeProducts.length === 0 && (
                  <p className="glass-panel rounded-3xl p-4 text-xs text-slate-300 font-bold">月卡和成长基金暂未配置。</p>
                )}
                {shopCenter && privilegePurchases.length > 0 && (
                  <section className="glass-panel rounded-3xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <strong className="text-sm text-white font-black">特权购买记录</strong>
                      <span className="text-[10px] text-business-gold font-bold">{privilegePurchases.length} 笔</span>
                    </div>
                    <div className="space-y-2">
                      {privilegePurchases.slice(0, 3).map((purchase) => (
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-300" key={purchase.id}>
                          <span>{shopCenter.products.find((product) => product.id === purchase.productId)?.name ?? purchase.productId}</span>
                          <span className="text-business-gold">-{purchase.pricePlatformCoins}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {!shopCenter && (
                  <p className="glass-panel rounded-3xl p-4 text-xs text-slate-300 font-bold">特权配置读取中，请确认 API 服务已启动。</p>
                )}
              </div>
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
                      <p className="mt-2 text-xs leading-5 text-slate-300 font-bold">购买消耗平台币并计入 VIP 经验；开通后每日额外获得 1 个赛季随机任务。</p>
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
                <section className="glass-panel rounded-3xl p-4" aria-label="通行证入口导航">
                  <strong className="block text-sm text-white font-black">通行证入口导航</strong>
                  <p className="mt-2 text-[10px] leading-5 text-slate-400 font-bold">
                    赛季通行证承接赛季奖励线和赛季任务，活动材料进入背包；普通补给去商业，周卡和成长基金去特权。
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("商业")}>去商业</button>
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("特权")}>去特权</button>
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("背包")}>去背包</button>
                  </div>
                </section>
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <strong className="text-sm text-white font-black">赛季任务线</strong>
                    <span className="text-[10px] text-business-gold">{seasonCenter?.tasks.length ?? 0} 项</span>
                  </div>
                  <div className="space-y-2">
                    {(seasonCenter?.tasks ?? []).map((task) => (
                      <div className="rounded-2xl bg-slate-900/60 p-3" key={task.id}>
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
                </section>
                {!seasonCenter && (
                  <p className="glass-panel rounded-3xl p-4 text-xs text-slate-300 font-bold">赛季通行证读取中，请确认 API 服务已启动。</p>
                )}
              </div>
            </section>
          )}

          {nativeHomePage === "vip" && (
            <section className="page-container page-active" aria-label="VIP中心" data-testid="native-vip">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="award" className="w-7 h-7 text-business-gold" />
                  <h2 className="text-xl font-black text-white italic uppercase">VIP 创业权益</h2>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭VIP中心" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 scroll-hide">
                <section className="glass-panel rounded-3xl p-5 border-business-gold/40 bg-gradient-to-br from-business-gold/15 to-slate-950">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-business-gold font-black uppercase">当前等级</div>
                      <h3 className="mt-1 text-3xl font-black italic text-white">{vipCenter?.currentLevel.name ?? "VIP 0"}</h3>
                      <p className="mt-1 text-xs text-slate-300 font-bold">{vipCenter?.benefits.title ?? "创业新星"} · {vipCenter?.benefits.avatarFrame ?? "basic"}</p>
                    </div>
                    <div className="w-20 h-20 rounded-full border-2 border-business-gold bg-business-gold/10 flex items-center justify-center">
                      <Icon name="award" className="w-11 h-11 text-business-gold" />
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-[10px] font-black text-slate-400">
                      <span>VIP经验 {compactNumber(vipCenter?.wallet.vipExperience ?? shopCenter?.wallet.vipExperience ?? 0)}</span>
                      <span>{vipCenter?.nextLevel ? `距离 ${vipCenter.nextLevel.name}` : "已达当前上限"}</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-slate-900 overflow-hidden border border-business-gold/30">
                      <div className="h-full bg-business-gold" style={{ width: `${(vipCenter?.progressToNextBasisPoints ?? 0) / 100}%` }} />
                    </div>
                  </div>
                </section>
                {(vipNotice || vipError) && (
                  <p className={`rounded-2xl px-4 py-3 text-xs font-bold ${vipError ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-100"}`}>
                    {vipError || vipNotice}
                  </p>
                )}
                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="block text-sm text-white font-black">每日礼包</strong>
                      <span className="text-[10px] text-slate-400 font-bold">
                        平台币 {vipCenter?.dailyGift.rewardPlatformCoins ?? 0} · 行动力 {vipCenter?.dailyGift.rewardActionPower ?? 0}
                      </span>
                    </div>
                    <button
                      className="btn-gold px-5 py-2 rounded-xl text-xs font-black text-business-dark disabled:opacity-45"
                      type="button"
                      disabled={vipCenter?.dailyGift.isClaimed}
                      onClick={() => void claimVipDailyGift()}
                    >
                      {vipCenter?.dailyGift.isClaimed ? "今日已领" : "领取"}
                    </button>
                  </div>
                </section>
                <section className="grid grid-cols-2 gap-3">
                  {[
                    ["行动力上限", vipCenter?.benefits.actionPowerLimit ?? profile.actionPowerLimit],
                    ["快速结算", vipCenter?.benefits.quickSettleTimes ?? 0],
                    ["培训队列", vipCenter?.benefits.trainingQueueBonus ?? 0],
                    ["招聘刷新", vipCenter?.benefits.recruitRefreshTimes ?? 0],
                    ["商城折扣", `${((vipCenter?.benefits.shopDiscountBasisPoints ?? 10000) / 100).toFixed(0)}%`],
                    ["专属称号", vipCenter?.benefits.title ?? "创业新星"]
                  ].map(([label, value]) => (
                    <div className="glass-panel rounded-2xl p-3" key={label}>
                      <div className="text-[10px] text-slate-500 font-bold">{label}</div>
                      <div className="mt-1 text-sm text-white font-black">{value}</div>
                    </div>
                  ))}
                </section>
                <section className="glass-panel rounded-3xl p-4" aria-label="VIP入口导航">
                  <strong className="block text-sm text-white font-black">VIP入口导航</strong>
                  <p className="mt-2 text-[10px] leading-5 text-slate-400 font-bold">
                    VIP 提供身份、每日礼包和便利权益，帮助提高经营效率；普通补给去商业，长期效率权益去特权，赛季奖励线去通行证，已获得道具回到背包查看。
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("商业")}>去商业</button>
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("特权")}>去特权</button>
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("通行证")}>去通行证</button>
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("背包")}>去背包</button>
                  </div>
                </section>
                <p className="text-[10px] leading-5 text-slate-500 font-bold px-1">
                  VIP 权益只提供便利、身份和轻量效率，不直接清空负债、免除经营风险或改变排行榜名次。
                </p>
                <button
                  className="w-full rounded-2xl border border-white/10 py-3 text-sm font-black text-slate-200"
                  type="button"
                  onClick={leaveGame}
                >
                  切换账号
                </button>
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
                    背包保存已获得的道具和材料；需要普通补给去商业，需要效率权益去特权，需要赛季奖励线去通行证。
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button className="rounded-xl bg-slate-900/70 py-2 text-[10px] font-black text-business-gold" type="button" onClick={() => openHomePanel("商业")}>去商业</button>
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
                        {highlightedTask ? highlightedTask.rewardLabel : "请确认 API 服务已启动"}
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
              {productNotice && <p className="funding-notice">{productNotice}</p>}
              {productError && <p className="funding-error">{productError}</p>}

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
                    <div className="funding-empty">产品配置读取中，请确认 API 服务已启动。</div>
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
              {marketNotice && <p className="funding-notice">{marketNotice}</p>}
              {marketError && <p className="funding-error">{marketError}</p>}

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
                    <div className="funding-empty">市场配置读取中，请确认 API 服务已启动。</div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "融资" && (
            <section className="funding-screen" aria-label="融资路演">
              <header className="funding-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>融资</strong>
                  <span>估值 {compactNumber(fundingCenter?.finance.valuation ?? profile.valuation)} · 股权 {((fundingCenter?.finance.founderEquityBasisPoints ?? profile.founderEquityBasisPoints) / 100).toFixed(1)}%</span>
                </div>
                <button type="button" onClick={() => account && selectedServer && void loadFundingCenter(account.token, selectedServer.id)}>刷新</button>
              </header>

              <section className="funding-summary" aria-label="融资概览">
                <span>现金 {compactNumber(fundingCenter?.finance.cash ?? profile.cash)}</span>
                <span>负债 {(fundingCenter ? fundingCenter.finance.debtRatioBasisPoints / 100 : 0).toFixed(1)}%</span>
                <span>待谈 {pendingFundings.length}</span>
              </section>
              {fundingNotice && <p className="funding-notice">{fundingNotice}</p>}
              {fundingError && <p className="funding-error">{fundingError}</p>}

              <section className="funding-layout">
                <div className="funding-list" aria-label="投资人列表">
                  {(fundingCenter?.offers ?? []).map((offer) => (
                    <button
                      className={offer.id === selectedFundingOffer?.id ? "selected" : undefined}
                      key={offer.id}
                      type="button"
                      onClick={() => setSelectedFundingOfferId(offer.id)}
                    >
                      <strong>{offer.investorName}</strong>
                      <em>{offer.roundName} · {offer.focus}</em>
                      <span>{formatWan(offer.amount)} / 稀释{(offer.equityBasisPoints / 100).toFixed(1)}% / 成功{offer.successRate}%</span>
                      <small>{offer.lockedReason ?? "可路演"}</small>
                    </button>
                  ))}
                </div>

                <article className="funding-detail" aria-label="融资详情">
                  {selectedFundingOffer ? (
                    <>
                      <div className="funding-title">
                        <span>融</span>
                        <strong>{selectedFundingOffer.investorName}</strong>
                        <em>{selectedFundingOffer.summary}</em>
                      </div>

                      <dl className="funding-stats">
                        <div>
                          <dt>到账</dt>
                          <dd>{compactNumber(selectedFundingOffer.amount)}</dd>
                        </div>
                        <div>
                          <dt>投前</dt>
                          <dd>{compactNumber(selectedFundingOffer.preMoneyValuation)}</dd>
                        </div>
                        <div>
                          <dt>投后</dt>
                          <dd>{compactNumber(selectedFundingOffer.postMoneyValuation)}</dd>
                        </div>
                        <div>
                          <dt>稀释</dt>
                          <dd>{(selectedFundingOffer.equityBasisPoints / 100).toFixed(1)}%</dd>
                        </div>
                        <div>
                          <dt>成功率</dt>
                          <dd>{selectedFundingOffer.successRate}%</dd>
                        </div>
                        <div>
                          <dt>董事会</dt>
                          <dd>{selectedFundingOffer.boardPressure}</dd>
                        </div>
                      </dl>

                      <section className="funding-active">
                        <strong>投资条款</strong>
                        <span>{selectedFundingOffer.term}</span>
                        <small>接受后创始人股权降至 {((fundingCenter?.finance.founderEquityBasisPoints ?? profile.founderEquityBasisPoints) - selectedFundingOffer.equityBasisPoints) / 100}%</small>
                      </section>

                      {selectedFunding && (
                        <section className="funding-active">
                          <strong>{selectedFunding.investorName}</strong>
                          <span>{selectedFunding.roundName} 正在谈判，成功率 {selectedFunding.successRate}%。</span>
                          <small>{selectedFunding.term}</small>
                        </section>
                      )}

                      <div className="funding-actions">
                        <button
                          type="button"
                          disabled={!selectedFundingOffer.isAvailable}
                          onClick={() => void runFundingAction("/finance/fundings/start", { investorId: selectedFundingOffer.id })}
                        >
                          发起路演
                        </button>
                        <button
                          type="button"
                          disabled={!selectedFunding}
                          onClick={() => selectedFunding && void runFundingAction(`/finance/fundings/${encodeURIComponent(selectedFunding.id)}/settle`)}
                        >
                          确认结果
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="funding-empty">投资人配置读取中，请确认 API 服务已启动。</div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "贷款" && (
            <section className="loan-screen" aria-label="贷款与危机">
              <header className="loan-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>贷款</strong>
                  <span>信用 {loanCenter?.finance.creditRating ?? profile.creditRating} · 负债 {loanCenter ? `${(loanCenter.finance.debtRatioBasisPoints / 100).toFixed(1)}%` : "读取中"}</span>
                </div>
                <button type="button" onClick={() => account && selectedServer && void loadLoanCenter(account.token, selectedServer.id)}>刷新</button>
              </header>

              <section className="loan-summary" aria-label="负债概览">
                <span>总负债 {compactNumber(loanCenter?.finance.totalDebt ?? profile.totalDebt)}</span>
                <span>本期应还 {compactNumber(activeLoans.reduce((total, item) => total + item.monthlyPayment + item.penaltyAccrued, 0))}</span>
                <span>{loanCenter?.crisis.isActive ? "危机中" : "可控"}</span>
              </section>
              {loanNotice && <p className="loan-notice">{loanNotice}</p>}
              {loanError && <p className="loan-error">{loanError}</p>}

              <section className="loan-layout">
                <div className="loan-list" aria-label="贷款产品">
                  {(loanCenter?.offers ?? []).map((offer) => (
                    <button
                      className={offer.id === selectedLoanOffer?.id ? "selected" : undefined}
                      key={offer.id}
                      type="button"
                      onClick={() => setSelectedLoanOfferId(offer.id)}
                    >
                      <strong>{offer.name}</strong>
                      <em>{offer.lender} · 年化 {(offer.annualRateBasisPoints / 100).toFixed(1)}%</em>
                      <span>{formatWan(offer.principal)} / {offer.termMonths}期 / 月供{formatWan(offer.monthlyPayment)}</span>
                      <small>{offer.lockedReason ?? "可申请"}</small>
                    </button>
                  ))}
                </div>

                <article className="loan-detail" aria-label="贷款详情">
                  {selectedLoanOffer ? (
                    <>
                      <div className="loan-title">
                        <span>贷</span>
                        <strong>{selectedLoanOffer.name}</strong>
                        <em>{selectedLoanOffer.summary}</em>
                      </div>

                      <dl className="loan-stats">
                        <div>
                          <dt>到账</dt>
                          <dd>{compactNumber(selectedLoanOffer.principal)}</dd>
                        </div>
                        <div>
                          <dt>月供</dt>
                          <dd>{compactNumber(selectedLoanOffer.monthlyPayment)}</dd>
                        </div>
                        <div>
                          <dt>期限</dt>
                          <dd>{selectedLoanOffer.termMonths}期</dd>
                        </div>
                        <div>
                          <dt>信用</dt>
                          <dd>{selectedLoanOffer.creditRequired}级</dd>
                        </div>
                      </dl>

                      {selectedLoan && (
                        <section className="loan-active">
                          <strong>{selectedLoan.name}</strong>
                          <span>剩余 {compactNumber(selectedLoan.remainingPrincipal)} · {selectedLoan.remainingMonths}期 · {selectedLoan.status === "overdue" ? `逾期${selectedLoan.overduePeriods}期` : "正常"}</span>
                          <small>罚息 {compactNumber(selectedLoan.penaltyAccrued)}</small>
                        </section>
                      )}

                      {loanCenter?.crisis.isActive && (
                        <section className="loan-crisis">
                          <strong>{loanCenter.crisis.summary}</strong>
                          {loanCenter.crisis.routes.map((route) => (
                            <button key={route.id} type="button" onClick={() => void resolveCrisis(route.id)}>
                              <span>{route.title}</span>
                              <small>{route.impact}</small>
                            </button>
                          ))}
                        </section>
                      )}

                      <div className="loan-actions">
                        <button
                          type="button"
                          disabled={!selectedLoanOffer.isAvailable}
                          onClick={() => void runLoanAction("/finance/loans/apply", { loanConfigId: selectedLoanOffer.id })}
                        >
                          申请
                        </button>
                        <button
                          type="button"
                          disabled={!selectedLoan}
                          onClick={() => selectedLoan && void runLoanAction(`/finance/loans/${encodeURIComponent(selectedLoan.id)}/repay`, { mode: "scheduled" })}
                        >
                          还本期
                        </button>
                        <button
                          type="button"
                          disabled={!selectedLoan}
                          onClick={() => selectedLoan && void runLoanAction(`/finance/loans/${encodeURIComponent(selectedLoan.id)}/repay`, { mode: "full" })}
                        >
                          结清
                        </button>
                        <button type="button" onClick={() => void runLoanAction("/finance/loans/settle-period")}>到期</button>
                      </div>
                    </>
                  ) : (
                    <div className="loan-empty">贷款配置读取中，请确认 API 服务已启动。</div>
                  )}
                </article>
              </section>
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
                    }
                  }}
                >
                  刷新
                </button>
              </header>

              <section className="event-summary" aria-label="经营提醒概览">
                <span>提醒待办 {pendingEvents.length}</span>
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
              </nav>

              {managerTab === "events" ? (
                <section className="event-layout">
                  <div className="event-list" aria-label="提醒列表">
                    {events.length === 0 ? (
                      <div className="event-empty">暂无经营提醒，继续推进公司后会出现新的待办。</div>
                    ) : events.map((item) => (
                      <button
                        className={item.id === selectedEvent?.id ? "selected" : undefined}
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedEventId(item.id)}
                      >
                        <span>{item.source}</span>
                        <strong>{item.title}</strong>
                        <em>{item.summary}</em>
                        <small>{item.status === "pending" ? "待决策" : "已处理"}</small>
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
