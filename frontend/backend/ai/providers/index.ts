/**
 * AI provider registry.
 *
 * Provides a simple capability → provider-name lookup so the /api/ai/providers
 * route can expose which AI providers are registered for each capability.
 */

type Capability =
  | "entity_extraction"
  | "summarization"
  | "pattern_detection"
  | "entity_resolution"
  | "lead_generation";

const registry = new Map<Capability, Set<string>>();

/** Register a provider for one or more capabilities. */
export function registerProvider(name: string, capabilities: Capability[]): void {
  for (const cap of capabilities) {
    if (!registry.has(cap)) registry.set(cap, new Set());
    registry.get(cap)!.add(name);
  }
}

/** List all registered providers grouped by capability. */
export function listProviders(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [cap, providers] of registry.entries()) {
    out[cap] = [...providers];
  }
  return out;
}
