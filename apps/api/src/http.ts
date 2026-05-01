import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { ApiConfig } from "./config.js";
import { createPasswordRecord, verifyPassword } from "./password.js";
import { createPrismaGameRepository, type AccountRecord, type AdminKnowledgeUpdateInput, type GameRepository, type VipLevelRecord } from "./repository.js";

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

type ReadinessCheck = {
  key: string;
  status: "pass" | "fail";
  message: string;
};

type ReadinessResponse = {
  status: "ready" | "blocked";
  timestamp: string;
  checks: ReadinessCheck[];
};

const TRACE_ID_HEADER = "x-trace-id";
const MAX_BODY_BYTES = 16 * 1024;
const AUTH_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 10;

const externalPaymentProducts = new Map([
  ["first-charge-starter", { amountCents: 6800, platformCoins: 680 }],
  ["monthly-card-basic", { amountCents: 12800, platformCoins: 1280 }],
  ["growth-fund-seed", { amountCents: 19800, platformCoins: 1980 }],
  ["recruit-ticket-headhunter", { amountCents: 3600, platformCoins: 360 }],
  ["risk-insurance-trial", { amountCents: 5200, platformCoins: 520 }]
]);

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
    "access-control-allow-headers": "authorization, content-type, x-trace-id, x-server-date",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-origin": "*",
    "content-type": "application/json; charset=utf-8",
    [TRACE_ID_HEADER]: body.traceId
  });
  response.end(JSON.stringify(body));
};

const sendOptions = (response: ServerResponse): void => {
  response.writeHead(204, {
    "access-control-allow-headers": "authorization, content-type, x-trace-id, x-server-date",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-origin": "*",
    "content-length": "0"
  });
  response.end();
};

const sendRateLimited = (response: ServerResponse, traceId: string): void => {
  response.writeHead(429, {
    "access-control-allow-headers": "authorization, content-type, x-trace-id, x-server-date",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-origin": "*",
    "content-type": "application/json; charset=utf-8",
    "retry-after": String(Math.ceil(AUTH_RATE_LIMIT_WINDOW_MS / 1000)),
    [TRACE_ID_HEADER]: traceId
  });
  response.end(JSON.stringify(failure("RATE_LIMITED", "Too many auth attempts. Please retry later.", traceId)));
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
  body: unknown,
  repositoryState: { serverIds: Set<string>; avatarIds: Set<string> }
): { serverId: string; avatarId: string; founderName: string; companyName: string } | string => {
  if (!isRecord(body)) {
    return "Request body must be a JSON object.";
  }

  const serverId = readString(body, "serverId");
  const avatarId = readString(body, "avatarId");
  const founderName = readString(body, "founderName");
  const companyName = readString(body, "companyName");

  if (!repositoryState.serverIds.has(serverId)) {
    return "Server does not exist.";
  }

  if (!repositoryState.avatarIds.has(avatarId)) {
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

const readServerId = (body: unknown): string | undefined => {
  if (!isRecord(body)) {
    return undefined;
  }

  const serverId = readString(body, "serverId");
  return serverId === "" ? undefined : serverId;
};

const readOptionalString = (body: unknown, key: string): string | null => {
  if (!isRecord(body)) {
    return null;
  }

  const value = readString(body, key);
  return value === "" ? null : value;
};

const readLimitedString = (
  body: Record<string, unknown>,
  key: string,
  maxLength: number
): string | undefined => {
  const value = readString(body, key);
  return value !== "" && value.length <= maxLength ? value : undefined;
};

const readPositiveInteger = (body: unknown, key: string): number | undefined => {
  if (!isRecord(body)) {
    return undefined;
  }

  const value = body[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return undefined;
  }

  return value;
};

const readInteger = (body: unknown, key: string): number | undefined => {
  if (!isRecord(body)) {
    return undefined;
  }

  const value = body[key];
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
};

const readTelemetryMetadata = (body: Record<string, unknown>): Record<string, string | number | boolean | null> => {
  const value = body.metadata;
  if (!isRecord(value)) {
    return {};
  }

  const metadata: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean" || item === null) {
      metadata[key] = item;
    }
  }

  return metadata;
};

const readToday = (request: IncomingMessage): string => {
  const header = request.headers["x-server-date"];
  const candidate = Array.isArray(header) ? header[0] : header;

  return typeof candidate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate)
    ? candidate
    : new Date().toISOString().slice(0, 10);
};

const readClientKey = (request: IncomingMessage): string => {
  const forwardedFor = request.headers["x-forwarded-for"];
  const forwardedClient = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return forwardedClient?.split(",")[0]?.trim() || request.socket.remoteAddress || "unknown";
};

const isAuthPath = (method: string | undefined, pathname: string): boolean =>
  method === "POST" && (pathname === "/auth/login" || pathname === "/auth/register" || pathname === "/admin/auth/login");

const createAuthRateLimiter = () => {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  return (request: IncomingMessage, pathname: string): boolean => {
    if (!isAuthPath(request.method, pathname)) {
      return false;
    }

    const now = Date.now();
    const key = `${pathname}:${readClientKey(request)}`;
    const current = attempts.get(key);
    if (current === undefined || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS });
      return false;
    }

    current.count += 1;
    return current.count > AUTH_RATE_LIMIT_MAX_ATTEMPTS;
  };
};

const readReadiness = (config: ApiConfig): ReadinessResponse => {
  const checks: ReadinessCheck[] = [
    {
      key: "mysql",
      status: config.dependencies.mysql === "configured" ? "pass" : "fail",
      message: config.dependencies.mysql === "configured" ? "MySQL connection is configured." : "DATABASE_URL or MySQL connection settings are missing."
    },
    {
      key: "redis",
      status: config.dependencies.redis === "configured" ? "pass" : "fail",
      message: config.dependencies.redis === "configured" ? "Redis connection is configured." : "REDIS_URL or Redis connection settings are missing."
    }
  ];

  return {
    status: checks.some((check) => check.status === "fail") ? "blocked" : "ready",
    timestamp: new Date().toISOString(),
    checks
  };
};

const validateExternalPaymentReservation = (
  productId: string | null,
  amountCents: number,
  platformCoins: number
): string | undefined => {
  if (productId === null) {
    return amountCents >= 100 && platformCoins >= 1 ? undefined : "amountCents and platformCoins must be positive.";
  }

  const product = externalPaymentProducts.get(productId);
  if (product === undefined) {
    return "External payment product is not enabled.";
  }

  return product.amountCents === amountCents && product.platformCoins === platformCoins
    ? undefined
    : "External payment amount does not match product configuration.";
};

const validateVipLevelConfig = (body: unknown): { config: VipLevelRecord; reason: string } | string => {
  if (!isRecord(body)) {
    return "Request body must be a JSON object.";
  }

  const level = readInteger(body, "level");
  const requiredExperience = readInteger(body, "requiredExperience");
  const dailyGiftPlatformCoins = readInteger(body, "dailyGiftPlatformCoins");
  const dailyGiftActionPower = readInteger(body, "dailyGiftActionPower");
  const actionPowerLimitBonus = readInteger(body, "actionPowerLimitBonus");
  const quickSettleTimes = readInteger(body, "quickSettleTimes");
  const trainingQueueBonus = readInteger(body, "trainingQueueBonus");
  const recruitRefreshTimes = readInteger(body, "recruitRefreshTimes");
  const shopDiscountBasisPoints = readInteger(body, "shopDiscountBasisPoints");
  const reason = readString(body, "reason");
  const config: VipLevelRecord = {
    level: level ?? -1,
    name: readString(body, "name"),
    requiredExperience: requiredExperience ?? -1,
    dailyGiftPlatformCoins: dailyGiftPlatformCoins ?? -1,
    dailyGiftActionPower: dailyGiftActionPower ?? -1,
    actionPowerLimitBonus: actionPowerLimitBonus ?? -1,
    quickSettleTimes: quickSettleTimes ?? -1,
    trainingQueueBonus: trainingQueueBonus ?? -1,
    recruitRefreshTimes: recruitRefreshTimes ?? -1,
    shopDiscountBasisPoints: shopDiscountBasisPoints ?? -1,
    title: readString(body, "title"),
    avatarFrame: readString(body, "avatarFrame"),
    summary: readString(body, "summary")
  };

  if (
    config.level < 0 ||
    config.name.length < 2 ||
    config.requiredExperience < 0 ||
    config.dailyGiftPlatformCoins < 0 ||
    config.dailyGiftActionPower < 0 ||
    config.actionPowerLimitBonus < 0 ||
    config.quickSettleTimes < 0 ||
    config.trainingQueueBonus < 0 ||
    config.recruitRefreshTimes < 0 ||
    config.shopDiscountBasisPoints < 1 ||
    config.shopDiscountBasisPoints > 10000 ||
    config.title.length < 2 ||
    config.avatarFrame.length < 2 ||
    config.summary.length < 4 ||
    reason.length < 2
  ) {
    return "Valid VIP config fields and reason are required.";
  }

  return { config, reason };
};

