import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { calculateFinanceReport } from "./finance.js";

export type AccountRecord = {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
};

export type AdminUserRecord = AccountRecord;

export type ServerRecord = {
  id: string;
  name: string;
  status: "recommended" | "new" | "busy";
  label: string;
  isRecommended: boolean;
};

export type AvatarRecord = {
  id: string;
  name: string;
  glyph: string;
  specialty: string;
};

export type PlayerProfileRecord = {
  id: string;
  accountId: string;
  serverId: string;
  avatarId: string;
  founderName: string;
  companyName: string;
  companyLevel: number;
  cash: number;
  platformCoins: number;
  premiumCurrency: number;
  reputation: number;
  actionPower: number;
  actionPowerLimit: number;
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

export type CreatePlayerProfileInput = Pick<
  PlayerProfileRecord,
  "accountId" | "serverId" | "avatarId" | "founderName" | "companyName"
>;

export type TaskRecord = {
  id: string;
  type: "main" | "daily" | "side";
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardLabel: string;
  guideAction: string;
  unlockKind: "none" | "knowledge" | "compliance";
  isClaimed: boolean;
  isClaimable: boolean;
};

export type CompanyFinanceRecord = {
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
};

export type CompanyFinanceSettlementRecord = CompanyFinanceRecord & {
  reportMonth: number;
  income: number;
  expense: number;
  endingCash: number;
  createdAt: string;
};

export type GameRepository = {
  createAccount(account: Omit<AccountRecord, "id">): Promise<AccountRecord | "ACCOUNT_EXISTS">;
  findAccountByUsername(username: string): Promise<AccountRecord | undefined>;
  createAccountSession(accountId: string, token: string): Promise<void>;
  getAccountBySessionToken(token: string): Promise<AccountRecord | undefined>;
  findAdminByUsername(username: string): Promise<AdminUserRecord | undefined>;
  createAdminSession(adminUserId: string, token: string): Promise<void>;
  getAdminBySessionToken(token: string): Promise<AdminUserRecord | undefined>;
  listServers(): Promise<ServerRecord[]>;
  listAvatars(): Promise<AvatarRecord[]>;
  getProfile(accountId: string, serverId: string): Promise<PlayerProfileRecord | undefined>;
  createProfile(profile: CreatePlayerProfileInput): Promise<PlayerProfileRecord | "PLAYER_EXISTS">;
  listTasks(accountId: string, serverId: string, today: string): Promise<TaskRecord[] | "PLAYER_NOT_FOUND">;
  advanceTask(accountId: string, serverId: string, taskId: string, today: string): Promise<TaskRecord | "PLAYER_NOT_FOUND" | "TASK_NOT_FOUND">;
  claimTask(accountId: string, serverId: string, taskId: string, today: string): Promise<TaskRecord | "PLAYER_NOT_FOUND" | "TASK_NOT_FOUND" | "TASK_INCOMPLETE" | "TASK_ALREADY_CLAIMED">;
  getCompanyFinance(accountId: string, serverId: string): Promise<CompanyFinanceRecord | "PLAYER_NOT_FOUND">;
  settleCompanyDay(accountId: string, serverId: string): Promise<CompanyFinanceRecord | "PLAYER_NOT_FOUND">;
  settleCompanyMonth(accountId: string, serverId: string, reportMonth: number): Promise<CompanyFinanceSettlementRecord | "PLAYER_NOT_FOUND">;
  disconnect(): Promise<void>;
};

const toServerRecord = (server: {
  id: string;
  name: string;
  status: string;
  label: string;
  isRecommended: boolean;
}): ServerRecord => ({
  id: server.id,
  name: server.name,
  status: server.status === "new" || server.status === "busy" ? server.status : "recommended",
  label: server.label,
  isRecommended: server.isRecommended
});

const toProfileRecord = (profile: {
  id: string;
  accountId: string;
  serverId: string;
  avatarId: string;
  founderName: string;
  companyName: string;
  companyLevel: number;
  cash: number;
  platformCoins: number;
  premiumCurrency: number;
  reputation: number;
  actionPower: number;
  actionPowerLimit: number;
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
  createdAt: Date;
}): PlayerProfileRecord => ({
  ...profile,
  createdAt: profile.createdAt.toISOString()
});

const toCompanyFinanceRecord = (profile: PlayerProfileRecord): CompanyFinanceRecord => {
  const report = calculateFinanceReport(profile);

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
    riskStatus: report.riskStatus,
    riskTips: report.riskTips
  };
};

const readTaskType = (type: string): TaskRecord["type"] =>
  type === "daily" || type === "side" ? type : "main";

