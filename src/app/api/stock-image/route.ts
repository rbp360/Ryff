import { NextRequest, NextResponse } from 'next/server';
import { fetchReverbStockImage, getCategoryFallbackImage } from '@/lib/gear-images';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get('brand') || '';
  const model = searchParams.get('model') || '';
  const category = searchParams.get('category') || '';
  const pickIndexStr = searchParams.get('pickIndex') || '0';
  const pickIndex = parseInt(pickIndexStr, 10) || 0;

  try {
    const result = await fetchReverbStockImage(brand, model, category, { pickIndex });
    
    // If Reverb & Logo both return nothing, return category fallback
    if (!result.imageUrl) {
      return NextResponse.json({
        imageUrl: getCategoryFallbackImage(category),
        source: 'category',
        pickIndex: 0,
        totalMatches: 0,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        imageUrl: getCategoryFallbackImage(category),
        source: 'category',
        pickIndex: 0,
        totalMatches: 0,
        error: err instanceof Error ? err.message : 'Failed to fetch stock image',
      },
      { status: 200 }
    );
  }
}