const validateAdminKnowledgeUpdate = (body: unknown): AdminKnowledgeUpdateInput | string => {
  if (!isRecord(body)) {
    return "Request body must be a JSON object.";
  }

  const input: AdminKnowledgeUpdateInput = {
    summary: readLimitedString(body, "summary", 220) ?? "",
    scenarioText: readLimitedString(body, "scenarioText", 320) ?? "",
    riskText: readLimitedString(body, "riskText", 320) ?? "",
    gameImpactText: readLimitedString(body, "gameImpactText", 320) ?? "",
    actionTipText: readLimitedString(body, "actionTipText", 320) ?? "",
    sourceName: readLimitedString(body, "sourceName", 32) ?? "",
    sourceUrl: readLimitedString(body, "sourceUrl", 220) ?? "",
    collectedAt: readLimitedString(body, "collectedAt", 10) ?? "",
    contentVersion: readLimitedString(body, "contentVersion", 24) ?? "",
    reviewStatus: readLimitedString(body, "reviewStatus", 16) ?? "",
    reason: readLimitedString(body, "reason", 160) ?? ""
  };

  if (
    input.summary.length < 4 ||
    input.scenarioText.length < 4 ||
    input.riskText.length < 4 ||
    input.gameImpactText.length < 4 ||
    input.actionTipText.length < 4 ||
    input.sourceName.length < 2 ||
    !/^https?:\/\/\S+$/.test(input.sourceUrl) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.collectedAt) ||
    input.contentVersion.length < 2 ||
    !["draft", "reviewing", "published", "archived"].includes(input.reviewStatus) ||
    input.reason.length < 2
  ) {
    return "Valid knowledge fields and reason are required.";
  }

  return input;
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

const authenticate = async (
  request: IncomingMessage,
  repository: GameRepository
): Promise<AccountRecord | undefined> => {
  const token = readBearerToken(request);
  if (token === undefined) {
    return undefined;
  }

  return repository.getAccountBySessionToken(token);
};

const logRequest = (
  request: IncomingMessage,
  statusCode: number,
  traceId: string,
  startedAt: number,
  repository: GameRepository
): void => {
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
  void repository.recordApiRequestLog({
    traceId,
    method: request.method ?? "GET",
    path: request.url ?? "/",
    statusCode,
    durationMs
  }).catch(() => undefined);
};

