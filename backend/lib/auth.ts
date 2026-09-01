import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@backend/lib/prisma";
import { isSupabaseConfigured } from "@backend/infrastructure/config/env";

// Security posture — single source of truth for policy.
export const SECURITY_POLICY = {
  ACCOUNT_LOCK_THRESHOLD: 5, // failed attempts before lock
  ACCOUNT_LOCK_MINUTES: 15, // lock duration
  BRUTE_FORCE_IP_THRESHOLD: 10, // failed attempts from one IP before alert
  BRUTE_FORCE_IP_WINDOW_MINUTES: 15,
  SESSION_MAX_AGE_SECONDS: 8 * 60 * 60, // matches session.maxAge
} as const;

async function detectIpBurst(ip: string): Promise<void> {
  if (!ip || ip === "unknown") return;
  const { BRUTE_FORCE_IP_THRESHOLD, BRUTE_FORCE_IP_WINDOW_MINUTES } = SECURITY_POLICY;
  const windowStart = new Date(Date.now() - BRUTE_FORCE_IP_WINDOW_MINUTES * 60 * 1000);
  const failures = await prisma.loginAttempt.count({
    where: { ip, success: false, attemptAt: { gte: windowStart } },
  });
  if (failures < BRUTE_FORCE_IP_THRESHOLD) return;

  const existing = await prisma.securityAlert.findFirst({
    where: { type: "RULE", detail: `IP: ${ip}`, resolved: false },
  });
  if (!existing) {
    await prisma.securityAlert.create({
      data: {
        severity: "HIGH",
        type: "RULE",
        message: `Possible distributed brute-force from IP ${ip}`,
        detail: `IP: ${ip} — ${failures} failed attempts in ${BRUTE_FORCE_IP_WINDOW_MINUTES} minutes`,
      },
    });
  }
}

/**
 * Load the local investigator record bound to an authenticated identity
 * (email) and run the same status/lockout checks used by the credentials
 * provider. Used by the Supabase provider, which trusts that Supabase Auth
 * already verified the password. Returns the DB user or null.
 */
async function resolveLocalUserForAuth(
  email: string,
  ip: string,
  userAgent: string
) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (user && user.lockedUntil && user.lockedUntil > new Date()) {
    await prisma.loginAttempt.create({
      data: {
        email,
        userId: user.id,
        success: false,
        ip,
        userAgent,
        reason: "ACCOUNT_LOCKED",
      },
    });
    await detectIpBurst(ip);
    return null;
  }

  if (!user) {
    await prisma.loginAttempt.create({
      data: { email, success: false, ip, userAgent, reason: "NO_USER" },
    });
    await detectIpBurst(ip);
    return null;
  }

  if (user.status !== "ACTIVE") {
    await prisma.loginAttempt.create({
      data: {
        email,
        userId: user.id,
        success: false,
        ip,
        userAgent,
        reason: "ACCOUNT_DISABLED",
      },
    });
    await detectIpBurst(ip);
    return null;
  }

  return user;
}

/**
 * Record a successful login (reset counters, audit trail, optional
 * unusual-access alert) for an authenticated user.
 */
async function recordAuthSuccess(
  user: { id: string; email: string; lastLoginAt: Date | null },
  ip: string,
  userAgent: string
) {
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await prisma.loginAttempt.create({
    data: { email: user.email, userId: user.id, success: true, ip, userAgent },
  });

  if (ip && ip !== "unknown" && user.lastLoginAt) {
    const previous = await prisma.loginAttempt.findFirst({
      where: { email: user.email, success: true, ip: { not: ip } },
      orderBy: { attemptAt: "desc" },
    });
    if (previous) {
      await prisma.securityAlert.create({
        data: {
          userId: user.id,
          severity: "LOW",
          type: "UNUSUAL_ACCESS",
          message: `Login from unrecognized IP ${ip}`,
          detail: `Email: ${user.email} — previous successful login from ${previous.ip}; verify this access`,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "LOGIN_SUCCESS",
      detail: `Login from ${ip}`,
      ip,
      userAgent,
      status: "SUCCESS",
    },
  });
}

/**
 * Resolve the request's remote IP + user-agent headers for audit purposes.
 */
function requestMeta(req: unknown) {
  const headers = (req as unknown as { headers?: Record<string, string> })?.headers ?? {};
  return {
    ip: headers["x-forwarded-for"] ?? "unknown",
    userAgent: headers["user-agent"] ?? "",
  };
}

// Credentials for built-in login option
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SECURITY_POLICY.SESSION_MAX_AGE_SECONDS, // 8 hour session expiry
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase();
        const { ip, userAgent } = requestMeta(req);

        const user = await resolveLocalUserForAuth(email, ip, userAgent);
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          const attempts = user.failedLogins + 1;
          let lockedUntil: Date | null = null;
          let reason = "INVALID_PASSWORD";
          if (attempts >= SECURITY_POLICY.ACCOUNT_LOCK_THRESHOLD) {
            lockedUntil = new Date(Date.now() + SECURITY_POLICY.ACCOUNT_LOCK_MINUTES * 60 * 1000);
            reason = "BRUTE_FORCE_LOCK";
            await prisma.securityAlert.create({
              data: {
                userId: user.id,
                severity: "HIGH",
                type: "BRUTE_FORCE",
                message: `Account locked after ${attempts} failed login attempts`,
                detail: `Email: ${email}, IP: ${ip}`,
              },
            });
          }
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLogins: attempts, lockedUntil },
          });
          await prisma.loginAttempt.create({
            data: {
              email,
              userId: user.id,
              success: false,
              ip,
              userAgent,
              reason,
            },
          });
          await detectIpBurst(ip);
          return null;
        }

        // Success — reset counters, record login + audit.
        await recordAuthSuccess(user, ip, userAgent);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    CredentialsProvider({
      id: "supabase",
      name: "Supabase Auth",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      // Supabase Auth has already verified the password client-side; this
      // provider only maps the authenticated identity to the local
      // investigator record so RBAC, lockout and audit stay intact.
      async authorize(credentials, req) {
        if (!credentials?.email) return null;
        // Only meaningful when Supabase is actually configured.
        if (!isSupabaseConfigured()) return null;

        const email = credentials.email.toLowerCase();
        const { ip, userAgent } = requestMeta(req);

        const user = await resolveLocalUserForAuth(email, ip, userAgent);
        if (!user) return null;

        await recordAuthSuccess(user, ip, userAgent);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "VIEWER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = (token.role as string) ?? "VIEWER";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function getSession() {
  return getServerSession(authOptions);
}
