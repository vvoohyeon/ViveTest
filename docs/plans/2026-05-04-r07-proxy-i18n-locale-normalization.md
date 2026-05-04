# R-07 Proxy/i18n Locale Normalization Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Project override: execute inline only after explicit user approval; do not use subagents, parallel agents, automated multi-wave execution, or automated implementation pipelines.

**Goal:** Remove duplicated proxy/i18n locale-normalization boundaries without changing routing behavior.

**Architecture:** Keep `src/proxy.ts` as the single request entry point. Move route-policy-only constants/helpers into `src/i18n/proxy-policy.ts`, keep `src/i18n/locale-resolution.ts` focused on locale token/prefix resolution, and pass the parsed locale through `ProxyDecision` so `proxy.ts` does not parse the pathname twice.

**Tech Stack:** Next.js 16 proxy, next-intl request locale header, TypeScript, Vitest, Playwright, custom QA contract scripts.

---

## Approval Status

Plan mode is required because this task touches Ask First files and routing/locale SSOT contracts:

- `src/proxy.ts`
- `scripts/qa/check-phase1-contracts.mjs`
- `docs/req-landing.md §5`
- `docs/project-analysis.md §4`

Implementation must not start until the user explicitly approves this plan in a later session.

Approved planning scope:

- Include unit test updates in `tests/unit/locale-resolution.test.ts`, `tests/unit/request-locale-header.test.ts`, and `tests/unit/proxy-policy.test.ts`.
- Keep E2E routing coverage unchanged. Do not modify `tests/e2e/routing-smoke.spec.ts`.

Decision still required before implementation:

- User approval to execute this plan.

## Current-State Snapshot

Verified from the checkout on 2026-05-04:

- `src/proxy.ts` imports `getRequestLocaleHeaderValueFromPathname` and `REQUEST_LOCALE_HEADER_NAME`, calls `resolveProxyDecision(...)`, then parses `request.nextUrl.pathname` again to set `X-NEXT-INTL-LOCALE`.
- `src/proxy.ts` matcher bypasses `_next`, `api`, `_vercel`, favicon, robots, sitemap, and file-like paths, but not `_not-found`.
- `src/i18n/proxy-policy.ts` imports route-policy helpers from `src/i18n/locale-resolution.ts`, including `isBypassPath`, `isAppOwnedPath`, `isLocaleLessAllowlistedPath`, and `globalUnmatchedPath`.
- `src/i18n/locale-resolution.ts` currently mixes locale resolution helpers with app-route policy helpers.
- `src/i18n/request-locale-header.ts` exports `getRequestLocaleHeaderValueFromPathname()`, a one-line wrapper around `parseLocalePrefix()`.
- The three unit test files listed above currently assert the old public surface, so they must move with the code.

## Relevant SSOT And Guides

- `docs/req-landing.md §5.2`: final URLs have exactly one `/{locale}` prefix.
- `docs/req-landing.md §5.3`: `src/proxy.ts` is the single i18n entry; locale-less allowlisted paths redirect; non-allowlisted paths and duplicate locale prefixes route to global unmatched 404; localized requests receive the proxy-provided locale header.
- `docs/req-landing.md §5.5`: segment 404 and global unmatched 404 stay separate.
- `docs/req-landing.md §15 EX-003`: root layout may read only the proxy-provided request locale header for SSR `html lang`.
- `docs/project-analysis.md §4`: current route surface and proxy contract.
- `docs/agent-guides/project-rules.md §Architecture`: `src/proxy.ts` remains the single request entry point; duplicate locale prefixes rewrite to `/_not-found`.
- `docs/agent-guides/verification-commands.md §routing`: scope-specific routing/locale/not-found checks.

Known pre-existing SSOT tension:

- `docs/req-landing.md §5.3` mentions `/result/[variant]/[type]` in the locale-less allowlist, but the current route surface and current proxy code do not include a result route.
- R-07 is no-behavior-change, so do not add a `/result` allowlist entry. If docs sync is requested later, document actual current implementation separately from future result-route intent.

