# Expanded meta → 인라인 dot-separated row

> **Task mode: Implementation.** BQ-19 gate: Wave 5 defer였던 "meta layout restructuring" 후속. design.md가 이미 인라인 규정 → 환류 불필요, 구현만. Logic Improvement: none. **Risk: High** (test anchor·i18n·grid 계약 동시 영향).

## 1. Metadata (AGENTS §7 + rebuild 필드)

| Field | Value |
|---|---|
| Plan date | 2026-06-01 |
| Workspace | confirmed active local `main` |
| Task mode | **Implementation** |
| Wave range | W1–W5 reconciliation 후속 (Wave 5 defer 항목); no renumbering |
| SSOT contract | `design.md` §6.10 (quiet data row: 가로 wrap, dot separator, 13px/500/`--muted`, leading value emphasized), §7.3 (`completed`, full-digit), §5.1 (meta 13px/500/1.35), §5.3 (`--muted`/`--muted-soft`) |
| Reference-only (불변) | `legacy/reference`; checkpoints; `superseded/**` |
| Logic Improvement | None — storage/telemetry/transition/resolver/formatter behavior 보존 |

## 2. 사용자 결정 (이 작업 전 확인)

1. **라벨 표현**: 새 소문자 인라인 표현 채택 + 12-locale best-effort 초안(키 보존). `completed` 소문자는 인라인 문맥에서 자연스러움(RC-W1W5-01의 'Completed' keep은 *컬럼 라벨* 전제였고 인라인에선 해당 안 됨).
2. **HTML 시맨틱**: 비-목록 인라인 — `<p data-slot="meta">` + inline `<span class="meta-item">` ×3 + `aria-hidden` 중점 구분자. `<dl>/<dt>/<dd>` 폐기.

## 3. 변경 대상

- `src/features/landing/grid/landing-grid-card.tsx`: META_* 클래스(L232-237) 재정의, `ExpandedMetaRow` 헬퍼 신설, Test/Blog expanded meta `<dl>`→헬퍼 호출, `Fragment` import 추가.
- `src/messages/*.json` (12 locale): 5개 키 값 인라인 표현으로 갱신(키 보존).
- 테스트: contract/grid-smoke/state-smoke는 anchor(`meta-item`×3, `meta-value`, `data-slot="meta"`)를 보존하므로 **무변경 예상** — 실행 후 실패 시에만 새 구조에 맞춰 갱신. behavior 변경이므로 인라인 라벨 렌더 경량 회귀 assertion 1건 추가 검토.

CSS/QA 결합 없음 확인: module.css·scripts/qa 어디서도 meta 클래스명 미참조(contract test만 `meta-item`/`meta-value` 참조 → 보존).

## 4. 새 i18n 라벨 (인라인 `<value> <label>`; best-effort, native review 권장)

| locale | metaEstimated | metaShares | metaAttempts | metaReadTime | metaViews |
|---|---|---|---|---|---|
| en | min | shared | completed | min read | views |
| kr | 분 | 공유 | 완료 | 분 읽기 | 조회 |
| zs | 分钟 | 分享 | 完成 | 分钟阅读 | 浏览 |
| zt | 分鐘 | 分享 | 完成 | 分鐘閱讀 | 瀏覽 |
| ja | 分 | シェア | 完了 | 分で読了 | 閲覧 |
| es | min | compartidos | completados | min de lectura | visualizaciones |
| fr | min | partages | terminés | min de lecture | vues |
| pt | min | compartilhamentos | concluídos | min de leitura | visualizações |
| de | Min. | geteilt | abgeschlossen | Min. Lesezeit | Aufrufe |
| hi | मिनट | शेयर | पूर्ण | मिनट पठन | व्यू |
| id | menit | dibagikan | selesai | menit baca | dilihat |
| ru | мин | репостов | завершено | мин чтения | просмотров |

> 값 의미 변경 명시: 헤더형("Est. time"/"Shares"/"Completed"/"Read time"/"Views") → 숫자 뒤 인라인 소문자 명사/단위. 키 불변. duration 키(metaEstimated/metaReadTime)는 분 단위 접미("min"/"min read").

## 5. 스타일 (기존 토큰만; globals.css 무변경)

- row: `flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] font-medium leading-[1.35] text-[var(--muted-ink)]`.
- leading value(첫 item=duration) 강조: `font-semibold text-[var(--text-strong)]` (§6.10 "leading value optionally emphasized"; globals에 `--body` 없음 → `--text-strong` 사용).
- 구분자(`·`): `color-mix(in srgb, var(--muted-ink) 55%, transparent)` — globals에 `--muted-soft` 토큰 없음, 기존 `--muted-ink`에서 파생(신규/전역 토큰 도입 금지, Wave 16 소관). `aria-hidden`.
- full-digit formatter(L40-42/157-163) 유지.

