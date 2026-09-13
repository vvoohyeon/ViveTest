# i18n 압력 census — 12 locale × 모바일 레이아웃

분석 대상: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (read-only clone, `git log -1` = `7616211` 착수 마커, 그 부모가 `a5aec95`). 저장소 파일은 하나도 수정하지 않았다.

## 0. 측정 방법과 오차 — 어느 숫자가 실측이고 어느 것이 계산인지

**실측(파일에서 직접 읽은 값)**: 메시지 키 개수·문자 수·바이트 수, 폰트 파일 크기, 폰트 cmap 커버리지, 소스의 클래스/토큰/조항 문자열. 모두 `node`로 파일을 파싱해 센 값이고 file:line을 붙였다.

**계산(실측 지문에서 유도한 값)**: px 폭·줄 수·블록 높이. `public/fonts/PretendardVariable.woff2`를 brotli 해제해 `cmap`(format 4/12)과 `hmtx`(`unitsPerEm=2048`, `numberOfHMetrics=14717`)를 직접 읽어 글리프 advance를 얻고, 문자열 폭 = Σ(advance/2048 × font-px)로 계산했다. 줄 수는 공백(그리고 CJK는 문자 단위) 기준 greedy wrap 시뮬레이션이다.

**계산값의 알려진 오차원 4가지**: ⑴ `fvar` 기본 인스턴스가 `wght=400`이므로 600/500 굵기 라벨은 실제로 2~4% 더 넓다(측정: `fvar` axis wght min 45 / **def 400** / max 930). ⑵ GPOS 커닝을 적용하지 않았다. ⑶ Pretendard에 없는 글리프(한자·데바나가리)는 fallback 폰트가 그리므로 advance를 알 수 없어 한자 1.0em·데바나가리 0.52em으로 치환했다 — zs/zt/ja/hi의 폭 수치는 **근사**다. ⑷ 브라우저의 실제 줄바꿈은 `word-break`/`overflow-wrap` 해석과 폰트 fallback에 따라 달라진다. 따라서 아래의 "WRAPS/fits" 판정은 **경계에서 ±1줄**을 감안해 읽어야 하며, 경계에서 20px 이상 떨어진 항목만 단정적으로 읽는다.

**미확인**: 브라우저 렌더로 교차검증하지 않았다(이 과제는 읽기 전용 분석이고, 이미 실측된 항목을 다시 재지 말라는 지시가 있었다). 교차검증이 필요한 항목은 §10에 모았다.

---

## 1. locale별 메시지 census — 키 62개 × 12 locale, 결손 0

키 집합은 12 locale 전부 동일하다(missing 0 / extra 0, `src/messages/*.json` 전수 비교). 각 파일은 76줄(`wc -l`)이고 6개 네임스페이스에 62개 키가 들어 있다 — `gnb` 14 · `landing` 11 · `test` 23 · `blog` 2 · `history` 6 · `consent` 6.

| locale | keys | 코드포인트 | UTF-8 bytes | 평균 길이 | 최장 키 | 최장 길이 | en 대비 총량 |
|:--|--:|--:|--:|--:|:--|--:|--:|
| en | 62 | 1,416 | 1,420 | 22.8 | consent.message | 201 | 1.00 |
| kr | 62 | 663 | 1,651 | 10.7 | consent.message | 97 | 0.47 |
| zs | 62 | 490 | 1,378 | 7.9 | consent.message | 68 | 0.35 |
| zt | 62 | 493 | 1,387 | 8.0 | consent.message | 66 | 0.35 |
| ja | 62 | 653 | 1,875 | 10.5 | consent.message | 93 | 0.46 |
| es | 62 | 1,670 | 1,702 | 26.9 | consent.message | 208 | 1.18 |
| fr | 62 | **1,835** | 1,889 | **29.6** | consent.message | **250** | **1.30** |
| pt | 62 | 1,643 | 1,699 | 26.5 | consent.message | 226 | 1.16 |
| de | 62 | 1,736 | 1,781 | 28.0 | consent.message | 225 | 1.23 |
| hi | 62 | 1,532 | **4,032** | 24.7 | consent.message | 221 | 1.08 |
| id | 62 | 1,573 | 1,577 | 25.4 | consent.message | 241 | 1.11 |
| ru | 62 | 1,502 | 2,789 | 24.2 | consent.message | 204 | 1.06 |

**읽는 법 1 — 문자 수는 두 무리로 갈린다.** CJK 3종(zs 0.35 · zt 0.35 · ja 0.46)과 kr(0.47)이 en의 절반 이하, 유럽어 5종(fr 1.30 · de 1.23 · es 1.18 · pt 1.16 · id 1.11)이 en보다 길다. 모바일 폭 압력의 최악 케이스는 **fr**, 최선은 **zs**다.

**읽는 법 2 — 바이트 수는 순서가 다르다.** hi는 코드포인트로는 en의 1.08배지만 UTF-8로는 4,032 bytes로 en의 2.84배다(데바나가리는 3바이트/자 + 결합 기호). ru는 2,789 bytes(1.96배). 이 차이는 RSC payload/전송 비용에만 영향을 주고 레이아웃에는 영향을 주지 않는다 — 레이아웃 판단에 바이트 수를 쓰면 안 된다.

**메시지가 카드 텍스트를 담지 않는다는 사실이 이 census의 가장 중요한 한계다.** 카드 제목/부제/태그/문항/선택지는 `src/messages/**`가 아니라 variant registry fixture에 있고, 그 fixture는 **`en`과 `kr` 두 locale만** 갖는다 — `src/features/variant-registry/source-fixture.ts`에서 locale 키 출현 횟수는 `en: 34, kr: 34`이고 zs/zt/ja/es/fr/pt/de/hi/id/ru는 **0회**다. 문항 fixture도 같다(`src/features/test/fixtures/questions/*.ts` 7개 파일 전부 `en`/`kr`만; 예: `qmbti.ts` `{"en":24,"kr":24}`). `src/features/variant-registry/localization.ts:33-57`의 `resolveLocalizedText()`가 `locale → defaultLocale('en') → default → 아무 값`순으로 떨어뜨리므로, **지금 10개 locale의 카드/문항은 영어로 렌더된다.** 이는 계약 위반이 아니다(`docs/req-landing.md:399`가 "locale 값 누락 시 default locale fallback"을 명시한다). 그러나 **"12 locale × 390px 가로 오버플로 0"이라는 기존 실측은 10개 locale에서 영어 본문을 잰 결과**이며, 카드 텍스트가 번역되는 순간 무효가 된다.

---

## 2. 가장 긴 문자열 top 20 — 모바일에서 깨질 후보

코드포인트 기준. 렌더 위치와 실제 폰트 크기를 함께 적는다.

