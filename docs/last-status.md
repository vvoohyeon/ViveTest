# Last Status (Post-Rollback Reference Snapshot)

## Scope
- 이 문서는 **이미 롤백이 완료된 코드베이스**의 최소 잔존 상태를 기록한 참조 스냅샷이다.
- 구현 기준의 SSOT는 항상 [`docs/req-landing-final.md`](/Users/woohyeon/Local/VibeTest/docs/req-landing-final.md)이며, 이 문서는 이를 대체하지 않는다.
- 목적은 롤백된 기준점 이후 재구현을 시작할 때 "무엇을 기반으로 이어서 구현할지"를 빠르게 확인하는 것이다.

## Usage Contract (Important)
- 이 문서는 **롤백/리셋 실행 지시문이 아니다**.
- 롤백은 이미 완료된 것으로 간주하며, 에이전트는 현재 워크트리를 출발점으로 이후 구현을 진행한다.
- 이 문서를 전달받았다는 이유만으로 `git reset`, `git revert`, 대규모 삭제를 다시 수행하지 않는다.
- KEEP 셋은 "되돌릴 목표 상태"가 아니라 "이미 확보된 기반(또는 누락 여부 점검 기준)"으로 사용한다.

## Authoritative Minimal KEEP Set

| Path | Why Kept (one-liner) |
|---|---|
| `docs/req-landing-final.md` | 최종 요구사항 SSOT 유지 |
| `package.json` | 설치/부팅/빌드 스크립트 기준 |
| `package-lock.json` | 의존성 재현성 유지 |
| `next.config.ts` | Next 부팅 + i18n/typed route/404 관련 기본 설정 |
| `tsconfig.json` | TypeScript 기본 컴파일 설정 유지 |
| `next-env.d.ts` | Next TypeScript 환경 파일 |
| `.gitignore` | 산출물/캐시 추적 제외 |
| `src/config/site.ts` | locale 및 기본 locale 정의 |
| `src/proxy.ts` | locale 처리 진입점(리다이렉트/분기) |
| `src/i18n/request.ts` | next-intl 요청 설정 진입점 |
| `src/i18n/routing.ts` | locale prefix 라우팅 골격 |
| `src/i18n/locale-resolution.ts` | locale 해석/allowlist 판정 골격 |
| `src/lib/routes/route-builder.ts` | typed route 골격 |
| `src/messages/en.json` | en 메시지 최소 구조 |
| `src/messages/kr.json` | kr 메시지 최소 구조 |
| `src/app/layout.tsx` | 루트 App Router 레이아웃 |
| `src/app/globals.css` | 전역 최소 스타일(reset 수준) |
| `src/app/not-found.tsx` | segment not-found 컨벤션 |
| `src/app/global-not-found.tsx` | global unmatched not-found 컨벤션 |
| `src/app/[locale]/layout.tsx` | locale 검증 + i18n 주입 레이아웃 골격 |
| `src/app/[locale]/page.tsx` | locale 루트 placeholder |
| `src/app/[locale]/blog/page.tsx` | blog placeholder 경로 유지 |
| `src/app/[locale]/history/page.tsx` | history placeholder 경로 유지 |
| `src/app/[locale]/test/[variant]/question/page.tsx` | test question placeholder 경로 유지 |

## Post-Rollback Guardrails (Do / Don’t)

### Do
- 라우팅/i18n/404 동작 확인을 위한 **기능 없는 placeholder 페이지**만 유지한다.
- KEEP 셋은 롤백 이후 기준점으로 간주하고, 이후 구현 시 재도입 범위를 통제하는 기준으로 사용한다.
- 문서 판단이 필요하면 SSOT(`docs/req-landing-final.md`)를 우선한다.

### Don’t
- 랜딩 UI/카드/상태모델/핸드셰이크/텔레메트리/훅/fixture 로직을 재도입하지 않는다.
- 과거 구현 디테일(컴포넌트 구조, 전술, 최적화 방식)을 기준으로 설계를 고정하지 않는다.
- placeholder 범위를 넘어서는 기능/스타일/모션 구현을 선반영하지 않는다.
- 이 문서를 근거로 롤백/리셋 절차를 다시 수행하지 않는다.

## Minimal Verification

### Commands
- `npm install`
- `npm run dev`
- `npm run build`

### Manual checks (minimum)
- `/{locale}` 경로가 렌더된다. (예: `/en`, `/kr`)
- locale-less allowlist 경로는 locale prefix 경로로 귀결된다. (예: `/blog`, `/history`, `/test/{variant}/question`)
- duplicate locale prefix는 정상 경로로 처리되지 않는다. (예: `/en/en/...`)
- segment not-found와 global unmatched not-found가 분리 동작한다.

## Notes (TODO only when uncertain)
- TODO: 적용된 롤백 기준 커밋 해시가 확정되면 이 문서에 갱신.
- TODO: `package.json`에 Node/npm 엔진 계약이 추가되면 이 문서에 반영.

## Post-Reset Delta (2026-03-03)

### Operator Note (Important for next LLM agent)
- 이 문서(`docs/last-status.md`) 내용은 세션 중 일부 롤백/수정 이력이 있었고, 본 섹션은 그 이후의 최신 보정 기록이다.
- 다음 세션 에이전트는 본 섹션을 기준으로 현재 워크트리 상태를 해석한다.
- 특히 "문서도 롤백되었을 수 있음"을 전제로, 아래 Delta를 우선 확인한 뒤 구현/정리 작업을 이어간다.

### Reset Execution Summary
- 이번 리셋은 **전체 삭제가 아닌 선택 삭제(partial reset)** 로 수행되었다.
- `docs` 폴더 하위 파일은 운영자 지시에 따라 **전부 보존**했다(삭제 0건).
- 코드 영역에서는 오류 연관 구현물(`src/features/**`)과 부가 유틸 일부를 제거하고, KEEP 엔트리 페이지는 placeholder 골격으로 정리했다.

### KEEP_REUSE Added in this reset
- `docs/last-status.md`: 다음 세션 인수인계를 위한 스냅샷/Delta 기록.
- `docs/requirements.md`: SSOT 보조 전역 제약 참고 문서로 보존.

### Deleted by Error Mapping (Error 1~9)
- Error 1/2/2-1/3/4/5/6/7 연관 삭제:
  - `src/features/landing/**`
- Error 8/9 연관 삭제:
  - `src/features/gnb/**`
- Error 7/8/9 및 전환 연관 하위 의존 삭제:
  - `src/features/blog/**`
  - `src/features/history/**`
  - `src/features/test/**`
  - `src/features/telemetry/**`
  - `src/features/ui/theme/**`
- 재구현 시 재정의 예정 유틸 삭제:
  - `src/lib/format/number.ts`
  - `src/lib/routes/locale-switch.ts`

### Next Reimplementation Boundaries (carry-over)
- `src/app/[locale]/**`는 현재 placeholder만 유지한다. 기능 로직 재도입은 SSOT 섹션 단위로 진행한다.
- 라우팅/i18n/404/typed-routes 골격(`src/proxy.ts`, `src/i18n/**`, `src/lib/routes/route-builder.ts`)은 유지하고, 비기능적인 구조 안정성을 우선한다.
- 리셋 범위에서는 테스트/이력/텔레메트리/카드 인터랙션 구현을 복원하지 않는다.
