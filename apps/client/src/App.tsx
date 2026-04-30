import { type FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";
const SESSION_KEY = "wenziyouxi.client.session";
const SESSION_VERSION = 1;

type OnboardingStep = "auth" | "server" | "avatar" | "profile" | "game";
type AuthMode = "login" | "register";

type ApiSuccess<T> = {
  success: true;
  data: T;
  traceId: string;
};

type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
  traceId: string;
};

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

type AccountSession = {
  accountId: string;
  username: string;
  token: string;
};

type ServerOption = {
  id: string;
  name: string;
  label: string;
  isRecommended: boolean;
};

type AvatarOption = {
  id: string;
  name: string;
  glyph: string;
  specialty: string;
};

type PlayerProfile = {
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

type StoredSession = {
  version: typeof SESSION_VERSION;
  account: AccountSession;
  server: ServerOption;
  avatar: AvatarOption;
  profile: PlayerProfile;
};

type Employee = {
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

type BusinessProject = {
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

type TaskItem = {
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

type CompanyFinance = {
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
  reportMonth?: number;
  endingCash?: number;
};

type EventOption = {
  key: "A" | "B";
  label: string;
  impactPreview: string;
};

type BusinessEvent = {
  id: string;
  configId: string;
  title: string;
  source: string;
  channel: string;
  summary: string;
  context: string;
  options: EventOption[];
  status: "pending" | "resolved";
  selectedOption: "A" | "B" | null;
  resultSummary: string | null;
  knowledgeTitle: string | null;
  knowledgeUnlocked: boolean;
  riskExplanation: string;
  createdAt: string;
  resolvedAt: string | null;
};

type EventChoiceResult = {
  event: BusinessEvent;
  finance: CompanyFinance;
  followupEvent: BusinessEvent | null;
  result: {
    summary: string;
    riskExplanation: string;
    knowledgeUnlocked: boolean;
    followupEventId: string | null;
  };
};

type LoanOffer = {
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

type PlayerLoan = {
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

type LoanCenter = {
  offers: LoanOffer[];
  loans: PlayerLoan[];
  finance: CompanyFinance;
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

type LoanActionResult = {
  loan: PlayerLoan | null;
  loanCenter: LoanCenter;
  result: string;
};

const sideActions = ["财务", "融资", "贷款", "风险", "合同"];
const rightActions = ["首充", "月卡", "礼包", "活动", "排行", "邮件", "VIP"];
const navItems = ["公司", "员工", "项目", "产品", "市场", "商会"];
const eventEntryNames = new Set(["风险", "合同", "邮件"]);
const initialEmployees: Employee[] = [];
const initialProjects: BusinessProject[] = [];
const homePanelContent: Record<string, { title: string; lines: string[]; action: string }> = {
  "财务": {
    title: "财务",
    lines: ["查看现金、月收入、月支出和现金流状态。", "财务数据以后端档案为准，刷新后仍保持一致。"],
    action: "查看财务"
  },
  "融资": {
    title: "融资",
    lines: ["融资入口用于查看投资合作和公司估值进展。", "融资判断会受到现金流、团队能力和市场环境影响。"],
    action: "查看融资"
  },
  "贷款": {
    title: "贷款",
    lines: ["贷款入口用于查看授信、还款和负债预警。", "负债状态会在主页顶部同步提示。"],
    action: "查看贷款"
  },
  "风险": {
    title: "风险",
    lines: ["风险入口汇总合同、现金流、用工和舆情提醒。", "待处理事件会在主页状态区展示。"],
    action: "查看风险"
  },
  "合同": {
    title: "合同",
    lines: ["合同入口用于处理客户回款、交付条款和合规复核。", "合同状态会影响后续项目和经营事件。"],
    action: "查看合同"
  },
  "首充": {
    title: "首充",
    lines: ["首充入口提供创业启动礼包。", "平台币相关消费以后端记录为准。"],
    action: "查看首充"
  },
  "首充豪礼": {
    title: "首充豪礼",
    lines: ["首充任意金额可领取创业启动礼包。", "礼包含钻石、资金和橙色员工招募券。"],
    action: "前往充值"
  },
  "月卡": {
    title: "月卡",
    lines: ["月卡提供每日平台币、行动力和经营补贴。", "每日领取记录由后端系统记录。"],
    action: "查看月卡"
  },
  "礼包": {
    title: "礼包",
    lines: ["礼包入口按公司阶段、活动和经营压力展示。", "礼包不直接替代现金流经营。"],
    action: "查看礼包"
  },
  "活动": {
    title: "活动",
    lines: ["活动入口展示开服目标、限时挑战和赛季任务。", "活动榜只在活动开启时展示。"],
    action: "查看活动"
  },
  "排行": {
    title: "排行",
    lines: ["查看本服公司估值、项目收益和商会贡献排名。", "排行榜每日按服务器时间刷新。"],
    action: "查看排行"
  },
  "VIP": {
    title: "VIP",
    lines: ["VIP 入口展示身份、每日礼包和便利权益。", "游戏内平台币消费会计入 VIP 经验。"],
    action: "查看 VIP"
  },
  "福利中心": {
    title: "福利中心",
    lines: ["每日登录、在线时长和成长节点奖励集中领取。", "未领取奖励会在入口显示红点。"],
    action: "领取福利"
  },
  "七日目标": {
    title: "七日目标",
    lines: ["完成七日创业目标，解锁高级员工和稀有项目。", "当前目标：完成 3 次项目洽谈。"],
    action: "查看目标"
  },
  "创业基金": {
    title: "创业基金",
    lines: ["达成公司等级后返还钻石。", "基金权益与平台币消费记录分开结算。"],
    action: "查看基金"
  },
  "专属经理": {
    title: "专属经理",
    lines: ["专属经理提供经营提醒、礼包推荐和成长规划。", "提升 VIP 等级可解锁更多服务。"],
    action: "联系经理"
  },
  "排行榜": {
    title: "排行榜",
    lines: ["查看本服公司估值、项目收益和商战积分排名。", "排行榜每日 0 点刷新。"],
    action: "查看排名"
  },
  "邮件": {
    title: "邮件",
    lines: ["系统奖励、补偿和活动结算会通过邮件发放。", "含附件邮件请及时领取。"],
    action: "打开邮箱"
  },
  "限时活动": {
    title: "限时活动",
    lines: ["当前开放：开服冲榜、项目翻倍、员工培养返利。", "活动奖励以页面规则为准。"],
    action: "参加活动"
  },
  "投资合作": {
    title: "投资合作",
    lines: ["选择合作方提升项目融资效率。", "高价值合作需要声望和公司等级。"],
    action: "洽谈合作"
  },
  "商战竞争": {
    title: "商战竞争",
    lines: ["挑战竞争对手，争夺市场份额和排名积分。", "布阵员工会影响谈判胜率。"],
    action: "进入商战"
  },
  "市场营销": {
    title: "市场营销",
    lines: ["投放营销资源，提高项目曝光和订单转化。", "营销等级越高，收益加成越稳定。"],
    action: "升级营销"
  },
  "产品研发": {
    title: "产品研发",
    lines: ["研发新产品线，提升公司长期估值。", "研发进度受员工能力和资金投入影响。"],
    action: "开始研发"
  },
  "企业并购": {
    title: "企业并购",
    lines: ["收购潜力公司，获取团队、专利和现金流。", "并购目标会随主线进度开放。"],
    action: "查看目标"
  },
  "扩建": {
    title: "扩建",
    lines: ["扩建办公楼层，解锁更多岗位和部门容量。", "扩建需要资金、声望和对应章节进度。"],
    action: "扩建公司"
  },
  "任务": {
    title: "主线任务",
    lines: ["主线、每日、支线任务会在任务系统中统一追踪。", "任务奖励由服务器记录，已领取奖励不能重复领取。"],
    action: "打开任务"
  },
  "创业知识": {
    title: "创业知识",
    lines: ["知识卡用于解释劳动合同、税务、回款、融资等经营常识。", "阅读后可推进对应知识任务。"],
    action: "已阅读"
  },
  "合规支线": {
    title: "合规支线",
    lines: ["合同复核、用工规范和客户回款会影响公司长期风险。", "完成合规支线可降低后续经营事件损失。"],
    action: "完成复核"
  },
  "出门谈判": {
    title: "出门谈判",
    lines: ["当前章节：第15章。", "推进谈判可解锁新客户、新项目和商战对手。"],
    action: "开始谈判"
  },
  "设置": {
    title: "设置",
    lines: ["账号切换会回到登录界面。", "公告、客服和声音设置统一从这里进入。"],
    action: "切换账号"
  },
  "员工": {
    title: "员工管理",
    lines: ["管理员工岗位、等级、薪资、忠诚度和能力值。", "招募、培养、解雇和股权激励都从员工系统进入。"],
    action: "进入员工"
  },
  "项目": {
    title: "项目中心",
    lines: ["查看项目阶段、投入成本、预计收益和负责人。", "完成主线任务会解锁更高收益项目。"],
    action: "进入项目"
  },
  "商战": {
    title: "商战大厅",
    lines: ["配置谈判阵容，挑战竞品公司。", "商战积分可兑换员工培养资源。"],
    action: "进入商战"
  },
  "产品": {
    title: "产品中心",
    lines: ["产品线会承接项目经验和研发投入。", "产品中心用于跟踪研发方向、用户增长和商业化表现。"],
    action: "查看产品"
  },
  "市场": {
    title: "市场中心",
    lines: ["市场入口用于查看品牌声誉、获客和竞争态势。", "市场变化会影响客户订单、活动传播和竞争压力。"],
    action: "查看市场"
  },
  "商会": {
    title: "商会",
    lines: ["加入商会可参与集体投资、商会任务和成员互助。", "商会入口按公司等级和服务器规则进入。"],
    action: "查看商会"
  },
  "背包": {
    title: "背包",
    lines: ["管理道具、礼包、招募券和活动材料。", "部分奖励领取后会自动进入背包。"],
    action: "打开背包"
  }
};
const avatarClassById: Record<string, string> = {
  strategist: "strategy",
  builder: "product",
  operator: "operation"
};

const compactNumber = (value: number): string => {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(value % 100000000 === 0 ? 0 : 2)}亿`;
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(value % 10000 === 0 ? 0 : 1)}万`;
  }

  return value.toLocaleString("zh-CN");
};

const formatWan = (value: number): string => `${(value / 10000).toFixed(1)}万`;

const rarityClass = (rarity: string): string => {
  if (rarity === "传奇") {
    return "ssr";
  }

  if (rarity === "顶尖" || rarity === "稀缺") {
    return "sr";
  }

  return "r";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStoredSession = (value: unknown): value is StoredSession => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === SESSION_VERSION &&
    isRecord(value.account) &&
    typeof value.account.token === "string" &&
    isRecord(value.server) &&
    isRecord(value.avatar) &&
    isRecord(value.profile) &&
    typeof value.profile.companyName === "string"
  );
};

const loadSession = (): StoredSession | null => {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveSession = (session: StoredSession): void => {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const clearSession = (): void => {
  window.localStorage.removeItem(SESSION_KEY);
};

const readApiMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as ApiFailure;
    return body.error?.message ?? "请求失败，请稍后再试。";
  } catch {
    return "请求失败，请稍后再试。";
  }
};

const apiRequest = async <T,>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<ApiResponse<T>> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: String(response.status),
        message: await readApiMessage(response)
      },
      traceId: response.headers.get("x-trace-id") ?? ""
    };
  }

  return (await response.json()) as ApiResponse<T>;
};

