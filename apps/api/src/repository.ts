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
  rewardCash: number;
  rewardPlatformCoins: number;
  rewardReputation: number;
  rewardActionPower: number;
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

export type EventOptionRecord = {
  key: "A" | "B";
  label: string;
  impactPreview: string;
};

export type EventRecord = {
  id: string;
  configId: string;
  title: string;
  source: string;
  channel: string;
  summary: string;
  context: string;
  options: EventOptionRecord[];
  status: "pending" | "resolved";
  selectedOption: "A" | "B" | null;
  resultSummary: string | null;
  knowledgeTitle: string | null;
  knowledgeUnlocked: boolean;
  riskExplanation: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type EventChoiceRecord = {
  event: EventRecord;
  finance: CompanyFinanceRecord;
  followupEvent: EventRecord | null;
  result: {
    summary: string;
    riskExplanation: string;
    knowledgeUnlocked: boolean;
    followupEventId: string | null;
  };
};

export type LoanOfferRecord = {
  id: string;
  name: string;
  lender: string;
  principal: number;
  annualRateBasisPoints: number;
  termMonths: number;
  monthlyPayment: number;
  creditRequired: string;
  summary: string;
  isAvailable: boolean;
  lockedReason: string | null;
};

export type LoanRecord = {
  id: string;
  configId: string;
  name: string;
  lender: string;
  principal: number;
  remainingPrincipal: number;
  annualRateBasisPoints: number;
  termMonths: number;
  remainingMonths: number;
  monthlyPayment: number;
  overduePeriods: number;
  penaltyAccrued: number;
  status: "active" | "overdue" | "settled";
  createdAt: string;
  settledAt: string | null;
};

export type LoanCenterRecord = {
  offers: LoanOfferRecord[];
  loans: LoanRecord[];
  finance: CompanyFinanceRecord;
  crisis: {
    isActive: boolean;
    level: "none" | "cashflow" | "debt" | "bankruptcy";
    summary: string;
    routes: Array<{
      id: "financing" | "cost_cut" | "restructure";
      title: string;
      impact: string;
    }>;
  };
};

export type LoanActionRecord = {
  loan: LoanRecord | null;
  loanCenter: LoanCenterRecord;
  result: string;
};

export type FundingOfferRecord = {
  id: string;
  roundName: string;
  investorName: string;
  focus: string;
  amount: number;
  preMoneyValuation: number;
  postMoneyValuation: number;
  equityBasisPoints: number;
  successRate: number;
  debtToleranceBasisPoints: number;
  boardPressure: number;
  term: string;
  summary: string;
  isAvailable: boolean;
  lockedReason: string | null;
};

export type FundingRecord = {
  id: string;
  investorId: string;
  roundName: string;
  investorName: string;
  amount: number;
  preMoneyValuation: number;
  postMoneyValuation: number;
  equityBasisPoints: number;
  successRate: number;
  boardPressure: number;
  term: string;
  status: "pending" | "funded" | "failed";
  resultSummary: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type FundingCenterRecord = {
  offers: FundingOfferRecord[];
  fundings: FundingRecord[];
  finance: CompanyFinanceRecord;
};

export type FundingActionRecord = {
  funding: FundingRecord;
  fundingCenter: FundingCenterRecord;
  result: string;
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
  listEvents(accountId: string, serverId: string): Promise<EventRecord[] | "PLAYER_NOT_FOUND">;
  chooseEvent(accountId: string, serverId: string, eventId: string, option: "A" | "B"): Promise<EventChoiceRecord | "PLAYER_NOT_FOUND" | "EVENT_NOT_FOUND" | "EVENT_ALREADY_RESOLVED" | "INVALID_EVENT_OPTION">;
  listLoans(accountId: string, serverId: string): Promise<LoanCenterRecord | "PLAYER_NOT_FOUND">;
  applyLoan(accountId: string, serverId: string, loanConfigId: string): Promise<LoanActionRecord | "PLAYER_NOT_FOUND" | "LOAN_NOT_FOUND" | "CREDIT_NOT_ENOUGH" | "LOAN_ALREADY_ACTIVE">;
  repayLoan(accountId: string, serverId: string, loanId: string, mode: "scheduled" | "full"): Promise<LoanActionRecord | "PLAYER_NOT_FOUND" | "LOAN_NOT_FOUND" | "INSUFFICIENT_CASH">;
  settleLoanPeriod(accountId: string, serverId: string): Promise<LoanActionRecord | "PLAYER_NOT_FOUND" | "NO_ACTIVE_LOAN">;
  resolveCrisis(accountId: string, serverId: string, route: "financing" | "cost_cut" | "restructure"): Promise<LoanCenterRecord | "PLAYER_NOT_FOUND" | "CRISIS_NOT_ACTIVE" | "INVALID_CRISIS_ROUTE">;
  listFundings(accountId: string, serverId: string): Promise<FundingCenterRecord | "PLAYER_NOT_FOUND">;
  startFunding(accountId: string, serverId: string, investorId: string): Promise<FundingActionRecord | "PLAYER_NOT_FOUND" | "INVESTOR_NOT_FOUND" | "FUNDING_LOCKED" | "FUNDING_ALREADY_ACTIVE">;
  settleFunding(accountId: string, serverId: string, fundingId: string): Promise<FundingActionRecord | "PLAYER_NOT_FOUND" | "FUNDING_NOT_FOUND" | "FUNDING_ALREADY_SETTLED">;
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

const readEventStatus = (status: string): EventRecord["status"] =>
  status === "resolved" ? "resolved" : "pending";

const readEventOption = (option: string | null): EventRecord["selectedOption"] =>
  option === "A" || option === "B" ? option : null;

const formatEventImpact = (cash: number, reputation: number, customerSatisfaction: number, riskDelta: number): string => {
  const parts = [
    cash === 0 ? undefined : `现金${cash > 0 ? "+" : ""}${cash}`,
    reputation === 0 ? undefined : `声望${reputation > 0 ? "+" : ""}${reputation}`,
    customerSatisfaction === 0 ? undefined : `满意度${customerSatisfaction > 0 ? "+" : ""}${customerSatisfaction}`,
    riskDelta === 0 ? undefined : `风险${riskDelta > 0 ? "+" : ""}${riskDelta}`
  ].filter((part): part is string => part !== undefined);

  return parts.length === 0 ? "经营影响稳定" : parts.join(" / ");
};

const toEventRecord = (event: {
  id: string;
  configId: string;
  status: string;
  selectedOption: string | null;
  resultSummary: string | null;
  knowledgeUnlocked: boolean;
  createdAt: Date;
  resolvedAt: Date | null;
  config: {
    title: string;
    source: string;
    channel: string;
    summary: string;
    context: string;
    optionA: string;
    optionAResult: string;
    optionACash: number;
    optionAReputation: number;
    optionACustomerSatisfaction: number;
    optionARiskDelta: number;
    optionB: string;
    optionBResult: string;
    optionBCash: number;
    optionBReputation: number;
    optionBCustomerSatisfaction: number;
    optionBRiskDelta: number;
    knowledgeTitle: string | null;
    riskExplanation: string;
  };
}): EventRecord => ({
  id: event.id,
  configId: event.configId,
  title: event.config.title,
  source: event.config.source,
  channel: event.config.channel,
  summary: event.config.summary,
  context: event.config.context,
  options: [
    {
      key: "A",
      label: event.config.optionA,
      impactPreview: formatEventImpact(
        event.config.optionACash,
        event.config.optionAReputation,
        event.config.optionACustomerSatisfaction,
        event.config.optionARiskDelta
      )
    },
    {
      key: "B",
      label: event.config.optionB,
      impactPreview: formatEventImpact(
        event.config.optionBCash,
        event.config.optionBReputation,
        event.config.optionBCustomerSatisfaction,
        event.config.optionBRiskDelta
      )
    }
  ],
  status: readEventStatus(event.status),
  selectedOption: readEventOption(event.selectedOption),
  resultSummary: event.resultSummary,
  knowledgeTitle: event.config.knowledgeTitle,
  knowledgeUnlocked: event.knowledgeUnlocked,
  riskExplanation: event.config.riskExplanation,
  createdAt: event.createdAt.toISOString(),
  resolvedAt: event.resolvedAt?.toISOString() ?? null
});

const readLoanStatus = (status: string): LoanRecord["status"] =>
  status === "overdue" || status === "settled" ? status : "active";

const creditRank = (creditRating: string): number => {
  if (creditRating === "A") {
    return 3;
  }
  if (creditRating === "B") {
    return 2;
  }
  if (creditRating === "C") {
    return 1;
  }
  return 0;
};

const downgradeCredit = (creditRating: string): string => {
  if (creditRating === "A") {
    return "B";
  }
  if (creditRating === "B") {
    return "C";
  }
  return "D";
};

const calculatePrincipalPayment = (loan: { remainingPrincipal: number; remainingMonths: number }): number => {
  return Math.min(loan.remainingPrincipal, Math.max(1, Math.ceil(loan.remainingPrincipal / Math.max(loan.remainingMonths, 1))));
};

const toLoanRecord = (loan: {
  id: string;
  configId: string;
  name: string;
  lender: string;
  principal: number;
  remainingPrincipal: number;
  annualRateBasisPoints: number;
  termMonths: number;
  remainingMonths: number;
  monthlyPayment: number;
  overduePeriods: number;
  penaltyAccrued: number;
  status: string;
  createdAt: Date;
  settledAt: Date | null;
}): LoanRecord => ({
  id: loan.id,
  configId: loan.configId,
  name: loan.name,
  lender: loan.lender,
  principal: loan.principal,
  remainingPrincipal: loan.remainingPrincipal,
  annualRateBasisPoints: loan.annualRateBasisPoints,
  termMonths: loan.termMonths,
  remainingMonths: loan.remainingMonths,
  monthlyPayment: loan.monthlyPayment,
  overduePeriods: loan.overduePeriods,
  penaltyAccrued: loan.penaltyAccrued,
  status: readLoanStatus(loan.status),
  createdAt: loan.createdAt.toISOString(),
  settledAt: loan.settledAt?.toISOString() ?? null
});

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const toFundingRecord = (funding: {
  id: string;
  investorId: string;
  roundName: string;
  investorName: string;
  amount: number;
  preMoneyValuation: number;
  postMoneyValuation: number;
  equityBasisPoints: number;
  successRate: number;
  boardPressure: number;
  term: string;
  status: string;
  resultSummary: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}): FundingRecord => ({
  id: funding.id,
  investorId: funding.investorId,
  roundName: funding.roundName,
  investorName: funding.investorName,
  amount: funding.amount,
  preMoneyValuation: funding.preMoneyValuation,
  postMoneyValuation: funding.postMoneyValuation,
  equityBasisPoints: funding.equityBasisPoints,
  successRate: funding.successRate,
  boardPressure: funding.boardPressure,
  term: funding.term,
  status: funding.status === "funded" || funding.status === "failed" ? funding.status : "pending",
  resultSummary: funding.resultSummary,
  createdAt: funding.createdAt.toISOString(),
  resolvedAt: funding.resolvedAt?.toISOString() ?? null
});

const calculateFundingOffer = (
  profile: PlayerProfileRecord,
  config: {
    id: string;
    roundName: string;
    name: string;
    focus: string;
    ticketSize: number;
    valuationMultiplierBasisPoints: number;
    equityBasisPoints: number;
    successRateBase: number;
    debtToleranceBasisPoints: number;
    boardPressure: number;
    term: string;
    summary: string;
  },
  completedInvestorIds: Set<string>
): FundingOfferRecord => {
  const finance = toCompanyFinanceRecord(profile);
  const reputationBonus = clamp(Math.floor((profile.reputation - 1000000) / 100000), -8, 8);
  const cashflowBonus = finance.netCashFlow >= 300000 ? 6 : finance.netCashFlow >= 0 ? 3 : -10;
  const debtPenalty = Math.ceil(finance.debtRatioBasisPoints / 1000) * 4;
  const creditPenalty = profile.creditRating === "A" ? 0 : profile.creditRating === "B" ? 8 : profile.creditRating === "C" ? 18 : 30;
  const riskPenalty = finance.riskStatus === "稳健" ? 0 : finance.riskStatus === "预警" ? 8 : 16;
  const successRate = clamp(config.successRateBase + reputationBonus + cashflowBonus - debtPenalty - creditPenalty - riskPenalty, 5, 95);
  const debtPressureBasisPoints = Math.min(3000, Math.max(0, finance.debtRatioBasisPoints - 2000));
  const valuationBasisPoints = Math.max(6000, config.valuationMultiplierBasisPoints - debtPressureBasisPoints);
  const preMoneyValuation = Math.max(1000000, Math.round((profile.valuation * valuationBasisPoints) / 10000));
  const postMoneyValuation = preMoneyValuation + config.ticketSize;
  const isDebtAcceptable = finance.debtRatioBasisPoints <= config.debtToleranceBasisPoints;
  const isEquityEnough = profile.founderEquityBasisPoints > config.equityBasisPoints;
  const isAvailable = isDebtAcceptable && isEquityEnough && !completedInvestorIds.has(config.id);

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
    isAvailable,
    lockedReason: completedInvestorIds.has(config.id)
      ? "本轮已完成"
      : !isEquityEnough
        ? "创始人股权不足"
        : !isDebtAcceptable
          ? "负债率过高，条款暂不可接受"
          : null
  };
};

const toFundingCenterRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord
): Promise<FundingCenterRecord> => {
  const [configs, fundings] = await Promise.all([
    prisma.investorConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.playerFunding.findMany({
      where: { profileId: profile.id },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);
  const completedInvestorIds = new Set(fundings.filter((funding) => funding.status === "funded").map((funding) => funding.investorId));

  return {
    offers: configs.map((config) => calculateFundingOffer(profile, config, completedInvestorIds)),
    fundings: fundings.map(toFundingRecord),
    finance: toCompanyFinanceRecord(profile)
  };
};

const toLoanCenterRecord = async (
  prisma: PrismaClient,
  profile: PlayerProfileRecord
): Promise<LoanCenterRecord> => {
  const [configs, loans] = await Promise.all([
    prisma.loanConfig.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.playerLoan.findMany({
      where: { profileId: profile.id },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }]
    })
  ]);
  const activeConfigIds = new Set(loans.filter((loan) => loan.status !== "settled").map((loan) => loan.configId));
  const finance = toCompanyFinanceRecord(profile);
  const hasOverdueLoan = loans.some((loan) => loan.status === "overdue");
  const crisisLevel: LoanCenterRecord["crisis"]["level"] =
    finance.cash < 0 || finance.debtRatioBasisPoints >= 9000
      ? "bankruptcy"
      : finance.riskStatus === "资金紧张" || hasOverdueLoan
        ? "cashflow"
        : finance.debtRatioBasisPoints >= 6000
          ? "debt"
          : "none";

  return {
    offers: configs.map((config) => {
      const isCreditEnough = creditRank(profile.creditRating) >= creditRank(config.creditRequired);
      const hasActiveLoan = activeConfigIds.has(config.id);
      return {
        id: config.id,
        name: config.name,
        lender: config.lender,
        principal: config.principal,
        annualRateBasisPoints: config.annualRateBasisPoints,
        termMonths: config.termMonths,
        monthlyPayment: config.monthlyPayment,
        creditRequired: config.creditRequired,
        summary: config.summary,
        isAvailable: isCreditEnough && !hasActiveLoan,
        lockedReason: !isCreditEnough ? "信用评级不足" : hasActiveLoan ? "同类贷款未结清" : null
      };
    }),
    loans: loans.map(toLoanRecord),
    finance,
    crisis: {
      isActive: crisisLevel !== "none",
      level: crisisLevel,
      summary:
        crisisLevel === "bankruptcy"
          ? "公司已接近破产保护线，需要立即选择重组或止血路线。"
          : crisisLevel === "cashflow"
            ? "现金流进入资金紧张状态，需要补充现金或压缩支出。"
            : crisisLevel === "debt"
              ? "负债率偏高，信用和后续融资条件正在承压。"
              : "现金流和负债处于可控区间。",
      routes: [
        { id: "financing", title: "融资谈判", impact: "现金+20万，创始人股权-2%，声望-300。" },
        { id: "cost_cut", title: "降本裁撤", impact: "月支出-10万，员工满意度-6，声望-800。" },
        { id: "restructure", title: "债务重组", impact: "负债-20万，信用降级，声望-1200。" }
      ]
    }
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
    rewardCash: number;
    rewardPlatformCoins: number;
    rewardReputation: number;
    rewardActionPower: number;
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
    rewardCash: config.rewardCash,
    rewardPlatformCoins: config.rewardPlatformCoins,
    rewardReputation: config.rewardReputation,
    rewardActionPower: config.rewardActionPower,
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

    const progress = await prisma.$transaction(async (tx) => {
      const savedProgress = await tx.playerTaskProgress.upsert({
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

      await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { increment: config.rewardCash },
          platformCoins: { increment: config.rewardPlatformCoins },
          reputation: { increment: config.rewardReputation },
          actionPower: { increment: config.rewardActionPower }
        }
      });

      return savedProgress;
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

  async listEvents(accountId, serverId) {
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

    const existingCount = await prisma.playerEvent.count({ where: { profileId: profile.id } });
    if (existingCount === 0) {
      const firstConfig = await prisma.eventConfig.findFirst({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      });
      if (firstConfig !== null) {
        await prisma.playerEvent.create({
          data: {
            id: randomUUID(),
            profileId: profile.id,
            configId: firstConfig.id
          }
        });
      }
    }

    const events = await prisma.playerEvent.findMany({
      where: { profileId: profile.id },
      include: { config: true },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }]
    });
    const pendingCount = events.filter((event) => event.status !== "resolved").length;
    if (pendingCount !== profile.pendingEventCount) {
      await prisma.playerProfile.update({
        where: { id: profile.id },
        data: { pendingEventCount: pendingCount }
      });
    }

    return events.map(toEventRecord);
  },

  async chooseEvent(accountId, serverId, eventId, option) {
    if (option !== "A" && option !== "B") {
      return "INVALID_EVENT_OPTION";
    }

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

    const event = await prisma.playerEvent.findFirst({
      where: {
        id: eventId,
        profileId: profile.id
      },
      include: { config: true }
    });
    if (event === null) {
      return "EVENT_NOT_FOUND";
    }
    if (event.status === "resolved") {
      return "EVENT_ALREADY_RESOLVED";
    }

    const cash = option === "A" ? event.config.optionACash : event.config.optionBCash;
    const reputation = option === "A" ? event.config.optionAReputation : event.config.optionBReputation;
    const customerSatisfaction =
      option === "A" ? event.config.optionACustomerSatisfaction : event.config.optionBCustomerSatisfaction;
    const riskDelta = option === "A" ? event.config.optionARiskDelta : event.config.optionBRiskDelta;
    const resultSummary = option === "A" ? event.config.optionAResult : event.config.optionBResult;

    const settled = await prisma.$transaction(async (tx) => {
      const updatedEvent = await tx.playerEvent.update({
        where: { id: event.id },
        data: {
          status: "resolved",
          selectedOption: option,
          resultSummary,
          knowledgeUnlocked: event.config.knowledgeTitle !== null,
          resolvedAt: new Date()
        },
        include: { config: true }
      });

      let followupEvent: typeof updatedEvent | null = null;
      if (event.config.followupEventId !== null) {
        const followupConfig = await tx.eventConfig.findUnique({
          where: { id: event.config.followupEventId }
        });
        const existingFollowup = await tx.playerEvent.findUnique({
          where: {
            profileId_configId: {
              profileId: profile.id,
              configId: event.config.followupEventId
            }
          },
          include: { config: true }
        });
        if (existingFollowup !== null) {
          followupEvent = existingFollowup;
        } else if (followupConfig !== null) {
          followupEvent = await tx.playerEvent.create({
            data: {
              id: randomUUID(),
              profileId: profile.id,
              configId: followupConfig.id
            },
            include: { config: true }
          });
        }
      }

      const pendingCount = await tx.playerEvent.count({
        where: {
          profileId: profile.id,
          status: "pending"
        }
      });
      const riskStatus =
        riskDelta > 0 ? "预警" : riskDelta < 0 && pendingCount === 0 && profile.riskStatus !== "资金紧张" ? "稳健" : profile.riskStatus;

      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { increment: cash },
          reputation: { increment: reputation },
          customerSatisfaction: { increment: customerSatisfaction },
          riskStatus,
          pendingEventCount: pendingCount
        }
      });

      return { event: updatedEvent, profile: updatedProfile, followupEvent };
    });

    const eventRecord = toEventRecord(settled.event);
    return {
      event: eventRecord,
      finance: toCompanyFinanceRecord(toProfileRecord(settled.profile)),
      followupEvent: settled.followupEvent === null ? null : toEventRecord(settled.followupEvent),
      result: {
        summary: resultSummary,
        riskExplanation: event.config.riskExplanation,
        knowledgeUnlocked: event.config.knowledgeTitle !== null,
        followupEventId: settled.followupEvent?.id ?? null
      }
    };
  },

  async listLoans(accountId, serverId) {
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

    return toLoanCenterRecord(prisma, toProfileRecord(profile));
  },

  async applyLoan(accountId, serverId, loanConfigId) {
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

    const config = await prisma.loanConfig.findUnique({ where: { id: loanConfigId } });
    if (config === null) {
      return "LOAN_NOT_FOUND";
    }
    if (creditRank(profile.creditRating) < creditRank(config.creditRequired)) {
      return "CREDIT_NOT_ENOUGH";
    }

    const activeLoan = await prisma.playerLoan.findFirst({
      where: {
        profileId: profile.id,
        configId: config.id,
        status: { not: "settled" }
      }
    });
    if (activeLoan !== null) {
      return "LOAN_ALREADY_ACTIVE";
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.playerLoan.create({
        data: {
          id: randomUUID(),
          profileId: profile.id,
          configId: config.id,
          name: config.name,
          lender: config.lender,
          principal: config.principal,
          remainingPrincipal: config.principal,
          annualRateBasisPoints: config.annualRateBasisPoints,
          termMonths: config.termMonths,
          remainingMonths: config.termMonths,
          monthlyPayment: config.monthlyPayment
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { increment: config.principal },
          totalDebt: { increment: config.principal },
          debtWarning: "中"
        }
      });
      return { loan, profile: updatedProfile };
    });

    return {
      loan: toLoanRecord(result.loan),
      loanCenter: await toLoanCenterRecord(prisma, toProfileRecord(result.profile)),
      result: `${config.name} 已放款，现金增加 ${config.principal.toLocaleString("zh-CN")}。`
    };
  },

  async repayLoan(accountId, serverId, loanId, mode) {
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

    const loan = await prisma.playerLoan.findFirst({
      where: {
        id: loanId,
        profileId: profile.id,
        status: { not: "settled" }
      }
    });
    if (loan === null) {
      return "LOAN_NOT_FOUND";
    }

    const principalPayment = mode === "full" ? loan.remainingPrincipal : calculatePrincipalPayment(loan);
    const payment = mode === "full" ? loan.remainingPrincipal + loan.penaltyAccrued : loan.monthlyPayment + loan.penaltyAccrued;
    if (profile.cash < payment) {
      return "INSUFFICIENT_CASH";
    }

    const result = await prisma.$transaction(async (tx) => {
      const remainingPrincipal = Math.max(0, loan.remainingPrincipal - principalPayment);
      const remainingMonths = mode === "full" || remainingPrincipal === 0 ? 0 : Math.max(0, loan.remainingMonths - 1);
      const status = remainingPrincipal === 0 ? "settled" : "active";
      const updatedLoan = await tx.playerLoan.update({
        where: { id: loan.id },
        data: {
          remainingPrincipal,
          remainingMonths,
          penaltyAccrued: 0,
          overduePeriods: status === "settled" ? loan.overduePeriods : 0,
          status,
          settledAt: status === "settled" ? new Date() : null
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          cash: { decrement: payment },
          totalDebt: { decrement: Math.min(profile.totalDebt, principalPayment + loan.penaltyAccrued) },
          debtWarning: remainingPrincipal === 0 ? "低" : profile.debtWarning
        }
      });
      return { loan: updatedLoan, profile: updatedProfile };
    });

    return {
      loan: toLoanRecord(result.loan),
      loanCenter: await toLoanCenterRecord(prisma, toProfileRecord(result.profile)),
      result: mode === "full" ? "提前结清完成，后续月供压力解除。" : "本期还款完成，剩余本金和期数已更新。"
    };
  },

  async settleLoanPeriod(accountId, serverId) {
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

    const loan = await prisma.playerLoan.findFirst({
      where: {
        profileId: profile.id,
        status: { in: ["active", "overdue"] }
      },
      orderBy: [{ overduePeriods: "desc" }, { createdAt: "asc" }]
    });
    if (loan === null) {
      return "NO_ACTIVE_LOAN";
    }

    if (profile.cash >= loan.monthlyPayment + loan.penaltyAccrued) {
      const principalPayment = calculatePrincipalPayment(loan);
      const payment = loan.monthlyPayment + loan.penaltyAccrued;
      const result = await prisma.$transaction(async (tx) => {
        const remainingPrincipal = Math.max(0, loan.remainingPrincipal - principalPayment);
        const status = remainingPrincipal === 0 ? "settled" : "active";
        const updatedLoan = await tx.playerLoan.update({
          where: { id: loan.id },
          data: {
            remainingPrincipal,
            remainingMonths: status === "settled" ? 0 : Math.max(0, loan.remainingMonths - 1),
            penaltyAccrued: 0,
            overduePeriods: status === "settled" ? loan.overduePeriods : 0,
            status,
            settledAt: status === "settled" ? new Date() : null
          }
        });
        const updatedProfile = await tx.playerProfile.update({
          where: { id: profile.id },
          data: {
            cash: { decrement: payment },
            totalDebt: { decrement: Math.min(profile.totalDebt, principalPayment + loan.penaltyAccrued) },
            debtWarning: remainingPrincipal === 0 ? "低" : profile.debtWarning
          }
        });
        return { loan: updatedLoan, profile: updatedProfile };
      });

      return {
        loan: toLoanRecord(result.loan),
        loanCenter: await toLoanCenterRecord(prisma, toProfileRecord(result.profile)),
        result: "本期还款完成，剩余本金和期数已更新。"
      };
    }

    const penalty = Math.max(1000, Math.round(loan.monthlyPayment * 0.08));
    const result = await prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.playerLoan.update({
        where: { id: loan.id },
        data: {
          status: "overdue",
          overduePeriods: { increment: 1 },
          penaltyAccrued: { increment: penalty }
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          totalDebt: { increment: penalty },
          creditRating: downgradeCredit(profile.creditRating),
          riskStatus: "资金紧张",
          debtWarning: "高",
          pendingEventCount: { increment: 1 }
        }
      });
      return { loan: updatedLoan, profile: updatedProfile };
    });

    return {
      loan: toLoanRecord(result.loan),
      loanCenter: await toLoanCenterRecord(prisma, toProfileRecord(result.profile)),
      result: `现金不足，本期逾期并产生罚息 ${penalty.toLocaleString("zh-CN")}。`
    };
  },

  async resolveCrisis(accountId, serverId, route) {
    if (route !== "financing" && route !== "cost_cut" && route !== "restructure") {
      return "INVALID_CRISIS_ROUTE";
    }

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

    const center = await toLoanCenterRecord(prisma, toProfileRecord(profile));
    if (!center.crisis.isActive) {
      return "CRISIS_NOT_ACTIVE";
    }

    const updated = await prisma.playerProfile.update({
      where: { id: profile.id },
      data:
        route === "financing"
          ? {
              cash: { increment: 200000 },
              founderEquityBasisPoints: { decrement: Math.min(profile.founderEquityBasisPoints, 200) },
              reputation: { decrement: 300 },
              riskStatus: "预警"
            }
          : route === "cost_cut"
            ? {
                monthlyExpense: { decrement: Math.min(profile.monthlyExpense, 100000) },
                employeeSatisfaction: { decrement: 6 },
                reputation: { decrement: 800 },
                riskStatus: "预警"
              }
            : {
                totalDebt: { decrement: Math.min(profile.totalDebt, 200000) },
                creditRating: downgradeCredit(profile.creditRating),
                reputation: { decrement: 1200 },
                debtWarning: profile.totalDebt > 400000 ? "中" : "低",
                riskStatus: "预警"
              }
    });

    return toLoanCenterRecord(prisma, toProfileRecord(updated));
  },

  async listFundings(accountId, serverId) {
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

    return toFundingCenterRecord(prisma, toProfileRecord(profile));
  },

  async startFunding(accountId, serverId, investorId) {
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

    const config = await prisma.investorConfig.findUnique({ where: { id: investorId } });
    if (config === null) {
      return "INVESTOR_NOT_FOUND";
    }

    const fundings = await prisma.playerFunding.findMany({ where: { profileId: profile.id } });
    const completedInvestorIds = new Set(fundings.filter((funding) => funding.status === "funded").map((funding) => funding.investorId));
    const offer = calculateFundingOffer(toProfileRecord(profile), config, completedInvestorIds);
    if (!offer.isAvailable) {
      return "FUNDING_LOCKED";
    }
    const activeFunding = fundings.find((funding) => funding.investorId === investorId && funding.status === "pending");
    if (activeFunding !== undefined) {
      return "FUNDING_ALREADY_ACTIVE";
    }

    const funding = await prisma.playerFunding.create({
      data: {
        id: randomUUID(),
        profileId: profile.id,
        investorId: config.id,
        roundName: config.roundName,
        investorName: config.name,
        amount: offer.amount,
        preMoneyValuation: offer.preMoneyValuation,
        postMoneyValuation: offer.postMoneyValuation,
        equityBasisPoints: offer.equityBasisPoints,
        successRate: offer.successRate,
        boardPressure: offer.boardPressure,
        term: offer.term
      }
    });

    return {
      funding: toFundingRecord(funding),
      fundingCenter: await toFundingCenterRecord(prisma, toProfileRecord(profile)),
      result: `${config.name} 已进入路演谈判，等待确认条款。`
    };
  },

  async settleFunding(accountId, serverId, fundingId) {
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

    const funding = await prisma.playerFunding.findFirst({
      where: {
        id: fundingId,
        profileId: profile.id
      }
    });
    if (funding === null) {
      return "FUNDING_NOT_FOUND";
    }
    if (funding.status !== "pending") {
      return "FUNDING_ALREADY_SETTLED";
    }

    const isSuccess = funding.successRate >= 50;
    const settled = await prisma.$transaction(async (tx) => {
      const resultSummary = isSuccess
        ? `${funding.investorName} 完成打款，创始人股权稀释 ${(funding.equityBasisPoints / 100).toFixed(1)}%。`
        : `${funding.investorName} 暂缓投资，董事会要求提交替代现金流方案。`;
      const updatedFunding = await tx.playerFunding.update({
        where: { id: funding.id },
        data: {
          status: isSuccess ? "funded" : "failed",
          resultSummary,
          resolvedAt: new Date()
        }
      });
      const updatedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: isSuccess
          ? {
              cash: { increment: funding.amount },
              valuation: funding.postMoneyValuation,
              founderEquityBasisPoints: { decrement: funding.equityBasisPoints },
              reputation: { increment: 600 },
              riskStatus: funding.boardPressure >= 30 ? "预警" : profile.riskStatus
            }
          : {
              reputation: { decrement: 500 },
              riskStatus: "预警",
              pendingEventCount: { increment: 1 }
            }
      });

      if (!isSuccess) {
        const failureConfig = await tx.eventConfig.findUnique({ where: { id: "funding-failed-bridge-plan" } });
        if (failureConfig !== null) {
          await tx.playerEvent.upsert({
            where: {
              profileId_configId: {
                profileId: profile.id,
                configId: failureConfig.id
              }
            },
            update: { status: "pending" },
            create: {
              id: randomUUID(),
              profileId: profile.id,
              configId: failureConfig.id
            }
          });
        }
      }

      return { funding: updatedFunding, profile: updatedProfile, resultSummary };
    });

    return {
      funding: toFundingRecord(settled.funding),
      fundingCenter: await toFundingCenterRecord(prisma, toProfileRecord(settled.profile)),
      result: settled.resultSummary
    };
  },

  async disconnect() {
    await prisma.$disconnect();
  }
});
