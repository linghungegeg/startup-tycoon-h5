import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";

import { createApiServer } from "../src/http.js";
import type { ApiConfig } from "../src/config.js";
import { pickRecruitCandidate } from "../src/employee.js";
import { calculateFinanceReport } from "../src/finance.js";
import { calculateMarketShare, type CompetitorActionType } from "../src/market.js";
import { createPasswordRecord } from "../src/password.js";
import { calculateNextProductMetrics, type ProductStage } from "../src/product.js";
import { calculateProjectSuccessRate } from "../src/project.js";
import { readRandomTaskConfigWhere, selectFairRandomTaskConfigs, syncPlayerAchievementProgress } from "../src/repository.js";
import type {
  AccountRecord,
  AdminUserRecord,
  AvatarRecord,
  CompanyGrowthRecord,
  CompanyFinanceRecord,
  CompanyFinanceSettlementRecord,
  EmployeeRecord,
  EventChoiceRecord,
  EventRecord,
  FundingActionRecord,
  FundingCenterRecord,
  FundingRecord,
  GameRepository,
  AchievementClaimRecord,
  AchievementRecord,
  GuildActionRecord,
  GuildCenterRecord,
  GuildHistoryRecord,
  CrossServerCenterRecord,
  CrossServerGuildHistoryRecord,
  KnowledgeEntryRecord,
  LeaderboardCenterRecord,
  LeaderboardSettlementRecord,
  LoanActionRecord,
  LoanCenterRecord,
  LoanRecord,
  MarketActionRecord,
  MarketCenterRecord,
  PlayerMarketRecord,
  PlayerProfileRecord,
  PlatformCoinLedgerSource,
  PlatformWalletRecord,
  ProductActionRecord,
  ProductCenterRecord,
  ProductRecord,
  ProjectRecord,
  ProjectSettlementRecord,
  RandomTaskActionRecord,
  RandomTaskCenterRecord,
  ServerRecord,
  ShopCenterRecord,
  TaskRecord,
  TitleCenterRecord,
  VipCenterRecord
} from "../src/repository.js";

const config: ApiConfig = {
  host: "127.0.0.1",
  port: 0,
  dependencies: {
    mysql: "missing",
    redis: "missing"
  }
};

type ApiBody<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  traceId: string;
};

test("random task config query excludes season tasks without pass", () => {
  assert.deepEqual(readRandomTaskConfigWhere(false, ["used-config"]), {
    isActive: true,
    id: { notIn: ["used-config"] },
    category: { not: "season" }
  });
  assert.deepEqual(readRandomTaskConfigWhere(true, ["used-config"]), {
    isActive: true,
    id: { notIn: ["used-config"] }
  });
});

test("fair random task selection prioritizes unseen categories", () => {
  const configs = [
    { id: "finance-1", category: "finance" },
    { id: "finance-2", category: "finance" },
    { id: "market-1", category: "market" },
    { id: "loan-1", category: "loan" }
  ];

  assert.deepEqual(
    selectFairRandomTaskConfigs(configs, [], 3).map((config) => config.id),
    ["finance-1", "market-1", "loan-1"]
  );
  assert.deepEqual(
    selectFairRandomTaskConfigs(configs, ["finance", "market", "loan"], 2).map((config) => config.id),
    ["finance-1", "finance-2"]
  );
});

test("achievement sync recovers from concurrent unique creation", async () => {
  const completedAt = new Date("2026-05-01T00:00:00.000Z");
  let findCount = 0;
  let updateArgs: unknown;
  const delegate = {
    async findUnique() {
      findCount += 1;
      return findCount === 1 ? null : { progress: 1, completedAt: null };
    },
    async upsert() {
      throw { code: "P2002" };
    },
    async update(args: unknown) {
      updateArgs = args;
      return {};
    }
  };

  await syncPlayerAchievementProgress(delegate, "profile-1", "profile-created", 3, completedAt);

  assert.deepEqual(updateArgs, {
    where: {
      profileId_achievementId: {
        profileId: "profile-1",
        achievementId: "profile-created"
      }
    },
    data: {
      progress: 3,
      completedAt
    }
  });
});

const createTestRepository = (): GameRepository => {
  const companyMaxLevel = 80;
  const companyExperiencePerLevel = 100;
  const fullLevelChestRequiredExperience = 500;
  const readCompanyLevel = (experience: number): number =>
    Math.max(1, Math.min(companyMaxLevel, Math.floor(Math.max(0, experience) / companyExperiencePerLevel) + 1));
  const accounts = new Map<string, AccountRecord>();
  const accountSessions = new Map<string, string>();
  const adminPassword = createPasswordRecord("admin123");
  const admins = new Map<string, AdminUserRecord>([
    [
      "admin",
      {
        id: "admin-1",
        username: "admin",
        ...adminPassword
      }
    ]
  ]);
  const adminSessions = new Map<string, string>();
  const servers: ServerRecord[] = [
    { id: "s1", name: "长宁一服", status: "recommended", label: "推荐", isRecommended: true },
    { id: "s2", name: "滨江新区", status: "new", label: "新服", isRecommended: false }
  ];
  const crossServerGroups = [
    {
      id: "new-growth-pool",
      name: "开服成长池",
      ruleLabel: "按开服时间与活跃度分池，避免老服碾压新服。",
      serverIds: ["s1", "s2"]
    }
  ];
  const avatars: AvatarRecord[] = [
    { id: "strategist", name: "策略型创始人", glyph: "策", specialty: "融资谈判与方向判断" },
    { id: "builder", name: "产品型创始人", glyph: "造", specialty: "产品研发与团队协作" }
  ];
  const profiles = new Map<string, PlayerProfileRecord>();
  const employeeConfigs = [
    {
      id: "lin-zhiyuan",
      name: "林知远",
      role: "工程师",
      careerLevel: "合伙人",
      rarity: "传奇",
      baseSalary: 88000,
      basePressure: 34,
      loyalty: 92,
      growthPotential: 86,
      management: 86,
      negotiation: 74,
      execution: 92,
      specialty: "擅长架构优化，能降低技术债和服务器成本。",
      recruitWeight: 3
    },
    {
      id: "xu-manqing",
      name: "许曼青",
      role: "产品经理",
      careerLevel: "总监",
      rarity: "顶尖",
      baseSalary: 72000,
      basePressure: 42,
      loyalty: 82,
      growthPotential: 88,
      management: 78,
      negotiation: 72,
      execution: 90,
      specialty: "擅长 MVP 和用户留存，适合产品线推进。",
      recruitWeight: 8
    },
    {
      id: "shen-ruoning",
      name: "沈若宁",
      role: "财务",
      careerLevel: "中级",
      rarity: "优秀",
      baseSalary: 46000,
      basePressure: 28,
      loyalty: 86,
      growthPotential: 74,
      management: 76,
      negotiation: 68,
      execution: 82,
      specialty: "擅长现金流管控，降低经营波动。",
      recruitWeight: 24
    }
  ];
  const employees = new Map<string, EmployeeRecord>();
  const projectConfigs = [
    {
      id: "success-project",
      name: "客户 CRM 外包开发",
      category: "外包开发",
      cycleDays: 12,
      budget: 180000,
      risk: "低",
      successRateBase: 100,
      revenueReward: 320000,
      reputationReward: 1200,
      customerSatisfactionReward: 4,
      failurePenalty: 60000,
      summary: "为传统企业交付客户管理系统。"
    },
    {
      id: "failed-project",
      name: "高风险 AI 自动化方案",
      category: "AI 自动化",
      cycleDays: 22,
      budget: 360000,
      risk: "高",
      successRateBase: 0,
      revenueReward: 760000,
      reputationReward: 2600,
      customerSatisfactionReward: 6,
      failurePenalty: 180000,
      summary: "高风险项目，适合验证失败结算。"
    }
  ];
  const projects = new Map<string, ProjectRecord>();
  const createMainTaskConfig = (id: string, title: string, guideAction: string) => ({
    id,
    type: "main" as const,
    title,
    description: title,
    target: 1,
    initialProgress: 0,
    rewardLabel: "声望 100",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 100,
    rewardActionPower: 0,
    guideAction,
    unlockKind: "none" as const
  });
  const taskConfigs = [
    {
      id: "main-profile-created",
      type: "main" as const,
      title: "完成公司档案",
      description: "创建创始人和公司档案。",
      target: 1,
      initialProgress: 1,
      rewardLabel: "钻石 120、资金 10万",
      rewardCash: 100000,
      rewardPlatformCoins: 0,
      rewardReputation: 0,
      rewardActionPower: 0,
      guideAction: "领取奖励",
      unlockKind: "none" as const
    },
    {
      id: "main-first-project",
      type: "main" as const,
      title: "推进第一单项目",
      description: "进入项目中心推进一个经营项目。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "资金 20万、声望 500",
      rewardCash: 200000,
      rewardPlatformCoins: 0,
      rewardReputation: 500,
      rewardActionPower: 0,
      guideAction: "前往项目",
      unlockKind: "none" as const
    },
    {
      id: "daily-train-employee",
      type: "daily" as const,
      title: "培训员工",
      description: "完成一次员工培养。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "金币 8,000、培养手册 1",
      rewardCash: 0,
      rewardPlatformCoins: 8000,
      rewardReputation: 0,
      rewardActionPower: 0,
      guideAction: "前往员工",
      unlockKind: "none" as const
    },
    {
      id: "daily-project-push",
      type: "daily" as const,
      title: "推进项目",
      description: "推进一次项目进度。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "资金 8万、行动力 20",
      rewardCash: 80000,
      rewardPlatformCoins: 0,
      rewardReputation: 0,
      rewardActionPower: 20,
      guideAction: "前往项目",
      unlockKind: "none" as const
    },
    {
      id: "daily-handle-event",
      type: "daily" as const,
      title: "处理经营事件",
      description: "完成一次经营事件决策。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "资金 5万、声望 200",
      rewardCash: 50000,
      rewardPlatformCoins: 0,
      rewardReputation: 200,
      rewardActionPower: 0,
      guideAction: "处理事件",
      unlockKind: "none" as const
    },
    {
      id: "daily-guild-contribution",
      type: "daily" as const,
      title: "商会协作",
      description: "发布或完成一次商会协作。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "声望 220、限定称号碎片 1",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 220,
      rewardActionPower: 0,
      guideAction: "前往商会",
      unlockKind: "none" as const
    },
    {
      id: "side-knowledge-labor-contract",
      type: "side" as const,
      title: "阅读用工合规知识",
      description: "查看劳动合同风险知识卡。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "声望 300、知识点 1",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 300,
      rewardActionPower: 0,
      guideAction: "查看知识",
      unlockKind: "knowledge" as const,
      knowledgeId: "labor-written-contract"
    },
    {
      id: "side-compliance-contract-review",
      type: "side" as const,
      title: "完成合同复核",
      description: "推进一次合同复核支线。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "资金 6万、合规评分 2",
      rewardCash: 60000,
      rewardPlatformCoins: 0,
      rewardReputation: 0,
      rewardActionPower: 0,
      guideAction: "处理支线",
      unlockKind: "compliance" as const,
      knowledgeId: "contract-acceptance-payment"
    },
    {
      id: "side-founder-pressure",
      type: "side" as const,
      title: "创始人压力管理",
      description: "通过员工长期激励缓解团队压力。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "员工好感礼物 1、行动力 25",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 420,
      rewardActionPower: 25,
      guideAction: "前往员工",
      unlockKind: "none" as const
    },
    {
      id: "main-recruit-channel",
      type: "main" as const,
      title: "评估招聘渠道",
      description: "完成一次员工招募。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "猎头券 1",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 180,
      rewardActionPower: 0,
      guideAction: "前往员工",
      unlockKind: "none" as const
    },
    {
      id: "main-train-core",
      type: "main" as const,
      title: "培养核心成员",
      description: "完成一次员工培养。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "培养手册 1、声望 150",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 150,
      rewardActionPower: 0,
      guideAction: "前往员工",
      unlockKind: "none" as const
    },
    {
      id: "main-equity-plan",
      type: "main" as const,
      title: "讨论股权激励",
      description: "完成一次员工股权激励。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "声望 220",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 220,
      rewardActionPower: 0,
      guideAction: "前往员工",
      unlockKind: "none" as const
    },
    {
      id: "main-client-brief",
      type: "main" as const,
      title: "阅读客户需求",
      description: "启动一个项目。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "资金 7万",
      rewardCash: 70000,
      rewardPlatformCoins: 0,
      rewardReputation: 90,
      rewardActionPower: 0,
      guideAction: "前往项目",
      unlockKind: "none" as const
    },
    {
      id: "main-delivery-plan",
      type: "main" as const,
      title: "制定交付计划",
      description: "推进一次项目。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "项目加速券 1",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 160,
      rewardActionPower: 0,
      guideAction: "前往项目",
      unlockKind: "none" as const
    },
    {
      id: "main-project-margin",
      type: "main" as const,
      title: "核算项目毛利",
      description: "结算一个项目。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "财务顾问卡 1",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 160,
      rewardActionPower: 0,
      guideAction: "前往财务",
      unlockKind: "none" as const
    },
    {
      id: "main-user-research",
      type: "main" as const,
      title: "做用户调研",
      description: "启动一条产品线。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "市场情报 1",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 180,
      rewardActionPower: 0,
      guideAction: "前往产品",
      unlockKind: "none" as const
    },
    {
      id: "main-tech-debt-check",
      type: "main" as const,
      title: "检查技术债",
      description: "完成一次产品重构。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "风险保险 1",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 160,
      rewardActionPower: 0,
      guideAction: "前往产品",
      unlockKind: "none" as const
    },
    {
      id: "main-market-position",
      type: "main" as const,
      title: "确定市场定位",
      description: "进入一个市场赛道。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "市场情报 1",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 200,
      rewardActionPower: 0,
      guideAction: "前往市场",
      unlockKind: "none" as const
    },
    {
      id: "main-competitor-scan",
      type: "main" as const,
      title: "扫描竞争对手",
      description: "触发一次竞争对手动作。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "声望 220",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 220,
      rewardActionPower: 0,
      guideAction: "前往市场",
      unlockKind: "none" as const
    },
    {
      id: "main-guild-help-plan",
      type: "main" as const,
      title: "准备商会互助",
      description: "发布一次商会互助。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "限定称号碎片 1",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 160,
      rewardActionPower: 0,
      guideAction: "前往商会",
      unlockKind: "none" as const
    },
    {
      id: "main-season-task-plan",
      type: "main" as const,
      title: "制定赛季任务计划",
      description: "推进一次赛季任务。",
      target: 1,
      initialProgress: 0,
      rewardLabel: "赛季经验券 1",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 180,
      rewardActionPower: 0,
      guideAction: "前往通行证",
      unlockKind: "none" as const
    },
    createMainTaskConfig("main-first-budget", "制定首周预算", "前往财务"),
    createMainTaskConfig("main-first-report", "阅读经营日报", "前往财务"),
    createMainTaskConfig("main-cashflow-budget", "制定现金流预算", "前往财务"),
    createMainTaskConfig("main-cost-structure", "优化成本结构", "前往财务"),
    createMainTaskConfig("main-loan-plan", "准备贷款方案", "前往贷款"),
    createMainTaskConfig("main-investor-list", "整理投资人名单", "前往融资"),
    createMainTaskConfig("main-roadshow-deck", "准备路演材料", "前往融资"),
    createMainTaskConfig("main-term-review", "复核融资条款", "前往融资"),
    createMainTaskConfig("main-rank-target", "设定本服排行目标", "前往排行"),
    createMainTaskConfig("main-cross-server-target", "了解跨服目标", "前往排行"),
    createMainTaskConfig("main-reputation-plan", "规划声望成长", "前往排行"),
    createMainTaskConfig("main-pass-value", "查看通行证价值", "前往通行证"),
    createMainTaskConfig("main-activity-shop-plan", "规划活动商店", "前往通行证"),
    createMainTaskConfig("main-vip-benefit-review", "查看 VIP 起步权益", "前往VIP"),
    createMainTaskConfig("main-week-card-value", "评估经营周卡", "前往特权"),
    createMainTaskConfig("main-growth-fund-check", "查看成长基金", "前往特权"),
    createMainTaskConfig("main-fund-node", "查看基金节点", "前往特权"),
    createMainTaskConfig("main-action-power-plan", "制定行动力计划", "前往背包"),
    createMainTaskConfig("main-full-level-plan", "了解满级去向", "前往通行证"),
    {
      id: "test-full-level-seed",
      type: "main" as const,
      title: "测试满级宝箱经验",
      description: "测试满级宝箱经验。",
      target: 1,
      initialProgress: 1,
      rewardLabel: "公司经验 8400",
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardReputation: 0,
      rewardActionPower: 0,
      rewardCompanyExperience: 8400,
      guideAction: "前往通行证",
      unlockKind: "none" as const
    }
  ];
  const taskProgress = new Map<string, { progress: number; dailyDate?: string; claimedAt?: string }>();
  const inventoryItems = new Map<string, { id: string; profileId: string; itemId: string; quantity: number; updatedAt: string }>();
  const itemLedgers: Array<{ id: string; profileId: string; itemId: string; changeQuantity: number; balanceAfter: number; source: string; reason: string; createdAt: string }> = [];
  const financeReports = new Map<string, CompanyFinanceSettlementRecord>();
  const randomTaskConfigs = [
    {
      id: "random-cashflow-warning",
      category: "finance",
      title: "现金流预警复核",
      description: "财务顾问提示下月支出会明显提高，需要决定是否提前做预算调整。",
      source: "财务顾问",
      riskLabel: "现金流",
      optionALabel: "亲自复核预算",
      optionAResult: "现金流风险下降，管理经验提升。",
      optionAActionPower: -15,
      optionACash: 60000,
      optionAReputation: 180,
      optionACompanyExperience: 65,
      optionBLabel: "暂缓处理",
      optionBResult: "保留行动力，但只获得少量经验。",
      optionBActionPower: 0,
      optionBCash: 0,
      optionBReputation: -80,
      optionBCompanyExperience: 25,
      knowledgeId: "cashflow-safety-line"
    },
    {
      id: "random-market-counter",
      category: "market",
      title: "竞品突然降价",
      description: "同赛道竞品进行短期补贴，市场经理建议立刻选择应对策略。",
      source: "商业新闻",
      riskLabel: "市场竞争",
      optionALabel: "用市场情报反击",
      optionAResult: "竞品声量被压制，公司声望和市场判断提升。",
      optionAActionPower: -25,
      optionACash: 40000,
      optionAReputation: 420,
      optionACompanyExperience: 90,
      optionBLabel: "观察一轮再行动",
      optionBResult: "节省资源，但市场主动权下降。",
      optionBActionPower: 0,
      optionBCash: 0,
      optionBReputation: -120,
      optionBCompanyExperience: 35,
      knowledgeId: "platform-unfair-competition"
    },
    {
      id: "random-media-interview",
      category: "reputation",
      title: "行业媒体采访邀约",
      description: "一家垂直媒体希望采访你的创业方法论，是否投入时间准备？",
      source: "媒体邀约",
      riskLabel: "品牌口碑",
      optionALabel: "准备采访提纲",
      optionAResult: "品牌曝光上升，声望提升明显。",
      optionAActionPower: -20,
      optionACash: 0,
      optionAReputation: 520,
      optionACompanyExperience: 80,
      optionBLabel: "提供简短回复",
      optionBResult: "曝光有限，但不影响主线经营节奏。",
      optionBActionPower: 0,
      optionBCash: 0,
      optionBReputation: 160,
      optionBCompanyExperience: 35,
      knowledgeId: "ad-false-promotion"
    },
    {
      id: "random-funding-term-sheet",
      category: "funding",
      title: "投资条款临时调整",
      description: "投资人希望提高估值但增加对赌条款，需要判断是否接受。",
      source: "投资人来电",
      riskLabel: "融资条款",
      optionALabel: "请财务顾问复核条款",
      optionAResult: "融资谈判更稳，公司现金流获得补强。",
      optionAActionPower: -15,
      optionACash: 100000,
      optionAReputation: 220,
      optionACompanyExperience: 70,
      optionBLabel: "先口头接受条件",
      optionBResult: "推进速度更快，但声望承压。",
      optionBActionPower: 0,
      optionBCash: 30000,
      optionBReputation: -120,
      optionBCompanyExperience: 30,
      knowledgeId: "capital-term-sheet"
    },
    {
      id: "random-loan-rate-review",
      category: "loan",
      title: "银行贷款利率复核",
      description: "银行给出一份短期经营贷方案，需要决定是否投入时间复核利率和还款节奏。",
      source: "银行经理",
      riskLabel: "贷款利率",
      optionALabel: "复核还款节奏",
      optionAResult: "贷款成本被压低，现金流更从容。",
      optionAActionPower: -10,
      optionACash: 80000,
      optionAReputation: 160,
      optionACompanyExperience: 60,
      optionBLabel: "按默认方案推进",
      optionBResult: "节省精力，但现金收益有限。",
      optionBActionPower: 0,
      optionBCash: 20000,
      optionBReputation: -60,
      optionBCompanyExperience: 25,
      knowledgeId: "capital-loan-contract"
    },
    {
      id: "random-season-opportunity",
      category: "season",
      title: "赛季风口机会",
      description: "本周赛季主题带来一次曝光机会，适合补一段经营动作。",
      source: "赛季运营",
      riskLabel: "赛季机会",
      optionALabel: "投入精力追风口",
      optionAResult: "赛季贡献和公司经验增长更快。",
      optionAActionPower: -20,
      optionACash: 50000,
      optionAReputation: 300,
      optionACompanyExperience: 100,
      optionBLabel: "只完成基础动作",
      optionBResult: "稳健推进，不影响日常经营。",
      optionBActionPower: 0,
      optionBCash: 20000,
      optionBReputation: 90,
      optionBCompanyExperience: 45,
      knowledgeId: "ai-agent-season-playbook"
    }
  ];
  const playerRandomTasks = new Map<string, RandomTaskCenterRecord["tasks"][number]>();
  const eventConfigs = [
    {
      id: "employee-contract-risk",
      title: "新员工入职资料缺口",
      source: "员工私信",
      channel: "chat",
      summary: "HR 提醒一名新员工还没有完成劳动合同签署。",
      context: "销售团队准备让新员工直接进入客户项目，但入职材料仍缺少合同签署和岗位确认。",
      optionA: "立即补齐合同和入职材料",
      optionAResult: "公司支出增加，但用工争议风险下降。",
      optionACash: -20000,
      optionAReputation: 300,
      optionACustomerSatisfaction: 0,
      optionARiskDelta: -1,
      optionB: "先进入项目，手续稍后补齐",
      optionBResult: "短期不影响交付，但用工和客户现场管理风险上升。",
      optionBCash: 0,
      optionBReputation: -800,
      optionBCustomerSatisfaction: 0,
      optionBRiskDelta: 1,
      followupEventId: "customer-contract-review",
      knowledgeId: "labor-written-contract",
      knowledgeTitle: "劳动合同签署风险",
      riskExplanation: "入职资料缺口会放大劳动争议和客户现场管理风险。"
    },
    {
      id: "customer-contract-review",
      title: "客户要求压缩验收周期",
      source: "客户邮件",
      channel: "contract",
      summary: "客户希望缩短验收时间，并保留延期扣款条款。",
      context: "客户提出快速签约，但验收节点、延期扣款和回款条件都需要在合同中确认。",
      optionA: "坚持分阶段验收和书面确认",
      optionAResult: "签约节奏变慢，但回款节点更清晰。",
      optionACash: -10000,
      optionAReputation: 500,
      optionACustomerSatisfaction: 2,
      optionARiskDelta: -1,
      optionB: "接受压缩周期换取快速签约",
      optionBResult: "公司快速拿到现金，但后续验收和扣款风险增加。",
      optionBCash: 60000,
      optionBReputation: -500,
      optionBCustomerSatisfaction: -4,
      optionBRiskDelta: 1,
      followupEventId: null,
      knowledgeId: "contract-acceptance-payment",
      knowledgeTitle: "项目验收条款",
      riskExplanation: "验收周期压缩会提高短期签约速度，但也会压缩纠错时间。"
    },
    {
      id: "funding-failed-bridge-plan",
      title: "融资未达成后的替代方案",
      source: "董事会纪要",
      channel: "finance",
      summary: "本轮融资没有完成，董事会要求提交现金流替代方案。",
      context: "投资人暂缓打款后，公司需要在贷款周转、降本和项目回款之间快速做出选择。",
      optionA: "收缩支出并催收短周期项目",
      optionAResult: "现金流压力缓解。",
      optionACash: 50000,
      optionAReputation: 200,
      optionACustomerSatisfaction: 0,
      optionARiskDelta: -1,
      optionB: "继续寻找更高估值投资人",
      optionBResult: "增长叙事保持，但现金流压力继续上升。",
      optionBCash: -30000,
      optionBReputation: 500,
      optionBCustomerSatisfaction: 0,
      optionBRiskDelta: 1,
      followupEventId: null,
      knowledgeId: "capital-debt-restructure",
      knowledgeTitle: "融资失败后的现金流替代路线",
      riskExplanation: "融资失败不会直接补充现金，需要用回款、降本或授信维持安全垫。"
    },
    {
      id: "product-tech-debt-incident",
      title: "产品技术债事故预警",
      source: "技术周报",
      channel: "product",
      summary: "产品快速增长后技术债累积，线上稳定性开始影响留存和口碑。",
      context: "服务器成本、客服压力和历史架构问题同时出现，团队需要决定是否暂停增长转向重构。",
      optionA: "暂停投放并重构核心模块",
      optionAResult: "短期增长放缓，但事故风险下降。",
      optionACash: -60000,
      optionAReputation: 800,
      optionACustomerSatisfaction: 4,
      optionARiskDelta: -2,
      optionB: "继续增长并延后重构",
      optionBResult: "收入保持增长，但技术债继续推高事故概率。",
      optionBCash: 90000,
      optionBReputation: -800,
      optionBCustomerSatisfaction: -5,
      optionBRiskDelta: 2,
      followupEventId: null,
      knowledgeId: "ip-software-copyright",
      knowledgeTitle: "技术债和产品稳定性",
      riskExplanation: "技术债过高会把增长收益转化为事故、客服和留存压力。"
    }
  ];
  const playerEvents = new Map<string, EventRecord>();
  const investorConfigs = [
    {
      id: "angel-local-commerce",
      roundName: "天使轮",
      name: "启明天使合伙人",
      focus: "本地商业 SaaS",
      ticketSize: 800000,
      valuationMultiplierBasisPoints: 10500,
      equityBasisPoints: 800,
      successRateBase: 78,
      debtToleranceBasisPoints: 4500,
      boardPressure: 12,
      term: "每月提交经营简报，重大支出需提前说明。",
      summary: "偏好现金流清晰的小团队。"
    },
    {
      id: "prea-growth-fund",
      roundName: "Pre-A",
      name: "源石成长基金",
      focus: "项目收入增长",
      ticketSize: 1500000,
      valuationMultiplierBasisPoints: 11600,
      equityBasisPoints: 1200,
      successRateBase: 62,
      debtToleranceBasisPoints: 3500,
      boardPressure: 22,
      term: "季度增长目标未达成时触发估值复核。",
      summary: "提供更高金额，但关注增长速度。"
    },
    {
      id: "strategic-enterprise-capital",
      roundName: "A轮",
      name: "华企战略资本",
      focus: "大客户渠道合作",
      ticketSize: 2600000,
      valuationMultiplierBasisPoints: 12800,
      equityBasisPoints: 1600,
      successRateBase: 32,
      debtToleranceBasisPoints: 3000,
      boardPressure: 34,
      term: "优先参与大客户渠道合作，保留董事会观察权。",
      summary: "金额最高，条款更强势。"
    }
  ];
  const playerFundings = new Map<string, FundingRecord>();
  const loanConfigs = [
    {
      id: "short-cashflow-loan",
      name: "经营周转贷",
      lender: "城市商业银行",
      principal: 300000,
      annualRateBasisPoints: 720,
      termMonths: 6,
      monthlyPayment: 53200,
      creditRequired: "B",
      summary: "适合短期现金流缺口。"
    },
    {
      id: "equipment-growth-loan",
      name: "设备升级贷",
      lender: "科技园担保中心",
      principal: 600000,
      annualRateBasisPoints: 960,
      termMonths: 12,
      monthlyPayment: 54800,
      creditRequired: "A",
      summary: "额度更高，适合扩张办公。"
    },
    {
      id: "high-debt-expansion-loan",
      name: "高负债扩张贷",
      lender: "民间联合授信",
      principal: 4000000,
      annualRateBasisPoints: 1500,
      termMonths: 12,
      monthlyPayment: 700000,
      creditRequired: "B",
      summary: "额度很高，但会带来高负债压力。"
    }
  ];
  const playerLoans = new Map<string, LoanRecord>();
  const productConfigs = [
    {
      id: "crm-lite-saas",
      name: "轻量 CRM SaaS",
      category: "企业服务",
      summary: "把项目交付经验沉淀为订阅产品，适合稳定现金流。",
      launchCost: 280000,
      baseUsers: 120,
      retentionBasisPoints: 4200,
      payRateBasisPoints: 180,
      revenuePerPayingUser: 680,
      acquisitionCost: 90000,
      serverCost: 28000,
      techDebtGrowth: 9,
      reputationGrowth: 3
    },
    {
      id: "ai-customer-copilot",
      name: "AI 客服 Copilot",
      category: "AI 工具",
      summary: "面向中小企业客服团队，增长更快但技术债和服务器成本更高。",
      launchCost: 420000,
      baseUsers: 80,
      retentionBasisPoints: 3600,
      payRateBasisPoints: 220,
      revenuePerPayingUser: 980,
      acquisitionCost: 140000,
      serverCost: 52000,
      techDebtGrowth: 15,
      reputationGrowth: 5
    }
  ];
  const playerProducts = new Map<string, ProductRecord>();
  const marketTrackConfigs = [
    {
      id: "enterprise-saas",
      name: "企业 SaaS",
      summary: "回款稳定、服务成本中等，容易被价格战和客户迁移影响。",
      costStructure: "获客成本中等，客服和续费运营占比高。",
      industryHeat: 66,
      policyRisk: 18,
      baseShareBasisPoints: 820,
      customerPool: 120000
    },
    {
      id: "ai-tools",
      name: "AI 工具",
      summary: "行业热度高、增长快，但算力成本、政策变化和专利争议更频繁。",
      costStructure: "服务器和研发成本高，增长弹性强。",
      industryHeat: 84,
      policyRisk: 42,
      baseShareBasisPoints: 520,
      customerPool: 180000
    }
  ];
  const competitorActionConfigs = [
    {
      id: "saas-price-war",
      trackId: "enterprise-saas",
      competitorName: "蓝鲸企服",
      actionType: "price_war" as CompetitorActionType,
      title: "竞品发起价格战",
      summary: "蓝鲸企服下调年费并承诺免费迁移，短期压缩你的签约转化。",
      cashImpact: -50000,
      monthlyIncomeImpact: -60000,
      monthlyExpenseImpact: 20000,
      reputationImpact: -400,
      employeeSatisfactionImpact: 0,
      customerSatisfactionImpact: -3,
      marketShareDeltaBasisPoints: -90,
      competitorShareDeltaBasisPoints: 140,
      pricePressure: 18,
      talentPressure: 4,
      policyRiskDelta: 0,
      responseCost: 90000,
      responseShareDeltaBasisPoints: 150,
      responseReputationImpact: 500
    },
    {
      id: "saas-poach-manager",
      trackId: "enterprise-saas",
      competitorName: "云帆科技",
      actionType: "poach" as CompetitorActionType,
      title: "竞品挖角客户成功负责人",
      summary: "云帆科技向你的客户成功团队开出高薪，续费服务稳定性承压。",
      cashImpact: -30000,
      monthlyIncomeImpact: -20000,
      monthlyExpenseImpact: 30000,
      reputationImpact: -500,
      employeeSatisfactionImpact: -5,
      customerSatisfactionImpact: -4,
      marketShareDeltaBasisPoints: -70,
      competitorShareDeltaBasisPoints: 90,
      pricePressure: 3,
      talentPressure: 20,
      policyRiskDelta: 0,
      responseCost: 5000000,
      responseShareDeltaBasisPoints: 130,
      responseReputationImpact: 400
    },
    {
      id: "ai-patent-dispute",
      trackId: "ai-tools",
      competitorName: "星河智能",
      actionType: "patent" as CompetitorActionType,
      title: "竞品提出专利诉讼威胁",
      summary: "星河智能指控你的客服模型流程相似，要求停止部分宣传。",
      cashImpact: -90000,
      monthlyIncomeImpact: -30000,
      monthlyExpenseImpact: 50000,
      reputationImpact: -900,
      employeeSatisfactionImpact: -2,
      customerSatisfactionImpact: -5,
      marketShareDeltaBasisPoints: -120,
      competitorShareDeltaBasisPoints: 100,
      pricePressure: 6,
      talentPressure: 8,
      policyRiskDelta: 8,
      responseCost: 160000,
      responseShareDeltaBasisPoints: 190,
      responseReputationImpact: 900
    }
  ];
  const playerMarkets = new Map<string, PlayerMarketRecord>();
  const playerCompetitorActions = new Map<string, {
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
  }>();

  const getProfileByAccountAndServer = (accountId: string, serverId: string): PlayerProfileRecord | undefined =>
    profiles.get(`${accountId}:${serverId}`);

  const toCompanyFinanceRecord = (profile: PlayerProfileRecord): CompanyFinanceRecord => {
    const report = calculateFinanceReport(profile);
    const riskRank = { "稳健": 0, "预警": 1, "资金紧张": 2 };
    const riskStatus = riskRank[profile.riskStatus] > riskRank[report.riskStatus] ? profile.riskStatus : report.riskStatus;

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
  const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
  const fundingForProfile = (profileId: string): FundingRecord[] =>
    [...playerFundings.values()].filter((funding) => funding.id.startsWith(`${profileId}:`));
  const calculateFundingOffer = (profile: PlayerProfileRecord, config: (typeof investorConfigs)[number]) => {
    const finance = toCompanyFinanceRecord(profile);
    const reputationBonus = clamp(Math.floor((profile.reputation - 1000000) / 100000), -8, 8);
    const cashflowBonus = finance.netCashFlow >= 300000 ? 6 : finance.netCashFlow >= 0 ? 3 : -10;
    const debtPenalty = Math.ceil(finance.debtRatioBasisPoints / 1000) * 4;
    const creditPenalty = profile.creditRating === "A" ? 0 : profile.creditRating === "B" ? 8 : profile.creditRating === "C" ? 18 : 30;
    const riskPenalty = finance.riskStatus === "稳健" ? 0 : finance.riskStatus === "预警" ? 8 : 16;
    const successRate = clamp(config.successRateBase + reputationBonus + cashflowBonus - debtPenalty - creditPenalty - riskPenalty, 5, 95);
    const valuationBasisPoints = Math.max(6000, config.valuationMultiplierBasisPoints - Math.min(3000, Math.max(0, finance.debtRatioBasisPoints - 2000)));
    const preMoneyValuation = Math.max(1000000, Math.round((profile.valuation * valuationBasisPoints) / 10000));
    const postMoneyValuation = preMoneyValuation + config.ticketSize;
    const completed = fundingForProfile(profile.id).some((funding) => funding.investorId === config.id && funding.status === "funded");
    const isDebtAcceptable = finance.debtRatioBasisPoints <= config.debtToleranceBasisPoints;
    const isEquityEnough = profile.founderEquityBasisPoints > config.equityBasisPoints;

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
      isAvailable: !completed && isDebtAcceptable && isEquityEnough,
      lockedReason: completed ? "本轮已完成" : !isEquityEnough ? "创始人股权不足" : !isDebtAcceptable ? "负债率过高，条款暂不可接受" : null
    };
  };
  const toFundingCenterRecord = (profile: PlayerProfileRecord): FundingCenterRecord => ({
    offers: investorConfigs.map((config) => calculateFundingOffer(profile, config)),
    fundings: fundingForProfile(profile.id),
    finance: toCompanyFinanceRecord(profile)
  });
  const projectForProfile = (profileId: string): ProjectRecord[] =>
    [...projects.values()].filter((project) => project.id.startsWith(`${profileId}:`));

  const refreshProjectSuccessRate = (project: ProjectRecord): ProjectRecord => {
    const employee =
      project.assignedEmployeeId === null ? undefined : employees.get(project.assignedEmployeeId);
    return {
      ...project,
      successRate: calculateProjectSuccessRate({
        baseRate: project.configId === "failed-project" ? 0 : project.configId === "success-project" ? 100 : project.successRate,
        employeeManagement: employee?.management,
        employeeNegotiation: employee?.negotiation,
        employeeExecution: employee?.execution
      })
    };
  };

  const toTaskRecord = (
    profileId: string,
    config: (typeof taskConfigs)[number],
    today: string
  ): TaskRecord => {
    const key = `${profileId}:${config.id}`;
    const progress = taskProgress.get(key);
    const isDaily = config.type === "daily";
    const isFreshDaily = !isDaily || progress?.dailyDate === today;
    const currentProgress = isFreshDaily ? progress?.progress ?? config.initialProgress : 0;
    const isClaimed = isFreshDaily && progress?.claimedAt !== undefined;

    return {
      ...config,
      type: config.type,
      knowledgeId: config.knowledgeId ?? null,
      progress: Math.min(currentProgress, config.target),
      isClaimed,
      isClaimable: currentProgress >= config.target && !isClaimed
    };
  };
  const readCompanyGrowthRecord = (profile: PlayerProfileRecord): CompanyGrowthRecord => {
    const levelStartExperience = (profile.companyLevel - 1) * companyExperiencePerLevel;
    const nextLevelExperience = profile.companyLevel >= companyMaxLevel ? null : profile.companyLevel * companyExperiencePerLevel;
    const fullLevelOverflowExperience = profile.companyLevel >= companyMaxLevel
      ? Math.max(0, profile.companyExperience - (companyMaxLevel - 1) * companyExperiencePerLevel)
      : 0;
    const claimedCount = itemLedgers.filter((ledger) => ledger.profileId === profile.id && ledger.source === "full_level_chest").length;
    const earnedCount = Math.floor(fullLevelOverflowExperience / fullLevelChestRequiredExperience);

    return {
      profile,
      maxLevel: companyMaxLevel,
      currentLevelExperience: Math.max(0, profile.companyExperience - levelStartExperience),
      nextLevelExperience,
      progressToNextBasisPoints:
        nextLevelExperience === null
          ? 10000
          : Math.max(0, Math.min(10000, Math.floor(((profile.companyExperience - levelStartExperience) * 10000) / companyExperiencePerLevel))),
      fullLevelOverflowExperience,
      fullLevelChest: {
        requiredExperience: fullLevelChestRequiredExperience,
        progressExperience: fullLevelOverflowExperience % fullLevelChestRequiredExperience,
        earnedCount,
        claimedCount,
        claimableCount: Math.max(0, earnedCount - claimedCount),
        rewards: {
          cash: 0,
          reputation: 300,
          actionPower: 40,
          item: { id: "season-exp-ticket", name: "赛季经验券", quantity: 1 }
        }
      }
    };
  };

  const formatEventImpact = (cash: number, reputation: number, customerSatisfaction: number, riskDelta: number): string =>
    [
      cash === 0 ? undefined : `现金${cash > 0 ? "+" : ""}${cash}`,
      reputation === 0 ? undefined : `声望${reputation > 0 ? "+" : ""}${reputation}`,
      customerSatisfaction === 0 ? undefined : `满意度${customerSatisfaction > 0 ? "+" : ""}${customerSatisfaction}`,
      riskDelta === 0 ? undefined : `风险${riskDelta > 0 ? "+" : ""}${riskDelta}`
    ].filter(Boolean).join(" / ") || "经营影响稳定";

  const toKnowledgeLinkRecord = (profileId: string, knowledgeId: string | null) => {
    const knowledge = knowledgeEntries.find((entry) => entry.id === knowledgeId);
    if (knowledge === undefined) {
      return null;
    }
    const isUnlocked = knowledgeUnlocks.has(`${profileId}:${knowledge.id}`);
    return {
      id: knowledge.id,
      title: knowledge.title,
      summary: isUnlocked ? knowledge.summary : "完成对应经营履历后解锁完整知识卡。",
      sourceName: knowledge.sourceName,
      sourceUrl: knowledge.sourceUrl,
      collectedAt: knowledge.collectedAt,
      contentVersion: knowledge.contentVersion,
      disclaimer: knowledge.disclaimer,
      isUnlocked
    };
  };

  const toEventRecord = (
    profileId: string,
    config: (typeof eventConfigs)[number],
    existing?: EventRecord
  ): EventRecord => ({
    id: existing?.id ?? `${profileId}:${config.id}`,
    configId: config.id,
    title: config.title,
    source: config.source,
    channel: config.channel,
    summary: config.summary,
    context: config.context,
    options: [
      {
        key: "A",
        label: config.optionA,
        impactPreview: formatEventImpact(config.optionACash, config.optionAReputation, config.optionACustomerSatisfaction, config.optionARiskDelta)
      },
      {
        key: "B",
        label: config.optionB,
        impactPreview: formatEventImpact(config.optionBCash, config.optionBReputation, config.optionBCustomerSatisfaction, config.optionBRiskDelta)
      }
    ],
    status: existing?.status ?? "pending",
    selectedOption: existing?.selectedOption ?? null,
    resultSummary: existing?.resultSummary ?? null,
    knowledgeTitle: config.knowledgeTitle,
    knowledgeUnlocked: existing?.knowledgeUnlocked ?? false,
    riskExplanation: config.riskExplanation,
    knowledge: toKnowledgeLinkRecord(profileId, config.knowledgeId),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    resolvedAt: existing?.resolvedAt ?? null
  });

  const listEventsForProfile = (profile: PlayerProfileRecord): EventRecord[] => {
    const ownedEvents = [...playerEvents.values()].filter((event) => event.id.startsWith(`${profile.id}:`));
    if (ownedEvents.length === 0) {
      const firstConfig = eventConfigs[0];
      if (firstConfig !== undefined) {
        const firstEvent = toEventRecord(profile.id, firstConfig);
        playerEvents.set(firstEvent.id, firstEvent);
        ownedEvents.push(firstEvent);
      }
    }
    profile.pendingEventCount = ownedEvents.filter((event) => event.status === "pending").length;
    return ownedEvents.sort((left, right) => left.status.localeCompare(right.status) || left.createdAt.localeCompare(right.createdAt));
  };

  const creditRank = (rating: string): number => (rating === "A" ? 3 : rating === "B" ? 2 : rating === "C" ? 1 : 0);
  const downgradeCredit = (rating: string): string => (rating === "A" ? "B" : rating === "B" ? "C" : "D");
  const calculatePrincipalPayment = (loan: LoanRecord): number => {
    return Math.min(loan.remainingPrincipal, Math.max(1, Math.ceil(loan.remainingPrincipal / Math.max(loan.remainingMonths, 1))));
  };
  const loansForProfile = (profileId: string): LoanRecord[] =>
    [...playerLoans.values()].filter((loan) => loan.id.startsWith(`${profileId}:`));
  const toLoanCenterRecord = (profile: PlayerProfileRecord): LoanCenterRecord => {
    const loans = loansForProfile(profile.id);
    const activeConfigIds = new Set(loans.filter((loan) => loan.status !== "settled").map((loan) => loan.configId));
    const finance = toCompanyFinanceRecord(profile);
    const hasOverdueLoan = loans.some((loan) => loan.status === "overdue");
    const crisisLevel =
      finance.cash < 0 || finance.debtRatioBasisPoints >= 9000
        ? "bankruptcy"
        : finance.riskStatus === "资金紧张" || hasOverdueLoan
          ? "cashflow"
          : finance.debtRatioBasisPoints >= 6000
            ? "debt"
            : "none";

    return {
      offers: loanConfigs.map((config) => {
        const isCreditEnough = creditRank(profile.creditRating) >= creditRank(config.creditRequired);
        const hasActiveLoan = activeConfigIds.has(config.id);
        return {
          ...config,
          isAvailable: isCreditEnough && !hasActiveLoan,
          lockedReason: !isCreditEnough ? "信用评级不足" : hasActiveLoan ? "同类贷款未结清" : null
        };
      }),
      loans,
      finance,
      crisis: {
        isActive: crisisLevel !== "none",
        level: crisisLevel,
        summary: crisisLevel === "none" ? "现金流和负债处于可控区间。" : "现金流或负债进入危机状态。",
        routes: [
          { id: "financing", title: "融资谈判", impact: "现金+20万，创始人股权-2%。" },
          { id: "cost_cut", title: "降本裁撤", impact: "月支出-10万，员工满意度-6。" },
          { id: "restructure", title: "债务重组", impact: "负债-20万，信用降级。" }
        ]
      }
    };
  };
  const productsForProfile = (profileId: string): ProductRecord[] =>
    [...playerProducts.values()].filter((product) => product.id.startsWith(`${profileId}:`));
  const toProductCenterRecord = (profile: PlayerProfileRecord): ProductCenterRecord => {
    const activeConfigIds = new Set(productsForProfile(profile.id).filter((product) => product.status !== "closed").map((product) => product.configId));

    return {
      offers: productConfigs.map((config) => ({
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
        lockedReason: activeConfigIds.has(config.id) ? "同类产品运营中" : profile.cash < config.launchCost ? "现金不足" : null
      })),
      products: productsForProfile(profile.id),
      finance: toCompanyFinanceRecord(profile)
    };
  };
  const marketsForProfile = (profileId: string): PlayerMarketRecord[] =>
    [...playerMarkets.values()].filter((market) => market.id.startsWith(`${profileId}:`));
  const competitorActionsForProfile = (profileId: string) =>
    [...playerCompetitorActions.values()].filter((action) => action.id.startsWith(`${profileId}:`));
  const toMarketCenterRecord = (profile: PlayerProfileRecord): MarketCenterRecord => {
    const activeTrackIds = new Set(marketsForProfile(profile.id).map((market) => market.trackId));

    return {
      offers: marketTrackConfigs.map((config) => ({
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
      markets: marketsForProfile(profile.id),
      actions: competitorActionsForProfile(profile.id),
      finance: toCompanyFinanceRecord(profile)
    };
  };
  const walletLedgers = new Map<string, PlatformWalletRecord["ledgers"][number][]>();
  const wallets = new Map<string, PlatformWalletRecord>();
  const shopProducts = [
    {
      id: "first-charge-starter",
      name: "首充创业启动包",
      category: "first_charge",
      pricePlatformCoins: 680,
      rewardCash: 180000,
      rewardActionPower: 30,
      rewardReputation: 300,
      durationDays: 0,
      purchaseLimit: 1,
      summary: "首日启动资源，补充少量现金、行动力和公司声望。"
    },
    {
      id: "monthly-card-basic",
      name: "基础月卡",
      category: "monthly_card",
      pricePlatformCoins: 1280,
      rewardCash: 260000,
      rewardActionPower: 80,
      rewardReputation: 500,
      durationDays: 30,
      purchaseLimit: 1,
      summary: "提供 30 天经营补贴入口，第一版先发放即时启动补贴。"
    },
    {
      id: "daily-founder-pack",
      name: "每日经营礼包",
      category: "daily_pack",
      pricePlatformCoins: 180,
      rewardCash: 60000,
      rewardActionPower: 30,
      rewardReputation: 120,
      rewardItemId: "action-drink",
      rewardItemQuantity: 1,
      durationDays: 0,
      purchaseLimit: 1,
      summary: "轻量补足当天项目推进和经营事件节奏。"
    },
    {
      id: "weekly-operation-card",
      name: "经营周卡",
      category: "weekly_card",
      pricePlatformCoins: 680,
      rewardCash: 160000,
      rewardActionPower: 120,
      rewardReputation: 360,
      durationDays: 7,
      purchaseLimit: 1,
      summary: "绑定 7 日留存的轻权益，提供行动力和员工培养材料。"
    },
    {
      id: "growth-fund-weekly",
      name: "7日成长基金",
      category: "growth_fund",
      pricePlatformCoins: 980,
      rewardCash: 320000,
      rewardActionPower: 80,
      rewardReputation: 700,
      durationDays: 7,
      purchaseLimit: 1,
      summary: "绑定 D1-D7 主线节点，承接首周留存转化。"
    },
    {
      id: "headhunter-ticket",
      name: "猎头招募券",
      category: "recruit_ticket",
      pricePlatformCoins: 360,
      rewardCash: 0,
      rewardActionPower: 20,
      rewardReputation: 120,
      durationDays: 0,
      purchaseLimit: 0,
      summary: "用于后续猎头招募池，当前提供行动力和少量声望预备奖励。"
    },
    {
      id: "risk-insurance-trial",
      name: "风险保险体验包",
      category: "risk_insurance",
      pricePlatformCoins: 520,
      rewardCash: 0,
      rewardActionPower: 0,
      rewardReputation: 0,
      rewardItemId: "risk-insurance",
      rewardItemQuantity: 1,
      durationDays: 0,
      purchaseLimit: 0,
      summary: "提供一次风险保险，用于降低随机经营任务损失。"
    },
    {
      id: "market-intel-trial",
      name: "市场情报体验包",
      category: "market",
      pricePlatformCoins: 520,
      rewardCash: 0,
      rewardActionPower: 0,
      rewardReputation: 0,
      rewardItemId: "market-intel",
      rewardItemQuantity: 1,
      durationDays: 0,
      purchaseLimit: 0,
      summary: "提供一次市场情报，用于增强市场随机任务收益。"
    },
    {
      id: "finance-advisor-trial",
      name: "财务顾问体验包",
      category: "finance",
      pricePlatformCoins: 520,
      rewardCash: 0,
      rewardActionPower: 0,
      rewardReputation: 0,
      rewardItemId: "finance-advisor-card",
      rewardItemQuantity: 1,
      durationDays: 0,
      purchaseLimit: 0,
      summary: "提供一次财务顾问卡，用于优化财务随机任务收益。"
    }
  ];
  const itemConfigs = [
    {
      id: "risk-insurance",
      name: "风险保险",
      category: "operation",
      rarity: "优秀",
      icon: "shield-check",
      summary: "用于降低一次经营事件、合同或市场波动的损失。",
      usageHint: "经营事件、市场竞争、活动商店"
    },
    {
      id: "action-drink",
      name: "行动力饮料",
      category: "operation",
      rarity: "普通",
      icon: "zap",
      summary: "用于补充行动力，支撑首日和每日经营循环。",
      usageHint: "项目推进、产品研发、每日任务"
    },
    {
      id: "market-intel",
      name: "市场情报",
      category: "operation",
      rarity: "稀缺",
      icon: "radar",
      summary: "用于查看竞争压力并降低进入新赛道的不确定性。",
      usageHint: "市场竞争、跨服排行准备"
    },
    {
      id: "finance-advisor-card",
      name: "财务顾问卡",
      category: "operation",
      rarity: "稀缺",
      icon: "briefcase",
      summary: "用于现金流预警、融资和贷款选择，是中期经营缓冲道具。",
      usageHint: "财务、融资、贷款"
    },
    {
      id: "season-exp-ticket",
      name: "赛季经验券",
      category: "season",
      rarity: "优秀",
      icon: "ticket",
      summary: "用于提升赛季通行证进度，补足轻度玩家的赛季缺口。",
      usageHint: "赛季通行证、活动奖励"
    },
    {
      id: "training-manual",
      name: "培养手册",
      category: "employee",
      rarity: "普通",
      icon: "file-text",
      summary: "用于员工培养和岗位成长。",
      usageHint: "员工培养、每日任务、通行证奖励"
    },
    {
      id: "targeted-headhunt-letter",
      name: "定向猎头函",
      category: "employee",
      rarity: "稀缺",
      icon: "send",
      summary: "用于选择岗位方向的高级猎头。",
      usageHint: "员工页定向猎头"
    }
  ];
  const grantInventoryItem = (profileId: string, itemId: string | null, quantity: number, source: string, reason: string) => {
    if (itemId === null || quantity <= 0) {
      return;
    }
    const key = `${profileId}:${itemId}`;
    const existing = inventoryItems.get(key);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    inventoryItems.set(key, {
      id: existing?.id ?? randomUUID(),
      profileId,
      itemId,
      quantity: nextQuantity,
      updatedAt: new Date().toISOString()
    });
    itemLedgers.unshift({
      id: randomUUID(),
      profileId,
      itemId,
      changeQuantity: quantity,
      balanceAfter: nextQuantity,
      source,
      reason,
      createdAt: new Date().toISOString()
    });
  };
  const vipLevels = [
    {
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
    },
    {
      level: 1,
      name: "VIP 1",
      requiredExperience: 680,
      dailyGiftPlatformCoins: 30,
      dailyGiftActionPower: 30,
      actionPowerLimitBonus: 10,
      quickSettleTimes: 1,
      trainingQueueBonus: 0,
      recruitRefreshTimes: 1,
      shopDiscountBasisPoints: 9800,
      title: "创业先驱",
      avatarFrame: "gold-line",
      summary: "解锁轻量便利和基础身份展示。"
    },
    {
      level: 2,
      name: "VIP 2",
      requiredExperience: 1280,
      dailyGiftPlatformCoins: 60,
      dailyGiftActionPower: 50,
      actionPowerLimitBonus: 20,
      quickSettleTimes: 2,
      trainingQueueBonus: 1,
      recruitRefreshTimes: 2,
      shopDiscountBasisPoints: 9500,
      title: "增长合伙人",
      avatarFrame: "gold-ring",
      summary: "增强项目推进和员工培养便利。"
    },
    {
      level: 3,
      name: "VIP 3",
      requiredExperience: 3000,
      dailyGiftPlatformCoins: 120,
      dailyGiftActionPower: 80,
      actionPowerLimitBonus: 40,
      quickSettleTimes: 3,
      trainingQueueBonus: 1,
      recruitRefreshTimes: 3,
      shopDiscountBasisPoints: 9200,
      title: "资本新贵",
      avatarFrame: "royal-gold",
      summary: "提供更高身份展示和经营便利。"
    }
  ];
  const shopPurchases = new Map<string, ShopCenterRecord["purchases"][number] & { profileId: string }>();
  const vipDailyGifts = new Set<string>();
  const titleConfigs = [
    { id: "startup-founder", name: "初创老板", category: "growth", source: "achievement", bonusLabel: "身份展示", durationDays: 0 },
    { id: "cashflow-master", name: "现金流大师", category: "finance", source: "achievement", bonusLabel: "现金流榜展示", durationDays: 0 },
    { id: "server-richest", name: "本服首富", category: "rank", source: "leaderboard", bonusLabel: "排行榜展示", durationDays: 7 },
    { id: "cross-unicorn", name: "跨服独角兽", category: "rank", source: "cross_server", bonusLabel: "跨服榜展示", durationDays: 7 },
    { id: "season-ai-pioneer", name: "AI风口先锋", category: "season", source: "season", bonusLabel: "赛季活动展示", durationDays: 30 }
  ];
  const achievementConfigs = [
    {
      id: "profile-created",
      name: "创业开张",
      category: "growth",
      description: "完成创始人和公司档案。",
      conditionKind: "profile_created",
      conditionValue: 1,
      rewardCash: 50000,
      rewardPlatformCoins: 0,
      rewardActionPower: 20,
      rewardTitleId: "startup-founder",
      rewardKnowledgeId: "company-registration-basics",
      isHidden: false
    },
    {
      id: "positive-cashflow",
      name: "现金流转正",
      category: "finance",
      description: "公司月收入高于月支出。",
      conditionKind: "positive_cashflow",
      conditionValue: 1,
      rewardCash: 80000,
      rewardPlatformCoins: 0,
      rewardActionPower: 20,
      rewardTitleId: "cashflow-master",
      rewardKnowledgeId: "cashflow-safety-line",
      isHidden: false
    },
    {
      id: "valuation-ten-million",
      name: "千万估值",
      category: "growth",
      description: "公司估值达到 1000 万。",
      conditionKind: "valuation",
      conditionValue: 10000000,
      rewardCash: 0,
      rewardPlatformCoins: 120,
      rewardActionPower: 0,
      rewardTitleId: null,
      rewardKnowledgeId: "valuation-method-note",
      isHidden: true
    },
    {
      id: "season-ai-agent-growth",
      name: "AI 风口上榜",
      category: "season",
      description: "完成 AI Agent 风口榜活动目标。",
      conditionKind: "manual_season",
      conditionValue: 1,
      rewardCash: 0,
      rewardPlatformCoins: 0,
      rewardActionPower: 0,
      rewardTitleId: "season-ai-pioneer",
      rewardKnowledgeId: "ai-agent-season-playbook",
      isHidden: false
    }
  ];
  const createKnowledgeRecord = (
    id: string,
    category: string,
    title: string,
    sourceName = "全国人大网",
    sourceUrl = "https://www.npc.gov.cn/npc/c2/c30834/202312/t20231229_433967.html"
  ) => ({
    id,
    category,
    title,
    summary: `${title}的游戏化经营解释。`,
    scenarioText: `${title}对应一个经营决策场景。`,
    riskText: `${title}处理不当会增加经营风险。`,
    gameImpactText: `${title}会影响现金、声望或客户满意度。`,
    actionTipText: `处理${title}前先确认资料和边界。`,
    sourceName,
    sourceUrl,
    collectedAt: "2026-05-02",
    contentVersion: "2026.05.phase22",
    disclaimer: "仅作游戏科普，不构成法律建议",
    reviewStatus: "published"
  });
  const knowledgeEntries = [
    createKnowledgeRecord("company-registration-basics", "公司设立与股权", "公司档案与主体登记"),
    createKnowledgeRecord("company-capital-contribution", "公司设立与股权", "出资期限与资金承诺"),
    createKnowledgeRecord("valuation-method-note", "公司设立与股权", "股权稀释与估值谈判"),
    createKnowledgeRecord("director-duty-basics", "公司设立与股权", "董监高责任边界"),
    createKnowledgeRecord("labor-written-contract", "劳动用工", "书面劳动合同"),
    createKnowledgeRecord("labor-probation-risk", "劳动用工", "试用期边界"),
    createKnowledgeRecord("labor-overtime-pay", "劳动用工", "加班与薪酬"),
    createKnowledgeRecord("labor-exit-compensation", "劳动用工", "离职与经济补偿"),
    createKnowledgeRecord("contract-formation-basics", "合同与客户", "合同成立"),
    createKnowledgeRecord("contract-acceptance-payment", "合同与客户", "验收与回款"),
    createKnowledgeRecord("contract-breach-liability", "合同与客户", "违约责任"),
    createKnowledgeRecord("contract-confidentiality", "合同与客户", "保密条款"),
    createKnowledgeRecord("data-consent-basics", "数据与隐私", "用户同意"),
    createKnowledgeRecord("data-minimum-necessary", "数据与隐私", "最小必要"),
    createKnowledgeRecord("data-sensitive-info", "数据与隐私", "敏感个人信息"),
    createKnowledgeRecord("data-leak-response", "数据与隐私", "数据泄露响应"),
    createKnowledgeRecord("ad-false-promotion", "广告与营销", "虚假宣传"),
    createKnowledgeRecord("ad-endorsement-risk", "广告与营销", "广告代言"),
    createKnowledgeRecord("ad-live-commerce", "广告与营销", "直播带货"),
    createKnowledgeRecord("ad-competitor-comparison", "广告与营销", "竞品比较宣传"),
    createKnowledgeRecord("ip-trademark-registration", "知识产权", "商标注册", "国家知识产权局", "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html"),
    createKnowledgeRecord("ip-software-copyright", "知识产权", "软件著作权"),
    createKnowledgeRecord("ip-employee-code-ownership", "知识产权", "员工代码归属"),
    createKnowledgeRecord("ip-copycat-risk", "知识产权", "竞品抄袭风险"),
    createKnowledgeRecord("tax-invoice-management", "税务与财务", "发票管理", "国家税务总局", "https://www.chinatax.gov.cn/chinatax/n810214/c102374/c102377/c102378/c3575330/content.html"),
    createKnowledgeRecord("tax-declaration", "税务与财务", "纳税申报", "国家税务总局", "https://www.chinatax.gov.cn/chinatax/n810214/c102374/c102377/c102378/c3575330/content.html"),
    createKnowledgeRecord("tax-cost-booking", "税务与财务", "成本入账", "国家税务总局", "https://www.chinatax.gov.cn/chinatax/n810214/c102374/c102377/c102378/c3575330/content.html"),
    createKnowledgeRecord("cashflow-safety-line", "税务与财务", "财报真实性", "国家税务总局", "https://www.chinatax.gov.cn/chinatax/n810214/c102374/c102377/c102378/c3575330/content.html"),
    createKnowledgeRecord("capital-loan-contract", "融资贷款与债务", "借款合同"),
    createKnowledgeRecord("capital-guarantee-duty", "融资贷款与债务", "担保责任"),
    createKnowledgeRecord("capital-term-sheet", "融资贷款与债务", "融资条款"),
    createKnowledgeRecord("capital-debt-restructure", "融资贷款与债务", "债务重组"),
    createKnowledgeRecord("platform-unfair-competition", "平台运营与竞争", "不正当竞争"),
    createKnowledgeRecord("platform-user-agreement", "平台运营与竞争", "用户协议"),
    createKnowledgeRecord("platform-content-review", "平台运营与竞争", "内容审核"),
    createKnowledgeRecord("ai-agent-season-playbook", "平台运营与竞争", "活动规则透明")
  ];
  const playerTitles = new Map<string, { profileId: string; titleId: string; source: string; obtainedAt: string; expiresAt: string | null }>();
  const titleEquipment = new Map<string, string>();
  const achievements = new Map<string, { profileId: string; achievementId: string; progress: number; completedAt: string | null; claimedAt: string | null }>();
  const knowledgeUnlocks = new Map<string, { profileId: string; knowledgeId: string; source: string; unlockedAt: string }>();
  const leaderboardRewards = new Set<string>();
  const guildLeaderboardDeliveries: Array<{ guildId: string; profileId: string; serverId: string; snapshotDate: string; rank: number; reputationReward: number }> = [];
  const crossGuildLeaderboardDeliveries: Array<{ guildId: string; profileId: string; serverId: string; groupId: string; snapshotDate: string; rank: number; reputationReward: number }> = [];
  const adminAuditLogs: Array<{ id: string; adminUsername: string; action: string; targetType: string; targetId: string | null; detail: string | null; createdAt: string }> = [
    {
      id: "audit-player-ban",
      adminUsername: "admin",
      action: "admin_player_ban",
      targetType: "player_profile",
      targetId: null,
      detail: null,
      createdAt: new Date().toISOString()
    },
    {
      id: "audit-cross-server-group",
      adminUsername: "admin",
      action: "admin_cross_server_group_assign",
      targetType: "cross_server_group",
      targetId: null,
      detail: null,
      createdAt: new Date().toISOString()
    }
  ];
  const crossServerSignups = new Set<string>();
  const crossServerGuildSignups = new Set<string>();
  const guilds = new Map<string, { id: string; serverId: string; name: string; level: number; contributionScore: number; announcement: string; collaborationRules: string }>();
  const guildMembers = new Map<string, { guildId: string; profileId: string; role: string; contributionScore: number }>();
  const guildJoinRequests = new Map<string, { id: string; guildId: string; profileId: string; status: string; createdAt: string; reviewedAt: string | null; reviewedByProfileId: string | null }>();
  const guildHelpRequests = new Map<string, { id: string; guildId: string; profileId: string; requestType: string; status: string; createdAt: string; fulfilledAt: string | null }>();
  const guildActivityLogs = new Map<string, { id: string; guildId: string; profileId: string; action: string; createdAt: string }>();
  const guildTaskClaims = new Map<string, { guildId: string; taskId: string; claimedAt: string }>();
  const guildTechStates = new Map<string, { guildId: string; techId: string; level: number }>();
  const guildProjectProgresses = new Map<string, { guildId: string; projectId: string; progress: number; claimedAt: string | null }>();
  const telemetryEvents = new Map<string, { id: string; accountId: string; serverId: string; eventName: string; targetId: string | null; metadata: Record<string, string | number | boolean | null> }>();
  const apiRequestLogs: Array<{ traceId: string; method: string; path: string; statusCode: number; durationMs: number }> = [];
  const seasonConfig = {
    id: "season-ai-agent-2026",
    name: "AI Agent 元年",
    theme: "用产品增长和现金流穿越新风口。",
    startDate: "2026-05-01",
    endDate: "2026-05-30",
    passPricePlatformCoins: 880
  };
  const seasonTasks = [
    { id: "season-daily-project", title: "推进一次风口项目", description: "完成一次项目或产品推进。", target: 1, rewardPoints: 120 }
  ];
  const activityConfigs = [
    { id: "ai-agent-growth", name: "AI Agent 风口榜", startDate: "2026-05-01", endDate: "2026-05-20", leaderboardKey: "activity-ai-agent-growth", targetScore: 200, rewardCash: 120000, rewardReputation: 600, rewardPoints: 260, rewardTitleId: "season-ai-pioneer" }
  ];
  const activityShopItems = [
    { id: "activity-risk-insurance", name: "风口风险保险", costPoints: 180, summary: "降低一次经营波动。", rewardActionPower: 30, rewardReputation: 120, purchaseLimit: 1 }
  ];
  const scenarioConfigs = [
    { id: "cashflow-rescue", name: "现金流 15 天救援", summary: "现金紧张、负债率高、员工波动和客户延期付款。", rewardCash: 90000, rewardReputation: 500, rewardTitleId: "cashflow-master" }
  ];
  const seasonProgresses = new Map<string, { points: number }>();
  const seasonTaskProgresses = new Map<string, { progress: number; claimedAt: string | null }>();
  const seasonPassPurchases = new Map<string, { profileId: string; seasonId: string; requestId: string; pricePlatformCoins: number }>();
  const activityStates = new Map<string, { profileId: string; activityId: string; isJoined: boolean; score: number; rewardClaimedAt: string | null }>();
  const activityShopPurchases = new Map<string, { profileId: string; itemId: string; requestId: string; costPoints: number }>();
  const scenarioRuns = new Map<string, { id: string; profileId: string; scenarioId: string; choices: string[]; score: number | null; grade: string | null; rewardClaimed: boolean }>();
  const seasonStatus = (startDate: string, endDate: string, today: string) => today < startDate ? "upcoming" : today > endDate ? "ended" : "active";
  const seasonKey = (profileId: string) => `${profileId}:${seasonConfig.id}`;
  const seasonTaskKey = (profileId: string, taskId: string) => `${profileId}:${taskId}`;
  const activityKey = (profileId: string, activityId: string) => `${profileId}:${activityId}`;
  const toRandomTask = (
    profileId: string,
    config: (typeof randomTaskConfigs)[number],
    today: string
  ): RandomTaskCenterRecord["tasks"][number] => ({
    id: `${profileId}:${today}:${config.id}`,
    configId: config.id,
    category: config.category,
    title: config.title,
    description: config.description,
    source: config.source,
    status: "pending",
    dailyDate: today,
    riskLabel: config.riskLabel,
    expiresAt: `${today}T23:59:59.000Z`,
    selectedOption: null,
    resultSummary: null,
    knowledge: toKnowledgeLinkRecord(profileId, config.knowledgeId),
    options: [
      {
        key: "A",
        label: config.optionALabel,
        actionPowerCost: Math.abs(Math.min(config.optionAActionPower, 0)),
        cashReward: config.optionACash,
        reputationReward: config.optionAReputation,
        companyExperienceReward: config.optionACompanyExperience,
        result: config.optionAResult
      },
      {
        key: "B",
        label: config.optionBLabel,
        actionPowerCost: Math.abs(Math.min(config.optionBActionPower, 0)),
        cashReward: config.optionBCash,
        reputationReward: config.optionBReputation,
        companyExperienceReward: config.optionBCompanyExperience,
        result: config.optionBResult
      }
    ]
  });
  const toSeasonCenter = (profile: PlayerProfileRecord, today: string) => {
    const progress = seasonProgresses.get(seasonKey(profile.id)) ?? { points: 0 };
    const wallet = ensureWallet(profile);
    const activityRows = (activityId: string) => [...activityStates.values()]
      .filter((state) => state.activityId === activityId && state.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((state, index) => {
        const rowProfile = [...profiles.values()].find((item) => item.id === state.profileId)!;
        return { rank: index + 1, profileId: state.profileId, founderName: rowProfile.founderName, companyName: rowProfile.companyName, value: state.score, valueLabel: `活动积分 ${state.score}`, equippedTitle: null };
      });
    const boards = activityConfigs
      .filter((activity) => seasonStatus(activity.startDate, activity.endDate, today) === "active")
      .map((activity) => ({
        key: activity.leaderboardKey,
        name: activity.name,
        scope: "activity" as const,
        isActive: true,
        rows: activityRows(activity.id),
        snapshotDate: today
      }));
    const activityRecaps = activityConfigs
      .filter((activity) => seasonStatus(activity.startDate, activity.endDate, today) === "ended")
      .map((activity) => {
        const rows = activityRows(activity.id);
        const personalRow = rows.find((row) => row.profileId === profile.id);
        const state = activityStates.get(activityKey(profile.id, activity.id));
        return {
          activityId: activity.id,
          name: activity.name,
          status: "ended" as const,
          startDate: activity.startDate,
          endDate: activity.endDate,
          isSettled: [...leaderboardRewards].some((key) => key.includes(`:${activity.leaderboardKey}:${activity.endDate}`)),
          personalRank: personalRow?.rank ?? null,
          personalScore: state?.score ?? 0,
          rows
        };
      });
    return {
      season: {
        id: seasonConfig.id,
        name: seasonConfig.name,
        theme: seasonConfig.theme,
        status: seasonStatus(seasonConfig.startDate, seasonConfig.endDate, today),
        startDate: seasonConfig.startDate,
        endDate: seasonConfig.endDate,
        points: progress.points,
        pass: {
          isPurchased: [...seasonPassPurchases.values()].some((purchase) => purchase.profileId === profile.id && purchase.seasonId === seasonConfig.id),
          pricePlatformCoins: seasonConfig.passPricePlatformCoins
        }
      },
      tasks: seasonTasks.map((task) => {
        const state = seasonTaskProgresses.get(seasonTaskKey(profile.id, task.id));
        return { ...task, progress: state?.progress ?? 0, isClaimed: state?.claimedAt !== null && state?.claimedAt !== undefined };
      }),
      activities: activityConfigs.map((activity) => {
        const state = activityStates.get(activityKey(profile.id, activity.id));
        return { id: activity.id, name: activity.name, status: seasonStatus(activity.startDate, activity.endDate, today), isJoined: state?.isJoined ?? false, score: state?.score ?? 0, targetScore: activity.targetScore, rewardClaimed: state?.rewardClaimedAt !== null && state?.rewardClaimedAt !== undefined };
      }),
      activityBoards: boards,
      activityRecaps,
      shopItems: activityShopItems.map((item) => {
        const count = [...activityShopPurchases.values()].filter((purchase) => purchase.profileId === profile.id && purchase.itemId === item.id).length;
        const limitReached = item.purchaseLimit > 0 && count >= item.purchaseLimit;
        return { id: item.id, name: item.name, costPoints: item.costPoints, summary: item.summary, isAvailable: !limitReached && progress.points >= item.costPoints, lockedReason: limitReached ? "兑换次数已达上限" : progress.points >= item.costPoints ? null : "赛季积分不足" };
      }),
      scenarios: scenarioConfigs.map((scenario) => ({ id: scenario.id, name: scenario.name, summary: scenario.summary, bestScore: [...scenarioRuns.values()].filter((run) => run.profileId === profile.id && run.scenarioId === scenario.id && run.score !== null).reduce<number | null>((best, run) => Math.max(best ?? 0, run.score ?? 0), null) })),
      wallet
    };
  };
  const ensureWallet = (profile: PlayerProfileRecord): PlatformWalletRecord => {
    const existing = wallets.get(profile.id);
    if (existing !== undefined) {
      return existing;
    }
    const wallet: PlatformWalletRecord = {
      profileId: profile.id,
      balance: profile.platformCoins,
      totalSpent: 0,
      vipExperience: 0,
      ledgers: []
    };
    wallets.set(profile.id, wallet);
    walletLedgers.set(profile.id, wallet.ledgers);
    return wallet;
  };
  const addLedger = (
    profileId: string,
    changeAmount: number,
    balanceAfter: number,
    source: PlatformCoinLedgerSource,
    referenceId: string | null,
    reason: string
  ) => {
    const ledger = {
      id: randomUUID(),
      changeAmount,
      balanceAfter,
      source,
      referenceId,
      reason,
      createdAt: new Date().toISOString()
    };
    const ledgers = walletLedgers.get(profileId) ?? [];
    ledgers.unshift(ledger);
    walletLedgers.set(profileId, ledgers);
    const wallet = wallets.get(profileId);
    if (wallet !== undefined) {
      wallet.ledgers = ledgers.slice(0, 20);
    }
  };
  const productPurchaseCount = (profileId: string, productId: string): number =>
    [...shopPurchases.values()].filter((purchase) => purchase.profileId === profileId && purchase.productId === productId).length;
  const toShopProduct = (
    profile: PlayerProfileRecord,
    product: (typeof shopProducts)[number]
  ): ShopCenterRecord["products"][number] => {
    const wallet = ensureWallet(profile);
    const limitReached = product.purchaseLimit > 0 && productPurchaseCount(profile.id, product.id) >= product.purchaseLimit;
    const hasEnoughCoins = wallet.balance >= product.pricePlatformCoins;
    return {
      ...product,
      isAvailable: !limitReached && hasEnoughCoins,
      lockedReason: limitReached ? "购买次数已达上限" : !hasEnoughCoins ? "平台币不足" : null
    };
  };
  const toShopCenter = (profile: PlayerProfileRecord): ShopCenterRecord => ({
    wallet: ensureWallet(profile),
    products: shopProducts.map((product) => toShopProduct(profile, product)),
    purchases: [...shopPurchases.values()]
      .filter((purchase) => purchase.profileId === profile.id)
      .map(({ profileId: _profileId, ...purchase }) => purchase)
  });
  const toVipCenter = (profile: PlayerProfileRecord, today: string): VipCenterRecord => {
    const wallet = ensureWallet(profile);
    const currentLevel = [...vipLevels].reverse().find((level) => wallet.vipExperience >= level.requiredExperience) ?? vipLevels[0];
    const nextLevel = vipLevels.find((level) => level.requiredExperience > currentLevel.requiredExperience) ?? null;
    const progressToNextBasisPoints =
      nextLevel === null
        ? 10000
        : Math.floor(((wallet.vipExperience - currentLevel.requiredExperience) * 10000) / Math.max(1, nextLevel.requiredExperience - currentLevel.requiredExperience));

    return {
      wallet,
      currentLevel,
      nextLevel,
      progressToNextBasisPoints,
      benefits: {
        title: currentLevel.title,
        avatarFrame: currentLevel.avatarFrame,
        actionPowerLimit: Math.max(profile.actionPowerLimit, 120 + currentLevel.actionPowerLimitBonus),
        quickSettleTimes: currentLevel.quickSettleTimes,
        trainingQueueBonus: currentLevel.trainingQueueBonus,
        recruitRefreshTimes: currentLevel.recruitRefreshTimes,
        shopDiscountBasisPoints: currentLevel.shopDiscountBasisPoints
      },
      dailyGift: {
        date: today,
        isClaimed: vipDailyGifts.has(`${profile.id}:${today}`),
        rewardPlatformCoins: currentLevel.dailyGiftPlatformCoins,
        rewardActionPower: currentLevel.dailyGiftActionPower
      }
    };
  };
  const titleKey = (profileId: string, titleId: string) => `${profileId}:${titleId}`;
  const achievementKey = (profileId: string, achievementId: string) => `${profileId}:${achievementId}`;
  const knowledgeKey = (profileId: string, knowledgeId: string) => `${profileId}:${knowledgeId}`;
  const isExpired = (expiresAt: string | null, today: string) => expiresAt !== null && expiresAt.slice(0, 10) < today;
  const addTitle = (profileId: string, titleId: string, source: string, today = "2026-05-01") => {
    const config = titleConfigs.find((item) => item.id === titleId);
    if (config === undefined) {
      return;
    }
    const expiresAt = config.durationDays > 0 ? new Date(Date.parse(`${today}T00:00:00.000Z`) + config.durationDays * 86400000).toISOString() : null;
    const key = titleKey(profileId, titleId);
    if (!playerTitles.has(key)) {
      playerTitles.set(key, { profileId, titleId, source, obtainedAt: `${today}T00:00:00.000Z`, expiresAt });
    }
  };
  const unlockKnowledgeEntry = (profileId: string, knowledgeId: string | null, source: string) => {
    if (knowledgeId === null) {
      return;
    }
    const key = knowledgeKey(profileId, knowledgeId);
    if (!knowledgeUnlocks.has(key)) {
      knowledgeUnlocks.set(key, { profileId, knowledgeId, source, unlockedAt: new Date().toISOString() });
    }
  };
  const readAchievementProgress = (profile: PlayerProfileRecord, conditionKind: string) =>
    conditionKind === "profile_created"
      ? 1
      : conditionKind === "positive_cashflow"
        ? profile.monthlyIncome > profile.monthlyExpense ? 1 : 0
        : conditionKind === "valuation"
          ? profile.valuation
          : 0;
  const syncAchievements = (profile: PlayerProfileRecord) => {
    for (const config of achievementConfigs) {
      const key = achievementKey(profile.id, config.id);
      const existing = achievements.get(key);
      const progress = readAchievementProgress(profile, config.conditionKind);
      achievements.set(key, {
        profileId: profile.id,
        achievementId: config.id,
        progress: Math.max(existing?.progress ?? 0, progress),
        completedAt: existing?.completedAt ?? (progress >= config.conditionValue ? new Date().toISOString() : null),
        claimedAt: existing?.claimedAt ?? null
      });
    }
  };
  const toTitleCenter = (profile: PlayerProfileRecord, today: string): TitleCenterRecord => {
    syncAchievements(profile);
    for (const achievement of achievements.values()) {
      if (achievement.profileId === profile.id && achievement.completedAt !== null) {
        const config = achievementConfigs.find((item) => item.id === achievement.achievementId);
        if (config?.rewardTitleId !== null && config?.rewardTitleId !== undefined) {
          addTitle(profile.id, config.rewardTitleId, "achievement", today);
        }
      }
    }
    const titles = [...playerTitles.values()]
      .filter((title) => title.profileId === profile.id)
      .map((title) => {
        const config = titleConfigs.find((item) => item.id === title.titleId);
        return {
          id: title.titleId,
          name: config?.name ?? title.titleId,
          category: config?.category ?? "growth",
          source: title.source,
          bonusLabel: config?.bonusLabel ?? "身份展示",
          obtainedAt: title.obtainedAt,
          expiresAt: title.expiresAt,
          isEquipped: titleEquipment.get(profile.id) === title.titleId,
          isExpired: isExpired(title.expiresAt, today)
        };
      });
    return {
      equippedTitle: titles.find((title) => title.isEquipped && !title.isExpired) ?? null,
      titles
    };
  };
  const toAchievement = (profile: PlayerProfileRecord, config: (typeof achievementConfigs)[number]): AchievementRecord => {
    const progress = achievements.get(achievementKey(profile.id, config.id));
    const isCompleted = progress?.completedAt !== null && progress?.completedAt !== undefined;
    return {
      id: config.id,
      name: config.name,
      category: config.category,
      description: config.description,
      progress: Math.min(progress?.progress ?? 0, config.conditionValue),
      target: config.conditionValue,
      isHidden: config.isHidden && !isCompleted,
      isCompleted,
      isClaimed: progress?.claimedAt !== null && progress?.claimedAt !== undefined,
      rewardLabel: "资金/行动力/称号/知识卡"
    };
  };
  const buildLeaderboards = (serverId: string, today: string): LeaderboardCenterRecord => {
    const rowsFor = (key: string) => [...profiles.values()]
      .filter((profile) => profile.serverId === serverId)
      .map((profile) => {
        const productGrowth = productsForProfile(profile.id).reduce((total, product) => total + product.users + product.monthlyRevenue, 0);
        const member = guildMembers.get(profile.id);
        const value =
          key === "company-value"
            ? profile.valuation
            : key === "cashflow"
              ? profile.monthlyIncome - profile.monthlyExpense
              : key === "product-growth"
                ? productGrowth
                : member?.contributionScore ?? 0;
        return {
          rank: 0,
          profileId: profile.id,
          founderName: profile.founderName,
          companyName: profile.companyName,
          value,
          valueLabel: `${value.toLocaleString("zh-CN")}`,
          equippedTitle: toTitleCenter(profile, today).equippedTitle?.name ?? null
        };
      })
      .sort((left, right) => right.value - left.value)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    const activityBoards = activityConfigs
      .filter((activity) => seasonStatus(activity.startDate, activity.endDate, today) === "active")
      .map((activity) => ({
        key: activity.leaderboardKey,
        name: activity.name,
        scope: "activity" as const,
        isActive: true,
        rows: [...activityStates.values()]
          .filter((state) => state.activityId === activity.id && state.score > 0)
          .sort((left, right) => right.score - left.score)
          .map((state, index) => {
            const rowProfile = getProfileById(state.profileId)!;
            return { rank: index + 1, profileId: state.profileId, founderName: rowProfile.founderName, companyName: rowProfile.companyName, value: state.score, valueLabel: `活动积分 ${state.score}`, equippedTitle: toTitleCenter(rowProfile, today).equippedTitle?.name ?? null };
          }),
        snapshotDate: today
      }));

    return {
      boards: [
        { key: "company-value", name: "公司估值榜", scope: "server", isActive: true, rows: rowsFor("company-value"), snapshotDate: today },
        { key: "cashflow", name: "现金流榜", scope: "server", isActive: true, rows: rowsFor("cashflow"), snapshotDate: today },
        { key: "product-growth", name: "产品增长榜", scope: "server", isActive: true, rows: rowsFor("product-growth"), snapshotDate: today },
        { key: "guild", name: "商会榜", scope: "server", isActive: true, rows: rowsFor("guild"), snapshotDate: today }
      ],
      activityBoards
    };
  };
  const buildCrossServerCenter = (profile: PlayerProfileRecord, today: string): CrossServerCenterRecord | "CROSS_SERVER_GROUP_NOT_FOUND" => {
    const group = crossServerGroups.find((item) => item.serverIds.includes(profile.serverId));
    if (group === undefined) {
      return "CROSS_SERVER_GROUP_NOT_FOUND";
    }
    const seasonRequirements = { minMembers: 2, minTodayActiveMembers: 2, rewardLabel: "前 3 名会长获得声望 180/120/80" };
    const rowsFor = (key: string) => [...profiles.values()]
      .filter((item) => group.serverIds.includes(item.serverId))
      .map((item) => {
        const member = guildMembers.get(item.id);
        const value = key === "cross-guild" ? member?.contributionScore ?? 0 : item.valuation;
        return {
          rank: 0,
          profileId: item.id,
          founderName: item.founderName,
          companyName: item.companyName,
          value,
          valueLabel: `${value.toLocaleString("zh-CN")}`,
          equippedTitle: toTitleCenter(item, today).equippedTitle?.name ?? null
        };
      })
      .sort((left, right) => right.value - left.value)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    const member = guildMembers.get(profile.id);
    const guild = member === undefined ? undefined : guilds.get(member.guildId);
    const members = member === undefined ? [] : [...guildMembers.values()].filter((item) => item.guildId === member.guildId);
    const todayActiveMemberCount = member === undefined ? 0 : new Set([...guildActivityLogs.values()]
      .filter((activity) => activity.guildId === member.guildId && activity.createdAt.slice(0, 10) === today)
      .map((activity) => activity.profileId)).size;
    const isManager = member?.role === "leader" || member?.role === "vice_leader";
    const meetsRequirements = members.length >= seasonRequirements.minMembers && todayActiveMemberCount >= seasonRequirements.minTodayActiveMembers;
    const guildRows = [...crossServerGuildSignups]
      .map((key) => {
        const [guildId, groupId] = key.split("|");
        const signedGuild = guilds.get(guildId ?? "");
        if (groupId !== group.id || signedGuild === undefined || !group.serverIds.includes(signedGuild.serverId)) {
          return null;
        }
        const signedMembers = [...guildMembers.values()].filter((item) => item.guildId === signedGuild.id);
        const leader = signedMembers.find((item) => item.role === "leader") ?? signedMembers[0];
        const leaderProfile = leader === undefined ? undefined : getProfileById(leader.profileId);
        if (leader === undefined || leaderProfile === undefined) {
          return null;
        }
        return {
          rank: 0,
          guildId: signedGuild.id,
          guildName: signedGuild.name,
          serverId: signedGuild.serverId,
          leaderProfileId: leader.profileId,
          leaderFounderName: leaderProfile.founderName,
          memberCount: signedMembers.length,
          value: signedGuild.contributionScore,
          valueLabel: `跨服贡献 ${signedGuild.contributionScore.toLocaleString("zh-CN")}`
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((left, right) => right.value - left.value)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return {
      group,
      isRegistered: crossServerSignups.has(`${profile.id}:${group.id}`),
      boards: [
        { key: "cross-company-value", name: "跨服创业大赛榜", scope: "cross", isActive: true, rows: rowsFor("cross-company-value"), snapshotDate: today },
        { key: "cross-guild", name: "跨服商会榜", scope: "cross", isActive: true, rows: rowsFor("cross-guild"), snapshotDate: today }
      ],
      guildSeason: {
        isGuildMember: member !== undefined,
        isManager,
        isRegistered: member !== undefined && crossServerGuildSignups.has(`${member.guildId}|${group.id}`),
        canRegister: member !== undefined && isManager && meetsRequirements,
        guildId: member?.guildId ?? null,
        guildName: guild?.name ?? null,
        memberCount: members.length,
        todayActiveMemberCount,
        minMembers: seasonRequirements.minMembers,
        minTodayActiveMembers: seasonRequirements.minTodayActiveMembers,
        rewardLabel: seasonRequirements.rewardLabel,
        statusLabel: member !== undefined && crossServerGuildSignups.has(`${member.guildId}|${group.id}`) ? "已报名" : meetsRequirements ? "可报名" : "未达标"
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
  };
  const guildTechUpgradeCost = (currentLevel: number): number | null =>
    currentLevel >= 5 ? null : [40, 120, 240, 400, 600][currentLevel] ?? null;
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
    { id: "joint-roadshow", name: "联合路演", description: "成员通过互助、任务和科技推进路演材料共创。", target: 3, rewardReputation: 60 },
    { id: "risk-review-week", name: "风险复核周", description: "集中完成合同、资金和运营风险复核协作。", target: 6, rewardReputation: 80 },
    { id: "market-co-creation", name: "市场共创", description: "围绕市场洞察和增长策略沉淀商会共创成果。", target: 8, rewardReputation: 100 }
  ];
  const advanceGuildProjects = (guildId: string): void => {
    for (const project of guildProjectConfigs) {
      const key = `${guildId}:${project.id}`;
      const progress = guildProjectProgresses.get(key) ?? { guildId, projectId: project.id, progress: 0, claimedAt: null };
      progress.progress += 1;
      guildProjectProgresses.set(key, progress);
    }
  };
  const getProfileById = (profileId: string): PlayerProfileRecord | undefined =>
    [...profiles.values()].find((profile) => profile.id === profileId);
  const toGuildCenter = (profile: PlayerProfileRecord, today = "2026-05-01"): GuildCenterRecord => {
    const member = guildMembers.get(profile.id);
    if (member === undefined) {
      return { guild: null, members: [], joinRequests: [], tasks: [], techs: [], helpRequests: [], projects: [], todayActiveMemberCount: 0, todayCollaborationCount: 0, recentActivities: [], leaderboard: [] };
    }
    const guild = guilds.get(member.guildId);
    const members = [...guildMembers.values()].filter((item) => item.guildId === member.guildId);
    const joinRequests = [...guildJoinRequests.values()].filter((request) => request.guildId === member.guildId && request.status === "pending");
    const todayHelpCount = [...guildHelpRequests.values()].filter((request) =>
      request.guildId === member.guildId && (request.createdAt.slice(0, 10) === today || request.fulfilledAt?.slice(0, 10) === today)
    ).length;
    const todayActivities = [...guildActivityLogs.values()].filter((activity) => activity.guildId === member.guildId && activity.createdAt.slice(0, 10) === today);
    const isHelpClaimed = guildTaskClaims.get(`${member.guildId}:guild-daily-help`)?.claimedAt.slice(0, 10) === today;
    const sharedOfficeLevel = guildTechStates.get(`${member.guildId}:shared-office`)?.level ?? 0;
    const upgradeCost = guildTechUpgradeCost(sharedOfficeLevel);
    return {
      guild: guild === undefined ? null : { id: guild.id, name: guild.name, level: guild.level, contributionScore: guild.contributionScore, announcement: guild.announcement, collaborationRules: guild.collaborationRules },
      members: members.map((item) => {
        const memberProfile = getProfileById(item.profileId);
        return {
          profileId: item.profileId,
          founderName: memberProfile?.founderName ?? "",
          companyName: memberProfile?.companyName ?? "",
          role: item.role,
          contributionScore: item.contributionScore
        };
      }),
      joinRequests: member.role === "leader" || member.role === "vice_leader"
        ? joinRequests.map((request) => {
          const requestProfile = getProfileById(request.profileId);
          return {
            id: request.id,
            profileId: request.profileId,
            founderName: requestProfile?.founderName ?? "",
            companyName: requestProfile?.companyName ?? "",
            status: request.status,
            createdAt: request.createdAt
          };
        })
        : [],
      tasks: [{ id: "guild-daily-help", title: "成员互助", description: "发布或完成一次商会协作。", progress: Math.min(todayHelpCount, 1), target: 1, contributionReward: 20, isClaimed: isHelpClaimed, isClaimable: todayHelpCount >= 1 && !isHelpClaimed }],
      techs: [{ id: "shared-office", name: "联合办公", description: "提升商会成员协作效率展示。", level: sharedOfficeLevel, maxLevel: 5, upgradeCost, isUpgradable: upgradeCost !== null && (guild?.contributionScore ?? 0) >= upgradeCost, bonusLabel: sharedOfficeLevel <= 0 ? "待激活" : `协作效率 +${sharedOfficeLevel * 2}%` }],
      helpRequests: [...guildHelpRequests.values()].filter((request) => request.guildId === member.guildId).map((request) => {
        const requestProfile = getProfileById(request.profileId);
        return {
          id: request.id,
          profileId: request.profileId,
          founderName: requestProfile?.founderName ?? "",
          companyName: requestProfile?.companyName ?? "",
          requestType: request.requestType,
          status: request.status,
          createdAt: request.createdAt,
          fulfilledAt: request.fulfilledAt,
          canFulfill: request.status === "open" && request.profileId !== profile.id
        };
      }),
      projects: guildProjectConfigs.map((project) => {
        const progress = guildProjectProgresses.get(`${member.guildId}:${project.id}`);
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
      todayActiveMemberCount: new Set(todayActivities.map((activity) => activity.profileId)).size,
      todayCollaborationCount: todayActivities.length,
      recentActivities: [...guildActivityLogs.values()]
        .filter((activity) => activity.guildId === member.guildId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
        .slice(0, 6)
        .map((activity) => {
          const activityProfile = getProfileById(activity.profileId);
          return {
            id: activity.id,
            profileId: activity.profileId,
            founderName: activityProfile?.founderName ?? "",
            action: activity.action,
            actionLabel: guildActivityLabel(activity.action),
            createdAt: activity.createdAt
          };
        }),
      leaderboard: members
        .sort((left, right) => right.contributionScore - left.contributionScore)
        .map((item, index) => {
          const memberProfile = getProfileById(item.profileId);
          return {
            rank: index + 1,
            profileId: item.profileId,
            founderName: memberProfile?.founderName ?? "",
            companyName: memberProfile?.companyName ?? "",
            value: item.contributionScore,
            valueLabel: `${item.contributionScore}`,
            equippedTitle: null
          };
      })
    };
  };
  const toGuildHistory = (profile: PlayerProfileRecord): GuildHistoryRecord | "GUILD_NOT_JOINED" => {
    const member = guildMembers.get(profile.id);
    if (member === undefined) {
      return "GUILD_NOT_JOINED";
    }
    const guild = guilds.get(member.guildId);
    if (guild === undefined) {
      return "GUILD_NOT_JOINED";
    }
    const currentTopMembers = [...guildMembers.values()]
      .filter((item) => item.guildId === guild.id)
      .sort((left, right) => right.contributionScore - left.contributionScore)
      .slice(0, 3)
      .map((item, index) => {
        const memberProfile = getProfileById(item.profileId);
        return {
          profileId: item.profileId,
          founderName: memberProfile?.founderName ?? "",
          companyName: memberProfile?.companyName ?? "",
          rank: index + 1,
          contributionScore: item.contributionScore,
          reputationReward: [120, 80, 50][index] ?? 0
        };
      });
    const deliveries = guildLeaderboardDeliveries.filter((delivery) => delivery.guildId === guild.id && delivery.serverId === guild.serverId);
    const snapshotDates = [...new Set(deliveries.map((delivery) => delivery.snapshotDate))].sort((left, right) => right.localeCompare(left));
    return {
      guild: { id: guild.id, name: guild.name, serverId: guild.serverId },
      currentTopMembers,
      settlements: snapshotDates.map((snapshotDate) => {
        const rows = deliveries.filter((delivery) => delivery.snapshotDate === snapshotDate).sort((left, right) => left.rank - right.rank);
        return {
          snapshotDate,
          deliveredRewards: rows.length,
          topMembers: rows.map((delivery) => {
            const deliveryProfile = getProfileById(delivery.profileId);
            return {
              profileId: delivery.profileId,
              founderName: deliveryProfile?.founderName ?? "",
              companyName: deliveryProfile?.companyName ?? "",
              rank: delivery.rank,
              contributionScore: guildMembers.get(delivery.profileId)?.contributionScore ?? 0,
              reputationReward: delivery.reputationReward
            };
          })
        };
      })
    };
  };
  const toCrossServerGuildHistory = (profile: PlayerProfileRecord): CrossServerGuildHistoryRecord | "CROSS_SERVER_GROUP_NOT_FOUND" | "GUILD_NOT_JOINED" => {
    const group = crossServerGroups.find((item) => item.serverIds.includes(profile.serverId));
    if (group === undefined) {
      return "CROSS_SERVER_GROUP_NOT_FOUND";
    }
    const member = guildMembers.get(profile.id);
    if (member === undefined) {
      return "GUILD_NOT_JOINED";
    }
    const guild = guilds.get(member.guildId);
    if (guild === undefined) {
      return "GUILD_NOT_JOINED";
    }
    const deliveries = crossGuildLeaderboardDeliveries.filter((delivery) => delivery.groupId === group.id);
    const snapshotDates = [...new Set(deliveries.map((delivery) => delivery.snapshotDate))].sort((left, right) => right.localeCompare(left));
    return {
      guild: { id: guild.id, name: guild.name, serverId: guild.serverId },
      group,
      isRegistered: crossServerGuildSignups.has(`${guild.id}|${group.id}`),
      settlements: snapshotDates.map((snapshotDate) => {
        const rows = deliveries.filter((delivery) => delivery.snapshotDate === snapshotDate).sort((left, right) => left.rank - right.rank);
        const topGuilds = rows.map((delivery) => {
          const settledGuild = guilds.get(delivery.guildId);
          const leaderProfile = getProfileById(delivery.profileId);
          return {
            guildId: delivery.guildId,
            guildName: settledGuild?.name ?? "",
            serverId: settledGuild?.serverId ?? delivery.serverId,
            leaderProfileId: delivery.profileId,
            leaderFounderName: leaderProfile?.founderName ?? "",
            rank: delivery.rank,
            reputationReward: delivery.reputationReward
          };
        });
        return {
          snapshotDate,
          deliveredRewards: rows.length,
          finalRank: topGuilds.find((row) => row.guildId === guild.id)?.rank ?? null,
          topGuilds
        };
      })
    };
  };

  return {
    async createAccount(account) {
      if (accounts.has(account.username)) {
        return "ACCOUNT_EXISTS";
      }

      const created: AccountRecord = {
        id: randomUUID(),
        ...account
      };
      accounts.set(created.username, created);
      return created;
    },
    async findAccountByUsername(username) {
      return accounts.get(username);
    },
    async createAccountSession(accountId, token) {
      accountSessions.set(token, accountId);
    },
    async getAccountBySessionToken(token) {
      const accountId = accountSessions.get(token);
      return [...accounts.values()].find((account) => account.id === accountId);
    },
    async recordTelemetryEvent(event) {
      const profile = profiles.get(`${event.accountId}:${event.serverId}`);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const id = randomUUID();
      telemetryEvents.set(id, { id, ...event });
      return { eventId: id };
    },
    async getAdminAnalytics() {
      const allProfiles = [...profiles.values()];
      const tutorialSteps = new Map<string, number>();
      for (const event of telemetryEvents.values()) {
        if (event.eventName !== "tutorial_step") {
          continue;
        }
        const step = typeof event.metadata.step === "string" ? event.metadata.step : event.targetId ?? "unknown";
        tutorialSteps.set(step, (tutorialSteps.get(step) ?? 0) + 1);
      }
      const eventChoices = [...playerEvents.values()].filter((event) => event.selectedOption !== null);
      const optionCounts = new Map<string, number>();
      for (const event of eventChoices) {
        const option = event.selectedOption ?? "unknown";
        optionCounts.set(option, (optionCounts.get(option) ?? 0) + 1);
      }
      const projectSettled = [...projects.values()].filter((project) => project.status === "settled" || project.status === "failed");
      const projectFailed = projectSettled.filter((project) => project.status === "failed").length;
      const funded = [...playerFundings.values()].filter((funding) => funding.status === "funded" || funding.status === "failed");
      const employeesAll = [...employees.values()];
      const shopClickCount = [...telemetryEvents.values()].filter((event) => event.eventName === "shop_product_click").length;
      return {
        overview: {
          totalPlayers: allProfiles.length,
          retainedPlayers: allProfiles.filter((profile) => profile.operatingDay > 1).length,
          apiErrorCount: apiRequestLogs.filter((log) => log.statusCode >= 500).length,
          slowApiCount: apiRequestLogs.filter((log) => log.durationMs >= 1000).length
        },
        onboarding: {
          tutorialSteps: [...tutorialSteps.entries()].map(([step, count]) => ({ step, count }))
        },
        business: {
          taskCompletionRateBasisPoints: 0,
          achievementCompletionRateBasisPoints: 0,
          knowledgeViewRateBasisPoints: 0,
          eventChoiceRates: [...optionCounts.entries()].map(([option, count]) => ({
            option,
            count,
            rateBasisPoints: eventChoices.length === 0 ? 0 : Math.round((count / eventChoices.length) * 10000)
          })),
          projectFailureRateBasisPoints: projectSettled.length === 0 ? 0 : Math.round((projectFailed / projectSettled.length) * 10000),
          debtRatioDistribution: [
            { band: "0-30%", count: allProfiles.length },
            { band: "30-60%", count: 0 },
            { band: "60-90%", count: 0 },
            { band: "90%+", count: 0 }
          ],
          fundingSuccessRateBasisPoints: funded.length === 0 ? 0 : Math.round((funded.filter((funding) => funding.status === "funded").length / funded.length) * 10000),
          employeeDepartureRateBasisPoints: employeesAll.length === 0 ? 0 : Math.round((employeesAll.filter((employee) => !employee.isActive).length / employeesAll.length) * 10000)
        },
        monetization: {
          platformCoinBalanceTotal: allProfiles.reduce((total, profile) => total + profile.platformCoins, 0),
          platformCoinGrantedTotal: 0,
          platformCoinSpentTotal: 0,
          vipLevelDistribution: [{ level: 0, count: allProfiles.length }],
          shopClickCount,
          shopPurchaseConversionBasisPoints: shopClickCount === 0 ? 0 : Math.round((shopPurchases.size / shopClickCount) * 10000)
        },
        alerts: [
          { level: "info", message: "平台币异常变动监控：发放 0，消耗 0", traceId: null },
          { level: "info", message: "外部支付异常预留告警：待处理订单 0 条", traceId: null }
        ]
      };
    },
    async recordApiRequestLog(input) {
      apiRequestLogs.push(input);
    },
    async findAdminByUsername(username) {
      return admins.get(username);
    },
    async createAdminSession(adminUserId, token) {
      adminSessions.set(token, adminUserId);
    },
    async getAdminBySessionToken(token) {
      const adminUserId = adminSessions.get(token);
      return [...admins.values()].find((admin) => admin.id === adminUserId);
    },
    async listAdminPlayers(keyword, today) {
      const trimmedKeyword = keyword.trim();
      const rows = [...profiles.values()]
        .filter((profile) => {
          if (trimmedKeyword === "") {
            return true;
          }
          const account = [...accounts.values()].find((item) => item.id === profile.accountId);
          const server = servers.find((item) => item.id === profile.serverId);
          return (
            profile.founderName.includes(trimmedKeyword) ||
            profile.companyName.includes(trimmedKeyword) ||
            (account?.username.includes(trimmedKeyword) ?? false) ||
            (server?.name.includes(trimmedKeyword) ?? false)
          );
        })
        .map((profile) => {
          const wallet = ensureWallet(profile);
          const vipCenter = toVipCenter(profile, today);
          const purchases = [...shopPurchases.values()].filter((purchase) => purchase.profileId === profile.id);
          return {
            profileId: profile.id,
            accountId: profile.accountId,
            username: [...accounts.values()].find((item) => item.id === profile.accountId)?.username ?? "",
            serverId: profile.serverId,
            serverName: servers.find((item) => item.id === profile.serverId)?.name ?? profile.serverId,
            founderName: profile.founderName,
            companyName: profile.companyName,
            cash: profile.cash,
            monthlyIncome: profile.monthlyIncome,
            monthlyExpense: profile.monthlyExpense,
            netCashFlow: profile.monthlyIncome - profile.monthlyExpense,
            valuation: profile.valuation,
            totalDebt: profile.totalDebt,
            riskStatus: profile.riskStatus,
            profileStatus: "active",
            walletBalance: wallet.balance,
            vipExperience: wallet.vipExperience,
            vipLevel: vipCenter.currentLevel.level,
            purchaseCount: purchases.length,
            paymentOrderCount: 0,
            titleCount: [...playerTitles.values()].filter((title) => title.profileId === profile.id).length,
            achievementCompletedCount: [...achievements.values()].filter((achievement) => achievement.profileId === profile.id && achievement.completedAt !== null).length,
            knowledgeUnlockCount: [...knowledgeUnlocks.values()].filter((knowledge) => knowledge.profileId === profile.id).length,
            guildName: null,
            createdAt: profile.createdAt
          };
        });

      return { rows };
    },
    async getAdminConfigCenter(today) {
      const rewardEntries = [...leaderboardRewards].map((key) => {
        const parts = key.split(":");
        const snapshotDate = parts.pop() ?? "";
        const boardKey = parts.pop() ?? "";
        return { boardKey, snapshotDate };
      });
      const activityRewardCount = (boardKey: string, snapshotDate: string) =>
        rewardEntries.filter((entry) => entry.boardKey === boardKey && entry.snapshotDate === snapshotDate).length;
      const settlementMap = new Map<string, { boardKey: string; snapshotDate: string; deliveredRewards: number; rewardPlatformCoinsTotal: number; rewardBoundary: string }>();
      for (const entry of rewardEntries) {
        if (!activityConfigs.some((activity) => activity.leaderboardKey === entry.boardKey)) {
          continue;
        }
        const key = `${entry.boardKey}:${entry.snapshotDate}`;
        const current = settlementMap.get(key) ?? {
          boardKey: entry.boardKey,
          snapshotDate: entry.snapshotDate,
          deliveredRewards: 0,
          rewardPlatformCoinsTotal: 0,
          rewardBoundary: "leaderboard_no_cash_no_platform_coins"
        };
        current.deliveredRewards += 1;
        settlementMap.set(key, current);
      }
      return {
        titles: titleConfigs.map((title) => ({
          id: title.id,
          name: title.name,
          category: title.category,
          source: title.source,
          bonusLabel: title.bonusLabel,
          durationDays: title.durationDays
        })),
        achievements: achievementConfigs.map((achievement) => ({
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
        leaderboardSnapshots: [],
        mailCompensations: [],
        seasons: [{
          id: seasonConfig.id,
          name: seasonConfig.name,
          status: seasonStatus(seasonConfig.startDate, seasonConfig.endDate, today),
          startDate: seasonConfig.startDate,
          endDate: seasonConfig.endDate,
          passPricePlatformCoins: seasonConfig.passPricePlatformCoins,
          taskCount: seasonTasks.length,
          activityCount: activityConfigs.length,
          passPurchaseCount: [...seasonPassPurchases.values()].filter((purchase) => purchase.seasonId === seasonConfig.id).length
        }],
        activities: activityConfigs.map((activity) => {
          const states = [...activityStates.values()].filter((state) => state.activityId === activity.id && (state.isJoined || state.score > 0));
          const deliveredRewards = activityRewardCount(activity.leaderboardKey, activity.endDate);
          return {
            id: activity.id,
            seasonId: seasonConfig.id,
            name: activity.name,
            status: seasonStatus(activity.startDate, activity.endDate, today),
            startDate: activity.startDate,
            endDate: activity.endDate,
            leaderboardKey: activity.leaderboardKey,
            targetScore: activity.targetScore,
            participantCount: states.length,
            totalScore: states.reduce((total, state) => total + state.score, 0),
            isSettled: deliveredRewards > 0,
            deliveredRewards,
            rewardLabel: `声望 +${activity.rewardReputation} / 活动积分 +${activity.rewardPoints}`,
            rewardBoundary: "leaderboard_no_cash_no_platform_coins"
          };
        }),
        activityShopItems: activityShopItems.map((item) => ({
          id: item.id,
          seasonId: seasonConfig.id,
          name: item.name,
          costPoints: item.costPoints,
          purchaseLimit: item.purchaseLimit,
          purchaseCount: [...activityShopPurchases.values()].filter((purchase) => purchase.itemId === item.id).length,
          rewardLabel: `行动力 +${item.rewardActionPower} / 声望 +${item.rewardReputation}`,
          isActive: true
        })),
        seasonPass: [{
          seasonId: seasonConfig.id,
          pricePlatformCoins: seasonConfig.passPricePlatformCoins,
          purchaseCount: [...seasonPassPurchases.values()].filter((purchase) => purchase.seasonId === seasonConfig.id).length,
          rewardLabel: "解锁赛季高级奖励轨"
        }],
        leaderboardSettlements: [...settlementMap.values()],
        scenarios: scenarioConfigs.map((scenario) => ({ id: scenario.id, name: scenario.name, rewardTitleId: scenario.rewardTitleId }))
      };
    },
    async listAdminAuditLogs(filters) {
      const parseDetail = (detail: string | null) => {
        if (detail === null) return null;
        try {
          const parsed = JSON.parse(detail) as unknown;
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
          return Object.fromEntries(Object.entries(parsed).filter(([, value]) => (
            value === null ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          )));
        } catch {
          return null;
        }
      };
      const rows = adminAuditLogs
        .filter((log) => filters.action === "" || log.action === filters.action)
        .filter((log) => filters.targetType === "" || log.targetType === filters.targetType)
        .filter((log) => filters.targetId === "" || log.targetId === filters.targetId)
        .filter((log) => filters.admin === "" || log.adminUsername.includes(filters.admin))
        .filter((log) => filters.from === "" || log.createdAt.slice(0, 10) >= filters.from)
        .filter((log) => filters.to === "" || log.createdAt.slice(0, 10) <= filters.to)
        .map((log) => {
          const detailJson = parseDetail(log.detail);
          const deliveredRewards = detailJson?.deliveredRewards;
          return {
            ...log,
            detailJson,
            summary: typeof deliveredRewards === "number"
              ? `${detailJson?.isRetry === true ? "重试" : "首次"}，发放 ${deliveredRewards} 条奖励`
              : log.detail ?? "-"
          };
        });
      return {
        rows,
        total: rows.length,
        filters: {
          actions: [...new Set(adminAuditLogs.map((log) => log.action))].sort(),
          targetTypes: [...new Set(adminAuditLogs.map((log) => log.targetType))].sort(),
          admins: [...new Set(adminAuditLogs.map((log) => log.adminUsername))].sort()
        }
      };
    },
    async listAdminKnowledgeEntries(filters) {
      const filtered = knowledgeEntries.filter((knowledge) => {
        const keywordMatched =
          filters.keyword === "" ||
          knowledge.id.includes(filters.keyword) ||
          knowledge.title.includes(filters.keyword) ||
          knowledge.summary.includes(filters.keyword);
        const categoryMatched = filters.category === "" || knowledge.category === filters.category;
        const statusMatched = filters.reviewStatus === "" || knowledge.reviewStatus === filters.reviewStatus;
        return keywordMatched && categoryMatched && statusMatched;
      });

      return {
        rows: filtered.map((knowledge, index) => ({
          ...knowledge,
          categoryId: knowledge.category,
          sortOrder: index,
          isUnlocked: true,
          unlockedAt: null
        })),
        total: filtered.length,
        categories: [...new Set(knowledgeEntries.map((knowledge) => knowledge.category))].map((category) => ({
          id: category,
          name: category
        }))
      };
    },
    async updateAdminKnowledgeEntry(_adminUserId, knowledgeId, input) {
      const knowledge = knowledgeEntries.find((entry) => entry.id === knowledgeId);
      if (knowledge === undefined) {
        return "KNOWLEDGE_NOT_FOUND";
      }

      Object.assign(knowledge, {
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
      });
      const auditLogId = `audit-knowledge-${knowledge.id}`;
      adminAuditLogs.unshift({
        id: auditLogId,
        adminUsername: "admin",
        action: "admin_knowledge_update",
        targetType: "knowledge_entry",
        targetId: knowledge.id,
        detail: input.reason,
        createdAt: new Date().toISOString()
      });

      return {
        ...knowledge,
        categoryId: knowledge.category,
        sortOrder: knowledgeEntries.indexOf(knowledge),
        isUnlocked: true,
        unlockedAt: null,
        auditLogId
      };
    },
    async grantAdminTitle(adminUserId, profileId, titleId, reason) {
      const profile = [...profiles.values()].find((item) => item.id === profileId);
      const config = titleConfigs.find((item) => item.id === titleId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      if (config === undefined) {
        return "TITLE_NOT_FOUND";
      }
      const key = titleKey(profileId, titleId);
      playerTitles.set(key, {
        profileId,
        titleId,
        source: "admin",
        obtainedAt: new Date().toISOString(),
        expiresAt: null
      });

      return {
        title: {
          id: config.id,
          name: config.name,
          category: config.category,
          source: "admin",
          bonusLabel: config.bonusLabel,
          obtainedAt: new Date().toISOString(),
          expiresAt: null,
          isEquipped: false,
          isExpired: false
        },
        auditLogId: `${adminUserId}:${profileId}:${titleId}:${reason}`
      };
    },
    async revokeAdminTitle(adminUserId, profileId, titleId, reason) {
      const profile = [...profiles.values()].find((item) => item.id === profileId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const key = titleKey(profileId, titleId);
      if (!playerTitles.has(key)) {
        return "TITLE_NOT_FOUND";
      }
      playerTitles.delete(key);
      return { auditLogId: `${adminUserId}:${profileId}:${titleId}:${reason}` };
    },
    async sendAdminMailCompensation(adminUserId, profileId, subject, body, platformCoins, reason) {
      const profile = [...profiles.values()].find((item) => item.id === profileId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const wallet = ensureWallet(profile);
      wallet.balance += platformCoins;
      profile.platformCoins = wallet.balance;
      void body;
      void reason;

      return {
        profile,
        wallet: {
          balance: wallet.balance,
          vipExperience: wallet.vipExperience,
          totalSpent: wallet.totalSpent,
          ledgers: []
        },
        auditLogId: `${adminUserId}:${profileId}:${subject}`,
        mailId: randomUUID()
      };
    },
    async updateAdminProfileStatus(adminUserId, profileId, status, reason) {
      const profile = [...profiles.values()].find((item) => item.id === profileId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      void reason;
      return {
        profileId,
        status,
        auditLogId: `${adminUserId}:${profileId}:${status}`
      };
    },
    async settleAdminLeaderboards(adminUserId, serverId, today, reason) {
      const profile = [...profiles.values()].find((item) => item.serverId === serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const deliveredRewards = 0;
      const auditLogId = `${adminUserId}:${serverId}:${reason}`;
      adminAuditLogs.unshift({
        id: auditLogId,
        adminUsername: "admin",
        action: "admin_leaderboard_settle",
        targetType: "leaderboard",
        targetId: serverId,
        detail: JSON.stringify({ serverId, today, reason, deliveredRewards, isRetry: true, rewardBoundary: "no_cash_no_platform_coins" }),
        createdAt: new Date().toISOString()
      });
      return {
        leaderboard: buildLeaderboards(serverId, today),
        deliveredRewards,
        auditLogId
      };
    },
    async listAdminCrossServerGroups() {
      return {
        groups: crossServerGroups.map((group) => ({
          ...group,
          isActive: true
        }))
      };
    },
    async assignAdminCrossServerGroup(adminUserId, serverId, groupId, reason) {
      const group = crossServerGroups.find((item) => item.id === groupId);
      if (!servers.some((server) => server.id === serverId)) {
        return "SERVER_NOT_FOUND";
      }
      if (group === undefined) {
        return "CROSS_SERVER_GROUP_NOT_FOUND";
      }
      for (const item of crossServerGroups) {
        item.serverIds = item.serverIds.filter((id) => id !== serverId);
      }
      group.serverIds.push(serverId);

      return {
        group: {
          ...group,
          isActive: true
        },
        auditLogId: `${adminUserId}:${groupId}:${serverId}:${reason}`
      };
    },
    async listAdminActivities(today) {
      return {
        rows: activityConfigs.map((activity) => {
          const states = [...activityStates.values()].filter((state) => state.activityId === activity.id && state.score > 0);
          const topRows = states
            .sort((left, right) => right.score - left.score)
            .slice(0, 3)
            .map((state, index) => {
              const profile = getProfileById(state.profileId)!;
              return { rank: index + 1, profileId: state.profileId, founderName: profile.founderName, companyName: profile.companyName, value: state.score, valueLabel: `活动积分 ${state.score}`, equippedTitle: null };
            });
          return {
            id: activity.id,
            name: activity.name,
            status: seasonStatus(activity.startDate, activity.endDate, today),
            startDate: activity.startDate,
            endDate: activity.endDate,
            leaderboardKey: activity.leaderboardKey,
            participantCount: states.length,
            totalScore: states.reduce((total, state) => total + state.score, 0),
            isSettled: [...leaderboardRewards].some((key) => key.includes(`:${activity.leaderboardKey}:${activity.endDate}`)),
            topRows
          };
        })
      };
    },
    async settleAdminActivityLeaderboard(adminUserId, activityId, today, reason) {
      const activity = activityConfigs.find((item) => item.id === activityId);
      if (activity === undefined) {
        return "ACTIVITY_NOT_FOUND";
      }
      if (seasonStatus(activity.startDate, activity.endDate, today) !== "ended") {
        return "ACTIVITY_NOT_ENDED";
      }
      const rows = [...activityStates.values()]
        .filter((state) => state.activityId === activityId && state.score > 0)
        .sort((left, right) => right.score - left.score)
        .map((state, index) => {
          const profile = getProfileById(state.profileId)!;
          return { rank: index + 1, profileId: state.profileId, founderName: profile.founderName, companyName: profile.companyName, value: state.score, valueLabel: `活动积分 ${state.score}`, equippedTitle: null };
        });
      const rewards = rows.slice(0, 3).map((row, index) => ({
        profileId: row.profileId,
        founderName: row.founderName,
        companyName: row.companyName,
        rank: row.rank,
        reputationReward: [120, 80, 50][index] ?? 0
      })).filter((reward) => reward.reputationReward > 0);
      let deliveredRewards = 0;
      for (const reward of rewards) {
        const key = `${reward.profileId}:${activity.leaderboardKey}:${activity.endDate}`;
        if (leaderboardRewards.has(key)) {
          continue;
        }
        leaderboardRewards.add(key);
        const profile = getProfileById(reward.profileId);
        if (profile !== undefined) {
          profile.reputation += reward.reputationReward;
        }
        deliveredRewards += 1;
      }
      const auditLogId = `${adminUserId}:${activityId}:${reason}`;
      adminAuditLogs.unshift({
        id: auditLogId,
        adminUsername: "admin",
        action: "admin_activity_leaderboard_settle",
        targetType: "activity_leaderboard",
        targetId: activityId,
        detail: JSON.stringify({
          activityId,
          today,
          reason,
          deliveredRewards,
          isRetry: deliveredRewards === 0,
          rewardBoundary: "no_cash_no_platform_coins"
        }),
        createdAt: new Date().toISOString()
      });
      const activities = await this.listAdminActivities(today);
      return {
        activity: activities.rows.find((row) => row.id === activityId)!,
        leaderboard: {
          key: activity.leaderboardKey,
          name: activity.name,
          scope: "activity",
          isActive: false,
          rows,
          snapshotDate: activity.endDate
        },
        deliveredRewards,
        rewards: deliveredRewards > 0 ? rewards : [],
        auditLogId
      };
    },
    async listAdminGuilds(filters, today) {
      const rows = [...guilds.values()]
        .filter((guild) => (filters.serverId === "" ? true : guild.serverId === filters.serverId))
        .filter((guild) => (filters.keyword === "" ? true : guild.name.includes(filters.keyword)))
        .map((guild) => {
          const group = crossServerGroups.find((item) => item.serverIds.includes(guild.serverId));
          const activities = [...guildActivityLogs.values()].filter((activity) => activity.guildId === guild.id && activity.createdAt.slice(0, 10) === today);
          const row = {
            id: guild.id,
            serverId: guild.serverId,
            name: guild.name,
            level: guild.level,
            contributionScore: guild.contributionScore,
            memberCount: [...guildMembers.values()].filter((member) => member.guildId === guild.id).length,
            todayActiveMemberCount: new Set(activities.map((activity) => activity.profileId)).size,
            helpRequestCount: [...guildHelpRequests.values()].filter((request) => request.guildId === guild.id).length,
            projectCount: [...guildProjectProgresses.values()].filter((project) => project.guildId === guild.id).length,
            crossServerRegistered: group === undefined ? false : crossServerGuildSignups.has(`${guild.id}|${group.id}`),
            crossServerGroupName: group?.name ?? null,
            createdAt: new Date().toISOString()
          };
          return row;
        })
        .filter((guild) => {
          if (filters.crossRegistered === "registered" && !guild.crossServerRegistered) return false;
          if (filters.crossRegistered === "unregistered" && guild.crossServerRegistered) return false;
          if (filters.activeStatus === "active" && guild.todayActiveMemberCount <= 0) return false;
          if (filters.activeStatus === "inactive" && guild.todayActiveMemberCount > 0) return false;
          return true;
        });

      return { rows };
    },
    async getAdminGuildDetail(guildId) {
      const guild = guilds.get(guildId);
      if (guild === undefined) {
        return "GUILD_NOT_FOUND";
      }
      const group = crossServerGroups.find((item) => item.serverIds.includes(guild.serverId));
      const members = [...guildMembers.values()].filter((member) => member.guildId === guild.id);
      return {
        guild: {
          id: guild.id,
          serverId: guild.serverId,
          name: guild.name,
          level: guild.level,
          contributionScore: guild.contributionScore,
          announcement: guild.announcement,
          collaborationRules: guild.collaborationRules,
          createdAt: new Date().toISOString()
        },
        members: members.map((member) => {
          const profile = [...profiles.values()].find((item) => item.id === member.profileId);
          return {
            profileId: member.profileId,
            founderName: profile?.founderName ?? "",
            companyName: profile?.companyName ?? "",
            role: member.role,
            contributionScore: member.contributionScore,
            joinedAt: new Date().toISOString()
          };
        }),
        techs: [
          { id: "guild-tech-efficiency", name: "协作效率", level: guildTechStates.get(`${guild.id}:guild-tech-efficiency`)?.level ?? 0, maxLevel: 5 }
        ],
        helpRequests: [...guildHelpRequests.values()]
          .filter((request) => request.guildId === guild.id)
          .map((request) => {
            const profile = [...profiles.values()].find((item) => item.id === request.profileId);
            return {
              id: request.id,
              profileId: request.profileId,
              founderName: profile?.founderName ?? "",
              requestType: request.requestType,
              status: request.status,
              createdAt: request.createdAt,
              fulfilledAt: request.fulfilledAt
            };
          }),
        projects: ["joint-roadshow", "risk-review-week", "market-co-creation"].map((projectId, index) => {
          const progress = guildProjectProgresses.get(`${guild.id}:${projectId}`);
          return {
            id: projectId,
            name: ["联合路演", "风险复核周", "市场共创"][index] ?? projectId,
            progress: progress?.progress ?? 0,
            target: [3, 6, 8][index] ?? 1,
            claimedAt: progress?.claimedAt ?? null
          };
        }),
        crossServer: {
          isRegistered: group === undefined ? false : crossServerGuildSignups.has(`${guild.id}|${group.id}`),
          groupId: group?.id ?? null,
          groupName: group?.name ?? null,
          signupDate: group === undefined || !crossServerGuildSignups.has(`${guild.id}|${group.id}`) ? null : new Date().toISOString().slice(0, 10)
        },
        history: {
          guildSettlements: (() => {
            const memberProfile = members[0] === undefined ? undefined : getProfileById(members[0].profileId);
            const history = memberProfile === undefined ? "GUILD_NOT_JOINED" : toGuildHistory(memberProfile);
            return typeof history === "string" ? [] : history.settlements;
          })(),
          crossServerSettlements: members[0] === undefined
            ? []
            : (() => {
              const memberProfile = getProfileById(members[0].profileId);
              const history = memberProfile === undefined ? "GUILD_NOT_JOINED" : toCrossServerGuildHistory(memberProfile);
              return typeof history === "string" ? [] : history.settlements;
            })()
        }
      };
    },
    async settleAdminGuildLeaderboard(adminUserId, guildId, today, reason) {
      const member = [...guildMembers.values()].find((item) => item.guildId === guildId);
      if (member === undefined) {
        return "GUILD_NOT_FOUND";
      }
      const profile = [...profiles.values()].find((item) => item.id === member.profileId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const settlement = await this.settleGuildLeaderboard(profile.accountId, profile.serverId, today);
      if (settlement === "PLAYER_NOT_FOUND" || settlement === "GUILD_NOT_JOINED") {
        return "PLAYER_NOT_FOUND";
      }
      const auditLogId = `${adminUserId}:${guildId}:${reason}`;
      adminAuditLogs.unshift({
        id: auditLogId,
        adminUsername: "admin",
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
        }),
        createdAt: new Date().toISOString()
      });
      return { ...settlement, auditLogId };
    },
    async settleAdminCrossServerGuild(adminUserId, serverId, today, reason) {
      const member = [...guildMembers.values()]
        .map((guildMember) => [...profiles.values()].find((profile) => profile.id === guildMember.profileId))
        .find((profile) => profile?.serverId === serverId);
      if (member === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const settlement = await this.settleCrossServerGuildRewards(member.accountId, serverId, today);
      if (
        settlement === "PLAYER_NOT_FOUND" ||
        settlement === "CROSS_SERVER_GROUP_NOT_FOUND" ||
        settlement === "GUILD_NOT_JOINED"
      ) {
        return settlement;
      }
      const auditLogId = `${adminUserId}:${serverId}:${reason}`;
      adminAuditLogs.unshift({
        id: auditLogId,
        adminUsername: "admin",
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
        }),
        createdAt: new Date().toISOString()
      });
      return { ...settlement, auditLogId };
    },
    async listServers() {
      return servers;
    },
    async listAvatars() {
      return avatars;
    },
    async getProfile(accountId, serverId) {
      return profiles.get(`${accountId}:${serverId}`);
    },
    async getCompanyGrowth(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : readCompanyGrowthRecord(profile);
    },
    async claimFullLevelChest(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const growth = readCompanyGrowthRecord(profile);
      if (growth.fullLevelChest.claimableCount <= 0) {
        return "FULL_LEVEL_CHEST_NOT_READY";
      }

      profile.reputation += 300;
      profile.actionPower += 40;
      grantInventoryItem(profile.id, "season-exp-ticket", 1, "full_level_chest", "领取满级宝箱奖励");
      return readCompanyGrowthRecord(profile);
    },
    async createProfile(profile) {
      const key = `${profile.accountId}:${profile.serverId}`;
      if (profiles.has(key)) {
        return "PLAYER_EXISTS";
      }

      const created: PlayerProfileRecord = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        companyLevel: 1,
        companyExperience: 0,
        cash: 2450000,
        platformCoins: 36580,
        premiumCurrency: 8680,
        reputation: 1256000,
        actionPower: 120,
        actionPowerLimit: 120,
        monthlyIncome: 860000,
        monthlyExpense: 348000,
        valuation: 4800000,
        founderEquityBasisPoints: 10000,
        totalDebt: 0,
        creditRating: "A",
        employeeSatisfaction: 82,
        customerSatisfaction: 78,
        financeMonth: 1,
        operatingDay: 1,
        riskStatus: "稳健",
        pendingEventCount: 2,
        unreadMailCount: 1,
        debtWarning: "低",
        ...profile
      };
      profiles.set(key, created);
      return created;
    },
    async listTasks(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      return taskConfigs.map((config) => toTaskRecord(profile.id, config, today));
    },
    async advanceTask(accountId, serverId, taskId, today, knowledgeId = null) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const config = taskConfigs.find((task) => task.id === taskId);
      if (config === undefined) {
        return "TASK_NOT_FOUND";
      }

      if (config.unlockKind !== "none" && (config.knowledgeId ?? null) !== null) {
        if (knowledgeId !== config.knowledgeId) {
          return "TASK_KNOWLEDGE_MISMATCH";
        }
        if (!knowledgeUnlocks.has(knowledgeKey(profile.id, config.knowledgeId))) {
          return "KNOWLEDGE_LOCKED";
        }
      }

      const key = `${profile.id}:${config.id}`;
      const existing = taskProgress.get(key);
      const isDaily = config.type === "daily";
      const shouldResetDaily = isDaily && existing?.dailyDate !== today;
      const currentProgress = shouldResetDaily ? 0 : existing?.progress ?? config.initialProgress;
      taskProgress.set(key, {
        progress: Math.min(currentProgress + 1, config.target),
        dailyDate: isDaily ? today : existing?.dailyDate,
        claimedAt: shouldResetDaily ? undefined : existing?.claimedAt
      });
      return toTaskRecord(profile.id, config, today);
    },
    async claimTask(accountId, serverId, taskId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const config = taskConfigs.find((task) => task.id === taskId);
      if (config === undefined) {
        return "TASK_NOT_FOUND";
      }

      const key = `${profile.id}:${config.id}`;
      const existing = taskProgress.get(key);
      const isDaily = config.type === "daily";
      const isFreshDaily = !isDaily || existing?.dailyDate === today;
      const currentProgress = isFreshDaily ? existing?.progress ?? config.initialProgress : 0;

      if (currentProgress < config.target) {
        return "TASK_INCOMPLETE";
      }

      if (isFreshDaily && existing?.claimedAt !== undefined) {
        return "TASK_ALREADY_CLAIMED";
      }

      taskProgress.set(key, {
        progress: currentProgress,
        dailyDate: isDaily ? today : existing?.dailyDate,
        claimedAt: new Date().toISOString()
      });
      profile.cash += config.rewardCash;
      profile.platformCoins += config.rewardPlatformCoins;
      profile.reputation += config.rewardReputation;
      profile.actionPower += config.rewardActionPower;
      const rewardExperience = "rewardCompanyExperience" in config && typeof config.rewardCompanyExperience === "number" ? config.rewardCompanyExperience : 0;
      if (rewardExperience > 0) {
        const nextExperience = profile.companyExperience + rewardExperience;
        profile.companyExperience = nextExperience;
        profile.companyLevel = readCompanyLevel(nextExperience);
      }
      return toTaskRecord(profile.id, config, today);
    },
    async listRandomTasks(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const existingToday = [...playerRandomTasks.values()].filter((task) => task.id.startsWith(`${profile.id}:${today}:`));
      const pendingCount = existingToday.filter((task) => task.status === "pending").length;
      const hasSeasonPass = [...seasonPassPurchases.values()].some((purchase) => purchase.profileId === profile.id && purchase.seasonId === seasonConfig.id);
      const dailyLimit = hasSeasonPass ? 7 : 6;
      const visibleCount = hasSeasonPass ? 4 : 3;
      const createCount = Math.max(0, Math.min(visibleCount - pendingCount, dailyLimit - existingToday.length));
      const existingConfigIds = new Set(existingToday.map((task) => task.configId));
      const nextConfigs = randomTaskConfigs
        .filter((config) => hasSeasonPass || config.category !== "season")
        .filter((config) => !existingConfigIds.has(config.id))
        .sort((left, right) => Number(right.category === "season" && hasSeasonPass) - Number(left.category === "season" && hasSeasonPass))
        .slice(0, createCount);
      for (const config of nextConfigs) {
        const task = toRandomTask(profile.id, config, today);
        playerRandomTasks.set(task.id, task);
      }

      const tasks = [...playerRandomTasks.values()].filter((task) => task.id.startsWith(`${profile.id}:${today}:`));
      return {
        profile,
        tasks,
        dailyLimit,
        pendingCount: tasks.filter((task) => task.status === "pending").length,
        handledToday: tasks.filter((task) => task.status !== "pending").length
      } satisfies RandomTaskCenterRecord;
    },
    async resolveRandomTask(accountId, serverId, randomTaskId, option, today, modifierItemId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const task = playerRandomTasks.get(randomTaskId);
      if (task === undefined || !randomTaskId.startsWith(`${profile.id}:`)) {
        return "RANDOM_TASK_NOT_FOUND";
      }
      if (task.status !== "pending") {
        return "RANDOM_TASK_ALREADY_RESOLVED";
      }
      const selected = task.options.find((entry) => entry.key === option);
      assert.ok(selected);
      if (profile.actionPower < selected.actionPowerCost) {
        return "INSUFFICIENT_ACTION_POWER";
      }
      if (modifierItemId !== undefined && modifierItemId !== "risk-insurance" && modifierItemId !== "market-intel" && modifierItemId !== "finance-advisor-card") {
        return "ITEM_NOT_USABLE";
      }
      const canUseRiskInsurance = modifierItemId === "risk-insurance" && task.category !== "season" && (selected.cashReward < 0 || selected.reputationReward < 0);
      const canUseMarketIntel = modifierItemId === "market-intel" && (task.category === "market" || task.category === "season");
      const canUseFinanceAdvisor = modifierItemId === "finance-advisor-card" && (task.category === "finance" || task.category === "funding" || task.category === "loan");
      if (modifierItemId === "risk-insurance" && !canUseRiskInsurance) {
        return "ITEM_NOT_USABLE";
      }
      if (modifierItemId === "market-intel" && !canUseMarketIntel) {
        return "ITEM_NOT_USABLE";
      }
      if (modifierItemId === "finance-advisor-card" && !canUseFinanceAdvisor) {
        return "ITEM_NOT_USABLE";
      }
      const usedItem = canUseRiskInsurance || canUseMarketIntel || canUseFinanceAdvisor
        ? inventoryItems.get(`${profile.id}:${modifierItemId}`)
        : undefined;
      if (modifierItemId !== undefined && (canUseRiskInsurance || canUseMarketIntel || canUseFinanceAdvisor) && (usedItem === undefined || usedItem.quantity <= 0)) {
        return "ITEM_NOT_FOUND";
      }
      const nextCashReward = canUseFinanceAdvisor
        ? selected.cashReward > 0 ? Math.trunc(selected.cashReward * 1.2) : Math.trunc(selected.cashReward * 0.8)
        : canUseRiskInsurance && selected.cashReward < 0 ? Math.trunc(selected.cashReward / 2) : selected.cashReward;
      const nextReputationReward = canUseMarketIntel
        ? selected.reputationReward > 0 ? Math.trunc(selected.reputationReward * 1.2) : Math.trunc(selected.reputationReward * 0.8)
        : canUseFinanceAdvisor
          ? selected.reputationReward > 0 ? Math.trunc(selected.reputationReward * 1.1) : Math.trunc(selected.reputationReward * 0.8)
        : canUseRiskInsurance && selected.reputationReward < 0 ? Math.trunc(selected.reputationReward / 2) : selected.reputationReward;
      const nextCompanyExperienceReward = (canUseMarketIntel || canUseFinanceAdvisor) && selected.companyExperienceReward > 0 ? Math.trunc(selected.companyExperienceReward * 1.1) : selected.companyExperienceReward;
      const effectSummary = canUseMarketIntel
        ? "市场情报已生效，优化了本次市场判断。"
        : canUseFinanceAdvisor
          ? "财务顾问卡已生效，优化了本次现金流判断。"
          : "风险保险已生效，降低了本次经营损失。";
      if (usedItem !== undefined) {
        usedItem.quantity -= 1;
        usedItem.updatedAt = new Date().toISOString();
        itemLedgers.unshift({
          id: randomUUID(),
          profileId: profile.id,
          itemId: usedItem.itemId,
          changeQuantity: -1,
          balanceAfter: usedItem.quantity,
          source: "random_task_modifier",
          reason: `随机任务使用：${itemConfigs.find((item) => item.id === usedItem.itemId)?.name ?? usedItem.itemId}`,
          createdAt: new Date().toISOString()
        });
      }
      profile.actionPower -= selected.actionPowerCost;
      profile.cash += nextCashReward;
      profile.reputation += nextReputationReward;
      task.status = "resolved";
      task.selectedOption = option;
      task.resultSummary = usedItem === undefined ? selected.result : `${selected.result} ${effectSummary}`;
      profile.companyExperience += nextCompanyExperienceReward;
      const center = await this.listRandomTasks(accountId, serverId, today);
      assert.notEqual(center, "PLAYER_NOT_FOUND");
      return {
        center,
        task,
        profile,
        result: task.resultSummary,
        usedItem: usedItem === undefined ? undefined : { itemId: usedItem.itemId, itemName: itemConfigs.find((item) => item.id === usedItem.itemId)?.name ?? usedItem.itemId, effectSummary }
      } satisfies RandomTaskActionRecord;
    },
    async dismissRandomTask(accountId, serverId, randomTaskId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const task = playerRandomTasks.get(randomTaskId);
      if (task === undefined || !randomTaskId.startsWith(`${profile.id}:`)) {
        return "RANDOM_TASK_NOT_FOUND";
      }
      if (task.status !== "pending") {
        return "RANDOM_TASK_ALREADY_RESOLVED";
      }
      task.status = "dismissed";
      task.resultSummary = "已转入专属经理待办，本次不消耗行动力。";
      const center = await this.listRandomTasks(accountId, serverId, today);
      assert.notEqual(center, "PLAYER_NOT_FOUND");
      return { center, task, profile, result: task.resultSummary } satisfies RandomTaskActionRecord;
    },
    async getCompanyFinance(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toCompanyFinanceRecord(profile);
    },
    async settleCompanyDay(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      profile.operatingDay += 1;
      return toCompanyFinanceRecord(profile);
    },
    async settleCompanyMonth(accountId, serverId, reportMonth) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const key = `${profile.id}:${reportMonth}`;
      const existing = financeReports.get(key);
      if (existing !== undefined) {
        return existing;
      }

      const report = calculateFinanceReport(profile);
      profile.cash = report.cashAfterSettlement;
      profile.financeMonth = Math.max(profile.financeMonth, reportMonth + 1);
      profile.operatingDay = 1;
      profile.riskStatus = report.riskStatus;
      profile.debtWarning = report.debtRatioBasisPoints >= 6000 ? "高" : "低";
      profile.creditRating = report.debtRatioBasisPoints >= 6000 || report.cashAfterSettlement < 0 ? "B" : "A";
      if (report.riskStatus !== "稳健") {
        profile.pendingEventCount += 1;
      }

      const settlement: CompanyFinanceSettlementRecord = {
        ...toCompanyFinanceRecord(profile),
        reportMonth,
        income: profile.monthlyIncome,
        expense: profile.monthlyExpense,
        endingCash: report.cashAfterSettlement,
        createdAt: new Date().toISOString()
      };
      financeReports.set(key, settlement);
      return settlement;
    },
    async listEmployees(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      return [...employees.values()].filter((employee) => employee.id.startsWith(`${profile.id}:`));
    },
    async recruitEmployee(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const ownedConfigIds = new Set(
        [...employees.values()]
          .filter((employee) => employee.id.startsWith(`${profile.id}:`))
          .map((employee) => employee.configId)
      );
      const selected = employeeConfigs.find((config) => !ownedConfigIds.has(config.id));
      if (selected === undefined) {
        return "NO_EMPLOYEE_AVAILABLE";
      }

      const created: EmployeeRecord = {
        id: `${profile.id}:${selected.id}`,
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
        specialty: selected.specialty,
        equityBasisPoints: 0,
        assignedTo: null,
        isActive: true
      };
      employees.set(created.id, created);
      profile.monthlyExpense += created.salary;
      profile.employeeSatisfaction += 1;
      return created;
    },
    async cultivateEmployee(accountId, serverId, employeeId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const employee = employees.get(employeeId);
      if (employee === undefined || !employee.id.startsWith(`${profile.id}:`) || !employee.isActive) {
        return "EMPLOYEE_NOT_FOUND";
      }

      const salaryIncrease = Math.max(2000, Math.round(employee.salary * 0.08));
      employee.level += 1;
      employee.salary += salaryIncrease;
      employee.pressure = Math.min(employee.pressure + 2, 100);
      employee.loyalty = Math.min(employee.loyalty + 1, 100);
      employee.management += 2;
      employee.negotiation += 2;
      employee.execution += 2;
      profile.cash -= 20000;
      profile.monthlyExpense += salaryIncrease;
      return employee;
    },
    async grantEmployeeEquity(accountId, serverId, employeeId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const employee = employees.get(employeeId);
      if (employee === undefined || !employee.id.startsWith(`${profile.id}:`) || !employee.isActive) {
        return "EMPLOYEE_NOT_FOUND";
      }

      if (profile.founderEquityBasisPoints < 100) {
        return "EQUITY_LIMIT_REACHED";
      }

      employee.equityBasisPoints += 100;
      employee.loyalty = Math.min(employee.loyalty + 8, 100);
      profile.founderEquityBasisPoints -= 100;
      profile.employeeSatisfaction += 2;
      return employee;
    },
    async dismissEmployee(accountId, serverId, employeeId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const employee = employees.get(employeeId);
      if (employee === undefined || !employee.id.startsWith(`${profile.id}:`) || !employee.isActive) {
        return "EMPLOYEE_NOT_FOUND";
      }

      employee.isActive = false;
      profile.monthlyExpense -= employee.salary;
      profile.employeeSatisfaction -= 5;
      profile.reputation -= 2000;
      profile.pendingEventCount += 1;
      return toCompanyFinanceRecord(profile);
    },
    async listProjects(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      return projectForProfile(profile.id).map(refreshProjectSuccessRate);
    },
    async startProject(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const ownedConfigIds = new Set(projectForProfile(profile.id).map((project) => project.configId));
      const selected = projectConfigs.find((config) => !ownedConfigIds.has(config.id));
      if (selected === undefined) {
        return "NO_PROJECT_AVAILABLE";
      }

      const created: ProjectRecord = {
        id: `${profile.id}:${selected.id}`,
        configId: selected.id,
        name: selected.name,
        category: selected.category,
        stage: 1,
        progress: 0,
        cycleDays: selected.cycleDays,
        budget: selected.budget,
        risk: selected.risk,
        successRate: calculateProjectSuccessRate({ baseRate: selected.successRateBase }),
        revenueReward: selected.revenueReward,
        assignedEmployeeId: null,
        assignedEmployeeName: null,
        status: "active",
        result: null,
        summary: selected.summary,
        settledAt: null
      };
      projects.set(created.id, created);
      return created;
    },
    async assignProjectEmployee(accountId, serverId, projectId, employeeId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const project = projects.get(projectId);
      if (project === undefined || !project.id.startsWith(`${profile.id}:`) || project.status === "settled" || project.status === "failed") {
        return "PROJECT_NOT_FOUND";
      }

      const employee = employees.get(employeeId);
      if (employee === undefined || !employee.id.startsWith(`${profile.id}:`) || !employee.isActive) {
        return "EMPLOYEE_NOT_FOUND";
      }

      project.assignedEmployeeId = employee.id;
      project.assignedEmployeeName = employee.name;
      const updated = refreshProjectSuccessRate(project);
      projects.set(project.id, updated);
      return updated;
    },
    async advanceProject(accountId, serverId, projectId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const project = projects.get(projectId);
      if (project === undefined || !project.id.startsWith(`${profile.id}:`)) {
        return "PROJECT_NOT_FOUND";
      }
      if (project.status === "settled" || project.status === "failed") {
        return "PROJECT_ALREADY_SETTLED";
      }

      const nextProgress = Math.min(100, project.progress + 40);
      project.progress = nextProgress;
      project.stage = nextProgress >= 100 ? project.stage + 1 : project.stage;
      project.status = nextProgress >= 100 ? "ready" : "active";
      return refreshProjectSuccessRate(project);
    },
    async settleProject(accountId, serverId, projectId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      const project = projects.get(projectId);
      if (project === undefined || !project.id.startsWith(`${profile.id}:`)) {
        return "PROJECT_NOT_FOUND";
      }

      if (project.settledAt !== null) {
        return {
          project: refreshProjectSuccessRate(project),
          finance: toCompanyFinanceRecord(profile)
        };
      }

      if (project.progress < 100 || project.status !== "ready") {
        return "PROJECT_INCOMPLETE";
      }

      const isSuccess = project.successRate >= 50;
      project.status = isSuccess ? "settled" : "failed";
      project.result = isSuccess ? "success" : "failure";
      project.settledAt = new Date().toISOString();
      if (isSuccess) {
        profile.cash += project.revenueReward;
        profile.monthlyIncome += Math.round(project.revenueReward * 0.18);
        profile.reputation += project.configId === "success-project" ? 1200 : 2600;
        profile.customerSatisfaction += project.configId === "success-project" ? 4 : 6;
      } else {
        profile.cash -= project.configId === "failed-project" ? 180000 : 60000;
        profile.reputation -= 2600;
        profile.customerSatisfaction -= 6;
        profile.pendingEventCount += 1;
      }

      return {
        project: refreshProjectSuccessRate(project),
        finance: toCompanyFinanceRecord(profile)
      };
    },
    async listEvents(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }

      return listEventsForProfile(profile);
    },
    async chooseEvent(accountId, serverId, eventId, option) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      if (option !== "A" && option !== "B") {
        return "INVALID_EVENT_OPTION";
      }

      listEventsForProfile(profile);
      const event = playerEvents.get(eventId);
      if (event === undefined || !event.id.startsWith(`${profile.id}:`)) {
        return "EVENT_NOT_FOUND";
      }
      if (event.status === "resolved") {
        return "EVENT_ALREADY_RESOLVED";
      }

      const config = eventConfigs.find((item) => item.id === event.configId);
      if (config === undefined) {
        return "EVENT_NOT_FOUND";
      }
      const cash = option === "A" ? config.optionACash : config.optionBCash;
      const reputation = option === "A" ? config.optionAReputation : config.optionBReputation;
      const customerSatisfaction =
        option === "A" ? config.optionACustomerSatisfaction : config.optionBCustomerSatisfaction;
      const riskDelta = option === "A" ? config.optionARiskDelta : config.optionBRiskDelta;
      const resultSummary = option === "A" ? config.optionAResult : config.optionBResult;

      event.status = "resolved";
      event.selectedOption = option;
      event.resultSummary = resultSummary;
      unlockKnowledgeEntry(profile.id, config.knowledgeId, "event");
      event.knowledgeUnlocked = config.knowledgeId !== null;
      event.knowledge = toKnowledgeLinkRecord(profile.id, config.knowledgeId);
      event.resolvedAt = new Date().toISOString();
      profile.cash += cash;
      profile.reputation += reputation;
      profile.customerSatisfaction += customerSatisfaction;
      if (riskDelta > 0) {
        profile.riskStatus = "预警";
      }

      let followupEvent: EventRecord | null = null;
      if (config.followupEventId !== null) {
        const followupConfig = eventConfigs.find((item) => item.id === config.followupEventId);
        if (followupConfig !== undefined) {
          const followupId = `${profile.id}:${followupConfig.id}`;
          followupEvent = playerEvents.get(followupId) ?? toEventRecord(profile.id, followupConfig);
          playerEvents.set(followupId, followupEvent);
        }
      }

      profile.pendingEventCount = [...playerEvents.values()].filter(
        (item) => item.id.startsWith(`${profile.id}:`) && item.status === "pending"
      ).length;

      return {
        event,
        finance: toCompanyFinanceRecord(profile),
        followupEvent,
        result: {
          summary: resultSummary,
          riskExplanation: config.riskExplanation,
          knowledgeUnlocked: config.knowledgeId !== null,
          knowledge: event.knowledge,
          followupEventId: followupEvent?.id ?? null
        }
      } satisfies EventChoiceRecord;
    },
    async listLoans(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toLoanCenterRecord(profile);
    },
    async applyLoan(accountId, serverId, loanConfigId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const config = loanConfigs.find((item) => item.id === loanConfigId);
      if (config === undefined) {
        return "LOAN_NOT_FOUND";
      }
      if (creditRank(profile.creditRating) < creditRank(config.creditRequired)) {
        return "CREDIT_NOT_ENOUGH";
      }
      const loanId = `${profile.id}:${config.id}`;
      const existing = playerLoans.get(loanId);
      if (existing !== undefined && existing.status !== "settled") {
        return "LOAN_ALREADY_ACTIVE";
      }

      const loan: LoanRecord = {
        id: loanId,
        configId: config.id,
        name: config.name,
        lender: config.lender,
        principal: config.principal,
        remainingPrincipal: config.principal,
        annualRateBasisPoints: config.annualRateBasisPoints,
        termMonths: config.termMonths,
        remainingMonths: config.termMonths,
        monthlyPayment: config.monthlyPayment,
        overduePeriods: 0,
        penaltyAccrued: 0,
        status: "active",
        createdAt: new Date().toISOString(),
        settledAt: null
      };
      playerLoans.set(loan.id, loan);
      profile.cash += config.principal;
      profile.totalDebt += config.principal;
      profile.debtWarning = "中";
      return { loan, loanCenter: toLoanCenterRecord(profile), result: `${config.name} 已放款。` } satisfies LoanActionRecord;
    },
    async repayLoan(accountId, serverId, loanId, mode) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const loan = playerLoans.get(loanId);
      if (loan === undefined || !loan.id.startsWith(`${profile.id}:`) || loan.status === "settled") {
        return "LOAN_NOT_FOUND";
      }
      const principalPayment = mode === "full" ? loan.remainingPrincipal : calculatePrincipalPayment(loan);
      const payment = mode === "full" ? loan.remainingPrincipal + loan.penaltyAccrued : loan.monthlyPayment + loan.penaltyAccrued;
      if (profile.cash < payment) {
        return "INSUFFICIENT_CASH";
      }
      profile.cash -= payment;
      profile.totalDebt = Math.max(0, profile.totalDebt - principalPayment - loan.penaltyAccrued);
      loan.remainingPrincipal = Math.max(0, loan.remainingPrincipal - principalPayment);
      loan.remainingMonths = mode === "full" || loan.remainingPrincipal === 0 ? 0 : Math.max(0, loan.remainingMonths - 1);
      loan.penaltyAccrued = 0;
      loan.status = loan.remainingPrincipal === 0 ? "settled" : "active";
      loan.settledAt = loan.status === "settled" ? new Date().toISOString() : null;
      return { loan, loanCenter: toLoanCenterRecord(profile), result: mode === "full" ? "提前结清完成。" : "本期还款完成。" } satisfies LoanActionRecord;
    },
    async settleLoanPeriod(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const loan = loansForProfile(profile.id).find((item) => item.status !== "settled");
      if (loan === undefined) {
        return "NO_ACTIVE_LOAN";
      }
      if (profile.cash >= loan.monthlyPayment + loan.penaltyAccrued) {
        return this.repayLoan(accountId, serverId, loan.id, "scheduled") as Promise<LoanActionRecord>;
      }
      const penalty = Math.max(1000, Math.round(loan.monthlyPayment * 0.08));
      loan.status = "overdue";
      loan.overduePeriods += 1;
      loan.penaltyAccrued += penalty;
      profile.totalDebt += penalty;
      profile.creditRating = downgradeCredit(profile.creditRating);
      profile.riskStatus = "资金紧张";
      profile.debtWarning = "高";
      profile.pendingEventCount += 1;
      return { loan, loanCenter: toLoanCenterRecord(profile), result: `现金不足，本期逾期并产生罚息 ${penalty}。` } satisfies LoanActionRecord;
    },
    async resolveCrisis(accountId, serverId, route) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      if (route !== "financing" && route !== "cost_cut" && route !== "restructure") {
        return "INVALID_CRISIS_ROUTE";
      }
      const center = toLoanCenterRecord(profile);
      if (!center.crisis.isActive) {
        return "CRISIS_NOT_ACTIVE";
      }
      if (route === "financing") {
        profile.cash += 200000;
        profile.founderEquityBasisPoints = Math.max(0, profile.founderEquityBasisPoints - 200);
        profile.reputation -= 300;
      } else if (route === "cost_cut") {
        profile.monthlyExpense = Math.max(0, profile.monthlyExpense - 100000);
        profile.employeeSatisfaction -= 6;
      } else {
        profile.totalDebt = Math.max(0, profile.totalDebt - 200000);
        profile.creditRating = downgradeCredit(profile.creditRating);
      }
      profile.riskStatus = "预警";
      return toLoanCenterRecord(profile);
    },
    async listFundings(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toFundingCenterRecord(profile);
    },
    async startFunding(accountId, serverId, investorId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const config = investorConfigs.find((item) => item.id === investorId);
      if (config === undefined) {
        return "INVESTOR_NOT_FOUND";
      }
      const offer = calculateFundingOffer(profile, config);
      if (!offer.isAvailable) {
        return "FUNDING_LOCKED";
      }
      const fundingId = `${profile.id}:${config.id}`;
      const existing = playerFundings.get(fundingId);
      if (existing !== undefined && existing.status === "pending") {
        return "FUNDING_ALREADY_ACTIVE";
      }

      const funding: FundingRecord = {
        id: fundingId,
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
        status: "pending",
        resultSummary: null,
        createdAt: new Date().toISOString(),
        resolvedAt: null
      };
      playerFundings.set(funding.id, funding);
      return {
        funding,
        fundingCenter: toFundingCenterRecord(profile),
        result: `${config.name} 已进入路演谈判。`
      } satisfies FundingActionRecord;
    },
    async settleFunding(accountId, serverId, fundingId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const funding = playerFundings.get(fundingId);
      if (funding === undefined || !funding.id.startsWith(`${profile.id}:`)) {
        return "FUNDING_NOT_FOUND";
      }
      if (funding.status !== "pending") {
        return "FUNDING_ALREADY_SETTLED";
      }

      const isSuccess = funding.successRate >= 50;
      funding.status = isSuccess ? "funded" : "failed";
      funding.resolvedAt = new Date().toISOString();
      funding.resultSummary = isSuccess
        ? `${funding.investorName} 完成打款，创始人股权稀释 ${(funding.equityBasisPoints / 100).toFixed(1)}%。`
        : `${funding.investorName} 暂缓投资，董事会要求提交替代现金流方案。`;
      if (isSuccess) {
        profile.cash += funding.amount;
        profile.valuation = funding.postMoneyValuation;
        profile.founderEquityBasisPoints -= funding.equityBasisPoints;
        profile.reputation += 600;
      } else {
        const config = eventConfigs.find((item) => item.id === "funding-failed-bridge-plan");
        if (config !== undefined) {
          const event = toEventRecord(profile.id, config);
          playerEvents.set(event.id, event);
          profile.pendingEventCount += 1;
        }
        profile.reputation -= 500;
        profile.riskStatus = "预警";
      }

      return {
        funding,
        fundingCenter: toFundingCenterRecord(profile),
        result: funding.resultSummary
      } satisfies FundingActionRecord;
    },
    async listProducts(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toProductCenterRecord(profile);
    },
    async startProduct(accountId, serverId, productConfigId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const config = productConfigs.find((item) => item.id === productConfigId);
      if (config === undefined) {
        return "PRODUCT_NOT_FOUND";
      }
      const productId = `${profile.id}:${config.id}`;
      const existing = playerProducts.get(productId);
      if (existing !== undefined && existing.status !== "closed") {
        return "PRODUCT_ALREADY_ACTIVE";
      }
      if (profile.cash < config.launchCost) {
        return "INSUFFICIENT_CASH";
      }

      const now = new Date().toISOString();
      const product: ProductRecord = {
        id: productId,
        configId: config.id,
        name: config.name,
        category: config.category,
        stage: "idea",
        users: config.baseUsers,
        retentionBasisPoints: config.retentionBasisPoints,
        payRateBasisPoints: config.payRateBasisPoints,
        acquisitionCost: config.acquisitionCost,
        serverCost: config.serverCost,
        reputationScore: 20 + config.reputationGrowth,
        techDebt: 8,
        monthlyRevenue: 0,
        status: "active",
        resultSummary: "产品已立项，等待推进 MVP。",
        createdAt: now,
        updatedAt: now,
        closedAt: null
      };
      playerProducts.set(product.id, product);
      profile.cash -= config.launchCost;
      profile.monthlyExpense += config.serverCost;
      profile.valuation += Math.round(config.launchCost * 0.6);

      return { product, productCenter: toProductCenterRecord(profile), result: `${config.name} 已完成立项。` } satisfies ProductActionRecord;
    },
    async advanceProduct(accountId, serverId, productId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const product = playerProducts.get(productId);
      if (product === undefined || !product.id.startsWith(`${profile.id}:`)) {
        return "PRODUCT_NOT_FOUND";
      }
      if (product.status === "closed") {
        return "PRODUCT_CLOSED";
      }
      if (profile.cash < product.acquisitionCost) {
        return "INSUFFICIENT_CASH";
      }
      const config = productConfigs.find((item) => item.id === product.configId);
      if (config === undefined) {
        return "PRODUCT_NOT_FOUND";
      }

      const previousRevenue = product.monthlyRevenue;
      const previousServerCost = product.serverCost;
      const nextMetrics = calculateNextProductMetrics({
        stage: product.stage as ProductStage,
        users: product.users,
        retentionBasisPoints: product.retentionBasisPoints,
        payRateBasisPoints: product.payRateBasisPoints,
        revenuePerPayingUser: config.revenuePerPayingUser,
        acquisitionCost: product.acquisitionCost,
        serverCost: product.serverCost,
        reputationScore: product.reputationScore,
        techDebt: product.techDebt,
        techDebtGrowth: config.techDebtGrowth,
        reputationGrowth: config.reputationGrowth
      });

      Object.assign(product, {
        stage: nextMetrics.stage,
        users: nextMetrics.users,
        retentionBasisPoints: nextMetrics.retentionBasisPoints,
        payRateBasisPoints: nextMetrics.payRateBasisPoints,
        serverCost: nextMetrics.serverCost,
        reputationScore: nextMetrics.reputationScore,
        techDebt: nextMetrics.techDebt,
        monthlyRevenue: nextMetrics.monthlyRevenue,
        resultSummary: nextMetrics.resultSummary,
        updatedAt: new Date().toISOString()
      });
      profile.cash -= product.acquisitionCost;
      profile.monthlyIncome += product.monthlyRevenue - previousRevenue;
      profile.monthlyExpense += product.serverCost - previousServerCost;
      profile.valuation += Math.round(product.monthlyRevenue * 2.4);
      profile.reputation += product.reputationScore * 20;

      if (nextMetrics.incidentTriggered) {
        const eventConfig = eventConfigs.find((item) => item.id === "product-tech-debt-incident");
        if (eventConfig !== undefined) {
          const event = toEventRecord(profile.id, eventConfig);
          playerEvents.set(event.id, event);
          profile.pendingEventCount += 1;
          profile.riskStatus = "预警";
        }
      }

      return { product, productCenter: toProductCenterRecord(profile), result: product.resultSummary ?? "" } satisfies ProductActionRecord;
    },
    async refactorProduct(accountId, serverId, productId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const product = playerProducts.get(productId);
      if (product === undefined || !product.id.startsWith(`${profile.id}:`)) {
        return "PRODUCT_NOT_FOUND";
      }
      if (product.status === "closed") {
        return "PRODUCT_CLOSED";
      }
      const refactorCost = Math.max(120000, Math.round(product.acquisitionCost * 0.8));
      if (profile.cash < refactorCost) {
        return "INSUFFICIENT_CASH";
      }

      profile.cash -= refactorCost;
      product.techDebt = Math.max(0, product.techDebt - 38);
      product.reputationScore = Math.min(100, product.reputationScore + 6);
      product.stage = product.stage === "decline" ? "growth" : product.stage;
      product.resultSummary = "产品完成重构，技术债和事故风险下降。";
      product.updatedAt = new Date().toISOString();
      profile.reputation += 800;
      profile.riskStatus = product.techDebt >= 70 ? "预警" : "稳健";

      return { product, productCenter: toProductCenterRecord(profile), result: product.resultSummary } satisfies ProductActionRecord;
    },
    async closeProduct(accountId, serverId, productId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const product = playerProducts.get(productId);
      if (product === undefined || !product.id.startsWith(`${profile.id}:`)) {
        return "PRODUCT_NOT_FOUND";
      }
      if (product.status === "closed") {
        return "PRODUCT_CLOSED";
      }

      const now = new Date().toISOString();
      profile.monthlyIncome = Math.max(0, profile.monthlyIncome - product.monthlyRevenue);
      profile.monthlyExpense = Math.max(0, profile.monthlyExpense - product.serverCost);
      profile.reputation = Math.max(0, profile.reputation - 300);
      product.stage = "closed";
      product.status = "closed";
      product.monthlyRevenue = 0;
      product.resultSummary = "产品已关闭，长期收入和服务器成本同步停止。";
      product.updatedAt = now;
      product.closedAt = now;

      return { product, productCenter: toProductCenterRecord(profile), result: product.resultSummary } satisfies ProductActionRecord;
    },
    async listMarkets(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toMarketCenterRecord(profile);
    },
    async enterMarket(accountId, serverId, trackId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const config = marketTrackConfigs.find((item) => item.id === trackId);
      if (config === undefined) {
        return "MARKET_NOT_FOUND";
      }
      const marketId = `${profile.id}:${config.id}`;
      if (playerMarkets.has(marketId)) {
        return "MARKET_ALREADY_ACTIVE";
      }

      const now = new Date().toISOString();
      const market: PlayerMarketRecord = {
        id: marketId,
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
        resultSummary: `${config.name} 赛道已进入，后续竞品行为会影响市场份额。`,
        createdAt: now,
        updatedAt: now
      };
      playerMarkets.set(market.id, market);
      return { market, action: null, marketCenter: toMarketCenterRecord(profile), result: market.resultSummary ?? "" } satisfies MarketActionRecord;
    },
    async triggerCompetitorAction(accountId, serverId, trackId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const market = playerMarkets.get(`${profile.id}:${trackId}`);
      if (market === undefined) {
        return "MARKET_NOT_FOUND";
      }
      const usedActionIds = new Set(competitorActionsForProfile(profile.id).filter((item) => item.trackId === trackId).map((item) => item.actionId));
      const config = competitorActionConfigs.find((item) => item.trackId === trackId && !usedActionIds.has(item.id));
      if (config === undefined) {
        return "COMPETITOR_ACTION_NOT_FOUND";
      }

      const now = new Date().toISOString();
      const action = {
        id: `${profile.id}:${config.id}`,
        actionId: config.id,
        trackId: config.trackId,
        competitorName: config.competitorName,
        actionType: config.actionType,
        title: config.title,
        summary: config.summary,
        status: "pending" as const,
        response: null,
        resultSummary: null,
        createdAt: now,
        resolvedAt: null
      };
      playerCompetitorActions.set(action.id, action);
      market.playerShareBasisPoints = Math.max(100, market.playerShareBasisPoints + config.marketShareDeltaBasisPoints);
      market.competitorShareBasisPoints += config.competitorShareDeltaBasisPoints;
      market.pricePressure += config.pricePressure;
      market.talentPressure += config.talentPressure;
      market.policyRisk += config.policyRiskDelta;
      market.reputationPressure += Math.max(0, -config.reputationImpact);
      market.patentRisk += config.actionType === "patent" ? 18 : 0;
      market.resultSummary = config.summary;
      market.updatedAt = now;
      profile.cash += config.cashImpact;
      profile.monthlyIncome += config.monthlyIncomeImpact;
      profile.monthlyExpense += config.monthlyExpenseImpact;
      profile.reputation += config.reputationImpact;
      profile.employeeSatisfaction += config.employeeSatisfactionImpact;
      profile.customerSatisfaction += config.customerSatisfactionImpact;
      profile.riskStatus = "预警";
      profile.pendingEventCount += 1;
      return { market, action, marketCenter: toMarketCenterRecord(profile), result: `${config.competitorName} 已发起${config.title}。` } satisfies MarketActionRecord;
    },
    async respondCompetitorAction(accountId, serverId, actionId, response) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const action = playerCompetitorActions.get(actionId);
      if (action === undefined || !action.id.startsWith(`${profile.id}:`)) {
        return "COMPETITOR_ACTION_NOT_FOUND";
      }
      if (action.status === "resolved") {
        return "COMPETITOR_ACTION_SETTLED";
      }
      const market = playerMarkets.get(`${profile.id}:${action.trackId}`);
      if (market === undefined) {
        return "MARKET_NOT_FOUND";
      }
      const config = competitorActionConfigs.find((item) => item.id === action.actionId);
      if (config === undefined) {
        return "COMPETITOR_ACTION_NOT_FOUND";
      }
      const responseCost = response === "counter" ? config.responseCost : Math.round(config.responseCost * 0.55);
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
        actionShareDeltaBasisPoints: response === "counter" ? config.responseShareDeltaBasisPoints : Math.round(config.responseShareDeltaBasisPoints * 0.65)
      });
      profile.cash -= responseCost;
      profile.reputation += response === "counter" ? config.responseReputationImpact : Math.round(config.responseReputationImpact * 0.45);
      profile.customerSatisfaction += response === "counter" ? 3 : 2;
      profile.riskStatus = "稳健";
      market.playerShareBasisPoints = shareResult.playerShareBasisPoints;
      market.competitorShareBasisPoints = shareResult.competitorShareBasisPoints;
      market.pricePressure = Math.max(0, market.pricePressure - (response === "counter" ? 10 : 6));
      market.talentPressure = Math.max(0, market.talentPressure - (response === "counter" ? 10 : 6));
      market.reputationPressure = Math.max(0, market.reputationPressure - (response === "counter" ? 800 : 400));
      market.resultSummary = response === "counter" ? `${action.competitorName} 的攻势被正面反击，市场份额回升。` : `${action.competitorName} 的攻势被防守化解，经营压力下降。`;
      market.updatedAt = new Date().toISOString();
      action.status = "resolved";
      action.response = response;
      action.resultSummary = market.resultSummary;
      action.resolvedAt = market.updatedAt;
      return { market, action, marketCenter: toMarketCenterRecord(profile), result: shareResult.resultSummary } satisfies MarketActionRecord;
    },
    async getWallet(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : ensureWallet(profile);
    },
    async listShop(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toShopCenter(profile);
    },
    async listInventory(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      return {
        items: [...inventoryItems.values()]
          .filter((entry) => entry.profileId === profile.id && entry.quantity > 0)
          .map((entry) => {
            const config = itemConfigs.find((item) => item.id === entry.itemId);
            assert.ok(config);
            return { ...config, id: entry.id, itemId: entry.itemId, quantity: entry.quantity, updatedAt: entry.updatedAt };
          }),
        recentLedgers: itemLedgers
          .filter((entry) => entry.profileId === profile.id)
          .slice(0, 20)
          .map((entry) => ({
            id: entry.id,
            itemId: entry.itemId,
            itemName: itemConfigs.find((item) => item.id === entry.itemId)?.name ?? entry.itemId,
            changeQuantity: entry.changeQuantity,
            balanceAfter: entry.balanceAfter,
            source: entry.source,
            reason: entry.reason,
            createdAt: entry.createdAt
          }))
      };
    },
    async useInventoryItem(accountId, serverId, itemId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      if (itemId !== "action-drink") {
        return "ITEM_NOT_USABLE";
      }
      const key = `${profile.id}:${itemId}`;
      const existing = inventoryItems.get(key);
      if (existing === undefined || existing.quantity <= 0) {
        return "ITEM_NOT_FOUND";
      }
      const nextQuantity = existing.quantity - 1;
      const updatedAt = new Date().toISOString();
      inventoryItems.set(key, { ...existing, quantity: nextQuantity, updatedAt });
      itemLedgers.unshift({
        id: randomUUID(),
        profileId: profile.id,
        itemId,
        changeQuantity: -1,
        balanceAfter: nextQuantity,
        source: "item_use",
        reason: "使用行动力饮料",
        createdAt: updatedAt
      });
      profile.actionPower += 40;
      const inventory = await this.listInventory(accountId, serverId);
      assert.notEqual(inventory, "PLAYER_NOT_FOUND");
      const config = itemConfigs.find((item) => item.id === itemId);
      assert.ok(config);
      return {
        item: { ...config, id: existing.id, itemId, quantity: nextQuantity, updatedAt },
        inventory,
        profile,
        result: "行动力饮料已使用，行动力 +40。"
      };
    },
    async purchaseShopProduct(accountId, serverId, productId, requestId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const existing = [...shopPurchases.values()].find((purchase) => purchase.profileId === profile.id && purchase.requestId === requestId);
      if (existing !== undefined) {
        const product = shopProducts.find((item) => item.id === existing.productId);
        assert.ok(product);
        return {
          wallet: ensureWallet(profile),
          product: toShopProduct(profile, product),
          purchase: {
            id: existing.id,
            productId: existing.productId,
            requestId: existing.requestId,
            pricePlatformCoins: existing.pricePlatformCoins,
            createdAt: existing.createdAt
          },
          profile,
          isDuplicate: true,
          result: "重复请求已识别，未重复扣除平台币。"
        };
      }
      const product = shopProducts.find((item) => item.id === productId);
      if (product === undefined) {
        return "SHOP_PRODUCT_NOT_FOUND";
      }
      const purchaseCount =
        product.category === "daily_pack"
          ? [...shopPurchases.values()].filter((purchase) => purchase.profileId === profile.id && purchase.productId === product.id && purchase.createdAt.startsWith(today)).length
          : productPurchaseCount(profile.id, product.id);
      if (product.purchaseLimit > 0 && purchaseCount >= product.purchaseLimit) {
        return "PURCHASE_LIMIT_REACHED";
      }
      const wallet = ensureWallet(profile);
      if (wallet.balance < product.pricePlatformCoins) {
        return "INSUFFICIENT_PLATFORM_COINS";
      }

      wallet.balance -= product.pricePlatformCoins;
      wallet.totalSpent += product.pricePlatformCoins;
      wallet.vipExperience += product.pricePlatformCoins;
      profile.platformCoins = wallet.balance;
      profile.cash += product.rewardCash;
      profile.actionPower += product.rewardActionPower;
      profile.reputation += product.rewardReputation;
      grantInventoryItem(profile.id, product.rewardItemId ?? null, product.rewardItemQuantity ?? 0, "shop_purchase", `购买商品：${product.name}`);
      const purchase = {
        id: randomUUID(),
        profileId: profile.id,
        productId: product.id,
        requestId,
        pricePlatformCoins: product.pricePlatformCoins,
        createdAt: product.category === "daily_pack" ? `${today}T00:00:00.000Z` : new Date().toISOString()
      };
      shopPurchases.set(purchase.id, purchase);
      addLedger(profile.id, -product.pricePlatformCoins, wallet.balance, "shop_purchase", purchase.id, `购买商品：${product.name}`);
      return {
        wallet,
        product: toShopProduct(profile, product),
        purchase: {
          id: purchase.id,
          productId: purchase.productId,
          requestId: purchase.requestId,
          pricePlatformCoins: purchase.pricePlatformCoins,
          createdAt: purchase.createdAt
        },
        profile,
        isDuplicate: false,
        result: `${product.name} 已发货，平台币扣减和奖励发放已记录流水。`
      };
    },
    async adjustPlatformCoins(adminUserId, profileId, changeAmount, source, reason) {
      if (source !== "admin_grant" && source !== "admin_deduct" && source !== "admin_correction") {
        return "INVALID_PLATFORM_COIN_SOURCE";
      }
      const profile = [...profiles.values()].find((item) => item.id === profileId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const wallet = ensureWallet(profile);
      if (wallet.balance + changeAmount < 0) {
        return "INSUFFICIENT_PLATFORM_COINS";
      }
      wallet.balance += changeAmount;
      profile.platformCoins = wallet.balance;
      addLedger(profile.id, changeAmount, wallet.balance, source, null, reason);
      return {
        wallet,
        profile,
        auditLogId: `${adminUserId}:${profileId}:${wallet.ledgers[0]?.id ?? randomUUID()}`
      };
    },
    async reserveExternalPayment(accountId, serverId, productId, amountCents, platformCoins) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      return {
        id: randomUUID(),
        profileId: profile.id,
        productId,
        provider: "reserved",
        amountCents,
        platformCoins,
        status: "reserved",
        createdAt: new Date().toISOString()
      };
    },
    async getVipCenter(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toVipCenter(profile, today);
    },
    async claimVipDailyGift(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const key = `${profile.id}:${today}`;
      if (vipDailyGifts.has(key)) {
        return "VIP_DAILY_GIFT_ALREADY_CLAIMED";
      }
      const vipCenter = toVipCenter(profile, today);
      const wallet = ensureWallet(profile);
      wallet.balance += vipCenter.dailyGift.rewardPlatformCoins;
      profile.platformCoins = wallet.balance;
      profile.actionPower += vipCenter.dailyGift.rewardActionPower;
      profile.actionPowerLimit = Math.max(profile.actionPowerLimit, vipCenter.benefits.actionPowerLimit);
      vipDailyGifts.add(key);
      if (vipCenter.dailyGift.rewardPlatformCoins > 0) {
        addLedger(profile.id, vipCenter.dailyGift.rewardPlatformCoins, wallet.balance, "system_compensation", key, `领取 ${vipCenter.currentLevel.name} 每日礼包`);
      }
      return {
        vipCenter: toVipCenter(profile, today),
        profile,
        result: `${vipCenter.currentLevel.name} 每日礼包已领取。`
      };
    },
    async adjustVipExperience(adminUserId, profileId, vipExperience, reason) {
      const profile = [...profiles.values()].find((item) => item.id === profileId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const wallet = ensureWallet(profile);
      wallet.vipExperience = vipExperience;
      return {
        vipCenter: toVipCenter(profile, new Date().toISOString().slice(0, 10)),
        auditLogId: `${adminUserId}:${profileId}:${reason}`
      };
    },
    async getAdminVipRecord(profileId, today) {
      const profile = [...profiles.values()].find((item) => item.id === profileId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toVipCenter(profile, today);
    },
    async listVipLevelConfigs() {
      return [...vipLevels].sort((left, right) => left.requiredExperience - right.requiredExperience);
    },
    async upsertVipLevelConfig(adminUserId, config, reason) {
      const index = vipLevels.findIndex((item) => item.level === config.level);
      if (index === -1) {
        vipLevels.push(config);
      } else {
        vipLevels[index] = config;
      }
      return {
        config,
        auditLogId: `${adminUserId}:vip-config:${config.level}:${reason}`
      };
    },
    async getSeasonCenter(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toSeasonCenter(profile, today);
    },
    async progressSeasonTask(accountId, serverId, taskId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) return "PLAYER_NOT_FOUND";
      const task = seasonTasks.find((item) => item.id === taskId);
      if (task === undefined) return "SEASON_TASK_NOT_FOUND";
      const key = seasonTaskKey(profile.id, taskId);
      const state = seasonTaskProgresses.get(key) ?? { progress: 0, claimedAt: null };
      state.progress = Math.min(task.target, state.progress + 1);
      if (state.claimedAt === null && state.progress >= task.target) {
        state.claimedAt = today;
        const progress = seasonProgresses.get(seasonKey(profile.id)) ?? { points: 0 };
        progress.points += task.rewardPoints;
        seasonProgresses.set(seasonKey(profile.id), progress);
      }
      seasonTaskProgresses.set(key, state);
      const center = toSeasonCenter(profile, today);
      return { season: center.season, task: center.tasks.find((item) => item.id === taskId)! };
    },
    async purchaseSeasonPass(accountId, serverId, seasonId, requestId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) return "PLAYER_NOT_FOUND";
      if (seasonId !== seasonConfig.id) return "SEASON_NOT_FOUND";
      const existing = [...seasonPassPurchases.values()].find((purchase) => purchase.profileId === profile.id && purchase.requestId === requestId);
      const wallet = ensureWallet(profile);
      if (existing !== undefined) return { season: toSeasonCenter(profile, today).season, wallet, isDuplicate: true };
      if (wallet.balance < seasonConfig.passPricePlatformCoins) return "INSUFFICIENT_PLATFORM_COINS";
      wallet.balance -= seasonConfig.passPricePlatformCoins;
      wallet.totalSpent += seasonConfig.passPricePlatformCoins;
      wallet.vipExperience += seasonConfig.passPricePlatformCoins;
      profile.platformCoins = wallet.balance;
      seasonPassPurchases.set(`${profile.id}:${requestId}`, { profileId: profile.id, seasonId, requestId, pricePlatformCoins: seasonConfig.passPricePlatformCoins });
      addLedger(profile.id, -seasonConfig.passPricePlatformCoins, wallet.balance, "season_pass_purchase", requestId, `购买赛季通行证：${seasonConfig.name}`);
      return { season: toSeasonCenter(profile, today).season, wallet, isDuplicate: false };
    },
    async joinActivity(accountId, serverId, activityId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) return "PLAYER_NOT_FOUND";
      const activity = activityConfigs.find((item) => item.id === activityId);
      if (activity === undefined) return "ACTIVITY_NOT_FOUND";
      const state = activityStates.get(activityKey(profile.id, activityId)) ?? { profileId: profile.id, activityId, isJoined: false, score: 0, rewardClaimedAt: null };
      state.isJoined = true;
      activityStates.set(activityKey(profile.id, activityId), state);
      const center = toSeasonCenter(profile, today);
      return { season: center.season, activity: center.activities.find((item) => item.id === activityId)!, profile };
    },
    async progressActivity(accountId, serverId, activityId, scoreDelta, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) return "PLAYER_NOT_FOUND";
      const state = activityStates.get(activityKey(profile.id, activityId));
      if (state === undefined || !state.isJoined) return "ACTIVITY_NOT_JOINED";
      state.score += scoreDelta;
      const progress = seasonProgresses.get(seasonKey(profile.id)) ?? { points: 0 };
      progress.points += scoreDelta;
      seasonProgresses.set(seasonKey(profile.id), progress);
      const center = toSeasonCenter(profile, today);
      return { season: center.season, activity: center.activities.find((item) => item.id === activityId)!, profile };
    },
    async claimActivityReward(accountId, serverId, activityId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) return "PLAYER_NOT_FOUND";
      const activity = activityConfigs.find((item) => item.id === activityId);
      if (activity === undefined) return "ACTIVITY_NOT_FOUND";
      const state = activityStates.get(activityKey(profile.id, activityId));
      if (state === undefined || !state.isJoined) return "ACTIVITY_NOT_JOINED";
      if (state.score < activity.targetScore) return "ACTIVITY_INCOMPLETE";
      if (state.rewardClaimedAt !== null) return "ACTIVITY_REWARD_ALREADY_CLAIMED";
      state.rewardClaimedAt = today;
      profile.cash += activity.rewardCash;
      profile.reputation += activity.rewardReputation;
      const progress = seasonProgresses.get(seasonKey(profile.id)) ?? { points: 0 };
      progress.points += activity.rewardPoints;
      seasonProgresses.set(seasonKey(profile.id), progress);
      addTitle(profile.id, activity.rewardTitleId, "season", today);
      achievements.set(achievementKey(profile.id, "season-ai-agent-growth"), { profileId: profile.id, achievementId: "season-ai-agent-growth", progress: 1, completedAt: today, claimedAt: null });
      const center = toSeasonCenter(profile, today);
      return { season: center.season, activity: center.activities.find((item) => item.id === activityId)!, profile };
    },
    async purchaseActivityShopItem(accountId, serverId, itemId, requestId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) return "PLAYER_NOT_FOUND";
      const item = activityShopItems.find((entry) => entry.id === itemId);
      if (item === undefined) return "ACTIVITY_SHOP_ITEM_NOT_FOUND";
      const existing = [...activityShopPurchases.values()].find((purchase) => purchase.profileId === profile.id && purchase.requestId === requestId);
      const centerBefore = toSeasonCenter(profile, today);
      if (existing !== undefined) return { season: centerBefore.season, wallet: ensureWallet(profile), item: centerBefore.shopItems.find((entry) => entry.id === itemId)!, profile, isDuplicate: true };
      const progress = seasonProgresses.get(seasonKey(profile.id)) ?? { points: 0 };
      if (progress.points < item.costPoints) return "INSUFFICIENT_ACTIVITY_POINTS";
      progress.points -= item.costPoints;
      profile.actionPower += item.rewardActionPower;
      profile.reputation += item.rewardReputation;
      activityShopPurchases.set(`${profile.id}:${requestId}`, { profileId: profile.id, itemId, requestId, costPoints: item.costPoints });
      const center = toSeasonCenter(profile, today);
      return { season: center.season, wallet: ensureWallet(profile), item: center.shopItems.find((entry) => entry.id === itemId)!, profile, isDuplicate: false };
    },
    async startScenario(accountId, serverId, scenarioId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) return "PLAYER_NOT_FOUND";
      if (!scenarioConfigs.some((scenario) => scenario.id === scenarioId)) return "SCENARIO_NOT_FOUND";
      const id = randomUUID();
      scenarioRuns.set(id, { id, profileId: profile.id, scenarioId, choices: [], score: null, grade: null, rewardClaimed: false });
      return { run: { id, scenarioId, initialState: { cashDays: 15, debtRatioBasisPoints: 8000, coreEmployeeRisk: "核心员工准备离职", customerDelay: "大客户延期付款" }, choices: [], score: null, grade: null, rewardClaimed: false } };
    },
    async settleScenario(accountId, serverId, runId, choices) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) return "PLAYER_NOT_FOUND";
      const run = scenarioRuns.get(runId);
      if (run === undefined || run.profileId !== profile.id) return "SCENARIO_RUN_NOT_FOUND";
      if (run.score === null) {
        run.choices = choices;
        run.score = Math.min(100, choices.reduce((sum, choice) => sum + (choice === "cost_cut" ? 28 : choice === "debt_restructure" ? 32 : choice === "compliance_fix" ? 32 : 0), 0));
        run.grade = run.score >= 90 ? "S" : run.score >= 75 ? "A" : "B";
        run.rewardClaimed = true;
        const scenario = scenarioConfigs.find((item) => item.id === run.scenarioId)!;
        profile.cash += scenario.rewardCash;
        profile.reputation += scenario.rewardReputation;
        addTitle(profile.id, scenario.rewardTitleId, "scenario", new Date().toISOString().slice(0, 10));
      }
      return { run: { id: run.id, scenarioId: run.scenarioId, initialState: { cashDays: 15, debtRatioBasisPoints: 8000, coreEmployeeRisk: "核心员工准备离职", customerDelay: "大客户延期付款" }, choices: run.choices, score: run.score, grade: run.grade, rewardClaimed: run.rewardClaimed } };
    },
    async getLeaderboards(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : buildLeaderboards(serverId, today);
    },
    async settleLeaderboardRewards(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const leaderboard = buildLeaderboards(serverId, today);
      let deliveredRewards = 0;
      for (const board of leaderboard.boards) {
        for (const row of board.rows.slice(0, 3)) {
          const key = `${row.profileId}:${board.key}:${today}`;
          if (!leaderboardRewards.has(key)) {
            leaderboardRewards.add(key);
            deliveredRewards += 1;
            if (board.key === "company-value" && row.rank === 1) {
              addTitle(row.profileId, "server-richest", "leaderboard", today);
            }
          }
        }
      }
      return { leaderboard, deliveredRewards } satisfies LeaderboardSettlementRecord;
    },
    async getCrossServerCenter(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      return buildCrossServerCenter(profile, today);
    },
    async getCrossServerGuildHistory(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      return toCrossServerGuildHistory(profile);
    },
    async registerCrossServer(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const group = crossServerGroups.find((item) => item.serverIds.includes(serverId));
      if (group === undefined) {
        return "CROSS_SERVER_GROUP_NOT_FOUND";
      }
      crossServerSignups.add(`${profile.id}:${group.id}`);
      return buildCrossServerCenter(profile, today);
    },
    async registerCrossServerGuild(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const group = crossServerGroups.find((item) => item.serverIds.includes(serverId));
      if (group === undefined) {
        return "CROSS_SERVER_GROUP_NOT_FOUND";
      }
      const member = guildMembers.get(profile.id);
      if (member === undefined) {
        return "GUILD_NOT_JOINED";
      }
      if (member.role !== "leader" && member.role !== "vice_leader") {
        return "GUILD_PERMISSION_DENIED";
      }
      const guildMemberCount = [...guildMembers.values()].filter((item) => item.guildId === member.guildId).length;
      const todayActiveMemberCount = new Set([...guildActivityLogs.values()]
        .filter((activity) => activity.guildId === member.guildId && activity.createdAt.slice(0, 10) === today)
        .map((activity) => activity.profileId)).size;
      if (guildMemberCount < 2 || todayActiveMemberCount < 2) {
        return "GUILD_SEASON_REQUIREMENT_NOT_MET";
      }
      crossServerGuildSignups.add(`${member.guildId}|${group.id}`);
      return buildCrossServerCenter(profile, today);
    },
    async settleCrossServerRewards(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const center = buildCrossServerCenter(profile, today);
      if (center === "CROSS_SERVER_GROUP_NOT_FOUND") {
        return center;
      }
      let deliveredRewards = 0;
      for (const board of center.boards) {
        for (const row of board.rows.slice(0, 3)) {
          const key = `${row.profileId}:${board.key}:${today}`;
          if (!leaderboardRewards.has(key)) {
            leaderboardRewards.add(key);
            deliveredRewards += 1;
            if (board.key === "cross-company-value" && row.rank === 1) {
              addTitle(row.profileId, "cross-unicorn", "cross_server", today);
            }
          }
        }
      }
      return { leaderboard: { boards: center.boards, activityBoards: [] }, deliveredRewards } satisfies LeaderboardSettlementRecord;
    },
    async settleCrossServerGuildRewards(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const center = buildCrossServerCenter(profile, today);
      if (center === "CROSS_SERVER_GROUP_NOT_FOUND") {
        return center;
      }
      const member = guildMembers.get(profile.id);
      if (member === undefined) {
        return "GUILD_NOT_JOINED";
      }
      const rewards = center.guildBoard.rows.slice(0, 3).map((row, index) => ({
        guildId: row.guildId,
        guildName: row.guildName,
        leaderProfileId: row.leaderProfileId,
        leaderFounderName: row.leaderFounderName,
        rank: row.rank,
        reputationReward: [180, 120, 80][index] ?? 0
      })).filter((reward) => reward.reputationReward > 0);
      let deliveredRewards = 0;
      for (const reward of rewards) {
        const key = `${reward.leaderProfileId}:cross-guild-season:${today}`;
        if (leaderboardRewards.has(key)) {
          continue;
        }
        leaderboardRewards.add(key);
        const rewardProfile = getProfileById(reward.leaderProfileId);
        if (rewardProfile !== undefined) {
          rewardProfile.reputation += reward.reputationReward;
        }
        crossGuildLeaderboardDeliveries.push({
          guildId: reward.guildId,
          profileId: reward.leaderProfileId,
          serverId,
          groupId: center.group.id,
          snapshotDate: today,
          rank: reward.rank,
          reputationReward: reward.reputationReward
        });
        deliveredRewards += 1;
      }
      return { leaderboard: { boards: center.boards, activityBoards: [] }, deliveredRewards, rewards: deliveredRewards > 0 ? rewards : [] };
    },
    async listTitles(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toTitleCenter(profile, today);
    },
    async equipTitle(accountId, serverId, titleId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const title = playerTitles.get(titleKey(profile.id, titleId));
      if (title === undefined) {
        return "TITLE_NOT_FOUND";
      }
      if (isExpired(title.expiresAt, today)) {
        return "TITLE_EXPIRED";
      }
      titleEquipment.set(profile.id, titleId);
      return toTitleCenter(profile, today);
    },
    async listAchievements(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      syncAchievements(profile);
      return achievementConfigs.map((config) => toAchievement(profile, config)).filter((achievement) => !achievement.isHidden || achievement.isCompleted);
    },
    async claimAchievement(accountId, serverId, achievementId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      syncAchievements(profile);
      const progress = achievements.get(achievementKey(profile.id, achievementId));
      const config = achievementConfigs.find((item) => item.id === achievementId);
      if (progress === undefined || config === undefined) {
        return "ACHIEVEMENT_NOT_FOUND";
      }
      if (progress.completedAt === null) {
        return "ACHIEVEMENT_INCOMPLETE";
      }
      if (progress.claimedAt !== null) {
        return "ACHIEVEMENT_ALREADY_CLAIMED";
      }
      progress.claimedAt = new Date().toISOString();
      profile.cash += config.rewardCash;
      profile.platformCoins += config.rewardPlatformCoins;
      profile.actionPower += config.rewardActionPower;
      if (config.rewardTitleId !== null) {
        addTitle(profile.id, config.rewardTitleId, "achievement");
      }
      unlockKnowledgeEntry(profile.id, config.rewardKnowledgeId, "achievement");
      return {
        achievement: toAchievement(profile, config),
        profile,
        titleCenter: toTitleCenter(profile, new Date().toISOString().slice(0, 10)),
        result: `${config.name} 奖励已领取。`
      } satisfies AchievementClaimRecord;
    },
    async listKnowledge(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const unlockedAtByKnowledgeId = new Map(
        [...knowledgeUnlocks.values()]
          .filter((unlock) => unlock.profileId === profile.id)
          .map((unlock) => [unlock.knowledgeId, unlock.unlockedAt])
      );
      return knowledgeEntries.map((knowledge) => {
        const unlockedAt = unlockedAtByKnowledgeId.get(knowledge.id) ?? null;
        const isUnlocked = unlockedAt !== null;
        return {
          id: knowledge.id,
          category: knowledge.category,
          title: knowledge.title,
          summary: isUnlocked ? knowledge.summary : "完成对应经营履历后解锁完整知识卡。",
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
          unlockedAt
        };
      }) satisfies KnowledgeEntryRecord[];
    },
    async getGuildCenter(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toGuildCenter(profile, today);
    },
    async getGuildHistory(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toGuildHistory(profile);
    },
    async joinOrCreateGuild(accountId, serverId, guildName, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const guildKey = `${serverId}:${guildName}`;
      const existingMember = guildMembers.get(profile.id);
      if (existingMember !== undefined) {
        return { guildCenter: toGuildCenter(profile, today), result: `${guilds.get(existingMember.guildId)?.name ?? guildName} 已加入。`, applicationStatus: "approved" } satisfies GuildActionRecord & { applicationStatus: "approved" };
      }
      const existingGuild = guilds.get(guildKey);
      if (existingGuild !== undefined) {
        const existingRequest = [...guildJoinRequests.values()].find((request) => request.guildId === existingGuild.id && request.profileId === profile.id);
        const request = existingRequest ?? { id: randomUUID(), guildId: existingGuild.id, profileId: profile.id, status: "pending", createdAt: `${today}T12:00:00.000Z`, reviewedAt: null, reviewedByProfileId: null };
        request.status = "pending";
        request.reviewedAt = null;
        request.reviewedByProfileId = null;
        guildJoinRequests.set(request.id, request);
        return { guildCenter: toGuildCenter(profile, today), result: "入会申请已提交，等待会长或副会长审核。", applicationStatus: "pending" } satisfies GuildActionRecord & { applicationStatus: "pending" };
      }
      const guild = { id: guildKey, serverId, name: guildName, level: 1, contributionScore: 0, announcement: "", collaborationRules: "" };
      guilds.set(guildKey, guild);
      guildMembers.set(profile.id, { guildId: guild.id, profileId: profile.id, role: "leader", contributionScore: 0 });
      return { guildCenter: toGuildCenter(profile, today), result: `${guildName} 已加入。`, applicationStatus: "approved" } satisfies GuildActionRecord & { applicationStatus: "approved" };
    },
    async reviewGuildApplication(accountId, serverId, requestId, decision, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const reviewer = guildMembers.get(profile.id);
      if (reviewer === undefined) {
        return "GUILD_NOT_JOINED";
      }
      if (reviewer.role !== "leader" && reviewer.role !== "vice_leader") {
        return "GUILD_PERMISSION_DENIED";
      }
      const request = guildJoinRequests.get(requestId);
      if (request === undefined || request.guildId !== reviewer.guildId) {
        return "GUILD_APPLICATION_NOT_FOUND";
      }
      if (request.status !== "pending") {
        return "GUILD_APPLICATION_ALREADY_REVIEWED";
      }
      request.status = decision;
      request.reviewedAt = `${today}T12:00:00.000Z`;
      request.reviewedByProfileId = profile.id;
      if (decision === "approved") {
        guildMembers.set(request.profileId, { guildId: reviewer.guildId, profileId: request.profileId, role: "member", contributionScore: 0 });
      }
      return { guildCenter: toGuildCenter(profile, today), result: decision === "approved" ? "入会申请已通过。" : "入会申请已拒绝。" } satisfies GuildActionRecord;
    },
    async updateGuildMemberRole(accountId, serverId, profileId, role, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const operator = guildMembers.get(profile.id);
      if (operator === undefined) {
        return "GUILD_NOT_JOINED";
      }
      if (operator.role !== "leader") {
        return "GUILD_PERMISSION_DENIED";
      }
      if (profile.id === profileId) {
        return "GUILD_SELF_ROLE_FORBIDDEN";
      }
      const target = guildMembers.get(profileId);
      if (target === undefined || target.guildId !== operator.guildId) {
        return "GUILD_MEMBER_NOT_FOUND";
      }
      if (target.role === "leader") {
        return "GUILD_PERMISSION_DENIED";
      }
      target.role = role;
      return { guildCenter: toGuildCenter(profile, today), result: role === "vice_leader" ? "已任命副会长。" : "成员职位已更新。" } satisfies GuildActionRecord;
    },
    async removeGuildMember(accountId, serverId, profileId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const operator = guildMembers.get(profile.id);
      if (operator === undefined) {
        return "GUILD_NOT_JOINED";
      }
      if (profile.id === profileId) {
        return "GUILD_SELF_REMOVE_FORBIDDEN";
      }
      if (operator.role !== "leader") {
        return "GUILD_PERMISSION_DENIED";
      }
      const target = guildMembers.get(profileId);
      if (target === undefined || target.guildId !== operator.guildId) {
        return "GUILD_MEMBER_NOT_FOUND";
      }
      if (target.role !== "member") {
        return "GUILD_PERMISSION_DENIED";
      }
      guildMembers.delete(profileId);
      return { guildCenter: toGuildCenter(profile, today), result: "成员已移出商会。" } satisfies GuildActionRecord;
    },
    async updateGuildSettings(accountId, serverId, announcement, collaborationRules, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const member = guildMembers.get(profile.id);
      if (member === undefined) {
        return "GUILD_NOT_JOINED";
      }
      if (member.role !== "leader" && member.role !== "vice_leader") {
        return "GUILD_PERMISSION_DENIED";
      }
      const guild = [...guilds.values()].find((item) => item.id === member.guildId);
      if (guild !== undefined) {
        guild.announcement = announcement;
        guild.collaborationRules = collaborationRules;
      }
      return { guildCenter: toGuildCenter(profile, today), result: "商会公告已更新。" } satisfies GuildActionRecord;
    },
    async requestGuildHelp(accountId, serverId, requestType, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const member = guildMembers.get(profile.id);
      if (member === undefined) {
        return "GUILD_NOT_JOINED";
      }
      const request = { id: randomUUID(), guildId: member.guildId, profileId: profile.id, requestType, status: "open", createdAt: `${today}T12:00:00.000Z`, fulfilledAt: null };
      guildHelpRequests.set(request.id, request);
      member.contributionScore += 20;
      const guild = [...guilds.values()].find((item) => item.id === member.guildId);
      if (guild !== undefined) {
        guild.contributionScore += 20;
      }
      guildActivityLogs.set(`${request.id}:help_requested`, { id: `${request.id}:help_requested`, guildId: member.guildId, profileId: profile.id, action: "help_requested", createdAt: `${today}T12:00:00.000Z` });
      advanceGuildProjects(member.guildId);
      return { guildCenter: toGuildCenter(profile, today), result: "商会互助已发布。" } satisfies GuildActionRecord;
    },
    async fulfillGuildHelp(accountId, serverId, requestId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const member = guildMembers.get(profile.id);
      if (member === undefined) {
        return "GUILD_NOT_JOINED";
      }
      const request = guildHelpRequests.get(requestId);
      if (request === undefined || request.guildId !== member.guildId) {
        return "GUILD_HELP_NOT_FOUND";
      }
      if (request.profileId === profile.id) {
        return "GUILD_HELP_SELF_FULFILL_FORBIDDEN";
      }
      if (request.status !== "open" || request.fulfilledAt !== null) {
        return "GUILD_HELP_ALREADY_FULFILLED";
      }
      request.status = "fulfilled";
      request.fulfilledAt = `${today}T12:00:00.000Z`;
      member.contributionScore += 15;
      const guild = [...guilds.values()].find((item) => item.id === member.guildId);
      if (guild !== undefined) {
        guild.contributionScore += 15;
      }
      guildActivityLogs.set(`${request.id}:help_fulfilled`, { id: `${request.id}:help_fulfilled`, guildId: member.guildId, profileId: profile.id, action: "help_fulfilled", createdAt: `${today}T12:00:00.000Z` });
      advanceGuildProjects(member.guildId);
      return { guildCenter: toGuildCenter(profile, today), result: "商会协作已完成，贡献 +15。" } satisfies GuildActionRecord;
    },
    async claimGuildTask(accountId, serverId, taskId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const member = guildMembers.get(profile.id);
      if (member === undefined) {
        return "GUILD_NOT_JOINED";
      }
      if (taskId !== "guild-daily-help") {
        return "GUILD_TASK_NOT_FOUND";
      }
      const claimKey = `${member.guildId}:${taskId}`;
      if (guildTaskClaims.get(claimKey)?.claimedAt.slice(0, 10) === today) {
        return "GUILD_TASK_ALREADY_CLAIMED";
      }
      const todayHelpCount = [...guildHelpRequests.values()].filter((request) =>
        request.guildId === member.guildId && (request.createdAt.slice(0, 10) === today || request.fulfilledAt?.slice(0, 10) === today)
      ).length;
      if (todayHelpCount < 1) {
        return "GUILD_TASK_NOT_READY";
      }
      member.contributionScore += 20;
      const guild = [...guilds.values()].find((item) => item.id === member.guildId);
      if (guild !== undefined) {
        guild.contributionScore += 20;
      }
      guildTaskClaims.set(claimKey, { guildId: member.guildId, taskId, claimedAt: `${today}T12:00:00.000Z` });
      guildActivityLogs.set(`${member.guildId}:${profile.id}:${taskId}:task_claimed:${today}`, { id: `${member.guildId}:${profile.id}:${taskId}:task_claimed:${today}`, guildId: member.guildId, profileId: profile.id, action: "task_claimed", createdAt: `${today}T12:00:00.000Z` });
      advanceGuildProjects(member.guildId);
      return { guildCenter: toGuildCenter(profile, today), result: "商会任务已领取，贡献 +20。" } satisfies GuildActionRecord;
    },
    async upgradeGuildTech(accountId, serverId, techId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const member = guildMembers.get(profile.id);
      if (member === undefined) {
        return "GUILD_NOT_JOINED";
      }
      if (techId !== "shared-office") {
        return "GUILD_TECH_NOT_FOUND";
      }
      const guild = [...guilds.values()].find((item) => item.id === member.guildId);
      if (guild === undefined) {
        return "GUILD_NOT_JOINED";
      }
      const stateKey = `${member.guildId}:${techId}`;
      const currentLevel = guildTechStates.get(stateKey)?.level ?? 0;
      if (currentLevel >= 5) {
        return "GUILD_TECH_MAXED";
      }
      const upgradeCost = guildTechUpgradeCost(currentLevel);
      if (upgradeCost === null || guild.contributionScore < upgradeCost) {
        return "GUILD_CONTRIBUTION_NOT_ENOUGH";
      }
      const nextLevel = currentLevel + 1;
      guildTechStates.set(stateKey, { guildId: member.guildId, techId, level: nextLevel });
      guild.level = Math.max(guild.level, 1 + nextLevel);
      guildActivityLogs.set(`${member.guildId}:${profile.id}:${techId}:tech_upgraded:${today}`, { id: `${member.guildId}:${profile.id}:${techId}:tech_upgraded:${today}`, guildId: member.guildId, profileId: profile.id, action: "tech_upgraded", createdAt: `${today}T12:00:00.000Z` });
      advanceGuildProjects(member.guildId);
      return { guildCenter: toGuildCenter(profile, today), result: `联合办公 已升级到 Lv.${nextLevel}。` } satisfies GuildActionRecord;
    },
    async claimGuildProjectReward(accountId, serverId, projectId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const member = guildMembers.get(profile.id);
      if (member === undefined) {
        return "GUILD_NOT_JOINED";
      }
      const project = guildProjectConfigs.find((item) => item.id === projectId);
      if (project === undefined) {
        return "GUILD_PROJECT_NOT_FOUND";
      }
      const progress = guildProjectProgresses.get(`${member.guildId}:${projectId}`);
      if (progress?.claimedAt !== null && progress?.claimedAt !== undefined) {
        return "GUILD_PROJECT_REWARD_CLAIMED";
      }
      if ((progress?.progress ?? 0) < project.target) {
        return "GUILD_PROJECT_NOT_READY";
      }
      if (progress !== undefined) {
        progress.claimedAt = `${today}T12:00:00.000Z`;
      }
      profile.reputation += project.rewardReputation;
      return { guildCenter: toGuildCenter(profile, today), result: `${project.name} 已完成，声望 +${project.rewardReputation}。` } satisfies GuildActionRecord;
    },
    async settleGuildLeaderboard(accountId, serverId, today) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const member = guildMembers.get(profile.id);
      if (member === undefined) {
        return "GUILD_NOT_JOINED";
      }
      const settlementKey = `${member.guildId}:guild-contribution:${today}`;
      if (leaderboardRewards.has(settlementKey)) {
        return { guildCenter: toGuildCenter(profile, today), result: "今日商会贡献榜已结算。", deliveredRewards: 0, rewards: [] };
      }
      leaderboardRewards.add(settlementKey);
      const rewardValues = [120, 80, 50];
      const rewards = [...guildMembers.values()]
        .filter((item) => item.guildId === member.guildId)
        .sort((left, right) => right.contributionScore - left.contributionScore)
        .slice(0, 3)
        .map((rankedMember, index) => {
          const rankedProfile = getProfileById(rankedMember.profileId);
          return {
            profileId: rankedMember.profileId,
            founderName: rankedProfile?.founderName ?? "",
            companyName: rankedProfile?.companyName ?? "",
            rank: index + 1,
            reputationReward: rewardValues[index] ?? 0
          };
        })
        .filter((reward) => reward.reputationReward > 0);
      for (const reward of rewards) {
        const rewardProfile = getProfileById(reward.profileId);
        if (rewardProfile !== undefined) {
          rewardProfile.reputation += reward.reputationReward;
        }
        guildLeaderboardDeliveries.push({
          guildId: member.guildId,
          profileId: reward.profileId,
          serverId,
          snapshotDate: today,
          rank: reward.rank,
          reputationReward: reward.reputationReward
        });
      }
      return {
        guildCenter: toGuildCenter(profile, today),
        result: `商会贡献榜已结算，发放 ${rewards.length} 份声望奖励。`,
        deliveredRewards: rewards.length,
        rewards
      };
    },
    async disconnect() {}
  };
};

const withServer = async (
  run: (baseUrl: string) => Promise<void>
): Promise<void> => {
  const repository = createTestRepository();
  const server = createApiServer(config, repository);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    assert.ok(address);
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
    await repository.disconnect();
  }
};

const requestJson = async <T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; body: ApiBody<T> }> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers
    }
  });

  return {
    status: response.status,
    body: (await response.json()) as ApiBody<T>
  };
};

const createPlayerSession = async (
  baseUrl: string,
  username = `player${randomUUID().replaceAll("-", "").slice(0, 8)}`,
  serverId = "s1"
): Promise<{ token: string; profile: PlayerProfileRecord }> => {
  const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password: "secret12" })
  });
  assert.equal(register.status, 201);
  assert.equal(register.body.success, true);
  assert.ok(register.body.data?.token);

  const profile = await requestJson<PlayerProfileRecord>(baseUrl, "/players", {
    method: "POST",
    headers: { authorization: `Bearer ${register.body.data.token}` },
    body: JSON.stringify({
      serverId,
      avatarId: "strategist",
      founderName: "测试创始人",
      companyName: "测试科技"
    })
  });
  assert.equal(profile.status, 201);
  assert.equal(profile.body.success, true);
  assert.ok(profile.body.data);

  return { token: register.body.data.token, profile: profile.body.data };
};

test("cors preflight allows guild member delete requests", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/guild/members/test-profile`, {
      method: "OPTIONS",
      headers: {
        "access-control-request-method": "DELETE",
        origin: "http://127.0.0.1:5173"
      }
    });
    assert.equal(response.status, 204);
    assert.match(response.headers.get("access-control-allow-methods") ?? "", /DELETE/);
  });
});

test("registers an account, logs in, and returns a session token", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ accountId: string; token: string }>(
      baseUrl,
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ username: "alice", password: "secret12" })
      }
    );

    assert.equal(register.status, 201);
    assert.equal(register.body.success, true);
    assert.ok(register.body.data?.accountId);
    assert.ok(register.body.data?.token);

    const login = await requestJson<{ accountId: string; token: string }>(
      baseUrl,
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username: "alice", password: "secret12" })
      }
    );

    assert.equal(login.status, 200);
    assert.equal(login.body.success, true);
    assert.equal(login.body.data?.accountId, register.body.data.accountId);
    assert.ok(login.body.data?.token);

    const session = await requestJson<{ accountId: string; username: string }>(
      baseUrl,
      "/auth/session",
      { headers: { authorization: `Bearer ${login.body.data.token}` } }
    );

    assert.equal(session.status, 200);
    assert.equal(session.body.success, true);
    assert.equal(session.body.data?.accountId, register.body.data.accountId);
    assert.equal(session.body.data?.username, "alice");
  });
});

test("rejects invalid auth payloads and duplicate usernames", async () => {
  await withServer(async (baseUrl) => {
    const invalid = await requestJson(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "ab", password: "short" })
    });

    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.success, false);
    assert.equal(invalid.body.error?.code, "VALIDATION_ERROR");

    await requestJson(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });

    const duplicate = await requestJson(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });

    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.success, false);
    assert.equal(duplicate.body.error?.code, "ACCOUNT_EXISTS");
  });
});

test("returns server and avatar lists for authenticated accounts", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);

    const servers = await requestJson<Array<{ id: string; name: string }>>(baseUrl, "/servers", {
      headers: { authorization: `Bearer ${token}` }
    });
    const avatars = await requestJson<Array<{ id: string; name: string }>>(baseUrl, "/avatars", {
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(servers.status, 200);
    assert.equal(servers.body.success, true);
    assert.ok((servers.body.data?.length ?? 0) > 0);
    assert.equal(avatars.status, 200);
    assert.equal(avatars.body.success, true);
    assert.ok((avatars.body.data?.length ?? 0) > 0);
  });
});

test("creates one player profile per account per server", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };

    const created = await requestJson<{ id: string; serverId: string; avatarId: string }>(
      baseUrl,
      "/players",
      {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          serverId: "s1",
          avatarId: "strategist",
          founderName: "Alice",
          companyName: "Spark Studio"
        })
      }
    );

    assert.equal(created.status, 201);
    assert.equal(created.body.success, true);
    assert.equal(created.body.data?.serverId, "s1");

    const duplicate = await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "builder",
        founderName: "Alice2",
        companyName: "Spark Studio 2"
      })
    });

    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.success, false);
    assert.equal(duplicate.body.error?.code, "PLAYER_EXISTS");

    const profile = await requestJson<{ id: string; serverId: string }>(
      baseUrl,
      "/players?serverId=s1",
      { headers: auth }
    );

    assert.equal(profile.status, 200);
    assert.equal(profile.body.success, true);
    assert.equal(profile.body.data?.id, created.body.data?.id);
  });
});

test("calculates finance reports across cash-flow boundaries", () => {
  const cases = [
    {
      name: "positive net cash flow",
      input: { cash: 1000, monthlyIncome: 800, monthlyExpense: 300, totalDebt: 0, valuation: 10000 },
      expected: { netCashFlow: 500, cashAfterSettlement: 1500, debtRatioBasisPoints: 0, riskStatus: "稳健" }
    },
    {
      name: "negative flow with enough cash",
      input: { cash: 1000, monthlyIncome: 300, monthlyExpense: 800, totalDebt: 0, valuation: 10000 },
      expected: { netCashFlow: -500, cashAfterSettlement: 500, debtRatioBasisPoints: 0, riskStatus: "预警" }
    },
    {
      name: "cash shortage enters risk",
      input: { cash: 100, monthlyIncome: 200, monthlyExpense: 500, totalDebt: 0, valuation: 10000 },
      expected: { netCashFlow: -300, cashAfterSettlement: -200, debtRatioBasisPoints: 0, riskStatus: "资金紧张" }
    },
    {
      name: "cash can settle exactly to zero",
      input: { cash: 200, monthlyIncome: 100, monthlyExpense: 300, totalDebt: 0, valuation: 10000 },
      expected: { netCashFlow: -200, cashAfterSettlement: 0, debtRatioBasisPoints: 0, riskStatus: "预警" }
    },
    {
      name: "zero values stay stable",
      input: { cash: 0, monthlyIncome: 0, monthlyExpense: 0, totalDebt: 0, valuation: 0 },
      expected: { netCashFlow: 0, cashAfterSettlement: 0, debtRatioBasisPoints: 0, riskStatus: "稳健" }
    },
    {
      name: "debt with zero valuation maxes the debt ratio",
      input: { cash: 1000, monthlyIncome: 0, monthlyExpense: 0, totalDebt: 1, valuation: 0 },
      expected: { netCashFlow: 0, cashAfterSettlement: 1000, debtRatioBasisPoints: 10000, riskStatus: "预警" }
    },
    {
      name: "debt ratio warning starts at sixty percent",
      input: { cash: 1000, monthlyIncome: 0, monthlyExpense: 0, totalDebt: 6000, valuation: 10000 },
      expected: { netCashFlow: 0, cashAfterSettlement: 1000, debtRatioBasisPoints: 6000, riskStatus: "预警" }
    },
    {
      name: "high debt ratio becomes warning",
      input: { cash: 1000, monthlyIncome: 0, monthlyExpense: 0, totalDebt: 7000, valuation: 10000 },
      expected: { netCashFlow: 0, cashAfterSettlement: 1000, debtRatioBasisPoints: 7000, riskStatus: "预警" }
    },
    {
      name: "negative debt and valuation clamp to zero",
      input: { cash: 1000, monthlyIncome: 0, monthlyExpense: 0, totalDebt: -1, valuation: -100 },
      expected: { netCashFlow: 0, cashAfterSettlement: 1000, debtRatioBasisPoints: 0, riskStatus: "稳健" }
    },
    {
      name: "large values do not overflow",
      input: { cash: 1000000000, monthlyIncome: 900000000, monthlyExpense: 100000000, totalDebt: 0, valuation: 2000000000 },
      expected: { netCashFlow: 800000000, cashAfterSettlement: 1800000000, debtRatioBasisPoints: 0, riskStatus: "稳健" }
    }
  ] as const;

  for (const testCase of cases) {
    const report = calculateFinanceReport(testCase.input);
    assert.equal(report.netCashFlow, testCase.expected.netCashFlow, testCase.name);
    assert.equal(report.cashAfterSettlement, testCase.expected.cashAfterSettlement, testCase.name);
    assert.equal(report.debtRatioBasisPoints, testCase.expected.debtRatioBasisPoints, testCase.name);
    assert.equal(report.riskStatus, testCase.expected.riskStatus, testCase.name);
  }
});

test("loads and settles company finance without duplicate monthly settlement", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };

    await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "strategist",
        founderName: "Alice",
        companyName: "Spark Studio"
      })
    });

    const status = await requestJson<CompanyFinanceRecord>(baseUrl, "/company/status?serverId=s1", { headers: auth });
    assert.equal(status.status, 200);
    assert.equal(status.body.success, true);
    const finance = status.body.data;
    assert.ok(finance);
    assert.equal(finance.netCashFlow, 512000);
    assert.ok(finance.riskTips.length > 0);
    assert.equal(finance.riskStatus, "稳健");

    const day = await requestJson<CompanyFinanceRecord>(baseUrl, "/finance/settle-day", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(day.status, 200);
    assert.equal(day.body.data?.operatingDay, 2);

    const settled = await requestJson<CompanyFinanceSettlementRecord>(baseUrl, "/finance/settle-month", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", reportMonth: 1 })
    });
    assert.equal(settled.status, 200);
    const settlement = settled.body.data;
    assert.ok(settlement);
    assert.equal(settlement.reportMonth, 1);
    assert.equal(settlement.income, finance.monthlyIncome);
    assert.equal(settlement.expense, finance.monthlyExpense);
    assert.equal(settlement.netCashFlow, finance.netCashFlow);
    assert.ok(settlement.riskTips.length > 0);
    assert.equal(settlement.endingCash, finance.cash + finance.netCashFlow);
    assert.equal(settlement.endingCash, 2962000);
    assert.equal(settlement.financeMonth, 2);

    const duplicate = await requestJson<CompanyFinanceSettlementRecord>(baseUrl, "/finance/settle-month", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", reportMonth: 1 })
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.data?.endingCash, settlement.endingCash);
  });
});

test("picks recruit candidates by configured weight boundaries", () => {
  const pool = [
    { id: "common", recruitWeight: 10 },
    { id: "rare", recruitWeight: 5 },
    { id: "legend", recruitWeight: 1 }
  ];

  assert.equal(pickRecruitCandidate(pool, 0)?.id, "common");
  assert.equal(pickRecruitCandidate(pool, 9.99)?.id, "common");
  assert.equal(pickRecruitCandidate(pool, 10)?.id, "rare");
  assert.equal(pickRecruitCandidate(pool, 14.99)?.id, "rare");
  assert.equal(pickRecruitCandidate(pool, 15)?.id, "legend");
  assert.equal(pickRecruitCandidate([], 0), undefined);
});

test("recruits, cultivates, grants equity, and dismisses persistent employees", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };

    await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "strategist",
        founderName: "Alice",
        companyName: "Spark Studio"
      })
    });

    const baseline = await requestJson<CompanyFinanceRecord>(baseUrl, "/company/status?serverId=s1", { headers: auth });
    assert.equal(baseline.status, 200);
    const baselineExpense = baseline.body.data?.monthlyExpense;
    assert.equal(typeof baselineExpense, "number");

    const recruited = await requestJson<EmployeeRecord>(baseUrl, "/employees/recruit", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(recruited.status, 201);
    assert.equal(recruited.body.success, true);
    assert.equal(recruited.body.data?.isActive, true);
    const recruitedEmployee = recruited.body.data;
    assert.ok(recruitedEmployee);

    const listed = await requestJson<EmployeeRecord[]>(baseUrl, "/employees?serverId=s1", { headers: auth });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(listed.body.data?.[0]?.id, recruitedEmployee.id);

    const afterRecruit = await requestJson<CompanyFinanceRecord>(baseUrl, "/company/status?serverId=s1", { headers: auth });
    assert.equal(afterRecruit.body.data?.monthlyExpense, baselineExpense + recruitedEmployee.salary);

    const trained = await requestJson<EmployeeRecord>(baseUrl, `/employees/${encodeURIComponent(recruitedEmployee.id)}/train`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(trained.status, 200);
    assert.equal(trained.body.data?.level, 2);
    assert.ok((trained.body.data?.salary ?? 0) > recruitedEmployee.salary);
    assert.ok((trained.body.data?.management ?? 0) > recruitedEmployee.management);
    assert.ok((trained.body.data?.pressure ?? 0) > recruitedEmployee.pressure);

    const afterTrainList = await requestJson<EmployeeRecord[]>(baseUrl, "/employees?serverId=s1", { headers: auth });
    assert.equal(afterTrainList.body.data?.[0]?.level, 2);

    const equity = await requestJson<EmployeeRecord>(baseUrl, `/employees/${encodeURIComponent(recruitedEmployee.id)}/equity`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(equity.status, 200);
    assert.equal(equity.body.data?.equityBasisPoints, 100);
    assert.ok((equity.body.data?.loyalty ?? 0) >= recruitedEmployee.loyalty);

    const fired = await requestJson<CompanyFinanceRecord>(baseUrl, `/employees/${encodeURIComponent(recruitedEmployee.id)}/fire`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(fired.status, 200);
    assert.equal(fired.body.data?.monthlyExpense, baselineExpense);
    assert.ok((fired.body.data?.employeeSatisfaction ?? 100) < (afterRecruit.body.data?.employeeSatisfaction ?? 0));
    assert.ok((fired.body.data?.brandReputation ?? 0) < (afterRecruit.body.data?.brandReputation ?? 0));

    const afterDismissList = await requestJson<EmployeeRecord[]>(baseUrl, "/employees?serverId=s1", { headers: auth });
    assert.equal(afterDismissList.body.data?.[0]?.isActive, false);
  });
});

test("calculates project success rate with employee assignment boundaries", () => {
  assert.equal(calculateProjectSuccessRate({ baseRate: 70 }), 70);
  assert.equal(
    calculateProjectSuccessRate({
      baseRate: 70,
      employeeManagement: 90,
      employeeNegotiation: 80,
      employeeExecution: 100
    }),
    79
  );
  assert.equal(calculateProjectSuccessRate({ baseRate: 98, employeeManagement: 100, employeeNegotiation: 100, employeeExecution: 100 }), 95);
  assert.equal(calculateProjectSuccessRate({ baseRate: -10 }), 5);
});

test("runs projects through assignment, progress, settlement, and restore flows", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };

    await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "strategist",
        founderName: "Alice",
        companyName: "Spark Studio"
      })
    });

    const emptyList = await requestJson<ProjectRecord[]>(baseUrl, "/projects?serverId=s1", { headers: auth });
    assert.equal(emptyList.status, 200);
    assert.equal(emptyList.body.data?.length, 0);

    const project = await requestJson<ProjectRecord>(baseUrl, "/projects/start", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(project.status, 201);
    assert.equal(project.body.data?.status, "active");
    const projectId = project.body.data?.id;
    assert.ok(projectId);

    const recruited = await requestJson<EmployeeRecord>(baseUrl, "/employees/recruit", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    const employeeId = recruited.body.data?.id;
    assert.ok(employeeId);

    const assigned = await requestJson<ProjectRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/assign`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", employeeId })
    });
    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.data?.assignedEmployeeId, employeeId);
    assert.ok((assigned.body.data?.successRate ?? 0) >= (project.body.data?.successRate ?? 0));

    const earlySettle = await requestJson<ProjectSettlementRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/settle`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(earlySettle.status, 409);
    assert.equal(earlySettle.body.error?.code, "PROJECT_INCOMPLETE");

    for (let index = 0; index < 3; index += 1) {
      await requestJson<ProjectRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/advance`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ serverId: "s1" })
      });
    }

    const restoredReady = await requestJson<ProjectRecord[]>(baseUrl, "/projects?serverId=s1", { headers: auth });
    assert.equal(restoredReady.body.data?.[0]?.progress, 100);
    assert.equal(restoredReady.body.data?.[0]?.status, "ready");
    assert.equal(restoredReady.body.data?.[0]?.assignedEmployeeId, employeeId);

    const beforeSettle = await requestJson<CompanyFinanceRecord>(baseUrl, "/company/status?serverId=s1", { headers: auth });
    const settled = await requestJson<ProjectSettlementRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/settle`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(settled.status, 200);
    assert.equal(settled.body.data?.project.result, "success");
    assert.ok((settled.body.data?.finance.cash ?? 0) > (beforeSettle.body.data?.cash ?? 0));
    assert.ok((settled.body.data?.finance.customerSatisfaction ?? 0) > (beforeSettle.body.data?.customerSatisfaction ?? 0));

    const duplicate = await requestJson<ProjectSettlementRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/settle`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.data?.finance.cash, settled.body.data?.finance.cash);
    assert.equal(duplicate.body.data?.project.settledAt, settled.body.data?.project.settledAt);

    const session = await requestJson<{ accountId: string; username: string }>(baseUrl, "/auth/session", { headers: auth });
    assert.equal(session.status, 200);
    const restoredSettled = await requestJson<ProjectRecord[]>(baseUrl, "/projects?serverId=s1", { headers: auth });
    assert.equal(restoredSettled.body.data?.[0]?.result, "success");
  });
});

test("settles failed projects once and applies company losses", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };

    await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "strategist",
        founderName: "Alice",
        companyName: "Spark Studio"
      })
    });

    await requestJson<ProjectRecord>(baseUrl, "/projects/start", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    const failedProject = await requestJson<ProjectRecord>(baseUrl, "/projects/start", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    const projectId = failedProject.body.data?.id;
    assert.ok(projectId);

    for (let index = 0; index < 3; index += 1) {
      await requestJson<ProjectRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/advance`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ serverId: "s1" })
      });
    }

    const beforeSettle = await requestJson<CompanyFinanceRecord>(baseUrl, "/company/status?serverId=s1", { headers: auth });
    const settled = await requestJson<ProjectSettlementRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/settle`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(settled.status, 200);
    assert.equal(settled.body.data?.project.result, "failure");
    assert.ok((settled.body.data?.finance.cash ?? 0) < (beforeSettle.body.data?.cash ?? 0));
    assert.ok((settled.body.data?.finance.customerSatisfaction ?? 0) < (beforeSettle.body.data?.customerSatisfaction ?? 0));
    assert.ok((settled.body.data?.finance.brandReputation ?? 0) < (beforeSettle.body.data?.brandReputation ?? 0));

    const duplicate = await requestJson<ProjectSettlementRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/settle`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.data?.finance.cash, settled.body.data?.finance.cash);
  });
});

test("lists valid phase 6 task configs with knowledge and compliance metadata", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };

    await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "strategist",
        founderName: "Alice",
        companyName: "Spark Studio"
      })
    });

    const tasks = await requestJson<TaskRecord[]>(baseUrl, "/tasks?serverId=s1", { headers: auth });
    assert.equal(tasks.status, 200);
    assert.equal(tasks.body.success, true);
    const data = tasks.body.data ?? [];
    const requiredIds = [
      "main-profile-created",
      "main-first-project",
      "daily-train-employee",
      "daily-project-push",
      "side-knowledge-labor-contract",
      "side-compliance-contract-review"
    ];
    const listedIds = new Set(data.map((task) => task.id));
    assert.equal(requiredIds.every((id) => listedIds.has(id)), true);

    for (const task of data) {
      assert.ok(["main", "daily", "side"].includes(task.type));
      assert.ok(["none", "knowledge", "compliance"].includes(task.unlockKind));
      assert.ok(task.title.length > 0);
      assert.ok(task.description.length > 0);
      assert.ok(task.rewardLabel.length > 0);
      assert.ok(task.guideAction.length > 0);
      assert.ok(task.target > 0);
      assert.ok(task.progress >= 0 && task.progress <= task.target);
      assert.equal(task.isClaimable, task.progress >= task.target && !task.isClaimed);
    }

    const knowledge = data.find((task) => task.id === "side-knowledge-labor-contract");
    assert.equal(knowledge?.type, "side");
    assert.equal(knowledge?.unlockKind, "knowledge");
    assert.equal(knowledge?.guideAction, "查看知识");

    const compliance = data.find((task) => task.id === "side-compliance-contract-review");
    assert.equal(compliance?.type, "side");
    assert.equal(compliance?.unlockKind, "compliance");
    assert.equal(compliance?.guideAction, "处理支线");
  });
});

test("claims task rewards once and applies structured resource gains", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };

    await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "strategist",
        founderName: "Alice",
        companyName: "Spark Studio"
      })
    });

    const before = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", { headers: auth });
    const claimed = await requestJson<TaskRecord>(baseUrl, "/tasks/main-profile-created/claim", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(claimed.status, 200);
    assert.equal(claimed.body.data?.isClaimed, true);
    assert.equal(claimed.body.data?.rewardCash, 100000);

    const after = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", { headers: auth });
    assert.equal(after.body.data?.cash, (before.body.data?.cash ?? 0) + 100000);

    const duplicate = await requestJson<TaskRecord>(baseUrl, "/tasks/main-profile-created/claim", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 409);

    const afterDuplicate = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", { headers: auth });
    assert.equal(afterDuplicate.body.data?.cash, after.body.data?.cash);
  });
});

test("refreshes daily tasks by server day without resetting main claims", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };
    const dayOneHeaders = { ...auth, "x-server-date": "2026-04-30" };
    const dayTwoHeaders = { ...auth, "x-server-date": "2026-05-01" };

    await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "strategist",
        founderName: "Alice",
        companyName: "Spark Studio"
      })
    });

    await requestJson<TaskRecord>(baseUrl, "/tasks/main-profile-created/claim", {
      method: "POST",
      headers: dayOneHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson<TaskRecord>(baseUrl, "/tasks/daily-train-employee/progress", {
      method: "POST",
      headers: dayOneHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    const dayOneClaim = await requestJson<TaskRecord>(baseUrl, "/tasks/daily-train-employee/claim", {
      method: "POST",
      headers: dayOneHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(dayOneClaim.status, 200);
    assert.equal(dayOneClaim.body.data?.isClaimed, true);

    const dayTwoTasks = await requestJson<TaskRecord[]>(baseUrl, "/tasks?serverId=s1", { headers: dayTwoHeaders });
    const daily = dayTwoTasks.body.data?.find((task) => task.id === "daily-train-employee");
    assert.equal(daily?.progress, 0);
    assert.equal(daily?.isClaimed, false);
    assert.equal(daily?.isClaimable, false);
    const main = dayTwoTasks.body.data?.find((task) => task.id === "main-profile-created");
    assert.equal(main?.isClaimed, true);

    await requestJson<TaskRecord>(baseUrl, "/tasks/daily-train-employee/progress", {
      method: "POST",
      headers: dayTwoHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    const dayTwoClaim = await requestJson<TaskRecord>(baseUrl, "/tasks/daily-train-employee/claim", {
      method: "POST",
      headers: dayTwoHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(dayTwoClaim.status, 200);
  });
});

test("advances business tasks from employee and project actions", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };

    await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "strategist",
        founderName: "Alice",
        companyName: "Spark Studio"
      })
    });

    const employee = await requestJson<EmployeeRecord>(baseUrl, "/employees/recruit", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson<EmployeeRecord>(baseUrl, `/employees/${encodeURIComponent(employee.body.data?.id ?? "")}/train`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson<EmployeeRecord>(baseUrl, `/employees/${encodeURIComponent(employee.body.data?.id ?? "")}/equity`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });

    const project = await requestJson<ProjectRecord>(baseUrl, "/projects/start", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson<ProjectRecord>(baseUrl, `/projects/${encodeURIComponent(project.body.data?.id ?? "")}/advance`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });

    const tasks = await requestJson<TaskRecord[]>(baseUrl, "/tasks?serverId=s1", { headers: auth });
    assert.equal(tasks.body.data?.find((task) => task.id === "daily-train-employee")?.isClaimable, true);
    assert.equal(tasks.body.data?.find((task) => task.id === "daily-project-push")?.isClaimable, true);
    assert.equal(tasks.body.data?.find((task) => task.id === "main-first-project")?.isClaimable, true);
    assert.equal(tasks.body.data?.find((task) => task.id === "side-founder-pressure")?.isClaimable, true);
  });
});

test("completes knowledge and compliance side tasks through guided progress", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };

    await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "strategist",
        founderName: "Alice",
        companyName: "Spark Studio"
      })
    });

    const firstEvents = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", { headers: auth });
    const firstEvent = firstEvents.body.data?.[0];
    assert.ok(firstEvent);
    const firstChoice = await requestJson<EventChoiceRecord>(baseUrl, `/events/${encodeURIComponent(firstEvent.id)}/choose`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", option: "A" })
    });
    assert.equal(firstChoice.status, 200);

    const followupEvents = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", { headers: auth });
    const followupEvent = followupEvents.body.data?.find((event) => event.configId === "customer-contract-review");
    assert.ok(followupEvent);
    const followupChoice = await requestJson<EventChoiceRecord>(baseUrl, `/events/${encodeURIComponent(followupEvent.id)}/choose`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", option: "A" })
    });
    assert.equal(followupChoice.status, 200);

    for (const [taskId, knowledgeId] of [
      ["side-knowledge-labor-contract", "labor-written-contract"],
      ["side-compliance-contract-review", "contract-acceptance-payment"]
    ] as const) {
      const earlyClaim = await requestJson<TaskRecord>(baseUrl, `/tasks/${taskId}/claim`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ serverId: "s1" })
      });
      assert.equal(earlyClaim.status, 409);
      assert.equal(earlyClaim.body.error?.code, "TASK_INCOMPLETE");

      const progressed = await requestJson<TaskRecord>(baseUrl, `/tasks/${taskId}/progress`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ serverId: "s1", knowledgeId })
      });
      assert.equal(progressed.status, 200);
      assert.equal(progressed.body.data?.isClaimable, true);

      const claimed = await requestJson<TaskRecord>(baseUrl, `/tasks/${taskId}/claim`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ serverId: "s1" })
      });
      assert.equal(claimed.status, 200);
      assert.equal(claimed.body.data?.isClaimed, true);
    }
  });
});

test("knowledge side tasks progress only after reading the configured unlocked card", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "taskknowledge");
    const auth = { authorization: `Bearer ${token}` };

    const tasks = await requestJson<TaskRecord[]>(baseUrl, "/tasks?serverId=s1", { headers: auth });
    assert.equal(tasks.status, 200);
    const knowledgeTask = tasks.body.data?.find((task) => task.id === "side-knowledge-labor-contract") as (TaskRecord & { knowledgeId?: string | null }) | undefined;
    const complianceTask = tasks.body.data?.find((task) => task.id === "side-compliance-contract-review") as (TaskRecord & { knowledgeId?: string | null }) | undefined;
    assert.equal(knowledgeTask?.knowledgeId, "labor-written-contract");
    assert.equal(complianceTask?.knowledgeId, "contract-acceptance-payment");

    const lockedRead = await requestJson<TaskRecord>(baseUrl, "/tasks/side-knowledge-labor-contract/progress", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", knowledgeId: "labor-written-contract" })
    });
    assert.equal(lockedRead.status, 409);
    assert.equal(lockedRead.body.error?.code, "KNOWLEDGE_LOCKED");

    const events = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", { headers: auth });
    assert.equal(events.status, 200);
    const event = events.body.data?.[0];
    assert.ok(event);
    const settled = await requestJson<EventChoiceRecord>(baseUrl, `/events/${encodeURIComponent(event.id)}/choose`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", option: "A" })
    });
    assert.equal(settled.status, 200);
    assert.equal(settled.body.data?.result.knowledge?.id, "labor-written-contract");

    const mismatch = await requestJson<TaskRecord>(baseUrl, "/tasks/side-knowledge-labor-contract/progress", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", knowledgeId: "contract-acceptance-payment" })
    });
    assert.equal(mismatch.status, 409);
    assert.equal(mismatch.body.error?.code, "TASK_KNOWLEDGE_MISMATCH");

    const progressed = await requestJson<TaskRecord>(baseUrl, "/tasks/side-knowledge-labor-contract/progress", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", knowledgeId: "labor-written-contract" })
    });
    assert.equal(progressed.status, 200);
    assert.equal(progressed.body.data?.progress, 1);
    assert.equal(progressed.body.data?.isClaimable, true);
  });
});

test("advances expanded main tasks from real business actions", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "expandedmain");
    const auth = { authorization: `Bearer ${token}` };

    const employee = await requestJson<EmployeeRecord>(baseUrl, "/employees/recruit", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    const employeeId = employee.body.data?.id ?? "";
    await requestJson<EmployeeRecord>(baseUrl, `/employees/${encodeURIComponent(employeeId)}/train`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson<EmployeeRecord>(baseUrl, `/employees/${encodeURIComponent(employeeId)}/equity`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });

    const project = await requestJson<ProjectRecord>(baseUrl, "/projects/start", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    const projectId = project.body.data?.id ?? "";
    for (let index = 0; index < 3; index += 1) {
      await requestJson<ProjectRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/advance`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ serverId: "s1" })
      });
    }
    await requestJson<ProjectSettlementRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/settle`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });

    const product = await requestJson<ProductActionRecord>(baseUrl, "/products/start", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", productConfigId: "crm-lite-saas" })
    });
    const productId = product.body.data?.product.id ?? "";
    await requestJson<ProductActionRecord>(baseUrl, `/products/${encodeURIComponent(productId)}/refactor`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });

    await requestJson<MarketActionRecord>(baseUrl, "/markets/enter", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", trackId: "enterprise-saas" })
    });
    await requestJson<MarketActionRecord>(baseUrl, "/markets/competitor-action", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", trackId: "enterprise-saas" })
    });

    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", guildName: "首轮创业会" })
    });
    await requestJson<GuildActionRecord>(baseUrl, "/guild/help", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", requestType: "project-advice" })
    });

    await requestJson<SeasonTaskProgressRecord>(baseUrl, "/season/tasks/season-daily-project/progress", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });

    const tasks = await requestJson<TaskRecord[]>(baseUrl, "/tasks?serverId=s1", { headers: auth });
    const claimable = new Set((tasks.body.data ?? []).filter((task) => task.isClaimable).map((task) => task.id));
    const expected = [
      "main-recruit-channel",
      "main-train-core",
      "main-equity-plan",
      "main-client-brief",
      "main-delivery-plan",
      "main-project-margin",
      "main-user-research",
      "main-tech-debt-check",
      "main-market-position",
      "main-competitor-scan",
      "main-guild-help-plan",
      "main-season-task-plan"
    ];
    const missing = expected.filter((taskId) => !claimable.has(taskId));
    assert.deepEqual(missing, []);
  });
});

test("advances finance capital and ranking main tasks from real actions", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "expandedmainnext");
    const auth = { authorization: `Bearer ${token}` };

    await requestJson<CompanyFinanceSettlementRecord>(baseUrl, "/company/status?serverId=s1", { headers: auth });
    await requestJson<CompanyFinanceSettlementRecord>(baseUrl, "/finance/settle-day", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson<LoanActionRecord>(baseUrl, "/finance/loans/apply", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", loanConfigId: "short-cashflow-loan" })
    });
    await requestJson<FundingCenterRecord>(baseUrl, "/finance/fundings?serverId=s1", { headers: auth });
    const funding = await requestJson<FundingActionRecord>(baseUrl, "/finance/fundings/start", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", investorId: "angel-local-commerce" })
    });
    const fundingId = funding.body.data?.funding.id ?? "";
    await requestJson<FundingActionRecord>(baseUrl, `/finance/fundings/${encodeURIComponent(fundingId)}/settle`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });

    await requestJson<unknown>(baseUrl, "/leaderboards?serverId=s1", { headers: auth });
    await requestJson<unknown>(baseUrl, "/cross-server?serverId=s1", { headers: auth });
    const tasks = await requestJson<TaskRecord[]>(baseUrl, "/tasks?serverId=s1", { headers: auth });
    const claimable = new Set((tasks.body.data ?? []).filter((task) => task.isClaimable).map((task) => task.id));
    const expected = [
      "main-first-budget",
      "main-first-report",
      "main-cashflow-budget",
      "main-cost-structure",
      "main-loan-plan",
      "main-investor-list",
      "main-roadshow-deck",
      "main-term-review",
      "main-rank-target",
      "main-cross-server-target",
      "main-reputation-plan"
    ];
    const missing = expected.filter((taskId) => !claimable.has(taskId));
    assert.deepEqual(missing, []);
  });
});

test("lists, advances, and claims player tasks without duplicate rewards", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };

    await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "strategist",
        founderName: "Alice",
        companyName: "Spark Studio"
      })
    });

    const tasks = await requestJson<TaskRecord[]>(baseUrl, "/tasks?serverId=s1", { headers: auth });
    assert.equal(tasks.status, 200);
    assert.equal(tasks.body.success, true);
    assert.ok(tasks.body.data?.some((task) => task.type === "main" && task.isClaimable));
    assert.ok(tasks.body.data?.some((task) => task.unlockKind === "knowledge"));
    assert.ok(tasks.body.data?.some((task) => task.unlockKind === "compliance"));

    const incompleteClaim = await requestJson<TaskRecord>(baseUrl, "/tasks/daily-train-employee/claim", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(incompleteClaim.status, 409);
    assert.equal(incompleteClaim.body.error?.code, "TASK_INCOMPLETE");

    const advanced = await requestJson<TaskRecord>(baseUrl, "/tasks/daily-train-employee/progress", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(advanced.status, 200);
    assert.equal(advanced.body.data?.isClaimable, true);

    const claimed = await requestJson<TaskRecord>(baseUrl, "/tasks/daily-train-employee/claim", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(claimed.status, 200);
    assert.equal(claimed.body.data?.isClaimed, true);

    const duplicateClaim = await requestJson<TaskRecord>(baseUrl, "/tasks/daily-train-employee/claim", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicateClaim.status, 409);
    assert.equal(duplicateClaim.body.error?.code, "TASK_ALREADY_CLAIMED");
  });
});

test("lists phase 7 events from modern business channels and persists pending state", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "eventlist");

    const firstList = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(firstList.status, 200);
    assert.equal(firstList.body.success, true);
    const firstEvent = firstList.body.data?.[0];
    assert.ok(firstEvent);
    assert.equal(firstEvent.status, "pending");
    assert.equal(firstEvent.source, "员工私信");
    assert.equal(firstEvent.channel, "chat");
    assert.equal(firstEvent.options.length, 2);
    assert.ok(firstEvent.options[0]?.impactPreview.includes("现金"));
    assert.ok(firstEvent.riskExplanation.length > 0);
    assert.ok(firstEvent.knowledgeTitle);

    const secondList = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(secondList.status, 200);
    assert.equal(secondList.body.success, true);
    assert.equal(secondList.body.data?.[0]?.id, firstEvent.id);
  });
});

test("settles event choices once, applies impact, unlocks knowledge, and triggers followup", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "eventsettle");
    const events = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(events.status, 200);
    assert.equal(events.body.success, true);
    const event = events.body.data?.[0];
    assert.ok(event);

    const settled = await requestJson<EventChoiceRecord>(baseUrl, `/events/${encodeURIComponent(event.id)}/choose`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", option: "A" })
    });
    assert.equal(settled.status, 200);
    assert.equal(settled.body.success, true);
    assert.equal(settled.body.data?.event.status, "resolved");
    assert.equal(settled.body.data.event.selectedOption, "A");
    assert.equal(settled.body.data.event.knowledgeUnlocked, true);
    assert.equal(settled.body.data.followupEvent?.status, "pending");
    assert.equal(settled.body.data.finance.cash, profile.cash - 20000);
    assert.equal(settled.body.data.finance.brandReputation, profile.reputation + 300);
    assert.ok(settled.body.data.result.riskExplanation.includes("风险"));

    const duplicate = await requestJson<EventChoiceRecord>(baseUrl, `/events/${encodeURIComponent(event.id)}/choose`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", option: "A" })
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.success, false);
    assert.equal(duplicate.body.error?.code, "EVENT_ALREADY_RESOLVED");

    const refreshedEvents = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(refreshedEvents.status, 200);
    assert.equal(refreshedEvents.body.success, true);
    assert.equal(refreshedEvents.body.data?.filter((item) => item.status === "pending").length, 1);
    assert.ok(refreshedEvents.body.data?.some((item) => item.configId === "customer-contract-review"));

    const tasks = await requestJson<TaskRecord[]>(baseUrl, "/tasks?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(tasks.status, 200);
    assert.equal(tasks.body.success, true);
    assert.equal(tasks.body.data?.find((task) => task.id === "daily-handle-event")?.progress, 1);
    assert.equal(tasks.body.data?.find((task) => task.id === "side-knowledge-labor-contract")?.progress, 0);
    assert.equal(tasks.body.data?.find((task) => task.id === "side-compliance-contract-review")?.progress, 0);
  });
});

test("event settlement returns and unlocks linked knowledge card", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "eventknowledge");

    const events = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(events.status, 200);
    const event = events.body.data?.[0];
    assert.ok(event);
    assert.equal(event.knowledge?.id, "labor-written-contract");
    assert.equal(event.knowledge?.isUnlocked, false);

    const settled = await requestJson<EventChoiceRecord>(baseUrl, `/events/${encodeURIComponent(event.id)}/choose`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", option: "A" })
    });
    assert.equal(settled.status, 200);
    assert.equal(settled.body.data?.result.knowledge?.id, "labor-written-contract");
    assert.equal(settled.body.data?.result.knowledge?.isUnlocked, true);
    assert.equal(settled.body.data?.event.knowledge?.sourceName, "全国人大网");

    const knowledge = await requestJson<KnowledgeEntryRecord[]>(baseUrl, "/knowledge?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    const unlocked = knowledge.body.data?.find((entry) => entry.id === "labor-written-contract");
    assert.equal(unlocked?.isUnlocked, true);
    assert.notEqual(unlocked?.scenarioText, "");
  });
});

test("random task settlement returns linked knowledge summary", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "randomknowledge");

    const center = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(center.status, 200);
    const task = center.body.data?.tasks.find((item) => item.configId === "random-cashflow-warning");
    assert.ok(task);
    assert.equal(task.knowledge?.id, "cashflow-safety-line");
    assert.equal(task.knowledge?.isUnlocked, false);

    const settled = await requestJson<RandomTaskActionRecord>(baseUrl, `/random-tasks/${encodeURIComponent(task.id)}/resolve`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", option: "A" })
    });
    assert.equal(settled.status, 200);
    assert.equal(settled.body.data?.task.knowledge?.id, "cashflow-safety-line");
    assert.equal(settled.body.data?.task.knowledge?.sourceName, "国家税务总局");
    assert.equal(settled.body.data?.task.knowledge?.isUnlocked, false);
  });
});

test("rejects invalid event choices and isolates events between accounts", async () => {
  await withServer(async (baseUrl) => {
    const first = await createPlayerSession(baseUrl, "eventaccounta");
    const second = await createPlayerSession(baseUrl, "eventaccountb");
    const firstEvents = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", {
      headers: { authorization: `Bearer ${first.token}` }
    });
    assert.equal(firstEvents.status, 200);
    assert.equal(firstEvents.body.success, true);
    const firstEvent = firstEvents.body.data?.[0];
    assert.ok(firstEvent);

    const invalid = await requestJson<EventChoiceRecord>(baseUrl, `/events/${encodeURIComponent(firstEvent.id)}/choose`, {
      method: "POST",
      headers: { authorization: `Bearer ${first.token}` },
      body: JSON.stringify({ serverId: "s1", option: "C" })
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.success, false);

    const crossAccount = await requestJson<EventChoiceRecord>(baseUrl, `/events/${encodeURIComponent(firstEvent.id)}/choose`, {
      method: "POST",
      headers: { authorization: `Bearer ${second.token}` },
      body: JSON.stringify({ serverId: "s1", option: "A" })
    });
    assert.equal(crossAccount.status, 404);
    assert.equal(crossAccount.body.success, false);
    assert.equal(crossAccount.body.error?.code, "EVENT_NOT_FOUND");

    const secondEvents = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", {
      headers: { authorization: `Bearer ${second.token}` }
    });
    assert.equal(secondEvents.status, 200);
    assert.equal(secondEvents.body.success, true);
    assert.notEqual(secondEvents.body.data?.[0]?.id, firstEvent.id);
  });
});

test("lists loan products and applies cashflow loans with debt pressure", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "loanapply");
    const loans = await requestJson<LoanCenterRecord>(baseUrl, "/finance/loans?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(loans.status, 200);
    assert.equal(loans.body.success, true);
    assert.equal(loans.body.data?.offers[0]?.name, "经营周转贷");
    assert.equal(loans.body.data?.offers[0]?.termMonths, 6);
    assert.equal(loans.body.data?.offers[0]?.annualRateBasisPoints, 720);
    assert.equal(loans.body.data?.crisis.routes.length, 3);

    const applied = await requestJson<LoanActionRecord>(baseUrl, "/finance/loans/apply", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", loanConfigId: "short-cashflow-loan" })
    });
    assert.equal(applied.status, 201);
    assert.equal(applied.body.success, true);
    assert.equal(applied.body.data?.loan?.status, "active");
    assert.equal(applied.body.data?.loanCenter.finance.cash, profile.cash + 300000);
    assert.equal(applied.body.data?.loanCenter.finance.totalDebt, profile.totalDebt + 300000);
    assert.ok((applied.body.data?.loanCenter.finance.debtRatioBasisPoints ?? 0) > 0);

    const duplicate = await requestJson<LoanActionRecord>(baseUrl, "/finance/loans/apply", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", loanConfigId: "short-cashflow-loan" })
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error?.code, "LOAN_ALREADY_ACTIVE");
  });
});

test("settles loan periods, supports early repayment, and blocks insufficient cash", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "loanrepay");
    const applied = await requestJson<LoanActionRecord>(baseUrl, "/finance/loans/apply", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", loanConfigId: "short-cashflow-loan" })
    });
    assert.equal(applied.status, 201);
    const loanId = applied.body.data?.loan?.id;
    assert.ok(loanId);

    const period = await requestJson<LoanActionRecord>(baseUrl, "/finance/loans/settle-period", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(period.status, 200);
    assert.equal(period.body.data?.loan?.remainingMonths, 5);
    assert.ok((period.body.data?.loan?.remainingPrincipal ?? 300000) < 300000);

    const full = await requestJson<LoanActionRecord>(baseUrl, `/finance/loans/${encodeURIComponent(loanId)}/repay`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", mode: "full" })
    });
    assert.equal(full.status, 200);
    assert.equal(full.body.data?.loan?.status, "settled");
    assert.equal(full.body.data?.loanCenter.finance.totalDebt, 0);

    const duplicate = await requestJson<LoanActionRecord>(baseUrl, `/finance/loans/${encodeURIComponent(loanId)}/repay`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", mode: "full" })
    });
    assert.equal(duplicate.status, 404);
  });
});

test("records overdue penalties, downgrades credit, and exposes crisis routes", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "loanoverdue");
    const applied = await requestJson<LoanActionRecord>(baseUrl, "/finance/loans/apply", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", loanConfigId: "short-cashflow-loan" })
    });
    assert.equal(applied.status, 201);
    const loanId = applied.body.data?.loan?.id;
    assert.ok(loanId);

    const full = await requestJson<LoanActionRecord>(baseUrl, `/finance/loans/${encodeURIComponent(loanId)}/repay`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", mode: "full" })
    });
    assert.equal(full.status, 200);

    const bridge = await requestJson<LoanActionRecord>(baseUrl, "/finance/loans/apply", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", loanConfigId: "high-debt-expansion-loan" })
    });
    assert.equal(bridge.status, 201);
    const bridgeLoanId = bridge.body.data?.loan?.id;
    assert.ok(bridgeLoanId);

    for (let index = 0; index < 9; index += 1) {
      await requestJson<LoanActionRecord>(baseUrl, "/finance/loans/settle-period", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: "s1" })
      });
    }
    const overdue = await requestJson<LoanActionRecord>(baseUrl, "/finance/loans/settle-period", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(overdue.status, 200);
    assert.equal(overdue.body.data?.loan?.status, "overdue");
    assert.ok((overdue.body.data?.loan?.penaltyAccrued ?? 0) > 0);
    assert.equal(overdue.body.data?.loanCenter.finance.creditRating, "B");
    assert.equal(overdue.body.data?.loanCenter.crisis.isActive, true);
    assert.equal(overdue.body.data?.loanCenter.crisis.routes.length, 3);

    const resolved = await requestJson<LoanCenterRecord>(baseUrl, "/finance/crisis/resolve", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", route: "restructure" })
    });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.success, true);
    assert.ok((resolved.body.data?.finance.totalDebt ?? Number.MAX_SAFE_INTEGER) < (overdue.body.data?.loanCenter.finance.totalDebt ?? 0));
  });
});

test("lists funding offers with valuation, dilution, and debt-adjusted conditions", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "fundinglist");
    const initial = await requestJson<FundingCenterRecord>(baseUrl, "/finance/fundings?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(initial.status, 200);
    assert.equal(initial.body.success, true);
    assert.equal(initial.body.data?.offers[0]?.roundName, "天使轮");
    assert.equal(initial.body.data?.offers[0]?.amount, 800000);
    assert.ok((initial.body.data?.offers[0]?.preMoneyValuation ?? 0) >= 1000000);
    assert.ok((initial.body.data?.offers[0]?.postMoneyValuation ?? 0) > (initial.body.data?.offers[0]?.preMoneyValuation ?? 0));
    assert.equal(initial.body.data?.offers[0]?.equityBasisPoints, 800);
    assert.ok((initial.body.data?.offers[0]?.successRate ?? 0) > 0);

    await requestJson<LoanActionRecord>(baseUrl, "/finance/loans/apply", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", loanConfigId: "high-debt-expansion-loan" })
    });
    const stressed = await requestJson<FundingCenterRecord>(baseUrl, "/finance/fundings?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(stressed.status, 200);
    const initialAngel = initial.body.data?.offers.find((offer) => offer.id === "angel-local-commerce");
    const stressedAngel = stressed.body.data?.offers.find((offer) => offer.id === "angel-local-commerce");
    assert.ok(initialAngel);
    assert.ok(stressedAngel);
    assert.ok(stressedAngel.successRate < initialAngel.successRate);
    assert.ok(stressedAngel.preMoneyValuation < initialAngel.preMoneyValuation);
    assert.equal(stressedAngel.isAvailable, false);
    assert.equal(stressedAngel.lockedReason, "负债率过高，条款暂不可接受");
  });
});

test("settles successful funding with cash gain and founder equity dilution", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "fundingsuccess");
    const started = await requestJson<FundingActionRecord>(baseUrl, "/finance/fundings/start", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", investorId: "angel-local-commerce" })
    });
    assert.equal(started.status, 201);
    assert.equal(started.body.data?.funding.status, "pending");
    const fundingId = started.body.data?.funding.id;
    assert.ok(fundingId);

    const settled = await requestJson<FundingActionRecord>(baseUrl, `/finance/fundings/${encodeURIComponent(fundingId)}/settle`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(settled.status, 200);
    assert.equal(settled.body.data?.funding.status, "funded");
    assert.equal(settled.body.data?.fundingCenter.finance.cash, profile.cash + 800000);
    assert.equal(settled.body.data?.fundingCenter.finance.founderEquityBasisPoints, profile.founderEquityBasisPoints - 800);
    assert.equal(settled.body.data?.fundingCenter.finance.valuation, settled.body.data?.funding.postMoneyValuation);

    const duplicate = await requestJson<FundingActionRecord>(baseUrl, `/finance/fundings/${encodeURIComponent(fundingId)}/settle`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error?.code, "FUNDING_ALREADY_SETTLED");
  });
});

test("records failed funding and creates an investor event without changing cash or equity", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "fundingfail");
    const started = await requestJson<FundingActionRecord>(baseUrl, "/finance/fundings/start", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", investorId: "strategic-enterprise-capital" })
    });
    assert.equal(started.status, 201);
    assert.ok((started.body.data?.funding.successRate ?? 100) < 50);

    const fundingId = started.body.data?.funding.id;
    assert.ok(fundingId);
    const settled = await requestJson<FundingActionRecord>(baseUrl, `/finance/fundings/${encodeURIComponent(fundingId)}/settle`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(settled.status, 200);
    assert.equal(settled.body.data?.funding.status, "failed");
    assert.equal(settled.body.data?.fundingCenter.finance.cash, profile.cash);
    assert.equal(settled.body.data?.fundingCenter.finance.founderEquityBasisPoints, profile.founderEquityBasisPoints);
    assert.ok(settled.body.data?.result.includes("替代现金流"));

    const events = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(events.status, 200);
    assert.ok(events.body.data?.some((event) => event.configId === "funding-failed-bridge-plan"));
  });
});

test("runs product lifecycle from setup to growth revenue", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "productlife");
    const initial = await requestJson<ProductCenterRecord>(baseUrl, "/products?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(initial.status, 200);
    assert.equal(initial.body.success, true);
    assert.equal(initial.body.data?.offers[0]?.name, "轻量 CRM SaaS");

    const started = await requestJson<ProductActionRecord>(baseUrl, "/products/start", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", productConfigId: "crm-lite-saas" })
    });
    assert.equal(started.status, 201);
    assert.equal(started.body.data?.product.stage, "idea");
    assert.equal(started.body.data?.productCenter.finance.cash, profile.cash - 280000);
    assert.ok((started.body.data?.productCenter.finance.monthlyExpense ?? 0) > profile.monthlyExpense);

    let productId = started.body.data?.product.id;
    assert.ok(productId);
    let latest = started;
    for (let index = 0; index < 4; index += 1) {
      latest = await requestJson<ProductActionRecord>(baseUrl, `/products/${encodeURIComponent(productId)}/advance`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: "s1" })
      });
      assert.equal(latest.status, 200);
      productId = latest.body.data?.product.id;
      assert.ok(productId);
    }

    assert.equal(latest.body.data?.product.stage, "growth");
    assert.ok((latest.body.data?.product.monthlyRevenue ?? 0) > 0);
    assert.ok((latest.body.data?.product.users ?? 0) > 120);
    assert.ok((latest.body.data?.productCenter.finance.monthlyIncome ?? 0) > profile.monthlyIncome);
  });
});

test("triggers product tech debt events and supports refactor and close", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "productrisk");
    const started = await requestJson<ProductActionRecord>(baseUrl, "/products/start", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", productConfigId: "ai-customer-copilot" })
    });
    assert.equal(started.status, 201);
    const productId = started.body.data?.product.id;
    assert.ok(productId);

    let advanced = started;
    for (let index = 0; index < 4; index += 1) {
      advanced = await requestJson<ProductActionRecord>(baseUrl, `/products/${encodeURIComponent(productId)}/advance`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: "s1" })
      });
      assert.equal(advanced.status, 200);
    }

    assert.ok((advanced.body.data?.product.techDebt ?? 0) >= 75);
    assert.equal(advanced.body.data?.productCenter.finance.riskStatus, "预警");
    const events = await requestJson<EventRecord[]>(baseUrl, "/events?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(events.status, 200);
    assert.ok(events.body.data?.some((event) => event.configId === "product-tech-debt-incident"));

    const refactored = await requestJson<ProductActionRecord>(baseUrl, `/products/${encodeURIComponent(productId)}/refactor`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(refactored.status, 200);
    assert.ok((refactored.body.data?.product.techDebt ?? 100) < (advanced.body.data?.product.techDebt ?? 0));

    const closed = await requestJson<ProductActionRecord>(baseUrl, `/products/${encodeURIComponent(productId)}/close`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(closed.status, 200);
    assert.equal(closed.body.data?.product.status, "closed");
    assert.equal(closed.body.data?.product.monthlyRevenue, 0);

    const duplicateClose = await requestJson<ProductActionRecord>(baseUrl, `/products/${encodeURIComponent(productId)}/close`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicateClose.status, 409);
  });
});

test("lists market tracks with different cost structures and enters a track", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "marketlist");
    const initial = await requestJson<MarketCenterRecord>(baseUrl, "/markets?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(initial.status, 200);
    assert.equal(initial.body.success, true);
    assert.equal(initial.body.data?.offers.length, 2);
    assert.notEqual(initial.body.data?.offers[0]?.costStructure, initial.body.data?.offers[1]?.costStructure);
    assert.notEqual(initial.body.data?.offers[0]?.policyRisk, initial.body.data?.offers[1]?.policyRisk);

    const entered = await requestJson<MarketActionRecord>(baseUrl, "/markets/enter", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", trackId: "enterprise-saas" })
    });
    assert.equal(entered.status, 201);
    assert.equal(entered.body.data?.market.trackName, "企业 SaaS");
    assert.equal(entered.body.data?.market.playerShareBasisPoints, 820);

    const duplicate = await requestJson<MarketActionRecord>(baseUrl, "/markets/enter", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", trackId: "enterprise-saas" })
    });
    assert.equal(duplicate.status, 409);
  });
});

test("applies competitor price war and lets players respond", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "marketprice");
    await requestJson<MarketActionRecord>(baseUrl, "/markets/enter", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", trackId: "enterprise-saas" })
    });

    const attacked = await requestJson<MarketActionRecord>(baseUrl, "/markets/competitor-action", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", trackId: "enterprise-saas" })
    });
    assert.equal(attacked.status, 201);
    assert.equal(attacked.body.data?.action?.actionType, "price_war");
    assert.ok((attacked.body.data?.market.pricePressure ?? 0) > 0);
    assert.ok((attacked.body.data?.market.playerShareBasisPoints ?? 10000) < 820);
    assert.ok((attacked.body.data?.marketCenter.finance.monthlyIncome ?? profile.monthlyIncome) < profile.monthlyIncome);

    const actionId = attacked.body.data?.action?.id;
    assert.ok(actionId);
    const defended = await requestJson<MarketActionRecord>(baseUrl, `/markets/actions/${encodeURIComponent(actionId)}/respond`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", response: "counter" })
    });
    assert.equal(defended.status, 200);
    assert.equal(defended.body.data?.action?.status, "resolved");
    assert.ok((defended.body.data?.market.playerShareBasisPoints ?? 0) > (attacked.body.data?.market.playerShareBasisPoints ?? 0));

    const duplicate = await requestJson<MarketActionRecord>(baseUrl, `/markets/actions/${encodeURIComponent(actionId)}/respond`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", response: "counter" })
    });
    assert.equal(duplicate.status, 409);
  });
});

test("applies poaching pressure and blocks responses without enough cash", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "marketpoach");
    await requestJson<MarketActionRecord>(baseUrl, "/markets/enter", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", trackId: "enterprise-saas" })
    });
    const first = await requestJson<MarketActionRecord>(baseUrl, "/markets/competitor-action", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", trackId: "enterprise-saas" })
    });
    assert.equal(first.status, 201);
    const firstActionId = first.body.data?.action?.id;
    assert.ok(firstActionId);
    await requestJson<MarketActionRecord>(baseUrl, `/markets/actions/${encodeURIComponent(firstActionId)}/respond`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", response: "defend" })
    });

    const poach = await requestJson<MarketActionRecord>(baseUrl, "/markets/competitor-action", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", trackId: "enterprise-saas" })
    });
    assert.equal(poach.status, 201);
    assert.equal(poach.body.data?.action?.actionType, "poach");
    assert.ok((poach.body.data?.market.talentPressure ?? 0) >= 20);

    const actionId = poach.body.data?.action?.id;
    assert.ok(actionId);
    const blocked = await requestJson<MarketActionRecord>(baseUrl, `/markets/actions/${encodeURIComponent(actionId)}/respond`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", response: "counter" })
    });
    assert.equal(blocked.status, 409);
  });
});

test("logs in admin users and returns admin sessions", async () => {
  await withServer(async (baseUrl) => {
    const login = await requestJson<{ adminUserId: string; username: string; token: string }>(
      baseUrl,
      "/admin/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username: "admin", password: "admin123" })
      }
    );

    assert.equal(login.status, 200);
    assert.equal(login.body.success, true);
    assert.ok(login.body.data?.adminUserId);
    assert.ok(login.body.data?.token);

    const session = await requestJson<{ adminUserId: string; username: string }>(
      baseUrl,
      "/admin/auth/session",
      { headers: { authorization: `Bearer ${login.body.data.token}` } }
    );

    assert.equal(session.status, 200);
    assert.equal(session.body.success, true);
    assert.equal(session.body.data?.username, "admin");
  });
});

test("phase 16 admin can query operations data and adjust cross server groups with audit", async () => {
  await withServer(async (baseUrl) => {
    const { profile } = await createPlayerSession(baseUrl, "adminphase16");

    const blocked = await requestJson(baseUrl, "/admin/players");
    assert.equal(blocked.status, 401);
    assert.equal(blocked.body.error?.code, "UNAUTHORIZED");

    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    assert.ok(adminLogin.body.data?.token);

    const players = await requestJson<{
      rows: Array<{
        profileId: string;
        serverName: string;
        founderName: string;
        companyName: string;
        cash: number;
        netCashFlow: number;
        walletBalance: number;
        vipLevel: number;
        profileStatus: string;
        purchaseCount: number;
        paymentOrderCount: number;
        titleCount: number;
        achievementCompletedCount: number;
        knowledgeUnlockCount: number;
      }>;
    }>(baseUrl, "/admin/players?keyword=测试", {
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` }
    });
    assert.equal(players.status, 200);
    assert.equal(players.body.data?.rows.length, 1);
    assert.equal(players.body.data?.rows[0]?.profileId, profile.id);
    assert.equal(players.body.data?.rows[0]?.serverName, "长宁一服");
    assert.equal(players.body.data?.rows[0]?.walletBalance, profile.platformCoins);
    assert.equal(players.body.data?.rows[0]?.netCashFlow, profile.monthlyIncome - profile.monthlyExpense);
    assert.equal(players.body.data?.rows[0]?.profileStatus, "active");

    const configCenter = await requestJson<{
      titles: Array<{ id: string }>;
      achievements: Array<{ id: string }>;
      knowledgeEntries: Array<{ id: string; auditStatus: string }>;
      shopProducts: Array<{ id: string }>;
    }>(baseUrl, "/admin/config-center", {
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` }
    });
    assert.equal(configCenter.status, 200);
    assert.ok(configCenter.body.data?.titles.some((title) => title.id === "server-richest"));
    assert.ok(configCenter.body.data?.achievements.some((achievement) => achievement.id === "positive-cashflow"));
    assert.ok(configCenter.body.data?.knowledgeEntries.every((knowledge) => knowledge.auditStatus === "已发布"));
    assert.ok(configCenter.body.data?.shopProducts.some((product) => product.id === "monthly-card-basic"));

    const titleGrant = await requestJson<{ auditLogId: string }>(baseUrl, "/admin/titles/grant", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        profileId: profile.id,
        titleId: "server-richest",
        reason: "阶段16验证称号发放"
      })
    });
    assert.equal(titleGrant.status, 200);
    assert.ok(titleGrant.body.data?.auditLogId);

    const titleRevoke = await requestJson<{ auditLogId: string }>(baseUrl, "/admin/titles/revoke", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        profileId: profile.id,
        titleId: "server-richest",
        reason: "阶段16验证称号回收"
      })
    });
    assert.equal(titleRevoke.status, 200);
    assert.ok(titleRevoke.body.data?.auditLogId);

    const mail = await requestJson<{ mailId: string; auditLogId: string; wallet: { balance: number } }>(baseUrl, "/admin/mail/compensate", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        profileId: profile.id,
        subject: "阶段16补偿",
        body: "运营邮件补偿验证",
        platformCoins: 88,
        reason: "阶段16验证邮件补偿"
      })
    });
    assert.equal(mail.status, 200);
    assert.ok(mail.body.data?.mailId);
    assert.equal(mail.body.data?.wallet.balance, profile.platformCoins + 88);

    const banned = await requestJson<{ status: string; auditLogId: string }>(baseUrl, "/admin/players/status", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        profileId: profile.id,
        status: "banned",
        reason: "阶段16验证封禁"
      })
    });
    assert.equal(banned.status, 200);
    assert.equal(banned.body.data?.status, "banned");
    assert.ok(banned.body.data?.auditLogId);

    const settled = await requestJson<{ deliveredRewards: number; auditLogId: string }>(baseUrl, "/admin/leaderboards/settle", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        serverId: "s1",
        reason: "阶段16验证排行榜手动结算"
      })
    });
    assert.equal(settled.status, 200);
    assert.ok(settled.body.data?.auditLogId);

    const groupsBefore = await requestJson<{
      groups: Array<{ id: string; serverIds: string[] }>;
    }>(baseUrl, "/admin/cross-server/groups", {
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` }
    });
    assert.equal(groupsBefore.status, 200);
    assert.ok(groupsBefore.body.data?.groups.some((group) => group.id === "new-growth-pool" && group.serverIds.includes("s1")));

    const assigned = await requestJson<{
      group: { id: string; serverIds: string[] };
      auditLogId: string;
    }>(baseUrl, "/admin/cross-server/groups/assign", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        serverId: "s2",
        groupId: "new-growth-pool",
        reason: "阶段16验证跨服分组调整"
      })
    });
    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.data?.group.id, "new-growth-pool");
    assert.ok(assigned.body.data?.group.serverIds.includes("s2"));
    assert.ok(assigned.body.data?.auditLogId);

    const auditLogs = await requestJson<{ rows: Array<{ action: string }> }>(baseUrl, "/admin/audit-logs", {
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` }
    });
    assert.equal(auditLogs.status, 200);
    assert.ok(auditLogs.body.data?.rows.some((log) => log.action === "admin_player_ban"));
    assert.ok(auditLogs.body.data?.rows.some((log) => log.action === "admin_cross_server_group_assign"));
  });
});

test("phase 17 tracks telemetry and exposes operations analytics dashboard", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "analyticsphase17");

    const blocked = await requestJson(baseUrl, "/admin/analytics");
    assert.equal(blocked.status, 401);
    assert.equal(blocked.body.error?.code, "UNAUTHORIZED");

    const reported = await requestJson<{ eventId: string }>(baseUrl, "/telemetry/events", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        serverId: "s1",
        eventName: "tutorial_step",
        targetId: "profile-created",
        metadata: { step: "profile_created" }
      })
    });
    assert.equal(reported.status, 201);
    assert.ok(reported.body.data?.eventId);

    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    assert.ok(adminLogin.body.data?.token);

    const analytics = await requestJson<{
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
    }>(baseUrl, "/admin/analytics", {
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` }
    });
    assert.equal(analytics.status, 200);
    assert.equal(analytics.body.data?.overview.totalPlayers, 1);
    assert.ok(analytics.body.data?.onboarding.tutorialSteps.some((step) => step.step === "profile_created" && step.count === 1));
    assert.equal(analytics.body.data?.monetization.platformCoinBalanceTotal, profile.platformCoins);
    assert.ok((analytics.body.data?.business.taskCompletionRateBasisPoints ?? -1) >= 0);
    assert.ok(analytics.body.data?.business.debtRatioDistribution.some((item) => item.band === "0-30%"));
    assert.equal(analytics.body.data?.alerts.some((alert) => alert.message.includes("平台币")), true);
  });
});

test("phase 18 reports production readiness gaps", async () => {
  const repository = createTestRepository();
  const server = createApiServer(
    {
      host: "127.0.0.1",
      port: 0,
      dependencies: {
        mysql: "configured",
        redis: "missing"
      }
    },
    repository
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    assert.ok(address);
    const response = await requestJson<{
      status: "ready" | "blocked";
      checks: Array<{ key: string; status: "pass" | "fail"; message: string }>;
    }>(`http://127.0.0.1:${address.port}`, "/readiness");

    assert.equal(response.status, 503);
    assert.equal(response.body.data?.status, "blocked");
    assert.equal(response.body.data?.checks.some((check) => check.key === "redis" && check.status === "fail"), true);
  } finally {
    server.close();
    await once(server, "close");
    await repository.disconnect();
  }
});

test("phase 18 rate limits repeated invalid auth attempts", async () => {
  await withServer(async (baseUrl) => {
    let lastStatus = 0;
    for (let index = 0; index < 11; index += 1) {
      const response = await requestJson(baseUrl, "/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "missing_user", password: "secret12" })
      });
      lastStatus = response.status;
    }

    assert.equal(lastStatus, 429);
  });
});

test("phase 18 rejects mismatched external payment reservations", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "paymentguard");
    const reserved = await requestJson(baseUrl, "/payments/reserve", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", productId: "monthly-card-basic", amountCents: 1, platformCoins: 1 })
    });

    assert.equal(reserved.status, 400);
    assert.equal(reserved.body.error?.code, "VALIDATION_ERROR");
  });
});

test("phase 19 runs season activity pass rewards and scenario scoring", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "seasonplayer");
    const center = await requestJson<{
      season: { id: string; name: string; status: string; points: number; pass: { isPurchased: boolean; pricePlatformCoins: number } };
      tasks: Array<{ id: string; progress: number; target: number; isClaimed: boolean }>;
      activities: Array<{ id: string; status: string; isJoined: boolean; score: number; rewardClaimed: boolean }>;
      activityBoards: Array<{ key: string; scope: string; isActive: boolean }>;
      shopItems: Array<{ id: string; costPoints: number; isAvailable: boolean }>;
      scenarios: Array<{ id: string; name: string; bestScore: number | null }>;
      wallet: { balance: number; vipExperience: number };
    }>(baseUrl, "/season?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(center.status, 200);
    assert.equal(center.body.data?.season.status, "active");
    assert.equal(center.body.data?.activityBoards.some((board) => board.scope === "activity" && board.isActive), true);
    assert.equal(center.body.data?.activities[0]?.isJoined, false);

    const task = await requestJson<{ season: { points: number }; task: { progress: number; isClaimed: boolean } }>(
      baseUrl,
      "/season/tasks/season-daily-project/progress",
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: "s1" })
      }
    );
    assert.equal(task.status, 200);
    assert.equal(task.body.data?.task.progress, 1);
    assert.equal(task.body.data?.task.isClaimed, true);
    assert.equal(task.body.data?.season.points, 120);

    const pass = await requestJson<{ wallet: { balance: number; vipExperience: number }; isDuplicate: boolean }>(
      baseUrl,
      "/season/pass/purchase",
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: "s1", seasonId: "season-ai-agent-2026", requestId: "season-pass-req-001" })
      }
    );
    assert.equal(pass.status, 201);
    assert.equal(pass.body.data?.wallet.balance, profile.platformCoins - 880);
    assert.equal(pass.body.data?.wallet.vipExperience, 880);

    const duplicatePass = await requestJson<{ wallet: { balance: number; vipExperience: number }; isDuplicate: boolean }>(
      baseUrl,
      "/season/pass/purchase",
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: "s1", seasonId: "season-ai-agent-2026", requestId: "season-pass-req-001" })
      }
    );
    assert.equal(duplicatePass.status, 200);
    assert.equal(duplicatePass.body.data?.isDuplicate, true);
    assert.equal(duplicatePass.body.data?.wallet.vipExperience, 880);

    const joined = await requestJson<{ activity: { isJoined: boolean } }>(baseUrl, "/activities/ai-agent-growth/join", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(joined.status, 200);
    assert.equal(joined.body.data?.activity.isJoined, true);

    const progressed = await requestJson<{ activity: { score: number }; season: { points: number } }>(
      baseUrl,
      "/activities/ai-agent-growth/progress",
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: "s1", scoreDelta: 260 })
      }
    );
    assert.equal(progressed.status, 200, JSON.stringify(progressed.body));
    assert.equal(progressed.body.data?.activity.score, 260);
    assert.equal(progressed.body.data?.season.points, 380);

    const claimed = await requestJson<{ activity: { rewardClaimed: boolean }; profile: { cash: number; reputation: number } }>(
      baseUrl,
      "/activities/ai-agent-growth/claim",
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: "s1" })
      }
    );
    assert.equal(claimed.status, 200);
    assert.equal(claimed.body.data?.activity.rewardClaimed, true);
    assert.equal(claimed.body.data?.profile.cash, profile.cash + 120000);
    assert.equal(claimed.body.data?.profile.reputation, profile.reputation + 600);

    const seasonAchievements = await requestJson<AchievementRecord[]>(baseUrl, "/achievements?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(seasonAchievements.status, 200);
    assert.equal(seasonAchievements.body.data?.find((item) => item.id === "season-ai-agent-growth")?.isCompleted, true);

    const seasonAchievementClaim = await requestJson<AchievementClaimRecord>(
      baseUrl,
      "/achievements/season-ai-agent-growth/claim",
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: "s1" })
      }
    );
    assert.equal(seasonAchievementClaim.status, 200);

    const seasonKnowledge = await requestJson<KnowledgeEntryRecord[]>(baseUrl, "/knowledge?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(seasonKnowledge.status, 200);
    assert.equal(seasonKnowledge.body.data?.some((entry) => entry.id === "ai-agent-season-playbook"), true);

    const duplicateClaim = await requestJson(baseUrl, "/activities/ai-agent-growth/claim", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicateClaim.status, 409);
    assert.equal(duplicateClaim.body.error?.code, "ACTIVITY_REWARD_ALREADY_CLAIMED");

    const activityShop = await requestJson(baseUrl, "/activity-shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", itemId: "activity-risk-insurance", requestId: "activity-shop-main-001" })
    });
    assert.equal(activityShop.status, 201, JSON.stringify(activityShop.body));

    const tasks = await requestJson<TaskRecord[]>(baseUrl, "/tasks?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(tasks.status, 200);
    const claimableTasks = new Set((tasks.body.data ?? []).filter((task) => task.isClaimable).map((task) => task.id));
    const missingSeasonTasks = ["main-pass-value", "main-activity-shop-plan", "main-full-level-plan"].filter((taskId) => !claimableTasks.has(taskId));
    assert.deepEqual(missingSeasonTasks, []);

    const started = await requestJson<{ run: { id: string; initialState: { cashDays: number; debtRatioBasisPoints: number } } }>(
      baseUrl,
      "/scenarios/cashflow-rescue/start",
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: "s1" })
      }
    );
    assert.equal(started.status, 201);
    assert.equal(started.body.data?.run.initialState.cashDays, 15);
    assert.equal(started.body.data?.run.initialState.debtRatioBasisPoints, 8000);

    const runId = started.body.data?.run.id ?? "";
    const settled = await requestJson<{ run: { score: number; grade: string; rewardClaimed: boolean } }>(
      baseUrl,
      `/scenarios/${encodeURIComponent(runId)}/settle`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: "s1", choices: ["cost_cut", "debt_restructure", "compliance_fix"] })
      }
    );
    assert.equal(settled.status, 200);
    assert.equal(settled.body.data?.run.score, 92);
    assert.equal(settled.body.data?.run.grade, "S");
    assert.equal(settled.body.data?.run.rewardClaimed, true);
  });
});

test("phase 19 exposes season activity and scenario configs to admin", async () => {
  await withServer(async (baseUrl) => {
    const admin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(admin.status, 200);

    const configCenter = await requestJson<{
      seasons: Array<{ id: string; name: string; status: string }>;
      activities: Array<{ id: string; name: string; status: string; leaderboardKey: string }>;
      scenarios: Array<{ id: string; name: string; rewardTitleId: string | null }>;
    }>(baseUrl, "/admin/config-center", {
      headers: { authorization: `Bearer ${admin.body.data?.token ?? ""}` }
    });

    assert.equal(configCenter.status, 200);
    assert.ok(configCenter.body.data?.seasons.some((season) => season.id === "season-ai-agent-2026" && season.status === "active"));
    assert.ok(configCenter.body.data?.activities.some((activity) => activity.id === "ai-agent-growth" && activity.leaderboardKey === "activity-ai-agent-growth"));
    assert.ok(configCenter.body.data?.scenarios.some((scenario) => scenario.id === "cashflow-rescue" && scenario.rewardTitleId === "cashflow-master"));
  });
});

test("lists wallet and buys shop products with idempotent platform coin deduction", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "shopbuyer");
    const shop = await requestJson<ShopCenterRecord>(baseUrl, "/shop?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(shop.status, 200);
    assert.equal(shop.body.data?.wallet.balance, profile.platformCoins);
    assert.ok(shop.body.data?.products.some((product) => product.id === "monthly-card-basic"));

    const requestId = randomUUID();
    const bought = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", productId: "monthly-card-basic", requestId })
    });
    assert.equal(bought.status, 201);
    assert.equal(bought.body.success, true);
    const boughtData = bought.body.data as {
      wallet: PlatformWalletRecord;
      profile: PlayerProfileRecord;
      isDuplicate: boolean;
    };
    assert.equal(boughtData.isDuplicate, false);
    assert.equal(boughtData.wallet.balance, profile.platformCoins - 1280);
    assert.equal(boughtData.wallet.vipExperience, 1280);
    assert.equal(boughtData.profile.platformCoins, boughtData.wallet.balance);
    assert.equal(boughtData.wallet.ledgers[0]?.source, "shop_purchase");

    const duplicate = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", productId: "monthly-card-basic", requestId })
    });
    assert.equal(duplicate.status, 200);
    const duplicateData = duplicate.body.data as {
      wallet: PlatformWalletRecord;
      isDuplicate: boolean;
    };
    assert.equal(duplicateData.isDuplicate, true);
    assert.equal(duplicateData.wallet.balance, boughtData.wallet.balance);

    const limited = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", productId: "monthly-card-basic", requestId: randomUUID() })
    });
    assert.equal(limited.status, 409);
    assert.equal(limited.body.error?.code, "PURCHASE_LIMIT_REACHED");

    const weekly = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", productId: "weekly-operation-card", requestId: "weekly-card-main-001" })
    });
    assert.equal(weekly.status, 201, JSON.stringify(weekly.body));

    const growthFund = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", productId: "growth-fund-weekly", requestId: "growth-fund-main-001" })
    });
    assert.equal(growthFund.status, 201, JSON.stringify(growthFund.body));

    const vip = await requestJson<VipCenterRecord>(baseUrl, "/vip?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(vip.status, 200);

    const inventory = await requestJson<InventoryCenterRecord>(baseUrl, "/inventory?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(inventory.status, 200);

    const tasks = await requestJson<TaskRecord[]>(baseUrl, "/tasks?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(tasks.status, 200);
    const claimableTasks = new Set((tasks.body.data ?? []).filter((task) => task.isClaimable).map((task) => task.id));
    const missingPrivilegeTasks = [
      "main-week-card-value",
      "main-growth-fund-check",
      "main-fund-node",
      "main-vip-benefit-review",
      "main-action-power-plan"
    ].filter((taskId) => !claimableTasks.has(taskId));
    assert.deepEqual(missingPrivilegeTasks, []);
  });
});

test("uses action drink and resets daily pack purchase limit by server day", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "actionloop");
    const bought = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1", productId: "daily-founder-pack", requestId: "daily-pack-20260501" })
    });
    assert.equal(bought.status, 201, JSON.stringify(bought.body));

    const used = await requestJson<{ profile: PlayerProfileRecord; inventory: InventoryCenterRecord }>(baseUrl, "/inventory/use", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1", itemId: "action-drink" })
    });
    assert.equal(used.status, 200, JSON.stringify(used.body));
    assert.equal(used.body.data?.profile.actionPower, profile.actionPower + 30 + 40);
    assert.equal(used.body.data?.inventory.items.some((item) => item.itemId === "action-drink"), false);

    const duplicateSameDay = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1", productId: "daily-founder-pack", requestId: "daily-pack-20260501-repeat" })
    });
    assert.equal(duplicateSameDay.status, 409);
    assert.equal(duplicateSameDay.body.error?.code, "PURCHASE_LIMIT_REACHED");

    const nextDay = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-02" },
      body: JSON.stringify({ serverId: "s1", productId: "daily-founder-pack", requestId: "daily-pack-20260502" })
    });
    assert.equal(nextDay.status, 201, JSON.stringify(nextDay.body));
  });
});

test("season pass adds one daily season random task", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "passrandom");
    const before = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(before.status, 200);
    assert.equal(before.body.data?.dailyLimit, 6);
    assert.equal(before.body.data?.tasks.length, 3);

    const season = await requestJson<{ season: { id: string } }>(baseUrl, "/season?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(season.status, 200);
    const seasonId = season.body.data?.season.id;
    assert.ok(seasonId);

    const pass = await requestJson(baseUrl, "/season/pass/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1", seasonId, requestId: "pass-random-20260501" })
    });
    assert.equal(pass.status, 201, JSON.stringify(pass.body));

    const after = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(after.status, 200);
    assert.equal(after.body.data?.dailyLimit, 7);
    assert.equal(after.body.data?.tasks.length, 4);
    assert.equal(after.body.data?.tasks.filter((task) => task.category === "season").length, 1);
  });
});

test("regular random task generation excludes season tasks", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "regularrandom");
    const auth = { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" };
    let center = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
      headers: auth
    });
    assert.equal(center.status, 200, JSON.stringify(center.body));

    for (let attempt = 0; attempt < 6; attempt += 1) {
      assert.equal(center.body.data?.tasks.some((task) => task.category === "season"), false);
      const pendingTask = center.body.data?.tasks.find((task) => task.status === "pending");
      if (pendingTask === undefined) {
        break;
      }
      const dismissed = await requestJson<RandomTaskActionRecord>(
        baseUrl,
        `/random-tasks/${encodeURIComponent(pendingTask.id)}/dismiss`,
        {
          method: "POST",
          headers: auth,
          body: JSON.stringify({ serverId: "s1" })
        }
      );
      assert.equal(dismissed.status, 200, JSON.stringify(dismissed.body));
      center = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
        headers: auth
      });
      assert.equal(center.status, 200, JSON.stringify(center.body));
    }

    assert.equal(center.body.data?.tasks.some((task) => task.category === "season"), false);
  });
});

test("uses risk insurance to reduce random task losses", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "riskmodifier");
    const bought = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1", productId: "risk-insurance-trial", requestId: "risk-insurance-20260501" })
    });
    assert.equal(bought.status, 201, JSON.stringify(bought.body));

    const beforeInventory = await requestJson<InventoryCenterRecord>(baseUrl, "/inventory?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(beforeInventory.status, 200);
    assert.equal(beforeInventory.body.data?.items.find((item) => item.itemId === "risk-insurance")?.quantity, 1);

    const center = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(center.status, 200);
    const financeTask = center.body.data?.tasks.find((task) => task.category === "finance");
    assert.ok(financeTask);
    const reputationBefore = center.body.data?.profile.reputation ?? 0;

    const resolved = await requestJson<RandomTaskActionRecord & { usedItem?: { itemId: string; effectSummary: string } }>(
      baseUrl,
      `/random-tasks/${encodeURIComponent(financeTask.id)}/resolve`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
        body: JSON.stringify({ serverId: "s1", option: "B", modifierItemId: "risk-insurance" })
      }
    );
    assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
    assert.equal(resolved.body.data?.profile.reputation, reputationBefore - 40);
    assert.equal(resolved.body.data?.usedItem?.itemId, "risk-insurance");
    assert.match(resolved.body.data?.result ?? "", /风险保险已生效/);

    const afterInventory = await requestJson<InventoryCenterRecord>(baseUrl, "/inventory?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(afterInventory.status, 200);
    assert.equal(afterInventory.body.data?.items.some((item) => item.itemId === "risk-insurance"), false);
    assert.equal(afterInventory.body.data?.recentLedgers[0]?.source, "random_task_modifier");
  });
});

test("uses market intel to improve market random task results", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "marketmodifier");
    const bought = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1", productId: "market-intel-trial", requestId: "market-intel-20260501" })
    });
    assert.equal(bought.status, 201, JSON.stringify(bought.body));

    const beforeInventory = await requestJson<InventoryCenterRecord>(baseUrl, "/inventory?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(beforeInventory.status, 200);
    assert.equal(beforeInventory.body.data?.items.find((item) => item.itemId === "market-intel")?.quantity, 1);

    const center = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(center.status, 200);
    const marketTask = center.body.data?.tasks.find((task) => task.category === "market");
    assert.ok(marketTask);
    const reputationBefore = center.body.data?.profile.reputation ?? 0;
    const experienceBefore = center.body.data?.profile.companyExperience ?? 0;

    const resolved = await requestJson<RandomTaskActionRecord & { usedItem?: { itemId: string; effectSummary: string } }>(
      baseUrl,
      `/random-tasks/${encodeURIComponent(marketTask.id)}/resolve`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
        body: JSON.stringify({ serverId: "s1", option: "A", modifierItemId: "market-intel" })
      }
    );
    assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
    assert.equal(resolved.body.data?.profile.reputation, reputationBefore + 504);
    assert.equal(resolved.body.data?.profile.companyExperience, experienceBefore + 99);
    assert.equal(resolved.body.data?.usedItem?.itemId, "market-intel");
    assert.match(resolved.body.data?.result ?? "", /市场情报已生效/);

    const afterInventory = await requestJson<InventoryCenterRecord>(baseUrl, "/inventory?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(afterInventory.status, 200);
    assert.equal(afterInventory.body.data?.items.some((item) => item.itemId === "market-intel"), false);
    assert.equal(afterInventory.body.data?.recentLedgers[0]?.source, "random_task_modifier");
  });
});

test("uses finance advisor card to improve finance random task results", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "financemodifier");
    const bought = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1", productId: "finance-advisor-trial", requestId: "finance-advisor-20260501" })
    });
    assert.equal(bought.status, 201, JSON.stringify(bought.body));

    const beforeInventory = await requestJson<InventoryCenterRecord>(baseUrl, "/inventory?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(beforeInventory.status, 200);
    assert.equal(beforeInventory.body.data?.items.find((item) => item.itemId === "finance-advisor-card")?.quantity, 1);

    const center = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(center.status, 200);
    const financeTask = center.body.data?.tasks.find((task) => task.category === "finance");
    assert.ok(financeTask);
    const cashBefore = center.body.data?.profile.cash ?? 0;
    const reputationBefore = center.body.data?.profile.reputation ?? 0;
    const experienceBefore = center.body.data?.profile.companyExperience ?? 0;

    const resolved = await requestJson<RandomTaskActionRecord & { usedItem?: { itemId: string; effectSummary: string } }>(
      baseUrl,
      `/random-tasks/${encodeURIComponent(financeTask.id)}/resolve`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
        body: JSON.stringify({ serverId: "s1", option: "A", modifierItemId: "finance-advisor-card" })
      }
    );
    assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
    assert.equal(resolved.body.data?.profile.cash, cashBefore + 72000);
    assert.equal(resolved.body.data?.profile.reputation, reputationBefore + 198);
    assert.equal(resolved.body.data?.profile.companyExperience, experienceBefore + 71);
    assert.equal(resolved.body.data?.usedItem?.itemId, "finance-advisor-card");
    assert.match(resolved.body.data?.result ?? "", /财务顾问卡已生效/);

    const afterInventory = await requestJson<InventoryCenterRecord>(baseUrl, "/inventory?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(afterInventory.status, 200);
    assert.equal(afterInventory.body.data?.items.some((item) => item.itemId === "finance-advisor-card"), false);
    assert.equal(afterInventory.body.data?.recentLedgers[0]?.source, "random_task_modifier");
  });
});

test("lists funding and loan random tasks for finance advisor usage", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "capitalmodifiers");
    const auth = { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" };
    const bought = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", productId: "finance-advisor-trial", requestId: "capital-advisor-20260501" })
    });
    assert.equal(bought.status, 201, JSON.stringify(bought.body));

    let center = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
      headers: auth
    });
    assert.equal(center.status, 200, JSON.stringify(center.body));

    for (let attempt = 0; attempt < 6 && !center.body.data?.tasks.some((task) => task.category === "funding"); attempt += 1) {
      const pendingTask = center.body.data?.tasks.find((task) => task.status === "pending");
      assert.ok(pendingTask);
      const dismissed = await requestJson<RandomTaskActionRecord>(
        baseUrl,
        `/random-tasks/${encodeURIComponent(pendingTask.id)}/dismiss`,
        {
          method: "POST",
          headers: auth,
          body: JSON.stringify({ serverId: "s1" })
        }
      );
      assert.equal(dismissed.status, 200, JSON.stringify(dismissed.body));
      center = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
        headers: auth
      });
      assert.equal(center.status, 200, JSON.stringify(center.body));
    }

    const fundingTask = center.body.data?.tasks.find((task) => task.category === "funding");
    assert.ok(fundingTask);
    const fundingCashBefore = center.body.data?.profile.cash ?? 0;
    const fundingResolved = await requestJson<RandomTaskActionRecord>(
      baseUrl,
      `/random-tasks/${encodeURIComponent(fundingTask.id)}/resolve`,
      {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ serverId: "s1", option: "A", modifierItemId: "finance-advisor-card" })
      }
    );
    assert.equal(fundingResolved.status, 200, JSON.stringify(fundingResolved.body));
    assert.equal(fundingResolved.body.data?.usedItem?.itemId, "finance-advisor-card");
    assert.ok((fundingResolved.body.data?.profile.cash ?? 0) > fundingCashBefore);

    const boughtAgain = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", productId: "finance-advisor-trial", requestId: "capital-advisor-20260501-b" })
    });
    assert.equal(boughtAgain.status, 201, JSON.stringify(boughtAgain.body));

    center = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
      headers: auth
    });
    assert.equal(center.status, 200, JSON.stringify(center.body));

    for (let attempt = 0; attempt < 6 && !center.body.data?.tasks.some((task) => task.category === "loan"); attempt += 1) {
      const pendingTask = center.body.data?.tasks.find((task) => task.status === "pending");
      assert.ok(pendingTask);
      const dismissed = await requestJson<RandomTaskActionRecord>(
        baseUrl,
        `/random-tasks/${encodeURIComponent(pendingTask.id)}/dismiss`,
        {
          method: "POST",
          headers: auth,
          body: JSON.stringify({ serverId: "s1" })
        }
      );
      assert.equal(dismissed.status, 200, JSON.stringify(dismissed.body));
      center = await requestJson<RandomTaskCenterRecord>(baseUrl, "/random-tasks?serverId=s1", {
        headers: auth
      });
      assert.equal(center.status, 200, JSON.stringify(center.body));
    }

    const loanTask = center.body.data?.tasks.find((task) => task.category === "loan");
    assert.ok(loanTask);
    const loanCashBefore = center.body.data?.profile.cash ?? 0;
    const loanResolved = await requestJson<RandomTaskActionRecord>(
      baseUrl,
      `/random-tasks/${encodeURIComponent(loanTask.id)}/resolve`,
      {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ serverId: "s1", option: "A", modifierItemId: "finance-advisor-card" })
      }
    );
    assert.equal(loanResolved.status, 200, JSON.stringify(loanResolved.body));
    assert.equal(loanResolved.body.data?.usedItem?.itemId, "finance-advisor-card");
    assert.ok((loanResolved.body.data?.profile.cash ?? 0) > loanCashBefore);
  });
});

test("claims full level chest rewards from overflow experience", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "fulllevelchest");

    const claimedSeed = await requestJson<TaskRecord>(baseUrl, "/tasks/test-full-level-seed/claim", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(claimedSeed.status, 200, JSON.stringify(claimedSeed.body));

    const beforeGrowth = await requestJson<CompanyGrowthRecord>(baseUrl, "/company/growth?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(beforeGrowth.status, 200, JSON.stringify(beforeGrowth.body));
    assert.equal(beforeGrowth.body.data?.profile.companyLevel, 80);
    assert.equal(beforeGrowth.body.data?.fullLevelChest.claimableCount, 1);

    const claimedChest = await requestJson<CompanyGrowthRecord>(baseUrl, "/company/growth/full-level-chest/claim", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(claimedChest.status, 200, JSON.stringify(claimedChest.body));
    assert.equal(claimedChest.body.data?.fullLevelChest.claimedCount, 1);
    assert.equal(claimedChest.body.data?.fullLevelChest.claimableCount, 0);
    assert.equal(claimedChest.body.data?.profile.reputation, (beforeGrowth.body.data?.profile.reputation ?? 0) + 300);
    assert.equal(claimedChest.body.data?.profile.actionPower, (beforeGrowth.body.data?.profile.actionPower ?? 0) + 40);

    const inventory = await requestJson<InventoryCenterRecord>(baseUrl, "/inventory?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(inventory.status, 200);
    assert.equal(inventory.body.data?.items.find((item) => item.itemId === "season-exp-ticket")?.quantity, 1);
    assert.equal(inventory.body.data?.recentLedgers[0]?.source, "full_level_chest");

    const duplicate = await requestJson(baseUrl, "/company/growth/full-level-chest/claim", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error?.code, "FULL_LEVEL_CHEST_NOT_READY");
  });
});

test("blocks insufficient platform coins and reserves external payment orders", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "shoppoor");
    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    assert.ok(adminLogin.body.data?.token);

    const deducted = await requestJson(baseUrl, "/admin/wallet/adjust", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        profileId: profile.id,
        source: "admin_deduct",
        changeAmount: -36300,
        reason: "测试扣减到低余额"
      })
    });
    assert.equal(deducted.status, 200);

    const blocked = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", productId: "monthly-card-basic", requestId: randomUUID() })
    });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.error?.code, "INSUFFICIENT_PLATFORM_COINS");

    const reserved = await requestJson(baseUrl, "/payments/reserve", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", productId: "monthly-card-basic", amountCents: 12800, platformCoins: 1280 })
    });
    assert.equal(reserved.status, 201);
    assert.equal((reserved.body.data as { status: string }).status, "reserved");
  });
});

test("admin platform coin adjustment requires admin auth and writes audit-backed ledger", async () => {
  await withServer(async (baseUrl) => {
    const { profile } = await createPlayerSession(baseUrl, "adminwallet");
    const blocked = await requestJson(baseUrl, "/admin/wallet/adjust", {
      method: "POST",
      body: JSON.stringify({
        profileId: profile.id,
        source: "admin_grant",
        changeAmount: 1000,
        reason: "未登录后台"
      })
    });
    assert.equal(blocked.status, 401);

    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    assert.ok(adminLogin.body.data?.token);

    const adjusted = await requestJson(baseUrl, "/admin/wallet/adjust", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        profileId: profile.id,
        source: "admin_grant",
        changeAmount: 1200,
        reason: "运营补偿"
      })
    });
    assert.equal(adjusted.status, 200);
    const data = adjusted.body.data as {
      wallet: PlatformWalletRecord;
      profile: PlayerProfileRecord;
      auditLogId: string;
    };
    assert.equal(data.wallet.balance, profile.platformCoins + 1200);
    assert.equal(data.profile.platformCoins, data.wallet.balance);
    assert.ok(data.auditLogId);
    assert.equal(data.wallet.ledgers[0]?.source, "admin_grant");
  });
});

test("platform coin spending upgrades VIP and enables daily gift once per day", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "vipbuyer");
    const before = await requestJson<VipCenterRecord>(baseUrl, "/vip?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(before.status, 200);
    assert.equal(before.body.data?.currentLevel.level, 0);

    const bought = await requestJson(baseUrl, "/shop/purchase", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", productId: "monthly-card-basic", requestId: randomUUID() })
    });
    assert.equal(bought.status, 201);

    const after = await requestJson<VipCenterRecord>(baseUrl, "/vip?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(after.status, 200);
    assert.equal(after.body.data?.wallet.vipExperience, 1280);
    assert.equal(after.body.data?.currentLevel.level, 2);
    assert.equal(after.body.data?.benefits.title, "增长合伙人");
    assert.ok((after.body.data?.benefits.actionPowerLimit ?? 0) > profile.actionPowerLimit);

    const gift = await requestJson(baseUrl, "/vip/daily-gift", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(gift.status, 200);
    const giftData = gift.body.data as { vipCenter: VipCenterRecord; profile: PlayerProfileRecord };
    assert.equal(giftData.vipCenter.dailyGift.isClaimed, true);
    assert.equal(giftData.profile.platformCoins, profile.platformCoins - 1280 + 60);

    const duplicate = await requestJson(baseUrl, "/vip/daily-gift", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error?.code, "VIP_DAILY_GIFT_ALREADY_CLAIMED");
  });
});

test("admin coin grants do not increase VIP experience but admin VIP adjustment audits", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "vipadmin");
    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    assert.ok(adminLogin.body.data?.token);

    const granted = await requestJson(baseUrl, "/admin/wallet/adjust", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        profileId: profile.id,
        source: "admin_grant",
        changeAmount: 5000,
        reason: "运营补偿不加 VIP"
      })
    });
    assert.equal(granted.status, 200);

    const playerVip = await requestJson<VipCenterRecord>(baseUrl, "/vip?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(playerVip.status, 200);
    assert.equal(playerVip.body.data?.wallet.vipExperience, 0);
    assert.equal(playerVip.body.data?.currentLevel.level, 0);

    const adjusted = await requestJson(baseUrl, "/admin/vip/adjust", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        profileId: profile.id,
        vipExperience: 3000,
        reason: "客服修正 VIP 经验"
      })
    });
    assert.equal(adjusted.status, 200);
    const adjustedData = adjusted.body.data as { vipCenter: VipCenterRecord; auditLogId: string };
    assert.equal(adjustedData.vipCenter.currentLevel.level, 3);
    assert.ok(adjustedData.auditLogId);

    const adminVip = await requestJson<VipCenterRecord>(baseUrl, `/admin/vip?profileId=${encodeURIComponent(profile.id)}`, {
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` }
    });
    assert.equal(adminVip.status, 200);
    assert.equal(adminVip.body.data?.currentLevel.level, 3);
  });
});

test("admin can query and configure VIP level benefits", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "vipconfig");
    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    assert.ok(adminLogin.body.data?.token);

    const configs = await requestJson<VipCenterRecord["currentLevel"][]>(baseUrl, "/admin/vip/configs", {
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` }
    });
    assert.equal(configs.status, 200);
    assert.ok(configs.body.data?.some((config) => config.level === 2));

    const upserted = await requestJson(baseUrl, "/admin/vip/configs", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        level: 4,
        name: "VIP 4",
        requiredExperience: 5000,
        dailyGiftPlatformCoins: 180,
        dailyGiftActionPower: 100,
        actionPowerLimitBonus: 60,
        quickSettleTimes: 4,
        trainingQueueBonus: 2,
        recruitRefreshTimes: 4,
        shopDiscountBasisPoints: 9000,
        title: "战略投资人",
        avatarFrame: "royal-black-gold",
        summary: "提供更高身份展示和经营便利。",
        reason: "配置 VIP4 权益"
      })
    });
    assert.equal(upserted.status, 200);
    const configData = upserted.body.data as { config: VipCenterRecord["currentLevel"]; auditLogId: string };
    assert.equal(configData.config.level, 4);
    assert.ok(configData.auditLogId);

    const adjusted = await requestJson(baseUrl, "/admin/vip/adjust", {
      method: "POST",
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` },
      body: JSON.stringify({
        profileId: profile.id,
        vipExperience: 5000,
        reason: "验证 VIP4 配置生效"
      })
    });
    assert.equal(adjusted.status, 200);

    const playerVip = await requestJson<VipCenterRecord>(baseUrl, "/vip?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(playerVip.status, 200);
    assert.equal(playerVip.body.data?.currentLevel.level, 4);
    assert.equal(playerVip.body.data?.benefits.title, "战略投资人");
    assert.equal(playerVip.body.data?.dailyGift.rewardPlatformCoins, 180);
  });
});

test("admin can filter and update knowledge entries with audit", async () => {
  await withServer(async (baseUrl) => {
    const blocked = await requestJson(baseUrl, "/admin/knowledge");
    assert.equal(blocked.status, 401);
    assert.equal(blocked.body.error?.code, "UNAUTHORIZED");

    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    assert.ok(adminLogin.body.data?.token);
    const auth = { authorization: `Bearer ${adminLogin.body.data.token}` };

    const listed = await requestJson<{
      rows: Array<KnowledgeEntryRecord & { categoryId: string; sortOrder: number }>;
      total: number;
      categories: Array<{ id: string; name: string }>;
    }>(baseUrl, "/admin/knowledge?category=劳动用工&reviewStatus=published&keyword=劳动", {
      headers: auth
    });
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    assert.ok(listed.body.data);
    assert.ok(listed.body.data.total >= 1);
    assert.ok(listed.body.data.categories.some((category) => category.name === "劳动用工"));
    assert.ok(listed.body.data.rows.every((entry) => entry.category === "劳动用工"));
    const laborCard = listed.body.data.rows.find((entry) => entry.id === "labor-written-contract");
    assert.ok(laborCard);
    assert.equal(laborCard.scenarioText.includes("经营决策场景"), true);

    const updated = await requestJson<KnowledgeEntryRecord & { auditLogId: string }>(baseUrl, "/admin/knowledge/labor-written-contract", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        summary: "后台审核后的劳动合同经营解释。",
        scenarioText: laborCard.scenarioText,
        riskText: laborCard.riskText,
        gameImpactText: laborCard.gameImpactText,
        actionTipText: "入职前先确认岗位、薪酬、试用期和签署记录。",
        sourceName: "全国人大网",
        sourceUrl: laborCard.sourceUrl,
        collectedAt: laborCard.collectedAt,
        contentVersion: "2026.05.admin-review",
        reviewStatus: "reviewing",
        reason: "阶段22知识审核验证"
      })
    });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.data?.summary, "后台审核后的劳动合同经营解释。");
    assert.equal(updated.body.data?.reviewStatus, "reviewing");
    assert.ok(updated.body.data?.auditLogId);

    const relisted = await requestJson<{ rows: KnowledgeEntryRecord[] }>(baseUrl, "/admin/knowledge?reviewStatus=reviewing&keyword=劳动合同", {
      headers: auth
    });
    assert.equal(relisted.status, 200, JSON.stringify(relisted.body));
    assert.equal(relisted.body.data?.rows.some((entry) => entry.id === "labor-written-contract"), true);

    const logs = await requestJson<{ rows: Array<{ action: string; targetType: string; targetId: string | null }> }>(baseUrl, "/admin/audit-logs", {
      headers: auth
    });
    assert.equal(logs.status, 200);
    assert.ok(logs.body.data?.rows.some((log) => log.action === "admin_knowledge_update" && log.targetType === "knowledge_entry" && log.targetId === "labor-written-contract"));
  });
});

test("phase 14 leaderboards snapshot rewards and title expiry are idempotent", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "ranker");

    const leaderboards = await requestJson<LeaderboardCenterRecord>(baseUrl, "/leaderboards?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(leaderboards.status, 200);
    assert.equal(leaderboards.body.data?.boards.length, 4);
    assert.equal(leaderboards.body.data?.activityBoards.length, 1);
    assert.equal(leaderboards.body.data?.activityBoards[0]?.scope, "activity");
    assert.ok(leaderboards.body.data?.boards.every((board) => board.scope === "server"));

    const settled = await requestJson<LeaderboardSettlementRecord>(baseUrl, "/leaderboards/settle", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(settled.status, 200);
    assert.ok((settled.body.data?.deliveredRewards ?? 0) > 0);

    const duplicate = await requestJson<LeaderboardSettlementRecord>(baseUrl, "/leaderboards/settle", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.data?.deliveredRewards, 0);

    const expiredEquip = await requestJson(baseUrl, "/titles/equip", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-09" },
      body: JSON.stringify({ serverId: "s1", titleId: "server-richest" })
    });
    assert.equal(expiredEquip.status, 409);
    assert.equal(expiredEquip.body.error?.code, "TITLE_EXPIRED");
  });
});

test("phase 14 achievements titles knowledge and guild basics work together", async () => {
  await withServer(async (baseUrl) => {
    const { token, profile } = await createPlayerSession(baseUrl, "collector");

    const achievements = await requestJson<AchievementRecord[]>(baseUrl, "/achievements?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(achievements.status, 200);
    assert.ok(achievements.body.data?.some((achievement) => achievement.id === "profile-created" && achievement.isCompleted));

    const claimed = await requestJson<AchievementClaimRecord>(baseUrl, "/achievements/profile-created/claim", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(claimed.status, 200);
    assert.ok((claimed.body.data?.profile.cash ?? 0) > profile.cash);
    assert.ok(claimed.body.data?.titleCenter.titles.some((title) => title.id === "startup-founder"));

    const duplicate = await requestJson(baseUrl, "/achievements/profile-created/claim", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error?.code, "ACHIEVEMENT_ALREADY_CLAIMED");

    const equipped = await requestJson<TitleCenterRecord>(baseUrl, "/titles/equip", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", titleId: "startup-founder" })
    });
    assert.equal(equipped.status, 200);
    assert.equal(equipped.body.data?.equippedTitle?.name, "初创老板");

    const knowledge = await requestJson<KnowledgeEntryRecord[]>(baseUrl, "/knowledge?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(knowledge.status, 200);
    assert.ok(knowledge.body.data?.some((entry) => entry.disclaimer === "仅作游戏科普，不构成法律建议" && entry.sourceUrl.startsWith("https://")));

    const joined = await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", guildName: "长宁创业会" })
    });
    assert.equal(joined.status, 200);
    assert.equal(joined.body.data?.guildCenter.guild?.name, "长宁创业会");

    const helped = await requestJson<GuildActionRecord>(baseUrl, "/guild/help", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1", requestType: "project-advice" })
    });
    assert.equal(helped.status, 200);
    assert.equal(helped.body.data?.guildCenter.helpRequests.length, 1);
    assert.ok((helped.body.data?.guildCenter.guild?.contributionScore ?? 0) > 0);

    const tasks = await requestJson<TaskRecord[]>(baseUrl, "/tasks?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(tasks.body.data?.find((task) => task.id === "daily-guild-contribution")?.isClaimable, true);
  });
});

test("guild tasks can be claimed and guild tech upgrades use accumulated contribution", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "guilddeep");
    const headers = { authorization: `Bearer ${token}`, "x-server-date": "2026-05-02" };

    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers,
      body: JSON.stringify({ serverId: "s1", guildName: "深度创业会" })
    });
    const helped = await requestJson<GuildActionRecord>(baseUrl, "/guild/help", {
      method: "POST",
      headers,
      body: JSON.stringify({ serverId: "s1", requestType: "project-advice" })
    });
    assert.equal(helped.status, 200);
    assert.equal(helped.body.data?.guildCenter.tasks.find((task) => task.id === "guild-daily-help")?.progress, 1);

    const claimed = await requestJson<GuildActionRecord>(baseUrl, "/guild/tasks/guild-daily-help/claim", {
      method: "POST",
      headers,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(claimed.status, 200, JSON.stringify(claimed.body));
    assert.equal(claimed.body.data?.guildCenter.tasks.find((task) => task.id === "guild-daily-help")?.isClaimed, true);
    assert.equal(claimed.body.data?.guildCenter.guild?.contributionScore, 40);

    const duplicate = await requestJson(baseUrl, "/guild/tasks/guild-daily-help/claim", {
      method: "POST",
      headers,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error?.code, "GUILD_TASK_ALREADY_CLAIMED");

    const upgraded = await requestJson<GuildActionRecord>(baseUrl, "/guild/techs/shared-office/upgrade", {
      method: "POST",
      headers,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(upgraded.status, 200, JSON.stringify(upgraded.body));
    assert.equal(upgraded.body.data?.guildCenter.techs.find((tech) => tech.id === "shared-office")?.level, 1);
    assert.equal(upgraded.body.data?.guildCenter.techs.find((tech) => tech.id === "shared-office")?.upgradeCost, 120);
    assert.equal(upgraded.body.data?.guildCenter.guild?.level, 2);
  });
});

test("guild help fulfillment and leaderboard settlement reward daily collaboration", async () => {
  await withServer(async (baseUrl) => {
    const leader = await createPlayerSession(baseUrl, "guildleader");
    const helper = await createPlayerSession(baseUrl, "guildhelper");
    const third = await createPlayerSession(baseUrl, "guildthird");
    const outsider = await createPlayerSession(baseUrl, "guildoutsider");
    const leaderHeaders = { authorization: `Bearer ${leader.token}`, "x-server-date": "2026-05-03" };
    const helperHeaders = { authorization: `Bearer ${helper.token}`, "x-server-date": "2026-05-03" };
    const thirdHeaders = { authorization: `Bearer ${third.token}`, "x-server-date": "2026-05-03" };
    const outsiderHeaders = { authorization: `Bearer ${outsider.token}`, "x-server-date": "2026-05-03" };

    for (const headers of [leaderHeaders, helperHeaders, thirdHeaders]) {
      const joined = await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
        method: "POST",
        headers,
        body: JSON.stringify({ serverId: "s1", guildName: "协作创业会" })
      });
      assert.equal(joined.status, 200, JSON.stringify(joined.body));
    }
    const joinCenter = await requestJson<GuildCenterRecord & { joinRequests: Array<{ id: string; profileId: string }> }>(baseUrl, "/guild?serverId=s1", {
      headers: leaderHeaders
    });
    assert.equal(joinCenter.status, 200, JSON.stringify(joinCenter.body));
    for (const applicant of [helper, third]) {
      const requestId = joinCenter.body.data?.joinRequests.find((request) => request.profileId === applicant.profile.id)?.id ?? "";
      assert.ok(requestId);
      const approved = await requestJson<GuildActionRecord>(baseUrl, `/guild/applications/${encodeURIComponent(requestId)}/review`, {
        method: "POST",
        headers: leaderHeaders,
        body: JSON.stringify({ serverId: "s1", decision: "approved" })
      });
      assert.equal(approved.status, 200, JSON.stringify(approved.body));
    }
    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: outsiderHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "隔离创业会" })
    });

    const published = await requestJson<GuildActionRecord>(baseUrl, "/guild/help", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", requestType: "project-advice" })
    });
    assert.equal(published.status, 200, JSON.stringify(published.body));
    const requestId = published.body.data?.guildCenter.helpRequests[0]?.id ?? "";
    assert.ok(requestId);

    const selfFulfill = await requestJson(baseUrl, `/guild/help/${encodeURIComponent(requestId)}/fulfill`, {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(selfFulfill.status, 409);
    assert.equal(selfFulfill.body.error?.code, "GUILD_HELP_SELF_FULFILL_FORBIDDEN");

    const outsiderFulfill = await requestJson(baseUrl, `/guild/help/${encodeURIComponent(requestId)}/fulfill`, {
      method: "POST",
      headers: outsiderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(outsiderFulfill.status, 404);
    assert.equal(outsiderFulfill.body.error?.code, "GUILD_HELP_NOT_FOUND");

    const fulfilled = await requestJson<GuildActionRecord>(baseUrl, `/guild/help/${encodeURIComponent(requestId)}/fulfill`, {
      method: "POST",
      headers: helperHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(fulfilled.status, 200, JSON.stringify(fulfilled.body));
    const fulfilledRequest = fulfilled.body.data?.guildCenter.helpRequests.find((request) => request.id === requestId);
    assert.equal(fulfilledRequest?.status, "fulfilled");
    assert.equal(fulfilledRequest?.profileId, leader.profile.id);
    assert.equal(fulfilledRequest?.founderName, leader.profile.founderName);
    assert.ok(fulfilledRequest?.fulfilledAt);
    assert.equal(fulfilled.body.data?.guildCenter.members.find((member) => member.profileId === helper.profile.id)?.contributionScore, 15);
    assert.equal(fulfilled.body.data?.guildCenter.guild?.contributionScore, 35);

    const duplicateFulfill = await requestJson(baseUrl, `/guild/help/${encodeURIComponent(requestId)}/fulfill`, {
      method: "POST",
      headers: thirdHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicateFulfill.status, 409);
    assert.equal(duplicateFulfill.body.error?.code, "GUILD_HELP_ALREADY_FULFILLED");

    const claimed = await requestJson<GuildActionRecord>(baseUrl, "/guild/tasks/guild-daily-help/claim", {
      method: "POST",
      headers: helperHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(claimed.status, 200, JSON.stringify(claimed.body));
    assert.equal(claimed.body.data?.guildCenter.members.find((member) => member.profileId === helper.profile.id)?.contributionScore, 35);

    await requestJson<GuildActionRecord>(baseUrl, "/guild/help", {
      method: "POST",
      headers: thirdHeaders,
      body: JSON.stringify({ serverId: "s1", requestType: "risk-review" })
    });

    const beforeHelperProfile = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers: helperHeaders
    });
    assert.equal(beforeHelperProfile.status, 200);
    const settled = await requestJson<{ deliveredRewards: number; rewards: Array<{ profileId: string; reputationReward: number }> }>(baseUrl, "/guild/leaderboard/settle", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(settled.status, 200, JSON.stringify(settled.body));
    assert.equal(settled.body.data?.deliveredRewards, 3);
    assert.deepEqual(settled.body.data?.rewards.map((reward) => reward.reputationReward), [120, 80, 50]);

    const afterHelperProfile = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers: helperHeaders
    });
    assert.equal(afterHelperProfile.body.data?.reputation, (beforeHelperProfile.body.data?.reputation ?? 0) + 120);

    const duplicateSettlement = await requestJson<{ deliveredRewards: number }>(baseUrl, "/guild/leaderboard/settle", {
      method: "POST",
      headers: helperHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicateSettlement.status, 200, JSON.stringify(duplicateSettlement.body));
    assert.equal(duplicateSettlement.body.data?.deliveredRewards, 0);
  });
});

test("guild member applications and role permissions gate member management", async () => {
  await withServer(async (baseUrl) => {
    const leader = await createPlayerSession(baseUrl, "guildmanageleader");
    const officer = await createPlayerSession(baseUrl, "guildmanageofficer");
    const member = await createPlayerSession(baseUrl, "guildmanagemember");
    const outsider = await createPlayerSession(baseUrl, "guildmanageoutsider");
    const leaderHeaders = { authorization: `Bearer ${leader.token}`, "x-server-date": "2026-05-04" };
    const officerHeaders = { authorization: `Bearer ${officer.token}`, "x-server-date": "2026-05-04" };
    const memberHeaders = { authorization: `Bearer ${member.token}`, "x-server-date": "2026-05-04" };
    const outsiderHeaders = { authorization: `Bearer ${outsider.token}`, "x-server-date": "2026-05-04" };

    const created = await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "管理创业会" })
    });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    assert.equal(created.body.data?.guildCenter.members[0]?.role, "leader");

    const applied = await requestJson<{ guildCenter: GuildCenterRecord; result: string; applicationStatus: string }>(baseUrl, "/guild/join", {
      method: "POST",
      headers: officerHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "管理创业会" })
    });
    assert.equal(applied.status, 200, JSON.stringify(applied.body));
    assert.equal(applied.body.data?.applicationStatus, "pending");
    assert.equal(applied.body.data?.guildCenter.guild, null);

    const leaderCenter = await requestJson<GuildCenterRecord & { joinRequests: Array<{ id: string; profileId: string; status: string }> }>(baseUrl, "/guild?serverId=s1", {
      headers: leaderHeaders
    });
    assert.equal(leaderCenter.status, 200, JSON.stringify(leaderCenter.body));
    const officerRequestId = leaderCenter.body.data?.joinRequests.find((request) => request.profileId === officer.profile.id)?.id ?? "";
    assert.ok(officerRequestId);

    const approvedOfficer = await requestJson<GuildActionRecord>(baseUrl, `/guild/applications/${encodeURIComponent(officerRequestId)}/review`, {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", decision: "approved" })
    });
    assert.equal(approvedOfficer.status, 200, JSON.stringify(approvedOfficer.body));
    assert.equal(approvedOfficer.body.data?.guildCenter.members.find((item) => item.profileId === officer.profile.id)?.role, "member");

    const promoted = await requestJson<GuildActionRecord>(baseUrl, `/guild/members/${encodeURIComponent(officer.profile.id)}/role`, {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", role: "vice_leader" })
    });
    assert.equal(promoted.status, 200, JSON.stringify(promoted.body));
    assert.equal(promoted.body.data?.guildCenter.members.find((item) => item.profileId === officer.profile.id)?.role, "vice_leader");

    const memberApplication = await requestJson<{ guildCenter: GuildCenterRecord; applicationStatus: string }>(baseUrl, "/guild/join", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "管理创业会" })
    });
    assert.equal(memberApplication.status, 200, JSON.stringify(memberApplication.body));
    assert.equal(memberApplication.body.data?.applicationStatus, "pending");

    const officerCenter = await requestJson<GuildCenterRecord & { joinRequests: Array<{ id: string; profileId: string; status: string }> }>(baseUrl, "/guild?serverId=s1", {
      headers: officerHeaders
    });
    assert.equal(officerCenter.status, 200, JSON.stringify(officerCenter.body));
    const memberRequestId = officerCenter.body.data?.joinRequests.find((request) => request.profileId === member.profile.id)?.id ?? "";
    assert.ok(memberRequestId);

    const approvedMember = await requestJson<GuildActionRecord>(baseUrl, `/guild/applications/${encodeURIComponent(memberRequestId)}/review`, {
      method: "POST",
      headers: officerHeaders,
      body: JSON.stringify({ serverId: "s1", decision: "approved" })
    });
    assert.equal(approvedMember.status, 200, JSON.stringify(approvedMember.body));
    assert.equal(approvedMember.body.data?.guildCenter.members.find((item) => item.profileId === member.profile.id)?.role, "member");

    const officerRemoveLeader = await requestJson(baseUrl, `/guild/members/${encodeURIComponent(leader.profile.id)}`, {
      method: "DELETE",
      headers: officerHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(officerRemoveLeader.status, 403);
    assert.equal(officerRemoveLeader.body.error?.code, "GUILD_PERMISSION_DENIED");

    const selfRemove = await requestJson(baseUrl, `/guild/members/${encodeURIComponent(leader.profile.id)}`, {
      method: "DELETE",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(selfRemove.status, 409);
    assert.equal(selfRemove.body.error?.code, "GUILD_SELF_REMOVE_FORBIDDEN");

    const removed = await requestJson<GuildActionRecord>(baseUrl, `/guild/members/${encodeURIComponent(member.profile.id)}`, {
      method: "DELETE",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(removed.status, 200, JSON.stringify(removed.body));
    assert.equal(removed.body.data?.guildCenter.members.some((item) => item.profileId === member.profile.id), false);

    const outsiderReview = await requestJson(baseUrl, `/guild/applications/${encodeURIComponent(memberRequestId)}/review`, {
      method: "POST",
      headers: outsiderHeaders,
      body: JSON.stringify({ serverId: "s1", decision: "approved" })
    });
    assert.equal(outsiderReview.status, 409);
    assert.equal(outsiderReview.body.error?.code, "GUILD_NOT_JOINED");
  });
});

test("guild announcement rules and member activity summarize daily collaboration", async () => {
  await withServer(async (baseUrl) => {
    const leader = await createPlayerSession(baseUrl, "guildactiveleader");
    const member = await createPlayerSession(baseUrl, "guildactivemember");
    const leaderHeaders = { authorization: `Bearer ${leader.token}`, "x-server-date": "2026-05-05" };
    const memberHeaders = { authorization: `Bearer ${member.token}`, "x-server-date": "2026-05-05" };
    type GuildActivityCenter = GuildCenterRecord & {
      guild: (NonNullable<GuildCenterRecord["guild"]> & { announcement: string; collaborationRules: string }) | null;
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
    };

    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "活跃创业会" })
    });
    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "活跃创业会" })
    });

    const joinCenter = await requestJson<GuildActivityCenter>(baseUrl, "/guild?serverId=s1", {
      headers: leaderHeaders
    });
    const requestId = joinCenter.body.data?.joinRequests.find((request) => request.profileId === member.profile.id)?.id ?? "";
    assert.ok(requestId);
    await requestJson<GuildActionRecord>(baseUrl, `/guild/applications/${encodeURIComponent(requestId)}/review`, {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", decision: "approved" })
    });

    const memberSettings = await requestJson(baseUrl, "/guild/settings", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({
        serverId: "s1",
        announcement: "本周聚焦联合路演材料。",
        collaborationRules: "互助请求当天响应，风险复核优先。"
      })
    });
    assert.equal(memberSettings.status, 403);
    assert.equal(memberSettings.body.error?.code, "GUILD_PERMISSION_DENIED");

    const settings = await requestJson<{ guildCenter: GuildActivityCenter; result: string }>(baseUrl, "/guild/settings", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({
        serverId: "s1",
        announcement: "本周聚焦联合路演材料。",
        collaborationRules: "互助请求当天响应，风险复核优先。"
      })
    });
    assert.equal(settings.status, 200, JSON.stringify(settings.body));
    assert.equal(settings.body.data?.guildCenter.guild?.announcement, "本周聚焦联合路演材料。");
    assert.equal(settings.body.data?.guildCenter.guild?.collaborationRules, "互助请求当天响应，风险复核优先。");

    const published = await requestJson<GuildActionRecord>(baseUrl, "/guild/help", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", requestType: "project-advice" })
    });
    const helpId = published.body.data?.guildCenter.helpRequests[0]?.id ?? "";
    assert.ok(helpId);
    await requestJson<GuildActionRecord>(baseUrl, `/guild/help/${encodeURIComponent(helpId)}/fulfill`, {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson<GuildActionRecord>(baseUrl, "/guild/tasks/guild-daily-help/claim", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson<GuildActionRecord>(baseUrl, "/guild/techs/shared-office/upgrade", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });

    const center = await requestJson<GuildActivityCenter>(baseUrl, "/guild?serverId=s1", {
      headers: leaderHeaders
    });
    assert.equal(center.status, 200, JSON.stringify(center.body));
    assert.equal(center.body.data?.guild?.announcement, "本周聚焦联合路演材料。");
    assert.equal(center.body.data?.guild?.collaborationRules, "互助请求当天响应，风险复核优先。");
    assert.equal(center.body.data?.todayActiveMemberCount, 2);
    assert.equal(center.body.data?.todayCollaborationCount, 4);
    assert.deepEqual([...new Set(center.body.data?.recentActivities.map((activity) => activity.action))].sort(), [
      "help_fulfilled",
      "help_requested",
      "task_claimed",
      "tech_upgraded"
    ]);
    assert.ok(center.body.data?.recentActivities.every((activity) => activity.createdAt.startsWith("2026-05-05")));
  });
});

test("guild collaboration projects progress from activity and claim reputation rewards", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "guildprojectleader");
    const headers = { authorization: `Bearer ${token}`, "x-server-date": "2026-05-06" };
    type GuildProjectCenter = GuildCenterRecord & {
      projects: Array<{
        id: string;
        name: string;
        progress: number;
        target: number;
        rewardReputation: number;
        rewardLabel: string;
        isClaimable: boolean;
        isClaimed: boolean;
      }>;
    };

    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers,
      body: JSON.stringify({ serverId: "s1", guildName: "项目创业会" })
    });

    const initialCenter = await requestJson<GuildProjectCenter>(baseUrl, "/guild?serverId=s1", {
      headers
    });
    assert.equal(initialCenter.status, 200, JSON.stringify(initialCenter.body));
    assert.deepEqual(initialCenter.body.data?.projects.map((project) => project.id), [
      "joint-roadshow",
      "risk-review-week",
      "market-co-creation"
    ]);
    assert.equal(initialCenter.body.data?.projects[0]?.progress, 0);

    await requestJson<GuildActionRecord>(baseUrl, "/guild/help", {
      method: "POST",
      headers,
      body: JSON.stringify({ serverId: "s1", requestType: "project-advice" })
    });
    await requestJson<GuildActionRecord>(baseUrl, "/guild/tasks/guild-daily-help/claim", {
      method: "POST",
      headers,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson<GuildActionRecord>(baseUrl, "/guild/techs/shared-office/upgrade", {
      method: "POST",
      headers,
      body: JSON.stringify({ serverId: "s1" })
    });

    const readyCenter = await requestJson<GuildProjectCenter>(baseUrl, "/guild?serverId=s1", {
      headers
    });
    const roadshow = readyCenter.body.data?.projects.find((project) => project.id === "joint-roadshow");
    assert.equal(readyCenter.status, 200, JSON.stringify(readyCenter.body));
    assert.equal(roadshow?.progress, 3);
    assert.equal(roadshow?.target, 3);
    assert.equal(roadshow?.isClaimable, true);
    assert.equal(roadshow?.rewardLabel, "声望 +60");

    const beforeProfile = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers
    });
    assert.equal(beforeProfile.status, 200);
    const claimed = await requestJson<{ guildCenter: GuildProjectCenter; result: string }>(baseUrl, "/guild/projects/joint-roadshow/claim", {
      method: "POST",
      headers,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(claimed.status, 200, JSON.stringify(claimed.body));
    assert.equal(claimed.body.data?.guildCenter.projects.find((project) => project.id === "joint-roadshow")?.isClaimed, true);

    const afterProfile = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers
    });
    assert.equal(afterProfile.status, 200);
    assert.equal(afterProfile.body.data?.reputation, (beforeProfile.body.data?.reputation ?? 0) + 60);
    assert.equal(afterProfile.body.data?.cash, beforeProfile.body.data?.cash);
    assert.equal(afterProfile.body.data?.platformCoins, beforeProfile.body.data?.platformCoins);

    const duplicate = await requestJson(baseUrl, "/guild/projects/joint-roadshow/claim", {
      method: "POST",
      headers,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error?.code, "GUILD_PROJECT_REWARD_CLAIMED");
  });
});

test("phase 22 knowledge catalog lists full v1 cards without leaking locked details", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "knowledgecatalog");

    const knowledge = await requestJson<KnowledgeEntryRecord[]>(baseUrl, "/knowledge?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(knowledge.status, 200);
    assert.equal(knowledge.body.data?.length, 36);

    const categories = new Set(knowledge.body.data?.map((entry) => entry.category));
    assert.deepEqual([...categories], [
      "公司设立与股权",
      "劳动用工",
      "合同与客户",
      "数据与隐私",
      "广告与营销",
      "知识产权",
      "税务与财务",
      "融资贷款与债务",
      "平台运营与竞争"
    ]);

    const locked = knowledge.body.data?.find((entry) => entry.id === "labor-written-contract");
    assert.equal(locked?.isUnlocked, false);
    assert.equal(locked?.unlockedAt, null);
    assert.equal(locked?.summary, "完成对应经营履历后解锁完整知识卡。");
    assert.equal(locked?.scenarioText, "");
    assert.equal(locked?.riskText, "");
    assert.equal(locked?.gameImpactText, "");
    assert.equal(locked?.actionTipText, "");
    assert.equal(locked?.sourceName, "全国人大网");
    assert.equal(locked?.reviewStatus, "published");
  });
});

test("phase 22 achievement unlock returns complete knowledge card fields for legacy ids", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "knowledgelegacy");

    const claimed = await requestJson<AchievementClaimRecord>(baseUrl, "/achievements/profile-created/claim", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(claimed.status, 200);

    const knowledge = await requestJson<KnowledgeEntryRecord[]>(baseUrl, "/knowledge?serverId=s1", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(knowledge.status, 200);

    const unlocked = knowledge.body.data?.find((entry) => entry.id === "company-registration-basics");
    assert.equal(unlocked?.isUnlocked, true);
    assert.ok(unlocked?.unlockedAt);
    assert.equal(unlocked?.category, "公司设立与股权");
    assert.equal(unlocked?.sourceName, "全国人大网");
    assert.equal(unlocked?.reviewStatus, "published");
    assert.match(unlocked?.sourceUrl ?? "", /^https:\/\/www\.npc\.gov\.cn\//);
    assert.notEqual(unlocked?.scenarioText, "");
    assert.notEqual(unlocked?.riskText, "");
    assert.notEqual(unlocked?.gameImpactText, "");
    assert.notEqual(unlocked?.actionTipText, "");
  });
});

test("phase 15 cross server groups signup leaderboards and rewards are idempotent", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "crossranker");

    const center = await requestJson<CrossServerCenterRecord>(baseUrl, "/cross-server?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(center.status, 200);
    assert.equal(center.body.data?.group.name, "开服成长池");
    assert.equal(center.body.data?.isRegistered, false);
    assert.equal(center.body.data?.boards.length, 2);
    assert.ok(center.body.data?.boards.every((board) => board.scope === "cross"));

    const registered = await requestJson<CrossServerCenterRecord>(baseUrl, "/cross-server/register", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(registered.status, 200);
    assert.equal(registered.body.data?.isRegistered, true);

    const settled = await requestJson<LeaderboardSettlementRecord>(baseUrl, "/cross-server/settle", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(settled.status, 200);
    assert.ok((settled.body.data?.deliveredRewards ?? 0) > 0);

    const duplicate = await requestJson<LeaderboardSettlementRecord>(baseUrl, "/cross-server/settle", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.data?.deliveredRewards, 0);

    const equipped = await requestJson<TitleCenterRecord>(baseUrl, "/titles/equip", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" },
      body: JSON.stringify({ serverId: "s1", titleId: "cross-unicorn" })
    });
    assert.equal(equipped.status, 200);
    assert.equal(equipped.body.data?.equippedTitle?.name, "跨服独角兽");

    const expiredEquip = await requestJson(baseUrl, "/titles/equip", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-09" },
      body: JSON.stringify({ serverId: "s1", titleId: "cross-unicorn" })
    });
    assert.equal(expiredEquip.status, 409);
    assert.equal(expiredEquip.body.error?.code, "TITLE_EXPIRED");
  });
});

test("cross-server guild season gates registration ranks guilds and settles reputation idempotently", async () => {
  await withServer(async (baseUrl) => {
    const outsider = await createPlayerSession(baseUrl, "crossguildoutsider");
    const solo = await createPlayerSession(baseUrl, "crossguildsolo");
    const leader = await createPlayerSession(baseUrl, "crossguildleader");
    const member = await createPlayerSession(baseUrl, "crossguildmember");
    const rivalLeader = await createPlayerSession(baseUrl, "crossguildrivalleader", "s2");
    const rivalMember = await createPlayerSession(baseUrl, "crossguildrivalmember", "s2");
    const today = "2026-05-07";
    const outsiderHeaders = { authorization: `Bearer ${outsider.token}`, "x-server-date": today };
    const soloHeaders = { authorization: `Bearer ${solo.token}`, "x-server-date": today };
    const leaderHeaders = { authorization: `Bearer ${leader.token}`, "x-server-date": today };
    const memberHeaders = { authorization: `Bearer ${member.token}`, "x-server-date": today };
    const rivalLeaderHeaders = { authorization: `Bearer ${rivalLeader.token}`, "x-server-date": today };
    const rivalMemberHeaders = { authorization: `Bearer ${rivalMember.token}`, "x-server-date": today };

    const noGuild = await requestJson(baseUrl, "/cross-server/guild/register", {
      method: "POST",
      headers: outsiderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(noGuild.status, 409);
    assert.equal(noGuild.body.error?.code, "GUILD_NOT_JOINED");

    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: soloHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "跨服单人会" })
    });
    const tooSmall = await requestJson(baseUrl, "/cross-server/guild/register", {
      method: "POST",
      headers: soloHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(tooSmall.status, 409);
    assert.equal(tooSmall.body.error?.code, "GUILD_SEASON_REQUIREMENT_NOT_MET");

    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "跨服先锋会" })
    });
    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "跨服先锋会" })
    });
    const leaderCenter = await requestJson<GuildCenterRecord>(baseUrl, "/guild?serverId=s1", {
      headers: leaderHeaders
    });
    const memberRequestId = leaderCenter.body.data?.joinRequests.find((request) => request.profileId === member.profile.id)?.id ?? "";
    assert.ok(memberRequestId);
    await requestJson<GuildActionRecord>(baseUrl, `/guild/applications/${encodeURIComponent(memberRequestId)}/review`, {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", decision: "approved" })
    });

    const memberRegister = await requestJson(baseUrl, "/cross-server/guild/register", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(memberRegister.status, 403);
    assert.equal(memberRegister.body.error?.code, "GUILD_PERMISSION_DENIED");

    const published = await requestJson<GuildActionRecord>(baseUrl, "/guild/help", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", requestType: "project-advice" })
    });
    const helpId = published.body.data?.guildCenter.helpRequests[0]?.id ?? "";
    await requestJson<GuildActionRecord>(baseUrl, `/guild/help/${encodeURIComponent(helpId)}/fulfill`, {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });

    const registered = await requestJson<CrossServerCenterRecord & {
      guildSeason: { isRegistered: boolean; canRegister: boolean; memberCount: number; todayActiveMemberCount: number };
      guildBoard: { rows: Array<{ guildName: string; value: number; valueLabel: string }> };
    }>(baseUrl, "/cross-server/guild/register", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(registered.status, 200, JSON.stringify(registered.body));
    assert.equal(registered.body.data?.guildSeason.isRegistered, true);
    assert.equal(registered.body.data?.guildSeason.memberCount, 2);
    assert.equal(registered.body.data?.guildSeason.todayActiveMemberCount, 2);

    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: rivalLeaderHeaders,
      body: JSON.stringify({ serverId: "s2", guildName: "跨服强会" })
    });
    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: rivalMemberHeaders,
      body: JSON.stringify({ serverId: "s2", guildName: "跨服强会" })
    });
    const rivalCenter = await requestJson<GuildCenterRecord>(baseUrl, "/guild?serverId=s2", {
      headers: rivalLeaderHeaders
    });
    const rivalRequestId = rivalCenter.body.data?.joinRequests.find((request) => request.profileId === rivalMember.profile.id)?.id ?? "";
    assert.ok(rivalRequestId);
    await requestJson<GuildActionRecord>(baseUrl, `/guild/applications/${encodeURIComponent(rivalRequestId)}/review`, {
      method: "POST",
      headers: rivalLeaderHeaders,
      body: JSON.stringify({ serverId: "s2", decision: "approved" })
    });
    const rivalPublished = await requestJson<GuildActionRecord>(baseUrl, "/guild/help", {
      method: "POST",
      headers: rivalLeaderHeaders,
      body: JSON.stringify({ serverId: "s2", requestType: "project-advice" })
    });
    const rivalHelpId = rivalPublished.body.data?.guildCenter.helpRequests[0]?.id ?? "";
    await requestJson<GuildActionRecord>(baseUrl, `/guild/help/${encodeURIComponent(rivalHelpId)}/fulfill`, {
      method: "POST",
      headers: rivalMemberHeaders,
      body: JSON.stringify({ serverId: "s2" })
    });
    await requestJson<GuildActionRecord>(baseUrl, "/guild/tasks/guild-daily-help/claim", {
      method: "POST",
      headers: rivalMemberHeaders,
      body: JSON.stringify({ serverId: "s2" })
    });
    await requestJson<CrossServerCenterRecord>(baseUrl, "/cross-server/guild/register", {
      method: "POST",
      headers: rivalLeaderHeaders,
      body: JSON.stringify({ serverId: "s2" })
    });

    const center = await requestJson<CrossServerCenterRecord & {
      guildSeason: { isRegistered: boolean; rewardLabel: string };
      guildBoard: { rows: Array<{ guildName: string; value: number; valueLabel: string }> };
    }>(baseUrl, "/cross-server?serverId=s1", {
      headers: leaderHeaders
    });
    assert.equal(center.status, 200, JSON.stringify(center.body));
    assert.equal(center.body.data?.guildSeason.isRegistered, true);
    assert.equal(center.body.data?.guildSeason.rewardLabel, "前 3 名会长获得声望 180/120/80");
    assert.deepEqual(center.body.data?.guildBoard.rows.map((row) => row.guildName), ["跨服强会", "跨服先锋会"]);
    assert.ok(center.body.data?.guildBoard.rows.every((row) => row.valueLabel.startsWith("跨服贡献 ")));

    const beforeProfile = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s2", {
      headers: rivalLeaderHeaders
    });
    const settled = await requestJson<LeaderboardSettlementRecord & { rewards: Array<{ guildName: string; reputationReward: number }> }>(baseUrl, "/cross-server/guild/settle", {
      method: "POST",
      headers: rivalLeaderHeaders,
      body: JSON.stringify({ serverId: "s2" })
    });
    assert.equal(settled.status, 200, JSON.stringify(settled.body));
    assert.equal(settled.body.data?.deliveredRewards, 2);
    assert.deepEqual(settled.body.data?.rewards.map((reward) => reward.reputationReward), [180, 120]);

    const afterProfile = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s2", {
      headers: rivalLeaderHeaders
    });
    assert.equal(afterProfile.body.data?.reputation, (beforeProfile.body.data?.reputation ?? 0) + 180);
    assert.equal(afterProfile.body.data?.cash, beforeProfile.body.data?.cash);
    assert.equal(afterProfile.body.data?.platformCoins, beforeProfile.body.data?.platformCoins);

    const duplicate = await requestJson<LeaderboardSettlementRecord>(baseUrl, "/cross-server/guild/settle", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.status, 200, JSON.stringify(duplicate.body));
    assert.equal(duplicate.body.data?.deliveredRewards, 0);
  });
});

test("admin guild operations lists details and settles guild rewards idempotently", async () => {
  await withServer(async (baseUrl) => {
    const leader = await createPlayerSession(baseUrl, "adminguildleader");
    const member = await createPlayerSession(baseUrl, "adminguildmember");
    const leaderHeaders = { authorization: `Bearer ${leader.token}` };
    const memberHeaders = { authorization: `Bearer ${member.token}` };

    const blocked = await requestJson(baseUrl, "/admin/guilds");
    assert.equal(blocked.status, 401);
    assert.equal(blocked.body.error?.code, "UNAUTHORIZED");

    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "后台运营会" })
    });
    await requestJson<GuildActionRecord>(baseUrl, "/guild/join", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "后台运营会" })
    });
    const guildCenter = await requestJson<GuildCenterRecord>(baseUrl, "/guild?serverId=s1", {
      headers: leaderHeaders
    });
    const memberRequestId = guildCenter.body.data?.joinRequests.find((request) => request.profileId === member.profile.id)?.id ?? "";
    assert.ok(memberRequestId);
    await requestJson<GuildActionRecord>(baseUrl, `/guild/applications/${encodeURIComponent(memberRequestId)}/review`, {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", decision: "approved" })
    });

    const help = await requestJson<GuildActionRecord>(baseUrl, "/guild/help", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", requestType: "project-advice" })
    });
    const helpId = help.body.data?.guildCenter.helpRequests[0]?.id ?? "";
    await requestJson<GuildActionRecord>(baseUrl, `/guild/help/${encodeURIComponent(helpId)}/fulfill`, {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson<GuildActionRecord>(baseUrl, "/guild/tasks/guild-daily-help/claim", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson<CrossServerCenterRecord>(baseUrl, "/cross-server/guild/register", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });

    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    const adminHeaders = { authorization: `Bearer ${adminLogin.body.data?.token ?? ""}` };

    const guilds = await requestJson<{
      rows: Array<{
        id: string;
        name: string;
        serverId: string;
        memberCount: number;
        todayActiveMemberCount: number;
        crossServerRegistered: boolean;
      }>;
    }>(baseUrl, "/admin/guilds?keyword=后台&serverId=s1&crossRegistered=registered&activeStatus=active", {
      headers: adminHeaders
    });
    assert.equal(guilds.status, 200, JSON.stringify(guilds.body));
    assert.equal(guilds.body.data?.rows.length, 1);
    const guildId = guilds.body.data?.rows[0]?.id ?? "";
    assert.ok(guildId);
    assert.equal(guilds.body.data?.rows[0]?.name, "后台运营会");
    assert.equal(guilds.body.data?.rows[0]?.memberCount, 2);
    assert.equal(guilds.body.data?.rows[0]?.todayActiveMemberCount, 2);
    assert.equal(guilds.body.data?.rows[0]?.crossServerRegistered, true);

    const detail = await requestJson<{
      guild: { id: string; name: string; contributionScore: number };
      members: Array<{ profileId: string; role: string; contributionScore: number }>;
      techs: Array<{ id: string; level: number }>;
      helpRequests: Array<{ id: string; status: string; requestType: string }>;
      projects: Array<{ id: string; progress: number; target: number }>;
      crossServer: { isRegistered: boolean; groupName: string | null };
    }>(baseUrl, `/admin/guilds/${encodeURIComponent(guildId)}`, {
      headers: adminHeaders
    });
    assert.equal(detail.status, 200, JSON.stringify(detail.body));
    assert.equal(detail.body.data?.guild.name, "后台运营会");
    assert.deepEqual(detail.body.data?.members.map((item) => item.role).sort(), ["leader", "member"]);
    assert.ok(detail.body.data?.techs.length);
    assert.ok(detail.body.data?.helpRequests.some((item) => item.status === "fulfilled" && item.requestType === "project-advice"));
    assert.ok(detail.body.data?.projects.some((item) => item.progress > 0 && item.target > 0));
    assert.equal(detail.body.data?.crossServer.isRegistered, true);
    assert.equal(detail.body.data?.crossServer.groupName, "开服成长池");

    const beforeLeader = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers: leaderHeaders
    });
    const guildSettlement = await requestJson<{ deliveredRewards: number; auditLogId: string }>(
      baseUrl,
      `/admin/guilds/${encodeURIComponent(guildId)}/leaderboard/settle`,
      {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ reason: "阶段23第七批商会榜结算" })
      }
    );
    assert.equal(guildSettlement.status, 200, JSON.stringify(guildSettlement.body));
    assert.equal(guildSettlement.body.data?.deliveredRewards, 2);
    assert.ok(guildSettlement.body.data?.auditLogId);
    const guildSettlementDuplicate = await requestJson<{ deliveredRewards: number }>(
      baseUrl,
      `/admin/guilds/${encodeURIComponent(guildId)}/leaderboard/settle`,
      {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ reason: "阶段23第七批商会榜结算重试" })
      }
    );
    assert.equal(guildSettlementDuplicate.status, 200, JSON.stringify(guildSettlementDuplicate.body));
    assert.equal(guildSettlementDuplicate.body.data?.deliveredRewards, 0);

    const crossSettlement = await requestJson<{ deliveredRewards: number; auditLogId: string }>(
      baseUrl,
      "/admin/cross-server/guild/settle",
      {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ serverId: "s1", reason: "阶段23第七批跨服商会结算" })
      }
    );
    assert.equal(crossSettlement.status, 200, JSON.stringify(crossSettlement.body));
    assert.equal(crossSettlement.body.data?.deliveredRewards, 1);
    assert.ok(crossSettlement.body.data?.auditLogId);
    const crossSettlementDuplicate = await requestJson<{ deliveredRewards: number }>(
      baseUrl,
      "/admin/cross-server/guild/settle",
      {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ serverId: "s1", reason: "阶段23第七批跨服商会结算重试" })
      }
    );
    assert.equal(crossSettlementDuplicate.status, 200, JSON.stringify(crossSettlementDuplicate.body));
    assert.equal(crossSettlementDuplicate.body.data?.deliveredRewards, 0);

    const afterLeader = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers: leaderHeaders
    });
    assert.equal(afterLeader.body.data?.cash, beforeLeader.body.data?.cash);
    assert.equal(afterLeader.body.data?.platformCoins, beforeLeader.body.data?.platformCoins);

    const logs = await requestJson<{ rows: Array<{ action: string }> }>(baseUrl, "/admin/audit-logs", {
      headers: adminHeaders
    });
    assert.equal(logs.status, 200);
    assert.ok(logs.body.data?.rows.some((log) => log.action === "admin_guild_leaderboard_settle"));
    assert.ok(logs.body.data?.rows.some((log) => log.action === "admin_cross_guild_season_settle"));
  });
});

test("phase 24 activity leaderboard opens recaps and settles idempotently", async () => {
  await withServer(async (baseUrl) => {
    const first = await createPlayerSession(baseUrl, "activityleader01");
    const second = await createPlayerSession(baseUrl, "activityleader02");
    const firstHeaders = { authorization: `Bearer ${first.token}` };
    const secondHeaders = { authorization: `Bearer ${second.token}` };

    const upcoming = await requestJson<LeaderboardCenterRecord>(baseUrl, "/leaderboards?serverId=s1", {
      headers: { ...firstHeaders, "x-server-date": "2026-04-30" }
    });
    assert.equal(upcoming.status, 200, JSON.stringify(upcoming.body));
    assert.equal(upcoming.body.data?.activityBoards.length, 0);

    await requestJson(baseUrl, "/activities/ai-agent-growth/join", {
      method: "POST",
      headers: { ...firstHeaders, "x-server-date": "2026-05-05" },
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson(baseUrl, "/activities/ai-agent-growth/join", {
      method: "POST",
      headers: { ...secondHeaders, "x-server-date": "2026-05-05" },
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson(baseUrl, "/activities/ai-agent-growth/progress", {
      method: "POST",
      headers: { ...firstHeaders, "x-server-date": "2026-05-05" },
      body: JSON.stringify({ serverId: "s1", scoreDelta: 80 })
    });
    await requestJson(baseUrl, "/activities/ai-agent-growth/progress", {
      method: "POST",
      headers: { ...secondHeaders, "x-server-date": "2026-05-05" },
      body: JSON.stringify({ serverId: "s1", scoreDelta: 140 })
    });

    const active = await requestJson<LeaderboardCenterRecord>(baseUrl, "/leaderboards?serverId=s1", {
      headers: { ...firstHeaders, "x-server-date": "2026-05-05" }
    });
    assert.equal(active.status, 200, JSON.stringify(active.body));
    assert.equal(active.body.data?.activityBoards.length, 1);
    assert.equal(active.body.data?.activityBoards[0]?.rows[0]?.profileId, second.profile.id);
    assert.equal(active.body.data?.activityBoards[0]?.rows[0]?.value, 140);
    assert.equal(active.body.data?.activityBoards[0]?.rows[1]?.profileId, first.profile.id);

    const ended = await requestJson<{
      activityBoards: LeaderboardCenterRecord["activityBoards"];
      activityRecaps: Array<{
        activityId: string;
        isSettled: boolean;
        personalRank: number | null;
        personalScore: number;
        rows: LeaderboardCenterRecord["activityBoards"][number]["rows"];
      }>;
    }>(baseUrl, "/season?serverId=s1", {
      headers: { ...firstHeaders, "x-server-date": "2026-05-21" }
    });
    assert.equal(ended.status, 200, JSON.stringify(ended.body));
    assert.equal(ended.body.data?.activityBoards.length, 0);
    assert.equal(ended.body.data?.activityRecaps[0]?.activityId, "ai-agent-growth");
    assert.equal(ended.body.data?.activityRecaps[0]?.personalRank, 2);
    assert.equal(ended.body.data?.activityRecaps[0]?.personalScore, 80);

    const hiddenAfterEnd = await requestJson<LeaderboardCenterRecord>(baseUrl, "/leaderboards?serverId=s1", {
      headers: { ...firstHeaders, "x-server-date": "2026-05-21" }
    });
    assert.equal(hiddenAfterEnd.status, 200, JSON.stringify(hiddenAfterEnd.body));
    assert.equal(hiddenAfterEnd.body.data?.activityBoards.length, 0);

    const blocked = await requestJson(baseUrl, "/admin/activities/ai-agent-growth/leaderboard/settle", {
      method: "POST",
      headers: { "x-server-date": "2026-05-21" },
      body: JSON.stringify({ reason: "阶段24活动榜结算" })
    });
    assert.equal(blocked.status, 401);
    assert.equal(blocked.body.error?.code, "UNAUTHORIZED");

    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    const adminHeaders = { authorization: `Bearer ${adminLogin.body.data?.token ?? ""}` };

    const adminActivities = await requestJson<{ rows: Array<{ id: string; participantCount: number; isSettled: boolean }> }>(baseUrl, "/admin/activities", {
      headers: { ...adminHeaders, "x-server-date": "2026-05-21" }
    });
    assert.equal(adminActivities.status, 200, JSON.stringify(adminActivities.body));
    assert.equal(adminActivities.body.data?.rows.find((activity) => activity.id === "ai-agent-growth")?.participantCount, 2);

    const beforeFirst = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers: firstHeaders
    });
    const beforeSecond = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers: secondHeaders
    });

    const settled = await requestJson<{ deliveredRewards: number; auditLogId: string }>(
      baseUrl,
      "/admin/activities/ai-agent-growth/leaderboard/settle",
      {
        method: "POST",
        headers: { ...adminHeaders, "x-server-date": "2026-05-21" },
        body: JSON.stringify({ reason: "阶段24活动榜结算" })
      }
    );
    assert.equal(settled.status, 200, JSON.stringify(settled.body));
    assert.equal(settled.body.data?.deliveredRewards, 2);
    assert.ok(settled.body.data?.auditLogId);

    const duplicate = await requestJson<{ deliveredRewards: number }>(
      baseUrl,
      "/admin/activities/ai-agent-growth/leaderboard/settle",
      {
        method: "POST",
        headers: { ...adminHeaders, "x-server-date": "2026-05-21" },
        body: JSON.stringify({ reason: "阶段24活动榜结算重试" })
      }
    );
    assert.equal(duplicate.status, 200, JSON.stringify(duplicate.body));
    assert.equal(duplicate.body.data?.deliveredRewards, 0);

    const afterFirst = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers: firstHeaders
    });
    const afterSecond = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers: secondHeaders
    });
    assert.equal(afterFirst.body.data?.cash, beforeFirst.body.data?.cash);
    assert.equal(afterFirst.body.data?.platformCoins, beforeFirst.body.data?.platformCoins);
    assert.equal(afterSecond.body.data?.cash, beforeSecond.body.data?.cash);
    assert.equal(afterSecond.body.data?.platformCoins, beforeSecond.body.data?.platformCoins);
    assert.ok((afterSecond.body.data?.reputation ?? 0) > (beforeSecond.body.data?.reputation ?? 0));

    const recapAfterSettle = await requestJson<{ activityRecaps: Array<{ isSettled: boolean }> }>(baseUrl, "/season?serverId=s1", {
      headers: { ...firstHeaders, "x-server-date": "2026-05-21" }
    });
    assert.equal(recapAfterSettle.body.data?.activityRecaps[0]?.isSettled, true);

    const logs = await requestJson<{ rows: Array<{ action: string }> }>(baseUrl, "/admin/audit-logs", {
      headers: adminHeaders
    });
    assert.equal(logs.status, 200);
    assert.ok(logs.body.data?.rows.some((log) => log.action === "admin_activity_leaderboard_settle"));
  });
});

test("phase 24 admin audit filters settlement retries and exposes details", async () => {
  await withServer(async (baseUrl) => {
    const first = await createPlayerSession(baseUrl, "auditactivity01");
    const second = await createPlayerSession(baseUrl, "auditactivity02");
    const firstHeaders = { authorization: `Bearer ${first.token}` };
    const secondHeaders = { authorization: `Bearer ${second.token}` };

    await requestJson(baseUrl, "/activities/ai-agent-growth/join", {
      method: "POST",
      headers: { ...firstHeaders, "x-server-date": "2026-05-05" },
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson(baseUrl, "/activities/ai-agent-growth/join", {
      method: "POST",
      headers: { ...secondHeaders, "x-server-date": "2026-05-05" },
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson(baseUrl, "/activities/ai-agent-growth/progress", {
      method: "POST",
      headers: { ...firstHeaders, "x-server-date": "2026-05-05" },
      body: JSON.stringify({ serverId: "s1", scoreDelta: 90 })
    });
    await requestJson(baseUrl, "/activities/ai-agent-growth/progress", {
      method: "POST",
      headers: { ...secondHeaders, "x-server-date": "2026-05-05" },
      body: JSON.stringify({ serverId: "s1", scoreDelta: 150 })
    });

    const blocked = await requestJson(baseUrl, "/admin/audit-logs?action=admin_activity_leaderboard_settle");
    assert.equal(blocked.status, 401);
    assert.equal(blocked.body.error?.code, "UNAUTHORIZED");

    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    const adminHeaders = { authorization: `Bearer ${adminLogin.body.data?.token ?? ""}` };

    const firstSettlement = await requestJson<{ deliveredRewards: number }>(
      baseUrl,
      "/admin/activities/ai-agent-growth/leaderboard/settle",
      {
        method: "POST",
        headers: { ...adminHeaders, "x-server-date": "2026-05-21" },
        body: JSON.stringify({ reason: "阶段24审计首结算" })
      }
    );
    assert.equal(firstSettlement.status, 200, JSON.stringify(firstSettlement.body));
    assert.equal(firstSettlement.body.data?.deliveredRewards, 2);

    const retrySettlement = await requestJson<{ deliveredRewards: number }>(
      baseUrl,
      "/admin/activities/ai-agent-growth/leaderboard/settle",
      {
        method: "POST",
        headers: { ...adminHeaders, "x-server-date": "2026-05-21" },
        body: JSON.stringify({ reason: "阶段24审计重试" })
      }
    );
    assert.equal(retrySettlement.status, 200, JSON.stringify(retrySettlement.body));
    assert.equal(retrySettlement.body.data?.deliveredRewards, 0);

    const logs = await requestJson<{
      rows: Array<{
        action: string;
        targetType: string;
        targetId: string | null;
        detailJson: { activityId?: string; deliveredRewards?: number; isRetry?: boolean } | null;
        summary: string;
      }>;
      total: number;
      filters: { actions: string[]; targetTypes: string[]; admins: string[] };
    }>(
      baseUrl,
      "/admin/audit-logs?action=admin_activity_leaderboard_settle&targetType=activity_leaderboard&targetId=ai-agent-growth&admin=admin&from=2026-05-01&to=2026-05-30",
      { headers: adminHeaders }
    );
    assert.equal(logs.status, 200, JSON.stringify(logs.body));
    assert.equal(logs.body.data?.total, 2);
    assert.deepEqual(logs.body.data?.rows.map((log) => log.action), [
      "admin_activity_leaderboard_settle",
      "admin_activity_leaderboard_settle"
    ]);
    assert.ok(logs.body.data?.filters.actions.includes("admin_activity_leaderboard_settle"));
    assert.ok(logs.body.data?.filters.targetTypes.includes("activity_leaderboard"));
    assert.ok(logs.body.data?.filters.admins.includes("admin"));
    assert.equal(logs.body.data?.rows[0]?.targetId, "ai-agent-growth");
    assert.equal(logs.body.data?.rows[0]?.detailJson?.isRetry, true);
    assert.equal(logs.body.data?.rows[0]?.detailJson?.deliveredRewards, 0);
    assert.equal(logs.body.data?.rows[1]?.detailJson?.isRetry, false);
    assert.equal(logs.body.data?.rows[1]?.detailJson?.deliveredRewards, 2);
    assert.match(logs.body.data?.rows[0]?.summary ?? "", /重试/);
  });
});

test("phase 24 guild season history archives guild and cross-server results", async () => {
  await withServer(async (baseUrl) => {
    const outsider = await createPlayerSession(baseUrl, "guildhistoryoutsider");
    const leader = await createPlayerSession(baseUrl, "guildhistoryleader");
    const member = await createPlayerSession(baseUrl, "guildhistorymember");
    const rivalLeader = await createPlayerSession(baseUrl, "guildhistoryrivalleader", "s2");
    const rivalMember = await createPlayerSession(baseUrl, "guildhistoryrivalmember", "s2");
    const leaderHeaders = { authorization: `Bearer ${leader.token}`, "x-server-date": "2026-05-12" };
    const memberHeaders = { authorization: `Bearer ${member.token}`, "x-server-date": "2026-05-12" };
    const rivalLeaderHeaders = { authorization: `Bearer ${rivalLeader.token}`, "x-server-date": "2026-05-12" };
    const rivalMemberHeaders = { authorization: `Bearer ${rivalMember.token}`, "x-server-date": "2026-05-12" };

    const blocked = await requestJson(baseUrl, "/guild/history?serverId=s1", {
      headers: { authorization: `Bearer ${outsider.token}` }
    });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.error?.code, "GUILD_NOT_JOINED");

    await requestJson(baseUrl, "/guild/join", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "历史商会" })
    });
    await requestJson(baseUrl, "/guild/join", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1", guildName: "历史商会" })
    });
    const leaderCenter = await requestJson<GuildCenterRecord>(baseUrl, "/guild?serverId=s1", {
      headers: leaderHeaders
    });
    const memberRequestId = leaderCenter.body.data?.joinRequests.find((request) => request.profileId === member.profile.id)?.id ?? "";
    await requestJson(baseUrl, `/guild/applications/${encodeURIComponent(memberRequestId)}/review`, {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", decision: "approved" })
    });
    const help = await requestJson<{ guildCenter: GuildCenterRecord }>(baseUrl, "/guild/help", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1", requestType: "project-advice" })
    });
    const helpId = help.body.data?.guildCenter.helpRequests[0]?.id ?? "";
    await requestJson(baseUrl, `/guild/help/${encodeURIComponent(helpId)}/fulfill`, {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });

    await requestJson(baseUrl, "/guild/join", {
      method: "POST",
      headers: rivalLeaderHeaders,
      body: JSON.stringify({ serverId: "s2", guildName: "历史对手会" })
    });
    await requestJson(baseUrl, "/guild/join", {
      method: "POST",
      headers: rivalMemberHeaders,
      body: JSON.stringify({ serverId: "s2", guildName: "历史对手会" })
    });
    const rivalCenter = await requestJson<GuildCenterRecord>(baseUrl, "/guild?serverId=s2", {
      headers: rivalLeaderHeaders
    });
    const rivalRequestId = rivalCenter.body.data?.joinRequests.find((request) => request.profileId === rivalMember.profile.id)?.id ?? "";
    await requestJson(baseUrl, `/guild/applications/${encodeURIComponent(rivalRequestId)}/review`, {
      method: "POST",
      headers: rivalLeaderHeaders,
      body: JSON.stringify({ serverId: "s2", decision: "approved" })
    });
    const rivalHelp = await requestJson<{ guildCenter: GuildCenterRecord }>(baseUrl, "/guild/help", {
      method: "POST",
      headers: rivalLeaderHeaders,
      body: JSON.stringify({ serverId: "s2", requestType: "risk-review" })
    });
    const rivalHelpId = rivalHelp.body.data?.guildCenter.helpRequests[0]?.id ?? "";
    await requestJson(baseUrl, `/guild/help/${encodeURIComponent(rivalHelpId)}/fulfill`, {
      method: "POST",
      headers: rivalMemberHeaders,
      body: JSON.stringify({ serverId: "s2" })
    });
    await requestJson(baseUrl, "/guild/tasks/guild-daily-help/claim", {
      method: "POST",
      headers: rivalMemberHeaders,
      body: JSON.stringify({ serverId: "s2" })
    });

    const beforeLeader = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers: leaderHeaders
    });
    const settled = await requestJson<{ deliveredRewards: number }>(baseUrl, "/guild/leaderboard/settle", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(settled.status, 200, JSON.stringify(settled.body));
    assert.equal(settled.body.data?.deliveredRewards, 2);
    const duplicate = await requestJson<{ deliveredRewards: number }>(baseUrl, "/guild/leaderboard/settle", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(duplicate.body.data?.deliveredRewards, 0);

    const guildHistory = await requestJson<{
      guild: { id: string; name: string };
      settlements: Array<{
        snapshotDate: string;
        deliveredRewards: number;
        topMembers: Array<{ profileId: string; rank: number; reputationReward: number }>;
      }>;
      currentTopMembers: Array<{ profileId: string; rank: number }>;
    }>(baseUrl, "/guild/history?serverId=s1", {
      headers: leaderHeaders
    });
    assert.equal(guildHistory.status, 200, JSON.stringify(guildHistory.body));
    assert.equal(guildHistory.body.data?.guild.name, "历史商会");
    assert.equal(guildHistory.body.data?.settlements.length, 1);
    assert.equal(guildHistory.body.data?.settlements[0]?.snapshotDate, "2026-05-12");
    assert.equal(guildHistory.body.data?.settlements[0]?.deliveredRewards, 2);
    assert.equal(guildHistory.body.data?.settlements[0]?.topMembers.length, 2);
    assert.equal(guildHistory.body.data?.currentTopMembers.length, 2);

    await requestJson(baseUrl, "/cross-server/guild/register", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson(baseUrl, "/cross-server/guild/register", {
      method: "POST",
      headers: rivalLeaderHeaders,
      body: JSON.stringify({ serverId: "s2" })
    });
    const crossSettled = await requestJson<{ deliveredRewards: number }>(baseUrl, "/cross-server/guild/settle", {
      method: "POST",
      headers: leaderHeaders,
      body: JSON.stringify({ serverId: "s1" })
    });
    assert.equal(crossSettled.status, 200, JSON.stringify(crossSettled.body));
    assert.equal(crossSettled.body.data?.deliveredRewards, 2);

    const crossHistory = await requestJson<{
      guild: { id: string; name: string };
      isRegistered: boolean;
      settlements: Array<{
        snapshotDate: string;
        deliveredRewards: number;
        finalRank: number | null;
        topGuilds: Array<{ guildId: string; rank: number; reputationReward: number }>;
      }>;
    }>(baseUrl, "/cross-server/guild/history?serverId=s1", {
      headers: leaderHeaders
    });
    assert.equal(crossHistory.status, 200, JSON.stringify(crossHistory.body));
    assert.equal(crossHistory.body.data?.guild.name, "历史商会");
    assert.equal(crossHistory.body.data?.isRegistered, true);
    assert.equal(crossHistory.body.data?.settlements.length, 1);
    assert.equal(crossHistory.body.data?.settlements[0]?.deliveredRewards, 2);
    assert.ok((crossHistory.body.data?.settlements[0]?.topGuilds.length ?? 0) >= 2);

    const afterLeader = await requestJson<PlayerProfileRecord>(baseUrl, "/players?serverId=s1", {
      headers: leaderHeaders
    });
    assert.equal(afterLeader.body.data?.cash, beforeLeader.body.data?.cash);
    assert.equal(afterLeader.body.data?.platformCoins, beforeLeader.body.data?.platformCoins);

    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    const adminHeaders = { authorization: `Bearer ${adminLogin.body.data?.token ?? ""}` };
    const adminGuilds = await requestJson<{ rows: Array<{ id: string; name: string }> }>(baseUrl, "/admin/guilds?keyword=历史商会", {
      headers: adminHeaders
    });
    const guildId = adminGuilds.body.data?.rows[0]?.id ?? "";
    const adminDetail = await requestJson<{
      history: {
        guildSettlements: Array<{ snapshotDate: string; deliveredRewards: number }>;
        crossServerSettlements: Array<{ snapshotDate: string; deliveredRewards: number }>;
      };
    }>(baseUrl, `/admin/guilds/${encodeURIComponent(guildId)}`, {
      headers: adminHeaders
    });
    assert.equal(adminDetail.status, 200, JSON.stringify(adminDetail.body));
    assert.equal(adminDetail.body.data?.history.guildSettlements[0]?.deliveredRewards, 2);
    assert.equal(adminDetail.body.data?.history.crossServerSettlements[0]?.deliveredRewards, 2);
  });
});

test("phase 24 operation configs expose season and activity operations read-only", async () => {
  await withServer(async (baseUrl) => {
    const unauthenticated = await requestJson(baseUrl, "/admin/config-center", {
      headers: { "x-server-date": "2026-05-21" }
    });
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.body.error?.code, "UNAUTHORIZED");

    const playerA = await createPlayerSession(baseUrl, "operationconfiga");
    const playerB = await createPlayerSession(baseUrl, "operationconfigb");
    await requestJson(baseUrl, "/activities/ai-agent-growth/join", {
      method: "POST",
      headers: { authorization: `Bearer ${playerA.token}`, "x-server-date": "2026-05-10" },
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson(baseUrl, "/activities/ai-agent-growth/join", {
      method: "POST",
      headers: { authorization: `Bearer ${playerB.token}`, "x-server-date": "2026-05-10" },
      body: JSON.stringify({ serverId: "s1" })
    });
    await requestJson(baseUrl, "/activities/ai-agent-growth/progress", {
      method: "POST",
      headers: { authorization: `Bearer ${playerA.token}`, "x-server-date": "2026-05-10" },
      body: JSON.stringify({ serverId: "s1", scoreDelta: 260 })
    });
    await requestJson(baseUrl, "/activities/ai-agent-growth/progress", {
      method: "POST",
      headers: { authorization: `Bearer ${playerB.token}`, "x-server-date": "2026-05-10" },
      body: JSON.stringify({ serverId: "s1", scoreDelta: 120 })
    });

    const adminLogin = await requestJson<{ token: string }>(baseUrl, "/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    assert.equal(adminLogin.status, 200);
    const settled = await requestJson<{ deliveredRewards: number }>(
      baseUrl,
      "/admin/activities/ai-agent-growth/leaderboard/settle",
      {
        method: "POST",
        headers: { authorization: `Bearer ${adminLogin.body.data?.token}`, "x-server-date": "2026-05-21" },
        body: JSON.stringify({ reason: "运营配置总览验证" })
      }
    );
    assert.equal(settled.status, 200);
    assert.equal(settled.body.data?.deliveredRewards, 2);

    const configs = await requestJson<{
      seasons: Array<{ id: string; status: string; passPricePlatformCoins: number; activityCount: number; passPurchaseCount: number }>;
      activities: Array<{
        id: string;
        status: string;
        leaderboardKey: string;
        participantCount: number;
        totalScore: number;
        isSettled: boolean;
        deliveredRewards: number;
        rewardLabel: string;
        rewardBoundary: string;
      }>;
      activityShopItems: Array<{ id: string; seasonId: string; costPoints: number; purchaseLimit: number; purchaseCount: number; rewardLabel: string; isActive: boolean }>;
      seasonPass: Array<{ seasonId: string; pricePlatformCoins: number; purchaseCount: number; rewardLabel: string }>;
      leaderboardSettlements: Array<{ boardKey: string; snapshotDate: string; deliveredRewards: number; rewardPlatformCoinsTotal: number; rewardBoundary: string }>;
    }>(baseUrl, "/admin/config-center", {
      headers: { authorization: `Bearer ${adminLogin.body.data?.token}`, "x-server-date": "2026-05-21" }
    });
    assert.equal(configs.status, 200);
    assert.ok(configs.body.data?.seasons.some((season) =>
      season.id === "season-ai-agent-2026" &&
      season.status === "active" &&
      season.passPricePlatformCoins === 880 &&
      season.activityCount === 1
    ));
    const activity = configs.body.data?.activities.find((item) => item.id === "ai-agent-growth");
    assert.equal(activity?.status, "ended");
    assert.equal(activity?.leaderboardKey, "activity-ai-agent-growth");
    assert.equal(activity?.participantCount, 2);
    assert.equal(activity?.totalScore, 380);
    assert.equal(activity?.isSettled, true);
    assert.equal(activity?.deliveredRewards, 2);
    assert.equal(activity?.rewardBoundary, "leaderboard_no_cash_no_platform_coins");
    assert.ok(activity?.rewardLabel.includes("声望"));
    assert.ok(configs.body.data?.activityShopItems.some((item) =>
      item.id === "activity-risk-insurance" &&
      item.seasonId === "season-ai-agent-2026" &&
      item.costPoints === 180 &&
      item.purchaseLimit === 1
    ));
    assert.ok(configs.body.data?.seasonPass.some((pass) =>
      pass.seasonId === "season-ai-agent-2026" &&
      pass.pricePlatformCoins === 880 &&
      pass.rewardLabel === "解锁赛季高级奖励轨"
    ));
    assert.ok(configs.body.data?.leaderboardSettlements.some((settlement) =>
      settlement.boardKey === "activity-ai-agent-growth" &&
      settlement.snapshotDate === "2026-05-20" &&
      settlement.deliveredRewards === 2 &&
      settlement.rewardPlatformCoinsTotal === 0 &&
      settlement.rewardBoundary === "leaderboard_no_cash_no_platform_coins"
    ));
  });
});
