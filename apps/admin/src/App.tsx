import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";
const ADMIN_SESSION_KEY = "wenziyouxi.admin.session";
const ADMIN_SESSION_VERSION = 1;

type AdminSession = {
  version: typeof ADMIN_SESSION_VERSION;
  token: string;
  account: string;
};

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

type AdminLoginResponse = {
  adminUserId: string;
  username: string;
  token: string;
};

type AdminSessionResponse = {
  adminUserId: string;
  username: string;
};

type AdminPlayerRow = {
  profileId: string;
  username: string;
  serverId: string;
  serverName: string;
  founderName: string;
  companyName: string;
  cash: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netCashFlow: number;
  valuation: number;
  totalDebt: number;
  riskStatus: string;
  profileStatus: string;
  walletBalance: number;
  vipExperience: number;
  vipLevel: number;
  purchaseCount: number;
  paymentOrderCount: number;
  titleCount: number;
  achievementCompletedCount: number;
  knowledgeUnlockCount: number;
  guildName: string | null;
  createdAt: string;
};

type AdminPlayerList = {
  rows: AdminPlayerRow[];
};

type VipConfig = {
  level: number;
  name: string;
  requiredExperience: number;
  dailyGiftPlatformCoins: number;
  dailyGiftActionPower: number;
  actionPowerLimitBonus: number;
  quickSettleTimes: number;
  trainingQueueBonus: number;
  recruitRefreshTimes: number;
  shopDiscountBasisPoints: number;
  title: string;
  avatarFrame: string;
  summary: string;
};

type CrossServerGroup = {
  id: string;
  name: string;
  ruleLabel: string;
  serverIds: string[];
  isActive: boolean;
};

type CrossServerGroupList = {
  groups: CrossServerGroup[];
};

type WalletAdjustment = {
  wallet: {
    balance: number;
    vipExperience: number;
  };
  auditLogId: string;
};

type VipAdjustment = {
  vipCenter: {
    currentLevel: VipConfig;
    wallet: {
      vipExperience: number;
    };
  };
  auditLogId: string;
};

type GroupAssignment = {
  group: CrossServerGroup;
  auditLogId: string;
};

type ConfigCenter = {
  titles: Array<{ id: string; name: string; category: string; source: string; bonusLabel: string; durationDays: number }>;
  achievements: Array<{ id: string; name: string; category: string; conditionKind: string; conditionValue: number; rewardPlatformCoins: number; rewardCash: number }>;
  knowledgeEntries: Array<{ id: string; title: string; sourceUrl: string; collectedAt: string; contentVersion: string; auditStatus: string }>;
  shopProducts: Array<{ id: string; name: string; category: string; pricePlatformCoins: number; purchaseLimit: number; isActive: boolean }>;
  leaderboardSnapshots: Array<{ id: string; serverId: string; boardName: string; snapshotDate: string; createdAt: string }>;
  mailCompensations: Array<{ id: string; profileId: string; subject: string; platformCoins: number; reason: string; createdAt: string }>;
  seasons: Array<{ id: string; name: string; status: string; startDate: string; endDate: string }>;
  activities: Array<{ id: string; name: string; status: string; leaderboardKey: string }>;
  scenarios: Array<{ id: string; name: string; rewardTitleId: string }>;
};

type AuditLog = {
  id: string;
  adminUsername: string;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
};

type AuditResult = {
  auditLogId: string;
};

type AnalyticsDashboard = {
  overview: {
    totalPlayers: number;
    retainedPlayers: number;
    apiErrorCount: number;
    slowApiCount: number;
  };
  onboarding: {
    tutorialSteps: Array<{ step: string; count: number }>;
  };
  business: {
    taskCompletionRateBasisPoints: number;
    achievementCompletionRateBasisPoints: number;
    knowledgeViewRateBasisPoints: number;
    eventChoiceRates: Array<{ option: string; count: number; rateBasisPoints: number }>;
    projectFailureRateBasisPoints: number;
    debtRatioDistribution: Array<{ band: string; count: number }>;
    fundingSuccessRateBasisPoints: number;
    employeeDepartureRateBasisPoints: number;
  };
  monetization: {
    platformCoinBalanceTotal: number;
    platformCoinGrantedTotal: number;
    platformCoinSpentTotal: number;
    vipLevelDistribution: Array<{ level: number; count: number }>;
    shopClickCount: number;
    shopPurchaseConversionBasisPoints: number;
  };
  alerts: Array<{ level: string; message: string; traceId: string | null }>;
};

type MailCompensation = AuditResult & {
  mailId: string;
  wallet: {
    balance: number;
  };
};

type ProfileStatus = AuditResult & {
  profileId: string;
  status: string;
};

