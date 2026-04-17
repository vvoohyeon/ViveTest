import Link from 'next/link';

import {APP_BODY_CLASSNAME} from '@/app/app-body-class';
import {defaultLocale} from '@/config/site';
import {RouteBuilder} from '@/lib/routes/route-builder';

export default function GlobalNotFound() {
  return (
    <html lang={defaultLocale}>
      <body className={APP_BODY_CLASSNAME}>
        <main className="grid min-h-screen place-content-center gap-3 p-6 text-center">
          <h1 className="m-0">Global Not Found</h1>
          <p className="m-0 text-[var(--muted-ink)]">The requested path is outside the supported route contract.</p>
          <Link href={{pathname: RouteBuilder.landing().pathname}}>Return home</Link>
        </main>
      </body>
    </html>
  );
}