## 6. 보존 계약

- behavior/storage/telemetry/transition/resolver 무변경. `data-slot="meta"`·`data-motion-slot="meta"`·`styles.motionStageMiddle` 유지.
- i18n 키 보존. globals.css/scoped 토큰 무변경. BQ-07 baseline 재생성·`qa:visual:full` 금지.
- §6.7: meta는 expanded 전용 → normal natural height 무영향(확인). grid-smoke title-continuity `+2px` 허용오차(직전 RC 승인) 되돌리지 않음.
- state-smoke `expanded-focus-shell.png`/`overlay-focus-shell.png`는 BQ-07 deferred — meta 높이 추가 감소로 divergence 증가 예상이나 실패 아님, baseline 재생성 금지. functional/geometry만 회귀 기준.
- 프롬프트1(spacing/title)·프롬프트2(abstract thumbnail) 결과 무변경.

## 7. 검증 게이트
1. Basic Gates: lint → typecheck → test → build (12 locale 빌드 포함).
2. contract(meta)·grid-smoke(`[data-slot="meta"]`)·state-smoke 통과(필요 시 갱신).
3. 시각: 가로 1줄 dot-separated, 13px/500, `completed` 소문자, full-digit, leading 강조.
4. `git diff --check`. 제외: `qa:visual:full`, baseline 재생성.

## 8. Actual outcome

**Status: 완료·검증·uncommitted (지시 대기).** branch `main`, commit/push 미수행.

### 적용된 변경

| File | 변경 |
|---|---|
| `src/features/landing/grid/landing-grid-card.tsx` | META_* 클래스 재정의(`meta-grid`→`meta-row` flex/wrap, separator, lead-value), `ExpandedMetaRow` 헬퍼 신설, Test/Blog `<dl>`→헬퍼, `Fragment` import. |
| `src/messages/*.json` ×12 | 5개 메타 키 값 → 인라인 소문자 표현(키 보존; §4 표). |
| `tests/unit/landing-card-contract.test.ts` | Test-expanded에 새 인라인 구조 회귀 assertion 추가(item별 value+label 존재, separator 2개). |
| `docs/plans/2026-06-01-expanded-meta-inline-row.md` | 본 plan 문서(신규). |

grid-smoke / state-smoke: anchor(`data-slot="meta"`) 보존으로 **무변경**(통과 확인). CSS/QA 결합 없음(rename 안전).

### 검증 게이트 결과

| Gate | Result |
|---|---|
| `npm run lint` | ✓ |
| `npm run typecheck` | ✓ |
| `npm test` | ✓ 479/479 (contract meta 신규 assertion 포함) |
| `npm run build` | ✓ (12 locale) |
| grid-smoke | ✓ 18/18 (`[data-slot="meta"]` width contract 포함) |
| state-smoke (게이트 외 예방) | functional 12 pass. 실패 2건은 BQ-07 deferred screenshot `expanded-focus-shell.png`/`overlay-focus-shell.png`(인라인 meta로 카드 높이 추가 감소 → divergence 증가, 예상·비회귀, baseline 재생성 금지). 초기 1회 `toHaveCount`는 mobile-keyboard(:375) 탭 포커스 timing flake(재실행 pass, meta 무관). |
| 시각/실측 | ✓ en: `3 min · 2,184 shared · 15,236 completed` — 단일 가로행, flex/wrap, 13px/500/`--muted`, dot(·, softer color-mix, aria-hidden) 2개, leading value 600/`--text-strong`, full-digit, `completed` 소문자. kr: `3분 · 2,184공유 · 15,236완료` 인라인 정상. |
| `git diff --check` | ✓ clean |

§6.7: meta는 expanded 전용 → normal natural height 무영향(grid-smoke B10/B11 통과로 확인). globals.css/scoped 토큰·`completed`(BQ-09 word) 보존, full-digit formatter 유지. BQ-07 baseline 재생성·`qa:visual:full` 미수행. 프롬프트1/2 결과 무변경.

**i18n note:** 12-locale 라벨은 best-effort 인라인 표현(키 불변). 헤더형→숫자 뒤 명사/단위. native review 권장(특히 ja `分で読了`, de `Min. Lesezeit`, ru genitive `репостов/просмотров`).
