# Last Status (Reset Preparation Snapshot)

## Scope
- 이 문서는 리셋 이후 코드베이스의 **최소 잔존 상태**를 기록하는 스냅샷이다.
- 구현 기준의 SSOT는 항상 [`docs/req-landing-final.md`](/Users/woohyeon/Local/VibeTest/docs/req-landing-final.md)이며, 이 문서는 이를 대체하지 않는다.
- 목적은 재구현 시작 시 "무엇을 남기고 무엇을 금지하는지"를 빠르게 확인하는 것이다.

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

## Reset Boundaries (Do / Don’t)

### Do
- 라우팅/i18n/404 동작 확인을 위한 **기능 없는 placeholder 페이지**만 유지한다.
- KEEP 셋 외 구현물은 재구현 전제에서 제거 대상으로 본다.
- 문서 판단이 필요하면 SSOT(`docs/req-landing-final.md`)를 우선한다.

### Don’t
- 랜딩 UI/카드/상태모델/핸드셰이크/텔레메트리/훅/fixture 로직을 재도입하지 않는다.
- 과거 구현 디테일(컴포넌트 구조, 전술, 최적화 방식)을 기준으로 설계를 고정하지 않는다.
- placeholder 범위를 넘어서는 기능/스타일/모션 구현을 선반영하지 않는다.

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
- TODO: 실제 리셋 적용 후 기준 커밋 해시를 이 문서에 갱신.
- TODO: `package.json`에 Node/npm 엔진 계약이 추가되면 이 문서에 반영.
