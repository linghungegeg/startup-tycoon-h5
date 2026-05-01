import { PrismaClient } from "@prisma/client";

import { createPasswordRecord } from "../src/password.js";

const prisma = new PrismaClient();

const servers = [
  { id: "s1", name: "长宁一服", status: "recommended", label: "推荐", isRecommended: true, sortOrder: 1 },
  { id: "s2", name: "滨江新区", status: "new", label: "新服", isRecommended: false, sortOrder: 2 },
  { id: "s3", name: "中关村路演场", status: "busy", label: "繁忙", isRecommended: false, sortOrder: 3 }
];

const avatars = [
  { id: "strategist", name: "策略型创始人", glyph: "策", specialty: "融资谈判与方向判断", sortOrder: 1 },
  { id: "builder", name: "产品型创始人", glyph: "造", specialty: "产品研发与团队协作", sortOrder: 2 },
  { id: "operator", name: "运营型创始人", glyph: "营", specialty: "增长运营与现金回收", sortOrder: 3 }
];

const crossServerGroups = [
  {
    id: "new-growth-pool",
    name: "开服成长池",
    ruleLabel: "按开服时间与活跃度分池，避免老服碾压新服。",
    isActive: true,
    sortOrder: 1,
    serverIds: ["s1", "s2"]
  },
  {
    id: "roadshow-pool",
    name: "路演竞争池",
    ruleLabel: "繁忙服单独入池，后续按活跃度扩容。",
    isActive: true,
    sortOrder: 2,
    serverIds: ["s3"]
  }
];

const taskConfigs = [
  {
    id: "main-profile-created",
    type: "main",
    title: "完成公司档案",
    description: "创建创始人和公司档案，正式进入写字楼创业阶段。",
    target: 1,
    initialProgress: 1,
    rewardLabel: "钻石 120、资金 10万",
    rewardCash: 100000,
    rewardPlatformCoins: 0,
    rewardReputation: 0,
    rewardActionPower: 0,
    guideAction: "领取奖励",
    unlockKind: "none",
    sortOrder: 1
  },
  {
    id: "main-first-project",
    type: "main",
    title: "推进第一单项目",
    description: "进入项目中心推进一个经营项目，为公司拿到第一笔稳定收入。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 20万、声望 500",
    rewardCash: 200000,
    rewardPlatformCoins: 0,
    rewardReputation: 500,
    rewardActionPower: 0,
    guideAction: "前往项目",
    unlockKind: "none",
    sortOrder: 2
  },
  {
    id: "daily-train-employee",
    type: "daily",
    title: "培训员工",
    description: "完成一次员工培养，提高团队能力并维持员工成长节奏。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "金币 8,000、培养手册 1",
    rewardCash: 0,
    rewardPlatformCoins: 8000,
    rewardReputation: 0,
    rewardActionPower: 0,
    guideAction: "前往员工",
    unlockKind: "none",
    sortOrder: 10
  },
  {
    id: "daily-project-push",
    type: "daily",
    title: "推进项目",
    description: "推进一次项目进度，确保公司每天都有经营动作。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 8万、体力 20",
    rewardCash: 80000,
    rewardPlatformCoins: 0,
    rewardReputation: 0,
    rewardActionPower: 20,
    guideAction: "前往项目",
    unlockKind: "none",
    sortOrder: 11
  },
  {
    id: "daily-handle-event",
    type: "daily",
    title: "处理经营事件",
    description: "完成一次消息、合同或财务事件决策，保持公司经营节奏。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 5万、声望 200",
    rewardCash: 50000,
    rewardPlatformCoins: 0,
    rewardReputation: 200,
    rewardActionPower: 0,
    guideAction: "处理事件",
    unlockKind: "none",
    sortOrder: 12
  },
  {
    id: "side-knowledge-labor-contract",
    type: "side",
    title: "阅读用工合规知识",
    description: "查看劳动合同风险知识卡，理解创业公司基础用工合规要求。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "声望 300、知识点 1",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 300,
    rewardActionPower: 0,
    guideAction: "查看知识",
    unlockKind: "knowledge",
    sortOrder: 20
  },
  {
    id: "side-compliance-contract-review",
    type: "side",
    title: "完成合同复核",
    description: "推进一次合同复核支线，降低项目签约和回款风险。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 6万、合规评分 2",
    rewardCash: 60000,
    rewardPlatformCoins: 0,
    rewardReputation: 0,
    rewardActionPower: 0,
    guideAction: "处理支线",
    unlockKind: "compliance",
    sortOrder: 21
  }
];

