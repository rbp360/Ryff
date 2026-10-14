'use client';

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { RigItemData } from '@/app/(app)/rig/RigRoomClient';
import { getCategoryFallbackImage } from '@/lib/gear-images';

interface AddGearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGearAdded: (items: RigItemData[]) => void;
}

const CATEGORIES = [
  { id: 'guitar', label: 'Guitar', icon: '🎸' },
  { id: 'bass', label: 'Bass', icon: '🎸' },
  { id: 'amp', label: 'Amplifier', icon: '🔊' },
  { id: 'pedal', label: 'Pedal / FX', icon: '🎛️' },
  { id: 'drums', label: 'Drums', icon: '🥁' },
  { id: 'keyboard-synth-sampler', label: 'Keys / Synth', icon: '🎹' },
  { id: 'studio-sound', label: 'Studio / Mic', icon: '🎙️' },
  { id: 'other', label: 'Other', icon: '⚙️' },
];

export function AddGearModal({ isOpen, onClose, onGearAdded }: AddGearModalProps) {
  const [gearName, setGearName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('guitar');
  const [nickname, setNickname] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [serialVisible, setSerialVisible] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Photo states
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [stockPhotoUrl, setStockPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSearchingStock, setIsSearchingStock] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stockAbortRef = useRef<AbortController | null>(null);

  // Reset state when opening using React state adjustment pattern
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setGearName('');
      setBrand('');
      setModel('');
      setCategory('guitar');
      setNickname('');
      setSerialNumber('');
      setSerialVisible(false);
      setCustomPhotoUrl(null);
      setStockPhotoUrl(null);
      setErrorMsg(null);
      setUploadError(null);
      setShowAdvanced(false);
    }
  }

  // When gearName changes, heuristically split brand/model if user hasn't manually edited them
  function handleNameChange(val: string) {
    setGearName(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setBrand('');
      setModel('');
      setStockPhotoUrl(null);
      return;
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      setBrand(parts[0]);
      setModel(parts[0]);
    } else {
      setBrand(parts[0]);
      setModel(parts.slice(1).join(' '));
    }
  }

  // Live stock preview search debounce
  useEffect(() => {
    if (!isOpen || customPhotoUrl) return;

    const b = brand.trim() || gearName.trim();
    const m = model.trim() || gearName.trim();
    if (!b && !m) {
      return;
    }

    if (stockAbortRef.current) {
      stockAbortRef.current.abort();
    }
    const controller = new AbortController();
    stockAbortRef.current = controller;

    const timeout = setTimeout(async () => {
      setIsSearchingStock(true);
      try {
        const params = new URLSearchParams({
          brand: b,
          model: m,
          category,
          pickIndex: '0',
        });
        const res = await fetch(`/api/stock-image?${params.toString()}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.imageUrl && !controller.signal.aborted) {
            setStockPhotoUrl(data.imageUrl);
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        if (!controller.signal.aborted) setIsSearchingStock(false);
      }
    }, 450);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [isOpen, brand, model, gearName, category, customPhotoUrl]);

  async function uploadPhotoToCloudinary(file: File) {
    const isImageMime = file.type && file.type.startsWith('image/');
    const isImageExt = /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp)$/i.test(file.name || '');
    if (!isImageMime && !isImageExt) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, HEIC).');
      return;
    }

    setIsUploadingPhoto(true);
    setUploadError(null);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dfkt03pao';
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'unsigned-rigistry';

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
        throw new Error(errorData?.error?.message || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      if (!data.secure_url) {
        throw new Error('No URL returned from upload');
      }

      setCustomPhotoUrl(data.secure_url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      uploadPhotoToCloudinary(e.target.files[0]);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadPhotoToCloudinary(e.dataTransfer.files[0]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalRaw = gearName.trim();
    if (!finalRaw && !model.trim()) {
      setErrorMsg('Please enter a gear name or model.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const effectiveBrand = brand.trim() || undefined;
    const effectiveModel = model.trim() || finalRaw;
    const effectiveImage = customPhotoUrl || stockPhotoUrl || undefined;

    try {
      const res = await fetch('/api/rig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              raw_text: finalRaw || `${effectiveBrand || ''} ${effectiveModel}`.trim(),
              brand: effectiveBrand,
              model: effectiveModel,
              category,
              kind: 'own',
              image_url: effectiveImage,
              nickname: nickname.trim() || undefined,
              serial_number: serialNumber.trim() || undefined,
              serial_visible: serialVisible,
            },
          ],
          mode: 'append',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add gear to passport.');
      }

      if (data.items) {
        onGearAdded(data.items);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save gear');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const previewDisplayUrl = customPhotoUrl || stockPhotoUrl || getCategoryFallbackImage(category);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#121212',
          border: '1px solid var(--ln)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.9), 0 0 32px rgba(34, 197, 94, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--ac)' }}>+</span> Add Gear to Passport
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--mu)' }}>
              Add an instrument, amplifier, or pedal to your digital rig.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--mu)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', color: '#f87171', fontSize: '12px', fontWeight: 600 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main Gear Name Input */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--tx)', marginBottom: '6px' }}>
              Gear Name or Model <span style={{ color: 'var(--ac)' }}>*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={gearName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Washburn N2, PRS Custom 24, Boss Katana 50..."
              style={{
                width: '100%',
                background: '#0a0a0a',
                border: '1px solid var(--ln)',
                color: '#fff',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
              }}
            />
          </div>

          {/* Category Chips */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--mu)', marginBottom: '8px' }}>
              Category
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      background: isSelected ? 'rgba(34, 197, 94, 0.15)' : '#181818',
                      border: isSelected ? '1px solid var(--ac)' : '1px solid var(--ln)',
                      color: isSelected ? 'var(--ac)' : 'var(--tx)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Dropzone & Preview */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--mu)', marginBottom: '6px' }}>
              <span>Gear Photo</span>
              <span style={{ fontSize: '10px', color: customPhotoUrl ? 'var(--ac)' : 'var(--mu)' }}>
                {customPhotoUrl ? '✓ User Photo Uploaded' : isSearchingStock ? 'Searching Reverb stock...' : 'Reverb Stock Photo'}
              </span>
            </label>

            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                maxHeight: '170px',
                borderRadius: '12px',
                border: '1px dashed var(--ln)',
                background: '#0a0a0a',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewDisplayUrl}
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: customPhotoUrl ? 'cover' : 'contain',
                  opacity: isUploadingPhoto ? 0.3 : 1,
                  background: '#080808',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  📷 {isUploadingPhoto ? 'Uploading photo...' : customPhotoUrl ? 'Tap to change custom photo' : 'Tap or drop your photo to customize'}
                </span>
                {customPhotoUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomPhotoUrl(null);
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.3)',
                      border: '1px solid #ef4444',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            {uploadError && (
              <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0', fontWeight: 600 }}>
                {uploadError}
              </p>
            )}
          </div>

          {/* Toggle Advanced / Specifics */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ac)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 0',
              }}
            >
              <span>{showAdvanced ? '▾ Hide specifics' : '▸ Add brand, serial, nickname & details'}</span>
            </button>
          </div>

          {showAdvanced && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: '#0a0a0a', borderRadius: '10px', border: '1px solid var(--ln)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--mu)', fontWeight: 600, marginBottom: '4px' }}>
                    Brand
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Washburn"
                    style={{ width: '100%', background: '#141414', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--mu)', fontWeight: 600, marginBottom: '4px' }}>
                    Model
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. N2"
                    style={{ width: '100%', background: '#141414', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--mu)', fontWeight: 600, marginBottom: '4px' }}>
                  Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. Number One, Bluebird, Main Rig"
                  style={{ width: '100%', background: '#141414', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--mu)', fontWeight: 600, marginBottom: '4px' }}>
                  Serial Number (Optional)
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Serial # (kept private by default)"
                  style={{ width: '100%', background: '#141414', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '11px', color: 'var(--mu)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={serialVisible}
                    onChange={(e) => setSerialVisible(e.target.checked)}
                    style={{ accentColor: 'var(--ac)' }}
                  />
                  <span>Show serial number on public passport</span>
                </label>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid var(--ln)',
                background: 'transparent',
                color: 'var(--mu)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!gearName.trim() && !model.trim())}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--ac)',
                color: '#000',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                opacity: (!gearName.trim() && !model.trim()) || isSubmitting ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isSubmitting ? 'Adding...' : 'Add to Passport'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