export const createApiServer = (
  config: ApiConfig,
  repository: GameRepository = createPrismaGameRepository()
): Server => {
  const isRateLimited = createAuthRateLimiter();

  return createServer(async (request, response) => {
    const startedAt = Date.now();
    const traceId = readTraceId(request);
    const url = new URL(request.url ?? "/", "http://localhost");

    response.on("finish", () => {
      logRequest(request, response.statusCode, traceId, startedAt, repository);
    });

    if (request.method === "OPTIONS") {
      sendOptions(response);
      return;
    }

    if (isRateLimited(request, url.pathname)) {
      sendRateLimited(response, traceId);
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

    if (request.method === "GET" && url.pathname === "/readiness") {
      const readiness = readReadiness(config);
      sendJson(response, readiness.status === "ready" ? 200 : 503, success(readiness, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/register") {
      try {
        const credentials = validateCredentials(await readBody(request));
        if (typeof credentials === "string") {
          sendJson(response, 400, failure("VALIDATION_ERROR", credentials, traceId));
          return;
        }

        const account = await repository.createAccount({
          username: credentials.username,
          ...createPasswordRecord(credentials.password)
        });

        if (account === "ACCOUNT_EXISTS") {
          sendJson(response, 409, failure("ACCOUNT_EXISTS", "Account already exists.", traceId));
          return;
        }

        const token = randomUUID();
        await repository.createAccountSession(account.id, token);

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

        const account = await repository.findAccountByUsername(credentials.username);
        if (account === undefined || !verifyPassword(account, credentials.password)) {
          sendJson(response, 401, failure("INVALID_CREDENTIALS", "Invalid username or password.", traceId));
          return;
        }

        const token = randomUUID();
        await repository.createAccountSession(account.id, token);
        sendJson(response, 200, success({ accountId: account.id, username: account.username, token }, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/admin/auth/login") {
      try {
        const credentials = validateCredentials(await readBody(request));
        if (typeof credentials === "string") {
          sendJson(response, 400, failure("VALIDATION_ERROR", credentials, traceId));
          return;
        }

        const admin = await repository.findAdminByUsername(credentials.username);
        if (admin === undefined || !verifyPassword(admin, credentials.password)) {
          sendJson(response, 401, failure("INVALID_CREDENTIALS", "Invalid username or password.", traceId));
          return;
        }

        const token = randomUUID();
        await repository.createAdminSession(admin.id, token);
        sendJson(response, 200, success({ adminUserId: admin.id, username: admin.username, token }, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    const account = await authenticate(request, repository);

    if (request.method === "GET" && url.pathname === "/auth/session") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      sendJson(response, 200, success({ accountId: account.id, username: account.username }, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/telemetry/events") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const serverId = readString(body, "serverId");
        const eventName = readString(body, "eventName");
        const targetId = readString(body, "targetId");
        if (serverId === "" || eventName.length < 2 || eventName.length > 48) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and eventName are required.", traceId));
          return;
        }

        const result = await repository.recordTelemetryEvent({
          accountId: account.id,
          serverId,
          eventName,
          targetId: targetId === "" ? null : targetId,
          metadata: readTelemetryMetadata(body)
        });
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }

        sendJson(response, 201, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/auth/session") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      sendJson(response, 200, success({ adminUserId: admin.id, username: admin.username }, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/analytics") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      sendJson(response, 200, success(await repository.getAdminAnalytics(readToday(request)), traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/players") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      sendJson(response, 200, success(await repository.listAdminPlayers(url.searchParams.get("keyword") ?? "", readToday(request)), traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/config-center") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      sendJson(response, 200, success(await repository.getAdminConfigCenter(), traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/audit-logs") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      sendJson(response, 200, success(await repository.listAdminAuditLogs(), traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/knowledge") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      sendJson(response, 200, success(await repository.listAdminKnowledgeEntries({
        keyword: url.searchParams.get("keyword")?.trim() ?? "",
        category: url.searchParams.get("category")?.trim() ?? "",
        reviewStatus: url.searchParams.get("reviewStatus")?.trim() ?? ""
      }), traceId));
      return;
    }

    const adminKnowledgeUpdateMatch = url.pathname.match(/^\/admin\/knowledge\/([^/]+)$/);
    if (request.method === "POST" && adminKnowledgeUpdateMatch !== null) {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      try {
        const input = validateAdminKnowledgeUpdate(await readBody(request));
        if (typeof input === "string") {
          sendJson(response, 400, failure("VALIDATION_ERROR", input, traceId));
          return;
        }

        const knowledgeId = adminKnowledgeUpdateMatch[1];
        if (knowledgeId === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Knowledge id is required.", traceId));
          return;
        }

        const result = await repository.updateAdminKnowledgeEntry(admin.id, decodeURIComponent(knowledgeId), input);
        if (result === "KNOWLEDGE_NOT_FOUND") {
          sendJson(response, 404, failure("KNOWLEDGE_NOT_FOUND", "Knowledge entry not found.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/admin/titles/grant") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const profileId = readString(body, "profileId");
        const titleId = readString(body, "titleId");
        const reason = readString(body, "reason");
        if (profileId === "" || titleId === "" || reason.length < 2) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "profileId, titleId and reason are required.", traceId));
          return;
        }

        const result = await repository.grantAdminTitle(admin.id, profileId, titleId, reason);
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }
        if (result === "TITLE_NOT_FOUND") {
          sendJson(response, 404, failure("TITLE_NOT_FOUND", "Title config not found.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/admin/titles/revoke") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const profileId = readString(body, "profileId");
        const titleId = readString(body, "titleId");
        const reason = readString(body, "reason");
        if (profileId === "" || titleId === "" || reason.length < 2) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "profileId, titleId and reason are required.", traceId));
          return;
        }

        const result = await repository.revokeAdminTitle(admin.id, profileId, titleId, reason);
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }
        if (result === "TITLE_NOT_FOUND") {
          sendJson(response, 404, failure("TITLE_NOT_FOUND", "Player title not found.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/admin/mail/compensate") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const profileId = readString(body, "profileId");
        const subject = readString(body, "subject");
        const mailBody = readString(body, "body");
        const reason = readString(body, "reason");
        const platformCoins = readInteger(body, "platformCoins");
        if (profileId === "" || subject.length < 2 || mailBody.length < 2 || reason.length < 2 || platformCoins === undefined || platformCoins < 0) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "profileId, subject, body, non-negative platformCoins and reason are required.", traceId));
          return;
        }

        const result = await repository.sendAdminMailCompensation(admin.id, profileId, subject, mailBody, platformCoins, reason);
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }
        if (result === "INSUFFICIENT_PLATFORM_COINS") {
          sendJson(response, 409, failure("INSUFFICIENT_PLATFORM_COINS", "Platform coin balance cannot become negative.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/admin/players/status") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const profileId = readString(body, "profileId");
        const status = body.status === "active" || body.status === "banned" ? body.status : undefined;
        const reason = readString(body, "reason");
        if (profileId === "" || status === undefined || reason.length < 2) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "profileId, status and reason are required.", traceId));
          return;
        }

        const result = await repository.updateAdminProfileStatus(admin.id, profileId, status, reason);
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/admin/leaderboards/settle") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const serverId = readString(body, "serverId");
        const reason = readString(body, "reason");
        if (serverId === "" || reason.length < 2) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and reason are required.", traceId));
          return;
        }

        const result = await repository.settleAdminLeaderboards(admin.id, serverId, readToday(request), reason);
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "No player profile found in this server.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/cross-server/groups") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      sendJson(response, 200, success(await repository.listAdminCrossServerGroups(), traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/admin/cross-server/groups/assign") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const serverId = readString(body, "serverId");
        const groupId = readString(body, "groupId");
        const reason = readString(body, "reason");
        if (serverId === "" || groupId === "" || reason.length < 2) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId, groupId and reason are required.", traceId));
          return;
        }

        const result = await repository.assignAdminCrossServerGroup(admin.id, serverId, groupId, reason);
        if (result === "SERVER_NOT_FOUND") {
          sendJson(response, 404, failure("SERVER_NOT_FOUND", "Server not found.", traceId));
          return;
        }
        if (result === "CROSS_SERVER_GROUP_NOT_FOUND") {
          sendJson(response, 404, failure("CROSS_SERVER_GROUP_NOT_FOUND", "Cross server group not found.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/admin/wallet/adjust") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const profileId = readString(body, "profileId");
        const reason = readString(body, "reason");
        const changeAmount = readInteger(body, "changeAmount");
        const source =
          body.source === "admin_grant" || body.source === "admin_deduct" || body.source === "admin_correction"
            ? body.source
            : undefined;
        if (profileId === "" || reason.length < 2 || changeAmount === undefined || changeAmount === 0 || source === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "profileId, source, non-zero changeAmount and reason are required.", traceId));
          return;
        }

        const result = await repository.adjustPlatformCoins(admin.id, profileId, changeAmount, source, reason);
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }
        if (result === "INVALID_PLATFORM_COIN_SOURCE") {
          sendJson(response, 400, failure("INVALID_PLATFORM_COIN_SOURCE", "Invalid admin wallet source.", traceId));
          return;
        }
        if (result === "INSUFFICIENT_PLATFORM_COINS") {
          sendJson(response, 409, failure("INSUFFICIENT_PLATFORM_COINS", "Platform coin balance cannot become negative.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/vip") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      const profileId = url.searchParams.get("profileId")?.trim();
      if (profileId === undefined || profileId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "profileId query parameter is required.", traceId));
        return;
      }

      const result = await repository.getAdminVipRecord(profileId, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/vip/configs") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      sendJson(response, 200, success(await repository.listVipLevelConfigs(), traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/admin/vip/configs") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      try {
        const vipConfig = validateVipLevelConfig(await readBody(request));
        if (typeof vipConfig === "string") {
          sendJson(response, 400, failure("VALIDATION_ERROR", vipConfig, traceId));
          return;
        }

        sendJson(response, 200, success(await repository.upsertVipLevelConfig(admin.id, vipConfig.config, vipConfig.reason), traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/admin/vip/adjust") {
      const token = readBearerToken(request);
      const admin = token === undefined ? undefined : await repository.getAdminBySessionToken(token);
      if (admin === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid admin session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const profileId = readString(body, "profileId");
        const reason = readString(body, "reason");
        const vipExperience = readInteger(body, "vipExperience");
        if (profileId === "" || reason.length < 2 || vipExperience === undefined || vipExperience < 0) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "profileId, non-negative vipExperience and reason are required.", traceId));
          return;
        }

        const result = await repository.adjustVipExperience(admin.id, profileId, vipExperience, reason);
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/leaderboards") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const result = await repository.getLeaderboards(account.id, serverId, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-rank-target", readToday(request));
      await repository.advanceTask(account.id, serverId, "main-reputation-plan", readToday(request));
      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/leaderboards/settle") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = readServerId(await readBody(request));
      if (serverId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
        return;
      }

      const result = await repository.settleLeaderboardRewards(account.id, serverId, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/cross-server") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const result = await repository.getCrossServerCenter(account.id, serverId, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "CROSS_SERVER_GROUP_NOT_FOUND") {
        sendJson(response, 404, failure("CROSS_SERVER_GROUP_NOT_FOUND", "Cross-server group is not configured.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-cross-server-target", readToday(request));
      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/cross-server/register") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = readServerId(await readBody(request));
      if (serverId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
        return;
      }

      const result = await repository.registerCrossServer(account.id, serverId, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "CROSS_SERVER_GROUP_NOT_FOUND") {
        sendJson(response, 404, failure("CROSS_SERVER_GROUP_NOT_FOUND", "Cross-server group is not configured.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/cross-server/settle") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = readServerId(await readBody(request));
      if (serverId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
        return;
      }

      const result = await repository.settleCrossServerRewards(account.id, serverId, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "CROSS_SERVER_GROUP_NOT_FOUND") {
        sendJson(response, 404, failure("CROSS_SERVER_GROUP_NOT_FOUND", "Cross-server group is not configured.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/titles") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const result = await repository.listTitles(account.id, serverId, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/titles/equip") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const titleId = isRecord(body) ? readString(body, "titleId") : "";
      if (serverId === undefined || titleId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and titleId are required.", traceId));
        return;
      }

      const result = await repository.equipTitle(account.id, serverId, titleId, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "TITLE_NOT_FOUND") {
        sendJson(response, 404, failure("TITLE_NOT_FOUND", "Title not found.", traceId));
        return;
      }
      if (result === "TITLE_EXPIRED") {
        sendJson(response, 409, failure("TITLE_EXPIRED", "Title has expired.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/achievements") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const result = await repository.listAchievements(account.id, serverId);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    const achievementClaimMatch = /^\/achievements\/([^/]+)\/claim$/.exec(url.pathname);
    if (request.method === "POST" && achievementClaimMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = readServerId(await readBody(request));
      const achievementId = achievementClaimMatch[1];
      if (serverId === undefined || achievementId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and achievementId are required.", traceId));
        return;
      }

      const result = await repository.claimAchievement(account.id, serverId, decodeURIComponent(achievementId));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "ACHIEVEMENT_NOT_FOUND") {
        sendJson(response, 404, failure("ACHIEVEMENT_NOT_FOUND", "Achievement not found.", traceId));
        return;
      }
      if (result === "ACHIEVEMENT_INCOMPLETE") {
        sendJson(response, 409, failure("ACHIEVEMENT_INCOMPLETE", "Achievement is not completed.", traceId));
        return;
      }
      if (result === "ACHIEVEMENT_ALREADY_CLAIMED") {
        sendJson(response, 409, failure("ACHIEVEMENT_ALREADY_CLAIMED", "Achievement reward has already been claimed.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/knowledge") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const result = await repository.listKnowledge(account.id, serverId);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/guild") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const result = await repository.getGuildCenter(account.id, serverId, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/guild/join") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const guildName = isRecord(body) ? readString(body, "guildName") : "";
      if (serverId === undefined || guildName.length < 2 || guildName.length > 32) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and guildName are required.", traceId));
        return;
      }

      const result = await repository.joinOrCreateGuild(account.id, serverId, guildName, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/guild/help") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const requestType = isRecord(body) ? readString(body, "requestType") : "";
      if (serverId === undefined || requestType === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and requestType are required.", traceId));
        return;
      }

      const result = await repository.requestGuildHelp(account.id, serverId, requestType, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "GUILD_NOT_JOINED") {
        sendJson(response, 409, failure("GUILD_NOT_JOINED", "Join a guild before requesting help.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "daily-guild-contribution", readToday(request));
      await repository.advanceTask(account.id, serverId, "main-guild-help-plan", readToday(request));
      sendJson(response, 200, success(result, traceId));
      return;
    }

    const guildTaskClaimMatch = url.pathname.match(/^\/guild\/tasks\/([^/]+)\/claim$/);
    if (request.method === "POST" && guildTaskClaimMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const taskId = guildTaskClaimMatch[1];
      if (taskId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "taskId is required.", traceId));
        return;
      }
      const body = await readBody(request);
      const serverId = readServerId(body);
      if (serverId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
        return;
      }

      const result = await repository.claimGuildTask(account.id, serverId, decodeURIComponent(taskId), readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "GUILD_NOT_JOINED") {
        sendJson(response, 409, failure("GUILD_NOT_JOINED", "Join a guild before claiming guild tasks.", traceId));
        return;
      }
      if (result === "GUILD_TASK_NOT_FOUND") {
        sendJson(response, 404, failure("GUILD_TASK_NOT_FOUND", "Guild task not found.", traceId));
        return;
      }
      if (result === "GUILD_TASK_NOT_READY") {
        sendJson(response, 409, failure("GUILD_TASK_NOT_READY", "Guild task progress is not ready.", traceId));
        return;
      }
      if (result === "GUILD_TASK_ALREADY_CLAIMED") {
        sendJson(response, 409, failure("GUILD_TASK_ALREADY_CLAIMED", "Guild task already claimed today.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    const guildTechUpgradeMatch = url.pathname.match(/^\/guild\/techs\/([^/]+)\/upgrade$/);
    if (request.method === "POST" && guildTechUpgradeMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const techId = guildTechUpgradeMatch[1];
      if (techId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "techId is required.", traceId));
        return;
      }
      const body = await readBody(request);
      const serverId = readServerId(body);
      if (serverId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
        return;
      }

      const result = await repository.upgradeGuildTech(account.id, serverId, decodeURIComponent(techId), readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "GUILD_NOT_JOINED") {
        sendJson(response, 409, failure("GUILD_NOT_JOINED", "Join a guild before upgrading guild tech.", traceId));
        return;
      }
      if (result === "GUILD_TECH_NOT_FOUND") {
        sendJson(response, 404, failure("GUILD_TECH_NOT_FOUND", "Guild tech not found.", traceId));
        return;
      }
      if (result === "GUILD_TECH_MAXED") {
        sendJson(response, 409, failure("GUILD_TECH_MAXED", "Guild tech is already max level.", traceId));
        return;
      }
      if (result === "GUILD_CONTRIBUTION_NOT_ENOUGH") {
        sendJson(response, 409, failure("GUILD_CONTRIBUTION_NOT_ENOUGH", "Guild contribution is not enough.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/servers") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      sendJson(response, 200, success(await repository.listServers(), traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/avatars") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      sendJson(response, 200, success(await repository.listAvatars(), traceId));
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

      const profile = await repository.getProfile(account.id, serverId);
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
        const [servers, avatars, body] = await Promise.all([
          repository.listServers(),
          repository.listAvatars(),
          readBody(request)
        ]);
        const player = validatePlayer(body, {
          serverIds: new Set(servers.map((server) => server.id)),
          avatarIds: new Set(avatars.map((avatar) => avatar.id))
        });
        if (typeof player === "string") {
          sendJson(response, 400, failure("VALIDATION_ERROR", player, traceId));
          return;
        }

        const profile = await repository.createProfile({
          accountId: account.id,
          serverId: player.serverId,
          avatarId: player.avatarId,
          founderName: player.founderName,
          companyName: player.companyName
        });

        if (profile === "PLAYER_EXISTS") {
          sendJson(response, 409, failure("PLAYER_EXISTS", "Player profile already exists for this server.", traceId));
          return;
        }
        sendJson(response, 201, success(profile, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/wallet") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const wallet = await repository.getWallet(account.id, serverId);
      if (wallet === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(wallet, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/vip") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const vip = await repository.getVipCenter(account.id, serverId, readToday(request));
      if (vip === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-vip-benefit-review", readToday(request));
      sendJson(response, 200, success(vip, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/vip/daily-gift") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        const serverId = readServerId(body);
        if (serverId === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
          return;
        }

        const result = await repository.claimVipDailyGift(account.id, serverId, readToday(request));
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }
        if (result === "VIP_DAILY_GIFT_ALREADY_CLAIMED") {
          sendJson(response, 409, failure("VIP_DAILY_GIFT_ALREADY_CLAIMED", "VIP daily gift already claimed.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/shop") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const shop = await repository.listShop(account.id, serverId);
      if (shop === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(shop, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/inventory") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const inventory = await repository.listInventory(account.id, serverId);
      if (inventory === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-action-power-plan", readToday(request));
      sendJson(response, 200, success(inventory, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/inventory/use") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const serverId = readServerId(body);
        const itemId = readString(body, "itemId");
        if (serverId === undefined || itemId === "") {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and itemId are required.", traceId));
          return;
        }

        const result = await repository.useInventoryItem(account.id, serverId, itemId);
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }
        if (result === "ITEM_NOT_FOUND") {
          sendJson(response, 404, failure("ITEM_NOT_FOUND", "Inventory item not found.", traceId));
          return;
        }
        if (result === "ITEM_NOT_USABLE") {
          sendJson(response, 409, failure("ITEM_NOT_USABLE", "Inventory item cannot be used here.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/shop/purchase") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const serverId = readServerId(body);
        const productId = readString(body, "productId");
        const requestId = readString(body, "requestId");
        if (serverId === undefined || productId === "" || requestId.length < 8 || requestId.length > 64) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId, productId and requestId are required.", traceId));
          return;
        }

        const result = await repository.purchaseShopProduct(account.id, serverId, productId, requestId, readToday(request));
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }
        if (result === "SHOP_PRODUCT_NOT_FOUND") {
          sendJson(response, 404, failure("SHOP_PRODUCT_NOT_FOUND", "Shop product not found.", traceId));
          return;
        }
        if (result === "INSUFFICIENT_PLATFORM_COINS") {
          sendJson(response, 409, failure("INSUFFICIENT_PLATFORM_COINS", "Not enough platform coins.", traceId));
          return;
        }
        if (result === "PURCHASE_LIMIT_REACHED") {
          sendJson(response, 409, failure("PURCHASE_LIMIT_REACHED", "Purchase limit reached.", traceId));
          return;
        }

        if (result.product.category === "weekly_card") {
          await repository.advanceTask(account.id, serverId, "main-week-card-value", readToday(request));
        }
        if (result.product.category === "growth_fund") {
          await repository.advanceTask(account.id, serverId, "main-growth-fund-check", readToday(request));
          await repository.advanceTask(account.id, serverId, "main-fund-node", readToday(request));
        }
        sendJson(response, result.isDuplicate ? 200 : 201, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/payments/reserve") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be a JSON object.", traceId));
          return;
        }
        const serverId = readServerId(body);
        const productId = readString(body, "productId") || null;
        const amountCents = readPositiveInteger(body, "amountCents");
        const platformCoins = readPositiveInteger(body, "platformCoins");
        if (serverId === undefined || amountCents === undefined || platformCoins === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId, amountCents and platformCoins are required.", traceId));
          return;
        }
        const paymentError = validateExternalPaymentReservation(productId, amountCents, platformCoins);
        if (paymentError !== undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", paymentError, traceId));
          return;
        }

        const result = await repository.reserveExternalPayment(account.id, serverId, productId, amountCents, platformCoins);
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }

        sendJson(response, 201, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/season") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }
      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }
      const result = await repository.getSeasonCenter(account.id, serverId, readToday(request));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "SEASON_NOT_FOUND") {
        sendJson(response, 404, failure("SEASON_NOT_FOUND", "Season config not found.", traceId));
        return;
      }
      await repository.advanceTask(account.id, serverId, "main-pass-value", readToday(request));
      await repository.advanceTask(account.id, serverId, "main-full-level-plan", readToday(request));
      sendJson(response, 200, success(result, traceId));
      return;
    }

    const seasonTaskMatch = request.method === "POST" ? /^\/season\/tasks\/([^/]+)\/progress$/.exec(url.pathname) : null;
    if (seasonTaskMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }
      try {
        const body = await readBody(request);
        const serverId = readServerId(body);
        if (serverId === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
          return;
        }
        const result = await repository.progressSeasonTask(account.id, serverId, decodeURIComponent(seasonTaskMatch[1] ?? ""), readToday(request));
        if (typeof result === "string") {
          sendJson(response, result === "PLAYER_NOT_FOUND" || result.endsWith("NOT_FOUND") ? 404 : 409, failure(result, "Season task cannot be progressed.", traceId));
          return;
        }
        await repository.advanceTask(account.id, serverId, "main-season-start", readToday(request));
        await repository.advanceTask(account.id, serverId, "main-season-task-plan", readToday(request));
        await repository.advanceTask(account.id, serverId, "daily-season-progress", readToday(request));
        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/season/pass/purchase") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }
      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be an object.", traceId));
          return;
        }
        const serverId = readServerId(body);
        const seasonId = readString(body, "seasonId");
        const requestId = readString(body, "requestId");
        if (serverId === undefined || seasonId === "" || requestId.length < 8 || requestId.length > 64) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId, seasonId and requestId are required.", traceId));
          return;
        }
        const result = await repository.purchaseSeasonPass(account.id, serverId, seasonId, requestId, readToday(request));
        if (typeof result === "string") {
          sendJson(response, result === "INSUFFICIENT_PLATFORM_COINS" ? 409 : 404, failure(result, "Season pass cannot be purchased.", traceId));
          return;
        }
        await repository.advanceTask(account.id, serverId, "main-season-start", readToday(request));
        await repository.advanceTask(account.id, serverId, "main-pass-value", readToday(request));
        await repository.advanceTask(account.id, serverId, "main-full-level-plan", readToday(request));
        sendJson(response, result.isDuplicate ? 200 : 201, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    const activityMatch = request.method === "POST" ? /^\/activities\/([^/]+)\/(join|progress|claim)$/.exec(url.pathname) : null;
    if (activityMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }
      try {
        const body = await readBody(request);
        const serverId = readServerId(body);
        if (serverId === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
          return;
        }
        const activityId = decodeURIComponent(activityMatch[1] ?? "");
        const action = activityMatch[2] ?? "";
        const scoreDelta = action === "progress" ? readPositiveInteger(body, "scoreDelta") : undefined;
        if (action === "progress" && scoreDelta === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "scoreDelta is required.", traceId));
          return;
        }
        const result = action === "join"
          ? await repository.joinActivity(account.id, serverId, activityId, readToday(request))
          : action === "progress"
            ? await repository.progressActivity(account.id, serverId, activityId, scoreDelta ?? 0, readToday(request))
            : await repository.claimActivityReward(account.id, serverId, activityId, readToday(request));
        if (typeof result === "string") {
          sendJson(response, result.endsWith("NOT_FOUND") ? 404 : 409, failure(result, "Activity action cannot be completed.", traceId));
          return;
        }
        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/activity-shop/purchase") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }
      try {
        const body = await readBody(request);
        if (!isRecord(body)) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "Request body must be an object.", traceId));
          return;
        }
        const serverId = readServerId(body);
        const itemId = readString(body, "itemId");
        const requestId = readString(body, "requestId");
        if (serverId === undefined || itemId === "" || requestId.length < 8 || requestId.length > 64) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId, itemId and requestId are required.", traceId));
          return;
        }
        const result = await repository.purchaseActivityShopItem(account.id, serverId, itemId, requestId, readToday(request));
        if (typeof result === "string") {
          sendJson(response, result.endsWith("NOT_FOUND") ? 404 : 409, failure(result, "Activity shop item cannot be purchased.", traceId));
          return;
        }
        await repository.advanceTask(account.id, serverId, "main-activity-shop-plan", readToday(request));
        sendJson(response, result.isDuplicate ? 200 : 201, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    const scenarioStartMatch = request.method === "POST" ? /^\/scenarios\/([^/]+)\/start$/.exec(url.pathname) : null;
    if (scenarioStartMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }
      try {
        const body = await readBody(request);
        const serverId = readServerId(body);
        if (serverId === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
          return;
        }
        const result = await repository.startScenario(account.id, serverId, decodeURIComponent(scenarioStartMatch[1] ?? ""));
        if (typeof result === "string") {
          sendJson(response, result === "PLAYER_NOT_FOUND" ? 404 : 404, failure(result, "Scenario cannot be started.", traceId));
          return;
        }
        sendJson(response, 201, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    const scenarioSettleMatch = request.method === "POST" ? /^\/scenarios\/([^/]+)\/settle$/.exec(url.pathname) : null;
    if (scenarioSettleMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }
      try {
        const body = await readBody(request);
        const serverId = readServerId(body);
        const choices = isRecord(body) && Array.isArray(body.choices) ? body.choices.filter((item): item is string => typeof item === "string") : [];
        if (serverId === undefined || choices.length === 0) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and choices are required.", traceId));
          return;
        }
        const result = await repository.settleScenario(account.id, serverId, decodeURIComponent(scenarioSettleMatch[1] ?? ""), choices);
        if (typeof result === "string") {
          sendJson(response, 404, failure(result, "Scenario run not found.", traceId));
          return;
        }
        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/tasks") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const tasks = await repository.listTasks(account.id, serverId, readToday(request));
      if (tasks === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(tasks, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/company/growth") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const growth = await repository.getCompanyGrowth(account.id, serverId);
      if (growth === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(growth, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/company/growth/full-level-chest/claim") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      if (serverId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
        return;
      }

      const result = await repository.claimFullLevelChest(account.id, serverId);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "FULL_LEVEL_CHEST_NOT_READY") {
        sendJson(response, 409, failure("FULL_LEVEL_CHEST_NOT_READY", "Full level chest is not ready.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/random-tasks") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const center = await repository.listRandomTasks(account.id, serverId, readToday(request));
      if (center === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(center, traceId));
      return;
    }

    const randomTaskResolveMatch = request.method === "POST" ? /^\/random-tasks\/([^/]+)\/resolve$/.exec(url.pathname) : null;
    if (randomTaskResolveMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        const serverId = readServerId(body);
        const option = isRecord(body) && (body.option === "A" || body.option === "B") ? body.option : undefined;
        const modifierItemId = isRecord(body) ? readString(body, "modifierItemId") : "";
        const randomTaskId = decodeURIComponent(randomTaskResolveMatch[1] ?? "");
        if (serverId === undefined || option === undefined || randomTaskId === "") {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId, randomTaskId and option are required.", traceId));
          return;
        }

        const result = await repository.resolveRandomTask(account.id, serverId, randomTaskId, option, readToday(request), modifierItemId === "" ? undefined : modifierItemId);
        if (result === "PLAYER_NOT_FOUND" || result === "RANDOM_TASK_NOT_FOUND") {
          sendJson(response, 404, failure(result, "Random task not found.", traceId));
          return;
        }
        if (result === "ITEM_NOT_FOUND") {
          sendJson(response, 404, failure("ITEM_NOT_FOUND", "Inventory item not found.", traceId));
          return;
        }
        if (result === "ITEM_NOT_USABLE") {
          sendJson(response, 409, failure("ITEM_NOT_USABLE", "Inventory item cannot be used here.", traceId));
          return;
        }
        if (result === "RANDOM_TASK_ALREADY_RESOLVED" || result === "INSUFFICIENT_ACTION_POWER") {
          sendJson(response, 409, failure(result, "Random task cannot be resolved.", traceId));
          return;
        }

        await repository.advanceTask(account.id, serverId, "daily-handle-event", readToday(request));
        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    const randomTaskDismissMatch = request.method === "POST" ? /^\/random-tasks\/([^/]+)\/dismiss$/.exec(url.pathname) : null;
    if (randomTaskDismissMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        const serverId = readServerId(body);
        const randomTaskId = decodeURIComponent(randomTaskDismissMatch[1] ?? "");
        if (serverId === undefined || randomTaskId === "") {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and randomTaskId are required.", traceId));
          return;
        }

        const result = await repository.dismissRandomTask(account.id, serverId, randomTaskId, readToday(request));
        if (result === "PLAYER_NOT_FOUND" || result === "RANDOM_TASK_NOT_FOUND") {
          sendJson(response, 404, failure(result, "Random task not found.", traceId));
          return;
        }
        if (result === "RANDOM_TASK_ALREADY_RESOLVED") {
          sendJson(response, 409, failure(result, "Random task cannot be dismissed.", traceId));
          return;
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/events") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const events = await repository.listEvents(account.id, serverId);
      if (events === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(events, traceId));
      return;
    }

    const eventChoiceMatch = /^\/events\/([^/]+)\/choose$/.exec(url.pathname);
    if (request.method === "POST" && eventChoiceMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        const serverId = readServerId(body);
        const eventId = eventChoiceMatch[1];
        const option = isRecord(body) && (body.option === "A" || body.option === "B") ? body.option : undefined;
        if (serverId === undefined || eventId === undefined || option === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId, eventId and option are required.", traceId));
          return;
        }

        const result = await repository.chooseEvent(account.id, serverId, decodeURIComponent(eventId), option);
        if (result === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }
        if (result === "EVENT_NOT_FOUND") {
          sendJson(response, 404, failure("EVENT_NOT_FOUND", "Event not found.", traceId));
          return;
        }
        if (result === "EVENT_ALREADY_RESOLVED") {
          sendJson(response, 409, failure("EVENT_ALREADY_RESOLVED", "Event has already been resolved.", traceId));
          return;
        }
        if (result === "INVALID_EVENT_OPTION") {
          sendJson(response, 400, failure("INVALID_EVENT_OPTION", "Event option must be A or B.", traceId));
          return;
        }

        await repository.advanceTask(account.id, serverId, "daily-handle-event", readToday(request));
        if (result.event.knowledgeUnlocked) {
          await repository.advanceTask(account.id, serverId, "side-knowledge-labor-contract", readToday(request));
        }
        if (result.event.channel === "contract" || result.event.configId.includes("contract")) {
          await repository.advanceTask(account.id, serverId, "side-compliance-contract-review", readToday(request));
        }

        sendJson(response, 200, success(result, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/company/status") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const finance = await repository.getCompanyFinance(account.id, serverId);
      if (finance === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-first-budget", readToday(request));
      await repository.advanceTask(account.id, serverId, "main-first-report", readToday(request));
      await repository.advanceTask(account.id, serverId, "main-cashflow-budget", readToday(request));
      await repository.advanceTask(account.id, serverId, "main-finance-report", readToday(request));
      await repository.advanceTask(account.id, serverId, "daily-finance-review", readToday(request));
      sendJson(response, 200, success(finance, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/finance/settle-day") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = readServerId(await readBody(request));
      if (serverId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
        return;
      }

      const finance = await repository.settleCompanyDay(account.id, serverId);
      if (finance === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-cost-structure", readToday(request));
      sendJson(response, 200, success(finance, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/finance/settle-month") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const reportMonth = readPositiveInteger(body, "reportMonth");
      if (serverId === undefined || reportMonth === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and reportMonth are required.", traceId));
        return;
      }

      const finance = await repository.settleCompanyMonth(account.id, serverId, reportMonth);
      if (finance === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(finance, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/finance/loans") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const loans = await repository.listLoans(account.id, serverId);
      if (loans === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(loans, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/finance/fundings") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const fundings = await repository.listFundings(account.id, serverId);
      if (fundings === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-investor-list", readToday(request));
      sendJson(response, 200, success(fundings, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/products") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const products = await repository.listProducts(account.id, serverId);
      if (products === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(products, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/markets") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const markets = await repository.listMarkets(account.id, serverId);
      if (markets === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(markets, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/markets/enter") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const trackId = isRecord(body) && typeof body.trackId === "string" ? body.trackId.trim() : "";
      if (serverId === undefined || trackId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and trackId are required.", traceId));
        return;
      }

      const result = await repository.enterMarket(account.id, serverId, trackId);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "MARKET_NOT_FOUND") {
        sendJson(response, 404, failure("MARKET_NOT_FOUND", "Market track not found.", traceId));
        return;
      }
      if (result === "MARKET_ALREADY_ACTIVE") {
        sendJson(response, 409, failure("MARKET_ALREADY_ACTIVE", "This market track is already active.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-market-entry", readToday(request));
      await repository.advanceTask(account.id, serverId, "main-market-position", readToday(request));
      await repository.advanceTask(account.id, serverId, "side-competitor-response", readToday(request));
      sendJson(response, 201, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/markets/competitor-action") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const trackId = isRecord(body) && typeof body.trackId === "string" ? body.trackId.trim() : "";
      if (serverId === undefined || trackId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and trackId are required.", traceId));
        return;
      }

      const result = await repository.triggerCompetitorAction(account.id, serverId, trackId);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "MARKET_NOT_FOUND") {
        sendJson(response, 404, failure("MARKET_NOT_FOUND", "Market track not found.", traceId));
        return;
      }
      if (result === "COMPETITOR_ACTION_NOT_FOUND") {
        sendJson(response, 404, failure("COMPETITOR_ACTION_NOT_FOUND", "No competitor action is available.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-competitor-scan", readToday(request));
      sendJson(response, 201, success(result, traceId));
      return;
    }

    const competitorResponseMatch = /^\/markets\/actions\/([^/]+)\/respond$/.exec(url.pathname);
    if (request.method === "POST" && competitorResponseMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const actionId = competitorResponseMatch[1];
      const responseKind = isRecord(body) && typeof body.response === "string" ? body.response.trim() : "";
      if (serverId === undefined || actionId === undefined || (responseKind !== "defend" && responseKind !== "counter")) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId, actionId and response are required.", traceId));
        return;
      }

      const result = await repository.respondCompetitorAction(account.id, serverId, decodeURIComponent(actionId), responseKind);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "MARKET_NOT_FOUND") {
        sendJson(response, 404, failure("MARKET_NOT_FOUND", "Market track not found.", traceId));
        return;
      }
      if (result === "COMPETITOR_ACTION_NOT_FOUND") {
        sendJson(response, 404, failure("COMPETITOR_ACTION_NOT_FOUND", "Competitor action not found.", traceId));
        return;
      }
      if (result === "COMPETITOR_ACTION_SETTLED") {
        sendJson(response, 409, failure("COMPETITOR_ACTION_SETTLED", "Competitor action has already been resolved.", traceId));
        return;
      }
      if (result === "INSUFFICIENT_CASH") {
        sendJson(response, 409, failure("INSUFFICIENT_CASH", "Cash is not enough for this market response.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/products/start") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const productConfigId = isRecord(body) && typeof body.productConfigId === "string" ? body.productConfigId.trim() : "";
      if (serverId === undefined || productConfigId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and productConfigId are required.", traceId));
        return;
      }

      const result = await repository.startProduct(account.id, serverId, productConfigId);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "PRODUCT_NOT_FOUND") {
        sendJson(response, 404, failure("PRODUCT_NOT_FOUND", "Product config not found.", traceId));
        return;
      }
      if (result === "PRODUCT_ALREADY_ACTIVE") {
        sendJson(response, 409, failure("PRODUCT_ALREADY_ACTIVE", "This product line is already active.", traceId));
        return;
      }
      if (result === "INSUFFICIENT_CASH") {
        sendJson(response, 409, failure("INSUFFICIENT_CASH", "Cash is not enough for this product action.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-product-launch", readToday(request));
      await repository.advanceTask(account.id, serverId, "main-user-research", readToday(request));
      await repository.advanceTask(account.id, serverId, "side-product-incident", readToday(request));
      sendJson(response, 201, success(result, traceId));
      return;
    }

    const productActionMatch = /^\/products\/([^/]+)\/(advance|refactor|close)$/.exec(url.pathname);
    if (request.method === "POST" && productActionMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const productId = productActionMatch[1];
      const action = productActionMatch[2];
      if (serverId === undefined || productId === undefined || action === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and productId are required.", traceId));
        return;
      }

      const decodedProductId = decodeURIComponent(productId);
      const result =
        action === "advance"
          ? await repository.advanceProduct(account.id, serverId, decodedProductId)
          : action === "refactor"
            ? await repository.refactorProduct(account.id, serverId, decodedProductId)
            : await repository.closeProduct(account.id, serverId, decodedProductId);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "PRODUCT_NOT_FOUND") {
        sendJson(response, 404, failure("PRODUCT_NOT_FOUND", "Product not found.", traceId));
        return;
      }
      if (result === "PRODUCT_CLOSED") {
        sendJson(response, 409, failure("PRODUCT_CLOSED", "Product line has already been closed.", traceId));
        return;
      }
      if (result === "INSUFFICIENT_CASH") {
        sendJson(response, 409, failure("INSUFFICIENT_CASH", "Cash is not enough for this product action.", traceId));
        return;
      }

      if (action === "refactor") {
        await repository.advanceTask(account.id, serverId, "main-tech-debt-check", readToday(request));
      }
      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/finance/fundings/start") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const investorId = isRecord(body) && typeof body.investorId === "string" ? body.investorId.trim() : "";
      if (serverId === undefined || investorId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and investorId are required.", traceId));
        return;
      }

      const result = await repository.startFunding(account.id, serverId, investorId);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "INVESTOR_NOT_FOUND") {
        sendJson(response, 404, failure("INVESTOR_NOT_FOUND", "Investor offer not found.", traceId));
        return;
      }
      if (result === "FUNDING_LOCKED") {
        sendJson(response, 409, failure("FUNDING_LOCKED", "Financing terms are not available.", traceId));
        return;
      }
      if (result === "FUNDING_ALREADY_ACTIVE") {
        sendJson(response, 409, failure("FUNDING_ALREADY_ACTIVE", "This financing negotiation is already active.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-capital-choice", readToday(request));
      await repository.advanceTask(account.id, serverId, "main-roadshow-deck", readToday(request));
      await repository.advanceTask(account.id, serverId, "side-investor-relation", readToday(request));
      sendJson(response, 201, success(result, traceId));
      return;
    }

    const fundingSettleMatch = /^\/finance\/fundings\/([^/]+)\/settle$/.exec(url.pathname);
    if (request.method === "POST" && fundingSettleMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const fundingId = fundingSettleMatch[1];
      if (serverId === undefined || fundingId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and fundingId are required.", traceId));
        return;
      }

      const result = await repository.settleFunding(account.id, serverId, decodeURIComponent(fundingId));
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "FUNDING_NOT_FOUND") {
        sendJson(response, 404, failure("FUNDING_NOT_FOUND", "Financing record not found.", traceId));
        return;
      }
      if (result === "FUNDING_ALREADY_SETTLED") {
        sendJson(response, 409, failure("FUNDING_ALREADY_SETTLED", "Financing record has already been settled.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-term-review", readToday(request));
      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/finance/loans/apply") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const loanConfigId = isRecord(body) && typeof body.loanConfigId === "string" ? body.loanConfigId.trim() : "";
      if (serverId === undefined || loanConfigId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and loanConfigId are required.", traceId));
        return;
      }

      const result = await repository.applyLoan(account.id, serverId, loanConfigId);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "LOAN_NOT_FOUND") {
        sendJson(response, 404, failure("LOAN_NOT_FOUND", "Loan product not found.", traceId));
        return;
      }
      if (result === "CREDIT_NOT_ENOUGH") {
        sendJson(response, 409, failure("CREDIT_NOT_ENOUGH", "Credit rating is not enough for this loan.", traceId));
        return;
      }
      if (result === "LOAN_ALREADY_ACTIVE") {
        sendJson(response, 409, failure("LOAN_ALREADY_ACTIVE", "This loan is already active.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-capital-choice", readToday(request));
      await repository.advanceTask(account.id, serverId, "main-loan-plan", readToday(request));
      await repository.advanceTask(account.id, serverId, "side-bank-credit", readToday(request));
      sendJson(response, 201, success(result, traceId));
      return;
    }

    const loanRepayMatch = /^\/finance\/loans\/([^/]+)\/repay$/.exec(url.pathname);
    if (request.method === "POST" && loanRepayMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const loanId = loanRepayMatch[1];
      const mode = isRecord(body) && body.mode === "full" ? "full" : "scheduled";
      if (serverId === undefined || loanId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and loanId are required.", traceId));
        return;
      }

      const result = await repository.repayLoan(account.id, serverId, decodeURIComponent(loanId), mode);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "LOAN_NOT_FOUND") {
        sendJson(response, 404, failure("LOAN_NOT_FOUND", "Loan not found.", traceId));
        return;
      }
      if (result === "INSUFFICIENT_CASH") {
        sendJson(response, 409, failure("INSUFFICIENT_CASH", "Cash is not enough to repay this loan.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/finance/loans/settle-period") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = readServerId(await readBody(request));
      if (serverId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
        return;
      }

      const result = await repository.settleLoanPeriod(account.id, serverId);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "NO_ACTIVE_LOAN") {
        sendJson(response, 409, failure("NO_ACTIVE_LOAN", "No active loan is available.", traceId));
        return;
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/finance/crisis/resolve") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const route = isRecord(body) && typeof body.route === "string" ? body.route : "";
      if (serverId === undefined || route === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and route are required.", traceId));
        return;
      }
      if (route !== "financing" && route !== "cost_cut" && route !== "restructure") {
        sendJson(response, 400, failure("INVALID_CRISIS_ROUTE", "Crisis route is invalid.", traceId));
        return;
      }

      const result = await repository.resolveCrisis(account.id, serverId, route);
      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "CRISIS_NOT_ACTIVE") {
        sendJson(response, 409, failure("CRISIS_NOT_ACTIVE", "Crisis is not active.", traceId));
        return;
      }
      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/employees") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const employees = await repository.listEmployees(account.id, serverId);
      if (employees === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(employees, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/employees/recruit") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = readServerId(await readBody(request));
      if (serverId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
        return;
      }

      const employee = await repository.recruitEmployee(account.id, serverId);
      if (employee === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (employee === "NO_EMPLOYEE_AVAILABLE") {
        sendJson(response, 409, failure("NO_EMPLOYEE_AVAILABLE", "No employee candidates are available.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-first-employee", readToday(request));
      await repository.advanceTask(account.id, serverId, "main-recruit-channel", readToday(request));
      sendJson(response, 201, success(employee, traceId));
      return;
    }

    const employeeActionMatch = /^\/employees\/([^/]+)\/(train|equity|fire)$/.exec(url.pathname);
    if (request.method === "POST" && employeeActionMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = readServerId(await readBody(request));
      const employeeId = employeeActionMatch[1];
      const action = employeeActionMatch[2];
      if (serverId === undefined || employeeId === undefined || action === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and employeeId are required.", traceId));
        return;
      }

      const result =
        action === "train"
          ? await repository.cultivateEmployee(account.id, serverId, decodeURIComponent(employeeId))
          : action === "equity"
            ? await repository.grantEmployeeEquity(account.id, serverId, decodeURIComponent(employeeId))
            : await repository.dismissEmployee(account.id, serverId, decodeURIComponent(employeeId));

      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "EMPLOYEE_NOT_FOUND") {
        sendJson(response, 404, failure("EMPLOYEE_NOT_FOUND", "Employee not found.", traceId));
        return;
      }
      if (result === "EQUITY_LIMIT_REACHED") {
        sendJson(response, 409, failure("EQUITY_LIMIT_REACHED", "Founder equity is not enough.", traceId));
        return;
      }

      if (action === "train") {
        await repository.advanceTask(account.id, serverId, "daily-train-employee", readToday(request));
        await repository.advanceTask(account.id, serverId, "main-train-core", readToday(request));
      }
      if (action === "equity") {
        await repository.advanceTask(account.id, serverId, "side-founder-pressure", readToday(request));
        await repository.advanceTask(account.id, serverId, "main-equity-plan", readToday(request));
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/projects") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = url.searchParams.get("serverId")?.trim();
      if (serverId === undefined || serverId === "") {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId query parameter is required.", traceId));
        return;
      }

      const projects = await repository.listProjects(account.id, serverId);
      if (projects === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(projects, traceId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/projects/start") {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const serverId = readServerId(await readBody(request));
      if (serverId === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
        return;
      }

      const project = await repository.startProject(account.id, serverId);
      if (project === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (project === "NO_PROJECT_AVAILABLE") {
        sendJson(response, 409, failure("NO_PROJECT_AVAILABLE", "No project is available.", traceId));
        return;
      }

      await repository.advanceTask(account.id, serverId, "main-client-brief", readToday(request));
      sendJson(response, 201, success(project, traceId));
      return;
    }

    const projectActionMatch = /^\/projects\/([^/]+)\/(assign|advance|settle)$/.exec(url.pathname);
    if (request.method === "POST" && projectActionMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      const body = await readBody(request);
      const serverId = readServerId(body);
      const projectId = projectActionMatch[1];
      const action = projectActionMatch[2];
      if (serverId === undefined || projectId === undefined || action === undefined) {
        sendJson(response, 400, failure("VALIDATION_ERROR", "serverId and projectId are required.", traceId));
        return;
      }

      const result =
        action === "assign"
          ? await repository.assignProjectEmployee(
              account.id,
              serverId,
              decodeURIComponent(projectId),
              isRecord(body) && typeof body.employeeId === "string" ? body.employeeId : ""
            )
          : action === "advance"
            ? await repository.advanceProject(account.id, serverId, decodeURIComponent(projectId))
            : await repository.settleProject(account.id, serverId, decodeURIComponent(projectId));

      if (result === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }
      if (result === "PROJECT_NOT_FOUND") {
        sendJson(response, 404, failure("PROJECT_NOT_FOUND", "Project not found.", traceId));
        return;
      }
      if (result === "EMPLOYEE_NOT_FOUND") {
        sendJson(response, 404, failure("EMPLOYEE_NOT_FOUND", "Employee not found.", traceId));
        return;
      }
      if (result === "PROJECT_ALREADY_SETTLED") {
        sendJson(response, 409, failure("PROJECT_ALREADY_SETTLED", "Project has already been settled.", traceId));
        return;
      }
      if (result === "PROJECT_INCOMPLETE") {
        sendJson(response, 409, failure("PROJECT_INCOMPLETE", "Project is not ready to settle.", traceId));
        return;
      }

      if (action === "advance") {
        await repository.advanceTask(account.id, serverId, "main-first-project", readToday(request));
        await repository.advanceTask(account.id, serverId, "main-delivery-plan", readToday(request));
        await repository.advanceTask(account.id, serverId, "daily-project-push", readToday(request));
      }
      if (action === "settle") {
        await repository.advanceTask(account.id, serverId, "main-project-margin", readToday(request));
      }

      sendJson(response, 200, success(result, traceId));
      return;
    }

    const taskProgressMatch = /^\/tasks\/([^/]+)\/progress$/.exec(url.pathname);
    if (request.method === "POST" && taskProgressMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      try {
        const body = await readBody(request);
        const serverId = readServerId(body);
        const knowledgeId = readOptionalString(body, "knowledgeId");
        const taskId = taskProgressMatch[1];
        if (serverId === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
          return;
        }
        if (taskId === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "taskId is required.", traceId));
          return;
        }

        const task = await repository.advanceTask(account.id, serverId, decodeURIComponent(taskId), readToday(request), knowledgeId);
        if (task === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }
        if (task === "TASK_NOT_FOUND") {
          sendJson(response, 404, failure("TASK_NOT_FOUND", "Task not found.", traceId));
          return;
        }
        if (task === "TASK_KNOWLEDGE_MISMATCH") {
          sendJson(response, 409, failure("TASK_KNOWLEDGE_MISMATCH", "Knowledge card does not match this task.", traceId));
          return;
        }
        if (task === "KNOWLEDGE_LOCKED") {
          sendJson(response, 409, failure("KNOWLEDGE_LOCKED", "Knowledge card is not unlocked.", traceId));
          return;
        }

        sendJson(response, 200, success(task, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    const taskClaimMatch = /^\/tasks\/([^/]+)\/claim$/.exec(url.pathname);
    if (request.method === "POST" && taskClaimMatch !== null) {
      if (account === undefined) {
        sendJson(response, 401, failure("UNAUTHORIZED", "Missing or invalid session token.", traceId));
        return;
      }

      try {
        const serverId = readServerId(await readBody(request));
        const taskId = taskClaimMatch[1];
        if (serverId === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
          return;
        }
        if (taskId === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "taskId is required.", traceId));
          return;
        }

        const task = await repository.claimTask(account.id, serverId, decodeURIComponent(taskId), readToday(request));
        if (task === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }
        if (task === "TASK_NOT_FOUND") {
          sendJson(response, 404, failure("TASK_NOT_FOUND", "Task not found.", traceId));
          return;
        }
        if (task === "TASK_INCOMPLETE") {
          sendJson(response, 409, failure("TASK_INCOMPLETE", "Task is not complete yet.", traceId));
          return;
        }
        if (task === "TASK_ALREADY_CLAIMED") {
          sendJson(response, 409, failure("TASK_ALREADY_CLAIMED", "Task reward has already been claimed.", traceId));
          return;
        }

        sendJson(response, 200, success(task, traceId));
      } catch (error) {
        const code = error instanceof Error ? error.message : "BAD_REQUEST";
        sendJson(response, 400, failure(code, "Invalid request body.", traceId));
      }
      return;
    }

    sendJson(response, 404, failure("NOT_FOUND", "Route not found.", traceId));
  });
};