const eventConfigs = [
  {
    id: "employee-contract-risk",
    title: "新员工入职资料缺口",
    source: "员工私信",
    channel: "chat",
    summary: "HR 提醒一名新员工还没有完成劳动合同签署。",
    context: "销售团队准备让新员工直接进入客户项目，但入职材料仍缺少合同签署和岗位确认。",
    optionA: "立即补齐合同和入职材料",
    optionAResult: "公司支出增加，但用工争议风险下降，团队对流程更有信心。",
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
    riskExplanation: "入职资料缺口会放大劳动争议和客户现场管理风险，越早补齐越能降低后续赔偿压力。",
    sortOrder: 1
  },
  {
    id: "customer-contract-review",
    title: "客户要求压缩验收周期",
    source: "客户邮件",
    channel: "contract",
    summary: "客户希望缩短验收时间，并保留延期扣款条款。",
    context: "客户提出快速签约，但验收节点、延期扣款和回款条件都需要在合同中确认。",
    optionA: "坚持分阶段验收和书面确认",
    optionAResult: "签约节奏变慢，但回款节点更清晰，项目风险下降。",
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
    riskExplanation: "验收周期压缩会提高短期签约速度，但也会压缩纠错时间，回款条款不清时容易形成争议。",
    sortOrder: 2
  },
  {
    id: "finance-warning-cashflow",
    title: "现金流安全垫下降",
    source: "财报预警",
    channel: "finance",
    summary: "本月固定支出上升，现金安全垫低于财务建议线。",
    context: "财务建议暂缓非必要招聘和营销投放，优先处理短周期回款项目。",
    optionA: "收缩支出，优先短周期回款",
    optionAResult: "现金流压力缓解，但增长速度暂时放慢。",
    optionACash: 30000,
    optionAReputation: 0,
    optionACustomerSatisfaction: 1,
    optionARiskDelta: -1,
    optionB: "维持投放，争取下月增长",
    optionBResult: "增长投入保持，但短期资金压力继续上升。",
    optionBCash: -50000,
    optionBReputation: 300,
    optionBCustomerSatisfaction: 0,
    optionBRiskDelta: 1,
    followupEventId: null,
    knowledgeTitle: "现金流安全垫",
    riskExplanation: "固定支出持续上升时，现金安全垫不足会限制招聘、交付和应急谈判能力。",
    sortOrder: 3
  },
  {
    id: "public-opinion-response",
    title: "客户群出现交付质疑",
    source: "舆情热搜",
    channel: "hot",
    summary: "老客户群里有人质疑项目延期和售后响应速度。",
    context: "运营负责人建议当天给出交付说明，销售负责人则希望先私下安抚关键客户。",
    optionA: "公开说明交付排期",
    optionAResult: "透明沟通提升声誉，但需要投入额外客服和项目管理成本。",
    optionACash: -15000,
    optionAReputation: 700,
    optionACustomerSatisfaction: 2,
    optionARiskDelta: -1,
    optionB: "先私下安抚关键客户",
    optionBResult: "短期成本较低，但公开质疑没有完全消除。",
    optionBCash: 0,
    optionBReputation: -400,
    optionBCustomerSatisfaction: -1,
    optionBRiskDelta: 1,
    followupEventId: null,
    knowledgeTitle: "客户舆情响应",
    riskExplanation: "舆情事件拖延处理会扩大客户不确定感，透明说明通常能降低后续信任成本。",
    sortOrder: 4
  },
  {
    id: "funding-failed-bridge-plan",
    title: "融资未达成后的替代方案",
    source: "董事会纪要",
    channel: "finance",
    summary: "本轮融资没有完成，董事会要求提交现金流替代方案。",
    context: "投资人暂缓打款后，公司需要在贷款周转、降本和项目回款之间快速做出选择，避免现金安全垫继续下降。",
    optionA: "收缩支出并催收短周期项目",
    optionAResult: "公司进入保守经营，现金流压力缓解，董事会对执行节奏保持关注。",
    optionACash: 50000,
    optionAReputation: 200,
    optionACustomerSatisfaction: 0,
    optionARiskDelta: -1,
    optionB: "继续寻找更高估值投资人",
    optionBResult: "公司保持增长叙事，但现金流和董事会压力继续上升。",
    optionBCash: -30000,
    optionBReputation: 500,
    optionBCustomerSatisfaction: 0,
    optionBRiskDelta: 1,
    followupEventId: null,
    knowledgeTitle: "融资失败后的现金流替代路线",
    riskExplanation: "融资失败不会直接补充现金，越接近资金紧张区间，越需要用回款、降本或短期授信维持经营安全垫。",
    sortOrder: 5
  },
  {
    id: "product-tech-debt-incident",
    title: "产品技术债事故预警",
    source: "技术周报",
    channel: "product",
    summary: "产品增长后服务器报警和缺陷反馈同时上升。",
    context: "研发负责人提醒，继续推增长会让系统稳定性和客服压力同步恶化，需要决定是否暂停迭代补技术债。",
    optionA: "暂停增长实验，集中修复技术债",
    optionAResult: "短期增长放慢，但产品口碑和稳定性恢复。",
    optionACash: -40000,
    optionAReputation: 800,
    optionACustomerSatisfaction: 3,
    optionARiskDelta: -1,
    optionB: "继续增长，客服先顶住",
    optionBResult: "用户增长继续，但故障和投诉风险上升。",
    optionBCash: 30000,
    optionBReputation: -900,
    optionBCustomerSatisfaction: -5,
    optionBRiskDelta: 1,
    followupEventId: null,
    knowledgeTitle: "技术债和产品稳定性",
    riskExplanation: "产品用户增长会放大历史技术债，服务器成本、客服压力和口碑风险会一起出现。",
    sortOrder: 6
  }
];

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
    summary: "偏好现金流清晰的小团队，条款温和，适合早期补充安全垫。",
    sortOrder: 1
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
    summary: "提供更高金额，但关注增长速度和后续估值兑现。",
    sortOrder: 2
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
    summary: "金额最高，条款更强势，适合公司状态稳定后推进。",
    sortOrder: 3
  }
];

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
    summary: "适合短期现金流缺口，放款快，但每月还款压力明显。",
    sortOrder: 1
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
    summary: "额度更高，适合扩张办公和交付能力，信用评级不足时不可申请。",
    sortOrder: 2
  },
  {
    id: "emergency-bridge-loan",
    name: "应急过桥贷",
    lender: "供应链金融机构",
    principal: 180000,
    annualRateBasisPoints: 1800,
    termMonths: 3,
    monthlyPayment: 62700,
    creditRequired: "C",
    summary: "用于资金紧张时快速止血，利率高，逾期会迅速拖累信用。",
    sortOrder: 3
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
    summary: "额度很高，可迅速补充现金，但会把公司推入高负债压力区。",
    sortOrder: 4
  }
];

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
    recruitWeight: 3,
    sortOrder: 1
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
    recruitWeight: 8,
    sortOrder: 2
  },
  {
    id: "zhou-qihang",
    name: "周启航",
    role: "销售",
    careerLevel: "高级",
    rarity: "稀缺",
    baseSalary: 62000,
    basePressure: 46,
    loyalty: 76,
    growthPotential: 80,
    management: 70,
    negotiation: 92,
    execution: 84,
    specialty: "擅长大客户谈判，提高项目收入和回款概率。",
    recruitWeight: 15,
    sortOrder: 3
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
    recruitWeight: 24,
    sortOrder: 4
  },
  {
    id: "gu-mingchuan",
    name: "顾明川",
    role: "法务",
    careerLevel: "专家",
    rarity: "稀缺",
    baseSalary: 58000,
    basePressure: 32,
    loyalty: 88,
    growthPotential: 78,
    management: 72,
    negotiation: 84,
    execution: 76,
    specialty: "擅长合同和劳动争议，降低合规风险。",
    recruitWeight: 12,
    sortOrder: 5
  },
  {
    id: "ye-siqi",
    name: "叶思齐",
    role: "运营",
    careerLevel: "高级",
    rarity: "优秀",
    baseSalary: 42000,
    basePressure: 38,
    loyalty: 80,
    growthPotential: 82,
    management: 70,
    negotiation: 66,
    execution: 88,
    specialty: "擅长活动和用户增长，但容易提高营销成本。",
    recruitWeight: 28,
    sortOrder: 6
  },
  {
    id: "su-jian",
    name: "苏简",
    role: "HR",
    careerLevel: "中级",
    rarity: "优秀",
    baseSalary: 38000,
    basePressure: 24,
    loyalty: 90,
    growthPotential: 76,
    management: 80,
    negotiation: 64,
    execution: 72,
    specialty: "降低离职风险，提高招聘效率。",
    recruitWeight: 30,
    sortOrder: 7
  }
];

