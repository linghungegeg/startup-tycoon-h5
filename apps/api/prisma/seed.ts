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