const readUnlockKind = (unlockKind: string): TaskRecord["unlockKind"] =>
  unlockKind === "knowledge" || unlockKind === "compliance" ? unlockKind : "none";

const toTaskRecord = (
  config: {
    id: string;
    type: string;
    title: string;
    description: string;
    target: number;
    initialProgress: number;
    rewardLabel: string;
    guideAction: string;
    unlockKind: string;
  },
  progress: { progress: number; dailyDate: string | null; claimedAt: Date | null } | undefined,
  today: string
): TaskRecord => {
  const isDaily = config.type === "daily";
  const isFreshDaily = !isDaily || progress?.dailyDate === today;
  const currentProgress = isFreshDaily ? progress?.progress ?? config.initialProgress : 0;
  const isClaimed = isFreshDaily && progress?.claimedAt !== null && progress?.claimedAt !== undefined;

  return {
    id: config.id,
    type: readTaskType(config.type),
    title: config.title,
    description: config.description,
    progress: Math.min(currentProgress, config.target),
    target: config.target,
    rewardLabel: config.rewardLabel,
    guideAction: config.guideAction,
    unlockKind: readUnlockKind(config.unlockKind),
    isClaimed,
    isClaimable: currentProgress >= config.target && !isClaimed
  };
};

export const createPrismaGameRepository = (
  prisma = new PrismaClient()
): GameRepository => ({
  async createAccount(account) {
    try {
      return await prisma.account.create({
        data: {
          id: randomUUID(),
          ...account
        }
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return "ACCOUNT_EXISTS";
      }
      throw error;
    }
  },

  async findAccountByUsername(username) {
    return (await prisma.account.findUnique({ where: { username } })) ?? undefined;
  },

  async createAccountSession(accountId, token) {
    await prisma.accountSession.create({
      data: {
        id: randomUUID(),
        accountId,
        token
      }
    });
  },

  async getAccountBySessionToken(token) {
    const session = await prisma.accountSession.findUnique({
      where: { token },
      include: { account: true }
    });
    return session?.account;
  },

  async findAdminByUsername(username) {
    return (await prisma.adminUser.findUnique({ where: { username } })) ?? undefined;
  },

  async createAdminSession(adminUserId, token) {
    await prisma.adminSession.create({
      data: {
        id: randomUUID(),
        adminUserId,
        token
      }
    });
  },

  async getAdminBySessionToken(token) {
    const session = await prisma.adminSession.findUnique({
      where: { token },
      include: { adminUser: true }
    });
    return session?.adminUser;
  },

  async listServers() {
    const servers = await prisma.gameServer.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
    return servers.map(toServerRecord);
  },

  async listAvatars() {
    return prisma.avatarOption.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
  },

  async getProfile(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    return profile === null ? undefined : toProfileRecord(profile);
  },

  async createProfile(profile) {
    try {
      const created = await prisma.playerProfile.create({
        data: {
          id: randomUUID(),
          ...profile
        }
      });
      return toProfileRecord(created);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return "PLAYER_EXISTS";
      }
      throw error;
    }
  },

  async listTasks(accountId, serverId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const [configs, progresses] = await Promise.all([
      prisma.taskConfig.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      }),
      prisma.playerTaskProgress.findMany({
        where: { profileId: profile.id }
      })
    ]);
    const progressByTaskId = new Map(progresses.map((progress) => [progress.taskId, progress]));
    return configs.map((config) => toTaskRecord(config, progressByTaskId.get(config.id), today));
  },

  async advanceTask(accountId, serverId, taskId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const config = await prisma.taskConfig.findUnique({ where: { id: taskId } });
    if (config === null) {
      return "TASK_NOT_FOUND";
    }

    const existing = await prisma.playerTaskProgress.findUnique({
      where: {
        profileId_taskId: {
          profileId: profile.id,
          taskId
        }
      }
    });
    const isDaily = config.type === "daily";
    const shouldResetDaily = isDaily && existing?.dailyDate !== today;
    const baseProgress = shouldResetDaily ? 0 : existing?.progress ?? config.initialProgress;
    const nextProgress = Math.min(baseProgress + 1, config.target);

    const progress = await prisma.playerTaskProgress.upsert({
      where: {
        profileId_taskId: {
          profileId: profile.id,
          taskId
        }
      },
      update: {
        progress: nextProgress,
        dailyDate: isDaily ? today : existing?.dailyDate ?? null,
        claimedAt: shouldResetDaily ? null : existing?.claimedAt ?? null
      },
      create: {
        profileId: profile.id,
        taskId,
        progress: nextProgress,
        dailyDate: isDaily ? today : null
      }
    });

    return toTaskRecord(config, progress, today);
  },

  async claimTask(accountId, serverId, taskId, today) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const config = await prisma.taskConfig.findUnique({ where: { id: taskId } });
    if (config === null) {
      return "TASK_NOT_FOUND";
    }

    const existing = await prisma.playerTaskProgress.findUnique({
      where: {
        profileId_taskId: {
          profileId: profile.id,
          taskId
        }
      }
    });
    const isDaily = config.type === "daily";
    const isFreshDaily = !isDaily || existing?.dailyDate === today;
    const currentProgress = isFreshDaily ? existing?.progress ?? config.initialProgress : 0;

    if (currentProgress < config.target) {
      return "TASK_INCOMPLETE";
    }

    if (isFreshDaily && existing?.claimedAt !== null && existing?.claimedAt !== undefined) {
      return "TASK_ALREADY_CLAIMED";
    }

    const progress = await prisma.playerTaskProgress.upsert({
      where: {
        profileId_taskId: {
          profileId: profile.id,
          taskId
        }
      },
      update: {
        progress: currentProgress,
        dailyDate: isDaily ? today : existing?.dailyDate ?? null,
        claimedAt: new Date()
      },
      create: {
        profileId: profile.id,
        taskId,
        progress: currentProgress,
        dailyDate: isDaily ? today : null,
        claimedAt: new Date()
      }
    });

    return toTaskRecord(config, progress, today);
  },

  async getCompanyFinance(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });

    return profile === null ? "PLAYER_NOT_FOUND" : toCompanyFinanceRecord(toProfileRecord(profile));
  },

  async settleCompanyDay(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const updated = await prisma.playerProfile.update({
      where: { id: profile.id },
      data: {
        operatingDay: profile.operatingDay + 1
      }
    });

    return toCompanyFinanceRecord(toProfileRecord(updated));
  },

  async settleCompanyMonth(accountId, serverId, reportMonth) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    if (profile === null) {
      return "PLAYER_NOT_FOUND";
    }

    const existingReport = await prisma.companyFinanceReport.findUnique({
      where: {
        profileId_reportMonth: {
          profileId: profile.id,
          reportMonth
        }
      }
    });
    if (existingReport !== null) {
      const finance = toCompanyFinanceRecord(toProfileRecord(profile));
      return {
        ...finance,
        reportMonth: existingReport.reportMonth,
        income: existingReport.income,
        expense: existingReport.expense,
        endingCash: existingReport.endingCash,
        createdAt: existingReport.createdAt.toISOString()
      };
    }

    const currentProfile = toProfileRecord(profile);
    const report = calculateFinanceReport(currentProfile);
    const nextRiskStatus = report.riskStatus;
    const nextDebtWarning = report.debtRatioBasisPoints >= 6000 ? "高" : "低";
    const nextCreditRating = report.debtRatioBasisPoints >= 6000 || report.cashAfterSettlement < 0 ? "B" : "A";

    const [updated, savedReport] = await prisma.$transaction(async (tx) => {
      const nextProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: report.cashAfterSettlement,
          financeMonth: Math.max(profile.financeMonth, reportMonth + 1),
          operatingDay: 1,
          riskStatus: nextRiskStatus,
          debtWarning: nextDebtWarning,
          creditRating: nextCreditRating,
          pendingEventCount: report.riskStatus === "稳健" ? profile.pendingEventCount : profile.pendingEventCount + 1
        }
      });

      const financeReport = await tx.companyFinanceReport.upsert({
        where: {
          profileId_reportMonth: {
            profileId: profile.id,
            reportMonth
          }
        },
        update: {},
        create: {
          id: randomUUID(),
          profileId: profile.id,
          reportMonth,
          income: profile.monthlyIncome,
          expense: profile.monthlyExpense,
          netCashFlow: report.netCashFlow,
          endingCash: report.cashAfterSettlement,
          totalDebt: profile.totalDebt,
          debtRatioBasisPoints: report.debtRatioBasisPoints,
          riskStatus: report.riskStatus,
          riskTips: report.riskTips.join("\n")
        }
      });

      return [nextProfile, financeReport] as const;
    });

    const finance = toCompanyFinanceRecord(toProfileRecord(updated));
    return {
      ...finance,
      reportMonth: savedReport.reportMonth,
      income: savedReport.income,
      expense: savedReport.expense,
      endingCash: savedReport.endingCash,
      createdAt: savedReport.createdAt.toISOString()
    };
  },

  async disconnect() {
    await prisma.$disconnect();
  }
});
