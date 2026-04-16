import Link from 'next/link';

import {RouteBuilder} from '@/lib/routes/route-builder';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-content-center gap-3 p-6 text-center">
      <h1 className="m-0">Segment Not Found</h1>
      <p className="m-0 text-[var(--muted-ink)]">This route exists, but the requested resource could not be found.</p>
      <Link href={{pathname: RouteBuilder.landing().pathname}}>Return home</Link>
    </main>
  );
}
