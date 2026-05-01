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
import type {
  AccountRecord,
  AdminUserRecord,
  AvatarRecord,
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
  CrossServerCenterRecord,
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

const createTestRepository = (): GameRepository => {
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
      description: "完成一次商会互助。",
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
      unlockKind: "knowledge" as const
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
      unlockKind: "compliance" as const
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
    }
  ];
  const taskProgress = new Map<string, { progress: number; dailyDate?: string; claimedAt?: string }>();
  const financeReports = new Map<string, CompanyFinanceSettlementRecord>();
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
      progress: Math.min(currentProgress, config.target),
      isClaimed,
      isClaimable: currentProgress >= config.target && !isClaimed
    };
  };

  const formatEventImpact = (cash: number, reputation: number, customerSatisfaction: number, riskDelta: number): string =>
    [
      cash === 0 ? undefined : `现金${cash > 0 ? "+" : ""}${cash}`,
      reputation === 0 ? undefined : `声望${reputation > 0 ? "+" : ""}${reputation}`,
      customerSatisfaction === 0 ? undefined : `满意度${customerSatisfaction > 0 ? "+" : ""}${customerSatisfaction}`,
      riskDelta === 0 ? undefined : `风险${riskDelta > 0 ? "+" : ""}${riskDelta}`
    ].filter(Boolean).join(" / ") || "经营影响稳定";

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
    }
  ];
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
  const knowledgeEntries = [
    {
      id: "company-registration-basics",
      category: "创业基础",
      title: "公司档案与主体登记",
      summary: "公司档案对应真实创业里的主体信息。",
      sourceUrl: "https://www.samr.gov.cn/",
      collectedAt: "2026-05-01",
      contentVersion: "2026.05",
      disclaimer: "仅作游戏科普，不构成法律建议"
    },
    {
      id: "cashflow-safety-line",
      category: "财务合规",
      title: "现金流安全线",
      summary: "持续正向现金流反映早期公司的生存质量。",
      sourceUrl: "https://www.sba.gov/business-guide/manage-your-business",
      collectedAt: "2026-05-01",
      contentVersion: "2026.05",
      disclaimer: "仅作游戏科普，不构成法律建议"
    },
    {
      id: "valuation-method-note",
      category: "财务合规",
      title: "估值只是谈判结果",
      summary: "估值受到现金流、增长、债务和市场预期影响。",
      sourceUrl: "https://www.sec.gov/education",
      collectedAt: "2026-05-01",
      contentVersion: "2026.05",
      disclaimer: "仅作游戏科普，不构成法律建议"
    },
    {
      id: "ai-agent-season-playbook",
      category: "赛季运营",
      title: "AI Agent 风口活动复盘",
      summary: "赛季活动用于模拟新技术窗口期的产品增长和运营节奏管理。",
      sourceUrl: "https://www.sba.gov/business-guide/manage-your-business",
      collectedAt: "2026-05-01",
      contentVersion: "2026.05",
      disclaimer: "仅作游戏科普，不构成法律建议"
    }
  ];
  const playerTitles = new Map<string, { profileId: string; titleId: string; source: string; obtainedAt: string; expiresAt: string | null }>();
  const titleEquipment = new Map<string, string>();
  const achievements = new Map<string, { profileId: string; achievementId: string; progress: number; completedAt: string | null; claimedAt: string | null }>();
  const knowledgeUnlocks = new Map<string, { profileId: string; knowledgeId: string; source: string; unlockedAt: string }>();
  const leaderboardRewards = new Set<string>();
  const crossServerSignups = new Set<string>();
  const guilds = new Map<string, { id: string; serverId: string; name: string; level: number; contributionScore: number }>();
  const guildMembers = new Map<string, { guildId: string; profileId: string; role: string; contributionScore: number }>();
  const guildHelpRequests = new Map<string, { id: string; guildId: string; profileId: string; requestType: string; status: string; createdAt: string }>();
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
  const toSeasonCenter = (profile: PlayerProfileRecord, today: string) => {
    const progress = seasonProgresses.get(seasonKey(profile.id)) ?? { points: 0 };
    const wallet = ensureWallet(profile);
    const boards = activityConfigs
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
            const rowProfile = [...profiles.values()].find((item) => item.id === state.profileId)!;
            return { rank: index + 1, profileId: state.profileId, founderName: rowProfile.founderName, companyName: rowProfile.companyName, value: state.score, valueLabel: `${state.score} 分`, equippedTitle: null };
          }),
        snapshotDate: today
      }));
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
    return {
      boards: [
        { key: "company-value", name: "公司估值榜", scope: "server", isActive: true, rows: rowsFor("company-value"), snapshotDate: today },
        { key: "cashflow", name: "现金流榜", scope: "server", isActive: true, rows: rowsFor("cashflow"), snapshotDate: today },
        { key: "product-growth", name: "产品增长榜", scope: "server", isActive: true, rows: rowsFor("product-growth"), snapshotDate: today },
        { key: "guild", name: "商会榜", scope: "server", isActive: true, rows: rowsFor("guild"), snapshotDate: today }
      ],
      activityBoards: []
    };
  };
  const buildCrossServerCenter = (profile: PlayerProfileRecord, today: string): CrossServerCenterRecord | "CROSS_SERVER_GROUP_NOT_FOUND" => {
    const group = crossServerGroups.find((item) => item.serverIds.includes(profile.serverId));
    if (group === undefined) {
      return "CROSS_SERVER_GROUP_NOT_FOUND";
    }
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

    return {
      group,
      isRegistered: crossServerSignups.has(`${profile.id}:${group.id}`),
      boards: [
        { key: "cross-company-value", name: "跨服创业大赛榜", scope: "cross", isActive: true, rows: rowsFor("cross-company-value"), snapshotDate: today },
        { key: "cross-guild", name: "跨服商会榜", scope: "cross", isActive: true, rows: rowsFor("cross-guild"), snapshotDate: today }
      ]
    };
  };
  const toGuildCenter = (profile: PlayerProfileRecord): GuildCenterRecord => {
    const member = guildMembers.get(profile.id);
    if (member === undefined) {
      return { guild: null, members: [], tasks: [], techs: [], helpRequests: [], leaderboard: [] };
    }
    const guild = guilds.get(member.guildId);
    const members = [...guildMembers.values()].filter((item) => item.guildId === member.guildId);
    return {
      guild: guild === undefined ? null : { id: guild.id, name: guild.name, level: guild.level, contributionScore: guild.contributionScore },
      members: members.map((item) => {
        const memberProfile = profiles.get(item.profileId);
        return {
          profileId: item.profileId,
          founderName: memberProfile?.founderName ?? "",
          companyName: memberProfile?.companyName ?? "",
          role: item.role,
          contributionScore: item.contributionScore
        };
      }),
      tasks: [{ id: "guild-daily-help", title: "成员互助", description: "完成一次商会互助。", progress: Math.min(member.contributionScore / 20, 1), target: 1, contributionReward: 20, isClaimed: member.contributionScore > 0 }],
      techs: [{ id: "shared-office", name: "联合办公", description: "提升商会成员协作效率展示。", level: 0, maxLevel: 5 }],
      helpRequests: [...guildHelpRequests.values()].filter((request) => request.guildId === member.guildId),
      leaderboard: members
        .sort((left, right) => right.contributionScore - left.contributionScore)
        .map((item, index) => {
          const memberProfile = profiles.get(item.profileId);
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
    async getAdminConfigCenter() {
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
        seasons: [{ id: seasonConfig.id, name: seasonConfig.name, status: seasonStatus(seasonConfig.startDate, seasonConfig.endDate, new Date().toISOString().slice(0, 10)), startDate: seasonConfig.startDate, endDate: seasonConfig.endDate }],
        activities: activityConfigs.map((activity) => ({ id: activity.id, name: activity.name, status: seasonStatus(activity.startDate, activity.endDate, new Date().toISOString().slice(0, 10)), leaderboardKey: activity.leaderboardKey })),
        scenarios: scenarioConfigs.map((scenario) => ({ id: scenario.id, name: scenario.name, rewardTitleId: scenario.rewardTitleId }))
      };
    },
    async listAdminAuditLogs() {
      return [
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
      return {
        leaderboard: buildLeaderboards(serverId, today),
        deliveredRewards: 0,
        auditLogId: `${adminUserId}:${serverId}:${reason}`
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
    async listServers() {
      return servers;
    },
    async listAvatars() {
      return avatars;
    },
    async getProfile(accountId, serverId) {
      return profiles.get(`${accountId}:${serverId}`);
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
    async advanceTask(accountId, serverId, taskId, today) {
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
      return toTaskRecord(profile.id, config, today);
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
      event.knowledgeUnlocked = config.knowledgeTitle !== null;
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
          knowledgeUnlocked: config.knowledgeTitle !== null,
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
    async purchaseShopProduct(accountId, serverId, productId, requestId) {
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
      if (product.purchaseLimit > 0 && productPurchaseCount(profile.id, product.id) >= product.purchaseLimit) {
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
      const purchase = {
        id: randomUUID(),
        profileId: profile.id,
        productId: product.id,
        requestId,
        pricePlatformCoins: product.pricePlatformCoins,
        createdAt: new Date().toISOString()
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
      return [...knowledgeUnlocks.values()]
        .filter((unlock) => unlock.profileId === profile.id)
        .map((unlock) => {
          const knowledge = knowledgeEntries.find((entry) => entry.id === unlock.knowledgeId);
          return {
            id: unlock.knowledgeId,
            category: knowledge?.category ?? "",
            title: knowledge?.title ?? "",
            summary: knowledge?.summary ?? "",
            sourceUrl: knowledge?.sourceUrl ?? "",
            collectedAt: knowledge?.collectedAt ?? "",
            contentVersion: knowledge?.contentVersion ?? "",
            disclaimer: knowledge?.disclaimer ?? "",
            unlockedAt: unlock.unlockedAt
          };
        }) satisfies KnowledgeEntryRecord[];
    },
    async getGuildCenter(accountId, serverId) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      return profile === undefined ? "PLAYER_NOT_FOUND" : toGuildCenter(profile);
    },
    async joinOrCreateGuild(accountId, serverId, guildName) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const guildKey = `${serverId}:${guildName}`;
      const guild = guilds.get(guildKey) ?? { id: guildKey, serverId, name: guildName, level: 1, contributionScore: 0 };
      guilds.set(guildKey, guild);
      guildMembers.set(profile.id, { guildId: guild.id, profileId: profile.id, role: "leader", contributionScore: 0 });
      return { guildCenter: toGuildCenter(profile), result: `${guildName} 已加入。` } satisfies GuildActionRecord;
    },
    async requestGuildHelp(accountId, serverId, requestType) {
      const profile = getProfileByAccountAndServer(accountId, serverId);
      if (profile === undefined) {
        return "PLAYER_NOT_FOUND";
      }
      const member = guildMembers.get(profile.id);
      if (member === undefined) {
        return "GUILD_NOT_JOINED";
      }
      const request = { id: randomUUID(), guildId: member.guildId, profileId: profile.id, requestType, status: "open", createdAt: new Date().toISOString() };
      guildHelpRequests.set(request.id, request);
      member.contributionScore += 20;
      const guild = [...guilds.values()].find((item) => item.id === member.guildId);
      if (guild !== undefined) {
        guild.contributionScore += 20;
      }
      return { guildCenter: toGuildCenter(profile), result: "商会互助已发布。" } satisfies GuildActionRecord;
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
  username = `player${randomUUID().replaceAll("-", "").slice(0, 8)}`
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
      serverId: "s1",
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

    for (const taskId of ["side-knowledge-labor-contract", "side-compliance-contract-review"]) {
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
        body: JSON.stringify({ serverId: "s1" })
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
    assert.equal(tasks.body.data?.find((task) => task.id === "side-knowledge-labor-contract")?.progress, 1);
    assert.equal(tasks.body.data?.find((task) => task.id === "side-compliance-contract-review")?.progress, 1);
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

    const auditLogs = await requestJson<Array<{ action: string }>>(baseUrl, "/admin/audit-logs", {
      headers: { authorization: `Bearer ${adminLogin.body.data.token}` }
    });
    assert.equal(auditLogs.status, 200);
    assert.ok(auditLogs.body.data?.some((log) => log.action === "admin_player_ban"));
    assert.ok(auditLogs.body.data?.some((log) => log.action === "admin_cross_server_group_assign"));
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

test("phase 14 leaderboards snapshot rewards and title expiry are idempotent", async () => {
  await withServer(async (baseUrl) => {
    const { token } = await createPlayerSession(baseUrl, "ranker");

    const leaderboards = await requestJson<LeaderboardCenterRecord>(baseUrl, "/leaderboards?serverId=s1", {
      headers: { authorization: `Bearer ${token}`, "x-server-date": "2026-05-01" }
    });
    assert.equal(leaderboards.status, 200);
    assert.equal(leaderboards.body.data?.boards.length, 4);
    assert.equal(leaderboards.body.data?.activityBoards.length, 0);
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