| # | len | locale | key | 렌더 위치 (file:line) | 렌더 폰트 |
|--:|--:|:--|:--|:--|:--|
| 1 | 250 | fr | consent.message | `src/features/landing/shell/consent-banner.tsx:245` | `--body-sm` 400 14px/1.55 |
| 2 | 241 | id | consent.message | 〃 | 〃 |
| 3 | 226 | pt | consent.message | 〃 | 〃 |
| 4 | 225 | de | consent.message | 〃 | 〃 |
| 5 | 221 | hi | consent.message | 〃 | 〃 |
| 6 | 208 | es | consent.message | 〃 | 〃 |
| 7 | 204 | ru | consent.message | 〃 | 〃 |
| 8 | 201 | en | consent.message | 〃 | 〃 |
| 9 | 174 | fr | landing.heroBody | `src/app/[locale]/page.tsx:30` | 상속 16px/1.5 |
| 10 | 174 | de | test.optedOutAvailableWarning | `src/features/test/instruction-overlay.tsx:221` | `--caption` 400 13px/1.45 |
| 11 | 172 | fr | test.optedOutAvailableWarning | 〃 | 〃 |
| 12 | 171 | de | landing.heroBody | `src/app/[locale]/page.tsx:30` | 16px/1.5 |
| 13 | 164 | hi | test.optedOutAvailableWarning | `instruction-overlay.tsx:221` | 13px/1.45 |
| 14 | 163 | es | landing.heroBody | `page.tsx:30` | 16px/1.5 |
| 15 | 160 | pt | landing.heroBody | 〃 | 〃 |
| 16 | 160 | id | test.optedOutAvailableWarning | `instruction-overlay.tsx:221` | 13px/1.45 |
| 17 | 152 | ru | landing.heroBody | `page.tsx:30` | 16px/1.5 |
| 18 | 150 | en | landing.heroBody | 〃 | 〃 |
| 19 | 150 | es | test.optedOutAvailableWarning | `instruction-overlay.tsx:221` | 13px/1.45 |
| 20 | 147 | en / pt | test.optedOutAvailableWarning | 〃 | 〃 (동률 2건) |

**top 20이 사실상 3개 키다.** `consent.message`(8개), `landing.heroBody`(6개), `test.optedOutAvailableWarning`(6개). 나머지 59개 키는 전부 142자 미만이다. 즉 **긴 문자열 문제는 "번역이 길다"가 아니라 "이 세 자리가 산문을 담고 있다"**는 정보구조 문제다.

**세 자리의 모바일 블록 높이(계산, 390px)**:

| key | 컨테이너 폭 | 최소 locale | 최대 locale | 높이 스프레드 |
|:--|--:|:--|:--|--:|
| consent.message | 330px (배너 358 − p-14 ×2) | zs/zt/kr 3줄 = 65px | fr/id 6줄 = 130px | **+65px** |
| landing.heroBody | 358px (main 390 − gutter 16 ×2) | zs 2줄 = 48px | ja/es/fr/pt/de/ru 4줄 = 96px | **+48px** |
| test.optedOutAvailableWarning | 350px (카드 390 − p-5 ×2) | kr/zs/zt 2줄 = 38px | fr/de 4줄 = 76px | **+38px** |

---

## 3. 같은 키의 locale 간 길이 비율 — 짧은 라벨이 가장 크게 늘어난다

영어 대비 최대 배율 상위. **en이 짧을수록 배율이 크다** — 이것이 버튼·칩·GNB처럼 고정 폭 상자에 들어가는 라벨을 정확히 때린다.

| key | en | 최대 locale | 최대 len | 배율 | 최소 locale | 최소 len | 렌더 위치 |
|:--|--:|:--|--:|--:|:--|--:|:--|
| consent.deny | 4 | hi | 13 | **3.25×** | kr | 2 | 동의 배너 secondary 버튼 `consent-banner.tsx:248` |
| landing.metaViews | 5 | es | 15 | **3.00×** | kr | 2 | (미렌더 — §9 참조) |
| landing.metaShares | 6 | pt | 17 | **2.83×** | kr | 2 | 확장 카드 meta row `landing-grid-card.tsx:780` |
| gnb.backAria | 7 | fr | 18 | 2.57× | ja | 2 | `site-gnb.tsx:258,381` aria-label |
| gnb.home | 4 | de | 10 | 2.50× | kr | 1 | 모바일 드로어 링크 `site-gnb.tsx:446` |
| test.next | 4 | id | 10 | 2.50× | kr | 2 | 문항 하단 CTA `test-question-client.tsx:301` |
| history.goHome | 7 | fr | 17 | 2.43× | kr | 3 | (미렌더 — §9) |
| landing.readMore | 9 | id | 17 | 1.89× | kr | 4 | 블로그 카드 CTA `landing-grid-card.tsx:516,541` |
| test.denyAndStart | 14 | hi | 26 | 1.86× | zs | 5 | 지시 오버레이 secondary `entry-policy.ts:188` |
| gnb.close / landing.close | 5 | de | 9 | 1.80× | kr | 2 | GNB pill `site-gnb.tsx:408` |
| test.start | 5 | fr | 9 | 1.80× | kr | 2 | 자격 문항 primary `test-question-client.tsx:319` |
| consent.regionLabel | 14 | es | 25 | 1.79× | kr | 5 | 배너 `aria-label` |
| landing.metaReadTime | 8 | es | 14 | 1.75× | kr | 4 | (미렌더 — §9) |
| landing.comingSoon | 11 | fr | 18 | 1.64× | zs | 4 | 태그 칩 `landing-grid-card.tsx:1077` |
| test.keepCurrentPreference | 24 | ru | — | 1.5×대 | — | — | 지시 오버레이 secondary `entry-policy.ts:160` |

**가장 위험한 세 자리를 px로 환산했다(계산).**

**(a) 지시 오버레이 액션 행** — `instruction-overlay.tsx:20`이 `flex flex-wrap items-center gap-2`, `:180/:227`이 `justify-end`, 카드가 `:26`에서 모바일 `w-full` + `p-5`. 390px에서 가용 폭 **350px**. 버튼은 `button-class-names.ts:60` `min-h-[46px] px-4` + 1px border ×2 = 텍스트 + 34px. `--button`은 600 15px(`globals.css:212`).

| 조합 | en | kr | zs | zt | ja | es | fr | pt | de | hi | id | ru |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| acceptAll + keepCurrent | **370** | 273 | 271 | 271 | 324 | **442** | **489** | **409** | **480** | **473** | **447** | **447** |
| acceptAll + denyAndAbandon | 332 | 269 | 256 | 256 | 294 | **388** | **424** | **375** | **436** | **442** | **366** | **362** |
| acceptAll + denyAndStart | 304 | 269 | 256 | 256 | 294 | **375** | **423** | **361** | **411** | **461** | 344 | **367** |

굵은 값이 350px 초과 → **두 줄로 접히고 `justify-end` 때문에 primary가 아랫줄 오른쪽으로 내려간다.** 12 locale 중 **최대 9개(en·es·fr·pt·de·hi·id·ru + 조합에 따라)**가 접힌다. kr/zs/zt/ja는 어느 조합에서도 접히지 않는다. 즉 **이 화면은 한국어로만 설계·검증된 흔적이 px로 남아 있다.**

**(b) 동의 배너 액션 행** — 390px에서 배너 358px(`consent-banner.tsx:20` 레이어 `px-4`), `:241` 모바일 `p-[14px]` → 내부 330px, 버튼 3개 + `gap-2` ×2.

| locale | accept / deny / preferences (px) | 합계 | 330px |
|:--|:--|--:|:--|
| en | 100 / 69 / 116 | 300 | fits |
| kr | 90 / 60 / 60 | 225 | fits |
| zs · zt | 94 / 64 / 94 | 268 | fits |
| ja | 106 / 64 / 64 | 250 | fits |
| id | 129 / 71 / 103 | 318 | fits (경계 −12px) |
| pt | 116 / 88 / 119 | 339 | **WRAPS** |
| fr | 128 / 86 / 116 | 346 | **WRAPS** |
| es | 122 / 97 / 119 | 353 | **WRAPS** |
| ru | 121 / 109 / 110 | 357 | **WRAPS** |
| de | 141 / 98 / 116 | 371 | **WRAPS** |
| hi | 151 / 131 / 128 | 426 | **WRAPS** |