## Files To Modify

- `docs/plans/2026-05-04-r07-proxy-i18n-locale-normalization.md` - this plan only.
- `src/proxy.ts` - remove direct dependency on `request-locale-header.ts`, consume `decision.locale`, add `_not-found` to matcher.
- `src/i18n/proxy-policy.ts` - add `locale?: AppLocale` to `next`, move route-policy constants/helpers here privately, remove runtime bypass guard.
- `src/i18n/locale-resolution.ts` - remove route-policy exports, refactor locale family normalization, simplify duplicate-prefix segment parsing.
- `src/i18n/request-locale-header.ts` - remove pathname wrapper and `parseLocalePrefix` import; keep SSR header constant/resolvers.
- `scripts/qa/check-phase1-contracts.mjs` - add one maintenance comment above `duplicateLocalePattern`.
- `tests/unit/proxy-policy.test.ts` - expect `locale` on localized `next` decisions and remove bypass-path expectations.
- `tests/unit/locale-resolution.test.ts` - remove tests/imports for moved route-policy helpers and strengthen resolver-based locale normalization coverage.
- `tests/unit/request-locale-header.test.ts` - remove tests/imports for `getRequestLocaleHeaderValueFromPathname()`.

Do not modify:

- `src/config/site.ts`
- `tests/e2e/routing-smoke.spec.ts`
- `tests/e2e/helpers/**`
- `src/app/**`
- `src/i18n/routing.ts`
- `docs/archive/**`
- generated/build output

## Impact Assessment

- Shared components: none.
- Localization: locale choice must remain identical for cookies, `Accept-Language`, supported prefixes, duplicate prefixes, and default fallback.
- A11y/state/design-system: no UI, focus, or client state changes.
- Core flow: root redirects, locale-less allowlisted redirects, duplicate-prefix 404 rewrite, global unmatched 404 rewrite, and SSR `html lang` header injection must remain behaviorally identical.
- Routing risk: high because proxy policy and locale parsing are request-entry behavior.
- Performance: minor positive effect from removing duplicated pathname parsing in `proxy.ts`.
- Test surface: unit tests move with module boundaries; E2E routing smoke remains the external behavior guard.

## Corrections To The Initial Request

- Update the three affected unit tests; otherwise `npm test` cannot pass after removing exports and changing `ProxyDecision`.
- Do not keep proxy-policy bypass assertions. Bypass is matcher-owned after this refactor.
- Do not run the final grep exactly as originally written with `globalUnmatchedPath` across all `src/`; the private const intentionally remains in `src/i18n/proxy-policy.ts`. Use the refined grep below.
- Add an ASCII warning comment in `scripts/qa/check-phase1-contracts.mjs`. That script is ASCII-only today.
- Do not derive `LOCALE_FAMILY_MAP` from `localeMetadata`; the keys are BCP 47 primary language subtags, not `AppLocale` keys.
- Do not add `/result/[variant]/[type]` to the allowlist in this no-behavior-change refactor.

## Unit 0: Restore Context And Verify Baseline

**Files to read before editing:** `AGENTS.md`, `.planning/STATE.md` if present, `docs/req-landing.md §5`, `docs/project-analysis.md §4`, `docs/agent-guides/project-rules.md §Architecture`, `docs/agent-guides/verification-commands.md §routing`, `package.json`, `next.config.ts`, `playwright.config.ts`, `src/config/site.ts`.

- [ ] Confirm this plan is approved.
- [ ] Confirm no child `AGENTS.md` applies under `src/`, `scripts/`, or `tests/`.
- [ ] Run `npm run qa:gate`. Expected: PASS. This script is three consecutive `qa:gate:once` runs in the current `package.json`. If it fails, stop before code edits and report whether the failure appears pre-existing.

## Unit 1: Update Unit Tests First

**Files:** `tests/unit/proxy-policy.test.ts`, `tests/unit/locale-resolution.test.ts`, `tests/unit/request-locale-header.test.ts`

