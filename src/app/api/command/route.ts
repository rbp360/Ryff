import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../lib/session';
import { db } from '../../../lib/db';
import { transcribeAudio } from '../../../lib/command/transcribe';
import { routeCommand } from '../../../lib/command/router';
import { z } from 'zod';

const commandSchema = z.object({
  text: z.string().max(1000, 'Text exceeds maximum length of 1000 characters').optional(),
  audioBase64: z.string().max(2000000, 'Audio data exceeds maximum size limit (~30s)').optional(),
  audioMimeType: z.string().optional(),
  context: z
    .object({
      screen: z.string().optional(),
      gearId: z.string().optional(),
    })
    .optional(),
});

// Simple sliding window rate limiter: 30 requests per minute per user
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(userId, validTimestamps);
  return true;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRateLimit(session.userId)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment before sending more commands.' },
      { status: 429 }
    );
  }

  try {
    const rawBody = await request.json();
    const parseResult = commandSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues?.[0]?.message || 'Invalid command payload' },
        { status: 400 }
      );
    }

    const { text, audioBase64, audioMimeType, context } = parseResult.data;

    if (!text && !audioBase64) {
      return NextResponse.json(
        { error: 'Either text or audioBase64 must be provided' },
        { status: 400 }
      );
    }

    // If context includes gearId, optionally load gear summary to assist transcription
    let gearContext: string | undefined;
    if (context?.gearId) {
      const gearIdNum = parseInt(context.gearId, 10);
      if (!isNaN(gearIdNum)) {
        const [gear] = await db`
          select brand, model, raw_text, nickname
          from rig_items
          where id = ${gearIdNum} and user_id = ${session.userId}
          limit 1
        `;
        if (gear) {
          gearContext = [gear.brand, gear.model || gear.raw_text, gear.nickname ? `"${gear.nickname}"` : null]
            .filter(Boolean)
            .join(' ');
        }
      }
    }

    // Audio transcription branch
    if (audioBase64) {
      const transcription = await transcribeAudio({
        audioBase64,
        audioMimeType,
        gearContext,
      });

      return NextResponse.json({
        ok: true,
        status: 'transcribed',
        text: transcription.text,
        context: {
          ...context,
          gearContext,
        },
      });
    }

    // Tool-calling proposal generation (Step 2)
    const cleanText = text?.trim() || '';
    const routed = await routeCommand({
      userId: session.userId,
      message: cleanText,
      context,
    });

    return NextResponse.json({
      ok: routed.ok,
      intent: routed.intent,
      status: routed.status,
      text: cleanText,
      answer: routed.answer,
      tool: routed.tool,
      proposals: routed.proposals,
      ambiguous: routed.ambiguous,
      unresolved: routed.unresolved,
      message: routed.message,
      costUsd: routed.costUsd,
      context: {
        ...context,
        gearContext,
      },
    });
  } catch (err: unknown) {
    console.error('[API /api/command] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal command processing error' },
      { status: 500 }
    );
  }
}