**(c) 태그 칩의 56px tail** — `req-landing.md:290`(BQ-32)이 마지막 가시 태그를 `--tag-min-width:56px`까지 말줄임하도록 허용한다. 칩은 13px `px-[9px]`(`landing-grid-card.tsx:230`)이므로 텍스트 상자는 **38px**. 그 폭에 들어가는 글자 수(계산, 말줄임표 포함):

`en "comi…"(4/11)` · `kr "출시 …"(3/5)` · `zs "即将…"(2/4)` · `zt "即將…"(2/4)` · `ja "近日…"(2/4)` · `es "próx…"(4/12)` · `fr "bien…"(4/18)` · `pt "em …"(3/8)` · `de "dem…"(3/9)` · `hi "जल्द…"(4/13)` · `id "seg…"(3/12)` · `ru "ско…"(3/5)`

**다만 이 경로는 지금 unavailable 카드에서는 발동하지 않는다** — `landing-grid-card.tsx:459` `const normalizedTags = comingSoonLabel ? [comingSoonLabel] : card.tags;`가 unavailable일 때 태그를 **coming-soon 하나로 치환**하므로 경쟁 태그가 없어 전체 폭이 나온다(fr 최대 122px, 모바일 카드 내부 326px에 여유). 위험은 **available 블로그 카드에서 CTA 예약(`:465`)과 태그가 경쟁할 때**이고, 그때 `req-landing.md:291`의 "unavailable `coming soon`은 첫 번째 필수 prefix로 항상 가시" 조항과 결합하면 `"bien…"`이 유일한 가용성 신호가 된다. **결함 등급: 조건부(미확인 — 실제로 그 조합이 발생하는지 브라우저 확인 필요).**

---

## 4. `req-landing.md` §6.6 Text & Clamp Contract — 전문 인용과 locale별 실패 예측

### 4-1. 전문 인용 (`docs/req-landing.md:280-313`, verbatim)

```text
### 6.6 Text & Clamp Contract
**Rule**: 텍스트 정책은 아래와 같이 고정한다.
- Desktop/Tablet Normal title: normal inline-size 기준의 wrap-based 1줄 clamp를 적용하고 overflow 시 ellipsis(`...`)를 노출해야 한다.
- Desktop/Tablet Expanded title: ellipsis 없이 전체 title을 표시해야 하며, Expanded의 첫 줄은 widened expanded 폭이 아니라 **Normal title 폭 기준으로 계산한 첫 줄 split 결과**를 그대로 유지해야 한다.
- Desktop/Tablet Expanded title의 나머지 텍스트는 첫 줄 아래에서만 reveal/collapse 되어야 하며, 첫 줄 continuity를 깨는 재래핑을 금지한다.
- Mobile title: Normal/OPENING/OPEN/CLOSING 전 상태에서 전체 title을 표시해야 하며 ellipsis를 적용하면 안 된다.
- Desktop/Tablet Landing Normal subtitle: 최대 2줄까지만 표시하며, overflow 발생 시 ellipsis(`...`)가 반드시 시각 노출되어야 한다.
- Mobile Landing Normal subtitle: 전체 텍스트를 표시하고 clamp/ellipsis를 적용하면 안 된다.
- Normal subtitle overflow 처리 결과는 동일 카드의 형제 슬롯 기하(썸네일/태그 포함)의 inline-size를 변경하면 안 된다.
- Normal tags 영역은 1줄 슬롯과 nowrap을 유지한다. 가시 태그는 원본 좌→우 순서의 단일 prefix여야 하며 재배열/교체를 금지한다.
- BQ-32: 마지막 가시 태그만 scoped border-box `--tag-min-width:56px`까지 말줄임할 수 있다. 자연 너비가 56px 이하인 짧은 태그는 전체 표시 또는 숨김만 허용하고, 다음 tail의 필수 폭이 부족하면 suffix를 우측부터 숨긴다.
- 폭이 다시 넓어지면 같은 prefix identity를 유지한 채 suffix가 다시 mount되어야 한다. tail 폭 전개는 CSS가 소유하고, JS는 settled/target width에서 가시 prefix count만 결정해야 한다.
- Blog `Read more →`는 Desktop/Tablet hover/focus에서 reveal되고 Mobile에서는 항상 표시된다. CTA가 표시될 때는 probe intrinsic CTA width와 row gap을 먼저 예약하여 태그보다 우선하며, live row reflow 폭을 CTA 측정 입력으로 사용하면 안 된다.
- 숨긴 tag suffix는 public DOM/a11y tree에서 unmount해야 한다. 측정 probe는 `aria-hidden` + `inert`여야 하고 card/container/document scrollable overflow 또는 live-row flex gap을 만들면 안 되며, unavailable `coming soon`은 첫 번째 필수 prefix로 항상 가시·AT 노출 상태를 유지한다.
- Expanded Test preview/choices: 줄바꿈 허용, truncate 금지
- Expanded Test subtitle: 렌더링하지 않는다.
- Expanded Test answer choices 텍스트는 버튼 내부 좌측 정렬을 강제하며 줄 수 제한 없이 줄바꿈을 허용한다.
- Expanded Test answer choices 텍스트는 truncate/ellipsis/clamp를 금지한다.
- Landing Expanded Blog subtitle: 같은 `subtitle`을 continuity 있게 유지하며 총 4줄까지만 표시한다.
- Blog subtitle은 Normal 2줄 clamp와 Expanded 4줄 clamp가 **같은 source text**를 재사용해야 한다. 별도 보조 텍스트 소스, 치환/요약/후처리/우회 소스 없이 동일한 `subtitle` 텍스트 하나만 사용한다.
- 제거된 blog 전용 보조 필드 및 런타임 카드 우회 shape가 blog subtitle source, subtitle continuity 계산, 런타임 카드 계약에 재유입되는 것을 금지한다.
- Expanded meta/CTA: overflow 시 truncate
- 카드 타이포그래피는 동일 locale에서 Normal/Expanded 상태 간 대표 폰트 1종을 유지해야 하며 상태별 폰트 분기를 금지한다.
- 폰트는 `ko`, `en` locale별로 각 1종의 대표 폰트를 허용하고 공통 fallback 체인을 사용한다.

**Verification**:
1. Manual: 긴 텍스트 fixture로 줄바꿈/클램프를 확인한다.
2. Automated: screenshot diff로 clamp 정책 위반 여부를 검증한다.
3. Automated: Desktop/Mobile long-token fixture에서 subtitle overflow 시 ellipsis가 노출되는지 검증한다.
4. Automated: Desktop Expanded Blog subtitle continuity가 lead+overflow 구조를 사용하면서도 Normal subtitle과 동일한 source text를 재사용하는지 검증한다.
5. Automated: subtitle 길이 변화가 Normal 카드의 형제 슬롯 inline-size를 변경하지 않는지 검증한다.
6. Automated: 제거된 blog 전용 보조 필드 및 런타임 카드 우회 shape 재유입이 없는지 회귀 검증한다.
7. Automated: 12 locale에서 resize down/up 시 tag suffix 우측우선 hide/reappear, prefix identity, 56px tail, short-tail full-or-hidden를 검증한다.
8. Automated: Blog Desktop/Tablet rest→hover/focus에서 CTA 예약으로 가용 tag 폭이 줄고, width transition당 `data-visible-tag-count` 변경이 최대 1회인지 검증한다.
9. Automated: hidden suffix의 public DOM/a11y 부재, probe 비노출, `coming soon` 상시 노출을 검증한다.
```

