'use client';

import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {useMemo, useSyncExternalStore} from 'react';

import {resolveHtmlLang, type AppLocale} from '@/config/site';
import {
  getRunHistorySnapshot,
  getServerRunHistorySnapshot,
  subscribeRunHistory
} from '@/features/test/storage/run-history';
import {
  testBodyClassName,
  testDataRowClassName,
  testDataRowKeyClassName,
  testDataRowValueClassName,
  testWellClassName
} from '@/features/test/surface-class-names';
import {linkButtonPrimaryClassName} from '@/features/ui/button-class-names';
import type {LocalizedRoutePath} from '@/i18n/localized-path';

/**
 * 이 기기의 회차 목록 — 명세 §2-7, **목록까지만**.
 *
 * 클라이언트 컴포넌트인 이유는 이력이 `localStorage` 에 있기 때문이고, `useSyncExternalStore`
 * 를 쓰는 이유는 그것을 **effect 없이** 읽기 위해서다. 서버 스냅샷은 빈 목록이고 그것이 참이다 —
 * 서버에는 이 기기의 이력이 없으므로 두 렌더가 어긋날 여지가 없다.
 *
 * **항목은 누를 수 없다.** 탭 동작과 URL 스킴은 결과 화면 내용과 함께 다음 phase 이고, 연결할
 * 곳이 없는 동안 `>` 같은 어포던스를 붙이면 화면이 거짓말을 한다(사용자 확정 2026-09-14).
 * 그래서 행은 링크도 버튼도 아닌 조용한 데이터 행이다.
 */

const runHistoryListClassName = 'm-0 grid list-none gap-2 p-0';
const runHistoryRowClassName = `px-4 py-3 ${testWellClassName}`;
const runHistoryRowInnerClassName = testDataRowClassName;
const runHistoryNameClassName = testDataRowKeyClassName;
const runHistoryMetaClassName = `${testDataRowValueClassName} flex flex-wrap items-baseline justify-end gap-2`;
const runHistoryAbandonedClassName =
  'rounded-[var(--normal-tag-radius)] bg-[var(--surface-strong)] px-2 py-0.5 [font:var(--caption)] text-[var(--ink-body)]';
const runHistoryEmptyClassName = 'mx-auto grid max-w-[460px] justify-items-center gap-4 px-4 py-10 text-center';
const runHistoryEmptyMarkClassName =
  'grid h-11 w-11 place-items-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent-fg)]';
const runHistoryEmptyBodyClassName = `m-0 ${testBodyClassName} text-[var(--muted-aa)]`;

interface RunHistoryListProps {
  locale: AppLocale;
  landingPath: LocalizedRoutePath;
  /** variant id → 테스트 이름. 서버가 카탈로그에서 풀어 내려보낸다. */
  testNames: Record<string, string>;
}

export function RunHistoryList({locale, landingPath, testNames}: RunHistoryListProps) {
  const t = useTranslations('history');
  const entries = useSyncExternalStore(subscribeRunHistory, getRunHistorySnapshot, getServerRunHistorySnapshot);
  // 표시용 BCP 47 태그를 쓴다 — `kr` · `zs` · `zt` 는 `Intl` 이 모르는 저장소 고유 코드다.
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(resolveHtmlLang(locale), {dateStyle: 'medium', timeStyle: 'short'}),
    [locale]
  );

  if (entries.length === 0) {
    return (
      <div className={runHistoryEmptyClassName} data-testid="history-empty">
        <span className={runHistoryEmptyMarkClassName} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.75]"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4l3 2" />
          </svg>
        </span>
        <p className={runHistoryEmptyBodyClassName}>{t('emptyBody')}</p>
        <Link className={linkButtonPrimaryClassName} href={landingPath}>
          {t('browseTests')}
        </Link>
      </div>
    );
  }

  return (
    <ul className={runHistoryListClassName} data-testid="history-list">
      {entries.map((entry) => (
        <li
          key={`${entry.variantId}:${entry.startedAtMs}`}
          className={runHistoryRowClassName}
          data-testid="history-entry"
          data-run-variant={entry.variantId}
          data-run-status={entry.status}
        >
          <div className={runHistoryRowInnerClassName}>
            <span className={runHistoryNameClassName}>{testNames[entry.variantId] ?? entry.variantId}</span>
            <span className={runHistoryMetaClassName}>
              <time dateTime={new Date(entry.startedAtMs).toISOString()}>{formatter.format(entry.startedAtMs)}</time>
              {entry.status === 'abandoned' ? (
                <span className={runHistoryAbandonedClassName}>{t('abandoned')}</span>
              ) : null}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