### `tests/unit/proxy-policy.test.ts`

Replace the final "passes through already localized and bypass paths" test with policy-only localized-path assertions for `/kr`, `/zs/blog`, `/zs/blog/ops-handbook`, and `/ru`, each expecting `{action: 'next', locale: ...}`. Keep existing redirect/rewrite tests. Remove expectations for `/_next/static/chunk.js` and `/_not-found`; these paths are matcher-owned after R-07.

### `tests/unit/locale-resolution.test.ts`

Update imports to exactly:

```ts
import {
  hasDuplicateLocalePrefix,
  parseLocalePrefix,
  resolveLocaleFromCookieOrHeader,
  withLocalePrefix
} from '../../src/i18n/locale-resolution';
```

Remove assertions for `isLocaleLessAllowlistedPath`, `isAppOwnedPath`, and `isBypassPath`.

Keep cookie priority, existing accept-language mapping, prefix/duplicate detection, and `withLocalePrefix()` tests. Add resolver-level coverage for `zh-Hant-HK -> zt`, `zh-Hans-CN -> zs`, `zh-HK -> zt`, `zh-SG -> zs`, `pt-BR -> pt`, `de-AT -> de`, and `id-ID -> id`. Do not export or directly test `normalizeZhLocale()`.

### `tests/unit/request-locale-header.test.ts`

Update imports to exactly:

```ts
import {
  REQUEST_LOCALE_HEADER_NAME,
  resolveRequestLocaleFromHeaderBag,
  resolveRequestLocaleHeaderValue
} from '../../src/i18n/request-locale-header';
```

Delete the test named `resolves only localized pathnames into request header values`. Keep header-name, fallback, and server header bag tests.

### RED Verification

Run `npm test -- tests/unit/locale-resolution.test.ts tests/unit/proxy-policy.test.ts tests/unit/request-locale-header.test.ts`. Expected before production edits: `proxy-policy.test.ts` fails because localized paths still return `{action: 'next'}` without `locale`. Other updated tests may pass before production edits; that is acceptable.

## Unit 2: Move Route Policy Into `proxy-policy.ts`

**File:** `src/i18n/proxy-policy.ts`

Target imports:

```ts
import {type AppLocale} from '@/config/site';
import {
  hasDuplicateLocalePrefix,
  parseLocalePrefix,
  resolveLocaleFromCookieOrHeader,
  withLocalePrefix
} from '@/i18n/locale-resolution';
```

Add private declarations above `ProxyDecision`:

```ts
const globalUnmatchedPath = '/_not-found';

const allowlistPattern = [
  /^\/blog\/?$/u,
  /^\/blog\/[^/]+\/?$/u,
  /^\/history\/?$/u,
  /^\/test\/[^/]+\/?$/u
] as const;

function isLocaleLessAllowlistedPath(pathname: string): boolean {
  return allowlistPattern.some((pattern) => pattern.test(pathname));
}

function isAppOwnedPath(pathname: string): boolean {
  return pathname === '/' || isLocaleLessAllowlistedPath(pathname) || parseLocalePrefix(pathname) !== null;
}
```

Target `ProxyDecision`:

```ts
export type ProxyDecision =
  | {action: 'next'; locale?: AppLocale}
  | {action: 'redirect'; pathname: string}
  | {action: 'rewrite'; pathname: string};
```

Target `resolveProxyDecision()` behavior: remove `isBypassPath()` entirely; rewrite duplicate prefixes and non-app-owned paths to `globalUnmatchedPath`; store `const localePrefix = parseLocalePrefix(input.pathname)`; return `{action: 'next', locale: localePrefix}` when present; otherwise resolve locale from cookie/header; redirect `/` and locale-less allowlisted paths with `withLocalePrefix(...)`; keep the final fallback exactly as `/* unreachable */ return {action: 'next'};`.

Constraints:

- Do not export moved helpers.
- Do not add `/result` to `allowlistPattern`.
- Do not replace the final return with `throw`.

