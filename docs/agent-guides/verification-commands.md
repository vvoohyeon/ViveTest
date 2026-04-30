
# docs/agent-guides/verification-commands.md

> Change-type verification commands for ViveTest.
> Load when AGENTS.md §8 (Local Definition of Done) or the Task Routing Table (§2) directs you here.
> Basic Gates (lint / typecheck / test / build) always run first — these are additional scope checks.

---

## Change-Type Commands

### routing / locale / not-found {#routing}

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

### variant registry / fixture boundary {#variant-registry}

```bash
node scripts/qa/check-variant-registry-contracts.mjs
node scripts/qa/check-variant-only-contracts.mjs
npm test -- \
  tests/unit/landing-data-contract.test.ts \
  tests/unit/landing-card-contract.test.ts \
  tests/unit/registry-serializer.test.ts \
  tests/unit/variant-registry-runtime-integrity.test.ts
```

### telemetry / consent / transition {#telemetry}

```bash
node scripts/qa/check-phase10-transition-contracts.mjs
node scripts/qa/check-phase11-telemetry-contracts.mjs
npm test -- \
  tests/unit/landing-telemetry-validation.test.ts \
  tests/unit/landing-telemetry-runtime.test.ts \
  tests/unit/landing-transition-store.test.ts
npx playwright test \
  tests/e2e/consent-smoke.spec.ts \
  tests/e2e/transition-telemetry-smoke.spec.ts
```

### landing grid / state / GNB / theme {#landing}

```bash
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
node scripts/qa/check-phase7-state-contracts.mjs
node scripts/qa/check-phase8-accessibility-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
node scripts/qa/check-phase10-transition-contracts.mjs
npm test -- \
  tests/unit/landing-interaction-dom.test.ts \
  tests/unit/landing-hover-intent.test.ts \
  tests/unit/landing-mobile-lifecycle.test.ts \
  tests/unit/landing-desktop-shell-phase.test.ts \
  tests/unit/landing-grid-plan.test.ts
npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/gnb-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts
```

### test flow / domain {#test-flow}

```bash
npm test -- \
  tests/unit/test-domain-variant-validation.test.ts \
  tests/unit/test-domain-question-model.test.ts \
  tests/unit/test-domain-derivation.test.ts \
  tests/unit/test-domain-type-segment.test.ts \
  tests/unit/test-entry-policy.test.ts \
  tests/unit/test-question-bootstrap.test.ts \
  tests/unit/variant-question-bank.test.ts \
  tests/unit/test-lazy-validation.test.ts \
  tests/unit/schema-registry.test.ts
npx playwright test tests/e2e/consent-smoke.spec.ts  # if applicable
```

---

## Scope-Specific Done Checklist

| Scope | Additional checks beyond Basic Gates |
|:---|:---|
| `proxy` / `i18n` / `route-builder` / `localized-path` | `#routing` |
| `landing grid` / `GNB` / `theme bootstrap` / `shared shell` | `#landing` (+ a11y-smoke if applicable) |
| `transition` / `telemetry` / `consent` | `#telemetry` |
| `test flow` / `entry-policy` / `question-bank` / `domain` | `#test-flow` (+ consent-smoke if applicable) |
| `variant-registry` / `data model` / `fixture boundary` | `#variant-registry` |
| `blog detail` / `subtitle continuity` | `npm test -- tests/unit/blog-server-model.test.ts tests/unit/landing-card-contract.test.ts` |
