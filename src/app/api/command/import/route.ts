import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { parseAndStageIngestNotes } from '../../../../lib/command/ingest';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rawText = '';
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const textParam = formData.get('text') as string | null;

      if (file) {
        rawText = await file.text();
      } else if (textParam) {
        rawText = textParam;
      }
    } else {
      const body = await req.json();
      rawText = body.text || '';
    }

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: 'Please provide notes text or a file to import' },
        { status: 400 }
      );
    }

    const summary = await parseAndStageIngestNotes(session.userId, rawText, {
      ukResident: session.ukResident ?? true,
    });

    return NextResponse.json({ ok: true, ...summary });
  } catch (err: any) {
    console.error('[API Import Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process notes import' },
      { status: 400 }
    );
  }
}
