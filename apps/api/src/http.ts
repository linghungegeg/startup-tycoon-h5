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

const readToday = (): string => new Date().toISOString().slice(0, 10);

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

      const tasks = await repository.listTasks(account.id, serverId, readToday());
      if (tasks === "PLAYER_NOT_FOUND") {
        sendJson(response, 404, failure("PLAYER_NOT_FOUND", "Player profile not found.", traceId));
        return;
      }

      sendJson(response, 200, success(tasks, traceId));
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

        const task = await repository.advanceTask(account.id, serverId, decodeURIComponent(taskId), readToday());
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

        const task = await repository.claimTask(account.id, serverId, decodeURIComponent(taskId), readToday());
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