구현 대응: 모바일 분기는 `landing-grid-card.tsx:379`(subtitle `isMobileViewport ? 'overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-2'`)와 `:408`(title `isMobileViewport ? 'block overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-1'`), Expanded Blog subtitle은 `:382`의 `line-clamp-4`다.

### 4-2. 조항별 locale 실패 예측

**① "폰트는 `ko`, `en` locale별로 각 1종" (`:303`) — 10개 locale에 대해 조항 자체가 없다.** 이건 예측이 아니라 측정으로 확정된 계약 공백이다. §6에서 보듯 zs/zt는 렌더 문자의 85.5/85.6%, ja는 34.3%, hi는 81.5%가 Pretendard에 없어 fallback 체인의 다른 face가 그린다. 같은 문장 안에서 두 face가 섞이는 **ja가 가장 심각하다**(가나는 Pretendard, 한자는 fallback → 같은 줄에서 획 두께·x-height·베이스라인이 바뀐다). 바로 위 `:302` "동일 locale에서 Normal/Expanded 상태 간 대표 폰트 1종"이 *상태 간* 일관성만 요구하고 *문자 간* 일관성은 요구하지 않는 것이 이 공백의 구조적 원인이다.

**② "Desktop/Tablet Normal title 1줄 clamp" (`:282`) — 실패하지 않지만 정보 손실률이 locale마다 다르다.** 1줄 clamp는 정의상 오버플로를 만들지 않으므로 "깨지지" 않는다. 대신 **보이는 글자 수가 고정**된다. 20px/600 기준 계산으로 카드 content 폭별 수용 글자 수:

| 카드 폭 (뷰포트) | content | 영문 수용 글자수(평균) | 10개 fixture 제목 중 잘리는 개수 |
|:--|--:|--:|--:|
| 478px (1024) | 446px | ~46~51자 | 7 / 20 |
| 395px (1440) | 363px | ~37~41자 | 9 / 20 |
| 354px (768) | 322px | ~32~36자 | 11 / 20 |

영어 제목 fixture가 이미 1440px에서 9개가 잘린다. 여기에 **de 1.23× / fr 1.30×** 확장을 적용하면 같은 상자에서 독일어는 en 대비 약 **19% 적은 의미**만 보이고 프랑스어는 **23% 적게** 보인다(총 문자 수 비율에서 유도한 추정 — 카드 제목만의 확장률은 fixture에 번역이 없어 직접 잴 수 없다). **이 조항은 "언어마다 다른 양의 정보를 보여 주는" 규칙이며, 모바일 전면 리팩터가 IA를 다시 그릴 때 재검토 대상이다.**

**③ "Mobile Landing Normal subtitle 전체 텍스트, clamp 금지" (`:287`) — 이 조항 하나가 모바일 스크롤 깊이의 주 원인이다.** fixture의 en 부제를 15px/326px에서 계산하면:

| variant | type | en 부제 글자수 | 모바일 줄 수 | 부제만의 높이(21.75px/줄) |
|:--|:--|--:|--:|--:|
| qmbti | test | 36 | 1 | 22px |
| rhythm-b | test | 81 | 1 | 22px |
| debug-sample | test | 45 | 1 | 22px |
| energy-check | test | 47 | 1 | 22px |
| creativity-profile | test | 40 | 1 | 22px |
| burnout-risk | test | 57 | 2 | 44px |
| egtt | test | 76 | 2 | 44px |
| **ops-handbook** | blog | **371** | **9** | **196px** |
| build-metrics | blog | 123 | 3 | 65px |
| release-gate | blog | 146 | 4 | 87px |

`ops-handbook` 하나가 모바일 Normal 카드 안에서 **부제만 9줄 196px**을 차지한다. 여기에 fr(1.30×)/de(1.23×)를 적용하면 11~12줄(240~260px)이다. **이 조항은 "모바일에서는 잘라서는 안 된다"를 언어·길이와 무관하게 절대명령으로 적어 두었고, 그 대가가 3.76 화면이다.** 데스크톱에는 2줄 clamp가 있는데 모바일에만 없다는 비대칭은 UX 근거가 아니라 당시 "모바일에서 말줄임은 나쁘다"는 일반론으로 보이며, 리팩터에서 뒤집을 1순위 조항이다.

**④ "Normal tags 1줄 nowrap" (`:289`) + BQ-32 56px tail (`:290`) — §3(c) 참조.** zs/zt/ja는 `--tag-min-width:56px`에서 **2글자만** 남고, 2글자 한자 말줄임은 의미를 거의 전달하지 못한다(`即将…` / `近日…`). 반대로 `ru "скоро"`(53.8px 칩)는 56px 하한보다 **좁으므로** "자연 너비가 56px 이하인 짧은 태그는 전체 표시 또는 숨김만 허용" 분기로 들어간다 — 같은 조항이 locale에 따라 다른 분기를 타고, **ru만 "숨김" 가능 대상이 된다.** 이건 조항이 폭(px)으로 쓰였고 언어는 글자 수로 변하기 때문에 생기는 구조적 어긋남이다.

**⑤ "Landing Expanded Blog subtitle 총 4줄" (`:298`) — CJK에서 관대하고 유럽어에서 가혹하다.** 15px/326px 4줄은 라틴 ~200자, 한자 ~60자를 담는다. `ops-handbook`의 371자 영어 부제는 4줄 clamp에서 **약 54%가 잘린다**. zs 번역본은 같은 내용이 0.35× = 약 130자가 되어 4줄에 **전부 들어간다**. 즉 같은 조항이 zs에서는 clamp가 아니고 en/fr/de에서는 절반 이상을 자르는 clamp다.

**⑥ "Expanded Test answer choices truncate/ellipsis/clamp 금지" (`:297`) — 세로 무한 확장이 모바일에서 유일하게 통제되지 않는 축이다.** 선택지 텍스트도 fixture(en/kr)에만 있어 지금은 압력이 없지만, 번역 후 de/fr에서 선택지 한 줄이 두 줄이 되면 확장 카드 높이가 곧바로 늘어난다. **미확인**: 확장 카드 높이 상한이 어디서 잡히는지는 이번 과제 범위 밖(§6.7 Card Height 계약)이라 확인하지 않았다.

**⑦ Verification 7 "12 locale에서 … 검증한다" (`:312`) — 이 검증은 돌고 있으나 시각 회귀망은 2개 locale만 덮는다.** `tests/e2e/grid-smoke.spec.ts:487,1196,1342`와 `tests/e2e/a11y-smoke.spec.ts:290`이 `src/config/site.ts`의 `locales` 12개를 실제로 순회한다(기하/이름 안정성 검사). 그러나 `tests/e2e/theme-matrix-manifest.json`의 첫 필드가 `"locales":["en","kr"]`이고, `tests/e2e/theme-matrix-smoke.spec.ts:14`가 `type MatrixLocale = 'en' | 'kr'`로 타입까지 고정한다. 실제 baseline PNG 164장을 세면 **en 82장 · kr 82장 · 나머지 10개 locale 0장**(그중 모바일 뷰포트 40장). **따라서 사용자 결정 ④(0단계 구조 분리, 시각 baseline이 증거)는 현재 망으로는 12 locale 중 2개에 대해서만 무변경을 증명할 수 있다.** 이건 리팩터 착수 전에 알아야 할 사실이다.