const projectConfigs = [
  {
    id: "outsourcing-crm",
    name: "客户 CRM 外包开发",
    category: "外包开发",
    cycleDays: 12,
    budget: 180000,
    risk: "低",
    successRateBase: 72,
    revenueReward: 320000,
    reputationReward: 1200,
    customerSatisfactionReward: 4,
    failurePenalty: 60000,
    summary: "为传统企业交付客户管理系统，回款稳定，适合建立第一条项目收入线。",
    sortOrder: 1
  },
  {
    id: "saas-custom",
    name: "连锁门店 SaaS 定制",
    category: "SaaS 定制",
    cycleDays: 18,
    budget: 260000,
    risk: "中",
    successRateBase: 64,
    revenueReward: 520000,
    reputationReward: 1800,
    customerSatisfactionReward: 5,
    failurePenalty: 110000,
    summary: "为连锁门店定制数据看板和会员运营工具，收益更高但交付压力更大。",
    sortOrder: 2
  },
  {
    id: "growth-campaign",
    name: "城市品牌增长投放",
    category: "营销增长",
    cycleDays: 10,
    budget: 150000,
    risk: "中",
    successRateBase: 68,
    revenueReward: 280000,
    reputationReward: 1600,
    customerSatisfactionReward: 3,
    failurePenalty: 80000,
    summary: "帮助客户完成城市级品牌投放，依赖运营节奏和客户沟通质量。",
    sortOrder: 3
  },
  {
    id: "ai-automation",
    name: "AI 自动化方案",
    category: "AI 自动化",
    cycleDays: 22,
    budget: 360000,
    risk: "高",
    successRateBase: 56,
    revenueReward: 760000,
    reputationReward: 2600,
    customerSatisfactionReward: 6,
    failurePenalty: 180000,
    summary: "为客户设计自动化客服和流程机器人，成功后能显著提升公司声誉。",
    sortOrder: 4
  }
];

