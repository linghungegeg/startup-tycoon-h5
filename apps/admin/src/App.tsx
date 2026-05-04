import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";
const ADMIN_SESSION_KEY = "wenziyouxi.admin.session";
const ADMIN_SESSION_VERSION = 1;
const defaultActivityDraftForm = (): ActivityDraftForm => ({
  id: "creator-economy-week",
  name: "创作者经济周",
  startDate: "2026-07-01",
  endDate: "2026-07-14",
  leaderboardKey: "activity-creator-economy-week",
  targetScore: "220",
  rewardReputation: "90",
  rewardPoints: "130",
  rewardTitleId: "season-creator-builder",
  rewardCash: "0",
  rewardPlatformCoins: "0"
});

type AdminSession = {
  version: typeof ADMIN_SESSION_VERSION;
  token: string;
  account: string;
};

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

type AdminLoginResponse = {
  adminUserId: string;
  username: string;
  token: string;
};

type AdminSessionResponse = {
  adminUserId: string;
  username: string;
};

type AdminPlayerRow = {
  profileId: string;
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

type AdminPlayerList = {
  rows: AdminPlayerRow[];
};

type VipConfig = {
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

type CrossServerGroup = {
  id: string;
  name: string;
  ruleLabel: string;
  serverIds: string[];
  isActive: boolean;
};

type CrossServerGroupList = {
  groups: CrossServerGroup[];
};

type CrossServerRuleConfig = {
  id: string;
  personalAttemptLimit: number;
  personalRecoverIntervalMinutes: number;
  personalResetTime: string;
  personalSettlementTime: string;
  guildOpenDay: number;
  guildOpenTime: string;
  guildCloseDay: number;
  guildCloseTime: string;
  guildSettlementTime: string;
  rewardTiers: Array<{
    rankStart: number;
    rankEnd: number | null;
    rewardPlatformCoins: number;
    rewardReputation: number;
    rewardActionPower: number;
    rewardTitleId: string | null;
    rewardItemId: string | null;
    rewardItemQuantity: number;
  }>;
};

type CrossServerSettlementRunList = {
  rows: Array<{
    id: string;
    settlementType: "personal" | "guild";
    settlementKey: string;
    status: string;
    deliveredRewards: number;
    errorMessage: string | null;
    createdAt: string;
  }>;
};

type AdminGuildRow = {
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
};

type AdminGuildList = {
  rows: AdminGuildRow[];
};

type AdminGuildDetail = {
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
    guildSettlements: Array<{
      snapshotDate: string;
      deliveredRewards: number;
      topMembers: Array<{ profileId: string; founderName: string; companyName: string; rank: number; contributionScore: number; reputationReward: number }>;
    }>;
    crossServerSettlements: Array<{
      snapshotDate: string;
      deliveredRewards: number;
      finalRank: number | null;
      topGuilds: Array<{ guildId: string; guildName: string; serverId: string; leaderProfileId: string; leaderFounderName: string; rank: number; reputationReward: number }>;
    }>;
  };
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

type AdminActivityRow = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  leaderboardKey: string;
  participantCount: number;
  totalScore: number;
  isSettled: boolean;
  topRows: LeaderboardRow[];
};

type AdminActivityList = {
  rows: AdminActivityRow[];
};

type WalletAdjustment = {
  wallet: {
    balance: number;
    vipExperience: number;
  };
  auditLogId: string;
};

type VipAdjustment = {
  vipCenter: {
    currentLevel: VipConfig;
    wallet: {
      vipExperience: number;
    };
  };
  auditLogId: string;
};

type GroupAssignment = {
  group: CrossServerGroup;
  auditLogId: string;
};

type ConfigCenter = {
  titles: Array<{ id: string; name: string; category: string; source: string; bonusLabel: string; durationDays: number }>;
  achievements: Array<{ id: string; name: string; category: string; conditionKind: string; conditionValue: number; rewardPlatformCoins: number; rewardCash: number }>;
  knowledgeEntries: Array<{ id: string; title: string; sourceUrl: string; collectedAt: string; contentVersion: string; auditStatus: string }>;
  shopProducts: Array<{ id: string; name: string; category: string; pricePlatformCoins: number; purchaseLimit: number; isActive: boolean }>;
  leaderboardSnapshots: Array<{ id: string; serverId: string; boardName: string; snapshotDate: string; createdAt: string }>;
  mailCompensations: Array<{ id: string; profileId: string; subject: string; platformCoins: number; reason: string; createdAt: string }>;
  chatKeywords: Array<{ id: string; keyword: string; sourceType: string; action: string; isEnabled: boolean; license: string; sourceHash: string; importBatch: string }>;
  seasons: Array<{ id: string; name: string; status: string; startDate: string; endDate: string; passPricePlatformCoins: number; taskCount: number; activityCount: number; passPurchaseCount: number }>;
  activities: Array<{ id: string; seasonId: string; name: string; status: string; startDate: string; endDate: string; leaderboardKey: string; targetScore: number; participantCount: number; totalScore: number; isSettled: boolean; deliveredRewards: number; rewardLabel: string; rewardBoundary: string }>;
  activityShopItems: Array<{ id: string; seasonId: string; name: string; costPoints: number; purchaseLimit: number; purchaseCount: number; rewardLabel: string; isActive: boolean }>;
  seasonPass: Array<{ seasonId: string; pricePlatformCoins: number; purchaseCount: number; rewardLabel: string }>;
  leaderboardSettlements: Array<{ boardKey: string; snapshotDate: string; deliveredRewards: number; rewardPlatformCoinsTotal: number; rewardBoundary: string }>;
  scenarios: Array<{ id: string; name: string; rewardTitleId: string | null }>;
};

type ChatKeyword = {
  id: string;
  keyword: string;
  replacement: string;
  action: "mask" | "block" | "allow";
  sourceType: "public" | "custom" | "whitelist";
  sourceName: string;
  license: string;
  sourceHash: string;
  importBatch: string;
  isEnabled: boolean;
  updatedAt: string;
};

type ChatKeywordList = {
  rows: ChatKeyword[];
  total: number;
  filters: {
    sourceTypes: string[];
    actions: string[];
    statuses: string[];
  };
};

type MonetizationBoundaries = {
  summary: {
    platformCoinSourceCount: number;
    platformCoinSpendCount: number;
    vipExperienceSourceCount: number;
    paidProductCount: number;
    riskCount: number;
  };
  walletPolicies: Array<{ id: string; flow: string; vipExperiencePolicy: string; boundaryLabel: string }>;
  paidProductBoundaries: Array<{ id: string; name: string; category: string; pricePlatformCoins: number; rewardType: string; vipExperiencePolicy: string; leaderboardRewardPolicy: string }>;
  seasonPassBoundary: { seasonId: string; pricePlatformCoins: number; vipExperiencePolicy: string; leaderboardRewardPolicy: string };
  activityShopBoundary: { itemCount: number; platformCoinRewardItemCount: number; rewardPolicy: string };
  riskItems: Array<{ id: string; level: string; message: string; suggestion: string }>;
};

type OperationConfigAlert = {
  id: string;
  level: string;
  type: string;
  targetType: string;
  targetId: string;
  message: string;
  suggestion: string;
  createdAt: string;
  status: string;
  handledBy: string | null;
  handledAt: string | null;
  note: string | null;
};

type OperationConfigAlerts = {
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
    levels: string[];
    types: string[];
    targetTypes: string[];
    statuses: string[];
  };
  alerts: OperationConfigAlert[];
};

type ActivitySchedule = {
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
    status: string;
  }>;
  activities: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
    leaderboardKey: string;
    rewardLabel: string;
    rewardBoundary: string;
    riskLabels: string[];
  }>;
  alerts: Array<{
    id: string;
    level: string;
    type: string;
    targetId: string;
    message: string;
    suggestion: string;
  }>;
};

type BusinessClockObservations = {
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
  rows: Array<{
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
  }>;
};

type EconomyAlerts = {
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
  checkpoints: Array<{ key: string; label: string; status: string; value: number }>;
  alerts: Array<{
    id: string;
    level: string;
    type: string;
    targetType: string;
    targetId: string;
    message: string;
    suggestion: string;
  }>;
};

type ActivityDraftForm = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  leaderboardKey: string;
  targetScore: string;
  rewardReputation: string;
  rewardPoints: string;
  rewardTitleId: string;
  rewardCash: string;
  rewardPlatformCoins: string;
};

type ActivityDraftValidation = {
  summary: {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
    riskCount: number;
  };
  errors: Array<{ type: string; field: string; message: string }>;
  warnings: Array<{ type: string; field: string | null; message: string; suggestion: string }>;
  riskLabels: string[];
  preview: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
    leaderboardKey: string;
    targetScore: number;
    rewardLabel: string;
    concurrentActiveCount: number;
  };
};

type ActivityDraftStatus = "draft" | "pending_review" | "approved" | "rejected" | "published";

type ActivityDraftRecord = {
  id: string;
  activityId: string;
  name: string;
  startDate: string;
  endDate: string;
  leaderboardKey: string;
  targetScore: number;
  rewardCash: number;
  rewardPlatformCoins: number;
  rewardReputation: number;
  rewardPoints: number;
  rewardTitleId: string | null;
  status: ActivityDraftStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByAdminUserId: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  validation: ActivityDraftValidation;
};

type ActivityDraftList = {
  rows: ActivityDraftRecord[];
  summary: Record<ActivityDraftStatus | "total", number>;
};

type ActivityDraftActionResult = {
  draft: ActivityDraftRecord;
  validation: ActivityDraftValidation;
  auditLogId: string | null;
};

type ActivityDraftPublishResult = ActivityDraftActionResult & {
  activity: {
    id: string;
    name: string;
    leaderboardKey: string;
    rewardCash: number;
    rewardReputation: number;
    rewardPoints: number;
    rewardTitleId: string | null;
  };
};

type ActivityPublishObservationList = {
  summary: {
    total: number;
    published: number;
    rewardRiskCount: number;
    unsettledEndedCount: number;
  };
  rows: Array<{
    draftId: string;
    activityId: string;
    name: string;
    status: string;
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
  }>;
};

type SettlementCandidateKind = "leaderboard" | "crossLeaderboard" | "activity" | "guild" | "crossGuild";

type SettlementCandidate = {
  id: string;
  kind: SettlementCandidateKind;
  targetId: string;
  serverId: string;
  name: string;
  reasonPreset: string;
  riskLabel: string;
  isSettled: boolean;
  lastAuditLogId: string | null;
};

type SettlementCandidateList = {
  summary: {
    total: number;
    pending: number;
    settled: number;
    activity: number;
    guild: number;
    crossGuild: number;
    leaderboard: number;
  };
  rows: SettlementCandidate[];
};

type SettlementBatchResult = {
  id: string;
  name: string;
  status: "success" | "retry" | "failed";
  message: string;
};

type OperationConfigAlertAction = AuditResult & {
  alert: OperationConfigAlert;
};

type KnowledgeEntry = {
  id: string;
  categoryId: string;
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
  sortOrder: number;
};

type KnowledgeList = {
  rows: KnowledgeEntry[];
  total: number;
  categories: Array<{ id: string; name: string }>;
};

type KnowledgeForm = {
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

type AuditLog = {
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

type AuditLogList = {
  rows: AuditLog[];
  total: number;
  filters: {
    actions: string[];
    targetTypes: string[];
    admins: string[];
  };
};

type AuditResult = {
  auditLogId: string;
};

type AnalyticsDashboard = {
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

type MailCompensation = AuditResult & {
  mailId: string;
  wallet: {
    balance: number;
  };
};

type ProfileStatus = AuditResult & {
  profileId: string;
  status: string;
};

type PendingAdminAction = {
  title: string;
  target: string;
  impact: string;
  reason: string;
  riskLevel: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
};

type ActiveSection = "analytics" | "players" | "wallet" | "titles" | "cross" | "guilds" | "activities" | "businessClock" | "economy" | "configs" | "knowledge" | "audit";

const menuItems: Array<{ id: ActiveSection; label: string }> = [
  { id: "analytics", label: "数据看板" },
  { id: "players", label: "玩家查询" },
  { id: "wallet", label: "平台币 / VIP" },
  { id: "titles", label: "称号 / 补偿" },
  { id: "cross", label: "跨服分组" },
  { id: "guilds", label: "商会运营" },
  { id: "activities", label: "活动运营" },
  { id: "businessClock", label: "经营时钟" },
  { id: "economy", label: "经济巡检" },
  { id: "configs", label: "配置清单" },
  { id: "knowledge", label: "知识审核" },
  { id: "audit", label: "审计日志" }
];
const auditQuickFilters = [
  { label: "结算", action: "admin_activity_leaderboard_settle", targetType: "" },
  { label: "资产", action: "admin_grant", targetType: "player_platform_wallet" },
  { label: "封禁", action: "admin_player_ban", targetType: "player_profile" },
  { label: "补偿", action: "admin_mail_compensation", targetType: "admin_mail_compensation" },
  { label: "配置", action: "admin_activity_draft_publish", targetType: "activity_config_draft" },
  { label: "知识", action: "admin_knowledge_update", targetType: "knowledge_entry" },
  { label: "聊天", action: "admin_chat_keyword_update", targetType: "chat_keyword" }
];

const formatNumber = (value: number): string => value.toLocaleString("zh-CN");
const formatDateTime = (value: string | null): string => {
  if (value === null || value === "") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
};
const formatRate = (basisPoints: number): string => `${(basisPoints / 100).toFixed(1)}%`;
const commercialEntryLabel = (entry: string): string => {
  if (entry === "shop") return "商业";
  if (entry === "privilege") return "特权";
  if (entry === "pass") return "通行证";
  if (entry === "activity") return "活动";
  if (entry === "rank") return "排行";
  if (entry === "manager") return "专属经理";
  return entry;
};
const paidProductLabel = (product: string): string => {
  if (product === "weekly_card") return "周卡";
  if (product === "monthly_card") return "月卡";
  if (product === "growth_fund") return "创业基金";
  if (product === "season_pass") return "通行证";
  if (product === "activity_shop") return "活动商店";
  return product;
};
const settlementKindLabel = (kind: SettlementCandidateKind): string => {
  if (kind === "crossLeaderboard") return "跨服个人榜";
  if (kind === "activity") return "活动榜";
  if (kind === "guild") return "商会榜";
  if (kind === "crossGuild") return "跨服商会";
  return "排行榜";
};
const settlementResultLabel = (status: SettlementBatchResult["status"]): string => {
  if (status === "failed") return "失败";
  if (status === "retry") return "幂等重试";
  return "成功";
};
const activityDraftStatusLabel = (status: ActivityDraftStatus): string => {
  if (status === "draft") return "草稿";
  if (status === "pending_review") return "待审核";
  if (status === "approved") return "已通过";
  if (status === "published") return "已发布";
  return "已驳回";
};
const readDraftInteger = (value: string): number => {
  const numberValue = Number.parseInt(value, 10);
  return Number.isFinite(numberValue) ? numberValue : 0;
};
const alertLevelLabel = (level: string): string => {
  if (level === "critical") return "严重";
  if (level === "warning") return "警告";
  if (level === "info") return "提示";
  return level;
};
const alertStatusLabel = (status: string): string => {
  if (status === "pending") return "待处理";
  if (status === "acknowledged") return "已知悉";
  if (status === "ignored") return "已忽略";
  return status;
};
const emptyKnowledgeForm = (): KnowledgeForm => ({
  summary: "",
  scenarioText: "",
  riskText: "",
  gameImpactText: "",
  actionTipText: "",
  sourceName: "",
  sourceUrl: "",
  collectedAt: "",
  contentVersion: "",
  reviewStatus: "reviewing",
  reason: "知识卡审核更新"
});

const knowledgeToForm = (knowledge: KnowledgeEntry): KnowledgeForm => ({
  summary: knowledge.summary,
  scenarioText: knowledge.scenarioText,
  riskText: knowledge.riskText,
  gameImpactText: knowledge.gameImpactText,
  actionTipText: knowledge.actionTipText,
  sourceName: knowledge.sourceName,
  sourceUrl: knowledge.sourceUrl,
  collectedAt: knowledge.collectedAt,
  contentVersion: knowledge.contentVersion,
  reviewStatus: knowledge.reviewStatus,
  reason: "知识卡审核更新"
});

const buildAuditQuery = (filters: {
  action: string;
  targetType: string;
  targetId: string;
  admin: string;
  from: string;
  to: string;
}): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = value.trim();
    if (trimmed !== "") {
      params.set(key, trimmed);
    }
  });
  const query = params.toString();
  return query === "" ? "/admin/audit-logs" : `/admin/audit-logs?${query}`;
};

const isAdminSession = (value: unknown): value is AdminSession => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const session = value as Partial<AdminSession>;
  return (
    session.version === ADMIN_SESSION_VERSION &&
    typeof session.account === "string" &&
    typeof session.token === "string"
  );
};

const loadAdminSession = (): AdminSession | null => {
  const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isAdminSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveAdminSession = (session: AdminSession): void => {
  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
};

const clearAdminSession = (): void => {
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
};

const readApiMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as ApiFailure;
    return body.error?.message ?? "请求失败，请稍后再试。";
  } catch {
    return "请求失败，请稍后再试。";
  }
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
    return {
      success: false,
      error: {
        code: String(response.status),
        message: await readApiMessage(response)
      },
      traceId: response.headers.get("x-trace-id") ?? ""
    };
  }

  return (await response.json()) as ApiResponse<T>;
};

