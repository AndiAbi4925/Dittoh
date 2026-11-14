import { describe, expect, it } from "vitest";
import { verifyAdminSession } from "@/lib/admin-guard";
import { extractGithubId, isGithubIdAllowlisted } from "@/lib/auth-allowlist";

describe("GitHub admin allowlist and guard", () => {
  it("extracts numeric GitHub ID from profile or account", () => {
    expect(
      extractGithubId({ id: 148310311 }, { provider: "github" })
    ).toBe("148310311");
    expect(
      extractGithubId(null, {
        provider: "github",
        providerAccountId: "99887766",
      })
    ).toBe("99887766");
  });

  it("rejects non-GitHub providers and non-numeric IDs", () => {
    expect(
      extractGithubId(
        { id: 148310311 },
        { provider: "google", providerAccountId: "148310311" }
      )
    ).toBeNull();
    expect(extractGithubId({ id: "andiabi" }, { provider: "github" })).toBeNull();
  });

  it("authorizes env-allowlisted and DB-allowlisted numeric IDs only", async () => {
    const envOnly = await isGithubIdAllowlisted("148310311", {
      envIds: "148310311, 222",
      checkDb: async () => false,
    });
    expect(envOnly).toBe(true);

    const dbOnly = await isGithubIdAllowlisted("55555", {
      envIds: "148310311",
      checkDb: async (id) => id === "55555",
    });
    expect(dbOnly).toBe(true);

    const denied = await isGithubIdAllowlisted("99999", {
      envIds: "148310311",
      checkDb: async () => false,
    });
    expect(denied).toBe(false);

    const invalid = await isGithubIdAllowlisted("not-numeric", {
      envIds: "148310311",
      checkDb: async () => true,
    });
    expect(invalid).toBe(false);
  });

  it("enforces 401 and 403 outcomes in verifyAdminSession", async () => {
    const unauthenticated = await verifyAdminSession(null, async () => true);
    expect(unauthenticated).toEqual({
      ok: false,
      status: 401,
      error: "Authentication required.",
    });

    const forbidden = await verifyAdminSession(
      { user: { githubId: "12345", githubUsername: "intruder" } },
      async () => false
    );
    expect(forbidden).toEqual({
      ok: false,
      status: 403,
      error: "Forbidden: account is not authorized for admin access.",
    });

    const allowed = await verifyAdminSession(
      { user: { githubId: "148310311", githubUsername: "AndiAbi4925" } },
      async (id) => id === "148310311"
    );
    expect(allowed).toEqual({
      ok: true,
      githubId: "148310311",
      username: "AndiAbi4925",
    });
  });
});