const productConfigs = [
  {
    id: "crm-lite-saas",
    name: "轻量 CRM SaaS",
    category: "企业服务",
    summary: "把项目交付经验沉淀成订阅产品，适合早期建立长期收入。",
    launchCost: 280000,
    baseUsers: 120,
    retentionBasisPoints: 4200,
    payRateBasisPoints: 180,
    revenuePerPayingUser: 680,
    acquisitionCost: 90000,
    serverCost: 28000,
    techDebtGrowth: 9,
    reputationGrowth: 3,
    sortOrder: 1
  },
  {
    id: "ai-customer-copilot",
    name: "AI 客服 Copilot",
    category: "AI 工具",
    summary: "面向中小企业的客服自动化工具，增长快但技术债和服务器压力更高。",
    launchCost: 420000,
    baseUsers: 80,
    retentionBasisPoints: 3600,
    payRateBasisPoints: 220,
    revenuePerPayingUser: 980,
    acquisitionCost: 140000,
    serverCost: 52000,
    techDebtGrowth: 15,
    reputationGrowth: 5,
    sortOrder: 2
  }
];

const marketTrackConfigs = [
  {
    id: "enterprise-saas",
    name: "企业 SaaS",
    summary: "回款稳定、服务成本中等，容易被价格战和客户迁移影响。",
    costStructure: "获客成本中等，客服和续费运营占比高。",
    industryHeat: 66,
    policyRisk: 18,
    baseShareBasisPoints: 820,
    customerPool: 120000,
    sortOrder: 1
  },
  {
    id: "ai-tools",
    name: "AI 工具",
    summary: "行业热度高、增长快，但算力成本、政策变化和专利争议更频繁。",
    costStructure: "服务器和研发成本高，增长弹性强。",
    industryHeat: 84,
    policyRisk: 42,
    baseShareBasisPoints: 520,
    customerPool: 180000,
    sortOrder: 2
  }
];

