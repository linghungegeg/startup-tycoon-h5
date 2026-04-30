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
    guideAction: "前往项目",
    unlockKind: "none",
    sortOrder: 11
  },
  {
    id: "side-knowledge-labor-contract",
    type: "side",
    title: "阅读用工合规知识",
    description: "查看劳动合同风险知识卡，理解创业公司基础用工合规要求。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "声望 300、知识点 1",
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
    guideAction: "处理支线",
    unlockKind: "compliance",
    sortOrder: 21
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
