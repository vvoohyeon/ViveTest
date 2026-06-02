# Placeholder 썸네일 추상-only (텍스트 제거)

> **Task mode: Implementation.** BQ-19 Analysis gate: design.md 충돌 확인. Logic Improvement: no candidates. visual/asset-only.
> RC W1–W5 후속. Wave 재번호 없음.

## 1. Metadata (AGENTS §7 + rebuild 필드)

| Field | Value |
|---|---|
| Plan date | 2026-06-01 |
| Workspace | confirmed active local `main` (repo root) |
| Task mode | **Implementation** |
| Wave range | W1–W5 reconciliation 후속; no renumbering |
| SSOT contract | `design.md` §4.9 (imagery: warm-neutral/sage, low-sat, **calm abstract placeholder — 텍스트 없음**), §6.2 (thumbnail), §5.2/§5.5 (토큰 hex). RC-W1W5-03이 inline한 §5 intent hex 팔레트 유지. |
| Reference-only (불변) | `legacy/reference`; checkpoints; `docs/design/resources/superseded/**` |
| Logic Improvement | None — behavior 전부 보존 |

## 2. 변경 대상

- `src/features/landing/grid/landing-grid-card.tsx` — `createThumbnailFallbackDataUri` (L165-170) + 호출부 1줄 (`resolveVariantMediaSource` L183, 시그니처 변경의 직접 귀결)
- `public/landing-card-media/qmbti/thumbnail.svg`
- 그 외 변형 자산: **없음** (`public/landing-card-media/`에 `qmbti`만 존재 — 확인 완료). 추가 작업 불필요.

## 3. 수정 내용

- **fallback SVG**: `<text>${safeToken}</text>` 요소 완전 제거. 텍스트가 사라지면 `safeToken` local과 `variant` param이 dead → 둘 다 제거하고 호출부를 `createThumbnailFallbackDataUri()`로 갱신(eslint `no-unused-vars` 회피, orphan 제거). `thumbnailDataUriCache`/`resolveVariantMediaSource` 구조는 유지(동작 무변경; 상수 data URI를 variant별로 캐시 — 무해).
- viewBox `0 0 640 240`(16/6), `preserveAspectRatio="xMidYMid slice"` 유지.
- 팔레트(design §5 intent hex 그대로): gradient `#FBFAF7`→`#C9DBD1`, 장식 원 `#E8F0EC`(opacity 0.6)·`#5C8E78`(opacity 0.14). 추상 원만으로 구성.
- **qmbti/thumbnail.svg**: 두 `<text>`(`QMBTI`, `10m Rhythm Check`)를 감싼 `<g>` 블록 제거. `<title>`/`<desc>`(SVG 메타데이터, 시각 텍스트 아님)·gradient·rect·두 원은 유지.
- cold-blue/navy/teal hex 재유입 금지 (`#3B6EF5`/`#17A789`/`#102541`/`#1f5aa6`/`#31b28b`/`#f7fbff`).

## 4. 보존 계약

- behavior 무변경. 썸네일 slot 구조(`NormalCardThumbnail` L368-385)·`aspect-[16/6]`·`object-cover`·`alt=""` 유지.
- `globals.css`/scoped 토큰 무변경. BQ-07: baseline 재생성 금지, `qa:visual:full` 금지.
- 프롬프트1(spacing/title) 결과·프롬프트3(meta) 무변경.

## 5. Impact assessment
- shared shell/GNB/localization/a11y(이미 `aria-hidden`/`alt=""`)/state/flow: 무관. fallback data URI는 이제 variant 독립 상수.

## 6. 검증 게이트 (순서대로)
1. Basic Gates: lint → typecheck → test → build.
2. grep: cold-hex 부재 + `<text>` 부재 (fallback SVG·qmbti.svg).
3. 시각 확인: 썸네일에 글자 없음, warm-neutral→sage 추상.
4. `git diff --check`. 제외: `qa:visual:full`, baseline 재생성.

## 7. Decisions requiring user confirmation
없음.

## 8. Actual outcome

**Status: 완료·검증·uncommitted (지시 대기).** branch `main`, commit/push 미수행.

### 적용된 변경

| File | 변경 |
|---|---|
| `src/features/landing/grid/landing-grid-card.tsx` | `createThumbnailFallbackDataUri`에서 `<text>` 제거 + dead `safeToken`·`variant` param 제거(시그니처 `()`), 호출부 `createThumbnailFallbackDataUri()`로 갱신. 추상 주석 추가. gradient/circle 팔레트 유지. |
| `public/landing-card-media/qmbti/thumbnail.svg` | 두 `<text>`를 감싼 `<g>` 제거. `<title>`/`<desc>`·gradient·rect·두 원 유지. |
| `docs/plans/2026-06-01-thumbnail-abstract-only.md` | 본 plan 문서 (신규) |

`thumbnailDataUriCache`/`resolveVariantMediaSource` 구조 유지 — fallback data URI는 이제 variant 독립 상수(캐시는 무해하게 동일값 저장).

### 검증 게이트 결과

| Gate | Result |
|---|---|
| `npm run lint` | ✓ (unused-var 없음) |
| `npm run typecheck` | ✓ |
| `npm test` | ✓ 479/479 |
| `npm run build` | ✓ |
| grep | ✓ `<text>` 부재(양쪽), cold-hex 부재, `safeToken` 잔존 없음 |
| grid-smoke (예방) | ✓ 18/18 (thumbnail src/prefix 계약 L829-832 포함) |
| 시각 확인 | ✓ qmbti(asset) + fallback(Estrogen 등) 모두 글자 없는 warm-neutral→sage 추상; mockup 톤 일치 |
| `git diff --check` | ✓ clean |

BQ-07 baseline 재생성·`qa:visual:full` 미수행. behavior·slot 구조·`aspect-[16/6]`·`object-cover`·`alt=""` 무변경. 프롬프트1(spacing/title)·프롬프트3(meta) 무변경.
