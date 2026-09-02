// CrimeIntel — Provider registration
// ============================================================
// Registers all built-in (mock) providers into the registry.
// New providers should be registered here too, or self-register on import.
// ============================================================

import {
  registerExtractionProvider,
  registerSummarizerProvider,
  registerLeadGeneratorProvider,
  registerPatternDetectorProvider,
  registerEntityMatcherProvider,
  registerAnomalyDetectorProvider,
  registerRelationshipDetectorProvider,
} from "./index";
import { MockExtractionProvider } from "./mock-extractor";
import {
  MockSummarizerProvider,
  MockLeadGeneratorProvider,
  MockPatternDetectorProvider,
  MockHeuristicPatternDetectorProvider,
  MockEntityMatcherProvider,
  MockAnomalyDetectorProvider,
  MockRelationshipDetectorProvider,
} from "./mock-analyzers";
import {
  AdvancedExtractionProvider,
  AdvancedAnomalyDetectorProvider,
  AdvancedRelationshipDetectorProvider,
} from "./advanced-providers";

// Ensure providers are only registered once (SSR/hot-reload safe).
let registered = false;

export function registerProviders(): void {
  if (registered) return;
  registered = true;

  registerExtractionProvider(new MockExtractionProvider());
  registerExtractionProvider(new AdvancedExtractionProvider());
  registerSummarizerProvider(new MockSummarizerProvider());
  registerLeadGeneratorProvider(new MockLeadGeneratorProvider());
  registerPatternDetectorProvider(new MockPatternDetectorProvider());
  registerPatternDetectorProvider(new MockHeuristicPatternDetectorProvider());
  registerEntityMatcherProvider(new MockEntityMatcherProvider());
  registerAnomalyDetectorProvider(new MockAnomalyDetectorProvider());
  registerAnomalyDetectorProvider(new AdvancedAnomalyDetectorProvider());
  registerRelationshipDetectorProvider(new MockRelationshipDetectorProvider());
  registerRelationshipDetectorProvider(new AdvancedRelationshipDetectorProvider());
}
