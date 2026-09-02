import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { registerProviders } from "@backend/ai/providers/register";
import { listProviders } from "@backend/ai/providers";
import { aiMode } from "@backend/lib/ai";

export const dynamic = "force-dynamic";

// Provider registry introspection — exposes every registered AI/ML provider
// per capability plus the active selection, so the pluggable architecture is
// observable. Any authenticated user may view it.
export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  registerProviders();
  const registered = listProviders();
  const active = process.env.AI_PROVIDER ?? "mock";

  const withActive = {} as Record<string, { providers: string[]; active: string }>;
  for (const [capability, providers] of Object.entries(registered)) {
    withActive[capability] = {
      providers,
      active: providers.includes(active) ? active : providers[0] ?? "none",
    };
  }

  return NextResponse.json({
    mode: aiMode(),
    configuredProvider: active,
    capabilities: withActive,
  });
}