function App() {
  const initialSession = loadSession();
  const [step, setStep] = useState<OnboardingStep>("auth");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState(initialSession?.account.username ?? "");
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState<AccountSession | null>(initialSession?.account ?? null);
  const [servers, setServers] = useState<ServerOption[]>(initialSession ? [initialSession.server] : []);
  const [avatars, setAvatars] = useState<AvatarOption[]>(initialSession ? [initialSession.avatar] : []);
  const [serverId, setServerId] = useState(initialSession?.server.id ?? "");
  const [avatarId, setAvatarId] = useState(initialSession?.avatar.id ?? "");
  const [founderName, setFounderName] = useState(initialSession?.profile.founderName ?? "");
  const [companyName, setCompanyName] = useState(initialSession?.profile.companyName ?? "");
  const [profile, setProfile] = useState<PlayerProfile | null>(initialSession?.profile ?? null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isRestoring, setIsRestoring] = useState(initialSession !== null);
  const [activeNav, setActiveNav] = useState("公司");
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployees[0]?.id ?? "");
  const [projects, setProjects] = useState<BusinessProject[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0]?.id ?? "");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeTaskType, setActiveTaskType] = useState<TaskItem["type"]>("main");
  const [taskError, setTaskError] = useState("");
  const [taskNotice, setTaskNotice] = useState("");
  const [claimingTaskId, setClaimingTaskId] = useState("");
  const [activeKnowledgeTask, setActiveKnowledgeTask] = useState<TaskItem | null>(null);
  const [companyFinance, setCompanyFinance] = useState<CompanyFinance | null>(null);
  const [financeError, setFinanceError] = useState("");
  const [employeeError, setEmployeeError] = useState("");
  const [projectError, setProjectError] = useState("");
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventError, setEventError] = useState("");
  const [eventNotice, setEventNotice] = useState("");
  const [loanCenter, setLoanCenter] = useState<LoanCenter | null>(null);
  const [selectedLoanOfferId, setSelectedLoanOfferId] = useState("");
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [loanError, setLoanError] = useState("");
  const [loanNotice, setLoanNotice] = useState("");

  const selectedServer = useMemo(
    () => servers.find((server) => server.id === serverId) ?? servers[0],
    [serverId, servers]
  );
  const selectedAvatar = useMemo(
    () => avatars.find((avatar) => avatar.id === avatarId) ?? avatars[0],
    [avatarId, avatars]
  );
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0],
    [employees, selectedEmployeeId]
  );
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.isActive), [employees]);
  const employeePower = useMemo(
    () =>
      activeEmployees.reduce(
        (total, employee) => total + employee.management + employee.negotiation + employee.execution + employee.level * 3,
        0
      ),
    [activeEmployees]
  );
  const averageEmployeeLoyalty = useMemo(
    () =>
      activeEmployees.length === 0
        ? 0
        : Math.round(activeEmployees.reduce((total, employee) => total + employee.loyalty, 0) / activeEmployees.length),
    [activeEmployees]
  );
  const totalEmployeeSalary = useMemo(
    () => activeEmployees.reduce((total, employee) => total + employee.salary, 0),
    [activeEmployees]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0],
    [projects, selectedProjectId]
  );
  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "active" || project.status === "ready"),
    [projects]
  );
  const totalProjectRevenue = useMemo(
    () => activeProjects.reduce((total, project) => total + project.revenueReward, 0),
    [activeProjects]
  );
  const highestProjectStage = useMemo(
    () => projects.reduce((highest, project) => Math.max(highest, project.stage), 0),
    [projects]
  );
  const currentMainTask = useMemo(
    () => tasks.find((task) => task.type === "main" && !task.isClaimed) ?? tasks.find((task) => task.type === "main"),
    [tasks]
  );
  const highlightedTask = useMemo(
    () => tasks.find((task) => task.isClaimable && !task.isClaimed) ?? currentMainTask,
    [currentMainTask, tasks]
  );
  const selectedEvent = useMemo(
    () => events.find((item) => item.id === selectedEventId) ?? events[0],
    [events, selectedEventId]
  );
  const pendingEvents = useMemo(() => events.filter((item) => item.status === "pending"), [events]);
  const selectedLoanOffer = useMemo(
    () => loanCenter?.offers.find((item) => item.id === selectedLoanOfferId) ?? loanCenter?.offers[0],
    [loanCenter?.offers, selectedLoanOfferId]
  );
  const activeLoans = useMemo(
    () => loanCenter?.loans.filter((item) => item.status !== "settled") ?? [],
    [loanCenter?.loans]
  );
  const selectedLoan = useMemo(
    () => activeLoans.find((item) => item.id === selectedLoanId) ?? activeLoans[0],
    [activeLoans, selectedLoanId]
  );
  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.type === activeTaskType),
    [activeTaskType, tasks]
  );
  const activeTaskTip =
    activeTaskType === "daily"
      ? "每日任务按服务器日刷新，已领取奖励不会在同一天重复发放。"
      : activeTaskType === "side"
        ? "支线任务由知识阅读、合规复核和经营动作触发。"
        : "主线任务用于推进前 7 日公司成长路线。";

  const replaceTask = (nextTask: TaskItem): void => {
    setTasks((currentTasks) => currentTasks.map((task) => (task.id === nextTask.id ? nextTask : task)));
  };

  const loadTasks = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<TaskItem[]>(
      `/tasks?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setTasks(response.data);
      setTaskError("");
      return;
    }

    setTaskError(response.error.message);
  };

  const loadEvents = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<BusinessEvent[]>(
      `/events?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setEvents(response.data);
      setSelectedEventId((currentId) => response.data.find((item) => item.id === currentId)?.id ?? response.data[0]?.id ?? "");
      setEventError("");
      setProfile((currentProfile) =>
        currentProfile === null
          ? currentProfile
          : {
              ...currentProfile,
              pendingEventCount: response.data.filter((item) => item.status === "pending").length
            }
      );
      return;
    }

    setEventError(response.error.message);
  };

  const loadCompanyFinance = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<CompanyFinance>(
      `/company/status?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setCompanyFinance(response.data);
      setFinanceError("");
      return;
    }

    setFinanceError(response.error.message);
  };

  const applyLoanCenter = (nextLoanCenter: LoanCenter): void => {
    setLoanCenter(nextLoanCenter);
    setSelectedLoanOfferId((currentId) => nextLoanCenter.offers.find((item) => item.id === currentId)?.id ?? nextLoanCenter.offers[0]?.id ?? "");
    const active = nextLoanCenter.loans.filter((item) => item.status !== "settled");
    setSelectedLoanId((currentId) => active.find((item) => item.id === currentId)?.id ?? active[0]?.id ?? "");
    setCompanyFinance(nextLoanCenter.finance);
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            cash: nextLoanCenter.finance.cash,
            monthlyIncome: nextLoanCenter.finance.monthlyIncome,
            monthlyExpense: nextLoanCenter.finance.monthlyExpense,
            valuation: nextLoanCenter.finance.valuation,
            totalDebt: nextLoanCenter.finance.totalDebt,
            creditRating: nextLoanCenter.finance.creditRating,
            reputation: nextLoanCenter.finance.brandReputation,
            employeeSatisfaction: nextLoanCenter.finance.employeeSatisfaction,
            customerSatisfaction: nextLoanCenter.finance.customerSatisfaction,
            financeMonth: nextLoanCenter.finance.financeMonth,
            operatingDay: nextLoanCenter.finance.operatingDay,
            riskStatus: nextLoanCenter.finance.riskStatus,
            debtWarning: nextLoanCenter.finance.debtRatioBasisPoints >= 6000 ? "高" : nextLoanCenter.finance.totalDebt > 0 ? "中" : "低"
          }
    );
  };

  const loadLoanCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<LoanCenter>(
      `/finance/loans?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      applyLoanCenter(response.data);
      setLoanError("");
      return;
    }

    setLoanError(response.error.message);
  };

  const loadEmployees = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<Employee[]>(
      `/employees?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setEmployees(response.data);
      setSelectedEmployeeId((currentId) => response.data.find((employee) => employee.id === currentId)?.id ?? response.data[0]?.id ?? "");
      setEmployeeError("");
      return;
    }

    setEmployeeError(response.error.message);
  };

  const loadProjects = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<BusinessProject[]>(
      `/projects?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setProjects(response.data);
      setSelectedProjectId((currentId) => response.data.find((project) => project.id === currentId)?.id ?? response.data[0]?.id ?? "");
      setProjectError("");
      return;
    }

    setProjectError(response.error.message);
  };

  const enterGame = (
    nextAccount: AccountSession,
    nextServer: ServerOption,
    nextAvatar: AvatarOption,
    nextProfile: PlayerProfile
  ): void => {
    const stored: StoredSession = {
      version: SESSION_VERSION,
      account: nextAccount,
      server: nextServer,
      avatar: nextAvatar,
      profile: nextProfile
    };

    saveSession(stored);
    setAccount(nextAccount);
    setServerId(nextServer.id);
    setAvatarId(nextAvatar.id);
    setFounderName(nextProfile.founderName);
    setCompanyName(nextProfile.companyName);
    setProfile(nextProfile);
    setStep("game");
  };

  useEffect(() => {
    if (initialSession === null) {
      return;
    }

    let isMounted = true;

    const restoreSession = async (): Promise<void> => {
      try {
        const [sessionResponse, serverResponse, avatarResponse, profileResponse] = await Promise.all([
          apiRequest<{ accountId: string; username: string }>("/auth/session", {}, initialSession.account.token),
          apiRequest<ServerOption[]>("/servers", {}, initialSession.account.token),
          apiRequest<AvatarOption[]>("/avatars", {}, initialSession.account.token),
          apiRequest<PlayerProfile>(
            `/players?serverId=${encodeURIComponent(initialSession.server.id)}`,
            {},
            initialSession.account.token
          )
        ]);

        if (!isMounted) {
          return;
        }

        if (!sessionResponse.success || !serverResponse.success || !avatarResponse.success || !profileResponse.success) {
          clearSession();
          setStep("auth");
          setError("登录状态已过期，请重新登录。");
          return;
        }

        setServers(serverResponse.data);
        setAvatars(avatarResponse.data);
        enterGame(
          initialSession.account,
          serverResponse.data.find((server) => server.id === profileResponse.data.serverId) ?? initialSession.server,
          avatarResponse.data.find((avatar) => avatar.id === profileResponse.data.avatarId) ?? initialSession.avatar,
          profileResponse.data
        );
      } catch {
        if (isMounted) {
          clearSession();
          setAccount(null);
          setProfile(null);
          setStep("auth");
          setError("无法恢复登录状态，请确认 API 服务和数据库已启动。");
        }
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (step !== "game" || !account || !selectedServer) {
      return;
    }

    void loadTasks(account.token, selectedServer.id);
    void loadEvents(account.token, selectedServer.id);
    void loadCompanyFinance(account.token, selectedServer.id);
    void loadLoanCenter(account.token, selectedServer.id);
    void loadEmployees(account.token, selectedServer.id);
    void loadProjects(account.token, selectedServer.id);
  }, [step, account?.token, selectedServer?.id]);

  const runAuth = async (mode: AuthMode): Promise<void> => {
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || password.length < 6) {
      setError("账号至少 3 个字符，密码至少 6 个字符。");
      return;
    }

    setIsBusy(true);
    setError("");
    setAuthMode(mode);

    try {
      const authPath = mode === "register" ? "/auth/register" : "/auth/login";
      const auth = await apiRequest<AccountSession>(authPath, {
        method: "POST",
        body: JSON.stringify({ username: trimmedUsername, password })
      });

      if (!auth.success) {
        setError(auth.error.message);
        return;
      }

      const [serverResponse, avatarResponse] = await Promise.all([
        apiRequest<ServerOption[]>("/servers", {}, auth.data.token),
        apiRequest<AvatarOption[]>("/avatars", {}, auth.data.token)
      ]);

      if (!serverResponse.success) {
        setError(serverResponse.error.message);
        return;
      }

      if (!avatarResponse.success) {
        setError(avatarResponse.error.message);
        return;
      }

      const recommendedServer =
        serverResponse.data.find((server) => server.isRecommended) ?? serverResponse.data[0];
      const firstAvatar = avatarResponse.data[0];

      if (recommendedServer === undefined || firstAvatar === undefined) {
        setError("服务器或头像配置为空，暂时无法进入游戏。");
        return;
      }

      clearSession();
      setAccount(auth.data);
      setUsername(trimmedUsername);
      setFounderName("");
      setCompanyName("");
      setServers(serverResponse.data);
      setAvatars(avatarResponse.data);
      setServerId(recommendedServer.id);
      setAvatarId(firstAvatar.id);

      const existing = await apiRequest<PlayerProfile>(
        `/players?serverId=${encodeURIComponent(recommendedServer.id)}`,
        {},
        auth.data.token
      );

      if (existing.success) {
        const avatar = avatarResponse.data.find((item) => item.id === existing.data.avatarId) ?? firstAvatar;
        enterGame(auth.data, recommendedServer, avatar, existing.data);
        return;
      }

      if (existing.error.code !== "404") {
        setError(existing.error.message);
        return;
      }

      setStep("profile");
    } catch {
      setError("无法连接游戏服务器，请确认 API 服务已启动。");
    } finally {
      setIsBusy(false);
    }
  };

  const submitAuth = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void runAuth("login");
  };

  const continueFromServer = async (): Promise<void> => {
    if (!account || !selectedServer) {
      setError("账号或服务器状态缺失，请重新登录。");
      return;
    }

    setIsBusy(true);
    setError("");

    try {
      const existing = await apiRequest<PlayerProfile>(
        `/players?serverId=${encodeURIComponent(selectedServer.id)}`,
        {},
        account.token
      );

      if (existing.success) {
        const avatar = avatars.find((item) => item.id === existing.data.avatarId) ?? avatars[0];
        if (avatar === undefined) {
          setError("头像配置为空，暂时无法进入游戏。");
          return;
        }

        enterGame(account, selectedServer, avatar, existing.data);
        return;
      }

      if (existing.error.code !== "404") {
        setError(existing.error.message);
        return;
      }

      setStep("avatar");
    } catch {
      setError("无法读取角色档案，请稍后重试。");
    } finally {
      setIsBusy(false);
    }
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedFounder = founderName.trim();
    const trimmedCompany = companyName.trim();

    if (!account || !selectedServer || !selectedAvatar) {
      setError("账号、服务器或头像状态缺失，请重新登录。");
      return;
    }

    if (trimmedFounder.length < 2 || trimmedCompany.length < 2) {
      setError("创始人和公司名都需要至少 2 个字符。");
      return;
    }

    setIsBusy(true);
    setError("");

    try {
      const created = await apiRequest<PlayerProfile>(
        "/players",
        {
          method: "POST",
          body: JSON.stringify({
            serverId: selectedServer.id,
            avatarId: selectedAvatar.id,
            founderName: trimmedFounder,
            companyName: trimmedCompany
          })
        },
        account.token
      );

      if (!created.success) {
        setError(created.error.message);
        return;
      }

      enterGame(account, selectedServer, selectedAvatar, created.data);
    } catch {
      setError("创建角色失败，请确认 API 服务已启动。");
    } finally {
      setIsBusy(false);
    }
  };

  const leaveGame = (): void => {
    clearSession();
    setProfile(null);
    setAccount(null);
    setUsername("");
    setPassword("");
    setFounderName("");
    setCompanyName("");
    setStep("auth");
  };

  const openHomePanel = (panelName: string): void => {
    if (eventEntryNames.has(panelName)) {
      setActivePanel(null);
      setActiveNav("事件");
      return;
    }

    if (panelName === "贷款") {
      setActivePanel(null);
      setActiveNav("贷款");
      return;
    }

    setActivePanel(panelName);
  };

  const openTaskScreen = (): void => {
    setActivePanel(null);
    setActiveNav("任务");
  };

  const openEventScreen = (): void => {
    setActivePanel(null);
    setActiveNav("事件");
  };

  const progressTask = async (taskId: string): Promise<void> => {
    if (!account || !selectedServer) {
      setTaskError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<TaskItem>(
      `/tasks/${encodeURIComponent(taskId)}/progress`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      replaceTask(response.data);
      setTaskError("");
      return;
    }

    setTaskError(response.error.message);
  };

  const claimTask = async (taskId: string): Promise<void> => {
    if (!account || !selectedServer) {
      setTaskError("账号或区服状态缺失，请重新登录。");
      return;
    }

    setClaimingTaskId(taskId);
    const response = await apiRequest<TaskItem>(
      `/tasks/${encodeURIComponent(taskId)}/claim`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      replaceTask(response.data);
      setProfile((currentProfile) =>
        currentProfile === null
          ? currentProfile
          : {
              ...currentProfile,
              cash: currentProfile.cash + response.data.rewardCash,
              platformCoins: currentProfile.platformCoins + response.data.rewardPlatformCoins,
              reputation: currentProfile.reputation + response.data.rewardReputation,
              actionPower: currentProfile.actionPower + response.data.rewardActionPower
            }
      );
      setTaskNotice(`奖励已发放：${response.data.rewardLabel}`);
      setTaskError("");
      setClaimingTaskId("");
      return;
    }

    setTaskError(response.error.message);
    setClaimingTaskId("");
  };

  const settleFinanceMonth = async (): Promise<void> => {
    if (!account || !selectedServer || !companyFinance) {
      return;
    }

    const response = await apiRequest<CompanyFinance>(
      "/finance/settle-month",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, reportMonth: companyFinance.financeMonth })
      },
      account.token
    );

    if (response.success) {
      setCompanyFinance(response.data);
      setProfile((currentProfile) =>
        currentProfile === null
          ? currentProfile
          : {
              ...currentProfile,
              cash: response.data.cash,
              monthlyIncome: response.data.monthlyIncome,
              monthlyExpense: response.data.monthlyExpense,
              valuation: response.data.valuation,
              totalDebt: response.data.totalDebt,
              creditRating: response.data.creditRating,
              reputation: response.data.brandReputation,
              employeeSatisfaction: response.data.employeeSatisfaction,
              customerSatisfaction: response.data.customerSatisfaction,
              financeMonth: response.data.financeMonth,
              operatingDay: response.data.operatingDay,
              riskStatus: response.data.riskStatus
            }
      );
      setFinanceError("");
      return;
    }

    setFinanceError(response.error.message);
  };

  const refreshCompanyAndEmployees = (): void => {
    if (!account || !selectedServer) {
      return;
    }

    void loadCompanyFinance(account.token, selectedServer.id);
    void loadEmployees(account.token, selectedServer.id);
  };

  const refreshCompanyAndProjects = (): void => {
    if (!account || !selectedServer) {
      return;
    }

    void loadCompanyFinance(account.token, selectedServer.id);
    void loadProjects(account.token, selectedServer.id);
  };

  const runEmployeeAction = async (path: string): Promise<boolean> => {
    if (!account || !selectedServer) {
      setEmployeeError("账号或服务器状态缺失，请重新登录。");
      return false;
    }

    const response = await apiRequest<Employee>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setSelectedEmployeeId(response.data.id);
      setEmployeeError("");
      refreshCompanyAndEmployees();
      return true;
    }

    setEmployeeError(response.error.message);
    return false;
  };

  const recruitEmployee = (): void => {
    void runEmployeeAction("/employees/recruit");
  };

  const cultivateEmployee = async (): Promise<void> => {
    if (!selectedEmployee || !selectedEmployee.isActive) {
      return;
    }

    const isSuccess = await runEmployeeAction(`/employees/${encodeURIComponent(selectedEmployee.id)}/train`);
    if (isSuccess && account && selectedServer) {
      void loadTasks(account.token, selectedServer.id);
    }
  };

  const grantEmployeeEquity = (): void => {
    if (!selectedEmployee || !selectedEmployee.isActive) {
      return;
    }

    if (!window.confirm("股权激励会降低创始人持股，并提升员工忠诚。确认执行？")) {
      return;
    }

    void runEmployeeAction(`/employees/${encodeURIComponent(selectedEmployee.id)}/equity`);
  };

  const dismissEmployee = async (): Promise<void> => {
    if (!account || !selectedServer || !selectedEmployee || !selectedEmployee.isActive) {
      return;
    }

    if (!window.confirm("裁员会降低月支出，但会影响士气和声誉。确认裁员？")) {
      return;
    }

    const response = await apiRequest<CompanyFinance>(
      `/employees/${encodeURIComponent(selectedEmployee.id)}/fire`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setCompanyFinance(response.data);
      setSelectedEmployeeId("");
      setEmployeeError("");
      refreshCompanyAndEmployees();
      return;
    }

    setEmployeeError(response.error.message);
  };

  const runProjectAction = async <T,>(path: string, body: Record<string, string> = {}): Promise<ApiResponse<T> | undefined> => {
    if (!account || !selectedServer) {
      setProjectError("账号或服务器状态缺失，请重新登录。");
      return undefined;
    }

    return apiRequest<T>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, ...body })
      },
      account.token
    );
  };

  const startProject = async (): Promise<void> => {
    const response = await runProjectAction<BusinessProject>("/projects/start");
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setSelectedProjectId(response.data.id);
      setProjectError("");
      refreshCompanyAndProjects();
      return;
    }

    setProjectError(response.error.message);
  };

  const assignProjectEmployee = async (employeeId: string): Promise<void> => {
    if (!selectedProject || employeeId === "") {
      return;
    }

    const response = await runProjectAction<BusinessProject>(
      `/projects/${encodeURIComponent(selectedProject.id)}/assign`,
      { employeeId }
    );
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setSelectedProjectId(response.data.id);
      setProjectError("");
      refreshCompanyAndProjects();
      return;
    }

    setProjectError(response.error.message);
  };

  const advanceProject = async (): Promise<void> => {
    if (!selectedProject) {
      return;
    }

    const response = await runProjectAction<BusinessProject>(`/projects/${encodeURIComponent(selectedProject.id)}/advance`);
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setSelectedProjectId(response.data.id);
      setProjectError("");
      refreshCompanyAndProjects();
      if (account && selectedServer) {
        void loadTasks(account.token, selectedServer.id);
      }
      return;
    }

    setProjectError(response.error.message);
  };

  const settleProject = async (): Promise<void> => {
    if (!selectedProject) {
      return;
    }

    const response = await runProjectAction<{ project: BusinessProject; finance: CompanyFinance }>(
      `/projects/${encodeURIComponent(selectedProject.id)}/settle`
    );
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setCompanyFinance(response.data.finance);
      setSelectedProjectId(response.data.project.id);
      setProjectError("");
      refreshCompanyAndProjects();
      return;
    }

    setProjectError(response.error.message);
  };

  const chooseEvent = async (eventId: string, option: "A" | "B"): Promise<void> => {
    if (!account || !selectedServer) {
      setEventError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<EventChoiceResult>(
      `/events/${encodeURIComponent(eventId)}/choose`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, option })
      },
      account.token
    );

    if (response.success) {
      setCompanyFinance(response.data.finance);
      setEventNotice(response.data.result.summary);
      setEventError("");
      await loadEvents(account.token, selectedServer.id);
      await loadTasks(account.token, selectedServer.id);
      setProfile((currentProfile) =>
        currentProfile === null
          ? currentProfile
          : {
              ...currentProfile,
              cash: response.data.finance.cash,
              monthlyIncome: response.data.finance.monthlyIncome,
              monthlyExpense: response.data.finance.monthlyExpense,
              valuation: response.data.finance.valuation,
              totalDebt: response.data.finance.totalDebt,
              creditRating: response.data.finance.creditRating,
              reputation: response.data.finance.brandReputation,
              employeeSatisfaction: response.data.finance.employeeSatisfaction,
              customerSatisfaction: response.data.finance.customerSatisfaction,
              financeMonth: response.data.finance.financeMonth,
              operatingDay: response.data.finance.operatingDay,
              riskStatus: response.data.finance.riskStatus
            }
      );
      return;
    }

    setEventError(response.error.message);
  };

  const runLoanAction = async (path: string, body: Record<string, string> = {}): Promise<void> => {
    if (!account || !selectedServer) {
      setLoanError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<LoanActionResult>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, ...body })
      },
      account.token
    );

    if (response.success) {
      applyLoanCenter(response.data.loanCenter);
      setLoanNotice(response.data.result);
      setLoanError("");
      return;
    }

    setLoanError(response.error.message);
  };

  const resolveCrisis = async (route: "financing" | "cost_cut" | "restructure"): Promise<void> => {
    if (!account || !selectedServer) {
      setLoanError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<LoanCenter>(
      "/finance/crisis/resolve",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, route })
      },
      account.token
    );

    if (response.success) {
      applyLoanCenter(response.data);
      setLoanNotice("危机处理方案已执行，公司状态已更新。");
      setLoanError("");
      return;
    }

    setLoanError(response.error.message);
  };

  const guideTask = (task: TaskItem): void => {
    if (task.isClaimable) {
      void claimTask(task.id);
      return;
    }

    if (task.guideAction.includes("员工")) {
      setActiveNav("员工");
      return;
    }

    if (task.guideAction.includes("项目")) {
      setActiveNav("项目");
      return;
    }

    if (task.unlockKind === "knowledge") {
      setActiveKnowledgeTask(task);
      setActivePanel(null);
      return;
    }

    if (task.unlockKind === "compliance") {
      openEventScreen();
    }
  };

  const selectedPanel = activePanel ? homePanelContent[activePanel] : undefined;

  if (isRestoring) {
    return (
      <main className="login-shell" aria-label="恢复登录状态">
        <section className="login-stage" aria-label="登录状态检查">
          <div className="login-brand">
            <span>创</span>
            <div>
              <h1>写字楼创业记</h1>
              <p>正在进入游戏</p>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
        </section>
      </main>
    );
  }

  if (step === "game" && profile && selectedServer && selectedAvatar) {
    return (
      <main className="game-shell" aria-label="游戏主界面">
        <section className="home-canvas" aria-label="公司经营主页">
          <img alt="" className="home-bg" src="/game-ui/zhuye-bg.png" />

          <header className="home-topbar" aria-label="玩家状态">
            <button className="profile-badge" type="button" onClick={leaveGame}>
              <span className="profile-face">{selectedAvatar.glyph}</span>
              <span>
                <strong>{profile.founderName || account?.username || "创业新星"}</strong>
                <em>{profile.companyName}</em>
              </span>
              <b>Lv.{profile.companyLevel}</b>
            </button>
            <div className="resource-grid" aria-label="资源">
              <button type="button" onClick={() => openHomePanel("创业基金")}>
                <i>资</i>{compactNumber(profile.cash)} <span>+</span>
              </button>
              <button type="button" onClick={() => openHomePanel("福利中心")}>
                <i>币</i>{profile.platformCoins.toLocaleString("zh-CN")} <span>+</span>
              </button>
              <button type="button" onClick={() => openHomePanel("出门谈判")}>
                <i>力</i>{profile.actionPower}/{profile.actionPowerLimit} <span>+</span>
              </button>
              <button type="button" onClick={() => openHomePanel("贷款")}>
                <i>债</i>{profile.debtWarning}
              </button>
              <button type="button" onClick={() => openHomePanel("邮件")}>
                <i>邮</i>{profile.unreadMailCount}
              </button>
              <button type="button" onClick={() => openHomePanel("排行")}>
                <i>誉</i>{compactNumber(profile.reputation)}
              </button>
            </div>
            <button className="settings-button" type="button" aria-label="设置" onClick={() => openHomePanel("设置")} />
          </header>

          <section className="left-actions" aria-label="福利入口">
            {sideActions.map((item, index) => (
              <button type="button" key={item} onClick={() => openHomePanel(item)}>
                <span>{item.slice(0, 2)}</span>
                <strong>{item}</strong>
                {[0, 3, 4].includes(index) && <em />}
              </button>
            ))}
          </section>

          <section className="right-actions" aria-label="经营入口">
            {rightActions.map((item, index) => (
              <button type="button" key={item} onClick={() => openHomePanel(item)}>
                <span>{item.slice(0, 2)}</span>
                <strong>{item}</strong>
                {[2, 3, 4, 5, 6].includes(index) && <em />}
              </button>
            ))}
          </section>

          <section className="task-panel" aria-label="当前任务">
            <button className="task-icon" type="button" onClick={openTaskScreen}>任务</button>
            <div>
              <strong>{highlightedTask?.isClaimable ? "可领取" : "主线"}</strong>
              <span>{highlightedTask ? `${highlightedTask.title}（${highlightedTask.progress}/${highlightedTask.target}）` : "任务配置读取中"}</span>
              <small>{highlightedTask ? `奖励：${highlightedTask.rewardLabel}` : "请确认 API 服务已启动"}</small>
            </div>
            <button className="task-go" type="button" onClick={openTaskScreen}>前往</button>
          </section>

          <section className="status-strip" aria-label="公司状态">
            <span>现金流{compactNumber(profile.monthlyIncome - profile.monthlyExpense)}</span>
            <span>收入{compactNumber(profile.monthlyIncome)}</span>
            <span>支出{compactNumber(profile.monthlyExpense)}</span>
            <button type="button" onClick={openEventScreen}>待办{profile.pendingEventCount}</button>
          </section>

          <button className="chapter-button" type="button" onClick={() => openHomePanel("出门谈判")}>
            <strong>出门谈判</strong>
            <span>第15章</span>
          </button>

          <nav className="bottom-nav" aria-label="底部导航">
            {navItems.map((item, index) => (
              <button
                className={activeNav === item ? "active" : undefined}
                type="button"
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  if (item === "公司") {
                    setActivePanel(null);
                  } else if (item === "员工" || item === "项目") {
                    setActivePanel(null);
                  } else {
                    openHomePanel(item);
                  }
                }}
              >
                <span>{item.slice(0, 1)}</span>
                <strong>{item}</strong>
                {[1, 2, 5].includes(index) && <em />}
              </button>
            ))}
          </nav>

          {activeNav === "员工" && (
            <section className="employee-screen" aria-label="员工系统">
              <header className="employee-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>员工</strong>
                  <span>团队战力 {employeePower.toLocaleString("zh-CN")}</span>
                </div>
                <button type="button" onClick={() => openHomePanel("员工")}>规则</button>
              </header>

              <section className="employee-summary" aria-label="员工概览">
                <span>在岗 {activeEmployees.length}</span>
                <span>平均忠诚 {averageEmployeeLoyalty}</span>
                <span>月薪合计 {formatWan(totalEmployeeSalary)}</span>
              </section>
              {employeeError && <p className="employee-error">{employeeError}</p>}

              <section className="employee-layout">
                <div className="employee-list" aria-label="员工列表">
                  {employees.map((employee) => (
                    <button
                      className={employee.id === selectedEmployee?.id ? "selected" : undefined}
                      key={employee.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(employee.id)}
                    >
                      <span className={`quality ${rarityClass(employee.rarity)}`}>{employee.rarity}</span>
                      <strong>{employee.name}</strong>
                      <em>{employee.role} · {employee.careerLevel}</em>
                      <small>{employee.isActive ? `Lv.${employee.level}` : "离岗"}</small>
                    </button>
                  ))}
                </div>

                <article className="employee-detail" aria-label="员工详情">
                  {selectedEmployee ? (
                    <>
                      <div className="employee-portrait">
                        <span>{selectedEmployee.name.slice(0, 1)}</span>
                        <strong>{selectedEmployee.name}</strong>
                        <em>{selectedEmployee.rarity} · {selectedEmployee.role} · {selectedEmployee.careerLevel}</em>
                      </div>

                      <dl className="employee-stats">
                        <div>
                          <dt>等级</dt>
                          <dd>Lv.{selectedEmployee.level}</dd>
                        </div>
                        <div>
                          <dt>薪资</dt>
                          <dd>{formatWan(selectedEmployee.salary)}/月</dd>
                        </div>
                        <div>
                          <dt>忠诚</dt>
                          <dd>{selectedEmployee.loyalty}</dd>
                        </div>
                        <div>
                          <dt>压力</dt>
                          <dd>{selectedEmployee.pressure}</dd>
                        </div>
                        <div>
                          <dt>管理</dt>
                          <dd>{selectedEmployee.management}</dd>
                        </div>
                        <div>
                          <dt>谈判</dt>
                          <dd>{selectedEmployee.negotiation}</dd>
                        </div>
                        <div>
                          <dt>执行</dt>
                          <dd>{selectedEmployee.execution}</dd>
                        </div>
                        <div>
                          <dt>股权</dt>
                          <dd>{(selectedEmployee.equityBasisPoints / 100).toFixed(0)}%</dd>
                        </div>
                      </dl>

                      <p>{selectedEmployee.specialty} 成长潜力 {selectedEmployee.growthPotential}。</p>

                      <div className="employee-actions">
                        <button type="button" onClick={() => void cultivateEmployee()} disabled={!selectedEmployee.isActive}>培养</button>
                        <button type="button" onClick={recruitEmployee}>招募</button>
                        <button type="button" onClick={grantEmployeeEquity} disabled={!selectedEmployee.isActive}>股权</button>
                        <button type="button" onClick={() => void dismissEmployee()} disabled={!selectedEmployee.isActive}>裁员</button>
                      </div>
                    </>
                  ) : (
                    <div className="employee-empty">
                      <strong>暂无员工</strong>
                      <p>通过招募建立第一支核心团队，员工薪资会计入公司月支出。</p>
                      <button type="button" onClick={recruitEmployee}>招募员工</button>
                    </div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "项目" && (
            <section className="project-screen" aria-label="项目系统">
              <header className="project-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>项目</strong>
                  <span>预计回款 {compactNumber(totalProjectRevenue)}</span>
                </div>
                <button type="button" onClick={() => openHomePanel("项目")}>规则</button>
              </header>

              <section className="project-summary" aria-label="项目概览">
                <span>在研 {activeProjects.length}</span>
                <span>最高阶段 {highestProjectStage}</span>
                <span>可结算 {projects.filter((project) => project.status === "ready").length}</span>
              </section>
              {projectError && <p className="project-error">{projectError}</p>}

              <section className="project-layout">
                <div className="project-list" aria-label="项目列表">
                  {projects.map((project) => (
                    <button
                      className={project.id === selectedProject?.id ? "selected" : undefined}
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <strong>{project.name}</strong>
                      <em>{project.category} · 阶段 {project.stage}</em>
                      <span>
                        <i style={{ width: `${project.progress}%` }} />
                      </span>
                      <small>{project.status === "ready" ? "待结算" : `预计 ${compactNumber(project.revenueReward)}`}</small>
                    </button>
                  ))}
                </div>

                <article className="project-detail" aria-label="项目详情">
                  {selectedProject ? (
                    <>
                      <div className="project-title">
                        <span>{selectedProject.category.slice(0, 2)}</span>
                        <strong>{selectedProject.name}</strong>
                        <em>阶段 {selectedProject.stage} · 风险 {selectedProject.risk} · 成功率 {selectedProject.successRate}%</em>
                      </div>

                      <dl className="project-stats">
                        <div>
                          <dt>进度</dt>
                          <dd>{selectedProject.progress}%</dd>
                        </div>
                        <div>
                          <dt>周期</dt>
                          <dd>{selectedProject.cycleDays}天</dd>
                        </div>
                        <div>
                          <dt>预算</dt>
                          <dd>{compactNumber(selectedProject.budget)}</dd>
                        </div>
                        <div>
                          <dt>回款</dt>
                          <dd>{compactNumber(selectedProject.revenueReward)}</dd>
                        </div>
                        <div>
                          <dt>负责人</dt>
                          <dd>{selectedProject.assignedEmployeeName ?? "待分配"}</dd>
                        </div>
                        <div>
                          <dt>状态</dt>
                          <dd>{selectedProject.status === "ready" ? "待结算" : selectedProject.status === "settled" ? "已成功" : selectedProject.status === "failed" ? "已失败" : "推进中"}</dd>
                        </div>
                      </dl>

                      <label className="project-assignee">
                        <span>派员工</span>
                        <select
                          value={selectedProject.assignedEmployeeId ?? ""}
                          onChange={(event) => void assignProjectEmployee(event.target.value)}
                          disabled={selectedProject.status === "settled" || selectedProject.status === "failed"}
                        >
                          <option value="">待分配</option>
                          {activeEmployees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name} · {employee.role}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="project-progress" aria-label="项目进度">
                        <span>
                          <i style={{ width: `${selectedProject.progress}%` }} />
                        </span>
                        <strong>{selectedProject.progress}%</strong>
                      </div>

                      <p>{selectedProject.summary}</p>

                      <div className="project-actions">
                        <button type="button" onClick={() => void advanceProject()} disabled={selectedProject.status !== "active"}>推进</button>
                        <button type="button" onClick={() => void startProject()}>接项目</button>
                        <button type="button" onClick={() => void settleProject()} disabled={selectedProject.status !== "ready"}>结算</button>
                        <button type="button" onClick={() => activeEmployees[0] && void assignProjectEmployee(activeEmployees[0].id)} disabled={activeEmployees.length === 0 || selectedProject.status === "settled" || selectedProject.status === "failed"}>派遣</button>
                      </div>
                    </>
                  ) : (
                    <div className="project-empty">
                      <strong>暂无项目</strong>
                      <p>接下第一单项目，分配员工后推进交付，结算结果会影响现金、声誉和客户满意度。</p>
                      <button type="button" onClick={() => void startProject()}>接项目</button>
                    </div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "贷款" && (
            <section className="loan-screen" aria-label="贷款与危机">
              <header className="loan-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>贷款</strong>
                  <span>信用 {loanCenter?.finance.creditRating ?? profile.creditRating} · 负债 {loanCenter ? `${(loanCenter.finance.debtRatioBasisPoints / 100).toFixed(1)}%` : "读取中"}</span>
                </div>
                <button type="button" onClick={() => account && selectedServer && void loadLoanCenter(account.token, selectedServer.id)}>刷新</button>
              </header>

              <section className="loan-summary" aria-label="负债概览">
                <span>总负债 {compactNumber(loanCenter?.finance.totalDebt ?? profile.totalDebt)}</span>
                <span>本期应还 {compactNumber(activeLoans.reduce((total, item) => total + item.monthlyPayment + item.penaltyAccrued, 0))}</span>
                <span>{loanCenter?.crisis.isActive ? "危机中" : "可控"}</span>
              </section>
              {loanNotice && <p className="loan-notice">{loanNotice}</p>}
              {loanError && <p className="loan-error">{loanError}</p>}

              <section className="loan-layout">
                <div className="loan-list" aria-label="贷款产品">
                  {(loanCenter?.offers ?? []).map((offer) => (
                    <button
                      className={offer.id === selectedLoanOffer?.id ? "selected" : undefined}
                      key={offer.id}
                      type="button"
                      onClick={() => setSelectedLoanOfferId(offer.id)}
                    >
                      <strong>{offer.name}</strong>
                      <em>{offer.lender} · 年化 {(offer.annualRateBasisPoints / 100).toFixed(1)}%</em>
                      <span>{formatWan(offer.principal)} / {offer.termMonths}期 / 月供{formatWan(offer.monthlyPayment)}</span>
                      <small>{offer.lockedReason ?? "可申请"}</small>
                    </button>
                  ))}
                </div>

                <article className="loan-detail" aria-label="贷款详情">
                  {selectedLoanOffer ? (
                    <>
                      <div className="loan-title">
                        <span>贷</span>
                        <strong>{selectedLoanOffer.name}</strong>
                        <em>{selectedLoanOffer.summary}</em>
                      </div>

                      <dl className="loan-stats">
                        <div>
                          <dt>到账</dt>
                          <dd>{compactNumber(selectedLoanOffer.principal)}</dd>
                        </div>
                        <div>
                          <dt>月供</dt>
                          <dd>{compactNumber(selectedLoanOffer.monthlyPayment)}</dd>
                        </div>
                        <div>
                          <dt>期限</dt>
                          <dd>{selectedLoanOffer.termMonths}期</dd>
                        </div>
                        <div>
                          <dt>信用</dt>
                          <dd>{selectedLoanOffer.creditRequired}级</dd>
                        </div>
                      </dl>

                      {selectedLoan && (
                        <section className="loan-active">
                          <strong>{selectedLoan.name}</strong>
                          <span>剩余 {compactNumber(selectedLoan.remainingPrincipal)} · {selectedLoan.remainingMonths}期 · {selectedLoan.status === "overdue" ? `逾期${selectedLoan.overduePeriods}期` : "正常"}</span>
                          <small>罚息 {compactNumber(selectedLoan.penaltyAccrued)}</small>
                        </section>
                      )}

                      {loanCenter?.crisis.isActive && (
                        <section className="loan-crisis">
                          <strong>{loanCenter.crisis.summary}</strong>
                          {loanCenter.crisis.routes.map((route) => (
                            <button key={route.id} type="button" onClick={() => void resolveCrisis(route.id)}>
                              <span>{route.title}</span>
                              <small>{route.impact}</small>
                            </button>
                          ))}
                        </section>
                      )}

                      <div className="loan-actions">
                        <button
                          type="button"
                          disabled={!selectedLoanOffer.isAvailable}
                          onClick={() => void runLoanAction("/finance/loans/apply", { loanConfigId: selectedLoanOffer.id })}
                        >
                          申请
                        </button>
                        <button
                          type="button"
                          disabled={!selectedLoan}
                          onClick={() => selectedLoan && void runLoanAction(`/finance/loans/${encodeURIComponent(selectedLoan.id)}/repay`, { mode: "scheduled" })}
                        >
                          还本期
                        </button>
                        <button
                          type="button"
                          disabled={!selectedLoan}
                          onClick={() => selectedLoan && void runLoanAction(`/finance/loans/${encodeURIComponent(selectedLoan.id)}/repay`, { mode: "full" })}
                        >
                          结清
                        </button>
                        <button type="button" onClick={() => void runLoanAction("/finance/loans/settle-period")}>到期</button>
                      </div>
                    </>
                  ) : (
                    <div className="loan-empty">贷款配置读取中，请确认 API 服务已启动。</div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "任务" && (
            <section className="task-screen" aria-label="任务系统">
              <header className="task-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>任务</strong>
                  <span>主线 / 每日 / 支线</span>
                </div>
                <button type="button" onClick={() => selectedServer && account && void loadTasks(account.token, selectedServer.id)}>刷新</button>
              </header>

              <nav className="task-tabs" aria-label="任务分类">
                {[
                  ["main", "主线"],
                  ["daily", "每日"],
                  ["side", "支线"]
                ].map(([type, label]) => (
                  <button
                    className={activeTaskType === type ? "active" : undefined}
                    key={type}
                    type="button"
                    onClick={() => setActiveTaskType(type as TaskItem["type"])}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <p className="task-tip">{activeTaskTip}</p>
              {taskNotice && <p className="task-notice">{taskNotice}</p>}
              {taskError && <p className="task-error">{taskError}</p>}

              <section className="task-list" aria-label="任务列表">
                {visibleTasks.length === 0 ? (
                  <div className="task-empty">当前分类暂无任务，继续经营后会出现新的目标。</div>
                ) : visibleTasks.map((task) => (
                  <article className={task.isClaimed ? "claimed" : undefined} key={task.id}>
                    <header>
                      <strong>{task.title}</strong>
                      <span>{task.progress}/{task.target}</span>
                    </header>
                    <p>{task.description}</p>
                    <div className="task-progress-line">
                      <span>
                        <i style={{ width: `${Math.min((task.progress / task.target) * 100, 100)}%` }} />
                      </span>
                    </div>
                    <footer>
                      <small>奖励：{task.rewardLabel}</small>
                      <button disabled={task.isClaimed || claimingTaskId === task.id} type="button" onClick={() => guideTask(task)}>
                        {claimingTaskId === task.id ? "领取中" : task.isClaimed ? "已领取" : task.isClaimable ? "领取" : task.guideAction}
                      </button>
                    </footer>
                  </article>
                ))}
              </section>
            </section>
          )}

          {activeNav === "事件" && (
            <section className="event-screen" aria-label="事件中心">
              <header className="event-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>事件</strong>
                  <span>消息 / 邮件 / 合同 / 财报</span>
                </div>
                <button type="button" onClick={() => account && selectedServer && void loadEvents(account.token, selectedServer.id)}>刷新</button>
              </header>

              <section className="event-summary" aria-label="事件概览">
                <span>待处理 {pendingEvents.length}</span>
                <span>已处理 {events.length - pendingEvents.length}</span>
                <span>知识 {events.filter((item) => item.knowledgeUnlocked).length}</span>
              </section>
              {eventNotice && <p className="event-notice">{eventNotice}</p>}
              {eventError && <p className="event-error">{eventError}</p>}

              <section className="event-layout">
                <div className="event-list" aria-label="事件列表">
                  {events.length === 0 ? (
                    <div className="event-empty">暂无经营事件，继续推进公司后会出现新的待办。</div>
                  ) : events.map((item) => (
                    <button
                      className={item.id === selectedEvent?.id ? "selected" : undefined}
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedEventId(item.id)}
                    >
                      <span>{item.source}</span>
                      <strong>{item.title}</strong>
                      <em>{item.summary}</em>
                      <small>{item.status === "pending" ? "待决策" : "已处理"}</small>
                    </button>
                  ))}
                </div>

                <article className="event-detail" aria-label="事件详情">
                  {selectedEvent ? (
                    <>
                      <div className="event-title">
                        <span>{selectedEvent.source.slice(0, 2)}</span>
                        <strong>{selectedEvent.title}</strong>
                        <em>{selectedEvent.channel} · {selectedEvent.status === "pending" ? "待处理" : "已结算"}</em>
                      </div>

                      <p>{selectedEvent.context}</p>

                      <dl className="event-risk">
                        <div>
                          <dt>摘要</dt>
                          <dd>{selectedEvent.summary}</dd>
                        </div>
                        <div>
                          <dt>风险解释</dt>
                          <dd>{selectedEvent.riskExplanation}</dd>
                        </div>
                        <div>
                          <dt>知识点</dt>
                          <dd>{selectedEvent.knowledgeUnlocked ? selectedEvent.knowledgeTitle : selectedEvent.knowledgeTitle ?? "待解锁"}</dd>
                        </div>
                      </dl>

                      {selectedEvent.status === "pending" ? (
                        <div className="event-options">
                          {selectedEvent.options.map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => void chooseEvent(selectedEvent.id, option.key)}
                            >
                              <strong>{option.label}</strong>
                              <span>{option.impactPreview}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <section className="event-result">
                          <strong>处理结果</strong>
                          <p>{selectedEvent.resultSummary}</p>
                          <span>选择：{selectedEvent.selectedOption}</span>
                        </section>
                      )}
                    </>
                  ) : (
                    <div className="event-empty">事件配置读取中，请稍候。</div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeKnowledgeTask && (
            <section className="home-modal" aria-label={activeKnowledgeTask.unlockKind === "compliance" ? "合规支线" : "创业知识"}>
              <button className="modal-backdrop" type="button" aria-label="关闭面板" onClick={() => setActiveKnowledgeTask(null)} />
              <div className="modal-sheet knowledge-sheet">
                <header>
                  <strong>{activeKnowledgeTask.unlockKind === "compliance" ? "合同复核支线" : "创业知识卡"}</strong>
                  <button type="button" aria-label="关闭" onClick={() => setActiveKnowledgeTask(null)}>×</button>
                </header>
                <article>
                  <h3>{activeKnowledgeTask.title}</h3>
                  <p>{activeKnowledgeTask.description}</p>
                  <dl>
                    <div>
                      <dt>经营场景</dt>
                      <dd>{activeKnowledgeTask.unlockKind === "compliance" ? "客户合同进入交付前复核，确认回款、验收和违约条款。" : "员工入职后需要规范签署劳动合同，避免用工争议扩大。"}</dd>
                    </div>
                    <div>
                      <dt>风险提示</dt>
                      <dd>{activeKnowledgeTask.unlockKind === "compliance" ? "合同条款不清会影响项目结算、客户满意度和现金回收。" : "用工资料不完整会增加劳动争议、赔偿和声誉风险。"}</dd>
                    </div>
                    <div>
                      <dt>游戏影响</dt>
                      <dd>阅读并确认后推进支线进度，奖励领取仍以后端任务状态为准。</dd>
                    </div>
                  </dl>
                  <small>本内容用于游戏内经营知识提示，不构成法律、财务或投资建议。</small>
                </article>
                <button
                  type="button"
                  onClick={() => {
                    void progressTask(activeKnowledgeTask.id);
                    setActiveKnowledgeTask(null);
                    openTaskScreen();
                  }}
                >
                  我已理解
                </button>
              </div>
            </section>
          )}

          {activePanel === "财务" && (
            <section className="home-modal" aria-label="财务">
              <button className="modal-backdrop" type="button" aria-label="关闭面板" onClick={() => setActivePanel(null)} />
              <div className="modal-sheet finance-sheet">
                <header>
                  <strong>财务</strong>
                  <button type="button" aria-label="关闭" onClick={() => setActivePanel(null)}>×</button>
                </header>
                {companyFinance ? (
                  <>
                    <dl className="finance-grid">
                      <div>
                        <dt>现金</dt>
                        <dd>{compactNumber(companyFinance.cash)}</dd>
                      </div>
                      <div>
                        <dt>月收入</dt>
                        <dd>{compactNumber(companyFinance.monthlyIncome)}</dd>
                      </div>
                      <div>
                        <dt>月支出</dt>
                        <dd>{compactNumber(companyFinance.monthlyExpense)}</dd>
                      </div>
                      <div>
                        <dt>净现金流</dt>
                        <dd>{compactNumber(companyFinance.netCashFlow)}</dd>
                      </div>
                      <div>
                        <dt>估值</dt>
                        <dd>{compactNumber(companyFinance.valuation)}</dd>
                      </div>
                      <div>
                        <dt>股权</dt>
                        <dd>{(companyFinance.founderEquityBasisPoints / 100).toFixed(1)}%</dd>
                      </div>
                      <div>
                        <dt>负债率</dt>
                        <dd>{(companyFinance.debtRatioBasisPoints / 100).toFixed(1)}%</dd>
                      </div>
                      <div>
                        <dt>信用</dt>
                        <dd>{companyFinance.creditRating}</dd>
                      </div>
                    </dl>
                    <section className={`finance-risk ${companyFinance.riskStatus === "稳健" ? "stable" : "warning"}`}>
                      <strong>{companyFinance.riskStatus}</strong>
                      {companyFinance.riskTips.map((tip) => (
                        <p key={tip}>{tip}</p>
                      ))}
                    </section>
                    {financeError && <p className="task-error">{financeError}</p>}
                    <button className="modal-action" type="button" onClick={() => void settleFinanceMonth()}>
                      生成第 {companyFinance.financeMonth} 月经营报告
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <p>{financeError || "财务数据读取中，请稍候。"}</p>
                    </div>
                    <button
                      className="modal-action"
                      type="button"
                      onClick={() => account && selectedServer && void loadCompanyFinance(account.token, selectedServer.id)}
                    >
                      刷新财务
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {selectedPanel && activePanel !== "财务" && (
            <section className="home-modal" aria-label={selectedPanel.title}>
              <button className="modal-backdrop" type="button" aria-label="关闭面板" onClick={() => setActivePanel(null)} />
              <div className="modal-sheet">
                <header>
                  <strong>{selectedPanel.title}</strong>
                  <button type="button" aria-label="关闭" onClick={() => setActivePanel(null)}>×</button>
                </header>
                <div>
                  {selectedPanel.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <button
                  className="modal-action"
                  type="button"
                  onClick={activePanel === "设置" ? leaveGame : () => setActivePanel(null)}
                >
                  {selectedPanel.action}
                </button>
              </div>
            </section>
          )}
        </section>
      </main>
    );
  }

  if (step === "auth") {
    return (
      <main className="auth-screen" aria-label="玩家登录">
        <section className="auth-canvas" aria-label="游戏入口">
          <img alt="" className="design-image" src="/game-ui/zhuce.png" />
          <div className="auth-title" aria-hidden="true">
            <span>写字楼</span>
            <strong>创业记</strong>
            <em>从一间办公室到商业帝国</em>
          </div>

          <div className="server-ribbon" aria-label="当前区服">
            <span className="sr-only">区服：S1 创业中心</span>
            <button aria-label="换服" type="button" />
          </div>

          <form className="auth-panel" onSubmit={submitAuth}>
            <label className="game-input-row">
              <span className="sr-only">账号</span>
              <input
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder=""
                value={username}
              />
            </label>
            <label className="game-input-row">
              <span className="sr-only">密码</span>
              <input
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                onChange={(event) => setPassword(event.target.value)}
                placeholder=""
                type="text"
                value={password}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="auth-actions">
              <button aria-label={isBusy && authMode === "login" ? "正在登录" : "登录进入游戏"} className="gold-button" disabled={isBusy} type="submit" />
              <button
                aria-label={isBusy && authMode === "register" ? "正在注册" : "注册进入游戏"}
                className="blue-button"
                disabled={isBusy}
                type="button"
                onClick={() => void runAuth("register")}
              />
            </div>
          </form>
        </section>
      </main>
    );
  }

  if (step === "profile") {
    return (
      <main className="founder-screen" aria-label="选择角色与命名">
        <section className="founder-canvas" aria-label="创建创始人档案">
          <img alt="" className="design-image" src="/game-ui/xuanjiao.png" />
          <div className="founder-title" aria-hidden="true">
            <span>写字楼</span>
            <strong>创业记</strong>
            <em>从一间办公室到商业帝国</em>
          </div>

          <section className="founder-cards" aria-label="选择创业者类型">
            {avatars.map((avatar) => (
              <button
                aria-pressed={avatar.id === avatarId}
                className={`founder-card ${avatarClassById[avatar.id] ?? "strategy"} ${
                  avatar.id === avatarId ? "selected" : ""
                }`}
                key={avatar.id}
                onClick={() => setAvatarId(avatar.id)}
                type="button"
              >
                <span className="founder-medal">{avatar.glyph}</span>
                <strong>{avatar.name.replace("创始人", "")}</strong>
                <small>{avatar.specialty}</small>
              </button>
            ))}
          </section>

          <form className="founder-panel" onSubmit={(event) => void submitProfile(event)}>
            <label className="game-input-row">
              <span className="sr-only">创始人姓名</span>
              <input
                autoComplete="name"
                onChange={(event) => setFounderName(event.target.value)}
                placeholder=""
                value={founderName}
              />
            </label>
            <label className="game-input-row">
              <span className="sr-only">公司名称</span>
              <input
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder=""
                value={companyName}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button aria-label={isBusy ? "创建中" : "创建档案"} className="gold-button" disabled={isBusy} type="submit" />
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-panel" aria-label="进入游戏">
        <div className="panel-heading">
          <h1>写字楼创业记</h1>
          <p>选择区服，创建你的创始人和公司档案。</p>
        </div>

        <ol className="step-list" aria-label="引导步骤">
          {["账号", "服务器", "头像", "档案"].map((label, index) => (
            <li className={index <= ["auth", "server", "avatar", "profile"].indexOf(step) ? "active" : ""} key={label}>
              {label}
            </li>
          ))}
        </ol>

        {error && <p className="form-error">{error}</p>}

        {step === "server" && (
          <section className="choice-list" aria-label="选择服务器">
            {servers.map((server) => (
              <button
                className={server.id === serverId ? "choice selected" : "choice"}
                key={server.id}
                onClick={() => setServerId(server.id)}
                type="button"
              >
                <span>{server.name}</span>
                <small>{server.label}</small>
              </button>
            ))}
            <div className="flow-actions">
              <button type="button" onClick={() => setStep("auth")}>
                返回
              </button>
              <button className="primary-button" disabled={isBusy} type="button" onClick={() => void continueFromServer()}>
                {isBusy ? "读取中" : "进入区服"}
              </button>
            </div>
          </section>
        )}

        {step === "avatar" && (
          <section className="avatar-grid" aria-label="选择头像">
            {avatars.map((avatar) => (
              <button
                className={avatar.id === avatarId ? "avatar-choice selected" : "avatar-choice"}
                key={avatar.id}
                onClick={() => setAvatarId(avatar.id)}
                type="button"
              >
                <span>{avatar.glyph}</span>
                <strong>{avatar.name}</strong>
                <small>{avatar.specialty}</small>
              </button>
            ))}
            <div className="flow-actions wide">
              <button type="button" onClick={() => setStep("server")}>
                返回
              </button>
              <button className="primary-button" type="button" onClick={() => setStep("profile")}>
                填写档案
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