type ActiveSection = "analytics" | "players" | "wallet" | "titles" | "cross" | "configs" | "audit";

const menuItems: Array<{ id: ActiveSection; label: string }> = [
  { id: "analytics", label: "数据看板" },
  { id: "players", label: "玩家查询" },
  { id: "wallet", label: "平台币 / VIP" },
  { id: "titles", label: "称号 / 补偿" },
  { id: "cross", label: "跨服分组" },
  { id: "configs", label: "配置清单" },
  { id: "audit", label: "审计日志" }
];

const formatNumber = (value: number): string => value.toLocaleString("zh-CN");
const formatRate = (basisPoints: number): string => `${(basisPoints / 100).toFixed(1)}%`;

const isAdminSession = (value: unknown): value is AdminSession => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const session = value as Partial<AdminSession>;
  return (
    session.version === ADMIN_SESSION_VERSION &&
    typeof session.account === "string" &&
    typeof session.token === "string"
  );
};

const loadAdminSession = (): AdminSession | null => {
  const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isAdminSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveAdminSession = (session: AdminSession): void => {
  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
};

const clearAdminSession = (): void => {
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
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

export default function App() {
  const initialSession = loadAdminSession();
  const [session, setSession] = useState<AdminSession | null>(initialSession);
  const [account, setAccount] = useState(initialSession?.account ?? "");
  const [password, setPassword] = useState("");
  const [keyword, setKeyword] = useState("");
  const [activeSection, setActiveSection] = useState<ActiveSection>("players");
  const [players, setPlayers] = useState<AdminPlayerRow[]>([]);
  const [vipConfigs, setVipConfigs] = useState<VipConfig[]>([]);
  const [crossGroups, setCrossGroups] = useState<CrossServerGroup[]>([]);
  const [configCenter, setConfigCenter] = useState<ConfigCenter>({
    titles: [],
    achievements: [],
    knowledgeEntries: [],
    shopProducts: [],
    leaderboardSnapshots: [],
    mailCompensations: [],
    seasons: [],
    activities: [],
    scenarios: []
  });
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [coinAmount, setCoinAmount] = useState("100");
  const [coinSource, setCoinSource] = useState("admin_grant");
  const [coinReason, setCoinReason] = useState("运营补偿");
  const [vipExperience, setVipExperience] = useState("0");
  const [vipReason, setVipReason] = useState("客服修正 VIP 经验");
  const [assignServerId, setAssignServerId] = useState("s1");
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignReason, setAssignReason] = useState("运营调整跨服分组");
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [titleReason, setTitleReason] = useState("运营发放称号");
  const [mailSubject, setMailSubject] = useState("运营补偿");
  const [mailBody, setMailBody] = useState("补偿已即时到账，请继续关注活动。");
  const [mailCoins, setMailCoins] = useState("100");
  const [statusReason, setStatusReason] = useState("运营风控处理");
  const [settleServerId, setSettleServerId] = useState("s1");
  const [settleReason, setSettleReason] = useState("运营手动结算排行榜");
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isRestoring, setIsRestoring] = useState(initialSession !== null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.profileId === selectedProfileId) ?? players[0] ?? null,
    [players, selectedProfileId]
  );

  const loadAdminData = useCallback(async (token: string, searchKeyword = keyword): Promise<void> => {
    setIsLoading(true);
    setError("");
    try {
      const [playerList, vipList, groupList] = await Promise.all([
        apiRequest<AdminPlayerList>(`/admin/players?keyword=${encodeURIComponent(searchKeyword.trim())}`, {}, token),
        apiRequest<VipConfig[]>("/admin/vip/configs", {}, token),
        apiRequest<CrossServerGroupList>("/admin/cross-server/groups", {}, token)
      ]);

      if (!playerList.success) {
        setError(playerList.error.message);
        return;
      }
      if (!vipList.success) {
        setError(vipList.error.message);
        return;
      }
      if (!groupList.success) {
        setError(groupList.error.message);
        return;
      }

      setPlayers(playerList.data.rows);
      setVipConfigs(vipList.data);
      setCrossGroups(groupList.data.groups);
      setAssignGroupId((current) => current || (groupList.data.groups[0]?.id ?? ""));
      setSettleServerId((current) => current || (playerList.data.rows[0]?.serverId ?? "s1"));
      const [configs, logs, analyticsResponse] = await Promise.all([
        apiRequest<ConfigCenter>("/admin/config-center", {}, token),
        apiRequest<AuditLog[]>("/admin/audit-logs", {}, token),
        apiRequest<AnalyticsDashboard>("/admin/analytics", {}, token)
      ]);
      if (!configs.success) {
        setError(configs.error.message);
        return;
      }
      if (!logs.success) {
        setError(logs.error.message);
        return;
      }
      if (!analyticsResponse.success) {
        setError(analyticsResponse.error.message);
        return;
      }
      setConfigCenter(configs.data);
      setAuditLogs(logs.data);
      setAnalytics(analyticsResponse.data);
      setSelectedTitleId((current) => current || (configs.data.titles[0]?.id ?? ""));
      if (playerList.data.rows.length > 0) {
        setSelectedProfileId((current) => current || (playerList.data.rows[0]?.profileId ?? ""));
        setAssignServerId((current) => current || (playerList.data.rows[0]?.serverId ?? "s1"));
      }
    } catch {
      setError("无法连接后台服务，请确认 API 服务和数据库已启动。");
    } finally {
      setIsLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    if (initialSession === null) {
      return;
    }

    let isMounted = true;

    const restoreSession = async (): Promise<void> => {
      try {
        const response = await apiRequest<AdminSessionResponse>("/admin/auth/session", {}, initialSession.token);

        if (!isMounted) {
          return;
        }

        if (!response.success) {
          clearAdminSession();
          setSession(null);
          setError("后台登录状态已过期，请重新登录。");
          return;
        }

        const nextSession: AdminSession = {
          version: ADMIN_SESSION_VERSION,
          account: response.data.username,
          token: initialSession.token
        };
        saveAdminSession(nextSession);
        setSession(nextSession);
        setAccount(response.data.username);
        await loadAdminData(nextSession.token, "");
      } catch {
        if (isMounted) {
          clearAdminSession();
          setSession(null);
          setError("无法连接后台服务，请确认 API 服务和数据库已启动。");
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

  const submitLogin = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedAccount = account.trim();

    if (trimmedAccount.length < 2 || password.length < 6) {
      setError("请输入有效的管理员账号和登录密码。");
      return;
    }

    try {
      const login = await apiRequest<AdminLoginResponse>("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: trimmedAccount, password })
      });

      if (!login.success) {
        setError("管理员账号或密码不正确。");
        return;
      }

      const nextSession: AdminSession = {
        version: ADMIN_SESSION_VERSION,
        account: login.data.username,
        token: login.data.token
      };
      saveAdminSession(nextSession);
      setSession(nextSession);
      setAccount(login.data.username);
      setPassword("");
      setError("");
      await loadAdminData(nextSession.token, "");
    } catch {
      setError("无法连接后台服务，请确认 API 服务和数据库已启动。");
    }
  };

  const logout = (): void => {
    clearAdminSession();
    setSession(null);
    setPassword("");
    setPlayers([]);
    setVipConfigs([]);
    setCrossGroups([]);
    setConfigCenter({ titles: [], achievements: [], knowledgeEntries: [], shopProducts: [], leaderboardSnapshots: [], mailCompensations: [], seasons: [], activities: [], scenarios: [] });
    setAnalytics(null);
    setAuditLogs([]);
  };

  const submitSearch = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session !== null) {
      await loadAdminData(session.token, keyword);
      setActionMessage("已按当前条件刷新运营数据。");
    }
  };

  const submitCoinAdjustment = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null || selectedPlayer === null) {
      return;
    }
    const changeAmount = Number.parseInt(coinAmount, 10);
    if (!Number.isInteger(changeAmount) || changeAmount === 0 || coinReason.trim().length < 2) {
      setError("请输入非零平台币调整数量和正式原因。");
      return;
    }
    if (!window.confirm(`确认对 ${selectedPlayer.companyName} 调整平台币 ${changeAmount}？`)) {
      return;
    }

    const adjusted = await apiRequest<WalletAdjustment>("/admin/wallet/adjust", {
      method: "POST",
      body: JSON.stringify({
        profileId: selectedPlayer.profileId,
        source: coinSource,
        changeAmount,
        reason: coinReason.trim()
      })
    }, session.token);
    if (!adjusted.success) {
      setError(adjusted.error.message);
      return;
    }
    setActionMessage(`平台币操作已记录审计：${adjusted.data.auditLogId}`);
    await loadAdminData(session.token, keyword);
  };

  const submitVipAdjustment = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null || selectedPlayer === null) {
      return;
    }
    const nextVipExperience = Number.parseInt(vipExperience, 10);
    if (!Number.isInteger(nextVipExperience) || nextVipExperience < 0 || vipReason.trim().length < 2) {
      setError("请输入非负 VIP 经验和正式原因。");
      return;
    }
    if (!window.confirm(`确认修正 ${selectedPlayer.companyName} 的 VIP 经验为 ${nextVipExperience}？`)) {
      return;
    }

    const adjusted = await apiRequest<VipAdjustment>("/admin/vip/adjust", {
      method: "POST",
      body: JSON.stringify({
        profileId: selectedPlayer.profileId,
        vipExperience: nextVipExperience,
        reason: vipReason.trim()
      })
    }, session.token);
    if (!adjusted.success) {
      setError(adjusted.error.message);
      return;
    }
    setActionMessage(`VIP 已调整为 ${adjusted.data.vipCenter.currentLevel.name}，审计记录：${adjusted.data.auditLogId}`);
    await loadAdminData(session.token, keyword);
  };

  const submitGroupAssignment = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null) {
      return;
    }
    if (assignServerId.trim() === "" || assignGroupId.trim() === "" || assignReason.trim().length < 2) {
      setError("请选择区服、跨服分组并填写调整原因。");
      return;
    }
    if (!window.confirm(`确认将 ${assignServerId} 调整到 ${assignGroupId}？`)) {
      return;
    }

    const assigned = await apiRequest<GroupAssignment>("/admin/cross-server/groups/assign", {
      method: "POST",
      body: JSON.stringify({
        serverId: assignServerId.trim(),
        groupId: assignGroupId.trim(),
        reason: assignReason.trim()
      })
    }, session.token);
    if (!assigned.success) {
      setError(assigned.error.message);
      return;
    }
    setActionMessage(`跨服分组已调整：${assigned.data.group.name}，审计记录：${assigned.data.auditLogId}`);
    await loadAdminData(session.token, keyword);
  };

  const submitTitleAction = async (event: { preventDefault(): void }, action: "grant" | "revoke"): Promise<void> => {
    event.preventDefault();
    if (session === null || selectedPlayer === null) {
      return;
    }
    if (selectedTitleId === "" || titleReason.trim().length < 2) {
      setError("请选择称号并填写正式原因。");
      return;
    }
    const label = action === "grant" ? "发放" : "回收";
    if (!window.confirm(`确认对 ${selectedPlayer.companyName} ${label}称号 ${selectedTitleId}？`)) {
      return;
    }

    const result = await apiRequest<AuditResult>(`/admin/titles/${action}`, {
      method: "POST",
      body: JSON.stringify({
        profileId: selectedPlayer.profileId,
        titleId: selectedTitleId,
        reason: titleReason.trim()
      })
    }, session.token);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setActionMessage(`称号${label}已记录审计：${result.data.auditLogId}`);
    await loadAdminData(session.token, keyword);
  };

  const submitMailCompensation = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null || selectedPlayer === null) {
      return;
    }
    const platformCoins = Number.parseInt(mailCoins, 10);
    if (!Number.isInteger(platformCoins) || platformCoins < 0 || mailSubject.trim().length < 2 || mailBody.trim().length < 2) {
      setError("请输入邮件标题、正文和非负平台币数量。");
      return;
    }
    if (!window.confirm(`确认向 ${selectedPlayer.companyName} 发送补偿邮件并发放 ${platformCoins} 平台币？`)) {
      return;
    }

    const result = await apiRequest<MailCompensation>("/admin/mail/compensate", {
      method: "POST",
      body: JSON.stringify({
        profileId: selectedPlayer.profileId,
        subject: mailSubject.trim(),
        body: mailBody.trim(),
        platformCoins,
        reason: mailSubject.trim()
      })
    }, session.token);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setActionMessage(`邮件补偿已发放，余额 ${formatNumber(result.data.wallet.balance)}，审计记录：${result.data.auditLogId}`);
    await loadAdminData(session.token, keyword);
  };

  const submitProfileStatus = async (status: "active" | "banned"): Promise<void> => {
    if (session === null || selectedPlayer === null) {
      return;
    }
    const label = status === "banned" ? "封禁" : "解封";
    if (statusReason.trim().length < 2) {
      setError("请输入封禁或解封原因。");
      return;
    }
    if (!window.confirm(`确认${label} ${selectedPlayer.companyName}？`)) {
      return;
    }

    const result = await apiRequest<ProfileStatus>("/admin/players/status", {
      method: "POST",
      body: JSON.stringify({
        profileId: selectedPlayer.profileId,
        status,
        reason: statusReason.trim()
      })
    }, session.token);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setActionMessage(`玩家状态已更新为 ${result.data.status}，审计记录：${result.data.auditLogId}`);
    await loadAdminData(session.token, keyword);
  };

  const submitLeaderboardSettlement = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (session === null) {
      return;
    }
    if (settleServerId.trim() === "" || settleReason.trim().length < 2) {
      setError("请输入区服 ID 和结算原因。");
      return;
    }
    if (!window.confirm(`确认手动结算 ${settleServerId} 排行榜奖励？`)) {
      return;
    }

    const result = await apiRequest<AuditResult & { deliveredRewards: number }>("/admin/leaderboards/settle", {
      method: "POST",
      body: JSON.stringify({
        serverId: settleServerId.trim(),
        reason: settleReason.trim()
      })
    }, session.token);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setActionMessage(`排行榜结算完成，发放 ${result.data.deliveredRewards} 条奖励，审计记录：${result.data.auditLogId}`);
    await loadAdminData(session.token, keyword);
  };

  if (session === null) {
    return (
      <main className="admin-login-shell">
        <section className="admin-login-panel" aria-label="后台登录">
          <div className="admin-login-brand">
            <span>管</span>
            <div>
              <h1>运营管理后台</h1>
              <p>写字楼创业记</p>
            </div>
          </div>
          <form className="admin-login-form" onSubmit={(event) => void submitLogin(event)}>
            <label>
              管理员账号
              <input
                autoComplete="username"
                onChange={(event) => setAccount(event.target.value)}
                placeholder="请输入管理员账号"
                value={account}
              />
            </label>
            <label>
              登录密码
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入登录密码"
                type="password"
                value={password}
              />
            </label>
            {error && <p className="admin-error">{error}</p>}
            <button type="submit">登录后台</button>
          </form>
        </section>
      </main>
    );
  }

  if (isRestoring) {
    return (
      <main className="admin-login-shell">
        <section className="admin-login-panel" aria-label="后台登录状态检查">
          <div className="admin-login-brand">
            <span>管</span>
            <div>
              <h1>运营管理后台</h1>
              <p>正在校验登录状态</p>
            </div>
          </div>
          {error && <p className="admin-error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar" aria-label="后台菜单">
        <div className="brand">
          <span className="brand-mark">创</span>
          <div>
            <strong>写字楼创业记</strong>
            <span>运营管理后台</span>
          </div>
        </div>

        <nav className="nav-list">
          {menuItems.map((item) => (
            <button
              className={item.id === activeSection ? "active" : undefined}
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Phase 17 商业化调优</p>
            <h1>{menuItems.find((item) => item.id === activeSection)?.label}</h1>
          </div>
          <div className="operator-bar">
            <span>{session.account}</span>
            <button type="button" onClick={logout}>
              退出登录
            </button>
          </div>
        </header>

        <form className="filter-bar" aria-label="玩家筛选" onSubmit={(event) => void submitSearch(event)}>
          <label>
            关键词
            <input
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="账号 / 创始人 / 公司名 / 区服"
              value={keyword}
            />
          </label>
          <button disabled={isLoading} type="submit">
            查询
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setKeyword("");
              if (session !== null) {
                void loadAdminData(session.token, "");
              }
            }}
          >
            重置
          </button>
        </form>

        {error && <p className="admin-error">{error}</p>}
        {actionMessage && <p className="action-message">{actionMessage}</p>}

        {activeSection === "analytics" && (
          <section className="stacked-sections" aria-label="商业化数据看板">
            <section className="analytics-grid" aria-label="核心指标">
              <div className="metric-card">
                <span>玩家总数</span>
                <strong>{formatNumber(analytics?.overview.totalPlayers ?? 0)}</strong>
              </div>
              <div className="metric-card">
                <span>留存玩家</span>
                <strong>{formatNumber(analytics?.overview.retainedPlayers ?? 0)}</strong>
              </div>
              <div className="metric-card">
                <span>API 错误</span>
                <strong>{formatNumber(analytics?.overview.apiErrorCount ?? 0)}</strong>
              </div>
              <div className="metric-card">
                <span>慢接口</span>
                <strong>{formatNumber(analytics?.overview.slowApiCount ?? 0)}</strong>
              </div>
            </section>

            <section className="operation-grid" aria-label="商业化调优指标">
              <section className="table-section compact-table">
                <div className="table-toolbar">
                  <strong>任务与玩法漏斗</strong>
                  <span>实时聚合</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>指标</th>
                        <th>数值</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>任务完成率</td><td>{formatRate(analytics?.business.taskCompletionRateBasisPoints ?? 0)}</td></tr>
                      <tr><td>成就完成率</td><td>{formatRate(analytics?.business.achievementCompletionRateBasisPoints ?? 0)}</td></tr>
                      <tr><td>知识点查看率</td><td>{formatRate(analytics?.business.knowledgeViewRateBasisPoints ?? 0)}</td></tr>
                      <tr><td>项目失败率</td><td>{formatRate(analytics?.business.projectFailureRateBasisPoints ?? 0)}</td></tr>
                      <tr><td>融资成功率</td><td>{formatRate(analytics?.business.fundingSuccessRateBasisPoints ?? 0)}</td></tr>
                      <tr><td>员工离职率</td><td>{formatRate(analytics?.business.employeeDepartureRateBasisPoints ?? 0)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="table-section compact-table">
                <div className="table-toolbar">
                  <strong>商业化与平台币</strong>
                  <span>发放 / 消耗 / 转化</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>指标</th>
                        <th>数值</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>平台币存量</td><td>{formatNumber(analytics?.monetization.platformCoinBalanceTotal ?? 0)}</td></tr>
                      <tr><td>平台币发放</td><td>{formatNumber(analytics?.monetization.platformCoinGrantedTotal ?? 0)}</td></tr>
                      <tr><td>平台币消耗</td><td>{formatNumber(analytics?.monetization.platformCoinSpentTotal ?? 0)}</td></tr>
                      <tr><td>商品点击</td><td>{formatNumber(analytics?.monetization.shopClickCount ?? 0)}</td></tr>
                      <tr><td>购买转化率</td><td>{formatRate(analytics?.monetization.shopPurchaseConversionBasisPoints ?? 0)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </section>

            <section className="config-grid" aria-label="分布与告警">
              <div>
                <h3>新手步骤埋点</h3>
                {(analytics?.onboarding.tutorialSteps.length ?? 0) === 0 ? (
                  <p>暂无新手步骤数据。</p>
                ) : analytics?.onboarding.tutorialSteps.map((step) => (
                  <p key={step.step}>{step.step}：{formatNumber(step.count)}</p>
                ))}
              </div>
              <div>
                <h3>负债率分布</h3>
                {(analytics?.business.debtRatioDistribution ?? []).map((item) => (
                  <p key={item.band}>{item.band}：{formatNumber(item.count)}</p>
                ))}
              </div>
              <div>
                <h3>VIP 等级分布</h3>
                {(analytics?.monetization.vipLevelDistribution.length ?? 0) === 0 ? (
                  <p>暂无 VIP 数据。</p>
                ) : analytics?.monetization.vipLevelDistribution.map((item) => (
                  <p key={item.level}>VIP {item.level}：{formatNumber(item.count)}</p>
                ))}
              </div>
              <div>
                <h3>运营告警</h3>
                {(analytics?.alerts ?? []).map((alert) => (
                  <p key={alert.message}>{alert.level}：{alert.message}</p>
                ))}
              </div>
            </section>
          </section>
        )}

        {activeSection === "players" && (
          <section className="table-section" aria-label="玩家列表">
            <div className="table-toolbar">
              <strong>玩家账号与公司档案</strong>
              <span>共 {players.length} 条记录</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>账号</th>
                    <th>区服</th>
                    <th>创始人</th>
                    <th>公司</th>
                    <th>现金</th>
                    <th>净现金流</th>
                    <th>平台币</th>
                    <th>VIP</th>
                    <th>购买/支付</th>
                    <th>称号/成就/知识</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((row) => (
                    <tr key={row.profileId}>
                      <td>{row.username}</td>
                      <td>{row.serverName}</td>
                      <td>{row.founderName}</td>
                      <td>{row.companyName}</td>
                      <td>{formatNumber(row.cash)}</td>
                      <td>{formatNumber(row.netCashFlow)}</td>
                      <td>{formatNumber(row.walletBalance)}</td>
                      <td>VIP {row.vipLevel}</td>
                      <td>{row.purchaseCount} / {row.paymentOrderCount}</td>
                      <td>{row.titleCount} / {row.achievementCompletedCount} / {row.knowledgeUnlockCount}</td>
                      <td>
                        <span className={`status-tag status-${row.riskStatus}`}>{row.riskStatus}</span>
                        <span className={`status-tag status-${row.profileStatus}`}>{row.profileStatus === "banned" ? "已封禁" : "正常"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeSection === "wallet" && (
          <section className="operation-grid" aria-label="平台币与 VIP 操作">
            <form className="operation-panel" onSubmit={(event) => void submitCoinAdjustment(event)}>
              <h2>平台币发放、扣减、修正</h2>
              <label>
                玩家
                <select onChange={(event) => setSelectedProfileId(event.target.value)} value={selectedPlayer?.profileId ?? ""}>
                  {players.map((player) => (
                    <option key={player.profileId} value={player.profileId}>
                      {player.companyName} / {player.founderName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                操作类型
                <select onChange={(event) => setCoinSource(event.target.value)} value={coinSource}>
                  <option value="admin_grant">后台发放</option>
                  <option value="admin_deduct">后台扣减</option>
                  <option value="admin_correction">余额修正</option>
                </select>
              </label>
              <label>
                变动数量
                <input onChange={(event) => setCoinAmount(event.target.value)} value={coinAmount} />
              </label>
              <label>
                操作原因
                <input onChange={(event) => setCoinReason(event.target.value)} value={coinReason} />
              </label>
              <button type="submit">二次确认后提交</button>
            </form>

            <form className="operation-panel" onSubmit={(event) => void submitVipAdjustment(event)}>
              <h2>VIP 查询和经验调整</h2>
              <p className="panel-note">
                当前玩家：{selectedPlayer === null ? "暂无玩家" : `${selectedPlayer.companyName}，VIP ${selectedPlayer.vipLevel}，经验 ${selectedPlayer.vipExperience}`}
              </p>
              <label>
                VIP 经验
                <input onChange={(event) => setVipExperience(event.target.value)} value={vipExperience} />
              </label>
              <label>
                调整原因
                <input onChange={(event) => setVipReason(event.target.value)} value={vipReason} />
              </label>
              <button type="submit">二次确认后调整</button>
            </form>
          </section>
        )}

        {activeSection === "titles" && (
          <section className="operation-grid" aria-label="称号与补偿操作">
            <form className="operation-panel" onSubmit={(event) => void submitTitleAction(event, "grant")}>
              <h2>称号发放与回收</h2>
              <label>
                玩家
                <select onChange={(event) => setSelectedProfileId(event.target.value)} value={selectedPlayer?.profileId ?? ""}>
                  {players.map((player) => (
                    <option key={player.profileId} value={player.profileId}>
                      {player.companyName} / {player.founderName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                称号
                <select onChange={(event) => setSelectedTitleId(event.target.value)} value={selectedTitleId}>
                  {configCenter.titles.map((title) => (
                    <option key={title.id} value={title.id}>
                      {title.name} / {title.source}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                操作原因
                <input onChange={(event) => setTitleReason(event.target.value)} value={titleReason} />
              </label>
              <div className="button-row">
                <button type="submit">二次确认后发放</button>
                <button className="secondary-button" type="button" onClick={(event) => void submitTitleAction(event, "revoke")}>
                  二次确认后回收
                </button>
              </div>
            </form>

            <form className="operation-panel" onSubmit={(event) => void submitMailCompensation(event)}>
              <h2>邮件补偿</h2>
              <p className="panel-note">
                当前玩家：{selectedPlayer === null ? "暂无玩家" : `${selectedPlayer.companyName}，平台币 ${formatNumber(selectedPlayer.walletBalance)}`}
              </p>
              <label>
                邮件标题
                <input onChange={(event) => setMailSubject(event.target.value)} value={mailSubject} />
              </label>
              <label>
                邮件正文
                <input onChange={(event) => setMailBody(event.target.value)} value={mailBody} />
              </label>
              <label>
                补偿平台币
                <input onChange={(event) => setMailCoins(event.target.value)} value={mailCoins} />
              </label>
              <button type="submit">二次确认后发送</button>
            </form>

            <section className="operation-panel">
              <h2>封禁 / 解封</h2>
              <label>
                处理原因
                <input onChange={(event) => setStatusReason(event.target.value)} value={statusReason} />
              </label>
              <div className="button-row">
                <button type="button" onClick={() => void submitProfileStatus("banned")}>封禁玩家</button>
                <button className="secondary-button" type="button" onClick={() => void submitProfileStatus("active")}>解封玩家</button>
              </div>
            </section>
          </section>
        )}

        {activeSection === "cross" && (
          <section className="operation-grid" aria-label="跨服分组管理">
            <form className="operation-panel" onSubmit={(event) => void submitGroupAssignment(event)}>
              <h2>区服入池调整</h2>
              <label>
                区服 ID
                <input onChange={(event) => setAssignServerId(event.target.value)} value={assignServerId} />
              </label>
              <label>
                目标跨服池
                <select onChange={(event) => setAssignGroupId(event.target.value)} value={assignGroupId}>
                  {crossGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                调整原因
                <input onChange={(event) => setAssignReason(event.target.value)} value={assignReason} />
              </label>
              <button type="submit">二次确认后调整</button>
            </form>

            <section className="table-section compact-table" aria-label="跨服分组列表">
              <div className="table-toolbar">
                <strong>跨服分组</strong>
                <span>{crossGroups.length} 个池</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>分组</th>
                      <th>规则</th>
                      <th>区服</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crossGroups.map((group) => (
                      <tr key={group.id}>
                        <td>{group.name}</td>
                        <td>{group.ruleLabel}</td>
                        <td>{group.serverIds.join("、")}</td>
                        <td>{group.isActive ? "启用" : "停用"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeSection === "configs" && (
          <section className="stacked-sections" aria-label="配置与排行榜">
            <form className="operation-panel narrow-panel" onSubmit={(event) => void submitLeaderboardSettlement(event)}>
              <h2>排行榜手动结算</h2>
              <label>
                区服 ID
                <input onChange={(event) => setSettleServerId(event.target.value)} value={settleServerId} />
              </label>
              <label>
                结算原因
                <input onChange={(event) => setSettleReason(event.target.value)} value={settleReason} />
              </label>
              <button type="submit">二次确认后结算</button>
            </form>

            <section className="table-section" aria-label="VIP 配置列表">
              <div className="table-toolbar">
                <strong>VIP 配置清单</strong>
                <span>配置错误会在提交接口被拦截</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>等级</th>
                      <th>所需经验</th>
                      <th>每日礼包</th>
                      <th>行动力上限</th>
                      <th>商店折扣</th>
                      <th>称号</th>
                      <th>说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vipConfigs.map((config) => (
                      <tr key={config.level}>
                        <td>{config.name}</td>
                        <td>{formatNumber(config.requiredExperience)}</td>
                        <td>{config.dailyGiftPlatformCoins} 平台币 / {config.dailyGiftActionPower} 行动力</td>
                        <td>+{config.actionPowerLimitBonus}</td>
                        <td>{config.shopDiscountBasisPoints / 100}%</td>
                        <td>{config.title}</td>
                        <td>{config.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="table-section compact-table" aria-label="称号成就知识商品配置">
              <div className="table-toolbar">
                <strong>称号 / 成就 / 知识 / 商品</strong>
                <span>{configCenter.titles.length} 个称号，{configCenter.knowledgeEntries.length} 条知识</span>
              </div>
              <div className="config-grid">
                <div>
                  <h3>称号配置</h3>
                  {configCenter.titles.slice(0, 6).map((title) => (
                    <p key={title.id}>{title.name}：{title.bonusLabel}</p>
                  ))}
                </div>
                <div>
                  <h3>成就配置</h3>
                  {configCenter.achievements.slice(0, 6).map((achievement) => (
                    <p key={achievement.id}>{achievement.name}：{achievement.conditionKind} ≥ {achievement.conditionValue}</p>
                  ))}
                </div>
                <div>
                  <h3>知识审核字段</h3>
                  {configCenter.knowledgeEntries.slice(0, 6).map((knowledge) => (
                    <p key={knowledge.id}>{knowledge.title}：{knowledge.collectedAt} / {knowledge.contentVersion} / {knowledge.auditStatus}</p>
                  ))}
                </div>
                <div>
                  <h3>商品配置</h3>
                  {configCenter.shopProducts.slice(0, 6).map((product) => (
                    <p key={product.id}>{product.name}：{formatNumber(product.pricePlatformCoins)} 平台币 / {product.isActive ? "启用" : "停用"}</p>
                  ))}
                </div>
              </div>
            </section>

            <section className="table-section compact-table" aria-label="赛季活动剧本配置">
              <div className="table-toolbar">
                <strong>赛季 / 活动 / 经营剧本</strong>
                <span>{configCenter.seasons.length} 个赛季，{configCenter.activities.length} 个活动</span>
              </div>
              <div className="config-grid">
                <div>
                  <h3>赛季配置</h3>
                  {configCenter.seasons.map((season) => (
                    <p key={season.id}>{season.name}：{season.status} / {season.startDate} - {season.endDate}</p>
                  ))}
                </div>
                <div>
                  <h3>活动配置</h3>
                  {configCenter.activities.map((activity) => (
                    <p key={activity.id}>{activity.name}：{activity.status} / {activity.leaderboardKey}</p>
                  ))}
                </div>
                <div>
                  <h3>经营剧本</h3>
                  {configCenter.scenarios.map((scenario) => (
                    <p key={scenario.id}>{scenario.name}：奖励称号 {scenario.rewardTitleId}</p>
                  ))}
                </div>
              </div>
            </section>
          </section>
        )}

        {activeSection === "audit" && (
          <section className="table-section" aria-label="操作审计日志">
            <div className="table-toolbar">
              <strong>操作审计日志</strong>
              <span>最近 {auditLogs.length} 条</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>管理员</th>
                    <th>动作</th>
                    <th>对象</th>
                    <th>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString("zh-CN")}</td>
                      <td>{log.adminUsername}</td>
                      <td>{log.action}</td>
                      <td>{log.targetType} / {log.targetId ?? "-"}</td>
                      <td>{log.detail ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