export default function App() {
  const initialSession = loadAdminSession();
  const [session, setSession] = useState<AdminSession | null>(initialSession);
  const [account, setAccount] = useState(initialSession?.account ?? "");
  const [password, setPassword] = useState("");
  const [keyword, setKeyword] = useState("");
  const [activeSection, setActiveSection] = useState<ActiveSection>("players");
  const [players, setPlayers] = useState<AdminPlayerRow[]>([]);
  const [vipConfigs, setVipConfigs] = useState<VipConfig[]>([]);
  const [crossGroups, setCrossGroups] = useState<CrossServerGroup[]>([]);
  const [crossServerRuleConfig, setCrossServerRuleConfig] = useState<CrossServerRuleConfig | null>(null);
  const [crossServerSettlementRuns, setCrossServerSettlementRuns] = useState<CrossServerSettlementRunList>({ rows: [] });
  const [guilds, setGuilds] = useState<AdminGuildRow[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [selectedGuildDetail, setSelectedGuildDetail] = useState<AdminGuildDetail | null>(null);
  const [activities, setActivities] = useState<AdminActivityRow[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [guildKeyword, setGuildKeyword] = useState("");
  const [guildServerId, setGuildServerId] = useState("");
  const [guildCrossRegistered, setGuildCrossRegistered] = useState("");
  const [guildActiveStatus, setGuildActiveStatus] = useState("");
  const [guildSettleReason, setGuildSettleReason] = useState("运营手动结算商会贡献榜");
  const [crossGuildSettleServerId, setCrossGuildSettleServerId] = useState("s1");
  const [crossGuildSettleReason, setCrossGuildSettleReason] = useState("运营手动结算跨服商会赛季");
  const [activitySettleReason, setActivitySettleReason] = useState("运营手动结算活动榜");
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeList>({ rows: [], total: 0, categories: [] });
  const [configCenter, setConfigCenter] = useState<ConfigCenter>({
    titles: [],
    achievements: [],
    knowledgeEntries: [],
    shopProducts: [],
    leaderboardSnapshots: [],
    mailCompensations: [],
    chatKeywords: [],
    seasons: [],
    activities: [],
    activityShopItems: [],
    seasonPass: [],
    leaderboardSettlements: [],
    scenarios: []
  });
  const [operationConfigAlerts, setOperationConfigAlerts] = useState<OperationConfigAlerts>({
    summary: { total: 0, critical: 0, warning: 0, info: 0, pending: 0, acknowledged: 0, ignored: 0, unsettledActivityCount: 0, rewardBoundaryRiskCount: 0 },
    filters: { levels: [], types: [], targetTypes: [], statuses: [] },
    alerts: []
  });
  const [monetizationBoundaries, setMonetizationBoundaries] = useState<MonetizationBoundaries>({
    summary: { platformCoinSourceCount: 0, platformCoinSpendCount: 0, vipExperienceSourceCount: 0, paidProductCount: 0, riskCount: 0 },
    walletPolicies: [],
    paidProductBoundaries: [],
    seasonPassBoundary: { seasonId: "", pricePlatformCoins: 0, vipExperiencePolicy: "", leaderboardRewardPolicy: "" },
    activityShopBoundary: { itemCount: 0, platformCoinRewardItemCount: 0, rewardPolicy: "" },
    riskItems: []
  });
  const [activitySchedule, setActivitySchedule] = useState<ActivitySchedule>({
    summary: { totalActivities: 0, activeCount: 0, upcomingCount: 0, endedCount: 0, maxConcurrentActive: 0, rewardBoundaryRiskCount: 0, missingLeaderboardKeyCount: 0 },
    windows: [],
    activities: [],
    alerts: []
  });
  const [businessClockObservations, setBusinessClockObservations] = useState<BusinessClockObservations>({
    summary: { totalPlayers: 0, syncedPlayers: 0, staleSyncCount: 0, riskPulseCount: 0, managerTodoCount: 0, anomalyCount: 0 },
    offlineMinuteBands: [],
    cashDeltaBands: [],
    rows: []
  });
  const [economyAlerts, setEconomyAlerts] = useState<EconomyAlerts>({
    summary: { total: 0, critical: 0, warning: 0, info: 0, platformCoinRiskCount: 0, vipExperienceRiskCount: 0, offlineCashRiskCount: 0, settlementRiskCount: 0, businessClockSyncRiskCount: 0 },
    checkpoints: [],
    alerts: []
  });
  const [activityDraftForm, setActivityDraftForm] = useState<ActivityDraftForm>(defaultActivityDraftForm);
  const [activityDraftValidation, setActivityDraftValidation] = useState<ActivityDraftValidation | null>(null);
  const [activityDrafts, setActivityDrafts] = useState<ActivityDraftList>({ rows: [], summary: { total: 0, draft: 0, pending_review: 0, approved: 0, rejected: 0, published: 0 } });
  const [activityPublishObservations, setActivityPublishObservations] = useState<ActivityPublishObservationList>({ summary: { total: 0, published: 0, rewardRiskCount: 0, unsettledEndedCount: 0 }, rows: [] });
  const [settlementCandidates, setSettlementCandidates] = useState<SettlementCandidateList>({
    summary: { total: 0, pending: 0, settled: 0, activity: 0, guild: 0, crossGuild: 0, leaderboard: 0 },
    rows: []
  });
  const [selectedSettlementCandidateIds, setSelectedSettlementCandidateIds] = useState<string[]>([]);
  const [batchSettlementResults, setBatchSettlementResults] = useState<SettlementBatchResult[]>([]);
  const [activityDraftReviewReason, setActivityDraftReviewReason] = useState("运营复核通过");
  const [activityDraftPublishReason, setActivityDraftPublishReason] = useState("发布前二次确认：配置、档期、奖励边界均已复核");
  const [chatKeywordList, setChatKeywordList] = useState<ChatKeywordList>({ rows: [], total: 0, filters: { sourceTypes: [], actions: [], statuses: [] } });
  const [chatKeywordSearch, setChatKeywordSearch] = useState("");
  const [chatKeywordSourceType, setChatKeywordSourceType] = useState("");
  const [chatKeywordAction, setChatKeywordAction] = useState("");
  const [chatKeywordStatus, setChatKeywordStatus] = useState("");
  const [chatKeywordReason, setChatKeywordReason] = useState("聊天关键词库运营调整");
  const [alertLevel, setAlertLevel] = useState("");
  const [alertType, setAlertType] = useState("");
  const [alertStatus, setAlertStatus] = useState("");
  const [alertHandleNote, setAlertHandleNote] = useState("运营巡检处理记录");
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFilterOptions, setAuditFilterOptions] = useState<AuditLogList["filters"]>({
    actions: [],
    targetTypes: [],
    admins: []
  });
  const [auditAction, setAuditAction] = useState("");
  const [auditTargetType, setAuditTargetType] = useState("");
  const [auditTargetId, setAuditTargetId] = useState("");
  const [auditAdmin, setAuditAdmin] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [selectedAuditId, setSelectedAuditId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [coinAmount, setCoinAmount] = useState("100");
  const [coinSource, setCoinSource] = useState("admin_grant");
  const [coinReason, setCoinReason] = useState("运营补偿");
  const [vipExperience, setVipExperience] = useState("0");
  const [vipReason, setVipReason] = useState("客服修正 VIP 经验");
  const [assignServerId, setAssignServerId] = useState("s1");
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignReason, setAssignReason] = useState("运营调整跨服分组");
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [titleReason, setTitleReason] = useState("运营发放称号");
  const [mailSubject, setMailSubject] = useState("运营补偿");
  const [mailBody, setMailBody] = useState("补偿已即时到账，请继续关注活动。");
  const [mailCoins, setMailCoins] = useState("100");
  const [statusReason, setStatusReason] = useState("运营风控处理");
  const [settleServerId, setSettleServerId] = useState("s1");
  const [settleReason, setSettleReason] = useState("运营手动结算排行榜");
  const [knowledgeKeyword, setKnowledgeKeyword] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState("");
  const [knowledgeReviewStatus, setKnowledgeReviewStatus] = useState("");
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState("");
  const [knowledgeForm, setKnowledgeForm] = useState<KnowledgeForm>(() => emptyKnowledgeForm());
  const [pendingAdminAction, setPendingAdminAction] = useState<PendingAdminAction | null>(null);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isRestoring, setIsRestoring] = useState(initialSession !== null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.profileId === selectedProfileId) ?? players[0] ?? null,
    [players, selectedProfileId]
  );
  const selectedKnowledge = useMemo(
    () => knowledgeList.rows.find((knowledge) => knowledge.id === selectedKnowledgeId) ?? knowledgeList.rows[0] ?? null,
    [knowledgeList.rows, selectedKnowledgeId]
  );
  const selectedGuild = useMemo(
    () => guilds.find((guild) => guild.id === selectedGuildId) ?? guilds[0] ?? null,
    [guilds, selectedGuildId]
  );
  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId) ?? activities[0] ?? null,
    [activities, selectedActivityId]
  );
  const selectedAuditLog = useMemo(
    () => auditLogs.find((log) => log.id === selectedAuditId) ?? auditLogs[0] ?? null,
    [auditLogs, selectedAuditId]
  );
  const filteredOperationConfigAlerts = useMemo(
    () => operationConfigAlerts.alerts
      .filter((alert) => alertLevel === "" || alert.level === alertLevel)
      .filter((alert) => alertType === "" || alert.type === alertType)
      .filter((alert) => alertStatus === "" || alert.status === alertStatus),
    [alertLevel, alertStatus, alertType, operationConfigAlerts.alerts]
  );
  const pendingSettlementCandidates = useMemo(
    () => settlementCandidates.rows.filter((candidate) => !candidate.isSettled),
    [settlementCandidates.rows]
  );
  const selectedSettlementCandidates = useMemo(
    () => pendingSettlementCandidates.filter((candidate) => selectedSettlementCandidateIds.includes(candidate.id)),
    [pendingSettlementCandidates, selectedSettlementCandidateIds]
  );

  const applyKnowledgeList = (data: KnowledgeList): void => {
    setKnowledgeList(data);
    const first = data.rows[0] ?? null;
    setSelectedKnowledgeId((current) => data.rows.some((knowledge) => knowledge.id === current) ? current : first?.id ?? "");
    if (first !== null) {
      setKnowledgeForm((current) => current.summary === "" ? knowledgeToForm(first) : current);
    }
  };

  const applyAuditList = (data: AuditLogList): void => {
    setAuditLogs(data.rows);
    setAuditTotal(data.total);
    setAuditFilterOptions(data.filters);
    setSelectedAuditId((current) => data.rows.some((log) => log.id === current) ? current : data.rows[0]?.id ?? "");
  };

  const loadAdminData = useCallback(async (token: string, searchKeyword = keyword): Promise<void> => {
    setIsLoading(true);
    setError("");
    try {
      const guildParams = new URLSearchParams();
      if (guildKeyword.trim() !== "") {
        guildParams.set("keyword", guildKeyword.trim());
      }
      if (guildServerId.trim() !== "") {
        guildParams.set("serverId", guildServerId.trim());
      }
      if (guildCrossRegistered !== "") {
        guildParams.set("crossRegistered", guildCrossRegistered);
      }
      if (guildActiveStatus !== "") {
        guildParams.set("activeStatus", guildActiveStatus);
      }

      const [playerList, vipList, groupList, guildList, activityList] = await Promise.all([
        apiRequest<AdminPlayerList>(`/admin/players?keyword=${encodeURIComponent(searchKeyword.trim())}`, {}, token),
        apiRequest<VipConfig[]>("/admin/vip/configs", {}, token),
        apiRequest<CrossServerGroupList>("/admin/cross-server/groups", {}, token),
        apiRequest<AdminGuildList>(`/admin/guilds?${guildParams.toString()}`, {}, token),
        apiRequest<AdminActivityList>("/admin/activities", {}, token)
      ]);

      if (!playerList.success) {
        setError(playerList.error.message);
        return;
      }
      if (!vipList.success) {
        setError(vipList.error.message);
        return;
      }
      if (!groupList.success) {
        setError(groupList.error.message);
        return;
      }
      if (!guildList.success) {
        setError(guildList.error.message);
        return;
      }
      if (!activityList.success) {
        setError(activityList.error.message);
        return;
      }

      setPlayers(playerList.data.rows);
      setVipConfigs(vipList.data);
      setCrossGroups(groupList.data.groups);
      setGuilds(guildList.data.rows);
      setActivities(activityList.data.rows);
      const firstGuildId = guildList.data.rows[0]?.id ?? "";
      setSelectedGuildId((current) => guildList.data.rows.some((guild) => guild.id === current) ? current : firstGuildId);
      setSelectedActivityId((current) => activityList.data.rows.some((activity) => activity.id === current) ? current : activityList.data.rows[0]?.id ?? "");
      setAssignGroupId((current) => current || (groupList.data.groups[0]?.id ?? ""));
      setSettleServerId((current) => current || (playerList.data.rows[0]?.serverId ?? "s1"));
      setCrossGuildSettleServerId((current) => current || (guildList.data.rows[0]?.serverId ?? "s1"));
      const [configs, configAlerts, boundaryResponse, scheduleResponse, clockResponse, economyResponse, draftResponse, publishObservationResponse, settlementCandidateResponse, crossRulesResponse, crossRunsResponse, logs, analyticsResponse, knowledgeResponse, chatKeywordsResponse] = await Promise.all([
        apiRequest<ConfigCenter>("/admin/config-center", {}, token),
        apiRequest<OperationConfigAlerts>("/admin/operation-config-alerts", {}, token),
        apiRequest<MonetizationBoundaries>("/admin/monetization-boundaries", {}, token),
        apiRequest<ActivitySchedule>("/admin/activity-schedule", {}, token),
        apiRequest<BusinessClockObservations>("/admin/business-clock-observations", {}, token),
        apiRequest<EconomyAlerts>("/admin/economy-alerts", {}, token),
        apiRequest<ActivityDraftList>("/admin/activity-config-drafts", {}, token),
        apiRequest<ActivityPublishObservationList>("/admin/activity-publish-observations", {}, token),
        apiRequest<SettlementCandidateList>("/admin/settlement-candidates", {}, token),
        apiRequest<CrossServerRuleConfig>("/admin/cross-server/rules", {}, token),
        apiRequest<CrossServerSettlementRunList>("/admin/cross-server/settlement-runs", {}, token),
        apiRequest<AuditLogList>("/admin/audit-logs", {}, token),
        apiRequest<AnalyticsDashboard>("/admin/analytics", {}, token),
        apiRequest<KnowledgeList>("/admin/knowledge", {}, token),
        apiRequest<ChatKeywordList>("/admin/chat-keywords", {}, token)
      ]);
      if (!configs.success) {
        setError(configs.error.message);
        return;
      }
      if (!configAlerts.success) {
        setError(configAlerts.error.message);
        return;
      }
      if (!boundaryResponse.success) {
        setError(boundaryResponse.error.message);
        return;
      }
      if (!scheduleResponse.success) {
        setError(scheduleResponse.error.message);
        return;
      }
      if (!clockResponse.success) {
        setError(clockResponse.error.message);
        return;
      }
      if (!economyResponse.success) {
        setError(economyResponse.error.message);
        return;
      }
      if (!draftResponse.success) {
        setError(draftResponse.error.message);
        return;
      }
      if (!publishObservationResponse.success) {
        setError(publishObservationResponse.error.message);
        return;
      }
      if (!settlementCandidateResponse.success) {
        setError(settlementCandidateResponse.error.message);
        return;
      }
      if (!crossRulesResponse.success) {
        setError(crossRulesResponse.error.message);
        return;
      }
      if (!crossRunsResponse.success) {
        setError(crossRunsResponse.error.message);
        return;
      }
      if (!logs.success) {
        setError(logs.error.message);
        return;
      }
      if (!analyticsResponse.success) {
        setError(analyticsResponse.error.message);
        return;
      }
      if (!knowledgeResponse.success) {
        setError(knowledgeResponse.error.message);
        return;
      }
      if (!chatKeywordsResponse.success) {
        setError(chatKeywordsResponse.error.message);
        return;
      }
      setConfigCenter(configs.data);
      setOperationConfigAlerts(configAlerts.data);
      setMonetizationBoundaries(boundaryResponse.data);
      setActivitySchedule(scheduleResponse.data);
      setBusinessClockObservations(clockResponse.data);
      setEconomyAlerts(economyResponse.data);
      setActivityDrafts(draftResponse.data);
      setActivityPublishObservations(publishObservationResponse.data);
      setSettlementCandidates(settlementCandidateResponse.data);
      setCrossServerRuleConfig(crossRulesResponse.data);
      setCrossServerSettlementRuns(crossRunsResponse.data);
      setSelectedSettlementCandidateIds((current) => current.filter((id) => settlementCandidateResponse.data.rows.some((candidate) => candidate.id === id && !candidate.isSettled)));
      applyAuditList(logs.data);
      setAnalytics(analyticsResponse.data);
      applyKnowledgeList(knowledgeResponse.data);
      setChatKeywordList(chatKeywordsResponse.data);
      setSelectedTitleId((current) => current || (configs.data.titles[0]?.id ?? ""));
      if (playerList.data.rows.length > 0) {
        setSelectedProfileId((current) => current || (playerList.data.rows[0]?.profileId ?? ""));
        setAssignServerId((current) => current || (playerList.data.rows[0]?.serverId ?? "s1"));
      }
      if (firstGuildId !== "") {
        const detail = await apiRequest<AdminGuildDetail>(`/admin/guilds/${encodeURIComponent(firstGuildId)}`, {}, token);
        if (detail.success) {
          setSelectedGuildDetail(detail.data);
        }
      } else {
        setSelectedGuildDetail(null);
      }
    } catch {
      setError("无法连接后台服务，请确认 API 服务和数据库已启动。");
    } finally {
      setIsLoading(false);
    }
  }, [guildActiveStatus, guildCrossRegistered, guildKeyword, guildServerId, keyword]);

  const requestAdminConfirmation = (action: PendingAdminAction): void => {
    setError("");
    setPendingAdminAction(action);
  };

  const executePendingAdminAction = async (): Promise<void> => {
    if (pendingAdminAction === null) {
      return;
    }
    const action = pendingAdminAction;
    setPendingAdminAction(null);
    await action.onConfirm();
  };

  useEffect(() => {
    if (initialSession === null) {
      return;
    }

    let isMounted = true;

    const restoreSession = async (): Promise<void> => {
      try {
        const response = await apiRequest<AdminSessionResponse>("/admin/auth/session", {}, initialSession.token);

        if (!isMounted) {
          return;
        }

        if (!response.success) {
          clearAdminSession();
          setSession(null);
          setError("后台登录状态已过期，请重新登录。");
          return;
        }

        const nextSession: AdminSession = {
          version: ADMIN_SESSION_VERSION,
          account: response.data.username,
          token: initialSession.token
        };
        saveAdminSession(nextSession);
        setSession(nextSession);
        setAccount(response.data.username);
        await loadAdminData(nextSession.token, "");
      } catch {
        if (isMounted) {
          clearAdminSession();
          setSession(null);
          setError("无法连接后台服务，请确认 API 服务和数据库已启动。");
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

  const submitLogin = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedAccount = account.trim();

    if (trimmedAccount.length < 2 || password.length < 6) {
      setError("请输入有效的管理员账号和登录密码。");
      return;
    }

    try {
      const login = await apiRequest<AdminLoginResponse>("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: trimmedAccount, password })
      });

      if (!login.success) {
        setError("管理员账号或密码不正确。");
        return;
      }

      const nextSession: AdminSession = {
        version: ADMIN_SESSION_VERSION,
        account: login.data.username,
        token: login.data.token
      };
      saveAdminSession(nextSession);
      setSession(nextSession);
      setAccount(login.data.username);
      setPassword("");
      setError("");
      await loadAdminData(nextSession.token, "");
    } catch {
      setError("无法连接后台服务，请确认 API 服务和数据库已启动。");
    }
  };

  const logout = (): void => {
    clearAdminSession();
    setSession(null);
    setPassword("");
    setPlayers([]);
    setVipConfigs([]);
    setCrossGroups([]);
    setGuilds([]);
    setActivities([]);
    setSelectedGuildId("");
    setSelectedActivityId("");
    setSelectedGuildDetail(null);
    setKnowledgeList({ rows: [], total: 0, categories: [] });
    setConfigCenter({ titles: [], achievements: [], knowledgeEntries: [], shopProducts: [], leaderboardSnapshots: [], mailCompensations: [], chatKeywords: [], seasons: [], activities: [], activityShopItems: [], seasonPass: [], leaderboardSettlements: [], scenarios: [] });
    setOperationConfigAlerts({ summary: { total: 0, critical: 0, warning: 0, info: 0, pending: 0, acknowledged: 0, ignored: 0, unsettledActivityCount: 0, rewardBoundaryRiskCount: 0 }, filters: { levels: [], types: [], targetTypes: [], statuses: [] }, alerts: [] });
    setMonetizationBoundaries({
      summary: { platformCoinSourceCount: 0, platformCoinSpendCount: 0, vipExperienceSourceCount: 0, paidProductCount: 0, riskCount: 0 },
      walletPolicies: [],
      paidProductBoundaries: [],
      seasonPassBoundary: { seasonId: "", pricePlatformCoins: 0, vipExperiencePolicy: "", leaderboardRewardPolicy: "" },
      activityShopBoundary: { itemCount: 0, platformCoinRewardItemCount: 0, rewardPolicy: "" },
      riskItems: []
    });
    setActivitySchedule({ summary: { totalActivities: 0, activeCount: 0, upcomingCount: 0, endedCount: 0, maxConcurrentActive: 0, rewardBoundaryRiskCount: 0, missingLeaderboardKeyCount: 0 }, windows: [], activities: [], alerts: [] });
    setBusinessClockObservations({ summary: { totalPlayers: 0, syncedPlayers: 0, staleSyncCount: 0, riskPulseCount: 0, managerTodoCount: 0, anomalyCount: 0 }, offlineMinuteBands: [], cashDeltaBands: [], rows: [] });
    setEconomyAlerts({ summary: { total: 0, critical: 0, warning: 0, info: 0, platformCoinRiskCount: 0, vipExperienceRiskCount: 0, offlineCashRiskCount: 0, settlementRiskCount: 0, businessClockSyncRiskCount: 0 }, checkpoints: [], alerts: [] });
    setActivityDraftForm(defaultActivityDraftForm());
    setActivityDraftValidation(null);
    setActivityDrafts({ rows: [], summary: { total: 0, draft: 0, pending_review: 0, approved: 0, rejected: 0, published: 0 } });
    setActivityPublishObservations({ summary: { total: 0, published: 0, rewardRiskCount: 0, unsettledEndedCount: 0 }, rows: [] });
    setActivityDraftReviewReason("运营复核通过");
    setActivityDraftPublishReason("发布前二次确认：配置、档期、奖励边界均已复核");
    setAlertLevel("");
    setAlertType("");
    setAnalytics(null);
    setAuditLogs([]);
    setAuditTotal(0);
    setAuditFilterOptions({ actions: [], targetTypes: [], admins: [] });
    setSelectedAuditId("");
    setSelectedKnowledgeId("");
    setKnowledgeForm(emptyKnowledgeForm());
  };

  const submitSearch = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session !== null) {
      await loadAdminData(session.token, keyword);
      setActionMessage("已按当前条件刷新运营数据。");
    }
  };

  const submitKnowledgeSearch = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null) {
      return;
    }

    const params = new URLSearchParams();
    if (knowledgeKeyword.trim() !== "") {
      params.set("keyword", knowledgeKeyword.trim());
    }
    if (knowledgeCategory !== "") {
      params.set("category", knowledgeCategory);
    }
    if (knowledgeReviewStatus !== "") {
      params.set("reviewStatus", knowledgeReviewStatus);
    }

    const response = await apiRequest<KnowledgeList>(`/admin/knowledge?${params.toString()}`, {}, session.token);
    if (!response.success) {
      setError(response.error.message);
      return;
    }

    setKnowledgeForm(emptyKnowledgeForm());
    applyKnowledgeList(response.data);
    setActionMessage(`已刷新知识卡：${response.data.total} 条`);
  };

  const submitChatKeywordSearch = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null) {
      return;
    }
    const params = new URLSearchParams();
    if (chatKeywordSearch.trim() !== "") params.set("keyword", chatKeywordSearch.trim());
    if (chatKeywordSourceType !== "") params.set("sourceType", chatKeywordSourceType);
    if (chatKeywordAction !== "") params.set("action", chatKeywordAction);
    if (chatKeywordStatus !== "") params.set("status", chatKeywordStatus);
    const response = await apiRequest<ChatKeywordList>(`/admin/chat-keywords?${params.toString()}`, {}, session.token);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    setChatKeywordList(response.data);
    setActionMessage(`已刷新聊天关键词库：${response.data.total} 条`);
  };

  const updateChatKeyword = async (keyword: ChatKeyword, action: ChatKeyword["action"], isEnabled: boolean): Promise<void> => {
    if (session === null) {
      return;
    }
    const actionLabel = action === "block" ? "阻断" : action === "mask" ? "替换" : "放行";
    requestAdminConfirmation({
      title: "调整聊天关键词",
      target: keyword.keyword,
      impact: `将关键词处置改为${actionLabel}，状态改为${isEnabled ? "启用" : "停用"}。`,
      reason: chatKeywordReason.trim(),
      riskLevel: action === "block" || !isEnabled ? "高风险" : "中风险",
      confirmLabel: "提交调整",
      onConfirm: async () => {
        const response = await apiRequest<{ keyword: ChatKeyword; auditLogId: string }>(`/admin/chat-keywords/${encodeURIComponent(keyword.id)}`, {
          method: "POST",
          body: JSON.stringify({ action, isEnabled, replacement: keyword.replacement, reason: chatKeywordReason })
        }, session.token);
        if (!response.success) {
          setError(response.error.message);
          return;
        }
        setChatKeywordList((current) => ({
          ...current,
          rows: current.rows.map((row) => row.id === response.data.keyword.id ? response.data.keyword : row)
        }));
        setActionMessage(`聊天关键词库已保存并记录审计：${response.data.auditLogId}`);
        const logs = await apiRequest<AuditLogList>("/admin/audit-logs", {}, session.token);
        if (logs.success) {
          applyAuditList(logs.data);
        }
      }
    });
  };

  const loadGuildDetail = async (guildId: string): Promise<void> => {
    if (session === null || guildId === "") {
      return;
    }
    const detail = await apiRequest<AdminGuildDetail>(`/admin/guilds/${encodeURIComponent(guildId)}`, {}, session.token);
    if (!detail.success) {
      setError(detail.error.message);
      return;
    }
    setSelectedGuildId(guildId);
    setSelectedGuildDetail(detail.data);
  };

  const submitGuildSearch = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null) {
      return;
    }
    await loadAdminData(session.token, keyword);
    setActionMessage("已刷新商会运营数据。");
  };

  const submitGuildLeaderboardSettlement = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null || selectedGuild === null) {
      return;
    }
    if (guildSettleReason.trim().length < 2) {
      setError("请输入商会榜结算原因。");
      return;
    }
    const guild = selectedGuild;
    const reason = guildSettleReason.trim();
    requestAdminConfirmation({
      title: "结算商会贡献榜",
      target: guild.name,
      impact: "将向符合条件的商会成员发放榜单奖励，重复执行按幂等结果处理。",
      reason,
      riskLevel: "高风险",
      confirmLabel: "结算奖励",
      onConfirm: async () => {
        const result = await apiRequest<AuditResult & { deliveredRewards: number }>(
          `/admin/guilds/${encodeURIComponent(guild.id)}/leaderboard/settle`,
          {
            method: "POST",
            body: JSON.stringify({ reason })
          },
          session.token
        );
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        setActionMessage(`商会贡献榜结算完成，发放 ${result.data.deliveredRewards} 条奖励，审计记录：${result.data.auditLogId}`);
        await loadAdminData(session.token, keyword);
        await loadGuildDetail(guild.id);
      }
    });
  };

  const submitCrossGuildSettlement = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null) {
      return;
    }
    if (crossGuildSettleServerId.trim() === "" || crossGuildSettleReason.trim().length < 2) {
      setError("请输入区服 ID 和跨服商会结算原因。");
      return;
    }
    const serverId = crossGuildSettleServerId.trim();
    const reason = crossGuildSettleReason.trim();
    requestAdminConfirmation({
      title: "结算跨服商会赛季",
      target: serverId,
      impact: "将向跨服商会赛季符合条件的商会发放结算奖励。",
      reason,
      riskLevel: "高风险",
      confirmLabel: "结算奖励",
      onConfirm: async () => {
        const result = await apiRequest<AuditResult & { deliveredRewards: number }>("/admin/cross-server/guild/settle", {
          method: "POST",
          body: JSON.stringify({ serverId, reason })
        }, session.token);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        setActionMessage(`跨服商会赛季结算完成，发放 ${result.data.deliveredRewards} 条奖励，审计记录：${result.data.auditLogId}`);
        await loadAdminData(session.token, keyword);
      }
    });
  };

  const submitActivitySettlement = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null || selectedActivity === null) {
      return;
    }
    if (activitySettleReason.trim().length < 2) {
      setError("请输入活动榜结算原因。");
      return;
    }
    const activity = selectedActivity;
    const reason = activitySettleReason.trim();
    requestAdminConfirmation({
      title: "结算活动榜",
      target: activity.name,
      impact: "将向活动榜符合条件的玩家发放声望等奖励，重复执行按幂等结果处理。",
      reason,
      riskLevel: "高风险",
      confirmLabel: "结算奖励",
      onConfirm: async () => {
        const result = await apiRequest<AuditResult & { deliveredRewards: number }>(
          `/admin/activities/${encodeURIComponent(activity.id)}/leaderboard/settle`,
          {
            method: "POST",
            body: JSON.stringify({ reason })
          },
          session.token
        );
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        setActionMessage(`活动榜结算完成，发放 ${result.data.deliveredRewards} 条奖励，审计记录：${result.data.auditLogId}`);
        await loadAdminData(session.token, keyword);
      }
    });
  };

  const selectKnowledge = (knowledge: KnowledgeEntry): void => {
    setSelectedKnowledgeId(knowledge.id);
    setKnowledgeForm(knowledgeToForm(knowledge));
  };

  const updateKnowledgeForm = (key: keyof KnowledgeForm, value: string): void => {
    setKnowledgeForm((current) => ({ ...current, [key]: value }));
  };

  const submitKnowledgeUpdate = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null || selectedKnowledge === null) {
      return;
    }
    if (knowledgeForm.reason.trim().length < 2) {
      setError("请填写知识卡审核原因。");
      return;
    }
    const knowledge = selectedKnowledge;
    const form = { ...knowledgeForm, reason: knowledgeForm.reason.trim() };
    requestAdminConfirmation({
      title: "保存知识卡",
      target: knowledge.title,
      impact: "将更新知识卡内容、来源或审核状态，并写入审计日志。",
      reason: form.reason,
      riskLevel: "中风险",
      confirmLabel: "保存知识卡",
      onConfirm: async () => {
        const response = await apiRequest<KnowledgeEntry & AuditResult>(`/admin/knowledge/${encodeURIComponent(knowledge.id)}`, {
          method: "POST",
          body: JSON.stringify(form)
        }, session.token);
        if (!response.success) {
          setError(response.error.message);
          return;
        }

        setKnowledgeList((current) => ({
          ...current,
          rows: current.rows.map((item) => item.id === response.data.id ? response.data : item)
        }));
        setKnowledgeForm(knowledgeToForm(response.data));
        setActionMessage(`知识卡已更新，审计记录：${response.data.auditLogId}`);
        const logs = await apiRequest<AuditLogList>("/admin/audit-logs", {}, session.token);
        if (logs.success) {
          applyAuditList(logs.data);
        }
      }
    });
  };

  const submitAuditSearch = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null) {
      return;
    }

    const response = await apiRequest<AuditLogList>(buildAuditQuery({
      action: auditAction,
      targetType: auditTargetType,
      targetId: auditTargetId,
      admin: auditAdmin,
      from: auditFrom,
      to: auditTo
    }), {}, session.token);
    if (!response.success) {
      setError(response.error.message);
      return;
    }

    setError("");
    applyAuditList(response.data);
  };

  const applyAuditQuickFilter = async (action: string, targetType: string): Promise<void> => {
    setAuditAction(action);
    setAuditTargetType(targetType);
    setAuditTargetId("");
    setAuditAdmin("");
    if (session === null) {
      return;
    }
    const response = await apiRequest<AuditLogList>(buildAuditQuery({
      action,
      targetType,
      targetId: "",
      admin: "",
      from: auditFrom,
      to: auditTo
    }), {}, session.token);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    setError("");
    applyAuditList(response.data);
  };

  const submitCoinAdjustment = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null || selectedPlayer === null) {
      return;
    }
    const changeAmount = Number.parseInt(coinAmount, 10);
    if (!Number.isInteger(changeAmount) || changeAmount === 0 || coinReason.trim().length < 2) {
      setError("请输入非零平台币调整数量和正式原因。");
      return;
    }
    const player = selectedPlayer;
    const reason = coinReason.trim();
    requestAdminConfirmation({
      title: "提交平台币调整",
      target: player.companyName,
      impact: `平台币变动 ${changeAmount}，会直接改变玩家资产并记录审计。`,
      reason,
      riskLevel: "高风险",
      confirmLabel: "提交调整",
      onConfirm: async () => {
        const adjusted = await apiRequest<WalletAdjustment>("/admin/wallet/adjust", {
          method: "POST",
          body: JSON.stringify({
            profileId: player.profileId,
            source: coinSource,
            changeAmount,
            reason
          })
        }, session.token);
        if (!adjusted.success) {
          setError(adjusted.error.message);
          return;
        }
        setActionMessage(`平台币操作已记录审计：${adjusted.data.auditLogId}`);
        await loadAdminData(session.token, keyword);
      }
    });
  };

  const submitVipAdjustment = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null || selectedPlayer === null) {
      return;
    }
    const nextVipExperience = Number.parseInt(vipExperience, 10);
    if (!Number.isInteger(nextVipExperience) || nextVipExperience < 0 || vipReason.trim().length < 2) {
      setError("请输入非负 VIP 经验和正式原因。");
      return;
    }
    const player = selectedPlayer;
    const reason = vipReason.trim();
    requestAdminConfirmation({
      title: "提交 VIP 调整",
      target: player.companyName,
      impact: `VIP 经验将修正为 ${nextVipExperience}，会影响后台 VIP 档位展示。`,
      reason,
      riskLevel: "高风险",
      confirmLabel: "提交调整",
      onConfirm: async () => {
        const adjusted = await apiRequest<VipAdjustment>("/admin/vip/adjust", {
          method: "POST",
          body: JSON.stringify({
            profileId: player.profileId,
            vipExperience: nextVipExperience,
            reason
          })
        }, session.token);
        if (!adjusted.success) {
          setError(adjusted.error.message);
          return;
        }
        setActionMessage(`VIP 已调整为 ${adjusted.data.vipCenter.currentLevel.name}，审计记录：${adjusted.data.auditLogId}`);
        await loadAdminData(session.token, keyword);
      }
    });
  };

  const submitGroupAssignment = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null) {
      return;
    }
    if (assignServerId.trim() === "" || assignGroupId.trim() === "" || assignReason.trim().length < 2) {
      setError("请选择区服、跨服分组并填写调整原因。");
      return;
    }
    const serverId = assignServerId.trim();
    const groupId = assignGroupId.trim();
    const reason = assignReason.trim();
    requestAdminConfirmation({
      title: "调整跨服分组",
      target: serverId,
      impact: "将改变该区服后续跨服匹配池，影响跨服榜单和商会赛季范围。",
      reason,
      riskLevel: "高风险",
      confirmLabel: "提交调整",
      onConfirm: async () => {
        const assigned = await apiRequest<GroupAssignment>("/admin/cross-server/groups/assign", {
          method: "POST",
          body: JSON.stringify({ serverId, groupId, reason })
        }, session.token);
        if (!assigned.success) {
          setError(assigned.error.message);
          return;
        }
        setActionMessage(`跨服分组已调整：${assigned.data.group.name}，审计记录：${assigned.data.auditLogId}`);
        await loadAdminData(session.token, keyword);
      }
    });
  };

  const submitTitleAction = async (event: { preventDefault(): void }, action: "grant" | "revoke"): Promise<void> => {
    event.preventDefault();
    if (session === null || selectedPlayer === null) {
      return;
    }
    if (selectedTitleId === "" || titleReason.trim().length < 2) {
      setError("请选择称号并填写正式原因。");
      return;
    }
    const label = action === "grant" ? "发放" : "回收";
    const player = selectedPlayer;
    const titleId = selectedTitleId;
    const reason = titleReason.trim();
    requestAdminConfirmation({
      title: `${label}称号`,
      target: `${player.companyName} / ${titleId}`,
      impact: `将${label}玩家称号并写入审计日志。`,
      reason,
      riskLevel: "高风险",
      confirmLabel: action === "grant" ? "发放称号" : "回收称号",
      onConfirm: async () => {
        const result = await apiRequest<AuditResult>(`/admin/titles/${action}`, {
          method: "POST",
          body: JSON.stringify({
            profileId: player.profileId,
            titleId,
            reason
          })
        }, session.token);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        setActionMessage(`称号${label}已记录审计：${result.data.auditLogId}`);
        await loadAdminData(session.token, keyword);
      }
    });
  };

  const submitMailCompensation = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null || selectedPlayer === null) {
      return;
    }
    const platformCoins = Number.parseInt(mailCoins, 10);
    if (!Number.isInteger(platformCoins) || platformCoins < 0 || mailSubject.trim().length < 2 || mailBody.trim().length < 2) {
      setError("请输入邮件标题、正文和非负平台币数量。");
      return;
    }
    const player = selectedPlayer;
    const subject = mailSubject.trim();
    const body = mailBody.trim();
    requestAdminConfirmation({
      title: "发送补偿邮件",
      target: player.companyName,
      impact: `将发送补偿邮件并发放 ${platformCoins} 平台币。`,
      reason: subject,
      riskLevel: "高风险",
      confirmLabel: "发送补偿",
      onConfirm: async () => {
        const result = await apiRequest<MailCompensation>("/admin/mail/compensate", {
          method: "POST",
          body: JSON.stringify({
            profileId: player.profileId,
            subject,
            body,
            platformCoins,
            reason: subject
          })
        }, session.token);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        setActionMessage(`邮件补偿已发放，余额 ${formatNumber(result.data.wallet.balance)}，审计记录：${result.data.auditLogId}`);
        await loadAdminData(session.token, keyword);
      }
    });
  };

  const submitProfileStatus = async (status: "active" | "banned"): Promise<void> => {
    if (session === null || selectedPlayer === null) {
      return;
    }
    const label = status === "banned" ? "封禁" : "解封";
    if (statusReason.trim().length < 2) {
      setError("请输入封禁或解封原因。");
      return;
    }
    const player = selectedPlayer;
    const reason = statusReason.trim();
    requestAdminConfirmation({
      title: `${label}玩家`,
      target: player.companyName,
      impact: status === "banned" ? "将限制玩家账号进入正常经营状态。" : "将恢复玩家账号正常经营状态。",
      reason,
      riskLevel: "高风险",
      confirmLabel: label,
      onConfirm: async () => {
        const result = await apiRequest<ProfileStatus>("/admin/players/status", {
          method: "POST",
          body: JSON.stringify({
            profileId: player.profileId,
            status,
            reason
          })
        }, session.token);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        setActionMessage(`玩家状态已更新为 ${result.data.status}，审计记录：${result.data.auditLogId}`);
        await loadAdminData(session.token, keyword);
      }
    });
  };

  const submitLeaderboardSettlement = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null) {
      return;
    }
    if (settleServerId.trim() === "" || settleReason.trim().length < 2) {
      setError("请输入区服 ID 和结算原因。");
      return;
    }
    const serverId = settleServerId.trim();
    const reason = settleReason.trim();
    requestAdminConfirmation({
      title: "结算排行榜",
      target: serverId,
      impact: "将向该区服排行榜符合条件的玩家发放奖励，重复执行按幂等结果处理。",
      reason,
      riskLevel: "高风险",
      confirmLabel: "结算奖励",
      onConfirm: async () => {
        const result = await apiRequest<AuditResult & { deliveredRewards: number }>("/admin/leaderboards/settle", {
          method: "POST",
          body: JSON.stringify({ serverId, reason })
        }, session.token);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        setActionMessage(`排行榜结算完成，发放 ${result.data.deliveredRewards} 条奖励，审计记录：${result.data.auditLogId}`);
        await loadAdminData(session.token, keyword);
      }
    });
  };

  const toggleSettlementCandidate = (candidateId: string): void => {
    setSelectedSettlementCandidateIds((current) =>
      current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]
    );
  };

  const selectAllPendingSettlementCandidates = (): void => {
    setSelectedSettlementCandidateIds(pendingSettlementCandidates.map((candidate) => candidate.id));
  };

  const clearSelectedSettlementCandidates = (): void => {
    setSelectedSettlementCandidateIds([]);
  };

  const settleCandidate = async (candidate: SettlementCandidate): Promise<SettlementBatchResult> => {
    if (session === null) {
      return { id: candidate.id, name: candidate.name, status: "failed", message: "后台登录状态已失效。" };
    }
    const body = JSON.stringify({ serverId: candidate.serverId, reason: candidate.reasonPreset });
    const response = candidate.kind === "activity"
      ? await apiRequest<AuditResult & { deliveredRewards: number }>(
        `/admin/activities/${encodeURIComponent(candidate.targetId)}/leaderboard/settle`,
        { method: "POST", body: JSON.stringify({ reason: candidate.reasonPreset }) },
        session.token
      )
      : candidate.kind === "guild"
        ? await apiRequest<AuditResult & { deliveredRewards: number }>(
          `/admin/guilds/${encodeURIComponent(candidate.targetId)}/leaderboard/settle`,
          { method: "POST", body: JSON.stringify({ reason: candidate.reasonPreset }) },
          session.token
        )
        : candidate.kind === "crossGuild"
          ? await apiRequest<AuditResult & { deliveredRewards: number }>("/admin/cross-server/guild/settle", { method: "POST", body }, session.token)
          : candidate.kind === "crossLeaderboard"
            ? await apiRequest<AuditResult & { deliveredRewards: number }>("/admin/cross-server/settle", { method: "POST", body }, session.token)
          : await apiRequest<AuditResult & { deliveredRewards: number }>("/admin/leaderboards/settle", { method: "POST", body }, session.token);

    if (!response.success) {
      return { id: candidate.id, name: candidate.name, status: "failed", message: response.error.message };
    }
    return {
      id: candidate.id,
      name: candidate.name,
      status: response.data.deliveredRewards === 0 ? "retry" : "success",
      message: `发放 ${response.data.deliveredRewards} 条，审计记录：${response.data.auditLogId}`
    };
  };

  const runSelectedSettlementCandidates = async (): Promise<void> => {
    if (session === null) {
      return;
    }
    if (selectedSettlementCandidates.length === 0) {
      setError("请选择待结算对象。");
      return;
    }
    const candidates = selectedSettlementCandidates;
    requestAdminConfirmation({
      title: "批量结算奖励",
      target: `${candidates.length} 个待结算对象`,
      impact: "将按队列顺序串行调用既有结算接口；不会创建无人值守定时发奖。",
      reason: candidates.map((candidate) => candidate.reasonPreset).join("；"),
      riskLevel: "高风险",
      confirmLabel: "批量结算",
      onConfirm: async () => {
        const results: SettlementBatchResult[] = [];
        for (const candidate of candidates) {
          results.push(await settleCandidate(candidate));
        }
        setBatchSettlementResults(results);
        setSelectedSettlementCandidateIds([]);
        setActionMessage(`批量结算结果：成功 ${results.filter((result) => result.status === "success").length}，幂等重试 ${results.filter((result) => result.status === "retry").length}，失败 ${results.filter((result) => result.status === "failed").length}`);
        await loadAdminData(session.token, keyword);
      }
    });
  };

  const updateActivityDraftForm = (field: keyof ActivityDraftForm, value: string): void => {
    setActivityDraftForm((current) => ({ ...current, [field]: value }));
    setActivityDraftValidation(null);
  };

  const buildActivityDraftPayload = (): Record<string, string | number | null> => ({
    id: activityDraftForm.id.trim(),
    name: activityDraftForm.name.trim(),
    startDate: activityDraftForm.startDate.trim(),
    endDate: activityDraftForm.endDate.trim(),
    leaderboardKey: activityDraftForm.leaderboardKey.trim(),
    targetScore: readDraftInteger(activityDraftForm.targetScore),
    rewardReputation: readDraftInteger(activityDraftForm.rewardReputation),
    rewardPoints: readDraftInteger(activityDraftForm.rewardPoints),
    rewardTitleId: activityDraftForm.rewardTitleId.trim() || null,
    rewardCash: readDraftInteger(activityDraftForm.rewardCash),
    rewardPlatformCoins: readDraftInteger(activityDraftForm.rewardPlatformCoins)
  });

  const refreshActivityDrafts = async (): Promise<void> => {
    if (session === null) {
      return;
    }
    const result = await apiRequest<ActivityDraftList>("/admin/activity-config-drafts", {}, session.token);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setActivityDrafts(result.data);
  };

  const refreshActivityPublishObservations = async (): Promise<void> => {
    if (session === null) {
      return;
    }
    const result = await apiRequest<ActivityPublishObservationList>("/admin/activity-publish-observations", {}, session.token);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setActivityPublishObservations(result.data);
  };

  const submitActivityDraftValidation = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null) {
      return;
    }

    const result = await apiRequest<ActivityDraftValidation>("/admin/activity-config-drafts/validate", {
      method: "POST",
      body: JSON.stringify(buildActivityDraftPayload())
    }, session.token);
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setError("");
    setActivityDraftValidation(result.data);
    setActionMessage(result.data.summary.isValid ? "活动草案通过预检，可进入人工复核。" : "活动草案存在阻断错误或奖励边界风险。");
  };

  const saveActivityDraft = async (): Promise<void> => {
    if (session === null) {
      return;
    }
    const result = await apiRequest<ActivityDraftActionResult>("/admin/activity-config-drafts", {
      method: "POST",
      body: JSON.stringify(buildActivityDraftPayload())
    }, session.token);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setError("");
    setActivityDraftValidation(result.data.validation);
    await refreshActivityDrafts();
    setActionMessage(`活动草案已保存为${activityDraftStatusLabel(result.data.draft.status)}，审计记录：${result.data.auditLogId}`);
  };

  const handleActivityDraftAction = async (draft: ActivityDraftRecord, action: "submit" | "approve" | "reject"): Promise<void> => {
    if (session === null) {
      return;
    }
    const reason = action === "submit" ? "提交人工复核" : activityDraftReviewReason.trim();
    if (reason.length < 2 || reason.length > 180) {
      setError("审批说明需要 2-180 个字符。");
      return;
    }
    const result = await apiRequest<ActivityDraftActionResult>(
      `/admin/activity-config-drafts/${encodeURIComponent(draft.id)}/${action}`,
      {
        method: "POST",
        body: JSON.stringify({ reason })
      },
      session.token
    );
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setError("");
    setActivityDraftValidation(result.data.validation);
    await refreshActivityDrafts();
    const auditText = result.data.auditLogId === null ? "重复操作未新增审计记录" : `审计记录：${result.data.auditLogId}`;
    setActionMessage(`${result.data.draft.name} 已更新为${activityDraftStatusLabel(result.data.draft.status)}，${auditText}`);
  };

  const publishActivityDraft = async (draft: ActivityDraftRecord): Promise<void> => {
    if (session === null) {
      return;
    }
    const reason = activityDraftPublishReason.trim();
    if (reason.length < 2 || reason.length > 180) {
      setError("发布确认说明需要 2-180 个字符。");
      return;
    }
    requestAdminConfirmation({
      title: "正式发布活动",
      target: draft.name,
      impact: "将把已通过草案发布为正式活动配置，影响玩家侧活动入口和榜单。",
      reason,
      riskLevel: "高风险",
      confirmLabel: "安全发布",
      onConfirm: async () => {
        const result = await apiRequest<ActivityDraftPublishResult>(
          `/admin/activity-config-drafts/${encodeURIComponent(draft.id)}/publish`,
          {
            method: "POST",
            body: JSON.stringify({ reason })
          },
          session.token
        );
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        setError("");
        setActivityDraftValidation(result.data.validation);
        await refreshActivityDrafts();
        await refreshActivityPublishObservations();
        const auditText = result.data.auditLogId === null ? "重复发布未新增审计记录" : `审计记录：${result.data.auditLogId}`;
        setActionMessage(`${result.data.activity.name} 已发布到正式活动配置，${auditText}`);
      }
    });
  };

  const refreshOperationConfigAlerts = async (): Promise<void> => {
    if (session === null) {
      return;
    }
    const result = await apiRequest<OperationConfigAlerts>("/admin/operation-config-alerts", {}, session.token);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setOperationConfigAlerts(result.data);
    setActionMessage("运营配置巡检已刷新。");
  };

  const handleOperationConfigAlert = async (alert: OperationConfigAlert, action: "ack" | "ignore" | "reopen"): Promise<void> => {
    if (session === null) {
      return;
    }
    const note = alertHandleNote.trim();
    if (note.length > 180) {
      setError("巡检处理备注不能超过 180 个字符。");
      return;
    }

    const result = await apiRequest<OperationConfigAlertAction>(
      `/admin/operation-config-alerts/${encodeURIComponent(alert.id)}/${action}`,
      {
        method: "POST",
        body: JSON.stringify({ note })
      },
      session.token
    );
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    const refreshed = await apiRequest<OperationConfigAlerts>("/admin/operation-config-alerts", {}, session.token);
    if (refreshed.success) {
      setOperationConfigAlerts(refreshed.data);
    } else {
      setOperationConfigAlerts((current) => ({
        ...current,
        alerts: current.alerts.map((item) => item.id === result.data.alert.id ? result.data.alert : item)
      }));
    }
    setActionMessage(`巡检告警已更新为 ${alertStatusLabel(result.data.alert.status)}，审计记录：${result.data.auditLogId}`);
  };

  if (session === null) {
    return (
      <main className="admin-login-shell">
        <section className="admin-login-panel" aria-label="后台登录">
          <div className="admin-login-brand">
            <span>管</span>
            <div>
              <h1>运营管理后台</h1>
              <p>写字楼创业记</p>
            </div>
          </div>
          <form className="admin-login-form" onSubmit={(event) => void submitLogin(event)}>
            <label>
              管理员账号
              <input
                autoComplete="username"
                onChange={(event) => setAccount(event.target.value)}
                placeholder="请输入管理员账号"
                value={account}
              />
            </label>
            <label>
              登录密码
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入登录密码"
                type="password"
                value={password}
              />
            </label>
            {error && <p className="admin-error">{error}</p>}
            <button type="submit">登录后台</button>
          </form>
        </section>
      </main>
    );
  }

  if (isRestoring) {
    return (
      <main className="admin-login-shell">
        <section className="admin-login-panel" aria-label="后台登录状态检查">
          <div className="admin-login-brand">
            <span>管</span>
            <div>
              <h1>运营管理后台</h1>
              <p>正在校验登录状态</p>
            </div>
          </div>
          {error && <p className="admin-error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar" aria-label="后台菜单">
        <div className="brand">
          <span className="brand-mark">创</span>
          <div>
            <strong>写字楼创业记</strong>
            <span>运营管理后台</span>
          </div>
        </div>

        <nav className="nav-list">
          {menuItems.map((item) => (
            <button
              className={item.id === activeSection ? "active" : undefined}
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Phase 27 质量收口</p>
            <h1>{menuItems.find((item) => item.id === activeSection)?.label}</h1>
          </div>
          <div className="operator-bar">
            <span>{session.account}</span>
            <button type="button" onClick={logout}>
              退出登录
            </button>
          </div>
        </header>

        <form className="filter-bar" aria-label="玩家筛选" onSubmit={(event) => void submitSearch(event)}>
          <label>
            关键词
            <input
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="账号 / 创始人 / 公司名 / 区服"
              value={keyword}
            />
          </label>
          <button disabled={isLoading} type="submit">
            查询
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setKeyword("");
              if (session !== null) {
                void loadAdminData(session.token, "");
              }
            }}
          >
            重置
          </button>
        </form>

        {error && <p className="admin-error">{error}</p>}
        {actionMessage && <p className="action-message">{actionMessage}</p>}
        {pendingAdminAction !== null && (
          <div className="admin-confirm-backdrop" role="presentation">
            <section className="admin-confirm-modal" aria-label="后台操作确认" role="dialog" aria-modal="true">
              <header>
                <span>{pendingAdminAction.riskLevel}</span>
                <h2>{pendingAdminAction.title}</h2>
              </header>
              <div className="admin-confirm-grid">
                <span>动作名称</span><strong>{pendingAdminAction.title}</strong>
                <span>对象</span><strong>{pendingAdminAction.target}</strong>
                <span>影响范围</span><strong>{pendingAdminAction.impact}</strong>
                <span>审计原因</span><strong>{pendingAdminAction.reason}</strong>
                <span>风险级别</span><strong>{pendingAdminAction.riskLevel}</strong>
              </div>
              <div className="button-row">
                <button type="button" onClick={() => void executePendingAdminAction()}>{pendingAdminAction.confirmLabel}</button>
                <button className="secondary-button" type="button" onClick={() => setPendingAdminAction(null)}>取消</button>
              </div>
              <p className="panel-note">确认执行后才会调用后台接口；查询、刷新、草案校验和巡检知悉不进入此确认。</p>
            </section>
          </div>
        )}

        {activeSection === "analytics" && (
          <section className="stacked-sections" aria-label="商业化数据看板">
            <section className="analytics-grid" aria-label="核心指标">
              <div className="metric-card">
                <span>玩家总数</span>
                <strong>{formatNumber(analytics?.overview.totalPlayers ?? 0)}</strong>
              </div>
              <div className="metric-card">
                <span>留存玩家</span>
                <strong>{formatNumber(analytics?.overview.retainedPlayers ?? 0)}</strong>
              </div>
              <div className="metric-card">
                <span>API 错误</span>
                <strong>{formatNumber(analytics?.overview.apiErrorCount ?? 0)}</strong>
              </div>
              <div className="metric-card">
                <span>慢接口</span>
                <strong>{formatNumber(analytics?.overview.slowApiCount ?? 0)}</strong>
              </div>
            </section>

            <section className="dense-kpi-strip" aria-label="运营速览">
              <strong>运营速览</strong>
              <span>商业入口点击 {formatNumber(analytics?.monetization.commercialEntryClickTotal ?? 0)}</span>
              <span>付费入口点击 {formatNumber(analytics?.monetization.paidProductEntryClickTotal ?? 0)}</span>
              <span>长期目标点击 {formatNumber(analytics?.monetization.longTermGoalClickCount ?? 0)}</span>
              <span>夜间简报 {formatNumber(analytics?.monetization.businessClockBriefingOpenCount ?? 0)}</span>
              <span>经营待办 {formatNumber(analytics?.monetization.businessClockTodoHandledCount ?? 0)}</span>
              <span>运营告警 {formatNumber(analytics?.alerts.length ?? 0)}</span>
            </section>

            <section className="operation-grid" aria-label="商业化调优指标">
              <section className="table-section compact-table">
                <div className="table-toolbar">
                  <strong>任务与玩法漏斗</strong>
                  <span>实时聚合</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>指标</th>
                        <th>数值</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>任务完成率</td><td>{formatRate(analytics?.business.taskCompletionRateBasisPoints ?? 0)}</td></tr>
                      <tr><td>成就完成率</td><td>{formatRate(analytics?.business.achievementCompletionRateBasisPoints ?? 0)}</td></tr>
                      <tr><td>知识点查看率</td><td>{formatRate(analytics?.business.knowledgeViewRateBasisPoints ?? 0)}</td></tr>
                      <tr><td>项目失败率</td><td>{formatRate(analytics?.business.projectFailureRateBasisPoints ?? 0)}</td></tr>
                      <tr><td>融资成功率</td><td>{formatRate(analytics?.business.fundingSuccessRateBasisPoints ?? 0)}</td></tr>
                      <tr><td>员工离职率</td><td>{formatRate(analytics?.business.employeeDepartureRateBasisPoints ?? 0)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="table-section compact-table">
                <div className="table-toolbar">
                  <strong>商业化与平台币</strong>
                  <span>发放 / 消耗 / 转化</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>指标</th>
                        <th>数值</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>平台币存量</td><td>{formatNumber(analytics?.monetization.platformCoinBalanceTotal ?? 0)}</td></tr>
                      <tr><td>平台币发放</td><td>{formatNumber(analytics?.monetization.platformCoinGrantedTotal ?? 0)}</td></tr>
                      <tr><td>平台币消耗</td><td>{formatNumber(analytics?.monetization.platformCoinSpentTotal ?? 0)}</td></tr>
                      <tr><td>商品点击</td><td>{formatNumber(analytics?.monetization.shopClickCount ?? 0)}</td></tr>
                      <tr><td>购买转化率</td><td>{formatRate(analytics?.monetization.shopPurchaseConversionBasisPoints ?? 0)}</td></tr>
                      <tr><td>商业入口点击</td><td>{formatNumber(analytics?.monetization.commercialEntryClickTotal ?? 0)}</td></tr>
                      <tr><td>付费入口点击</td><td>{formatNumber(analytics?.monetization.paidProductEntryClickTotal ?? 0)}</td></tr>
                      <tr><td>长期目标点击</td><td>{formatNumber(analytics?.monetization.longTermGoalClickCount ?? 0)}</td></tr>
                      <tr><td>夜间简报打开</td><td>{formatNumber(analytics?.monetization.businessClockBriefingOpenCount ?? 0)}</td></tr>
                      <tr><td>经营待办处理</td><td>{formatNumber(analytics?.monetization.businessClockTodoHandledCount ?? 0)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </section>

            <section className="config-grid" aria-label="分布与告警">
              <div>
                <h3>新手步骤埋点</h3>
                {(analytics?.onboarding.tutorialSteps.length ?? 0) === 0 ? (
                  <p>暂无新手步骤数据。</p>
                ) : analytics?.onboarding.tutorialSteps.map((step) => (
                  <p key={step.step}>{step.step}：{formatNumber(step.count)}</p>
                ))}
              </div>
              <div>
                <h3>负债率分布</h3>
                {(analytics?.business.debtRatioDistribution ?? []).map((item) => (
                  <p key={item.band}>{item.band}：{formatNumber(item.count)}</p>
                ))}
              </div>
              <div>
                <h3>VIP 等级分布</h3>
                {(analytics?.monetization.vipLevelDistribution.length ?? 0) === 0 ? (
                  <p>暂无 VIP 数据。</p>
                ) : analytics?.monetization.vipLevelDistribution.map((item) => (
                  <p key={item.level}>VIP {item.level}：{formatNumber(item.count)}</p>
                ))}
              </div>
              <div>
                <h3>商业入口点击</h3>
                {(analytics?.monetization.commercialEntryClicks.length ?? 0) === 0 ? (
                  <p>暂无商业入口数据。</p>
                ) : analytics?.monetization.commercialEntryClicks.map((item) => (
                  <p key={item.entry}>{commercialEntryLabel(item.entry)}：{formatNumber(item.count)}</p>
                ))}
              </div>
              <div>
                <h3>付费入口点击</h3>
                {(analytics?.monetization.paidProductEntryClicks.length ?? 0) === 0 ? (
                  <p>暂无付费入口数据。</p>
                ) : analytics?.monetization.paidProductEntryClicks.map((item) => (
                  <p key={item.product}>{paidProductLabel(item.product)}：{formatNumber(item.count)}</p>
                ))}
              </div>
              <div>
                <h3>运营告警</h3>
                {(analytics?.alerts ?? []).map((alert) => (
                  <p key={alert.message}>{alert.level}：{alert.message}</p>
                ))}
              </div>
            </section>
          </section>
        )}

        {activeSection === "players" && (
          <section className="table-section" aria-label="玩家列表">
            <div className="table-toolbar">
              <strong>玩家账号与公司档案</strong>
              <span>共 {players.length} 条记录</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>账号</th>
                    <th>区服</th>
                    <th>创始人</th>
                    <th>公司</th>
                    <th>现金</th>
                    <th>净现金流</th>
                    <th>平台币</th>
                    <th>VIP</th>
                    <th>购买/支付</th>
                    <th>称号/成就/知识</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((row) => (
                    <tr key={row.profileId}>
                      <td>{row.username}</td>
                      <td>{row.serverName}</td>
                      <td>{row.founderName}</td>
                      <td>{row.companyName}</td>
                      <td>{formatNumber(row.cash)}</td>
                      <td>{formatNumber(row.netCashFlow)}</td>
                      <td>{formatNumber(row.walletBalance)}</td>
                      <td>VIP {row.vipLevel}</td>
                      <td>{row.purchaseCount} / {row.paymentOrderCount}</td>
                      <td>{row.titleCount} / {row.achievementCompletedCount} / {row.knowledgeUnlockCount}</td>
                      <td>
                        <span className={`status-tag status-${row.riskStatus}`}>{row.riskStatus}</span>
                        <span className={`status-tag status-${row.profileStatus}`}>{row.profileStatus === "banned" ? "已封禁" : "正常"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeSection === "wallet" && (
          <section className="operation-grid" aria-label="平台币与 VIP 操作">
            <form className="operation-panel" onSubmit={(event) => void submitCoinAdjustment(event)}>
              <h2>平台币发放、扣减、修正</h2>
              <label>
                玩家
                <select onChange={(event) => setSelectedProfileId(event.target.value)} value={selectedPlayer?.profileId ?? ""}>
                  {players.map((player) => (
                    <option key={player.profileId} value={player.profileId}>
                      {player.companyName} / {player.founderName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                操作类型
                <select onChange={(event) => setCoinSource(event.target.value)} value={coinSource}>
                  <option value="admin_grant">后台发放</option>
                  <option value="admin_deduct">后台扣减</option>
                  <option value="admin_correction">余额修正</option>
                </select>
              </label>
              <label>
                变动数量
                <input onChange={(event) => setCoinAmount(event.target.value)} value={coinAmount} />
              </label>
              <label>
                操作原因
                <input onChange={(event) => setCoinReason(event.target.value)} value={coinReason} />
              </label>
              <button type="submit">提交调整</button>
            </form>

            <form className="operation-panel" onSubmit={(event) => void submitVipAdjustment(event)}>
              <h2>VIP 查询和经验调整</h2>
              <p className="panel-note">
                当前玩家：{selectedPlayer === null ? "暂无玩家" : `${selectedPlayer.companyName}，VIP ${selectedPlayer.vipLevel}，经验 ${selectedPlayer.vipExperience}`}
              </p>
              <label>
                VIP 经验
                <input onChange={(event) => setVipExperience(event.target.value)} value={vipExperience} />
              </label>
              <label>
                调整原因
                <input onChange={(event) => setVipReason(event.target.value)} value={vipReason} />
              </label>
              <button type="submit">提交调整</button>
            </form>
          </section>
        )}

        {activeSection === "titles" && (
          <section className="operation-grid" aria-label="称号与补偿操作">
            <form className="operation-panel" onSubmit={(event) => void submitTitleAction(event, "grant")}>
              <h2>称号发放与回收</h2>
              <label>
                玩家
                <select onChange={(event) => setSelectedProfileId(event.target.value)} value={selectedPlayer?.profileId ?? ""}>
                  {players.map((player) => (
                    <option key={player.profileId} value={player.profileId}>
                      {player.companyName} / {player.founderName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                称号
                <select onChange={(event) => setSelectedTitleId(event.target.value)} value={selectedTitleId}>
                  {configCenter.titles.map((title) => (
                    <option key={title.id} value={title.id}>
                      {title.name} / {title.source}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                操作原因
                <input onChange={(event) => setTitleReason(event.target.value)} value={titleReason} />
              </label>
              <div className="button-row">
                <button type="submit">发放称号</button>
                <button className="secondary-button" type="button" onClick={(event) => void submitTitleAction(event, "revoke")}>
                  回收称号
                </button>
              </div>
            </form>

            <form className="operation-panel" onSubmit={(event) => void submitMailCompensation(event)}>
              <h2>邮件补偿</h2>
              <p className="panel-note">
                当前玩家：{selectedPlayer === null ? "暂无玩家" : `${selectedPlayer.companyName}，平台币 ${formatNumber(selectedPlayer.walletBalance)}`}
              </p>
              <label>
                邮件标题
                <input onChange={(event) => setMailSubject(event.target.value)} value={mailSubject} />
              </label>
              <label>
                邮件正文
                <input onChange={(event) => setMailBody(event.target.value)} value={mailBody} />
              </label>
              <label>
                补偿平台币
                <input onChange={(event) => setMailCoins(event.target.value)} value={mailCoins} />
              </label>
              <button type="submit">发送补偿</button>
            </form>

            <section className="operation-panel">
              <h2>封禁 / 解封</h2>
              <label>
                处理原因
                <input onChange={(event) => setStatusReason(event.target.value)} value={statusReason} />
              </label>
              <div className="button-row">
                <button type="button" onClick={() => void submitProfileStatus("banned")}>封禁玩家</button>
                <button className="secondary-button" type="button" onClick={() => void submitProfileStatus("active")}>解封玩家</button>
              </div>
            </section>
          </section>
        )}

        {activeSection === "cross" && (
          <section className="operation-grid" aria-label="跨服分组管理">
            <form className="operation-panel" onSubmit={(event) => void submitGroupAssignment(event)}>
              <h2>区服入池调整</h2>
              <label>
                区服 ID
                <input onChange={(event) => setAssignServerId(event.target.value)} value={assignServerId} />
              </label>
              <label>
                目标跨服池
                <select onChange={(event) => setAssignGroupId(event.target.value)} value={assignGroupId}>
                  {crossGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                调整原因
                <input onChange={(event) => setAssignReason(event.target.value)} value={assignReason} />
              </label>
              <button type="submit">提交调整</button>
            </form>

            <section className="table-section compact-table" aria-label="跨服分组列表">
              <div className="table-toolbar">
                <strong>跨服分组</strong>
                <span>{crossGroups.length} 个战区，当前对阵预览用于运营复核</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>分组</th>
                      <th>规则</th>
                      <th>战区</th>
                      <th>区服</th>
                      <th>主服</th>
                      <th>当前对阵预览</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crossGroups.map((group) => (
                      <tr key={group.id}>
                        <td>{group.name}</td>
                        <td>{group.ruleLabel}</td>
                        <td>{group.serverIds.length} 服战区</td>
                        <td>{group.serverIds.join("、")}</td>
                        <td>{group.serverIds[0] ?? "-"}</td>
                        <td>{group.serverIds.length >= 2 ? `${group.serverIds[0]?.toUpperCase()} VS ${group.serverIds[1]?.toUpperCase()}` : `${group.serverIds[0]?.toUpperCase() ?? "-"} VS 待定`}</td>
                        <td>{group.isActive ? "启用" : "停用"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeSection === "guilds" && (
          <section className="stacked-sections" aria-label="商会运营">
            <form className="filter-bar" aria-label="商会筛选" onSubmit={(event) => void submitGuildSearch(event)}>
              <label>
                商会关键词
                <input onChange={(event) => setGuildKeyword(event.target.value)} value={guildKeyword} />
              </label>
              <label>
                区服 ID
                <input onChange={(event) => setGuildServerId(event.target.value)} value={guildServerId} />
              </label>
              <label>
                跨服报名
                <select onChange={(event) => setGuildCrossRegistered(event.target.value)} value={guildCrossRegistered}>
                  <option value="">全部</option>
                  <option value="registered">已报名</option>
                  <option value="unregistered">未报名</option>
                </select>
              </label>
              <label>
                今日活跃
                <select onChange={(event) => setGuildActiveStatus(event.target.value)} value={guildActiveStatus}>
                  <option value="">全部</option>
                  <option value="active">有活跃</option>
                  <option value="inactive">无活跃</option>
                </select>
              </label>
              <button type="submit">查询商会</button>
            </form>

            <section className="operation-grid" aria-label="商会运营操作">
              <form className="operation-panel" onSubmit={(event) => void submitGuildLeaderboardSettlement(event)}>
                <h2>商会贡献榜结算</h2>
                <p className="panel-note">
                  当前商会：{selectedGuild === null ? "暂无商会" : `${selectedGuild.name}，贡献 ${formatNumber(selectedGuild.contributionScore)}`}
                </p>
                <label>
                  结算原因
                  <input onChange={(event) => setGuildSettleReason(event.target.value)} value={guildSettleReason} />
                </label>
                <button disabled={selectedGuild === null} type="submit">结算奖励</button>
              </form>

              <form className="operation-panel" onSubmit={(event) => void submitCrossGuildSettlement(event)}>
                <h2>跨服商会赛季结算</h2>
                <label>
                  区服 ID
                  <input onChange={(event) => setCrossGuildSettleServerId(event.target.value)} value={crossGuildSettleServerId} />
                </label>
                <label>
                  结算原因
                  <input onChange={(event) => setCrossGuildSettleReason(event.target.value)} value={crossGuildSettleReason} />
                </label>
                <button type="submit">结算奖励</button>
              </form>
            </section>

            <section className="table-section" aria-label="商会列表">
              <div className="table-toolbar">
                <strong>商会运营列表</strong>
                <span>共 {guilds.length} 个商会</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>商会</th>
                      <th>区服</th>
                      <th>等级 / 贡献</th>
                      <th>成员 / 活跃</th>
                      <th>互助 / 项目</th>
                      <th>跨服赛季</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guilds.map((guild) => (
                      <tr key={guild.id}>
                        <td>{guild.name}</td>
                        <td>{guild.serverId}</td>
                        <td>Lv.{guild.level} / {formatNumber(guild.contributionScore)}</td>
                        <td>{guild.memberCount} / {guild.todayActiveMemberCount}</td>
                        <td>{guild.helpRequestCount} / {guild.projectCount}</td>
                        <td>{guild.crossServerRegistered ? `已报名 ${guild.crossServerGroupName ?? ""}` : "未报名"}</td>
                        <td>
                          <button className="table-action" type="button" onClick={() => void loadGuildDetail(guild.id)}>
                            查看详情
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedGuildDetail !== null && (
              <section className="operation-grid" aria-label="商会详情">
                <section className="table-section compact-table">
                  <div className="table-toolbar">
                    <strong>{selectedGuildDetail.guild.name} 详情</strong>
                    <span>{selectedGuildDetail.crossServer.isRegistered ? `跨服已报名：${selectedGuildDetail.crossServer.groupName ?? ""}` : "跨服未报名"}</span>
                  </div>
                  <div className="config-grid">
                    <div>
                      <h3>公告</h3>
                      <p>{selectedGuildDetail.guild.announcement || "暂无公告"}</p>
                    </div>
                    <div>
                      <h3>协作规则</h3>
                      <p>{selectedGuildDetail.guild.collaborationRules || "暂无规则"}</p>
                    </div>
                    <div>
                      <h3>科技</h3>
                      {selectedGuildDetail.techs.map((tech) => (
                        <p key={tech.id}>{tech.name}：{tech.level}/{tech.maxLevel}</p>
                      ))}
                    </div>
                    <div>
                      <h3>协作项目</h3>
                      {selectedGuildDetail.projects.map((project) => (
                        <p key={project.id}>{project.name}：{project.progress}/{project.target}{project.claimedAt === null ? "" : " / 已领奖"}</p>
                      ))}
                    </div>
                    <div>
                      <h3>单服历史</h3>
                      {selectedGuildDetail.history.guildSettlements.length === 0 ? (
                        <p>暂无结算记录。</p>
                      ) : selectedGuildDetail.history.guildSettlements.slice(0, 3).map((settlement) => (
                        <p key={settlement.snapshotDate}>{settlement.snapshotDate}：发放 {settlement.deliveredRewards} 份 / 第一 {settlement.topMembers[0]?.companyName ?? "-"}</p>
                      ))}
                    </div>
                    <div>
                      <h3>跨服历史</h3>
                      {selectedGuildDetail.history.crossServerSettlements.length === 0 ? (
                        <p>暂无赛季回顾。</p>
                      ) : selectedGuildDetail.history.crossServerSettlements.slice(0, 3).map((settlement) => (
                        <p key={settlement.snapshotDate}>{settlement.snapshotDate}：名次 {settlement.finalRank ?? "-"} / 发放 {settlement.deliveredRewards} 份</p>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="table-section compact-table">
                  <div className="table-toolbar">
                    <strong>成员与互助</strong>
                    <span>{selectedGuildDetail.members.length} 名成员，最近 {selectedGuildDetail.helpRequests.length} 条互助</span>
                  </div>
                  <div className="config-grid">
                    <div>
                      <h3>成员</h3>
                      {selectedGuildDetail.members.map((member) => (
                        <p key={member.profileId}>{member.companyName} / {member.role} / 贡献 {formatNumber(member.contributionScore)}</p>
                      ))}
                    </div>
                    <div>
                      <h3>互助</h3>
                      {selectedGuildDetail.helpRequests.length === 0 ? (
                        <p>暂无互助请求。</p>
                      ) : selectedGuildDetail.helpRequests.map((request) => (
                        <p key={request.id}>{request.founderName}：{request.requestType} / {request.status}</p>
                      ))}
                    </div>
                  </div>
                </section>
              </section>
            )}
          </section>
        )}

        {activeSection === "activities" && (
          <section className="stacked-sections" aria-label="活动运营">
            <section className="operation-grid" aria-label="活动榜操作">
              <form className="operation-panel" onSubmit={(event) => void submitActivitySettlement(event)}>
                <h2>活动榜手动结算</h2>
                <p className="panel-note">
                  当前活动：{selectedActivity === null ? "暂无活动" : `${selectedActivity.name}，${selectedActivity.status}，参与 ${selectedActivity.participantCount} 人`}
                </p>
                <label>
                  活动
                  <select onChange={(event) => setSelectedActivityId(event.target.value)} value={selectedActivity?.id ?? ""}>
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name} / {activity.status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  结算原因
                  <input onChange={(event) => setActivitySettleReason(event.target.value)} value={activitySettleReason} />
                </label>
                <button disabled={selectedActivity === null} type="submit">结算奖励</button>
              </form>

              <section className="table-section compact-table" aria-label="活动榜前三">
                <div className="table-toolbar">
                  <strong>{selectedActivity?.name ?? "活动榜"} 前三</strong>
                  <span>{selectedActivity?.isSettled ? "已结算" : "未结算"}</span>
                </div>
                <div className="config-grid">
                  {(selectedActivity?.topRows ?? []).length === 0 ? (
                    <div>
                      <h3>榜单</h3>
                      <p>暂无活动积分。</p>
                    </div>
                  ) : selectedActivity?.topRows.map((row) => (
                    <div key={row.profileId}>
                      <h3>第 {row.rank} 名</h3>
                      <p>{row.companyName} / {row.founderName}</p>
                      <p>{row.valueLabel}</p>
                    </div>
                  ))}
                </div>
              </section>
            </section>

            <section className="table-section" aria-label="活动运营列表">
              <div className="table-toolbar">
                <strong>活动运营列表</strong>
                <span>共 {activities.length} 个活动</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>活动</th>
                      <th>周期</th>
                      <th>状态</th>
                      <th>参与 / 积分</th>
                      <th>榜单 Key</th>
                      <th>结算</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.length === 0 && (
                      <tr>
                        <td colSpan={6}>暂无活动配置</td>
                      </tr>
                    )}
                    {activities.map((activity) => (
                      <tr
                        className={activity.id === selectedActivity?.id ? "selected-row" : undefined}
                        key={activity.id}
                        onClick={() => setSelectedActivityId(activity.id)}
                      >
                        <td>{activity.name}</td>
                        <td>{activity.startDate} - {activity.endDate}</td>
                        <td>{activity.status}</td>
                        <td>{activity.participantCount} / {formatNumber(activity.totalScore)}</td>
                        <td>{activity.leaderboardKey}</td>
                        <td>{activity.isSettled ? "已结算" : "未结算"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeSection === "businessClock" && (
          <section className="stacked-sections" aria-label="经营时钟观测">
            <section className="table-section compact-table" aria-label="经营时钟观测清单">
              <div className="table-toolbar">
                <strong>经营时钟观测</strong>
                <span>只读观测，不自动修复、不触发玩家侧同步。</span>
              </div>
              <div className="config-grid">
                <div>
                  <h3>同步摘要</h3>
                  <p>玩家总数：{formatNumber(businessClockObservations.summary.totalPlayers)}</p>
                  <p>已同步：{formatNumber(businessClockObservations.summary.syncedPlayers)}</p>
                  <p>超时同步：{formatNumber(businessClockObservations.summary.staleSyncCount)}</p>
                </div>
                <div>
                  <h3>风险与待办</h3>
                  <p>风险脉冲：{formatNumber(businessClockObservations.summary.riskPulseCount)}</p>
                  <p>待办生成：{formatNumber(businessClockObservations.summary.managerTodoCount)}</p>
                  <p>异常提示：{formatNumber(businessClockObservations.summary.anomalyCount)}</p>
                </div>
                <div>
                  <h3>离线时长分布</h3>
                  {businessClockObservations.offlineMinuteBands.map((band) => (
                    <p key={band.band}>{band.band}：{formatNumber(band.count)}</p>
                  ))}
                </div>
                <div>
                  <h3>现金变化分布</h3>
                  {businessClockObservations.cashDeltaBands.map((band) => (
                    <p key={band.band}>{band.band}：{formatNumber(band.count)}</p>
                  ))}
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>公司</th>
                      <th>区服</th>
                      <th>最近同步</th>
                      <th>离线分钟</th>
                      <th>结算分钟</th>
                      <th>现金变化</th>
                      <th>风险状态</th>
                      <th>待办</th>
                      <th>异常</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businessClockObservations.rows.length === 0 && (
                      <tr>
                        <td colSpan={9}>暂无经营时钟观测数据。</td>
                      </tr>
                    )}
                    {businessClockObservations.rows.map((row) => (
                      <tr key={row.profileId}>
                        <td className="stacked-cell">
                          <strong>{row.companyName}</strong>
                          <span>{row.profileId}</span>
                        </td>
                        <td>{row.serverId}</td>
                        <td>{formatDateTime(row.lastSyncedAt)}</td>
                        <td>{formatNumber(row.offlineMinutes)}</td>
                        <td>{formatNumber(row.settledMinutes)}</td>
                        <td>{formatNumber(row.cashDelta)}</td>
                        <td>{row.riskStatus}</td>
                        <td>{formatNumber(row.managerTodoCount)}</td>
                        <td>
                          <span className={`status-tag ${row.anomaly === null ? "status-info" : "status-warning"}`}>
                            {row.anomaly ?? "正常"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeSection === "economy" && (
          <section className="stacked-sections" aria-label="经济巡检">
            <section className="table-section compact-table">
              <div className="table-toolbar">
                <strong>经济巡检</strong>
                <span>只读巡检</span>
              </div>
              <div className="dense-kpi-strip" aria-label="风险摘要">
                <strong>风险摘要</strong>
                <span>严重 {formatNumber(economyAlerts.summary.critical)}</span>
                <span>警告 {formatNumber(economyAlerts.summary.warning)}</span>
                <span>提示 {formatNumber(economyAlerts.summary.info)}</span>
                <span>待处理 {formatNumber(economyAlerts.summary.total)}</span>
                <span>待结算 {formatNumber(economyAlerts.summary.settlementRiskCount)}</span>
                <span>奖励边界 {formatNumber(monetizationBoundaries.summary.riskCount)}</span>
              </div>
              <div className="config-grid">
                <div>
                  <h3>巡检摘要</h3>
                  <p>总告警：{formatNumber(economyAlerts.summary.total)}</p>
                  <p>严重 {formatNumber(economyAlerts.summary.critical)} / 警告 {formatNumber(economyAlerts.summary.warning)} / 提示 {formatNumber(economyAlerts.summary.info)}</p>
                  <p>平台币异常增长：{formatNumber(economyAlerts.summary.platformCoinRiskCount)}</p>
                  <p>VIP 经验异常：{formatNumber(economyAlerts.summary.vipExperienceRiskCount)}</p>
                </div>
                <div>
                  <h3>经营与结算</h3>
                  <p>离线现金异常：{formatNumber(economyAlerts.summary.offlineCashRiskCount)}</p>
                  <p>重复结算风险：{formatNumber(economyAlerts.summary.settlementRiskCount)}</p>
                  <p>经营时钟同步频率：{formatNumber(economyAlerts.summary.businessClockSyncRiskCount)}</p>
                </div>
                <div>
                  <h3>处理边界</h3>
                  <p>经济巡检只读展示风险，不自动修复、不发放奖励、不扣减资产。</p>
                  <p>具体处理仍进入玩家查询、平台币 / VIP、经营时钟或审计日志核查。</p>
                </div>
              </div>
              <div className="config-grid">
                {economyAlerts.checkpoints.map((checkpoint) => (
                  <div key={checkpoint.key}>
                    <h3>{checkpoint.label}</h3>
                    <p>{checkpoint.status === "normal" ? "正常" : alertLevelLabel(checkpoint.status)}：{formatNumber(checkpoint.value)}</p>
                  </div>
                ))}
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>等级</th>
                      <th>类型</th>
                      <th>目标</th>
                      <th>提示</th>
                      <th>建议</th>
                    </tr>
                  </thead>
                  <tbody>
                    {economyAlerts.alerts.length === 0 && (
                      <tr>
                        <td colSpan={5}>暂无经济巡检告警。</td>
                      </tr>
                    )}
                    {economyAlerts.alerts.map((alert) => (
                      <tr key={alert.id}>
                        <td><span className={`status-tag status-${alert.level}`}>{alertLevelLabel(alert.level)}</span></td>
                        <td>{alert.type}</td>
                        <td>{alert.targetType} / {alert.targetId}</td>
                        <td>{alert.message}</td>
                        <td>{alert.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeSection === "configs" && (
          <section className="stacked-sections" aria-label="配置与排行榜">
            <section className="table-section compact-table" aria-label="跨服规则配置">
              <div className="table-toolbar">
                <strong>跨服规则配置</strong>
                <div>
                  <span>规则配置</span>
                  <span>每日22:00 / 每周六20:00</span>
                </div>
              </div>
              <div className="dense-kpi-strip" aria-label="跨服结算摘要">
                <strong>个人跨服</strong>
                <span>挑战 {crossServerRuleConfig?.personalAttemptLimit ?? 10} 次</span>
                <span>恢复 {crossServerRuleConfig?.personalRecoverIntervalMinutes ?? 60} 分钟</span>
                <span>重置 {crossServerRuleConfig?.personalResetTime ?? "05:00"}</span>
                <span>每日结算 {crossServerRuleConfig?.personalSettlementTime ?? "22:00"}</span>
                <span>商会开放 每周六20:00</span>
              </div>
              <div className="config-grid">
                <div>
                  <h3>奖励档位</h3>
                  {(crossServerRuleConfig?.rewardTiers ?? []).map((tier) => (
                    <p key={`${tier.rankStart}:${tier.rankEnd ?? "plus"}`}>
                      {tier.rankEnd === null ? `${tier.rankStart}+` : tier.rankStart === tier.rankEnd ? `第${tier.rankStart}名` : `${tier.rankStart}-${tier.rankEnd}`}：
                      平台币 {tier.rewardPlatformCoins} / 声望 {tier.rewardReputation}
                    </p>
                  ))}
                </div>
                <div>
                  <h3>自动结算记录</h3>
                  {crossServerSettlementRuns.rows.length === 0 && <p>暂无自动结算记录。</p>}
                  {crossServerSettlementRuns.rows.slice(0, 6).map((run) => (
                    <p key={run.id}>{run.settlementType === "guild" ? "商会跨服" : "个人跨服"}：{run.status} / 发奖 {run.deliveredRewards} / {run.createdAt.slice(0, 10)}</p>
                  ))}
                </div>
                <div>
                  <h3>异常补结算</h3>
                  <p>主流程按时间执行，异常补结算保留后台确认和审计。</p>
                  <button className="secondary-button" type="button" onClick={() => void runSelectedSettlementCandidates()}>异常补结算</button>
                </div>
              </div>
            </section>
            <section className="table-section compact-table" aria-label="待结算队列">
              <div className="table-toolbar">
                <strong>待结算队列</strong>
                <div>
                  <span>按时间自动结算，异常时人工补结算</span>
                  <span>待结算 {settlementCandidates.summary.pending} / 已结算 {settlementCandidates.summary.settled}</span>
                </div>
              </div>
              <div className="dense-kpi-strip" aria-label="结算队列摘要">
                <strong>队列摘要</strong>
                <span>排行榜 {settlementCandidates.summary.leaderboard}</span>
                <span>跨服经营战榜 {settlementCandidates.rows.filter((candidate) => candidate.kind === "crossLeaderboard").length}</span>
                <span>活动榜 {settlementCandidates.summary.activity}</span>
                <span>商会榜 {settlementCandidates.summary.guild}</span>
                <span>跨服商会 {settlementCandidates.summary.crossGuild}</span>
                <span>已选择 {selectedSettlementCandidates.length}</span>
              </div>
              <div className="button-row settlement-toolbar">
                <button type="button" onClick={selectAllPendingSettlementCandidates}>全选待结算</button>
                <button className="secondary-button" type="button" onClick={clearSelectedSettlementCandidates}>清空选择</button>
                <button disabled={selectedSettlementCandidates.length === 0} type="button" onClick={() => void runSelectedSettlementCandidates()}>批量结算</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>选择</th>
                      <th>类型</th>
                      <th>对象</th>
                      <th>区服</th>
                      <th>状态</th>
                      <th>风险</th>
                      <th>审计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSettlementCandidates.length === 0 && (
                      <tr>
                        <td colSpan={7}>暂无待结算对象。</td>
                      </tr>
                    )}
                    {pendingSettlementCandidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <td>
                          <input
                            checked={selectedSettlementCandidateIds.includes(candidate.id)}
                            onChange={() => toggleSettlementCandidate(candidate.id)}
                            type="checkbox"
                          />
                        </td>
                        <td>{settlementKindLabel(candidate.kind)}</td>
                        <td className="stacked-cell"><strong>{candidate.name}</strong><span>{candidate.targetId}</span></td>
                        <td>{candidate.serverId}</td>
                        <td>{candidate.isSettled ? "已结算" : "待结算"}</td>
                        <td>{candidate.riskLabel}</td>
                        <td>{candidate.lastAuditLogId ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {batchSettlementResults.length > 0 && (
                <div className="settlement-result-list" aria-label="批量结算结果">
                  <strong>批量结算结果</strong>
                  {batchSettlementResults.map((result) => (
                    <p key={result.id}>
                      <span>{settlementResultLabel(result.status)}</span>
                      <b>{result.name}</b>
                      <em>{result.message}</em>
                    </p>
                  ))}
                </div>
              )}
            </section>

            <form className="operation-panel narrow-panel" onSubmit={(event) => void submitLeaderboardSettlement(event)}>
              <h2>排行榜手动结算</h2>
              <label>
                区服 ID
                <input onChange={(event) => setSettleServerId(event.target.value)} value={settleServerId} />
              </label>
              <label>
                结算原因
                <input onChange={(event) => setSettleReason(event.target.value)} value={settleReason} />
              </label>
              <button type="submit">结算奖励</button>
            </form>

            <section className="table-section compact-table" aria-label="运营配置巡检告警">
              <div className="table-toolbar">
                <strong>运营配置巡检告警</strong>
                <div>
                  <span>严重 {operationConfigAlerts.summary.critical}，警告 {operationConfigAlerts.summary.warning}，提示 {operationConfigAlerts.summary.info}</span>
                  <button type="button" onClick={() => void refreshOperationConfigAlerts()}>刷新巡检</button>
                </div>
              </div>
              <div className="dense-kpi-strip" aria-label="风险摘要">
                <strong>风险摘要</strong>
                <span>严重 {operationConfigAlerts.summary.critical}</span>
                <span>警告 {operationConfigAlerts.summary.warning}</span>
                <span>提示 {operationConfigAlerts.summary.info}</span>
                <span>待处理 {operationConfigAlerts.summary.pending}</span>
                <span>待结算 {operationConfigAlerts.summary.unsettledActivityCount}</span>
                <span>奖励边界 {operationConfigAlerts.summary.rewardBoundaryRiskCount}</span>
              </div>
              <form className="filter-bar alert-filter" onSubmit={(event) => event.preventDefault()}>
                <label>
                  告警等级
                  <select onChange={(event) => setAlertLevel(event.target.value)} value={alertLevel}>
                    <option value="">全部等级</option>
                    {operationConfigAlerts.filters.levels.map((level) => (
                      <option key={level} value={level}>{alertLevelLabel(level)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  处理状态
                  <select onChange={(event) => setAlertStatus(event.target.value)} value={alertStatus}>
                    <option value="">全部状态</option>
                    {operationConfigAlerts.filters.statuses.map((status) => (
                      <option key={status} value={status}>{alertStatusLabel(status)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  处理备注
                  <input maxLength={180} onChange={(event) => setAlertHandleNote(event.target.value)} value={alertHandleNote} />
                </label>
                <label>
                  告警类型
                  <select onChange={(event) => setAlertType(event.target.value)} value={alertType}>
                    <option value="">全部类型</option>
                    {operationConfigAlerts.filters.types.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <button type="button" className="secondary-button" onClick={() => { setAlertLevel(""); setAlertType(""); setAlertStatus(""); }}>重置筛选</button>
              </form>
              <div className="config-grid">
                <div>
                  <h3>巡检摘要</h3>
                  <p>总告警：{operationConfigAlerts.summary.total}</p>
                  <p>待处理：{operationConfigAlerts.summary.pending} / 已知悉：{operationConfigAlerts.summary.acknowledged} / 已忽略：{operationConfigAlerts.summary.ignored}</p>
                  <p>已结束未结算活动：{operationConfigAlerts.summary.unsettledActivityCount}</p>
                  <p>奖励边界风险：{operationConfigAlerts.summary.rewardBoundaryRiskCount}</p>
                </div>
                <div>
                  <h3>处理边界</h3>
                  <p>处理动作只记录运营状态和审计日志，不编辑配置、不自动修复、不发放奖励。</p>
                  <p>实际配置处理仍进入对应运营页按既有幂等接口操作。</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>等级</th>
                      <th>类型</th>
                      <th>对象</th>
                      <th>状态</th>
                      <th>说明</th>
                      <th>建议</th>
                      <th>处理记录</th>
                      <th>巡检日期</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOperationConfigAlerts.length === 0 && (
                      <tr>
                        <td colSpan={9}>当前筛选下暂无告警。</td>
                      </tr>
                    )}
                    {filteredOperationConfigAlerts.map((alert) => (
                      <tr key={alert.id}>
                        <td><span className={`status-tag status-${alert.level}`}>{alertLevelLabel(alert.level)}</span></td>
                        <td>{alert.type}</td>
                        <td>{alert.targetType} / {alert.targetId}</td>
                        <td><span className={`status-tag status-${alert.status}`}>{alertStatusLabel(alert.status)}</span></td>
                        <td>{alert.message}</td>
                        <td>{alert.suggestion}</td>
                        <td>{alert.handledBy === null ? "-" : `${alert.handledBy} / ${alert.note ?? "-"} / ${alert.handledAt?.slice(0, 10) ?? "-"}`}</td>
                        <td>{alert.createdAt.slice(0, 10)}</td>
                        <td>
                          <div className="alert-actions">
                            {alert.status === "pending" ? (
                              <>
                                <button type="button" onClick={() => void handleOperationConfigAlert(alert, "ack")}>知悉</button>
                                <button type="button" className="secondary-button" onClick={() => void handleOperationConfigAlert(alert, "ignore")}>忽略</button>
                              </>
                            ) : (
                              <button type="button" className="secondary-button" onClick={() => void handleOperationConfigAlert(alert, "reopen")}>重新打开</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="table-section compact-table" aria-label="聊天关键词库">
              <form className="filter-bar" onSubmit={(event) => void submitChatKeywordSearch(event)}>
                <label>关键词<input onChange={(event) => setChatKeywordSearch(event.target.value)} value={chatKeywordSearch} /></label>
                <label>
                  来源
                  <select onChange={(event) => setChatKeywordSourceType(event.target.value)} value={chatKeywordSourceType}>
                    <option value="">全部来源</option>
                    <option value="public">公开词库</option>
                    <option value="custom">自定义词库</option>
                    <option value="whitelist">白名单</option>
                  </select>
                </label>
                <label>
                  处置
                  <select onChange={(event) => setChatKeywordAction(event.target.value)} value={chatKeywordAction}>
                    <option value="">全部处置</option>
                    <option value="mask">替换</option>
                    <option value="block">阻断</option>
                    <option value="allow">放行</option>
                  </select>
                </label>
                <label>
                  状态
                  <select onChange={(event) => setChatKeywordStatus(event.target.value)} value={chatKeywordStatus}>
                    <option value="">全部状态</option>
                    <option value="enabled">启用</option>
                    <option value="disabled">停用</option>
                  </select>
                </label>
                <button type="submit">筛选</button>
              </form>
              <div className="table-toolbar">
                <strong>聊天关键词库</strong>
                <span>{chatKeywordList.total} 条，配置清单摘要 {configCenter.chatKeywords.length} 条</span>
              </div>
              <label className="panel-note">审计原因<input onChange={(event) => setChatKeywordReason(event.target.value)} value={chatKeywordReason} /></label>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>关键词</th>
                      <th>来源</th>
                      <th>许可证 / Hash</th>
                      <th>处置</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chatKeywordList.rows.map((keyword) => (
                      <tr key={keyword.id}>
                        <td className="stacked-cell"><strong>{keyword.keyword}</strong><span>{keyword.importBatch}</span></td>
                        <td>{keyword.sourceType === "public" ? "公开词库" : keyword.sourceType === "custom" ? "自定义词库" : "白名单"}</td>
                        <td className="stacked-cell"><span>{keyword.license}</span><span>{keyword.sourceHash.slice(0, 16)}</span></td>
                        <td>{keyword.action === "mask" ? "替换" : keyword.action === "block" ? "阻断" : "放行"}</td>
                        <td>{keyword.isEnabled ? "启用" : "停用"}</td>
                        <td className="action-cell">
                          <button type="button" onClick={() => void updateChatKeyword(keyword, "mask", true)}>改为替换</button>
                          <button type="button" onClick={() => void updateChatKeyword(keyword, "block", true)}>改为阻断</button>
                          <button type="button" onClick={() => void updateChatKeyword(keyword, keyword.action, !keyword.isEnabled)}>{keyword.isEnabled ? "停用" : "启用"}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="panel-note">保存并记录审计；白名单优先级最高，避免误伤正常游戏经营、商会、跨服和商业词。</p>
            </section>

            <section className="table-section compact-table" aria-label="付费价值边界">
              <div className="table-toolbar">
                <strong>付费价值边界</strong>
                <span>
                  来源 {monetizationBoundaries.summary.platformCoinSourceCount}，消耗 {monetizationBoundaries.summary.platformCoinSpendCount}，VIP 来源 {monetizationBoundaries.summary.vipExperienceSourceCount}，风险 {monetizationBoundaries.summary.riskCount}
                </span>
              </div>
              <div className="config-grid">
                <div>
                  <h3>平台币与 VIP</h3>
                  {monetizationBoundaries.walletPolicies.map((policy) => (
                    <p key={policy.id}>{policy.id}：{policy.flow === "source" ? "来源" : "消耗"} / {policy.vipExperiencePolicy} / {policy.boundaryLabel}</p>
                  ))}
                </div>
                <div>
                  <h3>通行证边界</h3>
                  <p>{monetizationBoundaries.seasonPassBoundary.seasonId || "-"}：{formatNumber(monetizationBoundaries.seasonPassBoundary.pricePlatformCoins)} 平台币</p>
                  <p>{monetizationBoundaries.seasonPassBoundary.vipExperiencePolicy || "暂无通行证边界"}</p>
                  <p>{monetizationBoundaries.seasonPassBoundary.leaderboardRewardPolicy || "不改变排行榜结算奖励。"}</p>
                </div>
                <div>
                  <h3>活动商店边界</h3>
                  <p>商品 {monetizationBoundaries.activityShopBoundary.itemCount} 个 / 平台币奖励 {monetizationBoundaries.activityShopBoundary.platformCoinRewardItemCount} 项</p>
                  <p>{monetizationBoundaries.activityShopBoundary.rewardPolicy || "活动商店不产出平台币。"}</p>
                </div>
                <div>
                  <h3>风险项</h3>
                  {monetizationBoundaries.riskItems.length === 0 && <p>暂无付费价值边界风险。</p>}
                  {monetizationBoundaries.riskItems.map((risk) => (
                    <p key={risk.id}>{risk.level}：{risk.message} {risk.suggestion}</p>
                  ))}
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>商品</th>
                      <th>类别</th>
                      <th>价格</th>
                      <th>奖励类型</th>
                      <th>VIP 边界</th>
                      <th>排行榜边界</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monetizationBoundaries.paidProductBoundaries.slice(0, 8).map((product) => (
                      <tr key={product.id}>
                        <td className="stacked-cell">
                          <strong>{product.name}</strong>
                          <span>{product.id}</span>
                        </td>
                        <td>{product.category}</td>
                        <td>{formatNumber(product.pricePlatformCoins)} 平台币</td>
                        <td>{product.rewardType}</td>
                        <td>{product.vipExperiencePolicy}</td>
                        <td>{product.leaderboardRewardPolicy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="table-section" aria-label="VIP 配置列表">
              <div className="table-toolbar">
                <strong>VIP 配置清单</strong>
                <span>配置错误会在提交接口被拦截</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>等级</th>
                      <th>所需经验</th>
                      <th>每日礼包</th>
                      <th>行动力上限</th>
                      <th>商店折扣</th>
                      <th>称号</th>
                      <th>说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vipConfigs.map((config) => (
                      <tr key={config.level}>
                        <td>{config.name}</td>
                        <td>{formatNumber(config.requiredExperience)}</td>
                        <td>{config.dailyGiftPlatformCoins} 平台币 / {config.dailyGiftActionPower} 行动力</td>
                        <td>+{config.actionPowerLimitBonus}</td>
                        <td>{config.shopDiscountBasisPoints / 100}%</td>
                        <td>{config.title}</td>
                        <td>{config.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="table-section compact-table" aria-label="称号成就知识商品配置">
              <div className="table-toolbar">
                <strong>称号 / 成就 / 知识 / 商品</strong>
                <span>{configCenter.titles.length} 个称号，{configCenter.knowledgeEntries.length} 条知识</span>
              </div>
              <div className="config-grid">
                <div>
                  <h3>称号配置</h3>
                  {configCenter.titles.slice(0, 6).map((title) => (
                    <p key={title.id}>{title.name}：{title.bonusLabel}</p>
                  ))}
                </div>
                <div>
                  <h3>成就配置</h3>
                  {configCenter.achievements.slice(0, 6).map((achievement) => (
                    <p key={achievement.id}>{achievement.name}：{achievement.conditionKind} ≥ {achievement.conditionValue}</p>
                  ))}
                </div>
                <div>
                  <h3>知识审核字段</h3>
                  {configCenter.knowledgeEntries.slice(0, 6).map((knowledge) => (
                    <p key={knowledge.id}>{knowledge.title}：{knowledge.collectedAt} / {knowledge.contentVersion} / {knowledge.auditStatus}</p>
                  ))}
                </div>
                <div>
                  <h3>商品配置</h3>
                  {configCenter.shopProducts.slice(0, 6).map((product) => (
                    <p key={product.id}>{product.name}：{formatNumber(product.pricePlatformCoins)} 平台币 / {product.isActive ? "启用" : "停用"}</p>
                  ))}
                </div>
              </div>
            </section>

            <section className="table-section compact-table" aria-label="活动草案校验">
              <div className="table-toolbar">
                <strong>活动草案审批</strong>
                <span>共 {activityDrafts.summary.total} 个草案，待审核 {activityDrafts.summary.pending_review} 个，已发布 {activityDrafts.summary.published} 个</span>
              </div>
              <form className="filter-bar activity-draft-filter" onSubmit={(event) => void submitActivityDraftValidation(event)}>
                <label>
                  活动 ID
                  <input onChange={(event) => updateActivityDraftForm("id", event.target.value)} value={activityDraftForm.id} />
                </label>
                <label>
                  活动名称
                  <input onChange={(event) => updateActivityDraftForm("name", event.target.value)} value={activityDraftForm.name} />
                </label>
                <label>
                  开始日期
                  <input onChange={(event) => updateActivityDraftForm("startDate", event.target.value)} type="date" value={activityDraftForm.startDate} />
                </label>
                <label>
                  结束日期
                  <input onChange={(event) => updateActivityDraftForm("endDate", event.target.value)} type="date" value={activityDraftForm.endDate} />
                </label>
                <label>
                  活动榜 key
                  <input onChange={(event) => updateActivityDraftForm("leaderboardKey", event.target.value)} value={activityDraftForm.leaderboardKey} />
                </label>
                <label>
                  目标分
                  <input onChange={(event) => updateActivityDraftForm("targetScore", event.target.value)} type="number" value={activityDraftForm.targetScore} />
                </label>
                <label>
                  声望奖励
                  <input onChange={(event) => updateActivityDraftForm("rewardReputation", event.target.value)} type="number" value={activityDraftForm.rewardReputation} />
                </label>
                <label>
                  活动积分
                  <input onChange={(event) => updateActivityDraftForm("rewardPoints", event.target.value)} type="number" value={activityDraftForm.rewardPoints} />
                </label>
                <label>
                  称号 ID
                  <input onChange={(event) => updateActivityDraftForm("rewardTitleId", event.target.value)} value={activityDraftForm.rewardTitleId} />
                </label>
                <label>
                  现金奖励
                  <input onChange={(event) => updateActivityDraftForm("rewardCash", event.target.value)} type="number" value={activityDraftForm.rewardCash} />
                </label>
                <label>
                  平台币奖励
                  <input onChange={(event) => updateActivityDraftForm("rewardPlatformCoins", event.target.value)} type="number" value={activityDraftForm.rewardPlatformCoins} />
                </label>
                <div className="button-row">
                  <button type="submit">校验草案</button>
                  <button onClick={() => void saveActivityDraft()} type="button">保存草案</button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setActivityDraftForm(defaultActivityDraftForm());
                      setActivityDraftValidation(null);
                    }}
                    type="button"
                  >
                    重置
                  </button>
                </div>
              </form>
              {activityDraftValidation !== null && (
                <div className="config-grid">
                  <div>
                    <h3>校验摘要</h3>
                    <p>状态：{activityDraftValidation.summary.isValid ? "通过" : "需修正"}</p>
                    <p>阻断错误：{activityDraftValidation.summary.errorCount}</p>
                    <p>提示告警：{activityDraftValidation.summary.warningCount}</p>
                    <p>奖励风险：{activityDraftValidation.summary.riskCount}</p>
                  </div>
                  <div>
                    <h3>上线预览</h3>
                    <p>{activityDraftValidation.preview.name}：{activityDraftValidation.preview.status}</p>
                    <p>{activityDraftValidation.preview.startDate} - {activityDraftValidation.preview.endDate}</p>
                    <p>{activityDraftValidation.preview.leaderboardKey} / 目标 {formatNumber(activityDraftValidation.preview.targetScore)}</p>
                    <p>同期活动峰值：{activityDraftValidation.preview.concurrentActiveCount}</p>
                    <p>{activityDraftValidation.preview.rewardLabel}</p>
                  </div>
                  <div>
                    <h3>阻断错误</h3>
                    {activityDraftValidation.errors.length === 0 && <p>无阻断错误</p>}
                    {activityDraftValidation.errors.map((item) => (
                      <p key={`${item.type}:${item.field}`}>{item.field}：{item.message}</p>
                    ))}
                  </div>
                  <div>
                    <h3>告警与边界</h3>
                    {activityDraftValidation.warnings.length === 0 && activityDraftValidation.riskLabels.length === 0 && <p>暂无告警和奖励边界风险</p>}
                    {activityDraftValidation.warnings.map((item) => (
                      <p key={`${item.type}:${item.field ?? "global"}`}>{item.message} {item.suggestion}</p>
                    ))}
                    {activityDraftValidation.riskLabels.map((label) => (
                      <p key={label}>风险标签：{label}</p>
                    ))}
                  </div>
                </div>
              )}
              <div className="filter-bar activity-draft-review-filter">
                <label>
                  审批说明
                  <input onChange={(event) => setActivityDraftReviewReason(event.target.value)} value={activityDraftReviewReason} />
                </label>
                <label>
                  发布确认
                  <input onChange={(event) => setActivityDraftPublishReason(event.target.value)} value={activityDraftPublishReason} />
                </label>
                <button className="secondary-button" onClick={() => void refreshActivityDrafts()} type="button">刷新草案</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>活动</th>
                      <th>状态</th>
                      <th>档期</th>
                      <th>奖励</th>
                      <th>校验</th>
                      <th>更新时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityDrafts.rows.length === 0 && (
                      <tr>
                        <td colSpan={7}>暂无活动配置草案</td>
                      </tr>
                    )}
                    {activityDrafts.rows.map((draft) => (
                      <tr key={draft.id}>
                        <td className="stacked-cell">
                          <strong>{draft.name}</strong>
                          <span>{draft.activityId}</span>
                        </td>
                        <td>{activityDraftStatusLabel(draft.status)}</td>
                        <td>{draft.startDate} - {draft.endDate}</td>
                        <td>{draft.validation.preview.rewardLabel}</td>
                        <td>
                          {draft.validation.summary.isValid ? "通过" : `需修正 ${draft.validation.summary.errorCount} 项`}
                          {draft.validation.summary.riskCount > 0 ? ` / 风险 ${draft.validation.summary.riskCount}` : ""}
                        </td>
                        <td>{formatDateTime(draft.updatedAt)}</td>
                        <td>
                          <div className="button-row">
                            {draft.status === "draft" && (
                              <button onClick={() => void handleActivityDraftAction(draft, "submit")} type="button">提交审核</button>
                            )}
                            {draft.status === "pending_review" && (
                              <>
                                <button onClick={() => void handleActivityDraftAction(draft, "approve")} type="button">通过</button>
                                <button className="secondary-button" onClick={() => void handleActivityDraftAction(draft, "reject")} type="button">驳回</button>
                              </>
                            )}
                            {draft.status === "approved" && (
                              <button onClick={() => void publishActivityDraft(draft)} type="button">安全发布</button>
                            )}
                            {draft.status !== "draft" && draft.status !== "pending_review" && draft.status !== "approved" && <span>{draft.reviewNote ?? "已完成复核"}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="table-section compact-table" aria-label="活动发布观察">
              <div className="table-toolbar">
                <strong>活动发布观察</strong>
                <span>已发布 {activityPublishObservations.summary.published} 个，风险 {activityPublishObservations.summary.rewardRiskCount} 项，结束未结算 {activityPublishObservations.summary.unsettledEndedCount} 个</span>
                <button className="secondary-button" onClick={() => void refreshActivityPublishObservations()} type="button">刷新观察</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>活动</th>
                      <th>状态</th>
                      <th>榜单</th>
                      <th>参与</th>
                      <th>结算</th>
                      <th>发布审计</th>
                      <th>边界</th>
                      <th>建议</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityPublishObservations.rows.length === 0 && (
                      <tr>
                        <td colSpan={8}>暂无已发布草案观察记录。</td>
                      </tr>
                    )}
                    {activityPublishObservations.rows.map((row) => (
                      <tr key={row.draftId}>
                        <td className="stacked-cell">
                          <strong>{row.name}</strong>
                          <span>{row.activityId}</span>
                          <span>{row.startDate} - {row.endDate}</span>
                        </td>
                        <td>{row.status}</td>
                        <td>{row.leaderboardKey}</td>
                        <td>{row.participantCount} 人 / 总分 {formatNumber(row.totalScore)}</td>
                        <td>{row.isSettled ? `已结算 ${row.deliveredRewards}` : "未结算"}</td>
                        <td className="stacked-cell">
                          <span>{row.publishAuditLogId ?? "-"}</span>
                          <span>{formatDateTime(row.publishedAt)}</span>
                          <span>{row.publishReason ?? "-"}</span>
                        </td>
                        <td>{row.rewardBoundary === "safe" ? "安全" : `风险 ${row.riskLabels.join("、")}`}</td>
                        <td>{row.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="table-section compact-table" aria-label="活动轮换节奏">
              <div className="table-toolbar">
                <strong>活动轮换节奏</strong>
                <span>峰值 {activitySchedule.summary.maxConcurrentActive} 个同期开启，风险 {activitySchedule.summary.rewardBoundaryRiskCount} 项</span>
              </div>
              <div className="config-grid">
                <div>
                  <h3>节奏摘要</h3>
                  <p>活动总数：{activitySchedule.summary.totalActivities}</p>
                  <p>进行中：{activitySchedule.summary.activeCount} / 预告：{activitySchedule.summary.upcomingCount} / 已结束：{activitySchedule.summary.endedCount}</p>
                  <p>缺少榜单 key：{activitySchedule.summary.missingLeaderboardKeyCount}</p>
                </div>
                <div>
                  <h3>档期窗口</h3>
                  {activitySchedule.windows.filter((window) => window.activeCount > 0).length === 0 && <p>暂无活动档期</p>}
                  {activitySchedule.windows.filter((window) => window.activeCount > 0).slice(0, 8).map((window) => (
                    <p key={window.date}>
                      {window.date}：{window.activeCount} 个 / {window.status === "crowded" ? "拥挤" : "正常"} / {window.activeActivityNames.slice(0, 3).join("、")}
                    </p>
                  ))}
                </div>
                <div>
                  <h3>运营提示</h3>
                  {activitySchedule.alerts.length === 0 && <p>暂无节奏告警</p>}
                  {activitySchedule.alerts.slice(0, 6).map((alert) => (
                    <p key={alert.id}>{alert.level}：{alert.message} {alert.suggestion}</p>
                  ))}
                </div>
                <div>
                  <h3>奖励边界</h3>
                  {activitySchedule.activities.map((activity) => (
                    <p key={activity.id}>
                      {activity.name}：{activity.status} / {activity.startDate} - {activity.endDate} / {activity.rewardBoundary === "safe" ? "安全" : `风险 ${activity.riskLabels.join("、")}`} / {activity.rewardLabel}
                    </p>
                  ))}
                </div>
              </div>
            </section>

            <section className="table-section compact-table" aria-label="赛季活动剧本配置">
              <div className="table-toolbar">
                <strong>赛季 / 活动运营配置总览</strong>
                <span>{configCenter.seasons.length} 个赛季，{configCenter.activities.length} 个活动，{configCenter.leaderboardSettlements.length} 条结算</span>
              </div>
              <div className="config-grid">
                <div>
                  <h3>赛季配置</h3>
                  {configCenter.seasons.map((season) => (
                    <p key={season.id}>
                      {season.name}：{season.status} / {season.startDate} - {season.endDate} / 通行证 {formatNumber(season.passPricePlatformCoins)} / 任务 {season.taskCount} / 活动 {season.activityCount} / 已购 {season.passPurchaseCount}
                    </p>
                  ))}
                </div>
                <div>
                  <h3>活动榜状态</h3>
                  {configCenter.activities.map((activity) => (
                    <p key={activity.id}>
                      {activity.name}：{activity.status} / {activity.leaderboardKey} / 参与 {activity.participantCount} / 总分 {formatNumber(activity.totalScore)} / {activity.isSettled ? `已结算 ${activity.deliveredRewards}` : "未结算"} / {activity.rewardLabel}
                    </p>
                  ))}
                </div>
                <div>
                  <h3>活动商店</h3>
                  {configCenter.activityShopItems.map((item) => (
                    <p key={item.id}>
                      {item.name}：{formatNumber(item.costPoints)} 积分 / 限购 {item.purchaseLimit} / 已购 {item.purchaseCount} / {item.isActive ? "启用" : "停用"} / {item.rewardLabel}
                    </p>
                  ))}
                </div>
                <div>
                  <h3>通行证</h3>
                  {configCenter.seasonPass.map((pass) => (
                    <p key={pass.seasonId}>{pass.seasonId}：{formatNumber(pass.pricePlatformCoins)} 平台币 / 已购 {pass.purchaseCount} / {pass.rewardLabel}</p>
                  ))}
                </div>
                <div>
                  <h3>最近活动榜结算</h3>
                  {configCenter.leaderboardSettlements.length === 0 && <p>暂无结算记录</p>}
                  {configCenter.leaderboardSettlements.slice(0, 6).map((settlement) => (
                    <p key={`${settlement.boardKey}:${settlement.snapshotDate}`}>
                      {settlement.boardKey}：{settlement.snapshotDate} / 发放 {settlement.deliveredRewards} / 平台币 {formatNumber(settlement.rewardPlatformCoinsTotal)} / {settlement.rewardBoundary}
                    </p>
                  ))}
                </div>
                <div>
                  <h3>经营剧本</h3>
                  {configCenter.scenarios.map((scenario) => (
                    <p key={scenario.id}>{scenario.name}：奖励称号 {scenario.rewardTitleId ?? "-"}</p>
                  ))}
                </div>
              </div>
            </section>
          </section>
        )}

        {activeSection === "knowledge" && (
          <section className="operation-grid" aria-label="知识卡审核">
            <section className="table-section compact-table" aria-label="知识卡列表">
              <form className="filter-bar knowledge-filter" onSubmit={(event) => void submitKnowledgeSearch(event)}>
                <label>
                  标题 / ID / 摘要
                  <input onChange={(event) => setKnowledgeKeyword(event.target.value)} value={knowledgeKeyword} />
                </label>
                <label>
                  分类
                  <select onChange={(event) => setKnowledgeCategory(event.target.value)} value={knowledgeCategory}>
                    <option value="">全部分类</option>
                    {knowledgeList.categories.map((category) => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  审核状态
                  <select onChange={(event) => setKnowledgeReviewStatus(event.target.value)} value={knowledgeReviewStatus}>
                    <option value="">全部状态</option>
                    <option value="draft">草稿</option>
                    <option value="reviewing">复核中</option>
                    <option value="published">已发布</option>
                    <option value="archived">已归档</option>
                  </select>
                </label>
                <button type="submit">查询</button>
              </form>

              <div className="table-toolbar">
                <strong>知识卡配置</strong>
                <span>{knowledgeList.total} 条</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>标题</th>
                      <th>分类</th>
                      <th>状态</th>
                      <th>版本</th>
                      <th>来源</th>
                      <th>采集日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {knowledgeList.rows.map((knowledge) => (
                      <tr
                        className={knowledge.id === selectedKnowledge?.id ? "selected-row" : undefined}
                        key={knowledge.id}
                        onClick={() => selectKnowledge(knowledge)}
                      >
                        <td>{knowledge.title}</td>
                        <td>{knowledge.category}</td>
                        <td>{knowledge.reviewStatus}</td>
                        <td>{knowledge.contentVersion}</td>
                        <td>{knowledge.sourceName}</td>
                        <td>{knowledge.collectedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <form className="operation-panel knowledge-editor" onSubmit={(event) => void submitKnowledgeUpdate(event)}>
              <h2>{selectedKnowledge?.title ?? "选择知识卡"}</h2>
              <p className="panel-note">只调整知识内容、来源、版本和审核状态；解锁规则、任务奖励和事件奖励不在这里修改。</p>
              <label>
                摘要
                <textarea onChange={(event) => updateKnowledgeForm("summary", event.target.value)} value={knowledgeForm.summary} />
              </label>
              <label>
                经营场景
                <textarea onChange={(event) => updateKnowledgeForm("scenarioText", event.target.value)} value={knowledgeForm.scenarioText} />
              </label>
              <label>
                风险提示
                <textarea onChange={(event) => updateKnowledgeForm("riskText", event.target.value)} value={knowledgeForm.riskText} />
              </label>
              <label>
                游戏影响
                <textarea onChange={(event) => updateKnowledgeForm("gameImpactText", event.target.value)} value={knowledgeForm.gameImpactText} />
              </label>
              <label>
                行动建议
                <textarea onChange={(event) => updateKnowledgeForm("actionTipText", event.target.value)} value={knowledgeForm.actionTipText} />
              </label>
              <div className="knowledge-meta-grid">
                <label>
                  来源名称
                  <input onChange={(event) => updateKnowledgeForm("sourceName", event.target.value)} value={knowledgeForm.sourceName} />
                </label>
                <label>
                  采集日期
                  <input onChange={(event) => updateKnowledgeForm("collectedAt", event.target.value)} value={knowledgeForm.collectedAt} />
                </label>
                <label>
                  内容版本
                  <input onChange={(event) => updateKnowledgeForm("contentVersion", event.target.value)} value={knowledgeForm.contentVersion} />
                </label>
                <label>
                  审核状态
                  <select onChange={(event) => updateKnowledgeForm("reviewStatus", event.target.value)} value={knowledgeForm.reviewStatus}>
                    <option value="draft">草稿</option>
                    <option value="reviewing">复核中</option>
                    <option value="published">已发布</option>
                    <option value="archived">已归档</option>
                  </select>
                </label>
              </div>
              <label>
                来源链接
                <input onChange={(event) => updateKnowledgeForm("sourceUrl", event.target.value)} value={knowledgeForm.sourceUrl} />
              </label>
              <label>
                审核原因
                <input onChange={(event) => updateKnowledgeForm("reason", event.target.value)} value={knowledgeForm.reason} />
              </label>
              <button disabled={selectedKnowledge === null} type="submit">保存知识卡</button>
            </form>
          </section>
        )}

        {activeSection === "audit" && (
          <section className="stacked-sections" aria-label="操作审计日志">
            <section className="audit-chip-row" aria-label="审计快筛">
              <strong>审计快筛</strong>
              {auditQuickFilters.map((item) => (
                <button key={item.label} type="button" onClick={() => void applyAuditQuickFilter(item.action, item.targetType)}>
                  {item.label}
                </button>
              ))}
            </section>
            <form className="filter-bar audit-filter" onSubmit={(event) => void submitAuditSearch(event)}>
              <label>
                动作
                <select onChange={(event) => setAuditAction(event.target.value)} value={auditAction}>
                  <option value="">全部动作</option>
                  {auditFilterOptions.actions.map((action) => <option key={action} value={action}>{action}</option>)}
                </select>
              </label>
              <label>
                对象类型
                <select onChange={(event) => setAuditTargetType(event.target.value)} value={auditTargetType}>
                  <option value="">全部对象</option>
                  {auditFilterOptions.targetTypes.map((targetType) => <option key={targetType} value={targetType}>{targetType}</option>)}
                </select>
              </label>
              <label>
                对象 ID
                <input onChange={(event) => setAuditTargetId(event.target.value)} placeholder="精确对象 ID" value={auditTargetId} />
              </label>
              <label>
                管理员
                <select onChange={(event) => setAuditAdmin(event.target.value)} value={auditAdmin}>
                  <option value="">全部管理员</option>
                  {auditFilterOptions.admins.map((admin) => <option key={admin} value={admin}>{admin}</option>)}
                </select>
              </label>
              <label>
                起始日期
                <input onChange={(event) => setAuditFrom(event.target.value)} type="date" value={auditFrom} />
              </label>
              <label>
                结束日期
                <input onChange={(event) => setAuditTo(event.target.value)} type="date" value={auditTo} />
              </label>
              <button disabled={isLoading} type="submit">查询审计</button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setAuditAction("");
                  setAuditTargetType("");
                  setAuditTargetId("");
                  setAuditAdmin("");
                  setAuditFrom("");
                  setAuditTo("");
                  if (session !== null) {
                    void apiRequest<AuditLogList>("/admin/audit-logs", {}, session.token).then((response) => {
                      if (response.success) {
                        applyAuditList(response.data);
                      }
                    });
                  }
                }}
              >
                重置
              </button>
            </form>

            <section className="operation-grid audit-grid" aria-label="审计列表与详情">
              <section className="table-section" aria-label="审计日志列表">
                <div className="table-toolbar">
                  <strong>操作审计日志</strong>
                  <span>命中 {auditTotal} 条，显示 {auditLogs.length} 条</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>管理员</th>
                        <th>动作</th>
                        <th>对象</th>
                        <th>摘要</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr
                          className={selectedAuditLog?.id === log.id ? "selected-row" : undefined}
                          key={log.id}
                          onClick={() => setSelectedAuditId(log.id)}
                        >
                          <td>{new Date(log.createdAt).toLocaleString("zh-CN")}</td>
                          <td>{log.adminUsername}</td>
                          <td>{log.action}</td>
                          <td>{log.targetType} / {log.targetId ?? "-"}</td>
                          <td>{log.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="operation-panel audit-detail" aria-label="审计详情">
                <h2>审计详情</h2>
                {selectedAuditLog === null ? (
                  <p className="panel-note">暂无审计记录。</p>
                ) : (
                  <>
                    <p className="panel-note">{selectedAuditLog.summary}</p>
                    <div className="audit-detail-grid">
                      <span>时间</span><strong>{new Date(selectedAuditLog.createdAt).toLocaleString("zh-CN")}</strong>
                      <span>管理员</span><strong>{selectedAuditLog.adminUsername}</strong>
                      <span>动作</span><strong>{selectedAuditLog.action}</strong>
                      <span>对象</span><strong>{selectedAuditLog.targetType} / {selectedAuditLog.targetId ?? "-"}</strong>
                    </div>
                    <div className="audit-json">
                      <strong>结构化明细</strong>
                      {selectedAuditLog.detailJson === null ? (
                        <p>{selectedAuditLog.detail ?? "-"}</p>
                      ) : (
                        Object.entries(selectedAuditLog.detailJson).map(([key, value]) => (
                          <p key={key}><span>{key}</span><b>{String(value)}</b></p>
                        ))
                      )}
                    </div>
                  </>
                )}
              </section>
            </section>
          </section>
        )}
      </section>
    </main>
  );
}
