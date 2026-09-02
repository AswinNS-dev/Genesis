"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isSupabaseEnabled,
  supabaseSignIn,
} from "@/lib/supabase-client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get("callbackUrl") && !searchParams.get("callbackUrl")?.startsWith("/login")
      ? searchParams.get("callbackUrl")!
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // When Supabase Auth is configured, verify the password with Supabase
    // first, then map the identity to the local investigator record so the
    // existing RBAC roles, lockout and audit stay intact.
    let res;
    if (isSupabaseEnabled()) {
      try {
        await supabaseSignIn(email, password);
      } catch {
        setLoading(false);
        setError(
          "Supabase could not verify these credentials. Please try again."
        );
        return;
      }

      res = await signIn("supabase", {
        redirect: false,
        email,
        callbackUrl,
      });
    } else {
      res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });
    }

    setLoading(false);

    if (res?.error) {
      setError(
        "Invalid credentials or account is locked/disabled. Please try again."
      );
      return;
    }
    if (res?.url) {
      router.push(res.url);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-xs font-medium text-muted">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@crimeintel.demo"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-xs font-medium text-muted">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Signing in…" : "Sign in"}
      </Button>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted">
          Demo accounts
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
          <div className="rounded-md border border-border bg-surface p-2">
            <p className="font-medium text-foreground">Admin</p>
            <p className="truncate">admin@crimeintel.demo</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-2">
            <p className="font-medium text-foreground">Investigator</p>
            <p className="truncate">investigator@crimeintel.demo</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-2">
            <p className="font-medium text-foreground">Analyst</p>
            <p className="truncate">analyst@crimeintel.demo</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-2">
            <p className="font-medium text-foreground">Viewer</p>
            <p className="truncate">viewer@crimeintel.demo</p>
          </div>
        </div>
      </div>
    </form>
  );
}
