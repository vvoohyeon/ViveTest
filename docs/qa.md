**주요 미충족 사항 (심각도 순)**
1. **[P1] pre-answer 상관키 검증 없이 적용됨** (`§10.5` 위반)  
   랜딩 전환 상관키 없는 유입에도 `readPreAnswer` 값이 바로 Q1에 주입됩니다.  
   근거: [test-question-page.tsx:82](/Users/woohyeon/Local/VibeTest/src/features/test/test-question-page.tsx:82), [test-question-page.tsx:85](/Users/woohyeon/Local/VibeTest/src/features/test/test-question-page.tsx:85), [session-state.ts:10](/Users/woohyeon/Local/VibeTest/src/features/landing/session-state.ts:10)

2. **[P1] “사용자 취소” 롤백 케이스가 누락될 수 있음** (`§10.6` 케이스1 위반 가능)  
   pending transition이 350ms 미만이면 그대로 반환하고 재시도/정리 로직이 없어, 빠른 back/cancel에서 롤백/취소 이벤트가 누락될 수 있습니다.  
   근거: [landing-page.tsx:114](/Users/woohyeon/Local/VibeTest/src/features/landing/landing-page.tsx:114), [landing-page.tsx:116](/Users/woohyeon/Local/VibeTest/src/features/landing/landing-page.tsx:116)

3. **[P1] TRANSITIONING 중 시작 프레임 고정이 깨질 수 있음** (`§7.3`, `§10.1` 위반)  
   전환 중에도 `mouseleave`에서 카드 collapse가 발생할 수 있어 initiating visual state가 고정되지 않습니다.  
   근거: [catalog-card.tsx:74](/Users/woohyeon/Local/VibeTest/src/features/landing/components/catalog-card.tsx:74), [catalog-card.tsx:82](/Users/woohyeon/Local/VibeTest/src/features/landing/components/catalog-card.tsx:82), [landing-page.tsx:220](/Users/woohyeon/Local/VibeTest/src/features/landing/landing-page.tsx:220)

4. **[P1] typed routing 계약을 타입 단언으로 우회** (`§2.3` 위반)  
   동적 경로를 `as Route`/`as never`로 밀어넣어 typedRoutes 보장을 사실상 무력화하고 있습니다.  
   근거: [route-builder.ts:11](/Users/woohyeon/Local/VibeTest/src/lib/route-builder.ts:11), [landing-page.tsx:348](/Users/woohyeon/Local/VibeTest/src/features/landing/landing-page.tsx:348)

5. **[P1] Normal row equal-height stretch 미충족** (`§4.5 MUST` 위반)  
   그리드가 `align-items: start`라 동일 row stretch가 보장되지 않습니다.  
   근거: [landing-page.module.css:35](/Users/woohyeon/Local/VibeTest/src/features/landing/landing-page.module.css:35), [catalog-card.module.css:14](/Users/woohyeon/Local/VibeTest/src/features/landing/components/catalog-card.module.css:14)

6. **[P1] §12.4 Playwright QA 게이트 미구현**  
   문서가 요구한 Settings/Card/Transition 스모크 검증 자동화가 없습니다.  
   근거: [package.json:5](/Users/woohyeon/Local/VibeTest/package.json:5) (Playwright/e2e 스크립트 부재)

7. **[P2] Normal title 1줄 truncate 미적용** (`§6.6 Normal` 위반)  
   일반 상태 title에는 clamp가 적용되지 않습니다.  
   근거: [catalog-card.tsx:170](/Users/woohyeon/Local/VibeTest/src/features/landing/components/catalog-card.tsx:170), [catalog-card.module.css:55](/Users/woohyeon/Local/VibeTest/src/features/landing/components/catalog-card.module.css:55), [catalog-card.module.css:63](/Users/woohyeon/Local/VibeTest/src/features/landing/components/catalog-card.module.css:63)

8. **[P2] Mobile full-bleed 내부 스크롤 허용 계약 미흡** (`§9.2` 위반)  
   페이지 scroll을 잠그지만 Expanded 카드 내부 `overflow` 제어가 없어 긴 콘텐츠 접근성이 깨질 수 있습니다.  
   근거: [catalog-card.module.css:40](/Users/woohyeon/Local/VibeTest/src/features/landing/components/catalog-card.module.css:40), [landing-page.tsx:135](/Users/woohyeon/Local/VibeTest/src/features/landing/landing-page.tsx:135)

9. **[P2] Reduced motion 계약 불충분** (`§12.2` 위반 가능)  
   reduced-motion에서도 `scale(1.1)` 큰 변형은 유지되고 duration만 줄어듭니다.  
   근거: [catalog-card.module.css:34](/Users/woohyeon/Local/VibeTest/src/features/landing/components/catalog-card.module.css:34), [catalog-card.module.css:209](/Users/woohyeon/Local/VibeTest/src/features/landing/components/catalog-card.module.css:209)

10. **[P2] required 슬롯 누락 시 “빈값 렌더 유지” 대신 throw** (`§6.7` 위반)  
    누락 데이터가 들어오면 레이아웃 유지가 아니라 예외로 중단됩니다.  
    근거: [landing-adapter.ts:21](/Users/woohyeon/Local/VibeTest/src/features/landing/data/landing-adapter.ts:21), [landing-adapter.ts:27](/Users/woohyeon/Local/VibeTest/src/features/landing/data/landing-adapter.ts:27)

11. **[P2] Mobile 설정 컨트롤 “아이콘+현재값 텍스트” 미충족** (`§5.4` 불일치)  
    현재는 텍스트 라벨(`Lang`, `Mode`)만 있고 명시적 아이콘 표현이 없습니다.  
    근거: [site-header.tsx:327](/Users/woohyeon/Local/VibeTest/src/features/landing/components/site-header.tsx:327), [site-header.tsx:332](/Users/woohyeon/Local/VibeTest/src/features/landing/components/site-header.tsx:332)

12. **[P2] locale 문자열 수동 결합 사용** (`§2.3` locale 주입 단일 책임 규칙과 충돌)  
    `withLocalePrefix`가 `/${locale}`를 수동 조합합니다.  
    근거: [route-builder.ts:29](/Users/woohyeon/Local/VibeTest/src/lib/route-builder.ts:29), [landing-page.tsx:290](/Users/woohyeon/Local/VibeTest/src/features/landing/landing-page.tsx:290)
