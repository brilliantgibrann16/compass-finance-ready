import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Compass Finance - sync ingress for the offline-first coordinator.
//
// The SyncCoordinator POSTs batches as { instanceId, sentAt, changes[] } and
// expects an ack of { accepted, rejected, rejectedIds, serverTime }.
//
// No persistent backend exists yet, so this acknowledges every change
// idempotently (accepted = N, rejected = 0) to keep the durable queue draining
// and the loop genuinely live instead of failing against a 404. Swap the body
// for a Supabase/Postgres upsert when V2 lands.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

interface IncomingChange {
  id?: string;
}

interface SyncRequestBody {
  instanceId?: string;
  sentAt?: number;
  changes?: IncomingChange[];
}

export async function POST(request: Request) {
  let changes: IncomingChange[] = [];
  try {
    const body = (await request.json()) as SyncRequestBody | null;
    if (body && Array.isArray(body.changes)) {
      changes = body.changes;
    }
  } catch {
    return NextResponse.json(
      { accepted: 0, rejected: 0, error: "invalid JSON body" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    accepted: changes.length,
    rejected: 0,
    rejectedIds: [],
    serverTime: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "compass-sync" });
}