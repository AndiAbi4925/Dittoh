import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import {
  extractGithubId,
  isGithubIdAllowlisted,
  type GithubProfileLike,
} from "@/lib/auth-allowlist";
import { getOptionalServerEnv } from "@/lib/env";

const isProd = process.env.NODE_ENV === "production";

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const env = getOptionalServerEnv();

  return {
    trustHost: true,
    secret: env.AUTH_SECRET,
    session: {
      strategy: "jwt",
      maxAge: 60 * 60 * 8,
    },
    useSecureCookies: isProd,
    cookies: {
      sessionToken: {
        name: isProd
          ? "__Secure-dottoh.session-token"
          : "dottoh.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: isProd,
        },
      },
    },
    providers: [
      GitHub({
        clientId: env.AUTH_GITHUB_ID,
        clientSecret: env.AUTH_GITHUB_SECRET,
      }),
    ],
    callbacks: {
      async signIn({ account, profile }) {
        if (account?.provider !== "github") {
          return false;
        }
        const githubId = extractGithubId(
          profile as GithubProfileLike | undefined,
          account
        );
        return isGithubIdAllowlisted(githubId);
      },
      async jwt({ token, account, profile }) {
        if (account?.provider === "github") {
          const ghProfile = profile as GithubProfileLike | undefined;
          const githubId = extractGithubId(ghProfile, account);
          if (!githubId) {
            return { ...token, githubId: undefined, revoked: true };
          }
          token.githubId = githubId;
          if (typeof ghProfile?.login === "string") {
            token.githubUsername = ghProfile.login;
          }
          token.revoked = false;
        }

        if (!token.githubId) {
          return { ...token, revoked: true };
        }

        const allowed = await isGithubIdAllowlisted(token.githubId);
        if (!allowed) {
          return { ...token, revoked: true };
        }

        return token;
      },
      async session({ session, token }) {
        if (token.revoked || !token.githubId) {
          return {
            ...session,
            user: {
              ...session.user,
              githubId: "",
            },
          };
        }

        session.user.githubId = token.githubId;
        session.user.githubUsername = token.githubUsername;
        return session;
      },
    },
  };
});