Verify: `npm test -- tests/unit/proxy-policy.test.ts`. Expected: PASS.

## Unit 3: Make `proxy.ts` Consume `decision.locale`

**File:** `src/proxy.ts`

Remove:

```ts
import {getRequestLocaleHeaderValueFromPathname, REQUEST_LOCALE_HEADER_NAME} from '@/i18n/request-locale-header';
```

Keep imports for `localeCookieName` and `resolveProxyDecision`.

Replace the `decision.action === 'next'` block with:

```ts
if (decision.action === 'next') {
  if (decision.locale) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-NEXT-INTL-LOCALE', decision.locale);
    return NextResponse.next({request: {headers: requestHeaders}});
  }

  return NextResponse.next();
}
```

Update matcher to:

```ts
matcher: ['/((?!_next|api|_vercel|_not-found|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)']
```

Rationale: the header string is intentionally inline at the proxy boundary so `proxy.ts` no longer depends on SSR-side request-header helpers. `REQUEST_LOCALE_HEADER_NAME` stays in `request-locale-header.ts` for SSR consumers.

Verify: `npx tsc --noEmit`. Expected: PASS and no `request-locale-header` import in `src/proxy.ts`.

## Unit 4: Narrow `locale-resolution.ts` To Locale Resolution

**File:** `src/i18n/locale-resolution.ts`

Remove entirely:

- `allowlistPattern`
- `export const globalUnmatchedPath`
- `export function isLocaleLessAllowlistedPath(...)`
- `export function isAppOwnedPath(...)`
- `export function isBypassPath(...)`

Keep only these exports:

- `resolveLocaleFromCookieOrHeader`
- `parseLocalePrefix`
- `hasDuplicateLocalePrefix`
- `withLocalePrefix`
- `defaultLocale`
- `locales`

Add `LOCALE_FAMILY_MAP` after `matchesLocaleFamily()`:

```ts
// BCP 47 primary language subtag -> AppLocale.
// zh is handled by normalizeZhLocale because script/region subtags decide zs vs zt.
const LOCALE_FAMILY_MAP: Record<string, AppLocale> = {
  ko: 'kr',
  en: 'en',
  ja: 'ja',
  es: 'es',
  fr: 'fr',
  pt: 'pt',
  de: 'de',
  hi: 'hi',
  id: 'id',
  ru: 'ru'
};
```

Add private `normalizeZhLocale(lowered: string): AppLocale | null` above `normalizeLocaleToken()`: return `null` unless `lowered.startsWith('zh')`; return `zt` for `zh-hant`, `zh-tw`, `zh-hk`, `zh-mo`, and those prefixes with trailing subtags; return `zs` for `zh`, `zh-hans`, `zh-cn`, `zh-sg`, those prefixes with trailing subtags, and remaining `zh-*`; return `null` at the end.

Replace `normalizeLocaleToken()` with this flow:

```ts
function normalizeLocaleToken(token: string): AppLocale | null {
  const lowered = token.toLowerCase();

  if (isLocale(lowered)) {
    return lowered;
  }

  const zhResult = normalizeZhLocale(lowered);
  if (zhResult) {
    return zhResult;
  }

  for (const [family, locale] of Object.entries(LOCALE_FAMILY_MAP)) {
    if (matchesLocaleFamily(lowered, family)) {
      return locale;
    }
  }

  return null;
}
```

Change duplicate-prefix parsing to:

```ts
const segments = pathname.replace(/^\/+|\/+$/gu, '').split('/');
```

Verify: `npm test -- tests/unit/locale-resolution.test.ts` and `npx tsc --noEmit`. Expected: PASS.

## Unit 5: Remove Request Header Path Wrapper

**File:** `src/i18n/request-locale-header.ts`

Target import:

```ts
import {defaultLocale, isLocale, type AppLocale} from '@/config/site';
```

Delete the `parseLocalePrefix` import and this export:

```ts
export function getRequestLocaleHeaderValueFromPathname(pathname: string): AppLocale | null {
  return parseLocalePrefix(pathname);
}
```

