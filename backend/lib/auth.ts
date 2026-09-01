import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@backend/lib/prisma";

// Credentials for built-in login option
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hour session expiry
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
        const ip =
          (req as unknown as { headers?: Record<string, string> })?.headers?.[
            "x-forwarded-for"
          ] ?? "unknown";
        const userAgent =
          (req as unknown as { headers?: Record<string, string> })?.headers?.[
            "user-agent"
          ] ?? "";

        const user = await prisma.user.findUnique({ where: { email } });

        // Lockout check
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
          return null;
        }

        if (!user) {
          await prisma.loginAttempt.create({
            data: { email, success: false, ip, userAgent, reason: "NO_USER" },
          });
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
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          const attempts = user.failedLogins + 1;
          let lockedUntil: Date | null = null;
          let reason = "INVALID_PASSWORD";
          if (attempts >= 5) {
            lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
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
          return null;
        }

        // Success — reset counters, record login + audit.
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLogins: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });
        await prisma.loginAttempt.create({
          data: { email, userId: user.id, success: true, ip, userAgent },
        });
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
