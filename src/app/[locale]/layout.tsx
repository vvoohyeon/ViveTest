import type {Metadata} from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import type {ReactNode} from 'react';

import {isLocale, locales, resolveHtmlLang} from '@/config/site';
import {TransitionRuntimeMonitor} from '@/features/transition/transition-runtime-monitor';
import {LocaleHtmlLangSync} from '@/i18n/locale-html-lang-sync';
import {messagesByLocale} from '@/i18n/messages';

export const dynamicParams = false;

/**
 * locale 별 문서 메타데이터.
 *
 * 종전에는 루트의 영어 `description` 한 벌이 12 locale 전부에 나갔다 — 한국어 페이지를 공유하면
 * 미리보기의 문장이 영어였고, 검색 결과의 발췌도 그랬다. 화면의 모든 문구가 번역돼 있는데
 * **문서 바깥으로 나가는 문장만** 번역되지 않은 상태였다.
 *
 * `title` 은 번역하지 않는다 — 제품 이름이다. 그림(`opengraph-image.tsx`)도 locale 을 갖지
 * 않는다(그 파일이 이유를 적는다). locale 을 갖는 것은 **문장**이고, 미리보기에서 사람이 읽는
 * 것도 그 문장이다.
 *
 * `alternates` 는 같은 자리에서 나온다 — 어느 언어판이 정본이고 어떤 언어판이 더 있는지는
 * 문장과 같은 사실의 두 면이다. 언어 키는 표시용 BCP 47 태그를 그대로 쓴다(`resolveHtmlLang`).
 */
export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const t = await getTranslations({locale, namespace: 'meta'});
  const description = t('description');

  return {
    description,
    // 루트 manifest 는 한 벌이라 어느 언어에서 들어왔든 영어 설명을 보여 준다. locale 사본을
    // 가리켜 「홈 화면에 추가」가 그 언어로 뜨게 한다 — 문장은 위 `description` 과 같은 것이다.
    manifest: `/${locale}/manifest.webmanifest`,
    openGraph: {
      type: 'website',
      siteName: 'ViveTest',
      title: 'ViveTest',
      description,
      locale: resolveHtmlLang(locale),
      url: `/${locale}`
    },
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((code) => [resolveHtmlLang(code), `/${code}`]))
    }
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      <LocaleHtmlLangSync locale={locale} />
      <TransitionRuntimeMonitor />
      <div data-locale={locale}>{children}</div>
    </NextIntlClientProvider>
  );
}
