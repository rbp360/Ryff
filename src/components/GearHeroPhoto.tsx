'use client';

import { useState, useRef, useEffect, useCallback, DragEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getCategoryFallbackImage } from '@/lib/gear-images';

interface GearHeroPhotoProps {
  itemId: number | string;
  initialImageUrl?: string | null;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  rawText?: string | null;
  onImageUpdated?: (newUrl: string | null) => void;
}

export function GearHeroPhoto({
  itemId,
  initialImageUrl,
  brand,
  model,
  category,
  rawText,
  onImageUpdated,
}: GearHeroPhotoProps) {
  const router = useRouter();
  const [currentUrl, setCurrentUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`ryff_gear_photo_${itemId}`);
        if (cached && (cached.includes('cloudinary') || !cached.includes('reverb.com'))) {
          return cached;
        }
      } catch {}
    }
    if (initialImageUrl) return initialImageUrl;
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(`ryff_gear_photo_${itemId}`);
      } catch {}
    }
    return null;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingStock, setIsFetchingStock] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stockSource, setStockSource] = useState<'custom' | 'reverb' | 'logo' | 'category'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`ryff_gear_photo_${itemId}`);
        if (cached && (cached.includes('cloudinary') || !cached.includes('reverb.com'))) {
          return 'custom';
        }
      } catch {}
    }
    if (initialImageUrl) {
      return initialImageUrl.includes('cloudinary') || !initialImageUrl.includes('reverb.com') ? 'custom' : 'reverb';
    }
    return 'category';
  });

  // Adjust state during render if initialImageUrl prop changes (canonical React pattern)
  const [prevInitialImageUrl, setPrevInitialImageUrl] = useState(initialImageUrl);
  if (initialImageUrl !== prevInitialImageUrl) {
    setPrevInitialImageUrl(initialImageUrl);
    // Only accept new initialImageUrl if client doesn't already have a custom photo in localStorage
    let hasCustomLocal = false;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`ryff_gear_photo_${itemId}`);
        if (cached && (cached.includes('cloudinary') || !cached.includes('reverb.com'))) {
          hasCustomLocal = true;
          setCurrentUrl(cached);
          setStockSource('custom');
        }
      } catch {}
    }
    if (!hasCustomLocal) {
      setCurrentUrl(initialImageUrl || null);
      const isCustom = initialImageUrl ? (initialImageUrl.includes('cloudinary') || !initialImageUrl.includes('reverb.com')) : false;
      setStockSource(isCustom ? 'custom' : (initialImageUrl ? 'reverb' : 'category'));
    }
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stockAbortRef = useRef<AbortController | null>(null);
  const fallback = getCategoryFallbackImage(category);

  const saveImageUrlToDatabase = useCallback(async (url: string | null) => {
    try {
      const res = await fetch(`/api/rig/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Failed to save photo (status ${res.status})`);
      }

      // Persist to local client backup for bulletproof recovery
      if (typeof window !== 'undefined') {
        try {
          if (url) {
            localStorage.setItem(`ryff_gear_photo_${itemId}`, url);
          } else {
            localStorage.removeItem(`ryff_gear_photo_${itemId}`);
          }
        } catch {
          // ignore localStorage quota errors
        }
      }

      if (onImageUpdated) onImageUpdated(url);
      router.refresh();
      return true;
    } catch (err) {
      console.error('Error saving image to DB:', err);
      throw err;
    }
  }, [itemId, onImageUpdated, router]);

  // If custom user photo exists in localStorage that differs from DB (e.g. after DB reset), sync to database
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`ryff_gear_photo_${itemId}`);
      if (cached && (cached.includes('cloudinary') || !cached.includes('reverb.com')) && cached !== initialImageUrl) {
        saveImageUrlToDatabase(cached).catch(() => {});
      } else if (!initialImageUrl && currentUrl) {
        saveImageUrlToDatabase(currentUrl).catch(() => {});
      }
    }
  }, [initialImageUrl, currentUrl, itemId, saveImageUrlToDatabase]);

  const fetchStock = useCallback(async (indexToFetch: number = 0, autoSave: boolean = false) => {
    // If user already has a custom uploaded photo, DO NOT overwrite with stock!
    if (stockSource === 'custom' || currentUrl?.includes('cloudinary')) {
      return;
    }

    if (stockAbortRef.current) {
      stockAbortRef.current.abort();
    }
    const controller = new AbortController();
    stockAbortRef.current = controller;

    setIsFetchingStock(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({
        brand: brand || '',
        model: model || rawText || '',
        category: category || '',
        pickIndex: indexToFetch.toString(),
      });
      const res = await fetch(`/api/stock-image?${params.toString()}`, { signal: controller.signal });
      const data = await res.json();
      if (data.imageUrl) {
        setCurrentUrl(data.imageUrl);
        setStockSource(data.source || 'reverb');

        if (autoSave && data.source === 'reverb') {
          await saveImageUrlToDatabase(data.imageUrl).catch(() => {});
        }
      } else {
        setCurrentUrl(fallback);
        setStockSource('category');
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setCurrentUrl(fallback);
      setStockSource('category');
    } finally {
      setIsFetchingStock(false);
    }
  }, [brand, model, rawText, category, fallback, saveImageUrlToDatabase, stockSource, currentUrl]);

  // If no initial custom image is saved and no local backup, auto-fetch Reverb stock image on load
  useEffect(() => {
    let ignore = false;
    const hasCachedPhoto = typeof window !== 'undefined' && localStorage.getItem(`ryff_gear_photo_${itemId}`);
    if (!initialImageUrl && !hasCachedPhoto && (brand || model || rawText)) {
      const controller = new AbortController();
      stockAbortRef.current = controller;

      const params = new URLSearchParams({
        brand: brand || '',
        model: model || rawText || '',
        category: category || '',
        pickIndex: '0',
      });
      fetch(`/api/stock-image?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (!ignore) {
            if (data.imageUrl) {
              setCurrentUrl(data.imageUrl);
              setStockSource(data.source || 'reverb');
            } else {
              setCurrentUrl(fallback);
              setStockSource('category');
            }
          }
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          if (!ignore) {
            setCurrentUrl(fallback);
            setStockSource('category');
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [initialImageUrl, itemId, brand, model, rawText, category, fallback]);

  async function uploadFileToCloudinary(file: File) {
    const isImageMime = file.type && file.type.startsWith('image/');
    const isImageExt = /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp)$/i.test(file.name || '');
    if (!isImageMime && !isImageExt) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, WebP, HEIC).');
      return;
    }

    // Cancel any in-flight stock lookups so they cannot overwrite user photo
    if (stockAbortRef.current) {
      stockAbortRef.current.abort();
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dfkt03pao';
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'unsigned-rigistry';
    const previousUrl = currentUrl;
    const previousSource = stockSource;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Upload to Cloudinary failed (status ${res.status})`);
      }

      const data = await res.json();
      const secureUrl = data.secure_url;
      if (!secureUrl) {
        throw new Error('No image URL returned from upload server.');
      }

      // Persist to database FIRST
      await saveImageUrlToDatabase(secureUrl);

      // Log the photo update in item history
      await fetch(`/api/rig/${itemId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'photo',
          title: 'Hero Photo Updated',
          description: 'Uploaded personal instrument photo',
        }),
      }).catch(() => {});

      setCurrentUrl(secureUrl);
      setStockSource('custom');
      setSuccessMsg('Personal photo saved to gear passport!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setCurrentUrl(previousUrl);
      setStockSource(previousSource);
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      uploadFileToCloudinary(file);
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      uploadFileToCloudinary(file);
    }
  }

  async function handleRemoveCustomPhoto() {
    setCurrentUrl(null);
    setStockSource('category');
    try {
      await saveImageUrlToDatabase(null);
    } catch {
      // ignore
    }
    fetchStock(0, false);
  }

  const displayUrl = currentUrl || fallback;
  const isCustom = stockSource === 'custom' || Boolean(currentUrl && currentUrl.includes('cloudinary'));

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '360px', margin: '0 auto 16px' }}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Hero 4:3 Box with Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3',
          background: '#121212',
          borderRadius: '16px',
          overflow: 'hidden',
          cursor: 'pointer',
          border: isDragging
            ? '2px dashed var(--ac)'
            : isUploading
            ? '2px solid var(--ac)'
            : '1px solid var(--ln)',
          boxShadow: isDragging ? '0 0 24px rgba(74, 222, 128, 0.25)' : 'none',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Background Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayUrl}
          alt={formatAltText(brand, model, rawText)}
          onError={() => {
            if (currentUrl !== fallback) {
              setCurrentUrl(fallback);
              setStockSource('category');
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: isCustom ? 'cover' : 'contain',
            background: '#0d0d0d',
            opacity: isUploading ? 0.4 : 1,
            transition: 'opacity 0.2s ease',
          }}
        />

        {/* Dark subtle overlay for upload drag hint */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isDragging
              ? 'rgba(0, 0, 0, 0.65)'
              : 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: isDragging ? 'center' : 'flex-end',
            alignItems: 'center',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          {isDragging ? (
            <div style={{ color: 'var(--ac)', fontWeight: 800, fontSize: '15px' }}>
              ✨ Drop your photo to upload
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(20, 20, 20, 0.85)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '6px 12px',
                borderRadius: '20px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <span>📷 Drag & drop photo or tap to upload</span>
            </div>
          )}
        </div>

        {/* Uploading / Loading Overlay */}
        {(isUploading || isFetchingStock) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                border: '3px solid rgba(255,255,255,0.2)',
                borderTopColor: 'var(--ac)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
              {isUploading ? 'Uploading custom photo...' : 'Searching Reverb stock photo...'}
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </p>
      )}

      {/* Success Message */}
      {successMsg && (
        <p style={{ color: 'var(--ac)', fontSize: '12px', marginTop: '6px', fontWeight: 700 }}>
          ✅ {successMsg}
        </p>
      )}

      {/* Photo Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '3px 8px',
              borderRadius: '6px',
              background: isCustom ? '#1e293b' : 'var(--sf)',
              color: isCustom ? '#38bdf8' : 'var(--mu)',
              border: '1px solid var(--ln)',
            }}
          >
            {isCustom
              ? 'User Upload'
              : stockSource === 'reverb'
              ? 'Reverb Stock Photo'
              : stockSource === 'logo'
              ? 'Brand Logo'
              : 'Category Default'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Remove custom upload */}
          {isCustom && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveCustomPhoto();
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                fontSize: '11px',
                fontWeight: 700,
                padding: '5px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Reset to Stock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatAltText(brand?: string | null, model?: string | null, rawText?: string | null): string {
  const b = (brand || '').trim();
  const m = (model || '').trim();
  if (b && m) return `${b} ${m}`;
  return rawText || 'Gear item';
}
