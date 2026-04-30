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
