/**
 * `result` 는 `test` 와 갈라져 있다 — 결과 화면의 GNB 는 진행률도 타이머도 갖지 않고
 * `Back` 이 랜딩으로 간다(명세 §2-6). 아래 분기는 전부 `=== 'test'` 또는 `=== 'landing'`
 * 이므로 이 이름이 더해져도 동작은 한 비트도 바뀌지 않는다: 더해진 것은 표면의 **이름**이고,
 * `data-page-context` · `data-gnb-context` 가 그것을 그대로 내보낸다.
 */
export type GnbContext = 'landing' | 'blog' | 'history' | 'test' | 'result';

export type ThemePreference = 'system' | 'light' | 'dark';

export type MobileMenuState = 'closed' | 'open' | 'closing';