const competitorActionConfigs = [
  {
    id: "saas-price-war",
    trackId: "enterprise-saas",
    competitorName: "蓝鲸企服",
    actionType: "price_war",
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
    responseReputationImpact: 500,
    sortOrder: 1
  },
  {
    id: "ai-patent-dispute",
    trackId: "ai-tools",
    competitorName: "星河智能",
    actionType: "patent",
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
    responseReputationImpact: 900,
    sortOrder: 2
  },
  {
    id: "saas-poach-manager",
    trackId: "enterprise-saas",
    competitorName: "云帆科技",
    actionType: "poach",
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
    responseCost: 110000,
    responseShareDeltaBasisPoints: 130,
    responseReputationImpact: 400,
    sortOrder: 3
  }
];

const shopProductConfigs = [
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
    summary: "首日启动资源，补充少量现金、行动力和公司声望。",
    isActive: true,
    sortOrder: 1
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
    summary: "提供 30 天经营补贴入口，第一版先发放即时启动补贴。",
    isActive: true,
    sortOrder: 2
  },
  {
    id: "growth-fund-seed",
    name: "种子期成长基金",
    category: "growth_fund",
    pricePlatformCoins: 1980,
    rewardCash: 520000,
    rewardActionPower: 120,
    rewardReputation: 900,
    durationDays: 0,
    purchaseLimit: 1,
    summary: "绑定公司早期成长节点，缓解研发和销售投入压力。",
    isActive: true,
    sortOrder: 3
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
    summary: "用于后续猎头招募池，当前提供行动力和少量声望预备奖励。",
    isActive: true,
    sortOrder: 4
  },
  {
    id: "risk-insurance-trial",
    name: "风险保险体验",
    category: "risk_insurance",
    pricePlatformCoins: 520,
    rewardCash: 120000,
    rewardActionPower: 20,
    rewardReputation: 260,
    durationDays: 7,
    purchaseLimit: 1,
    summary: "降低早期经营波动的体验型保障，不直接清空负债或失败风险。",
    isActive: true,
    sortOrder: 5
  }
];

const vipLevelConfigs = [
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
    summary: "基础身份，保留每日行动力补给。",
    sortOrder: 0
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
    summary: "解锁轻量便利和基础身份展示。",
    sortOrder: 1
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
    summary: "增强项目推进和员工培养便利。",
    sortOrder: 2
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
    avatarFrame: "platinum",
    summary: "提供更多容错和信息优势，不直接消除经营风险。",
    sortOrder: 3
  }
];

