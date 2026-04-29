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

  const adminPassword = createPasswordRecord("admin123");
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
