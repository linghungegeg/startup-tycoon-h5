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

type EmployeeQuality = "SSR" | "SR" | "R";

type Employee = {
  id: string;
  name: string;
  quality: EmployeeQuality;
  role: string;
  level: number;
  salary: string;
  loyalty: number;
  management: number;
  negotiation: number;
  execution: number;
  specialty: string;
};

type BusinessProject = {
  id: string;
  name: string;
  category: string;
  stage: number;
  progress: number;
  investment: string;
  revenue: number;
  ownerId: string;
  risk: "低" | "中" | "高";
  summary: string;
};

type TaskItem = {
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

const sideActions = ["财务", "融资", "贷款", "风险", "合同"];
const rightActions = ["首充", "月卡", "礼包", "活动", "排行", "邮件", "VIP"];
const navItems = ["公司", "员工", "项目", "产品", "市场", "商会"];
const initialEmployees: Employee[] = [
  {
    id: "lin-xia",
    name: "林夏",
    quality: "SSR",
    role: "市场总监",
    level: 18,
    salary: "8.8万/月",
    loyalty: 92,
    management: 86,
    negotiation: 91,
    execution: 78,
    specialty: "擅长品牌投放，提升项目曝光。"
  },
  {
    id: "zhou-hang",
    name: "周航",
    quality: "SR",
    role: "项目经理",
    level: 16,
    salary: "6.2万/月",
    loyalty: 88,
    management: 79,
    negotiation: 73,
    execution: 90,
    specialty: "推进项目交付，缩短研发周期。"
  },
  {
    id: "chen-mo",
    name: "陈默",
    quality: "SR",
    role: "融资顾问",
    level: 15,
    salary: "6.6万/月",
    loyalty: 84,
    management: 75,
    negotiation: 94,
    execution: 72,
    specialty: "提高融资成功率，适合谈判阵容。"
  },
  {
    id: "he-yu",
    name: "何煜",
    quality: "R",
    role: "运营主管",
    level: 12,
    salary: "3.8万/月",
    loyalty: 80,
    management: 70,
    negotiation: 66,
    execution: 82,
    specialty: "稳定日常经营，降低运营损耗。"
  },
  {
    id: "su-qing",
    name: "苏青",
    quality: "R",
    role: "人事经理",
    level: 11,
    salary: "3.5万/月",
    loyalty: 86,
    management: 76,
    negotiation: 62,
    execution: 74,
    specialty: "提升员工忠诚，减少离职风险。"
  },
  {
    id: "jiang-yan",
    name: "江言",
    quality: "SR",
    role: "产品负责人",
    level: 14,
    salary: "5.9万/月",
    loyalty: 82,
    management: 78,
    negotiation: 70,
    execution: 88,
    specialty: "强化产品研发，提高长期估值。"
  }
];
const initialProjects: BusinessProject[] = [
  {
    id: "smart-office",
    name: "智慧办公 SaaS",
    category: "产品研发",
    stage: 2,
    progress: 58,
    investment: "420万",
    revenue: 860,
    ownerId: "jiang-yan",
    risk: "中",
    summary: "面向中小企业的办公协同产品，适合持续投入研发资源。"
  },
  {
    id: "city-brand",
    name: "城市品牌投放",
    category: "市场营销",
    stage: 3,
    progress: 72,
    investment: "310万",
    revenue: 690,
    ownerId: "lin-xia",
    risk: "低",
    summary: "提升公司曝光和项目订单，短期收益稳定。"
  },
  {
    id: "finance-round",
    name: "A 轮融资计划",
    category: "投资合作",
    stage: 1,
    progress: 45,
    investment: "180万",
    revenue: 520,
    ownerId: "chen-mo",
    risk: "高",
    summary: "争取外部资本进入，成功后可大幅提升公司估值。"
  },
  {
    id: "delivery-center",
    name: "交付中心扩容",
    category: "运营建设",
    stage: 2,
    progress: 34,
    investment: "260万",
    revenue: 610,
    ownerId: "zhou-hang",
    risk: "中",
    summary: "扩充项目交付能力，降低后续大客户订单流失。"
  },
  {
    id: "hr-system",
    name: "人才梯队计划",
    category: "组织管理",
    stage: 1,
    progress: 63,
    investment: "120万",
    revenue: 380,
    ownerId: "su-qing",
    risk: "低",
    summary: "优化招聘和培养机制，提高员工忠诚与成长效率。"
  }
];
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
  const employeePower = useMemo(
    () =>
      employees.reduce(
        (total, employee) => total + employee.management + employee.negotiation + employee.execution + employee.level * 3,
        0
      ),
    [employees]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0],
    [projects, selectedProjectId]
  );
  const totalProjectRevenue = useMemo(
    () => projects.reduce((total, project) => total + project.revenue, 0),
    [projects]
  );
  const currentMainTask = useMemo(
    () => tasks.find((task) => task.type === "main" && !task.isClaimed) ?? tasks.find((task) => task.type === "main"),
    [tasks]
  );
  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.type === activeTaskType),
    [activeTaskType, tasks]
  );

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
    setActivePanel(panelName);
  };

  const openTaskScreen = (): void => {
    setActivePanel(null);
    setActiveNav("任务");
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
      setTaskError("");
      return;
    }

    setTaskError(response.error.message);
  };

  const cultivateEmployee = (): void => {
    if (!selectedEmployee) {
      return;
    }

    setEmployees((currentEmployees) =>
      currentEmployees.map((employee) =>
        employee.id === selectedEmployee.id
          ? {
              ...employee,
              level: employee.level + 1,
              loyalty: Math.min(employee.loyalty + 1, 100),
              management: employee.management + 2,
              negotiation: employee.negotiation + 2,
              execution: employee.execution + 2
            }
          : employee
      )
    );
    void progressTask("daily-train-employee");
  };

  const advanceProject = (): void => {
    if (!selectedProject) {
      return;
    }

    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== selectedProject.id) {
          return project;
        }

        const nextProgress = project.progress + 18;
        const isStageComplete = nextProgress >= 100;

        return {
          ...project,
          stage: isStageComplete ? project.stage + 1 : project.stage,
          progress: isStageComplete ? nextProgress - 100 : nextProgress,
          revenue: project.revenue + (isStageComplete ? 180 : 60)
        };
      })
    );
    void progressTask("main-first-project");
    void progressTask("daily-project-push");
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
      openHomePanel("创业知识");
      void progressTask(task.id);
      return;
    }

    if (task.unlockKind === "compliance") {
      openHomePanel("合规支线");
      void progressTask(task.id);
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
              <strong>主线</strong>
              <span>{currentMainTask ? `${currentMainTask.title}（${currentMainTask.progress}/${currentMainTask.target}）` : "任务配置读取中"}</span>
              <small>{currentMainTask ? `奖励：${currentMainTask.rewardLabel}` : "请确认 API 服务已启动"}</small>
            </div>
            <button className="task-go" type="button" onClick={openTaskScreen}>前往</button>
          </section>

          <section className="status-strip" aria-label="公司状态">
            <span>现金流{compactNumber(profile.monthlyIncome - profile.monthlyExpense)}</span>
            <span>收入{compactNumber(profile.monthlyIncome)}</span>
            <span>支出{compactNumber(profile.monthlyExpense)}</span>
            <span>待办{profile.pendingEventCount}</span>
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

          {activeNav === "员工" && selectedEmployee && (
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
                <span>在岗 {employees.length}</span>
                <span>平均忠诚 {Math.round(employees.reduce((total, employee) => total + employee.loyalty, 0) / employees.length)}</span>
                <span>月薪合计 34.8万</span>
              </section>

              <section className="employee-layout">
                <div className="employee-list" aria-label="员工列表">
                  {employees.map((employee) => (
                    <button
                      className={employee.id === selectedEmployee.id ? "selected" : undefined}
                      key={employee.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(employee.id)}
                    >
                      <span className={`quality ${employee.quality.toLowerCase()}`}>{employee.quality}</span>
                      <strong>{employee.name}</strong>
                      <em>{employee.role}</em>
                      <small>Lv.{employee.level}</small>
                    </button>
                  ))}
                </div>

                <article className="employee-detail" aria-label="员工详情">
                  <div className="employee-portrait">
                    <span>{selectedEmployee.name.slice(0, 1)}</span>
                    <strong>{selectedEmployee.name}</strong>
                    <em>{selectedEmployee.quality} · {selectedEmployee.role}</em>
                  </div>

                  <dl className="employee-stats">
                    <div>
                      <dt>等级</dt>
                      <dd>Lv.{selectedEmployee.level}</dd>
                    </div>
                    <div>
                      <dt>薪资</dt>
                      <dd>{selectedEmployee.salary}</dd>
                    </div>
                    <div>
                      <dt>忠诚</dt>
                      <dd>{selectedEmployee.loyalty}</dd>
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
                  </dl>

                  <p>{selectedEmployee.specialty}</p>

                  <div className="employee-actions">
                    <button type="button" onClick={cultivateEmployee}>培养</button>
                    <button type="button" onClick={() => openHomePanel("员工")}>招募</button>
                    <button type="button" onClick={() => openHomePanel("员工")}>股权</button>
                    <button type="button" onClick={() => openHomePanel("员工")}>解雇</button>
                  </div>
                </article>
              </section>
            </section>
          )}

          {activeNav === "项目" && selectedProject && (
            <section className="project-screen" aria-label="项目系统">
              <header className="project-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>项目</strong>
                  <span>预计月收益 {totalProjectRevenue.toLocaleString("zh-CN")}万</span>
                </div>
                <button type="button" onClick={() => openHomePanel("项目")}>规则</button>
              </header>

              <section className="project-summary" aria-label="项目概览">
                <span>在研 {projects.length}</span>
                <span>最高阶段 {Math.max(...projects.map((project) => project.stage))}</span>
                <span>推进任务 3/5</span>
              </section>

              <section className="project-layout">
                <div className="project-list" aria-label="项目列表">
                  {projects.map((project) => (
                    <button
                      className={project.id === selectedProject.id ? "selected" : undefined}
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <strong>{project.name}</strong>
                      <em>{project.category} · 阶段 {project.stage}</em>
                      <span>
                        <i style={{ width: `${project.progress}%` }} />
                      </span>
                      <small>预计 {project.revenue}万/月</small>
                    </button>
                  ))}
                </div>

                <article className="project-detail" aria-label="项目详情">
                  <div className="project-title">
                    <span>{selectedProject.category.slice(0, 2)}</span>
                    <strong>{selectedProject.name}</strong>
                    <em>阶段 {selectedProject.stage} · 风险 {selectedProject.risk}</em>
                  </div>

                  <dl className="project-stats">
                    <div>
                      <dt>进度</dt>
                      <dd>{selectedProject.progress}%</dd>
                    </div>
                    <div>
                      <dt>投入</dt>
                      <dd>{selectedProject.investment}</dd>
                    </div>
                    <div>
                      <dt>收益</dt>
                      <dd>{selectedProject.revenue}万/月</dd>
                    </div>
                    <div>
                      <dt>负责人</dt>
                      <dd>{employees.find((employee) => employee.id === selectedProject.ownerId)?.name ?? "待分配"}</dd>
                    </div>
                  </dl>

                  <div className="project-progress" aria-label="项目进度">
                    <span>
                      <i style={{ width: `${selectedProject.progress}%` }} />
                    </span>
                    <strong>{selectedProject.progress}%</strong>
                  </div>

                  <p>{selectedProject.summary}</p>

                  <div className="project-actions">
                    <button type="button" onClick={advanceProject}>推进</button>
                    <button type="button" onClick={() => openHomePanel("项目")}>立项</button>
                    <button type="button" onClick={() => openHomePanel("投资合作")}>加投</button>
                    <button type="button" onClick={() => openHomePanel("项目")}>结算</button>
                  </div>
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

              {taskError && <p className="task-error">{taskError}</p>}

              <section className="task-list" aria-label="任务列表">
                {visibleTasks.map((task) => (
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
                      <button disabled={task.isClaimed} type="button" onClick={() => guideTask(task)}>
                        {task.isClaimed ? "已领取" : task.isClaimable ? "领取" : task.guideAction}
                      </button>
                    </footer>
                  </article>
                ))}
              </section>
            </section>
          )}

          {selectedPanel && (
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
