import { NextResponse } from "next/server";

// NFR-05 liveness probe for uptime monitors. Public (see PUBLIC_ROUTES) and touches no data.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
