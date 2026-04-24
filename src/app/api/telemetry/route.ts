import {NextResponse} from 'next/server';

import {validateTelemetryTransportEvent} from '@/features/landing/telemetry/validation';

export async function POST(request: Request) {
  try {
    validateTelemetryTransportEvent(await request.json());
  } catch {
    return NextResponse.json({ok: false}, {status: 400});
  }

  return new NextResponse(null, {status: 204});
}
