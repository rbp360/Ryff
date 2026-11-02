import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { getPlayerRegistryStats, StatMetric } from '../../../../lib/knowledge/search';

const ALLOWED_METRICS = new Set<StatMetric>([
  'string_gauge',
  'tuning',
  'string_brand',
  'bridge_pickup',
  'neck_pickup',
]);

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const metricParam = searchParams.get('metric') as StatMetric;

  if (!metricParam || !ALLOWED_METRICS.has(metricParam)) {
    return NextResponse.json({ error: 'Invalid or missing metric' }, { status: 400 });
  }

  const brand = searchParams.get('brand');
  const nStrings = searchParams.get('numberOfStrings');
  const scale = searchParams.get('scaleLength');

  try {
    const stats = await getPlayerRegistryStats(metricParam, {
      brand: brand || null,
      numberOfStrings: nStrings ? parseInt(nStrings, 10) : null,
      scaleLength: scale ? parseFloat(scale) : null,
      limit: 10,
    });
    return NextResponse.json(stats);
  } catch (err) {
    console.error('Stats query failed:', err);
    return NextResponse.json({ error: 'Failed to query stats' }, { status: 500 });
  }
}

