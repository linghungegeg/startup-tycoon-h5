import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { pickRecruitCandidate } from "./employee.js";
import { calculateFinanceReport } from "./finance.js";
import { calculateProjectProgressGain, calculateProjectSuccessRate } from "./project.js";

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

export type EmployeeRecord = {
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

export type ProjectRecord = {
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

export type ProjectSettlementRecord = {
  project: ProjectRecord;
  finance: CompanyFinanceRecord;
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
  listEmployees(accountId: string, serverId: string): Promise<EmployeeRecord[] | "PLAYER_NOT_FOUND">;
  recruitEmployee(accountId: string, serverId: string): Promise<EmployeeRecord | "PLAYER_NOT_FOUND" | "NO_EMPLOYEE_AVAILABLE">;
  cultivateEmployee(accountId: string, serverId: string, employeeId: string): Promise<EmployeeRecord | "PLAYER_NOT_FOUND" | "EMPLOYEE_NOT_FOUND">;
  grantEmployeeEquity(accountId: string, serverId: string, employeeId: string): Promise<EmployeeRecord | "PLAYER_NOT_FOUND" | "EMPLOYEE_NOT_FOUND" | "EQUITY_LIMIT_REACHED">;
  dismissEmployee(accountId: string, serverId: string, employeeId: string): Promise<CompanyFinanceRecord | "PLAYER_NOT_FOUND" | "EMPLOYEE_NOT_FOUND">;
  listProjects(accountId: string, serverId: string): Promise<ProjectRecord[] | "PLAYER_NOT_FOUND">;
  startProject(accountId: string, serverId: string): Promise<ProjectRecord | "PLAYER_NOT_FOUND" | "NO_PROJECT_AVAILABLE">;
  assignProjectEmployee(accountId: string, serverId: string, projectId: string, employeeId: string): Promise<ProjectRecord | "PLAYER_NOT_FOUND" | "PROJECT_NOT_FOUND" | "EMPLOYEE_NOT_FOUND">;
  advanceProject(accountId: string, serverId: string, projectId: string): Promise<ProjectRecord | "PLAYER_NOT_FOUND" | "PROJECT_NOT_FOUND" | "PROJECT_ALREADY_SETTLED">;
  settleProject(accountId: string, serverId: string, projectId: string): Promise<ProjectSettlementRecord | "PLAYER_NOT_FOUND" | "PROJECT_NOT_FOUND" | "PROJECT_INCOMPLETE">;
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

const toEmployeeRecord = (employee: {
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
}): EmployeeRecord => ({
  ...employee
});

const readProjectStatus = (status: string): ProjectRecord["status"] =>
  status === "ready" || status === "settled" || status === "failed" ? status : "active";

const readProjectResult = (result: string | null): ProjectRecord["result"] =>
  result === "success" || result === "failure" ? result : null;

const toProjectRecord = (
  project: {
    id: string;
    configId: string;
    name: string;
    category: string;
    stage: number;
    progress: number;
    cycleDays: number;
    budget: number;
    risk: string;
    successRateBase: number;
    revenueReward: number;
    assignedEmployeeId: string | null;
    assignedEmployeeName: string | null;
    status: string;
    result: string | null;
    summary: string;
    settledAt: Date | null;
  },
  employee?: { management: number; negotiation: number; execution: number } | null
): ProjectRecord => ({
  id: project.id,
  configId: project.configId,
  name: project.name,
  category: project.category,
  stage: project.stage,
  progress: project.progress,
  cycleDays: project.cycleDays,
  budget: project.budget,
  risk: project.risk,
  successRate: calculateProjectSuccessRate({
    baseRate: project.successRateBase,
    employeeManagement: employee?.management,
    employeeNegotiation: employee?.negotiation,
    employeeExecution: employee?.execution
  }),
  revenueReward: project.revenueReward,
  assignedEmployeeId: project.assignedEmployeeId,
  assignedEmployeeName: project.assignedEmployeeName,
  status: readProjectStatus(project.status),
  result: readProjectResult(project.result),
  summary: project.summary,
  settledAt: project.settledAt?.toISOString() ?? null
});

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

  async listEmployees(accountId, serverId) {
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

    const employees = await prisma.playerEmployee.findMany({
      where: { profileId: profile.id },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }]
    });

    return employees.map(toEmployeeRecord);
  },

  async recruitEmployee(accountId, serverId) {
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

    const [configs, ownedEmployees] = await Promise.all([
      prisma.employeeConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.playerEmployee.findMany({ where: { profileId: profile.id }, select: { configId: true } })
    ]);
    const ownedConfigIds = new Set(ownedEmployees.map((employee) => employee.configId));
    const pool = configs.filter((config) => !ownedConfigIds.has(config.id));
    if (pool.length === 0) {
      return "NO_EMPLOYEE_AVAILABLE";
    }

    const totalWeight = pool.reduce((total, config) => total + Math.max(config.recruitWeight, 0), 0);
    const selected = pickRecruitCandidate(pool, Math.random() * totalWeight);
    if (selected === undefined) {
      return "NO_EMPLOYEE_AVAILABLE";
    }

    const [created] = await prisma.$transaction([
      prisma.playerEmployee.create({
        data: {
          id: randomUUID(),
          profileId: profile.id,
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
          specialty: selected.specialty
        }
      }),
      prisma.playerProfile.update({
        where: { id: profile.id },
        data: {
          monthlyExpense: { increment: selected.baseSalary },
          employeeSatisfaction: { increment: 1 }
        }
      })
    ]);

    return toEmployeeRecord(created);
  },

  async cultivateEmployee(accountId, serverId, employeeId) {
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

    const employee = await prisma.playerEmployee.findFirst({
      where: {
        id: employeeId,
        profileId: profile.id,
        isActive: true
      }
    });
    if (employee === null) {
      return "EMPLOYEE_NOT_FOUND";
    }

    const salaryIncrease = Math.max(2000, Math.round(employee.salary * 0.08));
    const [updated] = await prisma.$transaction([
      prisma.playerEmployee.update({
        where: { id: employee.id },
        data: {
          level: employee.level + 1,
          salary: employee.salary + salaryIncrease,
          pressure: Math.min(employee.pressure + 2, 100),
          loyalty: Math.min(employee.loyalty + 1, 100),
          management: employee.management + 2,
          negotiation: employee.negotiation + 2,
          execution: employee.execution + 2
        }
      }),
      prisma.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { decrement: 20000 },
          monthlyExpense: { increment: salaryIncrease }
        }
      })
    ]);

    return toEmployeeRecord(updated);
  },

  async grantEmployeeEquity(accountId, serverId, employeeId) {
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

    const employee = await prisma.playerEmployee.findFirst({
      where: {
        id: employeeId,
        profileId: profile.id,
        isActive: true
      }
    });
    if (employee === null) {
      return "EMPLOYEE_NOT_FOUND";
    }

    if (profile.founderEquityBasisPoints < 100) {
      return "EQUITY_LIMIT_REACHED";
    }

    const [updated] = await prisma.$transaction([
      prisma.playerEmployee.update({
        where: { id: employee.id },
        data: {
          equityBasisPoints: employee.equityBasisPoints + 100,
          loyalty: Math.min(employee.loyalty + 8, 100)
        }
      }),
      prisma.playerProfile.update({
        where: { id: profile.id },
        data: {
          founderEquityBasisPoints: { decrement: 100 },
          employeeSatisfaction: { increment: 2 }
        }
      })
    ]);

    return toEmployeeRecord(updated);
  },

  async dismissEmployee(accountId, serverId, employeeId) {
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

    const employee = await prisma.playerEmployee.findFirst({
      where: {
        id: employeeId,
        profileId: profile.id,
        isActive: true
      }
    });
    if (employee === null) {
      return "EMPLOYEE_NOT_FOUND";
    }

    const updatedProfile = await prisma.$transaction(async (tx) => {
      await tx.playerEmployee.update({
        where: { id: employee.id },
        data: {
          isActive: false,
          assignedTo: null
        }
      });

      return tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          monthlyExpense: { decrement: employee.salary },
          employeeSatisfaction: { decrement: 5 },
          reputation: { decrement: 2000 },
          pendingEventCount: { increment: 1 }
        }
      });
    });

    return toCompanyFinanceRecord(toProfileRecord(updatedProfile));
  },

  async listProjects(accountId, serverId) {
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

    const projects = await prisma.playerProject.findMany({
      where: { profileId: profile.id },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }]
    });
    const assignedIds = projects
      .map((project) => project.assignedEmployeeId)
      .filter((employeeId): employeeId is string => employeeId !== null);
    const assignedEmployees = await prisma.playerEmployee.findMany({
      where: { id: { in: assignedIds }, profileId: profile.id },
      select: { id: true, management: true, negotiation: true, execution: true }
    });
    const employeesById = new Map(assignedEmployees.map((employee) => [employee.id, employee]));

    return projects.map((project) => toProjectRecord(project, project.assignedEmployeeId === null ? null : employeesById.get(project.assignedEmployeeId)));
  },

  async startProject(accountId, serverId) {
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

    const [configs, ownedProjects] = await Promise.all([
      prisma.projectConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.playerProject.findMany({ where: { profileId: profile.id }, select: { configId: true } })
    ]);
    const ownedConfigIds = new Set(ownedProjects.map((project) => project.configId));
    const selected = configs.find((config) => !ownedConfigIds.has(config.id));
    if (selected === undefined) {
      return "NO_PROJECT_AVAILABLE";
    }

    const created = await prisma.playerProject.create({
      data: {
        id: randomUUID(),
        profileId: profile.id,
        configId: selected.id,
        name: selected.name,
        category: selected.category,
        cycleDays: selected.cycleDays,
        budget: selected.budget,
        risk: selected.risk,
        successRateBase: selected.successRateBase,
        revenueReward: selected.revenueReward,
        reputationReward: selected.reputationReward,
        customerSatisfactionReward: selected.customerSatisfactionReward,
        failurePenalty: selected.failurePenalty,
        summary: selected.summary
      }
    });

    return toProjectRecord(created);
  },

  async assignProjectEmployee(accountId, serverId, projectId, employeeId) {
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

    const [project, employee] = await Promise.all([
      prisma.playerProject.findFirst({
        where: {
          id: projectId,
          profileId: profile.id,
          status: { in: ["active", "ready"] }
        }
      }),
      prisma.playerEmployee.findFirst({
        where: {
          id: employeeId,
          profileId: profile.id,
          isActive: true
        }
      })
    ]);
    if (project === null) {
      return "PROJECT_NOT_FOUND";
    }
    if (employee === null) {
      return "EMPLOYEE_NOT_FOUND";
    }

    const updated = await prisma.playerProject.update({
      where: { id: project.id },
      data: {
        assignedEmployeeId: employee.id,
        assignedEmployeeName: employee.name
      }
    });

    return toProjectRecord(updated, employee);
  },

  async advanceProject(accountId, serverId, projectId) {
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

    const project = await prisma.playerProject.findFirst({
      where: {
        id: projectId,
        profileId: profile.id
      }
    });
    if (project === null) {
      return "PROJECT_NOT_FOUND";
    }
    if (project.status === "settled" || project.status === "failed") {
      return "PROJECT_ALREADY_SETTLED";
    }

    const employee =
      project.assignedEmployeeId === null
        ? null
        : await prisma.playerEmployee.findFirst({
            where: { id: project.assignedEmployeeId, profileId: profile.id, isActive: true }
          });
    const progress = Math.min(100, project.progress + calculateProjectProgressGain(employee?.execution));
    const updated = await prisma.playerProject.update({
      where: { id: project.id },
      data: {
        progress,
        stage: progress >= 100 ? project.stage + 1 : project.stage,
        status: progress >= 100 ? "ready" : "active"
      }
    });

    return toProjectRecord(updated, employee);
  },

  async settleProject(accountId, serverId, projectId) {
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

    const project = await prisma.playerProject.findFirst({
      where: {
        id: projectId,
        profileId: profile.id
      }
    });
    if (project === null) {
      return "PROJECT_NOT_FOUND";
    }

    const employee =
      project.assignedEmployeeId === null
        ? null
        : await prisma.playerEmployee.findFirst({
            where: { id: project.assignedEmployeeId, profileId: profile.id, isActive: true }
          });

    if (project.settledAt !== null) {
      return {
        project: toProjectRecord(project, employee),
        finance: toCompanyFinanceRecord(toProfileRecord(profile))
      };
    }

    if (project.progress < 100 || project.status !== "ready") {
      return "PROJECT_INCOMPLETE";
    }

    const successRate = calculateProjectSuccessRate({
      baseRate: project.successRateBase,
      employeeManagement: employee?.management,
      employeeNegotiation: employee?.negotiation,
      employeeExecution: employee?.execution
    });
    const isSuccess = Math.random() * 100 < successRate;

    const settled = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.playerProject.update({
        where: { id: project.id },
        data: {
          status: isSuccess ? "settled" : "failed",
          result: isSuccess ? "success" : "failure",
          settledAt: new Date()
        }
      });

      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: isSuccess
          ? {
              cash: { increment: project.revenueReward },
              monthlyIncome: { increment: Math.round(project.revenueReward * 0.18) },
              reputation: { increment: project.reputationReward },
              customerSatisfaction: { increment: project.customerSatisfactionReward }
            }
          : {
              cash: { decrement: project.failurePenalty },
              reputation: { decrement: Math.max(1000, project.reputationReward) },
              customerSatisfaction: { decrement: Math.max(3, project.customerSatisfactionReward) },
              pendingEventCount: { increment: 1 }
            }
      });

      return { project: updatedProject, profile: updatedProfile };
    });

    return {
      project: toProjectRecord(settled.project, employee),
      finance: toCompanyFinanceRecord(toProfileRecord(settled.profile))
    };
  },

  async disconnect() {
    await prisma.$disconnect();
  }
});