const titleConfigs = [
  {
    id: "startup-founder",
    name: "初创老板",
    category: "growth",
    source: "achievement",
    bonusLabel: "身份展示",
    durationDays: 0,
    sortOrder: 1
  },
  {
    id: "cashflow-master",
    name: "现金流大师",
    category: "finance",
    source: "achievement",
    bonusLabel: "现金流榜展示",
    durationDays: 0,
    sortOrder: 2
  },
  {
    id: "server-richest",
    name: "本服首富",
    category: "rank",
    source: "leaderboard",
    bonusLabel: "排行榜展示",
    durationDays: 7,
    sortOrder: 3
  },
  {
    id: "cross-unicorn",
    name: "跨服独角兽",
    category: "rank",
    source: "cross_server",
    bonusLabel: "跨服榜展示",
    durationDays: 7,
    sortOrder: 4
  },
  {
    id: "strategic-investor",
    name: "战略投资人",
    category: "vip",
    source: "vip",
    bonusLabel: "VIP身份展示",
    durationDays: 0,
    sortOrder: 5
  }
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
    isHidden: false,
    sortOrder: 1
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
    isHidden: false,
    sortOrder: 2
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
    isHidden: true,
    sortOrder: 3
  }
];

const knowledgeCategories = [
  { id: "startup", name: "创业基础", sortOrder: 1 },
  { id: "finance", name: "财务合规", sortOrder: 2 }
];

const knowledgeEntries = [
  {
    id: "company-registration-basics",
    categoryId: "startup",
    title: "公司档案与主体登记",
    summary: "游戏中公司档案对应真实创业里的主体信息、经营范围和团队责任边界。",
    sourceUrl: "https://www.samr.gov.cn/",
    collectedAt: "2026-05-01",
    contentVersion: "2026.05",
    disclaimer: "仅作游戏科普，不构成法律建议",
    sortOrder: 1
  },
  {
    id: "cashflow-safety-line",
    categoryId: "finance",
    title: "现金流安全线",
    summary: "持续正向现金流比单月利润更能反映早期公司的生存质量。",
    sourceUrl: "https://www.sba.gov/business-guide/manage-your-business",
    collectedAt: "2026-05-01",
    contentVersion: "2026.05",
    disclaimer: "仅作游戏科普，不构成法律建议",
    sortOrder: 2
  },
  {
    id: "valuation-method-note",
    categoryId: "finance",
    title: "估值只是谈判结果",
    summary: "估值会受到现金流、增长、债务和市场预期影响，不等同于可立即变现的现金。",
    sourceUrl: "https://www.sec.gov/education",
    collectedAt: "2026-05-01",
    contentVersion: "2026.05",
    disclaimer: "仅作游戏科普，不构成法律建议",
    sortOrder: 3
  }
];

const guildTaskConfigs = [
  {
    id: "guild-daily-help",
    title: "成员互助",
    description: "完成一次商会互助，提升商会活跃度。",
    target: 1,
    contributionReward: 20,
    sortOrder: 1
  }
];

const guildTechConfigs = [
  {
    id: "shared-office",
    name: "联合办公",
    description: "提升商会成员的协作效率展示。",
    maxLevel: 5,
    sortOrder: 1
  }
];

const adminPasswordText = process.env.ADMIN_PASSWORD ?? "admin123";

if (adminPasswordText.length < 6 || adminPasswordText.length > 72) {
  throw new Error("ADMIN_PASSWORD must be 6 to 72 characters.");
}

