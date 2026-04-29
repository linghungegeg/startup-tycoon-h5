import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { ApiConfig } from "./config.js";

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

type HealthResponse = {
  service: string;
  status: "ok";
  timestamp: string;
  dependencies: ApiConfig["dependencies"];
};

type Account = {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
};

type ServerInfo = {
  id: string;
  name: string;
  status: "recommended" | "new" | "busy";
  label: string;
  isRecommended: boolean;
};

type AvatarInfo = {
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

type ApiState = {
  accountsByUsername: Map<string, Account>;
  accountsById: Map<string, Account>;
  sessions: Map<string, string>;
  playersByAccountServer: Map<string, PlayerProfile>;
};

const TRACE_ID_HEADER = "x-trace-id";
const MAX_BODY_BYTES = 16 * 1024;

const servers: ServerInfo[] = [
  { id: "s1", name: "长宁一服", status: "recommended", label: "推荐", isRecommended: true },
  { id: "s2", name: "滨江新区", status: "new", label: "新服", isRecommended: false },
  { id: "s3", name: "中关村路演场", status: "busy", label: "繁忙", isRecommended: false }
];

const avatars: AvatarInfo[] = [
  { id: "strategist", name: "策略型创始人", glyph: "策", specialty: "融资谈判与方向判断" },
  { id: "builder", name: "产品型创始人", glyph: "造", specialty: "产品研发与团队协作" },
  { id: "operator", name: "运营型创始人", glyph: "营", specialty: "增长运营与现金回收" }
];

const readTraceId = (request: IncomingMessage): string => {
  const header = request.headers[TRACE_ID_HEADER];

  if (typeof header === "string" && header.trim() !== "") {
    return header;
  }

  if (Array.isArray(header) && typeof header[0] === "string" && header[0].trim() !== "") {
    return header[0];
  }

  return randomUUID();
};

const sendJson = <T>(
  response: ServerResponse,
  statusCode: number,
  body: ApiResponse<T>
): void => {
  response.writeHead(statusCode, {
    "access-control-allow-headers": "authorization, content-type, x-trace-id",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-origin": "*",
    "content-type": "application/json; charset=utf-8",
    [TRACE_ID_HEADER]: body.traceId
  });
  response.end(JSON.stringify(body));
};

const sendOptions = (response: ServerResponse): void => {
  response.writeHead(204, {
    "access-control-allow-headers": "authorization, content-type, x-trace-id",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-origin": "*",
    "content-length": "0"
  });
  response.end();
};

const success = <T>(data: T, traceId: string): ApiSuccess<T> => ({
  success: true,
  data,
  traceId
});

const failure = (code: string, message: string, traceId: string): ApiFailure => ({
  success: false,
  error: {
    code,
    message
  },
  traceId
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error("REQUEST_TOO_LARGE");
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new Error("INVALID_JSON");
  }
};

const readString = (body: Record<string, unknown>, key: string): string =>
  typeof body[key] === "string" ? body[key].trim() : "";

const hashPassword = (password: string, salt: string): string =>
  scryptSync(password, salt, 32).toString("hex");

const createPasswordRecord = (password: string): Pick<Account, "passwordHash" | "passwordSalt"> => {
  const passwordSalt = randomBytes(16).toString("hex");
  return {
    passwordHash: hashPassword(password, passwordSalt),
    passwordSalt
  };
};

const verifyPassword = (account: Account, password: string): boolean => {
  const expected = Buffer.from(account.passwordHash, "hex");
  const actual = Buffer.from(hashPassword(password, account.passwordSalt), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const validateCredentials = (body: unknown): { username: string; password: string } | string => {
  if (!isRecord(body)) {
    return "Request body must be a JSON object.";
  }

  const username = readString(body, "username");
  const password = readString(body, "password");

  if (username.length < 3 || username.length > 24) {
    return "Username must be 3 to 24 characters.";
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return "Username may only contain letters, numbers, and underscores.";
  }

  if (password.length < 6 || password.length > 72) {
    return "Password must be 6 to 72 characters.";
  }

  return { username, password };
};

const validatePlayer = (
  body: unknown
): { serverId: string; avatarId: string; founderName: string; companyName: string } | string => {
  if (!isRecord(body)) {
    return "Request body must be a JSON object.";
  }

  const serverId = readString(body, "serverId");
  const avatarId = readString(body, "avatarId");
  const founderName = readString(body, "founderName");
  const companyName = readString(body, "companyName");

  if (!servers.some((server) => server.id === serverId)) {
    return "Server does not exist.";
  }

  if (!avatars.some((avatar) => avatar.id === avatarId)) {
    return "Avatar does not exist.";
  }

  if (founderName.length < 2 || founderName.length > 16) {
    return "Founder name must be 2 to 16 characters.";
  }

  if (companyName.length < 2 || companyName.length > 24) {
    return "Company name must be 2 to 24 characters.";
  }

  return { serverId, avatarId, founderName, companyName };
};

const readBearerToken = (request: IncomingMessage): string | undefined => {
  const header = request.headers.authorization;

  if (typeof header !== "string") {
    return undefined;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || token === undefined || token.trim() === "") {
    return undefined;
  }

  return token;
};

const authenticate = (request: IncomingMessage, state: ApiState): Account | undefined => {
  const token = readBearerToken(request);
  if (token === undefined) {
    return undefined;
  }

  const accountId = state.sessions.get(token);
  return accountId === undefined ? undefined : state.accountsById.get(accountId);
};

const playerKey = (accountId: string, serverId: string): string => `${accountId}:${serverId}`;

const logRequest = (request: IncomingMessage, statusCode: number, traceId: string, startedAt: number): void => {
  const durationMs = Date.now() - startedAt;
  console.log(
    JSON.stringify({
      level: "info",
      traceId,
      method: request.method,
      path: request.url,
      statusCode,
      durationMs
    })
  );
};

export const createApiServer = (config: ApiConfig): Server => {
  const state: ApiState = {
    accountsByUsername: new Map(),
    accountsById: new Map(),
    sessions: new Map(),
    playersByAccountServer: new Map()
  };

  return createServer(async (request, response) => {
    const startedAt = Date.now();
    const traceId = readTraceId(request);
    const url = new URL(request.url ?? "/", "http://localhost");

    response.on("finish", () => {
      logRequest(request, response.statusCode, traceId, startedAt);
    });

    if (request.method === "OPTIONS") {
      sendOptions(response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(
        response,
        200,
        success<HealthResponse>(
          {
            service: "@wenziyouxi/api",
            status: "ok",
            timestamp: new Date().toISOString(),
            dependencies: config.dependencies
          },
          traceId
        )
      );
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/register") {
      try {
        const credentials = validateCredentials(await readBody(request));
        if (typeof credentials === "string") {
          sendJson(response, 400, failure("VALIDATION_ERROR", credentials, traceId));
          return;
        }

        if (state.accountsByUsername.has(credentials.username)) {
          sendJson(response, 409, failure("ACCOUNT_EXISTS", "Account already exists.", traceId));
          return;
        }

        const account: Account = {
          id: randomUUID(),
          username: credentials.username,
          ...createPasswordRecord(credentials.password)
        };
        const token = randomUUID();

        state.accountsByUsername.set(account.username, account);
        state.accountsById.set(account.id, account);
        state.sessions.set(token, account.id);

        sendJson(response, 201, success({ accountId: account.id, username: account.username, token }, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/login") {
      try {
        const credentials = validateCredentials(await readBody(request));
        if (typeof credentials === "string") {
          sendJson(response, 400, failure("VALIDATION_ERROR", credentials, traceId));
          return;
        }

        const account = state.accountsByUsername.get(credentials.username);
        if (account === undefined || !verifyPassword(account, credentials.password)) {
          sendJson(response, 401, failure("INVALID_CREDENTIALS", "Invalid username or password.", traceId));
          return;
        }

        const token = randomUUID();
        state.sessions.set(token, account.id);
        sendJson(response, 200, success({ accountId: account.id, username: account.username, token }, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    const account = authenticate(request, state);

    if (request.method === "GET" && url.pathname === "/auth/session") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      sendJson(response, 200, success({ accountId: account.id, username: account.username }, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/servers") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      sendJson(response, 200, success(servers, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/avatars") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      sendJson(response, 200, success(avatars, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/players") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const profile = state.playersByAccountServer.get(playerKey(account.id, serverId));
      if (profile === undefined) {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(profile, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/players") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      try {
        const player = validatePlayer(await readBody(request));
        if (typeof player === "string") {
          sendJson(response, 400, failure("VALIDATION_ERROR", player, traceId));
          return;
        }

        const key = playerKey(account.id, player.serverId);
        if (state.playersByAccountServer.has(key)) {
          sendJson(response, 409, failure("PLAYER_EXISTS", "Player profile already exists for this server.", traceId));
          return;
        }

        const profile: PlayerProfile = {
          id: randomUUID(),
          accountId: account.id,
          serverId: player.serverId,
          avatarId: player.avatarId,
          founderName: player.founderName,
          companyName: player.companyName,
          createdAt: new Date().toISOString()
        };

        state.playersByAccountServer.set(key, profile);
        sendJson(response, 201, success(profile, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    sendJson(response, 404, failure("NOT_FOUND", "Route not found.", traceId));
  });
};
