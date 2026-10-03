'use client';

import { useState, useEffect, useRef } from 'react';
import { getCategoryFallbackImage } from '@/lib/gear-images';

interface GearThumbnailProps {
  imageUrl?: string | null;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  rawText?: string | null;
  alt?: string;
  className?: string;
}

export function GearThumbnail({
  imageUrl,
  brand,
  model,
  category,
  rawText,
  alt,
  className = 'ph',
}: GearThumbnailProps) {
  const fallback = getCategoryFallbackImage(category);
  const [src, setSrc] = useState<string | null>(imageUrl || null);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let ignore = false;

    if (imageUrl) {
      setSrc(imageUrl);
      return;
    }

    const gearQuery = (brand || model || rawText || '').trim();
    if (!gearQuery) {
      setSrc(fallback);
      return;
    }

    async function loadStockImage() {
      try {
        const params = new URLSearchParams({
          brand: brand || '',
          model: model || rawText || '',
          category: category || '',
        });
        const res = await fetch(`/api/stock-image?${params.toString()}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!ignore && data.imageUrl) {
          setSrc(data.imageUrl);
        } else if (!ignore) {
          setSrc(fallback);
        }
      } catch {
        if (!ignore) setSrc(fallback);
      }
    }

    loadStockImage();

    return () => {
      ignore = true;
    };
  }, [imageUrl, brand, model, category, rawText, fallback]);

  // Sync isLoaded when src changes or if already cached/completed by browser
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  const isCustom = Boolean(imageUrl);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4 / 3',
        background: 'repeating-linear-gradient(45deg, #121212, #121212 8px, #161616 8px, #161616 16px)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(el) => {
            imgRef.current = el;
            if (el && el.complete && el.naturalWidth > 0) {
              setIsLoaded(true);
            }
          }}
          src={src}
          alt={alt || `${brand || ''} ${model || rawText || 'Gear'}`.trim()}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (src !== fallback) {
              setSrc(fallback);
              setIsLoaded(true);
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: isCustom ? 'cover' : 'contain',
            background: '#0a0a0a',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
        />
      )}
    </div>
  );
}
