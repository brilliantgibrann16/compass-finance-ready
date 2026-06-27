import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Compass Finance — sync ingress STUB for the offline-first coordinator.
//
// ⚠️  STATUS: DECORATIVE STUB — this endpoint acknowledges every change but
//    does NOT persist data anywhere. The SyncCoordinator's durable queue
//    drains correctly (preventing UI error states), but mutations are
//    discarded after acknowledgement.
//
// The SyncCoordinator POSTs batches as { instanceId, sentAt, changes[] } and
// expects an ack of { accepted, rejected, rejectedIds, serverTime }.
//
// To make sync functional, replace the response body below with a real
// database upsert (e.g. Supabase, Postgres, Firebase). The syncClient.ts
// currently only sends metadata (kind + count), not actual data — that
// also needs updating to send full payloads.
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