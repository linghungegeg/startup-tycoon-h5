import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { ApiConfig } from "./config.js";
import { createPasswordRecord, verifyPassword } from "./password.js";
import { createPrismaGameRepository, type AccountRecord, type GameRepository } from "./repository.js";

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

const TRACE_ID_HEADER = "x-trace-id";
const MAX_BODY_BYTES = 16 * 1024;

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

const readToday = (request: IncomingMessage): string => {
  const header = request.headers["x-server-date"];
  const candidate = Array.isArray(header) ? header[0] : header;

  return typeof candidate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate)
    ? candidate
    : new Date().toISOString().slice(0, 10);
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

export const createApiServer = (
  config: ApiConfig,
  repository: GameRepository = createPrismaGameRepository()
): Server => {
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

        const result = await repository.purchaseShopProduct(account.id, serverId, productId, requestId);
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
        await repository.advanceTask(account.id, serverId, "daily-project-push", readToday(request));
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
        const serverId = readServerId(await readBody(request));
        const taskId = taskProgressMatch[1];
        if (serverId === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "serverId is required.", traceId));
          return;
        }
        if (taskId === undefined) {
          sendJson(response, 400, failure("VALIDATION_ERROR", "taskId is required.", traceId));
          return;
        }

        const task = await repository.advanceTask(account.id, serverId, decodeURIComponent(taskId), readToday(request));
        if (task === "PLAYER_NOT_FOUND") {
          sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
          return;
        }
        if (task === "TASK_NOT_FOUND") {
          sendJson(response, 404, failure("TASK_NOT_FOUND", "Task not found.", traceId));
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
