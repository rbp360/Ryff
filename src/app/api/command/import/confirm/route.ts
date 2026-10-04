import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/session';
import { confirmIngestBatch } from '../../../../../lib/command/ingest';
import { logEvent } from '../../../../../lib/events';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { batchId, confirmedCandidateIds, acceptAllHighConfidence, edits } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const result = await confirmIngestBatch(session.userId, {
      batchId,
      confirmedCandidateIds,
      acceptAllHighConfidence,
      edits,
    });

    await logEvent(
      'import_confirmed',
      {
        batchId,
        importedItems: result.importedItems,
        importedLogs: result.importedLogs,
      },
      session.userId
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API Import Confirm Error]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to confirm import batch' },
      { status: 500 }
    );
  }
}
