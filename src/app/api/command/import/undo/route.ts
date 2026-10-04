import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/session';
import { undoIngestBatch } from '../../../../../lib/command/ingest';
import { logEvent } from '../../../../../lib/events';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { batchId } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const result = await undoIngestBatch(session.userId, batchId);

    await logEvent('import_undone', { batchId, ...result }, session.userId);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API Import Undo Error]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to undo import batch' },
      { status: 500 }
    );
  }
}
