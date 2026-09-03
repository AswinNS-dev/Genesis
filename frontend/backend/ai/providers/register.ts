/**
 * Provider registration bootstrapper.
 *
 * Call `registerProviders()` once at startup (or lazily in the /api/ai/providers
 * route) to populate the registry with all built-in providers.
 */

import { registerProvider } from "./index";

let registered = false;

export function registerProviders(): void {
  if (registered) return;
  registered = true;

  // Built-in mock provider — always available.
  registerProvider("mock", [
    "entity_extraction",
    "summarization",
    "pattern_detection",
    "entity_resolution",
    "lead_generation",
  ]);

  // ML provider — registered but only active when AI_PROVIDER=ml.
  registerProvider("ml", [
    "entity_extraction",
    "entity_resolution",
  ]);

  // OpenAI provider — registered but only active when AI_PROVIDER=openai.
  registerProvider("openai", [
    "summarization",
    "lead_generation",
  ]);
}
