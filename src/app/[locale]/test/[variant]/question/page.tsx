import {notFound} from 'next/navigation';

import {isLocale} from '@/config/site';

export default async function QuestionPage({
  params
}: {
  params: Promise<{locale: string; variant: string}>;
}) {
  const {locale, variant} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  if (!/^[a-z0-9-]+$/u.test(variant)) {
    notFound();
  }

  return (
    <main className="placeholder-shell">
      <h1>Question Placeholder</h1>
      <p>{`Locale: ${locale}`}</p>
      <p>{`Variant: ${variant}`}</p>
    </main>
  );
}
