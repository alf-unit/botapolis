# E2E tests — Playwright

Block F (May 2026): scaffolding for the e2e tests we want, but the
Playwright browser-binary download (~250 MB) is deferred to first run so
the standard `npm install` stays fast.

## Setup

```bash
# Add to devDependencies
npm install --save-dev @playwright/test

# Pull the Chromium binary (one-time, ~250 MB):
npx playwright install chromium

# Add to package.json scripts (already there as a comment):
#   "test:e2e": "playwright test"
#   "test:e2e:ui": "playwright test --ui"
```

## Tests we'd ship first

Three critical-path flows that cost the most when they regress:

1. **Newsletter submit happy path**
   - Visit `/`
   - Scroll to footer, type `e2e+seed@botapolis.test` into the email input
   - Click submit
   - Expect success toast (`Sonner` `[data-sonner-toast][data-styled=true]` selector)
   - Expect the input to clear

2. **Email ROI Calculator computes**
   - Visit `/tools/email-roi-calculator`
   - Move the `Subscribers` slider from default to a known value via
     keyboard arrow keys (sliders are easier to drive deterministically
     with the keyboard than with `page.mouse`)
   - Assert the result LiveNumber updates (presence check on the result
     box selector; exact-value matching is brittle if benchmarks change)

3. **`/go/[slug]` redirector**
   - `page.request.get('/go/klaviyo', { maxRedirects: 0 })`
   - Expect 302
   - Expect `location` header to be on `klaviyo.com` (or whatever the
     seeded `affiliate_url` resolves to)

## Why these three

They each exercise a different layer:
- Newsletter → client form + `/api/newsletter` + Beehiiv + Supabase mirror
- Calculator → client-side state + LiveNumber animation primitives + analytics events
- `/go/[slug]` → server route + Supabase fetch + redirect logic + click logging

Anything else (login flow, payment, etc.) requires test fixtures (Supabase
seeded with a known test user, etc.) that we haven't built yet. Add when
auth becomes a flow worth defending in CI.

## CI integration

```yaml
# .github/workflows/e2e.yml (when CI lands)
- run: npm ci
- run: npx playwright install --with-deps chromium
- run: npm run build
- run: npx playwright test
  env:
    BASE_URL: http://localhost:3000
    # Skip the Beehiiv / Supabase live calls during e2e — use the
    # SKIP_ENV_VALIDATION path or a test-specific .env file
```

Not scaffolded yet because GitHub Actions isn't wired to this repo. Add
the workflow file alongside the first time we want CI to gate PRs.
