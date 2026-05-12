/**
 * Vitest config — unit tests for lib/* helpers and content pipeline pieces.
 * ----------------------------------------------------------------------------
 * Scope (Block F #5):
 *   - lib/utils.ts pure functions (formatPrice, hashIp, absoluteUrl, …)
 *   - lib/content/toc.ts heading extraction
 *   - lib/content/reading-time.ts locale-aware reading time
 *
 * NOT in scope here:
 *   - Component rendering (would need Testing Library + jsdom; covered by
 *     Playwright integration tests instead)
 *   - Supabase / OpenRouter / Beehiiv API contracts (live network calls
 *     are flaky in CI; mock at the route level if we ever need it)
 *
 * happy-dom is included for `lib/analytics/events.ts` typeof window guards,
 * even though those barely exercise DOM — saves importing jsdom for one
 * trivial reference.
 */
import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    // Only pick up files under tests/unit; ignore the Playwright tree.
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "tests/e2e", "public"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Coverage is informational — failing on threshold would block PRs
      // for trivial helper additions. Run `npm run test:coverage` to view.
      include: ["lib/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts"],
    },
  },
  resolve: {
    // Mirror tsconfig path alias so tests can `import "@/lib/utils"` exactly
    // like app code does.
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
