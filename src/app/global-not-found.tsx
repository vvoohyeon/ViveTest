import Link from 'next/link';

import {defaultLocale} from '@/config/site';
import {RouteBuilder} from '@/lib/routes/route-builder';

export default function GlobalNotFound() {
  return (
    <html lang={defaultLocale}>
      <body>
        <main className="nf-shell">
          <h1>Global Not Found</h1>
          <p>The requested path is outside the supported route contract.</p>
          <Link href={{pathname: RouteBuilder.landing().pathname}}>Return home</Link>
        </main>
      </body>
    </html>
  );
}
