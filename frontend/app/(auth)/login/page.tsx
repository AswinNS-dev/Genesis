import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldHalf } from "lucide-react";
import { LoginForm } from "./login-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign In" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
            <ShieldHalf className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">CrimeIntel</h1>
            <p className="text-xs text-muted">Indian CID Intelligence Platform</p>
          </div>
        </div>

        <Card>
          <CardContent className="px-6 py-6">
            <Suspense
              fallback={
                <p className="py-8 text-center text-sm text-muted">Loading…</p>
              }
            >
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted">
          Authorized law-enforcement use. All data is fictional and for
          demonstration only.
        </p>
      </div>
    </div>
  );
}
