import {notFound} from 'next/navigation';

import {isLocale} from '@/config/site';

export default async function BlogPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <main className="placeholder-shell">
      <h1>Blog Placeholder</h1>
      <p>{`Locale: ${locale}`}</p>
    </main>
  );
}