---

## 5. 숫자·날짜·상대시간 포맷 — 하나는 하드코딩, 둘은 존재하지 않는다

**숫자: `en-US`로 하드코딩되어 있다.** `src/features/landing/grid/landing-grid-card.tsx:41`

```ts
const metaValueFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
});
```

`:159-165`의 `formatMetaValue()`가 이 단일 formatter를 쓰고, `:724`/`:729`에서 확장 카드 meta row의 모든 수치를 그린다. locale 인자를 받지 않는다. fixture 값은 4~5자리(`source-fixture.ts:35` `engagedC: 15236`, `:202` `engagedC: 42401`, `:220` `21502`, `:242` `17943`)라 **자릿수 구분자가 실제로 발동한다.** 올바른 출력과 현재 출력:

| locale | 올바른 15236 | 현재 출력 | 결함 |
|:--|:--|:--|:--|
| en · ja · hi | 15,236 | 15,236 | 없음 |
| kr · zs · zt | 15,236 | 15,236 | 없음(우연히 일치) |
| es · pt · de · id | **15.236** | 15,236 | **소수점으로 읽힌다** |
| fr · ru | **15 236** | 15,236 | 구분자 불일치 |

`es/pt/de/id`는 **`15,236`이 "15.236"으로 읽히는 것이 아니라 "15와 236/1000"으로 읽힌다** — 자릿수 구분자와 소수 구분자가 반대이므로 값이 1,000배 작게 전달된다. 12 locale 중 **6개에서 지금 렌더되고 있는 결함**이다.

**locale 코드 3개가 `Intl`에서 영어로 조용히 해석된다 — 이게 더 큰 함정이다.** Node 24 ICU로 직접 측정:

| 앱 locale | `Intl.NumberFormat(l).resolvedOptions().locale` | 1,523,600 출력 |
|:--|:--|:--|
| `kr` | **`en-US`** | 1,523,600 |
| `zs` | **`en-US`** | 1,523,600 |
| `zt` | **`en-US`** | 1,523,600 |
| `ko` (정상 태그) | `ko` | 1,523,600 |
| `zh-Hans` | `zh-Hans` | 1,523,600 |
| hi | `hi` | **15,23,600** (인도식 lakh 그룹) |

`kr`·`zs`·`zt`는 BCP 47에 없는 코드다(`kr`은 언어 subtag로는 Kanuri, `zs`/`zt`는 미할당). `Intl`은 예외를 던지지 않고 **조용히 `en-US`로 떨어진다.** 날짜로 확인하면 더 분명하다 — `Intl.DateTimeFormat('kr',{dateStyle:'medium'})` → `Sep 11, 2026` (resolved `en-US`), `Intl.DateTimeFormat('ko',...)` → `2026. 9. 11.`. **따라서 `Intl`을 쓰는 어떤 포맷도 kr/zs/zt에서는 영어 결과를 낸다.** hi의 lakh 그룹(15,23,600)은 en-US 하드코딩이 계속되면 7자리 값에서 드러난다.

**퍼센트는 next-intl ICU를 타지만 기호 간격은 하드코딩이다.** `test-question-client.tsx:196` `t('progressValue', {percent: scoringProgress.percent})`, 메시지는 12 locale 전부 `"{percent}%"`다. ICU `{percent}`는 숫자만 locale 포맷하고 `%`는 리터럴이므로, fr/ru가 쓰는 `50 %`(narrow no-break space 선행)나 `Intl.NumberFormat(style:'percent')`의 locale별 관례가 적용되지 않는다. 그리고 kr/zs/zt는 위 이유로 숫자조차 `en-US` 규칙을 탄다.

**날짜·상대시간은 렌더되는 곳이 하나도 없다.** `src` 전체에서 `toLocaleString`/`toLocaleDateString`/`Intl.DateTimeFormat`/`Intl.RelativeTimeFormat`/next-intl `useFormatter`/`getFormatter` 사용처 **0건**. `Date.now()`는 telemetry·전환·dwell·활성런 타임아웃에만 쓴다(`src/features/telemetry/runtime.ts:161`, `src/features/transition/runtime.ts:44`, `src/features/test/use-question-dwell.ts:17,26,28,34`, `src/features/test/storage/active-run.ts:66,91`). `gnb.timerPlaceholder`는 12 locale 전부 리터럴 `"00:00"`이고, `test.qualifierPending`은 전부 `"—"`다. **결과 히스토리(`/{locale}/history`)가 실제 항목을 그리기 시작하는 순간 날짜 포맷이 필요해지고, 그때 kr/zs/zt는 위의 `en-US` 함정을 그대로 밟는다** — 히스토리 구현 전에 locale 코드 문제를 고치는 것이 순서다.

**복수형 규칙은 전혀 없다.** `src/messages/*.json` 전체에서 ICU `plural`/`select` 구문 0건. 그런데 수치와 붙어 렌더되는 라벨이 5개 있다(`metaEstimated`·`metaShares`·`metaAttempts`·`metaReadTime`·`metaViews`). `source-fixture.ts:181-182`에 `sharedC: 1, engagedC: 9`인 variant가 실재하므로, ru는 `1 репостов`(복수 생격)·`9 завершено`처럼 **문법적으로 틀린 문자열이 지금 렌더된다.** 러시아어는 3개 형태(1 / 2–4 / 5+), 폴란드계 규칙을 요구하고 hi/es/fr/pt/de/id는 2개 형태를 요구한다.

---

## 6. 폰트 — Pretendard Variable 1.96 MB가 실제로 덮는 것 (바이너리 측정)

**파일**: `public/fonts/PretendardVariable.woff2`, **2,057,688 bytes = 1.96 MiB** (`ls -l`). 선언은 `src/app/globals.css:31-36`, `font-weight: 45 920`, `font-display: swap`, `format('woff2-variations')`. **preload하지 않는다** — `src`/`public`/`next.config.ts` 어디에도 `rel="preload"`가 없고, `globals.css:22`가 그 결정을 명시한다("`swap`, and deliberately NOT preloaded. The full variable face is 1.96 MB").

**측정 방법**: woff2 컨테이너를 직접 파싱했다(16 tables, `totalSfntSize` 6,759,776) → brotli 스트림 해제(6,195,362 bytes) → `cmap` 서브테이블 4개(plat 0/3 × format 4/12) 전수 전개. **매핑된 코드포인트 총 14,336개.**

