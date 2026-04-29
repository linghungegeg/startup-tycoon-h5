import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export type AccountRecord = {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
};

export type AdminUserRecord = AccountRecord;

export type ServerRecord = {
  id: string;
  name: string;
  status: "recommended" | "new" | "busy";
  label: string;
  isRecommended: boolean;
};

export type AvatarRecord = {
  id: string;
  name: string;
  glyph: string;
  specialty: string;
};

export type PlayerProfileRecord = {
  id: string;
  accountId: string;
  serverId: string;
  avatarId: string;
  founderName: string;
  companyName: string;
  createdAt: string;
};

export type GameRepository = {
  createAccount(account: Omit<AccountRecord, "id">): Promise<AccountRecord | "ACCOUNT_EXISTS">;
  findAccountByUsername(username: string): Promise<AccountRecord | undefined>;
  createAccountSession(accountId: string, token: string): Promise<void>;
  getAccountBySessionToken(token: string): Promise<AccountRecord | undefined>;
  findAdminByUsername(username: string): Promise<AdminUserRecord | undefined>;
  createAdminSession(adminUserId: string, token: string): Promise<void>;
  getAdminBySessionToken(token: string): Promise<AdminUserRecord | undefined>;
  listServers(): Promise<ServerRecord[]>;
  listAvatars(): Promise<AvatarRecord[]>;
  getProfile(accountId: string, serverId: string): Promise<PlayerProfileRecord | undefined>;
  createProfile(profile: Omit<PlayerProfileRecord, "id" | "createdAt">): Promise<PlayerProfileRecord | "PLAYER_EXISTS">;
  disconnect(): Promise<void>;
};

const toServerRecord = (server: {
  id: string;
  name: string;
  status: string;
  label: string;
  isRecommended: boolean;
}): ServerRecord => ({
  id: server.id,
  name: server.name,
  status: server.status === "new" || server.status === "busy" ? server.status : "recommended",
  label: server.label,
  isRecommended: server.isRecommended
});

const toProfileRecord = (profile: {
  id: string;
  accountId: string;
  serverId: string;
  avatarId: string;
  founderName: string;
  companyName: string;
  createdAt: Date;
}): PlayerProfileRecord => ({
  ...profile,
  createdAt: profile.createdAt.toISOString()
});

export const createPrismaGameRepository = (
  prisma = new PrismaClient()
): GameRepository => ({
  async createAccount(account) {
    try {
      return await prisma.account.create({
        data: {
          id: randomUUID(),
          ...account
        }
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return "ACCOUNT_EXISTS";
      }
      throw error;
    }
  },

  async findAccountByUsername(username) {
    return (await prisma.account.findUnique({ where: { username } })) ?? undefined;
  },

  async createAccountSession(accountId, token) {
    await prisma.accountSession.create({
      data: {
        id: randomUUID(),
        accountId,
        token
      }
    });
  },

  async getAccountBySessionToken(token) {
    const session = await prisma.accountSession.findUnique({
      where: { token },
      include: { account: true }
    });
    return session?.account;
  },

  async findAdminByUsername(username) {
    return (await prisma.adminUser.findUnique({ where: { username } })) ?? undefined;
  },

  async createAdminSession(adminUserId, token) {
    await prisma.adminSession.create({
      data: {
        id: randomUUID(),
        adminUserId,
        token
      }
    });
  },

  async getAdminBySessionToken(token) {
    const session = await prisma.adminSession.findUnique({
      where: { token },
      include: { adminUser: true }
    });
    return session?.adminUser;
  },

  async listServers() {
    const servers = await prisma.gameServer.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
    return servers.map(toServerRecord);
  },

  async listAvatars() {
    return prisma.avatarOption.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
  },

  async getProfile(accountId, serverId) {
    const profile = await prisma.playerProfile.findUnique({
      where: {
        accountId_serverId: {
          accountId,
          serverId
        }
      }
    });
    return profile === null ? undefined : toProfileRecord(profile);
  },

  async createProfile(profile) {
    try {
      const created = await prisma.playerProfile.create({
        data: {
          id: randomUUID(),
          ...profile
        }
      });
      return toProfileRecord(created);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return "PLAYER_EXISTS";
      }
      throw error;
    }
  },

  async disconnect() {
    await prisma.$disconnect();
  }
});