Keep:

- `REQUEST_LOCALE_HEADER_NAME`
- `resolveRequestLocaleHeaderValue(...)`
- `resolveRequestLocaleFromHeaderBag(...)`

Verify: `npm test -- tests/unit/request-locale-header.test.ts` and `npx tsc --noEmit`. Expected: PASS.

## Unit 6: Add QA Maintenance Comment

**File:** `scripts/qa/check-phase1-contracts.mjs`

Add this ASCII-only comment immediately above `duplicateLocalePattern`:

```js
// Warning: keep this pattern in sync with localeMetadata keys in src/config/site.ts when adding locales.
```

Do not change script logic.

Verify: `node scripts/qa/check-phase1-contracts.mjs`. Expected: PASS.

## Unit 7: Contract Searches And Final Verification

Run contract searches:

```bash
rg -n "getRequestLocaleHeaderValueFromPathname|isBypassPath|isLocaleLessAllowlistedPath|isAppOwnedPath" src tests
rg -n "globalUnmatchedPath" src tests --glob '!src/i18n/proxy-policy.ts'
rg -n "request-locale-header" src/proxy.ts
rg -n "_not-found" src/proxy.ts src/i18n/proxy-policy.ts
```

Expected:

- First three commands have no matches.
- Last command shows `_not-found` in `src/proxy.ts` matcher and private `globalUnmatchedPath` in `src/i18n/proxy-policy.ts`.

Run user-requested checks:

```bash
npx tsc --noEmit
npm run qa:rules
npm run test:e2e -- --grep "@smoke"
```

Run routing scope checks:

```bash
node scripts/qa/check-phase1-contracts.mjs
npm test -- \
  tests/unit/route-builder.test.ts \
  tests/unit/localized-path.test.ts \
  tests/unit/locale-resolution.test.ts \
  tests/unit/proxy-policy.test.ts \
  tests/unit/request-locale-header.test.ts \
  tests/unit/locale-config.test.ts
npx playwright test tests/e2e/routing-smoke.spec.ts
```

Run Basic Gates in order:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Optional final release recheck, if time allows after Basic Gates:

```bash
npm run qa:gate
```

All applicable commands must pass with zero errors before completion is claimed.

## Documentation Check After Implementation

Inspect:

- `docs/req-landing.md §5`
- `docs/project-analysis.md §4`
- `docs/agent-guides/project-rules.md §Architecture`
- `docs/agent-guides/verification-commands.md §routing`

Expected outcome:

- No required docs changes for R-07 if behavior remains unchanged.
- Do not update `docs/archive/**`.
- If asked to resolve the pre-existing `/result/[variant]/[type]` tension, handle it as a separate docs-sync decision.

## Non-Goals

- Do not change runtime behavior.
- Do not reintroduce `src/middleware.ts`.
- Do not modify `src/config/site.ts`.
- Do not modify `tests/e2e/routing-smoke.spec.ts` or `tests/e2e/helpers/**`.
- Do not modify `src/app/**` or `src/i18n/routing.ts`.
- Do not add `/result/[variant]/[type]` to the proxy allowlist.
- Do not export `normalizeZhLocale()` or route-policy helpers from `proxy-policy.ts`.
- Do not remove `REQUEST_LOCALE_HEADER_NAME` from `request-locale-header.ts`.
- Do not replace the unreachable `return {action: 'next'}` with `throw`.
- Do not derive `LOCALE_FAMILY_MAP` from `localeMetadata`.
- Do not edit generated/build output.

## Handoff Notes For Implementation Session

- Start from Unit 0.
- Execute exactly one unit at a time.
- Verify each unit before advancing.
- If Unit 0 `npm run qa:gate` fails, stop before editing and ask whether to repair baseline first.
- If any implementation requires changing files outside this plan, stop and ask for approval.
- If two or more independent plan units are completed and verified in one long session, evaluate `.planning/STATE.md` trigger rules before continuing.