| Unicode 블록 | 커버 | 총 | 비율 | 어느 locale이 쓰는가 |
|:--|--:|--:|--:|:--|
| Basic Latin | 95 | 96 | 99.0% | en es fr pt de id (+ 전 locale 숫자) |
| Latin-1 Supp | 96 | 96 | 100.0% | es fr pt de |
| Latin Ext-A | 127 | 128 | 99.2% | — |
| Latin Ext-B | 207 | 208 | 99.5% | — |
| **Cyrillic** | **254** | **256** | **99.2%** | **ru — 완전 커버** |
| Cyrillic Supp | 1 | 48 | 2.1% | — |
| **Devanagari** | **0** | **128** | **0.0%** | **hi — 전무** |
| Devanagari Ext | 0 | 32 | 0.0% | hi |
| General Punct | 88 | 112 | 78.6% | 전 locale |
| Arrows | 28 | 112 | 25.0% | `→` (U+2192) 커버됨 |
| CJK Sym & Punct | 26 | 64 | 40.6% | `。`(U+3002)·`、`(U+3001) 커버됨 |
| **Hiragana** | **90** | **96** | **93.8%** | **ja — 가나만 커버** |
| **Katakana** | **94** | **96** | **97.9%** | **ja** |
| Hangul Compat Jamo | 53 | 96 | 55.2% | kr |
| **Hangul Syllables** | **11,172** | **11,172** | **100.0%** | **kr — 완전 커버** |
| **CJK Unified (한자)** | **0** | **20,992** | **0.0%** | **zs zt ja — 전무** |
| **CJK Ext-A** | **0** | **6,592** | **0.0%** | zs zt |
| CJK Compat Ideographs | 0 | 512 | 0.0% | zs zt ja |
| Halfwidth/Fullwidth | 151 | 240 | 62.9% | ja zs zt |

**이 측정은 저장소가 스스로 열어 둔 미해결 질문을 닫는다.** `docs/design/ds/colors_and_type.css:225-229`가 적어 둔 그대로다: "Pretendard's own Han coverage could not be established reliably from the browser: width comparison cannot separate 'the face has this glyph' from 'both fallbacks resolved to the same system font', and a canvas raster comparison disagreed with it." — **브라우저로는 갈리지 않던 것이 폰트 바이너리의 `cmap`에서는 갈린다. 답은 0이다. Pretendard Variable에는 한자가 한 글자도 없고 데바나가리도 없다.**

**locale별로, 실제 렌더되는 문자 중 fallback으로 넘어가는 비율(`src/messages/*.json` 전문 기준 실측)**:

| locale | 총 문자 | Pretendard에 없는 문자 | 비율 | 없는 문자 종류 수 | 실제로 그리는 face(예상) |
|:--|--:|--:|--:|--:|:--|
| en · es · fr · pt · de · id · ru | 1,416~1,835 | **1** | 0.1% | 1 (`⋅`) | Pretendard |
| kr | 663 | **1** | 0.2% | 1 (`⋅`) | Pretendard |
| ja | 653 | **224** | **34.3%** | 110 | 가나=Pretendard, 한자=Hiragino Sans |
| hi | 1,532 | **1,249** | **81.5%** | 55 | 전부 fallback |
| zs | 490 | **419** | **85.5%** | 196 | 전부 fallback |
| zt | 493 | **422** | **85.6%** | 196 | 전부 fallback |

**세 가지 결론이 따라온다.**

**(a) ja는 한 문장 안에서 두 face가 섞인다 — 시각적으로 가장 나쁜 케이스.** 34.3%가 한자이므로 `「言語 ⋅ テーマ」`처럼 짧은 라벨조차 한자(fallback)+가타카나(Pretendard)+`⋅`(또 다른 fallback) 세 face가 한 줄에 놓인다. `req-landing.md:302`의 "대표 폰트 1종" 조항이 상태 간에만 걸려 있어 이 혼합은 계약 위반조차 아니다.

**(b) zs/zt/hi는 1.96 MB를 받아 자기 텍스트의 14.5% / 18.5%에만 쓴다.** 현재는 카드 본문이 영어 fallback이라 체감 비율이 다르지만, 카드가 번역되면 zs/zt 사용자는 **문서 문자의 ~90%가 시스템 폰트로 그려지는 상태에서 2 MB를 내려받는다.** `font-display: swap`이라 텍스트가 기다리진 않지만, 모바일 데이터·디코드 비용은 그대로다. **성능 예산 관점의 명확한 결함이며, `globals.css:26-28`이 이미 해법(upstream dynamic subset per-unicode-range)을 적어 두고 "assets this repository does not have"로 막아 두었다.**

**(c) fallback 체인의 순서가 zs/zt에 불리하게 짜여 있다.** `src/app/globals.css:225`(= `docs/design/ds/colors_and_type.css:231-236`의 미러):

```css
--font-sans: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Hiragino Sans', 'PingFang SC', 'PingFang TC', 'Segoe UI', 'Yu Gothic UI', 'Microsoft YaHei', 'Microsoft JhengHei', Roboto, 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', 'Noto Sans TC', 'Noto Sans Devanagari', 'Helvetica Neue', Arial, sans-serif;
```

CSS 폰트 fallback은 **글자 단위로 목록 순서대로** 내려간다. 이 목록은 한국어 face(`Apple SD Gothic Neo`) → **일본어 face(`Hiragino Sans`)** → 중국어 간체(`PingFang SC`) → 번체(`PingFang TC`) 순이다. 따라서 ⑴ zs/zt의 한자 중 `Hiragino Sans`가 덮는 것은 **일본어 자형**으로 그려지고, ⑵ 그걸 통과한 글자 중 `PingFang SC`가 덮는 것은 zt에서도 **간체 자형 디자인**으로 그려진다(PingFang SC는 번체 코드포인트도 자체 자형으로 덮는다). `ds/colors_and_type.css:229`의 "every script has a named face behind Pretendard, and a face is only consulted for glyphs the ones before it lack"라는 근거는 **커버리지**에 대해서는 옳지만 **자형 변이(Han unification)**를 다루지 않는다. **결함 등급: 예측 — 실제 어느 글자가 어느 face로 가는지는 macOS/iOS 실기 렌더로 확인해야 한다(§10).**

**(d) `lang` 속성이 그 혼란을 바로잡지 못한다.** `src/app/layout.tsx:23` `<html data-theme="light" lang={locale} suppressHydrationWarning>`, 클라이언트 동기화는 `src/i18n/locale-html-lang-sync.tsx:9-13`. 들어가는 값은 앱 locale 코드 그대로라 `lang="kr"`, `lang="zs"`, `lang="zt"`가 문서에 찍힌다 — 셋 다 유효한 BCP 47 언어 태그가 아니다. 브라우저가 Han unification을 언어로 가르는 경로(`:lang()` 기반 시스템 폰트 선택)가 **작동할 수 없다.** 그리고 이 값은 테스트로 고정되어 있다: `tests/e2e/routing-smoke.spec.ts:150` `expect(html).toMatch(new RegExp('<html[^>]*lang="' + locale + '"'))`, `:136-137`이 `{pathname:'/kr', locale:'kr'}`·`{pathname:'/zs', locale:'zs'}`를 명시한다. **URL 세그먼트(`/kr`)와 문서 `lang` 속성이 같은 값이어야 할 이유는 없다 — 이 둘을 분리하는 것이 리팩터에서 가장 값싸고 효과가 큰 수정 하나다.**

**(e) `⋅`(U+22C5 DOT OPERATOR)는 12 locale 전부에서 fallback을 탄다.** `gnb.theme`가 12 locale 모두 이 문자를 쓴다(`"Language ⋅ Theme"`, `"언어 ⋅ 테마"`, …). Pretendard `cmap`에 U+22C5 없음(측정). 반면 확장 카드 meta 구분자로 쓰는 `·`(U+00B7, `landing-grid-card.tsx:719`)는 커버된다. 그리고 이 문자열은 `tests/unit/gnb-message-labels.test.ts:18-29`가 12 locale 전부 하드코딩으로 고정한다. 데바나가리 danda `।`(U+0964)도 미커버인데 hi 문장 종결에 쓰인다.

---

## 7. 줄바꿈 규칙 — CJK 전용 선언이 전역으로 걸려 있고, 정작 일부 슬롯에는 걸리지 않는다

