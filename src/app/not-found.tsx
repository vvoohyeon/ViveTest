import Link from 'next/link';

import {RouteBuilder} from '@/lib/routes/route-builder';

export default function NotFound() {
  return (
    <main className="nf-shell">
      <h1>Segment Not Found</h1>
      <p>This route exists, but the requested resource could not be found.</p>
      <Link href={{pathname: RouteBuilder.landing().pathname}}>Return home</Link>
    </main>
  );
}
