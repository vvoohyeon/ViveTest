# ViveTest mobile prototype — definitive inventory for the from-scratch rebuild

Investigated 2026-09-26 ~02:30 KST, read-only. `MOCK/` below means `/private/tmp/claude-501/-Users-woohyeon-Local-ViveTest/7b610dca-70f4-41bf-b48e-fe44caf07c81/scratchpad/mockups/`. `DLG` means the extracted dialogue `/private/tmp/claude-501/-Users-woohyeon-Local-ViveTest/2d571f76-63eb-4c2a-b15f-e1060531c343/scratchpad/proto-session/dialog.md` (2,461 lines; cited as `DLG:<line>`). `RAW` means the raw transcript `…/proto-session/7b610dca-70f4-41bf-b48e-fe44caf07c81.jsonl`. `WF` means `…/proto-session/7b610dca-70f4-41bf-b48e-fe44caf07c81/workflows/`. Repo contracts were read from the primary checkout at `main` `20f973a` (read-only). Owner decisions are quoted verbatim in Korean; the full verbatim feedback forms are in Appendix A and the prototype authors' "how the real product should do it" notes are in Appendix B.

## 0. Status and freshness — read first

### 0.1 The prototype session is still live and the final revision is not finished

- Parallel session `7b610dca-70f4-41bf-b48e-fe44caf07c81` (title 「모바일 인터랙션 디자인 탐색」, model opus-5-5, ultracode on) is running a **fourth pass, the "final revision"**, requested by the owner after round 3: 「이번 요청에 따라 마지막으로 최종 개정을 한번만 더 해주세요.」 (DLG:2202).
- Its state snapshot (`proto-session/local-session-state.json`, captured 2026-09-25T17:26:02Z) shows `hasLiveWorkflows: true` and an active workflow `wkzzboaby`. RAW's last entries (17:24Z = 02:24 KST) are a "final regression runner" starting.
- What is done in the final revision: shared shell (centred instruction modal with consent step, horizontal story bar `rail:'x'`, movable 이전 `placePrev`), content data (consent `attribute`, consent copy, 3/4-answer 예시 tests), I (3–4 answers), D (top story bar, centred card, 56–58px edge zones), share + friend page (3–4 answers), landing consent-reset control, hub body draft (DLG:2347–2367; WF `final-stages-i-d-share-wf_8da55bd0-100.js`).
- What is still in flight: J (`j3-forks.html`, last written 2026-09-26 02:19:58 KST, 116,895 B, 1,441 lines) is in the J workflow's Fix/verification stage (`final-stage-j-wf_9e80bc4c-763.js`); after it the orchestrator plans a 3-lens cross-verification (regression·protocol / service consistency / a11y·contract), fixes, hub finalisation and a Version 4 publish. Orchestrator ETA: 「J 워크플로: 02:10–02:30 사이 … 전체 게시: 04:30–05:30 사이」 (DLG:2457–2459).
- The hub body `_hub-body.html` still has four unfilled J placeholders: `{{J_SYS}}` (line 66), `{{J_CARD}}` (line 91), `{{J_PREV_MAP}}` (line 280), `{{J_STYLE_MAP}}` (line 281). `index.html` (15:23) is still the **round-3** hub; the final hub is assembled from `_hub-style.html` + `_hub-body.html` (DLG:1861).

### 0.2 Round timeline

