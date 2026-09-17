import {ConsentRecallLink} from '@/features/landing/shell/consent-recall-link';

/**
 * 콘텐츠 끝에 붙는 한 행. **뷰포트 바닥에 고정하지 않는다** — 한 화면짜리 표면(히스토리·에러)
 * 에서도 같다(명세 §2-10). 데스크톱에 동의 수정 진입점을 이것과 고지 행 말고 더 만들지 않는다.
 */
export function PageFooter() {
  return (
    <footer className="page-shell-footer flex justify-center px-[var(--shell-gutter)] pb-4" data-testid="page-footer">
      <ConsentRecallLink testId="page-footer-consent-recall" />
    </footer>
  );
}