const seed = async (): Promise<void> => {
  for (const server of servers) {
    await prisma.gameServer.upsert({
      where: { id: server.id },
      update: server,
      create: server
    });
  }

  for (const avatar of avatars) {
    await prisma.avatarOption.upsert({
      where: { id: avatar.id },
      update: avatar,
      create: avatar
    });
  }

  for (const group of crossServerGroups) {
    const { serverIds, ...groupConfig } = group;
    await prisma.crossServerGroup.upsert({
      where: { id: group.id },
      update: groupConfig,
      create: groupConfig
    });
    for (const [index, serverId] of serverIds.entries()) {
      await prisma.crossServerGroupServer.upsert({
        where: { serverId },
        update: {
          groupId: group.id,
          sortOrder: index + 1
        },
        create: {
          groupId: group.id,
          serverId,
          sortOrder: index + 1
        }
      });
    }
  }

  for (const taskConfig of taskConfigs) {
    await prisma.taskConfig.upsert({
      where: { id: taskConfig.id },
      update: taskConfig,
      create: taskConfig
    });
  }

  for (const employeeConfig of employeeConfigs) {
    await prisma.employeeConfig.upsert({
      where: { id: employeeConfig.id },
      update: employeeConfig,
      create: employeeConfig
    });
  }

  for (const projectConfig of projectConfigs) {
    await prisma.projectConfig.upsert({
      where: { id: projectConfig.id },
      update: projectConfig,
      create: projectConfig
    });
  }

  for (const productConfig of productConfigs) {
    await prisma.productConfig.upsert({
      where: { id: productConfig.id },
      update: productConfig,
      create: productConfig
    });
  }

  for (const marketTrackConfig of marketTrackConfigs) {
    await prisma.marketTrackConfig.upsert({
      where: { id: marketTrackConfig.id },
      update: marketTrackConfig,
      create: marketTrackConfig
    });
  }

  for (const competitorActionConfig of competitorActionConfigs) {
    await prisma.competitorActionConfig.upsert({
      where: { id: competitorActionConfig.id },
      update: competitorActionConfig,
      create: competitorActionConfig
    });
  }

  for (const shopProductConfig of shopProductConfigs) {
    await prisma.shopProductConfig.upsert({
      where: { id: shopProductConfig.id },
      update: shopProductConfig,
      create: shopProductConfig
    });
  }

  for (const vipLevelConfig of vipLevelConfigs) {
    await prisma.vipLevelConfig.upsert({
      where: { level: vipLevelConfig.level },
      update: vipLevelConfig,
      create: vipLevelConfig
    });
  }

  for (const titleConfig of titleConfigs) {
    await prisma.titleConfig.upsert({
      where: { id: titleConfig.id },
      update: titleConfig,
      create: titleConfig
    });
  }

  for (const knowledgeCategory of knowledgeCategories) {
    await prisma.knowledgeCategory.upsert({
      where: { id: knowledgeCategory.id },
      update: knowledgeCategory,
      create: knowledgeCategory
    });
  }

  for (const knowledgeEntry of knowledgeEntries) {
    await prisma.knowledgeEntry.upsert({
      where: { id: knowledgeEntry.id },
      update: knowledgeEntry,
      create: knowledgeEntry
    });
  }

  for (const achievementConfig of achievementConfigs) {
    await prisma.achievementConfig.upsert({
      where: { id: achievementConfig.id },
      update: achievementConfig,
      create: achievementConfig
    });
  }

  for (const guildTaskConfig of guildTaskConfigs) {
    await prisma.guildTaskConfig.upsert({
      where: { id: guildTaskConfig.id },
      update: guildTaskConfig,
      create: guildTaskConfig
    });
  }

  for (const guildTechConfig of guildTechConfigs) {
    await prisma.guildTechConfig.upsert({
      where: { id: guildTechConfig.id },
      update: guildTechConfig,
      create: guildTechConfig
    });
  }

  for (const eventConfig of eventConfigs) {
    await prisma.eventConfig.upsert({
      where: { id: eventConfig.id },
      update: eventConfig,
      create: eventConfig
    });
  }

  for (const loanConfig of loanConfigs) {
    await prisma.loanConfig.upsert({
      where: { id: loanConfig.id },
      update: loanConfig,
      create: loanConfig
    });
  }

  for (const investorConfig of investorConfigs) {
    await prisma.investorConfig.upsert({
      where: { id: investorConfig.id },
      update: investorConfig,
      create: investorConfig
    });
  }

  const adminPassword = createPasswordRecord(adminPasswordText);
  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: adminPassword,
    create: {
      username: "admin",
      ...adminPassword
    }
  });
};

seed()
  .finally(async () => {
    await prisma.$disconnect();
  });
