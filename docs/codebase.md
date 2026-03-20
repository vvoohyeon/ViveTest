# Codebase Summary

This repo is a localized Next.js App Router app centered on a behavior-heavy landing experience. The current implemented surface is smaller than the product spec: it has a landing catalog, blog/history placeholders, a test-question flow, consent-gated telemetry, and extensive UI contract tests.

Core files:
- [package.json](/package.json)
- [next.config.ts](/next.config.ts)
- [docs/requirements.md](/docs/requirements.md)

## Tech Stack

From [package.json](/package.json):
- Runtime: `next@16.1.6`, `react@19.2.4`, `react-dom@19.2.4`
- i18n: `next-intl@4.8.3`
- Analytics: `@vercel/analytics`, `@vercel/speed-insights`
- Animation: `motion@12.34.0`
- Tooling: TypeScript, ESLint, Vitest, Playwright, `@axe-core/playwright`
- Styling: Tailwind v4/PostCSS are installed, but the app is primarily driven by custom global CSS in [src/app/globals.css](/src/app/globals.css)

Notable scripts:
- `dev`, `build`, `start`, `lint`, `typecheck`
- `test` for Vitest, `test:e2e` for Playwright
- `qa:rules` and `qa:gate*` run custom contract checks from [scripts/qa](/scripts/qa)

## Top-Level Structure

- [docs](/docs): requirements and phased implementation/test plans
- [public](/public): includes [theme-bootstrap.js](/public/theme-bootstrap.js)
- [scripts/qa](/scripts/qa): repo-specific rule checks for layout/state/accessibility/perf/telemetry contracts
- [src](/src): application code
- [tests](/tests): unit and e2e coverage
- `.next`, `node_modules`, `output`, `test-results`: generated/runtime artifacts

Inside `src`:
- [src/app](/src/app): App Router layouts, pages, API route
- [src/features/landing](/src/features/landing): most of the real product logic
- [src/i18n](/src/i18n): locale resolution and path building
- [src/config](/src/config): app locale config
- [src/lib/routes](/src/lib/routes): route object helpers

`[src/components](/src/components)` and `[src/hooks](/src/hooks)` currently exist but are empty.

## Entry Points And Route Structure

Locale handling is front-loaded in [src/proxy.ts](/src/proxy.ts). It redirects locale-less app routes like `/`, `/blog`, `/history`, and `/test/:variant` to `/en/...` or `/kr/...`, and injects a request header used by SSR locale resolution.

Key route files:
- Root shell: [src/app/layout.tsx](/src/app/layout.tsx)
- Localized shell: [src/app/[locale]/layout.tsx](/src/app/[locale]/layout.tsx)
- Landing page: [src/app/[locale]/page.tsx](/src/app/[locale]/page.tsx)
- Blog page: [src/app/[locale]/blog/page.tsx](/src/app/[locale]/blog/page.tsx)
- History page: [src/app/[locale]/history/page.tsx](/src/app/[locale]/history/page.tsx)
- Test question page: [src/app/[locale]/test/[variant]/page.tsx](/src/app/[locale]/test/[variant]/page.tsx)
- Telemetry API: [src/app/api/telemetry/route.ts](/src/app/api/telemetry/route.ts)

Supported locales are defined in [src/config/site.ts](/src/config/site.ts): `en` and `kr`.

## Main Modules And Data Flow

The main flow is:

1. Request routing and locale resolution
- [src/proxy.ts](/src/proxy.ts)
- [src/i18n/proxy-policy.ts](/src/i18n/proxy-policy.ts)
- [src/i18n/request.ts](/src/i18n/request.ts)
- [src/i18n/localized-path.ts](/src/i18n/localized-path.ts)

2. Page shell composition
- [src/features/landing/shell/page-shell.tsx](/src/features/landing/shell/page-shell.tsx) wraps every localized page with the GNB, transition overlay, and consent banner.
- [src/features/landing/gnb/site-gnb.tsx](/src/features/landing/gnb/site-gnb.tsx) owns nav, theme switching, keyboard flow, and mobile menu behavior.

3. Landing catalog generation
- [src/features/landing/data/raw-fixtures.ts](/src/features/landing/data/raw-fixtures.ts) is the current content source.
- [src/features/landing/data/adapter.ts](/src/features/landing/data/adapter.ts) normalizes localized fixture data into `LandingCard[]`.
- [src/app/[locale]/page.tsx](/src/app/[locale]/page.tsx) calls `createLandingCatalog(locale)` and renders the grid.

4. Landing interaction and transitions
- [src/features/landing/grid/landing-catalog-grid.tsx](/src/features/landing/grid/landing-catalog-grid.tsx) computes responsive row plans and spacing compensation.
- [src/features/landing/grid/use-landing-interaction-controller.ts](/src/features/landing/grid/use-landing-interaction-controller.ts) is the main client interaction state machine for hover, tap, focus, mobile lifecycle, and expanded card state.
- [src/features/landing/transition/use-landing-transition.ts](/src/features/landing/transition/use-landing-transition.ts) converts CTA actions into route pushes.
- [src/features/landing/transition/runtime.ts](/src/features/landing/transition/runtime.ts) writes pending transition state, landing ingress, return scroll, and telemetry correlation.
- [src/features/landing/transition/store.ts](/src/features/landing/transition/store.ts) persists that state in `sessionStorage`.

5. Destination bootstrap
- [src/features/landing/test/test-question-client.tsx](/src/features/landing/test/test-question-client.tsx) resumes test transitions, handles “start at Q2” ingress, and emits attempt/final-submit telemetry.
- [src/features/landing/blog/blog-destination-client.tsx](/src/features/landing/blog/blog-destination-client.tsx) resolves the selected article from the pending transition and completes it.

6. Telemetry and consent
- [src/features/landing/telemetry/runtime.ts](/src/features/landing/telemetry/runtime.ts) queues/sends events based on consent and session ID.
- [src/features/landing/telemetry/validation.ts](/src/features/landing/telemetry/validation.ts) blocks forbidden payload fields like free text or PII-shaped keys.
- [src/app/api/telemetry/route.ts](/src/app/api/telemetry/route.ts) currently just validates JSON parseability and returns `204`; there is no persistence layer yet.

## Tests

Configured by:
- [vitest.config.ts](/vitest.config.ts)
- [playwright.config.ts](/playwright.config.ts)

Current suite size:
- `24` unit tests
- `9` e2e specs

Coverage is strong around UI contracts:
- Unit tests cover locale routing, path builders, proxy policy, data normalization, grid plan/spacing/baseline logic, interaction state, transition store/bootstrap/runtime, consent banner, and Vercel analytics gates.
- E2E tests cover GNB behavior, grid layout rules, state transitions, accessibility smoke, consent banner flows, locale routing, theme matrix screenshots, Safari hover ghosting, and transition telemetry.

Representative files:
- [tests/unit/landing-data-contract.test.ts](/tests/unit/landing-data-contract.test.ts)
- [tests/unit/landing-grid-plan.test.ts](/tests/unit/landing-grid-plan.test.ts)
- [tests/unit/landing-transition-store.test.ts](/tests/unit/landing-transition-store.test.ts)
- [tests/e2e/grid-smoke.spec.ts](/tests/e2e/grid-smoke.spec.ts)
- [tests/e2e/transition-telemetry-smoke.spec.ts](/tests/e2e/transition-telemetry-smoke.spec.ts)
- [tests/e2e/a11y-smoke.spec.ts](/tests/e2e/a11y-smoke.spec.ts)
