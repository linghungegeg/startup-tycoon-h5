import { strict as assert } from "node:assert";
import { once } from "node:events";
import { test } from "node:test";

import { createApiServer } from "../src/http.js";
import type { ApiConfig } from "../src/config.js";

const config: ApiConfig = {
  host: "127.0.0.1",
  port: 0,
  dependencies: {
    mysql: "missing",
    redis: "missing"
  }
};

type ApiBody<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  traceId: string;
};

const withServer = async (
  run: (baseUrl: string) => Promise<void>
): Promise<void> => {
  const server = createApiServer(config);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    assert.ok(address);
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
};

const requestJson = async <T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; body: ApiBody<T> }> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers
    }
  });

  return {
    status: response.status,
    body: (await response.json()) as ApiBody<T>
  };
};

test("registers an account, logs in, and returns a session token", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ accountId: string; token: string }>(
      baseUrl,
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ username: "alice", password: "secret12" })
      }
    );

    assert.equal(register.status, 201);
    assert.equal(register.body.success, true);
    assert.ok(register.body.data?.accountId);
    assert.ok(register.body.data?.token);

    const login = await requestJson<{ accountId: string; token: string }>(
      baseUrl,
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username: "alice", password: "secret12" })
      }
    );

    assert.equal(login.status, 200);
    assert.equal(login.body.success, true);
    assert.equal(login.body.data?.accountId, register.body.data.accountId);
    assert.ok(login.body.data?.token);

    const session = await requestJson<{ accountId: string; username: string }>(
      baseUrl,
      "/auth/session",
      { headers: { authorization: `Bearer ${login.body.data.token}` } }
    );

    assert.equal(session.status, 200);
    assert.equal(session.body.success, true);
    assert.equal(session.body.data?.accountId, register.body.data.accountId);
    assert.equal(session.body.data?.username, "alice");
  });
});

test("rejects invalid auth payloads and duplicate usernames", async () => {
  await withServer(async (baseUrl) => {
    const invalid = await requestJson(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "ab", password: "short" })
    });

    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.success, false);
    assert.equal(invalid.body.error?.code, "VALIDATION_ERROR");

    await requestJson(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });

    const duplicate = await requestJson(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });

    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.success, false);
    assert.equal(duplicate.body.error?.code, "ACCOUNT_EXISTS");
  });
});

test("returns server and avatar lists for authenticated accounts", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);

    const servers = await requestJson<Array<{ id: string; name: string }>>(baseUrl, "/servers", {
      headers: { authorization: `Bearer ${token}` }
    });
    const avatars = await requestJson<Array<{ id: string; name: string }>>(baseUrl, "/avatars", {
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(servers.status, 200);
    assert.equal(servers.body.success, true);
    assert.ok((servers.body.data?.length ?? 0) > 0);
    assert.equal(avatars.status, 200);
    assert.equal(avatars.body.success, true);
    assert.ok((avatars.body.data?.length ?? 0) > 0);
  });
});

test("creates one player profile per account per server", async () => {
  await withServer(async (baseUrl) => {
    const register = await requestJson<{ token: string }>(baseUrl, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: "alice", password: "secret12" })
    });
    const token = register.body.data?.token;
    assert.ok(token);
    const auth = { authorization: `Bearer ${token}` };

    const created = await requestJson<{ id: string; serverId: string; avatarId: string }>(
      baseUrl,
      "/players",
      {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          serverId: "s1",
          avatarId: "strategist",
          founderName: "Alice",
          companyName: "Spark Studio"
        })
      }
    );

    assert.equal(created.status, 201);
    assert.equal(created.body.success, true);
    assert.equal(created.body.data?.serverId, "s1");

    const duplicate = await requestJson(baseUrl, "/players", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        serverId: "s1",
        avatarId: "builder",
        founderName: "Alice2",
        companyName: "Spark Studio 2"
      })
    });

    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.success, false);
    assert.equal(duplicate.body.error?.code, "PLAYER_EXISTS");

    const profile = await requestJson<{ id: string; serverId: string }>(
      baseUrl,
      "/players?serverId=s1",
      { headers: auth }
    );

    assert.equal(profile.status, 200);
    assert.equal(profile.body.success, true);
    assert.equal(profile.body.data?.id, created.body.data?.id);
  });
});
