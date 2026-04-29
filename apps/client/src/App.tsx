import { type FormEvent, useMemo, useState } from "react";

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
  createdAt: string;
};

type StoredSession = {
  version: typeof SESSION_VERSION;
  account: AccountSession;
  server: ServerOption;
  avatar: AvatarOption;
  profile: PlayerProfile;
};

const reports = [
  { label: "产品进度", value: "8%" },
  { label: "现金", value: "¥50,000" },
  { label: "团队", value: "1人" }
];

const navItems = ["公司", "市场", "项目", "人脉"];

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
  const [step, setStep] = useState<OnboardingStep>(initialSession ? "game" : "auth");
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

  const selectedServer = useMemo(
    () => servers.find((server) => server.id === serverId) ?? servers[0],
    [serverId, servers]
  );
  const selectedAvatar = useMemo(
    () => avatars.find((avatar) => avatar.id === avatarId) ?? avatars[0],
    [avatarId, avatars]
  );

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

  const submitAuth = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || password.length < 6) {
      setError("账号至少 3 个字符，密码至少 6 个字符。");
      return;
    }

    setIsBusy(true);
    setError("");

    try {
      const authPath = authMode === "register" ? "/auth/register" : "/auth/login";
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
      setServers(serverResponse.data);
      setAvatars(avatarResponse.data);
      setServerId(recommendedServer.id);
      setAvatarId(firstAvatar.id);
      setStep("server");
    } catch {
      setError("无法连接游戏服务器，请确认 API 服务已启动。");
    } finally {
      setIsBusy(false);
    }
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
    setPassword("");
    setStep("auth");
  };

  if (step === "game" && profile && selectedServer && selectedAvatar) {
    return (
      <main className="game-shell" aria-label="游戏主界面">
        <header className="game-topbar">
          <div>
            <p className="caption">{selectedServer.name}</p>
            <h1>{profile.companyName}</h1>
          </div>
          <button type="button" onClick={leaveGame}>
            重新登录
          </button>
        </header>

        <section className="portrait-card" aria-label="创始人档案">
          <div className="avatar-mark">{selectedAvatar.glyph}</div>
          <div>
            <p className="caption">{selectedAvatar.name}</p>
            <h2>{profile.founderName}</h2>
            <p>账号：{account?.username ?? "已登录"}</p>
          </div>
        </section>

        <section className="office-scene" aria-label="经营场景">
          <div className="window-grid" aria-hidden="true" />
          <div className="desk desk-left" />
          <div className="desk desk-center" />
          <div className="desk desk-right" />
          <div className="scene-note">
            <strong>公司刚成立</strong>
            <span>第一周目标：完成可玩原型并招募核心成员。</span>
          </div>
        </section>

        <section className="status-panel" aria-label="经营状态">
          <div>
            <p className="caption">初始档案</p>
            <h2>Profile #{profile.id.slice(0, 8)}</h2>
          </div>
          <dl>
            {reports.map((report) => (
              <div key={report.label}>
                <dt>{report.label}</dt>
                <dd>{report.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav className="bottom-nav" aria-label="底部导航">
          {navItems.map((item, index) => (
            <button className={index === 0 ? "active" : undefined} type="button" key={item}>
              {item}
            </button>
          ))}
        </nav>
      </main>
    );
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-panel" aria-label="进入游戏">
        <div className="panel-heading">
          <p className="caption">API: {API_BASE_URL}</p>
          <h1>写字楼创业记</h1>
          <p>注册或登录后选择区服，创建你的创始人和公司档案。</p>
        </div>

        <ol className="step-list" aria-label="引导步骤">
          {["账号", "服务器", "头像", "档案"].map((label, index) => (
            <li className={index <= ["auth", "server", "avatar", "profile"].indexOf(step) ? "active" : ""} key={label}>
              {label}
            </li>
          ))}
        </ol>

        {error && <p className="form-error">{error}</p>}

        {step === "auth" && (
          <form className="flow-form" onSubmit={(event) => void submitAuth(event)}>
            <div className="segmented-control" role="tablist" aria-label="登录方式">
              <button
                aria-selected={authMode === "login"}
                className={authMode === "login" ? "selected" : ""}
                onClick={() => setAuthMode("login")}
                role="tab"
                type="button"
              >
                登录
              </button>
              <button
                aria-selected={authMode === "register"}
                className={authMode === "register" ? "selected" : ""}
                onClick={() => setAuthMode("register")}
                role="tab"
                type="button"
              >
                注册
              </button>
            </div>
            <label>
              账号名
              <input
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="例如：linzhou"
                value={username}
              />
            </label>
            <label>
              密码
              <input
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
                type="password"
                value={password}
              />
            </label>
            <button className="primary-button" disabled={isBusy} type="submit">
              {isBusy ? "连接中" : "继续"}
            </button>
          </form>
        )}

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

        {step === "profile" && (
          <form className="flow-form" onSubmit={(event) => void submitProfile(event)}>
            <label>
              创始人姓名
              <input
                autoComplete="name"
                onChange={(event) => setFounderName(event.target.value)}
                placeholder="例如：林舟"
                value={founderName}
              />
            </label>
            <label>
              公司名
              <input
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="例如：星火互动"
                value={companyName}
              />
            </label>
            <div className="profile-summary">
              <span>{selectedServer?.name}</span>
              <span>{selectedAvatar?.name}</span>
            </div>
            <div className="flow-actions">
              <button type="button" onClick={() => setStep("avatar")}>
                返回
              </button>
              <button className="primary-button" disabled={isBusy} type="submit">
                {isBusy ? "创建中" : "创建档案"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

export default App;