**저장소 전체에서 `word-break`/`overflow-wrap` 선언은 다음이 전부다.** `src/app/globals.css`에는 **0건**(토큰/베이스 SSOT에 줄바꿈 규칙이 없다).

| 위치 | 선언 | 적용 대상 |
|:--|:--|:--|
| `src/features/landing/grid/landing-grid-card.module.css:130-131` | `word-break: keep-all; overflow-wrap: anywhere;` | `.landing-grid-card-title-normal`, `.landing-grid-card-subtitle-normal` |
| `landing-grid-card.tsx:219` | `[overflow-wrap:anywhere]` | 카드 제목 base (keep-all 없음) |
| `landing-grid-card.tsx:221` | `[overflow-wrap:anywhere]` | 카드 부제 base (keep-all 없음) |
| `landing-grid-card.tsx:232` | `[word-break:keep-all] [overflow-wrap:anywhere]` | 확장 preview question |
| `landing-grid-card.tsx:237` | `[word-break:keep-all] [overflow-wrap:anywhere]` | 확장 선택지 텍스트 |
| `landing-grid-card.tsx:255` | `[overflow-wrap:anywhere]` | 확장 context label (keep-all 없음) |
| `test-question-client.tsx:57` · `surface-class-names.ts:89,102` | `[word-break:keep-all] [overflow-wrap:anywhere]` | 테스트 문항/선택지/데이터행 값 |
| `blog-destination-client.tsx:35,47` | `[word-break:keep-all] [overflow-wrap:anywhere]` | 블로그 제목/부제 |
| `src/app/[locale]/test/error/page.tsx:16` | `[word-break:keep-all] [overflow-wrap:anywhere]` | 에러 페이지 제목 |

**`line-break` 선언은 저장소 전체에 0건이고 `hyphens`도 0건이다.** 즉 CJK 금칙 처리(kinsoku)는 브라우저 기본(`line-break: auto`)에 맡겨져 있고, 독일어·힌디어의 하이픈 분철은 꺼져 있다.

**근거 문서(SSOT)는 이 규칙을 한국어를 위해 만들었다고 명시한다.** `docs/design/design.md:84`: "**Global wrapping rule:** wrapping text uses `word-break: keep-all; overflow-wrap: anywhere;`". 그리고 §4.11 Localization, `docs/design/design.md:117`: "Korean and English string lengths differ. Keep labels short, use `word-break: keep-all` for Korean line-breaking, and use `overflow-wrap: anywhere` as the Latin fallback." — **12 locale을 서비스하는 제품의 로컬라이제이션 정본이 2개 언어만 다룬다.**

**CJK와 그 외를 가르는 분기는 없다. 이것이 zs/zt/ja에 대한 구체적 결함이다.** `word-break: keep-all`은 CSS Text 3 정의상 **CJK 문자 사이의 암묵적 줄바꿈 기회를 억제**한다. 한국어는 어절 사이에 공백이 있어 이 선언이 "어절 중간에서 자르지 말라"로 정확히 동작하지만(`landing-grid-card.module.css:121-128`의 D-06 주석이 그 실측 근거를 남겼다), **중국어·일본어는 공백이 없으므로 문장 전체가 하나의 끊을 수 없는 단위가 된다.** 그 상태에서 `overflow-wrap: anywhere`가 유일한 탈출구로 남고, `anywhere`는 **금칙 처리를 무시하고 어디서든 끊는다** — 결과적으로 `。`나 `、`로 줄이 시작하거나 괄호가 줄 끝에 홀로 남는 조판 오류가 발생할 수 있다. 정상적인 CJK 조판은 `keep-all`을 **쓰지 않고** 브라우저의 기본 CJK 줄바꿈 + `line-break: strict|normal`에 맡기는 것이다. **결함 등급: 예측(CSS 사양 기반) — 실제 렌더에서 금칙 위반이 보이는지는 브라우저 확인 필요(§10).**

**같은 선언이 필요한 곳에는 빠져 있다.** D-06 수정은 `-normal` 접미 클래스에만 걸렸다(`module.css:129-132`). 확장 블로그 부제는 `landing-grid-card.tsx:382`에서 `line-clamp-4`만 받고 클래스는 `landing-grid-card-subtitle-expanded`이므로 **`keep-all`을 상속하지 않는다** — base 클래스(`:221`)에는 `overflow-wrap:anywhere`만 있다. 즉 **한국어 확장 블로그 부제는 D-06이 Normal에서 고친 바로 그 어절 중간 끊김을 여전히 일으킬 수 있다.** design.md:84가 "Global wrapping rule"이라고 적은 것과 구현이 어긋난 지점이고, 이건 locale 압력이 아니라 **내부 일관성 결함**이다(en에서는 보이지 않고 kr/ja에서만 보인다 — 그래서 en/kr 2개 locale 시각망 중 kr 확장 블로그 카드 스냅샷이 있어야만 잡힌다).

---

## 8. 파생 결론 — 모바일 압력이 실제로 나오는 자리 (px, 390px 기준)

**히어로 블록(`src/app/[locale]/page.tsx:28-30`, main content 358px).** 제목은 `text-[clamp(1.5rem,2.4vw,2.2rem)]`이므로 390px에서 2.4vw=9.36px → **하한 24px로 고정**. 본문은 상속 16px/1.5.

| locale | 제목 줄 | 본문 줄 | 히어로 높이(계산) |
|:--|--:|--:|--:|
| zs | 1 | 2 | **89px** (최소) |
| kr · zt | 1 | 3 | 113px |
| en · hi · id | 2 | 3 | 142px |
| ja · es · fr · pt · de · ru | 2 | 4 | **166px** (최대) |

스프레드 **77px**. 기존 실측 "첫 카드 top 315px"는 **locale에 따라 262~339px로 움직인다**(en 기준값에서 −53 / +24). 카드 위치를 상수로 쓰는 어떤 계산도 locale 의존이다.

**동의 배너 spacer(`consent-banner.tsx:18,241-248`).** 배너는 `fixed`이고 같은 높이의 spacer가 문서 흐름에 삽입된다(`:236`, `SSR_BANNER_SPACER_ESTIMATE_PX = 120`은 추정값이지 하한이 아니며 마운트 후 실측으로 대체된다 — `:13-17` 주석).

| locale | 메시지 줄 | 버튼 행 | 배너 높이(계산) | spacer(=배너+16) |
|:--|--:|--:|--:|--:|
| kr · zs · zt | 3 | 1 | 153px | **169px** (최소) |
| ja | 4 | 1 | 175px | 191px |
| en | 5 | 1 | 197px | 213px |
| id | 6 | 1 | 218px | 234px |
| es · pt · de · hi · ru | 5 | **2** | 251px | 267px |
| fr | 6 | **2** | 272px | **288px** (최대) |

스프레드 **119px**. **히어로 77px + 배너 119px ≈ 196px이고, 기존 실측 문서 높이 스프레드는 3,027~3,271px = 244px다.** 카드 본문이 10개 locale에서 동일한 영어라는 사실과 합치면, **지금 측정된 12-locale 문서 높이 차이는 거의 전부 히어로와 동의 배너 두 자리에서 나온다.** 카드가 번역되면 여기에 카드 높이 차이가 추가된다.