| Round | Built | Owner feedback | Published |
|:---|:---|:---|:---|
| 1 | 10 concepts: landing A B E F G H, flow C D I J (`BRIEF.md`) | 2026-09-24T15:51Z (DLG:382–692) | Artifact Version 1 |
| 2 | `l2-vibe-deck` (#flip/#expand), `i2-split` (#palette/#rail), `j2-forks`, `d2-story`, `v-vote`, `shared/flow.js`, `shared/share.*` (`BRIEF2.md`) | 2026-09-25T04:30Z (DLG:1169–1302) | Version 2, 2026-09-24T17:18Z |
| 3 | `l3-deck` (window host), `i3-split`, `j3-forks`, `d3-story`, `shared/shell.*`, `tools/host.html`, `tools/mock-stage.html`, `tools/protocol-test.mjs` (`BRIEF3.md`) | 2026-09-25T11:41Z (DLG:2103–2203) | Version 3, 2026-09-25T06:26Z |
| Final | same files revised in place; `j3-forks-r3.html` = round-3 J kept as archive; `jdir/` = J visual-direction panel | none yet | not yet (V4 planned) |

### 0.3 Published artifact (recorded only — no tool was called on it)

- URL `https://claude.ai/artifact/LPuzkZHX6FTcYwJJa8Vja3` (private; artifact id `9d10a841-2a3d-4d0e-b124-d334e776c594` per RAW read result 2026-09-24T15:55Z). Latest published = Version 3 (label 「Version 3 — 한 서비스로」), 29 files: `index.html`, the 10 round-1 pages, `l2-vibe-deck/i2-split/j2-forks/d2-story/v-vote.html`, `l3-deck/i3-split/j3-forks/d3-story.html`, `shared/{tokens.css,proto.css,proto.js,content.js,flow.js,share.css,share.js,shell.js,shell.css}` (RAW publish/list calls at 2026-09-24T17:18Z and 2026-09-25T06:25–06:26Z).
- **V3 is not the final design**: it still has the bottom-sheet instruction, D's vertical rail with a 22px off-centre card, the old dusk-landscape J with a screen-centred 이전, and no 3–4-answer support or consent step.
- Memory note `vivetest-mobile-interaction-mockups.md` is stale: it says 「3차 피드백 대기」 and that sources exist only in the artifact; round-3 feedback has been given and the live sources are in `MOCK/` under `/private/tmp` (volatile — lost on cleanup/reboot).

## 1. Information architecture and surfaces

### 1.1 Landing — "바이브 덱 · 펼친 창 (최종)" (`MOCK/l3-deck.html`, 1,245 lines)

Structure top to bottom (l3-deck.html:228–251):

- **GNB** (`.gnb`, fixed, z 20, height 56px + safe-area): wordmark `ViveTest` (19px/800) left; right pills `전체 보기` (scrolls to the list) and `메뉴` (toast only — not designed). Transparent over the field with a top tint gradient; turns solid paper (`is-solid`, blur 12, hairline) once scrolled past the stage (l3-deck.html:48–57, 1113–1117).
- **First screen = stage** (`.stage`, height `100svh − 56px peek`, min 540px): a living colour field (WebGL mesh gradient, CSS fallback, static grain) behind an h1 `내 작업 리듬 찾기` (22px/800) and a **horizontal card deck**. Below the deck: `‹` / `›` 44px round buttons and a non-interactive 5-segment position readout (`.where`) (l3-deck.html:124–133, 239–244).
- **Deck contents and order**: catalog tests in catalog order, then an end card — qmbti, energy-check, creativity-profile (coming soon, inert: `출시 예정` stamp + 「아직 열리지 않은 테스트예요」 dashed line; tap toasts 「출시 예정이에요」), egtt, and **「모든 테스트와 읽을거리」** end card (fanned tile stack, meta 「테스트 4 · 읽을거리 3」, CTA 「목록 보기 ↓」 scrolls to the list). Blogs are **not** deck cards (l3-deck.html:350–393).
- **Card anatomy** (deep poster, white type, identical in both themes): category chip with hi-colour dot + `예시` chip (categories are a mockup choice), kinetic title (per-character rise), subtitle (3-line clamp, 15px/500), meta `3분 · 15,236명 완료` with count-up, stroke-drawn motif (qmbti two pills, energy-check rising bars, egtt offset bars, coming-soon dashed boxes), and a **quiet text CTA 「첫 질문 보기 →」** (no fill, 48px, the whole card is also the tap target) (l3-deck.html:80–107, 373–387).
- **List section** below the first screen (`.all`, rounded 26px top overlapping the stage by 24px): the peek heading button 「모든 테스트와 읽을거리」 + count chip `7개` + bobbing chevron (bob stops once scrolled); rows for all 7 catalog items — tests (tile + title + meta + 「카드로 ↑」 which scrolls up and centres that card), coming soon (inert row + `출시 예정` chip), blogs (tile + title + 「읽을거리 · N분 읽기 · tags」 + 「읽기」 → toast 「목업 범위 밖이에요」); footer link `개인정보 설정` (toast) (l3-deck.html:134–156, 1088–1112).
- **Opening a card** expands it in place into **the window** (see 1.2). There is no bottom sheet and no drag-to-close.
- Not designed on the landing: locale switcher, theme toggle (theme follows OS only), menu contents, the consent banner (none is rendered), blog reading, history.

### 1.2 The window — expanded card = window onto the test's stage

- The expanded card becomes a window 12px from each side and max(6% of height, safe-area + 10px) from top and bottom (l3-deck.html:723–729). Three layers share one clip: the landing's own surface (card colour, loading sheen, fallback Q1), the stage iframe, and the card header band (l3-deck.html:162–180, 252–266).
- **Header band** (`.wband`, ≈98px, opaque, painted with the same card cover): category chip + `예시`, `닫기` (shell `.vt-prev` style), title 25px/800. The card title flies into the header on open and back on close ("one title, two sizes") (l3-deck.html:859–887).
- The **stage draws Q1 in its own language inside the window** (I = two colour fields, J = first fork, D = first story card), so Q1 and Q2+ look and behave the same — the owner's round-2 consistency complaint (DLG:1205–1208) solved by architecture.
- Answering Q1 grows the window to full screen **while the stage's own forward motion keeps playing** (I flood, J travel, D slide); the header fades; then the stage shows the shell chrome and the instruction modal over Q2 (l3-deck.html:980–1004).
- The stage's `ViveTest` wordmark **shrinks the stage back into the same card with its content visible**, the landing coming alive around it (neighbours close in, dim lifts), then the card front crossfades in (l3-deck.html:1005–1039). Owner round 3: 「네 잘 고쳐졌습니다.」 (DLG:2136).
- Closing before answering (outside tap on the dim catcher, `닫기`, Escape, stage Escape via `vive:escape`) folds the window back into the card (l3-deck.html:945–979, 1120–1126).
- Preload: once the deck settles for 350ms the current card's stage loads hidden in window mode; a stage that has not said `ready` within 3s (600ms if it loaded but stayed silent) is replaced by a **fallback Q1** drawn by the landing with shell tokens (white answer pills with A/B badges, a base-colour fill spreading from the touch point on choose, 「답을 고르면 바로 시작해요」); answering the fallback uses the round-2 page navigation with a hand-off (l3-deck.html:771–817, 889–944).
- The window adds **no history entry** (frame navigation uses `location.replace`), so system back does not close it — a known limit (DLG:1699, 2072).

### 1.3 Stages (test flow) — one shell, three stages

All three are used in the service: 「각각의 안이 모두 마음에 들어서 3개안 (반반화면, 갈림길, 스토리) 모두 이 서비스 안에서 사용하겠습니다.」 (DLG:2198). Each stage page runs in three modes: window (inside the landing), full (after the window grows), standalone (opened from the hub; takes a hand-off or defaults to qmbti with Q1 = A, starts at Q2 with the instruction modal) (shell.js:1–10; BRIEF3.md:27–31).

**I · 반반 화면 (split fields)** — `MOCK/i3-split.html`, 1,348 lines, final revision 21:48 KST.
- Each question splits the screen into answer colour fields: two answers = top A / bottom B; three or four = stacked full-bleed bands A…D top to bottom. Big centred answer text (800, clamp(24px, 6.7vw, 28px); one size down per extra band) with an A–D badge; the **question is a dark-glass label (`.vt-qlabel`) on the seam** (two answers) or at the head of the stack (3–4), never a white box (i3-split.html:46–70).
- Answer by **tap** (the tapped text holds still; the colour pushes in 44px over 150ms then floods) or by **dragging the seam** (the growing field's text follows the vertical centre of its visible area 1:1; the shrinking side's text shrinks and fades; past the tipping point — 22% of the frame, capped at 60% of the room — a haptic tick and one ripple along the border; release floods in the push direction: down = A, up = B) (i3-split.html:327–347, 637–715, 855–941). Owner round 3: 「자연스럽습니다.」 (DLG:2151).
- The flood's colour flies as a stripe into the palette rail; the next pair pours in from both edges; the liquid border wobbles, splash drops at the far edge (i3-split.html:463–548, 811–853).
- 3–4 answers: one live seam at a time; bands beyond a moving seam are squeezed accordion-like; a middle band blooms both ways; colours are computed from the test signature (see 3.5); question label sits above the stack; votes line wraps under it (WF `wf_8da55bd0-100.json` I report).
- Last question: the chosen colour stops at 80% (3–4: the chosen band opens to half the room) and `제출` enables; after submit the colour stripes grow out of the rail into 「당신의 팔레트」 with `팔레트 공유`, then the end card (i3-split.html:975–1083, 123–124).
- In the window, Q1 = card colour (A) + its partner (B) rising from the bottom (i3-split.html:1225–1261).

**J · 갈림길 (forks)** — `MOCK/j3-forks.html` (LIVE, still being edited; its line numbers below are as of 2026-09-26 02:19:58 KST).
- A 2.5D canvas world; each question is a fork: left road/sign = A, right = B (「아주 직관적이었습니다」, DLG:643). Choose by tapping a sign or swiping left/right on the ground (lean preview → commit); the camera travels the chosen branch; the next fork's branches draw out of the junction (j3-forks.html:1180–1228; changed list, App. B).
- Final visual direction **"카드의 재료로 만든 세계"**: sky = the landing card's own cover mesh + film grain in the test's palette (`Shell.look(testId)`), flat tonal land layers of the same family, no sun or trees, road = lightest band, route = one thin line (white core, deep edge, narrow halo); signs = white answer cards with ink text and base-colour A/B badge; the chosen sign = base-colour face, white text/badge, 2px white inset ring; receding signs use an opaque mid-tone in-family face (j3-forks.html:15–22, 197–249). Chosen by a 3-lens judge panel: A scored 8.5 / 7 / 8 (consistency / identity / craft) vs B 5.5 / 8.5 / 5.5 and C 7 / 6 / 6.5, with grafts from B and C (WF `wf_333ec27a-e26.json`).
- **이전 rides the road centre** every frame (shell `placePrev`), with an extended hit zone covering the spot it just left; the first-fork hint sits right above it (j3-forks.html:807–853; owner request DLG:2171–2172).
- **Arrival guard** (see 2.7). Last fork: the camera enters the chosen alley and a light-arch **gate** rises 15m past the chosen sign carrying a real `제출` button that rides the projected doorway; the opposite sign stays tappable until submit and moves the gate (j3-forks.html:183, 653–680; owner DLG:663–666, 1229–1230). Submit → walk into the gate, light blooms, camera pulls back to reveal 「당신이 지나온 길」 on a contour map, end card with `경로 공유` + `처음부터` (j3-forks.html:153–157).
- Q2 shows the landing answer as a dark-glass label on the line behind you (j3-forks.html:80).
- J holds two-answer questions only: a 3–4-answer test that resolves to J opens in I (shell.js:27–28, 94–97).
- Owner round 3 on the older J style: 「테스트 색을 띤 저녁 하늘은? → 크게 체감되지는 않습니다.」 and 「Visual Style 이 여전히 이질감이 조금 있습니다」 (DLG:2167–2175). The round-3 look is archived as `j3-forks-r3.html`.

**D · 스토리 (calm story cards; reduced-motion fallback)** — `MOCK/d3-story.html`, 820 lines, 21:17 KST.
- Each question is a card with side margins, radius 28px, like the landing deck: the previous card peeks left, the next reachable card peeks right (40px at 390 wide), **a dashed locked card 「답하면 열려요」 peeks past the frontier**; pulling toward it rubber-bands and shows the hint 「답하면 다음 문항이 열려요」 (d3-story.html:26–31, 85–104). Owner round 3: both understood (DLG:2181–2185).
- Answers are white pills (650 16px/1.38, min 60px, badge A–D); chosen = card-colour fill, white text, white badge, 2px white inset ring; 150ms selected state then exactly one card forward with a ≤220ms slide (d3-story.html:73–79, 557–584).
- Move between questions by dragging the card sideways (1:1), tapping the visible edge zones (58px at 390, 56px at 360), `이전`, or ←/→ (d3-story.html:356–366, 476–538).
- Ground = the current card's hue, deep and **still** (no autoplay); under reduced motion moves are crossfades (d3-story.html:47–53, 369–380).
- Progress = the **horizontal story bar on the top edge** (`rail:'x'`) — owner: 「Vertical Bar 는 이 안에서는 안어울립니다. 기존처럼 상단 edge 부분에 horizontal bar 가 더 적합합니다.」 (DLG:2188–2189).
- Last question: selected + `제출`; closing card 「끝까지 왔어요」 + 「<title> · 모든 문항에 답했어요」 + colour swatches, then the end card (d3-story.html:268, 600–627, 138–139).
- Holds 3–4 answers (stacked pills) because under reduced motion every test opens in D (d3-story.html changed list, App. B).
- Verdict: 「가장 정적인 안으로 위 피드백만 적용한 상태로 최종 채택합니다.」 (DLG:2192).

### 1.4 Instruction step — centred modal with the consent notice (changed in the final revision)

- Owner round 3: 「단, 시작 전 안내 하단 바텀 시트는 화면 위를 덮는 모달 팝업/시트 형태로 변경되는게 더 바람직해보입니다. (모든 안 공통) 왜냐하면 이 메시지와 [시작] 버튼은 Q2 진입 전 필수로 해야하는 아주 중요한 고지의 메시지도 담고 있는데 (요구사항 참고, consent 미선택 Q1 진입 시 고지 함께 하고 있음) 이를 고려하면 optional 해보이는 바텀시트보다 화면을 좀 더 많이 덮는 UI 가 더 바람직합니다.」 (DLG:2132–2133).
- Built as `Shell.sheet(...)` → a centred `role="dialog"` `aria-modal` card (max 420px, radius 28px, VIVE paper that follows light/dark) over a blurred scrim (`rgba(8,6,5,.58)` blur 6) (shell.js:245–345; shell.css:133–175).
- Head wears the test's signature colour: eyebrow `<title> · N분`, h2 `시작 전 안내`. Body: the variant's `instruction` text; a context row **「랜딩에서 고른 답」 with the A/B badge in that answer's colour** + the answer text; the consent note when consent is undecided; CTAs.
- CTA matrix (landing-ingress rows of `req-landing` §13.5): consent `unknown` + `available` → note `unknownAvailableNote` + [모두 허용하고 시작] / [거부하고 중단]; `unknown` + `opt_out` → note `unknownOptOutNote` + [모두 허용하고 시작] / [거부하고 시작]; otherwise [시작] only. A qualifier test (egtt) shows [다음] on the instruction step and asks 「나의 성별은」 (남성/여성) on a second step with [시작] disabled until picked and a [뒤로] (shell.js:245–320).
- Accept stores consent `in` for the session; **deny is not stored in the mockup**; [거부하고 중단] closes the dialog and leaves like the wordmark (window → shrinks into the card; standalone → back to the landing) (shell.js:309–318; `_hub-body.html:16`).
- Focus lands on the dialog container; Tab/Shift+Tab cycle inside on every press (WebKit-safe); Escape is a no-op on the instruction step and goes back on the qualifier step (`req-test` §3.6) (shell.js:322–330).

### 1.5 Share sheet (「친구에게 묻기」) and the friend's vote page

- Trigger: the paper-plane icon in the shell top bar (right), `aria-label="친구에게 묻기"`; a one-time coach label 「친구에게 묻기」 appears under it for 2.6s per session (share.js:469–481).
- The sheet (`Share.open`) is still a **bottom sheet** (share.css:14–22) — the owner's "modal not sheet" change applied to the instruction step only. The question block morphs into the sheet's thumbnail (ghost, 420ms) and back on close (share.js:319–330, 389–400).
- Content, link first: 「링크로 보내기 · 먼저 권해요」 (thumbnail, title 「<question> — 나 대신 골라 줘」, answers, `vivetest.app/v/… 예시`, [링크 복사], [친구 화면 보기]); then 「스토리 · 릴스에 올리기」 with a 9:16 story card (1080×1920 canvas → JPEG blob `<img>`) and 「이미지를 길게 눌러 저장」 guidance; footer primary 「이어서 답하기」 + 「보내고 나면 지금 이 질문으로 그대로 돌아와요」 (share.js:254–366).
- Story card (ask kind): test-colour background with three soft glows, brand mark + `ViveTest`, emoji, rotated sticker 「나 대신 골라 줘」, 「친구들이 보는 나는 어느 쪽일까」 (「…뭘 고를까」 for 3–4), the question in 800 weight up to 108px, answer pills with badges, footer 「<title> · 링크에서 투표해 줘」 + 「vivetest.app · 예시 링크」; path/palette kinds use stickers 「내가 지나온 길」 / 「나의 팔레트」 and the stage's art (share.js:120–236).
- While open the stage must not advance; on close the stage is exactly where it was, focus back on the question, toast 「같은 질문으로 돌아왔어요 · 친구 투표는 여기에 모여요」 (share.js:416–439; BRIEF2.md:34).
- **Friend vote line** under the question: `.vt-votes` pill with `예시` chip + 「친구 N명이 골라 줬어요 · A a · B b」 (owner: 「있어야 한다」, DLG:1271).
- **Friend page** `MOCK/v-vote.html` (233 lines): ask kind — eyebrow 「친구가 고르기 어려워하는 질문이에요」, h1 「친구라면 어느 쪽일까요?」 (「친구라면 뭘 고를까요?」 for 3–4), the question, A–D vote buttons; after voting: result bars + percentages (largest remainder = 100%), 「내 선택」 tag, tally 「친구 N명이 골랐어요 · …」, 「투표가 친구에게 전해졌어요 …」; CTA 「나도 이 테스트 해 보기」 (goes to the landing's card for that test). Art kind — 「친구가 테스트를 마치고 남긴 그림이에요」 with 「친구가 지나온 길」 / 「친구의 팔레트」. Background = the sharer's colour with ink/white text chosen for 4.5:1 (v-vote.html:10–20, 80–106, 175–213).

### 1.6 Result page, blog, history

- **Result page: out of scope in every round.** Round-1 instruction: 「Test Result 페이지는 아직 고려하지 않아도 됩니다.」 (DLG:18). Every stage ends on a closing moment then 「결과 화면은 이번 목업 범위 밖이에요」 + `처음부터` (i3-split.html:124; j3-forks.html:156; d3-story.html:138). The owner explicitly deferred the post-submit transition: 「마지막 제출 이후 트랜지션은 지금의 형태는 마음에 안드는데, 구체적인 피드백은 테스트 플로우 최종 확정 후, 결과 페이지까지 이어지는 부분의 피드백을 추가로 나중에 제공하겠습니다.」 (DLG:631).
- Stage-specific end art exists and is shareable: I 「당신의 팔레트」, J 「당신이 지나온 길」, D closing card with swatches.
- **Blog**: list rows only (toast); no blog index or article surface designed. Blogs are not in the deck.
- **History** (`/{locale}/history` exists in the repo): not present anywhere in the prototype. The only history idea is round-1 H's 「완료 · 예시」 halo (BRIEF.md:245).

### 1.7 Prototype-only chrome (not product)

`Proto.info` ⓘ edge tab + concept sheet (lede, 「지난 피드백에서 바뀐 것」, 해볼 것, 흉내 낸 것, 실제로 만들 때, 「모션 줄이기 미리보기」 switch, `← 목록`, `처음부터`) (proto.js:111–162); haptic ring stand-in; toast; `예시` chips on non-repo data; the landing info sheet's 「무대 배정」 radios and 「미선택으로 되돌리기」 consent reset (l3-deck.html:1191–1214); the phone column framing (`--app-w: min(100vw, 430px)`, desk colour `#0f0d0b`) (tokens.css:59–62, 132).

## 2. Interaction contracts

### 2.1 Window protocol (postMessage, `type` always starts with `vive:`) — shell.js:12–20

| Message | Direction | Payload | Meaning / required behaviour |
|:---|:---|:---|:---|
| `vive:ready` | stage → host | `{test, stage}` | Q1 is drawn; the host may reveal the window. A ready while the host is full means the stage restarted itself (처음부터): the host folds the full screen back into the window at Q1 (l3-deck.html:809–816). |
| `vive:window` | host → stage | `{insets:{t,r,b,l}}` | Visible window rect inside the stage viewport (px); the stage re-lays Q1 out. Host sends `t = window top + header band height`, `r = l = 12`, `b = window bottom inset` (l3-deck.html:755–763). Default before any message: `t = 6%H + 96, r = 12, b = 6%H, l = 12` (shell.js:113). |
| `vive:open` | host → stage | — | The window is on screen: focus Q1 (answers are only accepted after this; J also guards 350ms). |
| `vive:collapse` | host → stage | — | The window closed without an answer: return Q1 to unanswered at rest. |
| `vive:q1` | stage → host | `{choice:'A'…'D', color}` | Q1 answered: the host grows the window to full screen (520ms) while the stage keeps moving. |
| `vive:full` | host → stage | — | The window covers the screen: stage shows the chrome, puts Q1's colour on the rail, opens the instruction modal over Q2. Handled **once** (a repeat must not reopen the sheet) (shell.js:124). |
| `vive:back` | stage → host | `{test, color}` | The wordmark (or [거부하고 중단]): shrink back into the card (or close the window if still `open`). |
| `vive:escape` | stage → host | — | Escape inside a stage in window mode: the host collapses the window. |

- Hosted detection: `location.hash` matches `#window-<testId>` and `window.parent !== window` (shell.js:109–111). Modes: `window` → `full` (on `vive:full`) or `standalone` (shell.js:112).
- Host state machine: `rest · opening · open · growing · full · returning · leaving` (fallback page change) (l3-deck.html:513–516). Timings: open 580ms clip-path `cubic-bezier(.22,1,.36,1)` with the surface clearing in 130ms and the stage fading in (260ms from 170ms); close 440ms `cubic-bezier(.5,0,.2,1)`; grow 520ms `--vt-ease-out`; shrink 560ms clip + whole-window scale to 0.92 toward the card centre, fade 230ms from 360ms (l3-deck.html:716–720, 820–1039). Reduced motion: 160–180ms fades only.
- Product mapping stated by the author: 「창 구조 = 앱 셸 하나에 테스트 라우트를 층으로 그리기예요. 랜딩(/{locale})은 마운트된 채 두고 /{locale}/test/{variant} 를 그 위 층에 렌더해요(Next 의 parallel + intercepting route, 예: @window/(.)test/[variant]). 무대 I·J·D 는 iframe 이 아니라 그 라우트의 컴포넌트이고, 목업의 메시지(vive:window·q1·full·back)는 props·콜백이 돼요」 (l3-deck.html realBuild; App. B).

### 2.2 Landing Q1 → test hand-off record

- **Window path (final design)**: no page change. The stage keeps Q1's answer itself and sends `vive:q1 {choice, color}`; the host only resizes. The modal's context row shows the landing answer with its badge. Real product (author note): keep the landing-ingress save of `req-landing` §13.4, push `/test/{variant}` to history while the window grows, treat "fully grown" as destination-ready within §13.3's 1600ms, and no return-scroll record is needed because the landing stays mounted (l3-deck.html realBuild; App. B).
- **Standalone / fallback path (round-2 glue, `shared/flow.js`)**: `Flow.putHandoff({test, q1, color, from})` writes sessionStorage `vive-handoff` = `{v:1, test, q1, color, from, at}`; `Flow.takeHandoff()` consumes it once, rejects records older than 10 minutes, validates `test` against `VIVE.tests` + `demoTests` and `q1 ∈ {A,B,C,D}`, and records `from` as `vive-landing-page` (flow.js:26–53). The receiving stage paints `color` on the first frame and dissolves it (~450ms) into its opening state (BRIEF2.md:30).
- **Return record**: `Flow.backToLanding(test, color)` writes `vive-landing-return` `{test, color, at}` and navigates to `landingHref()` (session `vive-landing-page`, default `l2-vibe-deck.html#flip`); the landing reads it **before first paint** to cover the screen in that colour and contracts it into the same card (l3-deck.html:10–22, 1063–1086). `Shell.back` in standalone first sets `vive-landing-page = l3-deck.html` (shell.js:354).

### 2.3 Stage assignment — `Shell.stageFor(testId)` (shell.js:94–97)

- Order: **override** (sessionStorage `vive-stage-override` ∈ I/J/D) > **reduced motion → D** (`Proto.reduced()` = OS `prefers-reduced-motion` OR the preview switch) > **default map** `qmbti → I`, `energy-check → J`, `egtt → I`, `demo-three → I`, `demo-four → I` (unknown → I).
- J only takes two-answer tests: if the resolved stage is J and `choicesOf(test) > 2`, use I.
- `stageFile(stage)` → `i3-split.html` / `j3-forks.html` / `d3-story.html`; test hook: sessionStorage `vive-stage-file-test` points every stage at one file (e.g. `tools/mock-stage.html`) (shell.js:100–101).
- Owner: 「동의합니다. 단, 어떤 테스트에 어떤 무대를 적용할지는 최종 배포 시점에 다시 한번 고민하고 결정하고 이번에는 목업 최종 완성을 위한 최종 피드백으로 고려해주세요.」 (DLG:2121) and 「완성된 후에는 각 테스트 별로 어떤 타입을 적용할지를 사전에 정의하겠습니다.」 (DLG:2200). → The map is **a placeholder, not a decision**.

### 2.4 Reduced motion → D

- Under reduced motion every test opens in D; the landing reloads its preloaded stage when the setting changes (l3-deck.html:1131–1140). D itself then uses crossfades (160ms) instead of slides (d3-story.html:369–380).
- Author note: 「모션 줄이기면 D 를 고르는 판단은 OS 의 prefers-reduced-motion 과 사이트 설정을 함께 봐야 해요. 테스트 도중 설정이 바뀌면 무대를 바꾸지 말고 D 안에서 슬라이드와 교차 페이드만 바꾸는 편이 안전해요」 (d3-story.html realBuild).
- Landing under reduced motion: no kinetic entrance, no parallax, no nudge, no spring; window open/close/grow/shrink become fades; shader renders but does not animate (l3-deck.html:206–215, 545–549).

### 2.5 Answering, auto-advance and the last question

- Answers auto-advance; there is no `다음` button; a 150ms input lock after a choice doubles as the selected-state feedback (BRIEF.md:13; BRIEF2.md:26; d3-story.html:163).
- **Last question**: no auto-advance; the choice stays selected and `제출` enables (I: beside 이전, disabled until chosen; D: beside 이전; J: the gate button). An already-answered last question shows **selected**, not the quiet mark (`req-test` §4.4) (j3-forks.html realBuild; DLG:940).
- Progress counts the landing answer: entering from the landing starts at 13% (qmbti 1/8), 25% (energy-check 1/4), 33% (egtt 1/3) (BRIEF2.md:31).

### 2.6 One-step-forward revisit rule (owner-confirmed; departs from `req-test` §4.3)

- On a revisited question both options look unselected and the old choice carries the quiet check (`Shell.prevMark`, screen-reader text 「이전에 선택한 답변」). **After re-answering a revisited question, advance exactly one question** — to the next question, which shows its own mark if answered — never jump to the first unanswered one (BRIEF2.md:24).
- Owner rounds: round 1 J defect 「이전 문항으로 돌아가 선택지 탭하면 돌아가서 응답한 문항부터 마지막 응답한 문항까지 그냥 진행해서 중간 문항 답변을 변경할 수 없는 결함이 있습니다.」 (DLG:670); round 2 decision 「되돌아간 문항부터 한 단계식 이동」 (DLG:1286) and 「이전 문항으로 돌아가면 한 문항씩 순차 이동해야합니다.」 (DLG:1235); round 3 「되돌아가 고친 뒤 한 갈림길씩 멈추도록 잘 고쳐졌습니다.」 (DLG:2165).
- Implemented identically in all three stages (i3-split.html:926; d3-story.html:582; J history DLG:1528–1558).

### 2.7 Arrival guard (J; new contract)

- A fork ignores taps, swipes and keys until **350ms after its signs finish appearing** (signs take 420ms + 80ms stagger when arriving by travel, 180ms fade otherwise); a press or swipe that started before `armAt` is void; held keys count once (`e.repeat` ignored); the window's Q1 is guarded until 350ms after `vive:open`; the gate's `제출` arms 280 + 350ms after it appears (j3-forks.html:185–186, 913, 981–984, 1025, 1181–1219, 1292). The guard is silent (no visual feedback) (DLG:1583).
- Root cause it fixed: j2 failed 11/19 input patterns (second tap 0/150/450ms after arrival, tap during travel plus at arrival, held arrow/Enter, swipe spanning arrival); j3 passes 19/19 × Chromium/WebKit × mouse/touch and an edge suite 14/14 (DLG:1528–1545).
- Author: 「도착 가드(표지판이 다 선 뒤 350ms)는 150ms 연타 잠금과 별개의 새 계약이에요 — 자동 진행 화면 모두에 같은 값을 쓸지 정해야 해요」 (j3-forks.html realBuild).

### 2.8 Swipe and drag rules

- **Landing deck**: horizontal drag browses tests only and **never answers** (owner: 「랜딩에서 테스트 단위로 좌우 스와이프하면서 브라우징하고, 문항 선택은 탭으로 하는 것이 더 자연스럽습니다.」 DLG:420). 1:1 follow with rotation pivoting at the grab point (±6°, 0.028°/px); release commits one card past 0.22 of a card or a 0.4px/ms flick; rubber band past the ends; vertical movement scrolls the page (`touch-action: pan-y`); a tap on a peeking neighbour centres it; a tap on the centred card opens it (l3-deck.html:618–711). First visit only: after 1.45s the deck leans 28px and springs back (l3-deck.html:526–530, 1183).
- **I**: vertical seam drag is an accepted answer gesture (direct manipulation of the answer's own area, with tap alternative) — owner 「탭과 드래그 모두 편했습니다.」 (DLG:619). `touch-action: none` on the arena.
- **J**: horizontal swipe on the ground chooses a road (lean preview → commit), with sign taps and ←/→ as alternatives; accepted as intuitive (DLG:643).
- **D**: horizontal drag moves between questions and **never answers** — a press on an answer that moves >10px horizontally becomes a swipe and that answer is not selected; movement is limited to answered questions + the first unanswered one (the frontier); flick >0.35px/ms or >25% of a card commits (d3-story.html:476–538).
- The rejected pattern is **card-swipe-as-answer** (A: 「넘기는 것이 「답하기」라는 걸 언제 알았나요? > 끝까지 몰랐다」, 「끝까지 헷갈렸다」, DLG:392–398). Every gesture keeps a tap/button alternative (WCAG 2.5.1/2.5.7).
- **No drag-to-close anywhere**: 「드래그는 UX 상 사용자 주의와 노력을 많이 필요로하는 인터랙션이므로 가급적 피하고, 여기서는 바깥 영역 탭으로 닫히는 인터랙션만으로 충분합니다.」 (DLG:482).
- Known device risk: D's left edge (tap zone and rightward drag) and J's swipes may collide with iOS Safari's edge-back gesture — needs real-device checks (DLG:810, 2071; d3-story.html realBuild).

### 2.9 Progress = the palette rail (shell.css:64–91; shell.js:155–197)

- **Vertical rail (`'y'`, I and J)**: 12px wide, 16px from the right edge, from top-bar bottom + 12px to bottom-bar + 8px; each answered question adds a segment bottom → top in that answer's colour (I = the chosen field colour; J = the trail colour at that step); the current segment is ringed (white + dark); a white `NN%` pill rides the fill's top edge (520ms); stage content keeps out of the `--vt-lane: 44px` right lane.
- **Story bar (`'x'`, D)**: 4px bar along the top edge (left 16px, right 56px), segments fill left → right in card colours, `NN%` at its right end; the top bar sits 8px lower (`--vt-top-h: 64px`) and `--vt-lane` becomes 0.
- Accessibility: `role="progressbar"`, `aria-valuenow` and `aria-valuetext="진행률 NN%"`. No 「N of M」 text anywhere. Author: 「진행률은 막대+퍼센트 계약 그대로예요 — 팔레트 레일이 막대이고 퍼센트가 그 끝을 따라가요」 (i3-split.html realBuild).
- Owner: 「팔레트형이 압도적으로 훨씬 더 낫습니다. 왜냐하면 정보 요소가 bar, % 진행 으로 단순하기 때문입니다.」 (DLG:1214–1215); D exception DLG:2188–2190.
- Known limit: the % updates when the flying swatch lands (≈0.35–1.4s after the announcement) (DLG:881; WF I report).

### 2.10 이전 and 제출 placement (shell.css:93–110; shell.js:211–240)

- `.vt-bottom` centred at `bottom: safe-area + 14px`: `이전` is a quiet translucent pill (min 44×96px, 600 14px, tone-dependent glass); `제출` (white pill, 800 16px, min 48px, shadow) appears beside it on the last question (`setSubmit('hidden'|'disabled'|'ready')`).
- J: `placePrev(x)` moves 이전 to the road centre each frame, clamped on screen and out of the rail lane; J uses its gate instead of `제출`. Owner round 1: 「골목길 가운데 정중앙 하단으로 옮기고 대신 눈에 좀 덜 띄는 단순 텍스트 혹은 배경을 회색으로 하는 등 살짝 덜 강조되는 형태」 (DLG:674); round 3: 「[이전] 버튼의 가장 이상적인 위치는 길 정가운데인데 … 길 중앙으로 이동에 배치되도록 수정하고, 이 때 3D 경로 진행하면서 길이 바뀌는 위치 변화에 맞춰 [이전] 버튼 위치도 동적으로 이동하면 더할나위 없이 좋겠습니다.」 (DLG:2171–2172).
- Stages show or hide 이전 through `setPrev(visible)` and the share icon through `setShare(visible)` (shell.js:237–239).

### 2.11 Shared tokens every stage places (BRIEF3.md:15–21; shell.css:112–131)

- **Top bar**: `ViveTest` glass chip (left, 44px hit, 「, 처음 화면으로」 for screen readers) · test title centred (700 14px, ellipsis) · ask-a-friend glass icon (44×44) (shell.js:200–206). Owner: 「제목은 제일 위 "ViveTest" 우측 빈 영역에 center align 으로 표시해주세요.」 (DLG:1223). Tone per colour underneath via `setTone({top,bottom})` with `toneFor(hex)`.
- **A–D badge** `.vt-badge`: 26px circle, 800 13px; colours per context (answer text colour in I, base colour on white signs/pills, white on selected).
- **Previous-choice mark** `.vt-prev-mark`: 18px check at 0.7 opacity + sr-only 「이전에 선택한 답변」.
- **Question type**: `.vt-q` 800 clamp(22px, 6.2vw, 26px)/1.3, emoji block 32px above; `.vt-qlabel` = the glass label for questions floating over colours (700 17px/1.38, rgba(14,12,11,.56), blur 14).
- **Votes line** `.vt-votes` (see 1.5).
- **Rule: white or filled surfaces mean "tap to answer" — never put a question in a white box.** Origin: 「Q1 에서 펼쳐진 카드에서 응답 선택은 흰색 round box 에 선택지가 있습니다. 반면 Q2 이후 반반화면에서는 드래그를 하는 `질문` 이 흰색 round box 에 표시되어 양쪽이 정 반대의 요소에 적용됩니다.」 (DLG:1206–1207).
- **Motion grammar**: forward = the stage's own move from the chosen answer (I flood, J travel, D slide); back = its reverse; from the landing the window grows while the stage keeps moving; to the landing the stage shrinks into its card with content visible (BRIEF3.md:20).
- **Colour continuity**: each test's signature colour runs landing card → stage's first colour → `시작` button → share card (BRIEF3.md:21).

### 2.12 3–4-answer support (optional future, built as 예시 only)

- Owner: 「나중에 3지선다, 4지선다 응답형 테스트도 있을 수 있습니다. 필수는 아니지만, 이 때 활용 가능하도록 유연한 구조가 되거나 혹은 더 이상적으로는 3지/4지선다 유형에 적용 시 화면도 목업으로 제작되어 볼 수 있으면 좋겠습니다.」 (DLG:2157–2158).
- Answer count per question = `V.keysOf(question)` (2–4). I: stacked bands; D: stacked pills; J: not supported (falls back to I); share card uses tighter layout tiers; friend page lists A–D; votes simulation returns a count per key; keyboard 1–4 / A–D.
- Contract gap (author): 「3·4지선다 문항형은 문항 스키마와 채점 계약에 아직 없어요」 (i3-split.html realBuild).

### 2.13 Keyboard

- Landing deck: focusable deck (`aria-roledescription="카드 넘기기"`), ←/→ move cards; Enter/Space on the CTA opens; Escape closes an open window (l3-deck.html:238, 705–710, 1122–1125).
- I: ↑ = A, ↓ = B (two answers); 1–4 or A–D answer at once (via `e.code`, IME-safe); with 3–4 answers ↑/↓ walk the answers and Enter/Space answers (i3-split.html:1163–1182).
- J: ←/→ choose; arrow repeats ignored by the arrival guard.
- D: ←/→ move between cards; 1–4 / A–D answer.
- Modal: Tab trap, Escape rules (1.4). Share sheet: Escape closes (or closes the friend preview first) (share.js:309–313).

### 2.14 Focus

- Window open → the stage frame takes focus and `vive:open` is posted; fallback Q1 → its heading; close → back to the card's CTA; return from full → the card (l3-deck.html:818, 846–851, 957, 1035).
- Modal → the dialog container, not the first button (so one Enter is not consent).
- Share close → back to the question block (`from`) (share.js:434–435).
- D: focus goes to the question heading after every move (d3-story.html:66).

### 2.15 Accessibility notes and known limits

- `aria-live="polite"` announcements for card changes (380ms debounce), window states (「<title> · 첫 질문」, 「… 테스트를 시작해요」, 「… 카드로 돌아왔어요」), question changes and progress; canvases `aria-hidden` with real DOM text; answers announce their letter (「A. <text>, 이전에 선택한 답변」).
- Unseen stage frames are `inert` and out of the tab order; the landing below an open window is `inert` + `aria-hidden` while full.
- Reduced motion keeps opacity fades ≤180ms (BRIEF.md:54).
- Known limits: no system-back handling for the window; iOS edge-back collision; WebKit plain Tab skips buttons (platform); J's moving 이전 and spatial `제출` need focus-order/zoom/screen-reader validation; long answers in 12 languages unverified in narrow bands/signs; **WCAG 2.2.2** (pause/stop for auto-moving content) is undecided for the landing's always-moving field and any idle stage motion — round-2 D raised it after hold-to-pause was removed on owner request (DLG:814).

## 3. Visual system

### 3.1 `shared/tokens.css` (copied from `docs/design/ds/colors_and_type.css`; full list)

| Token | Light | Dark (`prefers-color-scheme: dark` unless `data-theme="light"`, or `data-theme="dark"`) |
|:---|:---|:---|
| `--font-sans` | "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif | same |
| `--canvas` | #fbfaf7 | #141110 |
| `--canvas-elevated` | #ffffff | #1e1a16 |
| `--surface-soft` | #f4f1ea | #0c0a09 |
| `--surface-muted` | #ece8df | #332e28 |
| `--ink` | #1e1a16 | #fbfaf7 |
| `--ink-soft` | #332e28 | #ece8df |
| `--ink-body` | #504a43 | #d6d1c4 |
| `--muted` | #817a72 | #b3aea1 |
| `--muted-aa` | #756d66 | #b3aea1 |
| `--hairline` | #e6e2d8 | #504a43 |
| `--hairline-strong` | #d6d1c4 | #817a72 |
| `--sage` | #5c8e78 | #7daa95 |
| `--sage-600` | #4b7764 | #a6c5b5 |
| `--sage-700` | #396050 | #c9dbd1 |
| `--sage-soft` | #c9dbd1 | #2b4a3e |
| `--sage-muted` | #e8f0ec | #1f382e |
| `--accent-fg` | #396050 | #a6c5b5 |
| `--on-accent` | #ffffff | #141110 |
| `--tag-bg` / `--tag-fg` | #ece8df / #504a43 | #332e28 / #d6d1c4 |
| `--overlay-scrim` | rgba(30,26,22,.48) | rgba(5,4,3,.72) |
| `--shadow-rest/md/lg/overlay` | 0 1px 2px .04 · 0 4px 14px .06 · 0 12px 32px .08 · 0 24px 64px .18 (rgb 30,26,22) | .30 · .42 · .50 · .62 (rgb 5,4,3) |
| `--cat-personality` / `-bg` | #5c8e78 / #e8efea | — |
| `--cat-relationships` / `-bg` | #c4704a / #f2e6dc | — |
| `--cat-values` / `-bg` | #4a6fa5 / #e5eeee | — |
| `--cat-work` / `-bg` | #8a7bb5 / #ece3f2 | — |
| `--cat-decision` / `-bg` | #c9a24a / #f2ead2 | — |
| `--radius-xs/sm/md/lg/xl/pill` | 5 / 8 / 12 / 16 / 24 / 999px | — |
| `--ease-standard` / `--ease-out` / `--ease-in` | cubic-bezier(.2,0,0,1) / (0,0,.2,1) / (.4,0,1,1) | — |
| `--dur-fast/base/slow` | 140 / 180 / 280ms | — |
| `--tap-min` / `--gutter` | 44px / 16px | — |
| `--app-w` / `--app-left` | min(100vw, 430px) / (100vw − app-w)/2 (mockup framing) | — |

Base: `body` 16px/1.5, `word-break: keep-all`, `overflow-wrap: anywhere`; `:focus-visible` 2px `--sage` outline offset 2 (tokens.css:127–158). Note: the category hues and test→category mapping are a **mockup choice** (tokens.css:2–3); `design.md` §8 intent says `--dur-base: 220ms`, `--dur-expand: 260ms`, while the ds realisation says 180/280ms.

### 3.2 Shell tokens and components (`shared/shell.css`)

- Tokens: `--vt-top-h: 56px + safe-top` (64px with the story bar), `--vt-bottom-h: 72px + safe-bottom`, `--vt-rail-w: 12px`, `--vt-rail-gap: 16px`, `--vt-lane: 44px`, `--vt-ease-out: cubic-bezier(.2,.9,.25,1)`, `--vt-ease-in: cubic-bezier(.4,0,1,1)`, `--vt-ease-flood: cubic-bezier(.66,0,.2,1)`, `--vt-dur-enter: 560ms`, `--vt-dur-exit: 260ms`, `--vt-dur-flood: 700ms`, `--vt-radius-card: 28px`, `--vt-radius-sheet: 24px` (shell.css:6–20).
- Tone vars: `[data-tone="dark"]` → `--vt-fg #fff`, `--vt-chip-bg rgba(14,12,11,.34)`, `--vt-chip-fg #fff`, `--vt-quiet-bg rgba(20,18,22,.5)`, `--vt-quiet-fg rgba(255,255,255,.9)`; `[data-tone="light"]` → `#1e1a16`, `rgba(255,255,255,.5)`, `#1e1a16`, `rgba(255,255,255,.55)`, `#3a342e` (shell.css:60–61).
- Components: `.vt-chrome` (fixed layer z 40, passes touches through except its controls, `[data-off]` fades 160ms), `.vt-top` (grid 1fr auto 1fr), `.vt-brand` (800 14px chip, blur 12 sat 1.3), `.vt-title`, `.vt-icon`, `.vt-rail` (+ `-track`, `-seg`, `.is-cur`, `-pct`, `[data-axis="x"]`), `.vt-bottom`, `.vt-prev`, `.vt-submit`, `.vt-badge`, `.vt-prev-mark`, `.vt-q`, `.vt-qlabel`, `.vt-votes`, `.vt-ex`, `.vt-scrim`, `.vt-modal`, `.vt-sheet` (+ `.vt-mhead`, `.vt-sheet-eyebrow` 600 13px, h2 800 23px/1.25, `.vt-mstep`, `.vt-sheet-text` 400 15.5px/1.6, `.vt-ctx`, `.vt-consent`, `.vt-cta`, `.vt-start` 54px radius 16 800 17px on `--c`, `.vt-second` 48px, `.vt-qual` 800 20px, `.vt-qual-row` 2-col 56px buttons).
- Layers: stage content ≤ 30 · chrome 40 · instruction dialog 50–51 · share sheet 90–95 · prototype chrome ≈2147483000 (shell.css:3). Landing: GNB 20, catcher 30, window 40, colour cover 60 (l3-deck.html).

### 3.3 Landing-local tokens (`l3-deck.html:28–42`)

`--peek: 56px`, `--lap: 24px`, `--gnb-h: 56px + safe-top`, `--ink-c: #1e1a16`, stage fg/tint (light `30 26 22` / `246 244 238`; dark `255 255 255` / `8 10 9`), pill bg/line (light `rgb(255 255 255/.62)` / `rgb(30 26 22/.13)`; dark `rgb(255 255 255/.1)` / `.3`), neighbour dim, halo 30%/42%, **`--spring: cubic-bezier(.2,1.32,.32,1)`** and **`--spring-soft: cubic-bezier(.24,1.16,.36,1)`** (overshoot easings for the kinetic entrance). Card: radius 28px, padding 20/20/10, deep shadow stack, inset highlight; card width `clamp(W − 92, 228, 360)` so 34px of each neighbour shows; height `clamp(deckH − 18, 340, min(600, 1.74 × width))`; neighbours scale 0.9 and dim (l3-deck.html:501–511, 561–579).

### 3.4 Test signature colours — the single palette source (`shared/shell.js:59–89`)

| Test | `base` | `hi` | c1 | c2 | glow | deep | tint | field dark[4] | field light[4] |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| qmbti | #1d5242 | #8ae6c2 | #2f7f66 | #0f716c | #7fe0b8 | #0b2d24 | #e3f4ec | #0a2521 #3f7d65 #0d6b6d #8ae6c2 | #eef3ec #c2e3d1 #b0ddd8 #9fe2c3 |
| energy-check | #3a2b7c | #cdbdff | #5b45b0 | #7d63cf | #ffb08a | #1c1440 | #ece6fb | #16112c #5a43a8 #9d8ad9 #ffb58e | #f2f0f8 #d8cff4 #e4dafa #ffcdb2 |
| egtt | #7a2e1b | #ffc48a | #b0502c | #a33d58 | #ffb24a | #3a130b | #f7e3d8 | #240d0a #b4532e #ae405e #ffb74c | #f7efea #f2cdbd #efc8d5 #ffd39a |
| creativity-profile | #3d3526 | #e3c98a | #5c5039 | #6d6047 | #a08a55 | #1f1b12 | #f2ead2 | #1b1812 #4a4230 #6a5e44 #a38e5c | #f3f0e8 #e4dac5 #ebe3d1 #dcc794 |
| demo-three (예시) | #23415f | #9fcbf2 | derived | | | | | | |
| demo-four (예시) | #5b2750 | #f2b3dc | derived | | | | | | |
| end card `all` (landing only) | #2b2622 | #eadfca | #4a4136 | #35433d | #c9b28a | #161310 | #f1ebe0 | #15120f #3d352c #34403a #a08c6a | #f4f1ea #e6ddcf #dde4de #e2d2b2 |

`look(id)` derives a palette for tests without an entry (`c1 = mix(base, hi, .28)`, `deep = mix(base, black, .6)`, …). The card cover = four radial blobs (`c1`, `c2`, `glow`, `deep`) over `base` with luminance caps (Y ≤ .13 where type sits → white type ≥ 5.8:1; glow corner .34; window copy capped at .15) (l3-deck.html:299–334). Round-2 design choice behind these: 「all tests share one ring of nine deep colours, each keeping white text at 5:1 or better」 (DLG:798).

### 3.5 Stage colour derivation

- **I pairs**: curated two-answer pairs per question (`CURATED`, i3-split.html:202–211): qmbti Q2 #ff7a5c/#0e6b6b, Q3 #5a3fd8/#c8d96a, Q4 #f5b041/#1c2b4f, Q5 #f29bb2/#1e5a3c, Q6 #2448c9/#ffb894, Q7 #a3e3c6/#5c2453, Q8 #b4441e/#93cdeb; energy-check Q2 #ff6f91/#0b3d4a, Q3 #f4c95d/#3a2e7a, Q4 #2f7d59/#f2a7b8; egtt Q2 #7fd4bf/#6b1f45, Q3 #b9a6ff/#1f4d3a. Q1 = `legible(signature)` (A) + `partnerOf` = complement at the far lightness (B); a hand-off swaps the landing colour onto the chosen side. Text colour = white or ink `#1e1a16`, whichever contrasts more; `legible()` nudges lightness until ≥ 4.5:1 (i3-split.html:157–222).
- **I 3–4 answers** (`genSet`): hues evenly spaced from the signature, later questions turned by the golden angle (137.508°), alternating deep (luminance ≤ .07) and light (≥ .38) so neighbours clear 3:1, then `legible()` (i3-split.html:183–200).
- **D**: card 1 = the landing card's `base`; each next card steps hue in OKLCH (warm families toward red, others toward blue/magenta; step = min(15°, 60°/last)), alternating lightness +0.035 and chroma ×1.12/1.04; ground = card colour at L×0.6, C×0.62; white type ≥ 7:1 (d3-story.html:165–197).
- **J**: sky = card cover mesh; land luminance steps sky 0.04–0.13 (glow 0.34), ranges 0.06/0.04/0.026, haze 0.05, ground 0.008, mounds 0.005, road 0.2; road vs ground ≈ 4.3:1 for every test; chosen road lifts toward the family's light over 700ms (echo of I's flood); a road not taken sinks to a dim trace (j3-forks.html:197–249).

### 3.6 Typography (as built)

Card title 800 clamp(30px, 14.8% of card width, 50px)/1.05, −0.03em, balanced (end card 42px max); card subtitle 500 15px/1.5; meta 700 14px tabular; category 700 13px +.04em; CTA 700 16px; window title 800 25px/1.2; `.vt-q` 800 22–26px; `.vt-qlabel` 700 17px; I answers 800 24–28px (22–25 for 3, 20–23 for 4); D answers 650 16px/1.38; D closing 800 30–38px; modal h2 800 23px; modal text 400 15.5px; `시작` 800 17px; top bar 700/800 14px; rail % 700 11px; badge 800 13px; share card question up to 800 108px (canvas). **Pretendard is named but never loaded** — no `@font-face`, no network — so the prototype renders in the system Korean font (Apple SD Gothic Neo on Apple devices).

### 3.7 Motion inventory (durations and easings)

| Where | Motion | Value | Source |
|:---|:---|:---|:---|
| Landing load-in | centre card rises 44px + scale .94 → 1; neighbours slide 70px | 760 / 680ms, `cubic-bezier(.2,1.1,.3,1)` (overshoot) | l3-deck.html:1175–1182 |
| Landing kinetic title | per-character rise with blur and rotate, 30ms stagger | opacity 380ms, transform 900ms `--spring` | l3-deck.html:112–122 |
| Landing meta count-up | 0 → completed | 1000ms after 440ms | l3-deck.html:580–590 |
| Landing motif | stroke draw-on (pathLength 1), 110ms stagger | 1000ms `--ease-standard` | l3-deck.html:120 |
| Landing deck spring | underdamped (ζ ≈ .72), 4ms sub-steps | k 320, c 26 | l3-deck.html:531–540 |
| Landing parallax (drag only) | field 0.15× cards, motif −0.5×, title 1.06× | — | l3-deck.html:545, 570–572; DLG:1030 |
| Landing first-visit nudge | lean 28px, then spring home | 300ms, after 1.45s idle | l3-deck.html:526–530, 1183 |
| Landing press | card scale .985, white ink ripple from touch | 560ms ripple, 140ms minimum press | l3-deck.html:620–642 |
| Landing field | WebGL mesh drift, OKLab palette blend between cards and themes | continuous (phase += dt × 0.8) | l3-deck.html:404–497 |
| Window open / close / grow / shrink | clip-path | 580 / 440 / 520 / 560ms (see 2.1) | l3-deck.html |
| Modal | opacity 240ms linear + translate/scale .965 → 1 | 460ms `--vt-ease-out`; step swap 260ms | shell.css:146–151; shell.js:306 |
| Share sheet | slide up | 380ms `cubic-bezier(.2,.9,.25,1)`; ghost morph 420/380ms | share.css:19; share.js:328 |
| I tap | push 44px then flood | 150ms tug; flood accel 7000px/s² | i3-split.html:873–887 |
| I rest spring / wobble | liquid border | k 300, c 17 | i3-split.html:868–872 |
| I colour-in-flight | stripe to rail | ≈0.35s | DLG:881 |
| J travel / road lift / guard | camera along branch; chosen road lights up | ≈900ms (r1); 700ms (`--vt-dur-flood`); guard 350ms | BRIEF.md:165; j3-forks.html |
| D answer / slide | selected state then one card | 150ms lock; ≤220ms slide; drag release ≈0.2s | d3-story.html:163, 380–437 |
| Reduced motion (all) | fades only | 140–180ms | proto/shell/l3/d3 |

### 3.8 Glass, grain, shader

- Glass: shell chips `rgba(14,12,11,.34)` blur 12 saturate 1.3; question label `rgba(14,12,11,.56)` blur 14; 이전 pill blur 8; landing pills `rgb(255 255 255/.1–.62)` blur 10; modal scrim `rgba(8,6,5,.58)` blur 6; landing catcher `rgb(0 0 0/.36)`.
- Grain: a 128×128 canvas tile of random black/white pixels with alpha ≤ 22/255, generated once and set as `--grain`; on landing cards, the field, the window surface and header, and J's world (l3-deck.html:395–402; j3-forks.html:34).
- Shader (landing field, from round-1 B): WebGL1 fragment shader of drifting gaussian blobs with value-noise warp, luminance-capped per screen zone, dithered; canvas at `min(DPR, 1.5)/3` resolution, `failIfMajorPerformanceCaveat` + `low-power`; CSS radial-gradient fallback with the same palette; context-loss handled; paused when hidden or off-screen (l3-deck.html:404–497, 1140–1141). Author: 「스크롤 스냅·연동은 CSS 0KB, 배경 셰이더는 약 5–8KB 를 첫 페인트 뒤에」 (BRIEF.md:145).

### 3.9 Contrast rules

- Text ≥ 4.5:1 everywhere, checked on rendered pixels: round-2 landing 184 text boxes ≥ 4.57 (DLG:1014); round-3 cards ≥ 5.3:1 against the lightest pixel behind white text (DLG:1688); D white type ≥ 7:1; J question ≥ 6.07:1 across states (DLG:2422), sign ink ≈ 17:1; I 3–4-answer neighbours ≥ 3:1 and text ≥ 4.5:1.
- `toneFor(hex)` picks the chrome tone: `light` (ink) when ink contrasts more than white, else `dark` (white) (shell.js:104–106).
- Votes line inside I's glass label because white on light fields (lime, mint, pink) fell below 4.5:1 (DLG:1449).

### 3.10 Light / dark handling

- Cards and stage colour worlds are **theme-independent** (deep posters, white type). The landing **field and chrome follow the OS theme** (palette blends light ↔ dark in OKLab, `themeT` eased); the modal, share sheet, end cards and list use VIVE paper tokens and follow light/dark; J is always a dark world; the friend page wears the sharer's colour. The owner reviewed every round in dark mode on desktop preview (DLG:385–386, 1172–1173, 2106–2107).

## 4. Data model

### 4.1 `shared/content.js` → `window.VIVE`

- Source: copied verbatim (Korean) from `src/features/variant-registry/**`, `src/messages/kr.json`, `src/features/test/fixtures/questions/{qmbti,energy-check,egtt}.ts`; placeholder rows (rhythm-b, debug-sample, burnout-risk) omitted; `category` is a mockup choice; `attribute` is the registry value (content.js:1–9).
- `tests[]`: qmbti 「10분컷 MBTI」 subtitle 「내 기본 딥워크 리듬을 빠르게 찾아보세요.」, 3분, 15,236 완료, 2,184 공유, personality, `available`, instruction 「QMBTI는 본 문항에 들어가기 전에 작업 리듬 성향을 짧게 점검하는 테스트입니다.」; energy-check 「에너지 배분 점검」 「하루 동안 정신 에너지가 새는 지점을 찾아봅니다.」, 5분, 10,448 / 1,445, work, tags 에너지·계획, **`opt_out`**, instruction 「에너지 체크는 하루의 부담이 새는 지점을 추적하고 가장 큰 소모 신호를 따라가게 합니다.」; egtt 「에겐-테토 성향 테스트」 (no subtitle — repo value is a placeholder), 3분, 9 / 1, relationships, tags 에스트로겐·테스토스테론·호르몬테스트, `available`, **qualifier `{text:'나의 성별은', options:['남성','여성']}`**, no instruction text (content.js:56–73).
- `questions`: qmbti 8 (`{emoji, text, a, b, poleA, poleB}`; Q6 poles flagged as looking inverted, content.js:18–19), energy-check 4, egtt 3 scoring rows (qualifier not in the array; the landing preview is its first scoring row) (content.js:11–34).
- `demoTests` (예시, never on the landing): demo-three 「주말 충전법 · 예시」 (6 questions × a/b/c), demo-four 「여행 스타일 · 예시」 (6 × a/b/c/d), both `available`, category values/decision (content.js:35–51, 75–87).
- `comingSoon`: creativity-profile 「창의성 프로필」 「에디토리얼 검토 중인 예정 변형입니다.」 tag 출시 예정. `blog`: ops-handbook (8분), build-metrics (6분), release-gate (5분). `catalog` = registry seq order [qmbti, energy-check, creativity-profile, egtt, 3 blogs]. `categories` ink/bg hex. `ui` strings from kr.json (siteName, landingTitle, landingSubtitle, menu, back, instructionTitle, start, next, acceptAllAndStart, denyAndAbandon, denyAndStart, keepCurrentPreference, unknownAvailableNote 「더 나은 경험을 위해 테스트를 진행하기 전에 약관에 동의해 주세요.」, unknownOptOutNote 「… 동의하지 않아도 계속 진행할 수 있습니다.」, prev, submit, progress, previouslySelected, readMore, comingSoon, minutesUnit, completedLabel, sharedLabel, privacy). Helpers `fmt` (ko-KR), `testById`, `keysOf` (content.js:89–154).

### 4.2 Session keys the prototype uses (all sessionStorage)

| Key | Writer → reader | Shape / meaning |
|:---|:---|:---|
| `vive-handoff` | landing fallback / hub → stage (`Flow.takeHandoff`) | `{v:1, test, q1:'A'…'D', color, from, at}`; 10-min TTL; consumed once |
| `vive-landing-return` | stage (`Flow.backToLanding`) → landing (pre-paint + `takeLandingReturn`) | `{test, color, at}`; 10-min TTL |
| `vive-landing-page` | `takeHandoff` / `Shell.back` → `landingHref()` | landing href (default `l2-vibe-deck.html#flip`) |
| `vive-flow-target` | round-2 hub/landing | round-2 flow page choice |
| `vive-stage-override` | hub / landing info sheet → `stageFor` | `I` \| `J` \| `D` |
| `vive-stage-file-test` | test scripts → `stageFile` | stage file override |
| `vive-consent` | modal accept → `Shell.consent()` | `in` \| `out` (absent = unknown); deny not stored |
| `proto-reduced` | ⓘ switch → `Proto.reduced()` | `'1'` \| `'0'` |
| `vive-share-payload` | share sheet → `v-vote.html` | `{kind, test, index, color, question:{emoji,text,a,b,c?,d?}, art}` (`art` = JPEG data URL or null) |
| `vive-share-coached` | `Share.coach` | `'1'` once per session |
| `vive-i3-first` | I restart inside the landing | first-frame colour across a reload |

### 4.3 Share / vote data (simulated)

- Votes exist only after a question is marked shared (링크 복사 or 친구 화면 보기). Count by seconds since first share: <4s 0, <9s 1, <15s 3, <24s 5, then 7; two answers: A share = 0.30–0.69 from a hash of `test:index`; 3–4 answers: each vote drawn with per-answer weights 0.55–1.44, counts sum to n and never decrease (share.js:43–90).
- Link address is a fake `https://vivetest.app/v/<base36>` copied to the clipboard (the only absolute URL in the prototype; never fetched) (share.js:443).
- Friend page tally = simulated prior votes + the friend's own vote; percentages by largest remainder.
- Real build needs (author): 「공유 링크마다 서버에 투표함이 필요해요 — 익명 집계, 중복 투표 방지, 만료 기간」, per-question OG after a patched `next/og`, in-app browser support (v-vote.html realBuild).

### 4.4 Gaps between the prototype data and the repo

- No locale data: every string is Korean only; 12-locale length checks are open.
- Consent is a three-state stub; `OPTED_OUT` behaviours of `req-test` §3.6 (e.g. direct `OPTED_OUT` + `available` → [Keep Current Preference]) are not modelled; the landing consent banner is absent.
- Per-test, per-question colour sets exist only for the 3 real tests (I) or are computed (D, 3–4 answers, J) — the author says each real test needs its own sets (i3-split.html realBuild).
- 3–4-answer questions carry no poles/scoring.

## 5. Owner decisions per round

Full verbatim forms: Appendix A.

### 5.1 Round 1 (10 concepts; DLG:382–692)

| Concept | Verdict (verbatim) | Key reason (verbatim) |
|:---|:---|:---|
| A 스와이프 덱 | 「조각만 가져가기 - 랜딩에서 카드 단위 좌우스와이프로 테스트 단위 탐색 (답변 탭 전까지만)」 | 「지금처럼 문항으로 답할 때 쓰는 것은 아주 어색하고 UX 상 이해도 불가해 수용하기 어려운 수준입니다.」 · 「사용자 의향을 묻지 않고 질문을 하는건 바람직하지 않음」 |
| B 바이브 피드 | 「위 피드백 반영 & 채택」 | 배경색 흐름 「자연스러웠고, 분위기를 잘 살렸으며 읽기를 방해하지 않았습니다」; dots rejected (44px + no hint); list button found late |
| E 살아있는 종이 | fallback | 「부족하지만 폴백으로 고려 가능」; kept: card-tap fill, sheet→test transition 「아주 적절하고 마음에 듭니다」 |
| F 촉감 놀이터 | 「탈락」 | 「토큰, 장난감 요소를 테스트로 인지하는데 시간이 한참 걸렸습니다」; only the landing↔test transition survives |
| G 대화형 랜딩 | 「탈락」 | 「요즘 대화형 UI 가 너무 흔해서」; hard to reconcile with going back |
| H 별자리 지도 | 「탈락 (단 원근감 살리는 트랜지션은 무리하지 말고 다른 안에 흡수 가능한지 정도만 추가 검토 해주세요)」 | unstructured browsing does not scale; liked fly-to/return-to-position continuity |
| C 오라 | 「탈락」 | 「테스트 문항 선택 외 다른 요소에 인터랙션, 모션 적용은 금지합니다. (배경 색 등 효과 적용은 허용, 다른 인터랙티브 요소를 이 안처럼 새로 만들어 추가하는 것만 금지)」 |
| D 스토리 플로우 | 「위 피드백 반영 & 채택」 | share UI adopted for all; dynamic link first, 9:16 card also fine; flip note rejected (「찰나」); hold-to-pause unnecessary; add swipe between questions |
| I 반반 화면 | 「위 피드백 반영 & 채택」 | drag direction 「정확히 반대였습니다」; remove 「놓으면 이 답으로」; palette = 「나만의 결과물」; move progress to a right vertical bar (two variants requested) |
| J 갈림길 | 「위 피드백 반영 & 채택」 | submit behind the last sign; revisit defect; 이전 to bottom centre, less emphasised |

Summary answers (DLG:680–691): landing ranking 「B > E > A > H > G > F」; flow ranking 「I > J > D > C」; the proposed 「랜딩 A + 테스트 흐름 C + D 의 9:16 공유 카드」 → 「반대」; first-5-seconds behaviour = 「테스트 골라 보기」 + 「이것저것 둘러보기」 (not 「바로 첫 질문에 답하기」); tone 「3 ~ 5 수준」; must keep 「쉽게 테스트 브라우징 하고, 선택한 테스트로 진입해서 테스트를 하고, 그 과정에서 흥미를 유발하는 현란하고 창의적인 UX와 모션 제공하면서 동시에 직관성도 갖춰야 함」; must not 「H 나 F 처럼 직관성이 떨어지거나, C C 처럼 억지로 만든 것 같은, 기존 요구사항에 없던 불필요한 요소와 인터랙션」; variant request 「랜딩에서 브라우징할 때 선택지가 처음부터 노출되지 않고, 최초 안처럼 탭 해서 뒷면이나 다른 적절한 방법으로 선택지가 그 뒤에 나오는 방향도 시도해봐주세요」.

### 5.2 Round 2 (DLG:1169–1302)

- Landing B+A: 「위 피드백 반영 & 채택」; reveal 「펼치기」 (「안에 질문과 선택지 텍스트가 길어질 경우 표현할 공간이 넉넉하고 여유있기 때문」); hidden answers 「훨씬 더 낫습니다」; 「[첫 질문 보기] CTA 는 너무 눈에 띄어서 텍스트 버튼으로 하거나 덜 강조되는 방향으로」; list 「찾기 조금 어려웠어요」; return blank frame 「가급적 정보들이 유지된 채로 사라지거나 하는 식으로 화면의 연속성이 효과/트랜지션 통해 표현되는게 좋겠습니다」.
- I: 「I 팔레트형 채택」; drag text follows vertical centre; remove the white question box title and hint; title into the top bar; white-box semantics must be consistent from Q1.
- J: 「J 위 피드백 반영해서 한 가지로 보유」; revisit still skipped → 「한 문항씩 순차 이동해야합니다」.
- D: 「매력은 덜하지만 안정적인 점으로 인해 fallback 으로 두고싶습니다. motion 제거 등에서 이 안을 적용하는 방향 고려하겠습니다. 위 피드백 반영하고 폴백으로 채택합니다.」; needs visible side margins for swipe affordance.
- Share: no drop-out, card/link copy good, friend page fine, vote line 「있어야 한다」.
- Revisit contract: 「되돌아간 문항부터 한 단계식 이동」. Next step: 「한 번 더 목업 다듬기」.
- Consistency request (verbatim): 「여러 피드백을 제공하면서 이제 각 안의 완성도는 어느 정도 갖추어진 것 같습니다. 그런데, 랜딩+테스트 조합 시 Visual Consistency, Interaction Consistency 가 부족한게 사실입니다. 개별 안의 완성도는 이제 어느 정도 갖춰졌으니 일관성을 갖추는 작업이 필요합니다. 한 웹사이트 안에 I, J, D 모두 유지한다고 가정할 때 어떻게 해야 모두 한 서비스라고 느껴질 수 있도록 일관성을 갖출 수 있을지 고민해서 모든 안의 일관성 관점 개선도 함께 적용해주세요.」

### 5.3 Round 3 (DLG:2103–2203) — adopted with minor fixes

- Overall: 「네, 이제 모두 한 서비스로 느껴집니다. 특히 Q1 프리뷰 질문의 UI 와 인터랙션이 이후에 일관되게 이어지는 점이 아주 마음에 듭니다.」; verdict 「이번 턴에서는 아주 마이너한 수정사항만 반영해 최종 채택」.
- Landing: window, grow, return, list, text CTA all good; **instruction → modal** (1.4). Verdict 「전반적으로 만족스럽고 위 기재한 마이너한 피드백 몇가지만 개선 후 채택합니다.」
- I: 「전반적으로 만족스럽습니다. 채택합니다.」 + optional 3/4-choice extensibility.
- J: revisit fixed; tinted sky barely felt; 이전 on the road centre; visual style still foreign → 「위 마이너한 피드백과 Visual Style 만 개선하고 채택」.
- D: horizontal top bar; 「가장 정적인 안으로 위 피드백만 적용한 상태로 최종 채택합니다.」
- Next: 「각각의 안이 모두 마음에 들어서 3개안 (반반화면, 갈림길, 스토리) 모두 이 서비스 안에서 사용하겠습니다.」 · 「대신, 갈림길 1개만 Visual Style 과 톤앤매너 시각적 일관성을 맞추는 작업만 하면 모두 사용 가능해보입니다.」 · 「완성된 후에는 각 테스트 별로 어떤 타입을 적용할지를 사전에 정의하겠습니다.」
- Mid-final-revision instruction: 「시간이 아무리 오래 걸려도 좋으니 최고의 품질 하나만 고려해서 작업을 이어가주세요.」 (DLG:2408).

### 5.4 Owner principles (consolidated; memory `vivetest-owner-interaction-principles.md` verified against DLG, plus round-3 additions)

1. Intuitive first; flashy creative motion wanted at tone 3–5, never at the cost of knowing what to do.
2. Browse and pick a test first; do not ask a question before the user chose a test; keep first-screen information restrained (answers hidden until the card is opened).
3. During a test no new interactive elements beyond answering, moving between questions and sharing; background colour/visual effects allowed.
4. No drag-to-close, no grab handles, no tiny dot navigation (44px + content hint), no hold-to-pause, no tap-to-skip, no information that flashes too fast to read, no ever-filling bars.
5. Swipe browses (tests on the landing, questions in D); a card swipe never answers; spatial/direct manipulations that read naturally (I's seam, J's road) are fine.
6. What can be dragged must look draggable (side margins, peeking neighbours); limits must be visible (locked card).
7. Revisit moves one question at a time.
8. CTAs on a fully tappable card are quiet text buttons.
9. One shape means one thing everywhere (white surface = answer; question never in a white box); one service across stages beats individual flourish — same places, same shapes, same behaviour, signature colour continuity.
10. Transitions keep content visible; no blank or static in-between frames; continuity effects (flood, continuing motion) preferred.
11. Sharing is the viral core and must work mid-test without dropping the user: 「내가 답하기 어려운 질문을 올려 다른 사람들이 대신 A/B 투표해주기」; dynamic link first, 9:16 story card second; friend votes stay visible under the question.
12. Round 3: a mandatory gate (instruction + consent) must look mandatory — a covering modal, not an optional-looking bottom sheet; the progress UI fits the stage's geometry (vertical for split/forks, top horizontal for story); controls sit on the stage's spatial centre (J's road); stage-per-test is decided at launch.

### 5.5 Rejected and why

| Rejected | Where | Why (source) |
|:---|:---|:---|
| Answering by card swipe (A) | round 1 | never understood, left/right = A/B confusing, accidental swipes (DLG:392–421) |
| Question-first landing | round 1 | 「사용자 의향을 묻지 않고 질문을 하는건 바람직하지 않음」 (DLG:410) |
| Dot rail navigation (B) | round 1 | tap size and no content hint (DLG:438) |
| Drag-to-close sheet (E) | round 1 | effortful; outside tap enough (DLG:482) |
| F, G, H, C concepts | round 1 | see 5.1 |
| Flip-reveal note + filling bar (D) | round 1 | 「찰나」 unreadable; bar 「불필요하고 너무 과한 효과」 (DLG:571–573) |
| Hold-to-pause (D) | round 1 | 「굳이 필요하지 않습니다」 (DLG:587) |
| 「놓으면 이 답으로」 hint, inverted drag (I) | round 1 | confusing placement; direction opposite (DLG:604–607) |
| Top horizontal progress in I | round 1 | intrudes on the split (DLG:624–626) |
| 「당신이라면?」 share copy, image-only share | round 1 | sharer benefit framing; dynamic page first (DLG:565–579) → 「나 대신 골라 줘」 |
| Recommended combo A + C + D card | round 1 | 「C 는 탈락이고 D 는 너무 무난하고 밋밋합니다」 (DLG:683) |
| Flip reveal (#flip) | round 2 | expand gives room for long text (DLG:1185) |
| I vertical-rail-with-chips variant (#rail) | round 2 | too many elements (DLG:1214–1216) |
| White question box in I | round 2 | inverts Q1's white-answer meaning (DLG:1206–1208) |
| Filled 「첫 질문 보기」 CTA | round 2 | too prominent (DLG:1188) |
| Page-change return with a blank frame | round 2 | continuity (DLG:1192–1193) |
| Jump-to-first-unanswered revisit | rounds 1–2 | treated as a defect (DLG:670, 1235) |
| Bottom-sheet instruction | round 3 | looks optional for a mandatory consent gate (DLG:2132–2133) |
| Vertical rail in D | round 3 | 「Vertical Bar 는 이 안에서는 안어울립니다」 (DLG:2188) |
| Screen-centred 이전 in J | round 3 | misaligned with the perspective road (DLG:2171) |
| J scenic dusk style (sun, trees, tinted sky) | round 3 | foreign next to the other stages (DLG:2175); replaced by direction A |
| J directions B (two roads two colours) and C (luminous lines) | final panel | lower consistency/craft scores; grafts kept (WF `wf_333ec27a-e26.json`) |

## 6. Conflicts with current repo contracts (noted by the prototype session; citations verified at `20f973a`)

| # | Prototype behaviour | Current contract (verified) | Noted by | What must change |
|:---|:---|:---|:---|:---|
| 1 | Re-answering a revisited question advances exactly one question | `docs/req-test.md` §4.3 (l.681–682): 「scoring 응답 확정 직후 시스템은 즉시 다음 미응답 scoring question으로 이동한다」 and 「미응답 scoring question이 하나도 없으면 목적지는 마지막 scoring question이다」; §3.9 implementation contract (l.527) | BRIEF2.md:24; I3/J3/D3 realBuild; hub | Revise §4.3 + §3.9 navigation contract |
| 2 | Living WebGL background, autoplay drift | `docs/req-landing.md` §1.3 Locked Decisions (l.13–21): 「배경 동적 연출은 강도 `0`/정지 상태로 비활성화한다」, 「카드 tilt 효과는 전면 비활성화한다」 | B realBuild (BRIEF.md:145); hub | Reopen §1.3 |
| 3 | Overshoot springs, parallax, card rotation while dragging, autoplay decorative motion (kinetic titles, count-ups, nudge, liquid wobble, splash, camera travel) | `docs/design/design.md` l.107 and §8 l.377: 「**Banned:** bounce, spring overshoot, parallax, card tilt, auto-playing decorative motion.」 | every round's realBuild; l3 realBuild | Revise design.md §8 (+ l.107) |
| 4 | Card expands in place into a window (no bottom sheet; no swipe-down close; 1:1 deck browsing, not a 1-column catalog) | `docs/req-landing-interaction.md` §8.5 (l.152–189): phone expansion is a bottom sheet with grabber and five close paths incl. swipe-down; `docs/req-landing.md` §6.2 (l.208) 「Mobile: 1열, vertical gap `14~16px`」; `design.md` l.353 「**Mobile:** single column.」 | A/B/l3 realBuild; hub | Rewrite §8.5 to "expanded card window"; swipe-down close dropped per owner rule |
| 5 | Landing hosts the test route inside the window; no page change; return by shrinking | `req-landing-interaction` §8.6 (l.191–205) transition start; `req-landing.md` §13.3 handshake (l.746–765: return scroll record, destination-ready, 1600ms timeout) | l3 realBuild; hub | Rewrite §8 transition contract around a layered route (parallel + intercepting) |
| 6 | Window adds no history entry | `req-landing-interaction` §8.5: 「시스템 뒤로가기는 오버레이 층 전부를 닫는다 — 층이 열릴 때 history 항목 하나를 넣고…」 | l3 limits (DLG:1699) | Real build must add it (author says the layer keeps §8.5 close paths incl. system back) |
| 7 | Instruction = centred modal | `req-landing.md` §13.5 (l.788): 「Mobile: **모달 바텀시트** — 카드 시트와 같은 프리미티브를 쓰되 grabber·제스처 닫기·history 항목 셋을 끈다」 | hub (`_hub-body.html:145`) | Revise §13.5 mobile form; §3.6 dialog/Esc rules kept |
| 8 | Reduced motion → every test opens in D; stage assigned per test | none (new) | hub; D realBuild | New product + accessibility contract |
| 9 | 3–4-answer questions | `req-test.md` §3.8 (l.478): 「각 scoring runtime question은 정확히 2개의 선택지를 가져야 한다」; §4.3 (l.680) 「정확히 두 개의 answer option」; landing preview `answerChoiceA/B` (§8.6); telemetry A/B | hub (`_hub-body.html:147`); I/D realBuild | Schema, scoring, telemetry revision (only if 3–4 answers are pursued) |
| 10 | In-test share, friend votes, story card, path/palette share | `req-landing.md` §12 telemetry V1 event set; no vote backend | D realBuild (r1), I/J/D realBuild, v-vote realBuild | New telemetry events, vote server, OG images |
| 11 | Per-question / per-result OG image | Next 16.2.4; `next/og` ImageResponse flaw 16.2.0–16.3.5, fixed 16.3.6 (reported by the session; primary advisory not confirmed, DLG:360) | v-vote realBuild | Upgrade Next ≥ 16.3.6 first |
| 12 | Per-test signature colours and saturated colour worlds | `design.md` l.69, 92: single sage/moss accent, 「never from saturated color or decorative illustration」 | I realBuild (r1); hub | New colour system in design.md |
| 13 | Emoji in questions shown large; 「나 대신 골라 줘」 sticker copy | `design.md` l.78: 「**No emoji**, no gamified or congratulatory copy.」 | D realBuild (r1) | Clarify content emoji vs UI chrome |
| 14 | J arrival guard 350ms | `req-test` §4.3: only the 150ms lock | J realBuild | New timing contract (and whether it applies to all auto-advancing stages) |
| 15 | J spatial `제출` on a moving gate; 이전 moving with the road | fixed CTA placement assumptions; a11y (focus order, zoom) | J realBuild | a11y validation + contract text |
| 16 | Two progress forms (vertical palette rail, top story bar); 이전 position varies by stage | `req-test` §4.3 「프로그레스 바와 퍼센트」 (compatible per the authors) | hub | Register both in design.md pattern layer |
| 17 | Always-moving field without pause control | WCAG 2.2.2 | D2 limits (DLG:814) | Decide pause/stop policy |
| 18 | Instruction CTA / consent: deny not stored; no `OPTED_OUT` handling; no landing consent banner | `req-landing` §12.4/§12.7, §13.5, `req-test` §3.6 matrix | orchestrator note in hub (`_hub-body.html:16`) | Real build keeps the full matrix |

Also flagged by the session (not contract text): theme transition 2,500ms vs design intent 260ms; layer-order disagreement between the design spec rule 1 and `req-landing-interaction.md:182` (DLG:358–359).

## 7. Decisions still pending

1. **Stage per test** — deferred to launch by the owner (2.3). Needs a rule for new tests and for tests with 3–4 answers (J cannot host them).
2. **Result page** — content, derivation display, the post-submit transition (owner will give feedback later, DLG:631), per-result share and OG.
3. **Share/vote backend** — vote box per link, anonymous aggregation, duplicate-vote prevention, expiry, in-app browsers (KakaoTalk, Instagram), link preview; telemetry events for ask/path/palette shares; real `navigator.share` with link first and image second, fallback for in-app browsers, run resume from sessionStorage if the tab is closed (DLG:815).
4. **Next upgrade** before any request-driven OG (≥ 16.3.6).
5. **Window implementation** — parallel + intercepting route vs other layering; history push timing; system back; deep link to `/test/{variant}` starts in full mode (l3 realBuild).
6. **Reduced-motion policy** — OS + site setting, mid-test changes (D realBuild); WCAG 2.2.2 pause for moving backgrounds.
7. **Arrival guard** scope and value across stages (J realBuild).
8. **Colour sets** per test per question (I pairs, D steps, J palette, 3–4-answer sets) and how they are authored and stored.
9. **3–4-answer tests** — whether to support them at all (schema, scoring, landing preview, telemetry).
10. **Consent** — deny persistence, `OPTED_OUT` paths, the landing banner, EN copy fix (「Nothing you answer is sent.」 overstates, DLG:356).
11. **Landing scope not designed** — menu, locale switcher, theme toggle, blog list/article, history, 404/error surfaces, desktop/tablet layout (the prototype is a 430px phone column only).
12. **Design-system home** — how per-test palettes, shell components, motion tokens and the two progress forms enter `design.md` / `docs/design/ds/` and flow to Claude Design (repo owns, Claude Design consumes — `AGENTS.md` §3).
13. **J final** — the live J pass may still change visuals; the hub J text is unwritten.
14. **Performance gates** — WebGL on low-end GPUs (CSS fallback exists), canvas budgets for J and I, lazy loading after first paint.
15. **12-language verification** of long answers in bands, signs, pills, the share card.
16. **Data fixes flagged**: qmbti Q6 pole inversion (content.js:18–19; repo `qmbti.ts:62`).

## 8. Capture manifest — a durable, runnable reference

### 8.1 Preconditions

- Capture **after** the live session finishes (J final pass, hub placeholders filled and `index.html` reassembled from `_hub-style.html` + `_hub-body.html`, V4 published). Capturing now would freeze a J in mid-fix and a round-3 hub.
- Capture by copying, never moving; the live session writes `j3-forks.html`, `_hub-body.html`, `index.html`, `shots/`.

### 8.2 Minimal runnable set (final design) — 550,372 bytes today

| Path under `MOCK/` | Bytes | Role |
|:---|---:|:---|
| `index.html` | 39,989 (round-3; will be rebuilt) | hub (artifact-skeleton fragment, no doctype) |
| `_hub-style.html`, `_hub-body.html` | 14,710 · 29,369 | hub sources (final draft) |
| `l3-deck.html` | 93,386 | landing + window host |
| `i3-split.html` | 84,239 | stage I |
| `j3-forks.html` | 116,895 (live) | stage J |
| `d3-story.html` | 47,542 | stage D |
| `v-vote.html` | 15,976 | friend page (share preview + standalone) |
| `shared/tokens.css` · `proto.css` · `proto.js` · `content.js` · `flow.js` · `share.css` · `share.js` · `shell.css` · `shell.js` | 4,609 · 4,594 · 7,914 · 11,966 · 4,025 · 7,230 · 28,935 · 12,998 · 25,995 (108,266) | shared layer |

### 8.3 Archives — decision: keep rounds 1–3 archives (≈ 0.89 MB)

- **Round 2** (`l2-vibe-deck.html`, `i2-split.html`, `j2-forks.html`, `d2-story.html` — 281,556 B): **required**, not optional — the final hub links to all four, and `shared/flow.js` defaults `landingHref()` to `l2-vibe-deck.html#flip` (flow.js:22–24, 55), which `v-vote.html`'s 「나도 이 테스트 해 보기」 uses when the session has no `vive-landing-page`.
- **Round 3 J** (`j3-forks-r3.html`, 83,891 B): linked by the final hub's 「3차 (보관)」 section.
- **Round 1** (10 pages, 524,531 B): linked by the hub's 「1차 후보 (보관)」 section with verdicts; they document the rejected directions the owner judged. Keep.
- Specs: `BRIEF.md`, `BRIEF2.md`, `BRIEF3.md` (60,096 B) — the only written specs of each round; keep.
- Protocol tools (`tools/host.html`, `mock-stage.html`, `protocol-test.mjs`, `chain.mjs`, `shot.mjs`, `hub-shot.mjs` — 23,080 B): the executable spec of the window protocol; keep. They load Playwright from the absolute path `/Users/woohyeon/Local/ViveTest/node_modules/playwright` — this breaks once the repo is rebuilt from scratch without that dependency.
- Regression scripts worth keeping from `shots/` (≈ 53 KB): `j3-revisit.mjs` (7,395), `j3-edge.mjs` (9,263), `j3-run-all.sh` (2,907), `l3-run.mjs` (15,822), `l3-header-check.mjs` (4,294), `l3-final.sh` (1,439), `d3-l3-restart.mjs` (3,814), `i3-l3-restart.mjs` (2,679), `i3-final.sh` (4,778), `_contact.mjs` (1,108) — they encode the arrival-guard, one-step-revisit and window-header contracts as runnable checks.
- Optional: `index-r1.html`, `index-r2.html` (72,526 B; old hubs, not linked by the final hub); `_share-test.html` (3,048 B; share harness).

### 8.4 Exclude

`shots/` (1.9 GB; 3,029 PNGs + logs; only the scripts above are worth anything), `_r3-backup/` (452 KB; pre-final snapshot = what V3 published), `jdir/` (143 MB; J direction panel: `j-dir-a/b/c.html` + `j3-base.html` + `l3-deck-ref.html` = 454,452 B, `jdir/ref/` 5.4 MB PNGs, `jdir/shots/` 137 MB — the decision and scores are recorded in WF `wf_333ec27a-e26.json`; keep only if the rejected J directions must stay viewable, then `jdir/shared/` 96 KB is also needed).

### 8.5 Hub internal links

- Final draft `_hub-body.html`: `l3-deck.html` (launcher; wide screens show it in a phone-frame iframe, phones navigate; override buttons set `vive-stage-override`), `i3-split.html`, `j3-forks.html`, `d3-story.html`, `v-vote.html`, demo cards → `i3-split.html` / `d3-story.html` after writing a `vive-handoff` for `demo-three` / `demo-four`; archives `j3-forks-r3.html`; `l2-vibe-deck.html#expand`, `l2-vibe-deck.html#flip`, `i2-split.html#palette`, `i2-split.html#rail`, `j2-forks.html`, `d2-story.html`; `b-vibe-feed.html`, `e-living-paper.html`, `a-swipe-deck.html`, `h-constellation.html`, `g-chat-landing.html`, `f-tactile-playground.html`, `i-split-arena.html`, `j-forks-path.html`, `d-story-flow.html`, `c-aura-flow.html`; consent reset clears `vive-consent`.
- Current `index.html` (round 3): the same minus `j3-forks-r3.html` and the demo cards.
- Other internal references: every `Proto.info` sheet links `index.html` (proto.js:131); `share.js` opens `v-vote.html#preview` in an iframe (share.js:456); `shell.js` names `i3-split.html`, `j3-forks.html`, `d3-story.html`, `l3-deck.html`.

### 8.6 Network, fonts, device APIs

- Verified with a headless Chromium probe over `file://` (390×844, dark, 2.5s idle; probe script in this session's scratchpad, nothing written into `MOCK/`): all 22 pages (index, 10 round-1, 4 round-2, 5 final incl. `v-vote`, `j3-forks-r3`, `_share-test`) made **zero non-file requests** and logged **zero console/page errors**; each loaded only its `shared/*` files.
- No CDN, no web fonts (Pretendard named, not loaded), no libraries; images are canvas/SVG/`data:`/`blob:` only. The only absolute URL is the fake share link `https://vivetest.app/v/…` (clipboard text, never fetched).
- Device APIs (vibration, orientation, Web Share, downloads) are simulated because the artifact frame blocks them (BRIEF.md:55).

### 8.7 Published artifact

`https://claude.ai/artifact/LPuzkZHX6FTcYwJJa8Vja3` — Version 3, 29 files (0.3). Once V4 is published it becomes a second durable copy of the final design, but it is private, lives outside git, and is downloadable only through the Artifact tool (`read` with `paths`).

## 9. Repo findings from the prototype session (not prototype decisions, relevant to the rebuild)

From DLG:352–362 (session verified in code, not by execution unless stated):

1. 「다시하기」 within 30 minutes can resume a finished run — no run clear on result entry (`clearActiveRun` 0 calls; no `'result_entry_committed'` cleanup).
2. qmbti Q6 poles look inverted (`src/features/test/fixtures/questions/qmbti.ts:62`).
3. EN consent copy 「Nothing you answer is sent.」 overstates (A/B choices are sent after consent; `src/features/telemetry/types.ts:57`).
4. `AGENTS.md` lists `motion@12.34.0`, absent from `package.json`.
5. Theme transition still 2,500ms (`src/features/gnb/hooks/theme-transition.ts:4`).
6. Layer order differs between the design spec rule 1 and `req-landing-interaction.md:182`.
7. `next/og` ImageResponse flaw 16.2.0–16.3.5; repo on 16.2.4.
8. Phone-sheet answer entry defect (portal-rendered answers) was fixed and landed as `20f973a` with L59 in `docs/LESSONS_LEARNED.md` (DLG:336–345).

## Appendix A — owner feedback forms, verbatim

Each block is verbatim from DLG with the source line breaks kept byte-for-byte (the owner pasted these forms into the prototype session). Round 1 = DLG:383–691, round 2 = DLG:1170–1301, round 3 = DLG:2104–2202.

### A.1 Round 1 (2026-09-24T15:51Z)

````md
# ViveTest 모바일 인터랙션 후보 피드백

- 본 환경: [x] 폰 [x] 데스크톱 미리보기
- 테마: [ ] 라이트 [x] 다크

## 1. 안별 답변 — 랜딩

### A 스와이프 덱

- 넘기는 것이 「답하기」라는 걸 언제 알았나요? 

> 끝까지 몰랐다

- 왼쪽이 A, 오른쪽이 B 라는 게 헷갈린 적이 있나요?

> 끝까지 헷갈렸다

- 뜻하지 않게 넘겨 버린 적이 있나요? 그때 되돌리고 싶었나요?

> 네

- 위로 튕겨 다른 테스트의 질문으로 건너뛰는 동작을 스스로 찾았나요?

> 아니오

- 첫 화면에서 질문부터 받는 것과, 지금처럼 테스트를 먼저 고르는 것 중 어느 쪽이 좋나요? 왜 그런가요?

> 테스트를 먼저 고르는 것. 사용자 의향을 묻지 않고 질문을 하는건 바람직하지 않음

- 누른 채 움직일 때 반짝이는 반사광은?

> UX 가 너무 헷갈려서 여러 효과를 가늠할 수 없는 상황

- 테스트 안에서도 카드를 넘기며 답하는 게 좋았나요, 랜딩에서만 좋았나요?

> 모두 이상하고 거슬렸습니다.
> 제대로 사용하라면 테스트 단위로 랜딩에서 브라우징할 때 쓰는 것이 유일하게 적절하게 활용 가능한 방향입니다.
> 랜딩에서 테스트 단위로 좌우 스와이프하면서 브라우징하고, 문항 선택은 탭으로 하는 것이 더 자연스럽습니다.
> 지금처럼 문항으로 답할 때 쓰는 것은 아주 어색하고 UX 상 이해도 불가해 수용하기 어려운 수준입니다.
- **판정**: 조각만 가져가기 - 랜딩에서 카드 단위 좌우스와이프로 테스트 단위 탐색 (답변 탭 전까지만)

### B 바이브 피드

- 세로로 한 장씩 넘기는 피드가 이 사이트에 어울렸나요?

> 잘 어울린다

- 한 화면에 하나씩이라 전체를 훑기 답답하지 않았나요? 목록 버튼을 찾았나요?

> 조금 답답했습니다.
> 목록 버튼도 아주 나중이 되서야 2~3번 방문 후 알아챘습니다.

- 오른쪽 점을 눌러 원하는 화면으로 바로 가는 걸 알아봤나요?

> 아니오
> 그런데, 점을 누르는 인터랙션은 (1) 모바일에서 탭 영역 최소 크기 확보 불가로 부적절하고 (2) 누른다고 하더라도 어떤 컨텐츠인지 어포던스나 힌트가 전혀 없어 쓸모없습니다.

- 배경 색이 흐르듯 움직였나요? 그 움직임이 분위기를 살렸나요, 글 읽기를 방해했나요?

> 배경색 흐름 자연스러웠고, 분위기를 잘 살렸으며 읽기를 방해하지 않았습니다.

- 화면 안에서 바로 첫 질문에 답해 들어가는 흐름이 자연스러웠나요?

> 자연스러웠습니다.

- 답을 누른 뒤 색이 번지며 넘어가는 전환은? [ ] 기대감을 준다 [ ] 적당하다 [ ] 과하다

> 적당하다.
> 그런데 답을 누른 뒤 넘어간 테스트 페이지에서 타이틀과 질문, 진행률이 화면 vertical center 표시된 부분은 어색합니다.
> 그리고 테스트 페이지에서의 레이아웃도 타이틀과 "랜딩에서 고른 답:..." 등 배치과 폰트 크기 등이 어색합니다. 만약 이 안이 최종 결정된다면 테스트 페이지까지 좀 더 최적화가 필요합니다.

- **판정**: 위 피드백 반영 & 채택

### E 살아있는 종이 (기준선)

- 지금 사이트와 달라진 점을 알아챘나요? 무엇이 먼저 눈에 띄었나요?

> 스크롤 시 썸네일 애니메이션
> 카드 탭 시 filled 효과

- 달라진 느낌은?

> 조금 나아졌다.

- 이 정도 다듬기로 목표에 충분한가요?

> 부족하지만 폴백으로 고려 가능 (이 프로토타이핑의 목적이 이 기존 안이 너무 밋밋하고 임팩트, 인상 깊은 점이 없어서 하는 것이므로)

- 카드를 눌렀을 때 잉크처럼 번지고 눌리는 느낌이 손에 닿았나요? →

> 네

- 시트가 테스트 화면으로 이어지는 연결이 자연스러웠나요?

> 네 랜딩에서 A/B 선택 후 테스트 페이지로 진입하는 트랜지션이 아주 적절하고 마음에 듭니다.

- 손잡이를 끌어 내려 시트를 닫을 수 있다는 걸 알았나요?

> 아니오
> 가능하더라도, 드래그는 UX 상 사용자 주의와 노력을 많이 필요로하는 인터랙션이므로 가급적 피하고, 여기서는 바깥 영역 탭으로 닫히는 인터랙션만으로 충분합니다.

- 테마를 바꿀 때 원형으로 번지는 전환은?

> 있어도 그만

- 다른 안들과 견줘 이 안이 더 나은 점이 있다면? →

> 가장 무난하고 안정적이지만, 애초에 이 프로토타이핑 요청한 목적이 이 안 보다 더 창의적이고 시선을 이끌 요소가 필요해서이기 때문에 이 안이 최종 확정될 가능성은 아주 낮아보입니다.

### F 촉감 놀이터

이 안은 인터랙션이나 모션 등 모든 요소가 수용할 수 없는 안입니다.
유일하게 살릴 수 있는 인터랙션은 랜딩 <-> 테스트 화면 트랜지션입니다.
이 안을 살릴 수 없는 이유는 여러 테스트를 나열한 방법이 직관적이지 못하기 때문입니다.
토큰, 장난감 요소를 테스트로 인지하는데 시간이 한참 걸렸습니다.

- **판정**: 탈락

### G 대화형 랜딩

시도는 좋았지만 요즘 대화형 UI 가 너무 흔해서 창의적인 면, 인상을 줄 수 있는 안으로는 부적절합니다.
그리고 테스트 과정에서 이전 문항으로 되돌아갈 때도 비가역 순차적으로 진행되는 대화형 UI 와 잘 부합되도록 UX/UI 구현이 어려울 것 같아 탈락입니다.

- **판정**: 탈락

### H 별자리 지도

- 하늘을 끌고 벌려 둘러보는 게? 

> 그저 그랬다

- 별 하나가 무엇인지(어떤 테스트·글인지) 알아보기 쉬웠나요?

> 아니오

- 분류별로 별자리가 모여 있다는 게 이해됐나요?

> 아니오

- 별을 눌러 그리로 날아가는 연출이 기대감을 줬나요, 기다림이었나요?

> 기대감을 주고, 적절했습니다. 왜냐하면 물리적으로 위치를 오가면서 테스트가 진행되고 다시 랜딩으로 돌아갈 때에도 해당 위치로 이동하기 때문에 테스트 간 이동 시 아주 직관적으로 이해가 되었습니다.

- 하늘이 비어 보였나요? 테스트가 몇 개쯤 있어야 살아날 것 같나요?

> 테스트가 더 있어도 살리기 어려울 것 같습니다. 왜냐하면 테스트가 이렇게 비정형으로 흩어져있는 구조로는 앞으로 여러 테스트가 추가되었을 때 직관적으로, 빠르게 브라우정이 어렵기 때문입니다.
> 이 안은 결과적으로 배경이 먼 곳과 가까운 곳의 시차를 두고 드래그 시 트랜지션을 둔 점 1개만 채택할 수 있고 (다른 안에 흡수 등) 나머지는 탈락입니다.

- **판정**: 탈락 (단 원근감 살리는 트랜지션은 무리하지 말고 다른 안에 흡수 가능한지 정도만 추가 검토 해주세요)

## 2. 안별 답변 — 테스트 흐름

### C 오라

- 오라가 살아 있듯 일렁였나요, 멈춘 그림처럼 보였나요?

> 네

- 답할 때마다 오라가 바뀌는 걸 알아챘나요? 내 답과 이어진다고 느꼈나요? →

> 네, 하지만 너무 과하게 느껴졌습니다.

- 완성된 오라를?

> 별 감흥 없다

- 오라 때문에 질문 읽기가 방해된 순간이 있었나요?

> 아니오

- 손가락으로 오라를 늘여 보는 놀이는?

> 있는 줄 몰랐고, 해봐도 크게 재미가 없다.
> 테스트 과정에서는 문항 답변에 더 집중해야하고, 이 안 처럼 테스트 문항 선택 외 다른 요소에 인터랙션, 모션 적용은 금지합니다. (배경 색 등 효과 적용은 허용, 다른 인터랙티브 요소를 이 안처럼 새로 만들어 추가하는 것만 금지)

- **판정**: 탈락

### D 스토리 플로우

- 스토리처럼 한 장씩 넘어가는 방식이?

> 무난하다.
> 그리고 이 프로젝트의 여러 테스트를 공유하는 기능으로 바이럴 확산을 기대하는데, 이 때 아주 적절한 배치와 UI 로 보이므로 채택하고 다른 안에도 이런 공유 기능이 추가되는게 좋겠습니다.
> 단, 지금처럼 이미지 공유보다는 동적인 페이지로 공유하는 방식을 1순위로 고려했지만
> 릴스, 인스타그램 스토리 등 공유를 고려하면 제안한 카드 형태도 적절해보입니다.

- 답하면 카드가 뒤집혀 보여 주는 한 줄 메모는?

> 탈락.
> 뒤집혀 보여지는 순간이 아주 찰나인데, 이 때 보여주는 정보는 확인 조차 불가한 수준
> 그리고 뒤집혀서 이 정보 뿐만 아니라 뒤집한 바 하단에 progress bar 가 그 짧은 시간 동안 차오르는데 이 역시 불필요하고 너무 과한 효과입니다.

- 9:16 질문 카드를 스토리에 올릴 만한가요? 무엇이 더 있어야 하나요?

> 내용과 구성이 내가 SNS 에 공유하고, 보는 사람 (독자) 는 올린 사람에 대해 대신 투표하는 흐름에 맞춰 포맷과 메시지 등이 조금 더 개선되는게 좋겠습니다.
> "당신이라면?" 은 SNS 팔로우한 지인들이 답하는 것에 더 적합한 문구인데, 공유를 통해 확산할 때 최초 공유하는 사용자 입장에서 더 이득이 되는 상황을 발굴하자면 이렇습니다. >
> 내가 답하기 어려운 질문을 올려 다른 사람들이 대신 A/B 투표해주기

- 테스트 도중에 공유하는 게 자연스러운가요, 결과를 본 뒤에만 하고 싶은가요?

> 테스트 도중에도 자연스럽고 꼭 필요합니다. 단, 공유 전/후 테스트 이탈되지 않도록 훨씬 더 정교한 UX/UI/트랜지션 설계가 필요합니다.

- 빈 곳을 길게 눌러 배경을 멈출 수 있다는 걸 알았나요? 필요했나요? →

> 아니도. 굳이 필요하지 않습니다.

- 추가 피드백

> 선택지 탭과 <이전 버튼만으로 과거 문항 이동을 제한한게 아쉽습니다.
> 배경을 누르고 좌우스와이프(드래그) 하면 문항 단위 이동이 되도록 보완하는 안을 이 `스토리 플로우` 를 베이스로 추가 적용 검토해주세요.

- **판정**: 위 피드백 반영 & 채택

### I 반반 화면

- 경계를 끌어서 답한다는 걸 언제 알았나요?

> 보자마자

- 경계를 끄는 방향이 생각한 대로였나요? 반대로 끌 것 같았던 순간이 있었나요? →

> 정확히 반대였습니다.
> 더군다나 문구가 "놓으면 이 답으로" 메시지가 내가 드래그해서 화면 밖으로 밀려나는 영역에 표시되는데, 메시지 배치 위치가 정 반대로 잘못 놓인 것 같습니다.
> 화면을 차지하는 영역의 크기를 통해 내가 선택했다는 것을 직관적으로 드러내기 때문에 아주 마음에 드는데, "놓으면 이 답으로" 메시지가 혼동하게 만드는 요소로 작용했습니다.
> 차라리 드래그했을 때 영역을 많이 차지하는 선택지에 텍스트 등에 변화를 주지 않고, 영역이 작아지는 선택지의 텍스트를 지금처럼 작아지면서 희미하게 투명도 조절하는 형태로 더 직관적으로 표현하는 방안 검토해주세요.

- 살짝 끌었다 놓았을 때 출렁이며 돌아오는 반응은?

> 손맛 있다

- 색이 화면을 덮는 순간은?

> 시원하다

- 끌기 대신 한쪽 면을 탭해서 답해 봤나요? 어느 쪽이 편했나요?

> 안해봤고 나중에서야 알아챘는데, 탭과 드래그 모두 편했습니다.

- 위에 쌓이는 팔레트가 「나만의 결과물」로 느껴졌나요? 남기고 싶었나요? →

> 네, 잘 느껴졌고 남기고 싶었습니다.
> 단, 상단의 horizontal progress 는 이 컨셉에서는 오히려 거슬리는 요소로 작용했습니다. 
> 왜냐하면 화면을 위아래 절반 분할한 것이 이 안의 특징인데 화면 위 일부를 차지해서 방해되는 요소로 작용했습니다.
> 이 안에서 progress bar 는 우측에 vertical 로 표현하는 방안을 검토해주세요.
> 단, vertical 표션 시 팔레트에 쌓이는 요소와 효과, 배치 등을 적절히 잘 조화 이루게 고민해야합니다. (필요하면 팔레트와 통합하는 것도 좋으니 팔레트 틍합 / vertical progress 2개 안으로 분리해서 시도하고 보여주세요.)

- 마지막 제출 이후 화면과 효과

> 마지막 제출 이후 트랜지션은 지금의 형태는 마음에 안드는데, 구체적인 피드백은 테스트 플로우 최종 확정 후, 결과 페이지까지 이어지는 부분의 피드백을 추가로 나중에 제공하겠습니다.

- **판정**: 위 피드백 반영 & 채택

### J 갈림길

- 길을 고른다는 비유가 질문들과 잘 어울렸나요?

> 네

- 어느 길이 어떤 답인지(왼쪽 A · 오른쪽 B) 헷갈린 적이 있나요?

> 아니오. 아주 직관적이었습니다.

- 카메라가 길을 따라 달리는 동안은?

> 즐거운 여정

- 어지럽거나 멀미 같은 느낌이 있었나요?

> 아니오

- 끝에서 지나온 경로 전체를 볼 때? [ ] 의미 있다 [ ] 예쁘지만 그만 [ ] 별 감흥 없다

> 

- 그 경로 그림을 공유하고 싶었나요? →

> 네

- 최종 제출 화면에서 피드백

> 최종 제출 단계에서 마지막 골목의 절반 정도를 이동한 채로 제출 버튼 탭을 기대하고 있습니다 현재.
> 그런데, 제출 버튼은 이 마지막 골목의 선택지 뒤편에 배치하는 것이 훨씬 더 직관적입니다.
> 왜냐하면 지금까지 여러 갈림길을 거치면서 선택지 택한 후 이동해왔기 때문에 마지막 관문은 마지막 갈림길 골목에서 선택지 뒤편으로 제출 버튼이 있는데 더 직관적이고, 이전의 흐름에 더 부합되는 컨셉입니다.
> 대신, 이렇게 했을 때 여전히 제출 버튼 누르기 전까지 반대편 선택지 누를 수 있어야하므로 지금처럼 화면 밖 좌/우 다른 선택지를 누를 수 있는 상태도 여전히 유지해야합니다.

- 이전 단계로 돌아갔을 때 효과

> 이전 문항으로 돌아가 선택지 탭하면 돌아가서 응답한 문항부터 마지막 응답한 문항까지 그냥 진행해서 중간 문항 답변을 변경할 수 없는 결함이 있습니다.

- 이전 단계 버튼 배치

> 지금처럼 좌측 하단보다, 골목길 가운데 정중앙 하단으로 옮기고 대신 눈에 좀 덜 띄는 단순 텍스트 혹은 배경을 회색으로 하는 등 살짝 덜 강조되는 형태도 괜찮을 것 같습니다.

- **판정**: 위 피드백 반영 & 채택

## 3. 비교와 종합

- 랜딩 순위 (1위 → 6위) →  B > E > A > H > G > F 
- 테스트 흐름 순위 (1위 → 4위) → I > J > D > C
- 함께 보고 싶은 조합: 아직 결정하지 못했습니다.
- 추천 조합 「랜딩 A + 테스트 흐름 C + D 의 9:16 공유 카드」에 대해: 반대 → 이유: C 는 탈락이고 D 는 너무 무난하고 밋밋합니다. 정적이고 안정되지만 마지막 폴백으로만 고려하겠습니다.
- 섞어 보고 싶은 조각 → 랜딩에서는 유일하게 통과한 B 안을 기본으로 하고 A 안 스와이프를 테스트 단위로 브라우징할 때에만 쓰는 안으로 살려주세요. / 테스트 흐름은 피드백 반영해서 I, J, D 3개안을 피드백 반영해서 조금 더 개선한 안으로 보여주세요. 그 다음 조합 안을 최종 결정하겠습니다.
- 처음 온 사람이 5초 안에 했으면 하는 행동: [ ] 바로 첫 질문에 답하기 [X] 테스트 골라 보기 [X] 이것저것 둘러보기
- 원하는 톤 (1 = 지금처럼 차분하고 단정하게 · 5 = 과감하고 화려하게) → 3 ~ 5 수준
- 이 사이트에 주로 올 사람은 누구이고, 그 사람에게 가장 통할 안은? → 대상 특정 불가하고, 가장 통할 안은 B + I 조합이지만 아직 조합 확정하지 않고 피드백 반영한 안을 살펴본 다음 결정하고 싶습니다.
- 어떤 안을 고르든 반드시 지켜야 할 것 (예: 빠른 시작, 읽기 쉬움) → 쉽게 테스트 브라우징 하고, 선택한 테스트로 진입해서 테스트를 하고, 그 과정에서 흥미를 유발하는 현란하고 창의적인 UX와 모션 제공하면서 동시에 직관성도 갖춰야 함
- 이것만은 안 된다 (예: 어지러움, 유치함) → H 나 F 처럼 직관성이 떨어지거나, C C 처럼 억지로 만든 것 같은, 기존 요구사항에 없던 불필요한 요소와 인터랙션 
- 더 보고 싶은 안이나 변형 → 랜딩에서 브라우징할 때 선택지가 처음부터 노출되지 않고, 최초 안처럼 탭 해서 뒷면이나 다른 적절한 방법으로 선택지가 그 뒤에 나오는 방향도 시도해봐주세요. 왜냐하면 최초 랜딩에서 브라우징할 때 선택지까지 노출하면 주어진 정보가 너무 많기 때문입니다.
- 다음 단계: 후보를 좁혀 목업 다듬기
````

### A.2 Round 2 (2026-09-25T04:30Z)

````md
# ViveTest 모바일 인터랙션 2차 피드백

- 본 환경: [ ] 폰 [X] 데스크톱 미리보기
- 테마: [ ] 라이트 [X] 다크

## 1. 랜딩 — 바이브 덱 (B + A)

- 좌우로 넘겨 테스트를 둘러본다는 걸 설명 없이 알았나요? 양옆 카드가 살짝 보이는 게 도움이 됐나요?
> 네 설명 없이 알았고, 도움이 되었습니다.

- 넘길 때 배경·장식·제목이 서로 다른 속도로 움직이는 원근감은?
> 네, 원근감이 좋아졌습니다.
- 전체 목록은 쉽게 찾았나요?
> 찾기 조금 어려웠어요
- 선택지를 여는 방식
> 뒤집기, 펼치기 거의 대등하지만 펼치기가 미세하게 더 낫습니다. 왜냐하면 안에 질문과 선택지 텍스트가 길어질 경우 표현할 공간이 넉넉하고 여유있기 때문입니다.
- 선택지가 처음부터 보이던 1차 B 와 비교하면?
> 훨씬 더 낫습니다. 요청한대로 최초 제시되는 정보 양이 절제되는 것이 더 바람직합니다.
> 대신, [첫 질문 보기] CTA 는 너무 눈에 띄어서 텍스트 버튼으로 하거나 덜 강조되는 방향으로 고민해주세요,
- 답을 누른 뒤 넘어가는 전환: [ ] 색이 번지기(뒤집기) [ ] 패널이 화면이 되기(펼치기)
> 펼치기로 한다면 1단계에서 카드가 펼쳐지고, Q1 응답 후 본 질문으로 넘어갈 때는 번지기 등 적절한 형태로 아주 살짝 튜닝이 필요해보입니다. (이어져온 효과 일관성, 최적화 관점에서)
- 테스트에서 「ViveTest」로 돌아왔을 때 같은 카드로 돌아오는 게 자연스러웠나요?
> 중간에 아주 찰나의 정적인 화면에서 화면에 아무 정보도 안보여지는게 어색했습니다.
> 가급적 정보들이 유지된 채로 사라지거나 하는 식으로 화면의 연속성이 효과/트랜지션 통해 표현되는게 좋겠습니다.

- **판정**: 위 피드백 반영 & 채택

## 2. 테스트 흐름

### I 반반 화면

- 이제 커지는 쪽이 답이 되는 방향이 생각한 대로였나요?
> 탭 시에는 지금처럼 탭 한 응답이 그대로 유지되는게 자연스럽습니다.
> 하지만, 탭 대신 드래그할 때에는 드래그를 통해 커진 영역의 텍스트가 드래그한 영역만큼 vertical center 로 dynamic 하게 움직이는게 더 자연스럽습니다.

- 이전 카드 펼치기 등과 인터랙션/UI 일관성
> Q1 에서 펼쳐진 카드에서 응답 선택은 흰색 round box 에 선택지가 있습니다.
> 반면 Q2 이후 반반화면에서는 드래그를 하는 `질문` 이 흰색 round box 에 표시되어 양쪽이 정 반대의 요소에 적용됩니다.
> 만약 반반화면을 채택한다면 Q1 펼쳐진 화면에서부터 뒤쪽 반반화면과의 UI 일관성을 고려해 최적화가 필요합니다.

- 작아지는 쪽 글자만 흐려지는 표현이 이해를 도왔나요?
> 네

- 진행률:
> 팔레트형이 압도적으로 훨씬 더 낫습니다.
> 왜냐하면 정보 요소가 bar, % 진행 으로 단순하기 때문입니다. (화면 복잡 요소 덜 존재)
> 반며 세로 막대형은 bar, 네모칸, 눈금자 등 요소가 너무 많아 복잡해보입니다.

- 오른쪽으로 모은 도구들(공유 · 진행률 · 이전)이 반반 화면을 방해하지 않았나요?
> 네 방해하지 않았습니다.

- 화면 내 요소 피드백
> 가운데 흰색 round box 에 제목, "고를 쪽을 끌어 넓히거나 눌러요" 안내문구 모두 제거해주세요. 
> 대신 제목은 제일 위 "ViveTest" 우측 빈 영역에 center align 으로 표시해주세요.

- **판정**: 위 피드백 반영 & 채택

### J 갈림길

- 마지막 골목 뒤편의 제출 관문이 자연스러웠나요? 반대편 표지판으로 바꾸기도 쉬웠나요?
> 네 자연스럽고 쉬웠어요 

- 이전으로 돌아가 답을 바꾸면 한 갈림길씩 나아가는 방식은?
> 기본적으로는 기대한 방향과 일치했지만, 중간에 멈추지 않고 건너뛰어서 불편했습니다.
> 예를 들어 Q5 응답 중 Q3 으로 돌아가 선택하면 Q4 에서 멈추지 않고 Q5 까지 바로 넘어갔습니다.
> 이전 문항으로 돌아가면 한 문항씩 순차 이동해야합니다.

- 가운데 아래로 옮긴 「이전」은?
> 좋습니다.

- 경로 공유 카드는 올릴 만한가요?
> 네

- **판정**: 위 피드백 반영 & 채택

### D 스토리 플로우

- 배경을 좌우로 끌어 문항을 오가는 게 자연스러웠나요?
> 아니오. 좌우로 끌 수 있다는 affordance 가 전혀 없어 예측하지 못하고 사용하지 못했습니다.
> 만약 이 인터랙션을 지원하려면 각 Q 문항 마다 좌우 여백을 둬서 문항 단위 이동 가능하다는 affordance 가 드러나야합니다.

- 아직 답하지 않은 문항 너머로는 넘어가지 않는 제한이 이해됐나요?
> 위와 같은 관점에서 이해 안되었습니다.

- 뒤집힘 메모를 뺀 지금의 흐름은?
> 훨씬 낫습니다.

- **판정**: 매력은 덜하지만 안정적인 점으로 인해 fallback 으로 두고싶습니다. motion 제거 등에서 이 안을 적용하는 방향 고려하겠습니다. 위 피드백 반영하고 폴백으로 채택합니다.

## 3. 친구에게 묻기 (세 흐름 공통)

- 테스트 도중 공유했다가 돌아올 때 흐름이 끊긴다고 느낀 순간이 있었나요?
> 아니오

- 「나 대신 골라 줘」 카드와 링크 문구가 올리고 싶은 모양인가요?
> 네

- 친구 화면(투표 → 나도 해 보기)의 흐름은?
> 괜찮았습니다.

- 질문 아래 모이는 친구 투표 표시는?
> 있어야 한다

## 4. 조합 결정

- 랜딩 선택지 여는 방식
> 펼치기

- 테스트 흐름: [ ] I 팔레트형 [ ] I 세로 막대형 [ ] J [ ] D

> I 팔레트형 채택
> J 위 피드백 반영해서 한 가지로 보유
> D 안은 모션 제거 시 폴백으로 채택

- 되돌아가 고치면 한 문항씩 나아가는 방식으로 제품 계약을 바꿀까요?

> 되돌아간 문항부터 한 단계식 이동

- 다음 단계

> 한 번 더 목업 다듬기

- 남은 요청 →

---

## 추가 피드백

여러 피드백을 제공하면서 이제 각 안의 완성도는 어느 정도 갖추어진 것 같습니다.
그런데, 랜딩+테스트 조합 시 Visual Consistency, Interaction Consistency 가 부족한게 사실입니다. 개별 안의 완성도는 이제 어느 정도 갖춰졌으니 일관성을 갖추는 작업이 필요합니다.

한 웹사이트 안에 I, J, D 모두 유지한다고 가정할 때 어떻게 해야 모두 한 서비스라고 느껴질 수 있도록 일관성을 갖출 수 있을지 고민해서 모든 안의 일관성 관점 개선도 함께 적용해주세요.
````

### A.3 Round 3 (2026-09-25T11:41Z)

````md
# ViveTest 모바일 인터랙션 3차 피드백

- 본 환경: [ ] 폰 [X] 데스크톱 미리보기
- 테마: [ ] 라이트 [X] 다크

## 1. 한 서비스로 느껴지나요

- 랜딩 → 반반 화면 → 랜딩 → 갈림길로 이어 봤을 때 한 사이트라고 느껴졌나요?

> 네, 이제 모두 한 서비스로 느껴집니다. 특히 Q1 프리뷰 질문의 UI 와 인터랙션이 이후에 일관되게 이어지는 점이 아주 마음에 듭니다.

- 상단 바 · 팔레트 레일 · 이전 · 안내 시트가 무대마다 같은 게 도움이 됐나요, 무대의 개성을 줄였나요?

> 각 안 마다 최적화가 필요합니다. 자세한 내용은 아래 개별 안 피드백에 기재하겠습니다.

- 테스트마다 무대를 다르게 배정하는 것(MBTI · 에겐테토 = 반반, 에너지 = 갈림길)은?

> 동의합니다. 단, 어떤 테스트에 어떤 무대를 적용할지는 최종 배포 시점에 다시 한번 고민하고 결정하고 이번에는 목업 최종 완성을 위한 최종 피드백으로 고려해주세요.

- **판정**: 이번 턴에서는 아주 마이너한 수정사항만 반영해 최종 채택

## 2. 랜딩 — 카드 속 무대

- 카드를 펼치면 그 안에서 첫 질문이 무대의 모습으로 열리는 방식은?
> 좋습니다.

- 첫 질문에 답한 뒤 카드가 화면 전체로 커지며 이어지는 전환은?
> 좋습니다.
> 단, 시작 전 안내 하단 바텀 시트는 화면 위를 덮는 모달 팝업/시트 형태로 변경되는게 더 바람직해보입니다. (모든 안 공통)
> 왜냐하면 이 메시지와 [시작] 버튼은 Q2 진입 전 필수로 해야하는 아주 중요한 고지의 메시지도 담고 있는데 (요구사항 참고, consent 미선택 Q1 진입 시 고지 함께 하고 있음) 이를 고려하면 optional 해보이는 바텀시트보다 화면을 좀 더 많이 덮는 UI 가 더 바람직합니다.

- ViveTest 로 돌아올 때 무대가 같은 카드로 줄어드는 전환은? 
> 네 잘 고쳐졌습니다.

- 덱 끝의 「모든 테스트와 읽을거리」 카드와 아래 목록 미리보기로 전체 목록을 쉽게 찾았나요?
> 네, 이전보다 더 나아졌습니다.

- 텍스트 버튼으로 낮춘 「첫 질문 보기」는?
> 훨씬 더 나아보입니다.

- **판정**: 전반적으로 만족스럽고 위 기재한 마이너한 피드백 몇가지만 개선 후 채택합니다.

## 3. 무대

### I 반반 화면

- 드래그할 때 커지는 쪽 글자가 가운데를 따라오는 움직임은?
> 자연스럽습니다.

- 어두운 반투명 라벨로 바꾼 질문과 상단 가운데 제목은?
> 모두 적절합니다.

- 추가 확장 고려
> 나중에 3지선다, 4지선다 응답형 테스트도 있을 수 있습니다.
> 필수는 아니지만, 이 때 활용 가능하도록 유연한 구조가 되거나 혹은 더 이상적으로는 3지/4지선다 유형에 적용 시 화면도 목업으로 제작되어 볼 수 있으면 좋겠습니다.

- **판정**: 전반적으로 만족스럽습니다. 채택합니다.

### J 갈림길

- 되돌아가 고친 뒤 한 갈림길씩 멈추나요? 여전히 건너뛰면 어떤 순서로 눌렀는지 적어 주세요
> 되돌아가 고친 뒤 한 갈림길씩 멈추도록 잘 고쳐졌습니다.

- 테스트 색을 띤 저녁 하늘은?
> 크게 체감되지는 않습니다.

- [이전] 버튼 위치
> 중앙 하단에 고정되있는데, 3D Perspective 구현된 현재의 UI 특성 상 길의 중앙 하단이 항상 화면 중앙 horizontal center 와 일치하지 않습니다. [이전] 버튼의 가장 이상적인 위치는 길 정가운데인데, 지금은 무조건 화면 너비 horizontal center 에 고정되어 있어서 길의 중앙과 미묘하게 조금씩 어긋납니다.
> 길 중앙으로 이동에 배치되도록 수정하고, 이 때 3D 경로 진행하면서 길이 바뀌는 위치 변화에 맞춰 [이전] 버튼 위치도 동적으로 이동하면 더할나위 없이 좋겠습니다.

- Visual Style 추가 고민
> 이제 인터랙션 등 대부분 요소가 거의 완벽하게 다듬어졌는데, 여전히 다른 안들과 함께 두고 볼 때 Visual Style 이 여전히 이질감이 조금 있습니다. 다른 안과 이 서비스 내에서 공존한다고 가정할 때 같은 서비스로 흡수된 것 처럼 보이도록 이 안의 시각적 스타일만 조금 더 고민해주세요.

- **판정**: 위 마이너한 피드백과 Visual Style 만 개선하고 채택

### D 스토리 (모션 줄이기 폴백)

- 양옆에 보이는 카드로 좌우 이동을 알아챘나요?
> 네, 알아챘습니다.

- 잠긴 카드(「답하면 열려요」)로 넘어갈 수 없는 이유가 이해됐나요?
> 네 이해했습니다.

- Progress Bar UI 수정
> Vertical Bar 는 이 안에서는 안어울립니다.
> 기존처럼 상단 edge 부분에 horizontal bar 가 더 적합합니다. 
> Vertical Bar 는 갈림길과 1:1 분할 반반화면에 잘 어울리는 Progress Bar UI 입니다.

- **판정**: 가장 정적인 안으로 위 피드백만 적용한 상태로 최종 채택합니다.

## 4. 다음 단계

한 번 더 목업 다듬기
- 남은 요청 → 아주 완성도 높아졌고 대부분 만족스러운데 위에 서술한 마이너한 수정사항 몇가지만 적용하면 되겠습니다.
- 각각의 안이 모두 마음에 들어서 3개안 (반반화면, 갈림길, 스토리) 모두 이 서비스 안에서 사용하겠습니다.
- 대신, 갈림길 1개만 Visual Style 과 톤앤매너 시각적 일관성을 맞추는 작업만 하면 모두 사용 가능해보입니다.
- 완성된 후에는 각 테스트 별로 어떤 타입을 적용할지를 사전에 정의하겠습니다.

이번 요청에 따라 마지막으로 최종 개정을 한번만 더 해주세요.
````

Owner messages during the final revision (verbatim): DLG:2406 「J 가 기대보다 아주 오래 걸리는데, 구현에 문제가 있는건 아닌지 점검하고 문제 없다면 더 기다리겠습니다.」 · DLG:2408 「시간이 아무리 오래 걸려도 좋으니 최고의 품질 하나만 고려해서 작업을 이어가주세요.」 · DLG:2437 「아직도 정상 진행중인게 맞나요? 예상 완료 시간 궁금합니다.」

## Appendix B — prototype authors' notes, verbatim (`changed` = what the last feedback changed; `realBuild` = how the real product should do it)

Extracted programmatically from each page's `Proto.info({...})` call (strings verbatim). Final pages first, then the round-2 archive, then the round-1 configs in `BRIEF.md`.

### B.1 Landing `l3-deck.html`

`changed`:

- 시작 전 안내가 화면 아래 시트에서 화면 가운데의 모달로 바뀌었어요 — 뒤를 흐리게 덮어서, 2번 문항 전에 꼭 거쳐야 하는 단계로 보여요 (모든 무대 공통)
- 분석 동의를 아직 고르지 않았다면 그 모달에 고지 문구와 [모두 허용하고 시작] · [거부하고 중단](동의 필수 테스트) 또는 [거부하고 시작](동의 선택 테스트)이 함께 나와요. 거부하고 중단을 누르면 테스트 화면이 같은 카드로 줄어들며 랜딩으로 돌아와요
- 에겐-테토처럼 사전 질문이 있는 테스트는 모달에서 [다음] → 사전 질문(나의 성별은) → [시작] 두 단계예요
- 랜딩 자체의 카드 · 펼친 창 · 커지기 · 같은 카드로 돌아오기는 3차 그대로예요 (3차 판정: 좋음)

`realBuild`:

- 창 구조 = 앱 셸 하나에 테스트 라우트를 층으로 그리기예요. 랜딩(/{locale})은 마운트된 채 두고 /{locale}/test/{variant} 를 그 위 층에 렌더해요(Next 의 parallel + intercepting route, 예: @window/(.)test/[variant]). 무대 I·J·D 는 iframe 이 아니라 그 라우트의 컴포넌트이고, 목업의 메시지(vive:window·q1·full·back)는 props·콜백이 돼요
- 창이 열린 동안은 랜딩의 확장이에요 — req-landing-interaction §8.5 의 닫기 경로(시스템 뒤로가기 포함)·복귀 정확성을 이 층이 지키고, 「폰 확장 = 바텀시트」 조항은 「펼친 카드 창」으로 개정해야 해요(스와이프 다운 닫기는 소유자 규칙상 없음)
- Q1 답 = §8.6 전환 시작이에요. landing ingress 저장(req-landing §13.4)은 그대로 두고, 창이 커지는 동안 /test/{variant} 로 history push, 다 커진 순간을 destination-ready 로 봐요(§13.3 의 1600ms 안). 랜딩이 계속 떠 있으니 return scroll 기록 없이 복귀가 구조로 정확해요
- 무대 코드는 라우트 청크로 나눠 카드가 멈추면 prefetch 해요(목업의 0.35초 미리 불러오기). 늦으면 스켈레톤, 실패하면 기본 Q1 — 목업의 3초 대체와 같은 자리예요
- ViveTest 로 돌아오는 축소는 공유 요소 전환(View Transitions)으로 만들 수 있어요. /test/{variant} 로 바로 들어오면 전체 모드로 시작해요
- 디자인 시스템의 스프링 오버슈트·패럴랙스·틸트·자동 재생 금지 조항 개정은 2차와 같이 필요해요 · 스와이프마다 버튼 대안 유지(WCAG 2.5.1/2.5.7)

### B.2 Stage I `i3-split.html`

`changed`:

- 시작 전 안내 → 아래에서 올라오던 시트가 화면 가운데 모달로 바뀌었어요. 동의를 고르지 않았으면 고지 문구와 [모두 허용하고 시작] · [거부하고 중단]이 함께 나오고, [거부하고 중단]은 랜딩으로 돌아가요
- 모달 뒤 2번 문항 → 바텀 시트 때문에 아래 답(B) 글자만 따로 숨기던 처리를 없앴어요. 흐린 배경 너머로 2번 문항이 그대로 기다려요
- 3지·4지선다 → 같은 무대가 문항의 답 수(2~4)를 데이터에서 읽어요. 답이 셋·넷이면 화면이 위에서 아래로 A·B·C·D 띠로 나뉘고, 허브의 「주말 충전법 · 예시」(3지) · 「여행 스타일 · 예시」(4지)로 볼 수 있어요
- 띠 끌기 → 잡은 띠에서 끌기 시작한 쪽 경계가 손가락을 1:1로 따라오고, 그 너머 띠들은 함께 눌려 작아지고 흐려져요. 넓어지는 띠의 글자는 넓어진 영역의 가운데를 따라와요. 맨 위·맨 아래 띠를 바깥쪽으로 끌면 반반 화면처럼 하나뿐인 경계가 따라와요
- 고르기 → 탭한 띠의 답 글자는 제자리에 있고, 가운데 띠는 위아래 양쪽으로 피어나 다음 문항이 돼요. 마지막 문항은 고른 띠가 절반까지 열리고 제출을 기다려요
- 질문 라벨 → 답이 셋·넷이면 어두운 유리 라벨이 띠 묶음 맨 위에 앉아요 — 답 글자를 가리지 않고 질문 → A → B → C → D 순서로 읽혀요
- 색 → 3·4지선다는 테스트 대표색에서 색상환을 고르게 나눈 색을 쓰고, 이웃한 띠는 짙음·밝음이 번갈아 확실히 갈려요. 글자 대비는 모두 4.5:1 이상
- 키보드 → 1~4 또는 A~D 로 바로 답해요. 답이 셋·넷이면 ↑↓ 로 답 사이를 옮기고 Enter 로 골라요. 답이 둘이면 지금처럼 ↑ 는 A, ↓ 는 B
- 화면 읽기 → 답을 읽을 때 A·B·C·D 글자가 함께 읽혀요
- 답이 둘인 화면 → 모양 · 끌기 · 탭 모두 그대로예요

`realBuild`:

- §4.3 과 다르게 갔어요 — 되돌아가 답을 바꾸면 첫 미응답 문항으로 건너뛰지 않고 한 칸만 앞으로 가요(소유자: 건너뛰기는 결함). 계약 개정이 필요해요
- 진행률은 막대+퍼센트 계약 그대로예요 — 팔레트 레일이 막대이고 퍼센트가 그 끝을 따라가요
- 랜딩 카드 안에 문항 화면을 띄우는 창은 목업에서만 iframe 이에요 — 실제로는 같은 페이지 안에서 컴포넌트가 이어져요
- 테스트마다 대표색과 문항별 색 세트를 정의해야 해요 — 1번 문항은 카드의 대표색에서 시작해요. 3·4지선다는 목업이 대표색에서 계산한 색이라 실제 테스트는 색 세트를 따로 정해야 해요
- 답 수(2~4)는 문항 데이터에서 읽어요 — 3·4지선다 문항형은 문항 스키마와 채점 계약에 아직 없어요
- 질문 공유는 텔레메트리 계약 변경(새 이벤트)이 필요해요
- canvas 2D 로 라이브러리 없이 가능, 좁아진 띠에 긴 답(12개 언어)이 들어가는지 검증이 필요해요

### B.3 Stage J `j3-forks.html` (live file, as of 02:19:58 KST)

`changed`:

- 「이전」이 이제 화면 가운데가 아니라 길 한가운데에 놓여요 — 원근 때문에 길 가운데와 화면 가운데가 어긋나던 것을 고쳐, 멈춰 있을 때·표지판 쪽으로 기울일 때·달릴 때·되돌아갈 때 매 프레임 길 중심을 따라 움직여요. 마지막 골목에서 관문 쪽으로 몸을 틀 때도 카메라가 옆으로 살짝 비켜서, 발밑 길이 화면 안에 남고 「이전」이 늘 길 위에 있어요(길 중심과의 차이: 멈춤·기울임·관문 앞 1px 이내, 달리고 되돌아가는 동안 2.6px 이내 — 두 길이 겹치는 갈림점을 지나는 몇 프레임은 길 중심을 하나로 잴 수 없어 뺐어요)
- 움직이는 「이전」도 누르기 쉬워요 — 버튼이 길을 따라 움직이는 동안에는 방금 있던 자리와 손가락이 누르고 있는 자리도 「이전」으로 눌려요. 같은 자리를 빠르게 두 번 누르거나, 달리는 중에 원래 자리를 누르거나, 누른 채 버튼이 미끄러져도 놓치지 않아요(움직임을 줄인 설정에서도 같아요)
- 첫 갈림길의 안내 문구(좌우로 밀거나…)가 「이전」 바로 위, 같은 세로줄에 놓여요
- 세계 전체를 랜딩 카드의 재료로 다시 칠했어요 — 하늘은 그 테스트 카드의 표지 그대로(같은 색 덩어리와 필름 입자)라 테스트 색이 뚜렷하게 느껴지고, 땅은 같은 색 계열의 평평한 층이에요. 해·나무·노을빛 대신 카드의 빛 색이 이 세계의 빛이에요. 랜딩 카드 안(1번 문항)에서는 질문 뒤 어두운 막을 없애 카드 머리띠가 하늘로 그대로 이어져요
- 랜딩 카드와 이 세계가 공통 셸의 색표 하나에서 칠해져, 두 곳의 색이 어긋날 수 없어요
- 표지판을 서비스의 답 모양에 맞췄어요 — 흰 면·진한 글씨·테스트 색 A/B 배지. 고른 답(마지막 갈림길, 지나가는 표지판)은 스토리·반반 화면처럼 테스트 기본색 면에 흰 글씨·흰 배지·흰 안쪽 테두리이고, 답 글씨는 다른 화면처럼 굵게 바꿨어요
- 물러나는 표지판(기울일 때 반대쪽, 마지막 갈림길에서 고르지 않은 쪽)은 반투명 회색 대신 이 테스트 색의 중간 톤 면(카드의 밝은 색과 표지 색을 섞은 색)이 돼요. 지나가는 표지판도 흐려지지 않고 제 길 끝으로 줄어들며 사라져요
- 갈래가 시작되는 이음매의 어두운 쐐기와 겹쳐서 밝아지던 띠를 없앴어요 — 길 가장자리가 갈림점에서 끊김 없이 이어지고, 옅어지는 길도 갈림점에서는 앞 길의 색으로 시작해 부드럽게 옅어져요
- 지나온 자취는 번진 빛 덩어리 대신 가는 선 하나예요 — 흰 심, 테스트의 짙은 색 테두리, 좁은 빛 번짐이라 밝아진 길 위에서도 선으로 읽혀요. 화면 아래 「이전」 근처에서는 선과 달릴 때 튀는 빛 알갱이가 길에 스며들어 조용해요
- 고르면 고르지 않은 길은 같은 색의 옅은 흔적으로 가라앉고, 고른 길은 0.7초 동안 다음 갈림길까지 밝아져요 — 반반 화면의 색 번짐과 같은 박자, 이 테스트의 색 안에서만. 밝아진 빛은 갈림점에 닿기 전에 원래 길 색으로 돌아가, 도착한 갈림점에 선이 남지 않아요
- 새 갈림길은 갈림점에서부터 두 갈래가 그려져 나가며 나타나요 — 랜딩 카드의 선이 그려지는 것처럼
- 표지판 기둥이 닿는 길 끝마다 작은 고리가 있어, 어느 표지판이 어느 길인지 가는 기둥만 보고 찾지 않아도 돼요. 길 끝이 화면 밖이면(마지막 갈림길의 고르지 않은 쪽) 기둥은 그쪽을 가리키는 짧은 토막으로 줄어요
- 길과 땅의 밝기 차이를 모든 테스트에서 키웠고(10분컷 MBTI·에겐-테토도 에너지 배분 점검과 같은 4.3:1), 먼 곳은 안개 대신 세 겹의 산등성이와 낮은 언덕이 보여 흐린 막이 아니라 장소로 읽혀요. 가까운 언덕은 땅에서 솟아나듯 아래쪽이 땅에 녹아요
- 시작 전 안내가 화면 가운데 창으로 바뀌었어요 — 동의 안내와 두 버튼(에너지 배분 점검은 「모두 허용하고 시작」「거부하고 시작」)이 함께 있고, 뒤의 갈림길은 그 자리에서 기다려요
- 되돌아가 고친 뒤 한 갈림길씩 멈추는 동작과 도착 가드, 마지막 골목의 제출 관문, 친구 투표·경로 공유는 그대로예요

`realBuild`:

- req-test.md §4.3 과 다르게 가요: 되돌아가 답하면 첫 미응답 문항으로 건너뛰지 않고 한 문항만 나아가요 — 오너가 그 건너뛰기를 「중간 문항 답변을 변경할 수 없는 결함」으로 봤어요. §4.3 개정이 필요해요
- 도착 가드(표지판이 다 선 뒤 350ms)는 150ms 연타 잠금과 별개의 새 계약이에요 — 자동 진행 화면 모두에 같은 값을 쓸지 정해야 해요
- 마지막 문항은 §4.4 그대로 — 기존 답이 있으면 선택된 채 그 골목에 들어가 있고, 제출 전까지 바꿀 수 있어요
- 제출은 화면에 고정된 버튼이 아니라 공간 속 관문에 달린 버튼이에요 — 포커스 순서·확대·긴 문구(12개 언어) 검증이 필요해요
- 질문 공유·경로 공유는 새 텔레메트리 이벤트와 투표를 모으는 링크 서버가 필요해요
- 「이전」을 길 중심에 두려면 매 프레임 투영 계산으로 위치를 셸에 넘겨요(placePrev) — 화면 가장자리와 레일 영역은 셸이 막고, 발밑 길이 그 범위를 벗어나면 카메라가 옆으로 비켜서요. 움직이는 동안 놓치는 탭이 없도록 이 목업은 버튼의 누름 영역을 방금 지나온 자리까지 넓혀요(투명한 확장, 포커스 표시는 버튼 그대로) — 실제 구현에서는 셸의 공용 버튼이 이 영역을 가져야 해요. 움직이는 동안의 확대 배율·스크린리더 안내 검증이 필요해요
- canvas 2D 원근 투영으로 라이브러리 없이 가능(약 4–7KB)

### B.4 Stage D `d3-story.html`

`changed`:

- 진행 막대를 예전처럼 위쪽 가장자리의 가로 막대로 되돌렸어요 — 답한 문항 카드 색이 왼쪽부터 한 칸씩 채워지고 끝에 %가 붙어요. 세로 팔레트 레일은 반반 화면·갈림길에만 남아요 (「Vertical Bar 는 이 안에서는 안어울립니다 … 상단 edge 부분에 horizontal bar 가 더 적합합니다」)
- 오른쪽 레일 자리로 비워 두던 여백이 없어져 카드가 화면 정가운데에 놓여요 — 3차에서 카드가 약 22px 왼쪽으로 치우쳤던 것이 사라졌고, 양옆 카드가 같은 폭(390 폭에서 40px)으로 보여요
- 랜딩의 펼친 창 안과 전체 화면에서 카드의 폭과 가로 위치가 같아서, 첫 답 뒤 창이 커질 때 카드는 위아래로만 늘어나요
- 양옆 카드 가장자리를 누르는 영역이 390 폭에서 58px, 360 폭에서 56px 로 넓어졌어요 (3차 약 36px · 권장 44px 이상). 카드를 가운데로 옮기며 생긴 양옆 여백을 쓴 것이라 새로 보이는 요소는 없고, 답 버튼과도 겹치지 않아요
- 시작 전 안내가 화면 가운데를 덮는 모달로 바뀌었어요(세 무대 공통). 동의를 아직 고르지 않았으면 고지와 [모두 허용하고 시작]·[거부하고 중단](에너지 배분 점검은 [거부하고 시작])이 함께 나와요. 안내 시트 위로 질문을 끌어올리던 움직임은 빼서, 카드는 모달 뒤에서 제자리에 머물러요 (「화면 위를 덮는 모달 팝업/시트 형태로 … consent 미선택 Q1 진입 시 고지」)
- [거부하고 중단]을 누르면 모달이 먼저 닫히고, ViveTest 를 누른 것처럼 랜딩의 그 카드로 돌아가요
- 3지·4지선다 문항도 같은 카드에 A–D 답 버튼으로 쌓여요 — 360×740 에서 긴 답도 카드 안에 들어가고, 키보드 1–4 · A–D 로도 골라요. 두 답 문항의 모습은 그대로예요. 아래 「주말 충전법 · 예시」, 「여행 스타일 · 예시」로 볼 수 있어요 (「3지선다, 4지선다 응답형 테스트도 있을 수 있습니다」)

`realBuild`:

- 앞 문항의 답을 바꾸면 딱 한 문항만 앞으로 가요 — req-test.md §4.3(다음 미답 문항으로 이동)에서 의도적으로 벗어난 것이라 계약 개정이 필요해요(「중간 문항 답변을 변경할 수 없는 결함」 지적)
- 모션 줄이기면 D 를 고르는 판단은 OS 의 prefers-reduced-motion 과 사이트 설정을 함께 봐야 해요. 테스트 도중 설정이 바뀌면 무대를 바꾸지 말고 D 안에서 슬라이드와 교차 페이드만 바꾸는 편이 안전해요
- 카드 덱은 Pointer Events 자체 구현이에요(touch-action: pan-y, 새 라이브러리 없음). 왼쪽 카드 가장자리 탭은 iOS Safari 의 화면 가장자리 뒤로가기 제스처와 겹치므로 실기기 검증이 필요해요
- 카드 가장자리 탭 영역은 폭 56–58px 이에요(360·390 폭). 「이전」 버튼과 ←/→ 키도 같은 이동을 해요
- 3지·4지선다는 문항에 있는 답의 수만큼 버튼을 그려요 — 실제로는 문항 스키마가 a·b 밖의 답(c·d)을 담을 수 있어야 하고, 친구 투표 집계도 답의 수만큼 세야 해요
- 랜딩의 펼친 카드 안에 무대를 띄우는 건 목업에서 iframe 으로 흉내 냈어요 — 실제로는 같은 문서 안의 공유 요소 전환(View Transitions)으로 만들어야 해요
- 질문 공유·친구 투표는 텔레메트리 이벤트와 투표 페이지·집계 API 가 새로 필요해요

### B.5 Friend page `v-vote.html`

`changed`:

- 답이 셋이나 넷인 질문도 받아요 — A부터 D까지 모든 답이 투표 칸으로 보이고, 투표하면 모든 답의 결과 막대가 함께 보여요
- 답이 셋이나 넷이면 한 화면에 모든 답과 「나도 이 테스트 해 보기」가 들어오도록 간격과 글자를 조금 줄였어요 (답이 둘인 질문은 그대로)
- 답이 셋이나 넷일 때 비율은 합이 100%가 되도록 맞췄어요
- 예시 테스트(주말 충전법 · 여행 스타일)에서 공유한 질문도 이 화면으로 열려요 — 완료 수 대신 「예시 테스트」라고 적어요

`realBuild`:

- 공유 링크마다 서버에 투표함이 필요해요 — 익명 집계, 중복 투표 방지, 만료 기간
- 링크 미리보기(OG) 이미지를 질문마다 만들려면 서버 이미지 생성이 필요하고, 그 전에 next/og 의 보안 결함을 고친 버전으로 올려야 해요
- 카카오톡·인스타그램 인앱 브라우저에서도 이 페이지가 그대로 열려야 해요 — 로그인 없이, 가벼운 한 화면으로

### B.6 Round-2 landing `l2-vibe-deck.html` (archive)

`changed`:

- 오른쪽 점 레일을 없앴어요 — 44px 이전·다음 버튼과, 누를 수 없는 위치 표시줄만 남겼어요
- 전체 보기는 아래로 내리면 나오는 목록이에요. 첫 화면 아래 끝에 목록 제목이 걸쳐 보여서 버튼을 찾지 않아도 돼요
- 좌우 스와이프는 테스트를 넘겨 보는 데만 써요 — 넘긴다고 답이 되지 않아요(A 안의 헷갈림·실수로 넘김 해소)
- 둘러볼 때는 선택지를 숨겼어요. 카드를 눌러야 뒷면(#flip) 또는 펼친 면(#expand)에 첫 질문이 나와요
- 답을 고르면 B 의 색 번짐으로 넘어가되, 어색했던 B 의 테스트 화면 대신 실제 테스트 흐름 페이지로 이어져요
- 별자리의 원근감은 끌 때만 배경·장식·제목이 조금씩 다른 속도로 움직이는 정도로 절제했어요
- 테스트 흐름에서 ViveTest 를 누르면 떠났던 그 카드로 색이 되감기며 돌아와요(별자리·촉감 놀이터의 왕복)
- 카드를 누르면 잉크가 번지듯 눌려요(살아있는 종이). 끌어서 닫는 손잡이는 없어요 — 바깥 탭·뒤로·닫기·Esc
- 첫 화면에서 한 번만 카드가 살짝 옆으로 밀렸다 돌아와 넘길 수 있다는 걸 알려요

`realBuild`:

- 폰의 카드 확장=바텀시트(req-landing-interaction §8.5)와 1열 카탈로그 결정을 다시 열어야 해요 — 첫 화면이 가로 카드 덱, 확장이 뒤집기·펼치기로 바뀌어요
- req-landing.md §1.3 의 「배경 동적 연출 강도 0」과 「카드 tilt 전면 비활성」 조항 개정이 필요해요(살아 있는 배경, 끌 때 최대 6° 기울기)
- design.md 의 스프링 오버슈트·패럴랙스·카드 틸트·자동 재생 모션 금지 조항 개정 — 스냅 스프링, 끌 때의 깊이감, 첫 방문 밀기 힌트가 모두 걸려요
- 뒤집기(#flip)와 펼치기(#expand) 중 하나를 골라야 해요 — 둘 다 A/B 진입(§8.6 landing ingress)은 그대로 쓰고, 색을 넘겨 다음 페이지 첫 프레임에 칠하는 연결만 전환 계약에 더해요
- 셰이더 약 5–8KB 는 첫 페인트 뒤 지연 초기화, 저사양·GPU 없음은 CSS 대체 · 스와이프마다 버튼 대안 유지(WCAG 2.5.1/2.5.7)

### B.7 Round-2 I `i2-split.html` (archive)

`changed`:

- 끄는 방향: 뒤집었어요 — 경계를 밀어 넓어지는 색이 답이고, 놓으면 그 색이 이어서 화면을 덮어요
- 「놓으면 이 답으로」: 문구를 없앴어요 — 넓어지는 쪽 글자는 그대로 두고, 좁아지는 쪽 글자만 줄어든 만큼 작아지고 흐려져요
- 경계를 끄는 방식은 보자마자 알았다고 해서 그대로 두고, 첫 안내 한 줄만 새 방향에 맞췄어요
- 출렁이며 돌아오는 반응 · 색이 덮는 순간 · 탭 선택: 그대로예요. 임계점을 넘는 순간에는 경계에 물결이 한 번 지나가요
- 상단 가로 진행 막대: 없앴어요 — 공유 · 진행 · 이전을 오른쪽 가장자리 한 줄에 모아 위아래 색면을 가리지 않아요
- 세로 진행 두 안: 팔레트형(팔레트가 곧 진행 막대) · 세로 막대(막대 옆에 팔레트) — 아래에서 바꿔 볼 수 있어요
- 테스트 도중 공유: 오른쪽 맨 위 버튼으로 지금 질문을 친구에게 물어요
- 제출 뒤 전환: 다음 피드백까지 그대로 두고, 마지막 화면에 팔레트 공유 버튼만 더했어요
- 되돌아가 답을 바꾸면 다음 문항으로 한 칸만 가요

`realBuild`:

- §4.3 과 다르게 갔어요 — 되돌아가 답을 바꾸면 첫 미응답 문항으로 건너뛰지 않고 한 칸만 앞으로 가요(소유자: 건너뛰기는 결함). 계약 개정이 필요해요
- 채도 높은 색쌍을 테스트·문항마다 정의해야 해요 — 첫 문항 색은 랜딩에서 넘어온 색을 받아요
- 진행률은 막대+퍼센트 계약 그대로예요 — 자리만 오른쪽 세로 레인으로
- 질문 공유는 텔레메트리 계약 변경(새 이벤트)이 필요해요
- canvas 2D 로 라이브러리 없이 가능, 좁아진 반쪽에 긴 답(12개 언어)이 들어가는지 검증이 필요해요

### B.8 Round-2 J `j2-forks.html` (archive)

`changed`:

- 제출을 마지막 골목의 고른 표지판 뒤편으로 옮겼어요 — 골목 끝에 빛의 관문이 솟고 그 안에 제출 버튼이 있어요. 고르고 나아가던 흐름 그대로 관문을 지나 마쳐요
- 제출 전까지 반대편 표지판이 화면 가장자리에 남아요 — 누르면 카메라가 그 골목으로 옮겨 가고, 관문도 그 표지판 뒤로 따라 서요
- 이전으로 돌아가 답하면 딱 한 갈림길만 나아가요 — 다음 갈림길엔 전에 고른 표지판에 조용한 체크가 있어, 그대로 두거나 바꾸며 한 칸씩 갈 수 있어요
- 앞의 답을 바꾸면 그 뒤 길 모양이 새로 그려져요 — 뒤의 답은 지우지 않고 그대로 가져가요
- 「이전」을 골목 가운데 아래, 지나온 길 위로 옮기고 회색 알약으로 덜 눈에 띄게 했어요
- 위쪽 종이비행기로 지금 갈림길의 질문을 친구에게 물어요 — 닫으면 같은 자리 그대로예요. 끝 화면에는 경로 공유가 생겼어요
- 랜딩에서 이어 들어오면 랜딩의 색이 먼저 깔렸다가 풍경으로 녹아들어요 · 세 테스트(8 · 4 · 3문항) 모두 지원

`realBuild`:

- req-test.md §4.3 과 다르게 가요: 되돌아가 답하면 첫 미응답 문항으로 건너뛰지 않고 한 문항만 나아가요 — 오너가 그 건너뛰기를 「중간 문항 답변을 변경할 수 없는 결함」으로 봤어요. §4.3 개정이 필요해요
- 마지막 문항은 §4.4 그대로 — 기존 답이 있으면 선택된 채 그 골목에 들어가 있고, 제출 전까지 바꿀 수 있어요
- 제출은 화면에 고정된 버튼이 아니라 공간 속 관문에 달린 버튼이에요 — 카메라를 따라 자리가 움직이므로 포커스 순서·확대·긴 문구(12개 언어) 검증이 필요해요
- 질문 공유·경로 공유는 새 텔레메트리 이벤트와 투표를 모으는 링크 서버가 필요해요
- canvas 2D 원근 투영으로 라이브러리 없이 가능(약 4–7KB)

### B.9 Round-2 D `d2-story.html` (archive)

`changed`:

- 스토리처럼 한 장씩 넘기는 흐름과 테스트 중 공유는 채택안대로 살렸어요 — 공유는 이제 모든 흐름이 함께 쓰는 시트로, 링크(친구가 바로 투표하는 페이지)가 1순위이고 9:16 카드는 스토리·릴스용 2순위예요
- 답하면 카드가 뒤집혀 보여 주던 한 줄 메모와 그 아래 차오르던 막대를 모두 뺐어요 — 고른 답이 150ms 동안 선택 상태로 보인 뒤 다음 장이 바로 밀려 들어와요
- 9:16 질문 카드는 「당신이라면?」 대신 「나 대신 골라 줘」 — 올린 사람이 답하기 어려운 질문을 친구들이 대신 A/B 로 골라 주는 흐름에 맞췄어요
- 테스트 도중 공유: 시트가 열려 있는 동안 흐름은 멈춰요(넘기기·답하기 잠김). 닫으면 질문 블록이 카드에서 제자리로 돌아오고, 같은 질문·같은 진행률에서 답 카드가 한 번 빛나며 이어서 답하게 해요. 친구 투표가 모이면 질문 아래 한 줄로 보여요
- 빈 곳을 길게 눌러 배경을 멈추는 기능과 일시정지 표시를 없앴어요 — 배경 움직임은 모션 줄이기 설정만 따라요
- 배경이나 답 카드를 잡고 좌우로 끌면 문항 단위로 오가요 — 오른쪽으로 끌면 이전 문항, 왼쪽으로 끌면 다음 문항(답한 문항과 첫 미답 문항까지). 끝에서는 고무줄처럼 버티다 돌아오고, 이전 버튼과 ←/→ 키도 같은 이동이에요
- 앞 문항을 다시 열면 두 답 모두 선택 전 모양이고 예전 답에만 조용한 체크가 남아요. 답을 바꾸면 딱 한 문항만 앞으로 가요
- 랜딩에서 이어 들어오면 랜딩의 마지막 색이 첫 화면을 덮었다가 스토리로 녹아들어요 · 세 테스트 모두 지원(에겐-테토는 안내 시트에서 성별을 고른 뒤 시작) · 왼쪽 위 ViveTest 로 랜딩 복귀

`realBuild`:

- 앞 문항의 답을 바꾸면 딱 한 문항만 앞으로 가요 — req-test.md §4.3(다음 미답 문항으로 이동)에서 의도적으로 벗어난 것이라 계약 개정이 필요해요(「중간 문항 답변을 변경할 수 없는 결함」 지적)
- 실제 공유는 navigator.share 에 링크(URL)를 먼저, 9:16 이미지 파일은 canShare({ files }) 확인 뒤 두 번째로 넘겨요. 카카오톡·인스타그램 인앱 브라우저처럼 share 가 없거나 막힌 곳은 링크 복사 + 이미지 길게 눌러 저장으로 대체해요
- 공유하러 다른 앱에 다녀오는 사이 OS 가 탭을 정리할 수 있어요 — 답과 현재 문항을 sessionStorage 에 두고 돌아오면 같은 문항에서 이어가야 해요
- 좌우 넘기기는 Pointer Events 자체 구현 약 3KB(touch-action: pan-y, 새 라이브러리 없음). iOS Safari 의 화면 가장자리 뒤로가기 제스처와 겹치므로 실기기 검증이 필요해요
- 질문 공유·친구 투표는 텔레메트리 이벤트와 투표 페이지·집계 API 가 새로 필요해요
- 길게 눌러 멈추기를 뺐으니, 5초 넘게 흐르는 배경은 WCAG 2.2.2(멈출 수단) 판단이 필요해요 — 모션 줄이기 설정(OS·사이트)으로 갈음할지, 배경 흐름을 5초 안에 멈출지 정해야 해요

### B.10 Round-1 concept `realBuild` notes (`BRIEF.md` Proto.info configs)

A · 랜딩 「스와이프 덱」:

- 폰 카드 확장=바텀시트, 1열 목록 결정을 다시 열어야 해요
- design.md 의 스프링·틸트 금지 조항 개정
- 제스처는 자체 구현 약 5KB — 새 라이브러리 없이 가능
- 스와이프마다 버튼 대안을 유지해야 해요(WCAG 2.5.1/2.5.7)

B · 랜딩 「바이브 피드」:

- 1열 카탈로그(약 3화면)와 바텀시트 결정을 다시 열어야 해요
- 배경 애니메이션 0 조항(req-landing §1.3) 개정
- 스크롤 스냅·연동은 CSS 0KB, 배경 셰이더는 약 5–8KB 를 첫 페인트 뒤에
- 하단 동의 배너와 답 버튼 자리가 겹치지 않게 재배치가 필요해요

E · 랜딩(대조군) 「살아있는 종이」:

- 대부분 현 계약 안에서 가능 — 오버슛 없는 스프링, 짧은 스태거
- 테마 전환 2,500ms → 400ms 는 결정 등재만 필요해요
- 스크롤 연동 등장은 iOS 26+ 에서만, 그 이하는 정지 화면
- 새 라이브러리 없음(CSS 위주, 0–2KB)

F · 랜딩 「촉감 놀이터」:

- 「not game-like」 정체성과 배경 애니메이션 0 조항 개정
- 자체 물리 약 3KB(또는 Matter.js 26KB)
- 진입 경로와 목록은 물리 밖에 둬야 접근성이 유지돼요
- 첫 10초의 인상은 강하지만 재방문에선 효과가 줄어요

G · 랜딩(신규) 「대화형 랜딩」:

- 랜딩 구조(카탈로그→대화)와 바텀시트 결정을 다시 열어야 해요
- 문항·진입·진행률 계약은 그대로 지킬 수 있어요 — 말풍선은 문항 화면의 다른 표현이에요
- 봇 문구는 제품 보이스(차분, 느낌표 없음)로 새로 써야 해요
- 라이브러리 없이 가능(0KB)

H · 랜딩(신규) 「별자리 지도」:

- 1열 목록·바텀시트 결정을 다시 열고 공간형 탐색을 들여야 해요
- 캔버스 2D 로 라이브러리 없이 가능, 다만 목록 대안(접근성)이 필수예요
- 테스트가 많아질수록 살아나는 구조 — 지금 3개로는 하늘이 비어 보여요
- 다크 단일 세계(라이트 테마 없음) 결정이 필요해요

C · 테스트 흐름 「오라」:

- 배경 애니메이션 0 조항과 calm 정체성 개정
- WebGL 셰이더 약 5KB — 전환 준비(1,600ms) 뒤에 지연 초기화해야 해요
- 저사양 기기는 정지 이미지로 대체(성능 게이트 필요)
- 오라 이미지는 그대로 결과·공유의 시각 자산이 될 수 있어요

D · 테스트 흐름 「스토리 플로우」:

- 메모 공개가 자동 진행 사이에 끼면 문항당 약 0.7초가 늘어요 — 150ms 잠금 계약과 조율 필요
- 질문 공유는 텔레메트리 계약 변경(새 이벤트)이 필요해요
- 공유 이미지는 클라이언트 canvas 로 0KB — 12개 언어 글꼴 로드 대기 필요
- 이모지·축하 문구 금지 조항 개정

I · 테스트 흐름(신규) 「반반 화면」:

- 단일 sage·차분한 정체성 개정 — 채도 높은 색쌍 팔레트가 새로 필요해요
- 문항 화면을 통째로 바꾸지만 이진 A/B·자동 진행·이전 계약과 잘 맞아요
- canvas 2D 로 라이브러리 없이 가능
- 긴 답(12개 언어)이 반쪽 화면에 들어가는지 검증이 필요해요

J · 테스트 흐름(신규) 「갈림길」:

- 문항 화면을 공간 은유로 바꾸는 큰 개정 — 이진 A/B 와는 자연스럽게 맞아요
- canvas 2D 원근 투영으로 라이브러리 없이 가능(약 3–6KB)
- 긴 답을 표지판에 담는 12개 언어 검증이 필요해요
- 경로 그림은 결과·공유 자산으로 이어질 수 있어요
