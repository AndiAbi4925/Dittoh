import type { PrismaClient } from "@/generated/prisma/client";
import type {
  AdminAllowlistEntry,
  AdminAllowlistRole,
  AdminAllowlistState,
} from "@/lib/admin-types";
import { getDb, requireDb } from "@/lib/db";
import { getOptionalServerEnv, parseAdminGithubIds } from "@/lib/env";

export class AllowlistActionError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AllowlistActionError";
    this.status = status;
  }
}

function normalizeRole(role: string): AdminAllowlistRole {
  return role === "VIEWER" ? "VIEWER" : "ADMIN";
}

function toAllowlistEntry(row: {
  id: string;
  githubId: string;
  username: string;
  role: string;
  createdAt: Date;
}): AdminAllowlistEntry {
  return {
    id: row.id,
    githubId: row.githubId,
    username: row.username,
    role: normalizeRole(row.role),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAdminAllowlistState(
  db: PrismaClient | null = getDb()
): Promise<AdminAllowlistState> {
  const envAdminIds = Array.from(
    parseAdminGithubIds(getOptionalServerEnv().GITHUB_ADMIN_IDS)
  ).sort();

  if (!db) {
    return {
      databaseConfigured: false,
      envAdminIds,
      entries: [],
    };
  }

  try {
    const rows = await db.adminAllowlist.findMany({
      orderBy: { createdAt: "asc" },
    });

    return {
      databaseConfigured: true,
      envAdminIds,
      entries: rows.map(toAllowlistEntry),
    };
  } catch {
    return {
      databaseConfigured: false,
      envAdminIds,
      entries: [],
    };
  }
}

export async function upsertAdminAllowlistEntry(
  input: {
    githubId: string;
    username: string;
    role: AdminAllowlistRole;
  },
  actor: {
    githubId: string;
    ipHash?: string | null;
  },
  db: PrismaClient = requireDb()
): Promise<AdminAllowlistEntry> {
  const saved = await db.$transaction(async (tx) => {
    const row = await tx.adminAllowlist.upsert({
      where: { githubId: input.githubId },
      create: {
        githubId: input.githubId,
        username: input.username,
        role: input.role,
      },
      update: {
        username: input.username,
        role: input.role,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.githubId,
        action: "ALLOWLIST_UPSERTED",
        target: `admin_allowlist:${input.githubId}`,
        metadata: {
          githubId: input.githubId,
          username: input.username,
          role: input.role,
        },
        ipHash: actor.ipHash ?? null,
      },
    });

    return row;
  });

  return toAllowlistEntry(saved);
}

export async function removeAdminAllowlistEntry(
  githubId: string,
  actor: {
    githubId: string;
    ipHash?: string | null;
  },
  db: PrismaClient = requireDb()
): Promise<boolean> {
  if (githubId === actor.githubId) {
    throw new AllowlistActionError(
      "Cannot remove your own active admin GitHub ID.",
      400
    );
  }

  const deleted = await db.$transaction(async (tx) => {
    const existing = await tx.adminAllowlist.findUnique({
      where: { githubId },
    });

    if (!existing) {
      return false;
    }

    await tx.adminAllowlist.delete({
      where: { githubId },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.githubId,
        action: "ALLOWLIST_REMOVED",
        target: `admin_allowlist:${githubId}`,
        metadata: {
          githubId,
          username: existing.username,
          role: existing.role,
        },
        ipHash: actor.ipHash ?? null,
      },
    });

    return true;
  });

  return deleted;
}
