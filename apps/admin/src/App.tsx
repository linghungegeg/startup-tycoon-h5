import { type FormEvent, useEffect, useMemo, useState } from "react";

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

type PlayerRow = {
  id: string;
  server: string;
  founder: string;
  company: string;
  status: "正常" | "待关注" | "已限制";
  coinBalance: number;
  vipLevel: number;
  lastLogin: string;
};

const menuItems = ["玩家管理", "区服管理", "平台币流水", "VIP 管理", "活动配置", "审计日志"];

const playerRows: PlayerRow[] = [
  {
    id: "P10001",
    server: "长宁一服",
    founder: "林舟",
    company: "星火互动",
    status: "正常",
    coinBalance: 1280,
    vipLevel: 1,
    lastLogin: "2026-04-30 09:18"
  },
  {
    id: "P10002",
    server: "滨江新区",
    founder: "陈澈",
    company: "云帆科技",
    status: "待关注",
    coinBalance: 320,
    vipLevel: 0,
    lastLogin: "2026-04-30 08:42"
  },
  {
    id: "P10003",
    server: "长宁一服",
    founder: "许安",
    company: "青禾数据",
    status: "正常",
    coinBalance: 2460,
    vipLevel: 2,
    lastLogin: "2026-04-29 22:06"
  },
  {
    id: "P10004",
    server: "中关村路演场",
    founder: "周砚",
    company: "启明智能",
    status: "已限制",
    coinBalance: 0,
    vipLevel: 0,
    lastLogin: "2026-04-28 19:35"
  }
];

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
  const [status, setStatus] = useState<"全部" | PlayerRow["status"]>("全部");
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isRestoring, setIsRestoring] = useState(initialSession !== null);

  const filteredRows = useMemo(() => {
    const trimmedKeyword = keyword.trim();
    return playerRows.filter((row) => {
      const matchesStatus = status === "全部" || row.status === status;
      const matchesKeyword =
        trimmedKeyword === "" ||
        row.id.includes(trimmedKeyword) ||
        row.founder.includes(trimmedKeyword) ||
        row.company.includes(trimmedKeyword);
      return matchesStatus && matchesKeyword;
    });
  }, [keyword, status]);

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
    } catch {
      setError("无法连接后台服务，请确认 API 服务和数据库已启动。");
    }
  };

  const logout = (): void => {
    clearAdminSession();
    setSession(null);
    setPassword("");
  };

  const showActionMessage = (message: string): void => {
    setActionMessage(message);
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
          {menuItems.map((item, index) => (
            <button className={index === 0 ? "active" : undefined} type="button" key={item}>
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>玩家管理</p>
            <h1>玩家账号与公司档案</h1>
          </div>
          <div className="operator-bar">
            <span>{session.account}</span>
            <button type="button" onClick={logout}>
              退出登录
            </button>
          </div>
        </header>

        <section className="filter-bar" aria-label="玩家筛选">
          <label>
            关键词
            <input
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="玩家编号 / 创始人 / 公司名"
              value={keyword}
            />
          </label>
          <label>
            状态
            <select onChange={(event) => setStatus(event.target.value as "全部" | PlayerRow["status"])} value={status}>
              <option value="全部">全部</option>
              <option value="正常">正常</option>
              <option value="待关注">待关注</option>
              <option value="已限制">已限制</option>
            </select>
          </label>
          <button type="button" onClick={() => showActionMessage("已按当前条件刷新玩家列表。")}>
            查询
          </button>
          <button className="secondary-button" type="button" onClick={() => { setKeyword(""); setStatus("全部"); showActionMessage("已重置筛选条件。"); }}>
            重置
          </button>
        </section>

        <section className="table-section" aria-label="玩家列表">
          <div className="table-toolbar">
            <strong>玩家列表</strong>
            <div>
              <button type="button" onClick={() => showActionMessage("请选择玩家后再发放补偿。")}>
                发放补偿
              </button>
              <button className="secondary-button" type="button" onClick={() => showActionMessage("当前筛选结果已准备导出。")}>
                导出记录
              </button>
            </div>
          </div>

          {actionMessage && <p className="action-message">{actionMessage}</p>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>玩家编号</th>
                  <th>区服</th>
                  <th>创始人</th>
                  <th>公司</th>
                  <th>状态</th>
                  <th>平台币</th>
                  <th>VIP</th>
                  <th>最近登录</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.server}</td>
                    <td>{row.founder}</td>
                    <td>{row.company}</td>
                    <td>
                      <span className={`status-tag status-${row.status}`}>{row.status}</span>
                    </td>
                    <td>{row.coinBalance}</td>
                    <td>VIP {row.vipLevel}</td>
                    <td>{row.lastLogin}</td>
                    <td>
                      <button className="text-button" type="button" onClick={() => showActionMessage(`正在查看 ${row.company} 的玩家档案。`)}>
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="pagination">
            <span>共 {filteredRows.length} 条记录</span>
            <div>
              <button className="secondary-button" type="button">上一页</button>
              <button className="secondary-button" type="button">下一页</button>
            </div>
          </footer>
        </section>
      </section>
    </main>
  );
}
