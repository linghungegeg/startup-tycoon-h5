import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";

import { createApiServer } from "../src/http.js";
import type { ApiConfig } from "../src/config.js";
import { pickRecruitCandidate } from "../src/employee.js";
import { calculateFinanceReport } from "../src/finance.js";
import { createPasswordRecord } from "../src/password.js";
import { calculateProjectSuccessRate } from "../src/project.js";
import type {
  AccountRecord,
  AdminUserRecord,
  AvatarRecord,
  CompanyFinanceRecord,
  CompanyFinanceSettlementRecord,
  EmployeeRecord,
  GameRepository,
  PlayerProfileRecord,
  ProjectRecord,
  ProjectSettlementRecord,
  ServerRecord,
  TaskRecord
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
      rewardLabel: "资金 8万、体力 20",
      rewardCash: 80000,
      rewardPlatformCoins: 0,
      rewardReputation: 0,
      rewardActionPower: 20,
      guideAction: "前往项目",
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
    }
  ];
  const taskProgress = new Map<string, { progress: number; dailyDate?: string; claimedAt?: string }>();
  const financeReports = new Map<string, CompanyFinanceSettlementRecord>();

  const getProfileByAccountAndServer = (accountId: string, serverId: string): PlayerProfileRecord | undefined =>
    profiles.get(`${accountId}:${serverId}`);

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
      name: "zero values stay stable",
      input: { cash: 0, monthlyIncome: 0, monthlyExpense: 0, totalDebt: 0, valuation: 0 },
      expected: { netCashFlow: 0, cashAfterSettlement: 0, debtRatioBasisPoints: 0, riskStatus: "稳健" }
    },
    {
      name: "high debt ratio becomes warning",
      input: { cash: 1000, monthlyIncome: 0, monthlyExpense: 0, totalDebt: 7000, valuation: 10000 },
      expected: { netCashFlow: 0, cashAfterSettlement: 1000, debtRatioBasisPoints: 7000, riskStatus: "预警" }
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
    assert.equal(status.body.data?.netCashFlow, 512000);
    assert.equal(status.body.data?.riskStatus, "稳健");

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
    assert.equal(settled.body.data?.reportMonth, 1);
    assert.equal(settled.body.data?.endingCash, 2962000);
    assert.equal(settled.body.data?.financeMonth, 2);

    const duplicate = await requestJson<CompanyFinanceSettlementRecord>(baseUrl, "/finance/settle-month", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ serverId: "s1", reportMonth: 1 })
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.data?.endingCash, settled.body.data?.endingCash);
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
