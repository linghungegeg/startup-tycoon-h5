import { randomUUID } from "node:crypto";
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

const TRACE_ID_HEADER = "x-trace-id";

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
    "content-type": "application/json; charset=utf-8",
    [TRACE_ID_HEADER]: body.traceId
  });
  response.end(JSON.stringify(body));
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

export const createApiServer = (config: ApiConfig): Server =>
  createServer((request, response) => {
    const startedAt = Date.now();
    const traceId = readTraceId(request);
    const url = new URL(request.url ?? "/", "http://localhost");

    response.on("finish", () => {
      logRequest(request, response.statusCode, traceId, startedAt);
    });

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

    sendJson(response, 404, failure("NOT_FOUND", "Route not found.", traceId));
  });