**GNB(`site-gnb.tsx:41` 모바일 `h-14` = 56px, `:39` `px-[var(--shell-gutter)]` = 16px → 내부 358px).** pill 버튼은 `:63` `min-h-[var(--tap-min)]`(44px) `px-3` `text-[0.88rem]`(14.08px). 계산 폭 최대: `gnb.back` de 69.6 / ru 65.9 / id 76.3, `gnb.menu` ja 78.8, `gnb.close` de 87.6 / ru 82.2 / hi 80.8. 3열(leading/center/trailing, 각 `flex-1 min-w-0`) 구조에서 358px는 충분하다 — **GNB 바 자체는 12 locale 전부 안전하다.**

**GNB 설정의 12-locale 칩 격자(`settings-controls.tsx:19,28,117`).** 모바일은 `min-h-[var(--tap-min)]`(44px) `px-[14px]` `text-[0.8rem]`(12.8px), 드로어 폭은 `site-gnb.tsx:86` `w-[min(87vw,340px)]` + `px-4` → 390px에서 내부 **307px**. 칩 12개(`English` 70.9 · `한국어` 63.2 · `简体中文` 81.2 · `繁體中文` 81.2 · `日本語` 68.4 · `Español` 75.1 · `Français` 78.3 · `Português` 88.8 · `Deutsch` 77.6 · `हिन्दी` 69.9 · `Indonesia` 85.3 · `Русский` 79.1; 합계 919px) → `flex-wrap gap-2`에서 **4행**, 블록 높이 **200px**(44×4 + 8×3). 드로어 안에서 언어 선택 하나가 200px를 차지하고, 그 위에 테마 행·링크 3개·헤더가 얹힌다. **`settings-controls.tsx:20-23` 주석이 "at 44 each the grid becomes a wall"이라고 적고 데스크톱 레이어에서는 32px를 선택했는데, 모바일 드로어에서는 44px를 택해 정확히 그 wall을 만들었다** — 의도된 트레이드오프지만 IA 재설계 대상이다(12개 칩 격자 vs. 목록/시트). 참고: 12개 칩 라벨 중 4개(`简体中文`·`繁體中文`·`日本語`·`हिन्दी`)는 §6의 이유로 fallback face로 그려진다.

**테스트 문항 화면.** `src/features/test/test-question-client.tsx`(425줄)와 `surface-class-names.ts`(114줄)에 뷰포트 분기 0개라는 기존 실측과 일치하게, **locale 분기도 0개**다. 하단 CTA 폭(계산, 15px + 34px 상자): `prev` 최대 id 117 / fr 103, `next` 최대 id 106 / es 97, `submit` 최대 ru 110 / hi 108 / de 102. 358px 폭에 `prev`+`next` 동시 배치는 12 locale 전부 여유가 있다(최대 id 117+106=223). **테스트 문항 화면의 i18n 폭 압력은 낮다.** 압력은 지시 오버레이(§3a)와 자격 칩(`testChipClassName` `min-h-8`=32px, 44px 미달 — 기존 실측)에 몰려 있다.

---

## 9. 죽은 키·죽은 코드 경로 (리팩터에서 정리 대상)

- **`history.clearAll`·`history.delete`**: `src` 전체에 리터럴 출현 0건.
- **`history.goHome`·`history.open`**: `src/app/[locale]/history/page.tsx`가 렌더하는 것은 `t('title')`(`:46`)과 `t('body')`(`:47`) 둘뿐이다. 즉 `history` 6개 키 중 **4개가 미렌더**.
- **`landing.metaReadTime`·`landing.metaViews`**: `landing-catalog-grid.tsx:115`에서 copy 객체에 담기지만 소비처가 없다. `landing-grid-card.tsx`의 `ExpandedCardBody`(`:808`)가 항상 `ExpandedTestBody`만 호출하므로 **블로그 카드는 meta row를 그리지 않는다.** → 2개 키 미렌더.
- **`getDefaultCardCopy()`(`landing-grid-card.tsx:1295-1307`)가 `en.json`과 다른 영어 문자열을 갖는다**: `metaEstimated: 'Est. time'` vs `en.json` `"min"`, `metaShares: 'Shares'` vs `"shared"`, `metaAttempts: 'Completed'` vs `"completed"`, `metaReadTime: 'Read time'` vs `"min read"`, `metaViews: 'Views'` vs `"views"`. **같은 라벨의 정본이 두 곳에 있고 이미 어긋나 있다.** 이 함수가 어디서 쓰이는지는 미확인(테스트 하네스로 추정).
- **`history` 페이지에 디버그 문자열이 남아 있다**: `page.tsx:48` `` {`Locale: ${locale}`} `` — 파일 상단 주석(`:8-11`)이 "페이지 본문에 남아 있는 디버그 문자열이며, 내용 결함으로 보고할 대상"이라고 스스로 적어 두었다. 12 locale 전부 번역되지 않는 영어 리터럴이다.

---

## 10. 미확인 — 확인하지 못했거나 브라우저 실측이 필요한 것

1. **fallback face가 실제로 어느 것으로 잡히는지.** §6(c)의 "zs/zt 한자가 Hiragino Sans(일본어 자형)로 갈 수 있다", "zt가 PingFang SC 간체 자형으로 갈 수 있다"는 CSS 사양과 스택 순서에서 유도한 **예측**이다. macOS/iOS Safari + Chromium에서 `document.fonts.check()` 또는 렌더 캡처로 확인해야 확정된다.
2. **`word-break: keep-all`이 zs/zt/ja에서 실제 금칙 위반(줄머리 `。`/`、`)을 만드는지.** CSS Text 3 정의에서 유도한 예측이며 브라우저 구현차가 있다.
3. **모든 px 값은 계산이다.** §0의 오차원 4가지가 적용된다. 특히 경계 근처 판정(id 동의 배너 318/330, ja 지시 오버레이 324/350, pt meta row 327/326)은 실측에서 뒤집힐 수 있다.
4. **fixture 카드 제목/부제의 locale별 확장률은 잴 수 없다** — 번역이 존재하지 않는다. §4-2②의 "de 19% / fr 23% 손실"은 **메시지 총 문자 수 비율에서 유도한 추정**이며, 카드 제목 특유의 확장률은 실제 번역이 들어와야 측정된다.
5. **`getDefaultCardCopy()`의 소비처**를 확인하지 않았다. 프로덕션 경로인지 테스트 전용인지에 따라 §9의 "정본 2곳" 결함 등급이 달라진다.
6. **확장 카드 높이 상한 계약(`req-landing.md` §6.7)을 읽지 않았다.** §4-2⑥의 선택지 세로 확장 위험이 그 계약으로 이미 통제되는지 미확인.
7. **모바일 baseline 44장 중 어느 것이 어느 locale인지 교차 확인하지 않았다** — `theme-matrix-smoke.spec.ts-snapshots`에서 mobile 40장을 셌고 manifest가 en/kr 2개 locale임을 확인했으나, 과제문에 있는 "모바일 44장"과 내 계수(40장)가 다르다. `state-smoke` 1장 + `safari-hover-ghosting` 4~5장이 그 차이일 수 있으나 확정하지 않았다.
8. **`zs`/`zt`/`kr` locale 코드를 바꿀 때의 파급 범위**를 세지 않았다. URL 세그먼트·쿠키·telemetry `locale` 필드(`req-landing.md:789`)·`generateStaticParams`·E2E 단정이 모두 얽혀 있다. `lang` 속성만 분리하는 최소 수정과 코드 자체를 BCP 47로 바꾸는 수정은 비용이 크게 다르다.
